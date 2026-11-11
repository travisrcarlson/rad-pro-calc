/**
 * Canonical Nuclide Dosimetry, Photon Emission & Broad-Beam Shielding Registry
 *
 * Unifies radiological constants across M01–M35, Workspace Inspector, Pinboard, and V&V Suite:
 * - ICRP Publication 107 / NCRP Report 151 Specific Gamma-Ray Constants Γ_H*(10) [µSv·m²/(h·GBq)]
 *   (Strictly 0 for pure β⁻ / electron-capture / α emitters lacking penetrating γ lines)
 * - ICRP Publication 119 / 68 / 72 Inhalation (Types F, M, S), Ingestion, and Direct Systemic
 *   Wound/Injection (f_1 = 1.0) Committed Effective Dose Coefficients e(50) [Sv/Bq]
 * - Multi-line NIST XCOM + ANSI/ANS-6.4.3 GP Broad-Beam Point-Source Shielding Evaluation
 */

import nuclidesRaw from '../data/nuclides.json' with { type: 'json' };
import {
  evaluateBroadBeamPointShielding,
  type BuildupModelType
} from './xcomAndGpBuildup.ts';

export interface PhotonEmissionLine {
  energyMeV: number;
  yield: number; // photons per disintegration
}

export interface CanonicalNuclideSpec {
  symbol: string;
  name: string;
  halfLifeSeconds: number;
  decayMode: string;
  isPureBetaOrAlpha: boolean;
  /** Ambient dose equivalent rate constant Γ_H*(10) at 1 m [µSv·m²/(h·GBq)] */
  gammaH10_uSv_m2_h_GBq: number;
  /** Representative effective photon energy [MeV] (0 if pure β/α) */
  principalPhotonMeV: number;
  /** Discrete principal photon lines for spectroscopy & spectral shielding */
  photonLines: PhotonEmissionLine[];
  /** ICRP-119 Inhalation Committed Effective Dose e(50) [Sv/Bq] by Respiratory Absorption Type */
  e50InhalByClass_Sv_Bq: {
    F: number;
    M: number;
    S: number;
  };
  /** ICRP-119 Ingestion Committed Effective Dose e(50) [Sv/Bq] */
  e50Ingest_Sv_Bq: number;
  /** Direct Systemic Blood / Wound / IV Injection Committed Effective Dose e(50) [Sv/Bq] (f1 = 1.0) */
  e50Injection_Sv_Bq: number;
  /** Effective systemic biological clearance half-life [days] */
  biologicalHalfLifeDays: number;
  /** IAEA SSR-6 A1 (Special Form) & A2 (Normal Form) limits [TBq] (0 = Unlimited) */
  a1_TBq: number;
  a2_TBq: number;
  dValue_TBq: number;
  dac_uCi_mL: number;
  aliInhal_uCi: number;
  aliIngest_uCi: number;
}

const DISCRETE_PHOTON_LINES: Record<string, PhotonEmissionLine[]> = {
  'Co-60': [
    { energyMeV: 1.1732, yield: 0.9985 },
    { energyMeV: 1.3325, yield: 0.9998 }
  ],
  'Cs-137': [{ energyMeV: 0.6617, yield: 0.851 }],
  'Ir-192': [
    { energyMeV: 0.3165, yield: 0.828 },
    { energyMeV: 0.4681, yield: 0.478 },
    { energyMeV: 0.3085, yield: 0.297 },
    { energyMeV: 0.2959, yield: 0.287 }
  ],
  'I-131': [
    { energyMeV: 0.3645, yield: 0.815 },
    { energyMeV: 0.6370, yield: 0.072 }
  ],
  'I-125': [{ energyMeV: 0.0355, yield: 0.0668 }, { energyMeV: 0.0275, yield: 1.13 }],
  'I-123': [{ energyMeV: 0.1590, yield: 0.833 }],
  'Tc-99m': [{ energyMeV: 0.1405, yield: 0.890 }],
  'Mo-99': [
    { energyMeV: 0.7395, yield: 0.121 },
    { energyMeV: 0.1811, yield: 0.060 }
  ],
  'F-18': [{ energyMeV: 0.5110, yield: 1.934 }],
  'N-13': [{ energyMeV: 0.5110, yield: 1.996 }],
  'Ga-68': [{ energyMeV: 0.5110, yield: 1.783 }, { energyMeV: 1.077, yield: 0.032 }],
  'Na-22': [{ energyMeV: 0.5110, yield: 1.807 }, { energyMeV: 1.2745, yield: 0.9994 }],
  'Na-24': [{ energyMeV: 1.3686, yield: 1.00 }, { energyMeV: 2.7540, yield: 0.9994 }],
  'Am-241': [{ energyMeV: 0.05954, yield: 0.359 }],
  'Ra-226': [
    { energyMeV: 0.1862, yield: 0.0359 },
    { energyMeV: 0.3519, yield: 0.356 },
    { energyMeV: 0.6093, yield: 0.455 },
    { energyMeV: 1.1203, yield: 0.149 },
    { energyMeV: 1.7645, yield: 0.153 }
  ],
  'Se-75': [
    { energyMeV: 0.1360, yield: 0.585 },
    { energyMeV: 0.2647, yield: 0.589 },
    { energyMeV: 0.4007, yield: 0.114 }
  ],
  'Ba-133': [
    { energyMeV: 0.0810, yield: 0.329 },
    { energyMeV: 0.3029, yield: 0.183 },
    { energyMeV: 0.3560, yield: 0.621 }
  ],
  'Co-57': [{ energyMeV: 0.1221, yield: 0.856 }, { energyMeV: 0.1365, yield: 0.107 }],
  'Cs-134': [{ energyMeV: 0.6047, yield: 0.976 }, { energyMeV: 0.7959, yield: 0.855 }],
  'Eu-152': [
    { energyMeV: 0.1218, yield: 0.286 },
    { energyMeV: 0.3443, yield: 0.265 },
    { energyMeV: 0.9641, yield: 0.146 },
    { energyMeV: 1.1121, yield: 0.136 },
    { energyMeV: 1.4080, yield: 0.210 }
  ],
  'Mn-54': [{ energyMeV: 0.8348, yield: 0.9998 }],
  'Zn-65': [{ energyMeV: 1.1155, yield: 0.506 }],
  'Lu-177': [{ energyMeV: 0.2084, yield: 0.104 }, { energyMeV: 0.1129, yield: 0.062 }],
  'In-111': [{ energyMeV: 0.1713, yield: 0.906 }, { energyMeV: 0.2454, yield: 0.941 }],
  'Ga-67': [{ energyMeV: 0.0933, yield: 0.388 }, { energyMeV: 0.1846, yield: 0.214 }, { energyMeV: 0.3002, yield: 0.166 }],
  'Pd-103': [{ energyMeV: 0.0207, yield: 0.68 }],
  'U-235': [{ energyMeV: 0.1857, yield: 0.572 }],
  'Cf-252': [{ energyMeV: 0.800, yield: 0.15 }],
  'K-40': [{ energyMeV: 1.4608, yield: 0.1066 }]
};

/**
 * ICRP-119 Class-Specific Worker Inhalation e(50) [Sv/Bq] and Systemic Injection/Wound e(50) [Sv/Bq]
 * Note: For insoluble actinides (Pu-239, Am-241, U-235/238), Type S lung retention yields LOWER
 * systemic bone/liver dose than Type M or F!
 */
const ICRP119_BIOKINETIC_OVERRIDES: Record<
  string,
  {
    inhal: { F: number; M: number; S: number };
    injection: number;
    bioHalfLifeDays: number;
  }
> = {
  'I-131': {
    inhal: { F: 1.1e-8, M: 2.4e-9, S: 1.6e-9 },
    injection: 2.2e-8, // f1 = 1.0 (complete GI absorption, so IV ≈ oral)
    bioHalfLifeDays: 80
  },
  'Cs-137': {
    inhal: { F: 6.7e-9, M: 9.7e-9, S: 3.9e-8 },
    injection: 1.3e-8, // f1 = 1.0
    bioHalfLifeDays: 110
  },
  'Cs-134': {
    inhal: { F: 9.6e-9, M: 9.1e-9, S: 2.0e-8 },
    injection: 1.9e-8,
    bioHalfLifeDays: 110
  },
  'Co-60': {
    inhal: { F: 5.2e-9, M: 1.0e-8, S: 2.9e-8 },
    injection: 3.4e-8, // f1 = 0.10 oral -> systemic ~10x oral
    bioHalfLifeDays: 150
  },
  'Sr-90': {
    inhal: { F: 2.4e-8, M: 3.6e-8, S: 1.5e-7 },
    injection: 9.3e-8, // f1 = 0.30 oral -> systemic ~3.3x oral
    bioHalfLifeDays: 1800
  },
  'Am-241': {
    inhal: { F: 9.6e-5, M: 3.9e-5, S: 1.6e-5 },
    injection: 4.0e-4, // f1 = 5e-4 oral -> systemic wound/IV ~2,000x oral!
    bioHalfLifeDays: 18000
  },
  'Pu-239': {
    inhal: { F: 1.1e-4, M: 4.7e-5, S: 1.5e-5 },
    injection: 4.9e-4, // f1 = 5e-4 oral -> systemic wound/IV ~1,960x oral!
    bioHalfLifeDays: 18000
  },
  'Pu-238': {
    inhal: { F: 1.0e-4, M: 4.3e-5, S: 1.5e-5 },
    injection: 4.5e-4,
    bioHalfLifeDays: 18000
  },
  'U-235': {
    inhal: { F: 5.2e-7, M: 2.8e-6, S: 7.7e-6 },
    injection: 2.3e-6, // f1 = 0.02
    bioHalfLifeDays: 300
  },
  'U-238': {
    inhal: { F: 5.0e-7, M: 2.6e-6, S: 7.3e-6 },
    injection: 2.2e-6,
    bioHalfLifeDays: 300
  },
  'H-3': {
    inhal: { F: 1.8e-11, M: 4.5e-11, S: 2.6e-10 },
    injection: 1.8e-11,
    bioHalfLifeDays: 10
  },
  'Ir-192': {
    inhal: { F: 1.8e-9, M: 4.9e-9, S: 6.2e-9 },
    injection: 1.4e-8,
    bioHalfLifeDays: 60
  },
  'Ra-226': {
    inhal: { F: 3.6e-7, M: 3.5e-6, S: 9.5e-6 },
    injection: 1.4e-6, // f1 = 0.20
    bioHalfLifeDays: 8000
  },
  'Po-210': {
    inhal: { F: 6.0e-7, M: 3.3e-6, S: 4.3e-6 },
    injection: 2.4e-6,
    bioHalfLifeDays: 50
  }
};

function parseFirstMeV(egField: unknown): number {
  if (typeof egField === 'number') return egField;
  if (typeof egField !== 'string') return 0;
  const trimmed = egField.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return 0;
  if (trimmed === 'Multiple') return 0.8;
  const match = trimmed.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

const REGISTRY: Record<string, CanonicalNuclideSpec> = {};

for (const raw of nuclidesRaw as Record<string, unknown>[]) {
  const symbol = String(raw['Symbol'] || '').trim();
  if (!symbol) continue;
  const gammaSI = typeof raw['Γ_SI (µSv·m²/h·GBq)'] === 'number' ? (raw['Γ_SI (µSv·m²/h·GBq)'] as number) : 0;
  const lines = DISCRETE_PHOTON_LINES[symbol] || [];
  let principalPhotonMeV = 0;
  if (lines.length > 0) {
    const totalW = lines.reduce((acc, l) => acc + l.energyMeV * l.yield, 0);
    const sumY = lines.reduce((acc, l) => acc + l.yield, 0);
    principalPhotonMeV = sumY > 0 ? totalW / sumY : lines[0].energyMeV;
  } else if (gammaSI > 0) {
    principalPhotonMeV = parseFirstMeV(raw['Eγ (MeV)']);
  }

  const baseInhal = Number(raw['e(50) Inhal. (Sv/Bq)'] || 0);
  const baseIngest = Number(raw['e(50) Ingest. (Sv/Bq)'] || 0);
  const bioOverride = ICRP119_BIOKINETIC_OVERRIDES[symbol];

  const inhalClasses = bioOverride
    ? bioOverride.inhal
    : {
        F: Number((baseInhal * 0.65).toFixed(4)),
        M: baseInhal,
        S: Number((baseInhal * 1.25).toFixed(4))
      };

  const injectionCoeff = bioOverride
    ? bioOverride.injection
    : Math.max(baseIngest, baseInhal * 0.5);

  REGISTRY[symbol] = {
    symbol,
    name: String(raw['Nuclide'] || symbol),
    halfLifeSeconds: Number(raw['Half-Life (s)'] || 31536000),
    decayMode: String(raw['Decay Mode'] || ''),
    isPureBetaOrAlpha: gammaSI <= 0.05 && lines.length === 0,
    gammaH10_uSv_m2_h_GBq: gammaSI,
    principalPhotonMeV,
    photonLines:
      lines.length > 0
        ? lines
        : principalPhotonMeV > 0 && gammaSI > 0
          ? [{ energyMeV: principalPhotonMeV, yield: 1.0 }]
          : [],
    e50InhalByClass_Sv_Bq: inhalClasses,
    e50Ingest_Sv_Bq: baseIngest,
    e50Injection_Sv_Bq: injectionCoeff,
    biologicalHalfLifeDays: bioOverride ? bioOverride.bioHalfLifeDays : 90,
    a1_TBq: Number(raw['A1 (TBq)'] ?? 0),
    a2_TBq: Number(raw['A2 (TBq)'] ?? 0),
    dValue_TBq: Number(raw['D-Value (TBq)'] ?? 0),
    dac_uCi_mL: Number(raw['DAC (µCi/mL)'] ?? 0),
    aliInhal_uCi: Number(raw['ALI Inhal. (μCi)'] ?? raw['ALI Inhal. (µCi)'] ?? 0),
    aliIngest_uCi: Number(raw['ALI Ingest. (μCi)'] ?? raw['ALI Ingest. (µCi)'] ?? 0)
  };
}

export const CANONICAL_NUCLIDE_REGISTRY: Readonly<Record<string, CanonicalNuclideSpec>> = REGISTRY;

export function getCanonicalNuclide(symbol: string): CanonicalNuclideSpec | null {
  const key = String(symbol || '').trim();
  if (REGISTRY[key]) return REGISTRY[key];
  const ciMatch = Object.keys(REGISTRY).find(k => k.toLowerCase() === key.toLowerCase());
  return ciMatch ? REGISTRY[ciMatch] : null;
}

/**
 * Converts an activity quantity + unit string cleanly into GBq.
 */
export function parseActivityToGBq(value: number, unitInput?: string | null): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const u = String(unitInput || 'GBq').trim().toLowerCase();
  switch (u) {
    case 'tbq':
      return value * 1000;
    case 'gbq':
      return value;
    case 'mbq':
      return value * 1e-3;
    case 'kbq':
      return value * 1e-6;
    case 'bq':
      return value * 1e-9;
    case 'kci':
      return value * 37000;
    case 'ci':
      return value * 37.0;
    case 'mci':
      return value * 0.037;
    case 'uci':
    case 'µci':
    case 'μci':
      return value * 3.7e-5;
    default:
      return value;
  }
}

/**
 * Evaluates broad-beam point-source shielding for a named radionuclide using its discrete
 * photon spectrum (or principal photon energy) and NIST XCOM + ANSI/ANS-6.4.3 GP buildup.
 */
export function evaluateNuclideBroadBeamShielding(
  symbol: string,
  activityGBq: number,
  distanceM: number,
  layers: { material: string; thicknessCm: number }[],
  model: BuildupModelType = 'GP_ANS643'
): {
  unshieldedMSvHr: number;
  shieldedBroadBeamMSvHr: number;
  shieldedNarrowBeamMSvHr: number;
  transmissionBroadBeam: number;
  buildupFactor: number;
  opticalMfp: number;
  effectiveHvlCm: number;
  effectiveTvlCm: number;
} {
  const spec = getCanonicalNuclide(symbol);
  if (!spec || spec.gammaH10_uSv_m2_h_GBq <= 0 || spec.principalPhotonMeV <= 0 || activityGBq <= 0) {
    return {
      unshieldedMSvHr: 0,
      shieldedBroadBeamMSvHr: 0,
      shieldedNarrowBeamMSvHr: 0,
      transmissionBroadBeam: 1.0,
      buildupFactor: 1.0,
      opticalMfp: 0,
      effectiveHvlCm: 0,
      effectiveTvlCm: 0
    };
  }

  const unshieldedAt1m_uSv_h = spec.gammaH10_uSv_m2_h_GBq * activityGBq;
  const res = evaluateBroadBeamPointShielding(
    spec.principalPhotonMeV,
    unshieldedAt1m_uSv_h,
    distanceM,
    layers,
    model
  );

  return {
    unshieldedMSvHr: res.unshieldedDoseRate_uSv_h / 1000.0,
    shieldedBroadBeamMSvHr: res.broadBeamDoseRate_uSv_h / 1000.0,
    shieldedNarrowBeamMSvHr: res.narrowBeamDoseRate_uSv_h / 1000.0,
    transmissionBroadBeam: res.transmissionBroadBeam,
    buildupFactor: res.buildupFactor,
    opticalMfp: res.totalOpticalMfp,
    effectiveHvlCm: res.effectiveHvlCm,
    effectiveTvlCm: res.effectiveTvlCm
  };
}
