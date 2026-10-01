import React, { useState, useMemo, useEffect } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';
import VerificationBadge from '../../components/VerificationBadge';

const Plot = (PlotComponent as any).default || PlotComponent;

// --- Types & Definitions ---
export type ActiveTab = 'cordon' | 'staytime' | 'erg' | 'triage' | 'decon' | 'sitrep';

export type EmergencyWorkerTier = 'public' | 'property' | 'lifesaving' | 'catastrophic';

export interface ERGGuide {
  guideNumber: number;
  title: string;
  hazardClass: string;
  unNumbers: string[];
  initialIsolationM: number;
  downwindEvacDayM: number;
  downwindEvacNightM: number;
  fireResponse: string;
  spillResponse: string;
  firstAid: string;
  ppeTier: string;
  keyHazards: string;
}

export interface IsotopeHazard {
  symbol: string;
  name: string;
  gammaConstant: number; // uSv*m^2/(h*GBq)
  defaultActivityGBq: number;
  criticalOrgan: string;
  countermeasure: string;
  countermeasureDose: string;
  halfLife: string;
  decayMode: string;
}

// Preset Isotope Library for First Responders (High Consequence & Common Threats)
const ISOTOPE_LIBRARY: Record<string, IsotopeHazard> = {
  'Cs-137': {
    symbol: 'Cs-137',
    name: 'Cesium-137 (Chloride/Sulfate)',
    gammaConstant: 77.2,
    defaultActivityGBq: 3700, // 100 Ci RDD scenario
    criticalOrgan: 'Whole Body / Muscle',
    countermeasure: 'Prussian Blue (Insoluble Ferric Hexacyanoferrate)',
    countermeasureDose: '3 g orally 3x daily (reduces biological half-life by 67%)',
    halfLife: '30.08 years',
    decayMode: 'Beta / Gamma (661.7 keV)'
  },
  'Co-60': {
    symbol: 'Co-60',
    name: 'Cobalt-60 (High-Activity Radiotherapy/Sterilizer)',
    gammaConstant: 308.5,
    defaultActivityGBq: 18500, // 500 Ci industrial irradiator
    criticalOrgan: 'Whole Body / Bone Marrow',
    countermeasure: 'Supportive care & G-CSF (Filgrastim); No specific chelator',
    countermeasureDose: '5 µg/kg/day subcutaneous injection for neutrophil recovery',
    halfLife: '5.27 years',
    decayMode: 'Beta / Multi-Gamma (1.17 & 1.33 MeV)'
  },
  'Ir-192': {
    symbol: 'Ir-192',
    name: 'Iridium-192 (Industrial Radiography Source)',
    gammaConstant: 130.0,
    defaultActivityGBq: 3700, // 100 Ci NDT projector
    criticalOrgan: 'Skin / Extremities (Direct handling burn risk)',
    countermeasure: 'Surgical excision of localized necrotic tissue, G-CSF',
    countermeasureDose: 'Wound debridement, topical steroids under medical supervision',
    halfLife: '73.83 days',
    decayMode: 'Beta / Gamma (300-600 keV spectrum)'
  },
  'Am-241': {
    symbol: 'Am-241',
    name: 'Americium-241 (Alpha Emitter / Well-Logging & Moisture Gauge)',
    gammaConstant: 3.1, // low gamma, severe alpha inhalation hazard
    defaultActivityGBq: 185, // 5 Ci
    criticalOrgan: 'Bone Surface / Liver (Severe Inhalation Alpha Burden)',
    countermeasure: 'Ca-DTPA / Zn-DTPA (Diethylenetriaminepentaacetic acid)',
    countermeasureDose: '1 g IV infusion immediately; switch to Zn-DTPA for maintenance',
    halfLife: '432.2 years',
    decayMode: 'Alpha (5.48 MeV) + Weak Gamma (59.5 keV)'
  },
  'I-131': {
    symbol: 'I-131',
    name: 'Iodine-131 (Reactor Fission Product / Medical Therapy)',
    gammaConstant: 58.0,
    defaultActivityGBq: 370, // 10 Ci
    criticalOrgan: 'Thyroid Gland (Severe concentrated uptake)',
    countermeasure: 'Potassium Iodide (KI) Thyroid Blockade',
    countermeasureDose: 'Adults: 130 mg; Children 3-18y: 65 mg; Infants: 32 mg',
    halfLife: '8.02 days',
    decayMode: 'Beta-minus + Gamma (364 keV)'
  },
  'Sr-90': {
    symbol: 'Sr-90',
    name: 'Strontium-90 (RTG Fuel / Legacy Fission)',
    gammaConstant: 0.0, // Pure beta (Bremsstrahlung only)
    defaultActivityGBq: 37000, // 1000 Ci RTG
    criticalOrgan: 'Bone Mineral / Leukemia risk',
    countermeasure: 'Calcium gluconate / Aluminum hydroxide antacids (blocks gut absorption)',
    countermeasureDose: 'Immediate oral administration within 2 hours of ingestion',
    halfLife: '28.8 years',
    decayMode: 'Beta-minus (0.546 MeV) -> Y-90 Beta (2.28 MeV)'
  },
  'UF6': {
    symbol: 'UF6',
    name: 'Uranium Hexafluoride (Enrichment Cylinder Transport)',
    gammaConstant: 0.5,
    defaultActivityGBq: 50,
    criticalOrgan: 'Kidneys (Chemical Toxicity) + Lungs (HF Acid Burn)',
    countermeasure: 'Sodium Bicarbonate IV (Urine alkalinization) + Oxygen/HF protocols',
    countermeasureDose: 'Maintain urinary pH > 7.5 to prevent acute renal tubular damage',
    halfLife: '4.47e9 years (U-238)',
    decayMode: 'Alpha / Spontaneous Fission + Extreme Chemical Corrosive'
  }
};

// DOT Emergency Response Guidebook (ERG 2024) Guides
const ERG_DATABASE: Record<number, ERGGuide> = {
  161: {
    guideNumber: 161,
    title: 'Radioactive Materials (Low to Moderate Level Radiation)',
    hazardClass: 'Class 7 — Excepted & LSA-I Packages',
    unNumbers: ['UN2908', 'UN2909', 'UN2910', 'UN2911'],
    initialIsolationM: 25,
    downwindEvacDayM: 100,
    downwindEvacNightM: 100,
    fireResponse: 'Do not move damaged packages; move undamaged packages if safe. Use water spray, fog, dry chemical or CO2. Fight fire from maximum distance.',
    spillResponse: 'Do not touch damaged packages or spilled material. Liquid spills: cover with sand or other non-combustible absorbent material. Dike runoff.',
    firstAid: 'Call 911 or emergency medical service. Administer first aid: immediate life-saving care takes precedence over decontamination! Remove outer clothing.',
    ppeTier: 'Level C / Structural Firefighter gear with SCBA is sufficient for outer packaging integrity.',
    keyHazards: 'Radiation presents minimal external risk. Ingestion or inhalation of unsealed liquid is the primary hazard.'
  },
  162: {
    guideNumber: 162,
    title: 'Radioactive Materials (Gases / Tritium / Noble Gases)',
    hazardClass: 'Class 7 — Compressed Radioactive Gas',
    unNumbers: ['UN1954', 'UN2034', 'UN2908', 'UN3324'],
    initialIsolationM: 50,
    downwindEvacDayM: 200,
    downwindEvacNightM: 400,
    fireResponse: 'Do not extinguish fire unless gas leak can be stopped safely. Cool containers with flooding quantities of water until well after fire is out.',
    spillResponse: 'Evacuate area immediately upwind. Ventilate closed spaces before entering. Stop leak if possible without risk. Isolate for at least 100m in all directions.',
    firstAid: 'Move victim to fresh air. Give artificial respiration if not breathing. For skin exposure, wash thoroughly with soap and water.',
    ppeTier: 'Level B or Level A positive-pressure SCBA required due to gas inhalation and skin absorption (Tritium).',
    keyHazards: 'Submersion dose and respiratory inhalation. Tritium gas converts to tritiated water (HTO) and rapidly absorbs through intact skin.'
  },
  163: {
    guideNumber: 163,
    title: 'Radioactive Materials (Special Form / High-Level Radiation)',
    hazardClass: 'Class 7 — Sealed High-Activity Sources (Type A / B / Industrial Radiography)',
    unNumbers: ['UN2916', 'UN2917', 'UN3332', 'UN3321'],
    initialIsolationM: 100,
    downwindEvacDayM: 300,
    downwindEvacNightM: 500,
    fireResponse: 'High external radiation hazard. If source capsule is exposed, DO NOT APPROACH. Fight fire with unmanned hose holders from maximum distance.',
    spillResponse: 'DO NOT TOUCH OR HANDLE CAPSULE DIRECTLY! Even 1 second of direct skin contact with 100 Ci Ir-192 causes deep radiation necrosis and amputation.',
    firstAid: 'Medical emergencies take precedence over radiological survey. Keep victims immobilized. Document contact distance and duration for REAC/TS.',
    ppeTier: 'Turnout gear provides ZERO gamma shielding. Maximize Distance, Minimize Time, Utilize Heavy Machinery/Shielding.',
    keyHazards: 'Severe penetrating gamma exposure. Unshielded sources can deliver lethal 4-5 Gy whole-body doses in minutes at close range.'
  },
  164: {
    guideNumber: 164,
    title: 'Radioactive Materials (Fissile / Uranium Hexafluoride UF6)',
    hazardClass: 'Class 7 + Class 8 (Corrosive / Poison Inhalation)',
    unNumbers: ['UN2977', 'UN2978', 'UN3328', 'UN3329'],
    initialIsolationM: 150,
    downwindEvacDayM: 500,
    downwindEvacNightM: 1000,
    fireResponse: 'DO NOT USE WATER DIRECTLY ON UF6! UF6 reacts violently with water/steam to generate dense toxic, corrosive Hydrofluoric Acid (HF) clouds.',
    spillResponse: 'Evacuate downwind immediately. Approach only from upwind. Vapor cloud is heavier than air and hugs low ground/culverts.',
    firstAid: 'Hydrofluoric acid skin exposure requires immediate Calcium Gluconate 2.5% gel massage. Inhalation requires nebulized 2.5% calcium gluconate.',
    ppeTier: 'Level A fully encapsulating chemical suit with positive-pressure SCBA. Dual toxic chemical and radiological danger.',
    keyHazards: 'Acute chemical pulmonary edema and systemic hypocalcemia from HF outweigh radiation in the immediate response phase.'
  },
  165: {
    guideNumber: 165,
    title: 'Radioactive Materials (Fissile / Low to High Level Radiation)',
    hazardClass: 'Class 7 — Enriched Nuclear Fuel / Criticality Risk',
    unNumbers: ['UN2912', 'UN2915', 'UN3322', 'UN3323'],
    initialIsolationM: 100,
    downwindEvacDayM: 300,
    downwindEvacNightM: 500,
    fireResponse: 'Criticality Hazard: DO NOT INTRODUCE HYDROGENOUS MODERATORS (water, foam) into dense fissile arrays without nuclear criticality safety evaluation.',
    spillResponse: 'Isolate spill area for at least 100m. Cover powder spills with plastic tarp to prevent wind dispersal.',
    firstAid: 'Move victims upwind. Remove outer clothing and bag securely. Flush eyes and skin with copious water.',
    ppeTier: 'Level B with particulate respiratory protection (P100 / HEPA). Criticality dosimeters required for entry personnel.',
    keyHazards: 'Criticality flash potential if geometry or moderation changes. High alpha/beta surface contamination.'
  },
  166: {
    guideNumber: 166,
    title: 'Radioactive Materials (Irradiated Nuclear Fuel & High-Level Waste)',
    hazardClass: 'Class 7 — Spent Fuel Shipping Casks (Type B(U) / Type C)',
    unNumbers: ['UN2916', 'UN2917', 'UN3327', 'UN3329'],
    initialIsolationM: 200,
    downwindEvacDayM: 800,
    downwindEvacNightM: 1600,
    fireResponse: 'Cask is engineered to survive 800°C for 30 minutes. If intact, maintain stand-off. If compromised, full catastrophic CBRN response.',
    spillResponse: 'Immediate emergency declared. Request Federal Radiological Monitoring and Assessment Center (FRMAC) and DOE RAP teams.',
    firstAid: 'Extricate injured using long-reach tools. Treat trauma in cold zone. Immediate blood draw for chromosomal dicentric assay.',
    ppeTier: 'Heavy armor / leaded shield vehicles. Remote robotic reconnaissance strongly advised before human entry.',
    keyHazards: 'Extreme mixed fission product field (Cs-137, Sr-90, Actinides) with lethal neutron and gamma dose rates.'
  }
};

// EPA PAG Emergency Worker Dose Authorizations (EPA-400-R-92-001 & EPA PAG Manual 2017)
const WORKER_DOSE_LIMITS: Record<EmergencyWorkerTier, { rem: number; mSv: number; label: string; desc: string; condition: string }> = {
  public: {
    rem: 5,
    mSv: 50,
    label: 'Standard Emergency Operations (5 Rem / 50 mSv)',
    desc: 'All common emergency activities, perimeter security, initial size-up, traffic control, and public protection.',
    condition: 'Standard occupational limit for emergency workers. No special voluntary sign-off required.'
  },
  property: {
    rem: 10,
    mSv: 100,
    label: 'Protection of Valuable Property (10 Rem / 100 mSv)',
    desc: 'Actions to prevent major catastrophic damage to public water supplies, nuclear containment, power grids, or core assets.',
    condition: 'Authorized only when lower dose alternatives are unavailable. Workers must be informed of potential biological risks.'
  },
  lifesaving: {
    rem: 25,
    mSv: 250,
    label: 'Life-Saving Actions & Critical Rescue (25 Rem / 250 mSv)',
    desc: 'Rescue of trapped victims, suppression of major fire threatening dense populated communities, or prevention of catastrophic reactor breach.',
    condition: 'Voluntary basis only. Responders must be fully briefed on deterministic risks, Acute Radiation Syndrome symptoms, and fertility effects.'
  },
  catastrophic: {
    rem: 50,
    mSv: 500,
    label: 'Extreme Life-Saving (Voluntary >25 Rem / Up to 500 mSv)',
    desc: 'Sole option to save human lives in extreme mass casualty disaster. Responders understand and accept acute sickness probability.',
    condition: 'Strict voluntary basis only. Workers given explicit informed consent regarding mild ARS (hematopoietic depression) and long-term stochastic risk.'
  }
};

const FirstResponderModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cordon');

  // Operational State
  const [incidentTitle, setIncidentTitle] = useState('Incident #2026-CBRN-01: Commercial Transport Rollover');
  const [selectedIsotopeKey, setSelectedIsotopeKey] = useState<string>('Cs-137');
  const [customActivityGBq, setCustomActivityGBq] = useState<number>(3700); // 100 Ci
  const [explosiveYieldKgTNT, setExplosiveYieldKgTNT] = useState<number>(5.0); // 5 kg TNT RDD
  const [windSpeedMps, setWindSpeedMps] = useState<number>(3.5);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(225); // blowing toward northeast

  // Tactical Survey Measurement
  const [measuredDoseRateValue, setMeasuredDoseRateValue] = useState<number>(150); // mR/h or uSv/h
  const [measuredUnit, setMeasuredUnit] = useState<'mR/h' | 'uSv/h' | 'mSv/h' | 'R/h'>('mR/h');
  const [selectedWorkerTier, setSelectedWorkerTier] = useState<EmergencyWorkerTier>('lifesaving');

  // Stay-Time Timer State
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // ERG Selector
  const [selectedGuideNumber, setSelectedGuideNumber] = useState<number>(163);

  // Medical Triage State
  const [victimEmesisTimeMinutes, setVictimEmesisTimeMinutes] = useState<number>(45);
  const [victimNasalSwabCPM, setVictimNasalSwabCPM] = useState<number>(3500);
  const [victimSkinContamCPM, setVictimSkinContamCPM] = useState<number>(12000);
  const [backgroundCPM, setBackgroundCPM] = useState<number>(50);

  const isotope = useMemo(() => ISOTOPE_LIBRARY[selectedIsotopeKey] || ISOTOPE_LIBRARY['Cs-137'], [selectedIsotopeKey]);

  // Convert measured dose rate to mSv/h and R/h for mathematical operations
  const measuredRate_mSv_h = useMemo(() => {
    switch (measuredUnit) {
      case 'uSv/h': return measuredDoseRateValue / 1000;
      case 'mSv/h': return measuredDoseRateValue;
      case 'mR/h': return (measuredDoseRateValue * 0.0096); // 1 R ~ 9.6 mSv in tissue
      case 'R/h': return (measuredDoseRateValue * 9.6);
    }
  }, [measuredDoseRateValue, measuredUnit]);

  const measuredRate_R_h = useMemo(() => {
    return measuredRate_mSv_h / 9.6;
  }, [measuredRate_mSv_h]);

  // Turn-Back Threshold Assessment
  const turnBackStatus = useMemo(() => {
    const rateRh = measuredRate_R_h;
    if (rateRh >= 10.0) {
      return {
        level: 'CRITICAL TURN-BACK',
        color: '#ef4444',
        badge: 'hud-badge-danger',
        desc: 'EXCEEDS 10 R/h TURN-BACK LIMIT! Immediate evacuation required. Severe lethal field hazard.'
      };
    } else if (rateRh >= 1.0) {
      return {
        level: 'EXTREME CAUTION',
        color: '#f59e0b',
        badge: 'hud-badge-warning',
        desc: '1 to 10 R/h field. Strict life-saving missions only. Mandatory dosimeter monitoring every 60s.'
      };
    } else if (rateRh >= 0.01) { // 10 mR/h (100 uSv/h)
      return {
        level: 'HOT ZONE (EXCLUSION)',
        color: '#00e5ff',
        badge: 'hud-badge-primary',
        desc: 'Inside Hot Zone boundary (≥ 10 mR/h). Full PPE, buddy system, and stay-time tracking mandatory.'
      };
    } else if (rateRh >= 0.001) { // 1 mR/h (10 uSv/h)
      return {
        level: 'WARM ZONE (CONTAMINATION REDUCTION)',
        color: '#10b981',
        badge: 'hud-badge-success',
        desc: 'Warm Zone cordon (1 to 10 mR/h). Ideal location for decontamination corridor and triage tent.'
      };
    } else {
      return {
        level: 'COLD ZONE (SAFE SUPPORT)',
        color: '#94a3b8',
        badge: 'hud-badge-secondary',
        desc: 'Below 1 mR/h (10 µSv/h). Safe for Incident Command Post, staging, logistics, and media.'
      };
    }
  }, [measuredRate_R_h]);

  // Stay-Time Calculation
  const workerTierData = WORKER_DOSE_LIMITS[selectedWorkerTier];
  const maxAllowedStayTimeMinutes = useMemo(() => {
    if (measuredRate_mSv_h <= 0.0001) return 9999;
    const hours = workerTierData.mSv / measuredRate_mSv_h;
    return Math.max(0.1, hours * 60);
  }, [measuredRate_mSv_h, workerTierData]);

  // Stay-Time Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const remainingSeconds = Math.max(0, Math.round(maxAllowedStayTimeMinutes * 60 - elapsedSeconds));
  const percentElapsed = Math.min(100, (elapsedSeconds / Math.max(1, maxAllowedStayTimeMinutes * 60)) * 100);

  // --- Cordon & Zoning Radii Calculations ---
  // Unshielded point source distance to dose rate limits: r = sqrt((Gamma * Activity) / Rate)
  const cordonRadii = useMemo(() => {
    const actGBq = customActivityGBq;
    const gamma = isotope.gammaConstant; // uSv*m^2/(h*GBq)
    
    // Cold zone perimeter: 1 mR/h ~ 10 uSv/h
    const rCold = Math.sqrt((gamma * actGBq) / 10.0);
    // Hot zone boundary: 10 mR/h ~ 100 uSv/h
    const rHot = Math.sqrt((gamma * actGBq) / 100.0);
    // Turn-back boundary: 10 R/h ~ 100,000 uSv/h
    const rTurnBack = Math.sqrt((gamma * actGBq) / 100000.0);

    // Blast Fragmentation Overpressure Stand-off (Kingery-Bulmash 1 psi glass break)
    // R_blast ~ 15 * (W_tnt)^(1/3) for 1 psi glass standoff
    const rBlastGlass = 18.0 * Math.pow(Math.max(0.1, explosiveYieldKgTNT), 1 / 3);
    const rBlastStructural = 6.0 * Math.pow(Math.max(0.1, explosiveYieldKgTNT), 1 / 3);

    // Recommended Outer Cordon is the maximum of ERG minimum (100m) and radiological 1 mR/h line
    const recommendedOuterCordonM = Math.max(100, Math.ceil(Math.max(rCold, rBlastGlass)));
    const recommendedHotZoneM = Math.max(30, Math.ceil(rHot));

    return {
      rCold: Math.max(1, rCold),
      rHot: Math.max(1, rHot),
      rTurnBack: Math.max(0.5, rTurnBack),
      rBlastGlass,
      rBlastStructural,
      recommendedOuterCordonM,
      recommendedHotZoneM
    };
  }, [customActivityGBq, isotope, explosiveYieldKgTNT]);

  // Tactical Radar / Cordon Polar Plot
  const cordonPlotData = useMemo(() => {
    const maxR = Math.max(150, cordonRadii.recommendedOuterCordonM * 1.3);

    // Circle generator
    const makeCircle = (radius: number, name: string, color: string, dash = 'solid') => {
      const theta: number[] = [];
      const r: number[] = [];
      for (let deg = 0; deg <= 360; deg += 5) {
        theta.push(deg);
        r.push(radius);
      }
      return {
        type: 'scatterpolar',
        mode: 'lines',
        name,
        r,
        theta,
        line: { color, width: 2, dash },
        hoverinfo: 'name+r'
      };
    };

    // Downwind Plume Sector Cone (±25 degrees along wind direction)
    const downwindTheta: number[] = [];
    const downwindR: number[] = [];
    const downwindDist = cordonRadii.recommendedOuterCordonM * 1.25;
    const centerDeg = (windDirectionDeg + 180) % 360; // downwind direction
    
    downwindTheta.push(centerDeg);
    downwindR.push(0);
    for (let offset = -30; offset <= 30; offset += 5) {
      downwindTheta.push((centerDeg + offset + 360) % 360);
      downwindR.push(downwindDist);
    }
    downwindTheta.push(centerDeg);
    downwindR.push(0);

    const plumeSector = {
      type: 'scatterpolar',
      mode: 'lines',
      name: 'Downwind Hazard Corridor (EPA PAG Evacuation)',
      r: downwindR,
      theta: downwindTheta,
      fill: 'toself',
      fillcolor: 'rgba(239, 68, 68, 0.15)',
      line: { color: '#ef4444', width: 2, dash: 'dot' },
      hoverinfo: 'name'
    };

    const traces: any[] = [
      makeCircle(cordonRadii.recommendedOuterCordonM, `Cold Zone / Outer Cordon (${cordonRadii.recommendedOuterCordonM}m - 1 mR/h)`, '#10b981'),
      makeCircle(cordonRadii.recommendedHotZoneM, `Hot Zone (Exclusion) Boundary (${cordonRadii.recommendedHotZoneM}m - 10 mR/h)`, '#00e5ff'),
      makeCircle(cordonRadii.rBlastGlass, `Blast Shrapnel / Glass Hazard (${cordonRadii.rBlastGlass.toFixed(0)}m)`, '#f59e0b', 'dash'),
      plumeSector,
      {
        type: 'scatterpolar',
        mode: 'markers',
        name: 'Ground Zero / Incident Origin',
        r: [0],
        theta: [0],
        marker: { color: '#ef4444', size: 14, symbol: 'star' },
        hoverinfo: 'name'
      }
    ];

    return { traces, maxR };
  }, [cordonRadii, windDirectionDeg]);

  // REAC/TS Acute Radiation Syndrome Nomogram Assessment
  const arsTriage = useMemo(() => {
    const tMin = victimEmesisTimeMinutes;
    let estimatedDoseGy = '';
    let category = '';
    let color = '';
    let prognosis = '';
    let interventions = '';

    if (tMin <= 15) {
      estimatedDoseGy = '> 8.0 Gy (800+ Rad)';
      category = 'CATEGORY IV — SUPRALETHAL / NEUROVASCULAR';
      color = '#ef4444';
      prognosis = 'Near 100% mortality within 24-72 hours without advanced cytokine, stem-cell, and ICU intervention.';
      interventions = 'Palliative comfort care, high-dose analgesia, sedation, anti-emetics (Ondansetron 8mg IV).';
    } else if (tMin <= 60) {
      estimatedDoseGy = '4.0 to 8.0 Gy (400 - 800 Rad)';
      category = 'CATEGORY III — SEVERE GASTROINTESTINAL & HEMATOPOIETIC';
      color = '#ff9f1c';
      prognosis = 'High mortality without immediate hospitalization. Severe pancytopenia, intestinal denudation, sepsis.';
      interventions = 'Filgrastim (G-CSF) 5 µg/kg/day, broad-spectrum IV antibiotics, reverse isolation, platelet transfusions.';
    } else if (tMin <= 120) {
      estimatedDoseGy = '2.0 to 4.0 Gy (200 - 400 Rad)';
      category = 'CATEGORY II — MODERATE TO SEVERE HEMATOPOIETIC';
      color = '#f59e0b';
      prognosis = 'Significant survival (>70-90%) with prompt medical treatment and bone marrow cytokine support.';
      interventions = 'Hospital admission, G-CSF cytokines, anti-emetics, daily serial Complete Blood Count (CBC) with differential.';
    } else if (tMin <= 240) {
      estimatedDoseGy = '1.0 to 2.0 Gy (100 - 200 Rad)';
      category = 'CATEGORY I — MILD HEMATOPOIETIC DEPRESSION';
      color = '#00e5ff';
      prognosis = 'Excellent survival (>95%). Mild transient nausea, mild lymphocyte and platelet nadir at week 3-4.';
      interventions = 'Outpatient observation, baseline CBC at 24h & 48h for Andrews lymphocyte depletion slope, rest.';
    } else {
      estimatedDoseGy = '< 1.0 Gy (< 100 Rad)';
      category = 'MINIMAL DETERMINISTIC RISK / SUB-CLINICAL';
      color = '#10b981';
      prognosis = 'Virtually zero acute mortality. Primary long-term concern is stochastic cancer risk counseling.';
      interventions = 'Decontaminate, provide reassurance, psychological support, document incident details.';
    }

    // Inhalation screening from nasal swabs
    const netNasalCPM = Math.max(0, victimNasalSwabCPM - backgroundCPM);
    const hasInternalInhalation = netNasalCPM > 200;

    return {
      estimatedDoseGy,
      category,
      color,
      prognosis,
      interventions,
      hasInternalInhalation,
      netNasalCPM
    };
  }, [victimEmesisTimeMinutes, victimNasalSwabCPM, backgroundCPM]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflowY: 'auto' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="hud-badge hud-badge-primary">CBRN FIRST RESPONDER</span>
            <span className="hud-badge hud-badge-accent">DOT ERG 2024 / REAC/TS</span>
          </div>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>
            Module 24 — Tactical First Responder &amp; CBRN Hazard Command
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Operational standoff zoning, emergency worker turn-back limits, DOT ERG decision trees, and REAC/TS medical countermeasure triage
          </span>
        </div>
        <VerificationBadge testId="VTEST-21" standard="EPA-400 PAG" />
      </div>

      {/* TACTICAL REAL-TIME ALARM & METRIC HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Measured Field & Turn-Back Level */}
        <div className="hud-card" style={{ borderColor: turnBackStatus.color, backgroundColor: `${turnBackStatus.color}0a` }}>
          <span className="hud-metric-label">FIELD HAZARD &amp; TURN-BACK STATUS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="hud-metric-value" style={{ color: turnBackStatus.color, fontSize: '1.6rem' }}>
              {measuredDoseRateValue} {measuredUnit}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              ({measuredRate_R_h.toFixed(3)} R/h)
            </span>
          </div>
          <div style={{ marginTop: '6px' }}>
            <span className={`hud-badge ${turnBackStatus.badge}`}>
              {turnBackStatus.level}
            </span>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '6px', display: 'block' }}>
            {turnBackStatus.desc}
          </span>
        </div>

        {/* Worker Stay-Time & Countdown Timer */}
        <div className="hud-card">
          <span className="hud-metric-label">AUTHORIZED STAY-TIME LIMIT</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="hud-metric-value" style={{ color: remainingSeconds < 300 ? '#ef4444' : 'var(--color-primary)' }}>
              {maxAllowedStayTimeMinutes >= 60
                ? `${(maxAllowedStayTimeMinutes / 60).toFixed(1)} hrs`
                : `${maxAllowedStayTimeMinutes.toFixed(0)} min`}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              (Budget: {workerTierData.rem} rem)
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${percentElapsed}%`, height: '100%', backgroundColor: percentElapsed > 80 ? '#ef4444' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Remaining: <strong>{Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s</strong>
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.70rem', padding: '2px 8px' }}
                onClick={() => setTimerRunning(!timerRunning)}
              >
                {timerRunning ? 'PAUSE' : 'START TIMER'}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                style={{ fontSize: '0.70rem', padding: '2px 8px' }}
                onClick={() => { setTimerRunning(false); setElapsedSeconds(0); }}
              >
                RESET
              </button>
            </div>
          </div>
        </div>

        {/* Outer Cordon Perimeter */}
        <div className="hud-card">
          <span className="hud-metric-label">RECOMMENDED COLD ZONE CORDON</span>
          <span className="hud-metric-value" style={{ color: '#10b981' }}>
            {cordonRadii.recommendedOuterCordonM} meters
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            360° Initial Perimeter (1 mR/h &amp; Blast Standoff)
          </span>
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#cbd5e1' }}>
            Hot Zone Line: <strong style={{ color: 'var(--color-primary)' }}>{cordonRadii.recommendedHotZoneM}m</strong> (10 mR/h)
          </div>
        </div>

        {/* Selected Hazard Isotope */}
        <div className="hud-card">
          <span className="hud-metric-label">PRIMARY THREAT ISOTOPE</span>
          <span className="hud-metric-value" style={{ color: '#fff', fontSize: '1.25rem' }}>
            {isotope.symbol}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
            {isotope.name}
          </span>
          <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#f59e0b' }}>
            Target: <strong>{isotope.criticalOrgan}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '6px', flexShrink: 0 }}>
        <button
          className={`tab-btn ${activeTab === 'cordon' ? 'active' : ''}`}
          onClick={() => setActiveTab('cordon')}
        >
          Tactical Cordon &amp; Standoff
        </button>
        <button
          className={`tab-btn ${activeTab === 'staytime' ? 'active' : ''}`}
          onClick={() => setActiveTab('staytime')}
        >
          Turn-Back Limits &amp; Stay-Times
        </button>
        <button
          className={`tab-btn ${activeTab === 'erg' ? 'active' : ''}`}
          onClick={() => setActiveTab('erg')}
        >
          DOT ERG 2024 Placards
        </button>
        <button
          className={`tab-btn ${activeTab === 'triage' ? 'active' : ''}`}
          onClick={() => setActiveTab('triage')}
        >
          REAC/TS Medical Triage &amp; ARS
        </button>
        <button
          className={`tab-btn ${activeTab === 'decon' ? 'active' : ''}`}
          onClick={() => setActiveTab('decon')}
        >
          Victim Decontamination
        </button>
        <button
          className={`tab-btn ${activeTab === 'sitrep' ? 'active' : ''}`}
          onClick={() => setActiveTab('sitrep')}
        >
          ICS-208 Incident Briefing
        </button>
      </div>

      {/* TAB 1: TACTICAL CORDON & STANDOFF ZONING */}
      {activeTab === 'cordon' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
          {/* Controls & Scenario Setup */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
              1. Incident Threat Profile &amp; Blast Parameters
            </h3>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Threat Isotope</label>
              <select
                className="form-control"
                value={selectedIsotopeKey}
                onChange={(e) => {
                  setSelectedIsotopeKey(e.target.value);
                  setCustomActivityGBq(ISOTOPE_LIBRARY[e.target.value]?.defaultActivityGBq || 3700);
                }}
              >
                {Object.keys(ISOTOPE_LIBRARY).map((k) => (
                  <option key={k} value={k}>
                    {ISOTOPE_LIBRARY[k].symbol} — {ISOTOPE_LIBRARY[k].name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Source Activity (GBq)</label>
                <input
                  type="number"
                  className="form-control"
                  value={customActivityGBq}
                  min="1"
                  onChange={(e) => setCustomActivityGBq(Math.max(1, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  ≈ {(customActivityGBq / 37).toFixed(1)} Curies (Ci)
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Explosive Charge (kg TNT)</label>
                <input
                  type="number"
                  className="form-control"
                  value={explosiveYieldKgTNT}
                  min="0"
                  step="0.5"
                  onChange={(e) => setExplosiveYieldKgTNT(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  For RDD / Dirty Bomb shrapnel
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Wind Speed (m/s)</label>
                <input
                  type="number"
                  className="form-control"
                  value={windSpeedMps}
                  min="0.5"
                  step="0.5"
                  onChange={(e) => setWindSpeedMps(Math.max(0.5, Number(e.target.value)))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Wind Origin Angle (° Azimuth)</label>
                <input
                  type="number"
                  className="form-control"
                  value={windDirectionDeg}
                  min="0"
                  max="359"
                  step="15"
                  onChange={(e) => setWindDirectionDeg(Number(e.target.value) % 360)}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Blowing to {((windDirectionDeg + 180) % 360)}°
                </span>
              </div>
            </div>

            {/* Calculated Cordon Distance Table */}
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Operational Perimeter Breakdown
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Cold Zone / ICP Perimeter (1 mR/h):</span>
                <strong style={{ color: '#10b981' }}>{cordonRadii.rCold.toFixed(1)} m</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Hot Zone Line (10 mR/h):</span>
                <strong style={{ color: 'var(--color-primary)' }}>{cordonRadii.rHot.toFixed(1)} m</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Turn-Back Point (10 R/h):</span>
                <strong style={{ color: '#ef4444' }}>{cordonRadii.rTurnBack.toFixed(1)} m</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Glass Shatter Overpressure (1 psi):</span>
                <strong style={{ color: '#f59e0b' }}>{cordonRadii.rBlastGlass.toFixed(1)} m</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>INITIAL ERG ISOLATION CORDON:</span>
                <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>{cordonRadii.recommendedOuterCordonM} m</strong>
              </div>
            </div>
          </div>

          {/* Polar Cordon Map */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 0, minHeight: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                Tactical Perimeter &amp; Downwind Sector Overlay
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Radial Coordinates (Meters)
              </span>
            </div>

            <div style={{ flex: 1, minHeight: '380px' }}>
              <Plot
                data={cordonPlotData.traces}
                layout={{
                  autosize: true,
                  margin: { l: 30, r: 30, t: 30, b: 30 },
                  polar: {
                    bgcolor: 'rgba(5, 10, 18, 0.7)',
                    radialaxis: {
                      visible: true,
                      range: [0, cordonPlotData.maxR],
                      color: '#94a3b8',
                      gridcolor: 'rgba(255,255,255,0.08)'
                    },
                    angularaxis: {
                      direction: 'clockwise',
                      rotation: 90,
                      color: '#94a3b8',
                      gridcolor: 'rgba(255,255,255,0.08)'
                    }
                  },
                  paper_bgcolor: 'transparent',
                  showlegend: true,
                  legend: {
                    orientation: 'h',
                    y: -0.15,
                    font: { color: '#94a3b8', size: 10 }
                  }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TURN-BACK LIMITS & WORKER DOSE BUDGET */}
      {activeTab === 'staytime' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {/* Dose Rate & Tier Configurator */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
              1. Field Survey Measurement &amp; Mission Authorization
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Measured Ambient Dose Rate</label>
                <input
                  type="number"
                  className="form-control"
                  value={measuredDoseRateValue}
                  min="0.01"
                  step="1"
                  onChange={(e) => setMeasuredDoseRateValue(Math.max(0.001, Number(e.target.value)))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Units</label>
                <select
                  className="form-control"
                  value={measuredUnit}
                  onChange={(e) => setMeasuredUnit(e.target.value as any)}
                >
                  <option value="mR/h">mR/h</option>
                  <option value="uSv/h">µSv/h</option>
                  <option value="mSv/h">mSv/h</option>
                  <option value="R/h">R/h</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Authorized Emergency Worker Dose Tier (EPA PAG)</label>
              <select
                className="form-control"
                value={selectedWorkerTier}
                onChange={(e) => setSelectedWorkerTier(e.target.value as EmergencyWorkerTier)}
              >
                {Object.keys(WORKER_DOSE_LIMITS).map((tierKey) => (
                  <option key={tierKey} value={tierKey}>
                    {WORKER_DOSE_LIMITS[tierKey as EmergencyWorkerTier].label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '12px', borderRadius: '6px' }}>
              <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>
                {workerTierData.label}
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                {workerTierData.desc}
              </p>
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#f59e0b', fontStyle: 'italic' }}>
                Criteria: {workerTierData.condition}
              </div>
            </div>

            {/* Turn-Back Rules of Engagement Callout */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#ef4444' }}>
                NCRP-138 / EPA Turn-Back Rules of Engagement:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.5' }}>
                <li><strong>10 R/h (100 mSv/h) Dose Rate Turn-Back</strong>: Responders must immediately withdraw unless actively engaged in viable human life rescue.</li>
                <li><strong>200 R/h (2 Sv/h) Absolute Ceiling</strong>: No entry permitted under any circumstances; lethal deterministic field.</li>
                <li><strong>Self-Reading Dosimeter Turn-Back</strong>: Withdraw when individual dosimeter reaches 80% of authorized mission dose limit.</li>
              </ul>
            </div>
          </div>

          {/* Mathematical Proof & Mission Planning Readout */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
              2. Mission Stay-Time &amp; Accumulated Dose Formulation
            </h3>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <BlockMath math={`t_{\\text{stay}} = \\frac{D_{\\text{limit}}}{\\dot{D}_{\\text{field}}} = \\frac{${workerTierData.mSv}\\text{ mSv}}{${measuredRate_mSv_h.toFixed(3)}\\text{ mSv/h}} = ${(workerTierData.mSv / Math.max(0.001, measuredRate_mSv_h)).toFixed(2)}\\text{ hours}`} />
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>Calculated Limit: </span>
                <strong style={{ fontSize: '1.3rem', color: 'var(--color-primary)' }}>
                  {maxAllowedStayTimeMinutes >= 60
                    ? `${(maxAllowedStayTimeMinutes / 60).toFixed(2)} hours (${maxAllowedStayTimeMinutes.toFixed(0)} min)`
                    : `${maxAllowedStayTimeMinutes.toFixed(1)} minutes`}
                </strong>
              </div>
            </div>

            {/* Multi-Worker Entry Team Roster Simulation */}
            <div>
              <span style={{ fontSize: '0.80rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Entry Team Dose Accumulation Table
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '0.80rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid var(--color-border)', color: '#94a3b8' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Duration</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Dose (mSv)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Dose (Rem)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>% Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {[5, 10, 15, 30, 45, 60].map((mins) => {
                    const doseMsv = (measuredRate_mSv_h * mins) / 60;
                    const doseRem = doseMsv / 10;
                    const pct = (doseMsv / workerTierData.mSv) * 100;
                    return (
                      <tr key={mins} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px 8px' }}>{mins} minutes</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>{doseMsv.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>{doseRem.toFixed(3)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                          {pct.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOT ERG 2024 PLACARDS & GUIDES */}
      {activeTab === 'erg' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {/* Guide Selector */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
              DOT Emergency Response Guidebook (ERG 2024)
            </h3>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select ERG Radioactive Materials Guide</label>
              <select
                className="form-control"
                value={selectedGuideNumber}
                onChange={(e) => setSelectedGuideNumber(Number(e.target.value))}
              >
                {Object.values(ERG_DATABASE).map((g) => (
                  <option key={g.guideNumber} value={g.guideNumber}>
                    GUIDE {g.guideNumber} — {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick UN Number Placid Tag Row */}
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                Associated UN Placard Codes:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {ERG_DATABASE[selectedGuideNumber]?.unNumbers.map((un) => (
                  <span
                    key={un}
                    className="hud-badge"
                    style={{ background: 'rgba(255, 159, 28, 0.15)', color: '#ff9f1c', border: '1px solid rgba(255, 159, 28, 0.4)', fontFamily: 'monospace', fontWeight: 'bold' }}
                  >
                    {un}
                  </span>
                ))}
              </div>
            </div>

            {/* Isolation Distances Callout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>INITIAL ISOLATION</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.initialIsolationM} m
                </strong>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block' }}>(360° Radius)</span>
              </div>
              <div>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>DOWNWIND EVACUATION</span>
                <strong style={{ fontSize: '1.2rem', color: '#ef4444' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.downwindEvacDayM} m Day / {ERG_DATABASE[selectedGuideNumber]?.downwindEvacNightM} m Night
                </strong>
              </div>
            </div>

            {/* PPE Required */}
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Mandatory PPE Tier:
              </span>
              <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.25)', padding: '10px', borderRadius: '4px', marginTop: '4px', color: '#cbd5e1', fontSize: '0.80rem' }}>
                {ERG_DATABASE[selectedGuideNumber]?.ppeTier}
              </div>
            </div>
          </div>

          {/* SOP Operational Tactical Protocols */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
              Standard Operating Protocols (Guide {selectedGuideNumber})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#ef4444', fontSize: '0.84rem', display: 'block', marginBottom: '2px' }}>
                  🔥 Fire Response &amp; Water Application
                </strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.4' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.fireResponse}
                </p>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#f59e0b', fontSize: '0.84rem', display: 'block', marginBottom: '2px' }}>
                  ⚠️ Spill / Leakage / Rupture Protocol
                </strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#fde68a', lineHeight: '1.4' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.spillResponse}
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#10b981', fontSize: '0.84rem', display: 'block', marginBottom: '2px' }}>
                  🩹 Patient Extraction &amp; First Aid
                </strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#a7f3d0', lineHeight: '1.4' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.firstAid}
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--color-primary)', fontSize: '0.84rem', display: 'block', marginBottom: '2px' }}>
                  ⚡ Key Physical Radiation Hazards
                </strong>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {ERG_DATABASE[selectedGuideNumber]?.keyHazards}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REAC/TS MEDICAL TRIAGE & ARS ONSET */}
      {activeTab === 'triage' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          {/* Clinical Indicators Setup */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
              1. Patient Clinical Presentation &amp; Time-to-Emesis
            </h3>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0 }}>Time from Exposure to First Vomiting (Emesis)</label>
                <strong style={{ color: 'var(--color-primary)' }}>{victimEmesisTimeMinutes} minutes</strong>
              </div>
              <input
                type="range"
                className="form-control"
                min="5"
                max="360"
                step="5"
                value={victimEmesisTimeMinutes}
                style={{ width: '100%', accentColor: 'var(--color-primary)', margin: '8px 0' }}
                onChange={(e) => setVictimEmesisTimeMinutes(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Gold standard REAC/TS early clinical bio-indicator of acute whole-body absorbed dose.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nasal Swab (CPM)</label>
                <input
                  type="number"
                  className="form-control"
                  value={victimNasalSwabCPM}
                  min="0"
                  onChange={(e) => setVictimNasalSwabCPM(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {arsTriage.hasInternalInhalation ? '⚠️ Inhalation Detected' : 'No Inhalation'}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Skin Survey (CPM)</label>
                <input
                  type="number"
                  className="form-control"
                  value={victimSkinContamCPM}
                  min="0"
                  onChange={(e) => setVictimSkinContamCPM(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Net: {Math.max(0, victimSkinContamCPM - backgroundCPM)} CPM
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ambient Bg (CPM)</label>
                <input
                  type="number"
                  className="form-control"
                  value={backgroundCPM}
                  min="0"
                  onChange={(e) => setBackgroundCPM(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Action: {backgroundCPM * 2} CPM
                </span>
              </div>
            </div>

            {/* Acute Radiation Syndrome Prediction Card */}
            <div style={{ padding: '14px', borderRadius: '6px', border: `2px solid ${arsTriage.color}`, background: `${arsTriage.color}0c` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 'bold' }}>
                  REAC/TS ARS TRIAGE CLASSIFICATION
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: arsTriage.color }}>
                  {arsTriage.estimatedDoseGy}
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: arsTriage.color, letterSpacing: '0.02em' }}>
                {arsTriage.category}
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.80rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                {arsTriage.prognosis}
              </p>
            </div>
          </div>

          {/* Medical Countermeasures Library */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
              2. Medical Countermeasure Protocols (FDA &amp; NCRP 161)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Isotope Specific Active Countermeasure */}
              <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid var(--color-primary)', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Primary Indicated Antidote for {isotope.symbol}:
                </span>
                <h4 style={{ margin: '2px 0 4px 0', fontSize: '1.0rem', color: '#fff' }}>
                  {isotope.countermeasure}
                </h4>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  <strong>Protocol:</strong> {isotope.countermeasureDose}
                </p>
              </div>

              {/* Potassium Iodide Quick Dosage Guide */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#f59e0b', fontSize: '0.84rem', display: 'block', marginBottom: '4px' }}>
                  Thyroid Protection: Potassium Iodide (KI) Age-Based Dosing
                </strong>
                <table style={{ width: '100%', fontSize: '0.76rem', color: '#cbd5e1' }}>
                  <tbody>
                    <tr><td>Adults (&gt; 18 years):</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>130 mg</td></tr>
                    <tr><td>Children (3 - 18 years, &lt; 68 kg):</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>65 mg</td></tr>
                    <tr><td>Infants (1 month - 3 years):</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>32 mg</td></tr>
                    <tr><td>Neonates (Birth - 1 month):</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>16 mg</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Decorporation Agents Guide */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: '6px' }}>
                <strong style={{ color: '#10b981', fontSize: '0.84rem', display: 'block', marginBottom: '4px' }}>
                  Heavy Metal &amp; Actinide Chelation (DTPA &amp; Prussian Blue)
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  <li><strong>Ca-DTPA</strong>: 1.0 g IV/inhalation within first 24h for Pu/Am/Cm transuranics.</li>
                  <li><strong>Zn-DTPA</strong>: 1.0 g IV daily for maintenance chelation (avoids Zinc/Manganese depletion).</li>
                  <li><strong>Prussian Blue</strong>: 3.0 g orally TID for Cs-137 / Tl-201 (traps ions in gut enterohepatic cycle).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VICTIM DECONTAMINATION & MASS CASUALTY FLOW */}
      {activeTab === 'decon' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
              Field Decontamination Action Thresholds
            </h3>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Measured Skin Activity:</span>
                <strong style={{ color: victimSkinContamCPM > backgroundCPM * 2 ? '#ef4444' : '#10b981', fontSize: '1.1rem' }}>
                  {victimSkinContamCPM} CPM
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Action Threshold (2× Background):</span>
                <span style={{ color: '#cbd5e1' }}>{backgroundCPM * 2} CPM</span>
              </div>
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
                <span className={`hud-badge ${victimSkinContamCPM > backgroundCPM * 2 ? 'hud-badge-danger' : 'hud-badge-success'}`}>
                  {victimSkinContamCPM > backgroundCPM * 2 ? 'DECONTAMINATION MANDATORY' : 'CLEAN / RELEASE CANDIDATE'}
                </span>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '12px', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                Step 1: Rapid Clothing Removal (85-90% Reduction)
              </h4>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                Careful removal of outer footwear and clothing eliminates up to 90% of all external particulate contamination without water. Roll garments outward to avoid aerosolizing dust.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#f59e0b' }}>
                Step 2: Strict Decontamination Priority Order
              </h4>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <li><strong>Open Wounds</strong>: Irrigate copiously with saline/water; protect wound edges.</li>
                <li><strong>Body Orifices</strong>: Eyes, ears, nose, mouth before intact skin.</li>
                <li><strong>High-Count Skin</strong>: Gentle washing with lukewarm water and mild soap (no abrasive scrubbing to avoid breaking skin stratum corneum).</li>
                <li><strong>Low-Count Areas</strong>: Spot clean and dry with disposable towels.</li>
              </ol>
            </div>
          </div>

          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
              Decontamination Corridor Setup (Warm Zone)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ borderLeft: '4px solid #ef4444', paddingLeft: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px' }}>
                <strong style={{ color: '#ef4444', fontSize: '0.84rem' }}>Station 1 — Hot Side Arrival</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Initial gross radiological triage survey. Segregate ambulatory vs. non-ambulatory trauma patients.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px' }}>
                <strong style={{ color: '#f59e0b', fontSize: '0.84rem' }}>Station 2 — Disrobing &amp; Containment</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Double-bag personal effects and clothing. Tag with patient barcode. Issue clean coveralls.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #00e5ff', paddingLeft: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px' }}>
                <strong style={{ color: '#00e5ff', fontSize: '0.84rem' }}>Station 3 — Wash &amp; Rinse Showers</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Lukewarm shower with mild soap. Collect wash runoff water in retention bladder tanks.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px' }}>
                <strong style={{ color: '#10b981', fontSize: '0.84rem' }}>Station 4 — Clean Line Monitoring &amp; Release</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Full-body pancake GM probe survey (&lt; 2× background required). Transfer to clean medical holding area.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ICS-208 SAFETY PLAN & SITREP GENERATOR */}
      {activeTab === 'sitrep' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                ICS-208 Safety Plan &amp; Tactical Briefing Summary
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Incident Command System Briefing for Incident Commander &amp; Operations Section Chief
              </span>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => window.print()}
              style={{ padding: '6px 14px', fontWeight: 'bold' }}
            >
              PRINT / EXPORT ICS-208 BRIEFING
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Incident Code / Title:</label>
            <input
              type="text"
              className="form-control"
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{ background: 'rgba(0,0,0,0.45)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '12px' }}>
              <strong style={{ fontSize: '1.0rem', color: '#fff' }}>TACTICAL INCIDENT SAFETY PLAN (ICS-208)</strong><br />
              <span>RADPRO ANALYTICAL CBRN EMERGENCY RESPONSE ENGINE</span>
            </div>

            <div><strong>INCIDENT IDENTIFIER:</strong> {incidentTitle}</div>
            <div><strong>PRIMARY ISOTOPE THREAT:</strong> {isotope.symbol} ({isotope.name})</div>
            <div><strong>ESTIMATED SOURCE STRENGTH:</strong> {customActivityGBq} GBq (≈ {(customActivityGBq / 37).toFixed(1)} Ci)</div>
            <div><strong>EXPLOSIVE DISPERSAL (TNT EQUIV):</strong> {explosiveYieldKgTNT} kg</div>
            <div><strong>METEOROLOGY:</strong> Wind {windSpeedMps} m/s from {windDirectionDeg}° (Plume Corridor: {((windDirectionDeg + 180) % 360)}°)</div>
            <br />
            <div style={{ color: 'var(--color-primary)' }}>--- OPERATIONAL PERIMETERS &amp; STAND-OFF ---</div>
            <div>* 360° INITIAL ISOLATION CORDON: {cordonRadii.recommendedOuterCordonM} meters (Cold Zone Boundary / 1 mR/h line)</div>
            <div>* HOT ZONE (EXCLUSION) BOUNDARY: {cordonRadii.recommendedHotZoneM} meters (≥ 10 mR/h)</div>
            <div>* 1-PSI GLASS SHATTER RADIUS: {cordonRadii.rBlastGlass.toFixed(1)} meters</div>
            <br />
            <div style={{ color: '#f59e0b' }}>--- RULES OF ENGAGEMENT &amp; DOSE BUDGET ---</div>
            <div>* MEASURED FIELD AT ENTRY POINT: {measuredDoseRateValue} {measuredUnit} ({measuredRate_R_h.toFixed(3)} R/h)</div>
            <div>* AUTHORIZED WORKER MISSION LIMIT: {workerTierData.rem} Rem ({workerTierData.mSv} mSv) — [{workerTierData.label}]</div>
            <div>* CALCULATED ENTRY STAY-TIME: {maxAllowedStayTimeMinutes.toFixed(1)} minutes</div>
            <div>* MANDATORY WITHDRAWAL TRIGGER: Field &gt; 10 R/h or Individual Dosimeter &gt; {(workerTierData.rem * 0.8).toFixed(1)} Rem (80%)</div>
            <br />
            <div style={{ color: '#10b981' }}>--- MEDICAL &amp; DECONTAMINATION ORDERS ---</div>
            <div>* DOT ERG GUIDE APPLIED: Guide {selectedGuideNumber} ({ERG_DATABASE[selectedGuideNumber]?.title})</div>
            <div>* INDICATED MEDICAL COUNTERMEASURE: {isotope.countermeasure}</div>
            <div>* DOSING DIRECTIVE: {isotope.countermeasureDose}</div>
            <div>* DECONTAMINATION THRESHOLD: &gt; {backgroundCPM * 2} CPM (2× Background)</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirstResponderModule;
