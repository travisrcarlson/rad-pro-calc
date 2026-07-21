import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

export type PresetCategory = 
  | 'C-UAS & Counter-IED'
  | 'Airborne EW & Jamming'
  | 'Naval EW & Radars'
  | 'Air Defense & Fire Control'
  | 'Directed Energy & HPM'
  | 'SATCOM & Communications';

interface BandPreset {
  name: string;
  category: PresetCategory;
  freqMHz: number;
  typicalApp: string;
  gainDBi: number;
  apertureM: number;
  isRadar: boolean;
  pattern: 'Directional' | 'Omnidirectional';
  defaultPowerKW: number;
  defaultSignal: 'CW' | 'Pulsed';
  pulseWidthUs?: number;
  prfHz?: number;
  dutyPct?: number;
  description: string;
}

const BAND_PRESETS: BandPreset[] = [
  // 1. C-UAS & Counter-IED
  {
    name: 'CREW Duke V3 Vehicle Jammer',
    category: 'C-UAS & Counter-IED',
    freqMHz: 900,
    typicalApp: 'AN/VLQ-12 Counter-RCIED EW System',
    gainDBi: 4,
    apertureM: 0.3,
    isRadar: false,
    pattern: 'Omnidirectional',
    defaultPowerKW: 0.2,
    defaultSignal: 'CW',
    description: 'Vehicle-mounted multiband counter-RCIED jammer providing 360° force protection against IED detonation signals.'
  },
  {
    name: 'THOR C-UAS HPM Swarm Defender',
    category: 'C-UAS & Counter-IED',
    freqMHz: 3000,
    typicalApp: 'Tactical High-Power Microwave Operational Responder',
    gainDBi: 35,
    apertureM: 2.0,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 1000,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 1,
    prfHz: 500,
    description: 'High-Power Microwave (HPM) weapon designed to neutralize drone swarms instantly via high peak E-field pulses.'
  },
  {
    name: 'DroneGun Tactical C-UAS Rifle',
    category: 'C-UAS & Counter-IED',
    freqMHz: 2450,
    typicalApp: 'Directional Counter-Drone Defeater',
    gainDBi: 14,
    apertureM: 0.4,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 0.015,
    defaultSignal: 'CW',
    description: 'Handheld directional jammer disrupting ISM control links (2.4/5.8 GHz) and GNSS navigation signals.'
  },
  {
    name: 'Tactical Manpack ECM Suit',
    category: 'C-UAS & Counter-IED',
    freqMHz: 1500,
    typicalApp: 'Dismounted Infantry EW Suit',
    gainDBi: 3,
    apertureM: 0.2,
    isRadar: false,
    pattern: 'Omnidirectional',
    defaultPowerKW: 0.05,
    defaultSignal: 'CW',
    description: 'Backpack-carried omnidirectional jammer forming a mobile 360° protective bubble for foot patrols.'
  },

  // 2. Airborne EW & Jamming
  {
    name: 'AN/ALQ-99 Tactical Jamming Pod',
    category: 'Airborne EW & Jamming',
    freqMHz: 1200,
    typicalApp: 'EA-18G Growler Low/Mid-Band Jammer',
    gainDBi: 18,
    apertureM: 0.8,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 6.8,
    defaultSignal: 'CW',
    description: 'Legacy high-power tactical jamming pod used for standoff suppression of enemy air defenses (SEAD).'
  },
  {
    name: 'AN/ALQ-249 NGJ Mid-Band AESA',
    category: 'Airborne EW & Jamming',
    freqMHz: 4500,
    typicalApp: 'Next Generation Jammer AESA Array',
    gainDBi: 28,
    apertureM: 0.9,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 15,
    defaultSignal: 'CW',
    description: 'Gallium Nitride (GaN) based AESA airborne jammer delivering concentrated, multi-target reactive jamming beams.'
  },
  {
    name: 'AN/ALQ-131 Self-Protection ECM',
    category: 'Airborne EW & Jamming',
    freqMHz: 10000,
    typicalApp: 'F-16 & A-10 Defensive Countermeasures Pod',
    gainDBi: 15,
    apertureM: 0.35,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 2.0,
    defaultSignal: 'CW',
    description: 'Self-protection pod providing deception jamming against hostile SAM and fighter radar locks.'
  },

  // 3. Naval EW & Radars
  {
    name: 'AN/SLQ-32(V)6 SEWIP Block III',
    category: 'Naval EW & Radars',
    freqMHz: 9000,
    typicalApp: 'Surface Electronic Warfare Improvement Program',
    gainDBi: 34,
    apertureM: 1.5,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 40,
    defaultSignal: 'CW',
    description: 'Shipboard GaN AESA system capable of simultaneous multi-target electronic attack and soft-kill defense.'
  },
  {
    name: 'AN/SPY-1D AEGIS 3.5MW Radar',
    category: 'Naval EW & Radars',
    freqMHz: 3300,
    typicalApp: 'Arleigh Burke Destroyer S-Band Phased Array',
    gainDBi: 42,
    apertureM: 3.65,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 3500,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 50,
    prfHz: 1200,
    description: 'High-power 3.5 Megawatt S-band 3D phased array radar powering the AEGIS Combat System.'
  },
  {
    name: 'AN/SPY-6(V)1 AMDR AESA Radar',
    category: 'Naval EW & Radars',
    freqMHz: 3100,
    typicalApp: 'Air and Missile Defense Radar (Flight III)',
    gainDBi: 45,
    apertureM: 4.2,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 5000,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 40,
    prfHz: 1500,
    description: 'Next-generation GaN Radar Building Block (RMA) array providing extreme sensitivity against ballistic missiles.'
  },

  // 4. Air Defense & Fire Control
  {
    name: 'Patriot AN/MPQ-65 Phased Array',
    category: 'Air Defense & Fire Control',
    freqMHz: 5500,
    typicalApp: 'PAC-3 Air & Missile Defense System',
    gainDBi: 38,
    apertureM: 2.4,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 200,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 20,
    prfHz: 2000,
    description: 'C-band multifunction phased array for search, track, and missile guidance.'
  },
  {
    name: 'THAAD AN/TPY-2 X-Band Radar',
    category: 'Air Defense & Fire Control',
    freqMHz: 9500,
    typicalApp: 'Terminal High Altitude Area Defense',
    gainDBi: 48,
    apertureM: 9.2,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 1200,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 100,
    prfHz: 1000,
    description: 'Massive transportable X-band phased array with 25,344 T/R modules providing long-range anti-ballistic missile tracking.'
  },
  {
    name: 'F-35 AN/APG-81 AESA Radar',
    category: 'Air Defense & Fire Control',
    freqMHz: 9800,
    typicalApp: 'Lightning II Nose Fire Control Radar',
    gainDBi: 33,
    apertureM: 0.7,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 20,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 15,
    prfHz: 3000,
    description: 'Advanced active electronically scanned array supporting air-to-air, air-to-surface, and electronic attack modes.'
  },
  {
    name: 'F-22 AN/APG-77 AESA Radar',
    category: 'Air Defense & Fire Control',
    freqMHz: 9600,
    typicalApp: 'Raptor Stealth Fighter Fire Control',
    gainDBi: 34,
    apertureM: 0.8,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 25,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 12,
    prfHz: 3500,
    description: 'Low-probability-of-intercept (LPI) AESA radar optimized for air-dominance engagements.'
  },

  // 5. Directed Energy & HPM
  {
    name: 'Active Denial System (ADS)',
    category: 'Directed Energy & HPM',
    freqMHz: 95000,
    typicalApp: '95 GHz Non-Lethal Millimeter Wave Weapon',
    gainDBi: 52,
    apertureM: 2.0,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 100,
    defaultSignal: 'CW',
    description: '95 GHz millimeter-wave directed energy weapon inducing a heat sensation in skin surface water molecules.'
  },
  {
    name: 'CHAMP High-Power Microwave Weapon',
    category: 'Directed Energy & HPM',
    freqMHz: 3500,
    typicalApp: 'Counter-Electronics Missile Payload',
    gainDBi: 30,
    apertureM: 1.2,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 50000,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 0.1,
    prfHz: 100,
    description: 'Air-launched missile payload delivering intense HPM bursts to fry electronic circuits inside enemy command bunkers.'
  },

  // 6. SATCOM & Communications
  {
    name: 'AEHF EHF SATCOM Terminal',
    category: 'SATCOM & Communications',
    freqMHz: 44000,
    typicalApp: 'Advanced Extremely High Frequency Uplink',
    gainDBi: 50,
    apertureM: 1.5,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 0.5,
    defaultSignal: 'CW',
    description: 'Protected, anti-jam EHF satellite uplink terminal for strategic nuclear command and control.'
  },
  {
    name: 'AN/GSC-52B Heavy SATCOM Dish',
    category: 'SATCOM & Communications',
    freqMHz: 7900,
    typicalApp: 'DSCS X-Band Earth Station',
    gainDBi: 56,
    apertureM: 11.6,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 5.0,
    defaultSignal: 'CW',
    description: 'Strategic 38-foot X-band parabolic reflector dish communicating with Defense Satellite Communications System (DSCS).'
  },
  {
    name: 'Commercial Ku-Band VSAT Uplink',
    category: 'SATCOM & Communications',
    freqMHz: 14250,
    typicalApp: 'Maritime / Remote Field Earth Station',
    gainDBi: 43,
    apertureM: 1.2,
    isRadar: false,
    pattern: 'Directional',
    defaultPowerKW: 0.05,
    defaultSignal: 'CW',
    description: 'Standard 1.2-meter Ku-band satellite terminal used for remote commercial broadband and news gathering.'
  }
];

const CATEGORIES: (PresetCategory | 'All')[] = [
  'All',
  'C-UAS & Counter-IED',
  'Airborne EW & Jamming',
  'Naval EW & Radars',
  'Air Defense & Fire Control',
  'Directed Energy & HPM',
  'SATCOM & Communications'
];

const EMRModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'All'>('All');
  const [activePreset, setActivePreset] = useState<BandPreset | null>(BAND_PRESETS[0]);

  const [freqMHz, setFreqMHz] = useState<number>(900);
  const [antennaPattern, setAntennaPattern] = useState<'Directional' | 'Omnidirectional'>('Omnidirectional');
  const [signalType, setSignalType] = useState<'CW' | 'Pulsed'>('CW');
  const [peakPowerKW, setPeakPowerKW] = useState<number>(0.2); // kW
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(2.0); // % for pulsed
  const [pulseWidthUs, setPulseWidthUs] = useState<number>(10); // microseconds
  const [prfHz, setPrfHz] = useState<number>(2000); // Hz
  const [autoDutyCycle, setAutoDutyCycle] = useState<boolean>(true);
  
  const [gainDBi, setGainDBi] = useState<number>(4);
  const [apertureM, setApertureM] = useState<number>(0.3);
  const [standard, setStandard] = useState<'FCC' | 'ICNIRP'>('FCC');

  // Radar mechanical rotation / scanning parameters
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanAngleDeg, setScanAngleDeg] = useState<number>(360);
  const [beamwidthHzDeg, setBeamwidthHzDeg] = useState<number>(2.0);

  // Radome enclosure parameters
  const [hasRadome, setHasRadome] = useState<boolean>(false);
  const [radomeRadiusM, setRadomeRadiusM] = useState<number>(2.0);
  const [radomeLossDb, setRadomeLossDb] = useState<number>(0.5);
  const [radomeReflectionPct, setRadomeReflectionPct] = useState<number>(4.0);

  const [selectedDistance, setSelectedDistance] = useState<number>(10); // distance scrubber

  // Filtered preset list based on active category
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'All') return BAND_PRESETS;
    return BAND_PRESETS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  // Load a Preset
  const applyPreset = (preset: BandPreset) => {
    setActivePreset(preset);
    setFreqMHz(preset.freqMHz);
    setGainDBi(preset.gainDBi);
    setApertureM(preset.apertureM);
    setAntennaPattern(preset.pattern);
    setSignalType(preset.defaultSignal);
    setPeakPowerKW(preset.defaultPowerKW);
    setIsScanning(preset.isRadar);
    
    if (preset.isRadar) {
      setDutyCyclePct(preset.dutyPct || 2.0);
      setPulseWidthUs(preset.pulseWidthUs || 10);
      setPrfHz(preset.prfHz || 2000);
      setAutoDutyCycle(true);
      setBeamwidthHzDeg(preset.freqMHz >= 10000 ? 1.0 : 2.0);
      setScanAngleDeg(360);
      setHasRadome(true);
      setRadomeRadiusM(preset.apertureM * 1.8);
    } else {
      setHasRadome(false);
    }
  };

  // Intermediate calculations
  const math = useMemo(() => {
    const c = 299792458; // m/s
    const freqHz = freqMHz * 1e6;
    const wavelength = c / freqHz; // meters

    // 1. Basic Duty Cycle (Pulse kinetics)
    let dutyFraction = 1.0;
    if (signalType === 'Pulsed') {
      if (autoDutyCycle) {
        dutyFraction = (pulseWidthUs * 1e-6) * prfHz;
      } else {
        dutyFraction = dutyCyclePct / 100;
      }
      dutyFraction = Math.min(1.0, Math.max(0.0001, dutyFraction));
    }

    const peakPowerW = peakPowerKW * 1000;
    const avgPowerW = peakPowerW * dutyFraction;
    
    // 2. Rotational Scanning Duty Factor
    const rotationalDF = (antennaPattern === 'Directional' && isScanning) 
      ? Math.min(1.0, beamwidthHzDeg / Math.max(beamwidthHzDeg, scanAngleDeg)) 
      : 1.0;

    const scanningAvgPowerW = avgPowerW * rotationalDF;
    const linearGain = Math.pow(10, gainDBi / 10);
    
    const eirpPeakW = peakPowerW * linearGain;
    const eirpStaticAvgW = avgPowerW * linearGain;
    const eirpScanningAvgW = scanningAvgPowerW * linearGain;

    const transitionDistM = (2 * Math.pow(apertureM, 2)) / wavelength;
    const apertureArea = Math.PI * Math.pow(apertureM / 2, 2);

    const maxNearFieldPowerDensityW = (4 * avgPowerW) / Math.max(0.01, apertureArea);
    const maxNearFieldPowerDensityScanningW = (4 * scanningAvgPowerW) / Math.max(0.01, apertureArea);

    // Exposure Limits (W/m^2)
    let limitControlledW = 50.0;
    let limitUncontrolledW = 10.0;

    if (standard === 'FCC') {
      if (freqMHz >= 300 && freqMHz <= 1500) {
        limitControlledW = (freqMHz / 300) * 10;
        limitUncontrolledW = (freqMHz / 1500) * 10;
      } else if (freqMHz > 1500) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      } else {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      }
    } else {
      // ICNIRP (2020)
      if (freqMHz >= 400 && freqMHz <= 2000) {
        limitControlledW = freqMHz / 40;
        limitUncontrolledW = freqMHz / 200;
      } else if (freqMHz > 2000) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      } else {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      }
    }

    // 3. Safe Exclusion distances
    let safeControlledDistStaticM = 0;
    let safeUncontrolledDistStaticM = 0;
    if (limitControlledW < maxNearFieldPowerDensityW) {
      safeControlledDistStaticM = Math.sqrt(eirpStaticAvgW / (4 * Math.PI * limitControlledW));
    }
    if (limitUncontrolledW < maxNearFieldPowerDensityW) {
      safeUncontrolledDistStaticM = Math.sqrt(eirpStaticAvgW / (4 * Math.PI * limitUncontrolledW));
    }

    let safeControlledDistScanningM = 0;
    let safeUncontrolledDistScanningM = 0;
    if (limitControlledW < maxNearFieldPowerDensityScanningW) {
      safeControlledDistScanningM = Math.sqrt(eirpScanningAvgW / (4 * Math.PI * limitControlledW));
    }
    if (limitUncontrolledW < maxNearFieldPowerDensityScanningW) {
      safeUncontrolledDistScanningM = Math.sqrt(eirpScanningAvgW / (4 * Math.PI * limitUncontrolledW));
    }

    const beamwidthDeg = Math.min(180, (70 * wavelength) / Math.max(0.01, apertureM));

    // 4. Radome Standing Wave Multiplier
    const reflectionFraction = radomeReflectionPct / 100;
    const standingWaveMultiplier = Math.pow(1 + Math.sqrt(reflectionFraction), 2);
    const radomeTransmissionFraction = Math.pow(10, -radomeLossDb / 10);

    let incidentRadomeW = 0;
    if (radomeRadiusM <= transitionDistM) {
      incidentRadomeW = maxNearFieldPowerDensityW;
    } else {
      incidentRadomeW = eirpStaticAvgW / (4 * Math.PI * Math.pow(radomeRadiusM, 2));
    }

    const internalRadomePeakW = incidentRadomeW * standingWaveMultiplier;
    const externalRadomeW = incidentRadomeW * radomeTransmissionFraction;
    const radomeLockoutRequired = hasRadome && internalRadomePeakW > limitControlledW;

    return {
      wavelength,
      freqHz,
      dutyFraction,
      avgPowerW,
      peakPowerW,
      rotationalDF,
      scanningAvgPowerW,
      linearGain,
      eirpPeakW,
      eirpStaticAvgW,
      eirpScanningAvgW,
      transitionDistM,
      maxNearFieldPowerDensityW,
      maxNearFieldPowerDensityScanningW,
      limitControlledW,
      limitUncontrolledW,
      safeControlledDistStaticM,
      safeUncontrolledDistStaticM,
      safeControlledDistScanningM,
      safeUncontrolledDistScanningM,
      beamwidthDeg,
      apertureArea,
      standingWaveMultiplier,
      radomeTransmissionFraction,
      incidentRadomeW,
      internalRadomePeakW,
      externalRadomeW,
      radomeLockoutRequired
    };
  }, [freqMHz, antennaPattern, signalType, peakPowerKW, dutyCyclePct, pulseWidthUs, prfHz, autoDutyCycle, gainDBi, apertureM, standard, isScanning, scanAngleDeg, beamwidthHzDeg, hasRadome, radomeRadiusM, radomeLossDb, radomeReflectionPct]);

  // Compute power density at scrubbed distance
  const scrubbedMetrics = useMemo(() => {
    const r = selectedDistance;
    let powerDensityW = 0;

    const applyRadomeAttenuation = hasRadome && r > radomeRadiusM;
    const isInsideRadome = hasRadome && r <= radomeRadiusM;

    const useScanning = antennaPattern === 'Directional' && isScanning;
    const eirp = useScanning ? math.eirpScanningAvgW : math.eirpStaticAvgW;
    const maxNF = useScanning ? math.maxNearFieldPowerDensityScanningW : math.maxNearFieldPowerDensityW;

    if (r <= math.transitionDistM) {
      powerDensityW = maxNF;
    } else {
      powerDensityW = eirp / (4 * Math.PI * Math.pow(r, 2));
    }

    if (applyRadomeAttenuation) {
      powerDensityW *= math.radomeTransmissionFraction;
    } else if (isInsideRadome) {
      powerDensityW *= math.standingWaveMultiplier;
    }

    const powerDensityMW = powerDensityW / 10;
    const exceedsControlled = powerDensityW > math.limitControlledW;
    const exceedsUncontrolled = powerDensityW > math.limitUncontrolledW;
    const eField = Math.sqrt(powerDensityW * 377);

    return {
      r,
      powerDensityW,
      powerDensityMW,
      exceedsControlled,
      exceedsUncontrolled,
      eField,
      isInsideRadome
    };
  }, [selectedDistance, math, hasRadome, radomeRadiusM, isScanning, antennaPattern]);

  // Chart data generation
  const chartData = useMemo(() => {
    const distances: number[] = [];
    const densityValues: number[] = [];
    
    const maxVal = Math.max(80, Math.max(math.safeUncontrolledDistStaticM, math.safeUncontrolledDistScanningM) * 1.6);
    const steps = 300;
    const step = maxVal / steps;

    const useScanning = antennaPattern === 'Directional' && isScanning;

    for (let i = 0; i <= steps; i++) {
      const r = Math.max(0.1, i * step);
      distances.push(r);

      const eirp = useScanning ? math.eirpScanningAvgW : math.eirpStaticAvgW;
      const maxNF = useScanning ? math.maxNearFieldPowerDensityScanningW : math.maxNearFieldPowerDensityW;

      let baseS = 0;
      if (r <= math.transitionDistM) {
        baseS = maxNF;
      } else {
        baseS = eirp / (4 * Math.PI * Math.pow(r, 2));
      }

      if (hasRadome) {
        if (r <= radomeRadiusM) {
          baseS *= math.standingWaveMultiplier;
        } else {
          baseS *= math.radomeTransmissionFraction;
        }
      }

      densityValues.push(baseS / 10);
    }

    return { distances, densityValues };
  }, [math, hasRadome, radomeRadiusM, isScanning, antennaPattern]);

  const activeSafeControlled = (antennaPattern === 'Directional' && isScanning) ? math.safeControlledDistScanningM : math.safeControlledDistStaticM;
  const activeSafeUncontrolled = (antennaPattern === 'Directional' && isScanning) ? math.safeUncontrolledDistScanningM : math.safeUncontrolledDistStaticM;

  return (
    <div className="emr-module">
      <div className="panel-header">
        <h2>📡 Electronic Warfare EMR & Microwave Safety Calculator</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Map electromagnetic radiation hazard zones for RF/Microwave jamming transmitters, phased arrays, tactical radar systems, and 360° omnidirectional counter-IED EW systems.
        </p>
      </div>

      {/* Categorized Preset Library */}
      <div className="panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            EW & Radar Hardware Library
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredPresets.length} presets
          </span>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="btn btn-primary"
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: selectedCategory === cat ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                color: selectedCategory === cat ? '#000' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                boxShadow: 'none',
                fontWeight: selectedCategory === cat ? 'bold' : 'normal'
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset Buttons Grid */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {filteredPresets.map((preset) => {
            const isSelected = activePreset?.name === preset.name;
            return (
              <button
                key={preset.name}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                  color: isSelected ? '#00e5ff' : '#fff',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`,
                  boxShadow: isSelected ? '0 0 10px rgba(0, 229, 255, 0.3)' : 'none'
                }}
                onClick={() => applyPreset(preset)}
              >
                {preset.name} ({preset.freqMHz >= 1000 ? `${(preset.freqMHz / 1000).toFixed(1)} GHz` : `${preset.freqMHz} MHz`})
              </button>
            );
          })}
        </div>

        {/* Active Preset Operational Context Card */}
        {activePreset && (
          <div style={{ marginTop: '15px', padding: '12px 15px', background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: 'var(--color-primary)' }}>{activePreset.name}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', padding: '2px 6px', background: 'rgba(255,159,28,0.1)', borderRadius: '4px' }}>
                {activePreset.category}
              </span>
            </div>
            <div style={{ color: '#fff', marginBottom: '4px' }}>{activePreset.typicalApp}</div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4' }}>{activePreset.description}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Controls Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Transmitter & System Config</h3>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Antenna Pattern</label>
              <select
                className="form-control"
                value={antennaPattern}
                onChange={(e) => setAntennaPattern(e.target.value as any)}
              >
                <option value="Directional">Directional (Dish/Phased Array/Pod)</option>
                <option value="Omnidirectional">Omnidirectional (360° Mast/Whip/Jammer)</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Signal Waveform</label>
              <select
                className="form-control"
                value={signalType}
                onChange={(e) => setSignalType(e.target.value as any)}
              >
                <option value="CW">CW (Continuous Jammer)</option>
                <option value="Pulsed">Pulsed (Radar Waveform)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Regulation Standard</label>
              <select
                className="form-control"
                value={standard}
                onChange={(e) => setStandard(e.target.value as any)}
              >
                <option value="FCC">FCC Part 1.1310</option>
                <option value="ICNIRP">ICNIRP (2020)</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Peak Power</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={peakPowerKW}
                  min="0.001"
                  step="any"
                  onChange={(e) => setPeakPowerKW(Math.max(0.001, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>kW</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Carrier Frequency</label>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {freqMHz >= 1000 ? `${(freqMHz / 1000).toFixed(2)} GHz` : `${freqMHz} MHz`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="95000"
              step="100"
              value={freqMHz}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              onChange={(e) => setFreqMHz(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Wavelength (λ): <strong>{(math.wavelength * 100).toFixed(2)} cm</strong>
            </span>
          </div>

          {signalType === 'Pulsed' && (
            <div style={{ display: 'flex', gap: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pulse Width (τ)</label>
                <input
                  type="number"
                  className="form-control"
                  value={pulseWidthUs}
                  min="0.1"
                  onChange={(e) => setPulseWidthUs(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pulse Rep Freq (PRF)</label>
                <input
                  type="number"
                  className="form-control"
                  value={prfHz}
                  min="1"
                  onChange={(e) => setPrfHz(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Antenna Gain</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={gainDBi}
                  onChange={(e) => setGainDBi(Number(e.target.value))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>dBi</span>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Aperture Size (D)</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={apertureM}
                  min="0.05"
                  step="0.05"
                  onChange={(e) => setApertureM(Math.max(0.05, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>m</span>
              </div>
            </div>
          </div>

          {/* Mechanical Rotation / Scanning Inputs */}
          {antennaPattern === 'Directional' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                <input
                  type="checkbox"
                  checked={isScanning}
                  onChange={(e) => setIsScanning(e.target.checked)}
                />
                Enable Mechanical Scanning / Rotation
              </label>
              
              {isScanning && (
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', padding: '10px', background: 'rgba(0, 229, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Horizontal Beamwidth</label>
                    <input
                      type="number"
                      className="form-control"
                      value={beamwidthHzDeg}
                      step="0.1"
                      min="0.1"
                      onChange={(e) => setBeamwidthHzDeg(Math.max(0.1, Number(e.target.value)))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Scan Path Angle</label>
                    <select
                      className="form-control"
                      value={scanAngleDeg}
                      onChange={(e) => setScanAngleDeg(Number(e.target.value))}
                    >
                      <option value="360">360° (Full Circle)</option>
                      <option value="120">120° (Sector Scan)</option>
                      <option value="60">60° (Target Tracking)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Radome Inputs */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              <input
                type="checkbox"
                checked={hasRadome}
                onChange={(e) => setHasRadome(e.target.checked)}
              />
              Enable Radome Enclosure Analysis
            </label>

            {hasRadome && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Radome Radius (m)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeRadiusM}
                    step="0.5"
                    min="0.5"
                    onChange={(e) => setRadomeRadiusM(Math.max(0.5, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Wall Loss (dB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeLossDb}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => setRadomeLossDb(Math.max(0.01, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Shell Reflection Coefficient</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>{radomeReflectionPct} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15.0"
                    step="0.5"
                    value={radomeReflectionPct}
                    style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                    onChange={(e) => setRadomeReflectionPct(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hazard Output Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Microwave Safety Mapping Summary</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
              Calculated boundaries for microwave exclusion zones ({antennaPattern === 'Omnidirectional' ? '360° Omnidirectional Envelope' : 'Directional Sector'}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Controlled / Crew Limit */}
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                <h4 style={{ color: 'var(--color-warning)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Controlled (Occupational Crew) Zone
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>
                      {activeSafeControlled.toFixed(1)} meters
                    </div>
                    {antennaPattern === 'Directional' && isScanning && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Stopped Lobe Hazard: <strong>{math.safeControlledDistStaticM.toFixed(1)} m</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Limit: {(math.limitControlledW / 10).toFixed(2)} mW/cm²</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({math.limitControlledW.toFixed(0)} W/m²)</div>
                  </div>
                </div>
              </div>

              {/* Uncontrolled / Public Limit */}
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <h4 style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Uncontrolled (General Public) Zone
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>
                      {activeSafeUncontrolled.toFixed(1)} meters
                    </div>
                    {antennaPattern === 'Directional' && isScanning && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Stopped Lobe Hazard: <strong>{math.safeUncontrolledDistStaticM.toFixed(1)} m</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Limit: {(math.limitUncontrolledW / 10).toFixed(2)} mW/cm²</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({math.limitUncontrolledW.toFixed(0)} W/m²)</div>
                  </div>
                </div>
              </div>

              {/* Radome Warnings */}
              {hasRadome && (
                <div style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${math.radomeLockoutRequired ? 'var(--color-danger)' : 'var(--color-success)'}`, background: math.radomeLockoutRequired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)' }}>
                  <h4 style={{ color: math.radomeLockoutRequired ? 'var(--color-danger)' : 'var(--color-success)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Radome Internal Exposure Analysis
                  </h4>
                  <div style={{ fontSize: '0.85rem', marginTop: '5px', color: '#fff' }}>
                    Reflection Hotspot Multiplier: <strong style={{ color: 'var(--color-accent)' }}>{math.standingWaveMultiplier.toFixed(2)}x</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '3px' }}>
                    <span>Incident Power Density:</span>
                    <span>{(math.incidentRadomeW / 10).toExponential(2)} mW/cm²</span>
                  </div>

                  {math.radomeLockoutRequired && (
                    <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
                      ⚠️ DANGER: LOCK-OUT TAG-OUT (LOTO) REQUIRED FOR RADOME ENTRY
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Antenna Mode:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{antennaPattern} ({antennaPattern === 'Omnidirectional' ? '360° Azimuth' : 'Main Beam Lobe'})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>EIRP (Avg):</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{(math.eirpStaticAvgW / 1000).toFixed(2)} kW</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Near-Field Boundary (2 D² / λ):</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{math.transitionDistM.toFixed(2)} meters</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Radiation Lobe / 360° Omnidirectional Visualizer */}
      <div className="panel" style={{ overflowX: 'auto' }}>
        <h3>
          {antennaPattern === 'Omnidirectional'
            ? '360° Omnidirectional Radiation Map & Exclusion Zones'
            : 'Radar Beam Profile & Radome Reflection Overlay'}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
          {antennaPattern === 'Omnidirectional'
            ? 'Top-down 360-degree mapping showing concentric circular exclusion zones surrounding the central vehicle/antenna mast.'
            : 'Visual mapping of directional radar lobes. Concentric arcs represent internal standing wave peaks inside the radome.'}
        </p>

        <div style={{ minWidth: '800px', background: '#030712', borderRadius: '8px', padding: '20px', border: '1px solid var(--color-border)' }}>
          <svg viewBox="0 0 800 280" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="mainLobeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
              <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="omniPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.6" />
                <stop offset="70%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {antennaPattern === 'Omnidirectional' ? (
              /* 360-degree Omnidirectional Top-Down View */
              (() => {
                const centerX = 400;
                const centerY = 140;

                const maxDist = Math.max(activeSafeUncontrolled, 15);
                const scale = 110 / maxDist;

                const controlledRadius = Math.max(15, activeSafeControlled * scale);
                const uncontrolledRadius = Math.max(30, activeSafeUncontrolled * scale);

                return (
                  <>
                    <circle cx={centerX} cy={centerY} r={uncontrolledRadius * 1.4} fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                    <circle cx={centerX} cy={centerY} r={uncontrolledRadius * 0.7} fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

                    {/* Uncontrolled (Public) 360° Exclusion Ring */}
                    <circle cx={centerX} cy={centerY} r={uncontrolledRadius} fill="rgba(239, 68, 68, 0.08)" stroke="#EF4444" strokeWidth="2" strokeDasharray="6 3" />

                    {/* Controlled (Crew) 360° Exclusion Ring */}
                    <circle cx={centerX} cy={centerY} r={controlledRadius} fill="rgba(245, 158, 11, 0.15)" stroke="#F59E0B" strokeWidth="2" />

                    {/* 360 degree RF Radiation Waves Emission */}
                    <circle cx={centerX} cy={centerY} r={controlledRadius * 0.5} fill="url(#omniPulse)" opacity="0.8" />
                    <circle cx={centerX} cy={centerY} r={controlledRadius * 0.8} fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />

                    {/* Central Vehicle / Antenna Mast Icon */}
                    <g transform={`translate(${centerX}, ${centerY})`}>
                      <rect x="-16" y="-24" width="32" height="48" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                      <rect x="-12" y="-18" width="24" height="10" rx="2" fill="#334155" />
                      <circle cx="0" cy="0" r="6" fill="var(--color-primary)" />
                      <circle cx="0" cy="0" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
                    </g>

                    {/* Distance Callout Vectors */}
                    <line x1={centerX} y1={centerY} x2={centerX + uncontrolledRadius} y2={centerY} stroke="#EF4444" strokeWidth="1.5" />
                    <text x={centerX + uncontrolledRadius + 8} y={centerY + 4} fill="#EF4444" fontSize="10" fontWeight="bold">
                      Uncontrolled Public Zone ({activeSafeUncontrolled.toFixed(1)}m)
                    </text>

                    <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - controlledRadius} stroke="#F59E0B" strokeWidth="1.5" />
                    <text x={centerX + 6} y={centerY - controlledRadius - 6} fill="#F59E0B" fontSize="10" fontWeight="bold">
                      Controlled Crew Zone ({activeSafeControlled.toFixed(1)}m)
                    </text>
                  </>
                );
              })()
            ) : (
              /* Directional Beam Mode */
              (() => {
                const beamHalfRad = (math.beamwidthDeg / 2) * Math.PI / 180;
                const referenceDistance = Math.max(math.safeUncontrolledDistStaticM, math.safeUncontrolledDistScanningM);
                const scale = referenceDistance > 0 ? 280 / referenceDistance : 280;

                const controlledSVGWidth = Math.max(20, activeSafeControlled * scale);
                const uncontrolledSVGWidth = Math.max(40, activeSafeUncontrolled * scale);

                const cX = Math.min(680, 80 + controlledSVGWidth);
                const uX = Math.min(740, 80 + uncontrolledSVGWidth);

                const spreadControlledY = Math.max(10, controlledSVGWidth * Math.tan(beamHalfRad));
                const spreadUncontrolledY = Math.max(20, uncontrolledSVGWidth * Math.tan(beamHalfRad));

                const radomeSVGRadius = hasRadome ? radomeRadiusM * scale : 0;

                return (
                  <>
                    <circle cx="80" cy="140" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <circle cx="80" cy="140" r="280" fill="none" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

                    {/* Outer Uncontrolled Zone */}
                    <path 
                      d={`M 80,140 
                         Q ${80 + uncontrolledSVGWidth * 0.4},${140 - spreadUncontrolledY * 1.2} ${uX},140
                         Q ${80 + uncontrolledSVGWidth * 0.4},${140 + spreadUncontrolledY * 1.2} 80,140`}
                      fill="rgba(239, 68, 68, 0.06)"
                      stroke="#EF4444"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />

                    {/* Inner Controlled Zone */}
                    <path 
                      d={`M 80,140 
                         Q ${80 + controlledSVGWidth * 0.4},${140 - spreadControlledY * 1.2} ${cX},140
                         Q ${80 + controlledSVGWidth * 0.4},${140 + spreadControlledY * 1.2} 80,140`}
                      fill="rgba(245, 158, 11, 0.1)"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />

                    {/* Main Beam Lobe */}
                    <polygon
                      points={`80,138 720,${140 - Math.max(40, 600 * Math.tan(beamHalfRad))} 720,${140 + Math.max(40, 600 * Math.tan(beamHalfRad))} 80,142`}
                      fill="url(#mainLobeGrad)"
                      opacity="0.65"
                    />

                    {/* Boundary Markers */}
                    {activeSafeControlled > 0 && (
                      <g transform={`translate(${cX}, 140)`}>
                        <line x1="0" y1="-30" x2="0" y2="30" stroke="#F59E0B" strokeWidth="1.5" />
                        <text x="5" y="-12" fill="#F59E0B" fontSize="8" fontWeight="bold">Controlled Zone ({activeSafeControlled.toFixed(1)}m)</text>
                      </g>
                    )}

                    {activeSafeUncontrolled > 0 && (
                      <g transform={`translate(${uX}, 140)`}>
                        <line x1="0" y1="-55" x2="0" y2="55" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
                        <text x="5" y="38" fill="#EF4444" fontSize="8" fontWeight="bold">Uncontrolled Zone ({activeSafeUncontrolled.toFixed(1)}m)</text>
                      </g>
                    )}

                    {/* Radome Shell */}
                    {hasRadome && radomeSVGRadius > 0 && (
                      <>
                        <circle cx="80" cy="140" r={radomeSVGRadius} fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 3" />
                        <text x={80} y={140 - radomeSVGRadius - 8} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                          Radome Wall ({radomeRadiusM}m)
                        </text>
                      </>
                    )}

                    {/* Antenna Dish */}
                    <path d="M 60,115 C 72,115 72,165 60,165 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                    <rect x="38" y="132" width="22" height="16" fill="#334155" />
                    <circle cx="68" cy="140" r="6" fill="url(#antennaGlow)" />

                    <text x="45" y="185" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">ANTENNA</text>
                  </>
                );
              })()
            )}
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Plotly Power Density Chart */}
        <div className="panel" style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Power Density Decay Profile</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            Power density ($mW/cm^2$) vs distance from transmitter.
          </p>
          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  x: chartData.distances,
                  y: chartData.densityValues,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Power Density (Avg)',
                  line: { color: 'var(--color-primary)', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(0, 229, 255, 0.05)'
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitControlledW / 10, math.limitControlledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Controlled Limit (Crew)',
                  line: { color: '#F59E0B', width: 2, dash: 'dash' }
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitUncontrolledW / 10, math.limitUncontrolledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Uncontrolled Limit (Public)',
                  line: { color: '#EF4444', width: 2, dash: 'dash' }
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Distance from Antenna (meters)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { 
                  title: { text: 'Power Density (mW/cm²)' }, 
                  type: 'log', 
                  color: '#94A3B8',
                  gridcolor: 'rgba(255,255,255,0.05)'
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 20, b: 60 },
                legend: { x: 0.5, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '380px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        {/* Distance inspector */}
        <div className="panel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
          <h3>Distance Safety Inspector</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Inspect local power density values and biological compliance metrics at varying distances.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Target Range:</span>
                <strong style={{ color: 'var(--color-accent)' }}>{selectedDistance} meters</strong>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(100, Math.round(activeSafeUncontrolled * 1.5))}
                value={selectedDistance}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                onChange={(e) => setSelectedDistance(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Power Density:</span>
                <span style={{ fontWeight: 'bold', color: scrubbedMetrics.exceedsUncontrolled ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {scrubbedMetrics.powerDensityMW.toExponential(3)} mW/cm²
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Electric Field Intensity:</span>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>
                  {scrubbedMetrics.eField.toFixed(1)} V/m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Crew Safe?</span>
                <span style={{ fontWeight: 'bold', color: scrubbedMetrics.exceedsControlled ? '#EF4444' : '#10B981' }}>
                  {scrubbedMetrics.exceedsControlled ? '⚠️ NO (Exceeds Limit)' : '✅ YES'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Public Safe?</span>
                <span style={{ fontWeight: 'bold', color: scrubbedMetrics.exceedsUncontrolled ? '#EF4444' : '#10B981' }}>
                  {scrubbedMetrics.exceedsUncontrolled ? '⚠️ NO (Exceeds Limit)' : '✅ YES'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMRModule;
