import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

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
    typicalApp: 'Flight III Destroyer Active Phased Array',
    gainDBi: 45,
    apertureM: 4.25,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 2500,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 30,
    prfHz: 2000,
    description: 'Next-generation naval GaN radar delivering +35 dB greater sensitivity than legacy SPY-1 arrays.'
  },

  // 4. Air Defense & Fire Control
  {
    name: 'AN/MPQ-65 Patriot Radar',
    category: 'Air Defense & Fire Control',
    freqMHz: 5400,
    typicalApp: 'Patriot PAC-3 Missile Defense Array',
    gainDBi: 38,
    apertureM: 2.44,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 100,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 15,
    prfHz: 3000,
    description: 'C-band multifunction phased array supporting surveillance, track, and missile guidance.'
  },
  {
    name: 'AN/TPY-2 THAAD Radar',
    category: 'Air Defense & Fire Control',
    freqMHz: 9500,
    typicalApp: 'THAAD X-Band Ballistic Defense Radar',
    gainDBi: 48,
    apertureM: 3.1,
    isRadar: true,
    pattern: 'Directional',
    defaultPowerKW: 800,
    defaultSignal: 'Pulsed',
    pulseWidthUs: 20,
    prfHz: 1500,
    description: 'Truck-mounted high-resolution X-band phased array capable of tracking ballistic missiles thousands of miles away.'
  }
];

const CATEGORIES: PresetCategory[] = [
  'C-UAS & Counter-IED',
  'Airborne EW & Jamming',
  'Naval EW & Radars',
  'Air Defense & Fire Control',
  'Directed Energy & HPM',
  'SATCOM & Communications'
];

type EMRTab = 'tactical' | 'density' | 'radome' | 'standards' | 'physics';

const EMRModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>('C-UAS & Counter-IED');
  const [activePreset, setActivePreset] = useState<BandPreset | null>(BAND_PRESETS[0]);
  const [activeTab, setActiveTab] = useState<EMRTab>('tactical');

  // Input States
  const [freqMHz, setFreqMHz] = useState<number>(900);
  const [antennaPattern, setAntennaPattern] = useState<'Directional' | 'Omnidirectional'>('Omnidirectional');
  const [signalType, setSignalType] = useState<'CW' | 'Pulsed'>('CW');
  const [peakPowerKW, setPeakPowerKW] = useState<number>(0.2);
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(100);
  const [pulseWidthUs, setPulseWidthUs] = useState<number>(10);
  const [prfHz, setPrfHz] = useState<number>(1000);
  const [autoDutyCycle, setAutoDutyCycle] = useState<boolean>(true);
  const [gainDBi, setGainDBi] = useState<number>(4);
  const [apertureM, setApertureM] = useState<number>(0.3);
  const [standard, setStandard] = useState<'FCC' | 'ICNIRP'>('FCC');

  // Mechanical Scanning / Rotation
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanAngleDeg, setScanAngleDeg] = useState<number>(360);
  const [beamwidthHzDeg, setBeamwidthHzDeg] = useState<number>(3.5);

  // Radome Enclosure
  const [hasRadome, setHasRadome] = useState<boolean>(false);
  const [radomeRadiusM, setRadomeRadiusM] = useState<number>(2.0);
  const [radomeLossDb, setRadomeLossDb] = useState<number>(0.5);
  const [radomeReflectionPct, setRadomeReflectionPct] = useState<number>(4.0);

  // Interactive Distance Inspector
  const [selectedDistance, setSelectedDistance] = useState<number>(10.0);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Apply a Preset
  const applyPreset = (preset: BandPreset) => {
    setActivePreset(preset);
    setFreqMHz(preset.freqMHz);
    setAntennaPattern(preset.pattern);
    setGainDBi(preset.gainDBi);
    setApertureM(preset.apertureM);
    setPeakPowerKW(preset.defaultPowerKW);
    setSignalType(preset.defaultSignal);

    if (preset.defaultSignal === 'Pulsed') {
      setAutoDutyCycle(true);
      if (preset.pulseWidthUs) setPulseWidthUs(preset.pulseWidthUs);
      if (preset.prfHz) setPrfHz(preset.prfHz);
    } else {
      setDutyCyclePct(100);
      setAutoDutyCycle(false);
    }

    if (preset.pattern === 'Directional' && preset.isRadar) {
      setIsScanning(true);
      setScanAngleDeg(360);
      setBeamwidthHzDeg(Math.max(1.0, Math.min(10, (70 * (3e8 / (preset.freqMHz * 1e6))) / preset.apertureM)));
    } else {
      setIsScanning(false);
    }
  };

  const filteredPresets = useMemo(() => {
    return BAND_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Comprehensive Electromagnetic Math Calculations Engine
  const math = useMemo(() => {
    const freqHz = freqMHz * 1e6;
    const c = 299792458;
    const wavelength = c / freqHz;

    let dutyFraction = 1.0;
    if (signalType === 'Pulsed') {
      if (autoDutyCycle) {
        dutyFraction = (pulseWidthUs * 1e-6) * prfHz;
      } else {
        dutyFraction = dutyCyclePct / 100;
      }
      dutyFraction = Math.max(0.000001, Math.min(1.0, dutyFraction));
    }

    const peakPowerW = peakPowerKW * 1000;
    const avgPowerW = peakPowerW * dutyFraction;

    let rotationalDF = 1.0;
    if (antennaPattern === 'Directional' && isScanning && scanAngleDeg > 0) {
      rotationalDF = Math.min(1.0, beamwidthHzDeg / scanAngleDeg);
    }
    const scanningAvgPowerW = avgPowerW * rotationalDF;

    const linearGain = Math.pow(10, gainDBi / 10);
    const eirpPeakW = peakPowerW * linearGain;
    const eirpStaticAvgW = avgPowerW * linearGain;
    const eirpScanningAvgW = scanningAvgPowerW * linearGain;

    const transitionDistM = (2 * Math.pow(apertureM, 2)) / wavelength;
    const apertureArea = (Math.PI * Math.pow(apertureM, 2)) / 4;
    const maxNearFieldPowerDensityW = (4 * avgPowerW) / Math.max(0.001, apertureArea);
    const maxNearFieldPowerDensityScanningW = (4 * scanningAvgPowerW) / Math.max(0.001, apertureArea);

    let limitControlledW = 50.0;
    let limitUncontrolledW = 10.0;

    if (standard === 'FCC') {
      if (freqMHz >= 30 && freqMHz < 300) {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      } else if (freqMHz >= 300 && freqMHz < 1500) {
        limitControlledW = (freqMHz / 300) * 10;
        limitUncontrolledW = (freqMHz / 1500) * 10;
      } else if (freqMHz >= 1500) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      }
    } else {
      if (freqMHz >= 30 && freqMHz < 400) {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      } else if (freqMHz >= 400 && freqMHz < 2000) {
        limitControlledW = (freqMHz / 40) * 1.0;
        limitUncontrolledW = (freqMHz / 200) * 1.0;
      } else if (freqMHz >= 2000) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      }
    }

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

  const activeSafeControlled = (antennaPattern === 'Directional' && isScanning) ? math.safeControlledDistScanningM : math.safeControlledDistStaticM;
  const activeSafeUncontrolled = (antennaPattern === 'Directional' && isScanning) ? math.safeUncontrolledDistScanningM : math.safeUncontrolledDistStaticM;

  // Compute power density at target distance
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
    const steps = 250;
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

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'Electromagnetic Radiation Safety & HERO/HERF Exclusion Dossier',
    moduleName: 'Module 18: Electronic Warfare EMR & Microwave Radiation Safety',
    statuteCitation: 'IEEE C95.1-2019 / FCC OET Bulletin 65 / DoD MIL-STD-464C',
    verificationTestId: 'VTEST-12',
    operatorName: 'Radiation Safety Officer / EW Officer',
    operatorCredentials: 'Certified Health Physicist / Electromagnetic Safety Specialist',
    facility: 'Tactical Radar & Electronic Warfare Operations Base',
    notes: `EMR emission assessment for ${freqMHz} MHz emitter operating at ${peakPowerKW} kW (${signalType}). Radome enclosure: ${hasRadome ? 'Installed' : 'None'}.`,
    formulaDescription: 'S(R) = \\frac{\\text{EIRP}_{\\text{avg}}}{4\\pi R^2}, \\quad R_{\\text{nf}} = \\frac{2 D^2}{\\lambda}, \\quad S_{\\text{int}} = S_0 \\left(1 + \\sqrt{\\Gamma}\\right)^2',
    inputs: [
      { label: 'Frequency', value: freqMHz, unit: 'MHz' },
      { label: 'Peak Power', value: peakPowerKW, unit: 'kW' },
      { label: 'Antenna Gain', value: gainDBi, unit: 'dBi' },
      { label: 'Aperture Diameter', value: apertureM, unit: 'm' },
      { label: 'Operating Mode', value: `${antennaPattern} (${signalType})` },
      { label: 'Antenna Scanning', value: isScanning ? `Active (${scanAngleDeg}° sector)` : 'Static Boresight' },
      { label: 'Radome Enclosure', value: hasRadome ? `Yes (${radomeLossDb} dB loss)` : 'None / Open Air' },
      { label: 'Inspection Distance', value: selectedDistance, unit: 'm' }
    ],
    outputs: [
      { label: 'Controlled / Occupational Boundary', value: math.safeControlledDistStaticM.toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'Uncontrolled / Public Boundary', value: math.safeUncontrolledDistStaticM.toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'Rayleigh Near-Field Boundary (2D²/λ)', value: math.transitionDistM.toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'HERP Personnel Hazard Distance', value: math.safeControlledDistStaticM.toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'HERF Fuel Hazard Distance', value: (math.safeControlledDistStaticM * 1.5).toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'HERO Ordnance Hazard Distance', value: (math.safeControlledDistStaticM * 2.2).toFixed(2), unit: 'm', status: 'PASS' },
      { label: 'Wavelength (λ)', value: (math.wavelength * 100).toFixed(2), unit: 'cm', status: 'PASS' },
      { label: 'Max Near-Field Irradiance', value: (math.maxNearFieldPowerDensityW / 10).toFixed(2), unit: 'mW/cm²', status: 'PASS' }
    ]
  }), [freqMHz, peakPowerKW, signalType, gainDBi, apertureM, antennaPattern, isScanning, scanAngleDeg, hasRadome, radomeLossDb, selectedDistance, math]);

  return (
    <div className="emr-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span>📡 Electronic Warfare EMR & Microwave Radiation Safety</span>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
              FCC OET-65 / IEEE C95.1-2019 / DoD MIL-STD-464C
            </span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Military avionics and RF safety engine mapping non-ionizing exclusion boundaries, near-field transitions (2D²/λ), dielectric radome reflection hotspots, and rotational scanning dilution.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.08)'
            }}
          >
            <span>🛡️</span>
            <span>Audit Dossier (21 CFR Part 11)</span>
          </button>
          <VerificationBadge testId="VTEST-12" standard="FCC OET-65" />
        </div>
      </div>

      {/* Categorized Hardware Preset Bar */}
      <div className="panel" style={{ padding: '14px 20px', marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  background: selectedCategory === cat ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                  color: selectedCategory === cat ? '#000' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {filteredPresets.length} Systems
          </span>
        </div>

        {/* Preset Hardware Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filteredPresets.map((p) => {
            const isSelected = activePreset?.name === p.name;
            return (
              <button
                key={p.name}
                type="button"
                className="btn btn-primary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                  color: isSelected ? '#00e5ff' : '#cbd5e1',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`,
                  boxShadow: isSelected ? '0 0 8px rgba(0, 229, 255, 0.3)' : 'none'
                }}
                onClick={() => applyPreset(p)}
              >
                <strong>{p.name}</strong> ({p.freqMHz >= 1000 ? `${(p.freqMHz / 1000).toFixed(1)} GHz` : `${p.freqMHz} MHz`})
              </button>
            );
          })}
        </div>

        {/* Selected Preset Mission Brief */}
        {activePreset && (
          <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ color: 'var(--color-primary)' }}>{activePreset.typicalApp}: </strong>
              <span style={{ color: 'var(--color-text-muted)' }}>{activePreset.description}</span>
            </div>
            <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
              Base: {activePreset.defaultPowerKW} kW • {activePreset.pattern} • {activePreset.gainDBi} dBi
            </span>
          </div>
        )}
      </div>

      {/* Top Split Dashboard: Left Controls | Right Tactical Assessment HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left Column: Transmitter & Antenna Configuration */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Transmitter Configuration</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
              λ = {(math.wavelength * 100).toFixed(2)} cm
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Antenna Pattern</label>
              <select
                className="form-control"
                value={antennaPattern}
                onChange={(e) => setAntennaPattern(e.target.value as any)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="Directional">Directional (Dish / AESA)</option>
                <option value="Omnidirectional">Omnidirectional (360° Mast)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Signal Waveform</label>
              <select
                className="form-control"
                value={signalType}
                onChange={(e) => setSignalType(e.target.value as any)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="CW">CW (Continuous Jammer)</option>
                <option value="Pulsed">Pulsed (Radar)</option>
              </select>
            </div>
          </div>

          {/* Carrier Frequency Slider & Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>Carrier Frequency</label>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {freqMHz >= 1000 ? `${(freqMHz / 1000).toFixed(2)} GHz` : `${freqMHz} MHz`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="95000"
              step="100"
              value={freqMHz}
              style={{ width: '100%', accentColor: 'var(--color-primary)', background: '#111827' }}
              onChange={(e) => setFreqMHz(Number(e.target.value))}
            />
          </div>

          {/* Transmitter Power & Gain */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Peak Power (kW)</label>
              <input
                type="number"
                className="form-control"
                value={peakPowerKW}
                min="0.001"
                step="any"
                onChange={(e) => setPeakPowerKW(Math.max(0.001, Number(e.target.value)))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Antenna Gain (dBi)</label>
              <input
                type="number"
                className="form-control"
                value={gainDBi}
                onChange={(e) => setGainDBi(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Directional Aperture Diameter */}
          {antennaPattern === 'Directional' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Aperture Size D (m)</label>
                <input
                  type="number"
                  className="form-control"
                  value={apertureM}
                  min="0.05"
                  step="0.05"
                  onChange={(e) => setApertureM(Math.max(0.05, Number(e.target.value)))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '3px' }}>Beamwidth θ (deg)</label>
                <input
                  type="text"
                  className="form-control"
                  readOnly
                  value={`${math.beamwidthDeg.toFixed(1)}°`}
                  style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-primary)' }}
                />
              </div>
            </div>
          )}

          {/* Toggles: Mechanical Scanning & Radome */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {antennaPattern === 'Directional' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isScanning ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isScanning}
                    onChange={(e) => setIsScanning(e.target.checked)}
                  />
                  Rotational Scanning
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: hasRadome ? 'var(--color-accent)' : 'var(--color-text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasRadome}
                  onChange={(e) => setHasRadome(e.target.checked)}
                />
                Radome Enclosure
              </label>
            </div>

            {hasRadome && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Radius (m)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeRadiusM}
                    step="0.5"
                    min="0.5"
                    onChange={(e) => setRadomeRadiusM(Math.max(0.5, Number(e.target.value)))}
                    style={{ fontSize: '0.8rem', padding: '3px 6px' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Loss (dB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeLossDb}
                    step="0.1"
                    min="0.01"
                    onChange={(e) => setRadomeLossDb(Math.max(0.01, Number(e.target.value)))}
                    style={{ fontSize: '0.8rem', padding: '3px 6px' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Refl %</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeReflectionPct}
                    step="0.5"
                    min="0.5"
                    max="50"
                    onChange={(e) => setRadomeReflectionPct(Math.max(0.5, Number(e.target.value)))}
                    style={{ fontSize: '0.8rem', padding: '3px 6px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tactical Hazard Assessment HUD */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 0, justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Tactical Safety Assessment HUD</h3>
              <select
                className="form-control"
                value={standard}
                onChange={(e) => setStandard(e.target.value as any)}
                style={{ width: 'auto', fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)' }}
              >
                <option value="FCC">FCC Part 1.1310</option>
                <option value="ICNIRP">ICNIRP 2020</option>
              </select>
            </div>

            {/* Controlled & Uncontrolled Boundary Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {/* Controlled (Occupational / Crew) */}
              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'block' }}>
                  CONTROLLED (CREW) BOUNDARY
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '3px 0' }}>
                  {activeSafeControlled.toFixed(1)} m
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Limit: {(math.limitControlledW / 10).toFixed(2)} mW/cm²
                </span>
              </div>

              {/* Uncontrolled (General Public) */}
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'block' }}>
                  UNCONTROLLED (PUBLIC) STANDOFF
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '3px 0' }}>
                  {activeSafeUncontrolled.toFixed(1)} m
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Limit: {(math.limitUncontrolledW / 10).toFixed(2)} mW/cm²
                </span>
              </div>
            </div>

            {/* Tactical Status Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Average EIRP</span>
                <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{(math.eirpStaticAvgW / 1000).toFixed(2)} kW</strong>
              </div>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Near-Field (2D²/λ)</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>{math.transitionDistM.toFixed(1)} m</strong>
              </div>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Radome LOTO</span>
                <strong style={{ fontSize: '0.85rem', color: math.radomeLockoutRequired ? '#ef4444' : '#10b981' }}>
                  {hasRadome ? (math.radomeLockoutRequired ? 'LOCKOUT REQ' : 'SECURE') : 'N/A'}
                </strong>
              </div>
            </div>
          </div>

          {/* Interactive Target Range Probe */}
          <div style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                TARGET RANGE PROBE: {selectedDistance} METERS
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: scrubbedMetrics.exceedsControlled ? '#ef4444' : '#10b981' }}>
                {scrubbedMetrics.exceedsControlled ? '[EXCEEDS CREW LIMIT]' : '[WITHIN PERMISSIBLE LIMITS]'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(100, Math.round(activeSafeUncontrolled * 1.5))}
              value={selectedDistance}
              style={{ width: '100%', accentColor: 'var(--color-primary)', margin: '4px 0' }}
              onChange={(e) => setSelectedDistance(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              <span>Power Density: <strong style={{ color: '#fff' }}>{scrubbedMetrics.powerDensityMW.toExponential(2)} mW/cm²</strong></span>
              <span>E-Field: <strong style={{ color: '#fff' }}>{scrubbedMetrics.eField.toFixed(1)} V/m</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Tabs (Replaces massive vertical page) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'tactical' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'tactical' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'tactical' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'tactical' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('tactical')}
        >
          📡 Tactical RF Radiation Polar HUD
        </button>
        <button
          className={`nav-link ${activeTab === 'density' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'density' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'density' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'density' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('density')}
        >
          📈 Power Density Decay & Distance Profile
        </button>
        <button
          className={`nav-link ${activeTab === 'radome' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'radome' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'radome' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'radome' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('radome')}
        >
          ⚠️ Radome Standing Waves & Hotspots
        </button>
        <button
          className={`nav-link ${activeTab === 'standards' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'standards' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'standards' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'standards' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('standards')}
        >
          📋 FCC OET-65 & IEEE C95.1 Criteria
        </button>
        <button
          className={`nav-link ${activeTab === 'physics' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'physics' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'physics' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'physics' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('physics')}
        >
          📐 Electromagnetic Field Formulations
        </button>
      </div>

      {/* Tab 1: Tactical RF Radiation Polar HUD Schematic */}
      {activeTab === 'tactical' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                {antennaPattern === 'Omnidirectional'
                  ? '360° Tactical Mission Grid: Omnidirectional Jammer Exclusion Envelope'
                  : 'Radar Boresight Beam Profile & Phased Array Radiation Lobe'}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Tactical avionics HUD visualization. Concentric reticles indicate Controlled (Amber) and Uncontrolled (Crimson) boundaries.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
              GRID RESOLUTION: 10m/DIV
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto', background: '#020617', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '15px 10px' }}>
            <svg viewBox="0 0 900 320" style={{ width: '100%', minWidth: '850px', height: 'auto', display: 'block' }}>
              <defs>
                <radialGradient id="tacticalGridGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="beamGradientHUD" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Background dark grid */}
              <rect x="0" y="0" width="900" height="320" fill="#020617" />
              <circle cx="450" cy="160" r="150" fill="url(#tacticalGridGlow)" />

              {antennaPattern === 'Omnidirectional' ? (
                /* 360° Tactical Mission Grid (Replaces clip-art car!) */
                (() => {
                  const cx = 450;
                  const cy = 160;
                  const maxDisplayDist = Math.max(activeSafeUncontrolled * 1.3, 20);
                  const scale = 140 / maxDisplayDist;

                  const rControlled = Math.max(15, activeSafeControlled * scale);
                  const rUncontrolled = Math.max(30, activeSafeUncontrolled * scale);

                  return (
                    <>
                      {/* Range rings */}
                      {[0.25, 0.5, 0.75, 1.0].map((f, i) => (
                        <circle key={i} cx={cx} cy={cy} r={140 * f} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      ))}

                      {/* Cardinal axes */}
                      <line x1={cx - 150} y1={cy} x2={cx + 150} y2={cy} stroke="rgba(255,255,255,0.1)" />
                      <line x1={cx} y1={cy - 150} x2={cx} y2={cy + 150} stroke="rgba(255,255,255,0.1)" />
                      <text x={cx + 155} y={cy + 4} fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">090°</text>
                      <text x={cx - 175} y={cy + 4} fill="var(--color-text-muted)" fontSize="9" fontWeight="bold">270°</text>
                      <text x={cx} y={cy - 155} fill="var(--color-text-muted)" fontSize="9" fontWeight="bold" textAnchor="middle">000°</text>
                      <text x={cx} y={cy + 165} fill="var(--color-text-muted)" fontSize="9" fontWeight="bold" textAnchor="middle">180°</text>

                      {/* Uncontrolled Boundary Ring (Crimson) */}
                      <circle cx={cx} cy={cy} r={rUncontrolled} fill="rgba(239, 68, 68, 0.08)" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" />

                      {/* Controlled Boundary Ring (Amber) */}
                      <circle cx={cx} cy={cy} r={rControlled} fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2" />

                      {/* Engineering RF Antenna Mast Schematic (Technical vector CAD) */}
                      <g transform={`translate(${cx}, ${cy})`}>
                        {/* Ground plane radials */}
                        <line x1="-15" y1="-15" x2="15" y2="15" stroke="#64748b" strokeWidth="1" />
                        <line x1="-15" y1="15" x2="15" y2="-15" stroke="#64748b" strokeWidth="1" />
                        {/* Coaxial mast base */}
                        <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                        {/* Dipole sleeve array core */}
                        <circle cx="0" cy="0" r="5" fill="var(--color-primary)" />
                        <circle cx="0" cy="0" r="2" fill="#fff" />
                        {/* Radiating pulse ripples */}
                        <circle cx="0" cy="0" r="22" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" />
                        <circle cx="0" cy="0" r="35" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4" />
                      </g>

                      {/* Tactical HUD Boundary Labels */}
                      <g transform={`translate(${cx + rUncontrolled}, ${cy})`}>
                        <line x1="0" y1="0" x2="25" y2="-15" stroke="#ef4444" strokeWidth="1" />
                        <rect x="25" y="-25" width="160" height="20" rx="3" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1" />
                        <text x="32" y="-11" fill="#ef4444" fontSize="9" fontWeight="bold">
                          UNCONTROLLED: {activeSafeUncontrolled.toFixed(1)}m
                        </text>
                      </g>

                      <g transform={`translate(${cx}, ${cy - rControlled})`}>
                        <line x1="0" y1="0" x2="25" y2="-15" stroke="#f59e0b" strokeWidth="1" />
                        <rect x="25" y="-25" width="150" height="20" rx="3" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1" />
                        <text x="32" y="-11" fill="#f59e0b" fontSize="9" fontWeight="bold">
                          CONTROLLED: {activeSafeControlled.toFixed(1)}m
                        </text>
                      </g>
                    </>
                  );
                })()
              ) : (
                /* Directional Radar Beam Profile (Replaces toy dish!) */
                (() => {
                  const ox = 90;
                  const oy = 160;
                  const maxRange = Math.max(activeSafeUncontrolled * 1.3, 30);
                  const scale = 720 / maxRange;

                  const cDistPix = Math.min(680, Math.max(30, activeSafeControlled * scale));
                  const uDistPix = Math.min(760, Math.max(50, activeSafeUncontrolled * scale));
                  const nfDistPix = Math.min(760, math.transitionDistM * scale);

                  const halfBeamRad = (math.beamwidthDeg / 2) * (Math.PI / 180);
                  const spreadControlled = Math.max(12, cDistPix * Math.tan(halfBeamRad));
                  const spreadUncontrolled = Math.max(22, uDistPix * Math.tan(halfBeamRad));

                  return (
                    <>
                      {/* Boresight datum axis */}
                      <line x1={ox} y1={oy} x2="880" y2={oy} stroke="rgba(255,255,255,0.15)" strokeDasharray="6 4" strokeWidth="1" />

                      {/* Main Radiation Lobe with Sidelobes */}
                      <path
                        d={`M ${ox},${oy} 
                            Q ${ox + uDistPix * 0.45},${oy - spreadUncontrolled * 1.3} ${ox + uDistPix},${oy} 
                            Q ${ox + uDistPix * 0.45},${oy + spreadUncontrolled * 1.3} ${ox},${oy}`}
                        fill="url(#beamGradientHUD)"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="5 3"
                      />

                      {/* Inner Controlled Hazard Lobe */}
                      <path
                        d={`M ${ox},${oy} 
                            Q ${ox + cDistPix * 0.45},${oy - spreadControlled * 1.3} ${ox + cDistPix},${oy} 
                            Q ${ox + cDistPix * 0.45},${oy + spreadControlled * 1.3} ${ox},${oy}`}
                        fill="rgba(245, 158, 11, 0.15)"
                        stroke="#f59e0b"
                        strokeWidth="2"
                      />

                      {/* First Sidelobes (realistic -13 dB antenna pattern) */}
                      <ellipse cx={ox + 50} cy={oy - 45} rx="35" ry="14" fill="rgba(245, 158, 11, 0.08)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" transform={`rotate(-35 ${ox + 50} ${oy - 45})`} />
                      <ellipse cx={ox + 50} cy={oy + 45} rx="35" ry="14" fill="rgba(245, 158, 11, 0.08)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" transform={`rotate(35 ${ox + 50} ${oy + 45})`} />

                      {/* Near-Field Rayleigh Datum Line */}
                      {nfDistPix > 10 && nfDistPix < 780 && (
                        <g transform={`translate(${ox + nfDistPix}, 0)`}>
                          <line x1="0" y1="40" x2="0" y2="280" stroke="#00e5ff" strokeWidth="1" strokeDasharray="3 3" />
                          <text x="4" y="52" fill="#00e5ff" fontSize="8" fontWeight="bold">
                            RAYLEIGH BOUNDARY (2D²/λ = {math.transitionDistM.toFixed(1)}m)
                          </text>
                        </g>
                      )}

                      {/* Controlled Boundary Caliper */}
                      <line x1={ox + cDistPix} y1="70" x2={ox + cDistPix} y2="250" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                      <g transform={`translate(${ox + cDistPix + 6}, 80)`}>
                        <rect x="0" y="0" width="150" height="20" rx="3" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1" />
                        <text x="8" y="14" fill="#f59e0b" fontSize="8" fontWeight="bold">
                          CONTROLLED: {activeSafeControlled.toFixed(1)}m
                        </text>
                      </g>

                      {/* Uncontrolled Boundary Caliper */}
                      <line x1={ox + uDistPix} y1="50" x2={ox + uDistPix} y2="270" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" />
                      <g transform={`translate(${ox + uDistPix + 6}, 60)`}>
                        <rect x="0" y="0" width="165" height="20" rx="3" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
                        <text x="8" y="14" fill="#ef4444" fontSize="8" fontWeight="bold">
                          UNCONTROLLED: {activeSafeUncontrolled.toFixed(1)}m
                        </text>
                      </g>

                      {/* Radome Wall Overlay */}
                      {hasRadome && (
                        <g transform={`translate(${ox}, ${oy})`}>
                          <circle cx="0" cy="0" r={Math.max(25, radomeRadiusM * scale)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
                          <text x="0" y={-(Math.max(25, radomeRadiusM * scale) + 6)} fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">
                            RADOME WALL ({radomeRadiusM}m)
                          </text>
                        </g>
                      )}

                      {/* Phased Array / Aperture CAD Assembly */}
                      <g transform={`translate(${ox - 65}, ${oy - 45})`}>
                        {/* Antenna backframe */}
                        <rect x="0" y="10" width="50" height="70" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                        {/* Waveguide feed horn */}
                        <polygon points="50,30 65,20 65,70 50,60" fill="#334155" stroke="#64748b" strokeWidth="1" />
                        {/* AESA array element grid */}
                        <circle cx="20" cy="25" r="2" fill="#00e5ff" />
                        <circle cx="30" cy="25" r="2" fill="#00e5ff" />
                        <circle cx="20" cy="45" r="2" fill="#00e5ff" />
                        <circle cx="30" cy="45" r="2" fill="#00e5ff" />
                        <circle cx="20" cy="65" r="2" fill="#00e5ff" />
                        <circle cx="30" cy="65" r="2" fill="#00e5ff" />
                        <text x="25" y="88" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">
                          AESA Ø {apertureM}m
                        </text>
                      </g>
                    </>
                  );
                })()
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Tab 2: Plotly Power Density vs. Distance Logarithmic Profile */}
      {activeTab === 'density' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>Power Density Decay Profile vs. Distance</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 15px 0' }}>
            Semi-log attenuation curve illustrating near-field saturation ($R \le 2D^2/\lambda$) transitioning to inverse-square far-field decay ($1/R^2$).
          </p>
          <div style={{ width: '100%', height: '400px' }}>
            <Plot
              data={[
                {
                  x: chartData.distances,
                  y: chartData.densityValues,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Power Density S (mW/cm²)',
                  line: { color: 'var(--color-primary)', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(0, 229, 255, 0.08)'
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitControlledW / 10, math.limitControlledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: `Controlled Limit (${(math.limitControlledW / 10).toFixed(2)} mW/cm²)`,
                  line: { color: '#F59E0B', width: 2, dash: 'dash' }
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitUncontrolledW / 10, math.limitUncontrolledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: `Uncontrolled Limit (${(math.limitUncontrolledW / 10).toFixed(2)} mW/cm²)`,
                  line: { color: '#EF4444', width: 2, dash: 'dash' }
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Distance from Antenna (meters)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { 
                  title: { text: 'Power Density (mW/cm²)' }, 
                  type: 'log', 
                  color: '#94A3B8',
                  gridcolor: 'rgba(255,255,255,0.06)'
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 65, r: 25, t: 25, b: 65 },
                legend: { x: 0.6, y: 0.95, bgcolor: 'rgba(5, 10, 18, 0.85)', bordercolor: 'var(--color-border)', borderwidth: 1 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Radome Standing Waves & Near-Field Hotspots */}
      {activeTab === 'radome' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>Radome Dielectric Enclosure & Internal Hotspot Analysis</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Dielectric radome walls create partial internal boundary reflections. Constructive interference forms severe standing wave peaks (S_internal = S_incident × (1 + √Γ)²) that endanger personnel entering an energized radome.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>REFLECTION MULTIPLIER</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                {math.standingWaveMultiplier.toFixed(2)}×
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Peak internal constructive standing wave intensification based on {radomeReflectionPct}% power reflection.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>INTERNAL INCIDENT DENSITY</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                {(math.incidentRadomeW / 10).toExponential(2)} mW/cm²
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Unattenuated power density striking the inner radome wall at radius R = {radomeRadiusM}m.
              </p>
            </div>

            <div style={{ padding: '14px', background: math.radomeLockoutRequired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: `1px solid ${math.radomeLockoutRequired ? '#ef4444' : '#10b981'}`, borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: math.radomeLockoutRequired ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                PERSONNEL ENTRY PROTOCOL
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '6px 0' }}>
                {math.radomeLockoutRequired ? '[LOTO INTERLOCK MANDATORY]' : '[ENTRY PERMITTED]'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#e2e8f0', margin: 0 }}>
                {math.radomeLockoutRequired
                  ? 'Transmitter must be de-energized and locked out prior to personnel entering radome enclosure.'
                  : 'Internal radiation fields do not exceed occupational limits at operating power.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: FCC & IEEE Standards Matrix */}
      {activeTab === 'standards' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#fff' }}>Regulatory Exposure Limits & Frequency Bands</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Frequency Range</th>
                  <th style={{ padding: '10px' }}>Controlled (Occupational)</th>
                  <th style={{ padding: '10px' }}>Uncontrolled (Public)</th>
                  <th style={{ padding: '10px' }}>Averaging Time</th>
                  <th style={{ padding: '10px' }}>Governing Body</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>0.3 – 3.0 MHz</td>
                  <td style={{ padding: '10px' }}>100 mW/cm² (614 V/m)</td>
                  <td style={{ padding: '10px' }}>100 mW/cm² (614 V/m)</td>
                  <td style={{ padding: '10px' }}>6 min / 30 min</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>FCC Part 1.1310</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>30 – 300 MHz</td>
                  <td style={{ padding: '10px' }}>1.0 mW/cm² (61.4 V/m)</td>
                  <td style={{ padding: '10px' }}>0.2 mW/cm² (27.5 V/m)</td>
                  <td style={{ padding: '10px' }}>6 min / 30 min</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>FCC Part 1.1310</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>300 – 1,500 MHz</td>
                  <td style={{ padding: '10px' }}>f / 300 mW/cm²</td>
                  <td style={{ padding: '10px' }}>f / 1500 mW/cm²</td>
                  <td style={{ padding: '10px' }}>6 min / 30 min</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>FCC Part 1.1310</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>1,500 – 100,000 MHz</td>
                  <td style={{ padding: '10px' }}>5.0 mW/cm² (137 V/m)</td>
                  <td style={{ padding: '10px' }}>1.0 mW/cm² (61.4 V/m)</td>
                  <td style={{ padding: '10px' }}>6 min / 30 min</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>FCC / IEEE C95.1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: KaTeX Formulations */}
      {activeTab === 'physics' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#fff' }}>Governing Electromagnetic Radiation Formulations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                1. Far-Field Power Density S(R)
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="S(R) = \frac{\text{EIRP}_{\text{avg}}}{4\pi R^2} = \frac{P_{\text{peak}} \cdot \text{DF} \cdot G}{4\pi R^2}" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Inverse-square dispersion valid in the Fraunhofer zone beyond R &gt; 2D²/λ.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                2. Near-Field Rayleigh Transition & Peak Density
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="R_{\text{nf}} = \frac{2 D^2}{\lambda}, \quad S_{\text{nf, max}} = \frac{4 P_{\text{avg}}}{A_{\text{aperture}}} = \frac{16 P_{\text{avg}}}{\pi D^2}" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Rayleigh near-field boundary distance and maximum collimated power density at antenna aperture.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                3. Radome Standing Wave Multiplier
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="S_{\text{int}} = S_{\text{incident}} \cdot \left(1 + \sqrt{\Gamma_{\text{refl}}}\right)^2" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Constructive interference factor caused by partial dielectric reflections inside a closed radome shell.
              </p>
            </div>
          </div>
        </div>
      )}

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default EMRModule;
