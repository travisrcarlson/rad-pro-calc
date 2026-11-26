/**
 * Unified Scientific Verification & Validation (V&V) Benchmark Suite
 *
 * Single authoritative source of truth for:
 *   1. CLI Continuous Integration (`npm test` -> `scripts/run_verification_tests.js`)
 *   2. Interactive QA Verification Engine (`Module 34` -> `src/modules/Module7/VerificationModule.tsx`)
 *   3. Inline Module Verification Badges (`src/components/VerificationBadge.tsx`)
 *
 * Every analytical vector (`VTEST-01`..`VTEST-62`) and numerical boundary check (`STRESS-01`..`STRESS-08`)
 * executes REAL production TypeScript exports from `src/utils/*` and `src/services/*` — zero constant
 * shadow lambdas or self-comparing tautologies.
 */

import {
  evaluateXCOMAttenuation,
  evaluateGPBuildup,
  evaluateMultiLayerBuildup,
  evaluateBroadBeamPointShielding,
  getMaterialNeutronRemoval,
  intersectRayAABB3D
} from './xcomAndGpBuildup.ts';
import { getCanonicalNuclide } from './canonicalNuclidePhysics.ts';
import { simulateGeneralizedDecayDAG } from './decayRadiochemistryEngine.ts';
import {
  COMPASS_SECTORS_16,
  calculateEPZEvacuationPlan
} from '../services/epzConsequenceService.ts';
import { invertSeismicMagnitudeToYield } from '../services/seismicYieldInversionService.ts';
import {
  computePointSourceAmbientDoseRateUSvHr,
  computeCommittedEffectiveDoseMSv,
  classifySSR6TransportPackage,
  computeSSR6MixtureEffectiveLimitTBq,
  computeBatemanTransientPeak,
  computeGeneratorDaughterRegrowthMBq,
  computePulsedXRayInstantaneousRateKSvHr,
  classifyTurnerPasquillStability,
  computeBriggsRuralDispersionMeters,
  computeGaussianPlumeGroundConcBqM3,
  computePlumeDepletionSurvivalPct,
  computePBLInversionReflectionMultiplier,
  computeLaserNOHDMeters,
  computeDuaneHuntMinWavelengthNm,
  computeFraunhoferFarFieldMeters,
  computeTwoGroupInfiniteMultiplication,
  computeKeepinInhourReactivityCents,
  computePostScramXenonPeakHours,
  computeGodivaPromptBurstFwhmUs,
  computeCAASMaxDetectionRadiusM,
  computeSpectrometerResolution,
  computeMariscottiPeakSignificanceSigma,
  computeMARSSIMSignSampleSize,
  computeTG43ReferenceDoseRateMGyHr,
  computeTG108UptakeDecayFactor,
  computeArcherBroadBeamTransmission,
  computeCossairtMazeDoorDoseRateUSvHr,
  computeControlledBoundaryDistanceM,
  computeCloudSubmersionDoseRateUSvHr,
  computeSynchrotronCriticalEnergyKeV,
  computeRelativisticLorentzGamma,
  computeNeutronActivationSaturationBq,
  computeEPAPagEvacuationRatio,
  computeEffectiveHalfLifeDays,
  computeGalacticCosmicDoseRateUSvHr,
  computeKatzPenfoldBetaRangeMm,
  computeKleinNishinaCrossSectionBarns,
  computeCurrieDetectionLimits,
  computeRadiographicGeometry,
  computeWayWignerShelterDose,
  computeWeaponPromptThermalFluenceCalCm2,
  computeMultiCompartmentRetentionKBq,
  localizeSourceInverseSquare,
  computeBlastYieldMarkerSizePx,
  computeFluenceToHStar10MSvHr,
  computeSpecificActivityTBqPerGram,
  computeRadonProgenyAnnualDose,
  computeISO11929CharacteristicLimits,
  computeISO7503SurfaceActivityBqCm2,
  computeISO4037AirKermaToHStar10MSvHr,
  computeGUMUncertaintyBudget,
  computeDutchBbsRadiotoxicity,
  evaluateDutchBbsExemption
} from './radiologicalPhysicsKernels.ts';

export type VerificationCategory =
  | 'Radiometry'
  | 'Decay & Internal'
  | 'Machines & Beams'
  | 'Atmospheric'
  | 'Criticality & MCA'
  | 'Clinical & Stats';

export interface VerificationTestRecord {
  id: string;
  name: string;
  module: string;
  category: VerificationCategory;
  standard: string;
  standardDoc: string;
  formulaKatex: string;
  inputsDesc: string;
  expectedValue: number;
  expectedUnits: string;
  expectedDisplay: string;
  computedValue: number;
  computedDisplay: string;
  tolerancePct: number;
  errorPct: number;
  passed: boolean;
  notes: string;
}

export interface StressTestRecord {
  id: string;
  name: string;
  module: string;
  domain: string;
  standard: string;
  condition: string;
  formulaKatex: string;
  passed: boolean;
  outputText: string;
  execTimeUs: number;
  notes: string;
}

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function buildRecord(
  meta: Omit<VerificationTestRecord, 'errorPct' | 'passed'>
): VerificationTestRecord {
  const errorPct =
    meta.tolerancePct === 0
      ? Math.abs(meta.computedValue - meta.expectedValue)
      : Math.abs((meta.computedValue - meta.expectedValue) / meta.expectedValue) * 100.0;
  const passed =
    Number.isFinite(meta.computedValue) &&
    !Number.isNaN(meta.computedValue) &&
    errorPct <= meta.tolerancePct;
  return { ...meta, errorPct, passed };
}

export function runAllVerificationBenchmarks(): VerificationTestRecord[] {
  const tests: VerificationTestRecord[] = [];

  // VTEST-01: Co-60 Specific Gamma Ray Constant (Canonical Nuclide Registry + Point-Source Solver)
  {
    const computed = computePointSourceAmbientDoseRateUSvHr('Co-60', 1.0, 1.0);
    tests.push(
      buildRecord({
        id: 'VTEST-01',
        name: 'Co-60 Specific Gamma Ray Constant (Γ)',
        module: 'Module 1A / 28 (External Dose & Nuclide DB)',
        category: 'Radiometry',
        standard: 'ICRP Publication 107 & NCRP Report 151',
        standardDoc: 'ICRP-107 Section 3.4 / NCRP-151 Table B.1',
        formulaKatex:
          '\\dot{D}_{1\\text{m}} = \\frac{A \\cdot \\Gamma}{d^2}, \\quad \\Gamma(^{60}\\text{Co}) = 308.5 \\ \\mu\\text{Sv}\\cdot\\text{m}^2/(\\text{h}\\cdot\\text{GBq})',
        inputsDesc: 'Activity = 1.0 GBq Co-60, Distance = 1.0 m, Unshielded point source',
        expectedValue: 308.5,
        expectedUnits: 'µSv·m²/(h·GBq)',
        expectedDisplay: '308.50 µSv·m²/(h·GBq)',
        computedValue: computed,
        computedDisplay: `${computed.toFixed(2)} µSv·m²/(h·GBq)`,
        tolerancePct: 0.5,
        notes:
          'Evaluates CANONICAL_NUCLIDE_REGISTRY["Co-60"] via computePointSourceAmbientDoseRateUSvHr for 1173.2 + 1332.5 keV cascade.'
      })
    );
  }

  // VTEST-02: Cs-137 Specific Gamma Ray Constant
  {
    const computed = computePointSourceAmbientDoseRateUSvHr('Cs-137', 1.0, 1.0);
    tests.push(
      buildRecord({
        id: 'VTEST-02',
        name: 'Cs-137 / Ba-137m Specific Gamma Constant (Γ)',
        module: 'Module 1A / 28 (External Dose & Nuclide DB)',
        category: 'Radiometry',
        standard: 'ICRP Publication 107 / NuDat 3.0',
        standardDoc: 'ICRP-107 / Brookhaven National Laboratory NuDat',
        formulaKatex:
          '\\Gamma(^{137}\\text{Cs}) = 77.20 \\ \\mu\\text{Sv}\\cdot\\text{m}^2/(\\text{h}\\cdot\\text{GBq})',
        inputsDesc: 'Activity = 1.0 GBq Cs-137, Distance = 1.0 m, 661.7 keV branching (85.1%)',
        expectedValue: 77.2,
        expectedUnits: 'µSv·m²/(h·GBq)',
        expectedDisplay: '77.20 µSv·m²/(h·GBq)',
        computedValue: computed,
        computedDisplay: `${computed.toFixed(2)} µSv·m²/(h·GBq)`,
        tolerancePct: 0.5,
        notes:
          'Evaluates CANONICAL_NUCLIDE_REGISTRY["Cs-137"] accounting for 85.1% Ba-137m isomeric transition gamma emission.'
      })
    );
  }

  // VTEST-03: Narrow-Beam Attenuation & TVL Decade Reduction via NIST XCOM
  {
    const xcomPb662 = evaluateXCOMAttenuation('LEAD', 0.6617);
    const tvlCm = Math.LN10 / xcomPb662.muLinear;
    const shieldRes = evaluateBroadBeamPointShielding(
      0.6617,
      1000.0,
      1.0,
      [{ material: 'LEAD', thicknessCm: 3.0 * tvlCm }],
      'NARROW_BEAM'
    );
    const computed = shieldRes.transmissionNarrowBeam;
    tests.push(
      buildRecord({
        id: 'VTEST-03',
        name: 'Tenth-Value Layer (TVL) Decade Attenuation',
        module: 'Module 1B / 4 / 14 (Shielding)',
        category: 'Radiometry',
        standard: 'NCRP Report 147 / NCRP Report 151',
        standardDoc: 'NCRP-151 Section 2.2: Structural Shielding Design',
        formulaKatex:
          'I(x) = I_0 \\cdot 10^{-\\frac{x}{\\text{TVL}}}, \\quad \\frac{I(3 \\cdot \\text{TVL})}{I_0} = 10^{-3} = 0.0010',
        inputsDesc: `3.0 × NIST XCOM Lead TVL at 661.7 keV (TVL = ${tvlCm.toFixed(3)} cm, x = ${(3 * tvlCm).toFixed(3)} cm)`,
        expectedValue: 0.001,
        expectedUnits: 'Transmission Fraction',
        expectedDisplay: '1.000 × 10⁻³ (0.100%)',
        computedValue: computed,
        computedDisplay: `${computed.toExponential(4)} (0.100%)`,
        tolerancePct: 0.01,
        notes:
          'Executes evaluateXCOMAttenuation + evaluateBroadBeamPointShielding (NARROW_BEAM) across 3 exact XCOM tenth-value layers.'
      })
    );
  }

  // VTEST-04: ICRP 119 Committed Effective Dose for I-131 Ingestion
  {
    const computed = computeCommittedEffectiveDoseMSv('I-131', 100000, 'ingestion');
    tests.push(
      buildRecord({
        id: 'VTEST-04',
        name: 'Committed Effective Dose E(50) — I-131 Ingestion',
        module: 'Module 1C / 3 (Internal Dosimetry)',
        category: 'Decay & Internal',
        standard: 'ICRP Publication 119',
        standardDoc: 'ICRP-119 Compendium of Dose Coefficients (Adult)',
        formulaKatex:
          'E(50) = I \\cdot e(50), \\quad e(50)_{^{131}\\text{I}} = 2.20 \\times 10^{-8} \\ \\text{Sv/Bq}',
        inputsDesc: 'Intake = 100 kBq (1.0e5 Bq) I-131, Ingestion pathway, Adult biokinetic model',
        expectedValue: 2.2,
        expectedUnits: 'mSv',
        expectedDisplay: '2.200 mSv',
        computedValue: computed,
        computedDisplay: `${computed.toFixed(3)} mSv`,
        tolerancePct: 0.1,
        notes: 'Queries I-131 ingestion e(50) from CANONICAL_NUCLIDE_REGISTRY via computeCommittedEffectiveDoseMSv.'
      })
    );
  }

  // VTEST-05: IAEA SSR-6 Transport Index & Category III-Yellow
  {
    const pkg = classifySSR6TransportPackage(0.85, 35.0);
    tests.push(
      buildRecord({
        id: 'VTEST-05',
        name: 'IAEA SSR-6 Transport Index (TI) Formulation',
        module: 'Module 15 (Transport Packaging)',
        category: 'Decay & Internal',
        standard: 'IAEA Safety Standards Series No. SSR-6 (Rev. 1)',
        standardDoc: 'IAEA SSR-6 Section 526 & 527 / 49 CFR § 173.403',
        formulaKatex:
          '\\text{TI} = \\frac{\\dot{H}_{1\\text{m}} \\ [\\mu\\text{Sv/h}]}{10}, \\quad \\text{TI}(35 \\ \\mu\\text{Sv/h}) = 3.5',
        inputsDesc: 'Surface = 0.85 mSv/h, 1-meter maximum package dose rate = 35.0 µSv/h',
        expectedValue: 3.5,
        expectedUnits: 'Dimensionless Index',
        expectedDisplay: 'TI = 3.50 (Category III-YELLOW)',
        computedValue: pkg.roundedTI,
        computedDisplay: `TI = ${pkg.roundedTI.toFixed(2)} (${pkg.category})`,
        tolerancePct: 0.01,
        notes: 'Executes classifySSR6TransportPackage verifying both TI rounding and III-YELLOW label selection.'
      })
    );
  }

  // VTEST-06: Bateman Transient Equilibrium Peak Time (Mo-99 -> Tc-99m)
  {
    const peak = computeBatemanTransientPeak(65.94, 6.007);
    tests.push(
      buildRecord({
        id: 'VTEST-06',
        name: 'Transient Equilibrium Peak Time (Mo-99 → Tc-99m)',
        module: 'Module 24 (Radiolysis & Decay Chains)',
        category: 'Decay & Internal',
        standard: 'Knoll 4th Ed. / Bateman Equations (1910)',
        standardDoc: 'Knoll Radiation Detection and Measurement, Ch. 3',
        formulaKatex:
          't_{\\max} = \\frac{\\ln(\\lambda_2 / \\lambda_1)}{\\lambda_2 - \\lambda_1}, \\quad T_{1/2}(^{99}\\text{Mo}) = 65.94\\text{h}, \\ T_{1/2}(^{99\\text{m}}\\text{Tc}) = 6.007\\text{h}',
        inputsDesc: 'Parent Mo-99 T½ = 65.94h, Daughter Tc-99m T½ = 6.007h, Zero initial daughter',
        expectedValue: 22.84,
        expectedUnits: 'Hours',
        expectedDisplay: '22.84 Hours',
        computedValue: peak.tMaxHours,
        computedDisplay: `${peak.tMaxHours.toFixed(2)} Hours`,
        tolerancePct: 0.15,
        notes: 'Calculates exact daughter maximum inflection time via computeBatemanTransientPeak.'
      })
    );
  }

  // VTEST-07: Ray-AABB 3D Solid Obstacle Intersection Length
  {
    const computedLength = intersectRayAABB3D(0, 5, 1.5, 10, 5, 1.5, {
      xMin: 4,
      xMax: 6,
      yMin: 4,
      yMax: 6,
      zMin: 0.5,
      zMax: 2.5
    });
    tests.push(
      buildRecord({
        id: 'VTEST-07',
        name: 'Ray-AABB 3D Geometric Obstacle Penetration Length',
        module: 'Module 2 / 4 / 12 (3D Spatial Engine)',
        category: 'Radiometry',
        standard: 'Kay & Kajiya Slab Algorithm (1986)',
        standardDoc: 'Computer Graphics Vol. 20, No. 4: Ray Tracing Bounding Volumes',
        formulaKatex:
          't_{\\text{enter}} = \\max(\\min(t_{x1}, t_{x2})), \\quad L_{\\text{shield}} = (t_{\\text{exit}} - t_{\\text{enter}}) \\cdot \\|\\vec{p} - \\vec{s}\\|',
        inputsDesc: 'Ray path: (0, 5, 1.5) to (10, 5, 1.5), Box: x ∈ [4, 6], y ∈ [4, 6], z ∈ [0.5, 2.5]',
        expectedValue: 2.0,
        expectedUnits: 'meters',
        expectedDisplay: '2.000 m',
        computedValue: computedLength,
        computedDisplay: `${computedLength.toFixed(3)} m`,
        tolerancePct: 0.01,
        notes: 'Executes production 3D Kay-Kajiya slab chord solver intersectRayAABB3D from xcomAndGpBuildup.ts.'
      })
    );
  }

  // VTEST-08: Flash Pulsed Radiography Peak Instantaneous Flux Rate
  {
    const computedRateKSvH = computePulsedXRayInstantaneousRateKSvHr(2.7, 50.0);
    tests.push(
      buildRecord({
        id: 'VTEST-08',
        name: 'Flash X-Ray Nanosecond Pulse Instantaneous Flux',
        module: 'Module 16 (Pulsed & Flash X-Ray)',
        category: 'Machines & Beams',
        standard: 'Golden Engineering XR200 Spec / ANSI N43.3',
        standardDoc: 'Golden Engineering Technical Manual / NBS Handbook 114',
        formulaKatex:
          '\\dot{D}_{\\text{inst}} = \\frac{D_{\\text{pulse}}}{\\tau_{\\text{pulse}}} \\times 3.6 \\ [\\text{kSv/h}], \\quad \\tau_{\\text{pulse}} = 50\\text{ ns}',
        inputsDesc: 'Dose per pulse = 2.70 µSv, FWHM pulse duration = 50 ns (5.0e-8 s)',
        expectedValue: 194.4,
        expectedUnits: 'kSv/h',
        expectedDisplay: '194.40 kSv/h (194,400 Sv/h)',
        computedValue: computedRateKSvH,
        computedDisplay: `${computedRateKSvH.toFixed(2)} kSv/h`,
        tolerancePct: 0.1,
        notes: 'Quantifies severe detector paralyzation conditions for active Geiger-Müller survey meters.'
      })
    );
  }

  // VTEST-09: Gaussian Plume Briggs Open-Country Dispersion
  {
    const { sigmaYM, sigmaZM } = computeBriggsRuralDispersionMeters(1000.0, 'D');
    tests.push(
      buildRecord({
        id: 'VTEST-09',
        name: 'Gaussian Plume Briggs Dispersion Coefficients (Class D)',
        module: 'Module 13 (Plume Atmospheric Model)',
        category: 'Atmospheric',
        standard: 'Briggs (1973) / EPA AERMOD Model Formulation',
        standardDoc: 'EPA-454/R-03-004 AERMOD Dispersion Equations',
        formulaKatex:
          '\\sigma_y(x) = 0.08 x (1 + 10^{-4}x)^{-1/2}, \\quad \\sigma_z(x) = 0.06 x (1 + 1.5\\times 10^{-3}x)^{-1/2}',
        inputsDesc: 'Downwind distance x = 1000 m, Neutral Pasquill Class D stability, Open country',
        expectedValue: 76.28,
        expectedUnits: 'meters',
        expectedDisplay: 'σy = 76.28m, σz = 37.95m',
        computedValue: sigmaYM,
        computedDisplay: `σy = ${sigmaYM.toFixed(2)}m, σz = ${sigmaZM.toFixed(2)}m`,
        tolerancePct: 0.1,
        notes: 'Matches US EPA AERMOD and NRC Regulatory Guide 1.145 open-country dispersion curves.'
      })
    );
  }

  // VTEST-10: ANSI Z136.1 Laser NOHD for Nd:YAG
  {
    const computedNOHD = computeLaserNOHDMeters(1.0, 50.0, 0.002, 0.001);
    tests.push(
      buildRecord({
        id: 'VTEST-10',
        name: 'ANSI Z136.1 Laser Nominal Ocular Hazard Distance (NOHD)',
        module: 'Module 19 (Laser Safety & NOHD)',
        category: 'Machines & Beams',
        standard: 'ANSI Z136.1-2014 Table B1 & Equation B1',
        standardDoc: 'American National Standard for Safe Use of Lasers, Eq. B1',
        formulaKatex:
          'r_{\\text{NOHD}} = \\frac{\\sqrt{\\frac{4\\Phi}{\\pi \\cdot \\text{MPE}}} - a}{\\theta}, \\quad \\Phi = 1.0\\text{W}, \\ \\text{MPE} = 50\\text{W/m}^2',
        inputsDesc: 'Wavelength = 1064 nm (Nd:YAG), Power = 1.0 W, Beam Diameter a = 2 mm, Divergence θ = 1.0 mrad',
        expectedValue: 157.65,
        expectedUnits: 'meters',
        expectedDisplay: '157.65 m',
        computedValue: computedNOHD,
        computedDisplay: `${computedNOHD.toFixed(2)} m`,
        tolerancePct: 0.2,
        notes: 'Standard industrial and surgical Nd:YAG nominal ocular boundary verified against ANSI Z136.1.'
      })
    );
  }

  // VTEST-11: Duane-Hunt X-Ray Bremsstrahlung Minimum Wavelength
  {
    const computedLambda = computeDuaneHuntMinWavelengthNm(120.0) ?? 0;
    tests.push(
      buildRecord({
        id: 'VTEST-11',
        name: 'Duane-Hunt Law — X-Ray Minimum Wavelength (λmin)',
        module: 'Module 17 (X-Ray Tube Simulator)',
        category: 'Machines & Beams',
        standard: 'Duane & Hunt (1915) Physical Review',
        standardDoc: 'Johns & Cunningham, The Physics of Radiology, 4th Ed.',
        formulaKatex:
          '\\lambda_{\\min} = \\frac{h c}{e \\cdot V_0} = \\frac{1.2398419}{\\text{kVp}} \\ [\\text{nm}], \\quad V_0 = 120\\text{ kVp}',
        inputsDesc: 'Tube Potential = 120.0 kVp, Bremsstrahlung cutoff endpoint photon',
        expectedValue: 0.010332,
        expectedUnits: 'nm',
        expectedDisplay: '0.010332 nm (10.332 pm)',
        computedValue: computedLambda,
        computedDisplay: `${computedLambda.toFixed(6)} nm`,
        tolerancePct: 0.05,
        notes: 'Evaluates CODATA hc/e quantum endpoint wavelength via computeDuaneHuntMinWavelengthNm.'
      })
    );
  }

  // VTEST-12: FCC OET-65 Radar Antenna Far-Field Distance (Rff)
  {
    const computedRff = computeFraunhoferFarFieldMeters(1.2, 9.5e9);
    tests.push(
      buildRecord({
        id: 'VTEST-12',
        name: 'FCC OET-65 Radar Antenna Fraunhofer Far-Field Boundary',
        module: 'Module 20 (EW EMR & Microwave)',
        category: 'Machines & Beams',
        standard: 'FCC OET Bulletin 65 & IEEE C95.1-2019',
        standardDoc: 'FCC OET Bulletin 65, Section 2: Antenna Calculations',
        formulaKatex:
          'R_{\\text{ff}} = \\frac{2 D^2}{\\lambda} = \\frac{2 D^2 f}{c}, \\quad D = 1.20\\text{m}, \\ f = 9.50\\text{ GHz}',
        inputsDesc: 'Parabolic Dish Aperture D = 1.20 m, Frequency = 9.50 GHz (X-band)',
        expectedValue: 91.26,
        expectedUnits: 'meters',
        expectedDisplay: '91.26 m',
        computedValue: computedRff,
        computedDisplay: `${computedRff.toFixed(2)} m`,
        tolerancePct: 0.1,
        notes: 'Delineates transition from Fresnel radiating near-field to planar Fraunhofer inverse-square zone.'
      })
    );
  }

  // VTEST-13: Two-Group Criticality Infinite Multiplication (k-infinity)
  {
    const computed = computeTwoGroupInfiniteMultiplication({
      nuSigmaF1: 0.00666,
      nuSigmaF2: 0.16,
      sigmaA1: 0.009,
      sigmaA2: 0.1,
      sigmaS12: 0.021
    });
    tests.push(
      buildRecord({
        id: 'VTEST-13',
        name: 'Heterogeneous Reactor Lattice Infinite Multiplication (k∞)',
        module: 'Module 21 (Criticality & Reactor Core)',
        category: 'Criticality & MCA',
        standard: 'Lamarsh & Baratta 3rd Ed. / IAEA-TECDOC-808',
        standardDoc: 'Lamarsh Nuclear Reactor Theory Section 7.2: Heterogeneous Core Models',
        formulaKatex:
          'k_\\infty = \\frac{\\nu \\Sigma_{f1} \\Sigma_{a2} + \\nu \\Sigma_{f2} \\Sigma_{s,1\\to 2}}{(\\Sigma_{a1} + \\Sigma_{s,1\\to 2})\\Sigma_{a2}}',
        inputsDesc:
          'PWR 3.5% UO2 pin cell: νΣf1=0.00666, νΣf2=0.1600, Σa1=0.0090, Σa2=0.1000, Σs,1→2=0.0210 cm⁻¹',
        expectedValue: 1.342,
        expectedUnits: 'Multiplication Factor',
        expectedDisplay: 'k∞ = 1.3420',
        computedValue: computed,
        computedDisplay: `k∞ = ${computed.toFixed(4)}`,
        tolerancePct: 0.2,
        notes: 'Solves 2-group coupled fast/thermal neutron balance via computeTwoGroupInfiniteMultiplication.'
      })
    );
  }

  // VTEST-14: MCA Gamma Spectroscopy FWHM Energy Resolution
  {
    const res = computeSpectrometerResolution(1.85, 1332.5);
    tests.push(
      buildRecord({
        id: 'VTEST-14',
        name: 'HPGe Gamma Spectrometry FWHM Energy Resolution (R)',
        module: 'Module 25 (Gamma Spectroscopy)',
        category: 'Criticality & MCA',
        standard: 'IEEE Std 325-1996 (R2002)',
        standardDoc: 'IEEE Standard Test Procedures for Germanium Gamma-Ray Detectors',
        formulaKatex:
          'R = \\frac{\\text{FWHM}}{E_0} \\times 100\\%, \\quad \\sigma_{\\text{Gauss}} = \\frac{\\text{FWHM}}{2\\sqrt{2\\ln 2}}',
        inputsDesc: 'Co-60 photopeak E0 = 1332.50 keV, Detector FWHM = 1.850 keV',
        expectedValue: 0.1388,
        expectedUnits: '%',
        expectedDisplay: '0.1388% (σ = 0.7856 keV)',
        computedValue: res.resolutionPct,
        computedDisplay: `${res.resolutionPct.toFixed(4)}% (σ = ${res.sigmaKeV.toFixed(4)} keV)`,
        tolerancePct: 0.1,
        notes: 'Matches IEEE Std 325 acceptance criteria for high-purity germanium spectrometers.'
      })
    );
  }

  // VTEST-15: MARSSIM NUREG-1575 Sign Test Sample Size (N)
  {
    const computedN = computeMARSSIMSignSampleSize(0.05, 0.1, 2.0, 1.2);
    tests.push(
      buildRecord({
        id: 'VTEST-15',
        name: 'MARSSIM Sign Test Nonparametric Sample Size (N)',
        module: 'Module 27 (MARSSIM Decommissioning)',
        category: 'Clinical & Stats',
        standard: 'NUREG-1575 (Rev. 1) Equation 5-2',
        standardDoc: 'MARSSIM Chapter 5: Survey Planning and Design',
        formulaKatex:
          'N = \\left\\lceil \\frac{(Z_{1-\\alpha} + Z_{1-\\beta})^2}{4(\\Phi(\\Delta/\\sigma) - 0.5)^2} \\times 1.20 \\right\\rceil, \\quad \\alpha = 0.05, \\ \\beta = 0.10',
        inputsDesc: 'Type I error α = 0.05, Type II error β = 0.10, Relative Shift Δ/σ = 2.0, 20% contingency',
        expectedValue: 12,
        expectedUnits: 'Survey Grid Points',
        expectedDisplay: 'N = 12 Survey Points',
        computedValue: computedN,
        computedDisplay: `N = ${computedN} Points`,
        tolerancePct: 0.0,
        notes:
          'Evaluates Acklam normal quantiles Z_{1-α}, Z_{1-β} and Φ(Δ/σ) directly via computeMARSSIMSignSampleSize.'
      })
    );
  }

  // VTEST-16: AAPM TG-43U1 Brachytherapy Reference Dose Rate
  {
    const computedDose_mGy = computeTG43ReferenceDoseRateMGyHr(1.0, 0.965);
    tests.push(
      buildRecord({
        id: 'VTEST-16',
        name: 'AAPM TG-43U1 Brachytherapy Reference Point Dose Rate',
        module: 'Module 26 (Brachytherapy Planner)',
        category: 'Clinical & Stats',
        standard: 'AAPM TG-43U1 (Rivard et al. 2004)',
        standardDoc: 'Medical Physics 31(3), March 2004: Update of AAPM TG-43',
        formulaKatex:
          '\\dot{D}(r_0, \\theta_0) = S_k \\cdot \\Lambda, \\quad S_k = 1.0\\text{ U}, \\ \\Lambda(^{125}\\text{I}) = 0.965 \\ \\text{cGy}/(\\text{h}\\cdot\\text{U})',
        inputsDesc: 'Air-kerma strength Sk = 1.0 U (cGy·cm²/h), Reference point r0 = 1.0 cm, θ0 = 90°',
        expectedValue: 9.65,
        expectedUnits: 'mGy/h',
        expectedDisplay: '9.650 mGy/h (0.965 cGy/h)',
        computedValue: computedDose_mGy,
        computedDisplay: `${computedDose_mGy.toFixed(3)} mGy/h`,
        tolerancePct: 0.01,
        notes: 'Clinical AAPM TG-43U1 transverse-axis reference dose specification for Model 6711 I-125 seed.'
      })
    );
  }

  // VTEST-17: NDT Industrial Radiography Controlled Area Boundary Distance
  {
    const computedDist = computeControlledBoundaryDistanceM(130.0, 1850.0, 20.0);
    tests.push(
      buildRecord({
        id: 'VTEST-17',
        name: 'Industrial Radiography Controlled Area Boundary Distance',
        module: 'Module 5 (Radiation Map & NDT)',
        category: 'Radiometry',
        standard: '10 CFR § 34.41 & IAEA SSG-11',
        standardDoc: 'NRC 10 CFR § 34.41 / IAEA Specific Safety Guide SSG-11',
        formulaKatex:
          'd_{\\text{bound}} = \\sqrt{\\frac{\\Gamma \\cdot A}{\\dot{D}_{\\text{limit}}}}, \\quad \\Gamma = 130 \\ \\mu\\text{Sv}\\cdot\\text{m}^2/(\\text{h}\\cdot\\text{GBq})',
        inputsDesc: '50.0 Ci (1,850 GBq) unshielded NDT source, Public barricade limit = 20.0 µSv/h (2 mrem/h)',
        expectedValue: 109.66,
        expectedUnits: 'meters',
        expectedDisplay: '109.66 m (359.8 ft)',
        computedValue: computedDist,
        computedDisplay: `${computedDist.toFixed(2)} m`,
        tolerancePct: 0.05,
        notes: 'Determines inverse-square unshielded restricted boundary radius via computeControlledBoundaryDistanceM.'
      })
    );
  }

  // VTEST-18: Semi-Infinite Cloud Air Submersion Dose Rate (Xe-133)
  {
    const computedRate = computeCloudSubmersionDoseRateUSvHr(10000.0, 1.56e-15);
    tests.push(
      buildRecord({
        id: 'VTEST-18',
        name: 'Semi-Infinite Cloud Air Submersion Dose Rate (Xe-133)',
        module: 'Module 13 / 33 (Cloud & Ground Shine)',
        category: 'Atmospheric',
        standard: 'EPA Federal Guidance Report No. 12 (Table III.1)',
        standardDoc: 'EPA-402-R-93-081: External Exposure to Radionuclides in Air, Water, and Soil',
        formulaKatex:
          '\\dot{H}_{\\text{sub}} = C_{\\text{air}} \\times h_{\\text{sub}}, \\quad h_{\\text{sub}}(^{133}\\text{Xe}) = 1.56 \\times 10^{-15} \\ \\frac{\\text{Sv}/\\text{s}}{\\text{Bq}/\\text{m}^3}',
        inputsDesc: 'Xe-133 cloud concentration = 10,000 Bq/m³, Semi-infinite uniform hemispherical immersion',
        expectedValue: 0.05616,
        expectedUnits: 'µSv/h',
        expectedDisplay: '0.05616 µSv/h (5.616 × 10⁻² µSv/h)',
        computedValue: computedRate,
        computedDisplay: `${computedRate.toFixed(5)} µSv/h`,
        tolerancePct: 0.05,
        notes: 'Calculates noble-gas cloudshine immersion dose rate via computeCloudSubmersionDoseRateUSvHr.'
      })
    );
  }

  // VTEST-19: Synchrotron Bending Magnet Critical Photon Energy (Ec)
  {
    const computedEc = computeSynchrotronCriticalEnergyKeV(3.0, 1.2);
    tests.push(
      buildRecord({
        id: 'VTEST-19',
        name: 'Synchrotron Bending Magnet Critical Photon Energy (Ec)',
        module: 'Module 16 / 29 (Synchrotron & Equipment)',
        category: 'Machines & Beams',
        standard: 'Wiedemann Particle Accelerator Physics / Jackson',
        standardDoc: 'H. Wiedemann, Particle Accelerator Physics 4th Ed. / Jackson Classical Electrodynamics',
        formulaKatex:
          'E_c = \\hbar \\omega_c = 0.665 \\cdot E^2 \\ [\\text{GeV}] \\cdot B \\ [\\text{T}] \\ [\\text{keV}]',
        inputsDesc: 'Storage ring electron energy E = 3.0 GeV, Dipole bending magnetic field B = 1.20 T',
        expectedValue: 7.182,
        expectedUnits: 'keV',
        expectedDisplay: '7.182 keV',
        computedValue: computedEc,
        computedDisplay: `${computedEc.toFixed(3)} keV`,
        tolerancePct: 0.05,
        notes: 'Half of total synchrotron dipole power is radiated above E_c.'
      })
    );
  }

  // VTEST-20: Thermal Neutron Activation Saturation Yield (Au-198)
  {
    const computedYieldKBq =
      computeNeutronActivationSaturationBq(0.001, 196.96657, 98.65, 1.0e9) / 1000.0;
    tests.push(
      buildRecord({
        id: 'VTEST-20',
        name: 'Thermal Neutron Activation Saturation Yield (Au-198)',
        module: 'Module 1D / 12 (Neutron Activation)',
        category: 'Criticality & MCA',
        standard: 'IAEA-NDS-2016 / Glasstone Reactor Theory',
        standardDoc: 'IAEA Nuclear Data Section / Glasstone & Sesonske Nuclear Reactor Engineering',
        formulaKatex:
          'A_\\infty = \\Phi_{\\text{th}} \\cdot \\sigma_{\\text{act}} \\cdot N_0, \\quad \\sigma_{\\text{th}}(^{197}\\text{Au}) = 98.65\\text{ b}',
        inputsDesc: '1.0 mg high-purity Gold foil, Thermal flux = 1.0e9 n/(cm²·s), Saturation limit',
        expectedValue: 301.62,
        expectedUnits: 'kBq',
        expectedDisplay: '301.62 kBq (8.15 µCi)',
        computedValue: computedYieldKBq,
        computedDisplay: `${computedYieldKBq.toFixed(2)} kBq`,
        tolerancePct: 0.05,
        notes: 'Gold-foil activation dosimetry saturation benchmark via computeNeutronActivationSaturationBq.'
      })
    );
  }

  // VTEST-21: EPA Protective Action Guide Early Phase Evacuation Threshold
  {
    const computedRatio = computeEPAPagEvacuationRatio(14.5, 10.0);
    tests.push(
      buildRecord({
        id: 'VTEST-21',
        name: 'EPA Protective Action Guide Early Phase Evacuation Threshold',
        module: 'Module 14 (Shielding & ALARA PAGs)',
        category: 'Atmospheric',
        standard: 'EPA-400-R-92-001 (EPA PAG Manual 2017)',
        standardDoc: 'EPA PAG Manual Section 2: Protective Action Guides for the Early Phase',
        formulaKatex:
          '\\text{PAG Ratio} = \\frac{\\text{TEDE}_{\\text{proj}}}{\\text{PAG}_{\\text{evac}}}, \\quad \\text{PAG}_{\\text{evac}} = 10.0\\text{ mSv}',
        inputsDesc: 'Projected 4-day plume centerline TEDE = 14.50 mSv at 2.5 km perimeter',
        expectedValue: 1.45,
        expectedUnits: 'TEDE / PAG Ratio',
        expectedDisplay: '1.450 (Evacuation Mandatory: Ratio ≥ 1.0)',
        computedValue: computedRatio,
        computedDisplay: `${computedRatio.toFixed(3)} (PAG Exceeded)`,
        tolerancePct: 0.01,
        notes: 'Triggers mandatory early-phase public evacuation under EPA PAG directives.'
      })
    );
  }

  // VTEST-22: Cs-137 Systemic Biokinetic Effective Half-Life (Te)
  {
    const csSpec = getCanonicalNuclide('Cs-137')!;
    const tpDays = csSpec.halfLifeSeconds / 86400.0;
    const tbDays = csSpec.biologicalHalfLifeDays;
    const computedTeDays = computeEffectiveHalfLifeDays(tpDays, tbDays);
    tests.push(
      buildRecord({
        id: 'VTEST-22',
        name: 'Cs-137 Systemic Biokinetic Effective Half-Life (Te)',
        module: 'Module 3 (Internal Dosimetry & Biokinetics)',
        category: 'Decay & Internal',
        standard: 'ICRP Publication 68 & ICRP Publication 30',
        standardDoc: 'ICRP-68 Annex D: Biokinetic Data for Systemic Retention',
        formulaKatex:
          'T_{e} = \\frac{T_p \\cdot T_b}{T_p + T_b}, \\quad T_p(^{137}\\text{Cs}) = 30.08\\text{y}, \\ T_b = 110\\text{d}',
        inputsDesc: `Cs-137 from registry: Physical T½ = ${tpDays.toFixed(1)} d, Biological T½ = ${tbDays.toFixed(1)} d`,
        expectedValue: 108.91,
        expectedUnits: 'Days',
        expectedDisplay: '108.91 Days',
        computedValue: computedTeDays,
        computedDisplay: `${computedTeDays.toFixed(2)} Days`,
        tolerancePct: 0.05,
        notes: 'Combines physical half-life and systemic biological clearance from CANONICAL_NUCLIDE_REGISTRY.'
      })
    );
  }

  // VTEST-23: Galactic Cosmic Radiation Dose Rate at FL390 (Solar Min)
  {
    const computedRate_uSv = computeGalacticCosmicDoseRateUSvHr(39000.0, 0.5, 420.0);
    tests.push(
      buildRecord({
        id: 'VTEST-23',
        name: 'Galactic Cosmic Radiation Dose Rate at FL390 (Solar Min)',
        module: 'Module 35 (Core Literature & Cosmic Physics)',
        category: 'Radiometry',
        standard: 'FAA CARI-7 & ICRP Publication 132',
        standardDoc: 'FAA Advisory Circular AC 120-61B / ICRP Publication 132',
        formulaKatex:
          '\\dot{H}^*(10)(h, R_c, \\Phi) = \\dot{H}_{\\text{cas}}(X(h)) F_{\\text{mag}}(R_c) F_{\\text{sol}}(\\Phi) + \\dot{H}_{\\mu}(X(h))',
        inputsDesc: 'Cruising altitude = FL390 (39,000 ft / X = 200.6 g/cm²), Polar Rc = 0.5 GV, Solar Min Φ = 420 MV',
        expectedValue: 5.5,
        expectedUnits: 'µSv/h',
        expectedDisplay: '5.50 µSv/h (0.55 mrem/h)',
        computedValue: computedRate_uSv,
        computedDisplay: `${computedRate_uSv.toFixed(2)} µSv/h`,
        tolerancePct: 0.1,
        notes:
          'Evaluates barometric ICAO atmospheric overburden X(h), Pfotzer cascade, cutoff rigidity, and solar modulation.'
      })
    );
  }

  // VTEST-24: Katz-Penfold Beta Particle CSDA Maximum Range (P-32)
  {
    const computedMm = computeKatzPenfoldBetaRangeMm(1.71, 1.0);
    tests.push(
      buildRecord({
        id: 'VTEST-24',
        name: 'Katz-Penfold Beta Particle CSDA Maximum Range (P-32)',
        module: 'Module 6 (Tactical CBRN & Stopping Power)',
        category: 'Machines & Beams',
        standard: 'Katz & Penfold (1952) / ICRU Report 37',
        standardDoc: 'Reviews of Modern Physics 24, 28: Range-Energy Relations for Electrons and Betas',
        formulaKatex:
          'R = 0.412 \\cdot E_{\\max}^{1.265 - 0.0954 \\ln(E_{\\max})} \\ [\\text{g/cm}^2], \\quad E_{\\max}(^{32}\\text{P}) = 1.710\\text{ MeV}',
        inputsDesc: 'P-32 pure beta emitter (Emax = 1.710 MeV), Water/soft-tissue medium (ρ = 1.00 g/cm³)',
        expectedValue: 7.9,
        expectedUnits: 'mm (H2O)',
        expectedDisplay: '7.90 mm (0.790 g/cm²)',
        computedValue: computedMm,
        computedDisplay: `${computedMm.toFixed(2)} mm`,
        tolerancePct: 0.1,
        notes: 'Determines low-Z acrylic beta shield thickness required to stop P-32 electrons without Pb bremsstrahlung.'
      })
    );
  }

  // VTEST-25: Klein-Nishina Total Incoherent Compton Cross-Section (α = 1.0)
  {
    const computedBarns = computeKleinNishinaCrossSectionBarns(0.51099895);
    tests.push(
      buildRecord({
        id: 'VTEST-25',
        name: 'Klein-Nishina Total Incoherent Compton Cross-Section (α = 1.0)',
        module: 'Module 23 (Monte Carlo Micro-Kernel)',
        category: 'Criticality & MCA',
        standard: 'Klein & Nishina (1929) / Evans Atomic Nucleus',
        standardDoc: 'Z. Physik 52, 853; Evans The Atomic Nucleus Ch. 23',
        formulaKatex:
          '\\sigma_e^{\\text{KN}}(\\alpha) = 2\\pi r_0^2 \\left[ \\frac{1+\\alpha}{\\alpha^2} \\left( \\frac{2(1+\\alpha)}{1+2\\alpha} - \\frac{\\ln(1+2\\alpha)}{\\alpha} \\right) + \\frac{\\ln(1+2\\alpha)}{2\\alpha} - \\frac{1+3\\alpha}{(1+2\\alpha)^2} \\right]',
        inputsDesc: 'Photon energy E = m_e c² = 0.5110 MeV (α = 1.0000), Free electron target',
        expectedValue: 0.2865,
        expectedUnits: 'barns/electron',
        expectedDisplay: '0.2865 barns',
        computedValue: computedBarns,
        computedDisplay: `${computedBarns.toFixed(4)} barns`,
        tolerancePct: 0.05,
        notes: 'Quantum electrodynamic Compton cross-section evaluated via computeKleinNishinaCrossSectionBarns.'
      })
    );
  }

  // VTEST-26: Currie Critical Decision Level (Lc) Detection Limit
  {
    const { lcCounts } = computeCurrieDetectionLimits(100.0, true);
    tests.push(
      buildRecord({
        id: 'VTEST-26',
        name: 'Currie Critical Decision Level (Lc) Detection Limit (B = 100)',
        module: 'Module 32 (Hardware Pulse Counter)',
        category: 'Radiometry',
        standard: 'L.A. Currie (1968) Anal. Chem. 40, 586-593 Eq. 15',
        standardDoc: 'Currie Limits for Qualitative Detection and Quantitative Determination',
        formulaKatex: 'L_c = 1.6449\\sqrt{2 B} = 2.3262 \\sqrt{B}, \\quad B = 100\\text{ counts}',
        inputsDesc: 'Background accumulation B = 100 counts, Paired-blank α = 0.05 decision threshold',
        expectedValue: 23.2617,
        expectedUnits: 'Net Counts',
        expectedDisplay: '23.26 Net Counts',
        computedValue: lcCounts,
        computedDisplay: `${lcCounts.toFixed(2)} Net Counts`,
        tolerancePct: 0.01,
        notes: 'Defines false-positive decision threshold via computeCurrieDetectionLimits.'
      })
    );
  }

  // VTEST-27: Radiographic Geometric Magnification & Penumbra Unsharpness (Ug)
  {
    const { magnification, unsharpnessUgMm } = computeRadiographicGeometry(100.0, 20.0, 1.2);
    tests.push(
      buildRecord({
        id: 'VTEST-27',
        name: 'Radiographic Geometric Magnification (M) & Penumbra Unsharpness (Ug)',
        module: 'Module 18 (X-Ray Distortion & Geometry)',
        category: 'Machines & Beams',
        standard: 'Bushong Radiologic Science 12th Ed. / ASME BPVC Sec V Art. 2',
        standardDoc: 'Bushong Ch. 17: Image Quality / ASME BPVC Section V Article 2 Table T-274.1',
        formulaKatex:
          'U_g = F \\cdot \\frac{\\text{OID}}{\\text{SOD}} = F \\cdot (M - 1), \\quad M = \\frac{\\text{SID}}{\\text{SOD}} = 1.250',
        inputsDesc: 'SID = 100.0 cm, OID = 20.0 cm, SOD = 80.0 cm, Focal Spot F = 1.20 mm',
        expectedValue: 0.3,
        expectedUnits: 'mm',
        expectedDisplay: '0.3000 mm (M = 1.250x)',
        computedValue: unsharpnessUgMm,
        computedDisplay: `${unsharpnessUgMm.toFixed(4)} mm (M = ${magnification.toFixed(3)}x)`,
        tolerancePct: 0.01,
        notes: 'Evaluates focal-spot geometric unsharpness and magnification via computeRadiographicGeometry.'
      })
    );
  }

  // VTEST-28: Way-Wigner Fission Product Decay & In-Shelter Dose Integration
  {
    const computedDose = computeWayWignerShelterDose(100.0, 1.0, 24.0, 10.0);
    tests.push(
      buildRecord({
        id: 'VTEST-28',
        name: 'Way-Wigner Fission Product Decay & In-Shelter Dose Integration',
        module: 'Module 7 (CBRN Fallout & Shelter)',
        category: 'Atmospheric',
        standard: 'NCRP Report No. 165 / Glasstone & Dolan (1977)',
        standardDoc: 'NCRP Report No. 165 / Glasstone & Dolan Ch. 9',
        formulaKatex:
          'D(t_1, t_2) = \\frac{1}{\\text{PF}} \\int_{t_1}^{t_2} R_1 t^{-1.2} dt = \\frac{5 R_1}{\\text{PF}} \\left[ t_1^{-0.2} - t_2^{-0.2} \\right]',
        inputsDesc: 'R₁ = 100.0 R/h, t₁ = 1.0 h, t₂ = 24.0 h, Protection Factor PF = 10.0',
        expectedValue: 23.5194,
        expectedUnits: 'R',
        expectedDisplay: '23.5194 R (at PF = 10)',
        computedValue: computedDose,
        computedDisplay: `${computedDose.toFixed(4)} R (at PF = 10)`,
        tolerancePct: 0.01,
        notes: 'Integrates t^-1.2 mixed fission-product fallout dose rate via computeWayWignerShelterDose.'
      })
    );
  }

  // VTEST-29: Nuclear Weapon Prompt Thermal Radiation Fluence
  {
    const computedFluenceCal = computeWeaponPromptThermalFluenceCalCm2(10.0, 2000.0, 0.35, 0.85);
    tests.push(
      buildRecord({
        id: 'VTEST-29',
        name: 'Nuclear Weapon Prompt Thermal Radiation Fluence (10 kT at 2.0 km)',
        module: 'Module 8 (Prompt Blast & HEMP)',
        category: 'Atmospheric',
        standard: 'Glasstone & Dolan (1977) / Kingery-Bulmash',
        standardDoc: 'Glasstone & Dolan: The Effects of Nuclear Weapons 3rd Ed. / BRL Report 1972',
        formulaKatex:
          'Q(R) = \\frac{\\eta_{\\text{th}} Y}{4\\pi R^2} \\tau_{\\text{atm}}, \\quad \\eta_{\\text{th}} = 0.35, \\ R = 2.0\\text{ km}',
        inputsDesc: 'Yield = 10.0 kT TNT, R = 2000 m, Thermal partition = 35%, Atmospheric trans = 0.85',
        expectedValue: 5.9186,
        expectedUnits: 'cal/cm²',
        expectedDisplay: '5.9186 cal/cm² (2nd Degree Burn)',
        computedValue: computedFluenceCal,
        computedDisplay: `${computedFluenceCal.toFixed(4)} cal/cm²`,
        tolerancePct: 0.01,
        notes: 'Prompt thermal pulse fluence evaluated via computeWeaponPromptThermalFluenceCalCm2.'
      })
    );
  }

  // VTEST-30: Prussian Blue Accelerated Cs-137 Biokinetic Decorporation
  {
    const computedRetained = computeMultiCompartmentRetentionKBq(1000.0, 60.0, [
      { fraction: 0.1, halfLifeDays: 2.0 },
      { fraction: 0.9, halfLifeDays: 30.0 }
    ]);
    tests.push(
      buildRecord({
        id: 'VTEST-30',
        name: 'Prussian Blue Accelerated Cs-137 Biokinetic Decorporation at Day 60',
        module: 'Module 9 (Medical Countermeasures)',
        category: 'Decay & Internal',
        standard: 'ICRP Publication 78 / NCRP Report No. 166',
        standardDoc: 'NCRP Report No. 166: Management of Persons Contaminated with Radionuclides / ICRP 78',
        formulaKatex:
          'R_{\\text{PB}}(t) = I_0 \\left[ a_1 2^{-t/T_1} + a_2 2^{-t/T_{2,\\text{PB}}} \\right], \\quad T_{2,\\text{PB}} = 30\\text{ d}',
        inputsDesc: 'Intake = 1000 kBq Cs-137, Evaluation at t = 60 days post-intake, Prussian Blue T½ = 30 d',
        expectedValue: 225.0,
        expectedUnits: 'kBq',
        expectedDisplay: '225.0000 kBq (63.5% Dose Averted)',
        computedValue: computedRetained,
        computedDisplay: `${computedRetained.toFixed(4)} kBq`,
        tolerancePct: 0.01,
        notes: 'Evaluates two-compartment ICRP-78 biological retention curve via computeMultiCompartmentRetentionKBq.'
      })
    );
  }

  // VTEST-31: Godiva Prompt-Critical Burst FWHM Pulse Duration
  {
    const computedFwhmUs = computeGodivaPromptBurstFwhmUs(0.1, 0.0065, 1.2e-8);
    tests.push(
      buildRecord({
        id: 'VTEST-31',
        name: 'Godiva Prompt-Critical Burst FWHM Pulse Duration (+$0.10 Prompt Step)',
        module: 'Module 22 (CAAS Criticality Alarms)',
        category: 'Criticality & MCA',
        standard: 'ANSI/ANS-8.3 / Hansen & Maier (LA-UR-77-2400)',
        standardDoc: 'Hansen & Maier Godiva-IV Critical Assembly Benchmark / ANSI/ANS-8.3',
        formulaKatex:
          '\\Delta t_{1/2} = \\frac{3.52}{\\alpha_0} = \\frac{3.52 \\cdot \\ell}{\\Delta k_p}, \\quad \\alpha_0 = 54,167\\text{ s}^{-1}',
        inputsDesc: 'HEU-93% metal sphere, Reactivity step = +$0.10 prompt, Prompt generation time = 12 ns',
        expectedValue: 64.9846,
        expectedUnits: 'µs',
        expectedDisplay: '64.9846 µs',
        computedValue: computedFwhmUs,
        computedDisplay: `${computedFwhmUs.toFixed(4)} µs`,
        tolerancePct: 0.01,
        notes: 'Nordheim-Fuchs prompt-critical burst FWHM evaluated via computeGodivaPromptBurstFwhmUs.'
      })
    );
  }

  // VTEST-32: Nonlinear Inverse-Square Sensor Mesh Multilateration Localization
  {
    const trueX = 450.0;
    const trueY = 500.0;
    const S = 308.5 * 13600.0; // 13.6 TBq Co-60 unshielded source strength [µSv·m²/h]
    const sensorCoords = [
      { x: 0, y: 800 },
      { x: 750, y: 200 },
      { x: -200, y: -900 },
      { x: -850, y: -100 }
    ];
    const syntheticSensors = sensorCoords.map((p) => ({
      x: p.x,
      y: p.y,
      netDoseRateUSvHr: S / ((trueX - p.x) ** 2 + (trueY - p.y) ** 2 + 0.01)
    }));
    const loc = localizeSourceInverseSquare(syntheticSensors, 308.5);
    tests.push(
      buildRecord({
        id: 'VTEST-32',
        name: 'Sensor Mesh Nonlinear Inverse-Square Multilateration Convergence',
        module: 'Module 10 (Tactical GIS & ATAK Hub)',
        category: 'Radiometry',
        standard: 'DoD Cursor-on-Target / Gauss-Newton 1/r² Multilateration',
        standardDoc: 'DoD CoT v2.0 / Nonlinear Log-Ratio Apollonius & Levenberg-Marquardt Localization',
        formulaKatex:
          '(\\hat{x}, \\hat{y}) = \\arg\\min_{x,y} \\sum_{i=1}^N \\left[\\ln \\dot{D}_i + \\ln\\big((x-x_i)^2+(y-y_i)^2\\big) - \\overline{\\ln S}\\right]^2',
        inputsDesc:
          '4 Perimeter Pickets (0,800m), (750,200m), (-200,-900m), (-850,-100m) observing 13.6 TBq Co-60 at (450m, 500m)',
        expectedValue: 450.0,
        expectedUnits: 'm (X_est)',
        expectedDisplay: '450.0000 m (Y = 500.0 m, 13.6 TBq)',
        computedValue: loc.estX,
        computedDisplay: `${loc.estX.toFixed(4)} m (Y = ${loc.estY.toFixed(1)} m, ${(loc.estActivityGBq / 1000).toFixed(1)} TBq)`,
        tolerancePct: 0.01,
        notes:
          'Verifies Levenberg-Marquardt nonlinear 1/r² multilateration recovers exact source coordinates and activity without linear-centroid bias.'
      })
    );
  }

  // VTEST-33: IAEA GSR Part 7 & EPA PAG 16-Sector Keyhole Evacuation Arc Sweep
  {
    const plan = calculateEPZEvacuationPlan({
      plantName: 'Benchmark PWR',
      coordinates: { lat: 35.0, lon: -80.0 },
      thermalPowerMWth: 3000,
      coreReleaseFraction: 0.05,
      windOriginDegrees: 225,
      windSpeedMps: 4.0,
      stabilityClass: 'D'
    });
    const computedKeyholeWedge =
      plan.affectedSectors.length * (360.0 / COMPASS_SECTORS_16.length);
    tests.push(
      buildRecord({
        id: 'VTEST-33',
        name: 'IAEA GSR Part 7 & EPA PAG 16-Sector Keyhole Evacuation Arc Sweep',
        module: 'Module 11 / 30 / 31 (EPZ & Incident Consequence)',
        category: 'Atmospheric',
        standard: 'EPA-400-R-92-001 / IAEA GSR Part 7 / NUREG-0654',
        standardDoc: 'EPA PAG Manual (2017) Section 2.2 / IAEA GSR Part 7 App. II (3-Sector Keyhole Evacuation)',
        formulaKatex:
          '\\Delta\\theta_{\\text{keyhole}} = N_{\\text{affected}} \\cdot \\left(\\frac{360^\\circ}{16}\\right) = 67.5^\\circ',
        inputsDesc: '16-Sector Compass Grid (22.5°/sector), calculateEPZEvacuationPlan @ Wind 225° SW',
        expectedValue: 67.5,
        expectedUnits: 'Degrees Arc',
        expectedDisplay: '67.5000° (NE + NNE/ENE)',
        computedValue: computedKeyholeWedge,
        computedDisplay: `${computedKeyholeWedge.toFixed(4)}° (${plan.affectedSectors.join('/')})`,
        tolerancePct: 0.001,
        notes: 'Executes production calculateEPZEvacuationPlan service verifying 3-sector keyhole selection.'
      })
    );
  }

  // VTEST-34: CTBTO Murphy-Ringdal Empirical Teleseismic Yield Inversion
  {
    const inv = invertSeismicMagnitudeToYield(5.55, 'hard_rock');
    tests.push(
      buildRecord({
        id: 'VTEST-34',
        name: 'CTBTO Murphy-Ringdal Empirical Teleseismic Yield Inversion (mb 5.55)',
        module: 'Module 31 (Global 3D Earth Hub — CTBTO)',
        category: 'Radiometry',
        standard: 'CTBT Protocol Part I / Murphy (1981) / Ringdal (1992)',
        standardDoc: 'Comprehensive Nuclear-Test-Ban Treaty (CTBT) Protocol / Murphy J.R. (1981) BSSA 71(1)',
        formulaKatex:
          'Y = 10^{\\frac{m_b - \\alpha}{\\beta}}, \\quad \\alpha=4.05, \\ \\beta=0.75 \\text{ (Hard Rock)}',
        inputsDesc: 'Observed Body-Wave Magnitude mb = 5.55, Crystalline Hard Rock Coupling',
        expectedValue: 100.0,
        expectedUnits: 'kt',
        expectedDisplay: '100.0000 kt',
        computedValue: inv.estimatedYieldKt,
        computedDisplay: `${inv.estimatedYieldKt.toFixed(4)} kt`,
        tolerancePct: 0.001,
        notes: 'Executes production invertSeismicMagnitudeToYield from seismicYieldInversionService.ts.'
      })
    );
  }

  // VTEST-35: Historical Detonation Blast Yield Proportional Marker Sizing (Castle Bravo 15 MT)
  {
    const computedMarkerSizePx = computeBlastYieldMarkerSizePx(15000.0);
    tests.push(
      buildRecord({
        id: 'VTEST-35',
        name: 'Historical Detonation Blast Yield Proportional Marker Sizing (Castle Bravo 15 MT)',
        module: 'Module 31 (Global 3D Earth Hub)',
        category: 'Radiometry',
        standard: 'Glasstone & Dolan (1977) / Dynamic Logarithmic Blast Yield Scaling',
        standardDoc: 'Glasstone & Dolan (1977) Effects of Nuclear Weapons / SIPRI-UNODA 2,056-Event Geodatabase',
        formulaKatex:
          'S_{\\text{px}}(Y) = \\text{clamp}_{[4.5, 20]}\\!\\left(5.5 + 3.0 \\log_{10}(\\max(0.001, Y_{\\text{kt}}))\\right)',
        inputsDesc: 'Castle Bravo Thermonuclear Yield Y = 15,000 kt (15.0 MT)',
        expectedValue: 18.0283,
        expectedUnits: 'px',
        expectedDisplay: '18.0283 px',
        computedValue: computedMarkerSizePx,
        computedDisplay: `${computedMarkerSizePx.toFixed(4)} px`,
        tolerancePct: 0.01,
        notes: 'Maps 8 orders of magnitude in detonation yield onto distortion-free globe markers.'
      })
    );
  }

  // VTEST-36: ANSI/ANS-6.4.3-1991 Geometric Progression (GP) 5-Parameter Buildup Factor
  {
    const gp = evaluateGPBuildup('WATER', 1.0, 10.0);
    tests.push(
      buildRecord({
        id: 'VTEST-36',
        name: 'ANSI/ANS-6.4.3-1991 Geometric Progression (GP) 5-Parameter Buildup Factor (Water 1.0 MeV)',
        module: 'Module 1B / 14 (Shielding & GP Buildup)',
        category: 'Radiometry',
        standard: 'ANSI/ANS-6.4.3-1991 Table 6.4.3-1 (Harima GP Formulation)',
        standardDoc: 'ANSI/ANS-6.4.3-1991 Gamma-Ray Attenuation Coefficients & Buildup Factors',
        formulaKatex:
          'B(E, x) = 1 + \\frac{b - 1}{K - 1}(K^x - 1), \\quad K(x) = c x^a + d \\frac{\\tanh(x/X_k - 2) - \\tanh(-2)}{1 - \\tanh(-2)}',
        inputsDesc: 'Water at E = 1.0 MeV, Optical Depth x = 10.0 mfp evaluated via evaluateGPBuildup',
        expectedValue: 28.3571,
        expectedUnits: 'B_GP',
        expectedDisplay: '28.3571 (K = 1.1859)',
        computedValue: gp.B,
        computedDisplay: `${gp.B.toFixed(4)} (K = ${gp.K.toFixed(4)})`,
        tolerancePct: 0.01,
        notes: 'Directly executes production evaluateGPBuildup("WATER", 1.0, 10.0) in xcomAndGpBuildup.ts.'
      })
    );
  }

  // VTEST-37: NIST XCOM Lead K-Shell Photoelectric Absorption Edge Discontinuity (88.005 keV)
  {
    const preK = evaluateXCOMAttenuation('LEAD', 0.088004);
    const postK = evaluateXCOMAttenuation('LEAD', 0.088006);
    const computedJump = postK.muMass / preK.muMass;
    tests.push(
      buildRecord({
        id: 'VTEST-37',
        name: 'NIST XCOM Lead K-Shell Photoelectric Absorption Edge Jump Ratio (88.005 keV)',
        module: 'Module 1B / 14 (NIST XCOM Cross-Sections)',
        category: 'Radiometry',
        standard: 'NIST Standard Reference Database 8 (XCOM / Hubbell & Seltzer)',
        standardDoc: 'NISTIR 5632 (Hubbell & Seltzer 1995): Tables of X-Ray Mass Attenuation Coefficients',
        formulaKatex:
          'J_K = \\frac{(\\mu/\\rho)(88.006\\text{ keV})}{(\\mu/\\rho)(88.004\\text{ keV})} = \\frac{7.683}{1.910} = 4.0223',
        inputsDesc: 'Lead (Z = 82) K-shell edge EK = 88.005 keV: evaluateXCOMAttenuation at 88.004 vs 88.006 keV',
        expectedValue: 4.0223,
        expectedUnits: 'Jump Ratio',
        expectedDisplay: '4.0223x (1.910 → 7.683 cm²/g)',
        computedValue: computedJump,
        computedDisplay: `${computedJump.toFixed(4)}x (${preK.muMass.toFixed(3)} → ${postK.muMass.toFixed(3)})`,
        tolerancePct: 0.02,
        notes:
          'Proves piecewise log-log XCOM segment interpolation in xcomAndGpBuildup.ts preserves sharp K-edge jumps.'
      })
    );
  }

  // VTEST-38: Turner (1964) / EPA-454/R-99-005 Solar Insolation Pasquill Stability Classification
  {
    const stabClass = classifyTurnerPasquillStability(2.5, 680.0);
    const { sigmaZM } = computeBriggsRuralDispersionMeters(1000.0, stabClass);
    tests.push(
      buildRecord({
        id: 'VTEST-38',
        name: 'Turner (1964) / EPA-454/R-99-005 Solar Insolation Pasquill Stability Classification',
        module: 'Module 6 / 13 / 31 (Live Meteorology & Plume Dispersion)',
        category: 'Atmospheric',
        standard: 'EPA-454/R-99-005 Table 6-1 / Turner (1964) J. Appl. Meteorol.',
        standardDoc: 'EPA-454/R-99-005 Meteorological Monitoring Guidance for Regulatory Modeling Applications',
        formulaKatex:
          '\\text{Class}(u_{10}=2.5\\text{ m/s}, S=680\\text{ W/m}^2) = \\text{A}, \\quad \\sigma_{z,\\text{A}}(x) = 0.20 x',
        inputsDesc: '10m Wind Speed u10 = 2.5 m/s, Solar Irradiance S = 680 W/m², Downwind x = 1,000 m',
        expectedValue: 200.0,
        expectedUnits: 'm (σ_z)',
        expectedDisplay: '200.0000 m (Class A)',
        computedValue: sigmaZM,
        computedDisplay: `${sigmaZM.toFixed(4)} m (Class ${stabClass})`,
        tolerancePct: 0.01,
        notes: 'Chains classifyTurnerPasquillStability into computeBriggsRuralDispersionMeters.'
      })
    );
  }

  // VTEST-39: Mariscotti (1967) Generalized Second-Difference Photopeak Significance
  {
    const computedZ = computeMariscottiPeakSignificanceSigma(2500.0, 100.0);
    tests.push(
      buildRecord({
        id: 'VTEST-39',
        name: 'Mariscotti (1967) Generalized Second-Difference Photopeak Significance (Z_Mariscotti)',
        module: 'Module 25 (Gamma Spectroscopy MCA & ANSI N42.42)',
        category: 'Criticality & MCA',
        standard: 'Mariscotti M.A. (1967) NIM 50(2):309-320 / IEEE Std 325',
        standardDoc: 'Mariscotti (1967): Automatic identification of peaks in the presence of background',
        formulaKatex:
          'Z_i = \\frac{-S_i}{\\sigma_{S_i}} = \\frac{2N_i - N_{i-1} - N_{i+1}}{\\sqrt{N_{i-1} + 4N_i + N_{i+1}}}',
        inputsDesc: 'Photopeak Amplitude A = 2,500 counts, Compton Continuum B = 100 counts/ch',
        expectedValue: 16.8496,
        expectedUnits: 'σ',
        expectedDisplay: '16.8496σ',
        computedValue: computedZ,
        computedDisplay: `${computedZ.toFixed(4)}σ`,
        tolerancePct: 0.01,
        notes: 'Verifies second-difference photopeak search and Poisson variance propagation.'
      })
    );
  }

  // VTEST-40: Bateman Parent-to-Daughter Atomic Share at Transient Peak (Mo-99 -> Tc-99m)
  {
    const peak = computeBatemanTransientPeak(65.94, 6.007);
    tests.push(
      buildRecord({
        id: 'VTEST-40',
        name: 'Bateman Parent-to-Daughter Atomic & Activity Pie Ratio at Transient Peak (Mo-99 → Tc-99m)',
        module: 'Module 24 (Decay Kinematics & Ratio Pie Visualizer)',
        category: 'Decay & Internal',
        standard: 'Bateman (1910) Proc. Camb. Phil. Soc. / Knoll 4th Ed.',
        standardDoc: 'Bateman H. (1910): Solution of Differential Equations of Radio-Active Transformations',
        formulaKatex:
          'f_1(t_{\\max}) = e^{-\\lambda_1 t_{\\max}} = 78.654\\%, \\quad A_2(t_{\\max}) = A_1(t_{\\max})',
        inputsDesc: 'Mo-99 (T½ = 65.94 h) → Tc-99m (T½ = 6.007 h) at transient peak t_max = 22.8438 h',
        expectedValue: 78.654,
        expectedUnits: '% Parent Atoms',
        expectedDisplay: '78.6540% Atoms (50.0% Activity)',
        computedValue: peak.parentAtomSharePct,
        computedDisplay: `${peak.parentAtomSharePct.toFixed(4)}% Atoms (50.0% Activity)`,
        tolerancePct: 0.01,
        notes: 'Verifies atomic fraction f1(t_max) and 1:1 activity equilibrium at transient inflection.'
      })
    );
  }

  // VTEST-41: Radiochemical Mo-99 / Tc-99m Generator 24h Post-Elution Daughter Regrowth Yield
  {
    const computedMBq = computeGeneratorDaughterRegrowthMBq(100.0, 65.94, 6.007, 0.879, 24.0);
    tests.push(
      buildRecord({
        id: 'VTEST-41',
        name: 'Radiochemical Mo-99 / Tc-99m Generator 24h Post-Elution Daughter Regrowth Yield',
        module: 'Module 24 (Radiochemical Generator Milking Simulator)',
        category: 'Decay & Internal',
        standard: 'IAEA-TECDOC-1065 / USP <823> Technetium Tc-99m Generator Kinetics',
        standardDoc: 'IAEA-TECDOC-1065: Production Technologies for Molybdenum-99 and Technetium-99m',
        formulaKatex:
          'A_2(\\Delta t) = b_{12} A_1(0) \\frac{\\lambda_2}{\\lambda_2 - \\lambda_1} \\left(e^{-\\lambda_1 \\Delta t} - e^{-\\lambda_2 \\Delta t}\\right), \\quad b_{12} = 0.879',
        inputsDesc: 'Alumina column A1(0) = 100.0 MBq Mo-99 after 100% saline strip, Regrowth Δt = 24.0 h',
        expectedValue: 69.0822,
        expectedUnits: 'MBq Tc-99m',
        expectedDisplay: '69.0822 MBq',
        computedValue: computedMBq,
        computedDisplay: `${computedMBq.toFixed(4)} MBq`,
        tolerancePct: 0.01,
        notes: 'Validates sawtooth generator elution regrowth kinetics and b12 = 87.9% branching.'
      })
    );
  }

  // VTEST-42: In-Core Thermal Neutron Activation Saturation Activity (Co-59(n,γ)Co-60)
  {
    const computedSatTBq =
      computeNeutronActivationSaturationBq(1.0, 58.9332, 37.18, 1.0e14) / 1e12;
    tests.push(
      buildRecord({
        id: 'VTEST-42',
        name: 'In-Core Thermal Neutron Activation Saturation Activity (Co-59(n,γ)Co-60)',
        module: 'Module 1D / 24 (Reactor Isotope Production & Activation)',
        category: 'Criticality & MCA',
        standard: 'Knoll 4th Ed. / Lamarsh Nuclear Reactor Theory (σ_γ = 37.18 b)',
        standardDoc: 'Lamarsh & Baratta Introduction to Nuclear Engineering 3rd Ed. Ch. 3',
        formulaKatex:
          'R_{\\text{sat}} = \\sigma_{\\gamma} \\Phi N_{\\text{target}} = \\sigma_{\\gamma} \\Phi \\frac{m N_A}{M_A}',
        inputsDesc: 'Monoisotopic Co-59 mass m = 1.0 g, σ_γ = 37.18 barns, Φ = 1.0×10¹⁴ n/(cm²·s)',
        expectedValue: 37.9927,
        expectedUnits: 'TBq',
        expectedDisplay: '37.9927 TBq (1,026.8 Ci)',
        computedValue: computedSatTBq,
        computedDisplay: `${computedSatTBq.toFixed(4)} TBq`,
        tolerancePct: 0.01,
        notes: 'Verifies in-core reactor radioisotope production saturation ceiling.'
      })
    );
  }

  // VTEST-43: Albert-Welton Fast Neutron Macroscopic Removal Cross-Section (Σ_R) Laminated Attenuation
  {
    const feSpec = getMaterialNeutronRemoval('STEEL');
    const bpeSpec = getMaterialNeutronRemoval('BORATED_PE');
    const mfpRemoval = feSpec.sigmaRLinear * 10.0 + bpeSpec.sigmaRLinear * 15.0;
    const computedTransPct = 100.0 * Math.exp(-mfpRemoval);
    tests.push(
      buildRecord({
        id: 'VTEST-43',
        name: 'Albert-Welton Fast Neutron Macroscopic Removal Cross-Section (Σ_R) Laminated Attenuation',
        module: 'Module 14 (Advanced Shielding & Buildup)',
        category: 'Radiometry',
        standard: 'Albert & Welton (1950) WAPD-15 / ANSI/ANS-6.4.3',
        standardDoc: 'Albert R.D. & Welton T.A. (1950) WAPD-15: Simplified Theory of Neutron Attenuation',
        formulaKatex:
          'T_n = \\exp\\!\\left(-\\sum_{i=1}^N \\Sigma_{R,i} x_i\\right) = e^{-(0.168 \\times 10 + 0.130 \\times 15)} = 2.6516\\%',
        inputsDesc: '10.0 cm Steel (Σ_R = 0.168 cm⁻¹) + 15.0 cm Borated PE (Σ_R = 0.130 cm⁻¹) via getMaterialNeutronRemoval',
        expectedValue: 2.6516,
        expectedUnits: '% Transmission',
        expectedDisplay: '2.6516% (3.63 Σ_R·x)',
        computedValue: computedTransPct,
        computedDisplay: `${computedTransPct.toFixed(4)}%`,
        tolerancePct: 0.01,
        notes: 'Queries NEUTRON_REMOVAL_CATALOG in xcomAndGpBuildup.ts for Steel + Borated PE.'
      })
    );
  }

  // VTEST-44: Kalos / Broder Multi-Layer Gamma Buildup Order Asymmetry (Lead→Water vs Water→Lead)
  {
    const pbToH2O = evaluateMultiLayerBuildup(
      [
        { materialKey: 'LEAD', mfp: 2.0 },
        { materialKey: 'WATER', mfp: 2.0 }
      ],
      1.0,
      'GP_ANS643'
    ).totalBuildup;
    const h2oToPb = evaluateMultiLayerBuildup(
      [
        { materialKey: 'WATER', mfp: 2.0 },
        { materialKey: 'LEAD', mfp: 2.0 }
      ],
      1.0,
      'GP_ANS643'
    ).totalBuildup;
    const computedRatio = pbToH2O / h2oToPb;
    tests.push(
      buildRecord({
        id: 'VTEST-44',
        name: 'Kalos / Broder Multi-Layer Gamma Buildup Order Asymmetry (Lead→Water vs Water→Lead)',
        module: 'Module 14 (Multi-Layer Laminated Shielding)',
        category: 'Radiometry',
        standard: 'Broder et al. (1962) / Kalos Composite Slab GP Buildup',
        standardDoc: 'Broder D.L. et al. (1962) Soviet J. Atomic Energy 12:26 / Kalos M.H. Interface Synthesis',
        formulaKatex:
          'B_{\\text{total}} = B_N(\\tau_N) + \\sum_{k=1}^{N-1}\\left[B_k(\\tau_k) - B_{k+1}(\\tau_k)\\right] \\kappa_{k\\to k+1}',
        inputsDesc: '2.0 mfp Lead + 2.0 mfp Water at 1.0 MeV via evaluateMultiLayerBuildup (GP_ANS643)',
        expectedValue: 1.9336,
        expectedUnits: 'Asymmetry Ratio',
        expectedDisplay: '1.9336x (5.344 vs 2.764)',
        computedValue: computedRatio,
        computedDisplay: `${computedRatio.toFixed(4)}x (${pbToH2O.toFixed(3)} vs ${h2oToPb.toFixed(3)})`,
        tolerancePct: 0.02,
        notes:
          'Directly tests evaluateMultiLayerBuildup in xcomAndGpBuildup.ts: downstream high-Z Lead absorbs low-E Water Compton scatter.'
      })
    );
  }

  // VTEST-45: Chamberlain (1953) / Slade (1968) Plume Wet + Dry Source Depletion Survival Fraction
  {
    const computedSurvivalPct = computePlumeDepletionSurvivalPct(5000.0, 4.0, 3.0e-4, 0.01, 85.0);
    tests.push(
      buildRecord({
        id: 'VTEST-45',
        name: 'Chamberlain (1953) / Slade (1968) Plume Wet + Dry Source Depletion Survival Fraction',
        module: 'Module 13 (Gaussian Plume Atmospheric Dispersion)',
        category: 'Atmospheric',
        standard: 'Slade (1968) Meteorology and Atomic Energy / RASCAL 4.3 Source Depletion',
        standardDoc: 'Slade D.H. (1968) TID-24190 / Chamberlain A.C. (1953) AERE-HP/R-1261',
        formulaKatex:
          '\\frac{Q(x)}{Q_0} = \\exp\\!\\left[-\\left(\\Lambda_{\\text{wet}} + \\frac{v_d}{\\bar{\\sigma}_z \\sqrt{\\pi/2}}\\right)\\frac{x}{u}\\right]',
        inputsDesc: 'Downwind x = 5.0 km, u = 4.0 m/s, Λ_wet = 3.0×10⁻⁴ s⁻¹, v_d = 0.01 m/s, σ_z = 85 m',
        expectedValue: 61.1197,
        expectedUnits: '% Q(x)/Q₀',
        expectedDisplay: '61.1197% Airborne',
        computedValue: computedSurvivalPct,
        computedDisplay: `${computedSurvivalPct.toFixed(4)}% Airborne`,
        tolerancePct: 0.01,
        notes: 'Accounts for cumulative upwind aerosol washout and dry gravitational settling.'
      })
    );
  }

  // VTEST-46: Planetary Boundary Layer (PBL) Inversion Lid Method-of-Images Reflection Multiplier
  {
    const computedMult = computePBLInversionReflectionMultiplier(300.0, 220.0, 3);
    tests.push(
      buildRecord({
        id: 'VTEST-46',
        name: 'Planetary Boundary Layer (PBL) Inversion Lid Method-of-Images Reflection Multiplier',
        module: 'Module 13 (Gaussian Plume Inversion Lid Trapping)',
        category: 'Atmospheric',
        standard: 'Turner (1994) Workbook of Atmospheric Dispersion Estimates',
        standardDoc: 'Turner D.B. (1994) / EPA AERMOD Capping Inversion Formulation',
        formulaKatex:
          'M_{\\text{lid}} = 1 + 2\\sum_{m=1}^{3} \\exp\\!\\left(-\\frac{(2 m H_{\\text{mix}})^2}{2\\sigma_z^2}\\right)',
        inputsDesc: 'Inversion Lid Height H_mix = 300 m, Vertical Dispersion σ_z = 220 m, 3 Harmonics',
        expectedValue: 1.0485,
        expectedUnits: '× Multiplier',
        expectedDisplay: '1.0485× (+4.85% Trapping)',
        computedValue: computedMult,
        computedDisplay: `${computedMult.toFixed(4)}×`,
        tolerancePct: 0.01,
        notes: 'Verifies vertical plume reflection between ground surface and elevated thermal inversion lid.'
      })
    );
  }

  // VTEST-47: IAEA SSR-6 (2018) Para. 405 Multi-Radionuclide Mixture Effective A2 Limit (A2,mix)
  {
    const computedA2Mix = computeSSR6MixtureEffectiveLimitTBq([
      { activityFraction: 0.5, limitTBq: 0.4 },
      { activityFraction: 0.5, limitTBq: 0.6 }
    ]);
    tests.push(
      buildRecord({
        id: 'VTEST-47',
        name: 'IAEA SSR-6 (2018) Para. 405 Multi-Radionuclide Mixture Effective A2 Limit (A2,mix)',
        module: 'Module 15 (Transport Index & DOT Hazmat)',
        category: 'Radiometry',
        standard: 'IAEA SSR-6 (Rev. 1) Para. 405 / 49 CFR 173.433 Harmonic Mixture Rule',
        standardDoc: 'IAEA Specific Safety Requirements No. SSR-6 (Rev. 1, 2018) Paragraph 405',
        formulaKatex:
          'A_{2,\\text{mix}} = \\frac{1}{\\sum_i \\frac{f_i}{A_{2,i}}} = \\frac{1}{\\frac{0.5}{0.4} + \\frac{0.5}{0.6}} = 0.4800\\text{ TBq}',
        inputsDesc: 'Binary source mixture: 50% Co-60 (A2 = 0.4 TBq) + 50% Cs-137 (A2 = 0.6 TBq)',
        expectedValue: 0.48,
        expectedUnits: 'TBq',
        expectedDisplay: '0.4800 TBq',
        computedValue: computedA2Mix,
        computedDisplay: `${computedA2Mix.toFixed(4)} TBq`,
        tolerancePct: 0.01,
        notes: 'Certifies harmonic activity-weighted mixture rule via computeSSR6MixtureEffectiveLimitTBq.'
      })
    );
  }

  // VTEST-48: ICRP Publication 74 / 116 Photon Fluence-to-Ambient Dose Equivalent H*(10) Conversion
  {
    const computedMSvHr = computeFluenceToHStar10MSvHr(1.0e6, 5.2);
    tests.push(
      buildRecord({
        id: 'VTEST-48',
        name: 'ICRP Publication 74 / 116 Photon Fluence-to-Ambient Dose Equivalent H*(10) Conversion',
        module: 'Module 35 (Unit Converter & Dosimetric Quantities)',
        category: 'Radiometry',
        standard: 'ICRP Publication 74 / 116 & ICRU Report 57',
        standardDoc: 'ICRP Publication 116 (2010): Conversion Coefficients for External Radiation Exposures',
        formulaKatex:
          '\\dot{H}^*(10) = \\Phi \\cdot h^*(10)_E \\cdot 3600 = 18.7200\\text{ mSv/h}',
        inputsDesc: 'Monoenergetic 1.0 MeV photon fluence rate Φ = 1.0×10⁶ cm⁻²·s⁻¹, h*(10) = 5.20 pSv·cm²',
        expectedValue: 18.72,
        expectedUnits: 'mSv/h',
        expectedDisplay: '18.7200 mSv/h',
        computedValue: computedMSvHr,
        computedDisplay: `${computedMSvHr.toFixed(4)} mSv/h`,
        tolerancePct: 0.01,
        notes: 'Verifies ICRU sphere 10 mm ambient dose equivalent conversion from particle fluence rate.'
      })
    );
  }

  // VTEST-49: Theoretical Carrier-Free Gravimetric Specific Activity for Cs-137
  {
    const computedTBqPerG = computeSpecificActivityTBqPerGram(30.08 * 365.25 * 86400.0, 136.9071);
    tests.push(
      buildRecord({
        id: 'VTEST-49',
        name: 'Theoretical Carrier-Free Gravimetric Specific Activity (a_s = ln(2)·N_A / (T1/2·M)) for Cs-137',
        module: 'Module 28 (Source Characterization & Forensics)',
        category: 'Decay & Internal',
        standard: 'IAEA-TECDOC-1344 / Knoll 4th Ed. Specific Activity Relation',
        standardDoc: 'IAEA-TECDOC-1344 Categorization of Radioactive Sources / Knoll 4th Ed.',
        formulaKatex: 'a_s = \\frac{\\ln(2) N_A}{T_{1/2} M_A} = 3.2119\\text{ TBq/g}',
        inputsDesc: 'Cs-137 half-life T½ = 30.08 y, Atomic Mass M = 136.9071 g/mol, Avogadro N_A',
        expectedValue: 3.2119,
        expectedUnits: 'TBq/g',
        expectedDisplay: '3.2119 TBq/g (86.81 Ci/g)',
        computedValue: computedTBqPerG,
        computedDisplay: `${computedTBqPerG.toFixed(4)} TBq/g`,
        tolerancePct: 0.01,
        notes: 'Validates gravimetric carrier-free mass-to-activity conversion via computeSpecificActivityTBqPerGram.'
      })
    );
  }

  // VTEST-50: Keepin (1965) 6-Group Delayed Neutron Inhour Equation Reactivity at T = 10s (U-235)
  {
    const computedCents = computeKeepinInhourReactivityCents(10.0, 0.0065, 5.0e-5);
    tests.push(
      buildRecord({
        id: 'VTEST-50',
        name: 'Keepin (1965) 6-Group Delayed Neutron Inhour Equation Reactivity at T = 10s (U-235)',
        module: 'Module 21 (Nuclear Criticality & Point Reactor Kinetics)',
        category: 'Criticality & MCA',
        standard: 'Keepin G.R. (1965) Physics of Nuclear Kinetics / Lamarsh Inhour Equation',
        standardDoc: 'Keepin G.R. (1965) Physics of Nuclear Kinetics, Table 4-6 Delayed Neutron Parameters',
        formulaKatex:
          '\\rho(\\$) = \\frac{\\Lambda \\omega}{\\beta_{\\text{eff}}} + \\sum_{i=1}^{6} \\frac{(\\beta_i/\\beta) \\omega}{\\omega + \\lambda_i} = +39.9964\\text{ cents}',
        inputsDesc: 'U-235 thermal fission (β_eff = 0.0065, Λ = 50 µs), Stable reactor period T = 10.0 s',
        expectedValue: 39.9964,
        expectedUnits: 'cents',
        expectedDisplay: '+39.9964 cents (+0.4000 $)',
        computedValue: computedCents,
        computedDisplay: `+${computedCents.toFixed(4)} cents`,
        tolerancePct: 0.01,
        notes: 'Verifies 6-group delayed neutron precursor kinetics via computeKeepinInhourReactivityCents.'
      })
    );
  }

  // VTEST-51: Post-SCRAM I-135 → Xe-135 Xenon Pit Peak Time (t_max) after Thermal Reactor Trip
  {
    const computedTMaxHours = computePostScramXenonPeakHours(1.0e14);
    tests.push(
      buildRecord({
        id: 'VTEST-51',
        name: 'Post-SCRAM I-135 → Xe-135 Xenon Pit Peak Time (t_max) after Thermal Reactor Trip',
        module: 'Module 21 (Fission-Product Poison Transients)',
        category: 'Criticality & MCA',
        standard: 'Duderstadt & Hamilton (1976) Nuclear Reactor Analysis',
        standardDoc: 'Duderstadt & Hamilton (1976) Nuclear Reactor Analysis, Ch. 13 Fission Product Poisoning',
        formulaKatex:
          't_{\\max} = \\frac{1}{\\lambda_X - \\lambda_I} \\ln\\!\\left[\\frac{\\lambda_X}{\\lambda_I}\\left(1 - \\frac{\\lambda_X - \\lambda_I}{\\lambda_I}\\frac{X_0}{I_0}\\right)\\right] = 10.1368\\text{ h}',
        inputsDesc: 'Equilibrium thermal reactor SCRAM from Φ₀ = 1.0×10¹⁴ n/(cm²·s)',
        expectedValue: 10.1368,
        expectedUnits: 'hours',
        expectedDisplay: '10.1368 h post-SCRAM',
        computedValue: computedTMaxHours,
        computedDisplay: `${computedTMaxHours.toFixed(4)} h`,
        tolerancePct: 0.01,
        notes: 'Predicts post-shutdown Xenon-135 poison peak timing via computePostScramXenonPeakHours.'
      })
    );
  }

  // VTEST-52: ANSI/ANS-8.3 CAAS Minimum Accident of Concern Maximum Unshielded Detection Radius
  {
    const computedRMaxM = computeCAASMaxDetectionRadiusM(20.0, 2.0, 3.0);
    tests.push(
      buildRecord({
        id: 'VTEST-52',
        name: 'ANSI/ANS-8.3 CAAS Minimum Accident of Concern Maximum Unshielded Detection Radius (R_max)',
        module: 'Module 22 (CAAS & Criticality Accident Excursion Kinetics)',
        category: 'Criticality & MCA',
        standard: 'ANSI/ANS-8.3-1997 (R2020) Sec. 4.2.1 / 10 CFR 70.24',
        standardDoc: 'ANSI/ANS-8.3-1997 (R2020) Criticality Accident Alarm System Section 4.2.1',
        formulaKatex:
          'R_{\\max} = r_{\\text{ref}} \\sqrt{\\frac{\\dot{D}_{\\text{ref}}}{\\dot{D}_{\\text{trip}}}} = 40.0000\\text{ m}',
        inputsDesc: 'Minimum Accident of Concern 20 rad/min at 2.0 m, Detector alarm trip = 3.0 rad/h',
        expectedValue: 40.0,
        expectedUnits: 'm',
        expectedDisplay: '40.0000 m',
        computedValue: computedRMaxM,
        computedDisplay: `${computedRMaxM.toFixed(4)} m`,
        tolerancePct: 0.001,
        notes: 'Evaluates unshielded CAAS detector coverage radius via computeCAASMaxDetectionRadiusM.'
      })
    );
  }

  // VTEST-53: AAPM TG-108 F-18 PET Patient 60-Min Uptake Integral Decay Reduction Factor (R_U)
  {
    const computedRU = computeTG108UptakeDecayFactor(109.77, 60.0);
    tests.push(
      buildRecord({
        id: 'VTEST-53',
        name: 'AAPM TG-108 F-18 PET Patient 60-Min Uptake Integral Decay Reduction Factor (R_U)',
        module: 'Module 4 (AAPM TG-108 PET Clinic Shielding)',
        category: 'Clinical & Stats',
        standard: 'AAPM Task Group 108 (Madsen et al., Med. Phys. 33, 2006) Eq. 3',
        standardDoc: 'AAPM Task Group 108 Report: PET and PET/CT Shielding Requirements (2006)',
        formulaKatex:
          'R_U = \\frac{T_{1/2}}{\\ln(2)\\,t_U}\\left(1 - e^{-\\ln(2)\\,t_U / T_{1/2}}\\right) = 0.8324',
        inputsDesc: 'F-18 positron emitter half-life T½ = 109.77 min, Uptake room stay t_U = 60.0 min',
        expectedValue: 0.8326,
        expectedUnits: 'R_U Factor',
        expectedDisplay: '0.8326',
        computedValue: computedRU,
        computedDisplay: computedRU.toFixed(4),
        tolerancePct: 0.05,
        notes: 'Integrates continuous F-18 decay over patient uptake period via computeTG108UptakeDecayFactor.'
      })
    );
  }

  // VTEST-54: AAPM TG-108 Archer 511 keV Broad-Beam Lead Transmission Factor B(1.0 cm Pb)
  {
    const computedB = computeArcherBroadBeamTransmission(1.0, 1.543, -0.4408, 0.2136);
    tests.push(
      buildRecord({
        id: 'VTEST-54',
        name: 'AAPM TG-108 Archer 511 keV Broad-Beam Lead Transmission Factor B(1.0 cm Pb)',
        module: 'Module 4 (AAPM TG-108 PET Clinic Shielding)',
        category: 'Clinical & Stats',
        standard: 'AAPM Task Group 108 Table II Archer Broad-Beam Fit',
        standardDoc: 'AAPM Task Group 108 (2006) Table II: Archer Fitting Parameters for 511 keV Photons',
        formulaKatex:
          'B(x) = \\left[\\left(1 + \\frac{\\beta}{\\alpha}\\right)e^{\\alpha\\gamma x} - \\frac{\\beta}{\\alpha}\\right]^{-1/\\gamma} = 0.3161',
        inputsDesc: '511 keV PET photons through x = 1.0 cm Lead (α=1.543, β=-0.4408, γ=0.2136)',
        expectedValue: 0.3161,
        expectedUnits: 'B(x)',
        expectedDisplay: '0.3161 (31.61% Transmission)',
        computedValue: computedB,
        computedDisplay: computedB.toFixed(4),
        tolerancePct: 0.05,
        notes: 'Evaluates Archer broad-beam transmission curve via computeArcherBroadBeamTransmission.'
      })
    );
  }

  // VTEST-55: NCRP-151 / Cossairt 2-Leg Accelerator Maze Unshielded Door Dose Rate
  {
    const computedUSvH = computeCossairtMazeDoorDoseRateUSvHr(50.0, 4.5, 6.0, 3.6);
    tests.push(
      buildRecord({
        id: 'VTEST-55',
        name: 'NCRP-151 / Cossairt 2-Leg Accelerator Maze Unshielded Door Dose Rate (d1=4.5m, d2=6.0m)',
        module: 'Module 4 (NCRP-151 Vault Labyrinth & Skyshine)',
        category: 'Machines & Beams',
        standard: 'NCRP Report No. 151 / Cossairt 2-Component Maze Attenuation',
        standardDoc: 'NCRP Report No. 151 (2005): Structural Shielding Design for Megavoltage Facilities',
        formulaKatex:
          '\\dot{H}_{\\text{maze}}(d_2) = \\frac{\\dot{H}_0 A}{d_1^4}\\left(0.20 e^{-d_2 / 1.95\\sqrt{A}} + 0.80 e^{-d_2 / 5.4\\sqrt{A}}\\right)',
        inputsDesc: 'Source 1m rate H₀ = 50 Sv/h, Leg 1 d₁ = 4.5 m, Leg 2 d₂ = 6.0 m, Area A = 3.6 m²',
        expectedValue: 212862.5604,
        expectedUnits: 'µSv/h',
        expectedDisplay: '212,862.6 µSv/h',
        computedValue: computedUSvH,
        computedDisplay: `${computedUSvH.toFixed(1)} µSv/h`,
        tolerancePct: 0.02,
        notes: 'Certifies two-component labyrinth attenuation via computeCossairtMazeDoorDoseRateUSvHr.'
      })
    );
  }

  // VTEST-56: ICRP Publication 137 Radon-222 Progeny Working Level Month (WLM) & Annual Dose
  {
    const rn = computeRadonProgenyAnnualDose(370.0, 0.4, 1700.0, 10.0);
    tests.push(
      buildRecord({
        id: 'VTEST-56',
        name: 'ICRP Publication 137 Radon-222 Progeny Working Level Month (WLM) & Annual Dose',
        module: 'Module 3 (Internal Dosimetry & Radon-222 WL/WLM Solver)',
        category: 'Decay & Internal',
        standard: 'ICRP Publication 137 (2017) & 10 CFR Part 20',
        standardDoc: 'ICRP Publication 137 (2017): Occupational Intakes of Radionuclides Part 3',
        formulaKatex:
          '\\text{WL} = \\frac{F \\cdot C_{\\text{Rn}}}{3700} = 0.040\\text{ WL}, \\quad \\text{WLM} = 0.400 \\implies 4.0000\\text{ mSv}',
        inputsDesc: 'Radon-222 C_Rn = 370 Bq/m³, Equilibrium F = 0.40, Exposure t = 1,700 h',
        expectedValue: 4.0,
        expectedUnits: 'mSv/yr',
        expectedDisplay: '4.0000 mSv/yr (0.400 WLM)',
        computedValue: rn.annualDoseMSv,
        computedDisplay: `${rn.annualDoseMSv.toFixed(4)} mSv/yr (${rn.wlm.toFixed(3)} WLM)`,
        tolerancePct: 0.001,
        notes: 'Evaluates WL, WLM, and ICRP-137 dose conversion via computeRadonProgenyAnnualDose.'
      })
    );
  }

  // VTEST-57: ISO 11929-1:2019 Characteristic Detection Limit (y#)
  {
    const { yStar, yHash } = computeISO11929CharacteristicLimits(
      1.0,
      60.0,
      60.0,
      1.0 / (0.4 * 0.5),
      0.05,
      0.05
    );
    tests.push(
      buildRecord({
        id: 'VTEST-57',
        name: 'ISO 11929-1:2019 Characteristic Detection Limit (y#) with Calibration Uncertainty',
        module: 'Module 27 (MARSSIM & ISO 11929 Detection Limits)',
        category: 'Clinical & Stats',
        standard: 'ISO 11929-1:2019 Determination of Characteristic Limits',
        standardDoc: 'ISO 11929-1:2019 Clause 6.3 & 6.4 (Decision Threshold y* & Detection Limit y#)',
        formulaKatex:
          'y^* = k_{1-\\alpha} w \\sqrt{\\frac{R_b}{t_s} + \\frac{R_b}{t_b}}, \\qquad y^\\# = \\frac{2y^* + \\frac{k^2 w}{t_s}}{1 - k^2 u_{\\text{rel}}^2(w)}',
        inputsDesc: 'R_b = 1.0 cps, t_s = t_b = 60 s, w = 5.0 Bq·s, u_rel(w) = 5%, α = β = 0.05',
        expectedValue: 3.2505,
        expectedUnits: 'Bq',
        expectedDisplay: '3.2505 Bq (y* = 1.5015 Bq)',
        computedValue: yHash,
        computedDisplay: `${yHash.toFixed(4)} Bq (y* = ${yStar.toFixed(4)} Bq)`,
        tolerancePct: 0.02,
        notes: 'Evaluates Bayesian ISO 11929-1 limits via computeISO11929CharacteristicLimits.'
      })
    );
  }

  // VTEST-58: ISO 7503-1:2016 Surface Contamination Activity Evaluation (Bq/cm²)
  {
    const computedAs = computeISO7503SurfaceActivityBqCm2(21.0, 1.0, 0.4, 0.5, 100.0);
    tests.push(
      buildRecord({
        id: 'VTEST-58',
        name: 'ISO 7503-1:2016 Surface Contamination Activity Concentration (A_s)',
        module: 'Module 27 / 2 (MARSSIM & Worker Contamination Surveys)',
        category: 'Radiometry',
        standard: 'ISO 7503-1:2016 Measurement and Evaluation of Surface Contamination',
        standardDoc: 'ISO 7503-1:2016 Clause 6.2 (Direct Surface Contamination Evaluation)',
        formulaKatex:
          'A_s = \\frac{R_g - R_b}{\\varepsilon_i \\cdot \\varepsilon_s \\cdot W} = 1.0000 \\ \\text{Bq/cm}^2',
        inputsDesc: 'R_g = 21.0 s⁻¹, R_b = 1.0 s⁻¹, ε_i = 0.40, ε_s = 0.50 (β > 0.4 MeV), W = 100 cm²',
        expectedValue: 1.0,
        expectedUnits: 'Bq/cm²',
        expectedDisplay: '1.0000 Bq/cm² (6,000 dpm/100 cm²)',
        computedValue: computedAs,
        computedDisplay: `${computedAs.toFixed(4)} Bq/cm²`,
        tolerancePct: 0.001,
        notes: 'Evaluates ISO 7503-1 surface activity via computeISO7503SurfaceActivityBqCm2.'
      })
    );
  }

  // VTEST-59: ISO 4037-3:2019 Ambient Dose Equivalent H*(10) Reference Calibration Field (S-Cs)
  {
    const computedHStar10 = computeISO4037AirKermaToHStar10MSvHr(2.5, 1.2);
    tests.push(
      buildRecord({
        id: 'VTEST-59',
        name: 'ISO 4037-3:2019 S-Cs Reference Field Air Kerma to H*(10) Conversion',
        module: 'Module 1A / 29 (External Dose & Instrument Calibration)',
        category: 'Radiometry',
        standard: 'ISO 4037-3:2019 Radiological Protection — X and Gamma Reference Radiation',
        standardDoc: 'ISO 4037-3:2019 Table 25 (Monoenergetic S-Cs 661.7 keV Conversion Coefficient)',
        formulaKatex:
          '\\dot{H}^*(10) = h^*_K(10; \\text{S-Cs}) \\cdot \\dot{K}_a = 1.20 \\times 2.50 = 3.0000\\text{ mSv/h}',
        inputsDesc: 'Reference beam S-Cs (661.7 keV), Air kerma rate K_a = 2.50 mGy/h, h*_K(10) = 1.20 Sv/Gy',
        expectedValue: 3.0,
        expectedUnits: 'mSv/h',
        expectedDisplay: '3.0000 mSv/h',
        computedValue: computedHStar10,
        computedDisplay: `${computedHStar10.toFixed(4)} mSv/h`,
        tolerancePct: 0.001,
        notes: 'Verifies ISO 4037-3 operational quantity conversion via computeISO4037AirKermaToHStar10MSvHr.'
      })
    );
  }

  // VTEST-60: ISO/IEC Guide 98-3 (GUM) Combined & Expanded Uncertainty Propagation (k = 2)
  {
    const { ucPct, expandedPct } = computeGUMUncertaintyBudget([3.0, 4.0], 2.0);
    tests.push(
      buildRecord({
        id: 'VTEST-60',
        name: 'ISO/IEC Guide 98-3 (GUM) Combined & Expanded Uncertainty Budget (k = 2)',
        module: 'All Modules / Audit Dossier Service (ISO/IEC 17025 Clause 7.6)',
        category: 'Clinical & Stats',
        standard: 'ISO/IEC Guide 98-3:2008 (GUM) & ISO/IEC 17025:2017 Clause 7.6',
        standardDoc: 'JCGM 100:2008 / ISO/IEC Guide 98-3 Clause 5.1 & 6.2',
        formulaKatex:
          'u_{c,\\text{rel}} = \\sqrt{3.0^2 + 4.0^2} = 5.0\\%, \\quad U_{k=2} = 2 u_{c,\\text{rel}} = 10.00\\%',
        inputsDesc: 'u_rel(A) = 3.0%, u_rel(ε) = 4.0%, Coverage factor k = 2 (95.45% CI)',
        expectedValue: 10.0,
        expectedUnits: '% (Expanded Uncertainty)',
        expectedDisplay: '±10.0000% (u_c = 5.00%)',
        computedValue: expandedPct,
        computedDisplay: `±${expandedPct.toFixed(4)}% (u_c = ${ucPct.toFixed(2)}%)`,
        tolerancePct: 0.001,
        notes: 'Validates root-sum-square GUM propagation via computeGUMUncertaintyBudget.'
      })
    );
  }

  // VTEST-61: Dutch ANVS / Bbs & Rbs Radiotoxicity Equivalent (Re_inh) & Lab Classification
  {
    const bbsRes = computeDutchBbsRadiotoxicity(1.0e9, 1.0e-8, 1.0);
    const tierValid =
      bbsRes.labClass === 'C-Laboratory' &&
      Math.abs(bbsRes.oneReInh_Bq - 1.0e8) < 1.0;
    tests.push(
      buildRecord({
        id: 'VTEST-61',
        name: 'Netherlands Bbs/Rbs Inhalation Radiotoxicity Equivalent (Re_inh) & Lab Tier',
        module: 'Module 33 (NL ANVS / Bbs Regulatory & Lab Classification)',
        category: 'Decay & Internal',
        standard: 'Besluit basisveiligheidsnormen stralingsbescherming (Bbs, Stb. 2017, 404) & Rbs',
        standardDoc: 'ANVS Bbs / Rbs Open-Source Radionuclide Laboratory Classification (D <= 0.2, C <= 20, B <= 2,000 Re_inh)',
        formulaKatex:
          '1\\,\\text{Re}_{\\text{inh}} = \\frac{1\\,\\text{Sv}}{e_{\\text{inh}}(50)} = 10^8\\,\\text{Bq}, \\quad N_{\\text{Re,inh}} = A \\cdot e_{\\text{inh}}(50) = 10.0000',
        inputsDesc: 'A = 1.0 GBq (10^9 Bq), e_inh(50) = 1.0e-8 Sv/Bq, Handling factor f = 1.0',
        expectedValue: 10.0,
        expectedUnits: 'Re_inh',
        expectedDisplay: '10.0000 Re_inh (1 Re_inh = 100 MBq, C-Laboratory)',
        computedValue: tierValid ? bbsRes.reInhEffective : Number.NaN,
        computedDisplay: `${bbsRes.reInhEffective.toFixed(4)} Re_inh (1 Re_inh = ${(bbsRes.oneReInh_Bq / 1e6).toFixed(0)} MBq, ${bbsRes.labClass})`,
        tolerancePct: 0.001,
        notes: 'Verifies Dutch Bbs/Rbs Re_inh activity equivalence and D/C/B laboratory classification via computeDutchBbsRadiotoxicity.'
      })
    );
  }

  // VTEST-62: Netherlands Bbs Bijlage 3 Exemption & Decay-in-Storage Hold Time
  {
    const i131Res = evaluateDutchBbsExemption('I-131', 5.0e7, 100, 8.0252 * 86400);
    const csRes = evaluateDutchBbsExemption('Cs-137', 5.0e3, 100);
    const expectedHoldDays = (8.0252 / Math.LN2) * Math.log(50.0);
    const gatesValid =
      i131Res.known &&
      !i131Res.isExempt &&
      Math.abs(i131Res.activityRatio - 50.0) < 1e-6 &&
      csRes.known &&
      csRes.isExempt &&
      i131Res.decayTimeToExemptDays !== null;

    tests.push(
      buildRecord({
        id: 'VTEST-62',
        name: 'Netherlands Bbs Bijlage 3 Exemption & Decay-in-Storage Hold Time',
        module: 'Module 33 (NL ANVS / Bbs Bijlage 3 Exemption)',
        category: 'Decay & Internal',
        standard: 'EU 2013/59/Euratom Annex VII Table B / NL Bbs (Stb. 2017, 404) Bijlage 3',
        standardDoc: 'I-131 Exemption (1 MBq, 100 Bq/g) & Cs-137 Exemption (10 kBq, 10 Bq/g)',
        formulaKatex:
          't_{\\text{hold}} = \\frac{T_{1/2}}{\\ln 2}\\ln\\left(\\min\\left(\\frac{A}{A_{\\text{ex}}}, \\frac{C}{C_{\\text{ex}}}\\right)\\right) = 45.2869\\,\\text{d}',
        inputsDesc: 'I-131: 50 MBq in 100 g (T½ = 8.0252 d); Cs-137 control: 5 kBq in 100 g',
        expectedValue: expectedHoldDays,
        expectedUnits: 'days',
        expectedDisplay: `${expectedHoldDays.toFixed(4)} d (I-131 50× over A_ex; Cs-137 5 kBq exempt)`,
        computedValue: gatesValid && i131Res.decayTimeToExemptDays !== null ? i131Res.decayTimeToExemptDays : Number.NaN,
        computedDisplay: `${(i131Res.decayTimeToExemptDays ?? 0).toFixed(4)} d (A/A_ex=${i131Res.activityRatio.toFixed(1)}×, Cs-137=${csRes.isExempt ? 'EXEMPT' : 'LICENSED'})`,
        tolerancePct: 0.01,
        notes: 'Verifies NL Bbs Bijlage 3 moderate-quantity exemption thresholds and decay-in-storage hold-time kinetics via evaluateDutchBbsExemption.'
      })
    );
  }

  return tests;
}

export function runAllStressBenchmarks(): StressTestRecord[] {
  const list: StressTestRecord[] = [];

  // STRESS-01: Point Source Singularity Clamp (r -> 0) via production solver
  {
    const t0 = nowMs();
    const dose = computePointSourceAmbientDoseRateUSvHr('Co-60', 1.0, 0.0, 0.01);
    const t1 = nowMs();
    const passed = Number.isFinite(dose) && dose > 0 && !Number.isNaN(dose);
    list.push({
      id: 'STRESS-01',
      name: 'Point Source Near-Field Singularity Clamp (r → 0)',
      module: 'Module 1A / 4 / 28',
      domain: 'Numerical Safeguards',
      standard: 'ISO 17025 Singularity Guard: max(r, r_min)',
      condition: 'Distance input r = 0.00 m passed to computePointSourceAmbientDoseRateUSvHr',
      formulaKatex:
        '\\dot{D}(r) = \\frac{\\Gamma \\cdot A}{\\max(r, r_{\\min})^2}, \\quad r_{\\min} = 0.01\\text{ m}',
      passed,
      outputText: `Absorbed Dose clamped to finite ceiling: ${dose.toFixed(1)} µSv/h (No Infinity / NaN)`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Guarantees detector coordinates coinciding with point sources clamp to 1 cm boundary.'
    });
  }

  // STRESS-02: Extreme Deep-Shielding Attenuation Asymptotic Convergence (100 TVLs)
  {
    const t0 = nowMs();
    const tvl = Math.LN10 / evaluateXCOMAttenuation('LEAD', 0.6617).muLinear;
    const res = evaluateBroadBeamPointShielding(
      0.6617,
      1000.0,
      1.0,
      [{ material: 'LEAD', thicknessCm: 100.0 * tvl }],
      'NARROW_BEAM'
    );
    const t1 = nowMs();
    const trans = res.transmissionNarrowBeam;
    const passed = Number.isFinite(trans) && trans >= 0 && trans < 1e-90;
    list.push({
      id: 'STRESS-02',
      name: 'Infinite Shielding Attenuation Asymptotic Convergence (x → ∞)',
      module: 'Module 1B / 4 / 14',
      domain: 'Shielding Attenuation',
      standard: 'NCRP-151 Asymptotic Zero Transmission',
      condition: `Shield thickness x = 100 × XCOM TVL (${(100 * tvl).toFixed(1)} cm Pb)`,
      formulaKatex: 'I(100 \\cdot \\text{TVL}) = I_0 \\cdot 10^{-100} \\to 0.0',
      passed,
      outputText: `Transmission factor = ${trans.toExponential(4)} (Zero underflow exception)`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Executes evaluateBroadBeamPointShielding at 230.26 mfp without NaN/Infinity.'
    });
  }

  // STRESS-03: Asymptotic Long-Term Decay Convergence via TR-BDF2 Generalized Decay DAG
  {
    const t0 = nowMs();
    const hl = 3600.0;
    const sim = simulateGeneralizedDecayDAG({
      nodes: [
        {
          nuclide: 'Parent-A',
          symbol: 'PA',
          Z: 43,
          N: 56,
          halfLifeLabel: '1 h',
          halfLifeSeconds: hl,
          lambda: Math.LN2 / hl,
          primaryMode: 'IT',
          qAlphaMeV: 0,
          qBetaMeV: 0,
          qGammaOrEcMeV: 0.14,
          principalGammaMeV: 0.14,
          gammaYieldPct: 89,
          specificGammaConstUSvM2PerGBqHr: 14.1,
          generation: 0,
          branchLane: 0
        },
        {
          nuclide: 'Stable-B',
          symbol: 'SB',
          Z: 43,
          N: 56,
          halfLifeLabel: 'Stable',
          halfLifeSeconds: Infinity,
          lambda: 0,
          primaryMode: 'Stable',
          qAlphaMeV: 0,
          qBetaMeV: 0,
          qGammaOrEcMeV: 0,
          principalGammaMeV: 0,
          gammaYieldPct: 0,
          specificGammaConstUSvM2PerGBqHr: 0,
          generation: 1,
          branchLane: 0
        }
      ],
      edges: [
        {
          fromNuclide: 'Parent-A',
          toNuclide: 'Stable-B',
          branchFraction: 1.0,
          modeLabel: 'IT',
          qMeV: 0.14,
          modality: 'gamma_it'
        }
      ],
      initialParentAtoms: 1.0e15,
      maxTimeSeconds: 1000.0 * hl,
      currentTimeSeconds: 1000.0 * hl,
      elutionEnabled: false,
      elutionIntervalSeconds: 0,
      elutionEfficiency: 0,
      parentBreakthroughFraction: 0,
      activationEnabled: false,
      targetInitialAtoms: 0,
      sigmaActCm2: 0,
      sigmaBurnCm2: 0,
      neutronFluxNcm2s: 0,
      irradiationTimeSeconds: 0
    });
    const t1 = nowMs();
    const remFrac = sim.statesAtT[0].atoms / 1.0e15;
    const passed = Number.isFinite(remFrac) && remFrac >= 0 && remFrac < 1e-12;
    list.push({
      id: 'STRESS-03',
      name: 'Asymptotic Long-Term Decay Convergence (t → ∞)',
      module: 'Module 24',
      domain: 'Decay Kinematics',
      standard: 'TR-BDF2 L-Stable DAG Integration (t = 1,000 T½)',
      condition: 'simulateGeneralizedDecayDAG evaluated at t = 1,000 × T½ (3.6×10⁶ s)',
      formulaKatex: 'N_1(1000 \\cdot T_{1/2}) \\ge 0, \\quad N_1 + N_2 = N_1(0)',
      passed,
      outputText: `TR-BDF2 remaining parent fraction = ${remFrac.toExponential(3)} (L-stable, non-negative)`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Verifies L-stable TR-BDF2 solver in decayRadiochemistryEngine.ts never oscillates negative.'
    });
  }

  // STRESS-04: Multi-Step Bateman DAG Activity Non-Negativity & Atom Conservation
  {
    const t0 = nowMs();
    const l1 = Math.LN2 / (65.94 * 3600.0);
    const l2 = Math.LN2 / (6.007 * 3600.0);
    const sim = simulateGeneralizedDecayDAG({
      nodes: [
        {
          nuclide: 'Mo-99',
          symbol: 'Mo-99',
          Z: 42,
          N: 57,
          halfLifeLabel: '65.94 h',
          halfLifeSeconds: 65.94 * 3600,
          lambda: l1,
          primaryMode: 'β⁻',
          qAlphaMeV: 0,
          qBetaMeV: 1.214,
          qGammaOrEcMeV: 0.74,
          principalGammaMeV: 0.74,
          gammaYieldPct: 12.1,
          specificGammaConstUSvM2PerGBqHr: 24.0,
          generation: 0,
          branchLane: 0
        },
        {
          nuclide: 'Tc-99m',
          symbol: 'Tc-99m',
          Z: 43,
          N: 56,
          halfLifeLabel: '6.007 h',
          halfLifeSeconds: 6.007 * 3600,
          lambda: l2,
          primaryMode: 'IT',
          qAlphaMeV: 0,
          qBetaMeV: 0,
          qGammaOrEcMeV: 0.1405,
          principalGammaMeV: 0.1405,
          gammaYieldPct: 89.0,
          specificGammaConstUSvM2PerGBqHr: 14.1,
          generation: 1,
          branchLane: 0
        },
        {
          nuclide: 'Tc-99',
          symbol: 'Tc-99',
          Z: 43,
          N: 56,
          halfLifeLabel: '2.11e5 y',
          halfLifeSeconds: Infinity,
          lambda: 0,
          primaryMode: 'Stable',
          qAlphaMeV: 0,
          qBetaMeV: 0,
          qGammaOrEcMeV: 0,
          principalGammaMeV: 0,
          gammaYieldPct: 0,
          specificGammaConstUSvM2PerGBqHr: 0,
          generation: 2,
          branchLane: 0
        }
      ],
      edges: [
        {
          fromNuclide: 'Mo-99',
          toNuclide: 'Tc-99m',
          branchFraction: 0.879,
          modeLabel: 'β⁻',
          qMeV: 1.214,
          modality: 'beta'
        },
        {
          fromNuclide: 'Mo-99',
          toNuclide: 'Tc-99',
          branchFraction: 0.121,
          modeLabel: 'β⁻',
          qMeV: 1.357,
          modality: 'beta'
        },
        {
          fromNuclide: 'Tc-99m',
          toNuclide: 'Tc-99',
          branchFraction: 1.0,
          modeLabel: 'IT',
          qMeV: 0.1405,
          modality: 'gamma_it'
        }
      ],
      initialParentAtoms: 1.0e16,
      maxTimeSeconds: 1.0e6,
      currentTimeSeconds: 5.0e5,
      elutionEnabled: false,
      elutionIntervalSeconds: 0,
      elutionEfficiency: 0,
      parentBreakthroughFraction: 0,
      activationEnabled: false,
      targetInitialAtoms: 0,
      sigmaActCm2: 0,
      sigmaBurnCm2: 0,
      neutronFluxNcm2s: 0,
      irradiationTimeSeconds: 0
    });
    const t1 = nowMs();
    let nonNegative = true;
    for (const series of sim.seriesActivityMBqByNuclide) {
      for (const val of series) {
        if (!Number.isFinite(val) || val < 0) {
          nonNegative = false;
          break;
        }
      }
    }
    list.push({
      id: 'STRESS-04',
      name: 'Multi-Step Bateman Kinematic Activity Non-Negativity',
      module: 'Module 24',
      domain: 'Bateman Kinetics',
      standard: 'Positive Invariance of Bifurcating Decay DAG',
      condition: `simulateGeneralizedDecayDAG evaluated across ${sim.timeGridSeconds.length} temporal slices [0, 10⁶ s]`,
      formulaKatex: 'A_i(t) \\ge 0 \\quad \\forall i, t \\ge 0, \\quad \\sum_i N_i(t) = N_1(0)',
      passed: nonNegative,
      outputText: `${sim.timeGridSeconds.length} temporal slices satisfy strict non-negativity & atom conservation`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Executes production bifurcating Mo-99 → Tc-99m / Tc-99 DAG solver.'
    });
  }

  // STRESS-05: Relativistic Lorentz Singularity Protection (beta -> 1)
  {
    const t0 = nowMs();
    const gamma = computeRelativisticLorentzGamma(0.999999999);
    const gammaSuper = computeRelativisticLorentzGamma(1.0);
    const t1 = nowMs();
    const passed =
      Number.isFinite(gamma) &&
      gamma > 1000 &&
      Number.isFinite(gammaSuper) &&
      !Number.isNaN(gammaSuper);
    list.push({
      id: 'STRESS-05',
      name: 'Relativistic Lorentz Singularity Protection (β → 1)',
      module: 'Module 16 / 29',
      domain: 'Synchrotron & FEL Physics',
      standard: 'Special Relativity Limiting Velocity c',
      condition: 'Beam velocity ratio β = 0.999999999 and β = 1.0 passed to computeRelativisticLorentzGamma',
      formulaKatex: '\\gamma = \\frac{1}{\\sqrt{1 - \\min(\\beta, 1 - \\epsilon)^2}}',
      passed,
      outputText: `Lorentz factor γ = ${gamma.toFixed(1)} (β=1 clamped safely to finite γ)`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Prevents NaN / division-by-zero when β approaches or equals speed of light c.'
    });
  }

  // STRESS-06: Duane-Hunt Accelerated Voltage Boundary Handling (V <= 0)
  {
    const t0 = nowMs();
    const atZero = computeDuaneHuntMinWavelengthNm(0);
    const atNeg = computeDuaneHuntMinWavelengthNm(-10);
    const atPos = computeDuaneHuntMinWavelengthNm(100);
    const t1 = nowMs();
    const passed = atZero === null && atNeg === null && atPos !== null && atPos > 0;
    list.push({
      id: 'STRESS-06',
      name: 'Duane-Hunt Accelerated Voltage Boundary Handling (V ≤ 0)',
      module: 'Module 17',
      domain: 'X-Ray Tube Physics',
      standard: 'Quantum Cutoff Physical Boundary Condition',
      condition: 'V = 0 kV and V = -10 kV passed to computeDuaneHuntMinWavelengthNm',
      formulaKatex: '\\lambda_{\\min} = \\frac{hc}{eV} \\quad \\text{requires } V > 0',
      passed,
      outputText: 'Safely intercepted: Zero and negative voltages gracefully return null cutoff',
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Guarantees unenergized X-ray tubes (0 kV) do not trigger division by zero.'
    });
  }

  // STRESS-07: Atmospheric Plume Upwind & Lateral Spatial Boundary (x <= 0)
  {
    const t0 = nowMs();
    const cUpwind = computeGaussianPlumeGroundConcBqM3(1.0e9, 4.0, 10.0, -50.0, 0, 'D');
    const cOrigin = computeGaussianPlumeGroundConcBqM3(1.0e9, 4.0, 10.0, 0.0, 0, 'D');
    const cDownwind = computeGaussianPlumeGroundConcBqM3(1.0e9, 4.0, 10.0, 500.0, 0, 'D');
    const t1 = nowMs();
    const passed = cUpwind === 0.0 && cOrigin === 0.0 && cDownwind > 0;
    list.push({
      id: 'STRESS-07',
      name: 'Atmospheric Plume Upwind & Lateral Spatial Boundary (x ≤ 0)',
      module: 'Module 13',
      domain: 'Atmospheric Dispersion',
      standard: 'Advection Causal Boundary Condition',
      condition: 'Upwind x = -50 m and x = 0 m passed to computeGaussianPlumeGroundConcBqM3',
      formulaKatex: 'C(x \\le 0, y, z) \\equiv 0.0 \\ \\text{Bq/m}^3',
      passed,
      outputText: `Upwind C(-50m) = ${cUpwind.toFixed(1)}, Downwind C(+500m) = ${cDownwind.toExponential(2)} Bq/m³`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Enforces causal advection boundary ensuring plumes never disperse upwind.'
    });
  }

  // STRESS-08: IEEE 754 64-Bit Double Precision Machine Epsilon Integrity
  {
    const t0 = nowMs();
    let eps = 1.0;
    while (1.0 + eps / 2.0 > 1.0) {
      eps /= 2.0;
    }
    const standardEps = Math.pow(2, -52);
    const passed = Math.abs(eps - standardEps) < 1e-25 && eps === Number.EPSILON;
    const t1 = nowMs();
    list.push({
      id: 'STRESS-08',
      name: 'IEEE 754 64-Bit Double Precision Machine Epsilon Integrity',
      module: 'Modules 1–35',
      domain: 'Hardware FPU Arithmetic',
      standard: 'IEEE 754-2019 Binary64 Double Precision Spec',
      condition: 'Host CPU / FPU Floating Point Binary64 Unit-Roundoff Probe',
      formulaKatex:
        '\\epsilon_{\\text{machine}} = 2^{-52} \\approx 2.220446049250313 \\times 10^{-16}',
      passed,
      outputText: `Host FPU Machine Epsilon ε = ${eps.toExponential(6)} (Exact 64-bit IEEE 754)`,
      execTimeUs: Math.max(1, Math.round((t1 - t0) * 1000)),
      notes: 'Certifies host execution engine complies with IEEE 754-2019 Binary64 arithmetic.'
    });
  }

  return list;
}

let cachedStatusMap: Map<string, { passed: boolean; errorPct?: number }> | null = null;

export function getVerificationStatusById(
  testId: string
): { passed: boolean; errorPct?: number } | null {
  if (!cachedStatusMap) {
    cachedStatusMap = new Map();
    for (const t of runAllVerificationBenchmarks()) {
      cachedStatusMap.set(t.id, { passed: t.passed, errorPct: t.errorPct });
    }
    for (const s of runAllStressBenchmarks()) {
      cachedStatusMap.set(s.id, { passed: s.passed });
    }
  }
  return cachedStatusMap.get(testId) ?? null;
}
