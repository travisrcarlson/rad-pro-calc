import React, { createContext, useContext, useState } from 'react';

export type RegulatoryFrameworkId = 
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
  'Ra-226':  { gammaConst_mSv_m2_h_GBq: 0.2230, hvlLeadCm: 1.30, hvlConcreteCm: 6.5, halfLifeStr: '1600 yr' },
  'Na-24':   { gammaConst_mSv_m2_h_GBq: 0.4460, hvlLeadCm: 1.50, hvlConcreteCm: 7.2, halfLifeStr: '14.96 h' }
};

interface RegulatoryContextType {
  currentFramework: RegulatoryFramework;
  frameworkId: RegulatoryFrameworkId;
  setFrameworkId: (id: RegulatoryFrameworkId) => void;
  allFrameworks: RegulatoryFramework[];
  unitSystem: UnitSystemMode;
  setUnitSystem: (mode: UnitSystemMode) => void;
  formatDoseMSv: (mSv: number, suffix?: string) => string;
  formatActivityGBq: (gBq: number) => string;
  activeSource: GlobalSourceContext;
  setActiveSource: (partial: Partial<GlobalSourceContext>) => void;
  pinnedResults: PinnedCalculationItem[];
  pinCalculation: (item: Omit<PinnedCalculationItem, 'id' | 'timestamp'>) => void;
  removePinnedCalculation: (id: string) => void;
  clearPinnedCalculations: () => void;
}

const RegulatoryContext = createContext<RegulatoryContextType | undefined>(undefined);

export const RegulatoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [frameworkId, setFrameworkIdState] = useState<RegulatoryFrameworkId>(() => {
    const saved = localStorage.getItem('radpro_regulatory_framework');
    if (saved && saved in REGULATORY_FRAMEWORKS) {
      return saved as RegulatoryFrameworkId;
    }
    return 'US_NRC';
  });

  const [unitSystem, setUnitSystemState] = useState<UnitSystemMode>(() => {
    const saved = localStorage.getItem('radpro_unit_system');
    if (saved === 'SI' || saved === 'TRADITIONAL' || saved === 'DUAL') {
      return saved;
    }
    return 'SI';
  });

  const [activeSource, setActiveSourceState] = useState<GlobalSourceContext>(() => {
    try {
      const saved = localStorage.getItem('radpro_global_active_source');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isotope) return parsed;
      }
    } catch {
      // ignore
    }
    return GLOBAL_SOURCE_PRESETS[0];
  });

  const [pinnedResults, setPinnedResultsState] = useState<PinnedCalculationItem[]>(() => {
    try {
      const saved = localStorage.getItem('radpro_pinned_calculations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const setActiveSource = (partial: Partial<GlobalSourceContext>) => {
    setActiveSourceState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('radpro_global_active_source', JSON.stringify(next));
      return next;
    });
  };

  const pinCalculation = (item: Omit<PinnedCalculationItem, 'id' | 'timestamp'>) => {
    setPinnedResultsState(prev => {
      const newItem: PinnedCalculationItem = {
        ...item,
        id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      const next = [newItem, ...prev].slice(0, 30);
      localStorage.setItem('radpro_pinned_calculations', JSON.stringify(next));
      return next;
    });
  };

  const removePinnedCalculation = (id: string) => {
    setPinnedResultsState(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('radpro_pinned_calculations', JSON.stringify(next));
      return next;
    });
  };

  const clearPinnedCalculations = () => {
    setPinnedResultsState([]);
    localStorage.setItem('radpro_pinned_calculations', JSON.stringify([]));
  };

  const setFrameworkId = (id: RegulatoryFrameworkId) => {
    setFrameworkIdState(id);
    localStorage.setItem('radpro_regulatory_framework', id);
  };

  const setUnitSystem = (mode: UnitSystemMode) => {
    setUnitSystemState(mode);
    localStorage.setItem('radpro_unit_system', mode);
  };

  const formatDoseMSv = (mSv: number, suffix = ''): string => {
    const rem = mSv / 10.0;
    const mrem = mSv * 100.0;
    const tradStr = mSv >= 10 ? `${+rem.toFixed(2)} rem${suffix}` : `${+mrem.toFixed(0)} mrem${suffix}`;
    const siStr = `${mSv} mSv${suffix}`;
    if (unitSystem === 'SI') return siStr;
    if (unitSystem === 'TRADITIONAL') return tradStr;
    const tradShort = mSv >= 10 ? `${+rem.toFixed(1)} rem` : `${+mrem.toFixed(0)} mrem`;
    return `${siStr} (${tradShort})`;
  };

  const formatActivityGBq = (gBq: number): string => {
    const ci = gBq / 37.0;
    const mCi = ci * 1000.0;
    const tradStr = ci >= 0.1 ? `${+ci.toFixed(2)} Ci` : `${+mCi.toFixed(1)} mCi`;
    const siStr = `${+gBq.toFixed(2)} GBq`;
    if (unitSystem === 'SI') return siStr;
    if (unitSystem === 'TRADITIONAL') return tradStr;
    return `${siStr} (${tradStr})`;
  };

  const currentFramework = REGULATORY_FRAMEWORKS[frameworkId];
  const allFrameworks = Object.values(REGULATORY_FRAMEWORKS);

  return (
    <RegulatoryContext.Provider
      value={{
        currentFramework,
        frameworkId,
        setFrameworkId,
        allFrameworks,
        unitSystem,
        setUnitSystem,
        formatDoseMSv,
        formatActivityGBq,
        activeSource,
        setActiveSource,
        pinnedResults,
        pinCalculation,
        removePinnedCalculation,
        clearPinnedCalculations
      }}
    >
      {children}
    </RegulatoryContext.Provider>
  );
};

export const useRegulatory = (): RegulatoryContextType => {
  const context = useContext(RegulatoryContext);
  if (!context) {
    throw new Error('useRegulatory must be used within a RegulatoryProvider');
  }
  return context;
};
