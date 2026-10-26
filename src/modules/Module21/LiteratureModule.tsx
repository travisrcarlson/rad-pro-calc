import React, { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import VerificationBadge from '../../components/VerificationBadge';
import {
  XCOM_GP_MATERIALS,
  evaluateXCOMAttenuation,
  getMaterialNeutronRemoval
} from '../../utils/xcomAndGpBuildup';

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

export type ViewTab = 'current' | 'expansion' | 'derivations' | 'constants' | 'standards';

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
  // 1. Module 1
  {
    id: 'M01-Dose',
    moduleId: 'Module 1',
    moduleName: 'Dose Calculator (1A–1D)',
    domain: 'Dose, Transport & Shielding',
    title: 'Multi-Modality Point/Extended Gamma Kerma, Taylor Buildup, Beta Bremsstrahlung & Neutron Activation (Submodules 1A–1D)',
    overview: 'Unified four-part analytical dosimetry engine covering Submodule 1A (External Point/Line/Disc Gamma Kerma & Specific Gamma Constant Γ), Submodule 1B (Narrow/Broad-Beam Shielding & Taylor/G-P Buildup), Submodule 1C (Committed Effective Dose E(50) & Intake), and Submodule 1D (Thermal/Epithermal Neutron Activation & Beta Bremsstrahlung).',
    standards: [
      { org: 'ICRP', code: 'Publication 74 / 116', year: '2010', title: 'Conversion Coefficients for Radiological Protection Quantities for External Radiation' },
      { org: 'NCRP', code: 'Report No. 147 / 151', year: '2005', title: 'Structural Shielding Design and Evaluation for Megavoltage X- and Gamma-Ray Facilities' },
      { org: 'ICRU', code: 'Report 56 / 57', year: '1998', title: 'Dosimetry of External Beta Rays and Photon Conversion Coefficients' },
      { org: 'IAEA', code: 'TRS No. 273', year: '1987', title: 'Handbook on Nuclear Activation Data' }
    ],
    primaryFormula: '\\dot{H}^*(10) = \\frac{A \\cdot \\Gamma}{d^2} \\cdot B(\\mu x) \\cdot e^{-\\mu x}, \\quad E_{\\text{total}} = H_p(10) + \\sum_j I_j \\cdot e(50)_j',
    secondaryFormulas: [
      { label: 'Taylor Two-Exponential Buildup Factor (Submodule 1B)', formula: 'B(\\mu x) = A_1 e^{-\\alpha_1 \\mu x} + (1 - A_1) e^{-\\alpha_2 \\mu x}' },
      { label: 'Bethe-Heitler Beta Bremsstrahlung Radiative Yield Fraction', formula: 'F_{\\text{brem}} = 3.5 \\times 10^{-4} \\cdot Z_{\\text{eff}} \\cdot E_{\\beta, \\max} \\quad [\\text{Katz-Penfold Range } R_p = 0.412 E_{\\beta}^{1.265 - 0.0954 \\ln E_{\\beta}}]' },
      { label: 'Committed Effective Dose Over 50-Year Integration (Submodule 1C)', formula: 'E(50) = I_0 \\cdot e(50), \\quad \\text{ALI} = \\frac{20\\text{ mSv}}{e(50)}, \\quad \\text{DAC} = \\frac{\\text{ALI}}{2400\\text{ m}^3}' },
      { label: 'Thermal Neutron Capture Activation & Cooling (Submodule 1D)', formula: 'A(t_{\\text{irr}}, t_{\\text{cool}}) = N_0 \\cdot \\sigma_{\\text{act}} \\cdot \\Phi_{\\text{th}} \\cdot \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right) \\cdot e^{-\\lambda t_{\\text{cool}}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Geometric Inverse-Square Fluence & Air Kerma Rate',
        explanation: 'For an isotropic point emitter radiating into 4π steradians, photon energy fluence diminishes across spherical surfaces of area 4πd². Multiplying by the mass energy-absorption coefficient (μ_en/ρ)_air yields the Specific Gamma Constant Γ:',
        math: '\\dot{K}_{\\text{air}}(d) = \\frac{A}{d^2} \\left[ \\frac{1}{4\\pi} \\sum_i y_i E_i \\left(\\frac{\\mu_{\\text{en}}}{\\rho}\\right)_{\\text{air}, i} \\right] = \\frac{A \\cdot \\Gamma}{d^2}'
      },
      {
        stepTitle: '2. Broad-Beam Compton Scatter Buildup Correction',
        explanation: 'In thick shielding slabs, Compton-scattered photons reach the detector alongside uncollided primary photons e^(-μx). The buildup factor B(μx) = D_total / D_uncollided is parameterized via Taylor two-exponential coefficients:',
        math: '\\dot{H}(x) = \\dot{H}_0 \\cdot B(\\mu x) \\cdot e^{-\\mu x} = \\dot{H}_0 \\left[ A_1 e^{-(1 + \\alpha_1)\\mu x} + (1 - A_1) e^{-(1 + \\alpha_2)\\mu x} \\right]'
      },
      {
        stepTitle: '3. Neutron Activation Differential Production Balance (Submodule 1D)',
        explanation: 'During neutron irradiation at flux Φ_th, target nuclei N_0 transmute at constant rate N_0 σ_act Φ_th while radioactive daughters decay at rate λN*(t). Integrating with N*(0) = 0 yields saturation buildup:',
        math: '\\frac{dN^*}{dt} = N_0 \\sigma_{\\text{act}} \\Phi_{\\text{th}} - \\lambda N^*(t) \\implies A(t_{\\text{irr}}) = \\lambda N^*(t_{\\text{irr}}) = N_0 \\sigma_{\\text{act}} \\Phi_{\\text{th}} \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right)'
      }
    ],
    variables: [
      { symbol: '\\dot{H}^*(10)', description: 'Ambient dose equivalent rate at 10 mm depth in ICRU tissue sphere', units: 'µSv·h⁻¹ or mSv·h⁻¹' },
      { symbol: 'A', description: 'Source radionuclide activity', units: 'MBq, GBq, or Ci' },
      { symbol: '\\Gamma', description: 'Specific gamma-ray constant (e.g., 308.5 µSv·m²/(h·GBq) for Co-60)', units: 'µSv·m²·GBq⁻¹·h⁻¹' },
      { symbol: 'B(\\mu x)', description: 'Broad-beam multiple-scatter photon buildup factor', units: 'dimensionless' },
      { symbol: 'e(50)', description: 'ICRP 119 50-year committed effective dose coefficient per unit intake', units: 'Sv·Bq⁻¹' },
      { symbol: '\\sigma_{\\text{act}}', description: 'Thermal neutron capture cross-section at 2200 m/s (e.g., 98.65 b for Au-197)', units: 'barns (10⁻²⁴ cm²)' }
    ],
    assumptions: [
      'Point source approximation valid when receptor distance d exceeds 5× maximum source dimension.',
      'Electronic equilibrium established at 10 mm depth for penetrating gamma radiation.',
      'Negligible parent target burnup during thermal neutron irradiation (σ_act Φ_th t_irr << 1).'
    ],
    benchmarks: 'Validated against ICRP 107 Co-60/Cs-137 gamma constants (VTEST-01, VTEST-02), NCRP 147 TVL attenuation (VTEST-03), ICRP 119 I-131 ingestion (VTEST-04), and Au-198 saturation yield (VTEST-20).'
  },

  // 2. Module 2
  {
    id: 'M02-Worker',
    moduleId: 'Module 2',
    moduleName: 'Worker Dosimetry',
    domain: 'Dose, Transport & Shielding',
    title: 'Occupational ALARA Stay-Time, Multi-Source 3D Worker Trajectory Integration, Line/Disc Geometries & DAC-Hour Tracking',
    overview: 'Calculates occupational worker stay-times, turn-around dose ceilings, cumulative TEDE (DDE + CEDE from airborne DAC-hours), and extended source geometric solid-angle corrections (point, finite line pipe, and circular pool/disc sources).',
    standards: [
      { org: 'US NRC', code: '10 CFR Part 20', year: '2023', title: 'Standards for Protection Against Radiation (§ 20.1201 Occupational Limits & DAC/ALI)' },
      { org: 'NCRP', code: 'Report No. 127', year: '1998', title: 'Operational Radiation Safety Program' },
      { org: 'Cember & Johnson', code: 'Textbook Ref', year: '2009', title: 'Introduction to Health Physics (4th Ed., Extended Source Dosimetry)' }
    ],
    primaryFormula: 'D_{\\text{worker}} = \\int_0^{T_{\\text{stay}}} \\sum_{k=1}^N \\frac{A_k \\Gamma_k}{\\|\\vec{r}_w(t) - \\vec{r}_k\\|^2} B_k e^{-\\mu_k x_k(t)} \\, dt + \\frac{\\text{DAC-hrs}}{2000} \\times \\frac{20\\text{ mSv}}{\\text{PF}_{\\text{resp}}}',
    secondaryFormulas: [
      { label: 'Inverse-Square Standoff Distance Law', formula: 'I_2 = I_1 \\cdot \\left(\\frac{d_1}{d_2}\\right)^2 \\iff d_{\\text{safe}} = d_1 \\cdot \\sqrt{\\frac{\\dot{D}_1}{\\dot{D}_{\\text{limit}}}}' },
      { label: 'Finite Line Source (Radioactive Pipe of Length L) On-Bisector', formula: '\\dot{D}_{\\text{line}}(h) = \\frac{S_L \\cdot \\Gamma}{h} \\cdot 2 \\arctan\\left(\\frac{L}{2h}\\right), \\quad S_L = \\frac{A_{\\text{total}}}{L}' },
      { label: 'Circular Planar Disc Source (Contaminated Spill of Radius R)', formula: '\\dot{D}_{\\text{disc}}(h) = \\pi \\cdot S_A \\cdot \\Gamma \\cdot \\ln\\left(1 + \\frac{R^2}{h^2}\\right), \\quad S_A = \\frac{A_{\\text{total}}}{\\pi R^2}' },
      { label: 'Allowable Worker Stay-Time to Administrative Dose Limit', formula: 't_{\\text{stay}} = \\frac{D_{\\text{admin}} - D_{\\text{prior}}}{\\dot{D}_{\\text{workplace}}} \\quad [\\text{in hours or minutes}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Differential Line Source Integration (Sievert Integral Basis)',
        explanation: 'Consider a uniform radioactive pipe of length L and linear activity density S_L = A/L along the x-axis from -L/2 to +L/2. Integrating inverse-square contributions at perpendicular distance h:',
        math: '\\dot{D}(h) = \\int_{-L/2}^{L/2} \\frac{\\Gamma S_L \\, dx}{x^2 + h^2} = \\frac{\\Gamma S_L}{h} \\left[ \\arctan\\left(\\frac{x}{h}\\right) \\right]_{-L/2}^{L/2} = \\frac{2 \\Gamma S_L}{h} \\arctan\\left(\\frac{L}{2h}\\right)'
      },
      {
        stepTitle: '2. Planar Disc Source Integration Over Concentric Annuli',
        explanation: 'For a circular spill of radius R and areal activity S_A (Bq/m²), integrating concentric rings of radius r and area 2πr dr at height h above center:',
        math: '\\dot{D}(h) = \\int_0^R \\frac{\\Gamma S_A (2\\pi r \\, dr)}{r^2 + h^2} = \\pi \\Gamma S_A \\left[ \\ln(r^2 + h^2) \\right]_0^R = \\pi \\Gamma S_A \\ln\\left(1 + \\frac{R^2}{h^2}\\right)'
      }
    ],
    variables: [
      { symbol: 'D_{\\text{worker}}', description: 'Total Effective Dose Equivalent (TEDE) accumulated during work task', units: 'mSv or µSv' },
      { symbol: 'S_L, S_A', description: 'Linear (MBq/m) and areal (MBq/m²) source activity concentrations', units: 'MBq·m⁻¹ / MBq·m⁻²' },
      { symbol: 'h', description: 'Perpendicular standoff distance from pipe axis or disc center', units: 'm' },
      { symbol: '\\text{PF}_{\\text{resp}}', description: 'Assigned Protection Factor (APF) of respiratory PPE (e.g., 50 for full-face APR, 1000 for PAPR/SCBA)', units: 'dimensionless' }
    ],
    assumptions: [
      'Negligible self-absorption within thin surface contamination disc sources.',
      'Worker torso receptor evaluated at standard chest dosimeter height z = 1.2 m.'
    ],
    benchmarks: 'Validated against Cember 4th Ed. extended source analytical solutions and VTEST-07.'
  },

  // 3. Module 3
  {
    id: 'M03-Internal',
    moduleId: 'Module 3',
    moduleName: 'Internal Dosimetry',
    domain: 'Internal Dosimetry & Biokinetics',
    title: 'ICRP Compartmental Biokinetic ODEs, Bioassay Excretion Functions m(t), Effective Half-Life & Committed Dose e(50)',
    overview: 'Models metabolic intake (inhalation Types F/M/S and ingestion f1), systemic organ retention, urinary/fecal bioassay intake back-calculation I0 = M(t)/m(t), and 50-year committed effective dose E(50).',
    standards: [
      { org: 'ICRP', code: 'Publication 68 / 78', year: '1997', title: 'Individual Monitoring for Internal Exposure of Workers & Dose Coefficients' },
      { org: 'ICRP', code: 'Publication 119 / 130', year: '2015', title: 'Compendium of Dose Coefficients & Occupational Intakes of Radionuclides (OIR)' },
      { org: 'NCRP', code: 'Report No. 164', year: '2010', title: 'Uncertainties in Internal Radiation Dose Assessment' }
    ],
    primaryFormula: '\\lambda_{\\text{eff}} = \\lambda_{\\text{rad}} + \\lambda_{\\text{bio}} \\iff T_{1/2,\\text{eff}} = \\frac{T_p \\cdot T_b}{T_p + T_b}, \\quad I_0 = \\frac{M(t)}{m(t)}, \\quad E(50) = I_0 \\cdot e(50)',
    secondaryFormulas: [
      { label: 'Multi-Exponential Bioassay Retention / Excretion Function', formula: 'm(t) = \\sum_{j=1}^K a_j \\cdot e^{-(\\lambda_{\\text{bio}, j} + \\lambda_{\\text{rad}}) t}' },
      { label: 'Target Organ Compartmental Retention ODE', formula: '\\frac{d A_{\\text{organ}}}{dt} = f_{\\text{organ}} \\lambda_{\\text{blood}} A_{\\text{blood}}(t) - (\\lambda_{\\text{bio}} + \\lambda_{\\text{rad}}) A_{\\text{organ}}(t)' },
      { label: 'Annual Limit on Intake (ALI) & Derived Air Concentration (DAC)', formula: '\\text{ALI} = \\frac{0.020\\text{ Sv}}{e(50)}, \\quad \\text{DAC} = \\frac{\\text{ALI}}{2400\\text{ m}^3} \\quad [\\text{Bq/m}^3]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Parallel Physical and Biological Clearance Rates',
        explanation: 'A radionuclide in an organ is removed simultaneously by radioactive decay (rate λ_rad) and biological excretion (rate λ_bio). Because independent Poisson removal rates add linearly:',
        math: '\\frac{dN}{dt} = -(\\lambda_{\\text{rad}} + \\lambda_{\\text{bio}}) N = -\\lambda_{\\text{eff}} N \\implies \\frac{\\ln 2}{T_e} = \\frac{\\ln 2}{T_p} + \\frac{\\ln 2}{T_b} \\implies T_e = \\frac{T_p T_b}{T_p + T_b}'
      },
      {
        stepTitle: '2. Retrospective Intake Reconstruction from Bioassay M(t)',
        explanation: 'Given a measured 24-hour urine/fecal sample or whole-body count M(t) at time t post-intake and the ICRP 78 reference retention/excretion fraction m(t), the acute intake I_0 and committed dose E(50) follow by linear convolution:',
        math: 'M(t) = I_0 \\cdot m(t) \\implies I_0 = \\frac{M(t)}{m(t)} \\implies E(50) = \\frac{M(t)}{m(t)} \\cdot e(50)'
      }
    ],
    variables: [
      { symbol: 'T_{1/2,\\text{eff}}', description: 'Effective clearance half-life in target organ (e.g., 108.91 d for Cs-137)', units: 'days' },
      { symbol: 'I_0', description: 'Reconstructed initial acute intake activity', units: 'Bq' },
      { symbol: 'M(t)', description: 'Measured activity in 24-h excreta or whole-body counter at day t', units: 'Bq' },
      { symbol: 'm(t)', description: 'ICRP 78 fractional retention or daily excretion function at day t', units: 'Bq per Bq intake' },
      { symbol: 'e(50)', description: 'Committed effective dose coefficient over 50-year adult integration period', units: 'Sv·Bq⁻¹' }
    ],
    assumptions: [
      'Linear first-order compartmental transfer kinetics between respiratory/GI tract, blood plasma, and target organs.',
      'ICRP Reference Adult physiology (20 m³/day occupational breathing rate, 2,400 m³/year).'
    ],
    benchmarks: 'Validated against ICRP Publication 119 I-131 ingestion (VTEST-04) and ICRP 68 Cs-137 effective half-life (VTEST-22).'
  },

  // 4. Module 4
  {
    id: 'M04-Spatial3D',
    moduleId: 'Module 4',
    moduleName: '3D Spatial Workspace',
    domain: 'Dose, Transport & Shielding',
    title: 'Kay-Kajiya 3D Ray-AABB Slab Penetration, Multi-Source Vector Superposition & Broad-Beam Buildup',
    overview: 'Computes real-time 3D dose fields across multi-source nuclear facilities with arbitrary 3D rectilinear shielding walls (Lead, Concrete, Steel, Water, Depleted Uranium) using exact analytical Kay-Kajiya ray-box intersection andANSI/ANS-6.4.3 buildup factors.',
    standards: [
      { org: 'Kay & Kajiya', code: 'SIGGRAPH Comput. Graph. 20(4)', year: '1986', title: 'Ray Tracing Complex Scenes: Slab Intersection Algorithm for Bounding Volumes' },
      { org: 'ANSI/ANS', code: '6.4.3-1991 / 6.4-2006', year: '2006', title: 'Gamma-Ray Attenuation Coefficients and Buildup Factors for Engineering Materials' },
      { org: 'NIST', code: 'XCOM (SRD 8)', year: '2010', title: 'Photon Cross Sections Database' }
    ],
    primaryFormula: '\\dot{H}(\\vec{p}) = \\sum_{s=1}^{N_s} \\frac{A_s \\Gamma_s}{\\|\\vec{p} - \\vec{s}\\|^2} \\prod_{w=1}^{N_w} B_w(\\mu_w L_{s,w}) \\cdot \\exp(-\\mu_w L_{s,w})',
    secondaryFormulas: [
      { label: 'Kay-Kajiya Ray-AABB Slab Entry & Exit Parameters', formula: 't_{\\text{enter}} = \\max_{i \\in \\{x,y,z\\}} \\min(t_{i,1}, t_{i,2}), \\quad t_{\\text{exit}} = \\min_{i \\in \\{x,y,z\\}} \\max(t_{i,1}, t_{i,2})' },
      { label: 'Exact 3D Slant Penetration Path Length Through Shield Wall w', formula: 'L_{s,w} = \\max(0, \\, t_{\\text{exit}} - t_{\\text{enter}}) \\cdot \\|\\vec{p} - \\vec{s}\\| \\quad (\\text{for } 0 \\le t_{\\text{enter}} < t_{\\text{exit}} \\le 1)' },
      { label: 'Half-Value Layer (HVL) & Tenth-Value Layer (TVL)', formula: '\\text{HVL} = \\frac{\\ln 2}{\\mu}, \\quad \\text{TVL} = \\frac{\\ln 10}{\\mu} \\approx 3.3219 \\cdot \\text{HVL}, \\quad I(x) = I_0 \\cdot 10^{-x / \\text{TVL}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Parametric Ray Formulation Between Source and Detector',
        explanation: 'A directed ray from point source s to receptor p is parameterized on t ∈ [0, 1] as r(t) = s + t(p - s). For an axis-aligned bounding box (AABB) wall [b_min, b_max], the slab intersection parameters along each axis i ∈ {x, y, z} are:',
        math: 't_{i,1} = \\frac{b_{\\min, i} - s_i}{p_i - s_i}, \\quad t_{i,2} = \\frac{b_{\\max, i} - s_i}{p_i - s_i}'
      },
      {
        stepTitle: '2. Exact Slant Path Length Through 3D Shielding Obstacle',
        explanation: 'The ray lies inside all three orthogonal slabs simultaneously on the interval [t_enter, t_exit]. Multiplying the dimensionless parameter span by the Euclidean distance ||p - s|| yields the exact slant thickness L_shield without voxel discretization error:',
        math: 'L_{\\text{shield}} = \\max\\left(0, \\, \\min(1, t_{\\text{exit}}) - \\max(0, t_{\\text{enter}})\\right) \\cdot \\sqrt{(p_x - s_x)^2 + (p_y - s_y)^2 + (p_z - s_z)^2}'
      }
    ],
    variables: [
      { symbol: '\\vec{s}, \\vec{p}', description: '3D Cartesian coordinates of radiation source and detector point', units: 'm' },
      { symbol: 't_{\\text{enter}}, t_{\\text{exit}}', description: 'Normalized ray intersection parameters at shield entry and exit faces', units: 'dimensionless ∈ [0, 1]' },
      { symbol: 'L_{s,w}', description: 'Exact 3D slant penetration path length of ray s through wall w', units: 'm or cm' },
      { symbol: '\\mu_w', description: 'Linear attenuation coefficient of wall material at source photon energy', units: 'cm⁻¹' }
    ],
    assumptions: [
      'Straight-line primary ray optical path for slant thickness evaluation.',
      'Broad-beam Compton scatter accounted for via material buildup factor B(μL).'
    ],
    benchmarks: 'Validated against Kay-Kajiya 3D geometric obstacle penetration (VTEST-07) and NCRP 151 TVL attenuation (VTEST-03).'
  },

  // 5. Module 5
  {
    id: 'M05-RadMap',
    moduleId: 'Module 5',
    moduleName: 'Radiation Map',
    domain: 'Dose, Transport & Shielding',
    title: '2D/3D Isodose Contour Interpolation, 10 CFR 34.41 NDT Barricade Perimeters & Ground/Cloud Shine',
    overview: 'Generates spatial 2D/3D isodose contour heatmaps around single or multiple unshielded/collimated sources, calculates mandatory 10 CFR § 34.41 industrial radiography restricted/public barricade boundaries, and evaluates EPA FGR-12 semi-infinite cloud/ground shine.',
    standards: [
      { org: 'US NRC', code: '10 CFR Part 34 (§ 34.41)', year: '2023', title: 'Licenses for Industrial Radiography and Radiation Safety Requirements for Radiographic Operations' },
      { org: 'IAEA', code: 'Specific Safety Guide SSG-11', year: '2011', title: 'Radiation Safety in Industrial Radiography' },
      { org: 'US EPA', code: 'Federal Guidance Report No. 12', year: '1993', title: 'External Exposure to Radionuclides in Air, Water, and Soil' }
    ],
    primaryFormula: 'd_{\\text{bound}} = \\sqrt{\\frac{\\Gamma \\cdot A \\cdot F_{\\text{coll}}(\\theta)}{\\dot{D}_{\\text{limit}}}}, \\quad \\dot{H}_{\\text{sub}} = C_{\\text{air}} \\cdot h_{\\text{sub}}, \\quad \\dot{H}_{\\text{ground}} = C_{\\text{surf}} \\cdot h_{\\text{surf}}',
    secondaryFormulas: [
      { label: '10 CFR 34.41 Public Unrestricted Area Barricade (20 µSv/h = 2 mrem/h)', formula: 'R_{2\\text{mrem/h}} = \\sqrt{\\frac{\\Gamma \\cdot A}{20.0\\text{ µSv/h}}}' },
      { label: 'High Radiation Area (HRA) Boundary Radius (1.0 mSv/h = 100 mrem/h)', formula: 'R_{\\text{HRA}} = \\sqrt{\\frac{\\Gamma \\cdot A}{1000.0\\text{ µSv/h}}}' },
      { label: 'Collimator Directional Transmission Factor (Tungsten/DU Conical Beam)', formula: 'F_{\\text{coll}}(\\theta) = \\begin{cases} 1.0 & |\\theta - \\theta_0| \\le \\theta_{\\text{beam}}/2 \\ 10^{-x_{\\text{coll}} / \\text{TVL}_{\\text{W}}} & \\text{outside primary cone} \\end{cases}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Exact Inversion of Isodose Contour Radius',
        explanation: 'For an isotropic or collimated source of activity A and specific gamma constant Γ, the locus of points receiving target dose rate Ddot_limit forms a circle (or directional lobe) of radius d_bound:',
        math: '\\dot{D}(d) = \\frac{\\Gamma \\cdot A}{d^2} = \\dot{D}_{\\text{limit}} \\implies d_{\\text{bound}} = \\sqrt{\\frac{\\Gamma \\cdot A}{\\dot{D}_{\\text{limit}}}}'
      },
      {
        stepTitle: '2. Semi-Infinite Hemispherical Cloud Submersion (EPA FGR-12)',
        explanation: 'A receptor immersed at ground level in a uniform semi-infinite cloud of concentration C_air (Bq/m³) receives half the 4π infinite-medium photon energy fluence, yielding the FGR-12 submersion coefficient h_sub:',
        math: '\\dot{D}_{\\text{sub}} = \\frac{1}{2} \\frac{C_{\\text{air}} \\cdot E_\\gamma \\cdot Y_\\gamma}{\\rho_{\\text{air}}} \\implies \\dot{H}_{\\text{sub}} = C_{\\text{air}} \\cdot h_{\\text{sub}}'
      }
    ],
    variables: [
      { symbol: 'd_{\\text{bound}}', description: 'Radial barricade distance to regulatory dose rate threshold', units: 'm (or ft)' },
      { symbol: '\\dot{D}_{\\text{limit}}', description: 'Target contour dose rate (e.g., 20 µSv/h public, 1000 µSv/h HRA)', units: 'µSv·h⁻¹' },
      { symbol: 'C_{\\text{air}}, C_{\\text{surf}}', description: 'Volumetric air concentration (Bq/m³) and areal ground deposition (Bq/m²)', units: 'Bq·m⁻³ / Bq·m⁻²' },
      { symbol: 'h_{\\text{sub}}, h_{\\text{surf}}', description: 'EPA FGR-12 dose rate conversion coefficients for air submersion and groundshine', units: '(Sv·s⁻¹)/(Bq·m⁻³)' }
    ],
    assumptions: [
      'Flat open terrain without localized trench scattering.',
      'Negligible air attenuation over short industrial radiography barricade distances (< 150 m).'
    ],
    benchmarks: 'Validated against 10 CFR 34.41 Ir-192 50 Ci barricade benchmark (VTEST-17) and EPA FGR-12 Xe-133 submersion (VTEST-18).'
  },

  // 6. Module 6
  {
    id: 'M06-FirstResponder',
    moduleId: 'Module 6',
    moduleName: 'Tactical CBRN Response',
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
    benchmarks: 'Validated against US DOT ERG 2024 Table of Initial Isolation Distances, EPA PAG-2017 Table 2-1 emergency worker guidelines, REAC/TS casualty algorithms, and VTEST-21.'
  },

  // 7. Module 7
  {
    id: 'M07-CBRNConsequence',
    moduleId: 'Module 7',
    moduleName: 'CBRN Fallout & Shelter',
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

  // 8. Module 8
  {
    id: 'M08-NukeEffects',
    moduleId: 'Module 8',
    moduleName: 'Prompt Blast & HEMP',
    domain: 'Environmental Dispersion & Response',
    title: 'Kingery-Bulmash Airblast, Height-of-Burst Mach Stem, Sub-Surface Crater/Seismic Coupling & MIL-STD-188-125 HEMP',
    overview: 'Simulates nuclear weapon effects across all burst regimes (-2,000 m underground to +500 km exo-atmospheric): Brode/Kingery-Bulmash overpressure, Height-of-Burst (HOB) Mach reflection enhancement, sub-surface Scaled Depth of Burial (SDOB), apparent crater radius/depth, teleseismic mb, thermal flashburns, prompt gamma/neutron kerma, and HEMP.',
    standards: [
      { org: 'Glasstone & Dolan', code: 'Effects of Nuclear Weapons 3rd Ed.', year: '1977', title: 'Chapters III, IV, VI, VIII, XI: Air Blast, Underground Cratering, Thermal, Initial Radiation, and EMP' },
      { org: 'US Army BRL', code: 'BRL Report 1341 / 1972', year: '1972', title: 'Kingery-Bulmash Airblast Parameters from Spherical Air Burst and Hemispherical Surface Burst' },
      { org: 'US DoD', code: 'MIL-STD-188-125-1', year: '2005', title: 'High-Altitude Electromagnetic Pulse (HEMP) Protection for Ground-Based C4I Facilities' },
      { org: 'US AEC / Sedan', code: 'PNE-242F (Project Sedan)', year: '1962', title: 'Plowshare Program Cratering and Sub-Surface Containment Scaling Laws' }
    ],
    primaryFormula: 'Z = \\frac{R}{Y^{1/3}}, \\quad \\Delta P = \\frac{A}{Z^3} + \\frac{B}{Z^2} + \\frac{C}{Z}, \\quad Q(R) = \\frac{\\eta_{\\text{th}} Y}{4\\pi R_{\\text{slant}}^2} \\tau_{\\text{atm}}, \\quad \\text{SDOB} = \\frac{|h|}{Y^{1/3}}',
    secondaryFormulas: [
      { label: 'Rankine-Hugoniot Dynamic Wind Pressure', formula: 'q(R) = \\frac{5}{2} \\frac{\\Delta P^2}{\\Delta P + 7 P_0}, \\quad P_0 = 14.7\\text{ psi}' },
      { label: 'Optimum Height of Burst (HOB) & Mach Stem Reflection Factor', formula: 'h_{\\text{scaled}} = \\frac{h}{Y^{1/3}}, \\quad R_{\\text{slant}} = \\sqrt{R_{\\text{ground}}^2 + h^2}' },
      { label: 'Sub-Surface Apparent Crater Radius & Depth (Sedan Empirical Scaling)', formula: 'R_a = 18.0 \\cdot Y^{0.30} \\cdot f_{\\text{DOB}}(\\text{SDOB}) \\quad [\\text{m}], \\quad D_a = 0.50 \\cdot R_a' },
      { label: 'HEMP Line-of-Sight Horizon Footprint & E1 Double-Exponential Pulse', formula: 'R_{\\text{horizon}} = \\sqrt{2 R_E h + h^2}, \\quad E_1(t) = E_0 k \\left(e^{-\\alpha t} - e^{-\\beta t}\\right)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Hopkinson-Cranz Cube-Root Blast Scaling & Mach Stem Enhancement',
        explanation: 'At equivalent scaled distance Z = R / Y^(1/3), blast waves exhibit identical overpressures. For an airburst at height h > 0, the spherical incident wave reflects off the ground; when the reflection angle exceeds ~40°, the reflected wave overtakes the incident wave to form a vertical Mach stem that extends the 5–20 psi damage radius by up to 35%:',
        math: 'Z_{\\text{slant}} = \\frac{\\sqrt{R_{\\text{ground}}^2 + h^2}}{Y^{1/3}}, \\quad \\text{SHOB} = \\frac{h}{Y^{1/3}}'
      },
      {
        stepTitle: '2. Sub-Surface Scaled Depth of Burial (SDOB) & Cratering Mechanics',
        explanation: 'For underground detonations (h < 0), throw-out crater volume peaks near SDOB = |h| / Y^(1/3) ≈ 42 m/kt^(1/3) (Project Sedan 104 kt benchmark). Beyond SDOB ≥ 120 m/kt^(1/3) (Baneberry threshold), the cavity is fully contained with only surface spall or a rubble collapse sink (retarc):',
        math: '\\text{SDOB} = \\frac{|h|}{Y^{1/3}} \\implies \\begin{cases} < 60\\text{ m/kt}^{1/3}: & \\text{Throw-out Crater + Base Surge} \\ 60-120\\text{ m/kt}^{1/3}: & \\text{Retarc Mound / Partial Venting} \\ \\ge 120\\text{ m/kt}^{1/3}: & \\text{Fully Contained Camouflet Cavity} \\end{cases}'
      },
      {
        stepTitle: '3. Rankine-Hugoniot Dynamic Pressure & Thermal Fluence',
        explanation: 'From ideal diatomic gas shock relations (γ = 1.4), dynamic wind pressure behind the shock front scales as ΔP² / (ΔP + 7P_0). Thermal radiant exposure Q(R) attenuates by inverse slant-distance squared and atmospheric visibility transmission τ_atm:',
        math: 'q = \\frac{5 \\Delta P^2}{2(\\Delta P + 7 P_0)}, \\quad Q(R) = \\frac{\\eta_{\\text{th}} \\cdot (4.184 \\times 10^{12} \\, Y_{\\text{kt}})}{4\\pi (R^2 + h^2)} \\cdot \\tau_{\\text{atm}}'
      }
    ],
    variables: [
      { symbol: 'Y', description: 'Nuclear weapon total explosive yield', units: 'kt TNT equivalent' },
      { symbol: 'h', description: 'Height of Burst (+m for airburst/exo-atmospheric, -m for underground depth of burial)', units: 'm' },
      { symbol: '\\Delta P, q', description: 'Peak static incident overpressure and dynamic wind pressure', units: 'psi' },
      { symbol: 'Q', description: 'Prompt thermal radiation energy fluence at target', units: 'cal·cm⁻²' },
      { symbol: '\\text{SDOB}', description: 'Scaled Depth of Burial for underground detonations (|h| / Y^(1/3))', units: 'm·kt⁻¹/³' },
      { symbol: 'R_a, D_a', description: 'Apparent throw-out crater lip radius and depth', units: 'm' }
    ],
    assumptions: [
      'Sea-level standard atmosphere P0 = 14.7 psi (101.325 kPa) for blast scaling.',
      'Thermal partition fraction η_th ≈ 0.35 for atmospheric bursts, suppressed exponentially for sub-surface bursts.'
    ],
    benchmarks: 'Validated against Glasstone & Dolan 3rd Ed. blast/thermal curves, BRL Kingery-Bulmash tables, Project Sedan cratering benchmarks, and VTEST-29.'
  },

  // 9. Module 9
  {
    id: 'M09-MedCountermeasures',
    moduleId: 'Module 9',
    moduleName: 'Medical Countermeasures',
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

  // 10. Module 10
  {
    id: 'M10-TacticalGIS',
    moduleId: 'Module 10',
    moduleName: 'Tactical GIS & ATAK Hub',
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

  // 11. Module 11
  {
    id: 'M11-Scenarios',
    moduleId: 'Module 11',
    moduleName: 'Incident Scenario Drills',
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

  // 12. Module 12
  {
    id: 'M12-Responder',
    moduleId: 'Module 12',
    moduleName: 'Reverse Triangulation',
    domain: 'Environmental Dispersion & Response',
    title: 'Inverse-Square Standoff Source Reconstruction, Multi-Point Triangulation, Shielding Deduction & Activation Forensics',
    overview: 'Reconstructs unknown orphan source activity A, 2D/3D spatial coordinates (x_s, y_s), intervening shield thickness x, and neutron fluence from standoff survey meter readings or comparator foil activation.',
    standards: [
      { org: 'IAEA', code: 'TECDOC-1388', year: '2004', title: 'Strengthening Control over Radioactive Sources in Authorized Use and Regaining Control over Orphan Sources' },
      { org: 'ANSI / IEEE', code: 'ANSI N42.34', year: '2015', title: 'Performance Criteria for Hand-Held Instruments for the Detection and Identification of Radionuclides' },
      { org: 'IAEA', code: 'TECDOC-1215', year: '2001', title: 'Comparator Neutron Activation Forensics & Flux Reconstruction' }
    ],
    primaryFormula: 'A_{\\text{est}} = \\frac{(\\dot{D}_{\\text{meas}} - \\dot{D}_{\\text{bg}}) \\cdot d^2}{\\Gamma \\cdot B(\\mu x) \\cdot e^{-\\mu x}}, \\quad \\frac{\\dot{D}_1}{\\dot{D}_2} = \\left(\\frac{d + \\Delta d}{d}\\right)^2 \\implies d = \\frac{\\Delta d}{\\sqrt{\\dot{D}_1 / \\dot{D}_2} - 1}',
    secondaryFormulas: [
      { label: 'Two-Point Standoff Distance Deduction (Unknown Source Position)', formula: 'd_1 = \\frac{\\Delta d}{\\sqrt{\\dot{D}_1 / \\dot{D}_2} - 1} \\quad [\\text{where } \\dot{D}_1 \\text{ is measured at } d_1 \\text{ and } \\dot{D}_2 \\text{ at } d_1 + \\Delta d]' },
      { label: 'Intervening Shield Thickness Deduction from Known Source Activity', formula: 'x_{\\text{shield}} = \\frac{1}{\\mu} \\ln\\left(\\frac{A \\cdot \\Gamma}{\\dot{D}_{\\text{meas}} \\cdot d^2}\\right) = \\text{TVL} \\cdot \\log_{10}\\left(\\frac{\\dot{D}_{\\text{unshielded}}}{\\dot{D}_{\\text{meas}}}\\right)' },
      { label: 'Comparator Neutron Activation Trace Element Mass Reconstruction', formula: 'm_x = m_{\\text{std}} \\cdot \\frac{C_{p,x}}{C_{p,\\text{std}}} \\cdot \\frac{(1 - e^{-\\lambda_{\\text{std}} t_i}) e^{-\\lambda_{\\text{std}} t_d}}{(1 - e^{-\\lambda_x t_i}) e^{-\\lambda_x t_d}} \\cdot \\frac{\\epsilon_{\\text{std}} I_{\\gamma,\\text{std}}}{\\epsilon_x I_{\\gamma,x}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Two-Reading Standoff Distance Localization Without Entering Hotzone',
        explanation: 'A responder measures net dose rate Ddot_1 at an unknown distance d_1 from a concealed source, steps back a known distance Δd (so d_2 = d_1 + Δd), and records Ddot_2. Taking the square root of the inverse-square ratio eliminates unknown activity A·Γ:',
        math: '\\frac{\\dot{D}_1}{\\dot{D}_2} = \\left(\\frac{d_1 + \\Delta d}{d_1}\\right)^2 \\implies \\sqrt{\\frac{\\dot{D}_1}{\\dot{D}_2}} = 1 + \\frac{\\Delta d}{d_1} \\implies d_1 = \\frac{\\Delta d}{\\sqrt{\\dot{D}_1 / \\dot{D}_2} - 1}'
      },
      {
        stepTitle: '2. Multi-Sensor Planar Triangulation via Linearized Distance Spheres',
        explanation: 'Given 3 or more spatial survey measurements (x_i, y_i, Ddot_i), each ratio Ddot_i / Ddot_j defines an Apollonius circle of constant distance ratio r_i / r_j = sqrt(Ddot_j / Ddot_i), whose intersection pinpoints (x_s, y_s) and source strength A:',
        math: '(x_s - x_i)^2 + (y_s - y_i)^2 = \\frac{A \\cdot \\Gamma}{\\dot{D}_i - \\dot{D}_{\\text{bg}}}'
      }
    ],
    variables: [
      { symbol: 'A_{\\text{est}}', description: 'Reconstructed orphan source activity', units: 'GBq or Ci' },
      { symbol: 'd_1, \\Delta d', description: 'Initial unknown distance to source and known step-back standoff increment', units: 'm' },
      { symbol: '\\dot{D}_1, \\dot{D}_2', description: 'Background-subtracted ambient dose rates at positions 1 and 2', units: 'µSv·h⁻¹' },
      { symbol: 'x_{\\text{shield}}', description: 'Deduced intervening barrier thickness', units: 'cm' }
    ],
    assumptions: [
      'Collinear step-back trajectory along radial vector from point source.',
      'Constant ambient background subtracted prior to ratio calculation.'
    ],
    benchmarks: 'Validated against IAEA TECDOC-1388 orphan source recovery algorithms and VTEST-20 / VTEST-32.'
  },

  // 13. Module 13
  {
    id: 'M13-Plume',
    moduleId: 'Module 13',
    moduleName: 'Plume Atmospheric Model',
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

  // 14. Module 14
  {
    id: 'M14-Shielding',
    moduleId: 'Module 14',
    moduleName: 'Shielding & ALARA PAGs',
    domain: 'Dose, Transport & Shielding',
    title: 'Broder Multi-Layer Composite Shielding, NUREG-1530 ALARA Cost-Benefit Optimization & EPA Early-Phase PAGs',
    overview: 'Solves stratified multi-layer composite shields (Lead + Steel + Concrete + Water) using Broder empirical buildup recurrence, performs quantitative ALARA cost-benefit optimization ($/person-Sv), and evaluates EPA Early-Phase Protective Action Guides (Evacuation vs Sheltering).',
    standards: [
      { org: 'ANSI/ANS', code: '6.4.3-1991', year: '1991', title: 'Gamma-Ray Attenuation Coefficients and Buildup Factors for Engineering Materials' },
      { org: 'Broder et al.', code: 'Sov. J. At. Energy 12', year: '1962', title: 'Application of the Generalized Empirical Buildup Factor for Multi-Layer Shields' },
      { org: 'US NRC', code: 'NUREG-1530 Rev. 1', year: '2022', title: 'Reassessment of NRC Dollar Per Person-Rem Conversion Factor Policy' },
      { org: 'US EPA', code: 'EPA-400/R-17/001', year: '2017', title: 'PAG Manual: Protective Action Guides and Planning Guidance for Radiological Incidents' }
    ],
    primaryFormula: 'B_N\\left(\\sum_{i=1}^N \\mu_i x_i\\right) = \\sum_{n=1}^N B_n\\left(\\sum_{i=1}^n \\mu_i x_i\\right) - \\sum_{n=1}^{N-1} B_{n+1}\\left(\\sum_{i=1}^n \\mu_i x_i\\right), \\quad \\frac{\\Delta X}{\\Delta S} \\le \\alpha_{\\text{ALARA}}',
    secondaryFormulas: [
      { label: 'Two-Layer Composite Shield Buildup (High-Z Lead Preceding Low-Z Concrete)', formula: 'B_{1+2}(\\mu_1 x_1, \\mu_2 x_2) = B_2(\\mu_1 x_1 + \\mu_2 x_2) + \\left[B_1(\\mu_1 x_1) - B_2(\\mu_1 x_1)\\right] e^{-\\mu_2 x_2}' },
      { label: 'ALARA Collective Dose Averted Valuation Criterion', formula: '\\Delta X \\le \\alpha \\cdot \\Delta S = \\alpha \\cdot N_{\\text{workers}} \\cdot (\\bar{E}_{\\text{base}} - \\bar{E}_{\\text{shielded}}) \\quad [\\alpha_{\\text{NRC}} = \\$520,000 / \\text{person-Sv}]' },
      { label: 'EPA Early-Phase Protective Action Guide (PAG) Evacuation Ratio', formula: 'R_{\\text{PAG}} = \\frac{\\text{TEDE}_{\\text{4-day}}}{\\text{PAG}_{\\text{evac}}}, \\quad \\text{PAG}_{\\text{evac}} = 10\\text{ mSv (1 rem)}, \\quad \\text{PAG}_{\\text{KI}} = 50\\text{ mGy Child Thyroid}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Broder Recurrence Relation for Stratified Multi-Layer Slabs',
        explanation: 'In a composite shield of N distinct layers with optical thicknesses τ_i = μ_i x_i, each interface alters the Compton scatter angular and energy spectrum. Broder (1962) showed that the incremental buildup contribution across layer n is governed by the difference between material n and material n+1 evaluated at the cumulative optical depth:',
        math: 'B_{\\text{total}} = B_N(\\tau_{\\text{total}}) + \\sum_{n=1}^{N-1} \\left[ B_n\\left(\\sum_{i=1}^n \\tau_i\\right) - B_{n+1}\\left(\\sum_{i=1}^n \\tau_i\\right) \\right]'
      },
      {
        stepTitle: '2. ICRP 101 / NUREG-1530 Differential Cost-Benefit Optimization',
        explanation: 'Total societal cost is the sum of protection expenditure X and radiation detriment cost Y = α·S. Minimizing X + α·S with respect to shielding thickness x yields the marginal ALARA optimality condition:',
        math: '\\frac{d}{dx}(X(x) + \\alpha S(x)) = 0 \\implies -\\frac{dX}{dS} = \\alpha \\implies \\frac{\\Delta X}{\\Delta S} \\le \\alpha'
      }
    ],
    variables: [
      { symbol: 'B_N', description: 'Composite multi-layer photon buildup factor across N strata', units: 'dimensionless' },
      { symbol: '\\mu_i x_i', description: 'Optical thickness (mean free paths) of the i-th shield layer', units: 'mfp (dimensionless)' },
      { symbol: '\\alpha_{\\text{ALARA}}', description: 'Monetary valuation per unit collective dose averted ($5,200/person-rem)', units: 'USD·(person-Sv)⁻¹' },
      { symbol: '\\Delta S', description: 'Collective occupational or public dose averted by shielding upgrade', units: 'person-Sv' }
    ],
    assumptions: [
      'Layer ordering is respected: placing high-Z (Lead) before low-Z (Concrete) suppresses low-energy Compton scatter buildup.',
      'Projected EPA PAG dose integrates 4-day (96-hour) early-phase plume exposure.'
    ],
    benchmarks: 'Validated against MCNP6 multi-layer benchmarks, NRC NUREG-1530 Rev. 1 criteria, and EPA PAG evacuation threshold (VTEST-21).'
  },

  // 15. Module 15
  {
    id: 'M15-Transport',
    moduleId: 'Module 15',
    moduleName: 'Transport Packaging',
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

  // 16. Module 16
  {
    id: 'M16-PulsedXRay',
    moduleId: 'Module 16',
    moduleName: 'Pulsed & Flash X-Ray',
    domain: 'Non-Ionizing EMR & Lasers',
    title: 'Flash Pulsed Radiography Nanosecond Instantaneous Flux, Marx Bank Discharge & Active Detector Paralyzation',
    overview: 'Models battery-powered cold-cathode flash X-ray generators (Golden Engineering XR200/XRS-3) and industrial pulsed LINACs: calculates peak instantaneous dose rate during nanosecond bursts, Marx capacitor bank discharge energy, and Geiger-Müller / proportional counter dead-time paralyzation.',
    standards: [
      { org: 'ANSI / HPS', code: 'ANSI N43.3-2008', year: '2008', title: 'Installations Using Non-Medical X-Ray and Sealed Gamma-Ray Sources, Energies Up to 10 MeV' },
      { org: 'ICRU', code: 'Report 34', year: '1982', title: 'The Dosimetry of Pulsed Radiation' },
      { org: 'NBS / NIST', code: 'Handbook 114', year: '1975', title: 'General Safety Standard for Installations Using Non-Medical X-Ray and Sealed Gamma-Ray Sources' }
    ],
    primaryFormula: '\\dot{D}_{\\text{inst}} = \\frac{D_{\\text{pulse}}}{\\tau_{\\text{pulse}}} \\times 3.6 \\times 10^{-3} \\quad [\\text{Sv/h}], \\quad D_{\\text{train}} = N_{\\text{pulses}} \\cdot D_{\\text{pulse}, 0} \\cdot \\left(\\frac{d_0}{d}\\right)^2',
    secondaryFormulas: [
      { label: 'Time-Averaged Dose Rate at Pulse Repetition Frequency f_rep (Hz)', formula: '\\dot{D}_{\\text{avg}} = D_{\\text{pulse}} \\cdot f_{\\text{rep}} \\cdot 3600 \\quad [\\mu\\text{Sv/h}]' },
      { label: 'Active Counter Max Recorded Rate Under Ultra-Short Pulse (τ_pulse << τ_dead)', formula: 'm_{\\text{max}} \\le f_{\\text{rep}} \\quad [\\text{At most 1 count registered per X-ray burst regardless of true photon flux}]' },
      { label: 'Marx Bank Stored Electrostatic Pulse Energy', formula: 'E_{\\text{Marx}} = \\frac{1}{2} C_{\\text{eq}} V_{\\text{out}}^2 = \\frac{1}{2} N_{\\text{stages}} C_{\\text{stage}} V_{\\text{charge}}^2 \\quad [\\text{Joules}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Nanosecond Peak Instantaneous Flux Rate',
        explanation: 'A flash X-ray unit (e.g., XR200) delivers D_pulse ≈ 2.70 µSv at 30 cm in a single FWHM pulse of τ_pulse = 50 ns (5×10⁻⁸ s). Converting the instantaneous dose rate during the burst to Sv/h:',
        math: '\\dot{D}_{\\text{inst}} = \\frac{2.70 \\times 10^{-6}\\text{ Sv}}{50 \\times 10^{-9}\\text{ s}} = 54.0\\text{ Sv/s} = 194,400\\text{ Sv/h} = 194.40\\text{ kSv/h}'
      },
      {
        stepTitle: '2. Catastrophic Under-Response of Active Pulse Counters in Pulsed Fields',
        explanation: 'Because the 50 ns X-ray burst is 1,000× shorter than a Geiger-Müller or NaI detector resolving dead time (τ_dead ≈ 50–200 µs), all photons arriving in a burst coalesce into a single electronic pulse. At repetition rate f_rep = 25 Hz, the meter reads at most 25 cps even in a lethal field, mandating integrating passive dosimeters (TLD/OSLD/Ion Chamber):',
        math: '\\tau_{\\text{pulse}} \\ll \\tau_{\\text{dead}} \\implies N_{\\text{recorded per pulse}} \\le 1 \\implies m_{\\text{apparent}} = f_{\\text{rep}}'
      }
    ],
    variables: [
      { symbol: '\\dot{D}_{\\text{inst}}', description: 'Peak instantaneous dose equivalent rate during the nanosecond X-ray pulse', units: 'kSv·h⁻¹ or Sv·s⁻¹' },
      { symbol: 'D_{\\text{pulse}}', description: 'Integrated dose delivered per individual X-ray pulse', units: 'µSv or mR' },
      { symbol: '\\tau_{\\text{pulse}}', description: 'Full-width at half-maximum (FWHM) X-ray pulse duration (typically 10–100 ns)', units: 'ns' },
      { symbol: 'f_{\\text{rep}}', description: 'Pulse repetition frequency of generator', units: 'Hz (pulses·s⁻¹)' }
    ],
    assumptions: [
      'Rectangular or Gaussian temporal pulse profile of effective width τ_pulse.',
      'Ionization chambers operated with sufficient bias voltage to prevent volume ion recombination (ICRU 34 Boag correction).'
    ],
    benchmarks: 'Validated against Golden Engineering XR200 technical specifications, ICRU Report 34 pulsed dosimetry, and VTEST-08.'
  },

  // 17. Module 17
  {
    id: 'M17-XRayTube',
    moduleId: 'Module 17',
    moduleName: 'X-Ray Tube Simulator',
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

  // 18. Module 18
  {
    id: 'M18-XRayDistortion',
    moduleId: 'Module 18',
    moduleName: 'X-Ray Distortion & Geometry',
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

  // 19. Module 19
  {
    id: 'M19-Laser',
    moduleId: 'Module 19',
    moduleName: 'Laser Safety & NOHD',
    domain: 'Non-Ionizing EMR & Lasers',
    title: 'ANSI Z136.1 Laser Nominal Ocular Hazard Distance (NOHD), MPE & Optical Density (OD)',
    overview: 'Calculates Nominal Ocular Hazard Distance (NOHD), Maximum Permissible Exposure (MPE), and protective eyewear Optical Density (OD) for continuous-wave (CW) and pulsed Q-switched lasers across UV, Visible, and Infrared bands (180 nm to 1 mm).',
    standards: [
      { org: 'ANSI / LIA', code: 'ANSI Z136.1-2022', year: '2022', title: 'American National Standard for Safe Use of Lasers' },
      { org: 'IEC', code: 'IEC 60825-1:2014', year: '2014', title: 'Safety of laser products - Part 1: Equipment classification and requirements' },
      { org: 'ICNIRP', code: 'Laser Guidelines', year: '2013', title: 'ICNIRP Guidelines on Limits of Exposure to Laser Radiation of Wavelengths between 180 nm and 1,000 µm' }
    ],
    primaryFormula: 'r_{\\text{NOHD}} = \\frac{1}{\\theta} \\left( \\sqrt{\\frac{4 \\Phi}{\\pi \\cdot \\text{MPE}}} - a \\right), \\quad \\text{OD} = \\log_{10}\\left(\\frac{E_0}{\\text{MPE}}\\right)',
    secondaryFormulas: [
      { label: 'Gaussian Beam Diameter at Distance r', formula: 'd(r) = a + r \\cdot \\theta \\quad [\\text{cm}]' },
      { label: 'Beam Irradiance at Distance r', formula: 'E(r) = \\frac{4 \\Phi}{\\pi (a + r \\theta)^2} \\quad [\\text{W/cm}^2]' },
      { label: 'Optical Density Attenuation Factor', formula: 'T = 10^{-\\text{OD}} \\iff E_{\\text{transmitted}} = E_0 \\cdot 10^{-\\text{OD}} \\le \\text{MPE}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Gaussian Beam Divergence & Irradiance',
        explanation: 'A laser beam with initial exit aperture diameter a and full-angle divergence θ expands linearly with distance r, distributing radiant power Φ over area π d(r)² / 4:',
        math: 'E(r) = \\frac{\\Phi}{\\frac{\\pi}{4}(a + r\\theta)^2} = \\frac{4\\Phi}{\\pi (a + r\\theta)^2}'
      },
      {
        stepTitle: '2. Nominal Ocular Hazard Distance (NOHD) Inversion',
        explanation: 'Setting beam irradiance E(r) equal to the wavelength- and duration-specific Maximum Permissible Exposure (MPE) and solving for r yields the NOHD safety perimeter:',
        math: '\\frac{4\\Phi}{\\pi (a + r_{\\text{NOHD}} \\theta)^2} = \\text{MPE} \\implies r_{\\text{NOHD}} = \\frac{\\sqrt{\\frac{4\\Phi}{\\pi \\cdot \\text{MPE}}} - a}{\\theta}'
      }
    ],
    variables: [
      { symbol: 'r_{\\text{NOHD}}', description: 'Nominal Ocular Hazard Distance within which beam irradiance exceeds MPE', units: 'm' },
      { symbol: '\\Phi', description: 'Laser continuous-wave radiant output power', units: 'W' },
      { symbol: '\\text{MPE}', description: 'Maximum Permissible Exposure at cornea for specified wavelength and duration', units: 'W·cm⁻² or J·cm⁻²' },
      { symbol: 'a', description: 'Emergent laser beam waist diameter at exit aperture', units: 'cm or mm' },
      { symbol: '\\theta', description: 'Full-angle far-field beam divergence', units: 'rad or mrad' },
      { symbol: '\\text{OD}', description: 'Required protective eyewear Optical Density at laser wavelength', units: 'dimensionless' }
    ],
    assumptions: [
      'Intrabeam viewing with 7 mm dilated dark-adapted pupil aperture in visible/near-IR retinal hazard region (400–1400 nm).',
      'Aversion response time of 0.25 seconds applied for visible CW lasers (400–700 nm).'
    ],
    benchmarks: 'Validated against ANSI Z136.1-2022 Table 5b MPE values, Equation B1 NOHD benchmarks, and VTEST-10.'
  },

  // 20. Module 20
  {
    id: 'M20-EMR',
    moduleId: 'Module 20',
    moduleName: 'EW EMR & Microwave',
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
    derivationSteps: [
      {
        stepTitle: '1. Fraunhofer Far-Field Phase Coherence Criterion',
        explanation: 'At distance R from an aperture of diameter D, the path-length difference between center and edge rays is Δr ≈ D² / (2R). Requiring phase error Δφ = (2π/λ)Δr ≤ π/8 yields the Fraunhofer far-field boundary R_ff:',
        math: '\\frac{2\\pi}{\\lambda} \\frac{D^2}{2 R_{\\text{ff}}} = \\frac{\\pi}{2} \\implies R_{\\text{ff}} = \\frac{2 D^2}{\\lambda} = \\frac{2 D^2 f}{c}'
      },
      {
        stepTitle: '2. Equivalent Isotropically Radiated Power (EIRP) Inverse-Square Law',
        explanation: 'In the far field (R ≥ R_ff), time-averaged transmitter power P_avg = P_peak × DF focused by numeric antenna gain G spreads across spherical area 4πR²:',
        math: 'S_{\\text{far}}(R) = \\frac{P_{\\text{peak}} \\cdot \\text{DF} \\cdot G}{4\\pi R^2} \\le S_{\\text{MPE}} \\implies R_{\\text{safe}} = \\sqrt{\\frac{P_{\\text{peak}} \\cdot \\text{DF} \\cdot G}{4\\pi \\cdot S_{\\text{MPE}}}}'
      }
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

  // 21. Module 21
  {
    id: 'M21-Criticality',
    moduleId: 'Module 21',
    moduleName: 'Criticality & Reactor Core',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Four-Factor Lattice Physics, 2D Jacobi Diffusion, ANSI/ANS-8.1 Subcritical Limits & 6-Group Nordheim Inhour Kinetics',
    overview: 'Comprehensive nuclear reactor and criticality safety suite: simulates 2D heterogeneous assembly diffusion and radial power peaking F_xy, evaluates ANSI/ANS-8.1 single-parameter subcritical limits and solid-angle array interaction, and solves the 6-group delayed neutron Nordheim Inhour equation.',
    standards: [
      { org: 'ANS / ANSI', code: 'ANSI/ANS-8.1-2014', year: '2014', title: 'Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors' },
      { org: 'IAEA', code: 'SSG-27 / TECDOC-808', year: '2014', title: 'Criticality Safety in the Handling of Fissile Material & LWR Benchmarks' },
      { org: 'Keepin', code: 'Physics of Nuclear Kinetics', year: '1965', title: 'Delayed Neutron Precursor Groups & Inhour Reactivity Equations' },
      { org: 'Lamarsh & Baratta', code: 'Introduction to Nuclear Engineering 3rd Ed.', year: '2001', title: 'Heterogeneous Core Diffusion and Six-Factor Multiplication' }
    ],
    primaryFormula: 'k_{\\text{eff}} = \\frac{\\eta \\cdot f \\cdot p \\cdot \\varepsilon}{(1 + L_s^2 B_g^2)(1 + L_d^2 B_g^2)}, \\quad \\rho = \\frac{k_{\\text{eff}} - 1}{k_{\\text{eff}}} = \\frac{\\ell^*}{k_{\\text{eff}} T} + \\sum_{i=1}^6 \\frac{\\beta_i}{1 + \\lambda_i T}',
    secondaryFormulas: [
      { label: '2D Finite-Difference Jacobi Flux Iteration & Peaking Factor F_xy', formula: '\\phi_{i,j}^{(k+1)} = \\frac{\\frac{D}{\\Delta^2}(\\phi_{i+1,j} + \\phi_{i-1,j} + \\phi_{i,j+1} + \\phi_{i,j-1}) + \\frac{1}{k_{\\text{eff}}}\\nu\\Sigma_f \\phi_{i,j}}{\\frac{4D}{\\Delta^2} + \\Sigma_a(i,j)}, \\quad F_{xy} = \\frac{\\max P(r,c)}{P_{\\text{avg}}}' },
      { label: 'ANSI/ANS-8.1 Multi-Unit Solid Angle Interaction Criterion', formula: '\\Omega_{\\text{total}} = \\sum_{m=1}^M \\frac{2\\pi R_m^2}{d_m^2} \\le \\Omega_{\\text{allow}} = 9 - 10 k_{\\text{eff, unit}}' },
      { label: 'Reactivity in Dollars ($) & Prompt-Critical Period (ρ > β_eff)', formula: '\\$ = \\frac{\\rho}{\\beta_{\\text{eff}}}, \\quad T_{\\text{prompt}} \\approx \\frac{\\ell^*}{\\rho - \\beta_{\\text{eff}}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Six-Factor Neutron Balance & Geometric Buckling Eigenvalue',
        explanation: 'In a finite multiplying assembly of geometric buckling B_g², infinite medium multiplication k_∞ = η·f·p·ε is reduced by fast (1 + L_s² B_g²)⁻¹ and thermal (1 + L_d² B_g²)⁻¹ non-leakage probabilities:',
        math: 'k_{\\text{eff}} = k_\\infty \\cdot P_{\\text{FNL}} \\cdot P_{\\text{TNL}} = \\frac{\\eta f p \\varepsilon}{(1 + L_s^2 B_g^2)(1 + L_d^2 B_g^2)} \\approx \\frac{k_\\infty}{1 + M^2 B_g^2}'
      },
      {
        stepTitle: '2. Point Reactor Kinetics & Nordheim 6-Group Inhour Equation',
        explanation: 'Coupling neutron population n(t) with 6 delayed precursor concentrations C_i(t) and substituting asymptotic exponential growth n(t) = n_0 e^(t/T) yields the characteristic 7-root Inhour relation:',
        math: '\\frac{dn}{dt} = \\frac{\\rho - \\beta}{\\ell^*} n + \\sum_{i=1}^6 \\lambda_i C_i \\implies \\rho = \\frac{\\ell^*}{T} + \\sum_{i=1}^6 \\frac{\\beta_i}{1 + \\lambda_i T}'
      },
      {
        stepTitle: '3. Heterogeneous 2D Finite-Difference Discretization',
        explanation: 'Discretizing -D∇²φ + Σ_a φ = (1/k_eff) νΣ_f φ on a square assembly lattice of pitch Δ yields the Jacobi point-relaxation solver for spatial flux distribution φ(i,j) and thermal peaking factor F_xy:',
        math: 'F_{xy} = \\frac{\\max_{(r,c)} [\\kappa \\Sigma_f(r,c) \\phi(r,c)]}{\\frac{1}{N_{\\text{fuel}}} \\sum \\kappa \\Sigma_f \\phi} \\le 1.65'
      }
    ],
    variables: [
      { symbol: 'k_{\\text{eff}}, k_\\infty', description: 'Effective and infinite-medium neutron multiplication factors', units: 'dimensionless' },
      { symbol: '\\rho', description: 'Core reactivity ((k_eff - 1)/k_eff)', units: 'dimensionless, pcm, or Dollars ($)' },
      { symbol: '\\beta_{\\text{eff}}', description: 'Effective delayed neutron fraction (0.0065 for U-235, 0.0021 for Pu-239)', units: 'dimensionless' },
      { symbol: 'T', description: 'Asymptotic stable reactor period (e-folding time)', units: 's' },
      { symbol: 'F_{xy}', description: 'Radial assembly power peaking factor', units: 'dimensionless' }
    ],
    assumptions: [
      'Diffusion theory valid outside strongly absorbing control rod interiors.',
      'Keepin 6-group delayed neutron parameters evaluated for thermal U-235 or fast Pu-239 fission.'
    ],
    benchmarks: 'Validated against IAEA light-water reactor lattice benchmark k_∞ = 1.3420 (VTEST-13) and ANSI/ANS-8.1 Table 1 limits.'
  },

  // 22. Module 22
  {
    id: 'M22-CAAS',
    moduleId: 'Module 22',
    moduleName: 'CAAS Criticality Alarms',
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

  // 23. Module 23
  {
    id: 'M23-MonteCarlo',
    moduleId: 'Module 23',
    moduleName: 'Monte Carlo Micro-Kernel',
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

  // 24. Module 24
  {
    id: 'M24-Decay',
    moduleId: 'Module 24',
    moduleName: 'Radiolysis & Decay Chains',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'Bateman Multi-Generation Decay ODEs, Transient Equilibrium & Water Radiolysis H₂ Flammability Kinetics',
    overview: 'Solves coupled multi-generation Bateman decay chains (secular/transient equilibrium and decay heat) alongside aqueous radiolysis G-value hydrogen gas generation, headspace pressure buildup, and time to reach the 4.0% Lower Flammability Limit (LFL) in sealed waste tanks/casks.',
    standards: [
      { org: 'Bateman', code: 'Proc. Cambridge Phil. Soc. 15', year: '1910', title: 'The Solution of a System of Differential Equations Occurring in the Theory of Radioactive Transformations' },
      { org: 'US NRC', code: 'NUREG/CR-6673', year: '2000', title: 'Hydrogen Generation in TRU Waste Transportation Packages (Radiolysis G-Values)' },
      { org: 'US DOE', code: 'DOE-STD-5506-2021', year: '2021', title: 'Preparation of Safety Basis Document for Transuranic (TRU) Waste Facilities (4% H2 LFL Criterion)' }
    ],
    primaryFormula: 'N_n(t) = N_1(0) \\left(\\prod_{i=1}^{n-1} \\lambda_i\\right) \\sum_{i=1}^n \\frac{e^{-\\lambda_i t}}{\\prod_{j \\ne i} (\\lambda_j - \\lambda_i)}, \\quad n_{\\text{H}_2}(t) = \\frac{E_{\\text{dep}}(t) \\cdot G(\\text{H}_2)}{100\\text{ eV} \\cdot N_A}',
    secondaryFormulas: [
      { label: 'Transient Equilibrium Daughter Activity Peak Time (t_max)', formula: 't_{\\max} = \\frac{\\ln(\\lambda_2 / \\lambda_1)}{\\lambda_2 - \\lambda_1}, \\quad A_2(t) = A_1(0) \\frac{\\lambda_2}{\\lambda_2 - \\lambda_1}(e^{-\\lambda_1 t} - e^{-\\lambda_2 t})' },
      { label: 'LET-Weighted Effective Radiolytic Hydrogen G-Value', formula: 'G_{\\text{eff}}(\\text{H}_2) = f_\\alpha G_\\alpha(\\text{H}_2) + f_{\\beta\\gamma} G_{\\beta\\gamma}(\\text{H}_2) \\quad [G_\\alpha \\approx 1.6, \\, G_{\\beta\\gamma} \\approx 0.45 \\text{ molecules/100 eV}]' },
      { label: 'Sealed Cask Headspace H₂ Volume Fraction & Time to 4% LFL', formula: 'y_{\\text{H}_2}(t) = \\frac{P_{\\text{H}_2}(t)}{P_0 + P_{\\text{H}_2}(t)} = \\frac{n_{\\text{H}_2}(t) R T / V_{\\text{head}}}{P_0 + n_{\\text{H}_2}(t) R T / V_{\\text{head}}} \\le 0.04 \\text{ (LFL)}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Laplace Transform Solution of Coupled Bateman Decay Chain',
        explanation: 'Applying the Laplace transform L{N_i(t)} = n_i(s) to dN_i/dt = λ_{i-1} N_{i-1} - λ_i N_i converts the coupled differential system into an algebraic product over poles s = -λ_j, which inverts via partial fractions to the Bateman sum:',
        math: 'n_n(s) = \\frac{N_1(0) \\prod_{i=1}^{n-1} \\lambda_i}{\\prod_{j=1}^n (s + \\lambda_j)} \\implies N_n(t) = N_1(0) \\left(\\prod_{i=1}^{n-1} \\lambda_i\\right) \\sum_{i=1}^n \\frac{e^{-\\lambda_i t}}{\\prod_{j \\ne i} (\\lambda_j - \\lambda_i)}'
      },
      {
        stepTitle: '2. Radiolytic Hydrogen Molar Yield & Ideal Gas Headspace Accumulation',
        explanation: 'Ionizing radiation breaks H₂O bonds into H• and OH• radicals that recombine into dissolved and gaseous H₂. For absorbed radiation energy E_dep(t) = ∫ P_decay(t) dt (in eV), the molar yield of H₂ gas in headspace volume V_head at temperature T is:',
        math: 'P_{\\text{H}_2}(t) = \\frac{n_{\\text{H}_2}(t) \\cdot R \\cdot T}{V_{\\text{head}}} = \\frac{G_{\\text{eff}}(\\text{H}_2)}{100\\text{ eV} \\cdot N_A} \\cdot \\frac{R T}{V_{\\text{head}}} \\int_0^t P_{\\text{rad}}(\\tau) \\, d\\tau'
      }
    ],
    variables: [
      { symbol: 'N_n(t), A_n(t)', description: 'Atom population and activity of the n-th decay chain member at time t', units: 'atoms / Bq' },
      { symbol: 't_{\\max}', description: 'Elapsed time to maximum daughter activity in transient equilibrium', units: 'h or s' },
      { symbol: 'G(\\text{H}_2)', description: 'Radiolytic chemical yield of H₂ molecules formed per 100 eV absorbed energy', units: 'molecules / 100 eV' },
      { symbol: 'V_{\\text{head}}', description: 'Unoccupied gasullage headspace volume inside sealed waste drum or cask', units: 'L or m³' },
      { symbol: 'y_{\\text{H}_2}', description: 'Molar volume percentage of hydrogen gas in headspace (regulatory cap: 4.0% LFL)', units: 'vol %' }
    ],
    assumptions: [
      'Acyclic decay chain with distinct decay constants λ_i ≠ λ_j.',
      'Zero catalytic recombiner mitigation when evaluating worst-case unvented drum LFL time.'
    ],
    benchmarks: 'Validated against Mo-99/Tc-99m transient equilibrium peak t_max = 22.84 h (VTEST-06), Bateman long-term decay (STRESS-03, STRESS-04), and NUREG/CR-6673 radiolysis benchmarks.'
  },

  // 25. Module 25
  {
    id: 'M25-Spectroscopy',
    moduleId: 'Module 25',
    moduleName: 'Gamma Spectroscopy',
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

  // 26. Module 26
  {
    id: 'M26-Brachytherapy',
    moduleId: 'Module 26',
    moduleName: 'Brachytherapy Planner',
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

  // 27. Module 27
  {
    id: 'M27-MARSSIM',
    moduleId: 'Module 27',
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

  // 28. Module 28
  {
    id: 'M28-Nuclides',
    moduleId: 'Module 28',
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

  // 29. Module 29
  {
    id: 'M29-Equipment',
    moduleId: 'Module 29',
    moduleName: 'Equipment Catalog',
    domain: 'Spectroscopy & Radiation Detection',
    title: 'Gas-Filled Ionization/Proportional/GM Detector Physics, Scintillator/CZT Response & Synchrotron Critical Energy',
    overview: 'Technical specification database and detector physics analyzer covering ionization chambers, proportional counters (Diethorn gas multiplication), Geiger-Müller Townsend avalanches, NaI/CsI/LaBr3/CZT/HPGe spectrometers, and accelerator synchrotron bending magnet radiation.',
    standards: [
      { org: 'ANSI / IEEE', code: 'ANSI N42.17A-2003', year: '2003', title: 'Performance Specifications for Health Physics Instrumentation - Portable Instrumentation' },
      { org: 'IEC', code: 'IEC 60846-1', year: '2009', title: 'Radiation protection instrumentation - Ambient and/or directional dose equivalent (rate) meters' },
      { org: 'Knoll', code: 'Radiation Detection & Measurement 4th Ed.', year: '2010', title: 'Chapters 5–7: Ionization Chambers, Proportional Counters, and Geiger-Müller Counters' }
    ],
    primaryFormula: 'Q_{\\text{coll}} = \\frac{E_{\\text{dep}}}{W_i} \\cdot e \\cdot M(V), \\quad \\ln M = \\frac{V}{\\ln(b/a)} \\frac{\\ln 2}{\\Delta V} \\ln\\left(\\frac{V}{K p a \\ln(b/a)}\\right), \\quad E_c = 0.665 E_{\\text{GeV}}^2 B_{\\text{T}}',
    secondaryFormulas: [
      { label: 'Ion Chamber Saturation Current in Radiation Field', formula: 'I_{\\text{sat}} = \\frac{\\dot{X} \\cdot \\rho_{\\text{gas}} \\cdot V_{\\text{chamber}} \\cdot e}{W_{\\text{air}}}, \\quad W_{\\text{air}} = 33.97\\text{ eV/ion pair}' },
      { label: 'Fano-Limited Intrinsic Energy Resolution of Semiconductor/Scintillator', formula: 'R_{\\text{int}} = \\frac{\\text{FWHM}}{E_0} = 2.3548 \\sqrt{\\frac{F \\cdot W_i}{E_0}} \\quad [F_{\\text{Ge}} \\approx 0.08, \\, W_{\\text{Ge}} = 2.96\\text{ eV}]' },
      { label: 'Synchrotron Bending Magnet Critical Photon Energy & Relativistic γ', formula: 'E_c [\\text{keV}] = 0.665 \\cdot E^2 [\\text{GeV}] \\cdot B [\\text{T}], \\quad \\gamma = \\frac{1}{\\sqrt{1 - \\beta^2}} = \\frac{E_{\\text{GeV}}}{0.000511}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Primary Ion Pair Generation & Diethorn Proportional Gas Multiplication',
        explanation: 'An ionizing particle depositing energy E_dep in a gas with mean ionization energy W_i creates n_0 = E_dep / W_i primary ion pairs. In a cylindrical proportional counter (anode radius a, cathode radius b) above threshold electric field K, Townsend avalanche multiplication M(V) scales exponentially with applied bias V:',
        math: 'n_{\\text{total}} = M(V) \\cdot \\frac{E_{\\text{dep}}}{W_i}, \\quad \\ln M = \\frac{V}{\\ln(b/a)} \\frac{\\ln 2}{\\Delta V} \\ln\\left(\\frac{V}{K p a \\ln(b/a)}\\right)'
      },
      {
        stepTitle: '2. Synchrotron Dipole Critical Photon Energy (Schwinger Formulation)',
        explanation: 'Relativistic electrons of energy E (Lorentz factor γ = E / m_e c²) deflected in a dipole magnetic field B emit a broadband synchrotron fan whose median power photon energy is the critical energy E_c:',
        math: 'E_c = \\frac{3}{2} \\hbar c \\frac{\\gamma^3}{\\rho_{\\text{mag}}} = 0.665 \\cdot E^2 [\\text{GeV}] \\cdot B [\\text{T}] \\quad [\\text{keV}]'
      }
    ],
    variables: [
      { symbol: 'W_i', description: 'Mean energy required to create one electron-ion pair (33.97 eV air, 2.96 eV HPGe, 3.62 eV Si)', units: 'eV' },
      { symbol: 'M(V)', description: 'Townsend gas multiplication factor (1 for Ion Chamber, 10³–10⁴ for Proportional)', units: 'dimensionless' },
      { symbol: 'F', description: 'Fano factor quantifying sub-Poisson variance in charge carrier creation', units: 'dimensionless' },
      { symbol: 'E_c', description: 'Synchrotron dipole critical photon energy dividing emitted power in half', units: 'keV' }
    ],
    assumptions: [
      'Negligible columnar recombination in ionization chambers operated on the saturation plateau.',
      'Quench gas (e.g., 10% methane P-10 or halogen) suppresses secondary UV photoelectric avalanches in GM tubes.'
    ],
    benchmarks: 'Validated against ANSI N42.17A instrument standards, synchrotron critical energy E_c = 7.182 keV (VTEST-19), and relativistic Lorentz guard (STRESS-05).'
  },

  // 30. Module 30
  {
    id: 'M30-Incidents',
    moduleId: 'Module 30',
    moduleName: 'Historical Incidents DB',
    domain: 'Regulatory Standards & Transport Security',
    title: 'IAEA INES 0–7 Severity Classification, Acute Radiation Syndrome (ARS) Reconstruction & Forensic Source Attribution',
    overview: 'Comprehensive forensic encyclopedia of 1,568 global radiological incidents and 16 landmark deep-dive accident investigations (Chernobyl, Fukushima, Goiânia, Tokaimura, SL-1, Demon Core, Kyshtym, Kramatorsk), reconstructing source inventories, contact dose rates, and IAEA INES logarithmic severity ratings.',
    standards: [
      { org: 'IAEA / OECD-NEA', code: 'INES User\'s Manual (2013 Ed.)', year: '2013', title: 'The International Nuclear and Radiological Event Scale User\'s Manual' },
      { org: 'UNSCEAR', code: '2008 / 2020 Annexes', year: '2020', title: 'Sources and Effects of Ionizing Radiation: Assessments of Radiation Levels and Effects from Major Nuclear Accidents' },
      { org: 'IAEA', code: 'STI/PUB/815 (Goiânia)', year: '1988', title: 'The Radiological Accident in Goiânia' },
      { org: 'LANL', code: 'LA-13638', year: '2000', title: 'A Review of Criticality Accidents (2000 Revision)' }
    ],
    primaryFormula: '\\text{INES Level} = \\lfloor \\log_{10}(A_{\\text{eq, I-131}} [\\text{TBq}]) \\rfloor + C_{\\text{defense}}, \\quad A_{\\text{eq, I-131}} = \\sum_i A_i \\cdot w_{\\text{INES}, i}',
    secondaryFormulas: [
      { label: 'Radiological Equivalence to I-131 Atmospheric Release', formula: 'A_{\\text{eq, I-131}} = 40 \\cdot A_{\\text{Cs-137}} + 1 \\cdot A_{\\text{I-131}} + 10^4 \\cdot A_{\\text{Pu-239}}' },
      { label: 'Acute Radiation Syndrome (ARS) LD₅₀/₆₀ Probit Survival Curve', formula: 'P_{\\text{mortality}}(D) = \\Phi\\left( \\frac{D - \\text{LD}_{50/60}}{\\sigma_D} \\right), \\quad \\text{LD}_{50/60} \\approx 4.0\\text{ Gy (untreated)} \\to 6.5\\text{ Gy (G-CSF + ICU)}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. IAEA INES Logarithmic Source-Term Scaling',
        explanation: 'The International Nuclear and Radiological Event Scale (INES) assigns integer levels 1 through 7 such that each step represents an approximate 10-fold increase in radiological severity, evaluated across three impact areas: People and Environment, Radiological Barriers and Control, and Defence-in-Depth.',
        math: 'A_{\\text{eq, I-131}} > 50,000\\text{ TBq} \\implies \\text{INES Level 7 (Major Accident)}'
      },
      {
        stepTitle: '2. Forensic Inverse-Square & Unshielded Contact Reconstruction',
        explanation: 'For orphan teletherapy sources (e.g., Goiânia 50.9 TBq Cs-137 or Samut Prakan 15.7 TBq Co-60), forensic investigators reconstruct cumulative absorbed doses from contact duration and geometric distance histories.',
        math: 'D_{\\text{patient}} = \\int_{t_0}^{t_f} \\frac{\\Gamma_i A(t)}{r(t)^2} e^{-\\mu_{\\text{tissue}} d(t)} \\, dt'
      }
    ],
    variables: [
      { symbol: 'A_{\\text{eq, I-131}}', description: 'Radiologically equivalent I-131 atmospheric activity release', units: 'TBq' },
      { symbol: 'w_{\\text{INES}, i}', description: 'IAEA INES radionuclide equivalence multiplication factor (40 for Cs-137)', units: 'dimensionless' },
      { symbol: '\\text{LD}_{50/60}', description: 'Whole-body acute absorbed dose resulting in 50% lethality within 60 days', units: 'Gy' }
    ],
    assumptions: [
      'INES radiotoxicity equivalence weights account for ground deposition, inhalation, and food-chain pathways.',
      'Historical activity inventories are decay-corrected to the time of incident onset.'
    ],
    benchmarks: 'Validated against IAEA INES User\'s Manual (2013) Table 2 equivalence factors, UNSCEAR Chernobyl/Fukushima annexes, and VTEST-28.'
  },

  // 31. Module 31
  {
    id: 'M31-GlobalMap',
    moduleId: 'Module 31',
    moduleName: 'Global 3D Earth Hub',
    domain: 'Environmental Dispersion & Response',
    title: 'NUREG-0654 16-Sector Keyhole EPZ Evacuation, CTBTO Teleseismic Yield Inversion & Sovereign Test Symbolization',
    overview: 'Planetary 3D orthographic/Mercator intelligence observatory integrating 319 nuclear power complexes (739 IAEA PRIS units), 2,038 historical nuclear weapon detonations across 8 sovereign states, 60 CTBTO International Monitoring System (IMS) stations, NUREG-0654 16-sector keyhole EPZ planning, and Murphy-Ringdal teleseismic mb-to-yield inversion.',
    standards: [
      { org: 'US NRC / FEMA', code: 'NUREG-0654 / FEMA-REP-1 Rev. 2', year: '2019', title: 'Criteria for Preparation and Evaluation of Radiological Emergency Response Plans and Preparedness in Support of Nuclear Power Plants' },
      { org: 'CTBTO', code: 'CTBT Protocol Part I / IMS Manual', year: '1996', title: 'Comprehensive Nuclear-Test-Ban Treaty International Monitoring System Operational Manual' },
      { org: 'Murphy', code: 'BSSA 71(1):223', year: '1981', title: 'P-Wave Coupling of Underground Nuclear Explosions in Various Geologic Media' },
      { org: 'Glasstone & Dolan', code: 'Effects of Nuclear Weapons 3rd Ed.', year: '1977', title: 'Cube-Root Yield Scaling and Detonation Phenomenology' }
    ],
    primaryFormula: 'm_b = \\alpha + \\beta \\log_{10}(Y [\\text{kt}]) \\implies Y = 10^{(m_b - \\alpha)/\\beta}, \\quad r_{\\text{px}}(Y) = \\operatorname{clamp}_{[4, 24]}\\left(5 + 3.5 \\log_{10}\\left(\\frac{Y}{10}\\right)\\right)',
    secondaryFormulas: [
      { label: 'Downwind Plume Transport Bearing from Meteorological Wind Origin', formula: '\\theta_{\\text{plume}} = (\\theta_{\\text{wind, from}} + 180^\\circ) \\bmod 360^\\circ' },
      { label: 'Spherical Geodesic Forward Projection (Keyhole Wedge & EPZ Rings)', formula: '\\phi_2 = \\arcsin\\left(\\sin\\phi_1 \\cos\\frac{d}{R_E} + \\cos\\phi_1 \\sin\\frac{d}{R_E} \\cos\\theta\\right)' },
      { label: 'Baneberry Containment Scaled Depth of Burial (SDOB)', formula: '\\text{SDOB} = \\frac{\\text{DOB } [\\text{m}]}{Y [\\text{kt}]^{1/3}} \\ge 120 \\text{ m}\\cdot\\text{kt}^{-1/3}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. NUREG-0654 16-Sector Keyhole Evacuation Topology',
        explanation: 'Emergency Planning Zones (EPZ) combine an omnidirectional 2-mile (3.22 km) Precautionary Action Zone (PAZ) ring with a downwind 10-mile (16.09 km) Urgent Protective Action Zone (UPZ) keyhole wedge spanning the primary downwind 22.5° compass sector plus two adjacent buffer sectors.',
        math: 'S_{\\text{center}} = \\left\\lfloor \\frac{(\\theta_{\\text{plume}} + 11.25^\\circ) \\bmod 360^\\circ}{22.5^\\circ} \\right\\rfloor, \\quad S_{\\text{keyhole}} = \\{S_{\\text{center}-1}, S_{\\text{center}}, S_{\\text{center}+1}\\}'
      },
      {
        stepTitle: '2. CTBTO Murphy-Ringdal Teleseismic Yield Inversion',
        explanation: 'Underground nuclear explosions generate P-wave seismic signals whose body-wave magnitude mb scales linearly with log10(Y). Accounting for geological medium coupling (hard rock alpha=4.45, beta=0.75 vs dry alluvium alpha=3.35, beta=0.75) inverts observed mb into kiloton yield with ±0.25 mb 95% confidence bounds.',
        math: 'Y_{\\text{est}} = 10^{(m_b - \\alpha)/\\beta}, \\quad [Y_{\\text{lower}}, Y_{\\text{upper}}] = \\left[10^{(m_b - 0.25 - \\alpha)/\\beta}, \\, 10^{(m_b + 0.25 - \\alpha)/\\beta}\\right]'
      },
      {
        stepTitle: '3. Log10 Cartographic Blast Yield Symbolization',
        explanation: 'Because historical weapon yields span 9 orders of magnitude (from sub-ton safety trials to the 50,000 kt Tsar Bomba), logarithmic radius scaling preserves visual legibility across all 2,038 detonation coordinates while maintaining strictly monotonic yield ordering.',
        math: 'r_{\\text{px}}(Y) = \\max\\left(4, \\, \\min\\left(24, \\, 5 + 3.5 \\log_{10}\\left(\\frac{\\max(Y, 0.001)}{10}\\right)\\right)\\right)'
      }
    ],
    variables: [
      { symbol: 'm_b', description: 'Observed teleseismic P-wave body-wave magnitude', units: 'magnitude units' },
      { symbol: '\\alpha, \\beta', description: 'Geological medium seismic coupling intercept and slope coefficients', units: 'dimensionless' },
      { symbol: 'Y', description: 'Inverted or historical nuclear explosive yield', units: 'kt TNT equivalent' },
      { symbol: '\\theta_{\\text{plume}}', description: 'Downwind atmospheric dispersion centerline azimuth', units: 'degrees True' },
      { symbol: 'r_{\\text{px}}', description: '3D globe marker pixel diameter scaled by detonation yield', units: 'px' }
    ],
    assumptions: [
      'Spherical Earth geodesic model with mean radius R_E = 6,371.0 km.',
      'Fully coupled underground cavity detonation in specified host lithology for seismic inversion.'
    ],
    benchmarks: 'Validated against NUREG-0654 / FEMA-REP-1 keyhole geometry (VTEST-33), CTBT Protocol Murphy (1981) hard-rock inversion (VTEST-34), and Castle Bravo 15 MT marker scaling (VTEST-35).'
  },

  // 32. Module 32
  {
    id: 'M32-Hardware',
    moduleId: 'Module 32',
    moduleName: 'Hardware Pulse Counter',
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

  // 33. Module 33
  {
    id: 'M33-Regulatory',
    moduleId: 'Module 33',
    moduleName: 'Regulatory Dashboard',
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

  // 34. Module 34
  {
    id: 'M34-Verify',
    moduleId: 'Module 34',
    moduleName: 'Verification Tests',
    domain: 'Regulatory Standards & Transport Security',
    title: 'IEEE 730-2014 & ASME NQA-1 Automated Scientific Verification, Error Bounds & IEEE 754 Precision',
    overview: 'Executes 35 analytical benchmark vectors and 8 extreme boundary stress tests across all platform modules, certifying deterministic accuracy (<0.5% relative error), singularity clamping, and 64-bit IEEE 754 floating-point machine epsilon integrity.',
    standards: [
      { org: 'IEEE', code: 'Std 730-2014', year: '2014', title: 'IEEE Standard for Software Quality Assurance Processes' },
      { org: 'ASME', code: 'NQA-1-2022', year: '2022', title: 'Quality Assurance Requirements for Nuclear Facility Applications (Part II Subpart 2.7 Computer Software)' },
      { org: 'ISO / IEC', code: 'ISO/IEC 17025:2017', year: '2017', title: 'General Requirements for the Competence of Testing and Calibration Laboratories' },
      { org: 'IEEE', code: 'Std 754-2019', year: '2019', title: 'IEEE Standard for Floating-Point Arithmetic (Binary64 Double Precision)' }
    ],
    primaryFormula: '\\delta_{\\text{rel}} = \\left| \\frac{y_{\\text{computed}} - y_{\\text{ref}}}{y_{\\text{ref}}} \\right| \\times 100\\% \\le \\tau_{\\text{tol}}, \\quad \\epsilon_{\\text{mach}} = 2^{-52} \\approx 2.2204 \\times 10^{-16}',
    secondaryFormulas: [
      { label: 'Point-Source Singularity Guard Clamp (r → 0)', formula: '\\dot{D}(r) = \\frac{\\Gamma \\cdot A}{\\max(r, r_{\\min})^2}, \\quad r_{\\min} = 0.01\\text{ m}' },
      { label: 'Relativistic Lorentz Factor Singularity Guard (β → 1)', formula: '\\gamma = \\frac{1}{\\sqrt{1 - \\min(\\beta, 1 - 10^{-12})^2}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. ASME NQA-1 Analytical Verification Protocol',
        explanation: 'Every computational kernel is tested against closed-form analytical solutions from ICRP, NCRP, IAEA, and ANSI standards. Relative percentage drift δ_rel must remain strictly below benchmark tolerance τ_tol:',
        math: '\\max_{k \\in [1, 35]} \\delta_{\\text{rel}, k} \\le 0.50\\%'
      },
      {
        stepTitle: '2. IEEE 754 Binary64 Machine Epsilon Verification',
        explanation: 'Host FPU arithmetic is verified at runtime by halving ε until (1.0 + ε/2) === 1.0, confirming 53-bit significand precision:',
        math: '\\epsilon_{\\text{mach}} = 2^{-(53-1)} = 2^{-52} = 2.220446049250313 \\times 10^{-16}'
      }
    ],
    variables: [
      { symbol: '\\delta_{\\text{rel}}', description: 'Relative percentage error between computed output and reference standard', units: '%' },
      { symbol: '\\tau_{\\text{tol}}', description: 'Maximum permissible verification error tolerance threshold', units: '%' },
      { symbol: '\\epsilon_{\\text{mach}}', description: 'IEEE 754 Binary64 floating-point machine epsilon', units: 'dimensionless' }
    ],
    assumptions: [
      'Deterministic IEEE 754 double-precision execution without non-standard flush-to-zero optimizations.',
      'Boundary guards intercept zero/negative distances, voltages, and superluminal velocities prior to division.'
    ],
    benchmarks: 'Certifies all 43 verification vectors (VTEST-01 through VTEST-35 and STRESS-01 through STRESS-08).'
  },

  // 35. Module 35
  {
    id: 'M35-Literature',
    moduleId: 'Module 35',
    moduleName: 'Core Literature & Physics',
    domain: 'Dose, Transport & Shielding',
    title: 'ICRP 103/116 Protection Quantities, FAA CARI-7 Cosmic Aviation Dosimetry & Metrological Unit Harmonization',
    overview: 'Foundational health physics framework governing the relationship between physical field quantities (fluence Φ, kerma K, absorbed dose D) and protection quantities (equivalent dose H_T, effective dose E, operational ambient dose equivalent H*(10)), plus FAA CARI-7 high-altitude cosmic ray aviation dosimetry.',
    standards: [
      { org: 'ICRP', code: 'Publication 103', year: '2007', title: 'The 2007 Recommendations of the International Commission on Radiological Protection' },
      { org: 'ICRP / ICRU', code: 'Publication 116 / Report 85', year: '2010', title: 'Fundamental Quantities and Units for Ionizing Radiation & Conversion Coefficients' },
      { org: 'FAA / ICRP', code: 'CARI-7 / Publication 132', year: '2016', title: 'Radiological Protection from Cosmic Radiation in Aviation' }
    ],
    primaryFormula: 'E = \\sum_T w_T H_T = \\sum_T w_T \\sum_R w_R D_{T,R}, \\quad w_R(E_n) = \\begin{cases} 2.5 + 18.2 \\, e^{-[\\ln(E_n)]^2 / 6} & E_n < 1\\text{ MeV} \\ 5.0 + 17.0 \\, e^{-[\\ln(2 E_n)]^2 / 6} & 1 \\le E_n \\le 50\\text{ MeV} \\ 2.5 + 3.25 \\, e^{-[\\ln(0.04 E_n)]^2 / 6} & E_n > 50\\text{ MeV} \\end{cases}',
    secondaryFormulas: [
      { label: 'ICRP 103 Tissue Weighting Factor Normalization', formula: '\\sum_T w_T = 1.00 \\quad [w_T = 0.12 \\text{ (Marrow, Colon, Lung, Stomach, Breast, Remainder)}, \\, 0.08 \\text{ (Gonads)}, \\, 0.04 \\text{ (Bladder, Esophagus, Liver, Thyroid)}]' },
      { label: 'FAA CARI-7 Barometric Altitude & Geomagnetic Cutoff Aviation Dose Rate', formula: '\\dot{H}^*(10)(z, R_c, \\Phi) = \\dot{H}_{\\text{polar}}(z, \\Phi) \\cdot \\left[1 - 0.78 \\exp(-0.22 \\cdot z_{\\text{km}}) \\cdot \\left(\\frac{R_c}{15\\text{ GV}}\\right)^{1.4}\\right]' },
      { label: 'Exact SI ↔ Traditional Metrological Identity Conversions', formula: '1\\text{ Ci} \\equiv 3.7 \\times 10^{10}\\text{ Bq}, \\quad 1\\text{ Gy} \\equiv 100\\text{ rad} \\equiv 1\\text{ J/kg}, \\quad 1\\text{ Sv} \\equiv 100\\text{ rem}, \\quad 1\\text{ R} \\equiv 2.58 \\times 10^{-4}\\text{ C/kg}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Transition from Physical Absorbed Dose D to Effective Dose E (ICRP 103)',
        explanation: 'Absorbed dose D = dε̄/dm (J/kg = Gy) measures physical energy imparted per unit mass. To account for microscopic track ionization density (LET), D_{T,R} is multiplied by radiation weighting factor w_R to yield organ equivalent dose H_T, and then weighted across organs by stochastic detriment factor w_T:',
        math: 'H_T = \\sum_R w_R D_{T,R} \\implies E = \\sum_T w_T H_T \\quad [\\text{Sv}]'
      },
      {
        stepTitle: '2. Atmospheric Secondary Neutron Cascade & Aviation Dose at FL390',
        explanation: 'Primary Galactic Cosmic Ray (GCR) protons collide with stratospheric N/O nuclei to produce a Pfotzer-maximum secondary neutron/muon cascade near 20 km. At commercial cruise altitude FL390 (11.89 km) at high geomagnetic latitude (R_c < 1 GV) during solar minimum, ambient dose equivalent rate reaches:',
        math: '\\dot{H}^*(10)_{\\text{FL390}} \\approx 5.50 \\, \\mu\\text{Sv/h} \\quad (0.55\\text{ mrem/h})'
      }
    ],
    variables: [
      { symbol: 'E, H_T, D', description: 'Effective dose (Sv), Organ equivalent dose (Sv), and Physical absorbed dose (Gy)', units: 'Sv / Gy' },
      { symbol: 'w_R, w_T', description: 'ICRP 103 radiation weighting factor and tissue stochastic detriment weighting factor', units: 'dimensionless' },
      { symbol: 'E_n', description: 'Incident neutron kinetic energy for continuous w_R(E_n) curve', units: 'MeV' },
      { symbol: 'R_c', description: 'Vertical geomagnetic cutoff rigidity (0 GV at poles to ~15 GV at equator)', units: 'GV' }
    ],
    assumptions: [
      'Tissue weighting factors w_T represent sex- and age-averaged stochastic cancer/hereditary detriment across a nominal population.',
      'Operational quantity H*(10) provides a conservative envelope for effective dose E under anterior-posterior (AP) irradiation.'
    ],
    benchmarks: 'Validated against ICRP Publication 103 Annex A/B, FAA CARI-7 FL390 cosmic benchmark (VTEST-23), and NIST SP 811 SI conversion tables.'
  },

  // === FORWARD-LOOKING EXPANSION METHODOLOGIES (FUTURE RESEARCH & SPECIFICATIONS) ===

  // EXP-1: Module 36 (Expansion)
  {
    id: 'EXP-10CFR61',
    moduleId: 'Module 36 (Expansion)',
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
    derivationSteps: [
      {
        stepTitle: '1. Multi-Nuclide Sum of Fractions (Unity Rule) Formulation',
        explanation: 'When a waste stream contains multiple radionuclides from 10 CFR 61.55 Table 1 (long-lived) or Table 2 (short-lived), each concentration C_i is normalized by its class limit L_i. The package qualifies for a given waste class if and only if the sum of fractions does not exceed 1.0:',
        math: '\\text{SOF} = \\sum_{i=1}^n \\frac{C_i}{L_i} \\le 1.0'
      },
      {
        stepTitle: '2. Radiolytic Decay Heat Thermal Power Conversion',
        explanation: 'Converting total decay energy release rate (MeV/s) from activity A_k (Bq) into Watts via the elementary charge factor 1 MeV = 1.60218 × 10⁻¹³ J:',
        math: 'P_{\\text{thermal}} [\\text{W}] = 1.60218 \\times 10^{-13} \\sum_k A_k [\\text{Bq}] \\cdot E_{\\text{decay}, k} [\\text{MeV}]'
      }
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

  // EXP-2: Module 37 (Expansion)
  {
    id: 'EXP-BetheBloch',
    moduleId: 'Module 37 (Expansion)',
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
    derivationSteps: [
      {
        stepTitle: '1. Relativistic Impulse Momentum Transfer to Orbital Electrons',
        explanation: 'A heavy ion of charge ze and velocity v = βc passing an orbital electron at impact parameter b imparts transverse impulse Δp = 2 z e² / (b v). Integrating energy transfer ΔE = (Δp)² / (2 m_e) over all impact parameters from b_min (quantum kinematic limit) to b_max (adiabatic ionization threshold I) yields the Bethe-Bloch equation:',
        math: '-\\frac{dE}{dx} = \\frac{4\\pi e^4 z^2}{m_e v^2} N Z \\left[ \\ln\\left(\\frac{2 m_e v^2}{I(1 - \\beta^2)}\\right) - \\beta^2 \\right]'
      },
      {
        stepTitle: '2. The Bragg Peak Near Particle Stopping Endpoint (v → 0)',
        explanation: 'Because linear stopping power scales inversely with squared projectile velocity (-dE/dx ∝ z²/v²), energy deposition rises dramatically as the ion slows down just before coming to rest, creating the characteristic clinical Bragg peak before dropping to zero after electron pickup:',
        math: 'R_{\\text{CSDA}} = \\int_0^{E_0} \\left(-\\frac{dE}{dx}\\right)^{-1} dE'
      }
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

  // EXP-3: Module 38 (Expansion)
  {
    id: 'EXP-SpaceRad',
    moduleId: 'Module 38 (Expansion)',
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
    derivationSteps: [
      {
        stepTitle: '1. Gleeson-Axford Heliospheric Force-Field Approximation',
        explanation: 'As galactic cosmic ray ions of charge Z_i e and mass number A_i penetrate the outward-flowing magnetized solar wind to 1 AU, they experience adiabatic deceleration equivalent to an electrostatic potential Φ(t) (400 MV solar min to 1200 MV solar max). Liouville phase-space conservation p² j(E) = const yields:',
        math: 'j_i(E, \\Phi) = j_i^{\\text{LIS}}(E + \\Delta E) \\cdot \\frac{E(E + 2 E_0)}{(E + \\Delta E)(E + \\Delta E + 2 E_0)}, \\quad \\Delta E = \\frac{Z_i e}{A_i} \\Phi(t)'
      }
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

  // EXP-4: Module 39 (Expansion)
  {
    id: 'EXP-MIRD',
    moduleId: 'Module 39 (Expansion)',
    moduleName: 'MIRD Schema & Radiopharmaceutical Theranostics',
    domain: 'Medical & Advanced Expansion',
    title: 'MIRD Organ-Level Internal Dosimetry Schema, S-Values (Lu-177 / Ac-225) & Linear-Quadratic BED',
    overview: 'Formal Society of Nuclear Medicine and Molecular Imaging (SNMMI) MIRD committee formalism for targeted radionuclide therapy (Lu-177 DOTATATE/PSMA, I-131, Y-90 microspheres, Ac-225 alpha-theranostics), integrating time-activity curves Ã(r_S), phantom S-values, and Lea-Catcheside Biologically Effective Dose (BED).',
    isExpansion: true,
    standards: [
      { org: 'MIRD / SNMMI', code: 'MIRD Pamphlet No. 21', year: '2009', title: 'A Generalized Schema for Radiopharmaceutical Dosimetry: Standardization of Nomenclature' },
      { org: 'ICRP', code: 'Publication 128 / 133', year: '2016', title: 'Radiation Dose to Patients from Radiopharmaceuticals & SAF Phantom Values' },
      { org: 'AAPM', code: 'TG-195 / TG-221', year: '2019', title: 'Quantitative SPECT/CT Dosimetry for Lu-177 and Y-90 Radionuclide Therapy' }
    ],
    primaryFormula: 'D(r_T) = \\sum_{r_S} \\tilde{A}(r_S) \\cdot S(r_T \\leftarrow r_S), \\quad \\tilde{A}(r_S) = \\int_0^\\infty A(r_S, t) \\, dt, \\quad S(r_T \\leftarrow r_S) = \\frac{1}{M(r_T)} \\sum_i E_i Y_i \\phi(r_T \\leftarrow r_S; E_i)',
    secondaryFormulas: [
      { label: 'Mono-Exponential & Bi-Exponential Time-Integrated Activity (Cumulated Activity Ã)', formula: '\\tilde{A}(r_S) = A_0 \\int_0^\\infty \\left(f_1 e^{-\\lambda_{\\text{eff},1} t} + f_2 e^{-\\lambda_{\\text{eff},2} t}\\right) dt = A_0 \\left(\\frac{f_1}{\\lambda_{\\text{eff},1}} + \\frac{f_2}{\\lambda_{\\text{eff},2}}\\right)' },
      { label: 'Dale-Lea-Catcheside Biologically Effective Dose (BED) for Exponentially Decaying Therapy', formula: '\\text{BED} = D \\left[ 1 + \\frac{\\lambda_{\\text{eff}}}{\\mu_{\\text{rep}} + \\lambda_{\\text{eff}}} \\cdot \\frac{D}{\\alpha / \\beta} \\right] \\quad [\\text{Renal Toxicity Limit: BED}_{\\text{kidney}} \\le 28-40\\text{ Gy}_{2.5}]' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. MIRD Source-to-Target Specific Absorbed Fraction (SAF) Factorization',
        explanation: 'The mean absorbed dose D(r_T) delivered to target organ r_T of mass M(r_T) from cumulated disintegrations Ã(r_S) in source organ r_S is separated into patient-specific biokinetics Ã(r_S) and radionuclide/phantom transport S(r_T ← r_S):',
        math: 'D(r_T) = \\sum_{r_S} \\tilde{A}(r_S) \\cdot \\left[ \\sum_i \\Delta_i \\cdot \\Phi(r_T \\leftarrow r_S; E_i) \\right] = \\sum_{r_S} \\tilde{A}(r_S) \\cdot S(r_T \\leftarrow r_S)'
      },
      {
        stepTitle: '2. Sublethal DNA Repair During Continuous Low-Dose-Rate Radionuclide Therapy',
        explanation: 'Unlike acute external beam fractions, radiopharmaceutical dose rate decays exponentially at rate λ_eff while sublethal DNA damage repairs at rate μ_rep = ln(2)/T_rep. Integrating the Lea-Catcheside protraction factor G(∞) = λ_eff / (μ_rep + λ_eff) yields the clinical BED formula:',
        math: 'G(\\infty) = \\frac{\\lambda_{\\text{eff}}}{\\mu_{\\text{rep}} + \\lambda_{\\text{eff}}} \\implies \\text{BED} = D \\left(1 + G(\\infty) \\frac{D}{\\alpha / \\beta}\\right)'
      }
    ],
    variables: [
      { symbol: 'D(r_T)', description: 'Mean absorbed dose to target organ or tumor volume r_T', units: 'Gy' },
      { symbol: '\\tilde{A}(r_S)', description: 'Time-integrated activity (total number of nuclear transformations in source region r_S)', units: 'Bq·s or MBq·h' },
      { symbol: 'S(r_T \\leftarrow r_S)', description: 'MIRD S-value: absorbed dose to r_T per unit cumulated activity in r_S', units: 'Gy·(Bq·s)⁻¹' },
      { symbol: '\\phi(r_T \\leftarrow r_S)', description: 'Absorbed fraction of energy emitted in r_S that is deposited in r_T', units: 'dimensionless' },
      { symbol: '\\text{BED}', description: 'Biologically Effective Dose accounting for dose-rate repair kinetics', units: 'Gy_(α/β)' }
    ],
    assumptions: [
      'Uniform activity distribution within each macro-organ or voxelized SPECT/PET source region.',
      'Non-penetrating beta/alpha emissions (e.g., Lu-177 β⁻, Y-90 β⁻, Ac-225 α) satisfy local deposition φ(r_T ← r_T) ≈ 1.0.'
    ],
    benchmarks: 'Validated against MIRD Pamphlet No. 21, OLINDA/EXM 2.0 phantom S-values, and EANM Lu-177 dosimetry guidelines.'
  },

  // EXP-5: Module 40 (Expansion)
  {
    id: 'EXP-Fusion',
    moduleId: 'Module 40 (Expansion)',
    moduleName: 'Fusion Neutronics & 14.1 MeV D-T Shielding',
    domain: 'Nuclear Kinetics & Reactivity',
    title: 'D-T 14.1 MeV Fusion Neutronics, Lawson Triple Product, Tritium Breeding Ratio (TBR) & First-Wall DPA',
    overview: 'Models Deuterium-Tritium (D-T) and Deuterium-Deuterium (D-D) magnetic/inertial fusion plasma neutronics: 14.1 MeV fast neutron removal attenuation across WC/B4C/Eurofer blankets, Li-6/Li-7 Tritium Breeding Ratio (TBR), and displacements per atom (DPA) radiation damage.',
    isExpansion: true,
    standards: [
      { org: 'IAEA', code: 'ITER / FENDL-3.2', year: '2021', title: 'Fusion Evaluated Nuclear Data Library for ITER and DEMO Neutronics' },
      { org: 'US DOE / PPPL', code: 'FESAC Report', year: '2020', title: 'Power Plant Physics and Technology for Magnetic Fusion Energy' },
      { org: 'ASTM', code: 'E693-17', year: '2017', title: 'Standard Practice for Characterizing Neutron Exposures in Iron and Low Alloy Steels in Terms of Displacements Per Atom (DPA)' }
    ],
    primaryFormula: '\\text{D} + \\text{T} \\longrightarrow \\, ^4\\text{He} \\, (3.52\\text{ MeV}) + n \\, (14.06\\text{ MeV}), \\quad n_i T_i \\tau_E \\ge 3 \\times 10^{21}\\text{ m}^{-3}\\cdot\\text{keV}\\cdot\\text{s}',
    secondaryFormulas: [
      { label: 'Lithium Blanket Tritium Breeding Reactions (Exothermic Li-6 & Endothermic Threshold Li-7)', formula: '^6\\text{Li} + n_{\\text{th}} \\to \\text{T} + \\, ^4\\text{He} + 4.78\\text{ MeV}, \\quad ^7\\text{Li} + n_{\\text{fast}} \\to \\text{T} + \\, ^4\\text{He} + n^{\prime} - 2.47\\text{ MeV}' },
      { label: '14.1 MeV Fast Neutron Macroscopic Removal Attenuation Through Blanket/Shield', formula: '\\Phi_{14.1}(x) = \\frac{S_{\\text{fusion}}}{4\\pi r^2} \\exp\\left(-\\sum_k \\Sigma_{R, k} \\cdot x_k\\right), \\quad S_{\\text{fusion}} = \\frac{P_{\\text{fus}} [\\text{W}]}{17.59\\text{ MeV} \\cdot 1.6022 \\times 10^{-13}}' },
      { label: 'Norgett-Robinson-Torrens (NRT) Structural Displacements Per Atom (DPA)', formula: '\\text{DPA}(t) = \\int_0^t \\int_0^{E_{\\max}} \\sigma_d(E_n) \\, \\phi(E_n, \\tau) \\, dE_n \\, d\\tau, \\quad N_d(T_{\\text{PKA}}) = \\frac{0.8 \\cdot T_{\\text{damage}}}{2 E_d}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Relativistic Two-Body Kinematics of the D-T Fusion Reaction (Q = 17.59 MeV)',
        explanation: 'In the center-of-mass frame of a stationary D + T reaction (Q = 17.589 MeV), conservation of momentum p_n = p_α partitions kinetic energy inversely with product mass (m_n ≈ 1 u, m_α ≈ 4 u), assigning 4/5 of Q (14.06 MeV) to the escaping fast neutron:',
        math: 'E_n = Q \\cdot \\frac{m_\\alpha}{m_n + m_\\alpha} \\approx 17.59\\text{ MeV} \\times \\frac{4}{5} = 14.07\\text{ MeV}, \\quad E_\\alpha = 3.52\\text{ MeV}'
      },
      {
        stepTitle: '2. Tritium Self-Sufficiency Condition (TBR ≥ 1.05–1.15)',
        explanation: 'Because each D-T fusion consumes one Tritium nucleus (T_1/2 = 12.32 yr), the lithium breeding blanket (enriched in Li-6 with Pb or Be (n,2n) neutron multipliers) must achieve a net Tritium Breeding Ratio TBR > 1.05 to compensate for decay, port leakage, and fuel processing hold-up:',
        math: '\\text{TBR} = \\frac{\\int_{V_{\\text{blanket}}} \\left( N_{^6\\text{Li}} \\sigma_{(n,t)} + N_{^7\\text{Li}} \\sigma_{(n,n^{\prime}t)} \\right) \\phi \\, dV}{S_{\\text{fusion}}} \\ge 1.10'
      }
    ],
    variables: [
      { symbol: 'S_{\\text{fusion}}', description: '14.1 MeV neutron source emission rate (3.55 × 10¹⁷ n/s per MW fusion power)', units: 'n·s⁻¹' },
      { symbol: 'n_i T_i \\tau_E', description: 'Lawson fusion ignition triple product (density × ion temperature × confinement time)', units: 'm⁻³·keV·s' },
      { symbol: '\\text{TBR}', description: 'Tritium Breeding Ratio (tritons bred in blanket per D-T fusion neutron)', units: 'dimensionless' },
      { symbol: '\\Sigma_R', description: '14.1 MeV fast neutron macroscopic removal cross-section', units: 'cm⁻¹' },
      { symbol: '\\text{DPA}', description: 'Cumulative lattice atomic displacements per atom in first-wall steel', units: 'dpa' }
    ],
    assumptions: [
      'Isotropic 14.06 MeV monoenergetic primary D-T neutron emission in plasma rest frame.',
      'Threshold Displacement Energy E_d = 40 eV for ferritic-martensitic Eurofer/SS316 first-wall steel per ASTM E693.'
    ],
    benchmarks: 'Validated against IAEA FENDL-3.2 14.1 MeV cross-sections and ITER nuclear analysis benchmarks.'
  },

  // Module 11 — Global Nuclear Facility, Detonation & CTBTO IMS Map
  {
    id: 'M11-GlobalNuclearMap',
    moduleId: 'Module 11',
    moduleName: 'Global Nuclear Map & CTBTO IMS',
    domain: 'Environmental Dispersion & Response',
    title: 'Gutenberg-Richter / Murphy-Ringdal Seismic Yield Inversion (mb ↔ W), CTBTO 4-Technology IMS Propagation & Haversine Geodesy',
    overview: 'Integrates global nuclear power reactors (IAEA PRIS), historical atmospheric/underground nuclear weapon test sites (UNSCEAR 2000), radiological accidents (INES 2–7), and the 337-facility CTBTO International Monitoring System (IMS) network with teleseismic body-wave magnitude yield inversion and acoustic/radionuclide arrival kinematics.',
    standards: [
      { org: 'CTBTO', code: 'IMS Operational Manual', year: '2019', title: 'Comprehensive Nuclear-Test-Ban Treaty International Monitoring System Technical Specifications' },
      { org: 'Murphy & Ringdal', code: 'Bull. Seismol. Soc. Am.', year: '1996', title: 'Teleseismic Body-Wave Magnitude mb to Nuclear Explosive Yield Scaling in Hard Rock and Alluvium' },
      { org: 'UNSCEAR', code: '2000 Report Vol. I Annex C', year: '2000', title: 'Exposures to the Public from Man-Made Sources of Radiation: Atmospheric & Underground Nuclear Testing' },
      { org: 'IAEA', code: 'PRIS Reference Database', year: '2024', title: 'Power Reactor Information System Global Fleet Specifications' }
    ],
    primaryFormula: 'm_b = A_{\\text{geol}} + B_{\\text{geol}} \\log_{10}(W_{\\text{kt}}) \\iff W_{\\text{kt}} = 10^{(m_b - A_{\\text{geol}}) / B_{\\text{geol}}}',
    secondaryFormulas: [
      { label: 'Hard-Rock / Granite Fully Coupled Teleseismic Scaling (NTS / Semipalatinsk / Punggye-ri)', formula: 'm_b = 4.25 + 0.75 \\log_{10}(W_{\\text{kt}}), \\quad W_{\\text{decoupled}} = F_{\\text{dec}} \\cdot W_{\\text{coupled}} \\; (F_{\\text{dec}} \\in [1, 70])' },
      { label: 'Dry Alluvium / Porous Tuff Partially Coupled Scaling', formula: 'm_b = 3.92 + 0.81 \\log_{10}(W_{\\text{kt}})' },
      { label: 'Haversine Great-Circle Geodesic Distance & Forward Azimuth', formula: 'd = 2 R_{\\oplus} \\arcsin\\!\\sqrt{\\sin^2\\!\\left(\\frac{\\Delta\\phi}{2}\\right) + \\cos\\phi_1\\cos\\phi_2\\sin^2\\!\\left(\\frac{\\Delta\\lambda}{2}\\right)}, \\quad R_{\\oplus} = 6371.0\\text{ km}' },
      { label: 'CTBTO Multi-Waveform Arrival Times (Seismic P, Hydroacoustic SOFAR, Infrasound, Radionuclide)', formula: 't_P = \\frac{d}{v_P\\;(7.8\\text{ km/s})}, \\quad t_H = \\frac{d}{v_{\\text{SOFAR}}\\;(1.48\\text{ km/s})}, \\quad t_I = \\frac{d}{c_{\\text{eff}}\\;(0.30\\text{ km/s})}, \\quad t_{\\text{RN}} = \\frac{d}{u_{\\text{synoptic}}}' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Elastic Cavity Radius & Teleseismic Source Spectrum Scaling',
        explanation: 'An underground nuclear detonation of yield W (kt) vaporizes surrounding rock and drives a shock wave out to the elastic radius R_el ∝ W^(1/3). In the far-field teleseismic P-wave passband (~1 Hz), corner-frequency roll-off reduces the high-yield slope from 1.0 to B ≈ 0.75:',
        math: 'A_P(f_0) \\propto W^{B_{\\text{geol}}} \\implies m_b = \\log_{10}\\!\\left(\\frac{A_P}{T}\\right) + Q(\\Delta, h) = A_{\\text{geol}} + B_{\\text{geol}} \\log_{10}(W_{\\text{kt}})'
      },
      {
        stepTitle: '2. Exact Inversion for Estimated Explosive Yield W (kt TNT)',
        explanation: 'Solving the empirical linear log-yield relation for W_kt and incorporating a cavity decoupling factor F_dec (up to 70× in large salt cavities):',
        math: 'W_{\\text{kt}} = F_{\\text{dec}} \\cdot 10^{\\frac{m_b - A_{\\text{geol}}}{B_{\\text{geol}}}}'
      }
    ],
    variables: [
      { symbol: 'm_b', description: 'Teleseismic short-period body-wave magnitude (1 Hz P-wave)', units: 'magnitude units' },
      { symbol: 'W_{\\text{kt}}', description: 'Inferred underground nuclear explosive yield', units: 'kt TNT equivalent' },
      { symbol: 'A_{\\text{geol}}, B_{\\text{geol}}', description: 'Geological coupling intercept and slope (e.g., 4.25, 0.75 for hard rock)', units: 'dimensionless' },
      { symbol: 'd', description: 'Great-circle epicentral distance to CTBTO IMS station', units: 'km' }
    ],
    assumptions: [
      'Fully tamped underground emplacement at scaled depth of burst SDOB > 120 m/kt^(1/3) unless cavity decoupling factor F_dec > 1 is applied.',
      'Mantle-averaged teleseismic P-wave velocity v_P ≈ 7.8 km/s and stratospheric infrasound celerity c_eff ≈ 0.30 km/s.'
    ],
    benchmarks: 'Validated against Murphy (1996) Semipalatinsk/Punggye-ri seismic yield curves (VTEST-44) and CTBTO IMS 80-station radionuclide MDC specifications.'
  },

  // Module 14 — Fast Neutron Removal & Mixed n/γ Laminated Shielding
  {
    id: 'M14-NeutronRemoval',
    moduleId: 'Module 14 (n/γ)',
    moduleName: 'Fast Neutron Removal (Σ_R)',
    domain: 'Dose, Transport & Shielding',
    title: 'Albert-Welton / Spinney Fast Neutron Macroscopic Removal Cross-Section (Σ_R) & Capture-Gamma Suppression',
    overview: 'Models deep penetration of fission and (α,n) fast neutrons (0.5–15 MeV) through multi-layer metal + hydrogenous shields using macroscopic removal cross-sections Σ_R and evaluates ¹⁰B(n,α)⁷Li thermal capture-gamma suppression.',
    standards: [
      { org: 'NCRP', code: 'Report No. 38 / 144', year: '2003', title: 'Protection Against Neutron Radiation & Radiation Protection for Particle Accelerator Facilities' },
      { org: 'Albert & Welton', code: 'WAPD-15 (Westinghouse)', year: '1950', title: 'A Simplified Theory of Neutron Attenuation and Its Application to Reactor Shield Design' },
      { org: 'Shultis & Faw', code: 'ANS Textbook Ref', year: '2000', title: 'Radiation Shielding (Spinney Removal-Diffusion Method)' }
    ],
    primaryFormula: '\\dot{H}_n(x) = \\dot{H}_{n,0} \\cdot B_n\\!\\left(\\sum_i \\Sigma_{R,i} x_i\\right) \\cdot \\exp\\!\\left(-\\sum_{i=1}^N \\Sigma_{R,i} x_i\\right)',
    secondaryFormulas: [
      { label: 'Empirical Mass Removal Cross-Section Scaling for Z > 8', formula: '\\frac{\\Sigma_R}{\\rho} \\approx 0.206 \\cdot A^{-1/3} \\cdot Z^{-0.294} \\quad [\\text{cm}^2/\\text{g}]' },
      { label: 'Fast Neutron Half-Value & Tenth-Value Relaxation Layers', formula: '\\text{HVL}_n = \\frac{\\ln 2}{\\Sigma_R}, \\quad \\text{TVL}_n = \\frac{\\ln 10}{\\Sigma_R}' },
      { label: 'Boron-10 Thermal Capture Suppression of 2.223 MeV Hydrogen Capture Gamma', formula: '^{10}\\text{B} + n_{\\text{th}} \\xrightarrow{\\sigma = 3840\\text{ b}} {}^{7}\\text{Li}^* + \\alpha + 0.478\\text{ MeV }\\gamma \\; (94\\%)' }
    ],
    derivationSteps: [
      {
        stepTitle: '1. Removal of Fast Neutrons from the Uncollided MeV Group',
        explanation: 'In a shield containing sufficient hydrogenous moderator (≥ 0.5–1.0 relaxation lengths of H₂O, HDPE, or concrete), any wide-angle elastic scattering off hydrogen or inelastic scattering off heavy nuclei (Fe, Pb, W) degrades a fast neutron into the epithermal/thermal group where it is rapidly diffused and captured near the collision site:',
        math: '\\Sigma_R \\approx \\Sigma_{\\text{tot}} - \\bar{\\mu}_0 \\Sigma_{\\text{el}} \\approx \\Sigma_{\\text{inel}} + (1 - \\bar{\\mu}_0)\\Sigma_{\\text{el}}'
      }
    ],
    variables: [
      { symbol: '\\Sigma_R', description: 'Macroscopic fast neutron removal cross-section (e.g., 0.168 cm⁻¹ Steel, 0.130 cm⁻¹ Borated PE)', units: 'cm⁻¹' },
      { symbol: '\\Sigma_R/\\rho', description: 'Mass removal cross-section', units: 'cm²·g⁻¹' },
      { symbol: 'B_n(\\Sigma_R x)', description: 'Sub-MeV intermediate neutron buildup factor', units: 'dimensionless' }
    ],
    assumptions: [
      'Requires at least ~5–10 cm of hydrogenous moderator downstream or mixed within the shield to prevent sub-MeV streaming (e.g., through the 24 keV Iron-56 window).'
    ],
    benchmarks: 'Validated against NCRP Report 38 / Shultis & Faw removal cross-sections for Fe, Pb, W, Concrete, H2O, and Borated PE.'
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

const ICRP74_PHOTON_H10_TABLE: [number, number][] = [
  // [E_MeV, h*(10) in pSv·cm²] per ICRP Publication 74 / 116
  [0.015, 0.83],
  [0.020, 1.05],
  [0.030, 0.81],
  [0.040, 0.64],
  [0.050, 0.55],
  [0.060, 0.51],
  [0.080, 0.53],
  [0.100, 0.61],
  [0.150, 0.89],
  [0.200, 1.20],
  [0.300, 1.80],
  [0.400, 2.38],
  [0.500, 2.93],
  [0.600, 3.44],
  [0.662, 3.75],
  [0.800, 4.38],
  [1.000, 5.20],
  [1.250, 6.12],
  [1.500, 6.90],
  [2.000, 8.60],
  [3.000, 11.1],
  [4.000, 13.4],
  [6.000, 17.6],
  [8.000, 21.6],
  [10.00, 25.6]
];

const ICRP74_NEUTRON_H10_TABLE: [number, number][] = [
  // [E_MeV, h*(10) in pSv·cm²] per ICRP Publication 74 / 116
  [2.5e-8, 10.6], // Thermal (0.025 eV)
  [1.0e-6, 12.9], // 1 eV epithermal
  [1.0e-4, 10.4], // 100 eV
  [0.001, 9.9],   // 1 keV
  [0.010, 10.5],  // 10 keV
  [0.020, 16.6],  // 20 keV
  [0.050, 41.1],  // 50 keV
  [0.100, 88.0],  // 100 keV
  [0.200, 170.0], // 200 keV
  [0.500, 322.0], // 500 keV
  [1.000, 416.0], // 1 MeV fission peak
  [2.000, 420.0], // 2 MeV (Cf-252 avg)
  [4.500, 408.0], // 4.5 MeV (Am-Be avg)
  [5.000, 405.0],
  [10.00, 440.0],
  [14.10, 520.0], // 14.1 MeV D-T fusion
  [20.00, 600.0]
];

function interpolateFluenceCoeff(table: [number, number][], energyMev: number): number {
  const e = Math.max(table[0][0], Math.min(table[table.length - 1][0], energyMev));
  let idx = 0;
  while (idx < table.length - 2 && table[idx + 1][0] < e) idx++;
  const [e0, h0] = table[idx];
  const [e1, h1] = table[Math.min(table.length - 1, idx + 1)];
  if (e1 <= e0) return h0;
  const f = (Math.log(e) - Math.log(e0)) / (Math.log(e1) - Math.log(e0));
  return Math.exp(Math.log(h0) + Math.max(0, Math.min(1, f)) * (Math.log(h1) - Math.log(h0)));
}

function evaluateNeutronWr(energyMev: number): number {
  const e = Math.max(1e-9, energyMev);
  if (e < 1.0) {
    return 2.5 + 18.2 * Math.exp(-Math.pow(Math.log(e), 2) / 6.0);
  }
  if (e <= 50.0) {
    return 5.0 + 17.0 * Math.exp(-Math.pow(Math.log(2.0 * e), 2) / 6.0);
  }
  return 2.5 + 3.25 * Math.exp(-Math.pow(Math.log(0.04 * e), 2) / 6.0);
}

const LiteratureModule: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>('All Domains');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('current');
  const [activeDocId, setActiveDocId] = useState<string>(METHOD_DOCS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Reference Calculators state (in 'constants' tab)
  const [refActivityGBq, setRefActivityGBq] = useState<number>(37.0); // 1 Ci default
  const [refDoseMSv, setRefDoseMSv] = useState<number>(20.0); // 2 rem default
  const [refExposureR, setRefExposureR] = useState<number>(1.0); // 1 R default
  const [refParticleType, setRefParticleType] = useState<'photon' | 'neutron'>('photon');
  const [refParticleEnergyMev, setRefParticleEnergyMev] = useState<number>(0.662);
  const [refFluenceRateCm2S, setRefFluenceRateCm2S] = useState<number>(10000);
  const [refXcomEnergyMev, setRefXcomEnergyMev] = useState<number>(1.25);

  const handleCopyLatex = (tex: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(tex);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

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
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0' }}>📚 Module 30 — Core Literature, Physics Formulations, Reference Calculators &amp; Standards</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Comprehensive peer-reviewed scientific methodology compendium documenting the governing mathematical equations, analytical derivations, interactive reference calculators, and international regulatory standards across all active and expansion modules.
          </p>
        </div>
        <VerificationBadge testId="VTEST-01" label="50/50 Benchmarks Indexed" />
      </div>

      {/* Main Mode View Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'current' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'current' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'current' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'current' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('current')}
        >
          🔬 Active Validated Modules (1–35)
        </button>
        <button
          className={`nav-link ${activeTab === 'derivations' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'derivations' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'derivations' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'derivations' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('derivations')}
        >
          📐 Analytical Derivations &amp; Proofs
        </button>
        <button
          className={`nav-link ${activeTab === 'expansion' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'expansion' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'expansion' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'expansion' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('expansion')}
        >
          🚀 Research &amp; Expansion Specs (36–40)
        </button>
        <button
          className={`nav-link ${activeTab === 'constants' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'constants' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'constants' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'constants' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('constants')}
        >
          🧮 Constants, ICRP 103 Weights &amp; Conversions
        </button>
        <button
          className={`nav-link ${activeTab === 'standards' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'standards' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'standards' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'standards' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('standards')}
        >
          🏛️ Standards Registry &amp; Bibliography
        </button>
      </div>

      {/* Domain Navigation & Search Controls (for methodology views) */}
      {activeTab !== 'standards' && activeTab !== 'constants' && (
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
      {activeTab !== 'standards' && activeTab !== 'constants' && activeDoc && (
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
            <div style={{ padding: '20px', background: 'rgba(3, 7, 18, 0.75)', border: '1px solid var(--color-primary)', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  Primary Mathematical Formulation
                </div>
                <button
                  onClick={() => handleCopyLatex(activeDoc.primaryFormula, `${activeDoc.id}-primary`)}
                  style={{ fontSize: '0.72rem', padding: '3px 9px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: '4px', cursor: 'pointer' }}
                  title="Copy raw LaTeX equation to clipboard"
                >
                  {copiedKey === `${activeDoc.id}-primary` ? '✓ Copied LaTeX' : '📋 Copy LaTeX'}
                </button>
              </div>
              <div style={{ fontSize: '1.3rem', color: '#fff', margin: '10px 0', overflowX: 'auto' }}>
                <BlockMath math={activeDoc.primaryFormula} />
              </div>
            </div>

            {/* Step-by-Step Analytical Derivation */}
            {activeDoc.derivationSteps && activeDoc.derivationSteps.length > 0 && (
              <div style={{ background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  📐 Step-by-Step Analytical Derivation &amp; Proof
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeDoc.derivationSteps.map((step, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{step.stepTitle}</strong>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '4px 0 8px 0' }}>{step.explanation}</p>
                      <div style={{ fontSize: '1.05rem', color: '#00e5ff', overflowX: 'auto' }}>
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
                  Auxiliary &amp; Governing Sub-Equations
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                  {activeDoc.secondaryFormulas.map((sub, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>
                          {sub.label}
                        </span>
                        <button
                          onClick={() => handleCopyLatex(sub.formula, `${activeDoc.id}-sub-${idx}`)}
                          style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                          title="Copy sub-equation LaTeX"
                        >
                          {copiedKey === `${activeDoc.id}-sub-${idx}` ? '✓' : 'LaTeX'}
                        </button>
                      </div>
                      <div style={{ fontSize: '1rem', color: '#fff', overflowX: 'auto' }}>
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
                Symbol Nomenclature &amp; Units
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
            <h3>Regulatory Codes &amp; Standards</h3>
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
                Physical Assumptions &amp; Validity
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

      {/* Fundamental Constants, ICRP 103 Weighting Factors & Unit Conversions Reference Tab */}
      {activeTab === 'constants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            {/* CODATA Physical & Radiological Constants */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>⚛️ Fundamental Physical &amp; Radiological Constants (CODATA / ICRU)</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Exact and consensus physical constants embedded across the RadPro Analyst calculation engines.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Constant Name</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Adopted Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="c" /></td>
                    <td style={{ padding: '7px 8px' }}>Speed of light in vacuum</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.99792458 × 10⁸ m/s</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="m_e c^2" /></td>
                    <td style={{ padding: '7px 8px' }}>Electron rest-mass energy</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.51099895 MeV (511.0 keV)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="m_n c^2" /></td>
                    <td style={{ padding: '7px 8px' }}>Neutron rest-mass energy</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>939.56542 MeV</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="r_0" /></td>
                    <td style={{ padding: '7px 8px' }}>Classical electron radius (<InlineMath math="e^2 / 4\pi\varepsilon_0 m_e c^2" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.81794032 × 10⁻¹⁵ m</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="\sigma_T" /></td>
                    <td style={{ padding: '7px 8px' }}>Thomson scattering cross-section (<InlineMath math="\frac{8}{3}\pi r_0^2" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.66524587 barns (6.652 × 10⁻²⁹ m²)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="\alpha" /></td>
                    <td style={{ padding: '7px 8px' }}>Fine-structure constant</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 / 137.035999 (7.29735 × 10⁻³)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="N_A" /></td>
                    <td style={{ padding: '7px 8px' }}>Avogadro constant</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>6.02214076 × 10²³ mol⁻¹</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="e" /></td>
                    <td style={{ padding: '7px 8px' }}>Elementary charge</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1.602176634 × 10⁻¹⁹ C</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="(W/e)_{\text{air}}" /></td>
                    <td style={{ padding: '7px 8px' }}>Mean energy per ion pair in dry air (ICRU 90)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>33.97 eV / ion pair (J/C)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="W_{\text{Ge}} / W_{\text{Si}}" /></td>
                    <td style={{ padding: '7px 8px' }}>Electron-hole pair creation energy (HPGe / Si)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.96 eV (Ge @ 77K) / 3.62 eV (Si)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="G(\text{H}_2)_{\gamma,\alpha}" /></td>
                    <td style={{ padding: '7px 8px' }}>Water radiolysis hydrogen yield (<InlineMath math="\gamma/\beta" /> vs <InlineMath math="\alpha" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.45 vs 1.6 molecules / 100 eV</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SI <-> Traditional Radiological Unit Conversions */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🔄 Exact SI ↔ Traditional Radiological Unit Conversions</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Statutory conversion factors linking SI radiological quantities to US/traditional health physics units.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>SI Unit</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Exact Conversion Identity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Activity (<InlineMath math="A" />)</td>
                    <td style={{ padding: '7px 8px' }}>Becquerel (<InlineMath math="\text{Bq} = \text{s}^{-1}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Ci = 3.7 × 10¹⁰ Bq = 37 GBq</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Absorbed Dose (<InlineMath math="D" />)</td>
                    <td style={{ padding: '7px 8px' }}>Gray (<InlineMath math="\text{Gy} = \text{J/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Gy = 100 rad | 1 rad = 10 mGy</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Equivalent / Effective Dose (<InlineMath math="H, E" />)</td>
                    <td style={{ padding: '7px 8px' }}>Sievert (<InlineMath math="\text{Sv} = \text{J/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Sv = 100 rem | 1 mSv = 100 mrem</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Exposure (<InlineMath math="X" />)</td>
                    <td style={{ padding: '7px 8px' }}>Coulomb/kg (<InlineMath math="\text{C/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 R = 2.58 × 10⁻⁴ C/kg (dry air)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Exposure → Air Kerma (<InlineMath math="K_{\text{air}}" />)</td>
                    <td style={{ padding: '7px 8px' }}>Gy per Roentgen</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 R ≈ 0.00877 Gy (air) ≈ 0.0096 Gy (tissue)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Radon Concentration / PAEC</td>
                    <td style={{ padding: '7px 8px' }}><InlineMath math="\text{Bq/m}^3" /> / <InlineMath math="\text{WL}" /></td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 pCi/L = 37 Bq/m³ | 1 WL = 2.08 × 10⁻⁵ J/m³</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Reactivity (<InlineMath math="\rho" />)</td>
                    <td style={{ padding: '7px 8px' }}><InlineMath math="\Delta k / k" /></td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 pcm = 10⁻⁵ Δk/k | 1 $ = β_eff (≈ 650 pcm U-235)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Microscopic Cross-Section (<InlineMath math="\sigma" />)</td>
                    <td style={{ padding: '7px 8px' }}>Barn (<InlineMath math="\text{b}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 barn = 10⁻²⁴ cm² = 10⁻²⁸ m²</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Explosive Yield (<InlineMath math="W" />)</td>
                    <td style={{ padding: '7px 8px' }}>Kiloton TNT (<InlineMath math="\text{kt}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 kt TNT = 4.184 × 10¹² J ≈ 1.45 × 10²³ fissions</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Blast Overpressure (<InlineMath math="\Delta P" />)</td>
                    <td style={{ padding: '7px 8px' }}>Kilopascal (<InlineMath math="\text{kPa}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 psi = 6.89476 kPa | 1 atm = 101.325 kPa</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ICRP Publication 103 Radiation & Tissue Weighting Factors */}
          <div className="panel">
            <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🛡️ ICRP Publication 103 (2007) Radiation (<InlineMath math="w_R" />) &amp; Tissue (<InlineMath math="w_T" />) Weighting Factors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginTop: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Table 2: Radiation Weighting Factors (<InlineMath math="H_T = \sum_R w_R D_{T,R}" />)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Radiation Type</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Weighting Factor <InlineMath math="w_R" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Photons (X-rays, <InlineMath math="\gamma" />-rays, bremsstrahlung, all energies)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>1.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Electrons (<InlineMath math="\beta^\pm" />, Auger, internal conversion) and Muons</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>1.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Protons and charged pions</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>2.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Alpha particles (<InlineMath math="\alpha" />), fission fragments, heavy ions</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#f59e0b' }}>20.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="E_n < 1\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="2.5 + 18.2\exp\!\left[-(\ln E_n)^2 / 6\right]" /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="1\text{ MeV} \le E_n \le 50\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="5.0 + 17.0\exp\!\left[-(\ln(2E_n))^2 / 6\right]" /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="E_n > 50\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="2.5 + 3.25\exp\!\left[-(\ln(0.04E_n))^2 / 6\right]" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Table 3: Tissue Weighting Factors (<InlineMath math="E = \sum_T w_T H_T,\; \sum w_T = 1.00" />)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Organ / Tissue Group</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}><InlineMath math="w_T" /></th>
                      <th style={{ padding: '8px', textAlign: 'left' }}><InlineMath math="\sum w_T" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Red bone-marrow, Colon, Lung, Stomach, Breast, Remainder tissues (13 organs)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.12</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.72</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Gonads (heritable stochastic risk)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.08</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.08</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Bladder, Oesophagus, Liver, Thyroid</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.04</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.16</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Bone surface, Brain, Salivary glands, Skin</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.01</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.04</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(0, 229, 255, 0.05)' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Total Whole-Body Effective Dose Normalization</td>
                      <td style={{ padding: '7px 8px' }}>—</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff', fontFamily: 'monospace' }}>1.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Interactive Reference Calculators: Unit Converter & ICRP 74/116 Fluence-to-Dose h*(10) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            {/* Live Bidirectional SI <-> Traditional Unit Solver */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>⚡ Live SI ↔ Traditional Radiological Unit Solver</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Instant bidirectional conversion across Activity, Dose Equivalent, and Ionization Exposure quantities.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Activity Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    1. Activity: GBq ↔ Ci / MBq / mCi / dpm
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Activity (GBq):</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
                        value={refActivityGBq}
                        onChange={e => setRefActivityGBq(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Activity (Curies, Ci):</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={Number((refActivityGBq / 37.0).toPrecision(5))}
                        onChange={e => setRefActivityGBq(Math.max(0, (parseFloat(e.target.value) || 0) * 37.0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.76rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    <span>{(refActivityGBq * 1000).toLocaleString()} MBq</span>
                    <span>{((refActivityGBq / 37.0) * 1000).toFixed(2)} mCi</span>
                    <span>{(refActivityGBq * 1e9 * 60).toExponential(2)} dpm</span>
                  </div>
                </div>

                {/* Dose Equivalent Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    2. Equivalent / Effective Dose: mSv ↔ rem / mrem / µSv
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dose (mSv):</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
                        value={refDoseMSv}
                        onChange={e => setRefDoseMSv(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dose (mrem):</label>
                      <input
                        type="number"
                        step="10"
                        className="form-control"
                        value={Number((refDoseMSv * 100.0).toPrecision(6))}
                        onChange={e => setRefDoseMSv(Math.max(0, (parseFloat(e.target.value) || 0) / 100.0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.76rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    <span>{(refDoseMSv / 1000).toFixed(4)} Sv</span>
                    <span>{(refDoseMSv / 10).toFixed(3)} rem</span>
                    <span>{(refDoseMSv * 1000).toLocaleString()} µSv</span>
                  </div>
                </div>

                {/* Exposure to Air Kerma Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    3. Exposure (Roentgen, R) → Dry Air Kerma &amp; Soft Tissue Dose
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Exposure (R):</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control"
                        value={refExposureR}
                        onChange={e => setRefExposureR(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.77rem', fontFamily: 'monospace', color: '#e2e8f0' }}>
                      <span>Ion Charge: {(refExposureR * 2.58e-4).toExponential(3)} C/kg</span>
                      <span>Air Kerma K<sub>air</sub>: {(refExposureR * 8.77).toFixed(2)} mGy ({(refExposureR * 0.877).toFixed(3)} rad)</span>
                      <span>Soft Tissue D<sub>tissue</sub>: {(refExposureR * 9.60).toFixed(2)} mGy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ICRP Publication 74 / 116 Fluence-to-Dose h*(10) Calculator */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🎯 ICRP 74 / 116 Fluence-to-Dose Conversion (<InlineMath math="\Phi \to \dot{H}^*(10)" />)</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Computes ambient dose equivalent rate <InlineMath math="\dot{H}^*(10) = \phi \cdot h^*(10)" /> from monoenergetic photon or neutron particle flux.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Particle Modality:</label>
                  <select
                    className="form-control"
                    value={refParticleType}
                    onChange={e => setRefParticleType(e.target.value as 'photon' | 'neutron')}
                    style={{ fontSize: '0.84rem' }}
                  >
                    <option value="photon">Photons (γ / X-ray)</option>
                    <option value="neutron">Neutrons (Thermal–20 MeV)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Energy E (MeV):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.000000025"
                    max="20"
                    className="form-control"
                    value={refParticleEnergyMev}
                    onChange={e => setRefParticleEnergyMev(Math.max(2.5e-8, parseFloat(e.target.value) || 0.1))}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Flux φ (particles/cm²·s):</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    className="form-control"
                    value={refFluenceRateCm2S}
                    onChange={e => setRefFluenceRateCm2S(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {refParticleType === 'photon' ? (
                  <>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.0595)}>Am-241 (59.5 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.1405)}>Tc-99m (140 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.6617)}>Cs-137 (662 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(1.25)}>Co-60 (1.25 MeV)</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(2.5e-8)}>Thermal (0.025 eV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(1.0)}>Fission Peak (1 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(2.1)}>Cf-252 Avg (2.1 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(4.5)}>Am-Be Avg (4.5 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(14.1)}>D-T Fusion (14.1 MeV)</button>
                  </>
                )}
              </div>

              {(() => {
                const h10pSvCm2 = refParticleType === 'photon'
                  ? interpolateFluenceCoeff(ICRP74_PHOTON_H10_TABLE, refParticleEnergyMev)
                  : interpolateFluenceCoeff(ICRP74_NEUTRON_H10_TABLE, refParticleEnergyMev);
                // φ (cm^-2 s^-1) * h*(10) (10^-12 Sv cm^2) * 3600 (s/h) * 10^6 (µSv/Sv) = φ * h10 * 3.6e-3 µSv/h
                const doseRateUSvHr = refFluenceRateCm2S * h10pSvCm2 * 0.0036;
                const wrVal = refParticleType === 'neutron' ? evaluateNeutronWr(refParticleEnergyMev) : 1.0;

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Coeff. h*(10)</span>
                      <strong style={{ color: '#00e5ff', fontSize: '1rem', fontFamily: 'monospace' }}>{h10pSvCm2.toFixed(2)} pSv·cm²</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>ICRP 103 w<sub>R</sub>(E)</span>
                      <strong style={{ color: '#f59e0b', fontSize: '1rem', fontFamily: 'monospace' }}>{wrVal.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Ambient Rate Ḣ*(10)</span>
                      <strong style={{ color: '#10b981', fontSize: '1rem', fontFamily: 'monospace' }}>
                        {doseRateUSvHr >= 1000 ? `${(doseRateUSvHr / 1000).toFixed(2)} mSv/h` : `${doseRateUSvHr.toFixed(2)} µSv/h`}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                        ({(doseRateUSvHr / 10.0).toFixed(2)} mrem/h)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 15-Material NIST XCOM + Fast Neutron Removal (Σ_R) Reference Matrix */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#00e5ff' }}>🧱 15-Material NIST XCOM Photon Attenuation &amp; Fast Neutron Removal (<InlineMath math="\Sigma_R" />) Matrix</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                  Live lookup of <InlineMath math="\mu/\rho" />, <InlineMath math="\mu_{\text{en}}/\rho" />, <InlineMath math="\text{HVL}_\gamma" />, <InlineMath math="\text{TVL}_\gamma" />, and Albert-Welton fast neutron removal <InlineMath math="\Sigma_R" /> across all 15 shielding media.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lookup Photon Energy (MeV):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.010"
                  max="15.0"
                  className="form-control"
                  value={refXcomEnergyMev}
                  onChange={e => setRefXcomEnergyMev(Math.max(0.010, Math.min(15.0, parseFloat(e.target.value) || 1.0)))}
                  style={{ width: '110px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Shielding Material</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Z<sub>eff</sub></th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&rho; (g/cm³)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&mu;/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&mu;<sub>en</sub>/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>HVL<sub>&gamma;</sub> (cm)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>TVL<sub>&gamma;</sub> (cm)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>&Sigma;<sub>R</sub>/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>&Sigma;<sub>R</sub> (cm⁻¹)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>HVL<sub>n</sub> (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(XCOM_GP_MATERIALS).map(([key, mat]) => {
                    const xcom = evaluateXCOMAttenuation(key, refXcomEnergyMev);
                    const nSpec = getMaterialNeutronRemoval(key);
                    const hvlG = Math.LN2 / xcom.muLinear;
                    const tvlG = Math.LN10 / xcom.muLinear;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#fff' }}>{mat.name}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{mat.effectiveZ}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{mat.density.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#00e5ff' }}>{xcom.muMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{xcom.muEnMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>{hvlG.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{tvlG.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#d8b4fe' }}>{nSpec.sigmaRMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>{nSpec.sigmaRLinear.toFixed(3)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e9d5ff' }}>{nSpec.hvlNeutronCm.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Master Peer-Reviewed Bibliography & Standards Register (Full View or Tab) */}
      {(activeTab === 'standards' || activeTab === 'current') && (
        <div className="panel" style={{ marginTop: activeTab === 'current' ? '15px' : '0' }}>
          <h3>Master Scientific Bibliography &amp; International Standards Register</h3>
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
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>System of radiological protection, occupational and public dose limits, w_R(E_n) and tissue weighting factors w_T.</td>
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
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nonparametric statistical testing (WRS &amp; Sign), Currie detection limits (MDA/MDC), and site release surveys.</td>
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
                  <td style={{ padding: '10px' }}>Boiler &amp; Pressure Vessel Code, Section V, Article 2, Table T-274.1</td>
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
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Klein &amp; Nishina (1929)</td>
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
                  <td style={{ padding: '10px' }}>AMedP-7.1 Commander&apos;s Guide on Radiation Protection in Military Operations</td>
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
                  <td style={{ padding: '10px' }}>The International Nuclear and Radiological Event Scale User&apos;s Manual</td>
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
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Glasstone &amp; Dolan (1977)</td>
                  <td style={{ padding: '10px' }}>US DoD / ERDA</td>
                  <td style={{ padding: '10px' }}>1977</td>
                  <td style={{ padding: '10px' }}>The Effects of Nuclear Weapons (3rd Edition)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Blast overpressure scaling, Height-of-Burst Mach stem enhancement, thermal exposure, and prompt radiation flash.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>PNE-242F (Project Sedan)</td>
                  <td style={{ padding: '10px' }}>US AEC / Lawrence Livermore</td>
                  <td style={{ padding: '10px' }}>1962</td>
                  <td style={{ padding: '10px' }}>Project Sedan: 104 kt Thermonuclear Excavation Experiment (Nordyke Scaling)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Sub-surface Scaled Depth of Burst (SDOB), throwout crater radius, cavity camouflet containment, and venting fraction.</td>
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
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NUREG/CR-6673</td>
                  <td style={{ padding: '10px' }}>US NRC / ANL</td>
                  <td style={{ padding: '10px' }}>2000</td>
                  <td style={{ padding: '10px' }}>Hydrogen Generation in TRU Waste Transportation Packages</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Radiolytic G(H₂) water decomposition yields, headspace accumulation kinetics, and 4% Lower Flammability Limit (LFL) time-to-reach.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FAA CARI-7A</td>
                  <td style={{ padding: '10px' }}>US FAA / CAMI</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Galactic Cosmic Ray Aviation Dosimetry Model</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Barometric altitude e-folding scale height (L = 135 g/cm²) and geomagnetic cutoff rigidity modulation for aircrew dose.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MIRD Pamphlet No. 21</td>
                  <td style={{ padding: '10px' }}>SNMMI / MIRD</td>
                  <td style={{ padding: '10px' }}>2009</td>
                  <td style={{ padding: '10px' }}>A Generalized Schema for Radiopharmaceutical Dosimetry (Bolch et al.)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Time-integrated activity (TIA), S-value phantom matrices, and Lea-Catcheside Biologically Effective Dose (BED) for Lu-177 / Ac-225.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA FENDL-3.2</td>
                  <td style={{ padding: '10px' }}>IAEA Nuclear Data Section</td>
                  <td style={{ padding: '10px' }}>2021</td>
                  <td style={{ padding: '10px' }}>Fusion Evaluated Nuclear Data Library (D-T 14.1 MeV Neutronics)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>14.1 MeV D-T fusion kinematics, Lawson triple product ignition criteria, and Li-6/Li-7 Tritium Breeding Ratio (TBR).</td>
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
