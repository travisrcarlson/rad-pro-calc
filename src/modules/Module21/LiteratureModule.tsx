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
  | 'Regulatory Standards & Transport Security'
  | 'Medical & Advanced Expansion';

export type ViewTab = 'current' | 'expansion' | 'derivations' | 'standards';

export interface MethodDoc {
  id: string;
  moduleId: string;
  moduleName: string;
  domain: DomainCategory;
  title: string;
  overview: string;
  isExpansion?: boolean;
  standards: {
    org: string;
    code: string;
    year: string;
    title: string;
  }[];
  primaryFormula: string;
  secondaryFormulas?: { label: string; formula: string }[];
  derivationSteps?: { stepTitle: string; explanation: string; math: string }[];
  variables: { symbol: string; description: string; units: string }[];
  assumptions: string[];
  benchmarks: string;
}

const METHOD_DOCS: MethodDoc[] = [
  // 1. Module 1: Nuclide Database
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
    derivationSteps: [
      {
        stepTitle: '1. First-Order Rate Equation',
        explanation: 'Radioactive disintegration is a stochastic Poisson process where the probability of decay per unit time is constant (λ):',
        math: '\\frac{dN(t)}{dt} = -\\lambda N(t) \\implies N(t) = N_0 e^{-\\lambda t}'
      },
      {
        stepTitle: '2. Half-Life Definition',
        explanation: 'Setting N(T_1/2) = N_0 / 2 yields the fundamental decay constant relationship:',
        math: '\\frac{N_0}{2} = N_0 e^{-\\lambda T_{1/2}} \\implies \\ln\\left(\\frac{1}{2}\\right) = -\\lambda T_{1/2} \\implies \\lambda = \\frac{\\ln(2)}{T_{1/2}}'
      }
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
      'Branching ratios normalized such that sum of all decay mode probabilities equals 1.0.'
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
    derivationSteps: [
      {
        stepTitle: '1. Geometric Flux Conservation',
        explanation: 'An isotropic source emits S photons per second uniformly into 4π steradians. The uncollided photon flux at distance d is:',
        math: '\\Phi(d) = \\frac{S}{4\\pi d^2} = \\frac{A \\sum y_i}{4\\pi d^2}'
      },
      {
        stepTitle: '2. Kerma and Dose Conversion',
        explanation: 'Multiplying flux by mass energy-absorption coefficient (μ_en / ρ)_air and converting units yields the specific gamma-ray constant Γ:',
        math: '\\dot{K}_{\\text{air}} = \\Phi \\cdot E \\cdot \\left(\\frac{\\mu_{\\text{en}}}{\\rho}\\right)_{\\text{air}} \\implies \\dot{H}^*(10) = \\frac{A \\cdot \\Gamma}{d^2}'
      }
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
      { label: 'Line Source Kernel (Sievert Integral)', formula: '\\dot{D}(d) = \\frac{A_L \\cdot \\Gamma}{d} \\int_{\\theta_1}^{\\theta_2} e^{-\\mu t \\sec\\theta} \\, d\\theta' },
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
    derivationSteps: [
      {
        stepTitle: '1. Coupled Differential Equations',
        explanation: 'For a decay chain Parent (1) -> Daughter (2) -> Granddaughter (3):',
        math: '\\frac{dN_1}{dt} = -\\lambda_1 N_1, \\quad \\frac{dN_2}{dt} = \\lambda_1 N_1 - \\lambda_2 N_2'
      },
      {
        stepTitle: '2. Laplace Transform Solution',
        explanation: 'Transforming into the s-domain yields algebraic products that invert into the Bateman sum over poles at s = -λ_k:',
        math: 's \\tilde{N}_2(s) - N_2(0) = \\lambda_1 \\frac{N_1(0)}{s + \\lambda_1} - \\lambda_2 \\tilde{N}_2(s) \\implies \\tilde{N}_2(s) = \\frac{\\lambda_1 N_1(0)}{(s + \\lambda_1)(s + \\lambda_2)}'
      }
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

  // 7. Module 13: Atmospheric Plume Dispersion
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
    derivationSteps: [
      {
        stepTitle: '1. Advection-Diffusion Equation',
        explanation: 'Starting from the 3D mass conservation equation with constant wind along x and Fickian eddy diffusivity:',
        math: 'u \\frac{\\partial \\chi}{\\partial x} = K_y \\frac{\\partial^2 \\chi}{\\partial y^2} + K_z \\frac{\\partial^2 \\chi}{\\partial z^2}'
      },
      {
        stepTitle: '2. Method of Images for Ground Boundary',
        explanation: 'To satisfy the zero vertical flux boundary condition at ground level (dχ/dz = 0 at z = 0), a virtual image source is placed at z = -H:',
        math: '\\chi(z) \\propto \\exp\\left(-\\frac{(z-H)^2}{2\\sigma_z^2}\\right) + \\exp\\left(-\\frac{(z+H)^2}{2\\sigma_z^2}\\right)'
      }
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

  // 8. Module 15: Laser Radiation Safety & NOHD
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
    derivationSteps: [
      {
        stepTitle: '1. Irradiance Equated to MPE Threshold',
        explanation: 'At the boundary distance r = NOHD, beam irradiance E(r) exactly equals the Maximum Permissible Exposure (MPE):',
        math: 'E(\\text{NOHD}) = \\frac{4\\Phi}{\\pi [w(\\text{NOHD})]^2} = \\text{MPE}'
      },
      {
        stepTitle: '2. Solving for NOHD',
        explanation: 'Substituting w(r) = sqrt(a² + (rθ)²) and isolating the distance variable r:',
        math: 'a^2 + (\\text{NOHD} \\cdot \\theta)^2 = \\frac{4\\Phi}{\\pi \\cdot \\text{MPE}} \\implies \\text{NOHD} = \\frac{1}{\\theta}\\sqrt{\\frac{4\\Phi}{\\pi \\cdot \\text{MPE}} - a^2}'
      }
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

  // 9. Module 16: X-Ray Tube Simulator
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
      { label: 'Characteristic Emission Intensity', formula: 'I_{\\text{char}} \\propto (V_{\\text{kVp}} - V_K)^{1.6} \\quad \\text{for } V_{\\text{kVp}} > V_K' }
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

  // 10. Module 17: Internal Dosimetry & ICRP Biokinetics
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

  // 11. Module 18: Electronic Warfare EMR & Microwave Safety
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

  // 12. Module 19: Criticality Safety & Reactor Core Simulator
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

  // 13. Module 20: Gamma Spectroscopy & MCA Simulator
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
    derivationSteps: [
      {
        stepTitle: '1. Relativistic Compton Kinematics',
        explanation: 'Applying energy and momentum conservation for photon scattering off a stationary electron at angle θ:',
        math: 'E\' = \\frac{E_\\gamma}{1 + \\frac{E_\\gamma}{m_e c^2}(1 - \\cos\\theta)}'
      },
      {
        stepTitle: '2. Maximum Recoil Energy (Compton Edge)',
        explanation: 'Maximum electron recoil occurs during direct head-on collision (θ = 180°, cos θ = -1):',
        math: 'E_C = E_\\gamma - E\'(180^\\circ) = E_\\gamma - \\frac{E_\\gamma}{1 + \\frac{2 E_\\gamma}{m_e c^2}} = \\frac{E_\\gamma}{1 + \\frac{m_e c^2}{2 E_\\gamma}}'
      }
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
  },

  // === FORWARD-LOOKING EXPANSION METHODOLOGIES (FUTURE EXPANSION SPECIFICATIONS) ===

  // 14. Module 23: AAPM TG-43 Medical Brachytherapy
  {
    id: 'M23-TG43',
    moduleId: 'Module 23',
    moduleName: 'Brachytherapy Planner (TG-43)',
    domain: 'Medical & Advanced Expansion',
    title: 'AAPM TG-43U1 Formalism for Radioactive Seed Implants (I-125, Pd-103, Ir-192)',
    overview: 'Governing clinical protocol for 2D/3D interstitial brachytherapy dose distributions around sealed source seed implants.',
    standards: [
      { org: 'AAPM', code: 'TG-43U1', year: '2004', title: 'Update of AAPM Task Group No. 43 Report on Brachytherapy Dosimetry' },
      { org: 'ESTRO', code: 'Booklet 8', year: '2004', title: 'A Practical Guide to Quality Control of Brachytherapy Equipment' },
      { org: 'ABS', code: 'GEC-ESTRO', year: '2016', title: 'Consensus Guidelines for Permanent Prostate Brachytherapy' }
    ],
    primaryFormula: '\\dot{D}(r, \\theta) = S_K \\cdot \\Lambda \\cdot \\frac{G_L(r, \\theta)}{G_L(r_0, \\theta_0)} \\cdot g_L(r) \\cdot F(r, \\theta)',
    secondaryFormulas: [
      { label: 'Line Source Geometry Factor', formula: 'G_L(r, \\theta) = \\frac{\\beta}{L \\cdot r \\cdot \\sin\\theta} = \\frac{\\theta_2 - \\theta_1}{L \\cdot y\'' },
      { label: 'Permanent Implant Total Dose', formula: 'D_{\\text{total}} = \\int_0^\\infty \\dot{D}_0 e^{-\\lambda t} \\, dt = \\frac{\\dot{D}_0}{\\lambda} = 1.4427 \\cdot T_{1/2} \\cdot \\dot{D}_0' },
      { label: 'Radial Dose Function', formula: 'g_L(r) = \\frac{\\dot{D}(r, \\theta_0) \\cdot G_L(r_0, \\theta_0)}{\\dot{D}(r_0, \\theta_0) \\cdot G_L(r, \\theta_0)}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Line Source Geometric Integral',
        explanation: 'Integrating differential point source elements dq = (A / L) dx along active core length L:',
        math: 'G_L(r, \\theta) = \\frac{1}{L} \\int_{-L/2}^{L/2} \\frac{dx\'}{(x - x\')^2 + y^2} = \\frac{1}{L y} [\\arctan(x\'/y)] = \\frac{\\theta_2 - \\theta_1}{L \\cdot r \\sin\\theta}'
      },
      {
        stepTitle: '2. Complete Lifetime Decay Dose Integration',
        explanation: 'For permanent radioactive seed implants (I-125, Pd-103), the total absorbed dose integrated to infinity is:',
        math: 'D_\\infty = \\int_0^\\infty \\dot{D}_0 e^{-\\lambda t} dt = \\frac{\\dot{D}_0}{\\lambda} = \\frac{\\dot{D}_0}{\\ln(2) / T_{1/2}} = 1.4427 \\cdot T_{1/2} \\cdot \\dot{D}_0'
      }
    ],
    variables: [
      { symbol: 'S_K', description: 'Air-kerma strength of source seed', units: 'µGy·m²·h⁻¹ (or U)' },
      { symbol: '\\Lambda', description: 'Dose-rate constant in water', units: 'cGy·h⁻¹·U⁻¹' },
      { symbol: 'G_L(r, \\theta)', description: 'Geometry factor accounting for spatial distribution of radioactivity', units: 'cm⁻²' },
      { symbol: 'g_L(r)', description: 'Radial dose function modeling transverse attenuation and scatter', units: 'dimensionless' },
      { symbol: 'F(r, \\theta)', description: '2D anisotropy function accounting for seed encapsulation self-absorption', units: 'dimensionless' },
      { symbol: 'L', description: 'Active core length of radioactive seed encapsulation', units: 'cm' }
    ],
    assumptions: [
      'Cylindrical symmetry along the seed encapsulation longitudinal axis.',
      'Liquid water phantom medium with reference distance r₀ = 1.0 cm and θ₀ = 90°.'
    ],
    benchmarks: 'Gold-standard consensus datasets published in Medical Physics Vol. 31 (2004).'
  },

  // 15. Expansion: Bethe-Bloch Ion Stopping Power & Bragg Peak
  {
    id: 'EXP-BetheBloch',
    moduleId: 'Module 23 (Future)',
    moduleName: 'Alpha & Heavy Ion Stopping Power',
    domain: 'Medical & Advanced Expansion',
    title: 'Bethe-Bloch Equation & Bragg Peak Energy Deposition in Matter',
    overview: 'Calculates the linear energy transfer (LET) and electronic stopping power (-dE/dx) for heavy charged particles (protons, alpha particles, carbon ions).',
    isExpansion: true,
    standards: [
      { org: 'ICRU', code: 'Report 49', year: '1993', title: 'Stopping Powers and Ranges for Protons and Alpha Particles' },
      { org: 'NIST', code: 'ASTAR / PSTAR Databases', year: '2017', title: 'Stopping-Power and Range Tables for Electrons, Protons, and Helium Ions' }
    ],
    primaryFormula: '-\\frac{dE}{dx} = \\frac{4\\pi e^4 z^2}{m_e v^2} N Z \\left[ \\ln\\left(\\frac{2 m_e v^2}{I (1 - \\beta^2)}\\right) - \\beta^2 - \\frac{C}{Z} - \\frac{\\delta}{2} \\right]',
    secondaryFormulas: [
      { label: 'Relativistic Velocity Parameter', formula: '\\beta = \\frac{v}{c} = \\sqrt{1 - \\left(\\frac{M_0 c^2}{E + M_0 c^2}\\right)^2}' },
      { label: 'Bragg-Kleeman Range Rule for Alphas', formula: 'R_{\\alpha} = 0.318 \\cdot E^{1.5} \\quad [\\text{cm in air at 15°C, 1 atm}]' }
    ],
    variables: [
      { symbol: '-dE/dx', description: 'Linear stopping power (energy loss per unit path length)', units: 'MeV·cm⁻¹' },
      { symbol: 'z', description: 'Charge number of projectile ion (+2 for alpha, +1 for proton)', units: 'dimensionless' },
      { symbol: 'v', description: 'Instantaneous ion projectile velocity', units: 'm·s⁻¹' },
      { symbol: 'I', description: 'Mean excitation potential of target medium (~75 eV for tissue)', units: 'eV' },
      { symbol: '\\delta / 2', description: 'Fermi density effect correction factor', units: 'dimensionless' },
      { symbol: 'C / Z', description: 'Shell correction factor at low projectile velocities', units: 'dimensionless' }
    ],
    assumptions: [
      'Projectile mass M is much greater than electron mass m_e.',
      'Energy losses occur through discrete Coulomb collisions with orbital electrons.'
    ],
    benchmarks: 'Matches NIST PSTAR and ASTAR stopping power benchmarks.'
  },

  // 16. Expansion: Space Radiation & Galactic Cosmic Rays
  {
    id: 'EXP-SpaceRad',
    moduleId: 'Module 24 (Future)',
    moduleName: 'Space Radiation & GCR Transport',
    domain: 'Medical & Advanced Expansion',
    title: 'Badhwar-O\'Neill GCR Model, Solar Modulation Φ & SPE Shielding',
    overview: 'Models deep-space galactic cosmic rays (GCR) and solar particle events (SPE) for LEO, Lunar, and interplanetary Mars transit missions.',
    isExpansion: true,
    standards: [
      { org: 'NASA', code: 'NASA-SP-2016-621', year: '2016', title: 'Active and Passive Shielding for Space Radiation Protection' },
      { org: 'ICRP', code: 'Publication 123', year: '2013', title: 'Assessment of Radiation Exposure of Astronauts in Low-Earth Orbit' }
    ],
    primaryFormula: 'j_i(E, \\Phi) = j_i^{\\text{LIS}}(E + \\Delta E) \\cdot \\frac{E(E + 2 E_0)}{(E + \\Delta E)(E + \\Delta E + 2 E_0)}',
    secondaryFormulas: [
      { label: 'Energy Shift via Solar Modulation', formula: '\\Delta E = \\frac{Z_i e}{A_i} \\cdot \\Phi(t) \\quad [\\text{in MV}]' },
      { label: 'Linear Energy Transfer (LET) Dose', formula: 'H = Q(L) \\cdot D = \\int Q(L) \\cdot L \\cdot \\Phi(L) \\, dL' }
    ],
    variables: [
      { symbol: 'j_i(E, \\Phi)', description: 'Differential flux of i-th GCR ion species at 1 AU', units: '(m²·s·sr·MeV/n)⁻¹' },
      { symbol: '\\Phi(t)', description: 'Heliospheric solar modulation potential parameter', units: 'MV' },
      { symbol: 'j_i^{\\text{LIS}}', description: 'Local Interstellar Spectrum flux outside heliosphere', units: '(m²·s·sr·MeV/n)⁻¹' },
      { symbol: 'Q(L)', description: 'Radiation quality factor as a function of unrestricted LET in water', units: 'dimensionless' }
    ],
    assumptions: [
      'Spherically symmetric force-field approximation in heliosphere.',
      'Nuclear fragmentation cross-sections modeled via semi-empirical NUCFRG2 formalism.'
    ],
    benchmarks: 'Validated against Badhwar-O\'Neill 2020 GCR model and ACE/CRIS satellite measurements.'
  },

  // 17. Module 22: MARSSIM Decommissioning & Detection Limits
  {
    id: 'M22-MARSSIM',
    moduleId: 'Module 22',
    moduleName: 'MARSSIM Decommissioning',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Currie Detection Limits (MDA/MDC), FSS Grid Sizing & Sign/WRS Nonparametric Tests',
    overview: 'Statistical framework for site radiological release, final status surveys, Currie limits for count data, and Wilcoxon Rank Sum testing under NUREG-1575.',
    standards: [
      { org: 'NRC / EPA / DOE / DOD', code: 'MARSSIM (NUREG-1575)', year: '2000', title: 'Multi-Agency Radiation Survey and Site Investigation Manual (Rev. 1)' },
      { org: 'NRC', code: 'NUREG-1505', year: '1998', title: 'A Nonparametric Statistical Methodology for the Design and Analysis of Final Status Decommissioning Surveys' },
      { org: 'Currie', code: 'Anal. Chem. 40', year: '1968', title: 'Limits for Qualitative Detection and Quantitative Determination' }
    ],
    primaryFormula: 'L_D = 2.71 + 4.65 \\sqrt{\\sigma_{\\text{bg}}^2} \\iff \\text{MDA} = \\frac{2.71 + 4.65 \\sqrt{C_{\\text{bg}}}}{\\epsilon_i \\cdot \\epsilon_s \\cdot t_{\\text{count}} \\cdot F_{\\text{wipe}}}',
    secondaryFormulas: [
      { label: 'Critical Level (Decision Limit)', formula: 'L_C = 2.33 \\sqrt{\\sigma_{\\text{bg}}^2} = 2.33 \\sqrt{C_{\\text{bg}}} \\quad (\\alpha = 0.05)' },
      { label: 'Surface Concentration MDC (dpm/100cm²)', formula: '\\text{MDC} = \\frac{\\text{MDA}_{\\text{dpm}}}{A_{\\text{probe}} / 100\\text{ cm}^2}' },
      { label: 'Sign Test Sample Size (MARSSIM Table 5.1)', formula: 'N = \\frac{(Z_{1-\\alpha} + Z_{1-\\beta})^2}{4 (\\Phi(\\Delta/\\sigma) - 0.5)^2} \\times 1.20' },
      { label: 'Triangular Grid Spacing (meters)', formula: 'L = \\sqrt{\\frac{A_{\\text{survey}}}{0.866 \\cdot N}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Currie Hypothesis Testing (Alpha & Beta Risks)',
        explanation: 'At the decision threshold L_C, the probability of false positive (Type I error alpha) is set to 5% (Z = 1.645):',
        math: 'L_C = k_\\alpha \\sigma_0 = 1.645 \\sqrt{\\sigma_B^2 + \\sigma_S^2} = 1.645 \\sqrt{2 C_B} = 2.326 \\sqrt{C_B}'
      },
      {
        stepTitle: '2. Detection Limit L_D with False Negative Beta Risk',
        explanation: 'Setting both alpha and beta to 5% requires L_D = L_C + k_beta * sigma_D:',
        math: 'L_D = L_C + 1.645 \\sqrt{\\sigma_B^2 + (C_B + L_D)} \\implies L_D = k^2 + 2 k \\sqrt{2 C_B} = 2.71 + 4.65 \\sqrt{C_B}'
      }
    ],
    variables: [
      { symbol: 'L_D', description: 'Detection limit in net counts guaranteeing 95% detection confidence', units: 'counts' },
      { symbol: 'L_C', description: 'Critical level / decision threshold above background', units: 'counts' },
      { symbol: '\\text{MDA}', description: 'Minimum Detectable Activity', units: 'Bq or dpm' },
      { symbol: '\\text{MDC}', description: 'Minimum Detectable Concentration', units: 'dpm/100 cm² or Bq/cm²' },
      { symbol: 'C_{\\text{bg}}', description: 'Total counts recorded in paired blank background measurement', units: 'counts' },
      { symbol: '\\epsilon_i, \\epsilon_s', description: 'Instrument 2π/4π efficiency and ISO 7503-1 surface emission efficiency', units: 'dimensionless' },
      { symbol: 'F_{\\text{wipe}}', description: 'Removable surface contamination smear collection factor (0.10 for 10% wipe)', units: 'dimensionless' },
      { symbol: 'L', description: 'Systematic triangular sample grid node spacing', units: 'm' }
    ],
    assumptions: [
      'Normal distribution approximation to Poisson counting variance for background count C_B > 20.',
      'MARSSIM 20% sample overage included to guarantee statistical power in presence of inaccessible points.'
    ],
    benchmarks: 'Fully validated against MARSSIM Table 5.1/5.2 sample sizes and NUREG-1575 Appendix A benchmarks.'
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
  'Regulatory Standards & Transport Security',
  'Medical & Advanced Expansion'
];

const LiteratureModule: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>('All Domains');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('current');
  const [activeDocId, setActiveDocId] = useState<string>(METHOD_DOCS[0].id);

  // Filter documents based on domain, search query, and active tab
  const filteredDocs = useMemo(() => {
    return METHOD_DOCS.filter((doc) => {
      // Tab filter
      if (activeTab === 'current' && doc.isExpansion) return false;
      if (activeTab === 'expansion' && !doc.isExpansion) return false;
      if (activeTab === 'derivations' && (!doc.derivationSteps || doc.derivationSteps.length === 0)) return false;

      // Domain filter
      const matchesDomain = selectedDomain === 'All Domains' || doc.domain === selectedDomain;

      // Search query filter
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
  }, [selectedDomain, searchQuery, activeTab]);

  // Currently active selected document
  const activeDoc = useMemo(() => {
    const found = filteredDocs.find((d) => d.id === activeDocId);
    return found || filteredDocs[0] || METHOD_DOCS[0];
  }, [filteredDocs, activeDocId]);

  return (
    <div className="literature-module">
      <div className="panel-header">
        <h2>📚 Core Literature, Physics Formulations & Regulatory Standards</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Comprehensive peer-reviewed scientific methodology compendium documenting the governing mathematical equations, analytical derivations, boundary limits, and international regulatory standards across all current and expansion modules.
        </p>
      </div>

      {/* Main Mode View Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px' }}>
        <button
          className={`nav-link ${activeTab === 'current' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'current' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'current' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'current' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('current')}
        >
          🔬 Current Modules (1 – 20)
        </button>
        <button
          className={`nav-link ${activeTab === 'derivations' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'derivations' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'derivations' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'derivations' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('derivations')}
        >
          📐 Analytical Derivations & Proofs
        </button>
        <button
          className={`nav-link ${activeTab === 'expansion' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'expansion' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'expansion' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'expansion' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('expansion')}
        >
          🚀 Future Expansion Framework (Modules 22+)
        </button>
        <button
          className={`nav-link ${activeTab === 'standards' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'standards' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'standards' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'standards' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('standards')}
        >
          🏛️ Standards Registry & Bibliography
        </button>
      </div>

      {/* Domain Navigation & Search Controls (for methodology views) */}
      {activeTab !== 'standards' && (
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
                placeholder="🔍 Search equations, standards, variables..."
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
              const isSelected = activeDoc?.id === doc.id;
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
      )}

      {/* Detailed Methodology View */}
      {activeTab !== 'standards' && activeDoc && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '25px' }}>
          {/* Main Equation & Theory Panel */}
          <div className="panel" style={{ flex: '2 1 650px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  {activeDoc.moduleId} — {activeDoc.domain}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: activeDoc.isExpansion ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 229, 255, 0.1)', color: activeDoc.isExpansion ? '#f59e0b' : 'var(--color-primary)', borderRadius: '4px', border: `1px solid ${activeDoc.isExpansion ? '#f59e0b' : 'rgba(0,229,255,0.3)'}` }}>
                  {activeDoc.isExpansion ? 'Expansion Specification' : 'Certified Peer-Reviewed Formulation'}
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

            {/* Step-by-Step Analytical Derivation (if present or in derivations mode) */}
            {activeDoc.derivationSteps && activeDoc.derivationSteps.length > 0 && (
              <div style={{ background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  📐 Step-by-Step Analytical Derivation
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeDoc.derivationSteps.map((step, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{step.stepTitle}</strong>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '4px 0 8px 0' }}>{step.explanation}</p>
                      <div style={{ fontSize: '1.05rem', color: '#00e5ff' }}>
                        <BlockMath math={step.math} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Master Peer-Reviewed Bibliography & Standards Register (Full View or Tab) */}
      {(activeTab === 'standards' || activeTab === 'current') && (
        <div className="panel" style={{ marginTop: activeTab === 'current' ? '15px' : '0' }}>
          <h3>Master Scientific Bibliography & International Standards Register</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            The mathematical and physical models in RadPro Analyst are certified against the following international regulatory authorities, technical consensus reports, and academic treatises.
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
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>AAPM TG-43U1</td>
                  <td style={{ padding: '10px' }}>AAPM</td>
                  <td style={{ padding: '2004' }}>2004</td>
                  <td style={{ padding: '10px' }}>Update of AAPM Task Group No. 43 Report on Brachytherapy Dosimetry</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Air-kerma strength, dose-rate constant, radial dose function, and 2D anisotropy for clinical implants.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MARSSIM (NUREG-1575)</td>
                  <td style={{ padding: '10px' }}>NRC / EPA</td>
                  <td style={{ padding: '10px' }}>2000</td>
                  <td style={{ padding: '10px' }}>Multi-Agency Radiation Survey and Site Investigation Manual (Rev. 1)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nonparametric statistical testing (WRS & Sign), Currie detection limits (MDA), and radiological site release.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiteratureModule;
