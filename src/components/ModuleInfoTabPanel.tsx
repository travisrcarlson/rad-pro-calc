import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockMath, InlineMath } from 'react-katex';
import { METHOD_DOCS } from '../modules/Module21/LiteratureModule';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';

export interface ModuleUserGuide {
  whatItDoes: string;
  whenToUse: string[];
  howToUseSteps: string[];
  keyCapabilities: string[];
}

export const MODULE_USER_GUIDES: Record<number, ModuleUserGuide> = {
  1: {
    whatItDoes:
      'Computes external point, line, and planar disc gamma dose rates, broad-beam shielding attenuation with Taylor/Harima GP buildup, internal committed effective dose E(50), and thermal neutron activation yields across four integrated submodules (1A–1D).',
    whenToUse: [
      'Estimating ambient dose equivalent rate H*(10) at any standoff distance from an unshielded or shielded radionuclide source.',
      'Sizing lead, steel, concrete, tungsten, or water shielding slabs with broad-beam Compton scatter buildup.',
      'Evaluating 50-year committed effective dose from inhalation or ingestion intakes and reactor neutron activation.'
    ],
    howToUseSteps: [
      'Select Submodule 1A (External Gamma), 1B (Shielding & Buildup), 1C (Internal Intake), or 1D (Neutron Activation & Beta Bremsstrahlung).',
      'Choose a radionuclide from the ICRP-107 selector (e.g., Cs-137, Co-60, Ir-192) and enter activity (Bq, GBq, Ci) and distance (m).',
      'Add shielding layers or extended source dimensions (line pipe length L or spill radius R) to compare unshielded vs. shielded dose rates and ALARA stay times.'
    ],
    keyCapabilities: [
      'ICRP-107 Specific Gamma Ray Constants (Γ) & Air Kerma',
      'Taylor & ANSI/ANS-6.4.3 GP Broad-Beam Buildup Factors',
      'Bethe-Heitler Beta Bremsstrahlung & Katz-Penfold Range',
      'Thermal Neutron Capture Saturation & Decay Cooling'
    ]
  },
  2: {
    whatItDoes:
      'Calculates occupational worker stay times, cumulative Total Effective Dose Equivalent (TEDE = DDE + CEDE), respiratory protection DAC-hour credits, and 3D multi-source waypoint path dose integration.',
    whenToUse: [
      'Planning Radiologically Controlled Area (RCA) maintenance entries and setting electronic dosimeter turn-back alarms.',
      'Integrating worker dose along a multi-waypoint walk-through path past multiple point, pipe, or pool sources.',
      'Combining external deep dose equivalent with airborne DAC-hour inhalation exposure.'
    ],
    howToUseSteps: [
      'Set the worker’s prior annual dose, administrative dose ceiling, and respiratory Assigned Protection Factor (APF).',
      'Configure workplace point, line-pipe, or circular pool sources and define worker task duration or transit waypoints.',
      'Review allowable stay time (minutes/hours), turn-back dose rate thresholds, and statutory limit utilization.'
    ],
    keyCapabilities: [
      'Allowable Stay-Time & Turn-Around Alarm Solver',
      'Point, Finite Line Pipe & Circular Spill Geometries',
      'Airborne DAC-Hour & Respiratory APF Integration',
      'Multi-Jurisdictional 10 CFR 20 / ICRP 103 Compliance'
    ]
  },
  3: {
    whatItDoes:
      'Models human internal biokinetic retention, serial compartment clearance, bioassay (urinalysis/whole-body count) back-calculation of initial intake I₀, and MIRD organ-level absorbed and committed effective doses.',
    whenToUse: [
      'Retrospectively estimating initial acute intake (Bq or µCi) from a post-incident urine or whole-body bioassay measurement.',
      'Tracking multi-exponential biological clearance across respiratory, GI tract, blood, bone, thyroid, or liver compartments.',
      'Evaluating ICRP 66/130 inhalation particle size (AMAD 1 µm vs. 5 µm) and lung absorption type (Type F, M, S) impacts.'
    ],
    howToUseSteps: [
      'Select the radionuclide, intake pathway (inhalation, ingestion, wound), and lung absorption type (F, M, or S).',
      'Enter either a known intake activity I₀ (Forward Mode) or a measured bioassay activity M(t) at time t post-intake (Reverse Mode).',
      'Inspect organ dose distribution, ALI/DAC fractions, and the time-dependent retention and excretion curves.'
    ],
    keyCapabilities: [
      'Forward Intake-to-Dose & Reverse Bioassay-to-Intake',
      'ICRP 66 / 100 / 130 Respiratory & GI Biokinetics',
      'MIRD Organ S-Value & Target Organ Equivalent Doses',
      'Multi-Compartment Retention & Excretion Curves'
    ]
  },
  4: {
    whatItDoes:
      'Provides an interactive 3D WebGL volumetric room workspace with multi-source placement, 3D bounding-box shielding walls (Kay-Kajiya ray-AABB intersection), virtual detector probes, and 3D point-cloud isodose rendering.',
    whenToUse: [
      'Visualizing 3D radiation fields inside a hot cell, vault, or multi-room facility layout.',
      'Testing how concrete or lead partition walls cast geometric radiation shadows across a 3D room.',
      'Placing virtual sensor probes in 3D space to verify receptor dose rates before physical entry.'
    ],
    howToUseSteps: [
      'Add or position 3D radiation sources and structural shielding walls using the coordinate controls or scene presets.',
      'Toggle the 3D volumetric voxel cloud or slice planes and orbit/pan/zoom the WebGL camera.',
      'Read real-time attenuated dose rates at each virtual detector probe accounting for 3D ray-slab intersection thickness.'
    ],
    keyCapabilities: [
      'Interactive 3D WebGL Volumetric Voxel Cloud',
      'Exact Kay-Kajiya 3D Ray-AABB Wall Penetration',
      'Multi-Source & Virtual Detector Probe Array',
      'Real-Time Geometric Shadowing & Buildup'
    ]
  },
  5: {
    whatItDoes:
      'Generates 2D planar radiation heatmaps, logarithmic isodose contours, exclusion zone boundaries (Restricted, Radiation Area, High Radiation Area), and line-of-sight barrier shadow maps.',
    whenToUse: [
      'Creating 2D floor-plan radiation zone maps for Radiation Work Permits (RWPs) and posting boundaries.',
      'Identifying 0.02 mSv/h (2 mrem/h), 0.05 mSv/h (5 mrem/h), and 1.0 mSv/h (100 mrem/h) regulatory cordon perimeters.',
      'Evaluating multi-source superposition and barrier shadow cones on a 2D facility grid.'
    ],
    howToUseSteps: [
      'Place one or more sources and linear shield barriers on the 2D facility coordinate grid.',
      'Select display mode (Logarithmic Dose Heatmap, Statutory Zone Classification, or Contour Isolines).',
      'Hover over any coordinate (x, y) to inspect exact local dose rate, dominant source contributor, and zone posting.'
    ],
    keyCapabilities: [
      '2D Multi-Source Superposition & Contour Mapping',
      'Statutory 10 CFR 20 Posting Boundary Contours',
      'Line-of-Sight Shielding Barrier Shadowing',
      'Interactive Cursor Readout & Dossier Export'
    ]
  },
  6: {
    whatItDoes:
      'Serves as a tactical CBRN & radiological first-responder command console implementing DOT ERG 2024 isolation zones, 10 R/h turn-back boundaries, REAC/TS acute triage, and field decontamination workflows.',
    whenToUse: [
      'Responding to a Radiological Dispersal Device (RDD / "dirty bomb"), transport accident, or found orphan source.',
      'Establishing inner hot-zone, warm decontamination corridor, and cold command post standoff distances.',
      'Calculating emergency responder stay times under 5 rem, 10 rem (property), and 25 rem (life-saving) OEG tiers.'
    ],
    howToUseSteps: [
      'Select the threat scenario or nuclide, source activity, or measured field meter reading at a known standoff distance.',
      'Review automatic Hot Zone (100 µSv/h / 10 mR/h) and Turn-Back (100 mSv/h / 10 R/h) perimeter radii.',
      'Use the Triage, Decon, and Countermeasure sub-tabs to generate actionable field orders and dispatch to Tactical GIS.'
    ],
    keyCapabilities: [
      'DOT ERG 2024 & NCRP-165 Tactical Cordon Sizing',
      'Inverse-Square Standoff & Turn-Back Perimeter Solver',
      'REAC/TS Acute Radiation Syndrome (ARS) Field Triage',
      'One-Click Dispatch to Plume, GIS & Countermeasures'
    ]
  },
  7: {
    whatItDoes:
      'Models post-detonation fission-product fallout decay (Way-Wigner t⁻¹·² law), multi-story building Protection Factors (PF), optimal shelter-vs-evacuation egress timing, and dicentric chromosome biodosimetry.',
    whenToUse: [
      'Predicting fallout gamma dose rates and cumulative shelter doses from H+1 to H+720 hours after a nuclear detonation.',
      'Determining the optimal hour to exit a low-PF shelter to evacuate without exceeding acute dose thresholds.',
      'Converting lymphocyte counts or cytogenetic dicentric yields into absorbed whole-body dose (METREPOL).'
    ],
    howToUseSteps: [
      'Enter reference H+1 fallout dose rate (R/h or Sv/h), arrival time t_a, and shelter Protection Factor (PF).',
      'Compare cumulative unsheltered vs. sheltered dose integrals across the 7-10 Rule decay timeline.',
      'Switch to the Shelter PF, Egress Optimizer, or Biodosimetry tabs to refine protective action decisions.'
    ],
    keyCapabilities: [
      'Way-Wigner t⁻¹·² Fallout Decay & 7-10 Rule Integrator',
      'NCRP-165 Structural Protection Factor (PF) Calculator',
      'Optimal Shelter-to-Evacuation Egress Timing Solver',
      'Cytogenetic Dicentric & Lymphocyte Depletion Triage'
    ]
  },
  8: {
    whatItDoes:
      'Simulates prompt nuclear weapon effects—Kingery-Bulmash airblast overpressure (psi) and dynamic wind, thermal radiation fluence (cal/cm²) and burn thresholds, initial prompt neutron/gamma radiation, subterranean cratering, and HEMP.',
    whenToUse: [
      'Assessing blast damage rings (20 psi, 5 psi, 1 psi), thermal third-degree burn radii, and prompt radiation lethality for yields from 0.01 kt to 50 MT.',
      'Comparing surface burst vs. optimal airburst Height of Burst (HOB) Mach-stem enhancement.',
      'Evaluating subterranean Depth of Burst (DOB) crater dimensions and High-Altitude EMP (HEMP) E1/E2/E3 footprints.'
    ],
    howToUseSteps: [
      'Select weapon yield (kt), burst mode (Surface, Airburst HOB, or Subsurface DOB), and fission fraction.',
      'Inspect the concentric damage radii table and interactive blast/thermal/radiation radial attenuation profiles.',
      'Explore the Subterranean Cratering and HEMP electric-field tabs for infrastructure vulnerability analysis.'
    ],
    keyCapabilities: [
      'Glasstone & Dolan / Kingery-Bulmash Airblast Scaling',
      'Height-of-Burst (HOB) Mach Stem Overpressure Solver',
      'Atmospheric Transmittance Thermal Fluence & Burn Radii',
      'Subterranean Cratering (Cube-Root) & HEMP E1/E2/E3'
    ]
  },
  9: {
    whatItDoes:
      'Models clinical pharmacokinetics and decorporation efficacy for medical countermeasures: Potassium Iodide (KI) thyroid blocking, Prussian Blue (Cs-137/Tl-201), Ca-DTPA/Zn-DTPA chelation (Pu/Am/Cm), and G-CSF cytokine therapy.',
    whenToUse: [
      'Determining how administration delay (hours post-intake) impacts KI thyroid blocking or DTPA actinide chelation efficacy.',
      'Calculating age-stratified FDA dosage schedules (neonates, children, adults, pregnant women) for KI, Prussian Blue, and DTPA.',
      'Projecting averted committed effective dose ΔE(50) from decorporation treatment.'
    ],
    howToUseSteps: [
      'Select the internalized radionuclide (I-131, Cs-137, Pu-239, Am-241, Sr-90) and patient age/weight cohort.',
      'Adjust the time delay between exposure and first countermeasure dose (e.g., t = 0.5 h vs. 6 h vs. 24 h).',
      'Compare untreated vs. treated biological half-life clearance curves and averted organ dose.'
    ],
    keyCapabilities: [
      'Time-Dependent KI Thyroid Blocking Efficacy Curve',
      'Prussian Blue Enterohepatic Cs-137 Clearance Acceleration',
      'Ca-DTPA / Zn-DTPA Transuranic Chelation Kinetics',
      'FDA / REAC/TS Age-Stratified Dosing & Contraindications'
    ]
  },
  10: {
    whatItDoes:
      'Provides a tactical geospatial command map with live radiological sensor pickets, multi-sensor inverse-square trilateration, bearing intersection, and Cursor-on-Target (CoT) XML packet generation for ATAK/WinTAK.',
    whenToUse: [
      'Fusing live or simulated dose-rate telemetry from multiple field perimeter sensors on a tactical coordinate grid.',
      'Exporting NATO/DoD standard Cursor-on-Target (CoT) XML hazard markers and plume polygons to ATAK/WinTAK.',
      'Pinpointing an unknown source coordinate from distributed perimeter radiation readings.'
    ],
    howToUseSteps: [
      'Inspect or reposition perimeter sensor pickets on the tactical map and review real-time dose-rate telemetry.',
      'Run the multi-sensor source localization solver to triangulate the unknown emitter position and activity.',
      'Generate and copy/download CoT XML packets for tactical situational awareness networks.'
    ],
    keyCapabilities: [
      'Multi-Picket Telemetry Mesh & Threat Alerting',
      'Least-Squares Source Localization & Bearing Solver',
      'ATAK / WinTAK Cursor-on-Target (CoT) XML Generator',
      'Cross-Module Incident & Plume Overlay Integration'
    ]
  },
  11: {
    whatItDoes:
      'Offers an interactive tabletop exercise and incident drill builder with historical/tactical presets, multi-phase timeline injects, `.radcase` JSON scenario import/export, and one-click dispatch to analytical modules.',
    whenToUse: [
      'Conducting health physics, hazmat, or emergency response training drills and tabletop exercises.',
      'Packaging a complete multi-source radiological scenario into a portable `.radcase` file to share with a team.',
      'Dispatching scenario parameters directly into the Dose Calculator, Plume Model, or First Responder modules.'
    ],
    howToUseSteps: [
      'Load a built-in drill archetype (e.g., Orphan Teletherapy Source, Transport Cask Breach, Fissile Solution Spill) or build a custom scenario.',
      'Step through timeline injects and evaluate responder protective actions against statutory dose limits.',
      'Export the `.radcase` JSON file or click any dispatch button to launch the corresponding physics solver.'
    ],
    keyCapabilities: [
      'Multi-Phase Tabletop Exercise & Inject Timeline',
      'Portable `.radcase` Scenario Import & Export',
      'Integrated INES Severity & Protective Action Scoring',
      'One-Click Parameter Dispatch Across Platform Modules'
    ]
  },
  12: {
    whatItDoes:
      'Solves the inverse radiological forensic problem: given 3 or more spatially distributed dose-rate measurements (or survey CSV logs), reconstructs the unknown point-source coordinates (x₀, y₀), activity A₀, and shielding state.',
    whenToUse: [
      'Locating a hidden, lost, or orphaned radioactive source using sparse field survey meter readings.',
      'Back-calculating unknown source activity GBq/Ci from perimeter dose-rate readings at multiple distances.',
      'Importing field survey CSV logs to map isopleths and identify hot-spot centroids.'
    ],
    howToUseSteps: [
      'Enter 3 or more survey measurement coordinates (x_i, y_i) and measured dose rates (µSv/h or mR/h), or upload a survey CSV.',
      'Select the suspected radionuclide (or let the solver normalize by specific gamma constant Γ).',
      'Review the converged source location (x₀, y₀), reconstructed activity A₀, residual fit error, and 2D isopleth map.'
    ],
    keyCapabilities: [
      'Nonlinear Inverse-Square Multilateration Solver',
      'Unknown Source Activity A₀ Back-Calculation',
      'Field Survey CSV Import & Isopleth Contouring',
      'Residual Error & Confidence Ellipse Diagnostics'
    ]
  },
  13: {
    whatItDoes:
      'Models atmospheric radioactive dispersion using the Pasquill-Gifford / Briggs Gaussian plume equation with Holland momentum/buoyancy plume rise, Chamberlain wet/dry source depletion, PBL inversion lid trapping, and live WMO meteorology.',
    whenToUse: [
      'Predicting downwind airborne concentration χ(x,y,z), ground deposition, and TEDE/Thyroid doses from a stack or ground release.',
      'Evaluating EPA PAG (10 mSv TEDE / 50 mSv Thyroid) shelter-in-place and evacuation keyhole distances.',
      'Simulating rainout/washout wet scavenging and atmospheric thermal inversion lid reflection.'
    ],
    howToUseSteps: [
      'Select release nuclide, source term Q (Bq/s or total Bq), release height H, stack parameters, and Pasquill stability class (A–F) or fetch Live WMO Weather.',
      'Toggle Dry Deposition (v_d), Wet Washout (Λ), and Planetary Boundary Layer (PBL) Inversion Lid height H_mix.',
      'Inspect downwind centerline concentration, 2D plume footprint, and EPA PAG protective action zones.'
    ],
    keyCapabilities: [
      'Pasquill-Gifford & Briggs Rural/Urban Dispersion (A–F)',
      'Holland Plume Rise & Building Wake Downwash',
      'Chamberlain Wet/Dry Depletion & PBL Inversion Lid',
      'Live Open-Meteo WMO Weather & Turner Auto-Stability'
    ]
  },
  14: {
    whatItDoes:
      'Performs advanced multi-layer laminated gamma and fast-neutron shielding design using exact NIST XCOM mass attenuation coefficients (with K/L absorption edges), ANSI/ANS-6.4.3 5-parameter Harima GP buildup, Kalos/Broder composite slab order effects, and Albert-Welton fast-neutron removal cross-sections (Σ_R).',
    whenToUse: [
      'Designing multi-layer laminated shields (e.g., Water → Lead vs. Lead → Water, or Iron + Borated Polyethylene for neutron/gamma fields).',
      'Accounting for high-Z photoelectric K-edge discontinuities (e.g., Lead at 88.005 keV) and deep-penetration buildup up to 40 mfp.',
      'Evaluating EPA/NRC Protective Action Guide (PAG) shielding reduction factors.'
    ],
    howToUseSteps: [
      'Configure photon/neutron energy or source nuclide and add up to multiple laminated shield layers with custom thicknesses.',
      'Compare Kalos/Broder order-dependent buildup (e.g., placing high-Z Lead downstream of low-Z Water to absorb scattered photons).',
      'Inspect the NIST XCOM cross-section spectrum, GP buildup curve, and fast-neutron removal transmission.'
    ],
    keyCapabilities: [
      'NIST XCOM Log-Log Cross-Sections with Exact K/L Edges',
      'ANSI/ANS-6.4.3 5-Parameter Harima GP Buildup Engine',
      'Kalos / Broder Multi-Layer Composite Buildup Solver',
      'Albert-Welton Fast Neutron Removal (Σ_R) Attenuation'
    ]
  },
  15: {
    whatItDoes:
      'Evaluates radioactive material transport packaging compliance under IAEA SSR-6 (2018) and 49 CFR 173, computing A₁/A₂ package limits, multi-nuclide harmonic mixture rules (A₂,mix), Transport Index (TI), Criticality Safety Index (CSI), and DOT White-I / Yellow-II / Yellow-III placarding.',
    whenToUse: [
      'Qualifying a single- or multi-radionuclide shipment as Excepted, Type A, Type B(U), or Type C packaging.',
      'Determining Transport Index (TI) from 1-meter dose rate and assigning DOT/IAEA hazard labels (White-I, Yellow-II, Yellow-III).',
      'Checking surface contamination wipe results against 49 CFR 173.443 non-fixed contamination limits.'
    ],
    howToUseSteps: [
      'Select single or mixture mode, choose radionuclides and activities, and enter package surface and 1-meter dose rates.',
      'Review automatic A₁ (special form) and A₂ (normal form) fraction sums and package type qualification.',
      'Inspect the assigned Transport Index (TI), DOT label category, UN number, and contamination wipe compliance.'
    ],
    keyCapabilities: [
      'IAEA SSR-6 & 49 CFR 173.435 A₁ / A₂ Package Classifier',
      'Para. 405 Multi-Radionuclide Harmonic Mixture Solver',
      'Transport Index (TI) & DOT Label (I / II / III) Engine',
      'Non-Fixed Surface Contamination Wipe Verification'
    ]
  },
  16: {
    whatItDoes:
      'Analyzes pulsed and flash X-ray generators (nanosecond Golden Engineering NDT units, medical LINACs, and industrial betatrons), computing per-pulse kerma, instantaneous peak dose rate during the pulse, duty-cycle time-averaged dose rate, and detector dead-time saturation.',
    whenToUse: [
      'Evaluating radiation safety and shielding for nanosecond flash X-ray radiography or pulsed accelerator beams.',
      'Predicting Geiger-Müller or proportional counter dead-time paralysis and under-reading in high-intensity pulsed fields.',
      'Calculating NCRP-147 / NCRP-151 primary and secondary barrier workloads.'
    ],
    howToUseSteps: [
      'Select a pulsed generator preset or enter pulse width τ_p (ns/µs), repetition rate f_rep (Hz), and dose per pulse.',
      'Compare time-averaged dose rate against instantaneous in-pulse flux rate.',
      'Evaluate detector dead-time saturation and required NCRP structural shielding thickness.'
    ],
    keyCapabilities: [
      'Nanosecond Flash X-Ray & Pulsed LINAC Duty-Cycle Solver',
      'Instantaneous In-Pulse Peak Flux vs. Average Dose Rate',
      'Pulsed-Field Detector Dead-Time Saturation Modeling',
      'NCRP-147 / NCRP-151 Barrier Attenuation Calculator'
    ]
  },
  17: {
    whatItDoes:
      'Simulates X-ray tube bremsstrahlung and characteristic emission spectra using Kramers/Birch-Marshall physics, Duane-Hunt minimum wavelength cutoff (λ_min), anode target selection (W, Mo, Rh, Cu), inherent/added filtration beam hardening, and Half-Value Layer (HVL).',
    whenToUse: [
      'Modeling how tube potential (kVp), anode angle, and Al/Cu filtration shape the X-ray energy spectrum and mean beam energy.',
      'Calculating Duane-Hunt quantum cutoff wavelength λ_min (nm) and anode thermal heat unit (HU) loading.',
      'Determining first and second Half-Value Layers (HVL₁, HVL₂) and beam homogeneity coefficient.'
    ],
    howToUseSteps: [
      'Set tube potential (kVp), tube current (mA), exposure time (s), anode target material, and Al/Cu filter thicknesses.',
      'Inspect the generated bremsstrahlung + characteristic Kα/Kβ X-ray spectrum and Duane-Hunt cutoff.',
      'Review filtered air kerma output, mean effective energy, and HVL beam-hardening metrics.'
    ],
    keyCapabilities: [
      'Kramers & Birch-Marshall Bremsstrahlung Spectrum Engine',
      'Duane-Hunt Quantum Cutoff Law (λ_min = hc/eV)',
      'W, Mo, Rh & Cu Characteristic K-Edge Emission Lines',
      'Multi-Filter Beam Hardening & HVL Homogeneity Solver'
    ]
  },
  18: {
    whatItDoes:
      'Computes radiographic geometric magnification (M = SID/SOD), focal-spot penumbra (geometric unsharpness Ug), inclined-object foreshortening, off-axis elongation, and ASME Section V Article 2 NDT image quality compliance.',
    whenToUse: [
      'Optimizing Source-to-Image Distance (SID) and Object-to-Image Distance (OID) in industrial NDT or medical radiography.',
      'Verifying that geometric unsharpness Ug = F × OID / SOD meets ASME Boiler & Pressure Vessel Code Section V limits.',
      'Visualizing the 3D X-ray beam frustum, focal spot penumbra, and detector plane projection.'
    ],
    howToUseSteps: [
      'Set focal spot size F (mm), Source-to-Image Distance (SID), Object-to-Image Distance (OID), and object tilt/offset.',
      'Review magnification factor M, geometric unsharpness Ug, and ASME Section V compliance status.',
      'Interact with the 2D/3D beam frustum visualizer to observe penumbra and distortion changes in real time.'
    ],
    keyCapabilities: [
      'ASME Section V Art. 2 Geometric Unsharpness (Ug) Verifier',
      'SID / SOD / OID Magnification & Inverse-Square Scaling',
      'Inclined Foreshortening & Off-Axis Elongation Solver',
      'Interactive X-Ray Beam Frustum & Penumbra Visualizer'
    ]
  },
  19: {
    whatItDoes:
      'Performs ANSI Z136.1-2022 and IEC 60825-1 laser hazard evaluations, computing Maximum Permissible Exposure (MPE) for cornea and skin, Nominal Ocular Hazard Distance (NOHD), aided-viewing extended NOHD, and required laser safety eyewear Optical Density (OD).',
    whenToUse: [
      'Calculating ocular hazard distances (NOHD) and specifying laser safety goggles (OD ≥ log₁₀(H₀/MPE)) for CW or pulsed lasers.',
      'Evaluating ultraviolet, visible, near-IR (retinal hazard region 400–1400 nm), and far-IR (CO₂ 10.6 µm) laser systems.',
      'Assessing binocular/telescope aided-viewing hazards across outdoor laser ranges.'
    ],
    howToUseSteps: [
      'Select a laser preset or input wavelength λ (nm), beam power/pulse energy, beam waist diameter a, and divergence φ (mrad).',
      'Review the computed corneal/skin MPE, unaided and optically aided NOHD (meters), and ANSI Z136 laser class.',
      'Read the minimum required protective eyewear Optical Density (OD) and beam irradiance profile vs. distance.'
    ],
    keyCapabilities: [
      'ANSI Z136.1-2022 Corneal & Skin MPE Lookup Engine',
      'Unaided & Aided-Viewing Ocular Hazard Distance (NOHD)',
      'Protective Eyewear Optical Density (OD) Specification',
      'Gaussian Beam Divergence & Irradiance vs. Range Plot'
    ]
  },
  20: {
    whatItDoes:
      'Evaluates Radiofrequency (RF), Microwave, and Electronic Warfare (EW) non-ionizing electromagnetic radiation hazards under FCC OET Bulletin 65, IEEE C95.1-2019, and ICNIRP, computing Fraunhofer far-field boundaries, main-beam power density S (W/m² or mW/cm²), MPE keep-out zones, and tissue Specific Absorption Rate (SAR).',
    whenToUse: [
      'Establishing personnel exclusion zones in front of high-power radar, satellite uplink, or EW jamming antennas.',
      'Calculating near-field fresnel/fraunhofer transition distances (R_ff = 2D²/λ) and duty-factor averaged power density.',
      'Checking Occupational/Controlled vs. General Public/Uncontrolled MPE compliance from 300 kHz to 300 GHz.'
    ],
    howToUseSteps: [
      'Select an RF/radar system preset or enter frequency (MHz/GHz), peak transmitter power, duty cycle, antenna gain (dBi), and aperture diameter D.',
      'Inspect the Fraunhofer far-field distance R_ff, on-axis power density S, and Controlled/Uncontrolled safe standoff distances.',
      'Review the radial power density attenuation curve against IEEE C95.1 / FCC OET-65 MPE limits.'
    ],
    keyCapabilities: [
      'FCC OET-65 & IEEE C95.1-2019 Frequency-Dependent MPE',
      'Fraunhofer Far-Field Boundary (2D²/λ) & Near-Field Clamp',
      'Radar Duty-Cycle Averaging & Ground Reflection Factor',
      'Whole-Body & Local Tissue SAR Estimation'
    ]
  },
  21: {
    whatItDoes:
      'Solves nuclear criticality safety and reactor core physics: 4-factor and 6-factor multiplication (k_∞, k_eff), geometric buckling B² and non-leakage probabilities, Keepin (1965) 6-group delayed neutron Inhour kinetics, and post-SCRAM I-135 → Xe-135 ("Xenon Pit") & Sm-149 fission-product poison transients.',
    whenToUse: [
      'Evaluating fissile assembly multiplication k_eff, reactivity ρ (pcm, %Δk/k, Dollars & Cents), and minimum critical mass/dimensions.',
      'Computing asymptotic reactor period T and prompt-jump ratio from the 6-group Keepin delayed neutron Inhour equation.',
      'Predicting post-SCRAM Xenon-135 peak poison worth, time to peak t_max (~10–11 h), and reactor restart dead-time windows.'
    ],
    howToUseSteps: [
      'Configure lattice 4-factor inputs (η, f, p, ε) and core geometry (Sphere, Cylinder, Slab) to solve k_eff and geometric buckling B².',
      'Use the Keepin 6-Group Inhour panel to select fissile fuel (U-235, Pu-239, U-233) and reactivity step (cents) to solve reactor period T.',
      'Use the Xe-135 / Sm-149 Poison Transient panel to simulate post-SCRAM Xenon buildup and 72-hour reactivity recovery.'
    ],
    keyCapabilities: [
      'Six-Factor Formula (k_eff = η·f·p·ε·P_FNL·P_TNL) & Buckling',
      'Keepin (1965) 6-Group Delayed Neutron Inhour Solver',
      'Post-SCRAM Xe-135 ("Xenon Pit") & Sm-149 Transient Engine',
      '2D Core Neutron Flux & Power Peaking Mesh Visualizer'
    ]
  },
  22: {
    whatItDoes:
      'Models prompt-criticality excursion kinetics (Nordheim-Fuchs sech² pulse profile for bare metal and fissile solutions), prompt neutron/gamma flash dosimetry, and ANSI/ANS-8.3 Criticality Accident Alarm System (CAAS) 2-out-of-3 (2oo3) facility detector coverage.',
    whenToUse: [
      'Analyzing fissile excursion bursts (e.g., Godiva metal assembly, Tokaimura uranyl nitrate solution tank, or plutonium glovebox accidents).',
      'Verifying that CAAS detectors trip under the ANSI/ANS-8.3 Minimum Accident of Concern (20 rad/min at 2.0 m) across a facility bay.',
      'Identifying uncovered blind zones or single-channel (1oo3) regions in a 3-detector 2oo3 coincidence array.'
    ],
    howToUseSteps: [
      'Select an excursion archetype (Godiva HEU Metal, Uranyl Nitrate Solution, or Plutonium Scrap) and set fission yield and shield thickness.',
      'Switch to Tab 2 (ANSI/ANS-8.3 CAAS Coverage) to configure the 3-detector array topology, trip setpoint (rad/h), and interior wall thickness on the 60m × 40m facility heatmap.',
      'Switch to Tab 3 (Prompt Neutron/Gamma Kerma) to inspect the 1–100 m radial flash profile and LD₅₀/₆₀ (4.0 Sv) lethal radius.'
    ],
    keyCapabilities: [
      'Nordheim-Fuchs Prompt Excursion Power & Energy Pulse',
      'ANSI/ANS-8.3 2D Facility 2oo3 Coincidence Coverage Map',
      'Prompt Neutron (w_R = 10) & Gamma Flash Radial Profile',
      '10 CFR 70.24 Evacuation & Na-24 Activation Triage Plan'
    ]
  },
  23: {
    whatItDoes:
      'Executes a browser-native stochastic Monte Carlo photon transport micro-kernel tracking individual photon histories through matter via inverse-transform free-path sampling, Klein-Nishina Compton scattering (Kahn rejection), photoelectric absorption, and pair production.',
    whenToUse: [
      'Visualizing individual stochastic photon tracks, Compton scatter deflections, and energy deposition inside a shielding slab.',
      'Comparing stochastic Monte Carlo transmission, albedo back-scatter, and buildup against deterministic analytical formulas.',
      'Evaluating statistical convergence, relative error (RE), and Figure of Merit (FOM) as history count N increases.'
    ],
    howToUseSteps: [
      'Select incident photon energy (MeV), slab material (Lead, Concrete, Water, Iron), slab thickness (cm), and history count N.',
      'Run the Monte Carlo transport simulation and inspect the 2D/3D particle track canvas (transmitted, absorbed, back-scattered).',
      'Review tallied transmission fraction, stochastic dose buildup factor B, pulse-height spectrum, and statistical uncertainty.'
    ],
    keyCapabilities: [
      'Stochastic Path-Length Sampling s = -ln(ξ)/Σ_t',
      'Kahn Rejection Sampling of Klein-Nishina Differential Cross-Section',
      'Photoelectric, Compton & Pair-Production Branching',
      'Live Particle Track Visualization & Statistical Tallying'
    ]
  },
  24: {
    whatItDoes:
      'Solves multi-generation Bateman decay chains (secular and transient equilibrium), time-dependent parent-to-daughter atomic and activity ratio pie charts, Mo-99/Tc-99m radiochemical generator elution ("milking") schedules, and sealed-cask water radiolysis H₂ flammability kinetics.',
    whenToUse: [
      'Tracking how a parent isotope transmutes into radioactive and stable daughters over time via interactive line and pie/donut ratio charts.',
      'Simulating periodic saline elution ("milking") of a Mo-99 → Tc-99m or Sr-90 → Y-90 generator column.',
      'Calculating radiolytic hydrogen gas (H₂) buildup and time to reach the 4.0% Lower Flammability Limit (LFL) in sealed TRU waste containers.'
    ],
    howToUseSteps: [
      'Select a decay chain preset (e.g., Mo-99 → Tc-99m, Ra-226 → Rn-222, Cs-137 → Ba-137m, U-238 series) and initial activity.',
      'Drag the interactive time scrubber to watch the Parent-to-Daughter Activity Share and Atomic Inventory Pie Charts evolve in real time.',
      'Switch to the Generator Milking Simulator or Radiolysis H₂ Flammability tabs for specialized radiochemical and waste safety modeling.'
    ],
    keyCapabilities: [
      'Exact Multi-Generation Bateman ODE Analytical Solver',
      'Dynamic Time-Scrubbed Parent/Daughter Ratio Pie Charts',
      'Mo-99/Tc-99m Generator Elution ("Milking") Sawtooth Model',
      'NUREG/CR-6673 Water Radiolysis H₂ 4% LFL Time Solver'
    ]
  },
  25: {
    whatItDoes:
      'Simulates Multi-Channel Analyzer (MCA) gamma-ray spectroscopy across HPGe, NaI(Tl), LaBr₃(Ce), and CZT detectors, featuring Compton continuum physics, Mariscotti (1967) automated second-difference photopeak search, ANSI N42.42 / ORTEC `.SPE` / `.CHN` file import, and forensic isotope identification.',
    whenToUse: [
      'Comparing photopeak energy resolution (FWHM %) between cryogenic HPGe and room-temperature NaI(Tl) or LaBr₃(Ce) detectors.',
      'Importing an empirical ANSI N42.42 XML, `.SPE`, or `.CHN` spectrum file to automatically detect peaks and identify unknown isotopes.',
      'Locating Compton edges, backscatter peaks, and single/double escape peaks in complex multi-nuclide spectra.'
    ],
    howToUseSteps: [
      'Choose a detector crystal (HPGe, NaI(Tl), LaBr₃, CZT) and select synthetic source nuclides or upload an ANSI N42.42 / `.SPE` spectrum file.',
      'Adjust acquisition live time, background level, and ROI energy cursors on the interactive MCA spectrogram.',
      'Review the Mariscotti automated peak table (centroid keV, net area, FWHM %, significance Z_i, and matched ICRP-107 isotope).'
    ],
    keyCapabilities: [
      'HPGe, NaI(Tl), LaBr₃(Ce) & CZT Resolution Modeling',
      'ANSI N42.42 XML, ORTEC .SPE & Maestro .CHN Parser',
      'Mariscotti (1967) Automated Second-Difference Peak Finder',
      'Compton Edge, Backscatter & Escape Peak Annotation'
    ]
  },
  26: {
    whatItDoes:
      'Implements the AAPM Task Group 43 (TG-43U1) clinical brachytherapy dosimetry formalism for interstitial and intracavitary sealed sources (Ir-192, I-125, Pd-103, Cs-137), computing air-kerma strength S_K (U), radial dose function g(r), 2D anisotropy F(r,θ), and BED / EQD2 radiobiology.',
    whenToUse: [
      'Calculating 2D dose distributions around line or point brachytherapy seeds using consensus AAPM TG-43 parameters.',
      'Converting source activity (mCi/GBq) to Air-Kerma Strength S_K (1 U = 1 µGy·m²/h = 1 cGy·cm²/h).',
      'Evaluating Linear-Quadratic Biologically Effective Dose (BED) and 2-Gy Equivalent Dose (EQD2) for tumor vs. Organs at Risk (OAR).'
    ],
    howToUseSteps: [
      'Select a clinical brachytherapy seed (e.g., Ir-192 HDR, I-125 OncoSeed, Pd-103) and enter source strength S_K (U) and dwell time.',
      'Specify target coordinate (r, θ) or inspect the 2D polar/Cartesian isodose contour map.',
      'Enter fractionation schedule and tissue α/β ratios to compute BED and EQD2 biological efficacy.'
    ],
    keyCapabilities: [
      'AAPM TG-43U1 2D Line-Source Geometry Factor G_L(r,θ)',
      'Consensus Radial Dose g(r) & 2D Anisotropy F(r,θ) Tables',
      'Linear-Quadratic BED & EQD2 Radiobiological Solver',
      '2D Isodose Contour & Prescription Margin Visualizer'
    ]
  },
  27: {
    whatItDoes:
      'Performs NUREG-1575 MARSSIM (Multi-Agency Radiation Survey and Site Investigation Manual) final status decommissioning statistical tests: Class 1/2/3 survey unit sample sizing, non-parametric One-Sample Sign Test, Wilcoxon Rank Sum (WRS) Test, and Elevated Measurement Comparison (EMC).',
    whenToUse: [
      'Determining the minimum number of statistical survey measurements N required to release a decommissioned facility or site.',
      'Running the Wilcoxon Rank Sum (WRS) test (when radionuclide is present in background) or Sign Test against a DCGL_W release limit.',
      'Checking whether localized hot spots exceed the area-weighted DCGL_EMC ceiling.'
    ],
    howToUseSteps: [
      'Set the Derived Concentration Guideline Level (DCGL_W), Lower Bound of the Gray Region (LBGR), measurement standard deviation σ, and Type I/II error rates (α, β).',
      'Enter or load Survey Unit and Reference Background sample measurements.',
      'Review required sample count N, WRS / Sign Test critical values, pass/fail release determination, and power curve.'
    ],
    keyCapabilities: [
      'NUREG-1575 MARSSIM Sample Size N & Relative Shift Δ/σ',
      'Non-Parametric Wilcoxon Rank Sum (WRS) & Sign Test',
      'Elevated Measurement Comparison (DCGL_EMC) Hot-Spot Check',
      'Type I (α) / Type II (β) Decision Error Power Curves'
    ]
  },
  28: {
    whatItDoes:
      'Provides a comprehensive searchable database of 1,200+ ICRP-107 radionuclides along with a Source Characterization & Forensics Calculator for gravimetric specific activity (TBq/g), chemical compound stoichiometry, radioactive decay heat (Watts), and IAEA RS-G-1.9 Category 1–5 source security classification.',
    whenToUse: [
      'Looking up half-lives, decay modes, principal photon/beta/alpha energies, specific gamma constants Γ, and ICRP dose coefficients.',
      'Converting between pure elemental or chemical compound mass (grams of CsCl, Co metal, UF₆, PuO₂) and activity (Bq / Ci).',
      'Determining the IAEA Category 1–5 (A/D ratio) security tier and thermal decay power (Watts) of a sealed source.'
    ],
    howToUseSteps: [
      'Use Tab 1 (ICRP-107 Nuclide Explorer) to filter and inspect decay properties across 1,200+ isotopes.',
      'Switch to Tab 2 (Source Characterization, Specific Activity & IAEA Categorization) to compute carrier-free mass, compound mass, decay heat, and A/D security category.',
      'Click any cross-module dispatch button to send the selected nuclide directly to the Dose, Decay, or Shielding modules.'
    ],
    keyCapabilities: [
      '1,200+ Nuclide ICRP-107 Nuclear Decay Reference Table',
      'Carrier-Free & Chemical Compound Mass-to-Activity Solver',
      'IAEA RS-G-1.9 / TECDOC-1344 Category 1–5 (A/D) Classifier',
      'Radiolytic & Thermal Decay Power (Watts) Calculator'
    ]
  },
  29: {
    whatItDoes:
      'Catalogs commercial radiation detection instrumentation (Geiger-Müller, NaI(Tl), HPGe, He-3, BF₃, Ion Chambers, ZnS alpha probes, and electronic personal dosimeters) with energy response curves, intrinsic efficiency, dead-time models, and gas ionization operating regions.',
    whenToUse: [
      'Selecting the right radiation detector for alpha, beta, gamma, or neutron fields and comparing MDA and energy response.',
      'Converting raw detector count rates (CPM / CPS) into surface contamination activity (Bq/cm² or DPM/100 cm²) using 4π/2π efficiency and surface efficiency ε_s.',
      'Understanding gas amplification regions (Ion Chamber, Proportional, GM plateau) and detector saturation.'
    ],
    howToUseSteps: [
      'Filter the equipment catalog by detector family, radiation modality (α, β, γ, n), or manufacturer.',
      'Inspect instrument specifications, energy response flat-zone, dead time τ, and intrinsic efficiency.',
      'Use the interactive CPM-to-Activity & ISO-7503 Surface Contamination converter to evaluate survey readings.'
    ],
    keyCapabilities: [
      'Comprehensive Commercial Detector & Probe Specifications',
      'ISO-7503 Surface Contamination (CPM → Bq/cm² & DPM) Solver',
      'Gas Ionization Curve & Quenching Physics Reference',
      'Energy Response & Intrinsic Efficiency Comparison'
    ]
  },
  30: {
    whatItDoes:
      'Presents a forensic database and quantitative reconstruction workbench for major historical nuclear and radiological incidents (INES Levels 1–7, including Chernobyl, Fukushima, Tokaimura, Goiânia, SL-1, Three Mile Island, Kyshtym, Windscale, and Castle Bravo).',
    whenToUse: [
      'Studying historical source terms, isotopic release inventories, radiological timelines, and lessons learned across INES 1–7 events.',
      'Comparing empirical historical dose measurements against RadPro Calc’s analytical plume, fallout, and criticality solvers.',
      'Loading historical incident source terms directly into the Plume, Fallout, or Criticality modules for forensic replay.'
    ],
    howToUseSteps: [
      'Filter the historical incident registry by INES rating (1–7), category (Reactor Core, Criticality Excursion, Orphan Source, Weapon Test), or decade.',
      'Select an incident to inspect its forensic dossier, isotopic release table, casualty/dosimetry summary, and sequence of events.',
      'Click "Replay in Plume / Fallout / Criticality Module" to launch a live physics simulation of that historical event.'
    ],
    keyCapabilities: [
      'Curated INES Level 1–7 Forensic Incident Encyclopedia',
      'Quantitative Source Term & Isotopic Release Inventories',
      'Clinical Dosimetry & Emergency Response Lessons Learned',
      'One-Click Forensic Replay in Analytical Physics Modules'
    ]
  },
  31: {
    whatItDoes:
      'Renders an interactive 3D WebGL Earth Globe mapping 400+ global nuclear power reactors (IAEA PRIS) and 2,000+ historical nuclear test detonations (1945–2017), integrated with a NUREG-0654 10-mile/50-mile EPZ Keyhole Evacuation Planner, CTBTO seismic body-wave magnitude (m_b) yield inversion, and live WMO satellite meteorology.',
    whenToUse: [
      'Exploring global nuclear reactor sites, thermal/electric capacities, reactor types (PWR, BWR, PHWR, LWGR, FBR), and historical test sites in 3D.',
      'Projecting a 10-mile Plume Exposure EPZ keyhole and 50-mile Ingestion Pathway zone around any reactor using live wind direction.',
      'Inverting seismic body-wave magnitude m_b across geologic coupling media (Hard Rock, Alluvium, Salt, Water) to estimate underground test yield (kt).'
    ],
    howToUseSteps: [
      'Rotate/zoom the 3D WebGL Earth globe and filter markers by Nuclear Power Reactors, Historical Detonations, or Country.',
      'Click any reactor or detonation marker to inspect its telemetry card, fetch live WMO site weather, or project an EPZ keyhole.',
      'Open the EPZ Keyhole Planner or CTBTO Seismic Yield Inversion drawers to run consequence and forensic seismic analyses.'
    ],
    keyCapabilities: [
      '3D WebGL Earth Hub (400+ Reactors & 2,000+ Nuclear Tests)',
      'NUREG-0654 10-Mi / 50-Mi EPZ Keyhole Evacuation Planner',
      'CTBTO Seismic Magnitude (m_b ↔ Yield kt) Inversion Solver',
      'Live WMO Site Meteorology & SRTM Elevation Integration'
    ]
  },
  32: {
    whatItDoes:
      'Connects to live USB WebSerial or WebAudio pulse-counting radiation detectors (or a realistic Poisson stochastic pulse generator) to perform real-time CPM/CPS ratemeter tracking, Currie (1968) / ISO-11929 statistical detection limits (L_c, L_d, MDA), and paralyzable/non-paralyzable dead-time correction.',
    whenToUse: [
      'Streaming live pulse counts from a USB serial Geiger counter or audio-jack scintillation probe directly in the browser.',
      'Calculating Currie Critical Level (L_c), Detection Limit (L_d), and Minimum Detectable Activity (MDA) for low-level counting.',
      'Correcting high-rate instrument readings for non-paralyzable n = m/(1 - mτ) or paralyzable m = n·exp(-nτ) dead-time losses.'
    ],
    howToUseSteps: [
      'Connect a hardware detector via WebSerial/WebAudio or enable the Poisson Stochastic Hardware Simulator.',
      'Set background count time t_b, sample count time t_s, detector efficiency ε, and dead time τ (µs).',
      'Monitor the live ratemeter strip chart, Poisson pulse-interval histogram, Currie L_c/L_d/MDA status, and dead-time curves.'
    ],
    keyCapabilities: [
      'WebSerial & WebAudio Live Hardware Pulse Acquisition',
      'Currie (1968) & ISO 11929-1 L_c, L_d & MDA Calculator',
      'Paralyzable (Lambert-W) & Non-Paralyzable Dead-Time Solver',
      'Chi-Square (χ²) Poisson Counter Stability Diagnostic'
    ]
  },
  33: {
    whatItDoes:
      'Provides a multi-jurisdictional regulatory compliance and ALARA dashboard cross-referencing statutory dose limits across US NRC (10 CFR 20), US DOE (10 CFR 835), IAEA GSR Part 3 / ICRP 103, EURATOM 2013/59 / UK IRR17, NATO STANAG 2083, and Canadian CNSC SOR/2000-203.',
    whenToUse: [
      'Comparing occupational, lens-of-eye (150 mSv US NRC vs. 20 mSv ICRP 118/EURATOM), extremity, embryo/fetus, and public dose limits across international jurisdictions.',
      'Auditing a worker’s external DDE and internal CEDE against annual and 5-year cumulative statutory ceilings.',
      'Evaluating ALARA value-of-averted-dose ($/person-rem) cost-benefit shielding justifications.'
    ],
    howToUseSteps: [
      'Select the active regulatory jurisdiction (or compare all 6 frameworks side by side in the harmonization matrix).',
      'Enter worker external deep dose, lens dose, extremity dose, and internal intake to audit statutory compliance margins.',
      'Export a signed Regulatory Compliance Dossier for radiation safety committee records.'
    ],
    keyCapabilities: [
      '6-Jurisdiction Statutory Dose Limit Harmonization Matrix',
      'ICRP 118 Eye Lens (20 mSv) vs. 10 CFR 20 (150 mSv) Audit',
      'Declared Pregnant Worker & 5-Year Cumulative Tracking',
      'ALARA Cost-Benefit ($/person-Sv) Optimization Calculator'
    ]
  },
  34: {
    whatItDoes:
      'Executes the automated IEEE 730-2014 / ASME NQA-1 / ISO 17025 Software Quality Assurance (SQA) Verification & Validation test suite across 60 gold-standard vectors (52 analytical benchmarks VTEST-01–VTEST-52 + 8 numerical boundary stress tests STRESS-01–STRESS-08).',
    whenToUse: [
      'Auditing the mathematical accuracy of every physics engine in RadPro Calc against peer-reviewed ICRP, NCRP, IAEA, ANSI, and NIST reference values.',
      'Verifying host CPU/FPU 64-bit IEEE 754 floating-point precision (ε = 2⁻⁵²) and singularity boundary clamps.',
      'Generating and printing a formal, signed QA Verification Certificate or NQA-1 Traceability Matrix (JSON / CSV / PDF).'
    ],
    howToUseSteps: [
      'Click "Re-Run Verification Suite" to execute all 60 analytical and stress vectors in real time on your machine.',
      'Filter by physics domain or click any benchmark card (VTEST-01 to VTEST-52) to expand its KaTeX proof, inputs, citation, and relative error δ.',
      'Use the Traceability Matrix or Formal SQA Audit Certificate tabs to export JSON/CSV records or print an official sign-off report.'
    ],
    keyCapabilities: [
      '52 Analytical Benchmarks (VTEST-01 through VTEST-52)',
      '8 Singularity & Asymptotic Boundary Stress Tests',
      'ASME NQA-1 & ISO/IEC 17025 Traceability Register',
      'Exportable QA Certificate (JSON, CSV & Print Sign-Off)'
    ]
  },
  35: {
    whatItDoes:
      'Houses the complete peer-reviewed mathematical proofs, step-by-step KaTeX derivations, physical constants ledger, ICRP 74/116 fluence-to-dose h*(10) calculator, Metrological Unit Harmonizer (SI ↔ Traditional), and FAA CARI-7 high-altitude cosmic ray aviation dosimetry solver.',
    whenToUse: [
      'Inspecting the complete step-by-step mathematical derivations, variable definitions, and literature citations behind all 35 modules.',
      'Converting rapidly between SI (Bq, Gy, Sv, C/kg) and Traditional (Ci, rad, rem, Roentgen) radiation units or photon/neutron fluence Φ to H*(10).',
      'Calculating commercial or military flight crew cosmic radiation dose rates at altitude (e.g., FL390) using the FAA CARI-7 model.'
    ],
    howToUseSteps: [
      'Browse or search the 35-Module Mathematical Proofs & Literature Ledger by domain or module number.',
      'Switch to the Unit Converter & Reference Calculators tab to run live SI ↔ Traditional conversions, ICRP 116 fluence-to-dose h*(10), or FAA CARI-7 flight dosimetry.',
      'Inspect the Fundamental Physical Constants & Standards Cross-Reference tables.'
    ],
    keyCapabilities: [
      'Complete 35-Module KaTeX Mathematical Derivations',
      'Interactive SI ↔ Traditional Radiation Unit Converter',
      'ICRP 74/116 Photon & Neutron Fluence-to-Dose h*(10) Solver',
      'FAA CARI-7 High-Altitude Cosmic Aviation Dosimetry'
    ]
  }
};

interface ModuleInfoTabPanelProps {
  moduleInfo: ActiveModuleBreadcrumbInfo;
  onReturnToTool: () => void;
}

export const ModuleInfoTabPanel: React.FC<ModuleInfoTabPanelProps> = ({
  moduleInfo,
  onReturnToTool
}) => {
  const navigate = useNavigate();
  const guide = MODULE_USER_GUIDES[moduleInfo.moduleNumber] || MODULE_USER_GUIDES[1];
  const methodDoc = METHOD_DOCS.find(
    doc => doc.moduleId === `Module ${moduleInfo.moduleNumber}`
  );

  // Extract first VTEST-XX if mentioned in benchmarks
  const vtestMatch = methodDoc?.benchmarks.match(/VTEST-\d+/);
  const primaryVtestId = vtestMatch ? vtestMatch[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '28px' }}>
      {/* Top Hero Card */}
      <div
        className="panel"
        style={{
          marginBottom: 0,
          border: `1px solid ${moduleInfo.categoryColor}55`,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(5, 10, 18, 0.96) 100%)',
          boxShadow: `0 8px 28px rgba(0, 0, 0, 0.45), 0 0 18px ${moduleInfo.categoryColor}18`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: `${moduleInfo.categoryColor}22`,
                  border: `1px solid ${moduleInfo.categoryColor}`,
                  color: moduleInfo.categoryColor
                }}
              >
                MODULE {String(moduleInfo.moduleNumber).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#cbd5e1'
                }}
              >
                {moduleInfo.categoryIcon} {moduleInfo.categoryTitle}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  color: '#00e5ff'
                }}
              >
                {moduleInfo.badge}
              </span>
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', color: '#fff' }}>
              ℹ️ {moduleInfo.label} — Tool Guide &amp; Scientific Reference
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              {guide.whatItDoes}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onReturnToTool}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '9px 16px'
              }}
            >
              <span>⚡ Open Interactive Calculator</span>
            </button>
            {primaryVtestId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onReturnToTool();
                  navigate(`/verify?test=${primaryVtestId}`);
                }}
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              >
                ✓ Verify ({primaryVtestId})
              </button>
            )}
          </div>
        </div>

        {/* Key Capabilities Pill Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {guide.keyCapabilities.map((cap, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.07)',
                border: '1px solid rgba(0, 229, 255, 0.22)',
                color: '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ color: '#00e5ff', fontWeight: 700 }}>✓</span>
              <span>{cap}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Two-Column Operational Guide: When To Use + Step-by-Step How To Use */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span>
            <span>When to Use This Tool (Operational Scenarios)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.whenToUse.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${moduleInfo.categoryColor}`
                }}
              >
                <span style={{ color: moduleInfo.categoryColor, fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  0{idx + 1}
                </span>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#ffb703', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧭</span>
            <span>Step-by-Step Operator Workflow</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.howToUseSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #ffb703'
                }}
              >
                <span
                  style={{
                    background: 'rgba(255, 183, 3, 0.18)',
                    color: '#ffb703',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  STEP {idx + 1}
                </span>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Governing Physics & Mathematical Formulations (from METHOD_DOCS) */}
      {methodDoc && (
        <div className="panel" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>
                📐 Governing Physics Formulations &amp; Mathematical Basis
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                {methodDoc.title}
              </div>
            </div>
            <span className="hud-badge hud-badge-primary" style={{ fontSize: '0.72rem' }}>
              {methodDoc.domain}
            </span>
          </div>

          <div
            style={{
              background: 'rgba(5, 10, 18, 0.85)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: '8px',
              padding: '14px 18px',
              overflowX: 'auto',
              marginBottom: '14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', fontWeight: 700 }}>
              Primary Governing Equation
            </div>
            <BlockMath math={methodDoc.primaryFormula} />
          </div>

          {methodDoc.secondaryFormulas && methodDoc.secondaryFormulas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {methodDoc.secondaryFormulas.map((sf, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    overflowX: 'auto'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                    {sf.label}
                  </div>
                  <BlockMath math={sf.formula} />
                </div>
              ))}
            </div>
          )}

          {/* Variables & Units Table */}
          {methodDoc.variables && methodDoc.variables.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nomenclature, Symbols &amp; Units
              </h4>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.45)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px 12px', width: '140px' }}>Symbol</th>
                      <th style={{ padding: '8px 12px' }}>Physical Quantity Description</th>
                      <th style={{ padding: '8px 12px', width: '180px' }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodDoc.variables.map((v, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '7px 12px', color: '#00e5ff' }}>
                          <InlineMath math={v.symbol} />
                        </td>
                        <td style={{ padding: '7px 12px', color: '#e2e8f0' }}>{v.description}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: '#94a3b8', fontSize: '0.76rem' }}>
                          {v.units}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standards, Assumptions & Verification Benchmarks */}
      {methodDoc && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.96rem', color: '#10b981' }}>
              🏛️ Authoritative Standards &amp; Regulatory Citations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {methodDoc.standards.map((st, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '6px',
                    padding: '9px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <strong style={{ color: '#00e5ff', fontSize: '0.8rem' }}>
                      {st.org} — {st.code}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {st.year}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{st.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.96rem', color: '#c084fc' }}>
                🔬 Physical Assumptions &amp; V&amp;V Benchmark Status
              </h3>
              <ul style={{ margin: '0 0 14px 18px', padding: 0, color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.55 }}>
                {methodDoc.assumptions.map((a, i) => (
                  <li key={i} style={{ marginBottom: '5px' }}>{a}</li>
                ))}
              </ul>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#e2e8f0'
              }}
            >
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', marginBottom: '3px' }}>
                ✓ ASME NQA-1 / IEEE 730 Verification Benchmark
              </div>
              <div>{methodDoc.benchmarks}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleInfoTabPanel;
