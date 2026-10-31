import { type GlobalSourceContext } from '../context/RegulatoryContext';

export interface ModuleWorkedExample {
  title: string;
  scenario: string;
  inputs: { label: string; value: string }[];
  steps: string[];
  result: string;
  queryParams?: string;
  sourceSync?: Partial<GlobalSourceContext>;
}

export const MODULE_WORKED_EXAMPLES: Record<number, ModuleWorkedExample> = {
  1: {
    title: 'Hot-Cell Window Co-60 External Dose Rate & Lead Shielding Check',
    scenario:
      'A 370 GBq (10 Ci) Co-60 sterilization source is positioned 2.0 m from an operator station behind a 4.8 cm lead (Pb) barrier. Determine the unshielded and broad-beam shielded ambient dose equivalent rate H*(10).',
    inputs: [
      { label: 'Radionuclide', value: 'Co-60 (E_γ = 1.173 & 1.332 MeV)' },
      { label: 'Activity (A)', value: '370 GBq (10.0 Ci)' },
      { label: 'Standoff Distance (r)', value: '2.0 m' },
      { label: 'Shielding Barrier', value: '4.8 cm Lead (Pb, HVL = 1.20 cm)' }
    ],
    steps: [
      'Unshielded dose rate at r = 2.0 m using ICRP-107 Γ(Co-60) = 0.3085 mSv·m²/(h·GBq): H*(10)_0 = (0.3085 × 370) / 2.0² = 28.54 mSv/h (2.854 rem/h).',
      'Number of Half-Value Layers: n = 4.8 cm / 1.20 cm = 4.0 HVLs (optical thickness μx = 4 × ln(2) = 2.773 mfp).',
      'Narrow-beam attenuation: 2⁻⁴ = 0.0625; Taylor/GP broad-beam buildup factor in Pb at 2.77 mfp: B(μx) ≈ 2.15.',
      'Broad-beam shielded dose rate: H*(10) = 28.54 × 0.0625 × 2.15 = 3.83 mSv/h (383 mrem/h).'
    ],
    result: 'Unshielded: 28.54 mSv/h → Shielded (with buildup): 3.83 mSv/h (ALARA stay time to 20 mSv DOE ACL = 5.22 h).',
    queryParams: '?isotope=Co-60&activity=370&unit=GBq&distance=2.0',
    sourceSync: { isotope: 'Co-60', activityGBq: 370, distanceM: 2.0, shieldMaterial: 'Lead', shieldThicknessCm: 4.8 }
  },
  2: {
    title: 'Multi-Source Hot Lab Room Ray-AABB 3D Dose Field Superposition',
    scenario:
      'Two point sources—a 185 GBq Cs-137 source at (-2, 0, 1) m and a 370 GBq Co-60 source at (+2, 0, 1) m—are separated from a central walkway (0, 2, 1) m by a 20 cm concrete monolith.',
    inputs: [
      { label: 'Source 1', value: 'Cs-137, 185 GBq at (-2, 0, 1) m' },
      { label: 'Source 2', value: 'Co-60, 370 GBq at (+2, 0, 1) m' },
      { label: 'Barrier', value: '20 cm Concrete Wall (ρ = 2.35 g/cm³)' },
      { label: 'Receptor Point', value: '(0, 2, 1) m (r = 2.828 m from each source)' }
    ],
    steps: [
      'Compute 3D Euclidean ray distance r = √(2² + 2²) = 2.828 m from each source to the receptor.',
      'Kay-Kajiya Ray-AABB intersection yields oblique path length Δs = 20 cm / cos(45°) = 28.28 cm through the concrete slab.',
      'Superimpose attenuated dose contributions from Source 1 (Cs-137) and Source 2 (Co-60) including concrete GP buildup.'
    ],
    result: 'Combined shielded receptor dose rate = 0.42 mSv/h (Green/Amber transition zone on 3D iso-surface mesh).',
    sourceSync: { isotope: 'Co-60', activityGBq: 370, distanceM: 2.83, shieldMaterial: 'Concrete', shieldThicknessCm: 20 }
  },
  3: {
    title: 'Acute I-131 Inhalation Intake, Thyroid Bioassay & Radon-222 Working Level',
    scenario:
      'A nuclear medicine technologist inhales airborne I-131 vapor (Type F, AMAD 5 µm). A 24-hour neck thyroid count measures 18.5 kBq retained in the thyroid.',
    inputs: [
      { label: 'Radionuclide & Clearance', value: 'I-131 (Type F Fast Absorption, f₁ = 1.0)' },
      { label: 'Measured Thyroid Burden M(1 d)', value: '18,500 Bq (18.5 kBq) at t = 1 day' },
      { label: 'ICRP-78 Retention Fraction m(1 d)', value: '0.25 (25% of inhaled intake in thyroid at 24 h)' },
      { label: 'ICRP-119 Dose Coefficient e(50)', value: '1.10 × 10⁻⁸ Sv/Bq (Inhalation Type F)' }
    ],
    steps: [
      'Back-calculate acute intake I₀ from bioassay measurement: I₀ = M(1 d) / m(1 d) = 18,500 Bq / 0.25 = 74,000 Bq (74 kBq).',
      'Compute 50-year Committed Effective Dose: E(50) = I₀ × e(50) = 74,000 Bq × 1.10 × 10⁻⁸ Sv/Bq = 0.814 mSv (81.4 mrem).',
      'Compare against US NRC 10 CFR 20 ALI (2.0 MBq) → 3.7% of Annual Limit on Intake.'
    ],
    result: 'Estimated Intake I₀ = 74.0 kBq → Committed Effective Dose E(50) = 0.814 mSv (Thyroid organ dose ≈ 15.5 mSv).',
    queryParams: '?isotope=I-131&activity=0.000074',
    sourceSync: { isotope: 'I-131', activityGBq: 0.000074, distanceM: 1.0 }
  },
  4: {
    title: 'Industrial Ir-192 Vault Multi-Layer Shielding & AAPM TG-108 PET Barrier',
    scenario:
      'Design a composite Lead + Concrete wall for a 3,700 GBq (100 Ci) Ir-192 NDT radiography bay at r = 4.0 m to reduce the outside public dose rate below 0.02 mSv/h (2 mrem/h).',
    inputs: [
      { label: 'Source', value: 'Ir-192, A = 3,700 GBq (100 Ci)' },
      { label: 'Distance (r)', value: '4.0 m' },
      { label: 'Layer 1 + Layer 2', value: '3.0 cm Lead (Pb) + 30.0 cm Concrete' },
      { label: 'Design Target', value: '≤ 0.020 mSv/h (Uncontrolled Public Boundary)' }
    ],
    steps: [
      'Unshielded dose rate at 4.0 m: H*(10)_0 = (0.1168 × 3700) / 4.0² = 27.01 mSv/h.',
      'Required total transmission factor B·exp(-Σμx) ≤ 0.020 / 27.01 = 7.40 × 10⁻⁴ (3.13 TVLs).',
      '3.0 cm Pb provides 6.25 HVLs (1.88 TVLs) and 30 cm Concrete provides 6.98 HVLs (2.10 TVLs); Kalos dual-layer buildup B_comp ≈ 3.8.',
      'Resulting shielded dose rate outside vault = 0.0112 mSv/h (1.12 mrem/h) — compliant with 10 CFR 20.1301.'
    ],
    result: 'Shielded Dose Rate = 0.0112 mSv/h (44% safety margin below the 0.020 mSv/h uncontrolled limit).',
    queryParams: '?isotope=Ir-192&activity=3700&distance=4.0&material=Lead&thickness=3.0',
    sourceSync: { isotope: 'Ir-192', activityGBq: 3700, distanceM: 4.0, shieldMaterial: 'Lead', shieldThicknessCm: 3.0 }
  },
  5: {
    title: 'Multi-Task RWP Stay-Time Budget & Extremity Ring Dosimetry Audit',
    scenario:
      'A maintenance technician with 8.5 mSv YTD cumulative dose must replace a valve at 0.35 m contact distance from a 18.5 GBq Co-60 pipe trap (body at 0.80 m) under a 2.0 mSv RWP administrative ceiling.',
    inputs: [
      { label: 'Source in Pipe Trap', value: 'Co-60, 18.5 GBq (0.5 Ci)' },
      { label: 'Torso Distance / Hand Distance', value: 'r_torso = 0.80 m | r_hand = 0.25 m' },
      { label: 'RWP Dose Ceiling', value: '2.0 mSv (200 mrem) Whole-Body DDE' },
      { label: 'Planned Task Duration', value: '12 minutes (0.20 hours)' }
    ],
    steps: [
      'Torso dose rate at 0.80 m: H*(10) = (0.3085 × 18.5) / 0.80² = 8.92 mSv/h.',
      'Hand extremity dose rate at 0.25 m: H_p(0.07) = (0.3085 × 18.5) / 0.25² = 91.32 mSv/h.',
      'For a 12-minute (0.20 h) task: Torso DDE = 1.78 mSv (< 2.0 mSv RWP limit); Hand SDE = 18.26 mSv (< 500 mSv annual limit).',
      'Maximum permissible stay time before hitting 2.0 mSv RWP alarm = (2.0 / 8.92) × 60 = 13.45 minutes.'
    ],
    result: 'Task DDE = 1.78 mSv, Extremity Dose = 18.26 mSv, Max Stay Time = 13 min 27 sec.',
    sourceSync: { isotope: 'Co-60', activityGBq: 18.5, distanceM: 0.8, shieldMaterial: 'Steel', shieldThicknessCm: 0 }
  },
  6: {
    title: 'Multi-Point Survey Contour Interpolation & Hot-Spot Localization',
    scenario:
      'A radiological survey around a waste storage drum array records 4.2 mSv/h at (2, 2) m and 1.1 mSv/h at (6, 2) m. Generate the 2D inverse-distance-squared iso-dose contour map to mark the 0.02 mSv/h rope boundary.',
    inputs: [
      { label: 'Primary Drum Source', value: 'Co-60 Waste Drum (92.5 GBq) at (0, 0) m' },
      { label: 'Secondary Drum Source', value: 'Cs-137 Waste Drum (185 GBq) at (4, 3) m' },
      { label: 'Grid Domain', value: '20 m × 20 m Facility Floor Plan' },
      { label: 'Boundary Thresholds', value: '0.02 mSv/h (Radiation Area) & 1.0 mSv/h (High Radiation Area)' }
    ],
    steps: [
      'Evaluate 1/r² + buildup kernel across the 2D Cartesian grid for both drums.',
      'Trace the 1.0 mSv/h High Radiation Area (HRA) contour around the Co-60 and Cs-137 drums.',
      'Verify minimum perimeter standoff radius r = 37.8 m for the 0.02 mSv/h uncontrolled boundary (or add 2.5 cm Pb drum jackets).'
    ],
    result: 'High Radiation Area (1.0 mSv/h) extends 5.6 m from Drum 1; 2.5 cm Pb shielding shrinks the HRA radius to 1.3 m.',
    sourceSync: { isotope: 'Co-60', activityGBq: 92.5, distanceM: 5.6, shieldMaterial: 'Lead', shieldThicknessCm: 2.5 }
  },
  7: {
    title: 'End-to-End Hot Cell Valve Replacement Mission Playbook',
    scenario:
      'Execute a 4-stage operational workflow combining Source Characterization (M01), Shielding Optimization (M04), Worker Stay-Time Budgeting (M05), and Transport Packaging (M15).',
    inputs: [
      { label: 'Playbook Preset', value: 'Industrial Radiography Ir-192 Source Recovery' },
      { label: 'Source Activity', value: '1,850 GBq (50 Ci) Ir-192' },
      { label: 'Temporary Shield', value: '3.0 cm Tungsten Collimator' },
      { label: 'Overpack Cask', value: 'Type B(U) Container (TI = 1.8)' }
    ],
    steps: [
      'Stage 1: Compute unshielded hazard radius (1.0 mSv/h at r = 14.7 m).',
      'Stage 2: Place 3.0 cm Tungsten collimator (attenuates forward dose rate by 98.4%).',
      'Stage 3: Verify recovery technician dose (< 1.5 mSv during 4-minute tong retrieval).',
      'Stage 4: Confirm IAEA SSR-6 Yellow-II / Yellow-III label and TI = 1.8 for highway shipment.'
    ],
    result: 'All 4 operational stages verified compliant under US NRC 10 CFR 20 / 49 CFR 173.',
    sourceSync: { isotope: 'Ir-192', activityGBq: 1850, distanceM: 3.0, shieldMaterial: 'Tungsten', shieldThicknessCm: 3.0 }
  },
  8: {
    title: 'Urban Cs-137 RDD ("Dirty Bomb") First Responder Perimeter & Turn-Back',
    scenario:
      'First responders arrive at an explosive dispersal of 37 TBq (1,000 Ci) Cs-137. Establish the IAEA / NCRP-161 Inner Cordoned Area (100 µSv/h), Hot-Zone Turn-Back limit, and Life-Saving stay time.',
    inputs: [
      { label: 'Dispersed Radionuclide', value: 'Cs-137, A = 37,000 GBq (1,000 Ci)' },
      { label: 'Inner Cordon Criterion', value: '0.10 mSv/h (100 µSv/h / 10 mR/h)' },
      { label: 'Downwind Stability Class', value: 'Pasquill Class D, Wind u = 4.0 m/s' },
      { label: 'Emergency Guidance', value: 'EPA PAG / IAEA EPR-First Responders (250 mSv Life-Saving)' }
    ],
    steps: [
      'Compute unshielded point-equivalent standoff for 0.10 mSv/h: r = √((0.0772 × 37000) / 0.10) = 169 m (minimum 300 m explosive fragmentation cordon applies).',
      'Evaluate downwind ground-shine + inhalation plume zone: 1.0 mSv/h inner hot zone extends 420 m downwind.',
      'Calculate life-saving rescue stay time at r = 15 m (dose rate = 12.7 mSv/h): t_max = 250 mSv / 12.7 mSv/h = 19.7 hours.'
    ],
    result: 'Establish 300 m radial upwind cordon, 850 m downwind shelter-in-place zone, and APF=1000 SCBA inside hot zone.',
    queryParams: '?isotope=Cs-137&activity=37000&distance=15',
    sourceSync: { isotope: 'Cs-137', activityGBq: 37000, distanceM: 15.0 }
  },
  9: {
    title: 'Multi-Sensor Inverse Localization of an Orphan Co-60 Source',
    scenario:
      'Three survey team readings are logged in a scrap metal yard: Sensor A at (0, 0) reads 1.234 mSv/h, Sensor B at (10, 0) reads 0.494 mSv/h, and Sensor C at (0, 10) reads 0.494 mSv/h. Locate the unknown Co-60 source and estimate its activity.',
    inputs: [
      { label: 'Sensor A (0, 0) m', value: '1.234 mSv/h' },
      { label: 'Sensor B (10, 0) m', value: '0.494 mSv/h' },
      { label: 'Sensor C (0, 10) m', value: '0.494 mSv/h' },
      { label: 'Assumed Isotope', value: 'Co-60 (Γ = 0.3085 mSv·m²/(h·GBq))' }
    ],
    steps: [
      'Equal readings at (10, 0) and (0, 10) place the source along the diagonal x₀ = y₀.',
      'Distance ratio r_B² / r_A² = 1.234 / 0.494 = 2.50 → solving yields source coordinates (x₀, y₀) = (4.0, 4.0) m (r_A = 5.657 m, r_B = 8.944 m).',
      'Back-calculate source activity: A = H*(10)_A × r_A² / Γ = 1.234 × 32.0 / 0.3085 = 128.0 GBq (3.46 Ci).'
    ],
    result: 'Source localized at (4.00 m, 4.00 m) with estimated activity A = 128.0 GBq (3.46 Ci) Co-60.',
    sourceSync: { isotope: 'Co-60', activityGBq: 128, distanceM: 5.66 }
  },
  10: {
    title: 'Geospatial Fallout Plume & Evacuation Sector Overlay on Facility GIS',
    scenario:
      'Project a 15° wind-corridor plume (wind from 240° WSW at 5 m/s) over a tactical facility map to identify buildings requiring immediate evacuation vs. sheltering.',
    inputs: [
      { label: 'Release Origin', value: 'Reactor Vent Stack (0, 0)' },
      { label: 'Wind Vector', value: 'From 240° WSW (Blowing toward 060° ENE at 5.0 m/s)' },
      { label: 'Release Term', value: 'I-131 (5,000 GBq) + Cs-137 (500 GBq)' },
      { label: 'PAG Thresholds', value: '10 mSv (Evacuation) & 1 mSv (Public Shelter)' }
    ],
    steps: [
      'Align plume centerline vector along azimuth 060° ENE using the interactive wind rose.',
      'Place perimeter dosimeter markers along the 500 m and 1,500 m downwind arcs.',
      'Export GeoJSON / KML tactical overlay for Incident Command.'
    ],
    result: '10 mSv EPA PAG evacuation wedge extends 1.45 km along azimuth 060° ENE (crosswind width 380 m).',
    sourceSync: { isotope: 'I-131', activityGBq: 5000, distanceM: 500 }
  },
  11: {
    title: 'Elevated Stack I-131 Release Gaussian Plume & Pasquill-Gifford χ/Q',
    scenario:
      'Calculate the ground-level centerline air concentration χ(x,0,0) and atmospheric dilution factor χ/Q at x = 1,000 m downwind from a 30 m effective stack release of 1.0 GBq/s I-131 under Pasquill Stability Class D and wind speed u = 4.0 m/s.',
    inputs: [
      { label: 'Release Rate (Q)', value: '1.0 × 10⁹ Bq/s (1.0 GBq/s I-131)' },
      { label: 'Effective Stack Height (H)', value: '30.0 m' },
      { label: 'Downwind Distance (x)', value: '1,000 m (1.0 km)' },
      { label: 'Meteorology', value: 'Pasquill Class D (Neutral), Wind Speed u = 4.0 m/s' }
    ],
    steps: [
      'Evaluate Briggs Rural Class D dispersion coefficients at x = 1,000 m: σ_y = 0.08·x·(1 + 0.0001x)⁻⁰·⁵ = 76.28 m; σ_z = 0.06·x·(1 + 0.0015x)⁻⁰·⁵ = 37.95 m.',
      'Compute ground-reflection exponential factor: exp(-H² / (2·σ_z²)) = exp(-900 / 2880.4) = 0.7316.',
      'Calculate centerline χ/Q = 0.7316 / (π × 4.0 × 76.28 × 37.95) = 2.01 × 10⁻⁵ s/m³ → χ = 20,100 Bq/m³.'
    ],
    result: 'Centerline Dilution Factor χ/Q = 2.01 × 10⁻⁵ s/m³; Ground Air Concentration χ = 20.1 kBq/m³.',
    sourceSync: { isotope: 'I-131', activityGBq: 3600, distanceM: 1000 }
  },
  12: {
    title: 'FRMAC Downwind TEDE & KI Thyroid Protection Decision Analysis',
    scenario:
      'Assess whether Potassium Iodide (KI) prophylaxis is warranted at 2.0 km downwind from a 50 TBq I-131 containment venting lasting 2 hours under Class E stability.',
    inputs: [
      { label: 'Isotope & Release', value: 'I-131, Total Release = 50 TBq (1,350 Ci)' },
      { label: 'Receptor Standoff', value: '2,000 m Downwind Centerline' },
      { label: 'Stability & Wind', value: 'Pasquill Class E, u = 2.5 m/s' },
      { label: 'FDA / EPA KI PAG', value: '50 mSv (5 rem) Projected Child/Adult Thyroid Dose' }
    ],
    steps: [
      'Compute time-integrated air concentration Ψ = Q · (χ/Q) at x = 2.0 km.',
      'Multiply by adult breathing rate B = 3.33 × 10⁻⁴ m³/s and ICRP-119 thyroid dose coefficient e_thyroid(I-131) = 2.1 × 10⁻⁷ Sv/Bq.',
      'Projected uncommitted thyroid dose = 142 mSv (14.2 rem), exceeding the 50 mSv FDA KI threshold.'
    ],
    result: 'Projected Thyroid Dose = 142 mSv (> 50 mSv PAG) → Issue 130 mg KI prophylaxis immediately and shelter/evacuate.',
    sourceSync: { isotope: 'I-131', activityGBq: 50000, distanceM: 2000 }
  },
  13: {
    title: '10 kt Surface Nuclear Detonation Glasstone-Dolan Blast, Thermal & WSEG-10 Fallout',
    scenario:
      'Evaluate the 5 psi structural blast radius, 2nd-degree thermal burn radius, prompt 4.0 Gy LD50 radiation radius, and H+1 fallout dose rate for a 10 kt surface nuclear detonation.',
    inputs: [
      { label: 'Explosive Yield (W)', value: '10.0 kilotons (kt) TNT Equivalent' },
      { label: 'Height of Burst (HOB)', value: '0 m (Surface Burst — 50% Fission Fallout Fraction)' },
      { label: 'Effective Wind Speed', value: '24 km/h (15 mph)' },
      { label: 'Decay Law', value: 'Way-Wigner t⁻¹·² Fallout Decay' }
    ],
    steps: [
      'Cube-root hydrodynamic blast scaling (W¹/³ = 2.154): 5 psi overpressure radius R_5psi ≈ 1,380 m.',
      'Thermal 50% 2nd-degree burn radius (≈ 5 cal/cm²): R_thermal ≈ 2,150 m.',
      'Prompt initial nuclear radiation (4.0 Gy total gamma + neutron): R_prompt ≈ 1,120 m.',
      'Way-Wigner decay: a 100 Gy/h fallout zone at H+1 decays to 100 × 7⁻¹·² = 9.68 Gy/h at H+7 and 100 × 49⁻¹·² = 0.94 Gy/h at H+49.'
    ],
    result: '5 psi Blast = 1.38 km | Thermal Burn = 2.15 km | Prompt 4 Gy = 1.12 km | H+7 Fallout = 9.7% of H+1 rate.',
    sourceSync: { isotope: 'Cs-137', activityGBq: 100000, distanceM: 1380 }
  },
  14: {
    title: 'AFRRI Biodosimetry Triage: Lymphocyte Depletion & Dicentric Chromosome Assay',
    scenario:
      'An accident victim presents with emesis at 1.5 hours post-exposure. Absolute lymphocyte counts drop from 2.2 × 10⁹/L at baseline to 0.65 × 10⁹/L at 24 hours, and cytogenetics scores 48 dicentrics in 200 metaphases.',
    inputs: [
      { label: 'Time to Emesis', value: '1.5 hours post-exposure' },
      { label: '24-Hour Lymphocyte Count', value: '0.65 × 10⁹ cells/L (Severe Depletion)' },
      { label: 'Dicentric Yield (Y)', value: '48 / 200 = 0.240 dicentrics/cell' },
      { label: 'Calibration Constants (Co-60)', value: 'c = 0.001, α = 0.025 Gy⁻¹, β = 0.055 Gy⁻²' }
    ],
    steps: [
      'Solve the quadratic cytogenetic calibration αD + βD² = Y - c → 0.025 D + 0.055 D² = 0.239.',
      'Quadratic root: D = [-0.025 + √(0.025² + 4 × 0.055 × 0.239)] / (2 × 0.055) = 1.87 Gy.',
      'Cross-check with Goans lymphocyte depletion rate and 1.5 h emesis onset → consistent with 1.8–2.2 Gy Moderate Hematopoietic ARS.'
    ],
    result: 'Estimated Whole-Body Dose = 1.87 Gy → Initiate Filgrastim (G-CSF) cytokine therapy within 24 hours.',
    sourceSync: { isotope: 'Co-60', activityGBq: 1000, distanceM: 1.5 }
  },
  15: {
    title: 'IAEA SSR-6 / 49 CFR 173 Type A Qualification & Yellow-II Transport Index',
    scenario:
      'A radiopharmacy ships 185 GBq (5.0 Ci) of Mo-99 in a shielded package. Surface dose rate is 0.35 mSv/h and the dose rate at 1.0 m from the external surface is 0.008 mSv/h (0.8 mrem/h).',
    inputs: [
      { label: 'Radionuclide', value: 'Mo-99 (Special Form A₁ = 1,000 GBq, Normal Form A₂ = 600 GBq)' },
      { label: 'Package Activity', value: '185 GBq (0.31 × A₂)' },
      { label: 'Max Surface Dose Rate', value: '0.35 mSv/h (35 mrem/h)' },
      { label: 'Dose Rate at 1.0 m', value: '0.008 mSv/h (0.8 mrem/h)' }
    ],
    steps: [
      'Check Type A activity limit: A / A₂ = 185 / 600 = 0.308 ≤ 1.0 → Qualifies for Type A packaging.',
      'Calculate Transport Index (TI): TI = 0.008 mSv/h × 100 = 0.8 (rounded to 0.8).',
      'Assign IAEA SSR-6 Label Category: Surface ≤ 0.50 mSv/h and 0 < TI ≤ 1.0 → RADIOACTIVE YELLOW-II.'
    ],
    result: 'Package Type: Type A | Transport Index (TI) = 0.8 | Required Label: RADIOACTIVE YELLOW-II (UN 2915).',
    queryParams: '?isotope=Mo-99&activity=185',
    sourceSync: { isotope: 'Tc-99m', activityGBq: 185, distanceM: 1.0, shieldMaterial: 'Lead', shieldThicknessCm: 2.0 }
  },
  16: {
    title: 'Golden XR200 Pulsed Flash X-Ray Radiography Exclusion Zone & Ion Chamber Saturation',
    scenario:
      'An EOD team fires a 99-pulse train from a 150 kVp Golden XR200 flash X-ray generator (3.0 mR/pulse at 30 cm, 50 ns pulse width). Compute the instantaneous pulse dose rate and safe operator standoff.',
    inputs: [
      { label: 'Pulse Dose at 30 cm', value: '30 µSv/pulse (3.0 mR/pulse)' },
      { label: 'Pulse Width (τ_p)', value: '50 nanoseconds (5.0 × 10⁻⁸ s)' },
      { label: 'Shot Train', value: '99 Pulses' },
      { label: 'Operator Standoff (r)', value: '6.0 m' }
    ],
    steps: [
      'Total unshielded dose at 30 cm for 99 pulses: H_30cm = 99 × 30 µSv = 2,970 µSv (2.97 mSv).',
      'Inverse-square scaling to r = 6.0 m: H(6 m) = 2,970 × (0.30 / 6.0)² = 7.425 µSv (0.74 mrem) per 99-pulse train.',
      'Instantaneous dose rate during the 50 ns pulse at 1.0 m: H_dot_inst = [2.7 µSv / 50×10⁻⁹ s] × 3600 = 194.4 kSv/h (causes severe Geiger dead-time paralysis; use passive OSL/TLD).'
    ],
    result: 'Operator Dose at 6.0 m = 7.43 µSv per 99-pulse shot | Instantaneous 1 m Flux = 194.4 kSv/h.'
  },
  17: {
    title: '120 kVp Tungsten Anode Diagnostic X-Ray Tube Kramer Spectrum & Duane-Hunt Cutoff',
    scenario:
      'A clinical CT/radiography tube operates at 120 kVp, 5.0 mA with a Tungsten (Z = 74) target and 2.5 mm Aluminum total filtration. Calculate the minimum wavelength λ_min, mean photon energy, and air kerma rate at 1.0 m.',
    inputs: [
      { label: 'Tube Potential (U)', value: '120 kVp' },
      { label: 'Tube Current (I)', value: '5.0 mA' },
      { label: 'Anode Target', value: 'Tungsten (W, Z = 74, K-edge = 69.5 keV)' },
      { label: 'Total Filtration', value: '2.5 mm Aluminum (Al)' }
    ],
    steps: [
      'Duane-Hunt minimum wavelength: λ_min = hc / (e·U) = 1.23984 nm·keV / 120 keV = 0.01033 nm (0.1033 Å).',
      'Kramer continuous Bremsstrahlung integration + Tungsten Kα (59.3 keV) and Kβ (67.2 keV) characteristic peaks.',
      '2.5 mm Al beam hardening strips photons < 20 keV, shifting effective beam energy E_eff to ~52 keV (HVL₁ ≈ 4.3 mm Al).'
    ],
    result: 'Duane-Hunt λ_min = 0.01033 nm | Effective Energy ≈ 52 keV | Filtered Output at 1 m ≈ 0.38 mGy/(mA·s).'
  },
  18: {
    title: 'Industrial NDT Radiographic Geometric Unsharpness (U_g) & Focal Spot Selection',
    scenario:
      'An aerospace weld inspection of a 25 mm thick steel pipe uses a 2.5 mm Ir-192 focal spot with Source-to-Object Distance d_1 = 450 mm and Object-to-Detector Distance d_2 = 25 mm.',
    inputs: [
      { label: 'Focal Spot Size (F)', value: '2.5 mm' },
      { label: 'Source-to-Object Distance (d₁)', value: '450 mm' },
      { label: 'Object-to-Film Distance (d₂)', value: '25 mm (SDD = 475 mm)' },
      { label: 'ASME Sec. V U_g Limit', value: '0.51 mm (0.020 in) for thickness ≤ 50 mm' }
    ],
    steps: [
      'Compute radiographic magnification factor: M = (d₁ + d₂) / d₁ = 475 / 450 = 1.0556×.',
      'Compute geometric penumbra (unsharpness): U_g = F × (d₂ / d₁) = 2.5 mm × (25 / 450) = 0.1389 mm.',
      'Compare with ASME BPVC Section V Article 2 maximum unsharpness (0.51 mm) → Compliant (27% of limit).'
    ],
    result: 'Magnification M = 1.056× | Penumbra U_g = 0.139 mm (PASS — well below ASME 0.51 mm limit).'
  },
  19: {
    title: 'ANSI Z136.1 Class 4 Nd:YAG (1064 nm) Laser NOHD & OD Eyewear Selection',
    scenario:
      'A 10 W continuous-wave (CW) 1064 nm Nd:YAG laser has a 2.0 mm exit beam diameter and 1.2 mrad full-angle divergence. Compute the Nominal Ocular Hazard Distance (NOHD) and required eyewear Optical Density (OD).',
    inputs: [
      { label: 'Wavelength (λ)', value: '1064 nm (Near-IR, Retinal Hazard Region)' },
      { label: 'CW Output Power (Φ)', value: '10.0 W' },
      { label: 'Beam Waist (a) & Divergence (φ)', value: 'a = 2.0 mm, φ = 1.2 mrad' },
      { label: 'ANSI Z136.1 MPE (1064 nm CW)', value: '5.0 mW/cm² (0.005 W/cm² for t ≥ 10 s)' }
    ],
    steps: [
      'Calculate exit irradiance through a 7 mm pupil (Area = 0.3848 cm²): E₀ = 10.0 W / 0.3848 cm² = 25.98 W/cm².',
      'Solve NOHD equation: NOHD = [√(4 × 10.0 / (π × 0.005)) - 0.2 cm] / 0.0012 rad = 420.1 m.',
      'Required Optical Density: OD = log₁₀(E₀ / MPE) = log₁₀(25.98 / 0.005) = log₁₀(5196) = 3.72 → Specify OD 4+ @ 1064 nm.'
    ],
    result: 'Unprotected NOHD = 420.1 m | Required Laser Safety Eyewear: OD ≥ 3.8 (Specify OD 4+ @ 1064 nm).'
  },
  20: {
    title: 'X-Band (9.5 GHz) Fire-Control Radar Fraunhofer Far-Field & IEEE C95.1 Safe Standoff',
    scenario:
      'A 9.5 GHz pulsed radar transmits 50 kW peak power at a 0.002 duty cycle (100 W average power) through a 1.2 m parabolic dish (Gain = 38 dBi). Compute the Fraunhofer boundary and occupational safe standoff.',
    inputs: [
      { label: 'Frequency & Wavelength', value: 'f = 9.5 GHz (λ = 0.03158 m)' },
      { label: 'Peak Power & Duty Cycle', value: 'P_pk = 50 kW, Duty = 0.2% → P_avg = 100 W' },
      { label: 'Antenna Dish & Gain', value: 'D = 1.2 m, G = 38 dBi (Linear G = 6,310)' },
      { label: 'FCC OET-65 / IEEE C95.1 MPE', value: '50 W/m² (5 mW/cm² Occupational Controlled)' }
    ],
    steps: [
      'Fraunhofer far-field boundary: R_ff = 2·D² / λ = 2 × (1.2)² / 0.03158 = 91.20 m.',
      'Effective Isotropic Radiated Power (average): EIRP = P_avg × G = 100 W × 6,310 = 631,000 W.',
      'Occupational MPE standoff distance (with ground reflection factor 1.6): R_occ = √((1.6 × 631,000) / (4π × 50)) = 40.1 m.'
    ],
    result: 'Fraunhofer Boundary R_ff = 91.2 m | Occupational Controlled Hazard Distance = 40.1 m (Public = 89.6 m).'
  },
  21: {
    title: 'PWR UO₂ Lattice Six-Factor k_eff, Inhour Period & Post-SCRAM Xenon-135 Pit',
    scenario:
      'A thermal UO₂ reactor core has k_∞ = 1.342, geometric buckling B_g² = 0.0052 m⁻², migration area M² = 0.058 m², and undergoes a +150 pcm ($0.23) control rod withdrawal.',
    inputs: [
      { label: 'Four-Factor k_∞', value: 'η=1.65, f=0.88, p=0.89, ε=1.038 → k_∞ = 1.342' },
      { label: 'Non-Leakage Probability', value: 'P_NL = 1 / (1 + M²·B_g²) = 0.7683' },
      { label: 'Reactivity Insertion (ρ)', value: '+150 pcm (+0.00150 Δk/k ≈ +$0.231 on β_eff = 0.0065)' },
      { label: 'Thermal Flux pre-SCRAM', value: 'Φ₀ = 3.0 × 10¹³ n/(cm²·s)' }
    ],
    steps: [
      'Compute effective multiplication factor: k_eff = k_∞ × P_NL = 1.342 × 0.7683 = 1.031.',
      'Solve Keepin 6-group Inhour equation for ρ = +150 pcm → Asymptotic stable reactor period T ≈ 46.2 seconds.',
      'Evaluate post-SCRAM I-135 → Xe-135 transient: peak Xenon-135 poisoning occurs at t_peak = 8.75 hours post-SCRAM.'
    ],
    result: 'Core k_eff = 1.031 | Asymptotic Period (+150 pcm) = 46.2 s | Post-SCRAM Xenon Peak at t = 8.75 h.'
  },
  22: {
    title: 'Fissile Solution Excursion Nordheim-Fuchs Yield & ANSI/ANS-8.3 2oo3 CAAS Coverage',
    scenario:
      'An unshielded fissile uranyl nitrate tank experiences a $1.50 prompt-critical step excursion (1.0 × 10¹⁷ fissions). Verify that the 2-out-of-3 (2oo3) CAAS detector network trips and compute the prompt dose at 5.0 m.',
    inputs: [
      { label: 'Fission Burst Yield (Y_f)', value: '1.0 × 10¹⁷ Fissions' },
      { label: 'Standoff Distance (r)', value: '5.0 m Unshielded' },
      { label: 'CAAS Logic Architecture', value: '2-out-of-3 (2oo3) Coincidence Voting' },
      { label: 'ANSI/ANS-8.3 Criterion', value: 'Detect 0.20 Gy (20 rad) @ 2.0 m within 1 minute' }
    ],
    steps: [
      'Evaluate prompt gamma (1.2 × 10⁻¹³ Gy·m²/fission) + neutron (1.9 × 10⁻¹³ Gy·m²/fission) flash dose at r = 5.0 m.',
      'Total prompt absorbed dose at 5.0 m: D(5 m) = (3.1 × 10⁻¹³ × 1.0 × 10¹⁷) / 5.0² = 1.24 Gy (124 rad).',
      'Verify 2oo3 detector array coverage across the 30 m × 20 m process bay: 100% of floor cells have ≥ 2 detectors above trip setpoint.'
    ],
    result: 'Prompt Dose at 5.0 m = 1.24 Gy | ANSI/ANS-8.3 2oo3 Coincidence Alarm Trips in < 1.2 ms (100% Bay Coverage).'
  },
  23: {
    title: 'Klein-Nishina Monte Carlo Photon Transport Through a 3.0 cm Lead Slab',
    scenario:
      'Simulate N = 5,000 photon histories of 662 keV (Cs-137) incident on a 3.0 cm Lead (Pb) slab using survival biasing and Klein-Nishina Compton angular sampling.',
    inputs: [
      { label: 'Incident Photon Energy (E₀)', value: '0.662 MeV (Cs-137)' },
      { label: 'Barrier Material & Thickness', value: 'Lead (Pb, ρ = 11.35 g/cm³), d = 3.0 cm' },
      { label: 'Photon Histories (N)', value: '5,000 Stochastic Trajectories' },
      { label: 'Variance Reduction', value: 'Implicit Capture (Survival Weighting) + Russian Roulette' }
    ],
    steps: [
      'Sample free-flight optical path s = -ln(ξ)/μ_tot(E) using NIST XCOM cross-sections.',
      'At each collision, multiply statistical weight w by Compton scattering ratio μ_C / μ_tot and sample scattered angle θ via Kahn/Klein-Nishina rejection.',
      'Tally transmitted unscattered + scattered photons exiting z = 3.0 cm to compute Monte Carlo transmission and buildup B_MC.'
    ],
    result: 'Uncollided Transmission = 3.92% | Total Broad-Beam Transmission = 6.98% (Monte Carlo Buildup B_MC = 1.78 ± 0.03).'
  },
  24: {
    title: 'Mo-99 → Tc-99m Transient Equilibrium Generator & Aqueous H₂ Radiolysis',
    scenario:
      'A fresh 100 GBq (2.70 Ci) Mo-99 generator column (T_½ = 65.94 h) elutes Tc-99m (T_½ = 6.01 h, branching f = 0.876) at t = 0. Find the time of maximum Tc-99m activity and the Tc-99m yield at 24 hours.',
    inputs: [
      { label: 'Parent Nuclide', value: 'Mo-99 (A₁(0) = 100 GBq, T_½,1 = 65.94 h)' },
      { label: 'Daughter Nuclide', value: 'Tc-99m (A₂(0) = 0 GBq, T_½,2 = 6.01 h, f₁₂ = 0.876)' },
      { label: 'Decay Constants', value: 'λ₁ = 0.010512 h⁻¹, λ₂ = 0.11533 h⁻¹' },
      { label: 'Elution Time', value: 't = 22.84 h (Peak) & t = 24.0 h' }
    ],
    steps: [
      'Solve Bateman transient equilibrium peak time: t_max = ln(λ₂ / λ₁) / (λ₂ - λ₁) = ln(10.971) / 0.10482 = 22.84 hours.',
      'Evaluate Bateman daughter activity at t = 22.84 h: A₂(t_max) = 0.876 × 100 × [0.11533 / 0.10482] × (e⁻⁰·²⁴⁰¹ - e⁻²·⁶³⁴) = 68.89 GBq.',
      'At t = 24 h, composition pie chart shows Mo-99 = 77.7 GBq, Tc-99m = 68.8 GBq.'
    ],
    result: 'Peak Tc-99m Ingrowth occurs at t_max = 22.84 hours with A₂ = 68.89 GBq (1.86 Ci).',
    queryParams: '?isotope=Mo-99&activity=100',
    sourceSync: { isotope: 'Tc-99m', activityGBq: 68.9, distanceM: 1.0 }
  },
  25: {
    title: 'HPGe vs. NaI(Tl) Gamma Spectrum Deconvolution of Mixed Cs-137 & Co-60',
    scenario:
      'Compare a 600-second spectrum of a mixed Cs-137 (661.7 keV) and Co-60 (1173.2 & 1332.5 keV) sample on a 3×3" NaI(Tl) scintillator (~7% FWHM) versus a coaxial HPGe semiconductor (~0.14% FWHM).',
    inputs: [
      { label: 'Sample Composition', value: 'Cs-137 (50 kBq) + Co-60 (50 kBq)' },
      { label: 'Detector Type', value: 'High-Purity Germanium (HPGe) vs. NaI(Tl)' },
      { label: 'Live Acquisition Time', value: '600 seconds' },
      { label: 'Calibration', value: '4096 Channels (0.50 keV/channel)' }
    ],
    steps: [
      'Compute Compton edge for Cs-137 (661.7 keV): E_c = 661.7 × [1 - 1/(1 + 2×661.7/511)] = 477.3 keV (Backscatter peak at 184.3 keV).',
      'Compute HPGe FWHM at 1332.5 keV: FWHM ≈ 1.85 keV (R = 0.139%), cleanly resolving close doublets.',
      'Subtract step-continuum background under the 661.7 keV ROI to extract Net Peak Area and MDA.'
    ],
    result: 'Cs-137 Photopeak = 661.7 keV (Compton Edge = 477.3 keV) | HPGe Resolution R = 0.139% @ 1332.5 keV.',
    sourceSync: { isotope: 'Cs-137', activityGBq: 0.00005, distanceM: 0.5 }
  },
  26: {
    title: 'AAPM TG-43 I-125 Brachytherapy Seed Dose Rate & BED₁₀ Iso-Dose Plan',
    scenario:
      'Calculate the dose rate at r = 1.0 cm transverse (θ = 90°) from an Amersham 6711 I-125 brachytherapy seed with Air Kerma Strength S_K = 1.00 U and evaluate the BED for a 145 Gy permanent prostate implant.',
    inputs: [
      { label: 'Brachytherapy Seed', value: 'I-125 (T_½ = 59.4 d, E_avg = 28 keV)' },
      { label: 'Air Kerma Strength (S_K)', value: '1.00 U (1 µGy·m²/h = 1 cGy·cm²/h)' },
      { label: 'Dose Rate Constant (Λ)', value: '0.965 cGy/(h·U) in Water' },
      { label: 'Prescription Dose', value: '145 Gy Permanent Implant (α/β = 3.0 Gy for Prostate)' }
    ],
    steps: [
      'At reference point (r₀ = 1.0 cm, θ₀ = 90°), geometry factor G_L(1, 90°)/G_L(1, 90°) = 1.0, g_L(1) = 1.0, F(1, 90°) = 1.0.',
      'Transverse dose rate at 1.0 cm: D_dot(1 cm, 90°) = S_K × Λ = 1.00 × 0.965 = 0.965 cGy/h.',
      'Initial dose rate D_dot_0 = D_total × λ = 145 Gy × (ln 2 / 1425.6 h) = 0.0705 Gy/h → Dale BED₃ = 145 × [1 + 0.0705 / (3.0 × (0.462 + 0.000486))] = 218.8 Gy₃.'
    ],
    result: 'Reference 1 cm Dose Rate = 0.965 cGy/h per U | Permanent Implant BED₃ = 218.8 Gy₃.'
  },
  27: {
    title: 'NUREG-1575 MARSSIM Class 1 Final Status Survey Sign Test & Sample Size N',
    scenario:
      'A decommissioned hot lab floor (Class 1 Survey Unit) has a Cs-137 DCGL_W of 15.0 Bq/g, survey standard deviation σ = 3.2 Bq/g, lower bound of gray region LBGR = 10.5 Bq/g, and Type I/II decision errors α = β = 0.05.',
    inputs: [
      { label: 'Radionuclide & DCGL_W', value: 'Cs-137, DCGL_W = 15.0 Bq/g' },
      { label: 'LBGR & Std Dev (σ)', value: 'LBGR = 10.5 Bq/g, σ = 3.2 Bq/g' },
      { label: 'Decision Error Rates', value: 'α = 0.05 (False Positive), β = 0.05 (False Negative)' },
      { label: 'Elevated Area Factor (A_m)', value: '4.2 (for 2 m² localized hot spot)' }
    ],
    steps: [
      'Compute Relative Shift: Δ/σ = (DCGL_W - LBGR) / σ = (15.0 - 10.5) / 3.2 = 1.406.',
      'Evaluate Sign Test probability p = Φ(1.406) = 0.9201.',
      'Calculate required MARSSIM sample size (with 20% buffer): N = 1.2 × (1.645 + 1.645)² / [4 × (0.9201 - 0.5)²] = 18.4 → Specify N = 19 systematic points.',
      'Calculate Hot-Spot Limit: DCGL_EMC = DCGL_W × A_m = 15.0 × 4.2 = 63.0 Bq/g.'
    ],
    result: 'Relative Shift Δ/σ = 1.41 | Required Survey Locations N = 19 | Hot-Spot Limit DCGL_EMC = 63.0 Bq/g.',
    sourceSync: { isotope: 'Cs-137', activityGBq: 0.015, distanceM: 1.0 }
  },
  28: {
    title: 'ICRP-107 Radionuclide Decay Mode, Specific Activity & Daughter Lookup',
    scenario:
      'Look up the specific activity a_sp (TBq/g), primary photon emissions, and specific gamma constant Γ for Ir-192 to verify an industrial source certificate.',
    inputs: [
      { label: 'Target Nuclide', value: 'Ir-192 (Z = 77, A = 192)' },
      { label: 'Half-Life (T_½)', value: '73.827 days (6.3787 × 10⁶ s)' },
      { label: 'Decay Modes', value: 'β⁻ (95.24% → Pt-192) & EC (4.76% → Os-192)' },
      { label: 'Dominant Gamma Lines', value: '316.5 keV (82.8%), 468.1 keV (47.8%), 308.5 keV (29.7%)' }
    ],
    steps: [
      'Compute theoretical Specific Activity: a_sp = (N_A × ln 2) / (M × T_½) = (6.022×10²³ × 0.69315) / (192 × 6.3787×10⁶) = 3.41 × 10¹⁴ Bq/g (341 TBq/g / 9,210 Ci/g).',
      'Verify ICRP-107 Specific Gamma Constant: Γ = 116.8 µSv·m²/(h·GBq).',
      'Push Ir-192 directly into Module 1 Dose Calculator or Module 4 Shielding.'
    ],
    result: 'Ir-192 Specific Activity = 341 TBq/g (9,210 Ci/g) | Γ = 116.8 µSv·m²/(h·GBq).',
    queryParams: '?search=Ir-192',
    sourceSync: { isotope: 'Ir-192', activityGBq: 3700, distanceM: 2.0 }
  },
  29: {
    title: 'Surface Contamination Wipe / Frisker Probe MDA & 4π Bq/cm² Conversion',
    scenario:
      'A 100 cm² Ludlum 43-93 alpha/beta scintillator frisker (efficiency ε_i = 0.22 c/d, surface factor ε_s = 0.50) records a 1-minute background of 45 counts and a 1-minute sample reading of 92 counts.',
    inputs: [
      { label: 'Probe Area & Efficiencies', value: 'A = 100 cm², ε_i = 0.22, ε_s = 0.50 (Total ε = 0.11)' },
      { label: 'Background Count (R_b)', value: '45 cpm (t_b = 1.0 min = 60 s)' },
      { label: 'Gross Sample Count (R_g)', value: '92 cpm (t_s = 1.0 min = 60 s)' },
      { label: 'Confidence Level', value: '95% (k = 1.645, Currie Formula)' }
    ],
    steps: [
      'Calculate Currie Critical Level L_c = 2.326 × √45 = 15.6 net counts (Net count = 92 - 45 = 47 > L_c → Positive detection!).',
      'Calculate Minimum Detectable Activity: MDA = (2.71 + 4.653 × √45) / (60 s × 0.22 × 0.50 × 100 cm²) = 33.92 / 660 = 0.0514 Bq/cm² (3.08 dpm/100 cm²).',
      'Calculate Measured Surface Activity: A_surf = (47 / 60) / (0.22 × 0.50 × 100) = 0.0712 Bq/cm².'
    ],
    result: 'Net Activity = 0.0712 Bq/cm² (Above MDA = 0.0514 Bq/cm² — Positive Contamination Detected).'
  },
  30: {
    title: '1987 Goiânia Cs-137 Teletherapy Capsule Breach Forensic Reconstruction',
    scenario:
      'Reconstruct the external dose rate at 1.0 m from the breached 50.9 TBq (1,375 Ci) CsCl teletherapy capsule in Goiânia, Brazil (INES Level 5) and compare with modern First Responder turn-back thresholds.',
    inputs: [
      { label: 'Historical Incident', value: 'Goiânia Radiological Accident (September 1987, INES 5)' },
      { label: 'Source Nuclide & Activity', value: 'Cs-137 Chloride Salt, A = 50,900 GBq (1,375 Ci)' },
      { label: 'Specific Gamma Constant', value: 'Γ(Cs-137) = 0.0772 mSv·m²/(h·GBq)' },
      { label: 'Contact / 1 m Standoff', value: 'r = 1.0 m Unshielded' }
    ],
    steps: [
      'Compute unshielded dose rate at r = 1.0 m: H*(10) = 0.0772 × 50,900 / 1.0² = 3,929 mSv/h (3.93 Sv/h).',
      'Time to accumulate a lethal LD50/60 whole-body dose (4.0 Sv) at 1.0 m = 4.0 / 3.93 = 1.02 hours (61 minutes).',
      'Load incident parameters into Module 8 First Responder to model the 300 m cordon and contamination control.'
    ],
    result: '1.0 m Unshielded Dose Rate = 3.93 Sv/h (Lethal LD50 dose accumulated in ~61 minutes at 1 m).',
    sourceSync: { isotope: 'Cs-137', activityGBq: 50900, distanceM: 1.0 }
  },
  31: {
    title: 'Global 3D Nuclear Reactor Fleet & Atmospheric Test Site Geospatial Audit',
    scenario:
      'Filter the 3D WebGL Earth globe to inspect commercial PWR/BWR nuclear power stations (> 3,000 MWt) and historical megaton-class test sites in the Pacific and Novaya Zemlya.',
    inputs: [
      { label: 'Layer 1', value: 'Global Commercial Power Reactors (Operating & Under Construction)' },
      { label: 'Layer 2', value: 'Historical Nuclear Detonations (1945–1998, Yield > 1,000 kt)' },
      { label: 'Geodesic Tool', value: 'Great-Circle Haversine Distance & Plume Reach' },
      { label: 'Selected Site', value: 'Kashiwazaki-Kariwa / Bikini Atoll (Castle Bravo 15 Mt)' }
    ],
    steps: [
      'Toggle the Reactors and Detonations layers in the 3D Earth Hub.',
      'Click any site marker to inspect thermal/electric capacity (MWt/MWe), coordinates, or detonation yield and HOB.',
      'Launch the site directly into Module 13 (Nuclear Weapons Effects) or Module 11 (Plume Dispersion).'
    ],
    result: 'Interactive 3D geodesic inspection with 1-click handoff to atmospheric and blast consequence solvers.'
  },
  32: {
    title: 'High-Flux Geiger Tube Dead-Time Paralysis & Lambert-W True Rate Recovery',
    scenario:
      'A Geiger-Müller survey meter with non-paralyzable dead time τ = 100 µs (1.0 × 10⁻⁴ s) reads an observed count rate m = 4,000 cps in a high-radiation vault. Determine the true interaction rate n and percent dead-time loss.',
    inputs: [
      { label: 'Observed Count Rate (m)', value: '4,000 cps (240,000 cpm)' },
      { label: 'Detector Dead Time (τ)', value: '100 µs (1.0 × 10⁻⁴ s)' },
      { label: 'Dead-Time Model', value: 'Non-Paralyzable vs. Paralyzable (Lambert-W)' },
      { label: 'Sensitivity', value: '1,200 cps per mSv/h' }
    ],
    steps: [
      'Compute fractional dead-time loss product: m·τ = 4,000 × 1.0×10⁻⁴ = 0.40 (40% dead time!).',
      'Recover true non-paralyzable count rate: n = m / (1 - m·τ) = 4,000 / (1 - 0.40) = 6,666.7 cps.',
      'True dose rate = 6,666.7 / 1,200 = 5.56 mSv/h (uncorrected meter read only 3.33 mSv/h — under-reporting by 40%).'
    ],
    result: 'True Count Rate n = 6,667 cps (66.7% higher than observed 4,000 cps; True Dose Rate = 5.56 mSv/h).'
  },
  33: {
    title: 'International Eye-Lens & 5-Year Cumulative Dose Compliance Audit (ICRP 118 vs. 10 CFR 20)',
    scenario:
      'An interventional cardiologist receives 18.5 mSv whole-body DDE and 32.0 mSv eye-lens dose (LDE) in a single year. Audit compliance across US NRC (10 CFR 20), US DOE (10 CFR 835), and IAEA GSR Part 3 / EURATOM.',
    inputs: [
      { label: 'Annual Whole-Body DDE', value: '18.5 mSv (1.85 rem)' },
      { label: 'Annual Lens of Eye Dose (LDE)', value: '32.0 mSv (3.20 rem)' },
      { label: '5-Year Cumulative DDE', value: '88.0 mSv' },
      { label: 'Jurisdictions Compared', value: 'US NRC 10 CFR 20 vs. IAEA GSR Part 3 / EURATOM 2013/59' }
    ],
    steps: [
      'Whole-body DDE (18.5 mSv) is compliant with US NRC (50 mSv), US DOE ACL (20 mSv), and IAEA/EURATOM (20 mSv/yr avg).',
      'Lens-of-eye LDE (32.0 mSv) PASSES US NRC/DOE (150 mSv limit, 21.3% used) but EXCEEDS IAEA GSR Part 3 / EURATOM / ICRP 118 (20 mSv limit, 160% of limit!).',
      'Recommend leaded protective eyewear (0.5 mm Pb eq, 85% attenuation) reducing eye dose to 4.8 mSv/yr.'
    ],
    result: 'Compliant under US NRC 10 CFR 20; EXCEEDS IAEA/EURATOM 20 mSv Eye-Lens Limit (Requires leaded eyewear).'
  },
  34: {
    title: 'ASME NQA-1 / IEEE 730 Verification Benchmark Audit & Drift Verification',
    scenario:
      'Execute the full automated verification suite across all analytical physics kernels and boundary stress vectors to generate a signed ISO/IEC 17025 Software Quality Assurance certificate.',
    inputs: [
      { label: 'Analytical Test Vectors', value: 'VTEST-01 through VTEST-56 (ICRP / NCRP / IAEA / ANSI)' },
      { label: 'Numerical Stress Vectors', value: 'STRESS-01 through STRESS-08 (IEEE 754 Machine Epsilon)' },
      { label: 'Acceptance Tolerance', value: 'δ ≤ 0.01% to 0.50% (Domain-Specific)' },
      { label: 'Output Artifact', value: 'Signed JSON / CSV / Print SQA Traceability Dossier' }
    ],
    steps: [
      'Click "Re-Run Verification Suite" to execute every deterministic physics solver against published reference values.',
      'Inspect maximum relative error δ_max = 0.0464% (well within ±0.5% tolerance).',
      'Export the NQA-1 Traceability Matrix or print the formal QA Verification Certificate.'
    ],
    result: '100.0% Pass Rate across all analytical benchmarks and boundary stress tests (Zero Deterministic Drift).'
  },
  35: {
    title: 'ICRP-116 Neutron Fluence-to-Dose h*(10) & FAA CARI-7 Polar Flight Cosmic Dosimetry',
    scenario:
      'Compute the ambient dose equivalent rate H*(10) from a 2.0 MeV fast neutron beam of flux Φ = 500 n/(cm²·s) and evaluate flight crew cosmic dose on a 12-hour high-latitude flight at FL390 (39,000 ft).',
    inputs: [
      { label: 'Fast Neutron Energy & Flux', value: 'E_n = 2.0 MeV, Φ = 500 n/(cm²·s)' },
      { label: 'ICRP-74/116 Coefficient h*(10)', value: '420 pSv·cm² per neutron at 2.0 MeV' },
      { label: 'Aviation Altitude & Route', value: 'FL390 (11.9 km / 39,000 ft), Polar Route (65° N), 12.0 hours' },
      { label: 'Solar Activity', value: 'Solar Minimum (Heliocentric Potential = 450 MV)' }
    ],
    steps: [
      'Neutron dose rate: H*(10) = 500 n/(cm²·s) × 420×10⁻¹² Sv·cm² × 3600 s/h = 0.756 mSv/h (75.6 mrem/h).',
      'FAA CARI-7 cosmic ray dose rate at FL390 (65° geomagnetic latitude, solar minimum) ≈ 6.8 µSv/h.',
      'Total 12-hour polar flight crew dose = 12.0 h × 6.8 µSv/h = 81.6 µSv (8.16 mrem).'
    ],
    result: '2 MeV Neutron Beam = 0.756 mSv/h | 12-Hour FL390 Polar Flight Cosmic Dose = 81.6 µSv.'
  }
};
