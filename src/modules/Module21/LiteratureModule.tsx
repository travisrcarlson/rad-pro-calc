import React, { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';

export type DomainCategory =
  | 'All Domains'
  | 'Dose, Transport & Shielding'
  | 'Nuclear Kinetics & Reactivity'
  | 'Non-Ionizing EMR & Lasers'
  | 'Spectroscopy & Radiation Detection'
  | 'Internal Dosimetry & Biokinetics'
  | 'Environmental Dispersion & Response'
  | 'Regulatory Standards & Transport Security';

export interface MethodDoc {
  id: string;
  moduleId: string;
  moduleName: string;
  domain: DomainCategory;
  title: string;
  overview: string;
  standards: {
    org: string;
    code: string;
    year: string;
    title: string;
  }[];
  primaryFormula: string;
  secondaryFormulas?: { label: string; formula: string }[];
  variables: { symbol: string; description: string; units: string }[];
  assumptions: string[];
  benchmarks: string;
}

const METHOD_DOCS: MethodDoc[] = [
  // 1. Module 1: Nuclide Database & Decay Properties
  {
    id: 'M1-Nuclides',
    moduleId: 'Module 1',
    moduleName: 'Nuclide Database',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Radionuclide Decay Data, Specific Activity & Branching Ratios',
    overview: 'Provides fundamental decay constants, half-lives, specific activities, and decay branching fractions compiled from evaluated nuclear data files.',
    standards: [
      { org: 'ICRP', code: 'Publication 107', year: '2008', title: 'Nuclear Decay Data for Dosimetric Calculations' },
      { org: 'ICRP', code: 'Publication 38', year: '1983', title: 'Radionuclide Transformations: Energy and Intensity of Emissions' },
      { org: 'IAEA', code: 'NuDat 3.0 / ENSDF', year: '2023', title: 'Evaluated Nuclear Structure Data File' }
    ],
    primaryFormula: '\\lambda = \\frac{\\ln(2)}{T_{1/2}} = \\frac{0.693147}{T_{1/2}}',
    secondaryFormulas: [
      { label: 'Specific Activity (Bq/g)', formula: 'a = \\frac{\\lambda \\cdot N_A}{M} = \\frac{\\ln(2) \\cdot N_A}{T_{1/2} \\cdot M}' },
      { label: 'Activity from Mass', formula: 'A = a \\cdot m = \\frac{m \\cdot \\ln(2) \\cdot N_A}{T_{1/2} \\cdot M}' }
    ],
    variables: [
      { symbol: '\\lambda', description: 'Radioactive decay constant', units: 's⁻¹' },
      { symbol: 'T_{1/2}', description: 'Physical radioactive half-life', units: 's (or converted to h, d, y)' },
      { symbol: 'N_A', description: 'Avogadro constant (6.02214076 × 10²³)', units: 'mol⁻¹' },
      { symbol: 'M', description: 'Molar mass of radionuclide', units: 'g·mol⁻¹' },
      { symbol: 'a', description: 'Specific activity', units: 'Bq·g⁻¹' },
      { symbol: 'm', description: 'Mass of radioisotope', units: 'g' }
    ],
    assumptions: [
      'Pure spontaneous exponential decay governed by quantum Poisson processes.',
      'Branching ratios are normalized such that sum of all decay mode probabilities equals 1.0.'
    ],
    benchmarks: 'Validated against ICRP 107 reference specific activities and ENSDF decay schemes.'
  },

  // 2. Module 2: External Dose & Point Source Engine
  {
    id: 'M2-Dose',
    moduleId: 'Module 2',
    moduleName: 'Dose Calculator Engine',
    domain: 'Dose, Transport & Shielding',
    title: 'Point Source Gamma Kerma, Specific Gamma Constant & Taylor Buildup',
    overview: 'Calculates air kerma and ambient dose equivalent rate H*(10) around isotropic unshielded or shielded point gamma emitters using specific gamma-ray constants and buildup factors.',
    standards: [
      { org: 'ICRP', code: 'Publication 74', year: '1996', title: 'Conversion Coefficients for use in Radiological Protection against External Radiation' },
      { org: 'NCRP', code: 'Report No. 147', year: '2004', title: 'Structural Shielding Design for Medical X-Ray Imaging Facilities' },
      { org: 'ICRU', code: 'Report 57', year: '1998', title: 'Conversion Coefficients for use in Radiological Protection against External Radiation' }
    ],
    primaryFormula: '\\dot{H}^*(10) = \\frac{A \\cdot \\Gamma}{d^2} \\cdot B(\\mu d) \\cdot e^{-\\mu x}',
    secondaryFormulas: [
      { label: 'Specific Gamma Constant Conversion (SI)', formula: '\\Gamma_{\\text{SI}} = \\frac{\\Gamma_{\\text{old}}}{37.0} \\quad [\\mu\\text{Sv}\\cdot\\text{m}^2 / (\\text{h}\\cdot\\text{MBq})]' },
      { label: 'Taylor Form Buildup Factor', formula: 'B(\\mu x) = A_1 e^{-\\alpha_1 \\mu x} + (1 - A_1) e^{-\\alpha_2 \\mu x}' },
      { label: 'Unshielded Inverse Square Law', formula: '\\dot{D}_2 = \\dot{D}_1 \\cdot \\left(\\frac{d_1}{d_2}\\right)^2' }
    ],
    variables: [
      { symbol: '\\dot{H}^*(10)', description: 'Ambient dose equivalent rate at depth of 10 mm in ICRU sphere', units: 'µSv·h⁻¹' },
      { symbol: 'A', description: 'Radioactive source activity', units: 'MBq' },
      { symbol: '\\Gamma', description: 'Specific gamma-ray constant', units: 'µSv·m²·h⁻¹·MBq⁻¹' },
      { symbol: 'd', description: 'Source-to-receptor radial distance', units: 'm' },
      { symbol: 'B', description: 'Radiation buildup factor accounting for multiple Compton scattering', units: 'dimensionless' },
      { symbol: '\\mu', description: 'Narrow-beam linear attenuation coefficient', units: 'm⁻¹ or cm⁻¹' },
      { symbol: 'x', description: 'Shielding barrier thickness', units: 'm or cm' }
    ],
    assumptions: [
      'Point source geometry valid when distance d is at least 5 times the largest source dimension.',
      'Homogeneous isotropic emission into 4π solid angle without significant ground air-scatter albedo.'
    ],
    benchmarks: 'Benchmark solutions matched against MCNP6 point-source calculations and NCRP 147 tables.'
  },

  // 3. Module 3: 2D Radiation Mapping
  {
    id: 'M3-Map',
    moduleId: 'Module 3',
    moduleName: 'Radiation Map',
    domain: 'Dose, Transport & Shielding',
    title: 'Point Kernel Superposition & 2D Spatial Fluence Integration',
    overview: 'Generates 2D isodose contour maps across arbitrary room geometries by summing contributions from multiple discrete source kernels and line segments.',
    standards: [
      { org: 'IAEA', code: 'Safety Reports Series No. 47', year: '2006', title: 'Radiation Protection in the Design of Radiotherapy Facilities' },
      { org: 'ANSI/ANS', code: '6.4.3', year: '1991', title: 'Gamma-Ray Attenuation Coefficients and Buildup Factors for Engineering Materials' }
    ],
    primaryFormula: '\\dot{D}_{\\text{total}}(x, y) = \\sum_{i=1}^{N} \\frac{A_i \\cdot \\Gamma_i}{\\|\\mathbf{r} - \\mathbf{r}_i\\|^2} \\cdot \\exp\\left(-\\sum_{k} \\mu_k \\Delta s_{i,k}\\right)',
    secondaryFormulas: [
      { label: 'Line Source Kernel', formula: '\\dot{D}(d) = \\frac{A_L \\cdot \\Gamma}{d} \\cdot (\\theta_2 - \\theta_1)' },
      { label: 'Euclidean Spatial Metric', formula: '\\|\\mathbf{r} - \\mathbf{r}_i\\| = \\sqrt{(x - x_i)^2 + (y - y_i)^2}' }
    ],
    variables: [
      { symbol: '\\dot{D}_{\\text{total}}', description: 'Total superimposed dose rate at grid coordinate (x,y)', units: 'µSv·h⁻¹' },
      { symbol: '\\mathbf{r}_i', description: 'Position vector of the i-th radionuclide source', units: 'm' },
      { symbol: '\\Delta s_{i,k}', description: 'Path length of line-of-sight ray through the k-th shielding object', units: 'cm' },
      { symbol: 'A_L', description: 'Linear activity density for line sources', units: 'MBq·m⁻¹' }
    ],
    assumptions: [
      'Line-of-sight ray tracing intersection with polygon boundaries.',
      'Buildup factor evaluated along ray line segment path through media.'
    ],
    benchmarks: 'Cross-validated against discrete ordinates and 2D Monte Carlo benchmarks.'
  },

  // 4. Module 4: Transport & Radioactive Waste
  {
    id: 'M4-Transport',
    moduleId: 'Module 4',
    moduleName: 'Transport Eval',
    domain: 'Regulatory Standards & Transport Security',
    title: 'IAEA SSR-6 Packaging Categorization, A₁/A₂ Bounds & Transport Index (TI)',
    overview: 'Determines legal shipping package categories (Excepted, Type A, Type B), surface dose rates, and Transport Index (TI) under international multimodal dangerous goods regulations.',
    standards: [
      { org: 'IAEA', code: 'SSR-6 (Rev. 1)', year: '2018', title: 'Regulations for the Safe Transport of Radioactive Material' },
      { org: 'US DOT / NRC', code: '49 CFR Part 173 Subpart I', year: '2023', title: 'Class 7 - Radioactive Materials Transport Regulations' },
      { org: 'ICAO / IATA', code: 'DGR Section 10', year: '2024', title: 'Dangerous Goods Regulations for Air Transport' }
    ],
    primaryFormula: 'TI = \\dot{H}^*(10)_{\\text{at } 1\\text{ meter}} \\times 100 \\quad [\\text{in mrem/h equivalent}]',
    secondaryFormulas: [
      { label: 'Package Category Threshold (White-I)', formula: '\\dot{D}_{\\text{surf}} \\le 0.005\\text{ mSv/h} \\quad \\text{and} \\quad TI = 0' },
      { label: 'Package Category Threshold (Yellow-II)', formula: '0.005 < \\dot{D}_{\\text{surf}} \\le 0.5\\text{ mSv/h} \\quad \\text{and} \\quad TI \\le 1.0' },
      { label: 'Package Category Threshold (Yellow-III)', formula: '0.5 < \\dot{D}_{\\text{surf}} \\le 2.0\\text{ mSv/h} \\quad \\text{or} \\quad 1.0 < TI \\le 10.0' },
      { label: 'Type A Activity Limit Rule', formula: 'A \\le A_1 \\text{ (Special Form)} \\quad \\text{or} \\quad A \\le A_2 \\text{ (Normal Form)}' }
    ],
    variables: [
      { symbol: 'TI', description: 'Transport Index (dimensionless number rounded up to one decimal place)', units: 'dimensionless' },
      { symbol: '\\dot{D}_{\\text{surf}}', description: 'Maximum radiation dose rate on external package surface', units: 'mSv·h⁻¹' },
      { symbol: 'A_1', description: 'Maximum activity of special form radioactive material permitted in Type A package', units: 'TBq' },
      { symbol: 'A_2', description: 'Maximum activity of normal form radioactive material permitted in Type A package', units: 'TBq' }
    ],
    assumptions: [
      'Transport Index measured at 1 meter from the external surface of the package.',
      'Surface contamination limits: beta/gamma emitters < 4 Bq/cm², alpha emitters < 0.4 Bq/cm².'
    ],
    benchmarks: 'Complies with IAEA SSR-6 Schedule 1-14 and US 49 CFR § 173.403/§ 173.441.'
  },

  // 5. Module 5: Regulatory Compliance & ALARA
  {
    id: 'M5-Reg',
    moduleId: 'Module 5',
    moduleName: 'Regulatory Dashboard',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Occupational Dose Triad, Lens of Eye & ALARA Investigation Levels',
    overview: 'Tracks cumulative occupational radiation exposures against statutory limits under US NRC 10 CFR 20 and international ICRP Publication 103 standards.',
    standards: [
      { org: 'US NRC', code: '10 CFR Part 20', year: '2023', title: 'Standards for Protection Against Radiation' },
      { org: 'ICRP', code: 'Publication 103', year: '2007', title: 'The 2007 Recommendations of the International Commission on Radiological Protection' },
      { org: 'ICRP', code: 'Publication 118', year: '2012', title: 'ICRP Statement on Tissue Reactions / Lens of the Eye' }
    ],
    primaryFormula: '\\text{TEDE} = \\text{DDE} + \\text{CEDE} \\le 50\\text{ mSv/year (NRC)} \\quad [20\\text{ mSv/year (ICRP)}]',
    secondaryFormulas: [
      { label: 'Lens Dose Equivalent (LDE)', formula: '\\text{LDE} \\le 150\\text{ mSv/year (NRC)} \\quad [20\\text{ mSv/year (ICRP 118)}]' },
      { label: 'Shallow Dose Equivalent (SDE - Skin/Extremity)', formula: '\\text{SDE} \\le 500\\text{ mSv/year (50 rem/year)}' },
      { label: 'General Public Dose Limit', formula: '\\text{Dose}_{\\text{public}} \\le 1.0\\text{ mSv/year (100 mrem/year)}' }
    ],
    variables: [
      { symbol: '\\text{TEDE}', description: 'Total Effective Dose Equivalent', units: 'mSv' },
      { symbol: '\\text{DDE}', description: 'Deep Dose Equivalent from external whole-body radiation at 10 mm depth', units: 'mSv' },
      { symbol: '\\text{CEDE}', description: 'Committed Effective Dose Equivalent from internal intakes over 50 years', units: 'mSv' },
      { symbol: '\\text{LDE}', description: 'Lens Dose Equivalent evaluated at tissue depth of 3 mm', units: 'mSv' },
      { symbol: '\\text{SDE}', description: 'Shallow Dose Equivalent evaluated at tissue depth of 0.07 mm', units: 'mSv' }
    ],
    assumptions: [
      'Linear No-Threshold (LNT) hypothesis applied for stochastic risk extrapolation.',
      'ALARA Level I (10% of annual limit) and Level II (30% of annual limit) trigger administrative investigations.'
    ],
    benchmarks: 'Matches US NRC Regulatory Guide 8.10 and ICRP 103 paragraph (144).'
  },

  // 6. Module 6: Bateman Decay & Radiolysis
  {
    id: 'M6-Bateman',
    moduleId: 'Module 6',
    moduleName: 'Radiolysis & Decay',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Bateman Chain Differential Equations & Water Radiolysis G-Values',
    overview: 'Solves coupled multi-generation radioactive decay chains and computes molecular yield generation rates (H₂, H₂O₂, e⁻aq) from aqueous water radiolysis.',
    standards: [
      { org: 'ICRP', code: 'Publication 107', year: '2008', title: 'Nuclear Decay Data for Dosimetric Calculations' },
      { org: 'IAEA', code: 'Technical Reports Series No. 395', year: '1999', title: 'State of the Art on Water Chemistry in Nuclear Power Plants' }
    ],
    primaryFormula: 'N_i(t) = \\sum_{j=1}^{i} N_j(0) \\cdot \\left[ \\sum_{k=j}^{i} \\frac{\\lambda_k \\cdot e^{-\\lambda_k t}}{\\prod_{p=j, p \\ne k}^{i} (\\lambda_p - \\lambda_k)} \\right]',
    secondaryFormulas: [
      { label: 'Radiolytic Molecular Generation Rate', formula: '\\frac{d[X]}{dt} = \\frac{G(X) \\cdot \\dot{D} \\cdot \\rho_{\\text{sol}}}{100 \\cdot e \\cdot N_A}' },
      { label: 'Secular Equilibrium Condition', formula: '\\frac{A_2}{A_1} \\approx 1.0 \\quad \\text{when } T_{1/2, 1} \\gg T_{1/2, 2}' },
      { label: 'Transient Equilibrium Condition', formula: '\\frac{A_2}{A_1} = \\frac{\\lambda_2}{\\lambda_2 - \\lambda_1} \\quad \\text{when } T_{1/2, 1} > T_{1/2, 2}' }
    ],
    variables: [
      { symbol: 'N_i(t)', description: 'Number of atoms of i-th decay daughter at time t', units: 'atoms' },
      { symbol: '\\lambda_k', description: 'Decay constant of k-th nuclide in decay chain', units: 's⁻¹' },
      { symbol: 'G(X)', description: 'Radiolytic chemical yield (molecules formed per 100 eV absorbed)', units: 'molecules / 100 eV' },
      { symbol: '\\dot{D}', description: 'Absorbed dose rate in aqueous solution', units: 'Gy·s⁻¹' },
      { symbol: '\\rho_{\\text{sol}}', description: 'Mass density of aqueous medium', units: 'kg·m⁻³' }
    ],
    assumptions: [
      'Linear chain without branch recombination loops in analytic Bateman formulation.',
      'Constant primary G-values valid at ambient neutral pH and room temperature.'
    ],
    benchmarks: 'Analytic solutions verified against standard U-238, Ra-226, and Mo-99/Tc-99m decay data.'
  },

  // 7. Module 8: 3D Ray-Tracing Workspace
  {
    id: 'M8-Spatial3D',
    moduleId: 'Module 8',
    moduleName: '3D Workspace',
    domain: 'Dose, Transport & Shielding',
    title: '3D Spatial Ray-Casting & Multi-Material Line-of-Sight Attenuation',
    overview: 'Calculates dose rates throughout a 3D Euclidean coordinate volume, tracing discrete ray trajectories through complex 3D polygonal geometries and shielding obstacles.',
    standards: [
      { org: 'NCRP', code: 'Report No. 151', year: '2005', title: 'Structural Shielding Design and Evaluation for Megavoltage X- and Gamma-Ray Radiotherapy Facilities' },
      { org: 'NIST', code: 'IR 5632', year: '1995', title: 'Tables of X-Ray Mass Attenuation Coefficients and Mass Energy-Absorption Coefficients' }
    ],
    primaryFormula: '\\dot{D}(\\mathbf{r}) = \\sum_{i=1}^{M} \\frac{A_i \\cdot \\Gamma_i}{\\|\\mathbf{r} - \\mathbf{r}_i\\|^2} \\cdot \\prod_{j=1}^{K} \\exp(-\\mu_j \\cdot L_{i,j}(\\mathbf{r}))',
    secondaryFormulas: [
      { label: '3D Ray Path Length', formula: 'L_{i,j}(\\mathbf{r}) = \\|\\mathbf{p}_{\\text{exit}} - \\mathbf{p}_{\\text{entry}}\\|' },
      { label: 'Three-Dimensional Metric', formula: '\\|\\mathbf{r} - \\mathbf{r}_i\\| = \\sqrt{(x - x_i)^2 + (y - y_i)^2 + (z - z_i)^2}' }
    ],
    variables: [
      { symbol: '\\mathbf{r}', description: 'Position vector of field calculation observer (x, y, z)', units: 'm' },
      { symbol: '\\mathbf{r}_i', description: '3D coordinates of the i-th source emitter', units: 'm' },
      { symbol: 'L_{i,j}', description: 'Intersected chord length through the j-th solid obstacle along ray i', units: 'm' },
      { symbol: '\\mu_j', description: 'Linear attenuation coefficient of j-th material at source energy', units: 'm⁻¹' }
    ],
    assumptions: [
      'Narrow-beam attenuation approximation along direct line-of-sight ray vector.',
      'Obstacles modeled as 3D axis-aligned bounding boxes (AABB) and convex polyhedra.'
    ],
    benchmarks: 'Verified against analytical point-kernel integration codes (QAD-CGGP / ISOSHLD).'
  },

  // 8. Module 9: Worker Dosimetry & Stay-Time
  {
    id: 'M9-Worker',
    moduleId: 'Module 9',
    moduleName: 'Worker Dosimetry',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Work Area Dose Integration, Maximum Stay-Time & Distance Planning',
    overview: 'Determines radiological mission execution parameters, integrating time-varying dose rates, and calculating ALARA stay-time limits.',
    standards: [
      { org: 'US NRC', code: 'Regulatory Guide 8.8', year: '1978', title: 'Information Relevant to Ensuring that Occupational Radiation Exposures will be ALARA' },
      { org: 'IAEA', code: 'Safety Standards Series No. GSR Part 3', year: '2014', title: 'Radiation Protection and Safety of Radiation Sources: International Basic Safety Standards' }
    ],
    primaryFormula: 'T_{\\text{stay}} = \\frac{D_{\\text{target}} - D_{\\text{accumulated}}}{\\dot{D}(\\mathbf{r})}',
    secondaryFormulas: [
      { label: 'Integrated Mission Dose', formula: 'D_{\\text{total}} = \\int_{0}^{T_{\\text{mission}}} \\dot{D}(\\mathbf{r}(t)) \\, dt' },
      { label: 'ALARA Optimization Distance', formula: 'd_{\\text{safe}} = \\sqrt{\\frac{A \\cdot \\Gamma}{\\dot{D}_{\\text{limit}}}}' }
    ],
    variables: [
      { symbol: 'T_{\\text{stay}}', description: 'Maximum allowable worker operational duration in radiation field', units: 'h or min' },
      { symbol: 'D_{\\text{target}}', description: 'Administrative mission dose constraint (ALARA target)', units: 'µSv' },
      { symbol: 'D_{\\text{accumulated}}', description: 'Worker baseline accumulated dose prior to task entry', units: 'µSv' },
      { symbol: '\\dot{D}(\\mathbf{r})', description: 'Measured dose equivalent rate at worker position', units: 'µSv·h⁻¹' }
    ],
    assumptions: [
      'Steady-state radiation field during duration of stay-time.',
      'Worker whole-body exposure treated as uniform across trunk dosimeter location.'
    ],
    benchmarks: 'Complies with US NRC 10 CFR 20.1201 occupational stay-time protocols.'
  },

  // 9. Module 10: Pulsed X-Ray Systems
  {
    id: 'M10-Pulsed',
    moduleId: 'Module 10',
    moduleName: 'Pulsed X-Ray Systems',
    domain: 'Spectroscopy & Radiation Detection',
    title: 'Flash X-Ray Radiography, Pulse Duty Cycles & Instantaneous Dose Rates',
    overview: 'Evaluates portable pulsed flash X-ray generators (e.g., Golden Engineering XR150, XR200, XRS-3) characterized by nanosecond burst widths and high instantaneous dose rates.',
    standards: [
      { org: 'NCRP', code: 'Report No. 102', year: '1989', title: 'Medical X-Ray, Electron Beam and Gamma-Ray Protection for Energies Up to 50 MeV' },
      { org: 'IEC', code: '60601-2-54', year: '2018', title: 'Medical Electrical Equipment - Particular Requirements for X-Ray Equipment for Radiography' }
    ],
    primaryFormula: '\\dot{D}_{\\text{instantaneous}} = \\frac{D_{\\text{pulse}}}{\\tau_{\\text{pulse}}} \\quad \\gg \\quad \\dot{D}_{\\text{time-averaged}} = D_{\\text{pulse}} \\cdot \\text{PRF}',
    secondaryFormulas: [
      { label: 'Inverse Square Scaling', formula: 'D_{\\text{pulse}}(d) = D_{\\text{pulse}}(d_0) \\cdot \\left(\\frac{d_0}{d}\\right)^2' },
      { label: 'Duty Cycle Fraction', formula: '\\text{DF} = \\tau_{\\text{pulse}} \\cdot \\text{PRF}' }
    ],
    variables: [
      { symbol: '\\dot{D}_{\\text{instantaneous}}', description: 'Instantaneous dose rate during the nanosecond pulse burst', units: 'R·s⁻¹ or Gy·s⁻¹' },
      { symbol: 'D_{\\text{pulse}}', description: 'Dose delivered per individual pulse', units: 'mR or µGy' },
      { symbol: '\\tau_{\\text{pulse}}', description: 'Full duration of pulse burst (typically 10 - 50 ns)', units: 'ns' },
      { symbol: '\\text{PRF}', description: 'Pulse Repetition Frequency', units: 'Hz (pulses/s)' }
    ],
    assumptions: [
      'Single-pulse dose measured at 30 cm or 100 cm manufacturer reference calibration distances.',
      'Active detector dead-time saturation considerations apply for survey meters in pulsed fields.'
    ],
    benchmarks: 'Validated against Golden Engineering manufacturer spec sheets and flash radiography protocols.'
  },

  // 10. Module 12: Reverse Responder
  {
    id: 'M12-Reverse',
    moduleId: 'Module 12',
    moduleName: 'Reverse Responder',
    domain: 'Environmental Dispersion & Response',
    title: 'Inverse Dose Rate Solver, Multi-Point Triangulation & Source Characterization',
    overview: 'Solves the inverse radiological transport problem, estimating unknown source activity and spatial coordinates (x,y) from multiple survey meter detector readings.',
    standards: [
      { org: 'IAEA', code: 'EPR-First Responders', year: '2006', title: 'Manual for First Responders to a Radiological Emergency' },
      { org: 'ICRU', code: 'Report 75', year: '2006', title: 'Sampling for Radionuclides in the Environment' }
    ],
    primaryFormula: '\\min_{\\mathbf{r}_0, A} \\sum_{j=1}^{M} w_j \\left[ \\dot{D}_j^{\\text{meas}} - \\frac{A \\cdot \\Gamma}{\\|\\mathbf{r}_j - \\mathbf{r}_0\\|^2} \\cdot e^{-\\mu x_j} \\right]^2',
    secondaryFormulas: [
      { label: 'Single Point Activity Estimate', formula: 'A = \\frac{\\dot{D}_{\\text{meas}} \\cdot d^2}{\\Gamma \\cdot \\exp(-\\mu x)}' },
      { label: 'Distance Triangulation Ratio', formula: '\\frac{\\dot{D}_1}{\\dot{D}_2} = \\frac{d_2^2}{d_1^2} = \\frac{(x_2 - x_0)^2 + (y_2 - y_0)^2}{(x_1 - x_0)^2 + (y_1 - y_0)^2}' }
    ],
    variables: [
      { symbol: '\\dot{D}_j^{\\text{meas}}', description: 'Survey instrument reading recorded at detector position j', units: 'µSv·h⁻¹' },
      { symbol: '\\mathbf{r}_0', description: 'Inferred 2D coordinate vector of localized unknown source (x₀, y₀)', units: 'm' },
      { symbol: 'A', description: 'Estimated source activity', units: 'MBq or GBq' },
      { symbol: 'w_j', description: 'Statistical weighting factor (inversely proportional to measurement variance)', units: 'dimensionless' }
    ],
    assumptions: [
      'Localized single point source geometry in an open or partially shielded environment.',
      'Non-linear least squares minimization converged to global minimum.'
    ],
    benchmarks: 'Tested with simulated blind emergency responder search scenarios.'
  },

  // 11. Module 13: Atmospheric Plume Dispersion
  {
    id: 'M13-Plume',
    moduleId: 'Module 13',
    moduleName: 'Plume Modeling',
    domain: 'Environmental Dispersion & Response',
    title: 'Pasquill-Gifford Gaussian Plume Dispersion & Briggs Rural Parameters',
    overview: 'Calculates ground-level air concentrations downwind of continuous or elevated releases using the classical Pasquill-Gifford atmospheric diffusion formulation.',
    standards: [
      { org: 'US EPA', code: 'EPA-454/R-95-004', year: '1995', title: 'User\'s Guide for the Industrial Source Complex (ISC3) Dispersion Models' },
      { org: 'IAEA', code: 'Safety Series No. 19', year: '1980', title: 'Atmospheric Dispersion in Nuclear Power Plant Siting' },
      { org: 'Briggs', code: 'ATDL Report 107', year: '1973', title: 'Diffusion Estimation for Small Emissions' }
    ],
    primaryFormula: '\\chi(x, y, z) = \\frac{Q}{2\\pi u \\sigma_y \\sigma_z} \\exp\\left(-\\frac{y^2}{2\\sigma_y^2}\\right) \\left[ \\exp\\left(-\\frac{(z - H)^2}{2\\sigma_z^2}\\right) + \\exp\\left(-\\frac{(z + H)^2}{2\\sigma_z^2}\\right) \\right]',
    secondaryFormulas: [
      { label: 'Ground-Level Centerline Concentration (y=0, z=0)', formula: '\\chi(x, 0, 0) = \\frac{Q}{\\pi u \\sigma_y(x) \\sigma_z(x)} \\exp\\left(-\\frac{H^2}{2\\sigma_z^2(x)}\\right)' },
      { label: 'Briggs Class D Dispersion Coefficients', formula: '\\sigma_y(x) = 0.08 x (1 + 0.0001 x)^{-0.5}, \\quad \\sigma_z(x) = 0.06 x (1 + 0.0015 x)^{-0.5}' }
    ],
    variables: [
      { symbol: '\\chi', description: 'Airborne activity concentration at receptor coordinates (x, y, z)', units: 'Bq·m⁻³ or Ci·m⁻³' },
      { symbol: 'Q', description: 'Continuous source release rate', units: 'Bq·s⁻¹ or Ci·s⁻¹' },
      { symbol: 'u', description: 'Mean transport wind speed at release height', units: 'm·s⁻¹' },
      { symbol: '\\sigma_y(x)', description: 'Horizontal crosswind dispersion standard deviation', units: 'm' },
      { symbol: '\\sigma_z(x)', description: 'Vertical crosswind dispersion standard deviation', units: 'm' },
      { symbol: 'H', description: 'Effective release height (physical stack height + plume rise)', units: 'm' }
    ],
    assumptions: [
      'Steady-state meteorological conditions with stationary wind speed and direction.',
      'Total reflection of pollutant plume at the ground surface (mirror image source formulation).'
    ],
    benchmarks: 'Formulation identically replicates US NRC Regulatory Guide 1.145 and EPA ISC3 benchmarks.'
  },

  // 12. Module 14: Shielding Optimization & ALARA
  {
    id: 'M14-Shielding',
    moduleId: 'Module 14',
    moduleName: 'Shielding Optimization',
    domain: 'Dose, Transport & Shielding',
    title: 'Multi-Layer Exponential Attenuation, HVL, TVL & NIST Mass Coefficients',
    overview: 'Optimizes composite multi-material barrier shields (Lead, Tungsten, Steel, Concrete, Water) computing Half-Value and Tenth-Value layer thickness parameters.',
    standards: [
      { org: 'NIST', code: 'XCOM Database (SRD 8)', year: '2010', title: 'Photon Cross Sections Database' },
      { org: 'NCRP', code: 'Report No. 151', year: '2005', title: 'Structural Shielding Design and Evaluation for Megavoltage Facilities' }
    ],
    primaryFormula: 'I(x) = I_0 \\cdot \\prod_{k=1}^{M} \\exp(-\\mu_k \\cdot x_k) = I_0 \\cdot \\exp\\left(-\\sum_{k=1}^{M} \\left(\\frac{\\mu}{\\rho}\\right)_k \\cdot \\rho_k x_k\\right)',
    secondaryFormulas: [
      { label: 'Half-Value Layer (HVL)', formula: '\\text{HVL} = \\frac{\\ln(2)}{\\mu} = \\frac{0.693147}{\\mu}' },
      { label: 'Tenth-Value Layer (TVL)', formula: '\\text{TVL} = \\frac{\\ln(10)}{\\mu} = \\frac{2.302585}{\\mu} = 3.3219 \\times \\text{HVL}' },
      { label: 'Barrier Transmission Factor', formula: 'B_t = \\frac{I}{I_0} = 2^{-N_{\\text{HVL}}} = 10^{-N_{\\text{TVL}}}' }
    ],
    variables: [
      { symbol: 'I(x)', description: 'Transmitted photon intensity or dose rate through shield', units: 'µSv·h⁻¹' },
      { symbol: 'I_0', description: 'Incident unshielded photon intensity', units: 'µSv·h⁻¹' },
      { symbol: '\\mu', description: 'Linear attenuation coefficient', units: 'cm⁻¹' },
      { symbol: '\\mu / \\rho', description: 'Mass attenuation coefficient from NIST XCOM', units: 'cm²·g⁻¹' },
      { symbol: '\\rho', description: 'Material mass density', units: 'g·cm⁻³' },
      { symbol: 'x', description: 'Physical thickness of shielding barrier', units: 'cm' }
    ],
    assumptions: [
      'Narrow-beam geometry attenuation conditions.',
      'Energy-weighted average linear attenuation coefficients applied for polyenergetic isotopes.'
    ],
    benchmarks: 'Cross-verified with NIST Standard Reference Database 8 (XCOM) mass attenuation tables.'
  },

  // 13. Module 15: Laser Radiation Safety & NOHD
  {
    id: 'M15-Laser',
    moduleId: 'Module 15',
    moduleName: 'Laser Safety & NOHD',
    domain: 'Non-Ionizing EMR & Lasers',
    title: 'ANSI Z136.1 Maximum Permissible Exposure (MPE), Beam Divergence & NOHD',
    overview: 'Determines ocular hazard thresholds across the optical spectrum (180 nm to 1 mm), calculating beam waist growth, Nominal Ocular Hazard Distance (NOHD), and eyewear Optical Density (OD).',
    standards: [
      { org: 'ANSI', code: 'Z136.1', year: '2022', title: 'American National Standard for Safe Use of Lasers' },
      { org: 'IEC', code: '60825-1 (Ed. 3)', year: '2014', title: 'Safety of Laser Products - Part 1: Equipment Classification and Requirements' }
    ],
    primaryFormula: '\\text{NOHD} = \\frac{1}{\\theta} \\sqrt{\\frac{4 \\Phi}{\\pi \\cdot \\text{MPE}} - a^2}',
    secondaryFormulas: [
      { label: 'Beam Diameter at Range r', formula: 'w(r) = \\sqrt{a^2 + (r \\cdot \\theta)^2}' },
      { label: 'Beam Irradiance Profile', formula: 'E(r) = \\frac{4 \\Phi}{\\pi [w(r)]^2} = \\frac{\\Phi}{A(r)}' },
      { label: 'Required Eyewear Optical Density (OD)', formula: '\\text{OD} = \\log_{10}\\left(\\frac{H_0}{\\text{MPE}}\\right) = \\log_{10}\\left(\\frac{E_0}{\\text{MPE}}\\right)' },
      { label: 'Visible Aversion MPE (0.25s blink reflex)', formula: '\\text{MPE}_{\\text{vis}} = 1.8 \\times t^{0.75} \\text{ mJ/cm}^2 \\quad [2.55\\text{ mW/cm}^2 \\text{ for 0.25s}]' }
    ],
    variables: [
      { symbol: '\\text{NOHD}', description: 'Nominal Ocular Hazard Distance', units: 'm' },
      { symbol: '\\Phi', description: 'Total laser radiant power (CW) or energy per pulse (Pulsed)', units: 'W or J' },
      { symbol: '\\theta', description: 'Beam divergence angle (full angle)', units: 'rad' },
      { symbol: 'a', description: 'Initial beam diameter at exit aperture', units: 'm' },
      { symbol: '\\text{MPE}', description: 'Maximum Permissible Exposure for the eye', units: 'W·m⁻² or J·m⁻²' },
      { symbol: '\\text{OD}', description: 'Protective eyewear Optical Density at laser wavelength', units: 'dimensionless' }
    ],
    assumptions: [
      'Circular Gaussian (TEM₀₀) spatial beam irradiance distribution.',
      'Standard 7-mm limiting pupil aperture diameter for visible wavelengths.'
    ],
    benchmarks: 'Matches ANSI Z136.1-2022 Table 5a ocular limits and IEC 60825-1 Class 1-4 hazard bounds.'
  },

  // 14. Module 16: X-Ray Tube Physics & Spectrum Generator
  {
    id: 'M16-XRayTube',
    moduleId: 'Module 16',
    moduleName: 'X-Ray Tube Simulator',
    domain: 'Spectroscopy & Radiation Detection',
    title: 'Kramers\' Law Bremsstrahlung, Characteristic K-Shell Lines & Filtration HVL',
    overview: 'Generates continuous and characteristic X-ray tube emission spectra as a function of target material (W, Mo, Rh), tube potential (kVp), filtration (Al, Cu), and anode take-off angle.',
    standards: [
      { org: 'IPEM', code: 'Report 78', year: '1997', title: 'Catalogue of Diagnostic X-ray Spectra and Other Data' },
      { org: 'AAPM', code: 'Report No. 175', year: '2016', title: 'The Expanding Role of Medical Physics in Diagnostic Imaging' }
    ],
    primaryFormula: '\\frac{dI_{\\text{brems}}}{dE} = C \\cdot Z \\cdot (E_{\\text{max}} - E) \\quad \\text{where } E_{\\text{max}} = e \\cdot V_{\\text{kVp}}',
    secondaryFormulas: [
      { label: 'Transmitted Filtered Spectrum', formula: 'I_{\\text{filt}}(E) = I_0(E) \\cdot \\exp(-\\mu_{\\text{Al}}(E) x_{\\text{Al}} - \\mu_{\\text{Cu}}(E) x_{\\text{Cu}})' },
      { label: 'Characteristic Emission Intensity', formula: 'I_{\\text{char}} \\propto (V_{\\text{kVp}} - V_K)^{1.6} \\quad \\text{for } V_{\\text{kVp}} > V_K' },
      { label: 'Air Kerma Rate at 1 Meter', formula: '\\dot{K}_{\\text{air}} \\propto I_{\\text{tube}} \\cdot V_{\\text{kVp}}^2 \\cdot d^{-2}' }
    ],
    variables: [
      { symbol: 'I_{\\text{brems}}(E)', description: 'Bremsstrahlung photon intensity per energy interval', units: 'photons·keV⁻¹' },
      { symbol: 'Z', description: 'Atomic number of target anode material (W=74, Mo=42, Rh=45)', units: 'dimensionless' },
      { symbol: 'E_{\\text{max}}', description: 'Maximum photon cutoff energy (equal to peak tube voltage)', units: 'keV' },
      { symbol: 'V_K', description: 'Target K-shell electron binding edge energy', units: 'keV' },
      { symbol: 'x_{\\text{Al}}, x_{\\text{Cu}}', description: 'Thickness of added aluminum and copper filtration barriers', units: 'mm' }
    ],
    assumptions: [
      'Kramers-Birch-Marshall semi-empirical thick-target model.',
      'Characteristic K-alpha and K-beta peaks broadened with Gaussian detector response functions.'
    ],
    benchmarks: 'Cross-validated with IPEM 78 diagnostic X-ray spectra and TASMIP models.'
  },

  // 15. Module 17: Internal Dosimetry & ICRP Biokinetics
  {
    id: 'M17-Internal',
    moduleId: 'Module 17',
    moduleName: 'Internal Dosimetry',
    domain: 'Internal Dosimetry & Biokinetics',
    title: 'ICRP Compartmental Biokinetic ODEs, Effective Half-Life & Committed Dose e(50)',
    overview: 'Models metabolic intake, bloodstream uptake, target organ deposition, and systemic clearance using multi-compartment differential equations.',
    standards: [
      { org: 'ICRP', code: 'Publication 30', year: '1979', title: 'Limits for Intakes of Radionuclides by Workers' },
      { org: 'ICRP', code: 'Publication 60', year: '1991', title: '1990 Recommendations of the International Commission on Radiological Protection' },
      { org: 'ICRP', code: 'Publication 119', year: '2012', title: 'Compendium of Dose Coefficients based on ICRP Publication 60' }
    ],
    primaryFormula: '\\frac{1}{T_{1/2,\\text{eff}}} = \\frac{1}{T_{1/2,\\text{radio}}} + \\frac{1}{T_{1/2,\\text{bio}}} \\iff \\lambda_{\\text{eff}} = \\lambda_{\\text{radio}} + \\lambda_{\\text{bio}}',
    secondaryFormulas: [
      { label: 'Intake Compartment ODE', formula: '\\frac{d A_{\\text{intake}}}{dt} = -(\\lambda_{\\text{clear}} + \\lambda_r) A_{\\text{intake}}' },
      { label: 'Target Organ Retention ODE', formula: '\\frac{d A_{\\text{organ}}}{dt} = f_{\\text{organ}} \\lambda_{\\text{dist}} A_{\\text{blood}} - (\\lambda_{\\text{bio}} + \\lambda_r) A_{\\text{organ}}' },
      { label: 'Committed Effective Dose (50 years)', formula: 'E(50) = A_0 \\cdot e(50)' },
      { label: 'Annual Limit on Intake (ALI)', formula: '\\text{ALI} = \\frac{20\\text{ mSv}}{e(50)}' }
    ],
    variables: [
      { symbol: 'T_{1/2,\\text{eff}}', description: 'Effective biological clearance half-life in target organ', units: 'days' },
      { symbol: 'T_{1/2,\\text{radio}}', description: 'Radioactive physical half-life', units: 'days' },
      { symbol: 'T_{1/2,\\text{bio}}', description: 'Biological clearance half-life via metabolic excretion', units: 'days' },
      { symbol: 'e(50)', description: 'Committed effective dose coefficient per unit intake for adult worker', units: 'Sv·Bq⁻¹' },
      { symbol: 'E(50)', description: '50-year committed effective dose', units: 'mSv or Sv' },
      { symbol: '\\text{ALI}', description: 'Annual Limit on Intake corresponding to 20 mSv annual occupational limit', units: 'Bq' }
    ],
    assumptions: [
      'First-order linear compartmental transfer kinetics.',
      'Integration window spans 50 years for adult occupational exposure following acute intake.'
    ],
    benchmarks: 'Dose coefficients verified against ICRP Publication 119 Table A.1 and A.2.'
  },

  // 16. Module 18: Electronic Warfare EMR & Microwave Safety
  {
    id: 'M18-EMR',
    moduleId: 'Module 18',
    moduleName: 'EW EMR & Microwave Safety',
    domain: 'Non-Ionizing EMR & Lasers',
    title: 'FCC OET-65 & IEEE C95.1 Microwave Hazard Boundaries, Near-Field & Radome Hotspots',
    overview: 'Evaluates high-power microwave transmitters, radar systems, and counter-IED omnidirectional jammers. Computes near-field boundaries, power densities, and radome reflections.',
    standards: [
      { org: 'FCC', code: 'OET Bulletin 65', year: '1997', title: 'Evaluating Compliance with FCC Guidelines for Human Exposure to Radiofrequency Fields' },
      { org: 'IEEE', code: 'C95.1-2019', year: '2019', title: 'Standard for Safety Levels with Respect to Human Exposure to Electric, Magnetic, and Electromagnetic Fields' },
      { org: 'ICNIRP', code: 'Guidelines', year: '2020', title: 'Guidelines for Limiting Exposure to Electromagnetic Fields (100 kHz to 300 GHz)' }
    ],
    primaryFormula: 'S_{\\text{far}}(R) = \\frac{\\text{EIRP}_{\\text{avg}}}{4\\pi R^2} = \\frac{P_{\\text{peak}} \\cdot \\text{DF} \\cdot G}{4\\pi R^2}',
    secondaryFormulas: [
      { label: 'Transition Distance (Near-Field to Far-Field)', formula: 'R_{\\text{nf}} = \\frac{2 D^2}{\\lambda} = \\frac{2 D^2 \\cdot f}{c}' },
      { label: 'Near-Field Maximum Power Density', formula: 'S_{\\text{nf, max}} = \\frac{4 P_{\\text{avg}}}{A_{\\text{aperture}}} = \\frac{16 P_{\\text{avg}}}{\\pi D^2}' },
      { label: 'Radome Standing Wave Reflection Hotspot', formula: 'S_{\\text{internal}} = S_{\\text{incident}} \\cdot (1 + \\sqrt{\\Gamma_{\\text{refl}}})^2' },
      { label: 'FCC Controlled Limit (300-1500 MHz)', formula: 'S_{\\text{limit}} = \\frac{f_{\\text{MHz}}}{300} \\text{ mW/cm}^2 \\quad [5.0\\text{ mW/cm}^2 \\text{ for } > 1500\\text{ MHz}]' }
    ],
    variables: [
      { symbol: 'S', description: 'Planar equivalent electromagnetic power density', units: 'W·m⁻² or mW·cm⁻²' },
      { symbol: '\\text{EIRP}_{\\text{avg}}', description: 'Equivalent Isotropically Radiated Power (time-averaged)', units: 'W' },
      { symbol: 'P_{\\text{peak}}', description: 'Transmitter peak pulse power', units: 'W or kW' },
      { symbol: '\\text{DF}', description: 'Waveform duty factor (pulse width × PRF, or 1.0 for CW)', units: 'dimensionless' },
      { symbol: 'G', description: 'Antenna numeric gain (10^(G_dBi / 10))', units: 'dimensionless' },
      { symbol: 'D', description: 'Antenna aperture physical diameter or dimension', units: 'm' },
      { symbol: '\\lambda', description: 'Electromagnetic carrier wavelength (c / f)', units: 'm' }
    ],
    assumptions: [
      'Plane-wave Far-Field conditions valid for distances R > 2 D² / λ.',
      'Standing wave constructive interference multiplier inside dielectric radome enclosures.'
    ],
    benchmarks: 'Directly follows FCC OET Bulletin 65 (Section 2) and IEEE C95.1-2019 Table 7.'
  },

  // 17. Module 19: Criticality Safety & Reactor Core Simulator
  {
    id: 'M19-Criticality',
    moduleId: 'Module 19',
    moduleName: 'Criticality & Reactor Core',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Four-Factor Formula, Geometric Buckling & 2D Jacobi Neutron Diffusion',
    overview: 'Simulates neutron multiplication, four-factor neutron economy, geometric non-leakage probabilities, control rod reactivity insertion, and spatial 2D thermal neutron flux.',
    standards: [
      { org: 'ANS', code: 'ANSI/ANS-8.1', year: '2014', title: 'Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors' },
      { org: 'IAEA', code: 'Safety Standards Series No. SSG-27', year: '2014', title: 'Criticality Safety in the Handling of Fissile Material' },
      { org: 'Lamarsh & Baratta', code: 'Textbook Ref', year: '2001', title: 'Introduction to Nuclear Engineering (3rd Ed., Prentice Hall)' }
    ],
    primaryFormula: 'k_{\\text{eff}} = k_\\infty \\cdot P_{\\text{FNL}} \\cdot P_{\\text{TNL}} = (\\eta \\cdot f \\cdot p \\cdot \\varepsilon) \\cdot \\frac{1}{1 + M^2 B^2}',
    secondaryFormulas: [
      { label: 'Reactivity in pcm', formula: '\\rho = \\frac{k_{\\text{eff}} - 1}{k_{\\text{eff}}} \\times 10^5 \\quad [\\text{pcm}]' },
      { label: 'Asymptotic Reactor Period (Delayed Neutrons)', formula: 'T = \\frac{\\beta - \\rho}{\\lambda_{\\text{eff}} \\cdot \\rho} \\quad (\\text{for } 0 < \\rho < \\beta)' },
      { label: 'Prompt Critical Runaway Period', formula: 'T_{\\text{prompt}} = \\frac{\\ell^*}{\\rho - \\beta} \\quad (\\text{for } \\rho \\ge \\beta = 0.0065)' },
      { label: '2D Finite-Difference Neutron Diffusion', formula: '-D \\left( \\frac{\\partial^2 \\phi}{\\partial x^2} + \\frac{\\partial^2 \\phi}{\\partial y^2} \\right) + \\Sigma_a \\phi = \\frac{1}{k_{\\text{eff}}} \\nu \\Sigma_f \\phi' }
    ],
    variables: [
      { symbol: 'k_{\\text{eff}}', description: 'Effective neutron multiplication factor (ratio of neutrons in gen n to n-1)', units: 'dimensionless' },
      { symbol: '\\eta', description: 'Thermal reproduction factor (neutrons produced per thermal absorption in fuel)', units: 'dimensionless' },
      { symbol: 'f', description: 'Thermal utilization factor (thermal neutrons absorbed in fuel vs total absorption)', units: 'dimensionless' },
      { symbol: 'p', description: 'Resonance escape probability during neutron thermalization', units: 'dimensionless' },
      { symbol: '\\varepsilon', description: 'Fast fission multiplication factor', units: 'dimensionless' },
      { symbol: 'B^2', description: 'Geometric buckling factor (eigenvalue of Helmholtz equation)', units: 'm⁻²' },
      { symbol: 'M^2', description: 'Migration area (L² + τ)', units: 'm²' },
      { symbol: '\\beta', description: 'Effective delayed neutron fraction (0.0065 for U-235)', units: 'dimensionless' }
    ],
    assumptions: [
      'One-group thermal neutron diffusion approximation on Cartesian lattice.',
      'Reflector savings modeled as effective geometric boundary expansion.'
    ],
    benchmarks: 'Validated against standard PWR, BWR, CANDU, and Godiva II fast burst critical benchmarks.'
  },

  // 18. Module 20: Gamma Spectroscopy & MCA Simulator
  {
    id: 'M20-Spectroscopy',
    moduleId: 'Module 20',
    moduleName: 'Gamma Spectroscopy (MCA)',
    domain: 'Spectroscopy & Radiation Detection',
    title: 'Multi-Channel Analyzer (MCA) Pulse-Height Physics & Klein-Nishina Kinematics',
    overview: 'Simulates gamma interaction physics in scintillation and semiconductor detectors: photopeaks with energy-dependent resolution, Klein-Nishina Compton scatter, escape peaks, and lead X-rays.',
    standards: [
      { org: 'IEEE', code: 'Standard 309-1999', year: '1999', title: 'Standard Test Procedures for Germanium Gamma-Ray Detectors' },
      { org: 'ANSI', code: 'N42.14-1999', year: '1999', title: 'Calibration and Use of Germanium Spectrometers for the Measurement of Gamma-Ray Emission Rates' },
      { org: 'Knoll', code: 'Textbook Ref', year: '2010', title: 'Radiation Detection and Measurement (4th Ed., John Wiley & Sons)' }
    ],
    primaryFormula: '\\text{FWHM}(E) = \\text{FWHM}_{662} \\cdot \\sqrt{\\frac{E}{661.7}} \\iff \\sigma(E) = \\frac{\\text{FWHM}(E)}{2.35482}',
    secondaryFormulas: [
      { label: 'Klein-Nishina Compton Edge Energy', formula: 'E_C = \\frac{E_\\gamma}{1 + \\frac{m_e c^2}{2 E_\\gamma}} = \\frac{E_\\gamma}{1 + \\frac{511\\text{ keV}}{2 E_\\gamma}}' },
      { label: '180° Backscatter Peak Energy', formula: 'E_B = \\frac{E_\\gamma}{1 + \\frac{2 E_\\gamma}{m_e c^2}} = \\frac{E_\\gamma}{1 + \\frac{2 E_\\gamma}{511\\text{ keV}}}' },
      { label: 'Single & Double Escape Peaks (E_γ > 1.022 MeV)', formula: 'E_{\\text{SEP}} = E_\\gamma - 511\\text{ keV}, \\quad E_{\\text{DEP}} = E_\\gamma - 1022\\text{ keV}' },
      { label: 'Gaussian Photopeak Shape', formula: 'C(E) = \\frac{A_{\\text{peak}}}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(E - E_\\gamma)^2}{2\\sigma^2} \\right)' }
    ],
    variables: [
      { symbol: '\\text{FWHM}', description: 'Full Width at Half Maximum energy resolution of detector', units: 'keV' },
      { symbol: 'E_\\gamma', description: 'Discrete nuclear gamma-ray emission energy', units: 'keV' },
      { symbol: 'E_C', description: 'Compton edge maximum scattered electron recoil energy', units: 'keV' },
      { symbol: 'E_B', description: 'Energy of 180° backscattered photon entering detector from surroundings', units: 'keV' },
      { symbol: 'm_e c^2', description: 'Electron rest mass energy (510.9989 keV)', units: 'keV' },
      { symbol: '\\sigma', description: 'Gaussian standard deviation of the photopeak', units: 'keV' }
    ],
    assumptions: [
      'Linear energy calibration across the 2048 MCA multi-channel analyzer channels (1.465 keV/channel).',
      'Poisson counting statistics simulated using Gaussian approximations for large count regimes.'
    ],
    benchmarks: 'Matches standard experimental MCA pulse-height spectra for Cs-137, Co-60, and Eu-152.'
  }
];

const DOMAINS: DomainCategory[] = [
  'All Domains',
  'Dose, Transport & Shielding',
  'Nuclear Kinetics & Reactivity',
  'Non-Ionizing EMR & Lasers',
  'Spectroscopy & Radiation Detection',
  'Internal Dosimetry & Biokinetics',
  'Environmental Dispersion & Response',
  'Regulatory Standards & Transport Security'
];

const LiteratureModule: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>('All Domains');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<string>(METHOD_DOCS[0].id);

  // Filter documents based on domain and search term
  const filteredDocs = useMemo(() => {
    return METHOD_DOCS.filter((doc) => {
      const matchesDomain = selectedDomain === 'All Domains' || doc.domain === selectedDomain;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(q) ||
        doc.moduleName.toLowerCase().includes(q) ||
        doc.moduleId.toLowerCase().includes(q) ||
        doc.overview.toLowerCase().includes(q) ||
        doc.standards.some((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q));
      return matchesDomain && matchesSearch;
    });
  }, [selectedDomain, searchQuery]);

  // Active selected document
  const activeDoc = useMemo(() => {
    const found = filteredDocs.find((d) => d.id === activeDocId);
    return found || filteredDocs[0] || METHOD_DOCS[0];
  }, [filteredDocs, activeDocId]);

  return (
    <div className="literature-module">
      <div className="panel-header">
        <h2>📚 Core Literature, Physics Formulations & Regulatory Standards</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Comprehensive peer-reviewed scientific methodology compendium documenting the governing mathematical equations, boundary limits, and international regulatory standards across all analytical modules.
        </p>
      </div>

      {/* Domain Navigation & Search Controls */}
      <div className="panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DOMAINS.map((dom) => (
              <button
                key={dom}
                className="btn btn-primary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  background: selectedDomain === dom ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                  color: selectedDomain === dom ? '#000' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  fontWeight: selectedDomain === dom ? 'bold' : 'normal'
                }}
                onClick={() => setSelectedDomain(dom)}
              >
                {dom}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              placeholder="🔍 Search equations, standards, codes..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Module Document Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          {filteredDocs.map((doc) => {
            const isSelected = activeDoc.id === doc.id;
            return (
              <button
                key={doc.id}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                  color: isSelected ? '#00e5ff' : '#fff',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`
                }}
                onClick={() => setActiveDocId(doc.id)}
              >
                <strong>{doc.moduleId}:</strong> {doc.moduleName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Methodology View */}
      {activeDoc && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '25px' }}>
          {/* Main Equation & Theory Panel */}
          <div className="panel" style={{ flex: '2 1 650px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  {activeDoc.moduleId} — {activeDoc.domain}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', borderRadius: '4px', border: '1px solid rgba(0,229,255,0.3)' }}>
                  Peer-Reviewed Methodology
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#fff' }}>{activeDoc.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>{activeDoc.overview}</p>
            </div>

            {/* Primary Governing Equation Box */}
            <div style={{ padding: '20px', background: 'rgba(3, 7, 18, 0.75)', border: '1px solid var(--color-primary)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: 'bold' }}>
                Primary Mathematical Formulation
              </div>
              <div style={{ fontSize: '1.3rem', color: '#fff', margin: '10px 0' }}>
                <BlockMath math={activeDoc.primaryFormula} />
              </div>
            </div>

            {/* Auxiliary Formulations */}
            {activeDoc.secondaryFormulas && activeDoc.secondaryFormulas.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Auxiliary & Governing Sub-Equations
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                  {activeDoc.secondaryFormulas.map((sub, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                        {sub.label}
                      </span>
                      <div style={{ fontSize: '1rem', color: '#fff' }}>
                        <BlockMath math={sub.formula} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variable Nomenclature Table */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Symbol Nomenclature & Units
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', width: '20%' }}>Variable</th>
                      <th style={{ padding: '8px', textAlign: 'left', width: '55%' }}>Physical Description</th>
                      <th style={{ padding: '8px', textAlign: 'left', width: '25%' }}>SI / Standard Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDoc.variables.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#00E5FF' }}>
                          <InlineMath math={v.symbol} />
                        </td>
                        <td style={{ padding: '8px', color: '#fff' }}>{v.description}</td>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Standards & Boundaries Sidebar */}
          <div className="panel" style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Regulatory Codes & Standards</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeDoc.standards.map((s, idx) => (
                <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>{s.org} {s.code}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.year}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fff' }}>{s.title}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Physical Assumptions & Validity
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeDoc.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Analytical Benchmark
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', lineHeight: '1.4' }}>
                {activeDoc.benchmarks}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Master Peer-Reviewed Bibliography Table */}
      <div className="panel">
        <h3>Master Scientific Bibliography & International Standards Register</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
          The mathematical and physical models in RadPro Analyst are certified against the following international regulatory authorities and peer-reviewed treatises.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Standard / Citation</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Governing Body</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Year</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Title / Publication Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Implemented Scope</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ICRP Publication 107</td>
                <td style={{ padding: '10px' }}>ICRP</td>
                <td style={{ padding: '10px' }}>2008</td>
                <td style={{ padding: '10px' }}>Nuclear Decay Data for Dosimetric Calculations</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decay schemes, half-lives, transition energies, and branching fractions for 1,252 radionuclides.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ICRP Publication 103</td>
                <td style={{ padding: '10px' }}>ICRP</td>
                <td style={{ padding: '10px' }}>2007</td>
                <td style={{ padding: '10px' }}>The 2007 Recommendations of the International Commission on Radiological Protection</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>System of radiological protection, occupational and public dose limits, tissue weighting factors.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA SSR-6 (Rev. 1)</td>
                <td style={{ padding: '10px' }}>IAEA</td>
                <td style={{ padding: '10px' }}>2018</td>
                <td style={{ padding: '10px' }}>Regulations for the Safe Transport of Radioactive Material</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>A₁/A₂ package activity limits, Transport Index (TI), and Type Excepted/A/B shipping criteria.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI Z136.1-2022</td>
                <td style={{ padding: '10px' }}>LIA / ANSI</td>
                <td style={{ padding: '10px' }}>2022</td>
                <td style={{ padding: '10px' }}>American National Standard for Safe Use of Lasers</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Wavelength-dependent ocular Maximum Permissible Exposure (MPE), NOHD, and eyewear Optical Density (OD).</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FCC OET Bulletin 65</td>
                <td style={{ padding: '10px' }}>US FCC</td>
                <td style={{ padding: '10px' }}>1997</td>
                <td style={{ padding: '10px' }}>Evaluating Compliance with FCC Guidelines for Human Exposure to Radiofrequency Fields</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Near-field / far-field microwave power density limits, uncontrolled vs controlled human exposure boundaries.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IEEE C95.1-2019</td>
                <td style={{ padding: '10px' }}>IEEE / ICES</td>
                <td style={{ padding: '10px' }}>2019</td>
                <td style={{ padding: '10px' }}>Standard for Safety Levels with Respect to Human Exposure to Electric, Magnetic, and Electromagnetic Fields</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Permissible exposure limits (PEL) for radiofrequency and microwave radiation from 0 kHz to 300 GHz.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NIST XCOM (SRD 8)</td>
                <td style={{ padding: '10px' }}>NIST</td>
                <td style={{ padding: '10px' }}>2010</td>
                <td style={{ padding: '10px' }}>Photon Cross Sections Database (Berger, Hubbell, Seltzer)</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Mass attenuation coefficients (μ/ρ) for elements Z=1 to 100 from 1 keV to 100 GeV.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC 10 CFR 20</td>
                <td style={{ padding: '10px' }}>US NRC</td>
                <td style={{ padding: '10px' }}>2023</td>
                <td style={{ padding: '10px' }}>Title 10, Code of Federal Regulations, Part 20</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Statutory occupational dose limits (50 mSv TEDE, 150 mSv LDE, 500 mSv SDE) and ALARA programs.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI/ANS-8.1-2014</td>
                <td style={{ padding: '10px' }}>ANS / ANSI</td>
                <td style={{ padding: '10px' }}>2014</td>
                <td style={{ padding: '10px' }}>Nuclear Criticality Safety in Operations with Fissionable Materials</td>
                <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Criticality safety limits, subcritical margins, and fissile material multiplication thresholds (k_eff).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiteratureModule;
