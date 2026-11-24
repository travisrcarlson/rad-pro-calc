/**
 * Canonical Domain Physics & Radiological Metrology Kernels
 *
 * Pure, deterministic TypeScript solvers shared across interactive UI modules (M01–M35)
 * and the automated V&V suite (`vvBenchmarkSuite.ts`, `npm test`, and Module 34 UI).
 *
 * Zero constant tautologies: every solver evaluates physical governing equations from
 * primary inputs and validated nuclear/atomic constants.
 */

import { getCanonicalNuclide } from './canonicalNuclidePhysics.ts';

const AVOGADRO = 6.02214076e23;
const SPEED_OF_LIGHT_MPS = 299792458.0;
const HC_EV_NM = 1239.84193;
const CLASSICAL_ELECTRON_RADIUS_SQ_BARNS = 0.079407877; // r_0^2 = (2.8179403262e-13 cm)^2 in barns

/**
 * Acklam rational approximation to the inverse standard normal CDF Φ⁻¹(p) for p ∈ (0, 1).
 * Relative error < 1.15e-9 across the entire probability domain.
 */
export function inverseStandardNormalCDF(p: number): number {
  const prob = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1.0 - pLow;

  if (prob < pLow) {
    const q = Math.sqrt(-2.0 * Math.log(prob));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)
    );
  }
  if (prob <= pHigh) {
    const q = prob - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0)
    );
  }
  const q = Math.sqrt(-2.0 * Math.log(1.0 - prob));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)
  );
}

/**
 * Standard normal cumulative distribution function Φ(z) via Abramowitz & Stegun 7.1.26.
 */
export function standardNormalCDF(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erfApprox =
    1.0 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t) *
      Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erfApprox);
}

/**
 * Evaluates unshielded point-source ambient dose equivalent rate H*(10) [µSv/h]
 * with a near-field singularity clamp r >= rMin (default 0.01 m = 1 cm).
 */
export function computePointSourceAmbientDoseRateUSvHr(
  symbol: string,
  activityGBq: number,
  distanceM: number,
  rMinM = 0.01
): number {
  const spec = getCanonicalNuclide(symbol);
  if (!spec || activityGBq <= 0 || spec.gammaH10_uSv_m2_h_GBq <= 0) return 0;
  const rEff = Math.max(rMinM, distanceM);
  return (spec.gammaH10_uSv_m2_h_GBq * activityGBq) / (rEff * rEff);
}

/**
 * Evaluates ICRP-119 committed effective dose E(50) [mSv] for ingestion, class-specific
 * inhalation (F/M/S), or direct systemic wound/IV injection (f1 = 1.0).
 */
export function computeCommittedEffectiveDoseMSv(
  symbol: string,
  intakeBq: number,
  pathway: 'ingestion' | 'inhalation' | 'injection',
  absorptionType: 'F' | 'M' | 'S' = 'M'
): number {
  const spec = getCanonicalNuclide(symbol);
  if (!spec || intakeBq <= 0) return 0;
  let coeffSvPerBq = spec.e50Ingest_Sv_Bq;
  if (pathway === 'inhalation') {
    coeffSvPerBq = spec.e50InhalByClass_Sv_Bq[absorptionType];
  } else if (pathway === 'injection') {
    coeffSvPerBq = spec.e50Injection_Sv_Bq;
  }
  return intakeBq * coeffSvPerBq * 1000.0;
}

/**
 * IAEA SSR-6 (Rev. 1) Para. 523, 526 & 529 Transport Index (TI) & Package Labeling Category.
 * Enforces SSR-6 Para. 526.2: TI values <= 0.05 may be quoted as zero (enabling I-WHITE).
 */
export function classifySSR6TransportPackage(
  surfaceDoseRateMSvHr: number,
  oneMeterDoseRateUSvHr: number,
  exclusiveUse = false
): {
  rawTI: number;
  roundedTI: number;
  category: 'I-WHITE' | 'II-YELLOW' | 'III-YELLOW' | 'III-YELLOW (EXCLUSIVE USE)' | 'OVER LIMIT';
} {
  const surf = Math.max(0, surfaceDoseRateMSvHr);
  const d1m = Math.max(0, oneMeterDoseRateUSvHr);
  const rawTI = d1m / 10.0;
  const roundedTI = rawTI <= 0.05 ? 0.0 : Math.ceil((rawTI - 1e-9) * 10.0) / 10.0;

  if (surf <= 0.005 && roundedTI === 0) {
    return { rawTI, roundedTI, category: 'I-WHITE' };
  }
  if (surf <= 0.5 && roundedTI <= 1.0) {
    return { rawTI, roundedTI, category: 'II-YELLOW' };
  }
  if (surf <= 2.0 && roundedTI <= 10.0) {
    return { rawTI, roundedTI, category: 'III-YELLOW' };
  }
  if (exclusiveUse && surf <= 10.0) {
    return { rawTI, roundedTI, category: 'III-YELLOW (EXCLUSIVE USE)' };
  }
  return { rawTI, roundedTI, category: 'OVER LIMIT' };
}

/**
 * IAEA SSR-6 (2018) Para. 405 Harmonic Radionuclide Mixture Rule for Effective A1 / A2 [TBq].
 */
export function computeSSR6MixtureEffectiveLimitTBq(
  components: { activityFraction: number; limitTBq: number }[]
): number {
  let denom = 0;
  let totalFrac = 0;
  for (const c of components) {
    if (c.activityFraction > 0) {
      totalFrac += c.activityFraction;
      if (c.limitTBq > 0) {
        denom += c.activityFraction / c.limitTBq;
      }
    }
  }
  if (denom <= 0 || totalFrac <= 0) return 0;
  return totalFrac / denom;
}

/**
 * Bateman (1910) Two-Member Serial Decay Transient Equilibrium Inflection Time t_max
 * and Parent Atomic Share f_1(t_max) assuming zero initial daughter.
 */
export function computeBatemanTransientPeak(
  parentHalfLifeHours: number,
  daughterHalfLifeHours: number
): {
  tMaxHours: number;
  parentAtomSharePct: number;
} {
  const l1 = Math.LN2 / parentHalfLifeHours;
  const l2 = Math.LN2 / daughterHalfLifeHours;
  if (Math.abs(l2 - l1) < 1e-15) {
    const tEq = 1.0 / l1;
    return { tMaxHours: tEq, parentAtomSharePct: Math.exp(-1.0) * 100.0 };
  }
  const tMaxHours = Math.log(l2 / l1) / (l2 - l1);
  const parentAtomSharePct = Math.exp(-l1 * tMaxHours) * 100.0;
  return { tMaxHours, parentAtomSharePct };
}

/**
 * Radiochemical Generator Daughter Regrowth Activity A_2(Δt) [MBq] after 100% column strip.
 */
export function computeGeneratorDaughterRegrowthMBq(
  initialParentMBq: number,
  parentHalfLifeHours: number,
  daughterHalfLifeHours: number,
  branchingFraction: number,
  elapsedHours: number
): number {
  if (elapsedHours <= 0 || initialParentMBq <= 0) return 0;
  const l1 = Math.LN2 / parentHalfLifeHours;
  const l2 = Math.LN2 / daughterHalfLifeHours;
  return (
    branchingFraction *
    initialParentMBq *
    (l2 / (l2 - l1)) *
    (Math.exp(-l1 * elapsedHours) - Math.exp(-l2 * elapsedHours))
  );
}

/**
 * Pulsed / Flash X-Ray Instantaneous Peak Dose Rate [kSv/h] during pulse FWHM.
 */
export function computePulsedXRayInstantaneousRateKSvHr(
  dosePerPulseUSv: number,
  pulseWidthNs: number
): number {
  if (dosePerPulseUSv <= 0 || pulseWidthNs <= 0) return 0;
  const svPerSec = (dosePerPulseUSv * 1e-6) / (pulseWidthNs * 1e-9);
  return (svPerSec * 3600.0) / 1000.0;
}

/**
 * Turner (1964) / EPA-454/R-99-005 Pasquill-Gifford Atmospheric Stability Classification.
 */
export function classifyTurnerPasquillStability(
  windSpeed10mMps: number,
  solarIrradianceWm2: number,
  cloudCoverOctas = 2,
  isNight = false
): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
  const u = Math.max(0, windSpeed10mMps);
  if (isNight || solarIrradianceWm2 <= 10) {
    const overcast = cloudCoverOctas >= 4;
    if (u < 2.0) return overcast ? 'E' : 'F';
    if (u < 3.0) return overcast ? 'E' : 'F';
    if (u < 5.0) return overcast ? 'D' : 'E';
    return 'D';
  }

  // Daytime solar insolation bands: Strong (>= 600 W/m²), Moderate (300-599), Slight (< 300)
  const insolation: 'strong' | 'moderate' | 'slight' =
    solarIrradianceWm2 >= 600 ? 'strong' : solarIrradianceWm2 >= 300 ? 'moderate' : 'slight';

  if (u < 2.0) {
    return insolation === 'strong' ? 'A' : insolation === 'moderate' ? 'A' : 'B';
  }
  if (u < 3.0) {
    return insolation === 'strong' ? 'A' : insolation === 'moderate' ? 'B' : 'C';
  }
  if (u < 5.0) {
    return insolation === 'strong' ? 'B' : insolation === 'moderate' ? 'B' : 'C';
  }
  if (u < 6.0) {
    return insolation === 'strong' ? 'C' : insolation === 'moderate' ? 'C' : 'D';
  }
  return insolation === 'strong' ? 'C' : 'D';
}

/**
 * Briggs (1973) / EPA AERMOD Open-Country (Rural) Dispersion Coefficients σ_y(x), σ_z(x) [m].
 * Strictly enforces causal advection boundary: returns 0 for x <= 0.
 */
export function computeBriggsRuralDispersionMeters(
  downwindXMeters: number,
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
): { sigmaYM: number; sigmaZM: number } {
  if (downwindXMeters <= 0) return { sigmaYM: 0, sigmaZM: 0 };
  const x = downwindXMeters;
  const invSqrtY = Math.pow(1.0 + 0.0001 * x, -0.5);

  switch (stabilityClass) {
    case 'A':
      return { sigmaYM: 0.22 * x * invSqrtY, sigmaZM: 0.20 * x };
    case 'B':
      return { sigmaYM: 0.16 * x * invSqrtY, sigmaZM: 0.12 * x };
    case 'C':
      return {
        sigmaYM: 0.11 * x * invSqrtY,
        sigmaZM: 0.08 * x * Math.pow(1.0 + 0.0002 * x, -0.5)
      };
    case 'D':
      return {
        sigmaYM: 0.08 * x * invSqrtY,
        sigmaZM: 0.06 * x * Math.pow(1.0 + 0.0015 * x, -0.5)
      };
    case 'E':
      return {
        sigmaYM: 0.06 * x * invSqrtY,
        sigmaZM: (0.03 * x) / (1.0 + 0.0003 * x)
      };
    case 'F':
      return {
        sigmaYM: 0.04 * x * invSqrtY,
        sigmaZM: (0.016 * x) / (1.0 + 0.0003 * x)
      };
  }
}

/**
 * Gaussian Plume Ground-Level Concentration C(x, y, z=0) [Bq/m³] with causal upwind zeroing (x <= 0).
 */
export function computeGaussianPlumeGroundConcBqM3(
  releaseRateBqS: number,
  windSpeedMps: number,
  releaseHeightM: number,
  downwindXM: number,
  crosswindYM: number,
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
): number {
  if (downwindXM <= 0 || releaseRateBqS <= 0) return 0.0;
  const u = Math.max(0.2, windSpeedMps);
  const { sigmaYM, sigmaZM } = computeBriggsRuralDispersionMeters(downwindXM, stabilityClass);
  if (sigmaYM <= 0 || sigmaZM <= 0) return 0.0;
  const lateral = Math.exp(-(crosswindYM * crosswindYM) / (2.0 * sigmaYM * sigmaYM));
  const vertical = Math.exp(-(releaseHeightM * releaseHeightM) / (2.0 * sigmaZM * sigmaZM));
  return (releaseRateBqS / (Math.PI * u * sigmaYM * sigmaZM)) * lateral * vertical;
}

/**
 * Chamberlain (1953) / Slade (1968) Wet + Dry Plume Source Depletion Survival Percentage Q(x)/Q_0 [%].
 */
/**
 * 8-point Gauss-Legendre nodes and weights on [-1, 1] for Chamberlain dry-deposition integral.
 */
const GL8_NODES = [
  -0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498,
  0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363
];
const GL8_WEIGHTS = [
  0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.362683783378362,
  0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763
];

export function computePlumeDepletionSurvivalPct(
  downwindXM: number,
  windSpeedMps: number,
  wetWashoutCoeffS1: number,
  dryDepositionVelocityMps: number,
  meanSigmaZM: number,
  stabilityClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
  releaseHeightM = 0
): number {
  if (downwindXM <= 0) return 100.0;
  const u = Math.max(0.1, windSpeedMps);
  const transitSec = downwindXM / u;
  const wetExponent = Math.max(0, wetWashoutCoeffS1) * transitSec;
  const vd = Math.max(0, dryDepositionVelocityMps);

  let dryExponent = 0;
  if (vd > 0) {
    if (stabilityClass || releaseHeightM > 0) {
      const cls = stabilityClass ?? 'D';
      const xStart = Math.min(downwindXM, 1.0);
      const halfSpan = 0.5 * (downwindXM - xStart);
      const mid = 0.5 * (downwindXM + xStart);
      const he = Math.max(0, releaseHeightM);
      let integral = 0;
      if (halfSpan > 0) {
        for (let i = 0; i < 8; i++) {
          const x = mid + halfSpan * GL8_NODES[i];
          const sz = Math.max(0.1, computeBriggsRuralDispersionMeters(x, cls).sigmaZM);
          const groundExp = he > 0 ? Math.exp(-(he * he) / (2.0 * sz * sz)) : 1.0;
          integral += GL8_WEIGHTS[i] * (groundExp / sz);
        }
        integral *= halfSpan;
      }
      dryExponent = Math.sqrt(2.0 / Math.PI) * (vd / u) * integral;
    } else if (meanSigmaZM > 0) {
      const lambdaDry = vd / (meanSigmaZM * Math.sqrt(Math.PI / 2.0));
      dryExponent = lambdaDry * transitSec;
    }
  }

  return 100.0 * Math.exp(-(wetExponent + dryExponent));
}

/**
 * Turner (1994) Planetary Boundary Layer (PBL) Capping Inversion Symmetric Method-of-Images Multiplier.
 */
export function computePBLInversionReflectionMultiplier(
  mixingHeightM: number,
  sigmaZM: number,
  harmonics = 3,
  releaseHeightM = 0
): number {
  if (mixingHeightM <= 0 || sigmaZM <= 0) return 1.0;
  if (releaseHeightM <= 0) {
    let mult = 1.0;
    for (let m = 1; m <= harmonics; m++) {
      const zImg = 2.0 * m * mixingHeightM;
      mult += 2.0 * Math.exp(-(zImg * zImg) / (2.0 * sigmaZM * sigmaZM));
    }
    return mult;
  }

  const h = Math.min(releaseHeightM, mixingHeightM);
  const twoSig2 = 2.0 * sigmaZM * sigmaZM;
  const directTerm = Math.exp(-(h * h) / twoSig2);
  if (directTerm <= 1e-300) return 1.0;

  let reflectedSum = 0;
  for (let m = 1; m <= harmonics; m++) {
    const dMinus = 2.0 * m * mixingHeightM - h;
    const dPlus = 2.0 * m * mixingHeightM + h;
    reflectedSum += Math.exp(-(dMinus * dMinus) / twoSig2) + Math.exp(-(dPlus * dPlus) / twoSig2);
  }
  return 1.0 + reflectedSum / directTerm;
}

/**
 * ANSI Z136.1-2014 Nominal Ocular Hazard Distance (NOHD) [m] for CW/average laser beam.
 * Supports uniform top-hat (4P, default) or Gaussian 1/e² beam irradiance profile (8P).
 */
export function computeLaserNOHDMeters(
  powerWatts: number,
  mpeWattsPerM2: number,
  apertureDiameterM: number,
  divergenceRad: number,
  isGaussian1e2 = false
): number {
  if (powerWatts <= 0 || mpeWattsPerM2 <= 0 || divergenceRad <= 0) return 0;
  const profileFactor = isGaussian1e2 ? 8.0 : 4.0;
  const hazardDiam = Math.sqrt((profileFactor * powerWatts) / (Math.PI * mpeWattsPerM2));
  return Math.max(0, (hazardDiam - apertureDiameterM) / divergenceRad);
}

/**
 * Duane & Hunt (1915) Bremsstrahlung Minimum Wavelength Cutoff λ_min [nm].
 * Returns null for non-positive accelerating voltage (V <= 0 boundary safeguard).
 */
export function computeDuaneHuntMinWavelengthNm(tubePotentialKV: number): number | null {
  if (!Number.isFinite(tubePotentialKV) || tubePotentialKV <= 0) return null;
  return HC_EV_NM / (tubePotentialKV * 1000.0);
}

/**
 * FCC OET Bulletin 65 & IEEE C95.1 Fraunhofer Far-Field Distance R_ff = 2·D²/λ [m].
 */
export function computeFraunhoferFarFieldMeters(
  apertureDiameterM: number,
  frequencyHz: number
): number {
  if (apertureDiameterM <= 0 || frequencyHz <= 0) return 0;
  const wavelengthM = SPEED_OF_LIGHT_MPS / frequencyHz;
  return (2.0 * apertureDiameterM * apertureDiameterM) / wavelengthM;
}

/**
 * Two-Group Heterogeneous Reactor Lattice Infinite Multiplication Factor k_∞
 * (Lamarsh & Baratta Nuclear Reactor Theory / IAEA-TECDOC-808):
 *   k_∞ = (νΣ_f1 · Σ_a2 + νΣ_f2 · Σ_s,1→2) / [(Σ_a1 + Σ_s,1→2) · Σ_a2]
 */
export function computeTwoGroupInfiniteMultiplication(params: {
  nuSigmaF1: number;
  nuSigmaF2: number;
  sigmaA1: number;
  sigmaA2: number;
  sigmaS12: number;
}): number {
  const { nuSigmaF1, nuSigmaF2, sigmaA1, sigmaA2, sigmaS12 } = params;
  const removal1 = sigmaA1 + sigmaS12;
  if (removal1 <= 0 || sigmaA2 <= 0) return 0;
  return (nuSigmaF1 * sigmaA2 + nuSigmaF2 * sigmaS12) / (removal1 * sigmaA2);
}

/**
 * Keepin (1965) 6-Group Delayed Neutron Inhour Equation Reactivity ρ [cents] for U-235 thermal fission.
 */
export function computeKeepinInhourReactivityCents(
  asymptoticPeriodSec: number,
  betaEff = 0.0065,
  promptLifetimeSec = 5.0e-5
): number {
  if (asymptoticPeriodSec === 0 || betaEff <= 0) return 0;
  const omega = 1.0 / asymptoticPeriodSec;
  const groups = [
    { a: 0.033, l: 0.0124 },
    { a: 0.219, l: 0.0305 },
    { a: 0.196, l: 0.111 },
    { a: 0.395, l: 0.301 },
    { a: 0.115, l: 1.14 },
    { a: 0.042, l: 3.01 }
  ];
  let sumDelayed = 0;
  for (const g of groups) {
    sumDelayed += (g.a * omega) / (omega + g.l);
  }
  const rhoDollars = (promptLifetimeSec * omega) / betaEff + sumDelayed;
  return rhoDollars * 100.0;
}

/**
 * Post-SCRAM I-135 → Xe-135 Xenon Pit Peak Time t_max [hours] from equilibrium thermal flux Φ_0.
 */
export function computePostScramXenonPeakHours(preScramThermalFluxNcm2s: number): number {
  if (preScramThermalFluxNcm2s <= 0) return 0;
  const lI_hr = Math.LN2 / 6.57;
  const lX_hr = Math.LN2 / 9.14;
  const gammaI = 0.0639;
  const gammaX = 0.00237;
  const sigmaX_cm2 = 2.65e-18;
  const x0OverI0 =
    ((gammaI + gammaX) * (lI_hr / 3600.0)) /
    (gammaI * (lX_hr / 3600.0 + sigmaX_cm2 * preScramThermalFluxNcm2s));
  const arg = (lX_hr / lI_hr) * (1.0 - ((lX_hr - lI_hr) / lI_hr) * x0OverI0);
  if (arg <= 0.0 || Math.abs(lX_hr - lI_hr) < 1e-12) return 0;
  return Math.max(0, Math.log(arg) / (lX_hr - lI_hr));
}

/**
 * Nordheim-Fuchs / Hansen-Maier Prompt-Critical Burst FWHM Pulse Duration [µs].
 */
export function computeGodivaPromptBurstFwhmUs(
  promptSupercriticalDollars: number,
  betaEff = 0.0065,
  promptGenTimeSec = 1.2e-8
): number {
  if (promptSupercriticalDollars <= 0 || betaEff <= 0 || promptGenTimeSec <= 0) return 0;
  const deltaKp = promptSupercriticalDollars * betaEff;
  const alphaRossi = deltaKp / promptGenTimeSec;
  return (3.52 / alphaRossi) * 1e6;
}

/**
 * ANSI/ANS-8.3-1997 (R2020) CAAS Minimum Accident of Concern Maximum Unshielded Detection Radius [m].
 */
export function computeCAASMaxDetectionRadiusM(
  refDoseRateRadMin: number,
  refDistanceM: number,
  tripSetpointRadHr: number
): number {
  if (refDoseRateRadMin <= 0 || refDistanceM <= 0 || tripSetpointRadHr <= 0) return 0;
  const refDoseRateRadHr = refDoseRateRadMin * 60.0;
  return refDistanceM * Math.sqrt(refDoseRateRadHr / tripSetpointRadHr);
}

/**
 * IEEE Std 325 Gamma Spectrometer Relative FWHM Resolution R [%] & Gaussian σ [keV].
 */
export function computeSpectrometerResolution(
  fwhmKeV: number,
  centroidKeV: number
): { resolutionPct: number; sigmaKeV: number } {
  if (fwhmKeV <= 0 || centroidKeV <= 0) return { resolutionPct: 0, sigmaKeV: 0 };
  return {
    resolutionPct: (fwhmKeV / centroidKeV) * 100.0,
    sigmaKeV: fwhmKeV / (2.0 * Math.sqrt(2.0 * Math.LN2))
  };
}

/**
 * Mariscotti (1967) Generalized Second-Difference Photopeak Significance Z [σ].
 */
export function computeMariscottiPeakSignificanceSigma(
  peakAmplitudeCounts: number,
  continuumCountsPerChannel: number
): number {
  const nCenter = continuumCountsPerChannel + peakAmplitudeCounts;
  const nSide = continuumCountsPerChannel + peakAmplitudeCounts * Math.exp(-0.5);
  const negSecondDiff = 2.0 * nCenter - 2.0 * nSide;
  const sigmaSecondDiff = Math.sqrt(Math.max(1e-12, 2.0 * nSide + 4.0 * nCenter));
  return negSecondDiff / sigmaSecondDiff;
}

/**
 * NUREG-1575 (MARSSIM) Eq. 5-2 Nonparametric Sign Test Sample Size N
 * evaluated directly from Type I/II error rates (α, β) and Relative Shift Δ/σ.
 */
export function computeMARSSIMSignSampleSize(
  alpha: number,
  beta: number,
  deltaOverSigma: number,
  contingencyFactor = 1.20
): number {
  const zAlpha = inverseStandardNormalCDF(1.0 - alpha);
  const zBeta = inverseStandardNormalCDF(1.0 - beta);
  const signP = standardNormalCDF(deltaOverSigma);
  const denom = 4.0 * Math.pow(signP - 0.5, 2);
  if (denom <= 1e-12) return 9999;
  const rawN = (Math.pow(zAlpha + zBeta, 2) / denom) * contingencyFactor;
  return Math.ceil(rawN);
}

/**
 * AAPM TG-43U1 Reference Dose Rate Ḋ(r_0=1cm, θ_0=90°) [mGy/h] from S_K [U] and Λ [cGy/(h·U)].
 */
export function computeTG43ReferenceDoseRateMGyHr(
  airKermaStrengthU: number,
  doseRateConstantCGyHrU: number
): number {
  return Math.max(0, airKermaStrengthU) * Math.max(0, doseRateConstantCGyHrU) * 10.0;
}

/**
 * AAPM Task Group 108 (2006) PET Patient Uptake Decay Integral Reduction Factor R_U.
 */
export function computeTG108UptakeDecayFactor(
  halfLifeMinutes: number,
  uptakeTimeMinutes: number
): number {
  if (uptakeTimeMinutes <= 0 || halfLifeMinutes <= 0) return 1.0;
  const meanLifeRatio = (1.0 / Math.LN2) * (halfLifeMinutes / uptakeTimeMinutes);
  return meanLifeRatio * (1.0 - Math.exp((-Math.LN2 * uptakeTimeMinutes) / halfLifeMinutes));
}

/**
 * AAPM Task Group 108 / NCRP-147 Archer Broad-Beam Transmission Model B(x).
 */
export function computeArcherBroadBeamTransmission(
  thicknessCm: number,
  alphaCm1: number,
  betaCm1: number,
  gamma: number
): number {
  if (thicknessCm <= 0) return 1.0;
  const base =
    (1.0 + betaCm1 / alphaCm1) * Math.exp(alphaCm1 * gamma * thicknessCm) - betaCm1 / alphaCm1;
  return Math.pow(Math.max(1e-12, base), -1.0 / gamma);
}

/**
 * NCRP Report No. 151 / Cossairt Two-Component Accelerator Labyrinth Door Dose Rate [µSv/h].
 */
export function computeCossairtMazeDoorDoseRateUSvHr(
  h0At1mSvHr: number,
  leg1Meters: number,
  leg2Meters: number,
  crossSectionAreaM2: number
): number {
  if (h0At1mSvHr <= 0 || leg1Meters <= 0 || crossSectionAreaM2 <= 0) return 0;
  const sqrtA = Math.sqrt(crossSectionAreaM2);
  const mouthSvHr = h0At1mSvHr / (leg1Meters * leg1Meters);
  const solidAngleFactor = crossSectionAreaM2 / (leg1Meters * leg1Meters);
  const leg2Attenuation =
    0.20 * Math.exp(-leg2Meters / (1.95 * sqrtA)) +
    0.80 * Math.exp(-leg2Meters / (5.4 * sqrtA));
  return mouthSvHr * solidAngleFactor * leg2Attenuation * 1e6;
}

/**
 * Inverse-Square Controlled Area Barricade Boundary Distance [m].
 */
export function computeControlledBoundaryDistanceM(
  gammaConstUSvM2PerGBqHr: number,
  activityGBq: number,
  boundaryDoseLimitUSvHr: number
): number {
  if (gammaConstUSvM2PerGBqHr <= 0 || activityGBq <= 0 || boundaryDoseLimitUSvHr <= 0) return 0;
  return Math.sqrt((gammaConstUSvM2PerGBqHr * activityGBq) / boundaryDoseLimitUSvHr);
}

/**
 * EPA Federal Guidance Report No. 12 Semi-Infinite Cloud Submersion Dose Rate [µSv/h].
 */
export function computeCloudSubmersionDoseRateUSvHr(
  airConcentrationBqM3: number,
  dcfSvPerSecPerBqM3: number
): number {
  return Math.max(0, airConcentrationBqM3) * Math.max(0, dcfSvPerSecPerBqM3) * 3600.0 * 1e6;
}

/**
 * Wiedemann / Jackson Synchrotron Bending-Magnet Critical Photon Energy E_c [keV]:
 *   E_c = (3 / 2) · ħc · γ³ / ρ = 0.665025 · E²[GeV] · B[T]
 */
export function computeSynchrotronCriticalEnergyKeV(
  electronEnergyGeV: number,
  magneticFieldTesla: number
): number {
  if (electronEnergyGeV <= 0 || magneticFieldTesla <= 0) return 0;
  return 0.665 * electronEnergyGeV * electronEnergyGeV * magneticFieldTesla;
}

/**
 * Special Relativity Lorentz Factor γ = 1 / √(1 - β²) with sub-luminal singularity guard.
 */
export function computeRelativisticLorentzGamma(betaRatio: number): number {
  const clampedBeta = Math.min(Math.abs(betaRatio), 0.999999999999);
  return 1.0 / Math.sqrt(1.0 - clampedBeta * clampedBeta);
}

/**
 * In-Core Thermal Neutron Activation Saturation Activity R_sat = N_target · σ_act · Φ [Bq].
 */
export function computeNeutronActivationSaturationBq(
  targetMassGrams: number,
  molarMassGPerMol: number,
  crossSectionBarns: number,
  thermalFluxNcm2s: number,
  isotopicAbundance = 1.0,
  sigmaBurnBarns = 0,
  productDecayLambdaS1 = 0
): number {
  if (
    targetMassGrams <= 0 ||
    molarMassGPerMol <= 0 ||
    crossSectionBarns <= 0 ||
    thermalFluxNcm2s <= 0
  ) {
    return 0;
  }
  const nTargetAtoms = (targetMassGrams / molarMassGPerMol) * AVOGADRO * isotopicAbundance;
  const sigmaCm2 = crossSectionBarns * 1e-24;
  const productionSatBq = nTargetAtoms * sigmaCm2 * thermalFluxNcm2s;
  if (sigmaBurnBarns > 0 && productDecayLambdaS1 > 0) {
    const sigmaBurnCm2 = sigmaBurnBarns * 1e-24;
    const burnFactor = productDecayLambdaS1 / (productDecayLambdaS1 + sigmaBurnCm2 * thermalFluxNcm2s);
    return productionSatBq * burnFactor;
  }
  return productionSatBq;
}

/**
 * EPA PAG Manual (2017) Early-Phase Evacuation Threshold Ratio (TEDE_proj / PAG_evac).
 */
export function computeEPAPagEvacuationRatio(
  projectedTedeMSv: number,
  pagEvacThresholdMSv = 10.0
): number {
  if (pagEvacThresholdMSv <= 0) return 0;
  return Math.max(0, projectedTedeMSv) / pagEvacThresholdMSv;
}

/**
 * ICRP Biokinetic Effective Half-Life T_eff = (T_phys · T_bio) / (T_phys + T_bio) [days].
 */
export function computeEffectiveHalfLifeDays(
  physicalHalfLifeDays: number,
  biologicalHalfLifeDays: number
): number {
  if (physicalHalfLifeDays <= 0 || biologicalHalfLifeDays <= 0) return 0;
  return (
    (physicalHalfLifeDays * biologicalHalfLifeDays) /
    (physicalHalfLifeDays + biologicalHalfLifeDays)
  );
}

/**
 * FAA CARI-7 / ICRP Publication 132 Galactic Cosmic Radiation Ambient Dose Equivalent Rate [µSv/h]
 * as a function of barometric pressure altitude (ICAO ISA), geomagnetic cutoff rigidity R_c [GV],
 * and solar modulation heliocentric potential Φ [MV].
 */
export function computeGalacticCosmicDoseRateUSvHr(
  altitudeFeet: number,
  cutoffRigidityGV = 0.5,
  heliocentricPotentialMV = 420.0
): number {
  const hMeters = Math.max(-500, altitudeFeet * 0.3048);
  // ICAO Standard Atmosphere pressure ratio p(h)/p0 -> mass overburden X [g/cm²]
  let pressureRatio: number;
  if (hMeters <= 11000.0) {
    pressureRatio = Math.pow(Math.max(0.01, 1.0 - 2.25577e-5 * hMeters), 5.25588);
  } else {
    const p11km = Math.pow(1.0 - 2.25577e-5 * 11000.0, 5.25588); // 0.223361
    pressureRatio = p11km * Math.exp(-(hMeters - 11000.0) / 6341.62);
  }
  const depthGcm2 = 1033.227 * pressureRatio; // ~200.58 g/cm² at FL390 (11,887.2 m)

  // Pfotzer secondary neutron + EM cascade (peaks near ~55 g/cm², attenuates with Λ ≈ 124 g/cm²)
  const xRef = 200.578;
  const cascadeTerm =
    5.3774 *
    ((depthGcm2 + 35.0) / (xRef + 35.0)) *
    Math.exp(-(depthGcm2 - xRef) / 124.0);
  // Penetrating relativistic muon baseline (~0.032 µSv/h at sea level)
  const muonTerm = 0.032 * Math.exp(-(depthGcm2 - 1033.227) / 620.0);

  // Geomagnetic latitude / cutoff rigidity factor (polar R_c -> 0 vs equatorial R_c ~ 15 GV)
  const rc = Math.max(0, cutoffRigidityGV);
  const geomagFactor = 0.38 + 0.62 * Math.exp(-0.148 * Math.pow(rc, 1.15));
  const geomagRef = 0.38 + 0.62 * Math.exp(-0.148 * Math.pow(0.5, 1.15));

  // Solar cycle modulation (solar min ~420 MV -> 1.0; solar max ~1100 MV -> ~0.62)
  const phi = Math.max(250.0, heliocentricPotentialMV);
  const solarFactor = Math.pow(420.0 / phi, 0.52);

  return (cascadeTerm * (geomagFactor / geomagRef) * solarFactor) + muonTerm * (0.75 + 0.25 * (geomagFactor / geomagRef));
}

/**
 * Katz & Penfold (1952) / ICRU-37 Continuous-Slowing-Down Beta Maximum Range [mm].
 * Uses empirical Katz-Penfold relation for 0.01 <= E_max <= 2.5 MeV and Feather/Katz linear above 2.5 MeV.
 */
export function computeKatzPenfoldBetaRangeMm(
  eMaxMeV: number,
  mediumDensityGcm3 = 1.0
): number {
  if (eMaxMeV <= 0 || mediumDensityGcm3 <= 0) return 0;
  const rangeGcm2 =
    eMaxMeV <= 2.5
      ? 0.412 * Math.pow(eMaxMeV, 1.265 - 0.0954 * Math.log(eMaxMeV))
      : 0.530 * eMaxMeV - 0.106;
  return (rangeGcm2 / mediumDensityGcm3) * 10.0;
}

/**
 * Exact Klein & Nishina (1929) Total Incoherent Compton Cross-Section per Free Electron [barns/e⁻].
 */
export function computeKleinNishinaCrossSectionBarns(photonEnergyMeV: number): number {
  if (photonEnergyMeV <= 0) return 0;
  const alpha = photonEnergyMeV / 0.51099895;
  const onePlus2a = 1.0 + 2.0 * alpha;
  const logTerm = Math.log(onePlus2a);
  const term1 = ((1.0 + alpha) / (alpha * alpha)) * ((2.0 * (1.0 + alpha)) / onePlus2a - logTerm / alpha);
  const term2 = logTerm / (2.0 * alpha);
  const term3 = (1.0 + 3.0 * alpha) / (onePlus2a * onePlus2a);
  return 2.0 * Math.PI * CLASSICAL_ELECTRON_RADIUS_SQ_BARNS * (term1 + term2 - term3);
}

/**
 * Currie (1968) Analytical Chemistry Qualitative Decision Level L_C & Detection Limit L_D [net counts].
 */
export function computeCurrieDetectionLimits(
  backgroundCounts: number,
  pairedBlank = false
): { lcCounts: number; ldCounts: number } {
  const b = Math.max(0, backgroundCounts);
  const sigma0Factor = pairedBlank ? Math.SQRT2 : 1.0; // paired blank = 2.33 * sqrt(B), well-known = 1.645 * sqrt(B)
  const kAlpha = 1.6448536 * sigma0Factor;
  const lcCounts = kAlpha * Math.sqrt(b);
  const ldCounts = 2.71 + 2.0 * lcCounts;
  return { lcCounts, ldCounts };
}

/**
 * Bushong / ASME BPVC Sec. V Radiographic Geometric Magnification M & Penumbra Unsharpness U_g [mm].
 */
export function computeRadiographicGeometry(
  sidCm: number,
  oidCm: number,
  focalSpotMm: number
): { magnification: number; unsharpnessUgMm: number } {
  const sodCm = Math.max(0.1, sidCm - oidCm);
  const magnification = sidCm / sodCm;
  const unsharpnessUgMm = Math.max(0, focalSpotMm) * (Math.max(0, oidCm) / sodCm);
  return { magnification, unsharpnessUgMm };
}

/**
 * Way-Wigner t⁻¹·² Fallout Decay Integral Dose Inside Shelter [R or mSv].
 */
export function computeWayWignerShelterDose(
  rateAt1Hr: number,
  entryTimeHours: number,
  exitTimeHours: number,
  protectionFactor = 1.0
): number {
  const t1 = Math.max(0.01, entryTimeHours);
  const t2 = Math.max(t1, exitTimeHours);
  const pf = Math.max(1.0, protectionFactor);
  return ((5.0 * Math.max(0, rateAt1Hr)) / pf) * (Math.pow(t1, -0.2) - Math.pow(t2, -0.2));
}

/**
 * Glasstone & Dolan (1977) Nuclear Detonation Prompt Thermal Radiation Fluence Q(R) [cal/cm²].
 */
export function computeWeaponPromptThermalFluenceCalCm2(
  yieldKt: number,
  distanceM: number,
  thermalFraction = 0.35,
  atmosphericTransmittance = 0.85
): number {
  if (yieldKt <= 0 || distanceM <= 0) return 0;
  const yieldJoules = yieldKt * 4.184e12;
  const fluenceJoulesPerM2 =
    ((thermalFraction * yieldJoules) / (4.0 * Math.PI * distanceM * distanceM)) *
    atmosphericTransmittance;
  return fluenceJoulesPerM2 / 41840.0;
}

/**
 * ICRP Publication 78 / NCRP Report 166 Multi-Compartment Systemic Retention R(t) [kBq].
 * Supports optional radioactive physical decay factor 2^(-t / T_phys).
 */
export function computeMultiCompartmentRetentionKBq(
  intakeKBq: number,
  timeDays: number,
  compartments: { fraction: number; halfLifeDays: number }[],
  physicalHalfLifeDays?: number
): number {
  if (intakeKBq <= 0 || timeDays < 0) return 0;
  let bioSum = 0;
  for (const c of compartments) {
    if (c.fraction > 0 && c.halfLifeDays > 0) {
      bioSum += c.fraction * Math.pow(2.0, -(timeDays / c.halfLifeDays));
    }
  }
  const physFactor =
    physicalHalfLifeDays && physicalHalfLifeDays > 0 && Number.isFinite(physicalHalfLifeDays)
      ? Math.pow(2.0, -(timeDays / physicalHalfLifeDays))
      : 1.0;
  return intakeKBq * bioSum * physFactor;
}

const TG43_RADIAL_TABLES: Record<string, { r: number[]; g: number[]; muEffTail: number }> = {
  // Rivard et al., Med. Phys. 31(3), 2004 — I-125 Model 6711 OncoSeed
  'I-125': {
    r: [0.1, 0.15, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
    g: [1.055, 1.078, 1.082, 1.071, 1.042, 1.0, 0.908, 0.814, 0.632, 0.496, 0.364, 0.27, 0.199, 0.148, 0.109, 0.08],
    muEffTail: 0.305
  },
  // Rivard et al., Med. Phys. 31(3), 2004 — Pd-103 Model 200 TheraSeed
  'Pd-103': {
    r: [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0],
    g: [1.3, 1.24, 1.19, 1.11, 1.0, 0.764, 0.569, 0.303, 0.157, 0.0806, 0.0417, 0.0217, 0.0114, 0.0033],
    muEffTail: 0.62
  },
  // Rivard (2007) / AAPM consensus — Cs-131 Model CS-1
  'Cs-131': {
    r: [0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0],
    g: [1.011, 1.036, 1.047, 1.031, 1.0, 0.922, 0.834, 0.659, 0.501, 0.371, 0.268, 0.19, 0.132, 0.062],
    muEffTail: 0.375
  },
  // Daskalov et al. / AAPM HEBD — Ir-192 MicroSelectron v2
  'Ir-192': {
    r: [0.1, 0.25, 0.5, 0.75, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0],
    g: [0.996, 0.997, 0.998, 0.999, 1.0, 1.006, 1.007, 1.005, 0.999, 0.99, 0.978, 0.963, 0.926, 0.88],
    muEffTail: 0.026
  }
};

/**
 * AAPM TG-43U1 Radial Dose Function g_L(r) via log-linear consensus table interpolation (g_L(1 cm) = 1.0).
 */
export function evaluateTG43RadialDoseFunction(rCm: number, seedNuclide = 'I-125'): number {
  const key =
    seedNuclide.includes('103') || seedNuclide.toUpperCase().includes('PD')
      ? 'Pd-103'
      : seedNuclide.includes('131') || seedNuclide.toUpperCase().includes('CS')
        ? 'Cs-131'
        : seedNuclide.includes('192') || seedNuclide.toUpperCase().includes('IR')
          ? 'Ir-192'
          : 'I-125';
  const tbl = TG43_RADIAL_TABLES[key];
  const r = Math.max(0.05, rCm);
  const n = tbl.r.length;
  if (r <= tbl.r[0]) return tbl.g[0];
  if (r >= tbl.r[n - 1]) {
    return Math.max(1e-6, tbl.g[n - 1] * Math.exp(-tbl.muEffTail * (r - tbl.r[n - 1])));
  }
  for (let i = 0; i < n - 1; i++) {
    if (r >= tbl.r[i] && r <= tbl.r[i + 1]) {
      const f = (r - tbl.r[i]) / (tbl.r[i + 1] - tbl.r[i]);
      const lnG = Math.log(tbl.g[i]) + f * (Math.log(tbl.g[i + 1]) - Math.log(tbl.g[i]));
      return Math.exp(lnG);
    }
  }
  return 1.0;
}

/**
 * Nonlinear Inverse-Square Sensor Mesh Multilateration Solver (Gauss-Newton + Multi-Scale Grid Init).
 *
 * Solves D_net,i = S / [(x - x_i)² + (y - y_i)² + d_0²] for source position (x, y) and source strength
 * S = Γ · A [µSv·m²/h], converting S to estimated activity [GBq] using Γ (default Co-60 = 308.5).
 */
export function localizeSourceInverseSquare(
  sensors: { x: number; y: number; netDoseRateUSvHr: number }[],
  gammaConstUSvM2PerGBqHr = 308.5
): {
  estX: number;
  estY: number;
  estSourceStrengthUSvM2Hr: number;
  estActivityGBq: number;
  centroidX: number;
  centroidY: number;
  rmsLogError: number;
} {
  const active = sensors.filter((s) => Number.isFinite(s.netDoseRateUSvHr) && s.netDoseRateUSvHr > 1e-6);
  if (active.length === 0) {
    return {
      estX: 0,
      estY: 0,
      estSourceStrengthUSvM2Hr: 0,
      estActivityGBq: 0,
      centroidX: 0,
      centroidY: 0,
      rmsLogError: 0
    };
  }

  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of active) {
    sumW += s.netDoseRateUSvHr;
    sumWX += s.x * s.netDoseRateUSvHr;
    sumWY += s.y * s.netDoseRateUSvHr;
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }

  const centroidX = sumWX / sumW;
  const centroidY = sumWY / sumW;

  if (active.length < 3) {
    const rMeanSq =
      active.reduce((acc, s) => acc + (s.x - centroidX) ** 2 + (s.y - centroidY) ** 2 + 1.0, 0) /
      active.length;
    const S = (sumW / active.length) * rMeanSq;
    return {
      estX: centroidX,
      estY: centroidY,
      estSourceStrengthUSvM2Hr: S,
      estActivityGBq: gammaConstUSvM2PerGBqHr > 0 ? S / gammaConstUSvM2PerGBqHr : 0,
      centroidX,
      centroidY,
      rmsLogError: 0
    };
  }

  const d0Sq = 0.01; // 10 cm near-sensor singularity guard
  const logD = active.map((s) => Math.log(s.netDoseRateUSvHr));
  const n = active.length;

  const evalObjective = (x: number, y: number): { sse: number; meanLnS: number } => {
    let sumLnS = 0;
    const lnR2 = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const dx = x - active[i].x;
      const dy = y - active[i].y;
      const lr2 = Math.log(dx * dx + dy * dy + d0Sq);
      lnR2[i] = lr2;
      sumLnS += logD[i] + lr2;
    }
    const meanLnS = sumLnS / n;
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const res = logD[i] + lnR2[i] - meanLnS;
      sse += res * res;
    }
    return { sse, meanLnS };
  };

  // Coarse global search over bounding box + margin to prevent local-minimum trapping
  const padX = Math.max(200, (maxX - minX) * 0.35);
  const padY = Math.max(200, (maxY - minY) * 0.35);
  const gMinX = minX - padX;
  const gMaxX = maxX + padX;
  const gMinY = minY - padY;
  const gMaxY = maxY + padY;

  const refineLM = (initX: number, initY: number): { x: number; y: number; sse: number; meanLnS: number } => {
    let x = initX;
    let y = initY;
    let obj = evalObjective(x, y);
    let lambdaLM = 1e-3;

    for (let iter = 0; iter < 65; iter++) {
      const gxArr = new Array<number>(n);
      const gyArr = new Array<number>(n);
      const resArr = new Array<number>(n);
      let meanGx = 0;
      let meanGy = 0;

      for (let i = 0; i < n; i++) {
        const dx = x - active[i].x;
        const dy = y - active[i].y;
        const r2 = dx * dx + dy * dy + d0Sq;
        gxArr[i] = (2.0 * dx) / r2;
        gyArr[i] = (2.0 * dy) / r2;
        meanGx += gxArr[i];
        meanGy += gyArr[i];
        resArr[i] = logD[i] + Math.log(r2) - obj.meanLnS;
      }
      meanGx /= n;
      meanGy /= n;

      let j11 = 0;
      let j12 = 0;
      let j22 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < n; i++) {
        const jx = gxArr[i] - meanGx;
        const jy = gyArr[i] - meanGy;
        j11 += jx * jx;
        j12 += jx * jy;
        j22 += jy * jy;
        b1 -= jx * resArr[i];
        b2 -= jy * resArr[i];
      }

      const a11 = j11 + lambdaLM * (j11 + 1e-6);
      const a22 = j22 + lambdaLM * (j22 + 1e-6);
      const det = a11 * a22 - j12 * j12;
      if (Math.abs(det) < 1e-18) break;

      const stepX = (a22 * b1 - j12 * b2) / det;
      const stepY = (a11 * b2 - j12 * b1) / det;

      const trialX = x + stepX;
      const trialY = y + stepY;
      const trialObj = evalObjective(trialX, trialY);

      if (trialObj.sse < obj.sse) {
        x = trialX;
        y = trialY;
        obj = trialObj;
        lambdaLM = Math.max(1e-10, lambdaLM * 0.35);
        if (stepX * stepX + stepY * stepY < 1e-14) break;
      } else {
        lambdaLM = Math.min(1e6, lambdaLM * 4.0);
      }
    }
    return { x, y, sse: obj.sse, meanLnS: obj.meanLnS };
  };

  // Multi-start grid + interior seeds to defeat concyclic Kelvin-inversion secondary basins
  const gridSteps = 36;
  const gridCandidates: { x: number; y: number; sse: number }[] = [];
  for (let gx = 0; gx <= gridSteps; gx++) {
    const x = gMinX + ((gMaxX - gMinX) * gx) / gridSteps;
    for (let gy = 0; gy <= gridSteps; gy++) {
      const y = gMinY + ((gMaxY - gMinY) * gy) / gridSteps;
      const cand = evalObjective(x, y);
      gridCandidates.push({ x, y, sse: cand.sse });
    }
  }
  gridCandidates.sort((a, b) => a.sse - b.sse);

  const minSeedSepSq = ((gMaxX - gMinX) * 0.08) ** 2 + ((gMaxY - gMinY) * 0.08) ** 2;
  const seeds: { x: number; y: number }[] = [{ x: centroidX, y: centroidY }];
  for (const gc of gridCandidates) {
    if (seeds.length >= 8) break;
    const distinct = seeds.every((s) => (s.x - gc.x) ** 2 + (s.y - gc.y) ** 2 >= minSeedSepSq);
    if (distinct) seeds.push({ x: gc.x, y: gc.y });
  }

  let bestSol = refineLM(seeds[0].x, seeds[0].y);
  for (let k = 1; k < seeds.length; k++) {
    const sol = refineLM(seeds[k].x, seeds[k].y);
    if (sol.sse < bestSol.sse) {
      bestSol = sol;
    }
  }

  const S = Math.exp(bestSol.meanLnS);
  return {
    estX: bestSol.x,
    estY: bestSol.y,
    estSourceStrengthUSvM2Hr: S,
    estActivityGBq: gammaConstUSvM2PerGBqHr > 0 ? S / gammaConstUSvM2PerGBqHr : 0,
    centroidX,
    centroidY,
    rmsLogError: Math.sqrt(bestSol.sse / n)
  };
}

/**
 * Logarithmic Detonation Blast Yield Globe Marker Radius [px] (SIPRI / Glasstone Scale).
 */
export function computeBlastYieldMarkerSizePx(yieldKt: number): number {
  return Math.min(20.0, Math.max(4.5, 5.5 + 3.0 * Math.log10(Math.max(0.001, yieldKt))));
}

/**
 * ICRP Publication 74 / 116 Photon Fluence Rate [cm⁻²·s⁻¹] to Ambient Dose Equivalent H*(10) [mSv/h].
 */
export function computeFluenceToHStar10MSvHr(
  fluenceRateCm2S: number,
  hStar10_pSvCm2: number
): number {
  return (Math.max(0, fluenceRateCm2S) * Math.max(0, hStar10_pSvCm2) * 3.6e-3) / 1000.0;
}

/**
 * Carrier-Free Theoretical Gravimetric Specific Activity a_s = ln(2)·N_A / (T_1/2 · M_A) [TBq/g].
 */
export function computeSpecificActivityTBqPerGram(
  halfLifeSeconds: number,
  molarMassGPerMol: number
): number {
  if (halfLifeSeconds <= 0 || molarMassGPerMol <= 0) return 0;
  return (Math.LN2 * AVOGADRO) / (halfLifeSeconds * molarMassGPerMol * 1e12);
}

/**
 * ICRP Publication 137 Radon-222 Short-Lived Progeny Working Level (WL), WLM, & Annual Dose [mSv/yr].
 */
export function computeRadonProgenyAnnualDose(
  radonConcBqM3: number,
  equilibriumFactor = 0.40,
  annualHours = 1700.0,
  doseCoeffMSvPerWLM = 10.0
): { wl: number; wlm: number; annualDoseMSv: number } {
  const wl = (Math.max(0, radonConcBqM3) * Math.max(0, equilibriumFactor)) / 3700.0;
  const wlm = wl * (Math.max(0, annualHours) / 170.0);
  return { wl, wlm, annualDoseMSv: wlm * doseCoeffMSvPerWLM };
}

/**
 * ISO 11929-1:2019 Bayesian Decision Threshold (y*) & Characteristic Detection Limit (y#)
 * incorporating relative standard uncertainty u_rel(w) of the calibration factor w.
 */
export function computeISO11929CharacteristicLimits(
  bgCountRateCps: number,
  sampleTimeSec: number,
  bgTimeSec: number,
  conversionFactorW: number,
  uRelW: number,
  alphaError = 0.05
): { yStar: number; yHash: number } {
  const k = inverseStandardNormalCDF(1.0 - alphaError);
  const rb = Math.max(0, bgCountRateCps);
  const ts = Math.max(1e-6, sampleTimeSec);
  const tb = Math.max(1e-6, bgTimeSec);
  const yStar = k * conversionFactorW * Math.sqrt(rb / ts + rb / tb);
  const denom = Math.max(1e-6, 1.0 - k * k * uRelW * uRelW);
  const yHash = (2.0 * yStar + (k * k * conversionFactorW) / ts) / denom;
  return { yStar, yHash };
}

/**
 * ISO 7503-1:2016 Direct Surface Contamination Activity Concentration A_s [Bq/cm²].
 */
export function computeISO7503SurfaceActivityBqCm2(
  grossCountRateCps: number,
  bgCountRateCps: number,
  instrumentEfficiency: number,
  surfaceEfficiency: number,
  probeAreaCm2: number
): number {
  const denom = instrumentEfficiency * surfaceEfficiency * probeAreaCm2;
  if (denom <= 0) return 0;
  return Math.max(0, grossCountRateCps - bgCountRateCps) / denom;
}

/**
 * ISO 4037-3:2019 Reference Radiation Air Kerma Rate [mGy/h] to Ambient Dose Equivalent H*(10) [mSv/h].
 */
export function computeISO4037AirKermaToHStar10MSvHr(
  airKermaRateMGyHr: number,
  hStarK10_SvPerGy: number
): number {
  return Math.max(0, airKermaRateMGyHr) * Math.max(0, hStarK10_SvPerGy);
}

/**
 * ISO/IEC Guide 98-3:2008 (GUM) Root-Sum-Square Relative Uncertainty Propagation.
 */
export function computeGUMUncertaintyBudget(
  relativeStdComponentsPct: number[],
  coverageFactorK = 2.0
): { ucPct: number; expandedPct: number } {
  const sumSq = relativeStdComponentsPct.reduce((acc, u) => acc + u * u, 0);
  const ucPct = Math.sqrt(sumSq);
  return { ucPct, expandedPct: coverageFactorK * ucPct };
}

export interface DutchBbsRadiotoxicityResult {
  oneReInh_Bq: number;
  reInhNominal: number;
  reInhEffective: number;
  labClass: 'D-Laboratory' | 'C-Laboratory' | 'B-Laboratory' | 'A-Class / Special ANVS License';
  zoneClassification: 'Supervised Zone (Bewaakte zone)' | 'Controlled Zone (Gecontroleerde zone)' | 'Hot-Cell / Special Containment';
  maxLabLimitReInh: number;
  utilizationPct: number;
}

/**
 * Netherlands ANVS / Bbs (Stb. 2017, 404) & Rbs Radiotoxicity Equivalent (Re_inh)
 * and open-source radionuclide laboratory tier classifier (D <= 0.2, C <= 20, B <= 2,000 Re_inh).
 * 1 Re_inh = 1 Sv / e_inh(50).
 */
export function computeDutchBbsRadiotoxicity(
  activityBq: number,
  eInh50_Sv_Bq: number,
  handlingFactor = 1.0
): DutchBbsRadiotoxicityResult {
  const aSafe = Math.max(0, Number.isFinite(activityBq) ? activityBq : 0);
  const eSafe = Math.max(1e-20, Number.isFinite(eInh50_Sv_Bq) ? eInh50_Sv_Bq : 1e-20);
  const fSafe = Math.max(1e-6, Number.isFinite(handlingFactor) ? handlingFactor : 1.0);

  const oneReInh_Bq = 1.0 / eSafe;
  const reInhNominal = aSafe * eSafe;
  const reInhEffective = reInhNominal / fSafe;

  let labClass: DutchBbsRadiotoxicityResult['labClass'];
  let zoneClassification: DutchBbsRadiotoxicityResult['zoneClassification'];
  let maxLabLimitReInh: number;

  if (reInhEffective <= 0.2) {
    labClass = 'D-Laboratory';
    zoneClassification = 'Supervised Zone (Bewaakte zone)';
    maxLabLimitReInh = 0.2;
  } else if (reInhEffective <= 20.0) {
    labClass = 'C-Laboratory';
    zoneClassification = 'Supervised Zone (Bewaakte zone)';
    maxLabLimitReInh = 20.0;
  } else if (reInhEffective <= 2000.0) {
    labClass = 'B-Laboratory';
    zoneClassification = 'Controlled Zone (Gecontroleerde zone)';
    maxLabLimitReInh = 2000.0;
  } else {
    labClass = 'A-Class / Special ANVS License';
    zoneClassification = 'Hot-Cell / Special Containment';
    maxLabLimitReInh = 2000.0;
  }

  const utilizationPct = (reInhEffective / maxLabLimitReInh) * 100.0;

  return {
    oneReInh_Bq,
    reInhNominal,
    reInhEffective,
    labClass,
    zoneClassification,
    maxLabLimitReInh,
    utilizationPct
  };
}
