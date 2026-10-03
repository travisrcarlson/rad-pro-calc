export interface IncidentScenario {
  id: string;
  title: string;
  category: 'historical' | 'industrial' | 'transport' | 'emergency_drill';
  inesLevel: number; // IAEA INES 0 - 7
  incidentDate: string;
  location: string;
  summary: string;
  sourceTerm: {
    nuclide: string;
    activity_TBq: number;
    activity_Ci: number;
    chemicalForm: string;
    physicalState: 'solid_sealed' | 'powder' | 'liquid_solution' | 'noble_gas';
    halfLife: string;
    primaryEmissions: string;
  };
  environmental: {
    distance_meters: number;
    fieldDoseRate_mSv_h: number;
    windSpeed_m_s?: number;
    stabilityClass?: string;
  };
  protectiveActions: {
    hotZoneRadius_m: number;
    warmZoneRadius_m: number;
    ppeLevel: 'Level A' | 'Level B' | 'Level C' | 'Level D';
    workerStayTimeLimit_min: number;
    countermeasureDrug?: string;
    countermeasureDose?: string;
    recommendedGuide: string; // e.g. DOT ERG Guide 163
  };
  keyLessonsLearned: string[];
  recommendedModules: {
    path: string;
    name: string;
    rationale: string;
  }[];
}

export const PRESET_SCENARIOS: IncidentScenario[] = [
  {
    id: 'goiania_1987',
    title: 'Goiânia Orphan Teletherapy Source Rupture (1987)',
    category: 'historical',
    inesLevel: 5,
    incidentDate: 'September 13, 1987',
    location: 'Goiânia, Goiás, Brazil',
    summary: 'An abandoned rotating teletherapy unit containing a Cesium-137 chloride powder source was scavenged from an abandoned radiotherapy clinic. The stainless steel capsule was breached with a sledgehammer, releasing 50.9 TBq of luminescent, highly soluble CsCl powder that was handled and shared among relatives and neighbors.',
    sourceTerm: {
      nuclide: 'Cs-137',
      activity_TBq: 50.9,
      activity_Ci: 1375.0,
      chemicalForm: 'Cesium Chloride (CsCl) Salt',
      physicalState: 'powder',
      halfLife: '30.08 Years',
      primaryEmissions: 'Beta- (514 keV) & Ba-137m Gamma (662 keV)'
    },
    environmental: {
      distance_meters: 1.0,
      fieldDoseRate_mSv_h: 4600.0, // 4.6 Gy/h contact
      windSpeed_m_s: 1.5,
      stabilityClass: 'C'
    },
    protectiveActions: {
      hotZoneRadius_m: 85.0,
      warmZoneRadius_m: 250.0,
      ppeLevel: 'Level B',
      workerStayTimeLimit_min: 1.2,
      countermeasureDrug: 'Prussian Blue (Insoluble Ferric Hexacyanoferrate)',
      countermeasureDose: '3 g orally 3 times daily (total 9 g/day) to inhibit enterohepatic reabsorption and accelerate fecal excretion.',
      recommendedGuide: 'DOT ERG Guide 163 (Radioactive Materials - High to Very High Activity)'
    },
    keyLessonsLearned: [
      'Regulatory accountability and national registries for retired teletherapy sources (IAEA Code of Conduct on the Safety and Security of Radioactive Sources).',
      'First major international field deployment of Prussian Blue decorporation therapy, accelerating biological half-life from 110 days down to ~30 days.',
      'Recognition of luminescent blue radioluminescence (Cherenkov/fluorescence in air) as a diagnostic sign of high-activity ionizing radiation.'
    ],
    recommendedModules: [
      { path: '/first-responder', name: 'Tactical CBRN Response', rationale: 'Time-to-emesis ARS triage nomogram and REAC/TS Prussian Blue decorporation protocols.' },
      { path: '/internal-dose', name: 'Internal Dosimetry', rationale: 'Biokinetic systemic retention modeling and decorporation half-life comparison.' },
      { path: '/dose', name: 'Dose Calculator', rationale: 'Point source gamma attenuation and stay-time calculation.' }
    ]
  },
  {
    id: 'ir192_radiography_disconnect',
    title: 'Industrial Radiography Ir-192 Pigtail Disconnect (10 CFR 34)',
    category: 'industrial',
    inesLevel: 3,
    incidentDate: 'Standard Industrial Event Model',
    location: 'Pipeline Construction Trench',
    summary: 'During pipeline non-destructive testing (NDT), a 3.7 TBq (100 Ci) Ir-192 source capsule failed to retract into the radiography exposure device (camera) after drive cable shear. The unshielded source remains stuck in the flexible guide tube 1.5 meters from the crew.',
    sourceTerm: {
      nuclide: 'Ir-192',
      activity_TBq: 3.70,
      activity_Ci: 100.0,
      chemicalForm: 'Iridium Metal Pellets in Welded Capsule',
      physicalState: 'solid_sealed',
      halfLife: '73.83 Days',
      primaryEmissions: 'Complex Gamma Spectrum (308, 316, 468 keV)'
    },
    environmental: {
      distance_meters: 1.5,
      fieldDoseRate_mSv_h: 800.0, // ~80 R/h at 1.5m
      windSpeed_m_s: 0.0
    },
    protectiveActions: {
      hotZoneRadius_m: 65.0,
      warmZoneRadius_m: 140.0,
      ppeLevel: 'Level D',
      workerStayTimeLimit_min: 1.8,
      recommendedGuide: '10 CFR § 34.41 / DOT ERG Guide 163'
    },
    keyLessonsLearned: [
      'Survey meter must be actively monitored continuously during source retraction; never assume mechanical crank counter equals source position.',
      'Emergency source retrieval equipment (collimators, 1-meter remote handling tongs, lead shot bags) must be staged prior to commencing radiographic exposures.',
      'Emergency perimeter rope-off boundary must satisfy 10 CFR 34.41 (2 mR/h restricted boundary).'
    ],
    recommendedModules: [
      { path: '/dose', name: 'Dose Calculator', rationale: 'Calculate distance falloff and lead collimator attenuation.' },
      { path: '/first-responder', name: 'Tactical CBRN Response', rationale: 'Establish 2 mR/h restricted cordon boundary and worker entry dose limits.' }
    ]
  },
  {
    id: 'tokaimura_1999',
    title: 'Tokaimura Criticality Excursion (1999)',
    category: 'historical',
    inesLevel: 4,
    incidentDate: 'September 30, 1999',
    location: 'JCO Fuel Conversion Facility, Tokai, Ibaraki, Japan',
    summary: 'Technicians preparing Joyo experimental fast reactor fuel added 16.6 kg of enriched (18.8% U-235) uranyl nitrate solution into a precipitation tank with non-favorable geometry, exceeding the critical mass (~5.5 kg). A burst criticality occurred, emitting intense prompt neutron and gamma pulses followed by sustained subcritical fission for 20 hours.',
    sourceTerm: {
      nuclide: 'U-235 / Fission Products',
      activity_TBq: 18.5,
      activity_Ci: 500.0,
      chemicalForm: 'Uranyl Nitrate Aqueous Solution',
      physicalState: 'liquid_solution',
      halfLife: '7.04e8 Years (U-235)',
      primaryEmissions: 'Prompt Fission Neutrons & Prompt Gammas'
    },
    environmental: {
      distance_meters: 1.0,
      fieldDoseRate_mSv_h: 15000.0, // > 15 Sv/h prompt
      windSpeed_m_s: 2.0,
      stabilityClass: 'D'
    },
    protectiveActions: {
      hotZoneRadius_m: 350.0,
      warmZoneRadius_m: 1000.0,
      ppeLevel: 'Level B',
      workerStayTimeLimit_min: 0.1,
      recommendedGuide: 'IAEA Safety Reports Series No. 27'
    },
    keyLessonsLearned: [
      'Strict geometrical criticality safety controls must supersede administrative operational workarounds.',
      'Induced Sodium-24 (Na-24) activation in human blood (gamma peak 1.368 MeV and 2.754 MeV) serves as the primary gold standard for biological neutron dosimetry.',
      'Criticality alarm systems (CAS) must be coupled to immediate, non-hesitant evacuation routes.'
    ],
    recommendedModules: [
      { path: '/criticality', name: 'Criticality & Reactor Core', rationale: 'Analyze 4-factor / 6-factor formula, infinite multiplication, and geometric buckling.' },
      { path: '/spectroscopy', name: 'Gamma Spectroscopy (MCA)', rationale: 'Identify Na-24 blood activation peaks (1368 keV, 2754 keV) for neutron dosimetry.' }
    ]
  },
  {
    id: 'type_b_transport_incident',
    title: 'Type B Transport Packaging Incident (IAEA SSR-6 / ERG 164)',
    category: 'transport',
    inesLevel: 1,
    incidentDate: 'Operational Drill Model',
    location: 'Interstate Highway Overpass',
    summary: 'A commercial flatbed transporter carrying a Type B(U) certified Co-60 industrial irradiator cask was involved in a rollover collision. Cask outer impact limiters sustained physical damage, but containment boundary integrity remains intact.',
    sourceTerm: {
      nuclide: 'Co-60',
      activity_TBq: 370.0,
      activity_Ci: 10000.0,
      chemicalForm: 'Cobalt Metal Slugs in Stainless Cask',
      physicalState: 'solid_sealed',
      halfLife: '5.27 Years',
      primaryEmissions: 'High Energy Gammas (1.173 MeV & 1.332 MeV)'
    },
    environmental: {
      distance_meters: 1.0,
      fieldDoseRate_mSv_h: 0.18, // 18 mR/h at 1m (Transport Index TI = 1.8)
      windSpeed_m_s: 3.5
    },
    protectiveActions: {
      hotZoneRadius_m: 25.0,
      warmZoneRadius_m: 60.0,
      ppeLevel: 'Level C',
      workerStayTimeLimit_min: 60.0,
      recommendedGuide: 'DOT ERG Guide 164 (Radioactive Materials - Special Form)'
    },
    keyLessonsLearned: [
      'Type B packages are engineered and certified to survive 9-meter drop onto unyielding target, puncture pin drop, and 800°C 30-minute hydrocarbon fire.',
      'Radiation survey must verify 1-meter dose rate does not exceed 10 mSv/h (1 R/h) under post-accident test conditions.',
      'Surface removable contamination wipe test (< 4 Bq/cm² beta/gamma) required before uprighting.'
    ],
    recommendedModules: [
      { path: '/transport', name: 'Transport Packaging (SSR-6)', rationale: 'Verify A1/A2 limits, Transport Index (TI), and Type B accident test criteria.' },
      { path: '/shielding', name: 'Shielding & ALARA PAGs', rationale: 'Calculate lead/steel cask attenuation factors.' }
    ]
  },
  {
    id: 'npp_steam_generator_leak',
    title: 'Civil Nuclear Power Plant Steam Generator Tube Rupture (EPA PAG)',
    category: 'emergency_drill',
    inesLevel: 3,
    incidentDate: 'Standard Civil Drill Model',
    location: 'Commercial Pressurized Water Reactor (PWR)',
    summary: 'Double-ended guillotine rupture of 1 steam generator U-tube transferring reactor primary coolant into the secondary steam loop. Safety relief valves lift, releasing noble gases and volatile iodines into the atmosphere.',
    sourceTerm: {
      nuclide: 'Xe-133 & I-131',
      activity_TBq: 185.0,
      activity_Ci: 5000.0,
      chemicalForm: 'Noble Gas / Volatile Methyl Iodide',
      physicalState: 'noble_gas',
      halfLife: '5.24 Days (Xe-133) / 8.02 Days (I-131)',
      primaryEmissions: 'Xe-133 Gamma (81 keV) & I-131 Gamma (364 keV)'
    },
    environmental: {
      distance_meters: 1500.0,
      fieldDoseRate_mSv_h: 0.45,
      windSpeed_m_s: 4.5,
      stabilityClass: 'D'
    },
    protectiveActions: {
      hotZoneRadius_m: 1600.0,
      warmZoneRadius_m: 8000.0,
      ppeLevel: 'Level C',
      workerStayTimeLimit_min: 120.0,
      countermeasureDrug: 'Potassium Iodide (KI)',
      countermeasureDose: 'Adults: 130 mg; Children 3-18 yrs: 65 mg; Infants: 16 mg to block thyroid uptake of radioactive iodine.',
      recommendedGuide: 'EPA-400-R-92-001 (PAG Manual) / DOT ERG Guide 163'
    },
    keyLessonsLearned: [
      'Early phase evacuation triggered if projected 4-day TEDE exceeds 1 rem (10 mSv).',
      'Potassium Iodide (KI) thyroid blocking is most effective when taken within 4 hours prior to or at time of exposure.',
      'Gaussian plume dispersion model tracks downwind centerline sector contamination.'
    ],
    recommendedModules: [
      { path: '/plume', name: 'Plume Atmospheric Modeling', rationale: 'Compute Gaussian downwind ground concentration and sector isopleths.' },
      { path: '/first-responder', name: 'Tactical CBRN Response', rationale: 'EPA-400 PAG threshold evaluation and KI age-stratified dosing tables.' }
    ]
  }
];

export function getScenarioById(id: string): IncidentScenario | undefined {
  return PRESET_SCENARIOS.find(s => s.id === id);
}

export function exportScenarioToJson(scenario: IncidentScenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function importScenarioFromJson(jsonStr: string): IncidentScenario {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.id || !parsed.title || !parsed.sourceTerm) {
    throw new Error('Invalid .radcase JSON structure');
  }
  return parsed as IncidentScenario;
}
