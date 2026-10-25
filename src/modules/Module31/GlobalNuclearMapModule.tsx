import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlotComponent from 'react-plotly.js';
import {
  getUnifiedGeospatialPins,
  getGeospatialCountries,
  calculateHaversineDistanceKm,
  buildGeospatialDossierPayload,
  exportGeospatialPinsToCSV,
  exportGeospatialPinsToJSON,
  getTimelineYearStats,
  NUCLEAR_WEAPON_STATES,
  getNuclearWeaponStates,
  getDetonationCountryColor,
  getDetonationCountryFlag,
  getDetonationMarkerSize,
  type UnifiedGeospatialPin,
  type GeospatialCategory
} from '../../services/globalGeospatialService';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import {
  calculateEPZEvacuationPlan,
  buildEPZDossierPayload,
  DEFAULT_EPZ_CONFIG,
  type EPZEvacuationPlan
} from '../../services/epzConsequenceService';
import {
  invertSeismicMagnitudeToYield,
  calculateExpectedMbFromYield,
  buildSeismicYieldDossierPayload,
  GEOLOGICAL_MEDIA,
  type GeologicalMedium,
  type SeismicInversionResult
} from '../../services/seismicYieldInversionService';
import {
  generateEPZGeoJSON,
  generateEPZKML,
  generateEPZCursorOnTargetXML,
  downloadBlob
} from '../../services/tacticalGisExportService';
import { TacticalCompassRose } from '../../components/TacticalCompassRose';
import VerificationBadge from '../../components/VerificationBadge';
import {
  fetchLiveSiteMeteorology,
  type LiveMeteorologySnapshot,
} from '../../utils/liveMeteoAndTerrain';

const Plot = (PlotComponent as any).default || PlotComponent;

export interface HistoricalProvingGround {
  id: string;
  name: string;
  country: string;
  flag: string;
  shortCode: string;
  color: string;
  region: string;
  coordinates: { lat: number; lon: number };
  operationalEra: string;
  totalTests: string;
  environment: string;
  significance: string;
  notableTests: { name: string; yield: string; year: number; type: string }[];
  visualSimYieldKt?: number;
  visualSimCityId?: string;
}

const HISTORICAL_PROVING_GROUNDS: HistoricalProvingGround[] = [
  {
    id: 'nevada',
    name: 'Nevada National Security Site (NNSS / NTS)',
    country: 'United States',
    flag: '🇺🇸',
    shortCode: 'USA',
    color: '#38bdf8',
    region: 'Nye County, Nevada, United States',
    coordinates: { lat: 37.15, lon: -116.05 },
    operationalEra: '1951 – 1992',
    totalTests: '928 Tests (100 Atmospheric, 828 Underground)',
    environment: 'Desert basin alluvium (Yucca Flat), volcanic tuff tunnels (Rainier Mesa)',
    significance: 'Continental test range for US deterrent development, weapon physics validation, Plowshare peaceful nuclear excavation, and modern subcritical hydrodynamic experiments.',
    notableTests: [
      { name: 'Sedan (Plowshare)', yield: '104 kt', year: 1962, type: 'Crater Excavation (390m diameter, 100m deep)' },
      { name: 'Rainier', yield: '1.7 kt', year: 1957, type: 'First Fully Contained Underground Test' },
      { name: 'Priscilla (Plumbbob)', yield: '37 kt', year: 1957, type: 'Atmospheric Balloon Tethered Burst' },
      { name: 'Divider', yield: '<20 kt', year: 1992, type: 'Final US Underground Nuclear Test' }
    ],
    visualSimYieldKt: 104,
    visualSimCityId: 'nts_sedan'
  },
  {
    id: 'pacific_proving_grounds',
    name: 'Pacific Proving Grounds (Bikini & Enewetak Atolls)',
    country: 'United States',
    flag: '🇺🇸',
    shortCode: 'USA',
    color: '#38bdf8',
    region: 'Ralik Chain, Marshall Islands, Central Pacific',
    coordinates: { lat: 11.58, lon: 165.38 },
    operationalEra: '1946 – 1958',
    totalTests: '67 Tests (42 Enewetak, 23 Bikini, 2 Open Ocean)',
    environment: 'Oceanic coral atolls, lagoons, deep ocean barge moorings',
    significance: 'Proving grounds for high-yield multi-megaton thermonuclear weapons. Site of the catastrophic Castle Bravo radiological fallout event that contaminated the Lucky Dragon No. 5.',
    notableTests: [
      { name: 'Castle Bravo', yield: '15,000 kt (15 MT)', year: 1954, type: 'Dry-Fuel Thermonuclear (Shrimp Device)' },
      { name: 'Ivy Mike', yield: '10,400 kt (10.4 MT)', year: 1952, type: 'First Thermonuclear Device (Cryogenic Sausage)' },
      { name: 'Crossroads Baker', yield: '21 kt', year: 1946, type: 'Underwater Target Fleet Detonation (27m depth)' },
      { name: 'Ivy King', yield: '500 kt', year: 1952, type: 'Largest Pure-Fission Weapon Ever Tested' }
    ],
    visualSimYieldKt: 15000,
    visualSimCityId: 'castle_bravo'
  },
  {
    id: 'alamogordo_trinity',
    name: 'Trinity Site (White Sands Missile Range)',
    country: 'United States',
    flag: '🇺🇸',
    shortCode: 'USA',
    color: '#38bdf8',
    region: 'Socorro County, New Mexico, United States',
    coordinates: { lat: 33.677, lon: -106.475 },
    operationalEra: 'July 16, 1945',
    totalTests: '1 Test (The Gadget)',
    environment: 'Jornada del Muerto desert plain',
    significance: 'Birth of the nuclear age. Manhattan Project implosion test of a plutonium-239 core that validated the implosion geometry and synthesized trinitite glass.',
    notableTests: [
      { name: 'Trinity (The Gadget)', yield: '21 kt', year: 1945, type: '100-foot Steel Tower Detonation' }
    ],
    visualSimYieldKt: 21,
    visualSimCityId: 'trinity'
  },
  {
    id: 'amchitka_island',
    name: 'Amchitka Island Proving Ground',
    country: 'United States',
    flag: '🇺🇸',
    shortCode: 'USA',
    color: '#38bdf8',
    region: 'Rat Islands, Aleutian Chain, Alaska, United States',
    coordinates: { lat: 51.47, lon: 179.18 },
    operationalEra: '1965 – 1971',
    totalTests: '3 Underground Tests (Long Shot, Milrow, Cannikin)',
    environment: 'Volcanic andesite rock, deep subterranean shafts',
    significance: 'Proving ground for extreme-yield underground warhead calibration. Cannikin tested the 5 MT W71 Spartan ABM warhead at 1,870 meters depth, lifting the island surface by over 6 meters.',
    notableTests: [
      { name: 'Cannikin', yield: '4,800 – 5,000 kt (~5 MT)', year: 1971, type: 'Deep Vertical Shaft (1,870m depth)' },
      { name: 'Milrow', yield: '1,000 kt (1 MT)', year: 1969, type: 'Calibration Shot for Cannikin (1,219m depth)' },
      { name: 'Long Shot', yield: '80 kt', year: 1965, type: 'Vela Uniform Seismic Decoupling Analysis' }
    ],
    visualSimYieldKt: 4800,
    visualSimCityId: 'nts_sedan'
  },
  {
    id: 'semipalatinsk_polygon',
    name: 'Semipalatinsk Test Site ("The Polygon")',
    country: 'Soviet Union',
    flag: '🇷🇺',
    shortCode: 'USSR',
    color: '#ef4444',
    region: 'Steppes of Kazakh SSR (now Kazakhstan)',
    coordinates: { lat: 50.44, lon: 78.43 },
    operationalEra: '1949 – 1989',
    totalTests: '456 Tests (116 Atmospheric, 340 Underground)',
    environment: 'Open steppe plain, Degelen Mountain tunnels, Balapan borehole field',
    significance: 'Primary Soviet testing center where the USSR broke the US atomic monopoly with RDS-1 in 1949. Closed by Kazakh presidential decree in 1991, founding the UN International Day against Nuclear Tests.',
    notableTests: [
      { name: 'RDS-1 (Joe-1 / Pervaya Molniya)', yield: '22 kt', year: 1949, type: '30m Tower (First Soviet A-Bomb)' },
      { name: 'RDS-37', yield: '1,600 kt (1.6 MT)', year: 1955, type: 'First Soviet Two-Stage Thermonuclear Airburst' },
      { name: 'Chagan (PNE Reservoir)', yield: '140 kt', year: 1965, type: 'Nuclear Excavation (100m deep "Atomic Lake")' },
      { name: 'RDS-6s (Joe-4 / Sloika)', yield: '400 kt', year: 1953, type: 'Single-Stage Layer Cake Thermonuclear' }
    ],
    visualSimYieldKt: 1600,
    visualSimCityId: 'semipalatinsk'
  },
  {
    id: 'novaya_zemlya',
    name: 'Novaya Zemlya Northern Test Site (Object 700)',
    country: 'Soviet Union',
    flag: '🇷🇺',
    shortCode: 'USSR',
    color: '#ef4444',
    region: 'Arctic Ocean Archipelago, Arkhangelsk Oblast, Russia',
    coordinates: { lat: 73.85, lon: 54.58 },
    operationalEra: '1955 – 1990',
    totalTests: '130 Tests (88 Atmospheric, 3 Underwater, 39 Underground)',
    environment: 'Arctic permafrost, Matochkin Shar fjord adits, Mityushikha Bay',
    significance: 'Dedicated Soviet proving ground for high-yield megaton-class thermonuclear weapons, accounting for 94% of all Soviet megatonnage and the largest detonation in human history.',
    notableTests: [
      { name: 'Tsar Bomba (RDS-220)', yield: '50,000 kt (50 MT)', year: 1961, type: 'Parachute Drop Airburst (4,000m AGL)' },
      { name: 'Test 219 (Dry Nose Super-Bomb)', yield: '24,200 kt (24.2 MT)', year: 1962, type: 'Thermonuclear Airburst' },
      { name: 'Test 147', yield: '19,100 kt (19.1 MT)', year: 1962, type: 'Thermonuclear Airburst' },
      { name: 'Site A Subsea Torpedo Test', yield: '3.5 kt', year: 1955, type: 'First Soviet Underwater Detonation' }
    ],
    visualSimYieldKt: 50000,
    visualSimCityId: 'novaya_zemlya'
  },
  {
    id: 'moruroa_atoll',
    name: 'Moruroa Atoll Proving Ground',
    country: 'France',
    flag: '🇫🇷',
    shortCode: 'FRA',
    color: '#818cf8',
    region: 'Tuamotu Archipelago, French Polynesia',
    coordinates: { lat: -21.84, lon: -138.91 },
    operationalEra: '1966 – 1996',
    totalTests: '181 Tests (41 Atmospheric, 140 Underground)',
    environment: 'South Pacific coral atoll, deep vertical boreholes drilled into lagoon basalt',
    significance: 'Primary testing location for the French airborne and submarine nuclear force (Force de Frappe) for three decades; site of extensive global radiological monitoring.',
    notableTests: [
      { name: 'Aldebaran', yield: '28 kt', year: 1966, type: 'First French Polynesian Test (Lagoon Barge)' },
      { name: 'Centaure', yield: '4 kt', year: 1974, type: 'Last French Atmospheric Nuclear Test' },
      { name: 'Xouthos', yield: '60 kt', year: 1996, type: 'Final French Nuclear Test Before Moratorium' }
    ],
    visualSimYieldKt: 60,
    visualSimCityId: 'canopus_fangataufa'
  },
  {
    id: 'fangataufa_atoll',
    name: 'Fangataufa Atoll Proving Ground',
    country: 'France',
    flag: '🇫🇷',
    shortCode: 'FRA',
    color: '#818cf8',
    region: 'Tuamotu Archipelago, French Polynesia',
    coordinates: { lat: -22.24, lon: -138.75 },
    operationalEra: '1966 – 1996',
    totalTests: '14 Tests (5 Atmospheric, 9 Underground)',
    environment: 'Closed coral atoll rim, deep volcanic foundation',
    significance: 'Auxiliary firing ground reserved for high-yield megaton thermonuclear weapons to avoid seismic fracturing and subsidence of Moruroa.',
    notableTests: [
      { name: 'Canopus', yield: '2,600 kt (2.6 MT)', year: 1968, type: 'First French Thermonuclear H-Bomb (Tethered Balloon)' },
      { name: 'Rigel', yield: '150 kt', year: 1966, type: 'Airburst Barge Detonation' }
    ],
    visualSimYieldKt: 2600,
    visualSimCityId: 'canopus_fangataufa'
  },
  {
    id: 'reggane_in_ekker',
    name: 'Reggane & In Ekker Centers (CSEM / CEMO)',
    country: 'France',
    flag: '🇫🇷',
    shortCode: 'FRA',
    color: '#818cf8',
    region: 'Tanezrouft & Hoggar Mountains, Algerian Sahara',
    coordinates: { lat: 26.72, lon: 0.28 },
    operationalEra: '1960 – 1966',
    totalTests: '17 Tests (4 Atmospheric at Reggane, 13 Underground at In Ekker)',
    environment: 'Sahara Desert hamada plateau, granite massifs of Taourirt Tan Afella',
    significance: 'Established France as the fourth nuclear weapon state with Gerboise Bleue in 1960. The Béryl accident of 1962 breached the mountain tunnel, venting radioactive lava and fission gases.',
    notableTests: [
      { name: 'Gerboise Bleue', yield: '70 kt', year: 1960, type: '105m Tower (First French Atomic Bomb)' },
      { name: 'Gerboise Blanche', yield: '<5 kt', year: 1960, type: 'Surface Ground Detonation' },
      { name: 'Béryl', yield: '<30 kt', year: 1962, type: 'Underground Horizontal Adit (Venting Incident)' }
    ],
    visualSimYieldKt: 70,
    visualSimCityId: 'reggane'
  },
  {
    id: 'montebello_islands',
    name: 'Montebello Islands Proving Ground',
    country: 'United Kingdom',
    flag: '🇬🇧',
    shortCode: 'GBR',
    color: '#06b6d4',
    region: 'Pilbara Coast, Western Australia',
    coordinates: { lat: -20.44, lon: 115.57 },
    operationalEra: '1952 – 1956',
    totalTests: '3 Atmospheric Tests (Hurricane, Mosaic G1, Mosaic G2)',
    environment: 'Uninhabited coral archipelago in the Indian Ocean',
    significance: 'Site where the United Kingdom became the third nuclear weapon state on October 3, 1952. Operation Hurricane was detonated inside the hull of frigate HMS Plym to investigate harbor sabotage.',
    notableTests: [
      { name: 'Operation Hurricane', yield: '25 kt', year: 1952, type: 'Detonated Inside Frigate HMS Plym Hull' },
      { name: 'Mosaic G2', yield: '60 kt', year: 1956, type: '30m Tower (Thermonuclear Booster Test)' }
    ],
    visualSimYieldKt: 25,
    visualSimCityId: 'montebello'
  },
  {
    id: 'maralinga_emu',
    name: 'Maralinga Proving Ground & Emu Field',
    country: 'United Kingdom',
    flag: '🇬🇧',
    shortCode: 'GBR',
    color: '#06b6d4',
    region: 'Woomera Prohibited Area, South Australia',
    coordinates: { lat: -30.16, lon: 131.58 },
    operationalEra: '1953 – 1963',
    totalTests: '9 Major Atomic Tests (Totem, Buffalo, Antler) + 500+ Minor Trials',
    environment: 'Semi-arid outback scrubland, Great Victoria Desert',
    significance: 'Permanent British nuclear proving ground in continental Australia. Vixen safety trials dispersed ~22 kg of plutonium dust, necessitating extensive multi-decade soil remediation.',
    notableTests: [
      { name: 'Buffalo Round 1 (One Tree)', yield: '12.9 kt', year: 1956, type: '31m Steel Tower' },
      { name: 'Antler Round 2 (Biak)', yield: '5.6 kt', year: 1957, type: 'Tower Detonation' },
      { name: 'Totem 1 (Emu Field)', yield: '9.1 kt', year: 1953, type: 'Ground Burst (Black Mist Fallout)' }
    ],
    visualSimYieldKt: 13,
    visualSimCityId: 'montebello'
  },
  {
    id: 'christmas_island',
    name: 'Christmas Island (Kiritimati) & Malden Island',
    country: 'United Kingdom',
    flag: '🇬🇧',
    shortCode: 'GBR',
    color: '#06b6d4',
    region: 'Line Islands, Central Pacific Ocean',
    coordinates: { lat: 1.87, lon: -157.36 },
    operationalEra: '1957 – 1962',
    totalTests: '9 British Tests (Operation Grapple) + 24 US Tests (Operation Dominic)',
    environment: 'Equatorial Pacific coral atolls',
    significance: 'Field location for the development of Great Britain\'s independent megaton-range two-stage thermonuclear deterrent, dropped from RAF Vickers Valiant bombers.',
    notableTests: [
      { name: 'Operation Grapple Y', yield: '3,000 kt (3.0 MT)', year: 1958, type: 'Airburst from Vickers Valiant Bomber' },
      { name: 'Grapple X', yield: '1,800 kt (1.8 MT)', year: 1957, type: 'First British Megaton Detonation' }
    ],
    visualSimYieldKt: 3000,
    visualSimCityId: 'grapple_kiritimati'
  },
  {
    id: 'lop_nur',
    name: 'Lop Nur Nuclear Test Base (Base 21 / Malan)',
    country: 'China',
    flag: '🇨🇳',
    shortCode: 'CHN',
    color: '#f59e0b',
    region: 'Tarim Basin & Lop Desert, Xinjiang Uyghur Autonomous Region',
    coordinates: { lat: 40.81, lon: 89.78 },
    operationalEra: '1964 – 1996',
    totalTests: '45 Tests (23 Atmospheric, 22 Underground)',
    environment: 'Hyper-arid desert salt playa, Kuruktag mountain tunnels',
    significance: 'Birthplace of China\'s Two Bombs, One Satellite strategic program. Holds the record for the fastest sprint from fission to fusion (32 months between Project 596 and Test No. 6).',
    notableTests: [
      { name: 'Project 596 (Chic-1)', yield: '22 kt', year: 1964, type: '102m Tower (First Chinese Atomic Bomb)' },
      { name: 'Test No. 6 (Chic-6)', yield: '3,300 kt (3.3 MT)', year: 1967, type: 'Tu-16 Parachute Airburst (First Full H-Bomb)' },
      { name: 'Test No. 21', yield: '4,000 kt (4.0 MT)', year: 1976, type: 'Largest Chinese Atmospheric Detonation' },
      { name: 'Final Chinese Test', yield: '1 – 5 kt', year: 1996, type: 'Underground Tunnel Detonation' }
    ],
    visualSimYieldKt: 3300,
    visualSimCityId: 'lop_nur'
  },
  {
    id: 'pokhran_range',
    name: 'Pokhran Nuclear Test Range (Khetolai)',
    country: 'India',
    flag: '🇮🇳',
    shortCode: 'IND',
    color: '#fb923c',
    region: 'Jaisalmer District, Thar Desert, Rajasthan, India',
    coordinates: { lat: 27.08, lon: 71.75 },
    operationalEra: '1974 & 1998',
    totalTests: '6 Underground Tests (1 PNE in 1974, 5 in Operation Shakti 1998)',
    environment: 'Thar Desert sand dunes, dense sandstone and shale subsurface',
    significance: 'Broke the monopoly of the 5 UN Security Council permanent members. The 1974 test triggered creation of the Nuclear Suppliers Group (NSG) and global export control regimes.',
    notableTests: [
      { name: 'Smiling Buddha (Pokhran-I)', yield: '12 kt', year: 1974, type: 'Peaceful Nuclear Explosion (107m vertical shaft)' },
      { name: 'Shakti-I (Pokhran-II)', yield: '45 kt', year: 1998, type: 'Two-Stage Thermonuclear Device' },
      { name: 'Shakti-II', yield: '15 kt', year: 1998, type: 'Standard Fission Implosion Core' },
      { name: 'Shakti-III, IV, V', yield: 'Sub-kiloton', year: 1998, type: 'Tactical Low-Yield / Subcritical Shots' }
    ],
    visualSimYieldKt: 45,
    visualSimCityId: 'pokhran'
  },
  {
    id: 'chagai_ras_koh',
    name: 'Ras Koh Hills & Kharan Proving Ground',
    country: 'Pakistan',
    flag: '🇵🇰',
    shortCode: 'PAK',
    color: '#10b981',
    region: 'Chagai District, Balochistan Province, Pakistan',
    coordinates: { lat: 28.79, lon: 64.95 },
    operationalEra: 'May 1998',
    totalTests: '6 Underground Tests (5 at Ras Koh, 1 at Kharan)',
    environment: 'Arid granite mountain massif (Mount Ras Koh) & desert alluvium',
    significance: 'Established Pakistan as the world\'s 7th declared nuclear-armed state. Ras Koh\'s 1-km horizontal adit caused the mountain granite face to turn visibly white due to shock decompression.',
    notableTests: [
      { name: 'Chagai-I (5 Shots)', yield: '40 – 43 kt Total', year: 1998, type: 'Simultaneous Horizontal Adit Detonation' },
      { name: 'Chagai-II (Kharan)', yield: '12 – 20 kt', year: 1998, type: 'Vertical Shaft in Desert Alluvium' }
    ],
    visualSimYieldKt: 40,
    visualSimCityId: 'chagai'
  },
  {
    id: 'punggye_ri',
    name: 'Punggye-ri Nuclear Test Site',
    country: 'North Korea',
    flag: '🇰🇵',
    shortCode: 'PRK',
    color: '#ec4899',
    region: 'Mount Mantap, Kilju County, North Hamgyong Province, DPRK',
    coordinates: { lat: 41.28, lon: 129.08 },
    operationalEra: '2006 – 2017',
    totalTests: '6 Underground Tests (East, North, and West Tunnels)',
    environment: 'Deep horizontal adits in hard crystalline diorite/granite mountain',
    significance: 'The sole site where nuclear weapons have been tested in the 21st century. Peak 2017 test created an mb 6.3 earthquake and geological deformation detected by CTBTO stations globally.',
    notableTests: [
      { name: '2017 Thermonuclear Test', yield: '150 – 250 kt', year: 2017, type: 'North Tunnel (mb 6.3 - Mountain Collapse)' },
      { name: 'September 2016 Test', yield: '20 – 30 kt', year: 2016, type: 'Standard Warhead Design (mb 5.3)' },
      { name: '2006 Inaugural Test', yield: '<1 kt (Fissile Fizzle)', year: 2006, type: 'East Tunnel (mb 4.3)' }
    ],
    visualSimYieldKt: 250,
    visualSimCityId: 'punggye_ri'
  }
];

export const GlobalNuclearMapModule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Projection Type State
  const [projectionType, setProjectionType] = useState<'orthographic' | 'natural earth' | 'equirectangular' | 'mercator'>('orthographic');

  // Layer Visibility State
  const [showReactors, setShowReactors] = useState<boolean>(true);
  const [showDetonations, setShowDetonations] = useState<boolean>(true);
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showCTBTO, setShowCTBTO] = useState<boolean>(true);

  // Timeline Player State (defaults to 'off' so all 2,038 global nuclear detonations are shown immediately)
  const [timelineMode, setTimelineMode] = useState<'cumulative' | 'single' | 'off'>('off');
  const [currentYear, setCurrentYear] = useState<number>(1962);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = 800ms per year
  const playTimerRef = useRef<any>(null);

  // Advanced Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | GeospatialCategory>('all');
  const [featuredDetonationsOnly, setFeaturedDetonationsOnly] = useState<boolean>(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [selectedReactorStatus, setSelectedReactorStatus] = useState<string>('all');
  const [selectedReactorType, setSelectedReactorType] = useState<string>('all');
  const [selectedCTBTOTech, setSelectedCTBTOTech] = useState<string>('all');
  const [detonationColorMode, setDetonationColorMode] = useState<'country' | 'yield'>('country');

  // Bottom Command & Analysis Center Active Tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'directory' | 'epz_planner' | 'seismic_inversion' | 'nuclear_nations'>('directory');

  // Proving Grounds Atlas Search and Country Filter
  const [provingGroundSearchQuery, setProvingGroundSearchQuery] = useState<string>('');
  const [provingGroundCountryFilter, setProvingGroundCountryFilter] = useState<string>('all');

  const focusProvingGround = (lat: number, lon: number, country?: string) => {
    setCenterRotation({ lon, lat });
    if (country) {
      setSelectedCountry(country);
    }
    setActiveCategoryFilter('detonation');
    setShowDetonations(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // EPZ Evacuation Planning State
  const [isEPZOverlayActive, setIsEPZOverlayActive] = useState<boolean>(true);
  const [epzWindOriginDeg, setEpzWindOriginDeg] = useState<number>(315);
  const [epzWindSpeedMps, setEpzWindSpeedMps] = useState<number>(4.0);
  const [epzStabilityClass, setEpzStabilityClass] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('D');
  const [epzCoreReleaseFraction, setEpzCoreReleaseFraction] = useState<number>(0.05);
  const [epzTargetReactorId, setEpzTargetReactorId] = useState<string>('zaporizhzhia');
  const [epzLiveMeteo, setEpzLiveMeteo] = useState<LiveMeteorologySnapshot | null>(null);
  const [isFetchingEpzMeteo, setIsFetchingEpzMeteo] = useState<boolean>(false);

  // CTBTO Seismic Yield Inversion State
  const [seismicObservedMb, setSeismicObservedMb] = useState<number>(6.30);
  const [seismicMedium, setSeismicMedium] = useState<GeologicalMedium>('hard_rock');
  const [seismicBurialDepthM, setSeismicBurialDepthM] = useState<number>(550);
  const [seismicEpicenterCoords, setSeismicEpicenterCoords] = useState<{ lat: number; lon: number }>({ lat: 41.297, lon: 129.083 });
  const [seismicSiteName, setSeismicSiteName] = useState<string>('Punggye-ri Nuclear Test Site (Mt. Mantap)');

  // Globe Center Rotation State (Controlled for centering on clicks)
  const [centerRotation, setCenterRotation] = useState<{ lon: number; lat: number }>({ lon: 10, lat: 25 });

  // Selected Pin for Inspector
  const [selectedPin, setSelectedPin] = useState<UnifiedGeospatialPin | null>(null);

  // Split-Screen Workspace Mode ('split' | 'stacked')
  const [layoutMode, setLayoutMode] = useState<'split' | 'stacked'>('split');

  // EPZ Consequence Table Sub-Tab ('pag_matrix' | 'dose_curve')
  const [epzTableTab, setEpzTableTab] = useState<'pag_matrix' | 'dose_curve'>('pag_matrix');

  // Inspector Sub-tab ('telemetry' | 'units_effects' | 'narrative')
  const [inspectorTab, setInspectorTab] = useState<'telemetry' | 'units_effects' | 'narrative'>('telemetry');

  // Distance Measurement Tool State
  const [distancePinA, setDistancePinA] = useState<UnifiedGeospatialPin | null>(null);
  const [distancePinB, setDistancePinB] = useState<UnifiedGeospatialPin | null>(null);

  // Audit Dossier State
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activeDossierPayload, setActiveDossierPayload] = useState<CalculationDossierPayload | null>(null);

  // All Available Countries
  const countries = useMemo(() => getGeospatialCountries(), []);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.round(900 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentYear(prev => {
        if (prev >= 2024) {
          setIsPlaying(false);
          return 2024;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Year Telemetry Stats for Active Year
  const yearStats = useMemo(() => {
    return getTimelineYearStats(currentYear);
  }, [currentYear]);

  // Filtered Pins with Timeline Support
  const pins = useMemo(() => {
    return getUnifiedGeospatialPins({
      includeReactors: showReactors && (activeCategoryFilter === 'all' || activeCategoryFilter === 'reactor'),
      includeDetonations: showDetonations && (activeCategoryFilter === 'all' || activeCategoryFilter === 'detonation'),
      includeIncidents: showIncidents && (activeCategoryFilter === 'all' || activeCategoryFilter === 'incident'),
      includeCTBTO: showCTBTO && (activeCategoryFilter === 'all' || activeCategoryFilter === 'ctbto'),
      ctbtoTech: selectedCTBTOTech,
      searchQuery,
      country: selectedCountry,
      featuredOnly: featuredDetonationsOnly,
      environment: selectedEnvironment,
      reactorStatus: selectedReactorStatus,
      reactorType: selectedReactorType,
      timelineMode,
      timelineYear: currentYear,
      detonationColorMode
    });
  }, [
    showReactors,
    showDetonations,
    showIncidents,
    showCTBTO,
    selectedCTBTOTech,
    activeCategoryFilter,
    searchQuery,
    selectedCountry,
    featuredDetonationsOnly,
    selectedEnvironment,
    selectedReactorStatus,
    selectedReactorType,
    timelineMode,
    currentYear,
  ]);

  // Filtered Proving Grounds for Tab 4 Atlas
  const filteredProvingGrounds = useMemo(() => {
    return HISTORICAL_PROVING_GROUNDS.filter(pg => {
      const matchCountry = provingGroundCountryFilter === 'all' || pg.country === provingGroundCountryFilter;
      const q = provingGroundSearchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        pg.name.toLowerCase().includes(q) ||
        pg.country.toLowerCase().includes(q) ||
        pg.region.toLowerCase().includes(q) ||
        pg.environment.toLowerCase().includes(q) ||
        pg.significance.toLowerCase().includes(q) ||
        pg.notableTests.some(t => t.name.toLowerCase().includes(q));
      return matchCountry && matchQuery;
    });
  }, [provingGroundCountryFilter, provingGroundSearchQuery]);

  // Hydrate focus/coordinates if navigated from Incident / Plume / Blast modules
  useEffect(() => {
    const focusName = searchParams.get('focus');
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const tabParam = searchParams.get('tab');

    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (!isNaN(lat) && !isNaN(lon)) {
        setCenterRotation({ lon, lat });
      }
    }

    if (tabParam === 'epz') {
      setActiveWorkspaceTab('epz_planner');
    } else if (tabParam === 'ctbto' || tabParam === 'seismic') {
      setActiveWorkspaceTab('seismic_inversion');
    }

    if (focusName) {
      const decoded = decodeURIComponent(focusName);
      setSearchQuery(decoded);
      const match = pins.find(p => p.name.toLowerCase().includes(decoded.toLowerCase()));
      if (match) {
        setSelectedPin(match);
        setCenterRotation({ lon: match.coordinates.lon, lat: match.coordinates.lat });
      }
    }
  }, [searchParams, pins]);

  // Global Aggregate Statistics
  const stats = useMemo(() => {
    const all = getUnifiedGeospatialPins();
    const reactorCount = all.filter(p => p.category === 'reactor').length;
    const detonationCount = all.filter(p => p.category === 'detonation').length;
    const incidentCount = all.filter(p => p.category === 'incident').length;
    const ctbtoCount = all.filter(p => p.category === 'ctbto').length;

    let totalMWe = 0;
    all.forEach(p => {
      if (p.rawReactor) totalMWe += p.rawReactor.capacityMWe;
    });

    let totalYieldKt = 0;
    all.forEach(p => {
      if (p.rawDetonation) totalYieldKt += p.rawDetonation.yieldKt;
    });

    return {
      reactorCount,
      detonationCount,
      incidentCount,
      ctbtoCount,
      totalMWe,
      totalYieldMt: totalYieldKt / 1000
    };
  }, []);

  // EPZ Target Reactor Selection
  const allReactors = useMemo(() => {
    return getUnifiedGeospatialPins({ includeReactors: true, includeDetonations: false, includeIncidents: false, includeCTBTO: false });
  }, []);

  const selectedReactorForEPZ = useMemo(() => {
    if (selectedPin?.category === 'reactor' && selectedPin.rawReactor) {
      return selectedPin.rawReactor;
    }
    const match = allReactors.find(p => p.id === epzTargetReactorId)?.rawReactor;
    if (match) return match;
    return allReactors[0]?.rawReactor || null;
  }, [selectedPin, epzTargetReactorId, allReactors]);

  // EPZ Consequence Calculation
  const epzPlan: EPZEvacuationPlan | null = useMemo(() => {
    if (!selectedReactorForEPZ) return null;
    return calculateEPZEvacuationPlan({
      plantName: selectedReactorForEPZ.name,
      coordinates: selectedReactorForEPZ.coordinates,
      thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
      coreReleaseFraction: epzCoreReleaseFraction,
      windOriginDegrees: epzWindOriginDeg,
      windSpeedMps: epzWindSpeedMps,
      stabilityClass: epzStabilityClass,
      config: DEFAULT_EPZ_CONFIG
    });
  }, [selectedReactorForEPZ, epzCoreReleaseFraction, epzWindOriginDeg, epzWindSpeedMps, epzStabilityClass]);

  // Seismic Inversion Calculation
  const seismicResult: SeismicInversionResult = useMemo(() => {
    return invertSeismicMagnitudeToYield(
      seismicObservedMb,
      seismicMedium,
      seismicBurialDepthM,
      seismicEpicenterCoords
    );
  }, [seismicObservedMb, seismicMedium, seismicBurialDepthM, seismicEpicenterCoords]);

  // Distance calculation if both pins selected
  const measuredDistanceKm = useMemo(() => {
    if (!distancePinA || !distancePinB) return null;
    return calculateHaversineDistanceKm(
      distancePinA.coordinates.lat,
      distancePinA.coordinates.lon,
      distancePinB.coordinates.lat,
      distancePinB.coordinates.lon
    );
  }, [distancePinA, distancePinB]);

  // Center on pin
  const handleSelectPin = (pin: UnifiedGeospatialPin) => {
    setSelectedPin(pin);
    setCenterRotation({
      lon: pin.coordinates.lon,
      lat: pin.coordinates.lat
    });
  };

  // Open Dossier
  const handleOpenDossier = (pin: UnifiedGeospatialPin) => {
    const payload = buildGeospatialDossierPayload(pin);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  // Open EPZ Emergency Planning Dossier
  const handleOpenEPZDossier = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const payload = buildEPZDossierPayload(
      {
        plantName: selectedReactorForEPZ.name,
        coordinates: selectedReactorForEPZ.coordinates,
        thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
        coreReleaseFraction: epzCoreReleaseFraction,
        windOriginDegrees: epzWindOriginDeg,
        windSpeedMps: epzWindSpeedMps,
        stabilityClass: epzStabilityClass,
        config: DEFAULT_EPZ_CONFIG
      },
      epzPlan
    );
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  // Open CTBTO Seismic Yield Inversion Dossier
  const handleOpenSeismicDossier = () => {
    const payload = buildSeismicYieldDossierPayload(seismicResult, seismicSiteName);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  // Export handlers
  const handleExportCSV = () => {
    const csv = exportGeospatialPinsToCSV(pins);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radpro_geospatial_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const json = exportGeospatialPinsToJSON(pins);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radpro_geospatial_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tactical GIS Export Handlers
  const handleExportGeoJSON = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const scenarioInput = {
      plantName: selectedReactorForEPZ.name,
      coordinates: selectedReactorForEPZ.coordinates,
      thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
      coreReleaseFraction: epzCoreReleaseFraction,
      windOriginDegrees: epzWindOriginDeg,
      windSpeedMps: epzWindSpeedMps,
      stabilityClass: epzStabilityClass,
      config: DEFAULT_EPZ_CONFIG
    };
    const content = generateEPZGeoJSON(scenarioInput, epzPlan);
    const filename = `epz_plan_${selectedReactorForEPZ.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.geojson`;
    downloadBlob(filename, content, 'application/geo+json');
  };

  const handleExportKML = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const scenarioInput = {
      plantName: selectedReactorForEPZ.name,
      coordinates: selectedReactorForEPZ.coordinates,
      thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
      coreReleaseFraction: epzCoreReleaseFraction,
      windOriginDegrees: epzWindOriginDeg,
      windSpeedMps: epzWindSpeedMps,
      stabilityClass: epzStabilityClass,
      config: DEFAULT_EPZ_CONFIG
    };
    const content = generateEPZKML(scenarioInput, epzPlan);
    const filename = `epz_plan_${selectedReactorForEPZ.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.kml`;
    downloadBlob(filename, content, 'application/vnd.google-earth.kml+xml');
  };

  const handleExportCoT = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const scenarioInput = {
      plantName: selectedReactorForEPZ.name,
      coordinates: selectedReactorForEPZ.coordinates,
      thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
      coreReleaseFraction: epzCoreReleaseFraction,
      windOriginDegrees: epzWindOriginDeg,
      windSpeedMps: epzWindSpeedMps,
      stabilityClass: epzStabilityClass,
      config: DEFAULT_EPZ_CONFIG
    };
    const content = generateEPZCursorOnTargetXML(scenarioInput, epzPlan);
    const filename = `epz_cot_${selectedReactorForEPZ.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.cot`;
    downloadBlob(filename, content, 'application/xml');
  };

  // Dispatch to Plume Module with Automated Parameter Hydration
  const handleDispatchPlume = (pin: UnifiedGeospatialPin) => {
    let activityCi = 5000;
    if (pin.rawReactor) {
      const coreTotalTBq = (pin.rawReactor.fissionInventoryTBq?.i131 || 1.8e6) +
                           (pin.rawReactor.fissionInventoryTBq?.cs137 || 3.5e5);
      activityCi = Math.round(coreTotalTBq * epzCoreReleaseFraction * 27);
    }
    navigate(`/plume?source=${encodeURIComponent(pin.name)}&lat=${pin.coordinates.lat}&lon=${pin.coordinates.lon}&wind=${epzWindSpeedMps}&windOrigin=${epzWindOriginDeg}&stability=${epzStabilityClass}&activity=${activityCi}&unit=Ci&coreFraction=${epzCoreReleaseFraction}`);
  };

  // Dispatch from EPZ Planner to Plume Module
  const handleDispatchEPZToPlume = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const coreTotalTBq = (selectedReactorForEPZ.fissionInventoryTBq?.i131 || 1.8e6) +
                         (selectedReactorForEPZ.fissionInventoryTBq?.cs137 || 3.5e5);
    const activityCi = Math.round(coreTotalTBq * epzCoreReleaseFraction * 27);
    navigate(`/plume?source=${encodeURIComponent(selectedReactorForEPZ.name)}&lat=${selectedReactorForEPZ.coordinates.lat}&lon=${selectedReactorForEPZ.coordinates.lon}&wind=${epzWindSpeedMps}&windOrigin=${epzWindOriginDeg}&stability=${epzStabilityClass}&activity=${activityCi}&unit=Ci&coreFraction=${epzCoreReleaseFraction}`);
  };

  // Dispatch to Nuclear Weapon Effects Module with Automated Parameter Hydration
  const handleDispatchNuclearEffects = (pin: UnifiedGeospatialPin) => {
    const yieldKt = pin.rawDetonation?.yieldKt || 15.0;
    const rawType = (pin.rawDetonation?.testType || pin.rawDetonation?.environment || '').toLowerCase();
    const rawHob = pin.rawDetonation?.heightOfBurstM;
    const isUnderground =
      rawType.includes('ug') ||
      rawType.includes('shaft') ||
      rawType.includes('tunnel') ||
      rawType.includes('underground') ||
      rawType.includes('crater') ||
      (typeof rawHob === 'number' && rawHob < 0);
    const isAir =
      !isUnderground &&
      (rawType.includes('air') || rawType.includes('atmospher') || rawType.includes('drop') || (typeof rawHob === 'number' && rawHob > 50));
    const burstMode = isUnderground ? 'underground' : isAir ? 'air' : 'surface';
    const hobParam =
      typeof rawHob === 'number'
        ? `&hob=${Math.round(rawHob)}`
        : isUnderground
        ? `&hob=${-Math.max(30, Math.round(65 * Math.pow(yieldKt, 1 / 3)))}`
        : '';
    navigate(`/nuclear-weapons-effects?yieldKt=${yieldKt}&burstMode=${burstMode}${hobParam}&name=${encodeURIComponent(pin.name)}&lat=${pin.coordinates.lat}&lon=${pin.coordinates.lon}`);
  };

  // Dispatch to Historical Incidents Module
  const handleDispatchIncidents = (pin: UnifiedGeospatialPin) => {
    navigate(`/incidents?search=${encodeURIComponent(pin.name)}`);
  };

  // Dispatch to Medical Countermeasures Module
  const handleDispatchMedical = (drug: 'potassium_iodide' | 'prussian_blue', sourceName: string) => {
    navigate(`/medical-countermeasures?drug=${drug}&source=${encodeURIComponent(sourceName)}`);
  };

  // Construct Plotly Traces by Category with Active Year Flash Highlighting
  const plotData = useMemo(() => {
    const reactorPins = pins.filter(p => p.category === 'reactor');
    const pastDetonationPins = pins.filter(p => p.category === 'detonation' && !p.isCurrentYear);
    const currentYearDetonationPins = pins.filter(p => p.category === 'detonation' && p.isCurrentYear);
    const incidentPins = pins.filter(p => p.category === 'incident');

    const traces: any[] = [];

    // 1. Civil Nuclear Power & Research Reactors
    if (reactorPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `Reactors (${reactorPins.length})`,
        lat: reactorPins.map(p => p.coordinates.lat),
        lon: reactorPins.map(p => p.coordinates.lon),
        text: reactorPins.map(p => `<b>${p.name}</b><br>${p.location}<br>Capacity: ${p.primaryMetric}<br>Type: ${p.typeOrClassification}`),
        hoverinfo: 'text',
        marker: {
          size: reactorPins.map(p => {
            if (p.typeOrClassification === 'Research') return 8;
            return Math.max(6, Math.min(16, Math.sqrt((p.rawReactor?.capacityMWe || 1000) / 25)));
          }),
          color: reactorPins.map(p => p.color),
          opacity: 0.85,
          symbol: 'circle',
          line: { width: 1.2, color: '#34d399' }
        },
        customdata: reactorPins
      });
    }

    // 2. Historical Detonations (Grouped by Sovereign Nation or Single Trace, sorted largest-yield-first so small blasts sit on top)
    if (pastDetonationPins.length > 0) {
      const sortYieldDesc = (a: UnifiedGeospatialPin, b: UnifiedGeospatialPin) =>
        (b.rawDetonation?.yieldKt || 0) - (a.rawDetonation?.yieldKt || 0);

      if (detonationColorMode === 'country') {
        const NWS_ORDER = [
          'United States',
          'Soviet Union',
          'France',
          'United Kingdom',
          'China',
          'India',
          'Pakistan',
          'North Korea'
        ];
        const presentCountries = Array.from(new Set(pastDetonationPins.map(p => p.country)));
        const sortedCountries = [
          ...NWS_ORDER.filter(c => presentCountries.includes(c)),
          ...presentCountries.filter(c => !NWS_ORDER.includes(c))
        ];

        sortedCountries.forEach(country => {
          const countryPins = pastDetonationPins
            .filter(p => p.country === country)
            .sort(sortYieldDesc);
          if (countryPins.length === 0) return;
          const nwsMeta = NUCLEAR_WEAPON_STATES[country];
          const flag = nwsMeta?.flag || getDetonationCountryFlag(country);
          const color = nwsMeta?.color || getDetonationCountryColor(country);

          traces.push({
            type: 'scattergeo',
            mode: 'markers',
            name: `${flag} ${country} (${countryPins.length})`,
            lat: countryPins.map(p => p.coordinates.lat),
            lon: countryPins.map(p => p.coordinates.lon),
            text: countryPins.map(p =>
              `<b>${flag} ${p.country}: ${p.name}</b><br>` +
              `📍 ${p.location}<br>` +
              `💥 <b>${p.primaryMetric}</b><br>` +
              `📅 ${p.dateOrYear} // ${p.secondaryMetric}`
            ),
            hoverinfo: 'text',
            marker: {
              size: countryPins.map(p => getDetonationMarkerSize(p.rawDetonation?.yieldKt)),
              color: color,
              opacity: 0.88,
              symbol: 'circle',
              line: {
                width: countryPins.map(p => ((p.rawDetonation?.yieldKt || 0) >= 1000 ? 1.2 : 0.65)),
                color: countryPins.map(p =>
                  (p.rawDetonation?.yieldKt || 0) >= 1000
                    ? 'rgba(254, 240, 138, 0.92)'
                    : 'rgba(7, 11, 20, 0.82)'
                )
              }
            },
            customdata: countryPins
          });
        });
      } else {
        const sortedPast = [...pastDetonationPins].sort(sortYieldDesc);
        traces.push({
          type: 'scattergeo',
          mode: 'markers',
          name: timelineMode !== 'off' ? `Past Tests (${sortedPast.length})` : `Detonations (${sortedPast.length})`,
          lat: sortedPast.map(p => p.coordinates.lat),
          lon: sortedPast.map(p => p.coordinates.lon),
          text: sortedPast.map(p =>
            `<b>${getDetonationCountryFlag(p.country)} ${p.country}: ${p.name}</b><br>` +
            `📍 ${p.location}<br>` +
            `💥 <b>${p.primaryMetric}</b><br>` +
            `📅 ${p.dateOrYear} // ${p.secondaryMetric}`
          ),
          hoverinfo: 'text',
          marker: {
            size: sortedPast.map(p => getDetonationMarkerSize(p.rawDetonation?.yieldKt)),
            color: sortedPast.map(p => p.color),
            opacity: 0.88,
            symbol: 'circle',
            line: {
              width: sortedPast.map(p => ((p.rawDetonation?.yieldKt || 0) >= 1000 ? 1.2 : 0.65)),
              color: sortedPast.map(p =>
                (p.rawDetonation?.yieldKt || 0) >= 1000
                  ? 'rgba(254, 240, 138, 0.92)'
                  : 'rgba(7, 11, 20, 0.82)'
              )
            }
          },
          customdata: sortedPast
        });
      }
    }

    // 3. Current Year Active Explosions (Deduplicated Non-Overlapping Shockwave Halos + Incandescent Cores)
    if (currentYearDetonationPins.length > 0) {
      const sortedActive = [...currentYearDetonationPins].sort(
        (a, b) => (b.rawDetonation?.yieldKt || 0) - (a.rawDetonation?.yieldKt || 0)
      );

      // Deduplicate shockwave halo rings by 2.5° spatial sector so co-located tests in the same year never produce overlapping halo rings
      const sectorMap = new Map<string, UnifiedGeospatialPin>();
      sortedActive.forEach(p => {
        const sectorKey = `${Math.round(p.coordinates.lat / 2.5)},${Math.round(p.coordinates.lon / 2.5)}`;
        if (!sectorMap.has(sectorKey)) {
          sectorMap.set(sectorKey, p);
        }
      });
      const haloPins = Array.from(sectorMap.values());

      // Layer 3A: Outer Blast Shockwave Halo (1 per active test site)
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `🌊 Year ${currentYear} Blast Shockwave (${haloPins.length} Sites)`,
        showlegend: false,
        lat: haloPins.map(p => p.coordinates.lat),
        lon: haloPins.map(p => p.coordinates.lon),
        hoverinfo: 'skip',
        marker: {
          size: haloPins.map(p => getDetonationMarkerSize(p.rawDetonation?.yieldKt, true) + 9),
          color: 'rgba(251, 146, 60, 0.14)',
          symbol: 'circle',
          line: {
            width: 1.5,
            color: haloPins.map(p => getDetonationCountryColor(p.country))
          }
        }
      });

      // Layer 3B: Individual Active Detonation Cores
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `💥 Year ${currentYear} Active Tests (${sortedActive.length})`,
        lat: sortedActive.map(p => p.coordinates.lat),
        lon: sortedActive.map(p => p.coordinates.lon),
        text: sortedActive.map(p => {
          const flag = getDetonationCountryFlag(p.country);
          return (
            `<b>💥 ${flag} ${p.country}: ${p.name}</b><br>` +
            `📍 ${p.location}<br>` +
            `💥 <b>${p.primaryMetric}</b><br>` +
            `📅 ${p.dateOrYear} // ${p.secondaryMetric}`
          );
        }),
        hoverinfo: 'text',
        marker: {
          size: sortedActive.map(p => getDetonationMarkerSize(p.rawDetonation?.yieldKt, true)),
          color: sortedActive.map(p => getDetonationCountryColor(p.country)),
          opacity: 0.96,
          symbol: 'circle',
          line: { width: 1.4, color: '#fef08a' }
        },
        customdata: sortedActive
      });
    }

    // 4. INES Historical Accidents
    if (incidentPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `Accidents (${incidentPins.length})`,
        lat: incidentPins.map(p => p.coordinates.lat),
        lon: incidentPins.map(p => p.coordinates.lon),
        text: incidentPins.map(p => `<b>${p.name}</b><br>${p.location}<br>${p.primaryMetric}<br>${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: incidentPins.map(p => Math.max(9, (p.rawIncident?.inesLevel || 4) * 2.2)),
          color: '#f59e0b',
          opacity: 0.92,
          symbol: 'triangle-up',
          line: { width: 1.5, color: '#fbbf24' }
        },
        customdata: incidentPins
      });
    }

    // 5. CTBTO International Monitoring System (IMS) Stations
    const ctbtoPins = pins.filter(p => p.category === 'ctbto');
    if (ctbtoPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `📡 CTBTO Stations (${ctbtoPins.length})`,
        lat: ctbtoPins.map(p => p.coordinates.lat),
        lon: ctbtoPins.map(p => p.coordinates.lon),
        text: ctbtoPins.map(p => `<b>📡 ${p.name}</b><br>${p.location}<br><b>${p.primaryMetric}</b><br>${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: ctbtoPins.map(p => (p.isFeatured ? 9 : 7)),
          color: ctbtoPins.map(p => p.color),
          opacity: 0.88,
          symbol: 'square',
          line: { width: 1.2, color: '#f8fafc' }
        },
        customdata: ctbtoPins
      });
    }

    // 6. EPZ Emergency Planning Zones & Keyhole Evacuation Arc Overlay
    if (isEPZOverlayActive && epzPlan && selectedReactorForEPZ) {
      // Keyhole Wedge Area (Plume Evacuation Arc)
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        fill: 'toself',
        fillcolor: 'rgba(234, 179, 8, 0.22)',
        name: `🚨 Keyhole Arc (${epzPlan.affectedSectors.join('-')})`,
        lat: epzPlan.keyholeWedgePolygon.map(p => p.lat),
        lon: epzPlan.keyholeWedgePolygon.map(p => p.lon),
        line: { width: 2.5, color: '#facc15' },
        hoverinfo: 'text',
        text: `<b>🚨 Downwind Evacuation Keyhole Wedge</b><br>Centerline: ${epzPlan.plumeCenterlineBearingDeg}° (${epzPlan.keyholeCenterSector})<br>Evacuation Sectors: ${epzPlan.affectedSectors.join(', ')}<br>PAG Evacuation Radius: ${epzPlan.evacuationRadiusKm} km`
      });

      // PAZ 5 km Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `PAZ Ring (5 km) - ${selectedReactorForEPZ.name}`,
        lat: epzPlan.pazGeodesicRing.map(p => p.lat),
        lon: epzPlan.pazGeodesicRing.map(p => p.lon),
        line: { width: 2, color: '#ef4444', dash: 'dot' },
        hoverinfo: 'text',
        text: `<b>Precautionary Action Zone (PAZ)</b><br>5.0 km Radial Distance<br>Mandatory Immediate Evacuation`
      });

      // UPZ 16 km (10 mi) Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `UPZ Ring (16 km / 10 mi)`,
        lat: epzPlan.upzGeodesicRing.map(p => p.lat),
        lon: epzPlan.upzGeodesicRing.map(p => p.lon),
        line: { width: 2, color: '#f59e0b', dash: 'dash' },
        hoverinfo: 'text',
        text: `<b>Urgent Protective Action Zone (UPZ)</b><br>16.1 km (10.0 mi) Plume Exposure Distance`
      });

      // IPZ 80 km (50 mi) Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `IPZ Ingestion Ring (80 km / 50 mi)`,
        lat: epzPlan.ipzGeodesicRing.map(p => p.lat),
        lon: epzPlan.ipzGeodesicRing.map(p => p.lon),
        line: { width: 1.5, color: '#00e5ff', dash: 'dashdot' },
        hoverinfo: 'text',
        text: `<b>Ingestion Planning Zone (IPZ)</b><br>80.5 km (50.0 mi) Ingestion Pathway Distance`
      });
    }

    // 7. Great Circle Distance Path
    if (distancePinA && distancePinB) {
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: 'Great Circle Path',
        lat: [distancePinA.coordinates.lat, distancePinB.coordinates.lat],
        lon: [distancePinA.coordinates.lon, distancePinB.coordinates.lon],
        line: {
          width: 3,
          color: '#00e5ff',
          dash: 'dash'
        },
        hoverinfo: 'none'
      });
    }

    return traces;
  }, [pins, timelineMode, currentYear, distancePinA, distancePinB, isEPZOverlayActive, epzPlan, selectedReactorForEPZ]);

  const plotLayout = useMemo(() => ({
    autosize: true,
    height: layoutMode === 'split' ? 640 : 580,
    margin: { t: 0, b: 0, l: 0, r: 0 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    geo: {
      projection: {
        type: projectionType as any,
        rotation: projectionType === 'orthographic' ? centerRotation : undefined
      },
      showland: true,
      landcolor: '#111827',
      showocean: true,
      oceancolor: '#070b14',
      showcountries: true,
      countrycolor: 'rgba(0, 229, 255, 0.25)',
      countrywidth: 0.8,
      showcoastlines: true,
      coastlinecolor: 'rgba(0, 229, 255, 0.4)',
      coastlinewidth: 1.0,
      showlakes: true,
      lakecolor: '#070b14',
      bgcolor: 'transparent'
    },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.05,
      bgcolor: 'rgba(5, 10, 18, 0.88)',
      bordercolor: 'rgba(0, 229, 255, 0.3)',
      borderwidth: 1,
      font: { color: '#ecf0f1', size: 11 }
    }
  }), [layoutMode, projectionType, centerRotation]);

  const plotConfig = useMemo(() => ({
    responsive: true,
    scrollZoom: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d'] as any
  }), []);

  // Render Tactical Distance Measurement Banner
  const renderDistanceBanner = () => {
    if (!distancePinA || !distancePinB || measuredDistanceKm === null) return null;
    return (
      <div
        className="panel"
        style={{
          padding: '12px 18px',
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.4)',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', color: '#ecf0f1' }}>
            📏 Great Circle Distance between <strong>{distancePinA.name}</strong> and <strong>{distancePinB.name}</strong>:
          </span>
          <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
            {measuredDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            ({(measuredDistanceKm * 0.539957).toFixed(1)} Nautical Miles)
          </span>
          <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>
            ⚡ Shockwave transit: ~{(measuredDistanceKm / 0.34).toFixed(0)}s (air speed)
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setDistancePinA(null);
            setDistancePinB(null);
          }}
          style={{ fontSize: '0.76rem', padding: '4px 10px' }}
        >
          Clear Measurement
        </button>
      </div>
    );
  };

  // Render Tactical Inspector Flyout Panel with Enhanced Hierarchy
  const renderInspector = (pin: UnifiedGeospatialPin) => (
    <div
      className="panel"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'rgba(5, 10, 18, 0.95)',
        border: `1px solid ${pin.color}`,
        boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 15px ${pin.color}22`,
        borderRadius: '8px',
        maxHeight: layoutMode === 'split' ? 'none' : '620px',
        overflowY: 'auto'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        <div>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${pin.color}22`,
              color: pin.color,
              border: `1px solid ${pin.color}`
            }}
          >
            {pin.category === 'reactor' ? '⚛️ NUCLEAR REACTOR' : pin.category === 'detonation' ? '💥 NUCLEAR DETONATION' : pin.category === 'ctbto' ? '📡 CTBTO IMS STATION' : '⚠️ INES ACCIDENT'}
          </span>
          <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.2rem', color: '#fff', lineHeight: 1.25 }}>
            {pin.name}
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
            📍 {pin.location}
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setSelectedPin(null)}
          style={{ padding: '2px 8px', fontSize: '0.8rem' }}
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* 2x2 Key Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Coordinates</span>
          <div style={{ fontSize: '0.82rem', color: '#00e5ff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {pin.coordinates.lat.toFixed(4)}°, {pin.coordinates.lon.toFixed(4)}°
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Date / Era</span>
          <div style={{ fontSize: '0.82rem', color: '#ecf0f1', fontWeight: 600 }}>
            {pin.dateOrYear}
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Key Metric</span>
          <div style={{ fontSize: '0.82rem', color: pin.color, fontWeight: 700 }}>
            {pin.primaryMetric}
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Classification</span>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
            {pin.typeOrClassification}
          </div>
        </div>
      </div>

      {/* Inspector Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setInspectorTab('telemetry')}
          style={{
            padding: '3px 10px',
            fontSize: '0.74rem',
            background: inspectorTab === 'telemetry' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            color: inspectorTab === 'telemetry' ? '#00e5ff' : '#94a3b8',
            border: inspectorTab === 'telemetry' ? '1px solid #00e5ff' : '1px solid transparent'
          }}
        >
          📊 Telemetry
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setInspectorTab('units_effects')}
          style={{
            padding: '3px 10px',
            fontSize: '0.74rem',
            background: inspectorTab === 'units_effects' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            color: inspectorTab === 'units_effects' ? '#00e5ff' : '#94a3b8',
            border: inspectorTab === 'units_effects' ? '1px solid #00e5ff' : '1px solid transparent'
          }}
        >
          {pin.category === 'reactor' ? '⚙️ Units Roster' : pin.category === 'detonation' ? '💥 Effects Radii' : '📡 IMS Signatures'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setInspectorTab('narrative')}
          style={{
            padding: '3px 10px',
            fontSize: '0.74rem',
            background: inspectorTab === 'narrative' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            color: inspectorTab === 'narrative' ? '#00e5ff' : '#94a3b8',
            border: inspectorTab === 'narrative' ? '1px solid #00e5ff' : '1px solid transparent'
          }}
        >
          📝 Briefing
        </button>
      </div>

      {/* Sub-Tab 1: Telemetry */}
      {inspectorTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pin.rawReactor && (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px', fontSize: '0.78rem' }}>
              <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}>Core Equilibrium Screening Inventory:</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                • I-131: {((pin.rawReactor.fissionInventoryTBq.i131 || pin.rawReactor.fissionInventoryTBq.I131 || 0) / 1e6).toFixed(2)}M TBq<br />
                • Cs-137: {((pin.rawReactor.fissionInventoryTBq.cs137 || pin.rawReactor.fissionInventoryTBq.Cs137 || 0) / 1e6).toFixed(2)}M TBq<br />
                • Xe-133: {((pin.rawReactor.fissionInventoryTBq.xe133 || pin.rawReactor.fissionInventoryTBq.Xe133 || 0) / 1e6).toFixed(2)}M TBq
              </div>
              <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                Operator: {pin.rawReactor.operator} // Context: {pin.secondaryMetric}
              </div>
            </div>
          )}

          {pin.rawDetonation && (
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '10px', borderRadius: '4px', fontSize: '0.78rem' }}>
              {/* Sovereign Country Attribution Header */}
              {(() => {
                const nws = NUCLEAR_WEAPON_STATES[pin.country];
                const flag = nws?.flag || getDetonationCountryFlag(pin.country);
                const color = nws?.color || getDetonationCountryColor(pin.country);
                return (
                  <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{flag}</span>
                        <span style={{ color }}>{pin.country}</span>
                      </span>
                      <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '3px', background: `${color}22`, color, border: `1px solid ${color}` }}>
                        {nws?.nptStatus || 'Nuclear-Armed State'}
                      </span>
                    </div>
                    {nws && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
                        <div><b>Authority:</b> {nws.authority}</div>
                        <div><b>Testing History:</b> {nws.testCount.toLocaleString()} tests ({nws.firstTestYear}–{nws.lastTestYear}) | ~{nws.totalMegatons} MT</div>
                        <div><b>National Record Yield:</b> {nws.maxYieldTestName} ({nws.maxYieldDisplay})</div>
                      </div>
                    )}
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedCountry(pin.country);
                          setActiveCategoryFilter('detonation');
                          setShowDetonations(true);
                        }}
                        style={{ fontSize: '0.70rem', padding: '3px 8px', width: '100%', borderColor: color, color }}
                      >
                        🎯 Isolate All {pin.country} Tests ({nws?.testCount || 'All'})
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>Prompt Weapon Effects Radii:</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                • Fireball Radius: {pin.rawDetonation.fireballRadiusM} m<br />
                • 5-psi Blast Overpressure: {pin.rawDetonation.promptEffects.blast5psiRadiusKm ?? ((pin.rawDetonation.promptEffects.blast5psiRadiusM || 0) / 1000).toFixed(2)} km<br />
                • 3rd Degree Thermal Burns: {pin.rawDetonation.promptEffects.thermalRadiusKm_3rdDeg ?? ((pin.rawDetonation.promptEffects.thermalBurn3rdDegRadiusM || 0) / 1000).toFixed(2)} km<br />
                • 1.0 Sv Prompt Dose: {pin.rawDetonation.promptEffects.promptRadiation1SvRadiusKm ?? ((pin.rawDetonation.promptEffects.prompt1SvDoseRadiusM || 0) / 1000).toFixed(2)} km
              </div>
              {pin.rawDetonation.operationSeries && (
                <div style={{ marginTop: '6px', color: 'var(--color-primary)', fontSize: '0.72rem' }}>
                  Series: {pin.rawDetonation.operationSeries}
                </div>
              )}
            </div>
          )}

          {pin.rawCTBTO && (
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px', fontSize: '0.78rem' }}>
              <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>IMS Technical Profile:</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                • Station Code: {pin.rawCTBTO.stationCode}<br />
                • Technology: {pin.rawCTBTO.technology}<br />
                • Status: {pin.rawCTBTO.status}<br />
                • Noble Gas Detection: {pin.rawCTBTO.nobleGasEquipped ? 'Certified High Sensitivity Xe-133/Xe-135 Detector' : 'Particulate Radionuclide Detector'}<br />
                • Monitored Signatures: {pin.rawCTBTO.targetIsotopes.join(', ') || 'Teleseismic Waveforms'}
              </div>
            </div>
          )}

          {pin.rawIncident && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid #f59e0b', padding: '10px', borderRadius: '4px', fontSize: '0.78rem' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '4px' }}>INES {pin.rawIncident.inesLevel} Forensic Summary:</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                {pin.rawIncident.summary}
              </div>
              <div style={{ marginTop: '6px', color: '#f87171', fontSize: '0.72rem' }}>
                Fatalities: {pin.rawIncident.fatalities} // ARS Cases: {pin.rawIncident.arsCases}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Units / Effects Roster */}
      {inspectorTab === 'units_effects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pin.rawReactor?.units && pin.rawReactor.units.length > 0 ? (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem' }}>
              <div style={{ color: '#ecf0f1', fontWeight: 600, marginBottom: '6px' }}>
                Operational Units at this Site ({pin.rawReactor.units.length}):
              </div>
              <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pin.rawReactor.units.map(u => (
                  <div key={u.unitName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>
                    <span style={{ color: '#38bdf8' }}>{u.unitName} ({u.model})</span>
                    <span style={{ color: u.status === 'Operational' ? '#10b981' : '#f59e0b' }}>{u.capacityMWe > 0 ? `${u.capacityMWe} MWe` : u.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : pin.rawDetonation ? (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', color: '#cbd5e1' }}>
              <div>Yield: <strong>{pin.rawDetonation.yieldKt} kT TNT</strong></div>
              <div>Detonation Regime: {(pin.rawDetonation.testType || pin.rawDetonation.environment || 'Air Burst')} (HOB: {pin.rawDetonation.heightOfBurstM}m)</div>
              <div style={{ marginTop: '4px' }}>Equivalent Earthquake Magnitude: ~<strong>{(4.0 + 0.75 * Math.log10(pin.rawDetonation.yieldKt)).toFixed(2)} mb</strong></div>
            </div>
          ) : (
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', padding: '10px' }}>
              No additional unit sub-records for this facility.
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Narrative Briefing */}
      {inspectorTab === 'narrative' && (
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, maxHeight: '140px', overflowY: 'auto' }}>
          {pin.rawReactor?.notes || pin.rawDetonation?.historicalSignificance || pin.rawCTBTO?.notes || pin.rawIncident?.summary || 'No narrative notes available.'}
        </div>
      )}

      {/* Action Footer Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
          🚀 Launch Tactical Dispatchers:
        </div>

        {pin.category === 'reactor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn btn-primary"
              onClick={() => handleDispatchPlume(pin)}
              style={{ fontSize: '0.76rem', padding: '5px 8px' }}
            >
              💨 Model Plume
            </button>
            <button
              className="btn"
              onClick={() => {
                setEpzTargetReactorId(pin.id);
                setActiveWorkspaceTab('epz_planner');
              }}
              style={{
                fontSize: '0.76rem',
                padding: '5px 8px',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#facc15',
                border: '1px solid #facc15'
              }}
            >
              🚨 Plan EPZ Arc
            </button>
          </div>
        )}

        {pin.category === 'detonation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn btn-primary"
              onClick={() => handleDispatchNuclearEffects(pin)}
              style={{ fontSize: '0.76rem', padding: '5px 8px', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none' }}
            >
              💥 Blast &amp; HEMP
            </button>
            <button
              className="btn"
              onClick={() => {
                setSeismicSiteName(pin.name);
                setSeismicEpicenterCoords(pin.coordinates);
                if (pin.rawDetonation?.yieldKt) {
                  const expected = calculateExpectedMbFromYield(pin.rawDetonation.yieldKt);
                  setSeismicObservedMb(expected);
                }
                setActiveWorkspaceTab('seismic_inversion');
              }}
              style={{
                fontSize: '0.76rem',
                padding: '5px 8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid #38bdf8'
              }}
            >
              📡 CTBTO Seismic
            </button>
          </div>
        )}

        {pin.category === 'ctbto' && (
          <button
            className="btn btn-primary"
            onClick={() => setActiveWorkspaceTab('seismic_inversion')}
            style={{ fontSize: '0.76rem', padding: '5px 8px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none' }}
          >
            📡 Launch Seismic Inversion Analysis
          </button>
        )}

        {pin.category === 'incident' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn btn-primary"
              onClick={() => handleDispatchIncidents(pin)}
              style={{ fontSize: '0.76rem', padding: '5px 8px' }}
            >
              🔬 View Incident
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleDispatchPlume(pin)}
              style={{ fontSize: '0.76rem', padding: '5px 8px' }}
            >
              💨 Model Plume
            </button>
          </div>
        )}

        {/* Set Pin as Distance Target */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
          <button
            className={`btn ${distancePinA?.id === pin.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDistancePinA(pin)}
            style={{ fontSize: '0.72rem', padding: '4px 6px' }}
          >
            📍 Set Point A
          </button>
          <button
            className={`btn ${distancePinB?.id === pin.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDistancePinB(pin)}
            style={{ fontSize: '0.72rem', padding: '4px 6px' }}
          >
            🎯 Set Point B
          </button>
        </div>

        {/* Part 11 Audit Dossier */}
        <button
          className="btn btn-secondary"
          onClick={() => handleOpenDossier(pin)}
          style={{ fontSize: '0.74rem', padding: '5px 8px', marginTop: '2px' }}
        >
          📜 Generate Signed Part 11 Dossier
        </button>
      </div>
    </div>
  );

  // Handle click on map markers
  const handlePlotClick = (data: any) => {
    if (data.points && data.points.length > 0) {
      const pt = data.points[0];
      if (pt.customdata) {
        handleSelectPin(pt.customdata as UnifiedGeospatialPin);
      }
    }
  };

  return (
    <div
      className="global-nuclear-map-module"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        minHeight: '100%',
        paddingBottom: '40px'
      }}
    >
      
      {/* 1. TOP HEADER & PROJECTION SELECTOR */}
      <div className="panel" style={{ padding: '14px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', flexWrap: 'wrap' }}>
              <span>🌍 Module 31 — Global Nuclear Geospatial &amp; 3D Earth Hub</span>
              <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px', fontWeight: 600 }}>
                IAEA PRIS (739 Units) // 2,038 Weapons Tests // Orthographic 3D
              </span>
              <VerificationBadge testId="VTEST-35" label="VTEST-33 / 34 / 35 Verified" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
              Comprehensive planetary observatory mapping 319 civil &amp; research complexes (739 commercial power units), 2,038 historic atomic/thermonuclear detonations (1945–present), and landmark radiological accident sites.
            </p>
          </div>

          {/* Action & Projection Modes */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(0,0,0,0.35)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>Projection:</span>
              <button
                className="btn"
                onClick={() => setProjectionType('orthographic')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'orthographic' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'orthographic' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'orthographic' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🌍 3D Globe
              </button>
              <button
                className="btn"
                onClick={() => setProjectionType('natural earth')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'natural earth' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'natural earth' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'natural earth' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🗺️ Natural Earth
              </button>
              <button
                className="btn"
                onClick={() => setProjectionType('mercator')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'mercator' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'mercator' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'mercator' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🧭 Mercator
              </button>
            </div>

            {/* Workspace Layout Toggle */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(0,0,0,0.35)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>Workspace:</span>
              <button
                className="btn"
                onClick={() => setLayoutMode('split')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: layoutMode === 'split' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: layoutMode === 'split' ? '#00e5ff' : '#94a3b8',
                  border: layoutMode === 'split' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
                title="Side-by-side 3D Globe and Command & Analysis Center"
              >
                🖥️ Split View
              </button>
              <button
                className="btn"
                onClick={() => setLayoutMode('stacked')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: layoutMode === 'stacked' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: layoutMode === 'stacked' ? '#00e5ff' : '#94a3b8',
                  border: layoutMode === 'stacked' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
                title="Full-width stacked view"
              >
                ⛶ Stacked View
              </button>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export filtered records as CSV"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              >
                📥 CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportJSON}
                title="Export filtered records as JSON"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              >
                📥 JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GLOBAL STATUS HUD METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', flexShrink: 0 }}>
        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nuclear Power Complexes</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
            {stats.reactorCount} Sites (739 Units)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {(stats.totalMWe / 1000).toFixed(1)}k MWe Global Net Output
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weapons Detonations &amp; Tests</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {stats.detonationCount} Recorded Events
          </div>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
            {stats.totalYieldMt.toFixed(1)} Mt Historical Explosive Yield
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landmark INES Incidents</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>
            {stats.incidentCount} Accidents
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Chernobyl, Fukushima, Goiânia...
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CTBTO IMS Stations</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
            {stats.ctbtoCount} Certified Sites
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Radionuclide, Seismic, Infrasound
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Map Markers</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
            {pins.length} Plotted Pins
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {timelineMode !== 'off' ? `Timeline Year: ${currentYear}` : 'All 2,038 Global Detonations Active'}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE HISTORICAL TIMELINE PLAYER (NEW FEATURE) */}
      <div
        className="panel"
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0
        }}
      >
        {/* Timeline Header & Transport Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ecf0f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏱️ Nuclear Testing Timeline</span>
            </span>

            {/* Play/Pause Button */}
            <button
              className="btn"
              onClick={() => {
                if (!isPlaying && timelineMode === 'off') {
                  setTimelineMode('cumulative');
                }
                setIsPlaying(!isPlaying);
              }}
              style={{
                padding: '5px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                color: isPlaying ? '#f87171' : '#34d399',
                border: isPlaying ? '1px solid #ef4444' : '1px solid #10b981',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{isPlaying ? '⏸ Pause' : '▶ Play Timelapse'}</span>
            </button>

            {/* Step -1 / +1 Year */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentYear(y => Math.max(1945, y - 1))}
                disabled={currentYear <= 1945}
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                title="Step backward one year"
              >
                ⏮ -1 Yr
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentYear(y => Math.min(2024, y + 1))}
                disabled={currentYear >= 2024}
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                title="Step forward one year"
              >
                +1 Yr ⏭
              </button>
            </div>

            {/* Speed Pills */}
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }}>
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  style={{
                    background: playbackSpeed === s ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    color: playbackSpeed === s ? '#00e5ff' : '#64748b',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: playbackSpeed === s ? 700 : 400
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Mode Selector & Active Year Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setTimelineMode('off')}
                style={{
                  padding: '3px 9px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'off' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: timelineMode === 'off' ? '#00e5ff' : '#94a3b8',
                  border: timelineMode === 'off' ? '1px solid rgba(0, 229, 255, 0.4)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timelineMode === 'off' ? 700 : 400
                }}
                title="Shows all 2,038 historical nuclear tests across all eras (Default)"
              >
                🌍 All Tests (2,038)
              </button>
              <button
                onClick={() => setTimelineMode('cumulative')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'cumulative' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: timelineMode === 'cumulative' ? '#00e5ff' : '#94a3b8',
                  border: timelineMode === 'cumulative' ? '1px solid rgba(0, 229, 255, 0.3)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timelineMode === 'cumulative' ? 600 : 400
                }}
                title="Shows all detonations up to the active year"
              >
                Cumulative (1945 → {currentYear})
              </button>
              <button
                onClick={() => setTimelineMode('single')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'single' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: timelineMode === 'single' ? '#f59e0b' : '#94a3b8',
                  border: timelineMode === 'single' ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timelineMode === 'single' ? 600 : 400
                }}
                title="Shows only detonations in the selected year"
              >
                Single Year ({currentYear})
              </button>
            </div>

            {/* Large Active Year Display */}
            <div style={{
              background: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: '6px',
              padding: '4px 14px',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 800
            }}>
              {currentYear}
            </div>
          </div>
        </div>

        {/* Timeline Range Scrubber Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="range"
            min="1945"
            max="2024"
            step="1"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              accentColor: 'var(--color-primary)',
              cursor: 'pointer',
              height: '6px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
            <span>1945 (Trinity)</span>
            <span>1954 (Bravo)</span>
            <span>1961 (Tsar)</span>
            <span>1962 (Peak)</span>
            <span>1963 (PTBT)</span>
            <span>1974 (India)</span>
            <span>1992 (Moratorium)</span>
            <span>1998 (Pakistan)</span>
            <span>2017 (DPRK)</span>
            <span>2024</span>
          </div>
        </div>

        {/* Milestone & Annual Telemetry Banner */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderLeft: yearStats.milestoneTitle ? '3px solid #facc15' : '3px solid rgba(0, 229, 255, 0.3)',
          padding: '8px 12px',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            {yearStats.milestoneTitle ? (
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#facc15', marginRight: '6px' }}>
                  {yearStats.flag} {yearStats.milestoneTitle}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {yearStats.milestoneNote}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Nuclear testing operations continuing under international treaty regimes.
              </span>
            )}
          </div>

          {/* Quick Year Telemetry Stats */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#ecf0f1' }}>
              Tests in {currentYear}: <strong style={{ color: '#facc15' }}>{yearStats.annualTestCount}</strong> ({yearStats.annualYieldMt.toFixed(2)} Mt)
            </span>
            <span style={{ color: '#94a3b8' }}>
              Cumulative: <strong style={{ color: '#38bdf8' }}>{yearStats.cumulativeTestCount}</strong> ({yearStats.cumulativeYieldMt.toFixed(1)} Mt)
            </span>
          </div>
        </div>
      </div>

      {/* 4. CONTROLS & FILTER BAR */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
        
        {/* Row 1: Layer Switches + Search + Country */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Layer Visibility Toggles */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setShowReactors(!showReactors)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showReactors ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showReactors ? '#34d399' : '#64748b',
                border: showReactors ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🟢 Reactors ({stats.reactorCount})</span>
            </button>

            <button
              onClick={() => setShowDetonations(!showDetonations)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showDetonations ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showDetonations ? '#f87171' : '#64748b',
                border: showDetonations ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🔴 Detonations ({stats.detonationCount})</span>
            </button>

            <button
              onClick={() => setShowIncidents(!showIncidents)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showIncidents ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showIncidents ? '#fbbf24' : '#64748b',
                border: showIncidents ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🟡 Accidents ({stats.incidentCount})</span>
            </button>

            <button
              onClick={() => setShowCTBTO(!showCTBTO)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showCTBTO ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showCTBTO ? '#38bdf8' : '#64748b',
                border: showCTBTO ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>📡 CTBTO ({stats.ctbtoCount})</span>
            </button>

            <button
              onClick={() => setIsEPZOverlayActive(!isEPZOverlayActive)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: isEPZOverlayActive ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                color: isEPZOverlayActive ? '#facc15' : '#64748b',
                border: isEPZOverlayActive ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)'
              }}
              title="Toggle EPZ 5km/16km/80km rings and keyhole evacuation wedge on selected plant"
            >
              <span>🚨 EPZ Keyhole {isEPZOverlayActive ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Search Box */}
          <input
            type="text"
            className="form-control"
            placeholder="Search facility name, test name, series, or country (e.g. 'Castle Bravo', 'Novaya Zemlya', 'Bruce')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 240px', fontSize: '0.82rem', padding: '6px 12px' }}
          />

          {/* Country Selector */}
          <select
            className="form-control"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ width: '180px', fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">All Nations ({countries.length})</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Reset View */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setCenterRotation({ lon: 10, lat: 25 });
              setSelectedCountry('all');
              setSearchQuery('');
              setSelectedEnvironment('all');
              setSelectedReactorStatus('all');
              setSelectedReactorType('all');
              setFeaturedDetonationsOnly(false);
              setTimelineMode('off');
              setCurrentYear(1962);
              setShowCTBTO(true);
              setSelectedCTBTOTech('all');
              setIsEPZOverlayActive(true);
            }}
            style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            title="Reset all filters, timeline, and globe position"
          >
            ↺ Reset All
          </button>
        </div>

        {/* Row 1B: Nuclear Weapon States Quick-Filter & Sovereign Focus Bar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            💥 Nuclear Powers:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCountry('all')}
            style={{
              fontSize: '0.74rem',
              padding: '3px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              background: selectedCountry === 'all' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.04)',
              color: selectedCountry === 'all' ? '#00e5ff' : '#94a3b8',
              border: `1px solid ${selectedCountry === 'all' ? '#00e5ff' : 'rgba(255,255,255,0.1)'}`
            }}
          >
            🌐 All Nations
          </button>
          {getNuclearWeaponStates().map(nws => (
            <button
              key={nws.country}
              type="button"
              onClick={() => {
                setSelectedCountry(nws.country);
                setCenterRotation(nws.focusCoordinates);
                setActiveCategoryFilter('detonation');
                setShowDetonations(true);
              }}
              style={{
                fontSize: '0.74rem',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: selectedCountry === nws.country ? `${nws.color}25` : 'rgba(255,255,255,0.03)',
                color: selectedCountry === nws.country ? '#fff' : '#cbd5e1',
                borderTop: `1px solid ${selectedCountry === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                borderRight: `1px solid ${selectedCountry === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                borderBottom: `1px solid ${selectedCountry === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                borderLeft: `3px solid ${nws.color}`,
                fontWeight: selectedCountry === nws.country ? 700 : 500,
                boxShadow: selectedCountry === nws.country ? `0 0 10px ${nws.color}33` : 'none'
              }}
              title={`Filter tests by ${nws.country} (${nws.testCount} tests, ~${nws.totalMegatons} MT) and focus primary proving grounds`}
            >
              <span>{nws.flag} {nws.shortCode}</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.8, marginLeft: '4px' }}>({nws.testCount})</span>
            </button>
          ))}

          {/* Color-Coding Mode Toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Detonation Color:</span>
            <button
              type="button"
              onClick={() => setDetonationColorMode(prev => prev === 'country' ? 'yield' : 'country')}
              style={{
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: detonationColorMode === 'country' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: detonationColorMode === 'country' ? '#38bdf8' : '#f59e0b',
                border: `1px solid ${detonationColorMode === 'country' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                fontWeight: 600
              }}
              title="Toggle detonation marker coloring between Sovereign Nation and Yield Magnitude"
            >
              {detonationColorMode === 'country' ? '🎨 Sovereign Nation' : '💥 Yield Magnitude'}
            </button>
          </div>
        </div>

        {/* Row 2: Deep Drilldown Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
          
          {/* Landmark Featured Tests Switch */}
          <button
            onClick={() => setFeaturedDetonationsOnly(!featuredDetonationsOnly)}
            style={{
              fontSize: '0.74rem',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              background: featuredDetonationsOnly ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
              color: featuredDetonationsOnly ? 'var(--color-primary)' : '#94a3b8',
              border: featuredDetonationsOnly ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)'
            }}
            title="Toggle between landmark operations (77) and the full historical detonations catalog (2,038)"
          >
            {featuredDetonationsOnly ? '⭐ Landmark Tests Only (77)' : '🌐 All Weapons Tests (2,038)'}
          </button>

          {/* Test Environment Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Environment:</span>
            <select
              className="form-control"
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '135px' }}
            >
              <option value="all">All Environments</option>
              <option value="Atmospheric">Atmospheric / Air</option>
              <option value="Underground">Underground</option>
              <option value="Underwater">Underwater</option>
              <option value="Space/High-Altitude">Space / Exoatmospheric</option>
            </select>
          </div>

          {/* Reactor Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Plant Status:</span>
            <select
              className="form-control"
              value={selectedReactorStatus}
              onChange={(e) => setSelectedReactorStatus(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '135px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Permanent Shutdown">Permanent Shutdown</option>
              <option value="Suspended Operation">Suspended Operation</option>
            </select>
          </div>

          {/* Reactor Architecture / Family Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Architecture:</span>
            <select
              className="form-control"
              value={selectedReactorType}
              onChange={(e) => setSelectedReactorType(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '140px' }}
            >
              <option value="all">All Architectures</option>
              <option value="PWR">PWR</option>
              <option value="BWR">BWR</option>
              <option value="VVER">VVER (PWR)</option>
              <option value="PHWR/CANDU">PHWR / CANDU</option>
              <option value="RBMK/LWGR">RBMK / LWGR</option>
              <option value="GCR/AGR family">Gas-Cooled (AGR/GCR)</option>
              <option value="Fast Reactor">Fast Breeder (FBR)</option>
              <option value="Research">Research Reactor</option>
            </select>
          </div>

          {/* CTBTO IMS Technology Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>IMS Tech:</span>
            <select
              className="form-control"
              value={selectedCTBTOTech}
              onChange={(e) => setSelectedCTBTOTech(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '145px' }}
            >
              <option value="all">All IMS Tech</option>
              <option value="Radionuclide">Radionuclide (Aerosol/Xe)</option>
              <option value="Primary Seismic">Primary Seismic</option>
              <option value="Infrasound">Infrasound</option>
              <option value="Hydroacoustic">Hydroacoustic</option>
            </select>
          </div>

        </div>
      </div>

      {/* 5. MAIN GEOSPATIAL WORKSPACE (SPLIT OR STACKED MODE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: layoutMode === 'split' ? 'minmax(480px, 1.25fr) minmax(420px, 1fr)' : '1fr',
          gap: '18px',
          alignItems: 'start',
          flexShrink: 0
        }}
      >
        {/* LEFT PANE: 3D GLOBE + (INSPECTOR IF SELECTED) + DISTANCE BANNER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: layoutMode === 'stacked' && selectedPin ? '1fr 420px' : '1fr',
              gap: '14px'
            }}
          >
            {/* Globe Visualization Canvas */}
            <div
              className="panel"
              style={{
                position: 'relative',
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: '#070b14',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '8px',
                height: layoutMode === 'split' ? '640px' : '580px'
              }}
            >
              {/* Top Floating Helper Tag */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '14px',
                zIndex: 10,
                background: 'rgba(5, 10, 18, 0.88)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                color: 'var(--color-text-muted)'
              }}>
                🖱️ <strong>Click &amp; Drag</strong> to rotate 3D Globe // <strong>Scroll</strong> to zoom // <strong>Click marker</strong> to inspect ({pins.length} active)
              </div>

              {/* Top Right Floating Yield & Sovereign Scale Key */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '14px',
                zIndex: 10,
                background: 'rgba(5, 10, 18, 0.88)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.70rem',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                pointerEvents: 'none'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>💥 Yield Size:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>&lt;1 kt</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>15 kt</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>1 MT</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>15 MT</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '19px', height: '19px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>50 MT</span>
                </span>
              </div>

              <Plot
                data={plotData}
                layout={plotLayout}
                config={plotConfig}
                onClick={handlePlotClick}
                onError={() => {}}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* In Stacked Mode: Inspector sits beside the Globe */}
            {layoutMode === 'stacked' && selectedPin && renderInspector(selectedPin)}
          </div>

          {/* In Split Mode: Inspector sits cleanly below the Globe in the Left Column */}
          {layoutMode === 'split' && selectedPin && renderInspector(selectedPin)}

          {/* Great Circle Distance Measurement Banner */}
          {renderDistanceBanner()}
        </div>

        {/* RIGHT PANE: COMMAND & ANALYSIS CENTER */}
        <div
          className="panel"
          style={{
            padding: '16px 20px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            ...(layoutMode === 'split' ? {
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              position: 'sticky',
              top: '16px'
            } : {})
          }}
        >
        
        {/* Workspace Mode Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveWorkspaceTab('directory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'directory' ? 700 : 500,
                background: activeWorkspaceTab === 'directory' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'directory' ? 'var(--color-primary)' : '#94a3b8',
                border: activeWorkspaceTab === 'directory' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>📋 Global Directory</span>
              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(0,0,0,0.3)', color: '#ecf0f1' }}>
                {pins.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('epz_planner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'epz_planner' ? 700 : 500,
                background: activeWorkspaceTab === 'epz_planner' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'epz_planner' ? '#facc15' : '#94a3b8',
                border: activeWorkspaceTab === 'epz_planner' ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>🚨 EPZ Evacuation Planner</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(234, 179, 8, 0.25)', color: '#facc15', fontWeight: 'bold' }}>
                EPA PAG 2017
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('seismic_inversion')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'seismic_inversion' ? 700 : 500,
                background: activeWorkspaceTab === 'seismic_inversion' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'seismic_inversion' ? '#38bdf8' : '#94a3b8',
                border: activeWorkspaceTab === 'seismic_inversion' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>📡 CTBTO Seismic Yield Inversion</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontWeight: 'bold' }}>
                Murphy-Ringdal
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('nuclear_nations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'nuclear_nations' ? 700 : 500,
                background: activeWorkspaceTab === 'nuclear_nations' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'nuclear_nations' ? '#f87171' : '#94a3b8',
                border: activeWorkspaceTab === 'nuclear_nations' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>💥 Testing Nations & Proving Grounds</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', fontWeight: 'bold' }}>
                8 Powers
              </span>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {activeWorkspaceTab === 'directory' && `${pins.length} Facilities & Events Filtered`}
            {activeWorkspaceTab === 'epz_planner' && (selectedReactorForEPZ ? `Active Plant: ${selectedReactorForEPZ.name}` : 'Select a reactor')}
            {activeWorkspaceTab === 'seismic_inversion' && `Active Event: ${seismicSiteName}`}
            {activeWorkspaceTab === 'nuclear_nations' && `Global Proving Grounds Atlas & Sovereign Testing Matrix (2,038 Detonations)`}
          </div>
        </div>

        {/* TAB 1: DIRECTORY GRID */}
        {activeWorkspaceTab === 'directory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Filter directory records by category or search term:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveCategoryFilter('all')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'all' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'all' ? 'var(--color-primary)' : '#94a3b8',
                    border: activeCategoryFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  All Types ({pins.length})
                </button>
                <button
                  onClick={() => setActiveCategoryFilter('reactor')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'reactor' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'reactor' ? '#34d399' : '#94a3b8',
                    border: activeCategoryFilter === 'reactor' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  Reactors ({stats.reactorCount})
                </button>
                <button
                  onClick={() => setActiveCategoryFilter('detonation')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'detonation' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'detonation' ? '#f87171' : '#94a3b8',
                    border: activeCategoryFilter === 'detonation' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  Detonations ({stats.detonationCount})
                </button>
                <button
                  onClick={() => setActiveCategoryFilter('ctbto')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'ctbto' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'ctbto' ? '#38bdf8' : '#94a3b8',
                    border: activeCategoryFilter === 'ctbto' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  CTBTO Stations ({stats.ctbtoCount})
                </button>
                <button
                  onClick={() => setActiveCategoryFilter('incident')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'incident' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'incident' ? '#fbbf24' : '#94a3b8',
                    border: activeCategoryFilter === 'incident' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  Accidents ({stats.incidentCount})
                </button>
              </div>
            </div>

            {/* Scrollable list of sites */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
              maxHeight: '280px',
              overflowY: 'auto',
              paddingRight: '6px'
            }}>
              {pins.map(pin => (
                <div
                  key={pin.id}
                  onClick={() => handleSelectPin(pin)}
                  style={{
                    background: selectedPin?.id === pin.id ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${selectedPin?.id === pin.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pin.name}
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: `${pin.color}22`, color: pin.color, fontWeight: 'bold' }}>
                      {pin.category === 'reactor' ? pin.typeOrClassification : pin.category === 'detonation' ? (pin.year ? `${pin.year}` : 'TEST') : pin.category === 'ctbto' ? 'CTBTO' : 'INES'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    📍 {pin.location}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: pin.color, marginTop: '2px' }}>
                    {pin.primaryMetric}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: EPZ EVACUATION PLANNER CONSOLE */}
        {activeWorkspaceTab === 'epz_planner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header / Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚨 IAEA GSR Part 7 &amp; EPA PAG 2017 Emergency Planning Zone Engine</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  16-Compass-Sector Keyhole Evacuation Arc (67.5° Downwind), Precautionary Action Zone (5 km), Plume Exposure Zone (16 km / 10 mi), and Ingestion Pathway Zone (80 km / 50 mi).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Tactical GIS Export Toolbar */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.35)', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportGeoJSON}
                    disabled={!selectedReactorForEPZ || !epzPlan}
                    style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    title="Export standard GeoJSON FeatureCollection (RFC 7946)"
                  >
                    🗺️ GeoJSON
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportKML}
                    disabled={!selectedReactorForEPZ || !epzPlan}
                    style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    title="Export Google Earth KML with styled polygons"
                  >
                    🌍 Google Earth KML
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportCoT}
                    disabled={!selectedReactorForEPZ || !epzPlan}
                    style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    title="Export DoD Cursor-on-Target XML for ATAK / WinTAK"
                  >
                    📡 ATAK CoT
                  </button>
                </div>

                <button
                  className="btn"
                  onClick={async () => {
                    if (!selectedReactorForEPZ) return;
                    setIsFetchingEpzMeteo(true);
                    try {
                      const snap = await fetchLiveSiteMeteorology(
                        selectedReactorForEPZ.coordinates.lat,
                        selectedReactorForEPZ.coordinates.lon,
                        selectedReactorForEPZ.name
                      );
                      setEpzLiveMeteo(snap);
                      setEpzWindOriginDeg(Math.round(snap.windDirectionDeg) % 360);
                      setEpzWindSpeedMps(Math.max(0.5, Math.min(20, Number(snap.windSpeed10mMs.toFixed(1)))));
                      setEpzStabilityClass(snap.turner.stabilityClass);
                      setIsEPZOverlayActive(true);
                    } finally {
                      setIsFetchingEpzMeteo(false);
                    }
                  }}
                  disabled={!selectedReactorForEPZ || isFetchingEpzMeteo}
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    fontWeight: 700,
                  }}
                  title="Fetch real-time Open-Meteo 10m wind vector, solar insolation, and Turner Pasquill-Gifford stability class for this reactor site"
                >
                  {isFetchingEpzMeteo ? '⏳ Syncing Weather...' : '🌐 Sync Live Wind & Turner Stability'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenEPZDossier}
                  disabled={!selectedReactorForEPZ || !epzPlan}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  📜 Sign Part 11 EPZ Dossier
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDispatchEPZToPlume}
                  disabled={!selectedReactorForEPZ || !epzPlan}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  💨 Dispatch to Plume Module
                </button>
              </div>
            </div>

            {epzLiveMeteo && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.76rem',
                }}
              >
                <span style={{ color: '#a7f3d0' }}>
                  🌐 <strong>{epzLiveMeteo.siteName}</strong> ({epzLiveMeteo.sourceMode === 'LIVE_OPEN_METEO' ? 'Open-Meteo Live Telemetry' : 'Climatology Fallback'}) •
                  Wind From <strong style={{ color: '#facc15' }}>{epzLiveMeteo.windDirectionDeg}°</strong> → Plume Toward{' '}
                  <strong style={{ color: '#38bdf8' }}>{epzLiveMeteo.downwindBearingDeg}°</strong> @{' '}
                  <strong>{epzLiveMeteo.windSpeed10mMs} m/s</strong> • Solar:{' '}
                  <strong>{epzLiveMeteo.shortwaveSolarWm2} W/m²</strong> • Clouds:{' '}
                  <strong>{epzLiveMeteo.cloudCoverPct}%</strong>
                </span>
                <span
                  style={{
                    background: 'rgba(250, 204, 21, 0.16)',
                    border: '1px solid rgba(250, 204, 21, 0.4)',
                    color: '#fde047',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Turner Class {epzLiveMeteo.turner.stabilityClass} ({epzLiveMeteo.turner.insolationCategory})
                </span>
              </div>
            )}

            {/* Parameter Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px' }}>
              
              {/* Reactor Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Target Reactor Complex:</label>
                <select
                  className="form-control"
                  value={selectedReactorForEPZ?.id || ''}
                  onChange={(e) => {
                    setEpzTargetReactorId(e.target.value);
                    const sel = allReactors.find(r => r.id === e.target.value);
                    if (sel) {
                      setCenterRotation({ lon: sel.coordinates.lon, lat: sel.coordinates.lat });
                    }
                  }}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  {allReactors.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.country}) — {r.primaryMetric}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tactical Wind Origin Bearing & Plume Keyhole Dial */}
              <div style={{
                gridColumn: '1 / -1',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <TacticalCompassRose
                  value={epzWindOriginDeg}
                  onChange={setEpzWindOriginDeg}
                  size={150}
                  label="Atmospheric Wind Vector & Plume Sector"
                  showSnapButtons={true}
                  sectorArcSweepDeg={67.5}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 240px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Fine Bearing Adjustment:</span>
                    <strong style={{ color: '#facc15', fontFamily: 'var(--font-mono)' }}>{epzWindOriginDeg}° (Origin)</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={epzWindOriginDeg}
                    onChange={(e) => setEpzWindOriginDeg(parseInt(e.target.value, 10))}
                    style={{ accentColor: '#facc15', width: '100%' }}
                  />
                  <div style={{ fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.35 }}>
                    Downwind Plume Bearing: <strong style={{ color: '#facc15' }}>{epzPlan?.plumeCenterlineBearingDeg}° ({epzPlan?.keyholeCenterSector})</strong>.
                    Sweeps 3 protective action sectors: <strong style={{ color: '#38bdf8' }}>{epzPlan?.affectedSectors.join(', ')}</strong>.
                  </div>
                </div>
              </div>

              {/* Wind Speed Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Wind Speed:</span>
                  <strong style={{ color: '#38bdf8' }}>{epzWindSpeedMps} m/s ({(epzWindSpeedMps * 2.23694).toFixed(1)} mph)</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20.0"
                  step="0.5"
                  value={epzWindSpeedMps}
                  onChange={(e) => setEpzWindSpeedMps(parseFloat(e.target.value))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Stability Class */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Atmospheric Stability Class:</label>
                <select
                  className="form-control"
                  value={epzStabilityClass}
                  onChange={(e) => setEpzStabilityClass(e.target.value as any)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  <option value="A">Class A - Very Unstable (Strong Daytime Sun)</option>
                  <option value="B">Class B - Moderately Unstable</option>
                  <option value="C">Class C - Slightly Unstable</option>
                  <option value="D">Class D - Neutral (Overcast / High Wind)</option>
                  <option value="E">Class E - Slightly Stable (Nighttime)</option>
                  <option value="F">Class F - Moderately Stable (Night Surface Inversion)</option>
                </select>
              </div>

              {/* Release Fraction Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Core Volatile Release:</span>
                  <strong style={{ color: epzCoreReleaseFraction > 0.05 ? '#ef4444' : '#fbbf24' }}>{(epzCoreReleaseFraction * 100).toFixed(1)}% of inventory</strong>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.20"
                  step="0.005"
                  value={epzCoreReleaseFraction}
                  onChange={(e) => setEpzCoreReleaseFraction(parseFloat(e.target.value))}
                  style={{ accentColor: epzCoreReleaseFraction > 0.05 ? '#ef4444' : '#fbbf24' }}
                />
              </div>

            </div>

            {/* Real-Time Consequence Telemetry Tiles */}
            {epzPlan && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid #facc15', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Downwind Center Sector</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#facc15' }}>
                    {epzPlan.plumeCenterlineBearingDeg}° ({epzPlan.keyholeCenterSector})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Compass Bearing</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Keyhole Evacuation Arc</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>
                    {epzPlan.affectedSectors.join(' // ')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>3 Sectors (67.5° Sweep)</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>PAG Evacuation Radius</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                    {epzPlan.evacuationRadiusKm} km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    ({(epzPlan.evacuationRadiusKm * 0.621371).toFixed(1)} miles) // TEDE ≥ 1 rem
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Thyroid KI Radius</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                    {epzPlan.kiDistributionRadiusKm} km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    ({(epzPlan.kiDistributionRadiusKm * 0.621371).toFixed(1)} miles) // CDE ≥ 5 rem
                  </div>
                </div>
              </div>
            )}

            {/* EPZ Consequence Table Sub-Tabs */}
            {epzPlan && (
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEpzTableTab('pag_matrix')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '0.78rem',
                    fontWeight: epzTableTab === 'pag_matrix' ? 700 : 500,
                    background: epzTableTab === 'pag_matrix' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: epzTableTab === 'pag_matrix' ? '#facc15' : '#94a3b8',
                    border: epzTableTab === 'pag_matrix' ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '5px'
                  }}
                >
                  🛡️ EPA PAG Threshold Matrix
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEpzTableTab('dose_curve')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '0.78rem',
                    fontWeight: epzTableTab === 'dose_curve' ? 700 : 500,
                    background: epzTableTab === 'dose_curve' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: epzTableTab === 'dose_curve' ? '#38bdf8' : '#94a3b8',
                    border: epzTableTab === 'dose_curve' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '5px'
                  }}
                >
                  📉 Radial Distance Dose Curve ({epzPlan.doseCurve.length} Points)
                </button>
              </div>
            )}

            {/* EPA Protective Action Guides (PAG 2017) Threshold Matrix */}
            {epzPlan && epzTableTab === 'pag_matrix' && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px' }}>
                  EPA-400-R-92-001 / IAEA GSR Part 7 Early-Phase Protective Action Thresholds:
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Standard / Action</th>
                        <th style={{ padding: '6px' }}>Regulatory Threshold</th>
                        <th style={{ padding: '6px' }}>Calculated Distance</th>
                        <th style={{ padding: '6px' }}>Zone Affected</th>
                        <th style={{ padding: '6px' }}>Guidance Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px', color: '#f87171', fontWeight: 600 }}>TEDE Early Evacuation</td>
                        <td style={{ padding: '6px' }}>≥ 1.0 rem (10 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.evacuationRadiusKm} km ({(epzPlan.evacuationRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>PAZ + Keyhole Wedge</td>
                        <td style={{ padding: '6px', color: '#f87171' }}>Immediate mandatory evacuation of population in affected 3 sectors</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px', color: '#38bdf8', fontWeight: 600 }}>Thyroid CDE Prophylaxis (KI)</td>
                        <td style={{ padding: '6px' }}>≥ 5.0 rem (50 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.kiDistributionRadiusKm} km ({(epzPlan.kiDistributionRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>UPZ (10-mile arc)</td>
                        <td style={{ padding: '6px', color: '#38bdf8' }}>
                          Rapid distribution of stable Potassium Iodide (KI) to block radioiodine uptake
                          {selectedReactorForEPZ && (
                            <button
                              className="btn"
                              onClick={() => handleDispatchMedical('potassium_iodide', selectedReactorForEPZ.name)}
                              style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid #38bdf8' }}
                              title="Open Potassium Iodide protocol with preloaded reactor parameters"
                            >
                              💊 Launch KI Protocol ↗
                            </button>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px', color: '#fbbf24', fontWeight: 600 }}>Ingestion Interdiction (IPZ)</td>
                        <td style={{ padding: '6px' }}>≥ 0.5 rem (5 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.interdictionRadiusKm} km ({(epzPlan.interdictionRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>IPZ (50-mile arc)</td>
                        <td style={{ padding: '6px', color: '#fbbf24' }}>
                          Embargo milk, produce, livestock grazing, and open reservoir drinking water
                          {selectedReactorForEPZ && (
                            <button
                              className="btn"
                              onClick={() => handleDispatchMedical('prussian_blue', selectedReactorForEPZ.name)}
                              style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #fbbf24' }}
                              title="Open Prussian Blue decorporation protocol with preloaded reactor parameters"
                            >
                              🫐 Launch Prussian Blue ↗
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Radial Distance Attenuation Table */}
            {epzPlan && epzTableTab === 'dose_curve' && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px' }}>
                  Plume Centerline Projected Dose Curve vs Radial Distance:
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '220px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '5px' }}>Distance</th>
                        <th style={{ padding: '5px' }}>Zone Tier</th>
                        <th style={{ padding: '5px' }}>Projected TEDE</th>
                        <th style={{ padding: '5px' }}>Thyroid CDE</th>
                        <th style={{ padding: '5px' }}>Evacuation Status</th>
                        <th style={{ padding: '5px' }}>KI Prophylaxis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epzPlan.doseCurve.map(pt => (
                        <tr key={pt.distanceKm} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)' }}>
                            {pt.distanceKm} km ({pt.distanceMiles.toFixed(1)} mi)
                          </td>
                          <td style={{ padding: '5px', color: pt.distanceKm <= 5 ? '#ef4444' : pt.distanceKm <= 16.1 ? '#f59e0b' : '#38bdf8' }}>
                            {pt.distanceKm <= 5 ? 'PAZ (Precautionary)' : pt.distanceKm <= 16.1 ? 'UPZ (Urgent 10-mi)' : 'IPZ (Ingestion 50-mi)'}
                          </td>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)', color: pt.evacuationRecommended ? '#f87171' : '#cbd5e1' }}>
                            {pt.projectedTedeRem} rem ({pt.projectedTedeMsv} mSv)
                          </td>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)', color: pt.kiAdministrationRecommended ? '#38bdf8' : '#cbd5e1' }}>
                            {pt.projectedThyroidCdeRem} rem ({pt.projectedThyroidCdeMsv} mSv)
                          </td>
                          <td style={{ padding: '5px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: pt.evacuationRecommended ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: pt.evacuationRecommended ? '#f87171' : '#34d399'
                            }}>
                              {pt.evacuationRecommended ? 'MANDATORY EVAC' : 'SHELTER / OK'}
                            </span>
                          </td>
                          <td style={{ padding: '5px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: pt.kiAdministrationRecommended ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              color: pt.kiAdministrationRecommended ? '#38bdf8' : '#94a3b8'
                            }}>
                              {pt.kiAdministrationRecommended ? 'ADMINISTER KI' : 'NOT REQUIRED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CTBTO SEISMIC YIELD INVERSION CONSOLE */}
        {activeWorkspaceTab === 'seismic_inversion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header / Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📡 CTBTO Teleseismic Weapon Yield Inversion Console</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Murphy-Ringdal-Nuttli Empirical Seismic Inversion linking observed body-wave magnitude (mb) to weapon explosive yield (kt) with Scaled Depth of Burial (SDOB) containment classification.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenSeismicDossier}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  📜 Sign Part 11 CTBT Dossier
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const yieldKt = seismicResult.estimatedYieldKt;
                    navigate(`/nuclear-weapons-effects?yieldKt=${yieldKt}&burstMode=surface&name=${encodeURIComponent(seismicSiteName)}&lat=${seismicEpicenterCoords.lat}&lon=${seismicEpicenterCoords.lon}&source=ctbto`);
                  }}
                  style={{ fontSize: '0.78rem', padding: '5px 12px', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none' }}
                >
                  💥 Simulate Blast Effects ({seismicResult.estimatedYieldKt >= 1000 ? `${(seismicResult.estimatedYieldKt / 1000).toFixed(2)} Mt` : `${seismicResult.estimatedYieldKt.toFixed(1)} kt`})
                </button>
              </div>
            </div>

            {/* Preset Test Sites Chips */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Historical Benchmarks:</span>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(6.30);
                  setSeismicMedium('hard_rock');
                  setSeismicBurialDepthM(550);
                  setSeismicEpicenterCoords({ lat: 41.297, lon: 129.083 });
                  setSeismicSiteName('2017 Punggye-ri DPRK Thermonuclear Test (Mt. Mantap)');
                  setCenterRotation({ lon: 129.083, lat: 41.297 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇰🇵 2017 Punggye-ri (mb 6.30)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(6.80);
                  setSeismicMedium('water_saturated');
                  setSeismicBurialDepthM(1870);
                  setSeismicEpicenterCoords({ lat: 51.470, lon: 179.176 });
                  setSeismicSiteName('1971 Project Cannikin (Amchitka, Alaska - 5 Mt)');
                  setCenterRotation({ lon: 179.176, lat: 51.470 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇺🇸 1971 Cannikin (mb 6.80)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(5.00);
                  setSeismicMedium('water_saturated');
                  setSeismicBurialDepthM(107);
                  setSeismicEpicenterCoords({ lat: 27.095, lon: 71.753 });
                  setSeismicSiteName('1974 Smiling Buddha (Pokhran, India)');
                  setCenterRotation({ lon: 71.753, lat: 27.095 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇮🇳 1974 Smiling Buddha (mb 5.00)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(2.70);
                  setSeismicMedium('decoupled_cavity');
                  setSeismicBurialDepthM(830);
                  setSeismicEpicenterCoords({ lat: 31.142, lon: -89.570 });
                  setSeismicSiteName('1966 Project Sterling Decoupled Cavity (Mississippi Salt Dome)');
                  setCenterRotation({ lon: -89.570, lat: 31.142 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇺🇸 1966 Sterling Decoupled (mb 2.70)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(4.90);
                  setSeismicMedium('hard_rock');
                  setSeismicBurialDepthM(200);
                  setSeismicEpicenterCoords({ lat: 28.790, lon: 64.950 });
                  setSeismicSiteName('1998 Chagai-I (Ras Koh Hills, Pakistan)');
                  setCenterRotation({ lon: 64.950, lat: 28.790 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇵🇰 1998 Chagai-I (mb 4.90)
              </button>
            </div>

            {/* Input Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px' }}>
              
              {/* Observed mb slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Observed Body-Wave Magnitude (mb):</span>
                  <strong style={{ color: '#38bdf8', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>mb {seismicObservedMb.toFixed(2)}</strong>
                </div>
                <input
                  type="range"
                  min="2.50"
                  max="7.50"
                  step="0.05"
                  value={seismicObservedMb}
                  onChange={(e) => setSeismicObservedMb(parseFloat(e.target.value))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Geological Medium selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Geological Medium / Cavity Coupling:</label>
                <select
                  className="form-control"
                  value={seismicMedium}
                  onChange={(e) => setSeismicMedium(e.target.value as any)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  <option value="hard_rock">Hard Granite / Basalt (Coupling: 100%, α=4.05, β=0.75)</option>
                  <option value="water_saturated">Water-Saturated Tuff / Sedimentary (Coupling: 75%, α=3.90, β=0.75)</option>
                  <option value="dry_alluvium">Dry Porous Alluvium (Coupling: 25%, α=3.45, β=0.80)</option>
                  <option value="decoupled_cavity">Decoupled Cavity / Salt Dome (Coupling: 1.5%, ~70x attenuation)</option>
                </select>
              </div>

              {/* Burial Depth input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Emplacement Depth (meters):</span>
                  <strong style={{ color: '#cbd5e1' }}>{seismicBurialDepthM} m</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={seismicBurialDepthM}
                  onChange={(e) => setSeismicBurialDepthM(parseInt(e.target.value, 10))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Site Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Event / Test Site Name:</label>
                <input
                  type="text"
                  className="form-control"
                  value={seismicSiteName}
                  onChange={(e) => setSeismicSiteName(e.target.value)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                />
              </div>

            </div>

            {/* Inversion Results Telemetry HUD */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Inverted Explosive Yield</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {seismicResult.estimatedYieldKt >= 1000
                    ? `${(seismicResult.estimatedYieldKt / 1000).toFixed(2)} Mt`
                    : `${seismicResult.estimatedYieldKt.toLocaleString()} kt`}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Nominal Best-Estimate</div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #f59e0b', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>1-Sigma Confidence (±0.15 mb)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
                  {seismicResult.yieldLowerBoundKt.toLocaleString()} – {seismicResult.yieldUpperBoundKt.toLocaleString()} kt
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>68% Teleseismic Confidence</div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Rayleigh Surface Wave (Ms)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                  Ms {seismicResult.expectedMs.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ms = 2.14 + 0.96·log(Y)</div>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderLeft: '3px solid #a855f7', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Scaled Depth of Burial (SDOB)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>
                  {seismicResult.scaledDepthOfBurial ? `${seismicResult.scaledDepthOfBurial} m/kt⅓` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: seismicResult.containmentCategory === 'Complete Containment' ? '#34d399' : '#f59e0b' }}>
                  {seismicResult.containmentCategory || 'Burial depth unknown'}
                </div>
              </div>
            </div>

            {/* Geological Media Parameters Callout */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.78rem', color: '#cbd5e1', borderLeft: '3px solid #38bdf8' }}>
              <strong>{GEOLOGICAL_MEDIA[seismicMedium].name}:</strong> {GEOLOGICAL_MEDIA[seismicMedium].description}
            </div>

            {/* Nearby CTBTO IMS Monitoring Stations */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Certified CTBTO IMS Stations Within Teleseismic Detection Range:</span>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>P-wave (8.1 km/s) // Acoustic (0.33 km/s)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Station Code</th>
                      <th style={{ padding: '6px' }}>Station Name</th>
                      <th style={{ padding: '6px' }}>Technology</th>
                      <th style={{ padding: '6px' }}>Country</th>
                      <th style={{ padding: '6px' }}>Distance</th>
                      <th style={{ padding: '6px' }}>P-Wave Transit</th>
                      <th style={{ padding: '6px' }}>Infrasound Transit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seismicResult.nearbyIMSStations.map(ns => (
                      <tr key={ns.station.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                          {ns.station.stationCode}
                        </td>
                        <td style={{ padding: '6px', color: '#ecf0f1' }}>
                          {ns.station.name}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <span style={{
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            background: ns.station.technology === 'Radionuclide' ? 'rgba(56, 189, 248, 0.2)' : ns.station.technology === 'Primary Seismic' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            color: ns.station.technology === 'Radionuclide' ? '#38bdf8' : ns.station.technology === 'Primary Seismic' ? '#fbbf24' : '#c084fc'
                          }}>
                            {ns.station.technology}
                          </span>
                        </td>
                        <td style={{ padding: '6px', color: '#94a3b8' }}>
                          {ns.station.country}
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#ecf0f1' }}>
                          {ns.distanceKm.toLocaleString()} km
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                          {ns.pWaveTransitSec}s (~{(ns.pWaveTransitSec / 60).toFixed(1)}m)
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                          {ns.infrasoundTransitHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SOVEREIGN TESTING NATIONS & GLOBAL PROVING GROUNDS ATLAS */}
        {activeWorkspaceTab === 'nuclear_nations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header / Sovereign Ledger Synopsis Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>💥</span>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                      Sovereign Nuclear Weapon Testing Ledger &amp; Global Proving Grounds Atlas
                    </h3>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: '900px' }}>
                    Peer-reviewed historical compilation of all 2,038 confirmed nuclear explosions conducted between July 16, 1945 (Trinity) and September 3, 2017 (Punggye-ri). Explore sovereign testing doctrines, cumulative megatonnage, and continental/island proving grounds across the 8 nuclear powers.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCountry('all');
                      setActiveCategoryFilter('detonation');
                      setShowDetonations(true);
                      setDetonationColorMode('country');
                    }}
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      border: '1px solid #38bdf8',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🌐 Show All 2,038 Tests (Sovereign Colors)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/nuclear-weapons-effects')}
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid #ef4444',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🌋 Launch Visual Detonation Simulator ↗</span>
                  </button>
                </div>
              </div>

              {/* High-Level Global Statistics Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>TOTAL CONFIRMED TESTS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>2,038</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>1945 – 2017</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ATMOSPHERIC &amp; SUBSEA</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fb923c' }}>502</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>High fallout release</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>UNDERGROUND CONTAINED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>1,536</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Post-PTBT 1963 shafts</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>CUMULATIVE YIELD</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#facc15' }}>~510 Megatons</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>~34,000× Hiroshima</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>NUCLEAR TESTING POWERS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>8 Nations</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>5 NPT + 3 Non-NPT</div>
                </div>
              </div>
            </div>

            {/* SECTION 1: COMPARATIVE SOVEREIGN TESTING LEDGER TABLE */}
            <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏛️ Sovereign Nuclear Testing Matrix</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                    (Audit of official national records, SIPRI, and US DOE NV-209 archives)
                  </span>
                </h4>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Click <strong style={{ color: '#38bdf8' }}>[🎯 Show on Globe]</strong> to isolate a country's tests and orbit to its primary proving grounds.
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Sovereign Power</th>
                      <th style={{ padding: '8px 10px' }}>Color &amp; Code</th>
                      <th style={{ padding: '8px 10px' }}>Total Tests</th>
                      <th style={{ padding: '8px 10px' }}>Atmospheric / Underground</th>
                      <th style={{ padding: '8px 10px' }}>Total Megatons</th>
                      <th style={{ padding: '8px 10px' }}>Testing Era</th>
                      <th style={{ padding: '8px 10px' }}>Max Yield Device</th>
                      <th style={{ padding: '8px 10px' }}>Responsible Authority</th>
                      <th style={{ padding: '8px 10px' }}>NPT Status</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Map Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getNuclearWeaponStates().map((nws) => {
                      const isSelected = selectedCountry === nws.country;
                      return (
                        <tr
                          key={nws.country}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                            <span style={{ marginRight: '6px', fontSize: '1.05rem' }}>{nws.flag}</span>
                            {nws.country}
                          </td>
                          <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: nws.color,
                                  boxShadow: `0 0 6px ${nws.color}`
                                }}
                              />
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: nws.color }}>
                                {nws.shortCode}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff', fontSize: '0.86rem' }}>
                            {nws.testCount.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#fb923c', fontWeight: 600 }}>{nws.atmosphericCount} atm</span>
                            <span style={{ color: '#64748b', margin: '0 4px' }}>/</span>
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{nws.undergroundCount} ug</span>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#facc15', fontWeight: 700 }}>
                            ~{nws.totalMegatons.toFixed(1)} MT
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                            {nws.firstTestYear} – {nws.lastTestYear}
                          </td>
                          <td style={{ padding: '10px', color: '#e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#f87171' }}>{nws.maxYieldDisplay}</div>
                            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>{nws.maxYieldTestName}</div>
                          </td>
                          <td style={{ padding: '10px', color: '#94a3b8', fontSize: '0.72rem', maxWidth: '200px' }}>
                            {nws.authority}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              fontSize: '0.66rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: nws.nptStatus.includes('NWS') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: nws.nptStatus.includes('NWS') ? '#34d399' : '#f87171',
                              border: `1px solid ${nws.nptStatus.includes('NWS') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              whiteSpace: 'nowrap'
                            }}>
                              {nws.nptStatus.includes('NWS') ? 'NPT NWS' : 'Non-NPT'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => focusProvingGround(nws.focusCoordinates.lat, nws.focusCoordinates.lon, nws.country)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: isSelected ? nws.color : 'rgba(255,255,255,0.06)',
                                color: isSelected ? '#000' : '#fff',
                                border: `1px solid ${nws.color}`,
                                fontWeight: 700
                              }}
                              title={`Rotate 3D Earth to ${nws.country} and show all ${nws.testCount} detonations`}
                            >
                              🎯 Show on Globe
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: GLOBAL PROVING GROUNDS ATLAS */}
            <div className="panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📍 Global Proving Grounds &amp; Test Sites Atlas</span>
                    <span style={{ fontSize: '0.74rem', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', fontWeight: 600 }}>
                      {filteredProvingGrounds.length} Historical Proving Grounds
                    </span>
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Detailed geospatial catalog of primary continental and maritime proving grounds with launch capabilities into the Visual Detonation Simulator.
                  </p>
                </div>

                {/* Country Filter Chips for Atlas */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setProvingGroundCountryFilter('all')}
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: provingGroundCountryFilter === 'all' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                      color: provingGroundCountryFilter === 'all' ? 'var(--color-primary)' : '#94a3b8',
                      border: `1px solid ${provingGroundCountryFilter === 'all' ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'}`,
                      fontWeight: provingGroundCountryFilter === 'all' ? 700 : 500
                    }}
                  >
                    All Grounds ({HISTORICAL_PROVING_GROUNDS.length})
                  </button>
                  {getNuclearWeaponStates().map((nws) => (
                    <button
                      key={nws.country}
                      type="button"
                      onClick={() => setProvingGroundCountryFilter(nws.country)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: provingGroundCountryFilter === nws.country ? `${nws.color}25` : 'rgba(255,255,255,0.03)',
                        color: provingGroundCountryFilter === nws.country ? '#fff' : '#cbd5e1',
                        borderTop: `1px solid ${provingGroundCountryFilter === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                        borderRight: `1px solid ${provingGroundCountryFilter === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                        borderBottom: `1px solid ${provingGroundCountryFilter === nws.country ? nws.color : 'rgba(255,255,255,0.08)'}`,
                        borderLeft: `3px solid ${nws.color}`,
                        fontWeight: provingGroundCountryFilter === nws.country ? 700 : 500
                      }}
                    >
                      <span>{nws.flag} {nws.shortCode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Input for Proving Grounds */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Search proving grounds by name, region, geology, or notable test (e.g. Sedan, Castle Bravo, Tsar Bomba, Canopus, Pokhran)..."
                  value={provingGroundSearchQuery}
                  onChange={(e) => setProvingGroundSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
                {provingGroundSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProvingGroundSearchQuery('')}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '0 12px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Proving Grounds Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '14px'
              }}>
                {filteredProvingGrounds.map((pg) => {
                  return (
                    <div
                      key={pg.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: `4px solid ${pg.color}`,
                        borderRadius: '8px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Card Header: Flag, Country & Era */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1.1rem' }}>{pg.flag}</span>
                            <span style={{
                              fontSize: '0.70rem',
                              fontWeight: 700,
                              color: pg.color,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: `${pg.color}15`,
                              border: `1px solid ${pg.color}33`
                            }}>
                              {pg.country} ({pg.shortCode})
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                            {pg.operationalEra}
                          </span>
                        </div>

                        {/* Title & Region */}
                        <div>
                          <h5 style={{ margin: 0, fontSize: '0.94rem', color: '#fff', lineHeight: 1.3 }}>
                            {pg.name}
                          </h5>
                          <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                            📍 {pg.region}
                          </div>
                        </div>

                        {/* Key Metrics Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            fontWeight: 600,
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            {pg.totalTests}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid rgba(56, 189, 248, 0.25)'
                          }}>
                            {pg.coordinates.lat >= 0 ? `${pg.coordinates.lat.toFixed(2)}°N` : `${Math.abs(pg.coordinates.lat).toFixed(2)}°S`},{' '}
                            {pg.coordinates.lon >= 0 ? `${pg.coordinates.lon.toFixed(2)}°E` : `${Math.abs(pg.coordinates.lon).toFixed(2)}°W`}
                          </span>
                        </div>

                        {/* Geology & Environment */}
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          <strong style={{ color: '#cbd5e1' }}>Geology:</strong> {pg.environment}
                        </div>

                        {/* Historical Significance */}
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                          {pg.significance}
                        </p>

                        {/* Notable Tests Tags */}
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>
                            Notable Detonations:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {pg.notableTests.map((test, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#e2e8f0'
                                }}
                                title={`${test.name} (${test.year}) - Yield: ${test.yield} - ${test.type}`}
                              >
                                <strong style={{ color: '#facc15' }}>{test.name}</strong> ({test.yield})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                          type="button"
                          onClick={() => focusProvingGround(pg.coordinates.lat, pg.coordinates.lon, pg.country)}
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            padding: '6px 10px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid #38bdf8',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                          title={`Rotate 3D Earth to ${pg.name} and display all ${pg.country} detonations`}
                        >
                          <span>🎯 Rotate Globe Here</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const presetParam = pg.visualSimCityId ? `&preset=${pg.visualSimCityId}` : '';
                            const yieldParam = pg.visualSimYieldKt ? `&yieldKt=${pg.visualSimYieldKt}` : '';
                            const nameParam = `&name=${encodeURIComponent(pg.name)}`;
                            navigate(`/nuclear-weapons-effects?${yieldParam}${presetParam}${nameParam}`);
                          }}
                          style={{
                            fontSize: '0.72rem',
                            padding: '6px 10px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid #ef4444',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                          title={`Simulate detonation physics and mushroom cloud at ${pg.name} in Module 8`}
                        >
                          <span>🌋 Simulate Blast ↗</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProvingGrounds.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No historical proving grounds match "{provingGroundSearchQuery}". Try searching for Nevada, Bikini, Semipalatinsk, Novaya Zemlya, or Lop Nur.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
      </div>

      {/* 8. UNIVERSAL 21 CFR PART 11 AUDIT DOSSIER MODAL */}
      {activeDossierPayload && (
        <AuditDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          payload={activeDossierPayload}
        />
      )}
    </div>
  );
};

export default GlobalNuclearMapModule;
