import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type CBRNTab = 'fallout' | 'shelter' | 'egress' | 'chemical' | 'biodosimetry' | 'iap';

interface ScenarioPreset {
  id: string;
  name: string;
  category: string;
  r1_Rh: number; // 1-hour reference dose rate in R/h
  falloutArrival_h: number; // Time of fallout arrival post-detonation
  defaultShelterPf: number;
  description: string;
}

const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'surface_10kt',
    name: '💥 10 kT Tactical Surface Burst (Urban Fringe)',
    category: 'Nuclear Weapon Detonation',
    r1_Rh: 300,
    falloutArrival_h: 0.5,
    defaultShelterPf: 15,
    description: '10 kT ground burst. Heavy particulate ground-shine deposition creates an intense early field requiring strict immediate sheltering.'
  },
  {
    id: 'severe_reactor',
    name: '☢️ Severe Reactor Ex-Vessel Core Breach',
    category: 'Severe Nuclear Accident',
    r1_Rh: 45,
    falloutArrival_h: 1.5,
    defaultShelterPf: 5,
    description: 'Containment loss with volatile fission products (Cs-137, I-131, Te-132) depositing over local communities. Moderately declining groundshine.'
  },
  {
    id: 'improvised_rdd',
    name: '💣 Multi-Curie Radiologic Dispersion Device (RDD)',
    category: 'Radiological Terrorism',
    r1_Rh: 12,
    falloutArrival_h: 0.2,
    defaultShelterPf: 2.5,
    description: 'Aerosolized Cs-137 chloride dispersal. Localized high ground contamination with prompt inhalation and external exposure risks.'
  },
  {
    id: 'megaton_distant',
    name: '🌋 Strategic Ground Detonation (Downwind 25 Miles)',
    category: 'Strategic Defense',
    r1_Rh: 1200,
    falloutArrival_h: 1.0,
    defaultShelterPf: 50,
    description: 'Massive fission product plume deposition. Lethal unshielded fields (>1000 R/h). Subterranean or mass concrete shelter mandatory.'
  }
];

interface ShelterType {
  id: string;
  name: string;
  pf: number;
  description: string;
  doseReductionPct: number;
}

const SHELTER_TYPES: ShelterType[] = [
  { id: 'open', name: 'Open Field / Unprotected', pf: 1.0, description: 'No shielding; direct gamma shine from ground plane.', doseReductionPct: 0 },
  { id: 'vehicle', name: 'Motor Vehicle / Automobile', pf: 1.5, description: 'Thin sheet metal; minimal attenuation (PF ~1.5).', doseReductionPct: 33.3 },
  { id: 'wood_1f', name: 'Single-Story Wood Frame House (1st Floor)', pf: 2.5, description: 'Typical residential drywall and timber siding.', doseReductionPct: 60.0 },
  { id: 'brick_1f', name: 'Two-Story Brick / Masonry House (1st Floor)', pf: 5.0, description: 'Double brick cladding provides moderate exterior attenuation.', doseReductionPct: 80.0 },
  { id: 'basement_sub', name: 'Residential Basement (Below Grade Earth)', pf: 15.0, description: 'Surrounding earth provides 360° lateral barrier; roof overhead.', doseReductionPct: 93.3 },
  { id: 'office_core', name: 'Multi-Story Office Building (Central Core)', pf: 50.0, description: 'Heavy poured concrete slabs above and below; massive core.', doseReductionPct: 98.0 },
  { id: 'subway_bunker', name: 'Subterranean Parking / Subway Station', pf: 100.0, description: 'Sub-surface earth cover and heavy reinforced concrete ceiling.', doseReductionPct: 99.0 },
  { id: 'engineered_shelter', name: 'Deep Civil Defense Fallout Bunker', pf: 500.0, description: 'Engineered blast/fallout shelter with thick earth/lead shielding.', doseReductionPct: 99.8 }
];

interface ToxicChemical {
  name: string;
  formula: string;
  cas: string;
  aegl1_ppm: number;
  aegl2_ppm: number;
  aegl3_ppm: number;
  idlh_ppm: number;
  tenBergeN: number;
  odorThreshold_ppm: number;
  description: string;
}

const CHEMICAL_DATABASE: ToxicChemical[] = [
  {
    name: 'Chlorine',
    formula: 'Cl₂',
    cas: '7782-50-5',
    aegl1_ppm: 0.5,
    aegl2_ppm: 2.0,
    aegl3_ppm: 20.0,
    idlh_ppm: 10.0,
    tenBergeN: 2.0,
    odorThreshold_ppm: 0.2,
    description: 'Choking agent. Severe pulmonary edema and acute mucosal necrosis upon inhalation.'
  },
  {
    name: 'Anhydrous Ammonia',
    formula: 'NH₃',
    cas: '7664-41-7',
    aegl1_ppm: 30.0,
    aegl2_ppm: 160.0,
    aegl3_ppm: 1100.0,
    idlh_ppm: 300.0,
    tenBergeN: 2.0,
    odorThreshold_ppm: 5.0,
    description: 'Alkaline caustic gas. Rapid laryngeal spasm and severe chemical tracheobronchitis.'
  },
  {
    name: 'Phosgene',
    formula: 'COCl₂',
    cas: '75-44-5',
    aegl1_ppm: 0.1,
    aegl2_ppm: 0.6,
    aegl3_ppm: 1.5,
    idlh_ppm: 2.0,
    tenBergeN: 1.0,
    odorThreshold_ppm: 0.4,
    description: 'Insidious choking agent. Latent alveolar capillary disruption leading to fatal pulmonary edema.'
  },
  {
    name: 'Hydrogen Cyanide',
    formula: 'HCN',
    cas: '74-90-8',
    aegl1_ppm: 1.0,
    aegl2_ppm: 7.1,
    aegl3_ppm: 15.0,
    idlh_ppm: 50.0,
    tenBergeN: 2.0,
    odorThreshold_ppm: 1.0,
    description: 'Blood agent. Cellular histotoxic hypoxia via cytochrome c oxidase inhibition.'
  },
  {
    name: 'Sarin (GB)',
    formula: 'C₄H₁₀FO₂P',
    cas: '107-44-8',
    aegl1_ppm: 0.00048,
    aegl2_ppm: 0.0059,
    aegl3_ppm: 0.022,
    idlh_ppm: 0.03,
    tenBergeN: 2.0,
    odorThreshold_ppm: 0.001,
    description: 'G-series organophosphate nerve agent. Irreversible acetylcholinesterase inhibition.'
  }
];

export const CBRNConsequenceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CBRNTab>('fallout');
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // --- TAB 1: Way-Wigner & Fallout Decay States ---
  const [selectedScenario, setSelectedScenario] = useState<string>('surface_10kt');
  const [r1Rate, setR1Rate] = useState<number>(300); // R/h at t=1 hour
  const [falloutArrival, setFalloutArrival] = useState<number>(0.5); // hours
  const [evaluationDuration, setEvaluationDuration] = useState<number>(48); // hours
  const [selectedShelterId, setSelectedShelterId] = useState<string>('basement_sub');
  const [isLogPlot, setIsLogPlot] = useState<boolean>(true);

  // Update scenario presets
  const handleScenarioChange = (presetId: string) => {
    setSelectedScenario(presetId);
    const p = SCENARIOS.find((s) => s.id === presetId);
    if (p) {
      setR1Rate(p.r1_Rh);
      setFalloutArrival(p.falloutArrival_h);
      const matchingShelter = SHELTER_TYPES.find((s) => s.pf === p.defaultShelterPf);
      if (matchingShelter) {
        setSelectedShelterId(matchingShelter.id);
      }
    }
  };

  const activeShelter = useMemo(() => {
    return SHELTER_TYPES.find((s) => s.id === selectedShelterId) || SHELTER_TYPES[4];
  }, [selectedShelterId]);

  // Way-Wigner integration formula: D(t1, t2) = (R1 / (PF * -0.2)) * [ t2^(-0.2) - t1^(-0.2) ]
  // or equivalently: D(t1, t2) = (5 * R1 / PF) * [ t1^(-0.2) - t2^(-0.2) ]
  const calculateIntegratedDose = (t1: number, t2: number, pf: number, r1: number): number => {
    if (t2 <= t1) return 0;
    const safeT1 = Math.max(0.1, t1);
    const safeT2 = Math.max(safeT1 + 0.01, t2);
    const integralVal = 5 * r1 * (Math.pow(safeT1, -0.2) - Math.pow(safeT2, -0.2));
    return integralVal / pf;
  };

  // Time arrays and curve points
  const falloutTimePoints = useMemo(() => {
    const points: { t: number; rateOut: number; rateIn: number; doseOut: number; doseIn: number }[] = [];
    const steps = 150;
    const startT = Math.max(0.2, falloutArrival);
    const endT = evaluationDuration;
    const logStart = Math.log10(startT);
    const logEnd = Math.log10(endT);

    for (let i = 0; i <= steps; i++) {
      const logT = logStart + (i / steps) * (logEnd - logStart);
      const t = Math.pow(10, logT);
      const rateOut = r1Rate * Math.pow(t, -1.2);
      const rateIn = rateOut / activeShelter.pf;
      const doseOut = calculateIntegratedDose(startT, t, 1.0, r1Rate);
      const doseIn = calculateIntegratedDose(startT, t, activeShelter.pf, r1Rate);

      points.push({ t, rateOut, rateIn, doseOut, doseIn });
    }
    return points;
  }, [falloutArrival, evaluationDuration, r1Rate, activeShelter.pf]);

  const totalDoseOutside = useMemo(() => {
    return calculateIntegratedDose(falloutArrival, evaluationDuration, 1.0, r1Rate);
  }, [falloutArrival, evaluationDuration, r1Rate]);

  const totalDoseShelter = useMemo(() => {
    return calculateIntegratedDose(falloutArrival, evaluationDuration, activeShelter.pf, r1Rate);
  }, [falloutArrival, evaluationDuration, activeShelter.pf, r1Rate]);

  const doseAvoidedPct = useMemo(() => {
    if (totalDoseOutside <= 0) return 0;
    return ((totalDoseOutside - totalDoseShelter) / totalDoseOutside) * 100;
  }, [totalDoseOutside, totalDoseShelter]);

  // --- TAB 2: Custom Multilayer Barrier Shielding Sandbox ---
  const [layers, setLayers] = useState<{ material: string; thicknessCm: number }[]>([
    { material: 'Concrete', thicknessCm: 25 },
    { material: 'Earth/Soil', thicknessCm: 30 }
  ]);

  const MATERIAL_HVL: Record<string, { hvlCm: number; densityGcm3: number; name: string }> = {
    'Concrete': { hvlCm: 6.4, densityGcm3: 2.35, name: 'Normal Density Concrete' },
    'Earth/Soil': { hvlCm: 9.4, densityGcm3: 1.60, name: 'Compacted Earth / Soil' },
    'Brick': { hvlCm: 7.9, densityGcm3: 1.90, name: 'Common Red Clay Brick' },
    'Steel': { hvlCm: 1.8, densityGcm3: 7.85, name: 'Structural Carbon Steel' },
    'Wood': { hvlCm: 25.0, densityGcm3: 0.60, name: 'Construction Lumber / Plywood' },
    'Lead': { hvlCm: 1.1, densityGcm3: 11.34, name: 'Chemical Lead Sheeting' }
  };

  const customShieldingMetrics = useMemo(() => {
    let totalHvlFractions = 0;
    let totalMassAreal = 0; // g/cm^2

    layers.forEach((l) => {
      const mat = MATERIAL_HVL[l.material] || MATERIAL_HVL['Concrete'];
      totalHvlFractions += l.thicknessCm / mat.hvlCm;
      totalMassAreal += l.thicknessCm * mat.densityGcm3;
    });

    const attenuationFactor = Math.pow(2, totalHvlFractions);
    const calculatedPf = Math.max(1.0, attenuationFactor);
    const massArealLbFt2 = totalMassAreal * 2.04816; // 1 g/cm^2 = 2.048 lb/ft^2

    return {
      totalHvlFractions,
      attenuationFactor,
      calculatedPf,
      totalMassAreal,
      massArealLbFt2
    };
  }, [layers]);

  // --- TAB 3: Optimal Shelter Egress Timing Optimizer ---
  const [egressInitialPf, setEgressInitialPf] = useState<number>(3.0); // Suboptimal shelter (e.g. wood frame)
  const [transitDurationMin, setTransitDurationMin] = useState<number>(60); // 1 hour transit in car
  const [transitPf, setTransitPf] = useState<number>(1.5); // vehicle PF
  const [destPf, setDestPf] = useState<number>(1000.0); // Deep shelter or clean zone
  const [horizonHours, setHorizonHours] = useState<number>(48.0);

  const egressOptimization = useMemo(() => {
    const sweepSteps = 96; // every 15 min up to 24h
    const transitHours = transitDurationMin / 60;
    const results: { departTimeH: number; shelterDose: number; transitDose: number; postDose: number; totalDose: number }[] = [];

    let minDose = Infinity;
    let bestTime = falloutArrival + 1;

    for (let i = 0; i <= sweepSteps; i++) {
      const tDepart = falloutArrival + (i / sweepSteps) * (24 - falloutArrival);
      const tArriveDest = tDepart + transitHours;

      // 1. In initial shelter until departure
      const dose1 = calculateIntegratedDose(falloutArrival, tDepart, egressInitialPf, r1Rate);
      // 2. In vehicle during transit
      const dose2 = calculateIntegratedDose(tDepart, tArriveDest, transitPf, r1Rate);
      // 3. At destination shelter until horizon
      const dose3 = calculateIntegratedDose(tArriveDest, horizonHours, destPf, r1Rate);

      const total = dose1 + dose2 + dose3;
      if (total < minDose) {
        minDose = total;
        bestTime = tDepart;
      }

      results.push({
        departTimeH: tDepart,
        shelterDose: dose1,
        transitDose: dose2,
        postDose: dose3,
        totalDose: total
      });
    }

    // Compare with staying in initial shelter the entire time
    const stayAllTimeDose = calculateIntegratedDose(falloutArrival, horizonHours, egressInitialPf, r1Rate);

    return {
      results,
      minDose,
      bestTime,
      stayAllTimeDose,
      doseReductionByOptimalEgress: stayAllTimeDose - minDose
    };
  }, [falloutArrival, egressInitialPf, transitDurationMin, transitPf, destPf, horizonHours, r1Rate]);

  // --- TAB 4: Multi-Hazard Chemical Infiltration States ---
  const [selectedChemicalIdx, setSelectedChemicalIdx] = useState<number>(0);
  const [outdoorConcPpm, setOutdoorConcPpm] = useState<number>(15.0);
  const [plumeDurationMin, setPlumeDurationMin] = useState<number>(45);
  const [airChangesPerHour, setAirChangesPerHour] = useState<number>(0.5); // standard house closed

  const activeChemical = CHEMICAL_DATABASE[selectedChemicalIdx];

  const chemicalSimulation = useMemo(() => {
    const steps = 120;
    const totalTimeMin = plumeDurationMin * 2.5;
    const points: { tMin: number; outdoor: number; indoor: number }[] = [];

    const achPerMin = airChangesPerHour / 60;
    let indoorC = 0;
    let peakIndoor = 0;
    let toxicLoadTenBerge = 0; // integral of C^n * dt

    const dt = totalTimeMin / steps;

    for (let i = 0; i <= steps; i++) {
      const tMin = i * dt;
      const outdoorC = tMin <= plumeDurationMin ? outdoorConcPpm : 0;

      // Indoor differential: dC/dt = ACH * (C_out - C_in)
      const dC = achPerMin * (outdoorC - indoorC) * dt;
      indoorC = Math.max(0, indoorC + dC);
      if (indoorC > peakIndoor) peakIndoor = indoorC;

      toxicLoadTenBerge += Math.pow(indoorC, activeChemical.tenBergeN) * dt;

      points.push({ tMin, outdoor: outdoorC, indoor: indoorC });
    }

    // Health Assessment
    let hazardLevel: 'SAFE' | 'AEGL-1' | 'AEGL-2' | 'AEGL-3' = 'SAFE';
    if (peakIndoor >= activeChemical.aegl3_ppm) hazardLevel = 'AEGL-3';
    else if (peakIndoor >= activeChemical.aegl2_ppm) hazardLevel = 'AEGL-2';
    else if (peakIndoor >= activeChemical.aegl1_ppm) hazardLevel = 'AEGL-1';

    return {
      points,
      peakIndoor,
      attenuationRatio: peakIndoor / Math.max(0.001, outdoorConcPpm),
      toxicLoadTenBerge,
      hazardLevel
    };
  }, [activeChemical, outdoorConcPpm, plumeDurationMin, airChangesPerHour]);

  // --- TAB 5: Cytogenetic Biodosimetry States ---
  const [scoredCells, setScoredCells] = useState<number>(100);
  const [observedDicentrics, setObservedDicentrics] = useState<number>(35);
  const [baselineAlc, setBaselineAlc] = useState<number>(2000); // cells/uL
  const [currentAlc, setCurrentAlc] = useState<number>(650); // cells/uL at 24h
  const [timeToEmesisMin, setTimeToEmesisMin] = useState<number>(75); // minutes

  // IAEA TRS-405 Dicentric Chromosome Assay Calibration: Y = c + alpha*D + beta*D^2
  // For Co-60 / Fission gamma standard curve: c = 0.001, alpha = 0.045 Gy^-1, beta = 0.060 Gy^-2
  const cytogeneticDose = useMemo(() => {
    const c = 0.001;
    const alpha = 0.045;
    const beta = 0.060;

    const Y = observedDicentrics / Math.max(1, scoredCells);
    const discriminant = alpha * alpha - 4 * beta * (c - Y);

    let estimatedGy = 0;
    if (discriminant >= 0) {
      estimatedGy = (-alpha + Math.sqrt(discriminant)) / (2 * beta);
    }
    estimatedGy = Math.max(0, estimatedGy);

    // Poisson error: sigma_Y = sqrt(observedDicentrics) / scoredCells
    const sigmaY = Math.sqrt(Math.max(1, observedDicentrics)) / scoredCells;
    const yHigh = Y + 1.96 * sigmaY;
    const yLow = Math.max(c, Y - 1.96 * sigmaY);

    const dHigh = (-alpha + Math.sqrt(Math.max(0, alpha * alpha - 4 * beta * (c - yHigh)))) / (2 * beta);
    const dLow = (-alpha + Math.sqrt(Math.max(0, alpha * alpha - 4 * beta * (c - yLow)))) / (2 * beta);

    // Andrews Lymphocyte Depletion Model: N(t) / N0 = exp(-k * D * t)
    // Approximate: D_alc ~ -ln(currentAlc / baselineAlc) / (0.6 * t_days)
    const ratio = Math.max(0.01, Math.min(1.0, currentAlc / baselineAlc));
    const dAlcGy = -Math.log(ratio) / 0.55;

    // Emesis Latency estimate: D_emesis ~ 4.5 / (t_hours)^0.65
    const tEmesisH = timeToEmesisMin / 60;
    let dEmesisGy = 0;
    if (tEmesisH <= 0.5) dEmesisGy = 6.5;
    else if (tEmesisH <= 1.0) dEmesisGy = 4.5;
    else if (tEmesisH <= 2.0) dEmesisGy = 2.8;
    else if (tEmesisH <= 4.0) dEmesisGy = 1.5;
    else dEmesisGy = 0.8;

    // Tri-fusion composite dose
    const compositeGy = (estimatedGy * 0.5 + dAlcGy * 0.3 + dEmesisGy * 0.2);

    let metrepolTag = 'RC-1 (Mild / Outpatient)';
    let metrepolColor = '#10b981';
    let triageAction = 'Serial CBC every 12 hours. Antiemetics (Ondansetron 8mg) as needed.';

    if (compositeGy >= 8.0) {
      metrepolTag = 'RC-4 (Lethal / Neurovascular & GI Collapse)';
      metrepolColor = '#ef4444';
      triageAction = 'Palliative comfort care, fluid resuscitation, high-dose analgesics. Supralethal exposure.';
    } else if (compositeGy >= 4.0) {
      metrepolTag = 'RC-3 (Severe ARS / Critical Hematopoietic & GI)';
      metrepolColor = '#f97316';
      triageAction = 'Immediate hospital admission, strict reverse isolation, G-CSF (Filgrastim 5 µg/kg/day), broad-spectrum IV antibiotics.';
    } else if (compositeGy >= 2.0) {
      metrepolTag = 'RC-2 (Moderate ARS / Hematopoietic Syndrome)';
      metrepolColor = '#eab308';
      triageAction = 'Admit to medical facility, baseline HLA typing, initiate daily G-CSF within 24-48 hours.';
    }

    return {
      Y,
      estimatedGy,
      dLow: Math.max(0, dLow),
      dHigh: Math.max(0, dHigh),
      dAlcGy,
      dEmesisGy,
      compositeGy,
      metrepolTag,
      metrepolColor,
      triageAction
    };
  }, [scoredCells, observedDicentrics, baselineAlc, currentAlc, timeToEmesisMin]);

  // --- Cryptographic Dossier Payload ---
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: 'ICS-208 CBRN Tactical Consequence, Fallout & Shelter Optimization Dossier',
      moduleName: 'Module 25 (CBRN Consequence & Consequence Management)',
      statuteCitation: 'NCRP Report No. 165 / FEMA Nuclear Guidance / IAEA TRS-405 / EPA PAG-2017',
      verificationTestId: 'VTEST-28',
      operatorName: 'CBRN Consequence Assessment Specialist',
      operatorCredentials: 'CHP / CBRN Consequence Manager',
      facility: 'Emergency Operations Center / Tactical Command',
      notes: `CBRN Tactical Assessment: R1=${r1Rate} R/h, fallout arrival T+${falloutArrival}h. Best egress: T+${egressOptimization.bestTime.toFixed(1)}h. Metrepol: ${cytogeneticDose.metrepolTag}.`,
      formulaDescription: 'R(t) = R_1 \\cdot t^{-1.2}, \\quad D(t_1, t_2) = \\frac{5 R_1}{\\text{PF}} [t_1^{-0.2} - t_2^{-0.2}], \\quad Y = c + \\alpha D + \\beta D^2',
      inputs: [
        { label: 'Reference Rate R1 (T+1h)', value: r1Rate, unit: 'R/h' },
        { label: 'Fallout Arrival Time', value: falloutArrival, unit: 'h' },
        { label: 'Evaluation Duration', value: evaluationDuration, unit: 'h' },
        { label: 'Shelter Type', value: activeShelter.name },
        { label: 'Shelter Protection Factor', value: activeShelter.pf },
        { label: 'Initial Shelter PF (Egress)', value: egressInitialPf },
        { label: 'Destination Shelter PF', value: destPf },
        { label: 'Chemical Agent', value: activeChemical.name },
        { label: 'Outdoor Peak Chemical Conc', value: outdoorConcPpm, unit: 'ppm' },
        { label: 'Shelter Air Changes', value: airChangesPerHour, unit: 'h⁻¹' },
        { label: 'DCA Scored Cells', value: scoredCells },
        { label: 'Observed Dicentrics', value: observedDicentrics },
        { label: 'Current ALC (24h)', value: currentAlc, unit: 'cells/µL' },
        { label: 'Baseline ALC', value: baselineAlc, unit: 'cells/µL' }
      ],
      outputs: [
        { label: '48h Unshielded Dose', value: totalDoseOutside.toFixed(1), unit: 'R', status: 'WARNING' },
        { label: '48h In-Shelter Dose', value: totalDoseShelter.toFixed(1), unit: 'R', status: 'PASS' },
        { label: 'Dose Avoidance', value: `${doseAvoidedPct.toFixed(1)}%`, status: 'PASS' },
        { label: 'Optimal Departure Time', value: `T+${egressOptimization.bestTime.toFixed(1)} h`, status: 'PASS' },
        { label: 'Optimal Departure Total Dose', value: egressOptimization.minDose.toFixed(1), unit: 'R', status: 'PASS' },
        { label: 'Stay-In-Place Total Dose', value: egressOptimization.stayAllTimeDose.toFixed(1), unit: 'R' },
        { label: 'Custom Shielding PF', value: customShieldingMetrics.calculatedPf.toFixed(1) },
        { label: 'Peak Indoor Chemical Conc', value: chemicalSimulation.peakIndoor.toFixed(2), unit: 'ppm', status: chemicalSimulation.hazardLevel === 'SAFE' ? 'PASS' : 'WARNING' },
        { label: 'Chemical Hazard Level', value: chemicalSimulation.hazardLevel, status: chemicalSimulation.hazardLevel === 'SAFE' ? 'PASS' : 'WARNING' },
        { label: 'Ten Berge Toxic Load', value: chemicalSimulation.toxicLoadTenBerge.toFixed(1) },
        { label: 'DCA Estimated Dose', value: cytogeneticDose.estimatedGy.toFixed(2), unit: 'Gy' },
        { label: 'METREPOL Category', value: cytogeneticDose.metrepolTag, status: cytogeneticDose.compositeGy > 2 ? 'WARNING' : 'PASS' },
        { label: 'Recommended Countermeasure', value: cytogeneticDose.triageAction }
      ]
    };
  }, [r1Rate, falloutArrival, evaluationDuration, activeShelter, egressInitialPf, destPf, totalDoseOutside, totalDoseShelter, doseAvoidedPct, egressOptimization, customShieldingMetrics, activeChemical, outdoorConcPpm, airChangesPerHour, chemicalSimulation, scoredCells, observedDicentrics, currentAlc, baselineAlc, cytogeneticDose]);

  return (
    <div className="cbrn-consequence-module">
      {/* Header Banner */}
      <div className="panel-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>☢️ Module 25: CBRN Tactical Consequence, Fallout & Shelter Optimization</span>
              <VerificationBadge testId="VTEST-28" standard="NCRP-165 / FEMA" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Nuclear detonation consequence management, Way-Wigner decay laws, expedient shelter protection factors, optimal evacuation crossover timing, toxic chemical inhalation hazards, and cytogenetic biodosimetry.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📜 Export ICS-208 Dossier</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'fallout' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'fallout' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'fallout' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'fallout' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('fallout')}
        >
          ☢️ Way-Wigner Fallout Decay
        </button>

        <button
          className={`nav-link ${activeTab === 'shelter' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'shelter' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'shelter' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'shelter' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('shelter')}
        >
          🏢 Shelter Protection Factors (PF)
        </button>

        <button
          className={`nav-link ${activeTab === 'egress' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'egress' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'egress' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'egress' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('egress')}
        >
          ⏱️ Egress & Evacuation Timing
        </button>

        <button
          className={`nav-link ${activeTab === 'chemical' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'chemical' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'chemical' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'chemical' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('chemical')}
        >
          🧪 Toxic Chemical Inhalation (TIH)
        </button>

        <button
          className={`nav-link ${activeTab === 'biodosimetry' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'biodosimetry' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'biodosimetry' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'biodosimetry' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('biodosimetry')}
        >
          🧬 Cytogenetic Biodosimetry (DCA)
        </button>

        <button
          className={`nav-link ${activeTab === 'iap' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'iap' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'iap' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'iap' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('iap')}
        >
          📋 Incident Action Plan (IAP)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WAY-WIGNER FALLOUT DECAY & DOSE INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'fallout' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Preset Selector Panel */}
          <div className="panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              QUICK TACTICAL SCENARIOS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {SCENARIOS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleScenarioChange(s.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedScenario === s.id ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedScenario === s.id ? '1px solid #00e5ff' : '1px solid var(--color-border)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: selectedScenario === s.id ? '#00e5ff' : 'var(--color-text)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {s.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Input Controls */}
            <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                1. Fallout Parameters & Shielding Configuration
              </h3>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reference Dose Rate at T+1 Hour (<InlineMath math="R_1" />):</span>
                  <span style={{ color: '#00e5ff' }}>{r1Rate} R/h ({ (r1Rate * 0.00877).toFixed(2) } Gy/h)</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="2000"
                  step="5"
                  value={r1Rate}
                  onChange={(e) => setR1Rate(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Standard baseline rate normalized to 1 hour post-detonation (<InlineMath math="R(t) = R_1 \cdot t^{-1.2}" />).
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Plume / Fallout Arrival Time (<InlineMath math="t_{\text{arr}}" />):</span>
                  <span style={{ color: '#00e5ff' }}>{falloutArrival} hours post-burst</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="12"
                  step="0.1"
                  value={falloutArrival}
                  onChange={(e) => setFalloutArrival(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Delay between detonation and first heavy particulate ground deposition.
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Assessment Evaluation Horizon:</span>
                  <span style={{ color: '#00e5ff' }}>{evaluationDuration} hours ({ (evaluationDuration / 24).toFixed(1) } days)</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="168"
                  step="1"
                  value={evaluationDuration}
                  onChange={(e) => setEvaluationDuration(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Active Shelter Type (FEMA / NCRP-165):</label>
                <select
                  className="form-control"
                  value={selectedShelterId}
                  onChange={(e) => setSelectedShelterId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {SHELTER_TYPES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — PF = {st.pf} (Reduces dose by {st.doseReductionPct}%)
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {activeShelter.description}
                </div>
              </div>

              {/* Way-Wigner 7-10 Rule Card */}
              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ffb703', marginBottom: '6px' }}>
                  ⚡ The "7-10 Rule" of Fallout Decay:
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                  For every 7-fold increase in elapsed time, the ground-shine radiation rate drops by approximately a factor of 10:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '10px', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--color-text-muted)' }}>T+1h</div>
                    <div style={{ fontWeight: 'bold', color: '#ff4d4d' }}>100%</div>
                    <div>{r1Rate.toFixed(0)} R/h</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--color-text-muted)' }}>T+7h</div>
                    <div style={{ fontWeight: 'bold', color: '#ff9f1c' }}>10%</div>
                    <div>{(r1Rate * 0.1).toFixed(1)} R/h</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--color-text-muted)' }}>T+49h (~2d)</div>
                    <div style={{ fontWeight: 'bold', color: '#ffb703' }}>1%</div>
                    <div>{(r1Rate * 0.01).toFixed(2)} R/h</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--color-text-muted)' }}>T+343h (~2w)</div>
                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>0.1%</div>
                    <div>{(r1Rate * 0.001).toFixed(3)} R/h</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Dose Summary Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #ff4d4d' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Unshielded Outside Dose
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4d4d', marginTop: '4px' }}>
                    {totalDoseOutside.toFixed(1)} R
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    { (totalDoseOutside * 0.00877).toFixed(2) } Gy cumulative (Over {evaluationDuration}h)
                  </div>
                  {totalDoseOutside > 450 && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ff4d4d', fontWeight: 'bold' }}>
                      ⚠️ LETHAL FIELD: LD50/60 exceeded without shelter.
                    </div>
                  )}
                </div>

                <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    In-Shelter Accrued Dose (PF={activeShelter.pf})
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                    {totalDoseShelter.toFixed(1)} R
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    { (totalDoseShelter * 0.00877).toFixed(2) } Gy cumulative
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>
                    🛡️ {doseAvoidedPct.toFixed(1)}% Radiation Blocked by Shelter
                  </div>
                </div>
              </div>

              {/* Way-Wigner Mathematical Proof Card */}
              <div className="panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '8px' }}>
                  📐 Governing Mathematical Formulation:
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  The instantaneous dose rate from mixed fission products follows the Way-Wigner empirical power law:
                  <BlockMath math="R(t) = R_1 \cdot t^{-1.2}" />
                  Integrating across time interval <InlineMath math="[t_1, t_2]" /> inside a shelter of protection factor <InlineMath math="\text{PF}" />:
                  <BlockMath math="D(t_1, t_2) = \frac{1}{\text{PF}} \int_{t_1}^{t_2} R_1 t^{-1.2} dt = \frac{5 R_1}{\text{PF}} \left[ t_1^{-0.2} - t_2^{-0.2} \right]" />
                </div>
              </div>
            </div>
          </div>

          {/* Plotly Chart: Decay & Cumulative Dose */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                📈 Real-Time Fallout Decay & Accumulated Absorbed Dose
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => setIsLogPlot(!isLogPlot)}
                >
                  {isLogPlot ? 'Switch to Linear Scale' : 'Switch to Log-Log Scale'}
                </button>
              </div>
            </div>

            <Plot
              data={[
                {
                  x: falloutTimePoints.map((p) => p.t),
                  y: falloutTimePoints.map((p) => p.rateOut),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Outside Dose Rate (R/h)',
                  line: { color: '#ff4d4d', width: 2, dash: 'dot' }
                },
                {
                  x: falloutTimePoints.map((p) => p.t),
                  y: falloutTimePoints.map((p) => p.rateIn),
                  type: 'scatter',
                  mode: 'lines',
                  name: `In-Shelter Rate (PF=${activeShelter.pf})`,
                  line: { color: '#00e5ff', width: 2 }
                },
                {
                  x: falloutTimePoints.map((p) => p.t),
                  y: falloutTimePoints.map((p) => p.doseOut),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Cumulative Outside Dose (R)',
                  yaxis: 'y2',
                  line: { color: '#ff9f1c', width: 2 }
                },
                {
                  x: falloutTimePoints.map((p) => p.t),
                  y: falloutTimePoints.map((p) => p.doseIn),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Cumulative In-Shelter Dose (R)',
                  yaxis: 'y2',
                  line: { color: '#10b981', width: 2.5 }
                }
              ]}
              layout={{
                autosize: true,
                height: 380,
                margin: { l: 50, r: 50, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: {
                  title: 'Elapsed Time Post-Burst (Hours)',
                  type: isLogPlot ? 'log' : 'linear',
                  gridcolor: 'rgba(255, 255, 255, 0.06)'
                },
                yaxis: {
                  title: 'Dose Rate (R/h)',
                  type: isLogPlot ? 'log' : 'linear',
                  gridcolor: 'rgba(255, 255, 255, 0.06)'
                },
                yaxis2: {
                  title: 'Accrued Dose (R)',
                  overlaying: 'y',
                  side: 'right',
                  type: isLogPlot ? 'log' : 'linear',
                  gridcolor: 'transparent'
                },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHELTER PROTECTION FACTOR (PF) SANDBOX */}
      {/* ========================================================================= */}
      {activeTab === 'shelter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🏢 Custom Structural Shielding & Mass Attenuation Calculator
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Add architectural and structural shielding layers to simulate engineered composite barriers against 1 MeV prompt fission gammas.
            </p>

            {/* Layer Table */}
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px' }}>Layer #</th>
                    <th style={{ padding: '8px' }}>Shielding Material</th>
                    <th style={{ padding: '8px' }}>Thickness (cm)</th>
                    <th style={{ padding: '8px' }}>Material HVL (1 MeV)</th>
                    <th style={{ padding: '8px' }}>Areal Density (g/cm²)</th>
                    <th style={{ padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((layer, idx) => {
                    const mat = MATERIAL_HVL[layer.material] || MATERIAL_HVL['Concrete'];
                    const arealG = layer.thicknessCm * mat.densityGcm3;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px' }}>Layer {idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          <select
                            className="form-control"
                            value={layer.material}
                            onChange={(e) => {
                              const newLayers = [...layers];
                              newLayers[idx].material = e.target.value;
                              setLayers(newLayers);
                            }}
                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          >
                            {Object.keys(MATERIAL_HVL).map((mKey) => (
                              <option key={mKey} value={mKey}>{MATERIAL_HVL[mKey].name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={layer.thicknessCm}
                            onChange={(e) => {
                              const newLayers = [...layers];
                              newLayers[idx].thicknessCm = Math.max(0.5, parseFloat(e.target.value) || 1);
                              setLayers(newLayers);
                            }}
                            style={{ width: '90px', fontSize: '0.8rem', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{mat.hvlCm} cm</td>
                        <td style={{ padding: '8px', color: '#00e5ff' }}>{arealG.toFixed(1)} g/cm²</td>
                        <td style={{ padding: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#ff4d4d' }}
                            onClick={() => {
                              if (layers.length > 1) {
                                setLayers(layers.filter((_, i) => i !== idx));
                              }
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setLayers([...layers, { material: 'Concrete', thicknessCm: 20 }])}
              >
                + Add Barrier Layer
              </button>
            </div>

            {/* Custom Shielding Result Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>DERIVED PROTECTION FACTOR (PF)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '4px' }}>
                  PF = {customShieldingMetrics.calculatedPf.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Gamma Transmission: { (100 / customShieldingMetrics.calculatedPf).toFixed(3) }%
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>TOTAL ATTENUATION DEPTH</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ffb703', marginTop: '4px' }}>
                  {customShieldingMetrics.totalHvlFractions.toFixed(2)} HVL
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Equals { (customShieldingMetrics.totalHvlFractions / 3.322).toFixed(2) } TVL (Tenth-Value Layers)
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>COMPOSITE MASS THICKNESS</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                  {customShieldingMetrics.totalMassAreal.toFixed(1)} g/cm²
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {customShieldingMetrics.massArealLbFt2.toFixed(1)} lb/ft² structural load
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SHELTER EGRESS & EVACUATION TIMING OPTIMIZER */}
      {/* ========================================================================= */}
      {activeTab === 'egress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              ⏱️ Evacuation vs. Shelter-in-Place Trade-off Optimizer (NCRP Report No. 165)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Determines the exact mathematical crossover point where evacuating from an inadequate shelter yields lower total cumulative dose than remaining in place, while preventing premature lethal exposure in early transit.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Initial Shelter PF (<InlineMath math="\text{PF}_1" />):</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  className="form-control"
                  value={egressInitialPf}
                  onChange={(e) => setEgressInitialPf(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>e.g. Wood house = 2.5 to 3.0</div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Transit Evacuation Time:</label>
                <input
                  type="number"
                  min="15"
                  max="360"
                  step="15"
                  className="form-control"
                  value={transitDurationMin}
                  onChange={(e) => setTransitDurationMin(parseFloat(e.target.value) || 30)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Minutes to reach safe perimeter</div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Vehicle Protection Factor:</label>
                <input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  className="form-control"
                  value={transitPf}
                  onChange={(e) => setTransitPf(parseFloat(e.target.value) || 1.5)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Standard car = 1.5</div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Destination Shelter PF (<InlineMath math="\text{PF}_2" />):</label>
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="10"
                  className="form-control"
                  value={destPf}
                  onChange={(e) => setDestPf(parseFloat(e.target.value) || 100)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Bunker or clean zone (100–1000)</div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Evaluation Horizon (Hours):</label>
                <input
                  type="number"
                  min="12"
                  max="168"
                  step="6"
                  className="form-control"
                  value={horizonHours}
                  onChange={(e) => setHorizonHours(parseFloat(e.target.value) || 48)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cumulative dose timeline (48h)</div>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div style={{
              background: egressOptimization.bestTime > falloutArrival + 12 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${egressOptimization.bestTime > falloutArrival + 12 ? '#ef4444' : '#10b981'}`,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: egressOptimization.bestTime > falloutArrival + 12 ? '#ef4444' : '#10b981' }}>
                {egressOptimization.bestTime > falloutArrival + 12
                  ? `🚨 MANDATORY SHELTER-IN-PLACE: DO NOT EVACUATE PREMATURELY`
                  : `✅ OPTIMAL DEPARTURE WINDOW IDENTIFIED`}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', marginTop: '6px', lineHeight: '1.5' }}>
                Optimal evacuation departure time is at <strong>T+{egressOptimization.bestTime.toFixed(1)} hours</strong> post-detonation.
                Departing at this time minimizes 48-hour dose to <strong>{egressOptimization.minDose.toFixed(1)} R</strong>, compared to
                <strong> {egressOptimization.stayAllTimeDose.toFixed(1)} R</strong> if remaining in the suboptimal shelter.
                {egressOptimization.bestTime > 2 && (
                  <span style={{ display: 'block', marginTop: '4px', color: '#ffb703' }}>
                    ⚠️ Evacuating immediately at T+{falloutArrival}h would result in acute lethal exposure during vehicle transit!
                  </span>
                )}
              </div>
            </div>

            {/* Egress Timing Chart */}
            <Plot
              data={[
                {
                  x: egressOptimization.results.map((r) => r.departTimeH),
                  y: egressOptimization.results.map((r) => r.totalDose),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Total Cumulative 48h Dose (R)',
                  line: { color: '#00e5ff', width: 2.5 }
                },
                {
                  x: egressOptimization.results.map((r) => r.departTimeH),
                  y: egressOptimization.results.map((r) => r.transitDose),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Dose Accrued in Transit (R)',
                  line: { color: '#ff4d4d', width: 2, dash: 'dot' }
                },
                {
                  x: [egressOptimization.bestTime],
                  y: [egressOptimization.minDose],
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Optimal Departure Time',
                  marker: { color: '#10b981', size: 12, symbol: 'star' }
                }
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Evacuation Departure Time (Hours Post-Burst)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Cumulative Absorbed Dose (R)', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TOXIC CHEMICAL INHALATION (TIC/TIH) */}
      {/* ========================================================================= */}
      {activeTab === 'chemical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🧪 Multi-Hazard Toxic Industrial Chemical (TIC) & Infiltration Model
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Models toxic chemical cloud passage and indoor air exchange infiltration (ACH) under EPA Acute Exposure Guideline Levels (AEGL) and Ten Berge toxic load exponent (<InlineMath math="L = C^n \cdot t" />).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Chemical Threat Agent:</label>
                <select
                  className="form-control"
                  value={selectedChemicalIdx}
                  onChange={(e) => setSelectedChemicalIdx(parseInt(e.target.value))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {CHEMICAL_DATABASE.map((chem, idx) => (
                    <option key={chem.cas} value={idx}>{chem.name} ({chem.formula})</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {activeChemical.description}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Outdoor Peak Plume Concentration (ppm):</label>
                <input
                  type="number"
                  min="0.1"
                  max="5000"
                  step="1"
                  className="form-control"
                  value={outdoorConcPpm}
                  onChange={(e) => setOutdoorConcPpm(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  IDLH Threshold: {activeChemical.idlh_ppm} ppm
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Shelter Air Changes per Hour (ACH):</label>
                <select
                  className="form-control"
                  value={airChangesPerHour}
                  onChange={(e) => setAirChangesPerHour(parseFloat(e.target.value))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value={1.5}>HVAC Running / Normal (ACH = 1.5 h⁻¹)</option>
                  <option value={0.5}>Standard Home Closed Doors/Windows (ACH = 0.5 h⁻¹)</option>
                  <option value={0.05}>Sealed Expedient Shelter (Plastic & Tape) (ACH = 0.05 h⁻¹)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Sealing room reduces toxic peak infiltration by ~90%.
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Plume Cloud Passage (Minutes):</label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  step="5"
                  className="form-control"
                  value={plumeDurationMin}
                  onChange={(e) => setPlumeDurationMin(parseFloat(e.target.value) || 15)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Duration toxic plume envelops building
                </div>
              </div>
            </div>

            {/* Chemical Threat Level Alert */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>INDOOR PEAK CONCENTRATION</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff' }}>
                  {chemicalSimulation.peakIndoor.toFixed(2)} ppm
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  { (chemicalSimulation.attenuationRatio * 100).toFixed(1) }% of outdoor plume
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>AEGL COMPLIANCE STATUS</div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: chemicalSimulation.hazardLevel === 'AEGL-3' ? '#ef4444' : chemicalSimulation.hazardLevel === 'AEGL-2' ? '#f97316' : '#10b981'
                }}>
                  {chemicalSimulation.hazardLevel}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  AEGL-3: {activeChemical.aegl3_ppm} ppm (Lethality threshold)
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TEN BERGE TOXIC LOAD (L)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb703' }}>
                  {chemicalSimulation.toxicLoadTenBerge.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Exponent n = {activeChemical.tenBergeN} (<InlineMath math="L = \int C^n dt" />)
                </div>
              </div>
            </div>

            {/* Infiltration Plot */}
            <Plot
              data={[
                {
                  x: chemicalSimulation.points.map((p) => p.tMin),
                  y: chemicalSimulation.points.map((p) => p.outdoor),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Outdoor Plume Concentration (ppm)',
                  line: { color: '#ff4d4d', width: 2, dash: 'dot' }
                },
                {
                  x: chemicalSimulation.points.map((p) => p.tMin),
                  y: chemicalSimulation.points.map((p) => p.indoor),
                  type: 'scatter',
                  mode: 'lines',
                  name: `Indoor Air Concentration (ACH=${airChangesPerHour})`,
                  line: { color: '#00e5ff', width: 2.5 }
                }
              ]}
              layout={{
                autosize: true,
                height: 320,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Time from Plume Release (Minutes)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Chemical Concentration (ppm)', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CYTOGENETIC BIODOSIMETRY & DCA STAGING */}
      {/* ========================================================================= */}
      {activeTab === 'biodosimetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🧬 Cytogenetic Biodosimetry: Dicentric Chromosome Assay & Multi-Parameter ARS Staging
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Gold standard IAEA TRS-405 dicentric chromosome analysis, Andrews lymphocyte kinetics, and METREPOL mass casualty clinical triage categorization.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>DCA Metaphase Cells Scored:</label>
                <input
                  type="number"
                  min="20"
                  max="1000"
                  step="10"
                  className="form-control"
                  value={scoredCells}
                  onChange={(e) => setScoredCells(parseInt(e.target.value) || 50)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Emergency triage: 50–100 cells</div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Observed Dicentric Chromosomes:</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="1"
                  className="form-control"
                  value={observedDicentrics}
                  onChange={(e) => setObservedDicentrics(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Frequency: {cytogeneticDose.Y.toFixed(3)} dic/cell
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>24h Absolute Lymphocyte Count (ALC):</label>
                <input
                  type="number"
                  min="50"
                  max="3500"
                  step="50"
                  className="form-control"
                  value={currentAlc}
                  onChange={(e) => setCurrentAlc(parseInt(e.target.value) || 1000)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Normal: 1500–3000 cells/µL
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Baseline ALC (Pre-Exposure):</label>
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  className="form-control"
                  value={baselineAlc}
                  onChange={(e) => setBaselineAlc(parseInt(e.target.value) || 2000)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Individual pre-exposure baseline
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Time to First Emesis (Vomiting):</label>
                <input
                  type="number"
                  min="10"
                  max="720"
                  step="10"
                  className="form-control"
                  value={timeToEmesisMin}
                  onChange={(e) => setTimeToEmesisMin(parseInt(e.target.value) || 60)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Minutes post-exposure
                </div>
              </div>
            </div>

            {/* Biodosimetry Result & Triage Card */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: `2px solid ${cytogeneticDose.metrepolColor}`,
              padding: '18px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    METREPOL CLINICAL TRIAGE CATEGORY
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: cytogeneticDose.metrepolColor, marginTop: '2px' }}>
                    {cytogeneticDose.metrepolTag}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Tri-Fusion Composite Dose
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                    {cytogeneticDose.compositeGy.toFixed(2)} Gy ({ (cytogeneticDose.compositeGy * 100).toFixed(0) } rad)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '4px' }}>
                  Clinical Action & Medical Countermeasures:
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                  {cytogeneticDose.triageAction}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginTop: '14px', fontSize: '0.78rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>DCA Assay Dose:</span>
                  <div style={{ fontWeight: 'bold', color: '#00e5ff' }}>
                    {cytogeneticDose.estimatedGy.toFixed(2)} Gy CI [{cytogeneticDose.dLow.toFixed(2)}, {cytogeneticDose.dHigh.toFixed(2)}]
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>ALC Kinetics Dose:</span>
                  <div style={{ fontWeight: 'bold', color: '#ffb703' }}>{cytogeneticDose.dAlcGy.toFixed(2)} Gy</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Emesis Latency Dose:</span>
                  <div style={{ fontWeight: 'bold', color: '#ff4d4d' }}>{cytogeneticDose.dEmesisGy.toFixed(2)} Gy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INCIDENT ACTION PLAN (IAP) & ICS-208 */}
      {/* ========================================================================= */}
      {activeTab === 'iap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                  📋 ICS-208 Safety Message & Tactical Incident Action Plan (IAP)
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Consolidated operational orders for Hazmat Command Post, Emergency Operations Centers (EOC), and Field Teams.
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setIsDossierOpen(true)}
                style={{ fontSize: '0.85rem' }}
              >
                📜 Export Sealed SHA-256 Record
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#00e5ff', marginBottom: '6px' }}>
                  1. RADIOLOGICAL SOURCE & FALLOUT SUMMARY
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Reference Rate (T+1h): <strong>{r1Rate} R/h</strong> ({ (r1Rate * 0.00877).toFixed(2) } Gy/h)<br />
                  • Fallout Arrival: <strong>T+{falloutArrival} hours</strong> post-burst<br />
                  • 48-Hour Unshielded Exposure: <strong>{totalDoseOutside.toFixed(1)} R</strong><br />
                  • Current Shelter: <strong>{activeShelter.name} (PF={activeShelter.pf})</strong><br />
                  • 48-Hour In-Shelter Exposure: <strong>{totalDoseShelter.toFixed(1)} R</strong> ({doseAvoidedPct.toFixed(1)}% attenuated)
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ffb703', marginBottom: '6px' }}>
                  2. EVACUATION & SHELTER ORDERS
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Optimal Evacuation Departure: <strong>T+{egressOptimization.bestTime.toFixed(1)} hours</strong><br />
                  • Transit Protection: <strong>PF {transitPf}</strong> ({transitDurationMin} min transit window)<br />
                  • Projected Evacuation Dose: <strong>{egressOptimization.minDose.toFixed(1)} R</strong><br />
                  • Early Transit Warning: DO NOT evacuate prior to T+{Math.min(12, egressOptimization.bestTime).toFixed(1)}h due to lethal early groundshine.
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981', marginBottom: '6px' }}>
                  3. MASS CASUALTY & BIODOSIMETRY
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  • Estimated Whole-Body Dose: <strong>{cytogeneticDose.compositeGy.toFixed(2)} Gy</strong><br />
                  • METREPOL Triage: <strong style={{ color: cytogeneticDose.metrepolColor }}>{cytogeneticDose.metrepolTag}</strong><br />
                  • Countermeasure: <strong>{cytogeneticDose.triageAction}</strong><br />
                  • G-CSF Indication: {cytogeneticDose.compositeGy >= 2.0 ? 'YES (Initiate Filgrastim within 24h)' : 'NO (Conservative monitoring)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Export Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default CBRNConsequenceModule;
