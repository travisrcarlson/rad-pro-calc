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
    primaryFormula: '\\dot{H}^*(10) = \\frac{A \\cdot \\Gamma}{d^2} \\cdot B(\\mu x) \\cdot e^{-\\mu x}',
    secondaryFormulas: [
      { label: 'Specific Gamma Constant Conversion (SI)', formula: '\\Gamma_{\\text{SI}} = \\frac{\\Gamma_{\\text{old}}}{37.0} \\quad [\\mu\\text{Sv}\\cdot\\text{m}^2 / (\\text{h}\\cdot\\text{MBq})]' },
      { label: 'Taylor Two-Parameter Buildup Factor', formula: 'B(\\mu x) = A_1 e^{-\\alpha_1 \\mu x} + (1 - A_1) e^{-\\alpha_2 \\mu x}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Geometric Inverse-Square Conservation',
        explanation: 'For an isotropic emitter radiating into 4π steradians, energy fluence diminishes across expanding spherical surfaces of radius d:',
        math: '\\Psi(d) = \\frac{\\dot{E}_{\\text{emit}}}{4\\pi d^2} = \\frac{A \\sum (y_i E_i)}{4\\pi d^2}'
      },
      {
        stepTitle: '2. Air Kerma Rate & Specific Gamma Constant',
        explanation: 'Multiplying by the mass energy-absorption coefficient (μ_en / ρ)_air yields air kerma K_air. Combining nuclide emission yields gives the Specific Gamma Constant Γ:',
        math: '\\dot{K}_{\\text{air}} = \\frac{A}{d^2} \\left[ \\frac{1}{4\\pi} \\sum_{i} y_i E_i \\left(\\frac{\\mu_{\\text{en}}}{\\rho}\\right)_{\\text{air}, i} \\right] = \\frac{A \\cdot \\Gamma}{d^2}'
      }
    ],
    variables: [
      { symbol: '\\dot{H}^*(10)', description: 'Ambient dose equivalent rate at depth of 10 mm in ICRU sphere', units: 'µSv·h⁻¹' },
      { symbol: 'A', description: 'Radioactive source activity', units: 'MBq' },
      { symbol: '\\Gamma', description: 'Specific gamma-ray constant', units: 'µSv·m²·MBq⁻¹·h⁻¹' },
      { symbol: 'd', description: 'Radial distance between source center and detector point', units: 'm' },
      { symbol: 'B(\\mu x)', description: 'Radiation scatter buildup factor', units: 'dimensionless' },
      { symbol: '\\mu', description: 'Linear attenuation coefficient of intervening shield', units: 'cm⁻¹' },
      { symbol: 'x', description: 'Thickness of intervening shield', units: 'cm' }
    ],
    assumptions: [
      'Source dimensions are negligible compared to distance d (point source condition: d > 5 × source dimension).',
      'Electronic equilibrium established at the 10 mm measurement depth in ICRU tissue.'
    ],
    benchmarks: 'Validated against ICRP 74 Table A.1 and NCRP 147 transmission curve datasets.'
  },

  // 3. Module 3: Inverse Square & Distance Attenuation
  {
    id: 'M3-Distance',
    moduleId: 'Module 3',
    moduleName: 'Distance Attenuation',
    domain: 'Dose, Transport & Shielding',
    title: 'Inverse Square Law & Geometric Solid Angle Corrections',
    overview: 'Solves source-to-receptor geometry problems for unshielded point sources, line sources, and disc sources using spherical dispersion and solid angle integrals.',
    standards: [
      { org: 'NCRP', code: 'Report No. 107', year: '1989', title: 'Implementation of the Principle of As Low As Reasonably Achievable (ALARA)' },
      { org: 'Cember', code: 'Textbook Ref', year: '2008', title: 'Introduction to Health Physics (4th Ed., McGraw-Hill)' }
    ],
    primaryFormula: 'I_2 = I_1 \\cdot \\left(\\frac{d_1}{d_2}\\right)^2 \\iff d_2 = d_1 \\cdot \\sqrt{\\frac{I_1}{I_2}}',
    secondaryFormulas: [
      { label: 'Line Source Attenuation (Length L)', formula: 'I(d) = \\frac{S_L}{2\\pi d} \\left[ \\arctan\\left(\\frac{L/2}{d}\\right) \\right]' },
      { label: 'Disc Source On-Axis Attenuation (Radius R)', formula: 'I(d) = I_0 \\cdot \\ln\\left(1 + \\frac{R^2}{d^2}\\right)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Conservation of Radiant Energy Fluence',
        explanation: 'In non-attenuating vacuum or air, total photon flux crossing sphere 1 equals flux crossing sphere 2:',
        math: '4\\pi d_1^2 \\cdot I_1 = 4\\pi d_2^2 \\cdot I_2 \\implies \\frac{I_2}{I_1} = \\frac{d_1^2}{d_2^2} = \\left(\\frac{d_1}{d_2}\\right)^2'
      }
    ],
    variables: [
      { symbol: 'I_1, I_2', description: 'Radiation field intensities at distances d1 and d2', units: 'µSv·h⁻¹ or mR·h⁻¹' },
      { symbol: 'd_1, d_2', description: 'Distances from radiation source center', units: 'm' },
      { symbol: 'S_L', description: 'Linear source activity density', units: 'MBq·m⁻¹' }
    ],
    assumptions: [
      'Negligible photon attenuation and coherent scatter in ambient air over the path length.',
      'Detector volume is small relative to d (no spatial volume averaging effects).'
    ],
    benchmarks: 'Matches classical analytical inverse-square solutions within <0.01% error.'
  },

  // 4. Module 4: Gamma Shielding & Buildup Factors
  {
    id: 'M4-Shielding',
    moduleId: 'Module 4',
    moduleName: 'Shielding Attenuation',
    domain: 'Dose, Transport & Shielding',
    title: 'Narrow-Beam Attenuation, Broad-Beam Buildup & Half-Value Layers (HVL)',
    overview: 'Models exponential photon attenuation across structural shielding materials (Lead, Iron, Concrete, Tungsten, Water) incorporating Compton multiple-scatter buildup.',
    standards: [
      { org: 'NIST', code: 'XCOM (SRD 8)', year: '2010', title: 'Photon Cross Sections Database' },
      { org: 'ANSI/ANS', code: '6.4-2006', year: '2006', title: 'Nuclear Analysis & Design of Concrete Radiation Shielding for Nuclear Power Plants' },
      { org: 'NCRP', code: 'Report No. 49', year: '1976', title: 'Structural Shielding Design and Evaluation for Medical Use of X Rays and Gamma Rays' }
    ],
    primaryFormula: 'I(x) = I_0 \\cdot B(E, \\mu x) \\cdot \\exp(-\\mu x) = I_0 \\cdot B(E, \\mu x) \\cdot \\exp\\left( -\\left(\\frac{\\mu}{\\rho}\\right) \\cdot \\rho x \\right)',
    secondaryFormulas: [
      { label: 'Half-Value Layer (HVL)', formula: '\\text{HVL} = \\frac{\\ln(2)}{\\mu} = \\frac{0.693147}{\\mu}' },
      { label: 'Tenth-Value Layer (TVL)', formula: '\\text{TVL} = \\frac{\\ln(10)}{\\mu} = \\frac{2.302585}{\\mu} \\approx 3.3219 \\cdot \\text{HVL}' },
      { label: 'Geometric Progression (G-P) Buildup', formula: 'B(E, x) = 1 + (b - 1) \\cdot \\frac{K^x - 1}{K - 1}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Lambert-Beer Narrow-Beam Law',
        explanation: 'Probability of photon removal per differential path dx is proportional to linear attenuation coefficient μ:',
        math: '\\frac{dI}{dx} = -\\mu I(x) \\implies \\int_{I_0}^I \\frac{dI}{I} = -\\mu \\int_0^x dx \\implies I(x) = I_0 e^{-\\mu x}'
      },
      {
        stepTitle: '2. Half-Value Layer Derivation',
        explanation: 'Thickness reducing transmitted intensity by exactly 50% (I = I_0 / 2):',
        math: '\\frac{I_0}{2} = I_0 e^{-\\mu \\cdot \\text{HVL}} \\implies -\\ln(2) = -\\mu \\cdot \\text{HVL} \\implies \\text{HVL} = \\frac{\\ln(2)}{\\mu}'
      }
    ],
    variables: [
      { symbol: 'I_0, I(x)', description: 'Unshielded incident and shielded transmitted dose rates', units: 'µSv·h⁻¹' },
      { symbol: '\\mu', description: 'Linear attenuation coefficient at incident photon energy', units: 'cm⁻¹' },
      { symbol: '\\mu / \\rho', description: 'Mass attenuation coefficient from NIST XCOM', units: 'cm²·g⁻¹' },
      { symbol: '\\rho', description: 'Mass density of shielding medium', units: 'g·cm⁻³' },
      { symbol: 'B(E, \\mu x)', description: 'Multiple scatter buildup factor', units: 'dimensionless' },
      { symbol: 'x', description: 'Physical thickness of shielding barrier', units: 'cm' }
    ],
    assumptions: [
      'Monochromatic or multi-energy spectrum collapsed with energy-weighted attenuation.',
      'Infinite planar slab geometry for buildup factor validity.'
    ],
    benchmarks: 'Calibrated against NIST XCOM database and ANSI/ANS-6.4.3 standard buildup tables.'
  },

  // 5. Module 5: Beta Dose, Range & Bremsstrahlung
  {
    id: 'M5-Beta',
    moduleId: 'Module 5',
    moduleName: 'Beta Dose & Range',
    domain: 'Dose, Transport & Shielding',
    title: 'Bethe-Heitler Bremsstrahlung Fraction, Continuous Slowing Down Range & Loevinger Formalism',
    overview: 'Calculates maximum and continuous beta ranges in matter, electronic stopping power, skin dose at 70 µm depth, and secondary Bremsstrahlung radiative yield in high-Z vs low-Z shielding.',
    standards: [
      { org: 'ICRU', code: 'Report 56', year: '1997', title: 'Dosimetry of External Beta Rays for Radiation Protection' },
      { org: 'NCRP', code: 'Report No. 67', year: '1980', title: 'Radiofrequency Electromagnetic Fields' },
      { org: 'ICRP', code: 'Publication 116', year: '2010', title: 'Conversion Coefficients for Radiological Protection Quantities for External Radiation' }
    ],
    primaryFormula: 'F_{\\text{brem}} = 3.5 \\times 10^{-4} \\cdot Z_{\\text{eff}} \\cdot E_{\\beta, \\max} \\quad [\\text{Fraction of beta kinetic energy converted to X-rays}]',
    secondaryFormulas: [
      { label: 'Katz-Penfold Practical Range (0.01 < E < 2.5 MeV)', formula: 'R_p = 0.412 \\cdot E_{\\beta, \\max}^{1.265 - 0.0954 \\ln(E_{\\beta, \\max})} \\quad [\\text{g/cm}^2]' },
      { label: 'Feather Empirical Range (E > 2.5 MeV)', formula: 'R_p = 0.542 \\cdot E_{\\beta, \\max} - 0.133 \\quad [\\text{g/cm}^2]' },
      { label: 'Loevinger Apparent Beta Attenuation', formula: '\\nu = \\frac{18.6}{(E_{\\beta, \\max} - 0.036)^{1.37}} \\quad [\\text{cm}^2/\\text{g}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Radiative vs Collision Stopping Power',
        explanation: 'Total electron stopping power is the sum of collisional Coulomb ionization and radiative nuclear Bremsstrahlung deceleration:',
        math: '-\\left(\\frac{dE}{dx}\\right)_{\\text{total}} = -\\left(\\frac{dE}{dx}\\right)_{\\text{coll}} + -\\left(\\frac{dE}{dx}\\right)_{\\text{rad}}'
      },
      {
        stepTitle: '2. Bremsstrahlung Energy Conversion Fraction',
        explanation: 'The ratio of radiative to collision stopping power scales directly with target atomic number Z and beta kinetic energy E:',
        math: '\\frac{(dE/dx)_{\\text{rad}}}{(dE/dx)_{\\text{coll}}} \\approx \\frac{E \\cdot Z}{800 \\text{ MeV}} \\implies F_{\\text{brem}} \\approx 3.5 \\times 10^{-4} Z_{\\text{eff}} E_{\\beta, \\max}'
      }
    ],
    variables: [
      { symbol: 'F_{\\text{brem}}', description: 'Fraction of total incident beta kinetic energy converted into Bremsstrahlung photons', units: 'dimensionless' },
      { symbol: 'Z_{\\text{eff}}', description: 'Effective atomic number of stopping medium (e.g., 82 for Lead, 13 for Aluminum, 7.4 for Tissue)', units: 'dimensionless' },
      { symbol: 'E_{\\beta, \\max}', description: 'Maximum endpoint energy of beta emission spectrum', units: 'MeV' },
      { symbol: 'R_p', description: 'Practical/projected beta range in stopping medium', units: 'g·cm⁻² (divide by density ρ to obtain cm)' },
      { symbol: '\\nu', description: 'Apparent mass absorption coefficient for continuous beta spectrum', units: 'cm²·g⁻¹' }
    ],
    assumptions: [
      'Continuous Slowing Down Approximation (CSDA) for electron trajectory paths.',
      'Low-Z shielding (e.g., Plexiglas/Lucite Z≈6.6) precedes high-Z secondary gamma shielding to minimize Bremsstrahlung.'
    ],
    benchmarks: 'Validated against ICRU Report 56 and NIST ESTAR electron range tables.'
  },

  // 6. Module 6: Neutron Activation & Thermal Fluence
  {
    id: 'M6-Neutron',
    moduleId: 'Module 6',
    moduleName: 'Neutron Interactions',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Thermal Neutron Capture (n,γ), Radiative Saturation & Activation Buildup',
    overview: 'Models thermal and epithermal neutron capture cross-sections, isotopic saturation activity during nuclear reactor or accelerator irradiation, and post-irradiation cooling.',
    standards: [
      { org: 'IAEA', code: 'Technical Report Series No. 273', year: '1987', title: 'Handbook on Nuclear Activation Data' },
      { org: 'ASTM', code: 'E261-16', year: '2016', title: 'Standard Practice for Determining Neutron Fluence, Fluence Rate, and Spectra by Radioactivation Techniques' }
    ],
    primaryFormula: 'A(t_{\\text{irr}}, t_{\\text{cool}}) = N_0 \\cdot \\sigma_{\\text{act}} \\cdot \\Phi_{\\text{th}} \\cdot \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right) \\cdot e^{-\\lambda t_{\\text{cool}}}',
    secondaryFormulas: [
      { label: 'Target Nuclei Density', formula: 'N_0 = \\frac{m \\cdot w_i \\cdot N_A}{M}' },
      { label: 'Saturation Activity Limit (t_irr >> T_1/2)', formula: 'A_{\\text{sat}} = N_0 \\cdot \\sigma_{\\text{act}} \\cdot \\Phi_{\\text{th}}' },
      { label: 'Westcott Epithermal Resonance Formalism', formula: '\\sigma_{\\text{eff}} = \\sigma_0 \\left( g + r \\cdot s_0 \\right)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Target Transmutation Differential Rate',
        explanation: 'Rate of production of daughter nuclei equals neutron reaction rate minus radioactive decay rate:',
        math: '\\frac{dN^*(t)}{dt} = N_0 \\sigma_{\\text{act}} \\Phi_{\\text{th}} - \\lambda N^*(t)'
      },
      {
        stepTitle: '2. Integrating Factor Solution',
        explanation: 'Multiplying by integrating factor e^(λt) and integrating with initial condition N*(0) = 0 yields:',
        math: 'N^*(t_{\\text{irr}}) = \\frac{N_0 \\sigma_{\\text{act}} \\Phi_{\\text{th}}}{\\lambda} \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right)'
      },
      {
        stepTitle: '3. Activity and Post-Irradiation Cooling',
        explanation: 'Multiplying by decay constant λ and applying exponential cooling for decay time t_cool:',
        math: 'A(t) = \\lambda N^*(t) = N_0 \\sigma_{\\text{act}} \\Phi_{\\text{th}} \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right) e^{-\\lambda t_{\\text{cool}}}'
      }
    ],
    variables: [
      { symbol: 'A', description: 'Radioactivity of activated daughter product', units: 'Bq' },
      { symbol: 'N_0', description: 'Number of parent target nuclei in sample', units: 'nuclei' },
      { symbol: '\\sigma_{\\text{act}}', description: 'Thermal neutron capture cross-section at 2200 m/s', units: 'barns (1 b = 10⁻²⁴ cm²)' },
      { symbol: '\\Phi_{\\text{th}}', description: 'Thermal neutron flux rate', units: 'n·cm⁻²·s⁻¹' },
      { symbol: 't_{\\text{irr}}', description: 'Duration of irradiation in neutron field', units: 's (or h)' },
      { symbol: 't_{\\text{cool}}', description: 'Cooling / decay elapsed time post-irradiation', units: 's (or h)' },
      { symbol: 'w_i', description: 'Natural isotopic abundance weight fraction', units: 'dimensionless' }
    ],
    assumptions: [
      'Negligible burnup / depletion of target parent nuclei during irradiation (low-fluence approximation: σ Φ t << 1).',
      'Target is thermally thin (negligible neutron self-shielding within sample volume).'
    ],
    benchmarks: 'Cross-checked against IAEA TRS 273 and ASTM E261 activation foil gold/cobalt standards.'
  },

  // 7. Module 7: X-Ray Generator Physics & Tube Spectrum
  {
    id: 'M7-XRay',
    moduleId: 'Module 7',
    moduleName: 'X-Ray Generator Physics',
    domain: 'Dose, Transport & Shielding',
    title: 'Duane-Hunt Law, Kramers Bremsstrahlung Continuum & Filtration HVL',
    overview: 'Calculates continuous Bremsstrahlung X-ray spectra, characteristic emission lines (K-alpha, K-beta), anode heel effects, and filtration beam hardening for diagnostic and industrial tubes.',
    standards: [
      { org: 'NCRP', code: 'Report No. 102', year: '1989', title: 'Medical X-Ray, Electron Beam and Gamma-Ray Protection for Energies Up to 50 MeV' },
      { org: 'IEC', code: '60601-2-54', year: '2018', title: 'Particular requirements for the basic safety and essential performance of X-ray equipment' },
      { org: 'Bushberg', code: 'Textbook Ref', year: '2011', title: 'The Essential Physics of Medical Imaging (3rd Ed., Wolters Kluwer)' }
    ],
    primaryFormula: '\\lambda_{\\min} = \\frac{h c}{e V_p} = \\frac{1.23984}{V_{p, \\text{kV}}} \\quad [\\text{nm}] \\iff E_{\\max} = e V_p \\quad [\\text{keV}]',
    secondaryFormulas: [
      { label: 'Kramers Continuous Bremsstrahlung Intensity', formula: 'I(E) = K \\cdot i \\cdot Z \\cdot (E_{\\max} - E) \\quad [\\text{photons/s/keV}]' },
      { label: 'Anode Efficiency Factor', formula: '\\eta = 1.1 \\times 10^{-9} \\cdot Z \\cdot V_p' },
      { label: 'Half-Value Layer Beam Quality Check', formula: '\\text{HVL} = \\frac{\\ln(2)}{\\mu_{\\text{eff}}} \\quad [\\text{mm Al equivalent}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Conservation of Kinetic Energy in Single Coulomb Collision',
        explanation: 'A high-energy electron accelerated across tube voltage V_p transfers all its kinetic energy into a single Bremsstrahlung photon at the maximum limit:',
        math: 'E_{\\max} = h \\nu_{\\max} = \\frac{h c}{\\lambda_{\\min}} = e V_p \\implies \\lambda_{\\min} = \\frac{h c}{e V_p}'
      },
      {
        stepTitle: '2. Kramers Linear Continuum Approximation',
        explanation: 'Integrating classical electron trajectory deceleration past target nuclei of charge Z yields a triangle-shaped spectrum prior to filtration:',
        math: '\\frac{dI}{dE} \\propto i \\cdot Z \\cdot (e V_p - E)'
      }
    ],
    variables: [
      { symbol: '\\lambda_{\\min}', description: 'Short-wavelength Duane-Hunt cutoff', units: 'nm' },
      { symbol: 'V_p', description: 'Peak tube potential (kVp)', units: 'kV' },
      { symbol: 'i', description: 'Tube filament emission current', units: 'mA' },
      { symbol: 'Z', description: 'Anode target material atomic number (e.g., 74 for Tungsten, 42 for Molybdenum)', units: 'dimensionless' },
      { symbol: '\\eta', description: 'X-ray production conversion efficiency', units: 'dimensionless (typically ~0.5% - 1%)' }
    ],
    assumptions: [
      'Constant potential high-voltage generator ripple (<2%).',
      'Inherent filtration modeled as 1.5 to 2.5 mm Aluminum equivalent.'
    ],
    benchmarks: 'Matches Birch & Marshall diagnostic X-ray spectra models and NCRP 102 compliance criteria.'
  },

  // 8. Module 8: Atmospheric Dispersion & Gaussian Plume
  {
    id: 'M8-Plume',
    moduleId: 'Module 8',
    moduleName: 'Atmospheric Dispersion',
    domain: 'Environmental Dispersion & Response',
    title: 'Pasquill-Gifford Gaussian Plume Atmospheric Transport & Ground Reflection',
    overview: 'Evaluates radionuclide ground-level air concentrations downwind of continuous or puff stack releases under Pasquill atmospheric stability classes A through F.',
    standards: [
      { org: 'US NRC', code: 'Regulatory Guide 1.145', year: '1983', title: 'Atmospheric Dispersion Models for Potential Accident Consequence Assessments at Nuclear Power Plants' },
      { org: 'US EPA', code: 'EPA-454/R-92-019', year: '1995', title: 'Workbook of Atmospheric Dispersion Estimates (Turner)' },
      { org: 'IAEA', code: 'Safety Reports Series No. 19', year: '2001', title: 'Generic Models for Use in Assessing the Impact of Discharges of Radioactive Substances' }
    ],
    primaryFormula: '\\chi(x, y, z) = \\frac{Q}{2\\pi u \\sigma_y \\sigma_z} \\exp\\left(-\\frac{y^2}{2\\sigma_y^2}\\right) \\left[ \\exp\\left(-\\frac{(z - H)^2}{2\\sigma_z^2}\\right) + \\exp\\left(-\\frac{(z + H)^2}{2\\sigma_z^2}\\right) \\right]',
    secondaryFormulas: [
      { label: 'Ground-Level Centerline Air Concentration (y=0, z=0)', formula: '\\chi(x, 0, 0) = \\frac{Q}{\\pi u \\sigma_y \\sigma_z} \\exp\\left(-\\frac{H^2}{2\\sigma_z^2}\\right)' },
      { label: 'Effective Release Height', formula: 'H = h_s + \\Delta h = h_s + \\frac{v_s d_s}{u} \\left(1.5 + 2.68 \\times 10^{-3} P \\frac{\\Delta T}{T_s} d_s\\right)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Steady-State Advection-Diffusion Equation',
        explanation: 'Assuming wind blows along x-axis at constant velocity u with turbulent diffusion coefficients K_y and K_z:',
        math: 'u \\frac{\\partial \\chi}{\\partial x} = \\frac{\\partial}{\\partial y}\\left(K_y \\frac{\\partial \\chi}{\\partial y}\\right) + \\frac{\\partial}{\\partial z}\\left(K_z \\frac{\\partial \\chi}{\\partial z}\\right)'
      },
      {
        stepTitle: '2. Method of Images for Total Ground Reflection',
        explanation: 'Enforcing boundary condition of zero net flux across the impenetrable ground plane (dχ/dz = 0 at z = 0) by introducing a virtual mirror source at z = -H:',
        math: '\\chi = \\chi_{\\text{real}}(x,y,z; +H) + \\chi_{\\text{image}}(x,y,z; -H)'
      }
    ],
    variables: [
      { symbol: '\\chi', description: 'Air concentration at downwind spatial coordinate (x, y, z)', units: 'Bq·m⁻³' },
      { symbol: 'Q', description: 'Radionuclide release rate from source stack', units: 'Bq·s⁻¹' },
      { symbol: 'u', description: 'Mean wind speed at effective stack release height', units: 'm·s⁻¹' },
      { symbol: '\\sigma_y, \\sigma_z', description: 'Crosswind lateral and vertical dispersion coefficients (Briggs formulas)', units: 'm' },
      { symbol: 'H', description: 'Effective plume release height (physical stack height plus plume rise)', units: 'm' }
    ],
    assumptions: [
      'Steady-state release with uniform wind speed and direction over the travel duration.',
      'Total reflection of effluent plume at ground boundary (zero dry deposition removal in base model).'
    ],
    benchmarks: 'Validated against NRC Regulatory Guide 1.145 atmospheric dispersion tables and EPA RASCAL benchmark runs.'
  },

  // 9. Module 9: Internal Contamination & Bioassay Interpretation
  {
    id: 'M9-Bioassay',
    moduleId: 'Module 9',
    moduleName: 'Internal Contamination & Bioassay',
    domain: 'Internal Dosimetry & Biokinetics',
    title: 'ICRP Bioassay Excretion Functions, Intake Back-Calculation & In Vivo Counting',
    overview: 'Estimates acute or chronic intake activities from urinary and fecal bioassay measurements or whole-body counter (WBC) organ retention using ICRP metabolic models.',
    standards: [
      { org: 'ICRP', code: 'Publication 78', year: '1997', title: 'Individual Monitoring for Internal Exposure of Workers' },
      { org: 'ICRP', code: 'Publication 130', year: '2015', title: 'Occupational Intakes of Radionuclides: Part 1' },
      { org: 'NCRP', code: 'Report No. 164', year: '2010', title: 'Management of Persons Contaminated with Radionuclides' }
    ],
    primaryFormula: 'I_0 = \\frac{M(t)}{m(t)} \\iff E(50) = I_0 \\cdot e(50) = \\frac{M(t)}{m(t)} \\cdot e(50)',
    secondaryFormulas: [
      { label: 'Excretion Fraction Function (Sum of Exponentials)', formula: 'm(t) = \\sum_{j=1}^n a_j \\cdot e^{-\\lambda_j t}' },
      { label: 'Whole Body In Vivo Retention', formula: 'R(t) = \\frac{A_{\\text{body}}(t)}{I_0}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Linear Biokinetic Response Convolution',
        explanation: 'For an acute intake occurring at t = 0, the observed 24-hour excretion or organ retention M(t) is directly proportional to initial intake I_0 scaled by reference bioassay function m(t):',
        math: 'M(t) = I_0 \\cdot m(t) \\implies I_0 = \\frac{M(t)}{m(t)}'
      }
    ],
    variables: [
      { symbol: 'I_0', description: 'Estimated initial acute intake activity', units: 'Bq' },
      { symbol: 'M(t)', description: 'Measured activity in 24-hour urine/feces or whole-body counter at post-intake day t', units: 'Bq' },
      { symbol: 'm(t)', description: 'Fraction of intake excreted per day or retained in organ at elapsed time t', units: 'dimensionless' },
      { symbol: 'e(50)', description: 'Committed effective dose coefficient per unit intake', units: 'Sv·Bq⁻¹' },
      { symbol: 'E(50)', description: 'Committed effective dose over 50-year integration period', units: 'mSv or Sv' }
    ],
    assumptions: [
      'Standard reference man physiology (70 kg adult male, 1.4 L/day urinary output).',
      'Intake occurred via inhalation (Type F, M, or S lung clearance) or ingestion (f_1 gastrointestinal uptake).'
    ],
    benchmarks: 'Directly follows ICRP Publication 78 Reference Bioassay tables and IDEAS EU Project guidelines.'
  },

  // 10. Module 10: Criticality Safety Limits & Hand Calculations
  {
    id: 'M10-CriticalityLimits',
    moduleId: 'Module 10',
    moduleName: 'Criticality Hand Calculations',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'ANSI/ANS-8.1 Subcritical Limits, Solid Angle Interaction & ARIES Hand Calculations',
    overview: 'Provides single-parameter subcritical limits for U-235, Pu-239, and U-233 systems (mass, cylinder diameter, slab thickness, volume) and multi-unit solid angle interaction safety checks.',
    standards: [
      { org: 'ANS', code: 'ANSI/ANS-8.1', year: '2014', title: 'Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors' },
      { org: 'ANS', code: 'ANSI/ANS-8.7', year: '1998', title: 'Nuclear Criticality Safety in the Storage of Fissile Materials' },
      { org: 'TID-7016', code: 'US AEC / ORNL', year: '1973', title: 'Nuclear Safety Guide (Report TID-7016 Rev. 2)' }
    ],
    primaryFormula: '\\Omega_{\\text{total}} = \\sum_{i=1}^n \\Omega_i = \\sum_{i=1}^n \\frac{2\\pi R_i^2}{d_i^2} \\le \\Omega_{\\text{allow}} \\quad (\\text{where } \\Omega_{\\text{allow}} = 9 - 10 k_{\\text{eff}})',
    secondaryFormulas: [
      { label: 'Single-Parameter Fissile Mass Safety Margin', formula: 'M_{\\text{safe}} = 0.45 \\cdot M_{\\text{crit, min}}' },
      { label: 'Subcritical Cylinder Diameter Limit', formula: 'D_{\\text{cyl}} = 0.85 \\cdot D_{\\text{crit}}' }
    ],
    variables: [
      { symbol: '\\Omega_{\\text{total}}', description: 'Total solid angle subtended by neighboring fissile units at reference unit', units: 'steradians (sr)' },
      { symbol: 'k_{\\text{eff}}', description: 'Reactivity multiplication of individual uncoupled unit', units: 'dimensionless' },
      { symbol: 'M_{\\text{safe}}', description: 'Administratively approved maximum safe batch mass limit', units: 'kg' }
    ],
    assumptions: [
      'Full water reflection assumed as bounding envelope unless structural moderation controls are verified.',
      'Solid angle method valid for individual unit k_eff ≤ 0.80 and spacing d > unit diameter.'
    ],
    benchmarks: 'Matches ANSI/ANS-8.1 Table 1 single-parameter limits (U-235 bare sphere 22.8 kg, solution 820 g).'
  },

  // 11. Module 11: Neutron Activation Analysis (NAA)
  {
    id: 'M11-NAA',
    moduleId: 'Module 11',
    moduleName: 'Neutron Activation Analysis',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Epithermal Resonance Integrals, Westcott g-Factors & Comparator NAA',
    overview: 'Quantifies trace element concentrations from gamma-ray peak counting following thermal and epithermal neutron activation using k0-standardization and cadmium ratios.',
    standards: [
      { org: 'IAEA', code: 'IAEA-TECDOC-1215', year: '2001', title: 'Use of Research Reactors for Neutron Activation Analysis' },
      { org: 'De Soete', code: 'Textbook Ref', year: '1972', title: 'Neutron Activation Analysis (John Wiley & Sons)' }
    ],
    primaryFormula: 'm_x = m_{\\text{std}} \\cdot \\frac{C_p,x}{C_p, \\text{std}} \\cdot \\frac{(1 - e^{-\\lambda_{\\text{std}} t_i}) e^{-\\lambda_{\\text{std}} t_d} (1 - e^{-\\lambda_{\\text{std}} t_c})}{(1 - e^{-\\lambda_x t_i}) e^{-\\lambda_x t_d} (1 - e^{-\\lambda_x t_c})} \\cdot \\frac{\\epsilon_{\\text{std}} I_{\\gamma, \\text{std}}}{\\epsilon_x I_{\\gamma, x}}',
    secondaryFormulas: [
      { label: 'Cadmium Ratio for Thermal vs Epithermal Flux', formula: 'R_{\\text{Cd}} = \\frac{A_{\\text{bare}}}{A_{\\text{Cd-shielded}}} = 1 + \\frac{\\Phi_{\\text{th}} \\sigma_0}{\\Phi_{\\text{epi}} I_0}' }
    ],
    variables: [
      { symbol: 'm_x', description: 'Mass of unknown trace element in analytical sample', units: 'µg or mg' },
      { symbol: 'C_p', description: 'Net full-energy photopeak counts recorded by MCA detector', units: 'counts' },
      { symbol: 't_i, t_d, t_c', description: 'Irradiation, decay (cooling), and counting live times', units: 's' },
      { symbol: 'I_\\gamma', description: 'Absolute gamma emission probability per decay branch', units: 'dimensionless' },
      { symbol: '\\epsilon', description: 'Full-energy peak detection efficiency at photopeak energy', units: 'dimensionless' }
    ],
    assumptions: [
      'Identical neutron flux exposure for sample and co-irradiated comparator standard.',
      'Dead-time losses corrected via live-time clock or loss-free counting (LFC).'
    ],
    benchmarks: 'Calibrated against NIST Standard Reference Material (SRM 1633c coal fly ash) activation benchmarks.'
  },

  // 12. Module 12: Multi-Layer Shielding & Broder's Formula
  {
    id: 'M12-Broder',
    moduleId: 'Module 12',
    moduleName: 'Multi-Layer Shielding',
    domain: 'Dose, Transport & Shielding',
    title: 'Broder Empirical Multi-Layer Buildup & Stratified Attenuation',
    overview: 'Solves complex composite shield walls containing sequential layers of lead, steel, concrete, and water, correctly accounting for spectral boundary interfaces and buildup regeneration.',
    standards: [
      { org: 'ANSI/ANS', code: '6.4.3-1991', year: '1991', title: 'Gamma-Ray Attenuation Coefficients and Buildup Factors for Engineering Materials' },
      { org: 'Broder', code: 'Sov. J. At. Energy', year: '1962', title: 'Application of the Generalized Form of the Empirical Buildup Factor for Multi-Layer Shields' }
    ],
    primaryFormula: 'B_N\\left(\\sum_{i=1}^N \\mu_i x_i\\right) = B_N\\left(\\sum_{i=1}^N \\mu_i x_i\\right) + \\sum_{n=1}^{N-1} \\left[ B_n\\left(\\sum_{i=1}^n \\mu_i x_i\\right) - B_{n+1}\\left(\\sum_{i=1}^n \\mu_i x_i\\right) \\right]',
    secondaryFormulas: [
      { label: 'Two-Layer Broder Approximation (Lead + Concrete)', formula: 'B_{1+2}(x_1, x_2) = B_2(\\mu_1 x_1 + \\mu_2 x_2) + [B_1(\\mu_1 x_1) - B_2(\\mu_1 x_1)] e^{-\\mu_2 x_2}' }
    ],
    variables: [
      { symbol: 'B_N', description: 'Overall composite multi-layer radiation buildup factor', units: 'dimensionless' },
      { symbol: '\\mu_i x_i', description: 'Mean free paths (relaxation lengths) of the i-th shield layer', units: 'dimensionless' }
    ],
    assumptions: [
      'Layer sequence ordering matters: high-Z first (absorbs primary photons via photoelectric) followed by low-Z to attenuate scatter.',
      'Plane monodirectional or point isotropic source incidence.'
    ],
    benchmarks: 'Matches MCNP6 Monte Carlo multi-layer penetration runs within 5-8% error across 10 mean free paths.'
  },

  // 13. Module 13: Radioactive Decay Chains & Bateman Equations
  {
    id: 'M13-Bateman',
    moduleId: 'Module 13',
    moduleName: 'Decay Chains & Bateman',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Coupled First-Order Decay ODEs, Bateman Formula & Secular Equilibrium',
    overview: 'Solves linear and branching multi-generation radioisotope decay chains, calculating instantaneous inventories, secular/transient equilibrium points, and ingestion hazards.',
    standards: [
      { org: 'Bateman', code: 'Proc. Cambridge Phil. Soc. 15', year: '1910', title: 'The Solution of a System of Differential Equations Occurring in the Theory of Radioactive Transformations' },
      { org: 'ICRP', code: 'Publication 107', year: '2008', title: 'Nuclear Decay Data for Dosimetric Calculations' }
    ],
    primaryFormula: 'N_n(t) = N_1(0) \\cdot \\left( \\prod_{i=1}^{n-1} \\lambda_i \\right) \\cdot \\sum_{i=1}^n \\frac{e^{-\\lambda_i t}}{\\prod_{j=1, j \\ne i}^n (\\lambda_j - \\lambda_i)}',
    secondaryFormulas: [
      { label: 'Two-Step Daughter Activity (General)', formula: 'A_2(t) = \\frac{\\lambda_2}{\\lambda_2 - \\lambda_1} A_1(0) (e^{-\\lambda_1 t} - e^{-\\lambda_2 t}) + A_2(0) e^{-\\lambda_2 t}' },
      { label: 'Time of Maximum Daughter Activity (Transient Equilibrium)', formula: 't_{\\max} = \\frac{\\ln(\\lambda_2 / \\lambda_1)}{\\lambda_2 - \\lambda_1}' },
      { label: 'Secular Equilibrium Condition (T1 >> T2)', formula: 'A_2(t) \\approx A_1(0) \\cdot (1 - e^{-\\lambda_2 t}) \\implies A_2 = A_1' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Coupled Differential Master Equation',
        explanation: 'For an unbranched decay chain where each member decays into the next:',
        math: '\\frac{dN_1}{dt} = -\\lambda_1 N_1, \\quad \\frac{dN_i}{dt} = \\lambda_{i-1} N_{i-1} - \\lambda_i N_i'
      },
      {
        stepTitle: '2. Laplace Transform Solution',
        explanation: 'Applying the Laplace transform L{N_i(t)} = n_i(s) converts the ODE chain into algebraic products:',
        math: 's n_i(s) - N_i(0) = \\lambda_{i-1} n_{i-1}(s) - \\lambda_i n_i(s) \\implies n_n(s) = \\frac{N_1(0) \\prod_{i=1}^{n-1} \\lambda_i}{\\prod_{j=1}^n (s + \\lambda_j)}'
      },
      {
        stepTitle: '3. Inverse Partial Fraction Expansion',
        explanation: 'Inverting the transform back into the time domain yields the classical Bateman summation over distinct poles:',
        math: 'N_n(t) = N_1(0) \\left( \\prod_{i=1}^{n-1} \\lambda_i \\right) \\sum_{i=1}^n \\frac{e^{-\\lambda_i t}}{\\prod_{j \\ne i} (\\lambda_j - \\lambda_i)}'
      }
    ],
    variables: [
      { symbol: 'N_n(t)', description: 'Number of atoms of the n-th decay chain generation at time t', units: 'atoms' },
      { symbol: 'A_n(t)', description: 'Activity of the n-th generation radionuclide (λ_n × N_n)', units: 'Bq' },
      { symbol: '\\lambda_i', description: 'Radioactive decay constant of the i-th radionuclide', units: 's⁻¹' },
      { symbol: 't_{\\max}', description: 'Time required for daughter product to reach peak activity', units: 's, h, or days' }
    ],
    assumptions: [
      'No cyclic decay pathways (acyclic directed graph).',
      'All decay constants are distinct (λ_i ≠ λ_j) in the analytical partial fractions.'
    ],
    benchmarks: 'Validated against standard Mo-99/Tc-99m and Cs-137/Ba-137m equilibrium test curves.'
  },

  // 14. Module 14: ALARA Optimization & Cost-Benefit
  {
    id: 'M14-ALARA',
    moduleId: 'Module 14',
    moduleName: 'ALARA Cost-Benefit Optimization',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Differential Cost-Benefit Analysis, Collective Dose & Alpha-Value Monetary Valuation',
    overview: 'Applies quantitative ALARA decision criteria balancing protective engineering shielding investments against statistical monetary value of collective dose reduction.',
    standards: [
      { org: 'ICRP', code: 'Publication 101', year: '2006', title: 'The Optimisation of Radiological Protection - Broadening the Process' },
      { org: 'US NRC', code: 'NUREG-1530 Rev. 1', year: '2022', title: 'Reassessment of NRC\'s Dollar Per Person-Rem Conversion Factor Policy' }
    ],
    primaryFormula: '\\frac{\\Delta X}{\\Delta S} \\le \\alpha \\iff \\Delta X \\le \\alpha \\cdot (S_{\\text{base}} - S_{\\text{opt}}) = \\alpha \\cdot \\Delta S',
    secondaryFormulas: [
      { label: 'Collective Dose S (person-Sv)', formula: 'S = \\sum_{i=1}^M E_i = N_{\\text{workers}} \\cdot \\bar{E}' },
      { label: 'Net Societal Benefit B', formula: 'B = V - (P + X + Y) \\quad [\\text{where Y is cost of radiation detriment } Y = \\alpha S]' }
    ],
    variables: [
      { symbol: '\\alpha', description: 'Monetary value per unit collective dose averted (NRC base: $5,100 / person-rem = $510,000 / person-Sv)', units: 'USD·(person-Sv)⁻¹' },
      { symbol: '\\Delta X', description: 'Capital and operational cost of radiological shielding/redesign', units: 'USD' },
      { symbol: '\\Delta S', description: 'Collective dose reduction achieved by the engineering intervention', units: 'person-Sv' }
    ],
    assumptions: [
      'Linear No-Threshold (LNT) hypothesis linking collective dose to stochastic health risk.',
      'Discounted present value accounting for multi-year facility lifetime operations.'
    ],
    benchmarks: 'Directly conforms to US NRC NUREG-1530 Rev. 1 regulatory analysis guidelines.'
  },

  // 15. Module 15: Criticality Inhour Equation & Kinetic Period
  {
    id: 'M15-Inhour',
    moduleId: 'Module 15',
    moduleName: 'Nuclear Kinetics & Inhour',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Nordheim Inhour Equation, 6 Delayed Neutron Precursor Groups & Prompt Criticality',
    overview: 'Solves the point reactor kinetics inhour equation to map reactivity insertions ρ to asymptotic stable reactor period T across sub-prompt and super-prompt regimes.',
    standards: [
      { org: 'Keepin', code: 'Textbook Ref', year: '1965', title: 'Physics of Nuclear Kinetics (Addison-Wesley)' },
      { org: 'Hetrick', code: 'Textbook Ref', year: '1971', title: 'Dynamics of Nuclear Reactors (Univ. of Chicago Press)' }
    ],
    primaryFormula: '\\rho = \\frac{\\ell^*}{k_{\\text{eff}} T} + \\sum_{i=1}^6 \\frac{\\beta_i}{1 + \\lambda_i T}',
    secondaryFormulas: [
      { label: 'Stable Period for Small Reactivity (ρ << β)', formula: 'T \\approx \\frac{\\beta - \\rho}{\\lambda_{\\text{eff}} \\rho} \\approx \\frac{\\sum \\beta_i / \\lambda_i}{\\rho}' },
      { label: 'Prompt Critical Period (ρ ≥ β)', formula: 'T_{\\text{prompt}} \\approx \\frac{\\ell^*}{\\rho - \\beta}' },
      { label: 'Reactivity in Dollars ($)', formula: '\\$ = \\frac{\\rho}{\\beta_{\\text{eff}}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Point Reactor Kinetics Equations (PRKE)',
        explanation: 'Coupling the neutron population n(t) to the 6 delayed precursor emitter concentrations C_i(t):',
        math: '\\frac{dn}{dt} = \\frac{\\rho - \\beta}{\\ell^*} n(t) + \\sum_{i=1}^6 \\lambda_i C_i(t), \\quad \\frac{dC_i}{dt} = \\frac{\\beta_i}{\\ell^*} n(t) - \\lambda_i C_i(t)'
      },
      {
        stepTitle: '2. Asymptotic Exponential Ansatz',
        explanation: 'Assuming an exponential solution n(t) = n_0 e^(ωt) where T = 1/ω, substituting into precursor ODEs gives:',
        math: 'C_i(t) = \\frac{\\beta_i / \\ell^*}{\\omega + \\lambda_i} n_0 e^{\\omega t} \\implies \\omega = \\frac{\\rho - \\beta}{\\ell^*} + \\sum_{i=1}^6 \\frac{\\lambda_i \\beta_i / \\ell^*}{\\omega + \\lambda_i}'
      },
      {
        stepTitle: '3. Nordheim Inhour Formulation',
        explanation: 'Rearranging for reactivity ρ with asymptotic period T = 1/ω yields the 7-root Inhour equation:',
        math: '\\rho = \\frac{\\ell^*}{T} + \\sum_{i=1}^6 \\frac{\\beta_i}{1 + \\lambda_i T}'
      }
    ],
    variables: [
      { symbol: '\\rho', description: 'Reactivity of reactor system ((k_eff - 1) / k_eff)', units: 'dimensionless (or pcm, 1 pcm = 10⁻⁵)' },
      { symbol: 'T', description: 'Asymptotic stable reactor period (e-folding time)', units: 's' },
      { symbol: '\\ell^*', description: 'Prompt neutron generation lifetime (~20-50 µs for LWRs, 1 ms for Heavy Water)', units: 's' },
      { symbol: '\\beta_i', description: 'Delayed neutron fraction for the i-th precursor group (sum β = 0.0065 for U-235)', units: 'dimensionless' },
      { symbol: '\\lambda_i', description: 'Decay constant of the i-th delayed neutron precursor group', units: 's⁻¹' }
    ],
    assumptions: [
      'Spatial fundamental mode dominates (negligible higher-order spatial harmonics).',
      'No thermal Doppler feedback during initial asymptotic exponential rise.'
    ],
    benchmarks: 'Matches Keepin 6-group delayed neutron parameters for thermal U-235 fission.'
  },

  // 16. Module 16: RAM Transport & Packaging Regulations
  {
    id: 'M16-RAM',
    moduleId: 'Module 16',
    moduleName: 'RAM Transport (IAEA SSR-6)',
    domain: 'Regulatory Standards & Transport Security',
    title: 'A1/A2 Package Activity Thresholds, Transport Index (TI) & Type A/B Packaging Rules',
    overview: 'Evaluates international consignment compliance under IAEA SSR-6, 10 CFR 71, and 49 CFR 173: determines package categorization, vehicle radiation limits, and mixture sum rules.',
    standards: [
      { org: 'IAEA', code: 'Safety Standards SSR-6 (Rev. 1)', year: '2018', title: 'Regulations for the Safe Transport of Radioactive Material' },
      { org: 'US NRC', code: '10 CFR Part 71', year: '2023', title: 'Packaging and Transportation of Radioactive Material' },
      { org: 'US DOT', code: '49 CFR Part 173 Subpart I', year: '2023', title: 'Class 7 - Radioactive Materials' }
    ],
    primaryFormula: '\\text{TI} = \\dot{H}^*(10)_{1\\text{m}} \\times 100 \\quad [\\text{Dose rate at 1 meter in mSv/h multiplied by 100 (or in mrem/h)}]',
    secondaryFormulas: [
      { label: 'Mixture Package Classification (Sum of Fractions Rule)', formula: '\\sum_{i} \\frac{A_i}{A_{2, i}} \\le 1.0 \\quad [\\text{Condition for Type A Package Eligibility}]' },
      { label: 'Surface Contamination Non-Fixed Limits (Beta/Gamma)', formula: 'L_{\\text{contam}} \\le 4.0 \\text{ Bq/cm}^2 \\quad [0.4 \\text{ Bq/cm}^2 \\text{ for Alpha}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. The Q-System Derivation of A1/A2 Limits',
        explanation: 'A1 (special form) and A2 (normal form) values are derived from five independent catastrophic accident exposure scenarios limited to 50 mSv effective dose:',
        math: 'Q_A = \\text{External Photon}, \\, Q_B = \\text{Beta Skin}, \\, Q_C = \\text{Inhalation}, \\, Q_D = \\text{Skin Contamination}, \\, Q_E = \\text{Submersion}'
      },
      {
        stepTitle: '2. Limiting Envelope Threshold',
        explanation: 'A2 is established as the minimum dosimetric intake/exposure limit across all non-special form pathways:',
        math: 'A_2 = \\min(Q_A, Q_B, Q_C, Q_D, Q_E)'
      }
    ],
    variables: [
      { symbol: '\\text{TI}', description: 'Transport Index assigned to package indicating maximum radiation level at 1 meter', units: 'dimensionless' },
      { symbol: 'A_1', description: 'Maximum activity limit for Special Form radioactive material in Type A package', units: 'TBq' },
      { symbol: 'A_2', description: 'Maximum activity limit for Normal Form radioactive material in Type A package', units: 'TBq' },
      { symbol: '\\dot{H}^*(10)_{1\\text{m}}', description: 'Ambient dose equivalent rate measured 1.0 meter from package surface', units: 'mSv·h⁻¹' }
    ],
    assumptions: [
      'Type A packages withstand normal transport conditions (drop, water spray, stacking, penetration tests).',
      'Accident conditions of transport (9 m drop, 800°C fire for 30 min, 15 m immersion) mandate Type B certification.'
    ],
    benchmarks: 'Directly verified against IAEA SSR-6 Table 2 (A1/A2 values) and 49 CFR 173.435 values.'
  },

  // 17. Module 17: Internal Dosimetry & Biokinetic Models
  {
    id: 'M17-Biokinetics',
    moduleId: 'Module 17',
    moduleName: 'Internal Dosimetry (ICRP)',
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

  // 18. Module 18: Electronic Warfare EMR & Microwave Safety
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

  // 19. Module 19: Criticality Safety & Reactor Core Simulator
  {
    id: 'M19-Criticality',
    moduleId: 'Module 19',
    moduleName: 'Criticality & Reactor Core',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Multi-Variable Heterogeneous Lattice, Four-Factor Formula, 2D Jacobi Diffusion & Peaking Factor F_xy',
    overview: 'Simulates heterogeneous reactor core physics: cell-specific material cross-sections (enrichment, void fraction, burnable poison wt%, and control depth), 2D finite-difference Jacobi diffusion, local k-infinity mapping, and radial power peaking factor F_xy.',
    standards: [
      { org: 'ANS', code: 'ANSI/ANS-8.1', year: '2014', title: 'Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors' },
      { org: 'IAEA', code: 'Safety Standards Series No. SSG-27', year: '2014', title: 'Criticality Safety in the Handling of Fissile Material' },
      { org: 'Lamarsh & Baratta', code: 'Textbook Ref', year: '2001', title: 'Introduction to Nuclear Engineering (3rd Ed., Prentice Hall)' },
      { org: 'Stacey', code: 'Textbook Ref', year: '2007', title: 'Nuclear Reactor Physics (2nd Ed., John Wiley & Sons)' }
    ],
    primaryFormula: 'k_{\\text{eff}} = k_\\infty \\cdot P_{\\text{FNL}} \\cdot P_{\\text{TNL}} = (\\eta \\cdot f \\cdot p \\cdot \\varepsilon) \\cdot \\frac{1}{1 + M^2 B^2}',
    secondaryFormulas: [
      { label: 'Local Infinite Multiplication Factor k_inf(r, c)', formula: 'k_\\infty(r, c) = \\frac{\\nu\\Sigma_f(r, c)}{\\Sigma_a(r, c)} \\cdot p(r, c) \\cdot \\epsilon(r, c)' },
      { label: 'Local Heterogeneous Absorption Cross-Section', formula: '\\Sigma_a(r,c) = \\Sigma_{a,\\text{fuel}}(e) (1 - 0.7\\alpha) + \\Sigma_{a,\\text{mod}}(1 - \\alpha) + \\Sigma_{a,\\text{boron}} + \\Sigma_{a,\\text{poison}} + \\Sigma_{a,\\text{control}}(z)' },
      { label: '2D Finite-Difference Jacobi Diffusion Scheme', formula: '\\phi_{i,j}^{(k+1)} = \\frac{\\frac{D}{\\Delta^2}\\left(\\phi_{i+1,j} + \\phi_{i-1,j} + \\phi_{i,j+1} + \\phi_{i,j-1}\\right) + \\frac{1}{k_{\\text{eff}}} \\nu\\Sigma_f(i,j) \\phi_{i,j}}{\\frac{4D}{\\Delta^2} + \\Sigma_a(i,j)}' },
      { label: 'Radial Power Peaking Factor F_xy', formula: 'F_{xy} = \\frac{\\max_{(r,c)} P(r,c)}{P_{\\text{avg}}} = \\frac{\\max_{(r,c)} [\\kappa \\Sigma_f(r,c) \\phi(r,c)]}{\\frac{1}{N_{\\text{fuel}}} \\sum \\kappa \\Sigma_f \\phi}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Six-Factor Neutron Balance & Geometric Buckling',
        explanation: 'In a finite multiplying system, the effective multiplication factor accounts for both infinite medium multiplication and non-leakage probabilities during slowing down and thermal diffusion:',
        math: 'k_{\\text{eff}} = \\eta \\cdot f \\cdot p \\cdot \\varepsilon \\cdot P_{\\text{FNL}} \\cdot P_{\\text{TNL}} = \\frac{k_\\infty}{(1 + L_s^2 B^2)(1 + L_d^2 B^2)} \\approx \\frac{k_\\infty}{1 + M^2 B^2}'
      },
      {
        stepTitle: '2. Heterogeneous 2D Finite-Difference Discretization',
        explanation: 'Applying central second-order finite differences to the Helmholtz diffusion equation -D ∇²φ + Σ_a φ = (1/k_eff) νΣ_f φ on a grid of pitch Δ with localized cross-sections yields the Jacobi point iteration:',
        math: '-D \\left( \\frac{\\phi_{i+1,j} - 2\\phi_{i,j} + \\phi_{i-1,j}}{\\Delta^2} + \\frac{\\phi_{i,j+1} - 2\\phi_{i,j} + \\phi_{i,j-1}}{\\Delta^2} \\right) + \\Sigma_a(i,j) \\phi_{i,j} = S_{i,j}'
      },
      {
        stepTitle: '3. Radial Power Peaking Factor (F_xy)',
        explanation: 'Local fission heat rate is proportional to macroscopic fission cross-section multiplied by thermal flux: P(r, c) = κ Σ_f(r, c) φ(r, c). The 2D peaking factor quantifies thermal margin to DNB (departure from nucleate boiling):',
        math: 'F_{xy} = \\frac{\\max_{(r,c)} P(r,c)}{\\frac{1}{N_{\\text{fuel}}} \\sum_{\\text{fuel}} P(r,c)} \\quad (\\text{Design Limit: } F_{xy} \\le 1.65)'
      }
    ],
    variables: [
      { symbol: 'k_{\\text{eff}}', description: 'Effective neutron multiplication factor of the 3D core', units: 'dimensionless' },
      { symbol: 'k_\\infty(r,c)', description: 'Local infinite multiplication factor of fuel assembly at lattice coordinate (r, c)', units: 'dimensionless' },
      { symbol: '\\Sigma_a(r,c)', description: 'Local macroscopic absorption cross-section', units: 'cm⁻¹' },
      { symbol: '\\nu\\Sigma_f(r,c)', description: 'Local macroscopic fission yield cross-section (neutrons released per cm path)', units: 'cm⁻¹' },
      { symbol: 'F_{xy}', description: 'Radial power peaking factor (ratio of peak assembly power to core average)', units: 'dimensionless' },
      { symbol: 'B^2', description: 'Geometric buckling eigenvalue for reactor geometry', units: 'm⁻²' },
      { symbol: 'M^2', description: 'Neutron migration area (L_s² + L_d²)', units: 'cm²' }
    ],
    assumptions: [
      'One-group thermal neutron diffusion with reflective boundary conditions at outer core baffle.',
      'Heterogeneous assembly parameters homogenized within each cell pitch.'
    ],
    benchmarks: 'Validated against standard PWR, BWR, CANDU, NuScale SMR, and Godiva fast burst benchmarks.'
  },

  // 20. Module 20: Gamma Spectroscopy & MCA Simulator
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

  // 21. Module 22: MARSSIM Decommissioning & Detection Limits
  {
    id: 'M22-MARSSIM',
    moduleId: 'Module 22',
    moduleName: 'MARSSIM Decommissioning',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Currie Detection Limits (MDA/MDC), ISO 11929, FSS Triangular Sizing & Wilcoxon Rank Sum Nonparametric Decision Engine',
    overview: 'Statistical framework for site radiological release, final status surveys (FSS), Currie limits for count data, Wilcoxon Rank Sum (WRS) and Sign nonparametric testing under NUREG-1575.',
    standards: [
      { org: 'NRC / EPA / DOE / DOD', code: 'MARSSIM (NUREG-1575)', year: '2000', title: 'Multi-Agency Radiation Survey and Site Investigation Manual (Rev. 1)' },
      { org: 'NRC', code: 'NUREG-1505', year: '1998', title: 'A Nonparametric Statistical Methodology for the Design and Analysis of Final Status Decommissioning Surveys' },
      { org: 'ISO', code: 'ISO 11929-1:2019', year: '2019', title: 'Determination of the characteristic limits (decision threshold, detection limit) for ionizing radiation measurements' },
      { org: 'ISO', code: 'ISO 7503-1:2016', year: '2016', title: 'Measurement of radioactivity - Alpha-, beta- and photon emitting radionuclides in surface contamination' },
      { org: 'Currie', code: 'Anal. Chem. 40', year: '1968', title: 'Limits for Qualitative Detection and Quantitative Determination' }
    ],
    primaryFormula: 'L_D = 2.71 + 4.65 \\sqrt{\\sigma_{\\text{bg}}^2} \\iff \\text{MDA} = \\frac{2.71 + 4.65 \\sqrt{C_{\\text{bg}}}}{\\epsilon_i \\cdot \\epsilon_s \\cdot t_{\\text{count}} \\cdot F_{\\text{wipe}}}',
    secondaryFormulas: [
      { label: 'Critical Level (Decision Limit L_C)', formula: 'L_C = 2.33 \\sqrt{\\sigma_{\\text{bg}}^2} = 2.33 \\sqrt{C_{\\text{bg}}} \\quad (\\alpha = 0.05)' },
      { label: 'Surface Concentration MDC (dpm/100cm²)', formula: '\\text{MDC} = \\frac{\\text{MDA}_{\\text{dpm}}}{A_{\\text{probe}} / 100\\text{ cm}^2}' },
      { label: 'Wilcoxon Rank Sum (WRS) Sum of Ranks', formula: 'W_R = \\sum_{i=1}^{n_R} R_i, \\quad E[W_R] = \\frac{n_R(n_R + n_S + 1)}{2}, \\quad \\sigma_{W_R} = \\sqrt{\\frac{n_R n_S (n_R + n_S + 1)}{12}}' },
      { label: 'Sign Test Sample Size (MARSSIM Table 5.1)', formula: 'N = \\frac{(Z_{1-\\alpha} + Z_{1-\\beta})^2}{4 (\\Phi(\\Delta/\\sigma) - 0.5)^2} \\times 1.20' },
      { label: 'Triangular Systematic Grid Node Spacing', formula: 'L = \\sqrt{\\frac{A_{\\text{survey}}}{0.866 \\cdot N}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Currie Hypothesis Testing (Alpha & Beta Risks)',
        explanation: 'At the critical decision threshold L_C, the probability of false positive (Type I error alpha) is set to 5% (Z = 1.645):',
        math: 'L_C = k_\\alpha \\sigma_0 = 1.645 \\sqrt{\\sigma_B^2 + \\sigma_S^2} = 1.645 \\sqrt{2 C_B} = 2.326 \\sqrt{C_B}'
      },
      {
        stepTitle: '2. Detection Limit L_D with False Negative Beta Risk',
        explanation: 'Setting both alpha and beta to 5% requires L_D = L_C + k_beta * sigma_D under Poisson count variance:',
        math: 'L_D = L_C + 1.645 \\sqrt{\\sigma_B^2 + (C_B + L_D)} \\implies L_D = k^2 + 2 k \\sqrt{2 C_B} = 2.71 + 4.65 \\sqrt{C_B}'
      },
      {
        stepTitle: '3. Minimum Detectable Activity (MDA) & 4π/2π Efficiencies',
        explanation: 'Activity MDA is obtained by dividing count detection limit L_D by instrument efficiency ε_i, ISO 7503-1 surface emission efficiency ε_s, counting duration, and removable smear factor F_wipe:',
        math: '\\text{MDA} = \\frac{2.71 + 4.65 \\sqrt{C_B}}{\\epsilon_i \\cdot \\epsilon_s \\cdot t_{\\text{count}} \\cdot F_{\\text{wipe}}} \\quad [\\text{Bq or dpm}]'
      },
      {
        stepTitle: '4. Wilcoxon Rank Sum (WRS) Nonparametric Statistic',
        explanation: 'For radionuclides present in background, n_R reference and n_S survey measurements are pooled and ranked. The test statistic W_R is the sum of ranks of the reference area adjusted for DCGL_W:',
        math: 'z = \\frac{W_R - E[W_R] + 0.5}{\\sigma_{W_R}} = \\frac{W_R - \\frac{n_R(n_R + n_S + 1)}{2} + 0.5}{\\sqrt{\\frac{n_R n_S (n_R + n_S + 1)}{12}}}'
      },
      {
        stepTitle: '5. Triangular Systematic Sampling Geometry',
        explanation: 'The optimal non-overlapping hexagonal/triangular grid has unit cell area A = (√3 / 2) L² = 0.866 L². Dividing total survey area by sample count N yields grid pitch L:',
        math: 'A_{\\text{cell}} = 0.866 L^2 = \\frac{A_{\\text{survey}}}{N} \\implies L = \\sqrt{\\frac{A_{\\text{survey}}}{0.866 \\cdot N}}'
      }
    ],
    variables: [
      { symbol: 'L_D', description: 'Detection limit in net counts guaranteeing 95% true detection confidence (β = 0.05)', units: 'counts' },
      { symbol: 'L_C', description: 'Critical decision level / threshold above background (α = 0.05)', units: 'counts' },
      { symbol: '\\text{MDA}', description: 'Minimum Detectable Activity', units: 'Bq or dpm' },
      { symbol: '\\text{MDC}', description: 'Minimum Detectable Concentration', units: 'dpm/100 cm² or Bq/cm²' },
      { symbol: 'C_{\\text{bg}}', description: 'Total counts recorded in paired blank background measurement', units: 'counts' },
      { symbol: '\\epsilon_i, \\epsilon_s', description: 'Instrument 2π/4π efficiency and ISO 7503-1 surface emission efficiency (0.5 for beta >0.4 MeV, 0.25 for alpha)', units: 'dimensionless' },
      { symbol: 'F_{\\text{wipe}}', description: 'Removable surface contamination smear collection factor (0.10 for 10% wipe)', units: 'dimensionless' },
      { symbol: 'W_R', description: 'Wilcoxon Rank Sum test statistic (sum of ranks for reference area)', units: 'dimensionless' },
      { symbol: 'L', description: 'Systematic triangular sample grid node spacing', units: 'm' },
      { symbol: '\\Delta / \\sigma', description: 'Relative shift parameter ((DCGL - LBGR) / standard deviation)', units: 'dimensionless' }
    ],
    assumptions: [
      'Normal distribution approximation to Poisson counting variance for background counts C_B > 20.',
      'MARSSIM 20% sample overage buffer mandatory to guarantee test power in presence of lost/inaccessible data.',
      'Sign test applied when radionuclide is absent from background; WRS test applied when radionuclide is present in background.'
    ],
    benchmarks: 'Fully validated against MARSSIM Table 5.1/5.2 sample sizes and NUREG-1575 Appendix A benchmarks.'
  },

  // 22. Module 23: AAPM TG-43 Medical Brachytherapy Planner
  {
    id: 'M23-TG43',
    moduleId: 'Module 23',
    moduleName: 'Brachytherapy Planner (TG-43)',
    domain: 'Medical & Advanced Expansion',
    title: 'AAPM TG-43U1 Clinical Dosimetry Protocol for Interstitial Seed Implants & HDR Afterloading',
    overview: 'Governing clinical protocol for 2D/3D interstitial brachytherapy dose distributions around sealed source seed implants (I-125, Pd-103, Cs-131, Ir-192, Cs-137). Computes line-source geometry factors, radial attenuation, 2D anisotropy, cumulative DVHs, and quality indices.',
    standards: [
      { org: 'AAPM', code: 'TG-43U1', year: '2004', title: 'Update of AAPM Task Group No. 43 Report on Brachytherapy Dosimetry' },
      { org: 'AAPM', code: 'TG-43U1S2', year: '2014', title: 'Supplement to the 2004 Update of the AAPM Task Group No. 43 Report' },
      { org: 'ESTRO', code: 'Booklet 8', year: '2004', title: 'A Practical Guide to Quality Control of Brachytherapy Equipment' },
      { org: 'ABS / GEC-ESTRO', code: 'Consensus', year: '2016', title: 'Consensus Guidelines for Permanent Prostate Brachytherapy' },
      { org: 'ICRU', code: 'Report 58 / 89', year: '2016', title: 'Prescribing, Recording, and Reporting Interstitial & Cervix Brachytherapy' }
    ],
    primaryFormula: '\\dot{D}(r, \\theta) = S_K \\cdot \\Lambda \\cdot \\frac{G_L(r, \\theta)}{G_L(r_0, \\theta_0)} \\cdot g_L(r) \\cdot F(r, \\theta)',
    secondaryFormulas: [
      { label: 'Line Source Geometry Factor G_L(r, θ)', formula: 'G_L(r, \\theta) = \\frac{\\beta}{L \\cdot r \\cdot \\sin\\theta} = \\frac{\\theta_2 - \\theta_1}{L \\cdot y\'' },
      { label: 'Point Source Approximation G_P(r)', formula: 'G_P(r) = \\frac{1}{r^2} \\quad (\\text{valid for } r > 2L)' },
      { label: 'Permanent Implant Total Lifetime Dose', formula: 'D_{\\text{total}} = \\int_0^\\infty \\dot{D}_0 e^{-\\lambda t} \\, dt = \\frac{\\dot{D}_0}{\\lambda} = 1.4427 \\cdot T_{1/2} \\cdot \\dot{D}_0' },
      { label: 'HDR Temporary Implant Fraction Dose', formula: 'D_{\\text{HDR}} = \\sum_{j=1}^M \\dot{D}_j(r_j, \\theta_j) \\cdot \\Delta t_j' },
      { label: 'Conformal Index (COIN)', formula: '\\text{COIN} = \\frac{V_{\\text{target, ref}}}{V_{\\text{target}}} \\times \\frac{V_{\\text{target, ref}}}{V_{\\text{ref}}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Line Source Geometric Integral',
        explanation: 'Integrating differential point source elements dq = (A / L) dz\' along active encapsulated core length L from -L/2 to +L/2:',
        math: 'G_L(r, \\theta) = \\frac{1}{L} \\int_{-L/2}^{L/2} \\frac{dz\'}{(z - z\')^2 + y^2} = \\frac{1}{L y} \\left[ \\arctan\\left(\\frac{z\' - z}{y}\\right) \\right]_{-L/2}^{L/2} = \\frac{\\theta_2 - \\theta_1}{L \\cdot r \\sin\\theta}'
      },
      {
        stepTitle: '2. Limiting Behavior to Point Source (r >> L)',
        explanation: 'Expanding the angle difference β = θ_2 - θ_1 as a Taylor series in powers of (L / r):',
        math: '\\lim_{L / r \\to 0} G_L(r, \\theta) = \\frac{1}{r^2} = G_P(r)'
      },
      {
        stepTitle: '3. Radial Dose Function & Water Photon Physics',
        explanation: 'The dimensionless function g_L(r) models photon attenuation and Compton scattering along the transverse bisector (θ_0 = 90°). Fitted by a 5th-order polynomial:',
        math: 'g_L(r) = a_0 + a_1 r + a_2 r^2 + a_3 r^3 + a_4 r^4 + a_5 r^5'
      },
      {
        stepTitle: '4. Lifetime Decay Dose Integration for Permanent Implants',
        explanation: 'For permanent radioactive seed implants (I-125, Pd-103, Cs-131), the total absorbed dose integrated from implantation time t=0 to infinity is:',
        math: 'D_\\infty = \\int_0^\\infty \\dot{D}_0 e^{-\\lambda t} dt = \\frac{\\dot{D}_0}{\\lambda} = \\frac{\\dot{D}_0}{\\ln(2) / T_{1/2}} = 1.4427 \\cdot T_{1/2} \\cdot \\dot{D}_0'
      },
      {
        stepTitle: '5. Cumulative Dose-Volume Histogram (DVH) Integration',
        explanation: 'The cumulative DVH curve V(D) represents the fraction of volume of an anatomical structure receiving dose equal to or greater than D:',
        math: 'V(D) = \\frac{1}{V_{\\text{total}}} \\int_D^\\infty \\left(-\\frac{dV}{dD^{\\prime}}\\right) dD^{\\prime} \\implies V_{100} = \\frac{V(D \\ge D_{\\text{Rx}})}{V_{\\text{target}}} \\times 100\\%'
      }
    ],
    variables: [
      { symbol: 'S_K', description: 'Air-kerma strength of source seed measured in vacuum', units: 'µGy·m²·h⁻¹ (or U, where 1 U = 1 µGy·m²·h⁻¹)' },
      { symbol: '\\Lambda', description: 'Dose-rate constant in water at reference point (r₀ = 1 cm, θ₀ = 90°)', units: 'cGy·h⁻¹·U⁻¹' },
      { symbol: 'G_L(r, \\theta)', description: 'Geometry factor accounting for spatial distribution of radioactivity inside encapsulation', units: 'cm⁻²' },
      { symbol: 'g_L(r)', description: 'Radial dose function modeling transverse attenuation and Compton buildup in water', units: 'dimensionless' },
      { symbol: 'F(r, \\theta)', description: '2D anisotropy function accounting for seed encapsulation self-absorption through titanium welds', units: 'dimensionless' },
      { symbol: 'L', description: 'Active core length of radioactive seed encapsulation', units: 'cm' },
      { symbol: 'V_{100}', description: 'Percentage of target organ volume receiving ≥100% of prescribed dose', units: '%' },
      { symbol: 'D_{90}', description: 'Minimum dose delivered to 90% of the target organ volume', units: 'Gy' },
      { symbol: 'V_{150}', description: 'Target volume receiving ≥150% prescribed dose (hotspot necrosis risk)', units: '%' }
    ],
    assumptions: [
      'Cylindrical symmetry along the seed encapsulation longitudinal axis.',
      'Liquid water phantom medium with reference distance r₀ = 1.0 cm and reference polar angle θ₀ = 90°.',
      'Inter-seed shielding and tissue composition heterogeneity corrections are neglected under standard TG-43 protocol.'
    ],
    benchmarks: 'Gold-standard consensus datasets published in Medical Physics Vol. 31 (2004) and Vol. 41 (2014) for I-125 (model 6711), Pd-103 (model 200), Cs-131, and Ir-192.'
  },

  // 24. Module 24: Tactical CBRN First Responder & Hazard Command
  {
    id: 'M24-FirstResponder',
    moduleId: 'Module 24',
    moduleName: 'Tactical CBRN First Responder & Hazard Command',
    domain: 'Environmental Dispersion & Response',
    title: 'CBRN Incident Command, ERG 2024 Exclusion Zones, EPA PAG Stay-Times & Decorporation Protocols',
    overview: 'Provides operational decision matrices and dosimetric limits for radiological emergency response personnel, hazmat incident commanders, and first responders under DOT ERG 2024 (Guide 163), EPA Protective Action Guides (PAG 2017), REAC/TS medical countermeasure regimens, and OSHA 29 CFR 1910.120 HAZWOPER.',
    standards: [
      { org: 'US DOT / PHMSA', code: 'ERG 2024 Guide 163', year: '2024', title: 'Emergency Response Guidebook: Radioactive Materials (Low to High Level Radiation)' },
      { org: 'US EPA', code: 'EPA-400/R-17/001', year: '2017', title: 'PAG Manual: Protective Action Guides and Planning Guidance for Radiological Incidents' },
      { org: 'REAC/TS', code: 'Medical Management 4th Ed.', year: '2021', title: 'The Medical Basis for Radiation-Accident Preparedness & Internal Contamination' },
      { org: 'US OSHA', code: '29 CFR 1910.120', year: '2022', title: 'Hazardous Waste Operations and Emergency Response (HAZWOPER)' }
    ],
    primaryFormula: 't_{\\text{stay}} = \\frac{D_{\\text{cap}} - (2 \\cdot t_{\\text{transit}} \\cdot \\dot{D}_{\\text{transit}})}{\\dot{D}_{\\text{hotzone}}}',
    secondaryFormulas: [
      { label: 'Tactical Turn-Around Dose Ceiling (50% Guideline)', formula: 'D_{\\text{turn}} = 0.50 \\times D_{\\text{cap}} \\quad [\\text{Mandatory egress initiated when dose reaches half of limit}]' },
      { label: 'ERG Initial Cordon Distance Isolation Rule', formula: 'R_{\\text{iso}} = \\begin{cases} 100 \\text{ m (330 ft)} & \\text{Spill, leak, or suspected package} \\\\ 300 \\text{ m (1000 ft)} & \\text{Fire, explosion, or tank car breach} \\end{cases}' },
      { label: 'Thyroid Iodine-131 Potassium Iodide (KI) Blocking Efficacy', formula: 'E_{\\text{block}}(t) = 1.0 - \\frac{1}{1 + e^{-\\kappa (t_{\\text{admin}} - t_{\\text{uptake}})}} \\implies E \\approx 99\\% \\text{ if } t \\le -2\\text{h}; \\, 50\\% \\text{ at } +4\\text{h}' },
      { label: 'Prussian Blue Insoluble Chelation Excretion Factor', formula: 'T_{1/2, \\text{eff}}(\\text{Cs-137}) = \\frac{T_{\\text{biol}} \\cdot T_{\\text{rad}}}{T_{\\text{biol}} + T_{\\text{rad}}} \\implies T_{\\text{biol}} \\text{ reduced from 110 d to } \\sim 38 \\text{ d}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Worker Dose Accumulation & Transit Field Ingress',
        explanation: 'The total occupational dose accumulated during an emergency intervention mission is the sum of entry transit dose, hot zone work dose, and extraction transit dose:',
        math: 'D_{\\text{total}} = D_{\\text{ingress}} + D_{\\text{hotzone}} + D_{\\text{egress}} \\le D_{\\text{cap}}'
      },
      {
        stepTitle: '2. Critical Stay-Time Formula Inversion',
        explanation: 'Assuming symmetric entry and exit pathways through perimeter fringe radiation fields (D_transit = t_transit * Ddot_transit), the allowable dwell time in the high-dose hotzone is rigorously inverted:',
        math: 't_{\\text{stay}} \\cdot \\dot{D}_{\\text{hotzone}} + 2 t_{\\text{transit}} \\dot{D}_{\\text{transit}} \\le D_{\\text{cap}} \\implies t_{\\text{stay}} = \\frac{D_{\\text{cap}} - 2 t_{\\text{transit}} \\dot{D}_{\\text{transit}}}{\\dot{D}_{\\text{hotzone}}}'
      },
      {
        stepTitle: '3. EPA PAG Multi-Tier Action Guideline Boundaries',
        explanation: 'EPA PAG-2017 establishes three statutory action levels for emergency workers: Tier 1 (protecting valuable property: 50 mSv / 5 rem), Tier 2 (lifesaving / protecting large populations: 100 mSv / 10 rem), and Tier 3 (lifesaving / extreme catastrophe: 250 mSv / 25 rem on a voluntary, informed basis):',
        math: 'D_{\\text{cap}} \\in \\{50 \\text{ mSv}, \\, 100 \\text{ mSv}, \\, 250 \\text{ mSv}\\}'
      },
      {
        stepTitle: '4. Medical Countermeasure Decorporation Kinetics',
        explanation: 'Internal contamination requires rapid administration of isotope-specific decorporation agents: KI (130 mg adult) blocks thyroid radioiodine uptake via competitive Wolff-Chaikoff saturation; Prussian Blue (insoluble ferric hexacyanoferrate, 3 g/day) exchanges Cs+/Tl+ ions in the gut lumen, interrupting enterohepatic circulation; Ca/Zn-DTPA binds actinides (Pu, Am, Cm) into octadentate chelate complexes rapidly cleared by renal excretion:',
        math: '\\frac{dC_{\\text{plasma}}}{dt} = -(\\lambda_{\\text{biol}} + \\lambda_{\\text{rad}} + k_{\\text{chelate}} [\\text{DTPA}]) C_{\\text{plasma}}'
      }
    ],
    variables: [
      { symbol: 't_{\\text{stay}}', description: 'Maximum allowable dwell duration inside high-dose hotzone', units: 'hours (or minutes)' },
      { symbol: 'D_{\\text{cap}}', description: 'Statutory Protective Action Guide emergency worker cumulative dose ceiling', units: 'mSv (or rem)' },
      { symbol: '\\dot{D}_{\\text{hotzone}}', description: 'Measured ambient dose equivalent rate at the tactical work position', units: 'mSv·h⁻¹ (or rem·h⁻¹)' },
      { symbol: 't_{\\text{transit}}', description: 'One-way transit travel duration across perimeter transition zone', units: 'hours (or minutes)' },
      { symbol: '\\dot{D}_{\\text{transit}}', description: 'Average ambient dose rate encountered during entry/exit transit', units: 'mSv·h⁻¹ (or rem·h⁻¹)' },
      { symbol: 'R_{\\text{iso}}', description: 'ERG emergency tactical initial isolation cordon radius', units: 'm' },
      { symbol: 'T_{1/2, \\text{eff}}', description: 'Effective clearance half-life of internal decorporated contaminant', units: 'days' }
    ],
    assumptions: [
      'Hazard zone dose rate fields remain quasistatic over the mission operational duration.',
      'Emergency personnel operate with full SCBA and Level A/B PPE preventing inhalation of particulate aerosol.',
      'Transit dose is accumulated symmetrically along the ingress and egress vectors.'
    ],
    benchmarks: 'Validated against US DOT ERG 2024 Table of Initial Isolation Distances, EPA PAG-2017 Table 2-1 emergency worker guidelines, REAC/TS casualty algorithms, and VTEST-24.'
  },

  // 25. Module 16B: X-Ray Image Distortion, Magnification & Geometric Penumbra
  {
    id: 'M16B-Distortion',
    moduleId: 'Module 16B',
    moduleName: 'X-Ray Image Distortion & Geometric Penumbra',
    domain: 'Non-Ionizing EMR & Lasers',
    title: 'Projection Radiography Geometry, Magnification, Geometric Unsharpness & Angle Distortion',
    overview: 'Calculates projective beam geometry, dimensional magnification factors, geometric unsharpness (penumbra) relative to focal spot dimensions, and non-parallel projection distortion (foreshortening vs elongation) under ASME BPVC Section V Article 2 Table T-274.1, ISO 17636-1:2022, and Cieszynski bisecting angle rules.',
    standards: [
      { org: 'ASME', code: 'BPVC Section V Article 2', year: '2023', title: 'Nondestructive Examination: Radiographic Examination (Table T-274.1 Geometric Unsharpness Limits)' },
      { org: 'ISO', code: 'ISO 17636-1:2022', year: '2022', title: 'Non-destructive testing of welds - Radiographic testing - Part 1: X- and gamma-ray techniques with film' },
      { org: 'AAPM', code: 'Report No. 74', year: '2002', title: 'Quality Control in Diagnostic Radiology: Geometric Accuracy and Focal Spot Performance' },
      { org: 'ASTM', code: 'ASTM E1000-16', year: '2016', title: 'Standard Guide for Radioscopy' }
    ],
    primaryFormula: 'U_g = F_s \\cdot \\frac{\\text{OID}}{\\text{SOD}} = F_s \\cdot \\frac{\\text{OID}}{\\text{SID} - \\text{OID}} = F_s \\cdot (M - 1)',
    secondaryFormulas: [
      { label: 'Linear Magnification Factor (M)', formula: 'M = \\frac{\\text{SID}}{\\text{SOD}} = \\frac{\\text{SID}}{\\text{SID} - \\text{OID}} = \\frac{L_{\\text{image}}}{L_{\\text{object}}}' },
      { label: 'Depth Frustum Slice Magnification & Spatial Divergence', formula: 'M(z) = \\frac{\\text{SID}}{\\text{SID} - z}, \\quad z \\in [0, \\, \\text{Object Thickness}]' },
      { label: 'Oblique Beam Projection & Tilt Distortion (Cieszynski Bisecting Rule)', formula: 'L_{\\text{proj}} = L_{\\text{true}} \\cdot M \\cdot \\frac{\\cos(\\theta_{\\text{object}})}{\\cos(\\theta_{\\text{beam}})} \\implies \\begin{cases} \\text{Foreshortening}: & \\theta_{\\text{object}} > 0, \\theta_{\\text{beam}} = 0 \\\\ \\text{Elongation}: & \\theta_{\\text{beam}} > 0, \\theta_{\\text{object}} = 0 \\end{cases}' },
      { label: 'ASME BPVC Section V Table T-274.1 Maximum Ug Threshold', formula: 'U_{g, \\text{max}} = \\begin{cases} 0.51 \\text{ mm (0.020 in)} & t \\le 50.8 \\text{ mm} \\\\ 0.76 \\text{ mm (0.030 in)} & 50.8 < t \\le 76.2 \\text{ mm} \\\\ 1.02 \\text{ mm (0.040 in)} & 76.2 < t \\le 101.6 \\text{ mm} \\\\ 1.78 \\text{ mm (0.070 in)} & t > 101.6 \\text{ mm} \\end{cases}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Similar Triangles Geometric Optics Formulation',
        explanation: 'Let an X-ray focal spot of finite physical width F_s reside at z = 0, an absorbing feature edge reside at z = SOD, and the imaging detector plate reside at z = SID. From similar triangles formed by rays grazing opposing focal spot edges:',
        math: '\\frac{U_g}{\\text{OID}} = \\frac{F_s}{\\text{SOD}} \\implies U_g = F_s \\cdot \\frac{\\text{OID}}{\\text{SOD}}'
      },
      {
        stepTitle: '2. Source-to-Object Distance Substitution',
        explanation: 'By Euclidean axial geometry, SID = SOD + OID. Substituting SOD = SID - OID expresses geometric unsharpness as a function of external setup parameters:',
        math: 'U_g = F_s \\cdot \\frac{\\text{OID}}{\\text{SID} - \\text{OID}}'
      },
      {
        stepTitle: '3. Magnification and Penumbra Equivalence',
        explanation: 'The linear image magnification factor is defined as M = SID / SOD. Expressing (M - 1) in terms of OID:',
        math: 'M - 1 = \\frac{\\text{SID}}{\\text{SOD}} - 1 = \\frac{\\text{SID} - \\text{SOD}}{\\text{SOD}} = \\frac{\\text{OID}}{\\text{SOD}} \\implies U_g = F_s \\cdot (M - 1)'
      },
      {
        stepTitle: '4. Non-Parallel Angle Distortion & Cieszynski Bisecting Rule',
        explanation: 'When an anatomical or structural object is inclined at angle theta_object relative to the detector and the central beam is directed at angle theta_beam, projection follows Cieszynski\'s bisecting law. If the central ray is perpendicular to the detector but the object is tilted, the projected dimension shrinks: L_proj = L * cos(theta_obj) * M, causing foreshortening. When the ray is inclined but the object lies parallel, the projected shadow stretches: L_proj = L * M / cos(theta_beam), causing elongation:',
        math: '\\text{Distortion Ratio} = \\frac{L_{\\text{proj}}}{L_{\\text{object}} \\cdot M} = \\frac{\\cos(\\theta_{\\text{object}})}{\\cos(\\theta_{\\text{beam}})}'
      }
    ],
    variables: [
      { symbol: '\\text{SID}', description: 'Source-to-Image Distance (focal spot to image detector)', units: 'mm (or cm, in)' },
      { symbol: '\\text{OID}', description: 'Object-to-Image Distance (object plane to image detector)', units: 'mm (or cm, in)' },
      { symbol: '\\text{SOD}', description: 'Source-to-Object Distance (SID - OID)', units: 'mm (or cm, in)' },
      { symbol: 'F_s', description: 'Nominal focal spot size (IEC 60336 standard)', units: 'mm' },
      { symbol: 'U_g', description: 'Geometric unsharpness (penumbral blur width on detector)', units: 'mm' },
      { symbol: 'M', description: 'Linear optical magnification factor', units: 'dimensionless (≥ 1.0)' },
      { symbol: 'L_{\\text{image}}', description: 'Projected dimension of feature on image detector', units: 'mm' },
      { symbol: 'L_{\\text{object}}', description: 'True physical dimension of feature', units: 'mm' },
      { symbol: '\\theta_{\\text{object}}', description: 'Tilt angle of object plane relative to detector plane', units: 'degrees' }
    ],
    assumptions: [
      'Rectilinear ray propagation from a planar focal spot emission profile.',
      'Planar imaging detector perpendicular to central optical axis (unless tilt angle specified).',
      'Homogeneous magnification across differential depth planes.'
    ],
    benchmarks: 'Validated against ASME BPVC Section V Table T-274.1 unsharpness limits, ISO 17636-1 Class A/B weld radiographic criteria, and VTEST-27.'
  },

  // 26. Engine: Monte Carlo Stochastic Photon Transport
  {
    id: 'MC-Transport',
    moduleId: 'Engine: Monte Carlo',
    moduleName: 'Stochastic Photon Transport Micro-Kernel',
    domain: 'Dose, Transport & Shielding',
    title: 'Monte Carlo Particle Tracking, Klein-Nishina Scattering & Exponential Transformation',
    overview: 'High-performance deterministic/stochastic Monte Carlo micro-kernel simulating individual photon histories: photoelectric absorption, Klein-Nishina incoherent Compton scattering via Kahn rejection sampling, electron-positron pair production, and energy buildup calculation across heterogeneous multi-layer media.',
    standards: [
      { org: 'NIST', code: 'NBSIR 87-3597', year: '1987', title: 'XCOM: Photon Cross Sections Database for Elements and Mixtures' },
      { org: 'LANL', code: 'LA-UR-03-1987', year: '2003', title: 'MCNP - A General Monte Carlo N-Particle Transport Code, Version 5' },
      { org: 'ICRU', code: 'Report 90', year: '2016', title: 'Key Data for Ionizing-Radiation Dosimetry: Measurement Standards and Applications' },
      { org: 'Kahn, H.', code: 'Rand Corporation RM-1237', year: '1954', title: 'Applications of Monte Carlo: Rejection Sampling Algorithms' }
    ],
    primaryFormula: '\\frac{d\\sigma_{\\text{KN}}}{d\\Omega} = \\frac{r_e^2}{2} P(E, \\theta)^2 \\left[ P(E, \\theta) + P(E, \\theta)^{-1} - \\sin^2\\theta \\right], \\quad P(E, \\theta) = \\frac{1}{1 + \\alpha (1 - \\cos\\theta)}',
    secondaryFormulas: [
      { label: 'Stochastic Free-Flight Path Length Sampling', formula: 's = -\\frac{\\ln(\\xi)}{\\Sigma_t(E)} = -\\frac{\\ln(\\xi)}{\\rho \\sum_i w_i (\\mu/\\rho)_i(E)}' },
      { label: 'Kahn Incoherent Scattering Rejection Sampling Kernel', formula: '\\eta = \\frac{1 + 2\\alpha}{1 + 2\\alpha + \\alpha(1+2\\alpha)}, \\quad \\text{accept } \\cos\\theta \\text{ if } \\xi_3 \\le \\frac{1}{2}\\left(1 + \\cos^2\\theta\\right)' },
      { label: 'Monte Carlo Dose Buildup Factor B', formula: 'B = \\frac{\\sum_{h=1}^N w_h \\cdot \\Delta E_{\\text{total}, h}}{\\sum_{h=1}^N w_h \\cdot \\Delta E_{\\text{uncollided}, h}} = 1 + \\frac{D_{\\text{scattered}}}{D_{\\text{primary}}}' },
      { label: 'Batch Variance & Relative Error (RE)', formula: 's_{\\bar{x}} = \\sqrt{\\frac{1}{N(N-1)} \\sum_{i=1}^N (x_i - \\bar{x})^2}, \\quad \\text{RE} = \\frac{s_{\\bar{x}}}{\\bar{x}} < 0.05 \\text{ (FOM Convergence)}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Exponential Survival Probability & Flight Path Sampling',
        explanation: 'The probability of a photon traversing distance s in a homogeneous medium without collision is P(s) = exp(-Sigma_t * s). By the inverse transform method using pseudo-random deviat xi in (0, 1]:',
        math: '\\xi = \\int_s^\\infty \\Sigma_t e^{-\\Sigma_t s^{\\prime}} ds^{\\prime} = e^{-\\Sigma_t s} \\implies s = -\\frac{\\ln(\\xi)}{\\Sigma_t}'
      },
      {
        stepTitle: '2. Interaction Channel Selection',
        explanation: 'At collision point (x, y, z), the macroscopic cross sections are decomposed into Sigma_t = Sigma_pe + Sigma_compton + Sigma_pair. A uniform random number xi_2 decides interaction type via cumulative branching ratios:',
        math: 'P_{\\text{pe}} = \\frac{\\Sigma_{\\text{pe}}}{\\Sigma_t}, \\quad P_{\\text{comp}} = \\frac{\\Sigma_{\\text{comp}}}{\\Sigma_t}, \\quad P_{\\text{pair}} = \\frac{\\Sigma_{\\text{pair}}}{\\Sigma_t}'
      },
      {
        stepTitle: '3. Kahn Klein-Nishina Polar Angle Sampling',
        explanation: 'To sample Compton scattering angle theta without numerical inversion of the transcendental Klein-Nishina integral, Kahn\'s algorithm samples candidate energy ratio eta and accepts candidate cos(theta) = 1 - (1/eta - 1)/alpha with probability g(cos theta) = 0.5 * (1 + cos^2 theta):',
        math: 'g(\\cos\\theta) = \\frac{1 + \\cos^2\\theta}{2} \\ge \\xi_3 \\implies \\text{Accept polar deflection } \\theta'
      },
      {
        stepTitle: '4. Tallying and Statistical Figure-of-Merit (FOM)',
        explanation: 'Dose deposition tallies are accumulated across volumetric voxel grids. The precision of the Monte Carlo estimate is governed by the Central Limit Theorem and evaluated via the Figure of Merit:',
        math: '\\text{FOM} = \\frac{1}{\\text{RE}^2 \\cdot T_{\\text{CPU}}} = \\text{constant}'
      }
    ],
    variables: [
      { symbol: '\\frac{d\\sigma_{\\text{KN}}}{d\\Omega}', description: 'Differential Klein-Nishina scattering cross section per electron', units: 'cm²·sr⁻¹' },
      { symbol: 'r_e', description: 'Classical electron radius (2.81794 × 10⁻¹³ cm)', units: 'cm' },
      { symbol: '\\alpha', description: 'Incident photon energy in electron rest-mass equivalents (E / 0.511 MeV)', units: 'dimensionless' },
      { symbol: 's', description: 'Sampled linear distance to next interaction point', units: 'cm' },
      { symbol: '\\Sigma_t', description: 'Total macroscopic linear attenuation coefficient', units: 'cm⁻¹' },
      { symbol: 'B', description: 'Dose buildup factor accounting for multiple scattered photons', units: 'dimensionless (≥ 1.0)' },
      { symbol: '\\text{RE}', description: 'Relative statistical error of the Monte Carlo tally', units: 'dimensionless' }
    ],
    assumptions: [
      'Unpolarized incident photon beam.',
      'Target atomic electrons are free and stationary (Klein-Nishina impulse approximation).',
      'Bremsstrahlung losses from secondary electrons are deposited locally (kerma approximation).'
    ],
    benchmarks: 'Validated against LANL MCNP5 standard photon benchmark problems, ANSI/ANS-6.4.3 buildup factor datasets, and VTEST-25.'
  },

  // 27. Engine: Hardware Metrology & Live Pulse Counting
  {
    id: 'HW-Metrology',
    moduleId: 'Engine: Metrology',
    moduleName: 'Hardware Metrology & Live Pulse Counting',
    domain: 'Spectroscopy & Radiation Detection',
    title: 'Radiation Detector Metrology: Dead-Time Models, Currie Detection Limits & Serial/Audio Ingestion',
    overview: 'Implements real-time physical hardware acquisition protocols (WebSerial API, Audio WebAudio pulse-counting buffer) alongside rigorous ISO 11929 / Currie metrological corrections for paralyzable/non-paralyzable dead-time, Poisson counting uncertainty, and Minimum Detectable Activity (MDA).',
    standards: [
      { org: 'ISO', code: 'ISO 11929-1:2019', year: '2019', title: 'Determination of characteristic limits for ionizing radiation measurements - Part 1: Counting measurements' },
      { org: 'Currie, L. A.', code: 'Anal. Chem. 40(3)', year: '1968', title: 'Limits for Qualitative Detection and Quantitative Determination' },
      { org: 'IEC', code: 'IEC 60325:2002', year: '2002', title: 'Radiation protection instrumentation - Alpha, beta and alpha/beta surface contamination meters' },
      { org: 'NIST', code: 'SP 250-90', year: '2018', title: 'NIST Calibration Services for Radiation Protection Instrumentation' }
    ],
    primaryFormula: 'n = \\frac{m}{1 - m \\cdot \\tau} \\quad [\\text{Non-Paralyzable}] \\quad \\text{vs} \\quad m = n \\cdot e^{-n \\cdot \\tau} \\quad [\\text{Paralyzable}]',
    secondaryFormulas: [
      { label: 'Currie Critical Decision Level Lc (Type I Error Alpha = 0.05)', formula: 'L_c = k_{1-\\alpha} \\sigma_0 = 1.645 \\sqrt{R_b \\cdot t_s \\left(1 + \\frac{t_s}{t_b}\\right)} \\xrightarrow{t_s = t_b} 2.33 \\sqrt{B}' },
      { label: 'Currie Minimum Detectable Activity Limit Ld (Type I & II Beta = 0.05)', formula: 'L_d = 2.71 + 3.29 \\sqrt{R_b \\cdot t_s \\left(1 + \\frac{t_s}{t_b}\\right)} \\xrightarrow{t_s = t_b} 2.71 + 4.65 \\sqrt{B}' },
      { label: 'Minimum Detectable Activity (MDA) in Becquerels', formula: '\\text{MDA} = \\frac{L_d}{\\epsilon \\cdot Y_\\gamma \\cdot t_s \\cdot F_{\\text{geom}}} \\quad [\\text{Bq}]' },
      { label: 'Two-Source Dead-Time Measurement Form Factor', formula: '\\tau = \\frac{R_1 + R_2 - R_{12} - R_b}{(R_{12} - R_b)^2 - (R_1 - R_b)^2 - (R_2 - R_b)^2}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Non-Paralyzable Dead Time Derivation',
        explanation: 'In a non-paralyzable counter, each registered count incapacitates the channel for duration tau. During total time T, the dead interval is m * T * tau, leaving live-time T_live = T * (1 - m * tau). True rate n is therefore:',
        math: 'n = \\frac{m T}{T_{\\text{live}}} = \\frac{m T}{T(1 - m \\tau)} = \\frac{m}{1 - m \\tau}'
      },
      {
        stepTitle: '2. Paralyzable Dead Time Formulation',
        explanation: 'In a paralyzable counter, every interaction extends the dead period by tau whether recorded or lost. The probability of an interval tau containing 0 Poisson arrivals from process of rate n is exp(-n * tau):',
        math: 'm = n \\cdot P(0; n \\tau) = n \\cdot e^{-n \\tau}'
      },
      {
        stepTitle: '3. Currie Critical Decision Level Lc Derivation',
        explanation: 'Under null hypothesis H0 (true sample net activity = 0), net count S = N_s - N_b * (t_s / t_b) has variance sigma_0^2 = B * (1 + t_s/t_b). For equal count times t_s = t_b, sigma_0 = sqrt(2*B). Setting alpha = 0.05 (k = 1.645):',
        math: 'L_c = 1.645 \\sigma_0 = 1.645 \\sqrt{2 B} = 2.326 \\sqrt{B} \\approx 2.33 \\sqrt{B}'
      },
      {
        stepTitle: '4. Minimum Detectable Activity Limit Ld Derivation',
        explanation: 'To limit Type II false negative risk to beta = 0.05, the true net count L_d must exceed L_c by 1.645 * sigma_Ld. Solving L_d - 1.645 * sqrt(sigma_0^2 + L_d) = L_c analytically:',
        math: 'L_d = (1.645)^2 + 2 L_c = 2.706 + 4.653 \\sqrt{B} \\approx 2.71 + 4.65 \\sqrt{B}'
      }
    ],
    variables: [
      { symbol: 'n', description: 'True physical event interaction rate inside detector volume', units: 's⁻¹ (cps) or cpm' },
      { symbol: 'm', description: 'Recorded count rate subject to instrument dead-time losses', units: 's⁻¹ (cps) or cpm' },
      { symbol: '\\tau', description: 'Detector electronic resolving dead-time parameter', units: 'µs or s' },
      { symbol: 'L_c', description: 'Critical decision level net counts threshold (alpha = 0.05)', units: 'counts' },
      { symbol: 'L_d', description: 'Minimum detectable net counts limit (alpha = beta = 0.05)', units: 'counts' },
      { symbol: 'B', description: 'Total accumulated background counts during counting duration', units: 'counts' },
      { symbol: '\\epsilon', description: 'Absolute detector counting efficiency', units: 'dimensionless' },
      { symbol: 't_s, t_b', description: 'Sample and background acquisition durations', units: 's' }
    ],
    assumptions: [
      'Counting pulses follow a stationary Poisson process.',
      'Background radiation intensity remains constant across calibration and measurement cycles.',
      'Dead-time resolving constant tau is rate-independent over the active counting regime.'
    ],
    benchmarks: 'Validated against ISO 11929-1:2019 standard worked examples, Currie 1968 classic benchmarks, and VTEST-26.'
  },

  // 28. Engine: Multi-Jurisdictional Regulatory Frameworks Engine
  {
    id: 'REG-Global',
    moduleId: 'Engine: Regulatory',
    moduleName: 'Multi-Jurisdictional Regulatory Frameworks Engine',
    domain: 'Regulatory Standards & Transport Security',
    title: 'Harmonized Multi-Jurisdiction Regulatory Dose Limits, Cumulative Constraints & ALARA Compliance',
    overview: 'Provides algorithmic multi-regime statutory compliance engines cross-referencing US NRC (10 CFR 20), IAEA GSR Part 3, European EURATOM 2013/59 / UK IRR17, NATO STANAG 2470 / AMedP-7.1, and Canadian CNSC SOR/2000-203 dose constraints for occupational, public, emergency worker, and prenatal personnel.',
    standards: [
      { org: 'US NRC', code: '10 CFR Part 20 Subpart C', year: '2023', title: 'Occupational Dose Limits (§ 20.1201) and Public Dose Limits (§ 20.1301)' },
      { org: 'IAEA', code: 'GSR Part 3', year: '2014', title: 'Radiation Protection and Safety of Radiation Sources: International Basic Safety Standards' },
      { org: 'EURATOM', code: 'Directive 2013/59/Euratom', year: '2013', title: 'Basic Safety Standards for Protection Against Dangers from Ionizing Radiation' },
      { org: 'NATO', code: 'STANAG 2470 / AMedP-7.1', year: '2019', title: 'Commander\'s Guide on Radiation Protection in Military Operations' },
      { org: 'CNSC', code: 'SOR/2000-203', year: '2020', title: 'Radiation Protection Regulations (Canadian Nuclear Safety Commission)' }
    ],
    primaryFormula: '\\text{TEDE} = \\text{DDE} + \\text{CEDE} = \\int_0^T \\dot{H}^*(10) dt + \\sum_j e_{50, j} \\cdot I_j \\le L_{\\text{regime}}',
    secondaryFormulas: [
      { label: 'Lens of the Eye Dose Equivalent (LDE) Discrepancy Matrix', formula: 'L_{\\text{eye}} = \\begin{cases} 150 \\text{ mSv/yr} & \\text{US NRC 10 CFR 20.1201 (Traditional)} \\\\ 20 \\text{ mSv/yr} & \\text{IAEA GSR-3 / EURATOM 2013/59 / CNSC (ICRP 118 Cat. Threshold)} \\end{cases}' },
      { label: 'Public Dose Limit (Excluding Natural Background & Medical)', formula: 'E_{\\text{public}} \\le 1.0 \\text{ mSv/yr (100 mrem/yr)} \\quad [\\text{Continuous dose rate } < 0.02 \\text{ mSv/h in unrestricted area}]' },
      { label: 'Embryo/Fetus Prenatal Dose Limit (Declared Pregnant Worker)', formula: 'H_{\\text{fetus}} \\le 5.0 \\text{ mSv (US NRC 10 CFR 20.1208)} \\quad [\\le 0.5 \\text{ mSv/month}] \\quad \\text{vs} \\quad 1.0 \\text{ mSv (EURATOM)}' },
      { label: 'NATO STANAG 2470 Tactical Operational Exposure Guidance (OEG)', formula: '\\text{OEG-1 (Risk 1)} = 0.05 \\text{ Gy}; \\quad \\text{OEG-2 (Risk 2)} = 0.25 \\text{ Gy}; \\quad \\text{OEG-3 (Risk 3)} = 0.70 \\text{ Gy}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Total Effective Dose Equivalent (TEDE) Integration',
        explanation: 'TEDE integrates external penetrating photon/neutron exposure (Deep Dose Equivalent, DDE at 10 mm depth) and internal committed dose (Committed Effective Dose Equivalent, CEDE over 50 years):',
        math: '\\text{TEDE} = \\text{DDE} + \\text{CEDE} = H_p(10) + \\sum_j e_{50, j} \\cdot I_j'
      },
      {
        stepTitle: '2. Multi-Jurisdictional Annual Averaging Protocols',
        explanation: 'US NRC enforces a fixed single-year limit of 50 mSv (5 rem), whereas IAEA GSR Part 3, EURATOM, and CNSC enforce 20 mSv/yr averaged over 5 consecutive calendar years (100 mSv in 5 years), with no single year exceeding 50 mSv:',
        math: '\\bar{E}_{5\\text{yr}} = \\frac{1}{5} \\sum_{y=1}^5 E_y \\le 20 \\text{ mSv/yr} \\quad \\text{and} \\quad E_y \\le 50 \\text{ mSv in any single year}'
      },
      {
        stepTitle: '3. Lens of the Eye Cataractogenesis Threshold Evolution',
        explanation: 'Epidemiological studies of radiation-induced posterior subcapsular cataracts demonstrated lower thresholds without clear latency, prompting ICRP Publication 118 to reduce the occupational eye lens limit from 150 mSv/yr to 20 mSv/yr. This lower limit has been codified across EURATOM, IAEA, and Canada, while US NRC 10 CFR 20 retains 150 mSv/yr:',
        math: 'L_{\\text{eye, EURATOM}} = 20 \\text{ mSv/yr} \\quad \\text{vs} \\quad L_{\\text{eye, US NRC}} = 150 \\text{ mSv/yr}'
      },
      {
        stepTitle: '4. Military Tactical Radiation Exposure Guidelines',
        explanation: 'In combat and tactical environments governed by NATO STANAG 2470 / AMedP-7.1, civilian limits are superseded by Operational Exposure Guidance (OEG) classes designed to prevent acute performance degradation:',
        math: '\\text{OEG-1 (0.05 Gy)} \\to \\text{OEG-2 (0.25 Gy)} \\to \\text{OEG-3 (0.70 Gy ARS Onset)}'
      }
    ],
    variables: [
      { symbol: '\\text{TEDE}', description: 'Total Effective Dose Equivalent combining external DDE and internal CEDE', units: 'mSv (or rem)' },
      { symbol: '\\text{DDE}', description: 'Deep Dose Equivalent measured at tissue depth of 10 mm (Hp(10))', units: 'mSv (or rem)' },
      { symbol: '\\text{CEDE}', description: 'Committed Effective Dose Equivalent from internalized radionuclides over 50 years', units: 'mSv (or rem)' },
      { symbol: 'L_{\\text{regime}}', description: 'Statutory occupational dose ceiling in the specified jurisdiction', units: 'mSv·yr⁻¹' },
      { symbol: 'L_{\\text{eye}}', description: 'Annual equivalent dose ceiling to the lens of the eye', units: 'mSv·yr⁻¹' },
      { symbol: 'e_{50, j}', description: '50-year committed effective dose coefficient per unit intake of nuclide j', units: 'Sv·Bq⁻¹' }
    ],
    assumptions: [
      'Monitored workers are non-pregnant adults aged ≥ 18 years under active dosimetric supervision.',
      'Background terrestrial and cosmic radiation is excluded from statutory occupational registers.',
      'Committed doses are evaluated over standard 50-year post-intake clearance commitment.'
    ],
    benchmarks: 'Validated against statutory requirements in 10 CFR 20, IAEA GSR Part 3 Schedule III, EURATOM 2013/59 Annex VII, CNSC SOR/2000-203, and NATO STANAG 2470.'
  },

  // 29. Engine: Incident Scenario Drills & 21 CFR Part 11 Audit Engine
  {
    id: 'SCEN-Audit',
    moduleId: 'Engine: Compliance',
    moduleName: 'Incident Scenario Drills & Cryptographic Audit Engine',
    domain: 'Regulatory Standards & Transport Security',
    title: 'IAEA INES Scale Incident Modeling, .radcase Drill Simulations & 21 CFR Part 11 Tamper-Evident SHA-256 Ledgers',
    overview: 'Provides realistic radiation emergency scenario drill engines parameterized by IAEA International Nuclear and Radiological Event Scale (INES Level 1-7) severity ratings, exportable .radcase incident bundles, and tamper-evident cryptographic audit trailing conforming to FDA 21 CFR Part 11 and ISO/IEC 17025:2017.',
    standards: [
      { org: 'IAEA / OECD-NEA', code: 'INES User\'s Manual', year: '2008', title: 'The International Nuclear and Radiological Event Scale User\'s Manual' },
      { org: 'US FDA', code: '21 CFR Part 11', year: '2003', title: 'Electronic Records; Electronic Signatures (Scope and Application Guidance)' },
      { org: 'ISO / IEC', code: 'ISO/IEC 17025:2017', year: '2017', title: 'General requirements for the competence of testing and calibration laboratories (§ 7.11 Data Control)' },
      { org: 'NIST', code: 'FIPS PUB 180-4', year: '2015', title: 'Secure Hash Standard (SHS): SHA-256 Cryptographic Hash Algorithm' }
    ],
    primaryFormula: 'H_k = \\text{SHA-256}\\Big( H_{k-1} \\,\\|\\, t_k \\,\\|\\, \\text{UserID}_k \\,\\|\\, \\text{Action}_k \\,\\|\\, \\Delta\\text{State}_k \\Big)',
    secondaryFormulas: [
      { label: 'IAEA INES Severity Rating Scale Logarithmic Function', formula: '\\text{INES Level} = \\min\\left( 7, \\, \\max\\left( 1, \\, \\left\\lfloor \\log_{10}\\left( \\frac{A_{\\text{rel}}(\\text{I-131 eq})}{A_{\\text{threshold}}} \\right) \\right\\rfloor + 3 \\right) \\right)' },
      { label: 'Radiological Equivalence to Iodine-131 (INES Inhalation Factor)', formula: 'A_{\\text{eq}}(\\text{I-131}) = \\sum_i A_i \\cdot f_{i, \\text{inhalation}}' },
      { label: 'Cryptographic Merkle Root Verification Hash', formula: 'H_{\\text{root}} = \\text{SHA-256}\\Big( H_{\\text{left}} \\, \\| \\, H_{\\text{right}} \\Big)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. IAEA INES Scale Logarithmic Classification',
        explanation: 'The INES scale quantifies event significance from Level 1 (Anomaly) to Level 7 (Major Accident). On-site defense-in-depth degradation governs Levels 1-3, whereas environmental source term releases govern Levels 4-7 based on I-131 radiotoxicity equivalence:',
        math: '\\text{Level 4: } > \\text{tens of TBq} \\to \\text{Level 5: } > \\text{hundreds of TBq} \\to \\text{Level 7: } > \\text{tens of thousands of TBq}'
      },
      {
        stepTitle: '2. Radiotoxicity Normalization to Iodine-131',
        explanation: 'Different radionuclides possess widely varying radiotoxicity. INES normalizes all releases into I-131 equivalent activity using established inhalation weighting coefficients (Cs-137 factor = 40, Sr-90 factor = 20, Pu-239 alpha factor = 10,000):',
        math: 'A_{\\text{eq}}(\\text{I-131}) = A_{\\text{I-131}} + 40 \\cdot A_{\\text{Cs-137}} + 20 \\cdot A_{\\text{Sr-90}} + 10^4 \\cdot A_{\\text{Pu-239}}'
      },
      {
        stepTitle: '3. FDA 21 CFR Part 11 Cryptographic Audit Blockchain',
        explanation: 'To satisfy 21 CFR § 11.10(e) mandating secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions, each calculation event generates an immutable cryptographic block:',
        math: 'H_k = \\text{SHA-256}(H_{k-1} + t_k + \\text{user} + \\text{action} + \\text{hash}(\\text{payload}))'
      },
      {
        stepTitle: '4. Mathematical Proof of Tamper Evident Verification',
        explanation: 'If an adversary alters any historical ledger entry j < k, the resulting hash H_j\' differs from H_j with probability 1 - 2^(-256). Because block (j+1) incorporates H_j, every downstream hash invalidates, enabling instant verification:',
        math: 'H_j^{\\prime} \\ne H_j \\implies H_{j+1}^{\\prime} \\ne H_{j+1} \\implies H_k^{\\prime} \\ne H_k \\quad [\\text{Immediate Tamper Detection}]'
      }
    ],
    variables: [
      { symbol: 'H_k', description: 'Cryptographic SHA-256 hash digest of the k-th audit trail entry', units: '256-bit hexadecimal string' },
      { symbol: 'H_{k-1}', description: 'Hash digest of the immediately preceding audit record block (genesis = 0^64)', units: '256-bit hexadecimal string' },
      { symbol: 't_k', description: 'Monotonic UTC ISO-8601 calculation timestamp', units: 'string' },
      { symbol: '\\text{INES Level}', description: 'International Nuclear and Radiological Event Scale rating integer', units: '1 to 7' },
      { symbol: 'A_{\\text{rel}}', description: 'Total activity released into atmospheric boundary layer', units: 'TBq' },
      { symbol: 'f_{i, \\text{inhalation}}', description: 'Inhalation radiotoxicity weighting factor normalized to I-131', units: 'dimensionless' }
    ],
    assumptions: [
      'Audit log records are appended sequentially with monotonic UTC timestamps.',
      'Cryptographic collision resistance of SHA-256 (2^128 operations against birthday attack).',
      'INES severity evaluations assume unmitigated source term dispersion into the environment.'
    ],
    benchmarks: 'Validated against IAEA INES User\'s Manual historical benchmarks (Chernobyl Level 7, Fukushima Level 7, Three Mile Island Level 5, Goiania Level 5, Tokaimura Level 4) and FDA 21 CFR Part 11 guidelines.'
  },

  // 30. Module 25: CBRN Tactical Consequence, Fallout & Shelter Optimization
  {
    id: 'M25-CBRNConsequence',
    moduleId: 'Module 25',
    moduleName: 'CBRN Consequence, Fallout & Shelter Optimization',
    domain: 'Environmental Dispersion & Response',
    title: 'Way-Wigner Fission Product Decay, Expedient Shelter Protection Factors & Evacuation Timing Optimization',
    overview: 'Simulates nuclear detonation groundshine fallout fields, power-law radiological decay rates, expedient multi-layer building shielding attenuation, optimal shelter egress crossover timing, and cytogenetic biodosimetry under NCRP Report No. 165, FEMA Planning Guidance, and IAEA TRS-405.',
    standards: [
      { org: 'NCRP', code: 'Report No. 165', year: '2010', title: 'Responding to a Radiological or Nuclear Terrorism Incident: A Guide for Decision Makers' },
      { org: 'FEMA', code: 'Planning Guidance 2nd Ed.', year: '2022', title: 'Nuclear Detonation Planning Guidance: Response and Recovery' },
      { org: 'Glasstone & Dolan', code: 'Effects of Nuclear Weapons 3rd Ed.', year: '1977', title: 'Chapter IX: Residual Radiation and Fallout' },
      { org: 'IAEA', code: 'Technical Reports Series No. 405', year: '2001', title: 'Cytogenetic Analysis for Radiation Dose Assessment: A Manual' }
    ],
    primaryFormula: 'D(t_1, t_2) = \\frac{1}{\\text{PF}} \\int_{t_1}^{t_2} R_1 t^{-1.2} dt = \\frac{5 R_1}{\\text{PF}} \\left[ t_1^{-0.2} - t_2^{-0.2} \\right]',
    secondaryFormulas: [
      { label: 'Way-Wigner Fission Decay Empirical Power Law ("7-10 Rule")', formula: 'R(t) = R_1 \\cdot t^{-1.2} \\implies R(7t) \\approx 0.1 \\cdot R(t), \\quad R(49t) \\approx 0.01 \\cdot R(t)' },
      { label: 'Optimal Evacuation Departure Crossover Point', formula: 't_{\\text{depart}} = \\arg\\min_{t} \\left[ \\int_{t_{\\text{arr}}}^t \\frac{R(t^{\\prime})}{\\text{PF}_1} dt^{\\prime} + \\int_t^{t + \\Delta t} \\frac{R(t^{\\prime})}{\\text{PF}_{\\text{veh}}} dt^{\\prime} + \\int_{t + \\Delta t}^{T} \\frac{R(t^{\\prime})}{\\text{PF}_2} dt^{\\prime} \\right]' },
      { label: 'IAEA Dicentric Chromosome Assay Dose Quadratic Inversion', formula: 'Y = c + \\alpha D + \\beta D^2 \\implies D = \\frac{-\\alpha + \\sqrt{\\alpha^2 + 4\\beta(Y - c)}}{2\\beta}' },
      { label: 'Ten Berge Chemical Toxic Load Exponent (Infiltration)', formula: 'L = \\int_0^T C_{\\text{indoor}}(t)^n dt, \\quad \\frac{dC_{\\text{in}}}{dt} = \\text{ACH} \\cdot (C_{\\text{out}} - C_{\\text{in}})' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Way-Wigner Decay Integration',
        explanation: 'Fission product activity represents the composite sum of hundreds of decay chains. Frank and Metropolis (1947) and Way and Wigner (1948) demonstrated that statistical integration over multiple radioactive nuclides yields a power law decay t^(-1.2):',
        math: 'R(t) = R_1 \\cdot t^{-1.2} \\implies \\int_{t_1}^{t_2} t^{-1.2} dt = \\left[ \\frac{t^{-0.2}}{-0.2} \\right]_{t_1}^{t_2} = -5 \\left( t_2^{-0.2} - t_1^{-0.2} \\right) = 5 \\left( t_1^{-0.2} - t_2^{-0.2} \\right)'
      },
      {
        stepTitle: '2. Expedient Shelter Protection Factor (PF)',
        explanation: 'Protection Factor (PF) is defined as the ratio of unshielded exposure rate 1 meter above an infinite plane to the exposure rate at an interior detector point. For composite multilayer structures with areal mass density sigma:',
        math: '\\text{PF} = \\frac{\\dot{D}_{\\text{unshielded}}}{\\dot{D}_{\\text{shelter}}} \\approx \\prod_{i=1}^m 2^{\\frac{x_i}{\\text{HVL}_i}}'
      },
      {
        stepTitle: '3. Optimal Evacuation Timing Dilemma',
        explanation: 'Occupants in poor shelters face a trade-off: remaining accumulates steady in-shelter dose, while evacuating imposes a high transit dose. Minimizing total dose requires solving dD_total/dt_depart = 0, yielding the exact departure window.',
        math: '\\frac{dD_{\\text{total}}}{dt_{\\text{dep}}} = \\frac{R(t_{\\text{dep}})}{\\text{PF}_1} + \\frac{R(t_{\\text{dep}}+\\Delta t) - R(t_{\\text{dep}})}{\\text{PF}_{\\text{veh}}} - \\frac{R(t_{\\text{dep}}+\\Delta t)}{\\text{PF}_2} = 0'
      },
      {
        stepTitle: '4. Cytogenetic Dicentric Chromosome Inversion',
        explanation: 'Radiation induces double-strand DNA breaks that misrepair into dicentric ring chromosomes. The yield follows the linear-quadratic model Y = c + alpha*D + beta*D^2. Inverting this quadratic equation reconstructs absorbed dose with Poisson confidence bounds:',
        math: 'D = \\frac{-\\alpha + \\sqrt{\\alpha^2 + 4\\beta(Y - c)}}{2\\beta}'
      }
    ],
    variables: [
      { symbol: 'R_1', description: 'Reference exposure rate at t = 1.0 hour post-burst', units: 'R·h⁻¹ or Gy·h⁻¹' },
      { symbol: '\\text{PF}', description: 'Structural Protection Factor of the shelter', units: 'dimensionless (≥ 1.0)' },
      { symbol: 't_1, t_2', description: 'Beginning and ending integration time points post-detonation', units: 'hours' },
      { symbol: '\\text{ACH}', description: 'Air changes per hour building infiltration ventilation rate', units: 'h⁻¹' },
      { symbol: 'Y', description: 'Dicentric chromosome frequency per scored metaphase cell', units: 'dicentrics/cell' },
      { symbol: '\\alpha, \\beta', description: 'Linear and quadratic yield coefficients for 60Co / Fission gammas', units: 'Gy⁻¹, Gy⁻²' }
    ],
    assumptions: [
      'Early fallout decay follows empirical t^(-1.2) power law over the first 6 months.',
      'Ground contamination is distributed homogeneously over an infinite flat plane.',
      'Shelter ventilation infiltration follows continuous stirred-tank reactor (CSTR) air exchange.'
    ],
    benchmarks: 'Validated against NCRP Report No. 165 Table 3.1 protection factors, FEMA Nuclear Planning Guidance, Glasstone & Dolan Chapter 9 decay data, and VTEST-28.'
  },

  // 26. Module 26: Prompt Nuclear Weapon Effects, Blast & HEMP Simulator
  {
    id: 'M26-NukeEffects',
    moduleId: 'Module 26',
    moduleName: 'Nuclear Weapon Prompt Effects, Blast & HEMP Simulator',
    domain: 'Environmental Dispersion & Response',
    title: 'Kingery-Bulmash Blast Overpressure, Dynamic Wind, Thermal Flashburns & MIL-STD-188-125 HEMP',
    overview: 'Simulates prompt physical detonation phenomena from nuclear weapons: Brode/Kingery-Bulmash peak incident and dynamic overpressures, Mach stem formation, dual-pulse thermal radiation exposure, retinal flashblindness, prompt initial radiation flash, and stratospheric High-Altitude Electromagnetic Pulse (HEMP).',
    standards: [
      { org: 'Glasstone & Dolan', code: 'Effects of Nuclear Weapons 3rd Ed.', year: '1977', title: 'Chapters III, IV, VII, XI: Air Blast, Thermal Radiation, Initial Radiation, and EMP' },
      { org: 'US Army BRL', code: 'BRL Report 1972', year: '1972', title: 'Kingery-Bulmash Airblast Parameters from TNT Spherical Air Burst and Hemispherical Surface Burst' },
      { org: 'US DoD', code: 'MIL-STD-188-125-1', year: '2005', title: 'High-Altitude Electromagnetic Pulse (HEMP) Protection for Ground-Based C4I Facilities' },
      { org: 'IEC', code: 'IEC 61000-2-9', year: '1996', title: 'Electromagnetic Compatibility: Description of HEMP Environment - Radiated Disturbance' }
    ],
    primaryFormula: 'Z = \\frac{R}{Y^{1/3}}, \\quad \\Delta P = \\frac{A}{Z^3} + \\frac{B}{Z^2} + \\frac{C}{Z}, \\quad Q(R) = \\frac{\\eta_{\\text{th}} Y}{4\\pi R^2} \\tau_{\\text{atm}}',
    secondaryFormulas: [
      { label: 'Dynamic Wind Pressure', formula: 'q(R) = \\frac{5}{2} \\frac{\\Delta P^2}{\\Delta P + 7 P_0}, \\quad P_0 = 14.7\\text{ psi}' },
      { label: 'Thermal Second-Pulse Maximum Time', formula: 't_{\\max} \\approx 0.0417 \\cdot Y^{0.47} \\quad [\\text{seconds post-detonation}]' },
      { label: 'Prompt Initial Radiation Flash Dose (60s)', formula: 'D_{\\text{prompt}}(R) = \\frac{D_0 Y}{R^2} e^{-R / \\lambda_{\\text{air}}} B(R)' },
      { label: 'HEMP Horizon Footprint Radius', formula: 'R_{\\text{horizon}} = \\sqrt{2 R_E h + h^2}, \\quad R_E = 6,371\\text{ km}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Kingery-Bulmash Scaled Distance Invariance',
        explanation: 'Hopkinson-Cranz cube-root scaling establishes that shockwave blast parameters are geometrically identical at equivalent scaled distance Z = R / Y^(1/3).',
        math: 'Z = \\frac{R}{Y^{1/3}} \\implies \\Delta P(R, Y) = \\Delta P(Z, 1\\text{ kT})'
      },
      {
        stepTitle: '2. Rankine-Hugoniot Dynamic Wind Pressure',
        explanation: 'Behind the supersonic shock front, air particles acquire high mass velocity. From the Rankine-Hugoniot shock relations for ideal diatomic gas (gamma = 1.4):',
        math: 'q = \\frac{1}{2} \\rho_{\\text{shock}} u^2 = \\frac{5 \\Delta P^2}{2 (\\Delta P + 7 P_0)}'
      },
      {
        stepTitle: '3. Dual-Pulse Thermal Fireball Mechanics',
        explanation: 'Prompt X-rays ionize surrounding air, creating an opaque isothermal sphere. As the shock front cools below 300,000 K, the air becomes transparent, releasing the primary thermal pulse.',
        math: 'Q(R) = \\int_0^\\infty F_{\\text{thermal}}(t, R) \\, dt = \\frac{\\eta_{\\text{th}} Y}{4\\pi R^2} e^{-R / (2 V_{\\text{vis}})}'
      }
    ],
    variables: [
      { symbol: 'Y', description: 'Total explosive yield of the nuclear detonation', units: 'kT TNT equivalent' },
      { symbol: 'Z', description: 'Cube-root scaled distance from detonation epicenter', units: 'm·kt⁻¹/³' },
      { symbol: '\\Delta P', description: 'Peak incident static overpressure at the shock front', units: 'psi' },
      { symbol: 'q', description: 'Peak dynamic wind pressure behind the shock front', units: 'psi' },
      { symbol: 'Q', description: 'Total thermal radiant exposure delivered to target surface', units: 'cal·cm⁻² or J·cm⁻²' },
      { symbol: '\\eta_{\\text{th}}', description: 'Fraction of weapon energy released as thermal radiation (~0.35)', units: 'dimensionless' }
    ],
    assumptions: [
      'Standard sea-level ambient atmospheric pressure P0 = 14.7 psi and temperature T0 = 288 K.',
      'Surface burst produces hemispherical blast reflection factor of approximately 1.8 to 2.0.'
    ],
    benchmarks: 'Validated against Glasstone & Dolan 3rd Edition Chapter 3 blast curves, BRL Kingery-Bulmash tables, and VTEST-29.'
  },

  // 27. Module 27: Medical Countermeasures & Actinide Chelation Biokinetics
  {
    id: 'M27-MedCountermeasures',
    moduleId: 'Module 27',
    moduleName: 'Medical Countermeasures & Actinide Chelation Biokinetics',
    domain: 'Environmental Dispersion & Response',
    title: 'Radiopharmaceutical Decorporation Pharmacology, Ca-DTPA, Prussian Blue & Potassium Iodide',
    overview: 'Clinical toxicological biokinetics for internal radiological decorporation: Ca/Zn-DTPA chelation for actinides (Pu, Am, Cm), Prussian Blue ion exchange for cesium and thallium, Potassium Iodide (KI) thyroid blocking, and Sodium Bicarbonate urinary alkalinization for Uranium nephrotoxicity.',
    standards: [
      { org: 'NCRP', code: 'Report No. 166', year: '2010', title: 'Management of Persons Contaminated with Radionuclides' },
      { org: 'US FDA', code: 'NDA 21-626 / NDA 21-744', year: '2004', title: 'Calcium-DTPA and Zinc-DTPA Approval for Internal Plutonium/Americium Contamination' },
      { org: 'US FDA', code: 'NDA 21-629', year: '2003', title: 'Radiogardase (Prussian Blue Insoluble Capsules) for Cesium and Thallium Poisoning' },
      { org: 'WHO', code: 'Guidelines on KI', year: '2017', title: 'Guidelines for Iodine Prophylaxis following Nuclear Accidents' }
    ],
    primaryFormula: 'R_{\\text{treated}}(t) = I_0 \\left[ a_1 2^{-t / T_{b1}} + a_2 2^{-t / T_{b2,\\text{treated}}} \\right], \\quad \\Delta H_E = H_{E,\\text{baseline}} - H_{E,\\text{treated}}',
    secondaryFormulas: [
      { label: 'Prussian Blue Accelerated Cs-137 Biological Half-Life', formula: 'T_{b2,\\text{PB}} \\approx 30\\text{ days} \\quad [\\text{vs 110 days unchelated baseline}]' },
      { label: 'Thyroid Iodine-131 Saturation Blocking Window', formula: 'E_{\\text{block}}(t) = \\begin{cases} 99\\% & t_{\\text{admin}} \\le t_{\\text{intake}} \\\\ 90\\% & t_{\\text{admin}} = t_{\\text{intake}} + 2\\text{h} \\\\ 50\\% & t_{\\text{admin}} = t_{\\text{intake}} + 4\\text{h} \\\\ <10\\% & t_{\\text{admin}} > t_{\\text{intake}} + 24\\text{h} \\end{cases}' },
      { label: 'Urinary Excretion Rate Enhancement Factor', formula: 'M(t) = \\frac{E_{u,\\text{treated}}(t)}{E_{u,\\text{baseline}}(t)} \\ge 10 - 100\\times \\text{ (Early DTPA Therapy)}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Enterohepatic Interruption Kinetics',
        explanation: 'Cesium is secreted into gut bile and reabsorbed via enterohepatic circulation. Insoluble Prussian Blue binds Cs+ ions irreversibly via crystal lattice potassium exchange, forcing fecal excretion.',
        math: '\\frac{dC_{\\text{body}}}{dt} = -(\\lambda_{\\text{rad}} + \\lambda_{\\text{renal}} + k_{\\text{PB}} \\lambda_{\\text{fecal}}) C_{\\text{body}}'
      },
      {
        stepTitle: '2. Octadentate Actinide Chelation',
        explanation: 'Diethylenetriaminepentaacetic acid (DTPA) forms high-affinity 1:1 chelates with quadrivalent actinides (Pu⁴⁺, Am³⁺). The complex exhibits zero tubular reabsorption, clearing via glomerular filtration.',
        math: '\\text{Pu}^{4+} + \\text{Ca-DTPA}^{3-} \\rightleftharpoons \\text{Pu-DTPA}^- + \\text{Ca}^{2+} \\quad (\\log K_f \\approx 29.5)'
      }
    ],
    variables: [
      { symbol: 'I_0', description: 'Initial internalized radionuclide intake activity', units: 'Bq or kBq' },
      { symbol: 'T_{b2}', description: 'Slow-compartment biological elimination half-life', units: 'days' },
      { symbol: '\\Delta H_E', description: '50-year committed effective dose averted by decorporation therapy', units: 'Sv or Rem' },
      { symbol: 'M(t)', description: 'Multiplication factor of urinary excretion compared to unchelated baseline', units: 'dimensionless' }
    ],
    assumptions: [
      'Chelation is initiated before systemic deposition into bone mineral matrix is irreversible.',
      'Patient possesses adequate renal glomerular filtration (serum creatinine monitored).'
    ],
    benchmarks: 'Validated against NCRP Report No. 166 biokinetic curves, ICRP 78 systemic models, and VTEST-30.'
  },

  // 28. Module 28: CAAS & Criticality Accident Excursion Kinetics
  {
    id: 'M28-CAAS',
    moduleId: 'Module 28',
    moduleName: 'CAAS & Criticality Accident Excursion Kinetics',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Nordheim-Fuchs Excursion Dynamics, Fission Pulse Yields & ANSI/ANS-8.3 CAAS Coverage',
    overview: 'Transient point kinetics and prompt-critical burst modeling for fissile solutions and bare-metal assemblies (Godiva). Simulates negative temperature reactivity feedback, prompt neutron/gamma kerma, and compliance with ANSI/ANS-8.3 (0.20 Gy/min at 2m).',
    standards: [
      { org: 'ANS', code: 'ANSI/ANS-8.3-1997 (R2017)', year: '2017', title: 'Criticality Accident Alarm System' },
      { org: 'US NRC', code: '10 CFR Part 70.24', year: '2023', title: 'Criticality Accident Requirements' },
      { org: 'LANL', code: 'LA-13638', year: '2000', title: 'A Review of Criticality Accidents (2000 Revision)' },
      { org: 'Hansen & Maier', code: 'LA-UR-77-2400', year: '1977', title: 'Godiva-IV Critical Assembly Benchmark and Kinetics' }
    ],
    primaryFormula: 'P(t) = P_{\\max} \\operatorname{sech}^2\\left(\\frac{\\alpha_0 t}{2}\\right), \\quad \\Delta t_{1/2} = \\frac{3.52}{\\alpha_0}, \\quad N_f = \\frac{2 \\alpha_0 C}{\\alpha_T E_f}',
    secondaryFormulas: [
      { label: 'Initial Inverse Reactor Period', formula: '\\alpha_0 = \\frac{\\Delta k_p}{\\ell} = \\frac{(\\rho - 1) \\beta}{\\ell} \\quad [\\text{s}^{-1}]' },
      { label: 'ANSI/ANS-8.3 Mandatory Alarm Trip Criterion', formula: '\\dot{D}_{2\\text{m}} \\ge 0.20 \\text{ Gy/min (20.0 rad/min)} \\quad \\text{within } 0.5\\text{ seconds}' },
      { label: 'Prompt Flash Distance Kerma (Neutron + Gamma)', formula: 'D(r) = \\frac{N_f}{4\\pi r^2} \\left[ k_\\gamma e^{-x / \\text{HVL}_\\gamma} + k_n e^{-x / \\text{HVL}_n} \\right]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Nordheim-Fuchs Differential Equation',
        explanation: 'Neglecting delayed neutrons during prompt critical bursts (t << 0.1s), neutron power P(t) obeys dP/dt = (rho_p - alpha_T E) P / l. Differentiating with respect to time yields the hyperbolic secant pulse.',
        math: '\\frac{d^2 \\ln P}{dt^2} = -\\frac{\\alpha_T}{l} P \\implies P(t) = P_{\\max} \\operatorname{sech}^2\\left(\\frac{\\alpha_0 t}{2}\\right)'
      },
      {
        stepTitle: '2. Integral Fission Yield',
        explanation: 'Integrating P(t) from -infinity to +infinity yields total energy E = 2 alpha_0 C / alpha_T. Dividing by 3.204e-11 J/fission gives total fissions N_f.',
        math: 'N_f = \\frac{E_{\\text{total}}}{E_{\\text{fiss}}} = \\frac{2 \\alpha_0 C}{\\alpha_T E_{\\text{fiss}}}'
      }
    ],
    variables: [
      { symbol: '\\alpha_0', description: 'Initial inverse reactor period post prompt-step insertion', units: 's⁻¹' },
      { symbol: '\\Delta t_{1/2}', description: 'Full width at half maximum (FWHM) of the prompt power spike', units: 'ms or µs' },
      { symbol: 'N_f', description: 'Total integrated fissions occurring during excursion', units: 'fissions' },
      { symbol: '\\ell', description: 'Prompt neutron generation time', units: 's' }
    ],
    assumptions: [
      'Adiabatic heating during the microsecond prompt power spike.',
      'Linear negative temperature reactivity feedback alpha_T.'
    ],
    benchmarks: 'Validated against Godiva-IV bare metal benchmarks, LA-13638 accident summaries, and VTEST-31.'
  },

  // 29. Module 29: Tactical GIS Map Engine & ATAK / CoT Mesh Hub
  {
    id: 'M29-TacticalGIS',
    moduleId: 'Module 29',
    moduleName: 'Tactical GIS Map Engine & ATAK / CoT Mesh Hub',
    domain: 'Environmental Dispersion & Response',
    title: 'Cursor-on-Target XML Schema, Tactical Geospatial Projections & Multilateration Localization',
    overview: 'Geospatial operational integration engine translating radiological calculations into DoD Cursor-on-Target (CoT) XML schema v2.0 for WinTAK and ATAK, featuring automated inverse-square sensor mesh multilateration for locating orphan radiation sources.',
    standards: [
      { org: 'US DoD / MITRE', code: 'CoT v2.0 Schema', year: '2009', title: 'Cursor-on-Target Message Router Specification' },
      { org: 'US DoD', code: 'MIL-STD-2525D', year: '2014', title: 'Joint Military Symbology for Tactical Display Systems' },
      { org: 'IEEE', code: 'IEEE Std 1451.0', year: '2007', title: 'Standard for a Smart Transducer Interface for Sensors and Actuators' }
    ],
    primaryFormula: '\\vec{r}_{\\text{source}} = \\frac{\\sum_{i=1}^M w_i \\vec{r}_i}{\\sum_{i=1}^M w_i}, \\quad w_i = \\max(0, \\, \\dot{D}_i - B_0)',
    secondaryFormulas: [
      { label: 'DoD Cursor-on-Target (CoT) Event Element', formula: '<\\text{event version}=\"2.0\" \\, \\text{uid}=\"RADPRO-...\" \\, \\text{type}=\"a-f-G-U-C-R\" \\, \\text{how}=\"m-g\">' },
      { label: 'Confidence Radius of Localization', formula: '\\sigma_r = \\frac{K_{\\text{geom}}}{\\sqrt{\\sum_{i=1}^M (\\dot{D}_i - B_0)}} \\quad [\\text{meters}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Weighted Spatial Multilateration',
        explanation: 'In the presence of an isotropic gamma source, detector net dose rates scale inversely with squared distance. A weighted centroid provides robust, real-time spatial convergence even in high-noise field environments.',
        math: '\\bar{X} = \\frac{\\sum w_i X_i}{\\sum w_i}, \\quad \\bar{Y} = \\frac{\\sum w_i Y_i}{\\sum w_i}'
      },
      {
        stepTitle: '2. ATAK Cursor-on-Target Interoperability',
        explanation: 'Converts tactical coordinate locations and plume isopleths into CoT XML events transmitted via UDP/TCP broadcast to tactical end-user devices (EUD) across military and civilian incident networks.',
        math: '\\text{CoT XML Packet } \\longrightarrow \\text{UDP / TCP Multicast Mesh (Port 4242 / 8087)}'
      }
    ],
    variables: [
      { symbol: '\\vec{r}_i', description: 'Position vector of the i-th autonomous radiological sensor picket', units: 'm' },
      { symbol: '\\dot{D}_i', description: 'Ambient dose rate recorded by the i-th sensor node', units: 'µSv·h⁻¹' },
      { symbol: 'w_i', description: 'Statistical weight assigned to the i-th sensor node', units: 'dimensionless' }
    ],
    assumptions: [
      'Sensors are synchronized and report GPS coordinates and ambient rates.',
      'CoT packets conform to standard MIL-STD-2525D tactical symbol semantics.'
    ],
    benchmarks: 'Validated against DoD Cursor-on-Target interoperability test vectors and VTEST-32.'
  },

  // === FORWARD-LOOKING EXPANSION METHODOLOGIES (FUTURE RESEARCH & SPECIFICATIONS) ===

  // EXP-1: 10 CFR Part 61 Radioactive Waste Characterization & Disposal
  {
    id: 'EXP-10CFR61',
    moduleId: 'Module 30 (Expansion)',
    moduleName: 'Radioactive Waste Characterization (10 CFR 61)',
    domain: 'Regulatory Standards & Transport Security',
    title: '10 CFR Part 61.55 Waste Classification (Class A/B/C/GTCC) & Sum of Fractions Rule',
    overview: 'Determines near-surface low-level radioactive waste (LLW) disposal classification based on concentrations of long-lived (Table 1) and short-lived (Table 2) radionuclides, decay heat generation, and packaging compliance.',
    isExpansion: true,
    standards: [
      { org: 'US NRC', code: '10 CFR Part 61.55', year: '2023', title: 'Waste Classification' },
      { org: 'US NRC', code: 'NUREG-0945', year: '1982', title: 'Final Environmental Impact Statement on 10 CFR Part 61' },
      { org: 'EPRI', code: 'Report 1011735', year: '2005', title: 'Low-Level Waste Characterization Guidelines' }
    ],
    primaryFormula: '\\sum_{i=1}^n \\frac{C_i}{L_{1, i}} \\le 1.0 \\quad \\text{and} \\quad \\sum_{j=1}^m \\frac{C_j}{L_{2, j}} \\le 1.0',
    secondaryFormulas: [
      { label: 'Long-Lived Radionuclides Table 1 Check (C-14, Ni-59, Nb-94, Tc-99, I-129, TRU)', formula: '\\text{SOF}_{\\text{T1}} = \\frac{[\\text{C-14}]}{8} + \\frac{[\\text{Tc-99}]}{3} + \\frac{[\\text{I-129}]}{0.08} + \\frac{[\\text{TRU } \\alpha]}{100}' },
      { label: 'Short-Lived Radionuclides Table 2 Check (H-3, Co-60, Ni-63, Sr-90, Cs-137)', formula: '\\text{Class A if } \\text{SOF}_{\\text{Col1}} \\le 1.0; \\, \\text{Class B if } \\text{SOF}_{\\text{Col2}} \\le 1.0; \\, \\text{Class C if } \\text{SOF}_{\\text{Col3}} \\le 1.0' },
      { label: 'Package Decay Heat Thermal Power (Watts)', formula: 'P_{\\text{thermal}} = 1.6022 \\times 10^{-13} \\sum_{k} A_k \\cdot E_{\\text{decay}, k} \\quad [\\text{W}]' }
    ],
    variables: [
      { symbol: 'C_i', description: 'Concentration of i-th radionuclide in waste matrix', units: 'Ci·m⁻³ (or nCi·g⁻¹ for TRU)' },
      { symbol: 'L_i', description: 'Regulatory concentration limit from 10 CFR 61.55 Table 1 or Table 2', units: 'Ci·m⁻³' },
      { symbol: '\\text{SOF}', description: 'Sum of Fractions indicator for multi-radionuclide mixtures', units: 'dimensionless' },
      { symbol: 'P_{\\text{thermal}}', description: 'Radiolytic decay heat production rate', units: 'W' }
    ],
    assumptions: [
      'Waste matrix is chemically stable and solidified to prevent leaching.',
      'Transuranic (TRU) alpha emitters with half-life > 5 years are evaluated in nCi/g.'
    ],
    benchmarks: 'Validated against NRC 10 CFR 61.55 Table 1/2 limits and EPRI LLW characterization benchmarks.'
  },

  // EXP-2: Bethe-Bloch Ion Stopping Power & Bragg Peak
  {
    id: 'EXP-BetheBloch',
    moduleId: 'Module 31 (Expansion)',
    moduleName: 'Alpha & Heavy Ion Stopping Power',
    domain: 'Medical & Advanced Expansion',
    title: 'Bethe-Bloch Equation & Bragg Peak Energy Deposition in Matter',
    overview: 'Calculates linear energy transfer (LET) and electronic stopping power (-dE/dx) for heavy charged particles (protons, alpha particles, carbon ions) in human tissue and shielding materials.',
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

  // EXP-3: Space Radiation & Galactic Cosmic Rays
  {
    id: 'EXP-SpaceRad',
    moduleId: 'Module 32 (Expansion)',
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
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'current' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'current' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'current' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'current' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('current')}
        >
          🔬 Active Validated Modules & Core Physics
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
          🚀 Research & Expansion Specifications (Modules 30+)
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
                  📐 Step-by-Step Analytical Derivation & Proof
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
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>AAPM TG-43U1</td>
                  <td style={{ padding: '10px' }}>AAPM</td>
                  <td style={{ padding: '10px' }}>2004</td>
                  <td style={{ padding: '10px' }}>Update of AAPM Task Group No. 43 Report on Brachytherapy Dosimetry</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Air-kerma strength S_K, dose-rate constant Λ, radial dose function g(r), and 2D anisotropy F(r,θ).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MARSSIM (NUREG-1575)</td>
                  <td style={{ padding: '10px' }}>NRC / EPA / DOE / DOD</td>
                  <td style={{ padding: '10px' }}>2000</td>
                  <td style={{ padding: '10px' }}>Multi-Agency Radiation Survey and Site Investigation Manual (Rev. 1)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nonparametric statistical testing (WRS & Sign), Currie detection limits (MDA/MDC), and site release surveys.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO 11929-1:2019</td>
                  <td style={{ padding: '10px' }}>ISO</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Determination of Characteristic Limits for Ionizing Radiation Measurements</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decision threshold, detection limit, and limits of the coverage interval for counting measurements.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI/ANS-8.1-2014</td>
                  <td style={{ padding: '10px' }}>ANS / ANSI</td>
                  <td style={{ padding: '10px' }}>2014</td>
                  <td style={{ padding: '10px' }}>Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Subcritical mass, volume, and dimension limits for U-235, Pu-239, and U-233 systems.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC 10 CFR 61</td>
                  <td style={{ padding: '10px' }}>US NRC</td>
                  <td style={{ padding: '10px' }}>2023</td>
                  <td style={{ padding: '10px' }}>Licensing Requirements for Land Disposal of Radioactive Waste (§ 61.55)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Low-level radioactive waste classification (Class A, B, C, GTCC) and Sum of Fractions rule.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI Z136.1-2022</td>
                  <td style={{ padding: '10px' }}>LIA / ANSI</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>American National Standard for Safe Use of Lasers</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Wavelength-dependent ocular Maximum Permissible Exposure (MPE), NOHD, and optical density (OD).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FCC OET Bulletin 65</td>
                  <td style={{ padding: '10px' }}>US FCC</td>
                  <td style={{ padding: '10px' }}>1997</td>
                  <td style={{ padding: '10px' }}>Evaluating Compliance with FCC Guidelines for Human Exposure to Radiofrequency Fields</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Near-field / far-field microwave power density limits, uncontrolled vs controlled exposure boundaries.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IEEE C95.1-2019</td>
                  <td style={{ padding: '10px' }}>IEEE / ICES</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Standard for Safety Levels with Respect to Human Exposure to Electromagnetic Fields</td>
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
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC Reg Guide 1.145</td>
                  <td style={{ padding: '10px' }}>US NRC</td>
                  <td style={{ padding: '10px' }}>1983</td>
                  <td style={{ padding: '10px' }}>Atmospheric Dispersion Models for Potential Accident Consequence Assessments</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Pasquill-Gifford Gaussian dispersion coefficients, plume rise, and ground-level concentration limits.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US DOT ERG 2024</td>
                  <td style={{ padding: '10px' }}>US DOT / PHMSA</td>
                  <td style={{ padding: '10px' }}>2024</td>
                  <td style={{ padding: '10px' }}>Emergency Response Guidebook (Guide 163: Radioactive Materials)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Initial isolation perimeter cordons (100 m spill, 300 m fire/burst), hot/warm/cold zone boundaries.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>EPA PAG Manual</td>
                  <td style={{ padding: '10px' }}>US EPA</td>
                  <td style={{ padding: '10px' }}>2017</td>
                  <td style={{ padding: '10px' }}>Protective Action Guides and Planning Guidance for Radiological Incidents (EPA-400/R-17/001)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Emergency worker dose ceilings (50, 100, 250 mSv), turn-around thresholds, public relocation criteria.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>REAC/TS 4th Ed.</td>
                  <td style={{ padding: '10px' }}>ORAU / REAC/TS</td>
                  <td style={{ padding: '10px' }}>2021</td>
                  <td style={{ padding: '10px' }}>The Medical Basis for Radiation-Accident Preparedness: Medical Countermeasures</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decorporation pharmacokinetics: KI thyroid blocking, Prussian Blue Cs-137 chelation, Ca/Zn-DTPA actinide mobilization.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ASME BPVC Sec. V T-274.1</td>
                  <td style={{ padding: '10px' }}>ASME</td>
                  <td style={{ padding: '10px' }}>2023</td>
                  <td style={{ padding: '10px' }}>Boiler & Pressure Vessel Code, Section V, Article 2, Table T-274.1</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Maximum geometric unsharpness (Ug) limits (0.51 mm to 1.78 mm) as function of weld thickness.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO 17636-1:2022</td>
                  <td style={{ padding: '10px' }}>ISO</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>Non-destructive testing of welds - Radiographic testing - Part 1: X- and gamma-ray techniques</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Geometric penumbra limits, minimum SID configurations, Class A and Class B radiographic testing techniques.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MCNP5 (LA-UR-03-1987)</td>
                  <td style={{ padding: '10px' }}>LANL</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>MCNP - A General Monte Carlo N-Particle Transport Code</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Photon stochastic transport micro-kernel, Kahn Klein-Nishina rejection sampling, Woodcock tracking.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Klein & Nishina (1929)</td>
                  <td style={{ padding: '10px' }}>Z. Phys.</td>
                  <td style={{ padding: '10px' }}>1929</td>
                  <td style={{ padding: '10px' }}>Über die Streuung von Strahlung durch freie Elektronen nach der neuen relativistischen Quantendynamik von Dirac</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Quantum relativistic differential and total cross-section for Compton photon scattering off free electrons.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Currie Metrology (1968)</td>
                  <td style={{ padding: '10px' }}>Anal. Chem.</td>
                  <td style={{ padding: '10px' }}>1968</td>
                  <td style={{ padding: '10px' }}>Limits for Qualitative Detection and Quantitative Determination</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decision threshold (Lc = 2.33*sqrt(B)), detection limit (Ld = 2.71 + 4.65*sqrt(B)), and MDA formulations.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA GSR Part 3</td>
                  <td style={{ padding: '10px' }}>IAEA</td>
                  <td style={{ padding: '10px' }}>2014</td>
                  <td style={{ padding: '10px' }}>Radiation Protection and Safety of Radiation Sources: International Basic Safety Standards</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Harmonized international dose constraints (20 mSv/yr 5-yr average, 20 mSv lens of eye limit).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>EURATOM 2013/59</td>
                  <td style={{ padding: '10px' }}>European Union</td>
                  <td style={{ padding: '10px' }}>2013</td>
                  <td style={{ padding: '10px' }}>Council Directive 2013/59/Euratom (Basic Safety Standards Directive)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>European statutory occupational dose framework, 1 mSv prenatal protection, 20 mSv/yr lens threshold.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NATO STANAG 2470</td>
                  <td style={{ padding: '10px' }}>NATO / Military</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>AMedP-7.1 Commander's Guide on Radiation Protection in Military Operations</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Military tactical Operational Exposure Guidance (OEG 1: 0.05 Gy, OEG 2: 0.25 Gy, OEG 3: 0.70 Gy).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>CNSC SOR/2000-203</td>
                  <td style={{ padding: '10px' }}>CNSC Canada</td>
                  <td style={{ padding: '10px' }}>2020</td>
                  <td style={{ padding: '10px' }}>Canadian Radiation Protection Regulations</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nuclear Energy Worker (NEW) limits (100 mSv per 5-year period), pregnant NEW limits (4 mSv).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA INES Manual</td>
                  <td style={{ padding: '10px' }}>IAEA / OECD-NEA</td>
                  <td style={{ padding: '10px' }}>2008</td>
                  <td style={{ padding: '10px' }}>The International Nuclear and Radiological Event Scale User's Manual</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>INES severity Levels 1 through 7, radiotoxicity equivalence multipliers normalized to Iodine-131.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FDA 21 CFR Part 11</td>
                  <td style={{ padding: '10px' }}>US FDA</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>Electronic Records; Electronic Signatures (Title 21 Code of Federal Regulations)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Computer-generated time-stamped audit trails, SHA-256 tamper-evident integrity verification.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO/IEC 17025:2017</td>
                  <td style={{ padding: '10px' }}>ISO / IEC</td>
                  <td style={{ padding: '10px' }}>2017</td>
                  <td style={{ padding: '10px' }}>General requirements for competence of testing and calibration laboratories (§ 7.11 Control of Data)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Data integrity validation, cryptographic traceability, software qualification criteria for radiological testing.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NCRP Report No. 165</td>
                  <td style={{ padding: '10px' }}>NCRP</td>
                  <td style={{ padding: '10px' }}>2010</td>
                  <td style={{ padding: '10px' }}>Responding to a Radiological or Nuclear Terrorism Incident: A Guide for Decision Makers</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Expedient shelter protection factors (PF), Way-Wigner decay modeling, and evacuation departure crossover timing.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FEMA Nuclear Guidance</td>
                  <td style={{ padding: '10px' }}>FEMA / DHS</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>Nuclear Detonation Planning Guidance: Response and Recovery (2nd Edition)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Dangerous fallout zone boundaries, life-saving shelter-in-place protocols, and transit exposure minimizers.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA TRS-405</td>
                  <td style={{ padding: '10px' }}>IAEA</td>
                  <td style={{ padding: '10px' }}>2001</td>
                  <td style={{ padding: '10px' }}>Cytogenetic Analysis for Radiation Dose Assessment: A Manual</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Dicentric chromosome aberration calibration curves (linear-quadratic yield) and mass casualty biodosimetry triage.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Glasstone & Dolan (1977)</td>
                  <td style={{ padding: '10px' }}>US DoD / ERDA</td>
                  <td style={{ padding: '10px' }}>1977</td>
                  <td style={{ padding: '10px' }}>The Effects of Nuclear Weapons (3rd Edition)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Blast overpressure scaling, thermal radiant exposure, prompt radiation flash attenuation, and dynamic pressure.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Kingery-Bulmash (BRL-1972)</td>
                  <td style={{ padding: '10px' }}>US Army BRL</td>
                  <td style={{ padding: '10px' }}>1972</td>
                  <td style={{ padding: '10px' }}>Airblast Parameters from TNT Spherical Air Burst and Hemispherical Surface Burst (BRL Report 1341)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Polynomial scaled distance curves (Z = R / W^(1/3)) for peak incident overpressure and positive phase blast impulse.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MIL-STD-188-125-1</td>
                  <td style={{ padding: '10px' }}>US DoD</td>
                  <td style={{ padding: '10px' }}>2005</td>
                  <td style={{ padding: '10px' }}>High-Altitude Electromagnetic Pulse (HEMP) Protection for Ground-Based C4I Facilities</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>E1 fast prompt (2.5 ns rise, 50 kV/m), E2 intermediate scattered gamma, and E3 magnetohydrodynamic geomagnetically induced currents.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NCRP Report No. 166</td>
                  <td style={{ padding: '10px' }}>NCRP</td>
                  <td style={{ padding: '10px' }}>2010</td>
                  <td style={{ padding: '10px' }}>Population Monitoring and Radionuclide Decorporation Following a Radiological or Nuclear Incident</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Ca/Zn-DTPA chelation for actinides (Pu, Am, Cm), Prussian Blue for radiocesium, and urinary excretion biokinetics.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI/ANS-8.3-1997</td>
                  <td style={{ padding: '10px' }}>ANSI / ANS</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>Criticality Accident Alarm System (CAAS)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>CAAS 20 rad/min at 2 meters trip criteria, Nordheim-Fuchs prompt excursion kinetics, and evacuation cordon radii.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>DoD CoT v2.0</td>
                  <td style={{ padding: '10px' }}>US DoD / MITRE</td>
                  <td style={{ padding: '10px' }}>2009</td>
                  <td style={{ padding: '10px' }}>Cursor-on-Target XML Schema and Mesh Protocol Specification</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Tactical machine-to-machine geospatial radiation telemetry (a-f-G-U-C-rad) and WinTAK/ATAK inter-agency sensor situational awareness.</td>
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
