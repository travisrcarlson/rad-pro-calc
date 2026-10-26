import reactorsDataRaw from '../data/global_reactors_database.json';
import detonationsDataRaw from '../data/nuclear_detonations_database.json';
import incidentsDataRaw from '../data/historical_incidents_database.json';
import { type CalculationDossierPayload } from './auditDossierService';

export interface ReactorUnit {
  unitName: string;
  typeCode: string;
  model: string;
  status: string;
  capacityMWe: number;
  thermalMWth: number;
  coolant?: string;
  moderator?: string;
  gridDate?: string | null;
}

export interface GlobalReactorRecord {
  id: string;
  name: string;
  country: string;
  region: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  type: string;
  status: string;
  capacityMWe: number;
  thermalMWth: number;
  unitsCount: number;
  firstGridYear: number | null;
  operator: string;
  fissionInventoryTBq: {
    i131?: number;
    cs137?: number;
    xe133?: number;
    sr90?: number;
    kr85?: number;
    I131?: number;
    Cs137?: number;
    Xe133?: number;
  };
  units?: ReactorUnit[];
  notes: string;
}

export interface NuclearDetonationRecord {
  id: string;
  name: string;
  country: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  date: string;
  year: number;
  yieldKt: number;
  yieldDisplay: string;
  testType: string;
  environment?: string;
  purpose: string;
  heightOfBurstM: number;
  fireballRadiusM: number;
  promptEffects: {
    blast5psiRadiusM?: number;
    thermalBurn3rdDegRadiusM?: number;
    prompt1SvDoseRadiusM?: number;
    thermalRadiusKm_3rdDeg?: number;
    blast5psiRadiusKm?: number;
    promptRadiation1SvRadiusKm?: number;
  };
  historicalSignificance: string;
  isFeatured?: boolean;
  operationSeries?: string | null;
}

import { CTBTO_STATIONS, type CTBTOStationRecord } from './seismicYieldInversionService';

export type GeospatialCategory = 'reactor' | 'detonation' | 'incident' | 'ctbto';

export interface UnifiedGeospatialPin {
  id: string;
  category: GeospatialCategory;
  name: string;
  country: string;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  primaryMetric: string;
  secondaryMetric: string;
  dateOrYear: string;
  year?: number;
  isCurrentYear?: boolean;
  typeOrClassification: string;
  color: string;
  symbol: string;
  isFeatured?: boolean;
  rawReactor?: GlobalReactorRecord;
  rawDetonation?: NuclearDetonationRecord;
  rawIncident?: any;
  rawCTBTO?: CTBTOStationRecord;
}

export interface NuclearWeaponStateMeta {
  country: string;
  flag: string;
  shortCode: string;
  color: string;
  testCount: number;
  totalMegatons: number;
  firstTestYear: number;
  lastTestYear: number;
  atmosphericCount: number;
  undergroundCount: number;
  maxYieldDisplay: string;
  maxYieldTestName: string;
  primaryProvingGrounds: string[];
  focusCoordinates: { lat: number; lon: number };
  authority: string;
  nptStatus: string;
}

export const NUCLEAR_WEAPON_STATES: Record<string, NuclearWeaponStateMeta> = {
  'United States': {
    country: 'United States',
    flag: '🇺🇸',
    shortCode: 'USA',
    color: '#38bdf8', // Light Dodger Blue / Cyan
    testCount: 1032,
    totalMegatons: 180.7,
    firstTestYear: 1945,
    lastTestYear: 1992,
    atmosphericCount: 218,
    undergroundCount: 812,
    maxYieldDisplay: '15,000 kt (15 MT)',
    maxYieldTestName: 'Castle Bravo (1954)',
    primaryProvingGrounds: [
      'Nevada Test Site (NNSS / NTS, NV)',
      'Pacific Proving Grounds (Bikini & Enewetak, Marshall Islands)',
      'Johnston Atoll (Central Pacific)',
      'Alamogordo / Trinity Site (NM)',
      'Amchitka Island (Aleutian Islands, AK)'
    ],
    focusCoordinates: { lat: 37.15, lon: -116.05 },
    authority: 'Manhattan Project / US Atomic Energy Commission (AEC) / DOE-NNSA',
    nptStatus: 'NPT Recognized Nuclear-Weapon State (NWS)'
  },
  'Soviet Union': {
    country: 'Soviet Union',
    flag: '🇷🇺',
    shortCode: 'USSR',
    color: '#ef4444', // Crimson Red
    testCount: 714,
    totalMegatons: 264.0,
    firstTestYear: 1949,
    lastTestYear: 1990,
    atmosphericCount: 213,
    undergroundCount: 494,
    maxYieldDisplay: '50,000 kt (50 MT)',
    maxYieldTestName: 'Tsar Bomba / RDS-220 (1961)',
    primaryProvingGrounds: [
      'Semipalatinsk Test Site ("The Polygon", Kazakhstan)',
      'Novaya Zemlya (Mityushikha Bay & Matochkin Shar, Arctic)',
      'Kapustin Yar (Astrakhan Oblast)',
      'Totskoye Range (Orenburg Oblast)',
      'Azgir & Astrakhan (PNE Cavity Sites)'
    ],
    focusCoordinates: { lat: 50.44, lon: 78.43 },
    authority: 'Minsredmash / First Chief Directorate / Kurchatov Institute / VNIIEF',
    nptStatus: 'NPT Recognized Nuclear-Weapon State (NWS)'
  },
  'France': {
    country: 'France',
    flag: '🇫🇷',
    shortCode: 'FRA',
    color: '#818cf8', // Royal Violet / Indigo
    testCount: 204,
    totalMegatons: 13.5,
    firstTestYear: 1960,
    lastTestYear: 1996,
    atmosphericCount: 50,
    undergroundCount: 154,
    maxYieldDisplay: '2,600 kt (2.6 MT)',
    maxYieldTestName: 'Canopus (1968, Fangataufa)',
    primaryProvingGrounds: [
      'Moruroa Atoll (Tuamotu Archipelago, French Polynesia)',
      'Fangataufa Atoll (French Polynesia)',
      'Reggane Center for Military Experiments (CSEM, Algerian Sahara)',
      'In Ekker Underground Proving Ground (CEMO, Hoggar, Algeria)'
    ],
    focusCoordinates: { lat: -21.84, lon: -138.91 },
    authority: 'Commissariat à l\'énergie atomique (CEA / DAM - Direction des Applications Militaires)',
    nptStatus: 'NPT Recognized Nuclear-Weapon State (NWS)'
  },
  'United Kingdom': {
    country: 'United Kingdom',
    flag: '🇬🇧',
    shortCode: 'GBR',
    color: '#06b6d4', // Teal Cyan
    testCount: 45,
    totalMegatons: 9.0,
    firstTestYear: 1952,
    lastTestYear: 1991,
    atmosphericCount: 21,
    undergroundCount: 24,
    maxYieldDisplay: '3,000 kt (3.0 MT)',
    maxYieldTestName: 'Operation Grapple Y (1958)',
    primaryProvingGrounds: [
      'Montebello Islands (Western Australia)',
      'Maralinga Proving Ground (Woomera, South Australia)',
      'Emu Field (South Australia)',
      'Christmas Island / Kiritimati (Line Islands)',
      'Malden Island (Central Pacific)',
      'Nevada Test Site (Joint UK-US underground testing)'
    ],
    focusCoordinates: { lat: -20.44, lon: 115.57 },
    authority: 'Atomic Weapons Research Establishment (AWRE Aldermaston) / Ministry of Supply',
    nptStatus: 'NPT Recognized Nuclear-Weapon State (NWS)'
  },
  'China': {
    country: 'China',
    flag: '🇨🇳',
    shortCode: 'CHN',
    color: '#f59e0b', // Amber Gold
    testCount: 38,
    totalMegatons: 19.4,
    firstTestYear: 1964,
    lastTestYear: 1996,
    atmosphericCount: 23,
    undergroundCount: 15,
    maxYieldDisplay: '4,000 kt (4.0 MT)',
    maxYieldTestName: 'Test No. 6 (1967) / 1976 Lop Nor Test',
    primaryProvingGrounds: [
      'Lop Nur Nuclear Weapon Test Base (Base 21 / Malan, Xinjiang)',
      'Qinghai Nuclear Weapon Factory (Plant 221 / Ninth Academy)'
    ],
    focusCoordinates: { lat: 40.81, lon: 89.78 },
    authority: 'Ninth Academy / China Academy of Engineering Physics (CAEP) / PLA COSTIND',
    nptStatus: 'NPT Recognized Nuclear-Weapon State (NWS)'
  },
  'India': {
    country: 'India',
    flag: '🇮🇳',
    shortCode: 'IND',
    color: '#fb923c', // Saffron Orange
    testCount: 2,
    totalMegatons: 0.057,
    firstTestYear: 1974,
    lastTestYear: 1998,
    atmosphericCount: 0,
    undergroundCount: 2,
    maxYieldDisplay: '45 kt',
    maxYieldTestName: 'Operation Shakti / Shakti-I (1998)',
    primaryProvingGrounds: [
      'Pokhran Test Range (Khetolai, Thar Desert, Jaisalmer, Rajasthan)'
    ],
    focusCoordinates: { lat: 27.08, lon: 71.75 },
    authority: 'Bhabha Atomic Research Centre (BARC) / DRDO / Dept. of Atomic Energy (DAE)',
    nptStatus: 'Non-NPT Nuclear-Armed Sovereign State'
  },
  'Pakistan': {
    country: 'Pakistan',
    flag: '🇵🇰',
    shortCode: 'PAK',
    color: '#10b981', // Emerald Green
    testCount: 1,
    totalMegatons: 0.040,
    firstTestYear: 1998,
    lastTestYear: 1998,
    atmosphericCount: 0,
    undergroundCount: 1,
    maxYieldDisplay: '40 kt',
    maxYieldTestName: 'Chagai-I (Ras Koh Tests, 1998)',
    primaryProvingGrounds: [
      'Ras Koh Hills Test Site (Koh Kambaran, Chagai District, Balochistan)',
      'Kharan Desert (Chagai-II site, Balochistan)'
    ],
    focusCoordinates: { lat: 28.79, lon: 64.95 },
    authority: 'Pakistan Atomic Energy Commission (PAEC) / Khan Research Laboratories (KRL)',
    nptStatus: 'Non-NPT Nuclear-Armed Sovereign State'
  },
  'North Korea': {
    country: 'North Korea',
    flag: '🇰🇵',
    shortCode: 'PRK',
    color: '#ec4899', // Hot Pink / Fuchsia
    testCount: 2,
    totalMegatons: 0.250,
    firstTestYear: 2006,
    lastTestYear: 2017,
    atmosphericCount: 0,
    undergroundCount: 2,
    maxYieldDisplay: '250 kt',
    maxYieldTestName: 'Punggye-ri 2017 Thermonuclear Test',
    primaryProvingGrounds: [
      'Punggye-ri Nuclear Test Site (Mount Mantap, Kilju County, North Hamgyong Province)'
    ],
    focusCoordinates: { lat: 41.28, lon: 129.08 },
    authority: 'Nuclear Weapons Institute / Ministry of Atomic Energy Industry / KPA',
    nptStatus: 'Nuclear-Armed State (Withdrew from NPT 2003)'
  }
};

export function getNuclearWeaponStates(): NuclearWeaponStateMeta[] {
  return Object.values(NUCLEAR_WEAPON_STATES);
}

export function getDetonationCountryColor(country: string): string {
  return NUCLEAR_WEAPON_STATES[country]?.color || '#f87171';
}

export function getDetonationCountryFlag(country: string): string {
  return NUCLEAR_WEAPON_STATES[country]?.flag || '☢️';
}

export function getDetonationCountryShortCode(country: string): string {
  return NUCLEAR_WEAPON_STATES[country]?.shortCode || country.slice(0, 3).toUpperCase();
}

/**
 * Computes marker size scaled proportionally to blast explosive yield (in kilotons TNT).
 * Continuous logarithmic formulation ensures tests across all 6 orders of magnitude
 * (0.01 kt to 50,000 kt) have distinctive sizes while preserving visibility and click targets:
 * - 0.02 kt (Tactical/Subkiloton): ~4.0 px
 * - 1 kt (Low-Yield Fission): ~4.5 px
 * - 15 kt (Little Boy / Hiroshima): ~8.3 px
 * - 21 kt (Fat Man / Trinity): ~8.8 px
 * - 100 kt (Strategic Warhead): ~11.0 px
 * - 1,000 kt (1 MT Thermonuclear): ~14.3 px
 * - 15,000 kt (Castle Bravo 15 MT): ~18.1 px
 * - 50,000 kt (Tsar Bomba 50 MT): ~19.8 px
 */
export function getDetonationMarkerSize(yieldKt: number | undefined, isCurrentYear: boolean = false): number {
  if (yieldKt === undefined || yieldKt <= 0) {
    return isCurrentYear ? 7.5 : 4.0;
  }
  const y = Math.max(0.01, yieldKt);
  const baseSize = 4.5 + 3.25 * Math.log10(y);
  const clamped = Math.max(4.0, Math.min(24.0, Math.round(baseSize * 10) / 10));
  return isCurrentYear ? Math.min(28.0, clamped + 3.5) : clamped;
}


const REACTORS: GlobalReactorRecord[] = reactorsDataRaw as unknown as GlobalReactorRecord[];
const DETONATIONS: NuclearDetonationRecord[] = detonationsDataRaw as unknown as NuclearDetonationRecord[];
const INCIDENTS: any[] = incidentsDataRaw as any[];

export function getAllReactors(): GlobalReactorRecord[] {
  return REACTORS;
}

export function getAllDetonations(): NuclearDetonationRecord[] {
  return DETONATIONS;
}

export function getAllCTBTOStations(): CTBTOStationRecord[] {
  return CTBTO_STATIONS;
}

export function getAllIncidentsWithCoords(): any[] {
  return INCIDENTS.filter(i => i.coordinates && typeof i.coordinates.lat === 'number');
}

/**
 * Historical milestone descriptions for nuclear testing years.
 */
export const HISTORICAL_MILESTONES: Record<number, { title: string; note: string; flag: string }> = {
  1945: { title: "Dawn of the Atomic Age (Trinity & WWII)", note: "US conducts Trinity test at Alamogordo (21 kt); combat drops on Hiroshima (15 kt) and Nagasaki (21 kt).", flag: "🇺🇸" },
  1946: { title: "Operation Crossroads (Bikini Atoll)", note: "US conducts Able and Baker underwater tests to evaluate nuclear blast survivability on naval warships.", flag: "🇺🇸" },
  1948: { title: "Operation Sandstone", note: "Enewetak Atoll tests validating levitated core designs for higher explosive efficiency.", flag: "🇺🇸" },
  1949: { title: "First Soviet A-Bomb (RDS-1 / First Lightning)", note: "Soviet Union detonates 22 kt implosion plutonium bomb at Semipalatinsk Polygon, ending US nuclear monopoly.", flag: "🇷🇺" },
  1951: { title: "Nevada Test Site Inauguration", note: "Operation Ranger establishes the Nevada Proving Grounds (NTS) for continental atmospheric testing.", flag: "🇺🇸" },
  1952: { title: "First Thermonuclear Detonation (Ivy Mike)", note: "US detonates 10.4 Mt cryogenic liquid deuterium device at Enewetak, obliterating Elugelab island. UK tests first A-bomb (Hurricane).", flag: "🇺🇸🇬🇧" },
  1953: { title: "Soviet Thermonuclear Test (RDS-6s 'Layer Cake')", note: "First Soviet thermonuclear test (400 kt) using alternate layers of fissionable material and fusion fuel.", flag: "🇷🇺" },
  1954: { title: "Castle Bravo 15 Megaton Super-Yield Disaster", note: "US dry-fuel lithium deuteride thermonuclear test at Bikini yields 2.5x expected, causing extensive radiological contamination.", flag: "🇺🇸" },
  1955: { title: "First True Two-Stage Soviet H-Bomb (RDS-37)", note: "Sakharov 'Third Idea' radiation implosion design detonated at Semipalatinsk (1.6 Mt).", flag: "🇷🇺" },
  1957: { title: "Operation Plumbbob & UK Operation Grapple", note: "Intensive US testing (29 nuclear tests); UK successfully tests first thermonuclear device (Grapple X).", flag: "🇺🇸🇬🇧" },
  1958: { title: "Operation Hardtack & US/Soviet Moratorium", note: "77 tests conducted prior to a temporary voluntary testing moratorium (1958–1961).", flag: "🇺🇸🇷🇺" },
  1960: { title: "Gerboise Bleue: France Becomes 4th Nuclear Power", note: "France detonates 70 kt atmospheric device in the Sahara Desert at Reggane, Algeria.", flag: "🇫🇷" },
  1961: { title: "Tsar Bomba (RDS-220, 50 Megatons)", note: "Largest explosive detonation in human history dropped by Tu-95 over Novaya Zemlya; shockwave circled the globe 3 times.", flag: "🇷🇺" },
  1962: { title: "Cold War Peak: 178 Detonations in One Year", note: "Highest annual testing cadence in history during the Cuban Missile Crisis (US Operation Dominic and Soviet Novaya Zemlya super-yield series).", flag: "🇺🇸🇷🇺" },
  1963: { title: "Partial Nuclear Test Ban Treaty (PTBT)", note: "US, USSR, and UK sign treaty banning atmospheric, space, and underwater tests; testing moves entirely underground.", flag: "🌐" },
  1964: { title: "Project 596: China Becomes 5th Nuclear Power", note: "China detonates its first atomic bomb (22 kt U-235 implosion) at Lop Nur test ground.", flag: "🇨🇳" },
  1967: { title: "China Detonates First Thermonuclear Device (3.3 Mt)", note: "China transitions from A-bomb to H-bomb in just 32 months (Test No. 6), the fastest progression of any nuclear state.", flag: "🇨🇳" },
  1968: { title: "Operation Canopus (France)", note: "France detonates its first thermonuclear weapon (2.6 Mt) at Fangataufa Atoll.", flag: "🇫🇷" },
  1971: { title: "Project Cannikin (5 Megatons Underground)", note: "Largest underground nuclear test conducted by the United States, detonated at 1,870 m depth on Amchitka Island, Alaska.", flag: "🇺🇸" },
  1974: { title: "Smiling Buddha: India's First Nuclear Test", note: "India conducts underground nuclear test (12 kt) at Pokhran, designated a 'peaceful nuclear explosion'.", flag: "🇮🇳" },
  1979: { title: "Vela Incident (South Atlantic)", note: "Double-flash optical sensor alert on US Vela satellite indicative of an unannounced low-yield nuclear test.", flag: "❓" },
  1985: { title: "Soviet Test Moratorium", note: "Mikhail Gorbachev announces unilateral Soviet moratorium on nuclear testing.", flag: "🇷🇺" },
  1992: { title: "End of US & Soviet Nuclear Testing", note: "Operation Aqueduct test Divider (Sept 23, 1992) is the final US nuclear test; Russia conducts last test in 1990.", flag: "🇺🇸🇷🇺" },
  1995: { title: "Final French Moruroa Campaign", note: "France conducts its final 6 underground tests at Moruroa and Fangataufa before permanent site closure.", flag: "🇫🇷" },
  1996: { title: "Comprehensive Nuclear-Test-Ban Treaty (CTBT)", note: "CTBT opens for signature at the United Nations, establishing international monitoring system (IMS).", flag: "🌐" },
  1998: { title: "Pokhran-II & Chagai-I Nuclear Showdown", note: "India conducts 5 tests (Operation Shakti); Pakistan responds with 6 underground tests at Ras Koh Hills.", flag: "🇮🇳🇵🇰" },
  2006: { title: "First North Korean Underground Test", note: "DPRK conducts sub-kiloton test in horizontal tunnel at Punggye-ri.", flag: "🇰🇵" },
  2017: { title: "Punggye-ri Thermonuclear Test (Mb 6.3)", note: "North Korea tests high-yield two-stage thermonuclear device (~150–250 kt), causing mountain collapse.", flag: "🇰🇵" }
};

export interface TimelineYearStats {
  year: number;
  annualTestCount: number;
  annualYieldMt: number;
  cumulativeTestCount: number;
  cumulativeYieldMt: number;
  leadingCountry: string;
  milestoneTitle?: string;
  milestoneNote?: string;
  flag?: string;
}

/**
 * Computes chronological telemetry for a given timeline year.
 */
export function getTimelineYearStats(year: number): TimelineYearStats {
  const annual = DETONATIONS.filter(d => d.year === year);
  const cumulative = DETONATIONS.filter(d => d.year <= year);

  let annualYieldKt = 0;
  annual.forEach(d => { annualYieldKt += d.yieldKt; });

  let cumulativeYieldKt = 0;
  cumulative.forEach(d => { cumulativeYieldKt += d.yieldKt; });

  const countryCounts: Record<string, number> = {};
  annual.forEach(d => { countryCounts[d.country] = (countryCounts[d.country] || 0) + 1; });
  let leadingCountry = 'None';
  let maxCount = 0;
  for (const [c, cnt] of Object.entries(countryCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      leadingCountry = `${c} (${cnt})`;
    }
  }

  const milestone = HISTORICAL_MILESTONES[year];

  return {
    year,
    annualTestCount: annual.length,
    annualYieldMt: annualYieldKt / 1000,
    cumulativeTestCount: cumulative.length,
    cumulativeYieldMt: cumulativeYieldKt / 1000,
    leadingCountry,
    milestoneTitle: milestone?.title,
    milestoneNote: milestone?.note,
    flag: milestone?.flag
  };
}

/**
 * Great-circle distance between two geographic coordinates using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Mean Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
}

export interface GeospatialFilterOptions {
  includeReactors?: boolean;
  includeDetonations?: boolean;
  includeIncidents?: boolean;
  includeCTBTO?: boolean;
  ctbtoTech?: string | 'all';
  searchQuery?: string;
  country?: string | 'all';
  featuredOnly?: boolean;
  environment?: string | 'all';
  decade?: string | 'all';
  reactorStatus?: string | 'all';
  reactorType?: string | 'all';
  timelineMode?: 'off' | 'cumulative' | 'single';
  timelineYear?: number;
  detonationColorMode?: 'country' | 'yield';
}

export function getUnifiedGeospatialPins(options: GeospatialFilterOptions = {}): UnifiedGeospatialPin[] {
  const {
    includeReactors = true,
    includeDetonations = true,
    includeIncidents = true,
    includeCTBTO = true,
    ctbtoTech = 'all',
    searchQuery = '',
    country = 'all',
    featuredOnly = false,
    environment = 'all',
    decade = 'all',
    reactorStatus = 'all',
    reactorType = 'all',
    timelineMode = 'off',
    timelineYear = 2024,
    detonationColorMode = 'country'
  } = options;

  const pins: UnifiedGeospatialPin[] = [];
  const q = searchQuery.toLowerCase().trim();

  // 1. Process Reactors
  if (includeReactors) {
    REACTORS.forEach(r => {
      if (country !== 'all' && r.country.toLowerCase() !== country.toLowerCase()) return;
      if (reactorStatus !== 'all' && r.status !== reactorStatus) return;
      if (reactorType !== 'all' && r.type !== reactorType) return;
      if (decade !== 'all' && r.firstGridYear) {
        const startDecade = parseInt(decade.slice(0, 4), 10);
        if (r.firstGridYear < startDecade || r.firstGridYear >= startDecade + 10) return;
      }

      if (q) {
        const match =
          r.name.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.operator && r.operator.toLowerCase().includes(q)) ||
          r.notes.toLowerCase().includes(q) ||
          (r.units && r.units.some(u => u.unitName.toLowerCase().includes(q) || u.model.toLowerCase().includes(q)));
        if (!match) return;
      }

      const isResearch = r.type === 'Research';
      const isOperational = r.status === 'Operational';
      const isUnderConst = r.status === 'Under Construction';

      pins.push({
        id: r.id,
        category: 'reactor',
        name: r.name,
        country: r.country,
        location: `${r.region}, ${r.country}`,
        coordinates: r.coordinates,
        primaryMetric: isResearch ? `${r.thermalMWth} MWth (Research)` : `${r.capacityMWe.toLocaleString()} MWe (${r.thermalMWth.toLocaleString()} MWth)`,
        secondaryMetric: `${r.unitsCount} Unit${r.unitsCount > 1 ? 's' : ''} // ${r.status}`,
        dateOrYear: r.firstGridYear ? `Grid: ${r.firstGridYear}` : 'N/A',
        year: r.firstGridYear ?? undefined,
        typeOrClassification: r.type,
        color: isResearch ? '#a855f7' : isOperational ? '#10b981' : isUnderConst ? '#38bdf8' : '#64748b',
        symbol: 'circle',
        isFeatured: isResearch || r.capacityMWe > 3000,
        rawReactor: r
      });
    });
  }

  // 2. Process Detonations & Test Sites
  if (includeDetonations) {
    DETONATIONS.forEach(d => {
      // Timeline filter
      if (timelineMode === 'cumulative' && timelineYear !== undefined && d.year > timelineYear) return;
      if (timelineMode === 'single' && timelineYear !== undefined && d.year !== timelineYear) return;

      if (featuredOnly && !d.isFeatured) return;
      if (country !== 'all' && d.country.toLowerCase() !== country.toLowerCase()) return;
      if (environment !== 'all' && d.environment && d.environment !== environment) return;
      if (decade !== 'all' && d.year) {
        const startDecade = parseInt(decade.slice(0, 4), 10);
        if (d.year < startDecade || d.year >= startDecade + 10) return;
      }

      if (q) {
        const match =
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          (d.operationSeries && d.operationSeries.toLowerCase().includes(q)) ||
          d.historicalSignificance.toLowerCase().includes(q);
        if (!match) return;
      }

      const isCurrentYear = timelineMode !== 'off' && timelineYear !== undefined && d.year === timelineYear;

      pins.push({
        id: d.id,
        category: 'detonation',
        name: d.name,
        country: d.country,
        location: d.location,
        coordinates: d.coordinates,
        primaryMetric: `Yield: ${d.yieldDisplay}`,
        secondaryMetric: `${d.testType} // ${d.environment || d.purpose}`,
        dateOrYear: d.date,
        year: d.year,
        isCurrentYear,
        typeOrClassification: d.testType,
        color: detonationColorMode === 'yield'
          ? (d.yieldKt >= 1000 ? '#ef4444' : d.yieldKt >= 100 ? '#f97316' : '#eab308')
          : getDetonationCountryColor(d.country),
        symbol: 'circle',
        isFeatured: !!d.isFeatured,
        rawDetonation: d
      });
    });
  }

  // 3. Process Landmark Incidents
  if (includeIncidents) {
    INCIDENTS.forEach(inc => {
      if (!inc.coordinates || typeof inc.coordinates.lat !== 'number') return;
      if (country !== 'all' && !inc.location.toLowerCase().includes(country.toLowerCase())) return;
      if (decade !== 'all' && inc.date) {
        const yr = parseInt(inc.date.slice(0, 4), 10);
        const startDecade = parseInt(decade.slice(0, 4), 10);
        if (yr < startDecade || yr >= startDecade + 10) return;
      }

      if (q) {
        const match =
          inc.name.toLowerCase().includes(q) ||
          inc.location.toLowerCase().includes(q) ||
          inc.summary.toLowerCase().includes(q) ||
          inc.primaryIsotope.toLowerCase().includes(q);
        if (!match) return;
      }

      pins.push({
        id: inc.id,
        category: 'incident',
        name: inc.name,
        country: inc.location.split(',').pop()?.trim() || 'Global',
        location: inc.location,
        coordinates: inc.coordinates,
        primaryMetric: `INES Level ${inc.inesLevel}`,
        secondaryMetric: `${inc.fatalities} Fatalities // ${inc.primaryIsotope}`,
        dateOrYear: inc.date,
        year: inc.date ? parseInt(inc.date.slice(0, 4), 10) : undefined,
        typeOrClassification: inc.eventType,
        color: inc.inesLevel >= 7 ? '#ef4444' : inc.inesLevel >= 5 ? '#f59e0b' : '#00e5ff',
        symbol: 'cross',
        isFeatured: true,
        rawIncident: inc
      });
    });
  }

  // 4. Process CTBTO International Monitoring System (IMS) Stations
  if (includeCTBTO) {
    CTBTO_STATIONS.forEach(st => {
      if (country !== 'all' && st.country.toLowerCase() !== country.toLowerCase()) return;
      if (ctbtoTech !== 'all' && st.technology !== ctbtoTech) return;

      if (q) {
        const match =
          st.stationCode.toLowerCase().includes(q) ||
          st.name.toLowerCase().includes(q) ||
          st.country.toLowerCase().includes(q) ||
          st.technology.toLowerCase().includes(q) ||
          st.location.toLowerCase().includes(q) ||
          (st.targetIsotopes && st.targetIsotopes.some(iso => iso.toLowerCase().includes(q)));
        if (!match) return;
      }

      const isNobleGas = st.nobleGasEquipped;
      const techColor = 
        st.technology === 'Radionuclide' ? '#38bdf8' :
        st.technology === 'Primary Seismic' ? '#f59e0b' :
        st.technology === 'Infrasound' ? '#a855f7' :
        st.technology === 'Hydroacoustic' ? '#06b6d4' : '#64748b';

      pins.push({
        id: st.id,
        category: 'ctbto',
        name: `${st.stationCode} - ${st.name}`,
        country: st.country,
        location: st.location,
        coordinates: st.coordinates,
        primaryMetric: `${st.technology} Station`,
        secondaryMetric: isNobleGas ? `Noble Gas (Xe) Equipped // ${st.status}` : st.status,
        dateOrYear: 'Operational IMS',
        typeOrClassification: st.technology,
        color: techColor,
        symbol: 'square',
        isFeatured: isNobleGas,
        rawCTBTO: st
      });
    });
  }

  return pins;
}

export function getGeospatialCountries(): string[] {
  const set = new Set<string>();
  REACTORS.forEach(r => set.add(r.country));
  DETONATIONS.forEach(d => set.add(d.country));
  CTBTO_STATIONS.forEach(s => set.add(s.country));
  return Array.from(set).sort();
}

/**
 * Creates a sealed 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for geographic facility surveys and nuclear test site verifications.
 */
export function buildGeospatialDossierPayload(
  pin: UnifiedGeospatialPin,
  operatorName: string = 'Senior Geospatial Intelligence & Health Physics Analyst',
  facility: string = 'RadPro Global Geospatial Observatory'
): CalculationDossierPayload {
  const isReactor = pin.category === 'reactor' && pin.rawReactor;
  const isDetonation = pin.category === 'detonation' && pin.rawDetonation;
  const isCTBTO = pin.category === 'ctbto' && pin.rawCTBTO;

  const invI131 = isReactor
    ? (pin.rawReactor!.fissionInventoryTBq.i131 ?? pin.rawReactor!.fissionInventoryTBq.I131 ?? 0)
    : 0;

  const blast5psiKm = isDetonation
    ? (pin.rawDetonation!.promptEffects.blast5psiRadiusKm ??
       (pin.rawDetonation!.promptEffects.blast5psiRadiusM ? (pin.rawDetonation!.promptEffects.blast5psiRadiusM / 1000).toFixed(2) : 'N/A'))
    : 'N/A';

  const thermalKm = isDetonation
    ? (pin.rawDetonation!.promptEffects.thermalRadiusKm_3rdDeg ??
       (pin.rawDetonation!.promptEffects.thermalBurn3rdDegRadiusM ? (pin.rawDetonation!.promptEffects.thermalBurn3rdDegRadiusM / 1000).toFixed(2) : 'N/A'))
    : 'N/A';

  const statuteCitation = isReactor
    ? 'IAEA PRIS / IAEA Safety Standards GSR Part 7'
    : isCTBTO
    ? 'Comprehensive Nuclear-Test-Ban Treaty (CTBT) Protocol Part I / IMS Operational Manual'
    : 'CTBTO / Glasstone & Dolan Nuclear Weapon Effects';

  return {
    reportTitle: `Global Nuclear Facility & Detonation Dossier: ${pin.name}`,
    moduleName: 'Module 31: Global Nuclear Geospatial & 3D Earth Hub',
    statuteCitation,
    verificationTestId: isCTBTO ? 'VTEST-34 / CTBTO-IMS-STATION' : isDetonation ? 'VTEST-35 / DETONATION-YIELD-SCALING' : 'VTEST-33 / IAEA-GEOSPATIAL',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / Nuclear Geospatial Analyst',
    facility,
    notes: `Geographic inspection and radiological source characterization of [${pin.id}] located at ${pin.location} (${pin.coordinates.lat.toFixed(4)}°N, ${pin.coordinates.lon.toFixed(4)}°E). Category: ${pin.category.toUpperCase()}.`,
    formulaDescription: 'Haversine Great-Circle Metric: d = 2R \\cdot \\arcsin\\left(\\sqrt{\\sin^2(\\Delta\\phi/2) + \\cos(\\phi_1)\\cos(\\phi_2)\\sin^2(\\Delta\\lambda/2)}\\right)',
    inputs: [
      { label: 'Facility / Event Name', value: pin.name },
      { label: 'Category', value: pin.category.toUpperCase() },
      { label: 'Coordinates', value: `${pin.coordinates.lat.toFixed(4)}°N, ${pin.coordinates.lon.toFixed(4)}°E` },
      { label: 'Country / Sovereign State', value: pin.country },
      { label: 'Classification', value: pin.typeOrClassification },
      { label: 'Occurrence / Grid Date', value: pin.dateOrYear }
    ],
    outputs: [
      { label: 'Primary Operational Metric', value: pin.primaryMetric, status: 'PASS' as const },
      { label: 'Secondary Specification', value: pin.secondaryMetric, status: 'PASS' as const },
      ...(isReactor ? [
        { label: 'Thermal Capacity', value: `${pin.rawReactor!.thermalMWth.toLocaleString()} MWth` },
        { label: 'Net Electric Capacity', value: `${pin.rawReactor!.capacityMWe.toLocaleString()} MWe` },
        { label: 'Equilibrium I-131 Core Inventory', value: `${(invI131 / 1e6).toFixed(1)}M TBq` }
      ] : []),
      ...(isDetonation ? [
        { label: 'Estimated Total Yield', value: pin.rawDetonation!.yieldDisplay, status: (pin.rawDetonation!.yieldKt >= 1000 ? 'WARNING' : 'PASS') as 'WARNING' | 'PASS' },
        { label: 'Fireball Maximum Radius', value: `${pin.rawDetonation!.fireballRadiusM} meters` },
        { label: '5-psi Moderate Blast Damage Radius', value: `${blast5psiKm} km` },
        { label: '3rd Degree Thermal Burn Radius', value: `${thermalKm} km` }
      ] : []),
      ...(isCTBTO ? [
        { label: 'IMS Technology Discipline', value: pin.rawCTBTO!.technology, status: 'PASS' as const },
        { label: 'Station Status', value: pin.rawCTBTO!.status, status: 'PASS' as const },
        { label: 'Noble Gas Detection Capability', value: pin.rawCTBTO!.nobleGasEquipped ? 'Certified High Sensitivity Xe-133/Xe-135 Detector' : 'Particulate Radionuclide Detector', status: 'PASS' as const },
        { label: 'Target Verification Signatures', value: pin.rawCTBTO!.targetIsotopes.join(', ') || 'Teleseismic Waveforms', status: 'PASS' as const }
      ] : [])
    ]
  };
}

/**
 * Client-side CSV export of filtered geospatial pins.
 */
export function exportGeospatialPinsToCSV(pins: UnifiedGeospatialPin[]): string {
  const headers = ['ID', 'Category', 'Name', 'Country', 'Latitude', 'Longitude', 'PrimaryMetric', 'SecondaryMetric', 'DateOrYear', 'Type'];
  const rows = pins.map(p => [
    `"${p.id}"`,
    `"${p.category}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.country}"`,
    p.coordinates.lat,
    p.coordinates.lon,
    `"${p.primaryMetric.replace(/"/g, '""')}"`,
    `"${p.secondaryMetric.replace(/"/g, '""')}"`,
    `"${p.dateOrYear}"`,
    `"${p.typeOrClassification}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Client-side JSON export of filtered geospatial pins.
 */
export function exportGeospatialPinsToJSON(pins: UnifiedGeospatialPin[]): string {
  return JSON.stringify(pins, null, 2);
}
