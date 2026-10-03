import React, { createContext, useContext, useState } from 'react';

export type RegulatoryFrameworkId = 
  | 'US_NRC'       // 10 CFR 20, 10 CFR 835, EPA PAG 2017
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

interface RegulatoryContextType {
  currentFramework: RegulatoryFramework;
  frameworkId: RegulatoryFrameworkId;
  setFrameworkId: (id: RegulatoryFrameworkId) => void;
  allFrameworks: RegulatoryFramework[];
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

  const setFrameworkId = (id: RegulatoryFrameworkId) => {
    setFrameworkIdState(id);
    localStorage.setItem('radpro_regulatory_framework', id);
  };

  const currentFramework = REGULATORY_FRAMEWORKS[frameworkId];
  const allFrameworks = Object.values(REGULATORY_FRAMEWORKS);

  return (
    <RegulatoryContext.Provider value={{ currentFramework, frameworkId, setFrameworkId, allFrameworks }}>
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
