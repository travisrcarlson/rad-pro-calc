import { createContext, useContext } from 'react';

export type RegulatoryFrameworkId = 
  | 'NL_ANVS_BBS'  // Netherlands Bbs / ANVS (EU 2013/59/Euratom)
  | 'US_NRC'       // 10 CFR 20, EPA PAG 2017
  | 'DOE_835'      // US DOE 10 CFR Part 835 (20 mSv ACL / 50 mSv Statutory)
  | 'IAEA_GSR3'    // IAEA Safety Standards GSR Part 3 / ICRP 103
  | 'EURATOM_IRR'  // EU Council Directive 2013/59 / UK IRR17
  | 'NATO_STANAG'  // NATO STANAG 2083 / AEP-66 Military OEG
  | 'CNSC_CANADA'; // Canadian Nuclear Safety Commission SOR/2000-203

export interface DoseLimits {
  occupationalAnnualEffective_mSv: number;
  occupational5YearCumulative_mSv?: number;
  occupationalMaxSingleYear_mSv?: number;
  lensOfEyeAnnual_mSv: number;
  skinAndExtremitiesAnnual_mSv: number;
  publicAnnualEffective_mSv: number;
  embryoFetusDeclared_mSv: number;
  emergencyLifeSaving_mSv: number;
  emergencyProperty_mSv: number;
  emergencyGeneralWorker_mSv: number;
}

export interface RegulatoryFramework {
  id: RegulatoryFrameworkId;
  name: string;
  shortCode: string;
  governingBody: string;
  keyStatutes: string[];
  region: string;
  flagEmoji: string;
  accentColor: string;
  limits: DoseLimits;
  turnBackGuidanceNotes: string;
  citation: string;
}

export const REGULATORY_FRAMEWORKS: Record<RegulatoryFrameworkId, RegulatoryFramework> = {
  NL_ANVS_BBS: {
    id: 'NL_ANVS_BBS',
    name: 'Netherlands ANVS / Bbs (EU 2013/59/Euratom)',
    shortCode: 'NL-ANVS / Bbs',
    governingBody: 'Autoriteit Nucleaire Veiligheid en Stralingsbescherming (ANVS)',
    keyStatutes: ['Bbs (Stb. 2017, 404)', 'Rbs / ANVS-Verordening (Vbs)', 'EU 2013/59/Euratom'],
    region: 'Netherlands (European Union)',
    flagEmoji: '🇳🇱',
    accentColor: '#f97316',
    limits: {
      occupationalAnnualEffective_mSv: 20.0, // Exposed worker Category A ceiling (Category B <= 6 mSv/yr)
      occupational5YearCumulative_mSv: 100.0,
      occupationalMaxSingleYear_mSv: 20.0,
      lensOfEyeAnnual_mSv: 20.0,             // Bbs Art. 7.34 / EU 2013/59
      skinAndExtremitiesAnnual_mSv: 500.0,
      publicAnnualEffective_mSv: 1.0,        // Public limit 1.0 mSv/yr (site MID 0.1 mSv/yr; triviality 10 uSv/yr)
      embryoFetusDeclared_mSv: 1.0,          // Bbs Art. 7.36 unborn child remainder of pregnancy
      emergencyGeneralWorker_mSv: 100.0,
      emergencyProperty_mSv: 100.0,
      emergencyLifeSaving_mSv: 500.0
    },
    turnBackGuidanceNotes: 'Dutch Bbs (Stb. 2017, 404) & Rbs: Exposed workers Cat. A ≤ 20 mSv/yr (Cat. B ≤ 6 mSv/yr); Lens of eye ≤ 20 mSv/yr; Public ≤ 1.0 mSv/yr (site-boundary dose constraint MID: 0.1 mSv/yr; triviality 10 µSv/yr). Open-source radionuclide labs: D-lab ≤ 0.2 Re_inh, C-lab ≤ 20 Re_inh (Bewaakte zone), B-lab ≤ 2,000 Re_inh (Gecontroleerde zone). Emergency reference levels: 100 mSv urgent / 500 mSv life-saving.',
    citation: 'Besluit basisveiligheidsnormen stralingsbescherming (Bbs, Stb. 2017, 404), Regeling basisveiligheidsnormen stralingsbescherming (Rbs) & EU Council Directive 2013/59/Euratom.'
  },
  US_NRC: {
    id: 'US_NRC',
    name: 'US Nuclear Regulatory Commission / DOE',
    shortCode: 'US-NRC / 10 CFR 20',
    governingBody: 'NRC / DOE / EPA',
    keyStatutes: ['10 CFR § 20.1201', '10 CFR § 835', 'EPA-400-R-92-001 (PAG)'],
    region: 'United States',
    flagEmoji: '🇺🇸',
    accentColor: '#38bdf8',
    limits: {
      occupationalAnnualEffective_mSv: 50.0, // 5 rem
      lensOfEyeAnnual_mSv: 150.0,            // 15 rem
      skinAndExtremitiesAnnual_mSv: 500.0,   // 50 rem
      publicAnnualEffective_mSv: 1.0,        // 100 mrem (0.1 rem)
      embryoFetusDeclared_mSv: 5.0,          // 500 mrem during gestation
      emergencyGeneralWorker_mSv: 50.0,      // 5 rem standard limit
      emergencyProperty_mSv: 100.0,          // 10 rem valuable property
      emergencyLifeSaving_mSv: 250.0         // 25 rem life-saving / large populations
    },
    turnBackGuidanceNotes: 'EPA-400 PAG: 10 mR/h initial cordoning; 100 mSv (10 rem) for critical infrastructure; 250 mSv (25 rem) voluntary life saving. Individual dose exceeding 500 mSv requires medical clearance.',
    citation: 'U.S. Code of Federal Regulations, Title 10, Part 20, Standards for Protection Against Radiation; EPA PAG Manual (2017).'
  },
  DOE_835: {
    id: 'DOE_835',
    name: 'US Dept. of Energy (10 CFR 835 / STD-1098)',
    shortCode: 'US-DOE / 10 CFR 835',
    governingBody: 'US Department of Energy / NNSA',
    keyStatutes: ['10 CFR § 835.202', 'DOE-STD-1098-2017 Radiological Control (20 mSv ACL)'],
    region: 'United States (DOE Complex)',
    flagEmoji: '⚛️',
    accentColor: '#10b981',
    limits: {
      occupationalAnnualEffective_mSv: 20.0, // DOE Administrative Control Level (ACL = 2 rem/yr); Statutory = 50 mSv
      occupationalMaxSingleYear_mSv: 50.0,
      lensOfEyeAnnual_mSv: 150.0,            // 15 rem
      skinAndExtremitiesAnnual_mSv: 500.0,   // 50 rem
      publicAnnualEffective_mSv: 1.0,        // 100 mrem
      embryoFetusDeclared_mSv: 5.0,          // 500 mrem gestation
      emergencyGeneralWorker_mSv: 50.0,
      emergencyProperty_mSv: 100.0,
      emergencyLifeSaving_mSv: 250.0
    },
    turnBackGuidanceNotes: 'DOE-STD-1098-2017 Art. 211: DOE Administrative Control Level (ACL) is 20 mSv/yr (2,000 mrem/yr) without Secretarial/Contractor approval; statutory 10 CFR 835.202 ceiling is 50 mSv/yr.',
    citation: 'U.S. Code of Federal Regulations, Title 10, Part 835, Occupational Radiation Protection; DOE-STD-1098-2017.'
  },
  IAEA_GSR3: {
    id: 'IAEA_GSR3',
    name: 'IAEA Safety Standards (International)',
    shortCode: 'IAEA GSR Part 3',
    governingBody: 'International Atomic Energy Agency',
    keyStatutes: ['IAEA Safety Standards Series No. GSR Part 3', 'ICRP Publication 103 (2007)'],
    region: 'International',
    flagEmoji: '🌐',
    accentColor: '#00e5ff',
    limits: {
      occupationalAnnualEffective_mSv: 20.0, // 20 mSv/yr averaged over 5 consecutive years
      occupational5YearCumulative_mSv: 100.0,
      occupationalMaxSingleYear_mSv: 50.0,
      lensOfEyeAnnual_mSv: 20.0,             // ICRP 118 revised down to 20 mSv/yr
      skinAndExtremitiesAnnual_mSv: 500.0,
      publicAnnualEffective_mSv: 1.0,
      embryoFetusDeclared_mSv: 1.0,          // 1 mSv to fetus after declaration
      emergencyGeneralWorker_mSv: 100.0,     // 100 mSv urgent protective actions
      emergencyProperty_mSv: 100.0,          // 100 mSv
      emergencyLifeSaving_mSv: 500.0         // 500 mSv life-saving action level
    },
    turnBackGuidanceNotes: 'IAEA GSR Part 3 / GS-R-2: Reference level for emergency workers performing life-saving actions is 500 mSv. Other emergency response actions limited to 100 mSv.',
    citation: 'Radiation Protection and Safety of Radiation Sources: International Basic Safety Standards, IAEA GSR Part 3 (Vienna, 2014).'
  },
  EURATOM_IRR: {
    id: 'EURATOM_IRR',
    name: 'EURATOM / UK Health & Safety Executive',
    shortCode: 'EURATOM / IRR17',
    governingBody: 'European Commission / UK HSE & ONR',
    keyStatutes: ['EU Council Directive 2013/59/Euratom', 'UK Ionising Radiations Regulations 2017 (IRR17)'],
    region: 'European Union & United Kingdom',
    flagEmoji: '🇪🇺',
    accentColor: '#a78bfa',
    limits: {
      occupationalAnnualEffective_mSv: 20.0, // 20 mSv per calendar year
      occupational5YearCumulative_mSv: 100.0,
      occupationalMaxSingleYear_mSv: 20.0,   // Strict 20 mSv/year in UK IRR17
      lensOfEyeAnnual_mSv: 20.0,
      skinAndExtremitiesAnnual_mSv: 500.0,
      publicAnnualEffective_mSv: 1.0,
      embryoFetusDeclared_mSv: 1.0,
      emergencyGeneralWorker_mSv: 100.0,
      emergencyProperty_mSv: 100.0,
      emergencyLifeSaving_mSv: 500.0
    },
    turnBackGuidanceNotes: 'Classified Radiation Worker designation mandatory if exposure exceeds 6 mSv/year (3/10ths of limit) or 15 mSv to the lens of the eye. Investigation level typically 15 mSv.',
    citation: 'Council Directive 2013/59/Euratom; UK Statutory Instruments 2017 No. 1075, The Ionising Radiations Regulations 2017.'
  },
  NATO_STANAG: {
    id: 'NATO_STANAG',
    name: 'NATO Tactical CBRN Exposure Doctrine',
    shortCode: 'NATO STANAG 2083',
    governingBody: 'NATO Standardization Office (NSO)',
    keyStatutes: ['STANAG 2083 / AEP-66', 'Allied Joint Doctrine for CBRN Defence (AJP-3.14)'],
    region: 'NATO Alliance',
    flagEmoji: '🛡️',
    accentColor: '#ff9f1c',
    limits: {
      occupationalAnnualEffective_mSv: 50.0,
      lensOfEyeAnnual_mSv: 150.0,
      skinAndExtremitiesAnnual_mSv: 500.0,
      publicAnnualEffective_mSv: 1.0,
      embryoFetusDeclared_mSv: 5.0,
      emergencyGeneralWorker_mSv: 150.0,     // OEG Priority 1: <= 0.15 Gy
      emergencyProperty_mSv: 700.0,          // OEG Priority 2: 0.15 - 0.70 Gy
      emergencyLifeSaving_mSv: 1500.0        // OEG Priority 3: 0.70 - 1.50 Gy
    },
    turnBackGuidanceNotes: 'NATO Operational Exposure Guidance (OEG): Priority 1 (0.05-0.15 Gy) minimal mission impact; Priority 2 (0.15-0.70 Gy) minor performance degradation, 5-10% mild emesis; Priority 3 (0.70-1.50 Gy) operational casualties expected, reserved strictly for decisive mission / life rescue.',
    citation: 'NATO Standardization Agreement 2083 (STANAG 2083): Radiation Safety and Exposure Guidance in CBRN Operations.'
  },
  CNSC_CANADA: {
    id: 'CNSC_CANADA',
    name: 'Canadian Nuclear Safety Commission (CNSC)',
    shortCode: 'CNSC / SOR/2000-203',
    governingBody: 'Canadian Nuclear Safety Commission',
    keyStatutes: ['Nuclear Safety and Control Act', 'Radiation Protection Regulations (SOR/2000-203)'],
    region: 'Canada',
    flagEmoji: '🇨🇦',
    accentColor: '#ef4444',
    limits: {
      occupationalAnnualEffective_mSv: 50.0, // Max 50 mSv in 1 year
      occupational5YearCumulative_mSv: 100.0, // 100 mSv per 5-year dosimetry period
      occupationalMaxSingleYear_mSv: 50.0,
      lensOfEyeAnnual_mSv: 50.0,             // Canadian limit 50 mSv/yr (interim)
      skinAndExtremitiesAnnual_mSv: 500.0,
      publicAnnualEffective_mSv: 1.0,
      embryoFetusDeclared_mSv: 4.0,          // 4 mSv balance of pregnancy
      emergencyGeneralWorker_mSv: 100.0,
      emergencyProperty_mSv: 100.0,
      emergencyLifeSaving_mSv: 500.0
    },
    turnBackGuidanceNotes: 'CNSC Radiation Protection Regulations § 13-15: Nuclear Energy Worker (NEW) 5-year dosimetry period ceiling is 100 mSv. Pregnant NEW dose capped at 4.0 mSv.',
    citation: 'Radiation Protection Regulations (SOR/2000-203), Canadian Nuclear Safety Commission.'
  }
};

export type UnitSystemMode = 'SI' | 'TRADITIONAL' | 'DUAL';

export interface GlobalSourceContext {
  isotope: string;
  activityGBq: number;
  distanceM: number;
  shieldMaterial: 'Lead' | 'Steel' | 'Concrete' | 'Tungsten' | 'Water' | 'Depleted Uranium';
  shieldThicknessCm: number;
  label: string;
}

export interface PinnedCalculationItem {
  id: string;
  timestamp: string;
  moduleNumber: number;
  moduleLabel: string;
  modulePath: string;
  title: string;
  summary: string;
  metrics: { label: string; value: string }[];
  notes?: string;
}

export interface WhatIfExperimentAction {
  label: string;
  description?: string;
  run: () => void;
}

export interface LiveModuleTelemetry {
  moduleId: string;
  moduleTitle: string;
  regimeSummary: string;
  parameters: Record<string, string | number>;
  computedMetrics: Record<string, string | number>;
  suggestedQuestions?: string[];
  whatIfActions?: WhatIfExperimentAction[];
}

export interface RadProWorkspaceProject {
  formatVersion: '1.0';
  projectName: string;
  exportedAt: string;
  frameworkId: RegulatoryFrameworkId;
  unitSystem: UnitSystemMode;
  activeSource: GlobalSourceContext;
  pinnedResults: PinnedCalculationItem[];
}

export const GLOBAL_SOURCE_PRESETS: GlobalSourceContext[] = [
  {
    isotope: 'Co-60',
    activityGBq: 370,
    distanceM: 2.0,
    shieldMaterial: 'Lead',
    shieldThicknessCm: 5.0,
    label: 'Industrial Sterilization / Calibration Co-60 (10 Ci)'
  },
  {
    isotope: 'Ir-192',
    activityGBq: 3700,
    distanceM: 5.0,
    shieldMaterial: 'Tungsten',
    shieldThicknessCm: 3.0,
    label: 'NDT Industrial Radiography Camera Ir-192 (100 Ci)'
  },
  {
    isotope: 'Cs-137',
    activityGBq: 185,
    distanceM: 1.5,
    shieldMaterial: 'Lead',
    shieldThicknessCm: 2.5,
    label: 'Process Density / Level Gauge Cs-137 (5 Ci)'
  },
  {
    isotope: 'F-18',
    activityGBq: 0.555,
    distanceM: 1.0,
    shieldMaterial: 'Lead',
    shieldThicknessCm: 1.2,
    label: 'Clinical PET Oncology Patient F-18 FDG (15 mCi)'
  },
  {
    isotope: 'I-131',
    activityGBq: 7.4,
    distanceM: 1.5,
    shieldMaterial: 'Lead',
    shieldThicknessCm: 1.5,
    label: 'Thyroid Ablation Radiotherapy I-131 (200 mCi)'
  },
  {
    isotope: 'Am-241',
    activityGBq: 185,
    distanceM: 1.0,
    shieldMaterial: 'Steel',
    shieldThicknessCm: 2.0,
    label: 'Oilfield Well-Logging Am-241/Be Source (5 Ci)'
  }
];

// Reference ICRP-107 Specific Gamma Constants Γ in mSv·m²/(h·GBq) and Lead HVL (cm)
export const ISOTOPE_QUICK_REF: Record<string, { gammaConst_mSv_m2_h_GBq: number; hvlLeadCm: number; hvlConcreteCm: number; halfLifeStr: string }> = {
  'Co-60':   { gammaConst_mSv_m2_h_GBq: 0.3085, hvlLeadCm: 1.20, hvlConcreteCm: 6.2, halfLifeStr: '5.271 yr' },
  'Cs-137':  { gammaConst_mSv_m2_h_GBq: 0.0772, hvlLeadCm: 0.65, hvlConcreteCm: 4.8, halfLifeStr: '30.17 yr' },
  'Ir-192':  { gammaConst_mSv_m2_h_GBq: 0.1168, hvlLeadCm: 0.48, hvlConcreteCm: 4.3, halfLifeStr: '73.83 d' },
  'F-18':    { gammaConst_mSv_m2_h_GBq: 0.1430, hvlLeadCm: 0.41, hvlConcreteCm: 3.4, halfLifeStr: '109.77 min' },
  'I-131':   { gammaConst_mSv_m2_h_GBq: 0.0522, hvlLeadCm: 0.30, hvlConcreteCm: 3.1, halfLifeStr: '8.02 d' },
  'Tc-99m':  { gammaConst_mSv_m2_h_GBq: 0.0141, hvlLeadCm: 0.03, hvlConcreteCm: 2.1, halfLifeStr: '6.01 h' },
  'Am-241':  { gammaConst_mSv_m2_h_GBq: 0.0031, hvlLeadCm: 0.015, hvlConcreteCm: 1.2, halfLifeStr: '432.2 yr' },
  'Ra-226':  { gammaConst_mSv_m2_h_GBq: 0.1950, hvlLeadCm: 1.30, hvlConcreteCm: 6.5, halfLifeStr: '1600 yr' },
  'Na-24':   { gammaConst_mSv_m2_h_GBq: 0.4450, hvlLeadCm: 1.50, hvlConcreteCm: 7.2, halfLifeStr: '14.96 h' }
};

interface RegulatoryContextType {
  currentFramework: RegulatoryFramework;
  frameworkId: RegulatoryFrameworkId;
  setFrameworkId: (id: RegulatoryFrameworkId) => void;
  allFrameworks: RegulatoryFramework[];
  unitSystem: UnitSystemMode;
  setUnitSystem: (mode: UnitSystemMode) => void;
  formatDoseMSv: (mSv: number, suffix?: string) => string;
  formatDoseRateMSvHr: (mSvHr: number) => string;
  formatActivityGBq: (gBq: number) => string;
  activeSource: GlobalSourceContext;
  setActiveSource: (partial: Partial<GlobalSourceContext>) => void;
  pinnedResults: PinnedCalculationItem[];
  pinCalculation: (item: Omit<PinnedCalculationItem, 'id' | 'timestamp'>) => void;
  removePinnedCalculation: (id: string) => void;
  clearPinnedCalculations: () => void;
  liveModuleTelemetry: LiveModuleTelemetry | null;
  previousModuleTelemetry: LiveModuleTelemetry | null;
  telemetryDeltaSummary: string | null;
  setLiveModuleTelemetry: (telemetry: LiveModuleTelemetry | null) => void;
  clearLiveModuleTelemetry: () => void;
  openPhysicsTutor: (promptQuestion?: string, customTelemetry?: LiveModuleTelemetry) => void;
  openInspectorDrawer: (tab: 'source' | 'grounding' | 'pinboard' | 'guide' | 'tutor') => void;
  projectName: string;
  setProjectName: (name: string) => void;
  exportWorkspaceProject: () => void;
  importWorkspaceProject: (jsonContent: string) => { ok: boolean; message: string };
}

export const RegulatoryContext = createContext<RegulatoryContextType | undefined>(undefined);

export function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage access errors in restricted/private environments
  }
}

export function areTelemetryRecordsEqual(
  prev: LiveModuleTelemetry | null,
  next: LiveModuleTelemetry
): boolean {
  if (!prev) return false;
  if (
    prev.moduleId !== next.moduleId ||
    prev.moduleTitle !== next.moduleTitle ||
    prev.regimeSummary !== next.regimeSummary
  ) {
    return false;
  }
  const prevParamKeys = Object.keys(prev.parameters);
  const nextParamKeys = Object.keys(next.parameters);
  if (prevParamKeys.length !== nextParamKeys.length) return false;
  for (const k of nextParamKeys) {
    if (!Object.prototype.hasOwnProperty.call(prev.parameters, k)) return false;
    if (String(prev.parameters[k]) !== String(next.parameters[k])) return false;
  }
  const prevMetricKeys = Object.keys(prev.computedMetrics);
  const nextMetricKeys = Object.keys(next.computedMetrics);
  if (prevMetricKeys.length !== nextMetricKeys.length) return false;
  for (const k of nextMetricKeys) {
    if (!Object.prototype.hasOwnProperty.call(prev.computedMetrics, k)) return false;
    if (String(prev.computedMetrics[k]) !== String(next.computedMetrics[k])) return false;
  }
  const prevActions = prev.whatIfActions || [];
  const nextActions = next.whatIfActions || [];
  if (prevActions.length !== nextActions.length) return false;
  for (let i = 0; i < nextActions.length; i++) {
    if (prevActions[i].label !== nextActions[i].label) return false;
  }
  return true;
}

export const useRegulatory = (): RegulatoryContextType => {
  const context = useContext(RegulatoryContext);
  if (!context) {
    throw new Error('useRegulatory must be used within a RegulatoryProvider');
  }
  return context;
};
