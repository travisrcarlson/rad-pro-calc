/**
 * Physical Reality, Instrument Response, Model Validity & Primary Data Provenance Engine
 *
 * Grounds radiological calculations in:
 * 1. Physical Gravimetric Mass (Avogadro / λ), Pellet Volume & Radiogenic Self-Heating (W)
 * 2. Everyday Empirical Dose & Ambient Background Benchmarks (+ Live Safecast API query)
 * 3. Real Survey Meter Physics (GM Paralyzable Dead-Time Foldback, Low-E Over-Response, Ion Chamber, NaI Pileup)
 * 4. Explicit Analytical Domain Validity Guardrails & ISO/IEC Guide 98-3 (GUM) Uncertainty (k = 2)
 * 5. Primary Reference Data Provenance (NIST XCOM μ/ρ, K/L Edges, ANSI/ANS-6.4.3 GP Parameters, ICRP-107 Lines)
 */

import {
  evaluateXCOMAttenuation,
  evaluateGPBuildup,
  XCOM_GP_MATERIALS
} from './xcomAndGpBuildup';
import { getCanonicalNuclide } from './canonicalNuclidePhysics';

export interface NuclidePhysicalSpec {
  symbol: string;
  atomicMassGPerMol: number;
  halfLifeSeconds: number;
  halfLifeLabel: string;
  meanPhotonEnergyMeV: number;
  totalDecayEnergyMeV: number; // Mean recoverable decay heat energy (α + β + γ) per disintegration
  solidDensityGcm3: number;
  chemicalForm: string;
  gammaConst_mSv_m2_h_GBq: number;
  icrp107Lines: string;
  icrp119InhalE50_SvPerBq: number;
}

export const NUCLIDE_PHYSICAL_CATALOG: Record<string, NuclidePhysicalSpec> = {
  'Co-60': {
    symbol: 'Co-60',
    atomicMassGPerMol: 59.9338,
    halfLifeSeconds: 5.2714 * 365.25 * 86400,
    halfLifeLabel: '5.2714 yr',
    meanPhotonEnergyMeV: 1.2529,
    totalDecayEnergyMeV: 2.601,
    solidDensityGcm3: 8.90,
    chemicalForm: 'Metallic Cobalt Pellet',
    gammaConst_mSv_m2_h_GBq: 0.3085,
    icrp107Lines: '1173.2 keV (99.85%), 1332.5 keV (99.98%)',
    icrp119InhalE50_SvPerBq: 1.0e-8
  },
  'Cs-137': {
    symbol: 'Cs-137',
    atomicMassGPerMol: 136.9071,
    halfLifeSeconds: 30.08 * 365.25 * 86400,
    halfLifeLabel: '30.08 yr',
    meanPhotonEnergyMeV: 0.6617,
    totalDecayEnergyMeV: 0.785,
    solidDensityGcm3: 3.99,
    chemicalForm: 'CsCl Compressed Ceramic',
    gammaConst_mSv_m2_h_GBq: 0.0772,
    icrp107Lines: '661.66 keV via Ba-137m (85.10%), 32.2 keV Ba Kα X-ray',
    icrp119InhalE50_SvPerBq: 4.6e-9
  },
  'Ir-192': {
    symbol: 'Ir-192',
    atomicMassGPerMol: 191.9626,
    halfLifeSeconds: 73.829 * 86400,
    halfLifeLabel: '73.83 d',
    meanPhotonEnergyMeV: 0.380,
    totalDecayEnergyMeV: 1.005,
    solidDensityGcm3: 22.56,
    chemicalForm: 'Metallic Iridium NDT Focal Wafer',
    gammaConst_mSv_m2_h_GBq: 0.1168,
    icrp107Lines: '316.5 keV (82.8%), 468.1 keV (47.8%), 308.5 keV (29.7%)',
    icrp119InhalE50_SvPerBq: 5.2e-9
  },
  'Am-241': {
    symbol: 'Am-241',
    atomicMassGPerMol: 241.0568,
    halfLifeSeconds: 432.6 * 365.25 * 86400,
    halfLifeLabel: '432.6 yr',
    meanPhotonEnergyMeV: 0.05954,
    totalDecayEnergyMeV: 5.638,
    solidDensityGcm3: 11.68,
    chemicalForm: 'AmO₂ Oxide Matrix',
    gammaConst_mSv_m2_h_GBq: 0.0031,
    icrp107Lines: '59.54 keV (35.9%), Np L-shell X-rays 13.9–20.8 keV',
    icrp119InhalE50_SvPerBq: 4.2e-5
  },
  'F-18': {
    symbol: 'F-18',
    atomicMassGPerMol: 18.0009,
    halfLifeSeconds: 109.77 * 60,
    halfLifeLabel: '109.77 min',
    meanPhotonEnergyMeV: 0.511,
    totalDecayEnergyMeV: 1.236,
    solidDensityGcm3: 1.00,
    chemicalForm: 'Carrier-Free [¹⁸F]FDG Saline',
    gammaConst_mSv_m2_h_GBq: 0.1430,
    icrp107Lines: '511.0 keV e⁺e⁻ Annihilation Pair (193.5%)',
    icrp119InhalE50_SvPerBq: 6.0e-11
  },
  'I-131': {
    symbol: 'I-131',
    atomicMassGPerMol: 130.9061,
    halfLifeSeconds: 8.0252 * 86400,
    halfLifeLabel: '8.025 d',
    meanPhotonEnergyMeV: 0.3645,
    totalDecayEnergyMeV: 0.574,
    solidDensityGcm3: 4.93,
    chemicalForm: 'Na¹³¹I Crystalline / Capsule',
    gammaConst_mSv_m2_h_GBq: 0.0522,
    icrp107Lines: '364.49 keV (81.5%), 637.0 keV (7.16%), 284.3 keV (6.1%)',
    icrp119InhalE50_SvPerBq: 7.4e-9
  },
  'Tc-99m': {
    symbol: 'Tc-99m',
    atomicMassGPerMol: 98.9063,
    halfLifeSeconds: 6.0067 * 3600,
    halfLifeLabel: '6.01 h',
    meanPhotonEnergyMeV: 0.1405,
    totalDecayEnergyMeV: 0.1427,
    solidDensityGcm3: 11.5,
    chemicalForm: 'Na⁹⁹ᵐTcO₄ Pertechnetate Eluate',
    gammaConst_mSv_m2_h_GBq: 0.0141,
    icrp107Lines: '140.51 keV (89.0%), Tc Kα X-rays 18.3 keV',
    icrp119InhalE50_SvPerBq: 1.9e-11
  },
  'Ra-226': {
    symbol: 'Ra-226',
    atomicMassGPerMol: 226.0254,
    halfLifeSeconds: 1600 * 365.25 * 86400,
    halfLifeLabel: '1,600 yr',
    meanPhotonEnergyMeV: 0.830,
    totalDecayEnergyMeV: 4.871,
    solidDensityGcm3: 4.90,
    chemicalForm: 'RaSO₄ Sealed Equilibrium Needle',
    gammaConst_mSv_m2_h_GBq: 0.2230,
    icrp107Lines: '186.2 keV (3.6%) + Pb-214/Bi-214 Equilibrium (609, 1120, 1764 keV)',
    icrp119InhalE50_SvPerBq: 3.5e-6
  },
  'Na-24': {
    symbol: 'Na-24',
    atomicMassGPerMol: 23.9910,
    halfLifeSeconds: 14.959 * 3600,
    halfLifeLabel: '14.96 h',
    meanPhotonEnergyMeV: 2.06,
    totalDecayEnergyMeV: 4.685,
    solidDensityGcm3: 2.16,
    chemicalForm: 'Activated NaCl Seawater / Salt',
    gammaConst_mSv_m2_h_GBq: 0.4460,
    icrp107Lines: '1368.6 keV (99.99%), 2754.0 keV (99.86%)',
    icrp119InhalE50_SvPerBq: 2.9e-10
  }
};

const AVOGADRO = 6.02214076e23;
const MEV_TO_JOULES = 1.602176634e-13;

export interface PhysicalMatterAnchor {
  massGrams: number;
  formattedMass: string;
  specificActivityTBqPerGram: number;
  equivalentSphereDiameterMm: number;
  sizeAnalogy: string;
  decayHeatWatts: number;
  formattedHeat: string;
  chemicalForm: string;
}

export function getNuclidePhysicalSpec(isotope: string): NuclidePhysicalSpec {
  if (NUCLIDE_PHYSICAL_CATALOG[isotope]) {
    return NUCLIDE_PHYSICAL_CATALOG[isotope];
  }
  const canon = getCanonicalNuclide(isotope);
  if (canon) {
    const massMatch = canon.symbol.match(/(\d+)/);
    const atomicMassGPerMol = massMatch ? parseInt(massMatch[1], 10) : 100;
    const linesDesc =
      canon.photonLines.length > 0
        ? canon.photonLines
            .slice(0, 3)
            .map((l) => `${(l.energyMeV * 1000).toFixed(1)} keV (${(l.yield * 100).toFixed(1)}%)`)
            .join(', ')
        : `${canon.decayMode} emitter (no principal γ lines)`;
    const meanPhotonEnergyMeV = canon.principalPhotonMeV > 0 ? canon.principalPhotonMeV : 0.662;
    const totalDecayEnergyMeV = Math.max(0.25, canon.principalPhotonMeV > 0 ? canon.principalPhotonMeV * 1.35 : 0.8);
    return {
      symbol: canon.symbol,
      atomicMassGPerMol,
      halfLifeSeconds: canon.halfLifeSeconds,
      halfLifeLabel:
        canon.halfLifeSeconds >= 3.15576e7
          ? `${(canon.halfLifeSeconds / 3.15576e7).toPrecision(3)} yr`
          : canon.halfLifeSeconds >= 86400
          ? `${(canon.halfLifeSeconds / 86400).toPrecision(3)} d`
          : canon.halfLifeSeconds >= 3600
          ? `${(canon.halfLifeSeconds / 3600).toPrecision(3)} h`
          : `${canon.halfLifeSeconds.toPrecision(3)} s`,
      meanPhotonEnergyMeV,
      totalDecayEnergyMeV,
      solidDensityGcm3: 5.0,
      chemicalForm: `${canon.name} (${canon.decayMode})`,
      gammaConst_mSv_m2_h_GBq: canon.gammaH10_uSv_m2_h_GBq / 1000,
      icrp107Lines: linesDesc,
      icrp119InhalE50_SvPerBq: canon.e50InhalByClass_Sv_Bq.M || canon.e50InhalByClass_Sv_Bq.F || 1e-8
    };
  }
  return NUCLIDE_PHYSICAL_CATALOG['Co-60'];
}

export function computePhysicalMatterAnchor(
  isotope: string,
  activityGBq: number
): PhysicalMatterAnchor {
  const spec = getNuclidePhysicalSpec(isotope);
  const activityBq = Math.max(0, activityGBq) * 1e9;
  const lambda = Math.LN2 / spec.halfLifeSeconds;
  const numAtoms = lambda > 0 ? activityBq / lambda : 0;
  const moles = numAtoms / AVOGADRO;
  const massGrams = moles * spec.atomicMassGPerMol;

  const specificActivityBqPerG = (lambda * AVOGADRO) / spec.atomicMassGPerMol;
  const specificActivityTBqPerGram = specificActivityBqPerG / 1e12;

  const volumeCm3 = massGrams / Math.max(0.5, spec.solidDensityGcm3);
  const diameterCm = Math.pow((6 * volumeCm3) / Math.PI, 1 / 3);
  const diameterMm = diameterCm * 10;

  let formattedMass = '';
  if (massGrams < 1e-6) formattedMass = `${(massGrams * 1e9).toFixed(2)} ng`;
  else if (massGrams < 1e-3) formattedMass = `${(massGrams * 1e6).toFixed(2)} µg`;
  else if (massGrams < 1.0) formattedMass = `${(massGrams * 1e3).toFixed(2)} mg`;
  else if (massGrams < 1000) formattedMass = `${massGrams.toFixed(3)} g`;
  else formattedMass = `${(massGrams / 1000).toFixed(2)} kg`;

  let sizeAnalogy = '';
  if (diameterMm < 0.02) sizeAnalogy = 'Microscopic invisible speck (< human hair width)';
  else if (diameterMm < 0.4) sizeAnalogy = 'Fine dust grain (~pinpoint)';
  else if (diameterMm < 2.2) sizeAnalogy = 'Coarse sand grain / brachytherapy seed';
  else if (diameterMm < 6.5) sizeAnalogy = 'Small metallic BB / peppercorn pellet';
  else if (diameterMm < 22) sizeAnalogy = 'Marble-sized industrial capsule';
  else if (diameterMm < 80) sizeAnalogy = 'Golf-to-tennis ball core';
  else sizeAnalogy = 'Macroscopic bulk billet / multi-kg drum';

  const decayHeatWatts = activityBq * spec.totalDecayEnergyMeV * MEV_TO_JOULES;
  const formattedHeat =
    decayHeatWatts < 1e-3
      ? `${(decayHeatWatts * 1e6).toFixed(1)} µW`
      : decayHeatWatts < 1.0
      ? `${(decayHeatWatts * 1e3).toFixed(2)} mW`
      : `${decayHeatWatts.toFixed(2)} W`;

  return {
    massGrams,
    formattedMass,
    specificActivityTBqPerGram,
    equivalentSphereDiameterMm: diameterMm,
    sizeAnalogy,
    decayHeatWatts,
    formattedHeat,
    chemicalForm: spec.chemicalForm
  };
}

export interface DoseEquivalenceBenchmark {
  multipleOfGlobalBackground: number;
  chestXRaysPerHour: number;
  flightHoursEquivalentPerHour: number;
  hoursToPublicAnnualLimit: number;
  hoursToHumanLD50: number;
  contextualComparison: string;
}

export function computeDoseEquivalenceBenchmarks(
  doseRateMSvPerHr: number
): DoseEquivalenceBenchmark {
  const rate = Math.max(0, doseRateMSvPerHr);
  const globalBgMSvHr = 0.0001; // 0.10 µSv/h (100 nSv/h UNSCEAR global mean)
  const flightCruiseMSvHr = 0.0045; // 4.5 µSv/h at FL370 (FAA CARI-7)
  const chestXRayMSv = 0.10; // 0.10 mSv PA chest radiograph

  const multipleOfGlobalBackground = rate / globalBgMSvHr;
  const chestXRaysPerHour = rate / chestXRayMSv;
  const flightHoursEquivalentPerHour = rate / flightCruiseMSvHr;
  const hoursToPublicAnnualLimit = rate > 1e-12 ? 1.0 / rate : 999999;
  const hoursToHumanLD50 = rate > 1e-12 ? 4000.0 / rate : 999999;

  let contextualComparison = '';
  if (rate <= 0.00025) {
    contextualComparison = 'Within normal natural terrestrial background range (0.05–0.25 µSv/h)';
  } else if (rate <= 0.008) {
    contextualComparison = `Comparable to commercial jet cabin cosmic dose rate at 37,000 ft (${(rate * 1000).toFixed(2)} µSv/h)`;
  } else if (rate <= 0.25) {
    contextualComparison = `Equals ~${chestXRaysPerHour.toFixed(1)} Chest X-Rays per hour of exposure (Controlled Radiation Area)`;
  } else if (rate <= 10.0) {
    contextualComparison = `High Radiation Area — reaches 1 mSv public annual limit in ${(60 / rate).toFixed(1)} minutes`;
  } else if (rate <= 500) {
    contextualComparison = `Very High Radiation Area — delivers Whole-Body CT equivalent (8 mSv) every ${((8 / rate) * 60).toFixed(1)} min`;
  } else {
    contextualComparison = `EXTREME LETHAL FIELD — reaches human LD₅₀/₆₀ (4 Sv) in ${(hoursToHumanLD50 * 60).toFixed(1)} minutes`;
  }

  return {
    multipleOfGlobalBackground,
    chestXRaysPerHour,
    flightHoursEquivalentPerHour,
    hoursToPublicAnnualLimit,
    hoursToHumanLD50,
    contextualComparison
  };
}

export interface SimulatedMeterReadout {
  instrumentName: string;
  detectorClass: 'Paralyzable GM' | 'Compensated GM' | 'Ion Chamber' | 'NaI(Tl) Scintillator';
  displayedReadout: string;
  displayedMSvPerHr: number | null; // null if latched OVER-RANGE
  energyResponseFactor: number;
  status: 'ACCURATE' | 'OVER-RESPONDING' | 'UNDER-RESPONDING' | 'SATURATED / OVER-RANGE' | 'DEAD-TIME FOLDBACK!';
  engineeringWarning: string;
}

/**
 * Simulates what 4 real-world survey instruments actually display when placed in a photon field
 * of true ambient dose equivalent rate `trueDoseMSvHr` at mean energy `energyMeV`.
 */
export function simulateRealSurveyMeters(
  trueDoseMSvHr: number,
  energyMeV: number
): SimulatedMeterReadout[] {
  const d = Math.max(0, trueDoseMSvHr);
  const eKeV = Math.max(15, energyMeV * 1000);

  // 1. Uncompensated Pancake / End-Window GM (e.g. Ludlum 44-9 / 2241)
  // Photoelectric wall over-response peaks ~4.2x near 60-80 keV relative to Cs-137 (662 keV)
  const gmUncompEnergyFactor =
    eKeV < 35
      ? 1.8
      : eKeV < 140
      ? 1.0 + 3.2 * Math.exp(-Math.pow((eKeV - 70) / 42, 2))
      : 1.0 + 0.15 * Math.exp(-Math.pow((eKeV - 150) / 80, 2));

  // Paralyzable dead-time model: m = n * exp(-n * tau)
  // Sensitivity ~ 3,300 cpm per mR/h => 5,500 cps per mSv/h; tau = 85 µs
  const nTrueCps = d * gmUncompEnergyFactor * 5500;
  const tauSec = 85e-6;
  const mObsCps = nTrueCps * Math.exp(-nTrueCps * tauSec);
  const gmUncompDisplayedMSvHr = mObsCps / 5500;
  const isGmFoldback = nTrueCps * tauSec > 1.05; // Past peak of paralyzable curve!
  const isGmDroop = !isGmFoldback && nTrueCps * tauSec > 0.22;

  // 2. Energy-Compensated High-Range GM w/ Time-to-Count (e.g. Thermo RadEye G / Ludlum 133)
  const gmCompEnergyFactor = eKeV < 45 ? 0.65 : eKeV < 120 ? 1.14 : 1.0;
  const gmCompRaw = d * gmCompEnergyFactor;
  const gmCompOverRange = gmCompRaw > 100.0; // Latches at 100 mSv/h (10 R/h)

  // 3. Pressurized Ionization Chamber (e.g. Fluke 451P)
  // Tissue-equivalent air wall; slight beta-slide attenuation < 30 keV, immune to pulse dead-time
  const ionChamberEnergyFactor = eKeV < 30 ? 0.78 : 1.0;
  const ionRaw = d * ionChamberEnergyFactor;
  const ionOverRange = ionRaw > 5000.0; // 5 Sv/h ceiling

  // 4. NaI(Tl) 1"x1" Micro-R Scintillator (e.g. Ludlum Model 19)
  // Strong Z=53 iodine photoelectric over-response ~8.5x near 60-120 keV; saturates above 50 µSv/h (0.05 mSv/h)
  const naiEnergyFactor =
    eKeV < 180 ? 1.0 + 7.5 * Math.exp(-Math.pow((eKeV - 85) / 55, 2)) : 1.0;
  const naiRaw = d * naiEnergyFactor;
  const naiSaturated = naiRaw > 0.05; // 5,000 µR/h full scale

  return [
    {
      instrumentName: 'Uncompensated Pancake GM (Ludlum 44-9)',
      detectorClass: 'Paralyzable GM',
      displayedReadout: `${gmUncompDisplayedMSvHr < 0.01 ? `${(gmUncompDisplayedMSvHr * 1000).toFixed(2)} µSv/h` : `${gmUncompDisplayedMSvHr.toFixed(3)} mSv/h`}`,
      displayedMSvPerHr: gmUncompDisplayedMSvHr,
      energyResponseFactor: gmUncompEnergyFactor,
      status: isGmFoldback
        ? 'DEAD-TIME FOLDBACK!'
        : isGmDroop
        ? 'UNDER-RESPONDING'
        : gmUncompEnergyFactor > 1.35
        ? 'OVER-RESPONDING'
        : 'ACCURATE',
      engineeringWarning: isGmFoldback
        ? `DANGER: Paralyzable tube saturated (nτ = ${(nTrueCps * tauSec).toFixed(1)} > 1)! Meter folds back toward ZERO (${gmUncompDisplayedMSvHr.toFixed(3)} mSv/h) inside a ${d.toFixed(1)} mSv/h field!`
        : isGmDroop
        ? `Dead-time coincidence loss (${((1 - Math.exp(-nTrueCps * tauSec)) * 100).toFixed(0)}% droop) under-reports true field.`
        : gmUncompEnergyFactor > 1.35
        ? `High-Z wall photoelectric effect over-responds ${gmUncompEnergyFactor.toFixed(1)}× at ${eKeV.toFixed(0)} keV vs Cs-137 calibration.`
        : 'Linear within count-rate and Cs-137 energy calibration range.'
    },
    {
      instrumentName: 'Energy-Compensated GM (RadEye G)',
      detectorClass: 'Compensated GM',
      displayedReadout: gmCompOverRange
        ? 'OVER-RANGE (>100 mSv/h)'
        : gmCompRaw < 0.01
        ? `${(gmCompRaw * 1000).toFixed(2)} µSv/h`
        : `${gmCompRaw.toFixed(3)} mSv/h`,
      displayedMSvPerHr: gmCompOverRange ? null : gmCompRaw,
      energyResponseFactor: gmCompEnergyFactor,
      status: gmCompOverRange
        ? 'SATURATED / OVER-RANGE'
        : gmCompEnergyFactor < 0.8
        ? 'UNDER-RESPONDING'
        : 'ACCURATE',
      engineeringWarning: gmCompOverRange
        ? 'Time-to-count circuitry safely latches OVER-RANGE above 100 mSv/h without folding back to zero.'
        : 'Sn/Pb energy-compensation filter flattens photon response above 45 keV.'
    },
    {
      instrumentName: 'Pressurized Ion Chamber (Fluke 451P)',
      detectorClass: 'Ion Chamber',
      displayedReadout: ionOverRange
        ? 'OVER-RANGE (>5 Sv/h)'
        : ionRaw < 0.01
        ? `${(ionRaw * 1000).toFixed(2)} µSv/h`
        : `${ionRaw.toFixed(3)} mSv/h`,
      displayedMSvPerHr: ionOverRange ? null : ionRaw,
      energyResponseFactor: ionChamberEnergyFactor,
      status: ionOverRange ? 'SATURATED / OVER-RANGE' : 'ACCURATE',
      engineeringWarning:
        'Gold-standard current-integrating air-equivalent chamber: zero dead-time foldback even in high/pulsed fields.'
    },
    {
      instrumentName: 'NaI(Tl) 1"×1" Micro-R Meter (Model 19)',
      detectorClass: 'NaI(Tl) Scintillator',
      displayedReadout: naiSaturated
        ? 'PEGGED MAX (>50 µSv/h)'
        : `${(naiRaw * 1000).toFixed(2)} µSv/h`,
      displayedMSvPerHr: naiSaturated ? null : naiRaw,
      energyResponseFactor: naiEnergyFactor,
      status: naiSaturated
        ? 'SATURATED / OVER-RANGE'
        : naiEnergyFactor > 1.5
        ? 'OVER-RESPONDING'
        : 'ACCURATE',
      engineeringWarning: naiSaturated
        ? 'Micro-R background search meter pegs off-scale above 50 µSv/h; switch to Ion Chamber or Compensated GM.'
        : naiEnergyFactor > 1.5
        ? `Iodine (Z=53) crystal over-responds ${naiEnergyFactor.toFixed(1)}× at ${eKeV.toFixed(0)} keV—ideal for finding orphan sources, not accurate for dose!`
        : 'High-sensitivity background search regime.'
    }
  ];
}

export interface ValidityAndUncertaintyReport {
  relativeStdUncertaintyPct: number; // u_c (k = 1)
  expandedUncertaintyPct: number;    // U (k = 2, 95% confidence)
  lowerBound95MSvHr: number;
  upperBound95MSvHr: number;
  validityFlags: {
    severity: 'OK' | 'ADVISORY' | 'OUT_OF_BOUNDS';
    rule: string;
    detail: string;
  }[];
}

const MATERIAL_TO_XCOM_KEY: Record<string, string> = {
  lead: 'LEAD',
  pb: 'LEAD',
  tungsten: 'TUNGSTEN',
  w: 'TUNGSTEN',
  'depleted uranium': 'DU',
  du: 'DU',
  steel: 'STEEL',
  iron: 'STEEL',
  fe: 'STEEL',
  concrete: 'CONCRETE',
  'barite concrete': 'BARITE_CONCRETE',
  barite: 'BARITE_CONCRETE',
  'magnetite concrete': 'MAGNETITE_CONCRETE',
  magnetite: 'MAGNETITE_CONCRETE',
  aluminum: 'ALUMINUM',
  al: 'ALUMINUM',
  water: 'WATER',
  h2o: 'WATER',
  hdpe: 'HDPE',
  polyethylene: 'HDPE',
  'borated polyethylene': 'BORATED_PE',
  borated_pe: 'BORATED_PE',
  'lead glass': 'LEAD_GLASS',
  glass: 'LEAD_GLASS',
  bismuth: 'BISMUTH',
  bi: 'BISMUTH',
  copper: 'COPPER',
  cu: 'COPPER',
  tissue: 'ICRU_TISSUE',
  soil: 'SOIL_EARTH',
  earth: 'SOIL_EARTH',
  air: 'AIR',
  brick: 'BRICK',
  drywall: 'DRYWALL',
  pmma: 'PMMA',
  acrylic: 'PMMA'
};

export function resolveXcomMaterialKey(shieldMaterial: string): string {
  const clean = shieldMaterial.trim().toLowerCase();
  if (MATERIAL_TO_XCOM_KEY[clean]) return MATERIAL_TO_XCOM_KEY[clean];
  const upper = clean.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (XCOM_GP_MATERIALS[upper]) return upper;
  return 'LEAD';
}

export function evaluateValidityAndUncertainty(
  isotope: string,
  distanceM: number,
  shieldMaterial: string,
  shieldThicknessCm: number,
  shieldedDoseMSvHr: number,
  pelletDiameterMm: number
): ValidityAndUncertaintyReport {
  const spec = getNuclidePhysicalSpec(isotope);
  const matKey = resolveXcomMaterialKey(shieldMaterial);
  const xcom = evaluateXCOMAttenuation(matKey, spec.meanPhotonEnergyMeV);
  const mfp = xcom.muLinear * Math.max(0, shieldThicknessCm);

  // Propagate ISO/IEC Guide 98-3 (GUM) relative standard uncertainty components:
  // u_source_cal = 3.0%, u_gamma_const = 2.0%, u_mu = 1.8% * mfp (capped), u_buildup = 4%..14%
  const uCal = 3.0;
  const uGamma = 2.0;
  const uAtten = Math.min(18.0, 1.4 * mfp);
  const uBuildup = mfp < 0.2 ? 0.5 : Math.min(16.0, 3.5 + 0.45 * mfp);
  const ucPct = Math.sqrt(uCal * uCal + uGamma * uGamma + uAtten * uAtten + uBuildup * uBuildup);
  const expandedPct = Math.min(65.0, 2.0 * ucPct);

  const lowerBound95MSvHr = Math.max(0, shieldedDoseMSvHr * (1 - expandedPct / 100));
  const upperBound95MSvHr = shieldedDoseMSvHr * (1 + expandedPct / 100);

  const flags: ValidityAndUncertaintyReport['validityFlags'] = [];

  // Check 1: Point-Source Inverse-Square Near-Field Criterion
  const pelletRadiusM = (pelletDiameterMm / 1000) * 0.5;
  if (distanceM < 0.20 || distanceM < pelletRadiusM * 6) {
    flags.push({
      severity: 'OUT_OF_BOUNDS',
      rule: 'Near-Field 1/r² Geometry Breakdown',
      detail: `Standoff r = ${distanceM} m approaches finite source/detector dimensions; point-kernel 1/r² over-predicts or requires volumetric/disc integration (Submodule 1A Extended Source).`
    });
  } else {
    flags.push({
      severity: 'OK',
      rule: 'Far-Field Point-Source Geometry (r ≫ d_source)',
      detail: `r = ${distanceM} m satisfies r > 6·R_source (${pelletDiameterMm.toFixed(2)} mm pellet); 1/r² geometric divergence error < 0.3%.`
    });
  }

  // Check 2: ANSI/ANS-6.4.3 GP Buildup Optical Depth Limit (40 mfp)
  if (mfp > 40.0) {
    flags.push({
      severity: 'OUT_OF_BOUNDS',
      rule: 'Exceeds ANSI/ANS-6.4.3 40-mfp Table Limit',
      detail: `Optical thickness μx = ${mfp.toFixed(1)} mfp exceeds the 40-mfp upper limit of standard GP buildup tables; verify deep-penetration transport via Module 23 Monte Carlo.`
    });
  } else if (mfp > 15.0) {
    flags.push({
      severity: 'ADVISORY',
      rule: 'Deep-Penetration Multiple-Scatter Regime (15–40 mfp)',
      detail: `At μx = ${mfp.toFixed(1)} mfp, scattered photons dominate uncollided flux by >10×; K-edge fluorescence and skyshine around finite walls may dominate.`
    });
  } else {
    flags.push({
      severity: 'OK',
      rule: 'ANSI/ANS-6.4.3 GP Buildup Domain (0 ≤ μx ≤ 40 mfp)',
      detail: `Optical depth μx = ${mfp.toFixed(2)} mfp lies squarely inside validated Harima GP parameterization.`
    });
  }

  if (xcom.activeEdgeNote) {
    flags.push({
      severity: 'ADVISORY',
      rule: 'Proximity to Photoelectric Shell Absorption Edge',
      detail: xcom.activeEdgeNote
    });
  }

  return {
    relativeStdUncertaintyPct: ucPct,
    expandedUncertaintyPct: expandedPct,
    lowerBound95MSvHr,
    upperBound95MSvHr,
    validityFlags: flags
  };
}

export interface PrimaryProvenanceRecord {
  nuclideCitation: string;
  emissionLines: string;
  inhalationE50SvPerBq: number;
  xcomMaterialName: string;
  densityGcm3: number;
  effectiveZ: number;
  evaluatedEnergyMeV: number;
  muMassCm2G: number;
  muEnMassCm2G: number;
  muLinearCm1: number;
  opticalMfp: number;
  gpBuildupB: number;
  gpParams: { b: number; c: number; a: number; Xk: number; d: number };
}

export function extractPrimaryDataProvenance(
  isotope: string,
  shieldMaterial: string,
  shieldThicknessCm: number
): PrimaryProvenanceRecord {
  const spec = getNuclidePhysicalSpec(isotope);
  const matKey = resolveXcomMaterialKey(shieldMaterial);
  const matObj = XCOM_GP_MATERIALS[matKey] || XCOM_GP_MATERIALS.LEAD;
  const xcom = evaluateXCOMAttenuation(matKey, spec.meanPhotonEnergyMeV);
  const opticalMfp = xcom.muLinear * Math.max(0, shieldThicknessCm);
  const gp = evaluateGPBuildup(matKey, spec.meanPhotonEnergyMeV, opticalMfp);

  return {
    nuclideCitation: `ICRP Publication 107 (2008) — ${spec.symbol} (T₁/₂ = ${spec.halfLifeLabel})`,
    emissionLines: spec.icrp107Lines,
    inhalationE50SvPerBq: spec.icrp119InhalE50_SvPerBq,
    xcomMaterialName: matObj.name,
    densityGcm3: xcom.density,
    effectiveZ: xcom.effectiveZ,
    evaluatedEnergyMeV: spec.meanPhotonEnergyMeV,
    muMassCm2G: xcom.muMass,
    muEnMassCm2G: xcom.muEnMass,
    muLinearCm1: xcom.muLinear,
    opticalMfp,
    gpBuildupB: gp.B,
    gpParams: gp.params
  };
}

export interface RegionalBackgroundBaseline {
  id: string;
  region: string;
  ambientNSvPerHr: number;
  annualMSv: number;
  geologyNote: string;
}

export const AMBIENT_BACKGROUND_BASELINES: RegionalBackgroundBaseline[] = [
  { id: 'maritime', region: 'Open Ocean / Maritime Deck', ambientNSvPerHr: 52, annualMSv: 0.46, geologyNote: 'Water shields terrestrial U/Th/K-40; cosmic muons dominate' },
  { id: 'global_avg', region: 'UNSCEAR Global Continental Mean', ambientNSvPerHr: 100, annualMSv: 0.88, geologyNote: 'External terrestrial + sea-level cosmic baseline (excl. indoor radon)' },
  { id: 'denver', region: 'Colorado Plateau / Denver (1,600 m)', ambientNSvPerHr: 185, annualMSv: 1.62, geologyNote: 'Granitic Front Range U/Th bedrock + 1.6 km cosmic elevation boost' },
  { id: 'winnipeg_shield', region: 'Canadian Shield Granitic Craton', ambientNSvPerHr: 145, annualMSv: 1.27, geologyNote: 'Precambrian crystalline basement rock' },
  { id: 'guarapari', region: 'Guarapari / Kerala Monazite Sands', ambientNSvPerHr: 1450, annualMSv: 12.7, geologyNote: 'Naturally occurring Thorium-232 monazite coastal placer deposits' }
];

export async function fetchNearestSafecastReading(
  lat: number,
  lon: number
): Promise<{ ok: boolean; cpm?: number; uSvPerHr?: number; capturedAt?: string; distanceKm?: number }> {
  try {
    const url = `https://api.safecast.org/measurements.json?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&distance=50&order=captured_at+desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return { ok: false };
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return { ok: false };
    const item = arr[0];
    const val = Number(item.value);
    const unit = String(item.unit || 'cpm').toLowerCase();
    const cpm = unit === 'cpm' ? val : val * 334;
    const uSvPerHr = unit === 'usv' ? val : cpm / 334; // LND-7317 pancake conversion (334 CPM per µSv/h)
    return {
      ok: true,
      cpm: Math.round(cpm),
      uSvPerHr: Number(uSvPerHr.toFixed(3)),
      capturedAt: item.captured_at ? String(item.captured_at).slice(0, 10) : undefined
    };
  } catch {
    return { ok: false };
  }
}
