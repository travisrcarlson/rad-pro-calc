import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface VisualDetonationProps {
  yieldKt: number;
  burstMode: 'surface' | 'air';
  burstAltitudeM: number;
  onYieldChange?: (y: number) => void;
  onBurstModeChange?: (mode: 'surface' | 'air') => void;
  initialCityId?: string;
}

interface CityPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  popDensityPerKm2: number;
  category?: 'city' | 'historical_test_site';
  flag?: string;
  suggestedYieldKt?: number;
  burstMode?: 'air' | 'surface';
  historicalTestName?: string;
  historicalYear?: number;
  description?: string;
}

const CITY_PRESETS: CityPreset[] = [
  // 1. Populated Metropolitan Centers
  { id: 'regina', name: 'Regina, Saskatchewan', country: 'Canada', category: 'city', flag: '🇨🇦', lat: 50.448906, lon: -104.6108, popDensityPerKm2: 2250, description: 'Capital city of Saskatchewan, Canadian Prairies' },
  { id: 'nyc', name: 'New York City (Manhattan)', country: 'United States', category: 'city', flag: '🇺🇸', lat: 40.7128, lon: -74.0060, popDensityPerKm2: 11300, description: 'Financial district and dense urban center' },
  { id: 'dc', name: 'Washington D.C. (The Capitol)', country: 'United States', category: 'city', flag: '🇺🇸', lat: 38.8899, lon: -77.0090, popDensityPerKm2: 4400, description: 'National government and federal installations' },
  { id: 'london', name: 'London (Westminster)', country: 'United Kingdom', category: 'city', flag: '🇬🇧', lat: 51.5074, lon: -0.1278, popDensityPerKm2: 5700, description: 'Central London metropolitan area' },
  { id: 'tokyo', name: 'Tokyo (Shinjuku)', country: 'Japan', category: 'city', flag: '🇯🇵', lat: 35.6895, lon: 139.6917, popDensityPerKm2: 15400, description: 'World\'s most populous metropolitan agglomeration' },
  { id: 'kyiv', name: 'Kyiv (Maidan)', country: 'Ukraine', category: 'city', flag: '🇺🇦', lat: 50.4501, lon: 30.5234, popDensityPerKm2: 3500, description: 'Capital of Ukraine, Dnipro river basin' },
  { id: 'hiroshima', name: 'Hiroshima (Ground Zero)', country: 'Japan', category: 'city', flag: '🇯🇵', lat: 34.3955, lon: 132.4536, popDensityPerKm2: 4200, suggestedYieldKt: 15, burstMode: 'air', historicalTestName: 'Little Boy combat drop', historicalYear: 1945, description: 'First wartime atomic bombing (August 6, 1945)' },
  { id: 'nagasaki', name: 'Nagasaki (Hypocenter)', country: 'Japan', category: 'city', flag: '🇯🇵', lat: 32.7702, lon: 129.8657, popDensityPerKm2: 3800, suggestedYieldKt: 21, burstMode: 'air', historicalTestName: 'Fat Man combat drop', historicalYear: 1945, description: 'Second wartime atomic bombing (August 9, 1945)' },

  // 2. Historical Nuclear Proving Grounds & Detonations (By Sovereign Nation)
  // United States 🇺🇸
  { id: 'trinity', name: 'Trinity Site (Alamogordo, NM)', country: 'United States', category: 'historical_test_site', flag: '🇺🇸', lat: 33.6753, lon: -106.4747, popDensityPerKm2: 3, suggestedYieldKt: 21, burstMode: 'surface', historicalTestName: 'Trinity (Manhattan Project)', historicalYear: 1945, description: 'World\'s first nuclear explosion (July 16, 1945)' },
  { id: 'nts_sedan', name: 'Nevada Test Site (Sedan Crater, NV)', country: 'United States', category: 'historical_test_site', flag: '🇺🇸', lat: 37.1769, lon: -116.0461, popDensityPerKm2: 1, suggestedYieldKt: 104, burstMode: 'surface', historicalTestName: 'Storax Sedan (Plowshare)', historicalYear: 1962, description: 'Largest excavation crater in North America (104 kt, 390m diameter)' },
  { id: 'castle_bravo', name: 'Bikini Atoll (Castle Bravo, Marshall Islands)', country: 'United States', category: 'historical_test_site', flag: '🇺🇸', lat: 11.6972, lon: 165.2719, popDensityPerKm2: 1, suggestedYieldKt: 15000, burstMode: 'surface', historicalTestName: 'Castle Bravo Thermonuclear Test', historicalYear: 1954, description: 'Largest US nuclear detonation (15 MT, 2.5x expected design yield)' },

  // Soviet Union 🇷🇺
  { id: 'semipalatinsk', name: 'Semipalatinsk Polygon (RDS-1, Kazakhstan)', country: 'Soviet Union', category: 'historical_test_site', flag: '🇷🇺', lat: 50.4375, lon: 78.4319, popDensityPerKm2: 2, suggestedYieldKt: 22, burstMode: 'surface', historicalTestName: 'RDS-1 ("First Lightning" / Joe-1)', historicalYear: 1949, description: 'First Soviet atomic bomb detonation (August 29, 1949)' },
  { id: 'novaya_zemlya', name: 'Novaya Zemlya (Tsar Bomba, Arctic)', country: 'Soviet Union', category: 'historical_test_site', flag: '🇷🇺', lat: 73.8500, lon: 54.5000, popDensityPerKm2: 1, suggestedYieldKt: 50000, burstMode: 'air', historicalTestName: 'Tsar Bomba / RDS-220 (50 MT)', historicalYear: 1961, description: 'Largest human-made explosion in history (50 Megatons, Oct 30, 1961)' },

  // United Kingdom 🇬🇧
  { id: 'montebello', name: 'Montebello Islands (Operation Hurricane, Australia)', country: 'United Kingdom', category: 'historical_test_site', flag: '🇬🇧', lat: -20.4417, lon: 115.5667, popDensityPerKm2: 1, suggestedYieldKt: 25, burstMode: 'surface', historicalTestName: 'Operation Hurricane (HMS Plym hull)', historicalYear: 1952, description: 'First British atomic test inside warship frigate hull (25 kt)' },
  { id: 'grapple_kiritimati', name: 'Christmas Island / Kiritimati (Grapple Y)', country: 'United Kingdom', category: 'historical_test_site', flag: '🇬🇧', lat: 1.8700, lon: -157.4300, popDensityPerKm2: 2, suggestedYieldKt: 3000, burstMode: 'air', historicalTestName: 'Operation Grapple Y Two-Stage H-Bomb', historicalYear: 1958, description: 'Largest successful British thermonuclear test (3.0 Megatons)' },

  // France 🇫🇷
  { id: 'reggane', name: 'Reggane Proving Ground (Gerboise Bleue, Algeria)', country: 'France', category: 'historical_test_site', flag: '🇫🇷', lat: 26.3139, lon: -0.0556, popDensityPerKm2: 2, suggestedYieldKt: 70, burstMode: 'surface', historicalTestName: 'Gerboise Bleue ("Blue Jerboa")', historicalYear: 1960, description: 'First French atomic bomb test in Sahara Desert (70 kt, Feb 13, 1960)' },
  { id: 'canopus_fangataufa', name: 'Fangataufa Atoll (Canopus, French Polynesia)', country: 'France', category: 'historical_test_site', flag: '🇫🇷', lat: -22.2500, lon: -138.7500, popDensityPerKm2: 1, suggestedYieldKt: 2600, burstMode: 'air', historicalTestName: 'Canopus Thermonuclear Test', historicalYear: 1968, description: 'First French two-stage thermonuclear detonation (2.6 Megatons)' },

  // China 🇨🇳
  { id: 'lop_nur', name: 'Lop Nur Test Base (Project 596, Xinjiang)', country: 'China', category: 'historical_test_site', flag: '🇨🇳', lat: 40.8100, lon: 89.7800, popDensityPerKm2: 2, suggestedYieldKt: 22, burstMode: 'surface', historicalTestName: 'Project 596 ("Chic-1")', historicalYear: 1964, description: 'First Chinese atomic bomb test at Lop Nur tower (22 kt, Oct 16, 1964)' },

  // India 🇮🇳
  { id: 'pokhran', name: 'Pokhran Test Range (Smiling Buddha, Rajasthan)', country: 'India', category: 'historical_test_site', flag: '🇮🇳', lat: 27.0800, lon: 71.7500, popDensityPerKm2: 8, suggestedYieldKt: 12, burstMode: 'surface', historicalTestName: 'Operation Smiling Buddha (Pokhran-I)', historicalYear: 1974, description: 'India\'s first peaceful nuclear explosion underground (12 kt, May 18, 1974)' },

  // Pakistan 🇵🇰
  { id: 'chagai', name: 'Ras Koh Hills (Chagai-I, Balochistan)', country: 'Pakistan', category: 'historical_test_site', flag: '🇵🇰', lat: 28.7900, lon: 64.9500, popDensityPerKm2: 4, suggestedYieldKt: 40, burstMode: 'surface', historicalTestName: 'Operation Chagai-I (Ras Koh mountain tunnel)', historicalYear: 1998, description: 'Pakistan\'s first underground nuclear tests (May 28, 1998)' },

  // North Korea 🇰🇵
  { id: 'punggye_ri', name: 'Punggye-ri Test Site (Mt. Mantap, North Korea)', country: 'North Korea', category: 'historical_test_site', flag: '🇰🇵', lat: 41.2800, lon: 129.0800, popDensityPerKm2: 6, suggestedYieldKt: 250, burstMode: 'surface', historicalTestName: '2017 Thermonuclear Test (Tunnel 2)', historicalYear: 2017, description: 'Deep horizontal tunnel test under Mt. Mantap (250 kt, mb 6.30)' }
];

export type OutriderEffectType = 'fireball' | 'radiation' | 'shockwave' | 'thermal';

interface SmokeLobe {
  relX: number; // -1 to 1 across cap width
  relY: number; // -1 to 1 across cap height
  baseRadius: number; // relative size
  phase: number;
  speed: number;
  vortexRadius: number;
  layer: 'back' | 'core' | 'front';
}

// Procedural audio synthesizer for nuclear detonation boom and rumbling shockwave
class DetonationSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    } else if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playDetonation(yieldKt: number) {
    if (this.isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const duration = Math.min(9.0, 2.5 + Math.log10(Math.max(1, yieldKt)) * 1.4);

      // 1. Initial Shock Wavefront Crack
      const crackOsc = this.ctx.createOscillator();
      const crackGain = this.ctx.createGain();
      crackOsc.type = 'sawtooth';
      crackOsc.frequency.setValueAtTime(160, now);
      crackOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
      crackGain.gain.setValueAtTime(0.6, now);
      crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      crackOsc.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.5);

      // 2. Heavy Sub-Bass Core Rumble (15 Hz to 45 Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(60, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.8);
      subOsc.frequency.exponentialRampToValueAtTime(15, now + duration);

      subGain.gain.setValueAtTime(0.75, now + 0.05);
      subGain.gain.exponentialRampToValueAtTime(0.95, now + 0.4);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + duration);

      // 3. Brown-Noise Convective Atmospheric Rumbling
      const bufferSize = this.ctx.sampleRate * duration;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.8;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(140, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(35, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.85, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {
      // Audio suppression handled
    }
  }
}

const soundEngine = new DetonationSoundEngine();

// Cache for loaded CartoDB Dark Matter map tiles
const tileImageCache = new Map<string, HTMLImageElement>();

export const VisualDetonationSimulator: React.FC<VisualDetonationProps> = ({
  yieldKt,
  burstMode,
  burstAltitudeM,
  onYieldChange,
  onBurstModeChange,
  initialCityId
}) => {
  // Simulator View Mode: 'profile' (Mushroom Cloud Elevation), 'map' (Outrider Blast Zones), 'split' (Dual)
  const [viewMode, setViewMode] = useState<'profile' | 'map' | 'split'>('profile');

  // Selected Effect for Outrider Card Inspection
  const [selectedEffect, setSelectedEffect] = useState<OutriderEffectType | null>(null);

  // Unit of Measurement: Imperial (miles/ft) vs Metric (km/m)
  const [unitMode, setUnitMode] = useState<'imperial' | 'metric'>('imperial');

  // Simulation Clock & Animation State
  const [simTimeSeconds, setSimTimeSeconds] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [flashIntensity, setFlashIntensity] = useState<number>(0.0);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0.0);

  // Selected City Preset for Casualties & Map Center
  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    if (initialCityId && CITY_PRESETS.some(c => c.id === initialCityId)) {
      return initialCityId;
    }
    return 'regina';
  });

  // Sync if initialCityId prop updates dynamically
  useEffect(() => {
    if (initialCityId && CITY_PRESETS.some(c => c.id === initialCityId)) {
      setSelectedCityId(initialCityId);
      const match = CITY_PRESETS.find(c => c.id === initialCityId);
      if (match?.suggestedYieldKt && onYieldChange) {
        onYieldChange(match.suggestedYieldKt);
      }
      if (match?.burstMode && onBurstModeChange) {
        onBurstModeChange(match.burstMode);
      }
    }
  }, [initialCityId, onYieldChange, onBurstModeChange]);

  // Canvas References
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Current City
  const currentCity = useMemo(() => {
    return CITY_PRESETS.find(c => c.id === selectedCityId) || CITY_PRESETS[0];
  }, [selectedCityId]);

  // --- GLASSTONE & DOLAN / DEFENSE NUCLEAR AGENCY MUSHROOM CLOUD PHYSICS ---
  const cloudPhysics = useMemo(() => {
    const y = Math.max(0.001, yieldKt);

    // 1. Fireball Maximum Radius (Glasstone & Dolan Eq. 2.110: R ~ 70 * Y^0.38 m)
    const rFireballM = Math.round(70 * Math.pow(y, 0.38));
    const rFireballKm = rFireballM / 1000.0;
    const rFireballMiles = rFireballKm * 0.621371;

    // 2. Cloud Top Height (H_top in km)
    let hTopKm = 12.0;
    if (y <= 20) {
      hTopKm = 10.0 * Math.pow(y, 0.20);
    } else if (y <= 1000) {
      hTopKm = 12.0 * Math.pow(y / 20.0, 0.23);
    } else {
      hTopKm = 25.0 * Math.pow(y / 1000.0, 0.22);
    }
    const hTopMiles = hTopKm * 0.621371;
    const hTopFeet = hTopKm * 3280.84;

    // 3. Cloud Base Height (H_base in km)
    const hBaseFraction = Math.max(0.48, Math.min(0.68, 0.62 - 0.04 * Math.log10(Math.max(1, y / 20.0))));
    const hBaseKm = hTopKm * hBaseFraction;
    const hBaseMiles = hBaseKm * 0.621371;

    // 4. Cloud Cap Diameter (D_cap in km)
    let dCapKm = 5.5;
    if (y <= 20) {
      dCapKm = 5.5 * Math.pow(y / 15.0, 0.35);
    } else {
      dCapKm = 6.0 * Math.pow(y / 20.0, 0.38);
    }
    const dCapMiles = dCapKm * 0.621371;

    // 5. Cloud Stem Diameter (D_stem in km)
    const dStemKm = Math.max(0.25, dCapKm * 0.20);
    const dStemMiles = dStemKm * 0.621371;

    // 6. Buoyant Ascent Half-Time & Stabilization Time
    const tRiseHalf = Math.max(14, Math.round(28 * Math.pow(y, 0.22))); // seconds to half height
    const tStabilize = Math.max(180, Math.round(240 * Math.pow(y, 0.15))); // ~4-8 minutes

    // 7. Outrider 4-Tier Damage Zones (Exact Kinematic Formulations)
    // Zone 1: Fireball Radius
    const rZone1_FireballKm = rFireballKm;
    const rZone1_FireballMiles = rFireballMiles;

    // Zone 2: Radiation / Heavy Blast (20 psi) Radius
    const rZone2_Heavy20psiKm = Math.max(rFireballKm * 1.15, 0.38 * Math.pow(y, 0.33));
    const rZone2_Heavy20psiMiles = rZone2_Heavy20psiKm * 0.621371;

    // Zone 3: Moderate Blast (5 psi) Radius
    const rZone3_Mod5psiKm = Math.max(rZone2_Heavy20psiKm * 1.8, 0.95 * Math.pow(y, 0.33));
    const rZone3_Mod5psiMiles = rZone3_Mod5psiKm * 0.621371;

    // Zone 4: Thermal Radiation (3rd Degree Burns) Radius
    const rZone4_Thermal3rdKm = Math.max(rZone3_Mod5psiKm * 1.1, 0.82 * Math.pow(y, 0.41));
    const rZone4_Thermal3rdMiles = rZone4_Thermal3rdKm * 0.621371;

    return {
      rFireballKm,
      rFireballM,
      rFireballMiles,
      hTopKm,
      hTopMiles,
      hTopFeet,
      hBaseKm,
      hBaseMiles,
      dCapKm,
      dCapMiles,
      dStemKm,
      dStemMiles,
      tRiseHalf,
      tStabilize,
      rZone1_FireballKm,
      rZone1_FireballMiles,
      rZone2_Heavy20psiKm,
      rZone2_Heavy20psiMiles,
      rZone3_Mod5psiKm,
      rZone3_Mod5psiMiles,
      rZone4_Thermal3rdKm,
      rZone4_Thermal3rdMiles
    };
  }, [yieldKt]);

  // --- OUTRIDER CASUALTY & HUMAN IMPACT CALCULATOR ---
  const casualties = useMemo(() => {
    const density = currentCity.popDensityPerKm2;
    const { rZone1_FireballKm, rZone2_Heavy20psiKm, rZone3_Mod5psiKm, rZone4_Thermal3rdKm } = cloudPhysics;

    const areaFireballKm2 = Math.PI * rZone1_FireballKm * rZone1_FireballKm;
    const area20psiKm2 = Math.PI * rZone2_Heavy20psiKm * rZone2_Heavy20psiKm;
    const area5psiKm2 = Math.PI * rZone3_Mod5psiKm * rZone3_Mod5psiKm;
    const areaThermalKm2 = Math.PI * rZone4_Thermal3rdKm * rZone4_Thermal3rdKm;

    const fatZone2 = area20psiKm2 * density * 0.98;
    const annulus5psi = Math.max(0, area5psiKm2 - area20psiKm2);
    const fatZone3 = annulus5psi * density * 0.50;
    const injZone3 = annulus5psi * density * 0.40;

    const annulusThermal = Math.max(0, areaThermalKm2 - area5psiKm2);
    const fatZone4 = annulusThermal * density * 0.15;
    const injZone4 = annulusThermal * density * 0.55;

    const totalFatalities = Math.round(fatZone2 + fatZone3 + fatZone4);
    const totalInjuries = Math.round(injZone3 + injZone4);
    const totalImpactAreaKm2 = Math.round(areaThermalKm2);
    const totalImpactAreaSqMi = Math.round(areaThermalKm2 * 0.386102);

    return {
      totalFatalities,
      totalInjuries,
      totalImpactAreaKm2,
      totalImpactAreaSqMi,
      areaFireballKm2: areaFireballKm2.toFixed(2),
      areaFireballSqMi: (areaFireballKm2 * 0.386102).toFixed(2),
      area20psiKm2: area20psiKm2.toFixed(2),
      area20psiSqMi: (area20psiKm2 * 0.386102).toFixed(2),
      area5psiKm2: area5psiKm2.toFixed(2),
      area5psiSqMi: (area5psiKm2 * 0.386102).toFixed(2),
      areaThermalKm2: areaThermalKm2.toFixed(2),
      areaThermalSqMi: (areaThermalKm2 * 0.386102).toFixed(2),
      fatalitiesRadiation: Math.round(fatZone2),
      fatalitiesBlast: Math.round(fatZone3),
      injuriesBlast: Math.round(injZone3),
      fatalitiesThermal: Math.round(fatZone4),
      injuriesThermal: Math.round(injZone4)
    };
  }, [cloudPhysics, currentCity]);

  // Pre-generate Structured 3D Toroidal Vortex Lobes (Depth-Sorted Back -> Core -> Front)
  const smokeLobes = useMemo<SmokeLobe[]>(() => {
    const lobes: SmokeLobe[] = [];
    const count = 84;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      // Deterministic Phyllotaxis distribution across left/right toroidal vortex rings and central dome
      const frac = (i + 0.5) / count;
      const theta = i * golden;
      // Concentrate billows along the toroidal ring perimeter (0.35..0.92) + dome crown
      const ringBias = 0.25 + 0.70 * Math.pow(frac, 0.65);
      const relX = Math.cos(theta) * ringBias;
      // Flattened stratospheric anvil top and rounded toroidal underside
      const rawY = Math.sin(theta) * ringBias;
      const relY = rawY < 0 ? rawY * 0.48 : rawY * 0.62;
      const baseRadius = 0.20 + (1 - Math.abs(rawY) * 0.35) * 0.14 + ((i * 17) % 7) * 0.012;
      const phase = (i * 1.13) % (Math.PI * 2);
      const speed = 0.55 + ((i * 23) % 11) * 0.055;
      const layer: 'back' | 'core' | 'front' =
        rawY < -0.22 ? 'back' : Math.abs(relX) < 0.58 && rawY > -0.15 ? 'core' : 'front';

      lobes.push({
        relX,
        relY,
        baseRadius,
        phase,
        speed,
        vortexRadius: ringBias,
        layer
      });
    }
    const order = { back: 0, core: 1, front: 2 };
    return lobes.sort((a, b) => order[a.layer] - order[b.layer]);
  }, []);

  // --- TRIGGER DETONATION EVENT ---
  const triggerDetonation = useCallback(() => {
    setSimTimeSeconds(0.0);
    setIsPlaying(true);
    setFlashIntensity(1.0);
    setShakeIntensity(1.0);
    soundEngine.playDetonation(yieldKt);
  }, [yieldKt]);

  // Toggle Mute Audio
  const toggleMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // --- SIMULATION TICK LOOP ---
  useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = now;
      const deltaSec = (now - lastTimestampRef.current) / 1000.0;
      lastTimestampRef.current = now;

      if (isPlaying && active) {
        setSimTimeSeconds((prev) => {
          const next = prev + deltaSec * playSpeed;
          return Math.min(600, next);
        });

        // Flash and camera shake decay
        setFlashIntensity((prev) => Math.max(0, prev - deltaSec * 1.6));
        setShakeIntensity((prev) => Math.max(0, prev - deltaSec * 1.2));
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimestampRef.current = null;
    };
  }, [isPlaying, playSpeed]);

  // Initial detonation trigger
  useEffect(() => {
    triggerDetonation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- PRELOAD CARTO-DB DARK MAP TILES FOR SELECTED CITY ---
  useEffect(() => {
    const { rZone4_Thermal3rdKm } = cloudPhysics;
    // Choose appropriate zoom level so the thermal zone fits nicely on canvas
    let zoom = 11;
    if (rZone4_Thermal3rdKm < 2.5) zoom = 13;
    else if (rZone4_Thermal3rdKm < 6.0) zoom = 12;
    else if (rZone4_Thermal3rdKm < 15.0) zoom = 11;
    else if (rZone4_Thermal3rdKm < 35.0) zoom = 10;
    else if (rZone4_Thermal3rdKm < 80.0) zoom = 9;
    else zoom = 8;

    const n = Math.pow(2, zoom);
    const centerTileX = Math.floor(((currentCity.lon + 180.0) / 360.0) * n);
    const latRad = (currentCity.lat * Math.PI) / 180.0;
    const centerTileY = Math.floor(
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n
    );

    // Preload a 5x5 grid of surrounding map tiles
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const tileKey = `${zoom}/${tx}/${ty}`;
        if (!tileImageCache.has(tileKey)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`;
          img.onload = () => {
            tileImageCache.set(tileKey, img);
          };
          tileImageCache.set(tileKey, img);
        }
      }
    }
  }, [currentCity, cloudPhysics]);

  // --- CANVAS 1: VOLUMETRIC ATMOSPHERIC PROFILE & MUSHROOM CLOUD SIMULATOR ---
  useEffect(() => {
    const canvas = profileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const t = simTimeSeconds;
    const { hTopKm, hBaseKm, dCapKm, dStemKm, rFireballKm, tRiseHalf } = cloudPhysics;

    // Viewport altitude range: 0 km to max(35 km, hTopKm * 1.3)
    const maxAltKm = Math.max(35, Math.ceil((hTopKm * 1.3) / 10) * 10);
    const groundY = height - 48;

    const kmToY = (altKm: number) => {
      const frac = altKm / maxAltKm;
      return groundY - frac * (groundY - 42);
    };

    const kmToPixelsX = (distKm: number) => {
      const visibleWidthKm = Math.max(dCapKm * 3.0, 34);
      return (distKm / visibleWidthKm) * (width * 0.76);
    };

    // Camera Shake Offset during initial shockwave arrival
    let shakeX = 0, shakeY = 0;
    if (shakeIntensity > 0.01) {
      shakeX = (Math.random() - 0.5) * 7 * shakeIntensity;
      shakeY = (Math.random() - 0.5) * 7 * shakeIntensity;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Atmospheric Sky Gradient (with thermal horizon glow during early fireball phase)
    const horizonGlow = Math.max(0, 1.0 - t / 45.0);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0.0, '#02040a'); // Mesosphere
    skyGradient.addColorStop(0.35, '#060d1f'); // Upper Stratosphere
    skyGradient.addColorStop(0.68, '#0b1933'); // Lower Stratosphere
    skyGradient.addColorStop(0.88, horizonGlow > 0.1 ? `rgb(${Math.round(18 + 55 * horizonGlow)}, ${Math.round(35 + 22 * horizonGlow)}, 68)` : '#122648');
    skyGradient.addColorStop(1.0, horizonGlow > 0.1 ? `rgb(${Math.round(28 + 110 * horizonGlow)}, ${Math.round(48 + 45 * horizonGlow)}, 82)` : '#18345e');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    // 2. High-Altitude Stars (Upper Stratosphere / Mesosphere)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    for (let s = 0; s < 45; s++) {
      const sx = (s * 79.19) % width;
      const sy = (s * 29.41) % (groundY * 0.36);
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }

    // 3. Atmospheric Layer Boundaries (Right-Aligned Badges so they NEVER overlap Left Scale Landmarks)
    const drawAtmBoundary = (altKm: number, label: string, strokeCol: string, badgeCol: string) => {
      if (altKm > maxAltKm * 0.96) return;
      const yPos = kmToY(altKm);
      ctx.save();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(54, yPos);
      ctx.lineTo(width - 14, yPos);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 9.5px Inter, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(width - tw - 24, yPos - 14, tw + 12, 13);
      ctx.fillStyle = badgeCol;
      ctx.textAlign = 'right';
      ctx.fillText(label, width - 18, yPos - 4);
      ctx.restore();
    };

    drawAtmBoundary(
      12.0,
      unitMode === 'imperial' ? 'TROPOPAUSE (7.5 mi / 39,000 ft)' : 'TROPOPAUSE (12 km / 39,000 ft)',
      'rgba(0, 229, 255, 0.22)',
      'rgba(56, 189, 248, 0.85)'
    );
    if (maxAltKm >= 50) {
      drawAtmBoundary(
        50.0,
        unitMode === 'imperial' ? 'STRATOPAUSE (31 mi / 164,000 ft)' : 'STRATOPAUSE (50 km / 164,000 ft)',
        'rgba(245, 158, 11, 0.22)',
        'rgba(251, 191, 36, 0.85)'
      );
    }

    // 4. Distant Mountain Silhouette Ranges
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let mx = 0; mx <= width; mx += 28) {
      const my = groundY - 9 - Math.sin(mx * 0.015) * 7 - Math.cos(mx * 0.04) * 5;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();

    // 5. Left Altitude Ruler (x = 0..54)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.78)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    const altStep = maxAltKm >= 60 ? 10 : 5;
    for (let alt = 0; alt <= maxAltKm; alt += altStep) {
      const yPos = kmToY(alt);
      const label = unitMode === 'imperial'
        ? `${Math.round(alt * 0.621371)} mi`
        : `${alt} km`;
      ctx.fillText(label, 46, yPos + 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.moveTo(50, yPos);
      ctx.lineTo(55, yPos);
      ctx.stroke();
    }
    ctx.textAlign = 'left';

    // 6. COLLISION-FREE REFERENCE LANDMARKS IN DEDICATED LEFT LANE (x = 62..220)
    // A. Burj Khalifa (828 m)
    const burjY = kmToY(0.83);
    const burjX = 66;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.fillRect(burjX, Math.min(groundY - 4, burjY), 2, Math.max(4, groundY - burjY));

    // B. Mt. Everest Silhouette (8.85 km)
    const everestY = kmToY(8.85);
    const everestX = 92;
    ctx.beginPath();
    ctx.moveTo(everestX - 24, groundY);
    ctx.lineTo(everestX - 6, everestY + 10);
    ctx.lineTo(everestX, everestY);
    ctx.lineTo(everestX + 8, everestY + 14);
    ctx.lineTo(everestX + 28, groundY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(71, 85, 105, 0.48)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Snow Cap on Everest
    ctx.beginPath();
    ctx.moveTo(everestX - 6, everestY + 10);
    ctx.lineTo(everestX, everestY);
    ctx.lineTo(everestX + 6, everestY + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    // C. Commercial Jetliner Icon (11.0 km)
    const planeY = kmToY(11.0);
    const planeX = 96;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(planeX - 32, planeY);
    ctx.lineTo(planeX - 6, planeY);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(planeX + 7, planeY);
    ctx.lineTo(planeX - 5, planeY - 3.5);
    ctx.lineTo(planeX - 3, planeY);
    ctx.lineTo(planeX - 5, planeY + 3.5);
    ctx.closePath();
    ctx.fill();

    // D. SR-71 Blackbird Icon (24.0 km)
    const spyY = kmToY(24.0);
    const spyX = 96;
    if (maxAltKm >= 28) {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(spyX + 7, spyY);
      ctx.lineTo(spyX - 5, spyY - 3);
      ctx.lineTo(spyX - 8, spyY);
      ctx.lineTo(spyX - 5, spyY + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Staggered Non-Overlapping Reference Callout Labels (guaranteed minimum 15px vertical spacing)
    const rawLandmarks = [
      { anchorX: burjX + 4, anchorY: groundY - 6, text: unitMode === 'imperial' ? '🏢 Burj Khalifa (2,722 ft)' : '🏢 Burj Khalifa (828 m)', color: '#cbd5e1' },
      { anchorX: everestX + 6, anchorY: everestY + 2, text: unitMode === 'imperial' ? '▲ Mt. Everest (5.5 mi)' : '▲ Mt. Everest (8.85 km)', color: '#f1f5f9' },
      { anchorX: planeX + 10, anchorY: planeY, text: unitMode === 'imperial' ? '✈ Airliner (6.8 mi)' : '✈ Airliner (11 km)', color: '#38bdf8' },
      ...(maxAltKm >= 28 ? [{ anchorX: spyX + 10, anchorY: spyY, text: unitMode === 'imperial' ? '⚡ SR-71 (15 mi)' : '⚡ SR-71 (24 km)', color: '#c084fc' }] : [])
    ];

    // Enforce minimum 16px vertical separation from bottom to top so labels never collide at any yield
    let lastLabelY = groundY + 10;
    const labelX = 116;
    rawLandmarks.forEach((lm) => {
      const safeY = Math.min(lm.anchorY, lastLabelY - 16);
      lastLabelY = safeY;

      // Subtle leader line connecting icon to label
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(lm.anchorX, lm.anchorY);
      ctx.lineTo(labelX - 4, safeY - 3);
      ctx.stroke();

      // Backing pill for crisp legibility
      ctx.font = '500 9.5px Inter, sans-serif';
      const tw = ctx.measureText(lm.text).width;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
      ctx.fillRect(labelX - 3, safeY - 11, tw + 6, 13);
      ctx.fillStyle = lm.color;
      ctx.fillText(lm.text, labelX, safeY - 1);
    });

    // 7. PHASED, NON-OVERLAPPING NUCLEAR DETONATION & MUSHROOM CLOUD KINEMATICS
    const centerX = width * 0.56;
    const hobKm = burstMode === 'air' ? Math.max(0.15, burstAltitudeM / 1000.0) : 0;

    // Smooth buoyant rise curve: starts at HOB (or ground) and ascends toward stabilized cap altitude
    const riseProgress = Math.pow(t / (t + tRiseHalf), 0.92);
    const currentTopKm = Math.max(hobKm + rFireballKm * 1.15, hobKm * (1 - riseProgress) + hTopKm * riseProgress);
    const currentBaseKm = Math.max(
      hobKm * (1 - riseProgress),
      hBaseKm * Math.pow(riseProgress, 1.18)
    );
    const currentCapWidthKm = Math.max(rFireballKm * 2.0, dCapKm * Math.pow(riseProgress, 0.78));
    const currentStemWidthKm = Math.max(rFireballKm * 0.55, dStemKm * Math.pow(riseProgress, 0.58));

    const topY = kmToY(currentTopKm);
    const baseY = kmToY(currentBaseKm);
    const capCenterY = (topY + baseY) / 2;
    const capRadiusY = Math.max(14, (baseY - topY) / 2);
    const capWidthPx = Math.max(28, kmToPixelsX(currentCapWidthKm));
    const capRadiusX = capWidthPx / 2;
    const stemWidthPx = Math.max(12, kmToPixelsX(currentStemWidthKm));

    // PHASE A: UPDRAFT SUCTION STEM & GROUND BASE SURGE (Begins forming as fireball lifts off, t >= 1.0s)
    if (t >= 1.0) {
      const stemReveal = Math.min(1.0, (t - 1.0) / 2.2);
      const stemTopY = groundY - stemReveal * (groundY - (baseY + capRadiusY * 0.15));

      // 1. Sculpted Continuous Hyperbolic Stem Column (replaces beaded stack of circles!)
      ctx.save();
      ctx.beginPath();
      const baseSkirtHalfW = stemWidthPx * (burstMode === 'surface' ? 1.45 : 1.15);
      const throatHalfW = stemWidthPx * 0.46;
      const upperFlaredHalfW = Math.min(capRadiusX * 0.65, stemWidthPx * 0.92);
      const midStemY = groundY * 0.45 + stemTopY * 0.55;

      ctx.moveTo(centerX - baseSkirtHalfW, groundY);
      ctx.quadraticCurveTo(centerX - throatHalfW, midStemY, centerX - upperFlaredHalfW, stemTopY);
      ctx.lineTo(centerX + upperFlaredHalfW, stemTopY);
      ctx.quadraticCurveTo(centerX + throatHalfW, midStemY, centerX + baseSkirtHalfW, groundY);
      ctx.closePath();

      // 3D Cylindrical Stem Shading + Internal Incandescent Updraft Illumination
      const hotCoreFrac = Math.max(0, 1.0 - t / 110.0);
      const stemCylGrad = ctx.createLinearGradient(centerX - baseSkirtHalfW, midStemY, centerX + baseSkirtHalfW, midStemY);
      if (burstMode === 'surface') {
        stemCylGrad.addColorStop(0.0, `rgba(28, 20, 16, ${0.88 * stemReveal})`);
        stemCylGrad.addColorStop(0.25, `rgba(68, 48, 36, ${0.94 * stemReveal})`);
        stemCylGrad.addColorStop(0.5, `rgba(${Math.round(95 + 145 * hotCoreFrac)}, ${Math.round(70 + 75 * hotCoreFrac)}, ${Math.round(52 + 20 * hotCoreFrac)}, ${0.96 * stemReveal})`);
        stemCylGrad.addColorStop(0.75, `rgba(62, 44, 34, ${0.94 * stemReveal})`);
        stemCylGrad.addColorStop(1.0, `rgba(24, 18, 14, ${0.88 * stemReveal})`);
      } else {
        stemCylGrad.addColorStop(0.0, `rgba(30, 36, 48, ${0.82 * stemReveal})`);
        stemCylGrad.addColorStop(0.28, `rgba(75, 82, 96, ${0.90 * stemReveal})`);
        stemCylGrad.addColorStop(0.5, `rgba(${Math.round(125 + 120 * hotCoreFrac)}, ${Math.round(128 + 55 * hotCoreFrac)}, ${Math.round(138 - 20 * hotCoreFrac)}, ${0.94 * stemReveal})`);
        stemCylGrad.addColorStop(0.72, `rgba(70, 76, 90, ${0.90 * stemReveal})`);
        stemCylGrad.addColorStop(1.0, `rgba(26, 32, 44, ${0.82 * stemReveal})`);
      }
      ctx.fillStyle = stemCylGrad;
      ctx.fill();

      // 2. Soft Billowing Boundary Eddies along Stem Flanks
      const flankBillows = 10;
      for (let b = 0; b < flankBillows; b++) {
        const bf = (b + 0.5) / flankBillows;
        const by = groundY - bf * (groundY - stemTopY);
        const halfW = throatHalfW + Math.pow(bf - 0.45, 2) * stemWidthPx * 1.4;
        const bRad = Math.max(6, stemWidthPx * (0.28 + 0.08 * Math.sin(bf * 9 + t * 0.6)));
        [-1, 1].forEach((side) => {
          const bx = centerX + side * halfW * 0.85;
          const bGrad = ctx.createRadialGradient(bx - side * bRad * 0.2, by, 1, bx, by, bRad);
          bGrad.addColorStop(0.0, burstMode === 'surface' ? `rgba(92, 68, 52, ${0.55 * stemReveal})` : `rgba(120, 128, 142, ${0.50 * stemReveal})`);
          bGrad.addColorStop(0.65, burstMode === 'surface' ? `rgba(48, 34, 26, ${0.45 * stemReveal})` : `rgba(60, 66, 78, ${0.42 * stemReveal})`);
          bGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, bRad, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 3. Ascending Bell-Shaped Condensation Skirt Rings (Rayleigh-Taylor Stem Collars)
      if (t >= 3.5) {
        const collarY = groundY - 0.62 * (groundY - stemTopY);
        const collarW = throatHalfW * 2.15;
        const collarGrad = ctx.createRadialGradient(centerX, collarY, collarW * 0.2, centerX, collarY, collarW);
        collarGrad.addColorStop(0.0, `rgba(226, 232, 240, ${0.38 * stemReveal})`);
        collarGrad.addColorStop(0.6, `rgba(148, 163, 184, ${0.28 * stemReveal})`);
        collarGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.0)');
        ctx.fillStyle = collarGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, collarY, collarW, Math.max(5, collarW * 0.22), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Rolling Ground Debris Base Surge Cloud
      const surgeWidthPx = Math.min(width * 0.34, baseSkirtHalfW * (1.5 + Math.min(1.6, t * 0.08)));
      const surgeHeightPx = Math.max(8, Math.min(26, stemWidthPx * 0.42));
      const surgeGrad = ctx.createRadialGradient(centerX, groundY, surgeWidthPx * 0.1, centerX, groundY, surgeWidthPx);
      surgeGrad.addColorStop(0.0, burstMode === 'surface' ? `rgba(105, 76, 56, ${0.85 * stemReveal})` : `rgba(110, 118, 130, ${0.55 * stemReveal})`);
      surgeGrad.addColorStop(0.65, burstMode === 'surface' ? `rgba(58, 42, 32, ${0.65 * stemReveal})` : `rgba(64, 70, 82, ${0.35 * stemReveal})`);
      surgeGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
      ctx.fillStyle = surgeGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, groundY - 2, surgeWidthPx, surgeHeightPx, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // PHASE B: VOLUMETRIC TOROIDAL MUSHROOM CAP & INCANDESCENT FIREBALL CORE
    // Seamless evolution from pure plasma fireball (t < 1.5s) -> glowing toroidal vortex (1.5..25s) -> towering anvil cloud (25s+)
    const smokeMaturity = Math.max(0, Math.min(1.0, (t - 1.2) / 6.5)); // 0 during initial pure fireball, 1 when toroidal smoke cap forms
    const plasmaIntensity = Math.max(0.08, Math.exp(-t / 55.0)); // Incandescent core glow persists and slowly cools

    // B1. Back-Layer Toroidal Smoke Billows (drawn BEHIND the incandescent plasma core)
    if (smokeMaturity > 0.02) {
      smokeLobes.forEach((lobe) => {
        if (lobe.layer !== 'back') return;
        const side = lobe.relX >= 0 ? 1 : -1;
        const rollAngle = lobe.phase + t * lobe.speed * 0.32 * side;
        const lobeX = centerX + lobe.relX * capRadiusX + Math.cos(rollAngle) * 4;
        const lobeY = capCenterY + lobe.relY * capRadiusY + Math.sin(rollAngle) * 3;
        const lobeR = Math.max(8, lobe.baseRadius * capRadiusX);

        const grad = ctx.createRadialGradient(
          lobeX - side * lobeR * 0.22,
          lobeY + lobeR * 0.25,
          lobeR * 0.08,
          lobeX,
          lobeY,
          lobeR
        );
        grad.addColorStop(0.0, `rgba(${Math.round(95 + 90 * plasmaIntensity)}, ${Math.round(82 + 40 * plasmaIntensity)}, 75, ${0.78 * smokeMaturity})`);
        grad.addColorStop(0.55, `rgba(52, 56, 68, ${0.84 * smokeMaturity})`);
        grad.addColorStop(0.9, `rgba(26, 30, 40, ${0.75 * smokeMaturity})`);
        grad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lobeX, lobeY, lobeR, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // B2. Primary Incandescent Plasma Fireball & Toroidal Ring Core
    {
      const fbExpand = t < 0.6 ? 0.35 + 0.65 * (t / 0.6) : 1.0;
      const coreRx = capRadiusX * fbExpand * (1.0 - 0.18 * smokeMaturity);
      const coreRy = capRadiusY * fbExpand * (1.0 - 0.12 * smokeMaturity);

      // Outer thermal bloom halo
      const haloGrad = ctx.createRadialGradient(centerX, capCenterY, coreRx * 0.1, centerX, capCenterY, coreRx * 1.45);
      haloGrad.addColorStop(0.0, `rgba(255, 255, 240, ${0.98 * plasmaIntensity})`);
      haloGrad.addColorStop(0.28, `rgba(254, 240, 138, ${0.92 * plasmaIntensity})`);
      haloGrad.addColorStop(0.58, `rgba(249, 115, 22, ${0.82 * plasmaIntensity})`);
      haloGrad.addColorStop(0.82, `rgba(220, 38, 38, ${0.55 * plasmaIntensity})`);
      haloGrad.addColorStop(1.0, 'rgba(185, 28, 28, 0.0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, capCenterY, coreRx * 1.35, coreRy * 1.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left & Right Toroidal Plasma Vortex Cores (visible as the fireball rolls into a doughnut)
      if (t >= 1.2 && plasmaIntensity > 0.12) {
        [-0.48, 0.48].forEach((offsetFrac) => {
          const vx = centerX + offsetFrac * capRadiusX;
          const vy = capCenterY + capRadiusY * 0.08;
          const vr = Math.max(10, capRadiusX * 0.42);
          const vGrad = ctx.createRadialGradient(vx, vy, 1, vx, vy, vr);
          vGrad.addColorStop(0.0, `rgba(255, 250, 220, ${0.92 * plasmaIntensity})`);
          vGrad.addColorStop(0.45, `rgba(251, 146, 60, ${0.78 * plasmaIntensity})`);
          vGrad.addColorStop(0.8, `rgba(185, 28, 28, ${0.42 * plasmaIntensity})`);
          vGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
          ctx.fillStyle = vGrad;
          ctx.beginPath();
          ctx.arc(vx, vy, vr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // B3. Core & Front Toroidal Cauliflower Lobes (Translucent rims so internal plasma fire shines through!)
    if (smokeMaturity > 0.05) {
      smokeLobes.forEach((lobe) => {
        if (lobe.layer === 'back') return;
        const side = lobe.relX >= 0 ? 1 : -1;
        // Authentic toroidal circulation: inner throat rises, outer rim curls down and inward
        const rollAngle = lobe.phase + t * lobe.speed * 0.36;
        const lobeX = centerX + lobe.relX * capRadiusX + side * Math.cos(rollAngle) * 5;
        const lobeY = capCenterY + lobe.relY * capRadiusY + Math.sin(rollAngle) * 4;
        const lobeR = Math.max(8, lobe.baseRadius * capRadiusX);

        // Directional 3D lighting: illuminated from bottom-inner plasma core, shadowed on outer top
        const lightOffsetX = -lobe.relX * lobeR * 0.32;
        const lightOffsetY = (lobe.relY < 0 ? 0.32 : -0.22) * lobeR;
        const lobeGrad = ctx.createRadialGradient(
          lobeX + lightOffsetX,
          lobeY + lightOffsetY,
          lobeR * 0.08,
          lobeX,
          lobeY,
          lobeR
        );

        const emberGlow = plasmaIntensity * (lobe.layer === 'core' ? 0.85 : 0.45);
        const rLit = Math.round(148 + 105 * emberGlow);
        const gLit = Math.round(145 + 35 * emberGlow);
        const bLit = Math.round(152 - 65 * emberGlow);

        const rMid = Math.round(74 + 90 * emberGlow);
        const gMid = Math.round(78 - 10 * emberGlow);
        const bMid = Math.round(90 - 45 * emberGlow);

        const alphaScale = lobe.layer === 'core' ? 0.72 * smokeMaturity : 0.82 * smokeMaturity;

        lobeGrad.addColorStop(0.0, `rgba(${rLit}, ${gLit}, ${bLit}, ${alphaScale})`);
        lobeGrad.addColorStop(0.52, `rgba(${rMid}, ${gMid}, ${bMid}, ${alphaScale * 0.95})`);
        lobeGrad.addColorStop(0.88, `rgba(30, 34, 44, ${alphaScale * 0.82})`);
        lobeGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');

        ctx.fillStyle = lobeGrad;
        ctx.beginPath();
        ctx.arc(lobeX, lobeY, lobeR, 0, Math.PI * 2);
        ctx.fill();
      });

      // B4. Glaciated Ice-Crystal Pileus Cap & Stratospheric Anvil Crown
      const pileusAlpha = Math.min(0.78, smokeMaturity * 0.75);
      const shelfGrad = ctx.createLinearGradient(0, topY - 4, 0, topY + capRadiusY * 0.55);
      shelfGrad.addColorStop(0.0, `rgba(241, 245, 249, ${pileusAlpha})`);
      shelfGrad.addColorStop(0.45, `rgba(186, 200, 218, ${pileusAlpha * 0.55})`);
      shelfGrad.addColorStop(1.0, 'rgba(71, 85, 105, 0.0)');
      ctx.fillStyle = shelfGrad;
      ctx.beginPath();
      ctx.ellipse(centerX, topY + capRadiusY * 0.18, capRadiusX * 0.96, Math.max(8, capRadiusY * 0.34), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // PHASE C: SUPERSONIC HEMISPHERICAL SHOCKWAVE FRONT & TRANSIENT WILSON CONDENSATION COLLAR
    if (t > 0.05 && t < 12.0) {
      const shockSpeedKmS = 0.42 + 0.75 * Math.exp(-t / 2.5);
      const shockRadiusPx = kmToPixelsX(rFireballKm + t * shockSpeedKmS * 2.8);
      const shockOriginY = kmToY(hobKm);
      const shockAlpha = Math.max(0, Math.min(0.9, (1 - t / 12.0) * 0.9));

      ctx.save();
      // Clip shockwave to above ground
      ctx.beginPath();
      ctx.rect(0, 0, width, groundY);
      ctx.clip();

      // Refractive Shock Front Arc
      ctx.strokeStyle = `rgba(224, 242, 254, ${shockAlpha})`;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(centerX, shockOriginY, shockRadiusPx, Math.PI, 0, false);
      ctx.stroke();

      // Transient Wilson Condensation Cloud Ring (Negative-Pressure Rarefaction Phase, 1.0s <= t <= 5.5s)
      if (t >= 1.0 && t <= 5.5) {
        const wilsonBell = Math.sin(((t - 1.0) / 4.5) * Math.PI);
        const wRx = Math.max(capRadiusX * 1.25, shockRadiusPx * 0.72);
        const wRy = Math.max(10, capRadiusY * 0.42);
        const wilsonGrad = ctx.createRadialGradient(centerX, capCenterY, wRx * 0.35, centerX, capCenterY, wRx);
        wilsonGrad.addColorStop(0.0, 'rgba(240, 249, 255, 0.0)');
        wilsonGrad.addColorStop(0.55, `rgba(224, 242, 254, ${0.42 * wilsonBell})`);
        wilsonGrad.addColorStop(0.85, `rgba(186, 230, 253, ${0.28 * wilsonBell})`);
        wilsonGrad.addColorStop(1.0, 'rgba(224, 242, 254, 0.0)');
        ctx.fillStyle = wilsonGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, capCenterY, wRx, wRy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Ground Plane & glowing Ground Zero Crater / Reflection
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0.0, '#0f172a');
    groundGrad.addColorStop(1.0, '#020617');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-20, groundY, width + 40, height - groundY + 40);

    // Thermal Ground Reflection under Ground Zero
    const groundGlowR = Math.max(40, capRadiusX * 1.2);
    const groundGlow = ctx.createRadialGradient(centerX, groundY, 2, centerX, groundY, groundGlowR);
    groundGlow.addColorStop(0.0, `rgba(251, 146, 60, ${0.55 * plasmaIntensity})`);
    groundGlow.addColorStop(0.5, `rgba(220, 38, 38, ${0.22 * plasmaIntensity})`);
    groundGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = groundGlow;
    ctx.fillRect(centerX - groundGlowR, groundY - 3, groundGlowR * 2, 14);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // 9. Clamped Non-Overlapping Dimension Callout Box (Right Side of Cloud)
    if (t >= 0.8) {
      const boxW = 168;
      const boxH = 42;
      const idealArrowX = centerX + capRadiusX + 20;
      const arrowX = Math.min(width - boxW - 16, Math.max(centerX + 36, idealArrowX));

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(arrowX, groundY);
      ctx.lineTo(arrowX, topY);
      ctx.stroke();

      // Top & Bottom Ticks
      ctx.beginPath();
      ctx.moveTo(arrowX - 4, topY);
      ctx.lineTo(arrowX + 4, topY);
      ctx.moveTo(arrowX - 4, groundY);
      ctx.lineTo(arrowX + 4, groundY);
      ctx.stroke();

      // Top Arrowhead
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(arrowX - 4, topY + 7);
      ctx.lineTo(arrowX + 4, topY + 7);
      ctx.lineTo(arrowX, topY);
      ctx.closePath();
      ctx.fill();

      const midBoxY = Math.max(48, Math.min(groundY - boxH - 8, (groundY + topY) / 2 - boxH / 2));
      ctx.fillStyle = 'rgba(5, 10, 18, 0.86)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.fillRect(arrowX + 8, midBoxY, boxW, boxH);
      ctx.strokeRect(arrowX + 8, midBoxY, boxW, boxH);

      ctx.font = 'bold 10.5px JetBrains Mono, monospace';
      ctx.fillStyle = '#00e5ff';
      const topLabel = unitMode === 'imperial'
        ? `Top: ${(currentTopKm * 0.621371).toFixed(1)} mi (${Math.round(currentTopKm * 3280.84).toLocaleString()} ft)`
        : `Top: ${currentTopKm.toFixed(1)} km (${Math.round(currentTopKm * 1000).toLocaleString()} m)`;
      ctx.fillText(topLabel, arrowX + 14, midBoxY + 16);

      const capLabel = unitMode === 'imperial'
        ? `Cap Width: ${(currentCapWidthKm * 0.621371).toFixed(1)} mi`
        : `Cap Width: ${currentCapWidthKm.toFixed(1)} km`;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(capLabel, arrowX + 14, midBoxY + 32);
    }

    // 10. Top-Left Live Physical Regime Telemetry Badge
    {
      const phaseText =
        t < 1.5
          ? 'PHASE I: DOUBLE-FLASH & ISOTHERMAL FIREBALL BREAKAWAY'
          : t < 8.0
          ? 'PHASE II: TOROIDAL VORTEX LIFT-OFF & WILSON CLOUD'
          : t < 60.0
          ? 'PHASE III: CONVECTIVE CAP EXPANSION & MACH UPDRAFT STEM'
          : 'PHASE IV: STRATOSPHERIC ANVIL STABILIZATION';
      const estTempK = Math.round(3200 + 650000 * Math.exp(-t / 1.8) + 8500 * Math.exp(-t / 35));

      ctx.fillStyle = 'rgba(5, 10, 18, 0.84)';
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.lineWidth = 1;
      ctx.fillRect(62, 10, 345, 36);
      ctx.strokeRect(62, 10, 345, 36);

      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = '#fb923c';
      ctx.fillText(`⚡ ${phaseText}`, 70, 24);

      ctx.font = '9.5px JetBrains Mono, monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(
        `Core Temp: ~${estTempK.toLocaleString()} K | Ascent: ${Math.round(riseProgress * 100)}% Stabilized`,
        70,
        39
      );
    }

    // 11. Initial Detonation Double-Pulse Flash Overlay
    if (flashIntensity > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.85})`;
      ctx.fillRect(-20, -20, width + 40, height + 40);
    }

    ctx.restore();
  }, [simTimeSeconds, cloudPhysics, flashIntensity, shakeIntensity, burstMode, burstAltitudeM, smokeLobes, unitMode]);

  // --- CANVAS 2: OUTRIDER REAL-CITY DARK MATTER MAP & BLAST RADIUS SIMULATOR ---
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const {
      rZone1_FireballKm,
      rZone2_Heavy20psiKm,
      rZone3_Mod5psiKm,
      rZone4_Thermal3rdKm
    } = cloudPhysics;

    // Viewport scale & Mapbox-style tile projection
    let zoom = 11;
    if (rZone4_Thermal3rdKm < 2.5) zoom = 13;
    else if (rZone4_Thermal3rdKm < 6.0) zoom = 12;
    else if (rZone4_Thermal3rdKm < 15.0) zoom = 11;
    else if (rZone4_Thermal3rdKm < 35.0) zoom = 10;
    else if (rZone4_Thermal3rdKm < 80.0) zoom = 9;
    else zoom = 8;

    const n = Math.pow(2, zoom);
    const centerTileX = ((currentCity.lon + 180.0) / 360.0) * n;
    const latRad = (currentCity.lat * Math.PI) / 180.0;
    const centerTileY =
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n;

    // Meters per pixel at this latitude
    const metersPerPixel = (156543.03 * Math.cos(latRad)) / n;
    const kmToMapPx = (km: number) => (km * 1000.0) / metersPerPixel;

    // 1. Dark Base Map Background
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, width, height);

    // 2. Render CartoDB Dark Matter City Map Tiles (Streets, Rivers, Buildings)
    const tileSize = 256;
    const minTileX = Math.floor(centerTileX - width / (2 * tileSize)) - 1;
    const maxTileX = Math.floor(centerTileX + width / (2 * tileSize)) + 1;
    const minTileY = Math.floor(centerTileY - height / (2 * tileSize)) - 1;
    const maxTileY = Math.floor(centerTileY + height / (2 * tileSize)) + 1;

    let tilesLoaded = 0;
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const tileKey = `${zoom}/${tx}/${ty}`;
        const img = tileImageCache.get(tileKey);
        if (img && img.complete && img.naturalWidth > 0) {
          const posX = centerX + (tx - centerTileX) * tileSize;
          const posY = centerY + (ty - centerTileY) * tileSize;
          ctx.drawImage(img, posX, posY, tileSize, tileSize);
          tilesLoaded++;
        }
      }
    }

    // Procedural Dark Vector Radar Overlay if tiles are still fetching
    if (tilesLoaded === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const maxRadarKm = rZone4_Thermal3rdKm * 1.35;
      for (let g = 1; g <= 4; g++) {
        const rKm = (maxRadarKm / 4) * g;
        const rPx = kmToMapPx(rKm);
        ctx.beginPath();
        ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.moveTo(20, centerY);
      ctx.lineTo(width - 20, centerY);
      ctx.stroke();
    }

    // Kinematic expansion factor so blast zones animate cleanly from Ground Zero on detonation
    const shockDistKm = simTimeSeconds * (0.343 + 0.45 * Math.exp(-simTimeSeconds / 4.0));
    const thermalFlashFactor = Math.min(1.0, simTimeSeconds / 0.6);
    const fireballGrowthFactor = Math.min(1.0, simTimeSeconds / 0.9);
    const blastSweepFactor = (targetKm: number) =>
      simTimeSeconds >= 18 ? 1.0 : Math.min(1.0, Math.max(0.18, shockDistKm / Math.max(0.05, targetKm)));

    // 3. OUTRIDER 4-TIER GLOWING TRANSLUCENT ENERGY ZONES
    // Zone 4: Heat / Thermal Radiation (3rd Degree Burns) - Amber (propagates at speed of light during flash)
    const rZ4Px = kmToMapPx(rZone4_Thermal3rdKm) * thermalFlashFactor;
    const isZ4Focused = selectedEffect === 'thermal' || selectedEffect === null;
    ctx.save();
    ctx.fillStyle = isZ4Focused ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.07)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ4Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = isZ4Focused ? 2.2 : 1.1;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = isZ4Focused ? 10 : 3;
    ctx.stroke();
    ctx.restore();

    // Zone 3: Shockwave / Moderate Blast (5 psi) - Electric Cyan / Sky Blue
    const rZ3TargetPx = kmToMapPx(rZone3_Mod5psiKm);
    const rZ3Px = rZ3TargetPx * blastSweepFactor(rZone3_Mod5psiKm);
    const isZ3Focused = selectedEffect === 'shockwave' || selectedEffect === null;
    ctx.save();
    // Dashed target ring if shockwave is still sweeping toward 5-psi perimeter
    if (rZ3Px < rZ3TargetPx * 0.99) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, rZ3TargetPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = isZ3Focused ? 'rgba(0, 229, 255, 0.22)' : 'rgba(0, 229, 255, 0.07)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ3Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = isZ3Focused ? 2.2 : 1.1;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = isZ3Focused ? 10 : 3;
    ctx.stroke();
    ctx.restore();

    // Zone 2: Prompt Radiation / Heavy Blast (20 psi) - Neon Magenta / Crimson
    const rZ2TargetPx = kmToMapPx(rZone2_Heavy20psiKm);
    const rZ2Px = rZ2TargetPx * Math.max(thermalFlashFactor * 0.85, blastSweepFactor(rZone2_Heavy20psiKm));
    const isZ2Focused = selectedEffect === 'radiation' || selectedEffect === null;
    ctx.save();
    ctx.fillStyle = isZ2Focused ? 'rgba(224, 36, 94, 0.34)' : 'rgba(224, 36, 94, 0.11)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ2Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0245e';
    ctx.lineWidth = isZ2Focused ? 2.6 : 1.3;
    ctx.shadowColor = '#e0245e';
    ctx.shadowBlur = isZ2Focused ? 12 : 4;
    ctx.stroke();
    ctx.restore();

    // Zone 1: Fireball Core - Incandescent Gold / Bright Orange
    const rZ1Px = Math.max(4, kmToMapPx(rZone1_FireballKm) * fireballGrowthFactor);
    const isZ1Focused = selectedEffect === 'fireball' || selectedEffect === null;
    ctx.save();
    const fbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, rZ1Px);
    fbGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    fbGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.95)');
    fbGrad.addColorStop(0.75, 'rgba(234, 86, 0, 0.92)');
    fbGrad.addColorStop(1.0, 'rgba(220, 38, 38, 0.85)');
    ctx.fillStyle = fbGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rZ1Px, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = isZ1Focused ? 2.2 : 1.1;
    ctx.shadowColor = '#ea5600';
    ctx.shadowBlur = isZ1Focused ? 15 : 5;
    ctx.stroke();
    ctx.restore();

    // 4. Real-Time Propagating Supersonic Shockwave Front
    const maxViewKm = ((width / 2) * metersPerPixel) / 1000.0;
    if (shockDistKm > 0.02 && shockDistKm <= maxViewKm * 1.15) {
      const shockWavePx = kmToMapPx(shockDistKm);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, shockWavePx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Non-Overlapping Radial Zone Callout Badges (placed at distinct 45° / 135° / 225° / 315° angles)
    const zoneBadges = [
      { rPx: kmToMapPx(rZone4_Thermal3rdKm), angleDeg: -35, label: `🔥 3rd° Burn (${unitMode === 'imperial' ? `${cloudPhysics.rZone4_Thermal3rdMiles.toFixed(2)} mi` : `${rZone4_Thermal3rdKm.toFixed(2)} km`})`, color: '#fbbf24' },
      { rPx: kmToMapPx(rZone3_Mod5psiKm), angleDeg: 35, label: `💨 5 psi (${unitMode === 'imperial' ? `${cloudPhysics.rZone3_Mod5psiMiles.toFixed(2)} mi` : `${rZone3_Mod5psiKm.toFixed(2)} km`})`, color: '#38bdf8' },
      { rPx: kmToMapPx(rZone2_Heavy20psiKm), angleDeg: 145, label: `☢️ 20 psi / Rad (${unitMode === 'imperial' ? `${cloudPhysics.rZone2_Heavy20psiMiles.toFixed(2)} mi` : `${rZone2_Heavy20psiKm.toFixed(2)} km`})`, color: '#f472b6' },
      { rPx: kmToMapPx(rZone1_FireballKm), angleDeg: -145, label: `☀️ Fireball (${unitMode === 'imperial' ? `${cloudPhysics.rZone1_FireballMiles.toFixed(2)} mi` : `${rZone1_FireballKm.toFixed(2)} km`})`, color: '#fef08a' }
    ];

    ctx.font = '600 9.5px JetBrains Mono, monospace';
    zoneBadges.forEach((zb) => {
      if (zb.rPx < 14 || zb.rPx > width * 0.48) return;
      const rad = (zb.angleDeg * Math.PI) / 180.0;
      const bx = centerX + Math.cos(rad) * zb.rPx;
      const by = centerY + Math.sin(rad) * zb.rPx;
      const tw = ctx.measureText(zb.label).width;
      const pillX = Math.max(8, Math.min(width - tw - 14, bx - tw / 2));
      const pillY = Math.max(58, Math.min(height - 20, by - 7));

      ctx.fillStyle = 'rgba(6, 9, 14, 0.86)';
      ctx.strokeStyle = zb.color;
      ctx.lineWidth = 1;
      ctx.fillRect(pillX - 4, pillY - 10, tw + 8, 14);
      ctx.strokeRect(pillX - 4, pillY - 10, tw + 8, 14);
      ctx.fillStyle = zb.color;
      ctx.fillText(zb.label, pillX, pillY);
    });

    // 6. Ground Zero Tactical Crosshair Pin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4.0, 0, Math.PI * 2);
    ctx.fill();

    // 7. Top-Left City & Coordinates Header Pill (Non-overlapping glass backing)
    ctx.fillStyle = 'rgba(6, 9, 14, 0.86)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.fillRect(12, 10, 410, 42);
    ctx.strokeRect(12, 10, 410, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12.5px Inter, sans-serif';
    ctx.fillText(`📍 ${currentCity.name}, ${currentCity.country}`, 20, 28);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.92)';
    ctx.font = '10px JetBrains Mono, monospace';
    const latStr = `${Math.abs(currentCity.lat).toFixed(4)}° ${currentCity.lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(currentCity.lon).toFixed(4)}° ${currentCity.lon >= 0 ? 'E' : 'W'}`;
    ctx.fillText(
      `${latStr}, ${lonStr} | Pop Density: ${currentCity.popDensityPerKm2.toLocaleString()} / km²`,
      20,
      44
    );
  }, [simTimeSeconds, cloudPhysics, currentCity, selectedEffect, unitMode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Outrider Header & Quick Control Bar */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🌋</span>
            <div>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>Outrider Visual Detonation &amp; Mushroom Cloud Simulator</strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                Atmospheric cloud profile, volumetric toroidal vortex, Wilson condensation shock collar, and dark-matter city cartography
              </div>
            </div>
          </div>

          {/* Quick Yield Presets & Burst Mode Toggles */}
          {onYieldChange && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', marginLeft: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Quick Yield:</span>
              {[
                { label: '15 kT', y: 15 },
                { label: '100 kT', y: 100 },
                { label: '300 kT', y: 300 },
                { label: '1.2 MT', y: 1200 },
                { label: '15 MT', y: 15000 },
                { label: '50 MT', y: 50000 }
              ].map((opt) => (
                <button
                  key={opt.y}
                  type="button"
                  className="btn"
                  onClick={() => {
                    onYieldChange(opt.y);
                    triggerDetonation();
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    background: Math.abs(yieldKt - opt.y) < 0.1 ? 'rgba(234, 86, 0, 0.3)' : 'rgba(255,255,255,0.05)',
                    color: Math.abs(yieldKt - opt.y) < 0.1 ? '#ea5600' : '#94a3b8',
                    border: Math.abs(yieldKt - opt.y) < 0.1 ? '1px solid #ea5600' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {onBurstModeChange && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                onBurstModeChange(burstMode === 'air' ? 'surface' : 'air');
                triggerDetonation();
              }}
              style={{
                padding: '3px 10px',
                fontSize: '0.72rem',
                background: burstMode === 'air' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(234, 86, 0, 0.2)',
                color: burstMode === 'air' ? '#00e5ff' : '#ea5600',
                border: `1px solid ${burstMode === 'air' ? '#00e5ff' : '#ea5600'}`,
                borderRadius: '4px'
              }}
            >
              {burstMode === 'air' ? '☁️ Air Burst' : '🌋 Surface Burst'}
            </button>
          )}
        </div>

        {/* View Mode & Unit Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setUnitMode('imperial')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: unitMode === 'imperial' ? 700 : 500,
                background: unitMode === 'imperial' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: unitMode === 'imperial' ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              MILES
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setUnitMode('metric')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: unitMode === 'metric' ? 700 : 500,
                background: unitMode === 'metric' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: unitMode === 'metric' ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              KM
            </button>
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', padding: '2px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setViewMode('profile')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'profile' ? 700 : 500,
                background: viewMode === 'profile' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                color: viewMode === 'profile' ? '#00e5ff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              ☁️ Cloud Profile
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setViewMode('map')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'map' ? 700 : 500,
                background: viewMode === 'map' ? 'rgba(234, 86, 0, 0.25)' : 'transparent',
                color: viewMode === 'map' ? '#ea5600' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              🗺️ Outrider City Map
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setViewMode('split')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'split' ? 700 : 500,
                background: viewMode === 'split' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: viewMode === 'split' ? '#10b981' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              🔲 Dual View
            </button>
          </div>
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr', gap: '14px' }}>
        {/* VIEW 1: Volumetric Atmospheric Mushroom Cloud Profile Canvas */}
        {(viewMode === 'profile' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                Volumetric Atmospheric Elevation Cross-Section (0–{Math.max(35, Math.ceil((cloudPhysics.hTopKm * 1.3) / 10) * 10)} km)
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Scale Markers: Mt. Everest (8.85 km) • Airliner (11 km) • SR-71 (24 km) • Tropopause Inversion (12 km)
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={profileCanvasRef}
                width={800}
                height={480}
                style={{ width: '100%', height: '100%', display: 'block', background: '#020307' }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: Outrider-Style Real City Dark Matter Map Canvas */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: '#ea5600', fontWeight: 600 }}>
                  Real-City Dark Matter Blast Footprint
                </span>
                {selectedEffect && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setSelectedEffect(null)}
                    style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '3px' }}
                  >
                    ✕ Clear Filter ({selectedEffect.toUpperCase()})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <select
                  className="form-control"
                  value={selectedCityId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedCityId(newId);
                    const chosen = CITY_PRESETS.find(c => c.id === newId);
                    if (chosen && chosen.suggestedYieldKt && onYieldChange) {
                      onYieldChange(chosen.suggestedYieldKt);
                    }
                    if (chosen && chosen.burstMode && onBurstModeChange) {
                      onBurstModeChange(chosen.burstMode);
                    }
                  }}
                  style={{ fontSize: '0.78rem', padding: '4px 10px', maxWidth: '340px' }}
                >
                  <optgroup label="🏙️ Populated Metropolitan Centers">
                    {CITY_PRESETS.filter(c => c.category === 'city').map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.flag || '📍'} {city.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="☢️ Historical Detonation Sites (By Sovereign Nation)">
                    {CITY_PRESETS.filter(c => c.category === 'historical_test_site').map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.flag || '☢️'} [{site.country}] {site.name} {site.suggestedYieldKt ? `(${site.suggestedYieldKt >= 1000 ? `${site.suggestedYieldKt/1000} MT` : `${site.suggestedYieldKt} kt`})` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {currentCity.category === 'historical_test_site' && (
                  <div style={{
                    fontSize: '0.70rem',
                    color: '#f97316',
                    background: 'rgba(249, 115, 22, 0.12)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    maxWidth: '420px',
                    textAlign: 'right'
                  }}>
                    {currentCity.flag} <b>{currentCity.country}:</b> {currentCity.historicalTestName} ({currentCity.historicalYear}) — {currentCity.description}
                  </div>
                )}
              </div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas
                ref={mapCanvasRef}
                width={800}
                height={480}
                style={{ width: '100%', height: '100%', display: 'block', background: '#06090e' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detonation Control Room & Timeline Scrubber Bar */}
      <div className="panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Big Detonate Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={triggerDetonation}
              style={{
                background: 'linear-gradient(135deg, #ea5600, #c2410c)',
                borderColor: '#ea5600',
                color: '#fff',
                fontSize: '0.92rem',
                fontWeight: 700,
                padding: '8px 22px',
                boxShadow: '0 0 16px rgba(234, 86, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🔴 DETONATE WEAPON</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSimTimeSeconds(0.0)}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              🔄 Reset
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleMute}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              title={isAudioMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isAudioMuted ? '🔇 Audio Off' : '🔊 Sound FX Active'}
            </button>
          </div>

          {/* Time & Speed Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', color: '#00e5ff', fontWeight: 'bold' }}>
              T+ {simTimeSeconds.toFixed(1)}s <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({(simTimeSeconds / 60).toFixed(2)} min)</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '2px' }}>
              {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className="btn"
                  onClick={() => setPlaySpeed(spd)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    background: playSpeed === spd ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    color: playSpeed === spd ? '#00e5ff' : 'var(--color-text-muted)',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
            <span>0.0s (Detonation Flash)</span>
            <span>15s (Initial Fireball Rise)</span>
            <span>1 min (Toroidal Cap Anvil)</span>
            <span>5 min (Stabilized Cloud)</span>
            <span>10 min (Final Dimensions)</span>
          </div>
          <input
            type="range"
            min="0"
            max="600"
            step="0.5"
            value={simTimeSeconds}
            onChange={(e) => setSimTimeSeconds(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#ea5600' }}
          />
        </div>
      </div>

      {/* OUTRIDER 4-TIER INTERACTIVE EFFECT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
        {/* Card 1: Fireball */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'fireball' ? null : 'fireball')}
          style={{
            background: selectedEffect === 'fireball' ? 'rgba(234, 86, 0, 0.18)' : 'rgba(234, 86, 0, 0.06)',
            border: `1px solid ${selectedEffect === 'fireball' ? '#ea5600' : 'rgba(234, 86, 0, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'fireball' ? '0 0 16px rgba(234, 86, 0, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#ea5600', fontSize: '0.88rem', letterSpacing: '0.05em' }}>FIREBALL</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(234, 86, 0, 0.2)', color: '#ea5600', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'fireball' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fef08a', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone1_FireballMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone1_FireballKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.areaFireballSqMi} sq mi` : `${casualties.areaFireballKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            A nuclear fireball begins the moment the weapon detonates. The light and heat are so intense that it can ignite fires several miles away. Anything or anyone inside the fireball is instantly vaporized.
          </p>
        </div>

        {/* Card 2: Radiation */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'radiation' ? null : 'radiation')}
          style={{
            background: selectedEffect === 'radiation' ? 'rgba(224, 36, 94, 0.18)' : 'rgba(224, 36, 94, 0.06)',
            border: `1px solid ${selectedEffect === 'radiation' ? '#e0245e' : 'rgba(224, 36, 94, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'radiation' ? '0 0 16px rgba(224, 36, 94, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#e0245e', fontSize: '0.88rem', letterSpacing: '0.05em' }}>RADIATION</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(224, 36, 94, 0.2)', color: '#e0245e', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'radiation' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f472b6', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone2_Heavy20psiMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone2_Heavy20psiKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.area20psiSqMi} sq mi` : `${casualties.area20psiKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            Nuclear weapons release lethal prompt ionizing radiation (neutrons and gamma rays). In this zone, radiation is so intense that between 50% and 90% of people will die within hours to a few weeks without ICU intervention.
          </p>
        </div>

        {/* Card 3: Shockwave */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'shockwave' ? null : 'shockwave')}
          style={{
            background: selectedEffect === 'shockwave' ? 'rgba(0, 229, 255, 0.18)' : 'rgba(0, 229, 255, 0.06)',
            border: `1px solid ${selectedEffect === 'shockwave' ? '#00e5ff' : 'rgba(0, 229, 255, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'shockwave' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#00e5ff', fontSize: '0.88rem', letterSpacing: '0.05em' }}>SHOCKWAVE</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'shockwave' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone3_Mod5psiMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone3_Mod5psiKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.area5psiSqMi} sq mi` : `${casualties.area5psiKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            The nuclear blast creates a wall of compressed air that expands at supersonic speed. Most residential buildings are leveled, commercial structures severely damaged, and winds reach hurricane speeds over 160 mph.
          </p>
        </div>

        {/* Card 4: Heat */}
        <div
          onClick={() => setSelectedEffect(selectedEffect === 'thermal' ? null : 'thermal')}
          style={{
            background: selectedEffect === 'thermal' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.06)',
            border: `1px solid ${selectedEffect === 'thermal' ? '#f59e0b' : 'rgba(245, 158, 11, 0.35)'}`,
            borderRadius: '8px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selectedEffect === 'thermal' ? '0 0 16px rgba(245, 158, 11, 0.35)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f59e0b', fontSize: '0.88rem', letterSpacing: '0.05em' }}>HEAT (THERMAL)</strong>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '4px', fontWeight: 600 }}>
              {selectedEffect === 'thermal' ? 'ACTIVE' : 'CLICK TO VIEW'}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '8px' }}>
            {unitMode === 'imperial'
              ? `${cloudPhysics.rZone4_Thermal3rdMiles.toFixed(2)} mi`
              : `${cloudPhysics.rZone4_Thermal3rdKm.toFixed(2)} km`}
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>radius</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Area: {unitMode === 'imperial' ? `${casualties.areaThermalSqMi} sq mi` : `${casualties.areaThermalKm2} km²`}
          </div>
          <p style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '10px', lineHeight: 1.45 }}>
            Thermal radiation causes third-degree flash burns to exposed skin, destroys pain-sensing nerve endings, and ignites dry wood, gas mains, and draperies, creating a catastrophic city-scale firestorm.
          </p>
        </div>
      </div>

      {/* Human Casualties & Impact Summary (Outrider Style) */}
      <div className="panel" style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>
            Casualty &amp; Damage Projections for {currentCity.name} ({yieldKt >= 1000 ? `${(yieldKt / 1000).toFixed(2)} MT` : `${yieldKt} kT`} {burstMode} burst)
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Urban Population Density: {currentCity.popDensityPerKm2.toLocaleString()} people / km²
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>ESTIMATED FATALITIES</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#f87171' }}>
              {casualties.totalFatalities.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Instant / acute deaths</div>
          </div>

          <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>ESTIMATED INJURIES</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#fb923c' }}>
              {casualties.totalInjuries.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Severe trauma &amp; flash burns</div>
          </div>

          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #00e5ff' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>TOTAL IMPACT AREA</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#38bdf8' }}>
              {unitMode === 'imperial'
                ? `${casualties.totalImpactAreaSqMi.toLocaleString()} sq mi`
                : `${casualties.totalImpactAreaKm2.toLocaleString()} km²`}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Full damage footprint</div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>STABILIZED CLOUD TOP</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: '#34d399' }}>
              {unitMode === 'imperial'
                ? `${cloudPhysics.hTopMiles.toFixed(1)} mi`
                : `${cloudPhysics.hTopKm.toFixed(1)} km`}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{Math.round(cloudPhysics.hTopFeet).toLocaleString()} ft ASL</div>
          </div>
        </div>
      </div>
    </div>
  );
};
