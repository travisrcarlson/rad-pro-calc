/**
 * Generalized Decay DAG, Radiochemical Generator Elution ("Milking"),
 * Neutron Activation + Post-EOB Cooling, and Alpha/Beta/Gamma Modality Power Engine
 *
 * Standards & References:
 * - Bateman, H. (1910), Proc. Cambridge Philos. Soc. 15, 423-427.
 * - Knoll, G.F. (2010), "Radiation Detection and Measurement", 4th Ed.
 * - ICRP Publication 107 (2008), "Nuclear Decay Data for Dosimetric Calculations".
 * - IAEA-TECDOC-1065 (1999), "Production Technologies for Molybdenum-99 and Technetium-99m".
 * - USP <823> / Ph. Eur. Mo-99 Breakthrough Limit (<= 0.15 uCi Mo-99 per mCi Tc-99m).
 */

export interface DecayBranchEdge {
  fromNuclide: string;
  toNuclide: string;
  branchFraction: number; // 0..1 (e.g., 0.879 for Mo-99 -> Tc-99m)
  modeLabel: string;      // e.g., "β⁻ (87.9%)" or "α (35.94%)"
  qMeV: number;
  modality: 'alpha' | 'beta' | 'gamma_it' | 'ec_positron';
}

export interface ChainNuclideNode {
  nuclide: string;
  symbol: string;
  Z: number;
  N: number;
  halfLifeLabel: string;
  halfLifeSeconds: number;
  lambda: number; // s^-1 (0 if stable)
  primaryMode: string;
  qAlphaMeV: number;
  qBetaMeV: number;
  qGammaOrEcMeV: number;
  principalGammaMeV: number;
  gammaYieldPct: number;
  specificGammaConstUSvM2PerGBqHr: number;
  generation: number;
  branchLane: number; // 0 = main spine, 1 = parallel split branch
}

export interface GeneratorElutionEvent {
  elutionIndex: number;
  timeSeconds: number;
  timeDisplay: number;
  harvestedActivityMBq: number;
  harvestedActivityMCi: number;
  residualColumnDaughterMBq: number;
  parentActivityAtElutionMBq: number;
  breakthroughRatioUciPerMci: number;
  uspPass: boolean;
}

export interface ReactorActivationPreset {
  id: string;
  label: string;
  targetIsotope: string;
  targetMassNumber: number;
  naturalAbundancePct: number;
  defaultEnrichmentPct: number;
  thermalCrossSectionBarns: number;
  burnupCrossSectionBarns: number;
  producedParentNuclide: string;
  defaultTargetMassGrams: number;
  defaultFluxNcm2s: number;
  defaultIrradiationHours: number;
  defaultCoolingHours: number;
  description: string;
}

export const REACTOR_ACTIVATION_PRESETS: ReactorActivationPreset[] = [
  {
    id: 'mo98_mo99',
    label: 'Mo-98(n,γ)Mo-99 → Tc-99m',
    targetIsotope: 'Mo-98',
    targetMassNumber: 98,
    naturalAbundancePct: 24.13,
    defaultEnrichmentPct: 98.0,
    thermalCrossSectionBarns: 0.13,
    burnupCrossSectionBarns: 0.0,
    producedParentNuclide: 'Mo-99',
    defaultTargetMassGrams: 10.0,
    defaultFluxNcm2s: 1.5e14,
    defaultIrradiationHours: 120,
    defaultCoolingHours: 120,
    description: 'Enriched Mo-98 target irradiated in high-flux research reactor to produce Mo-99/Tc-99m medical generator parent.'
  },
  {
    id: 'co59_co60',
    label: 'Co-59(n,γ)Co-60 → Ni-60',
    targetIsotope: 'Co-59',
    targetMassNumber: 59,
    naturalAbundancePct: 100.0,
    defaultEnrichmentPct: 100.0,
    thermalCrossSectionBarns: 37.18,
    burnupCrossSectionBarns: 2.0,
    producedParentNuclide: 'Co-60',
    defaultTargetMassGrams: 5.0,
    defaultFluxNcm2s: 1.0e14,
    defaultIrradiationHours: 8760, // 1 year
    defaultCoolingHours: 8760 * 5,
    description: 'Monoisotopic Cobalt-59 slug irradiation for high-specific-activity Co-60 teletherapy and industrial sterilization.'
  },
  {
    id: 'lu176_lu177',
    label: 'Lu-176(n,γ)Lu-177 → Hf-177',
    targetIsotope: 'Lu-176',
    targetMassNumber: 176,
    naturalAbundancePct: 2.59,
    defaultEnrichmentPct: 82.0,
    thermalCrossSectionBarns: 2090.0,
    burnupCrossSectionBarns: 2.8,
    producedParentNuclide: 'Lu-177',
    defaultTargetMassGrams: 0.05,
    defaultFluxNcm2s: 2.0e14,
    defaultIrradiationHours: 168, // 7 days
    defaultCoolingHours: 240,
    description: 'Ultra-high thermal cross-section (2,090 b) carrier-added Lu-177 production for PSMA/DOTATATE radioligand therapy.'
  },
  {
    id: 'ir191_ir192',
    label: 'Ir-191(n,γ)Ir-192 → Pt-192',
    targetIsotope: 'Ir-191',
    targetMassNumber: 191,
    naturalAbundancePct: 37.3,
    defaultEnrichmentPct: 37.3,
    thermalCrossSectionBarns: 954.0,
    burnupCrossSectionBarns: 1100.0,
    producedParentNuclide: 'Ir-192',
    defaultTargetMassGrams: 1.0,
    defaultFluxNcm2s: 1.2e14,
    defaultIrradiationHours: 720, // 30 days
    defaultCoolingHours: 2160,
    description: 'Industrial NDT gamma radiography & HDR brachytherapy pellet activation with significant Ir-192(n,γ)Ir-193 burnup.'
  },
  {
    id: 'au197_au198',
    label: 'Au-197(n,γ)Au-198 → Hg-198',
    targetIsotope: 'Au-197',
    targetMassNumber: 197,
    naturalAbundancePct: 100.0,
    defaultEnrichmentPct: 100.0,
    thermalCrossSectionBarns: 98.65,
    burnupCrossSectionBarns: 25100.0,
    producedParentNuclide: 'Au-198',
    defaultTargetMassGrams: 0.2,
    defaultFluxNcm2s: 5.0e13,
    defaultIrradiationHours: 48,
    defaultCoolingHours: 120,
    description: 'Gold-foil activation dosimetry standard (98.65 b) with intense Au-198(n,γ)Au-199 secondary burnup (25,100 b).'
  }
];

/**
 * Curated Bifurcating & Metastable Decay DAG Overrides for high-precision physics
 * Captures both parallel α/β⁻ branching (e.g., Bi-212 -> Po-212 [64.06%] + Tl-208 [35.94%] -> Pb-208)
 * and metastable isomer splits (e.g., Mo-99 -> Tc-99m [87.9%] + Tc-99 [12.1%]).
 */
export interface CuratedBranchSpec {
  daughters: {
    nuclide: string;
    branchFraction: number;
    modeLabel: string;
    qMeV: number;
    modality: 'alpha' | 'beta' | 'gamma_it' | 'ec_positron';
    laneOffset?: number;
  }[];
}

export const CURATED_BRANCHING_SPLITS: Record<string, CuratedBranchSpec> = {
  'Mo-99': {
    daughters: [
      { nuclide: 'Tc-99m', branchFraction: 0.879, modeLabel: 'β⁻ (87.9%)', qMeV: 1.214, modality: 'beta', laneOffset: 0 },
      { nuclide: 'Tc-99', branchFraction: 0.121, modeLabel: 'β⁻ Direct (12.1%)', qMeV: 1.357, modality: 'beta', laneOffset: 1 }
    ]
  },
  'Tc-99m': {
    daughters: [
      { nuclide: 'Tc-99', branchFraction: 1.0, modeLabel: 'IT γ (140.5 keV)', qMeV: 0.1427, modality: 'gamma_it', laneOffset: 0 }
    ]
  },
  'Cs-137': {
    daughters: [
      { nuclide: 'Ba-137m', branchFraction: 0.944, modeLabel: 'β⁻ (94.4%)', qMeV: 0.514, modality: 'beta', laneOffset: 0 },
      { nuclide: 'Ba-137', branchFraction: 0.056, modeLabel: 'β⁻ Direct (5.6%)', qMeV: 1.176, modality: 'beta', laneOffset: 1 }
    ]
  },
  'Ba-137m': {
    daughters: [
      { nuclide: 'Ba-137', branchFraction: 1.0, modeLabel: 'IT γ (661.7 keV)', qMeV: 0.6617, modality: 'gamma_it', laneOffset: 0 }
    ]
  },
  'Th-234': {
    daughters: [
      { nuclide: 'Pa-234m', branchFraction: 0.9984, modeLabel: 'β⁻ (99.84%)', qMeV: 0.199, modality: 'beta', laneOffset: 0 },
      { nuclide: 'Pa-234', branchFraction: 0.0016, modeLabel: 'IT/β⁻ (0.16%)', qMeV: 0.273, modality: 'beta', laneOffset: 1 }
    ]
  },
  'Pa-234m': {
    daughters: [
      { nuclide: 'U-234', branchFraction: 1.0, modeLabel: 'β⁻ (2.27 MeV)', qMeV: 2.269, modality: 'beta', laneOffset: 0 }
    ]
  },
  'Bi-212': {
    daughters: [
      { nuclide: 'Po-212', branchFraction: 0.6406, modeLabel: 'β⁻ (64.06%)', qMeV: 2.252, modality: 'beta', laneOffset: 0 },
      { nuclide: 'Tl-208', branchFraction: 0.3594, modeLabel: 'α (35.94%)', qMeV: 6.207, modality: 'alpha', laneOffset: 1 }
    ]
  },
  'Po-212': {
    daughters: [
      { nuclide: 'Pb-208', branchFraction: 1.0, modeLabel: 'α (8.78 MeV)', qMeV: 8.954, modality: 'alpha', laneOffset: 0 }
    ]
  },
  'Tl-208': {
    daughters: [
      { nuclide: 'Pb-208', branchFraction: 1.0, modeLabel: 'β⁻ + 2.61 MeV γ', qMeV: 5.001, modality: 'beta', laneOffset: 0 }
    ]
  },
  'Bi-213': {
    daughters: [
      { nuclide: 'Po-213', branchFraction: 0.9791, modeLabel: 'β⁻ (97.91%)', qMeV: 1.423, modality: 'beta', laneOffset: 0 },
      { nuclide: 'Tl-209', branchFraction: 0.0209, modeLabel: 'α (2.09%)', qMeV: 5.988, modality: 'alpha', laneOffset: 1 }
    ]
  },
  'Po-213': {
    daughters: [
      { nuclide: 'Pb-209', branchFraction: 1.0, modeLabel: 'α (8.38 MeV)', qMeV: 8.536, modality: 'alpha', laneOffset: 0 }
    ]
  },
  'Tl-209': {
    daughters: [
      { nuclide: 'Pb-209', branchFraction: 1.0, modeLabel: 'β⁻ (100%)', qMeV: 3.970, modality: 'beta', laneOffset: 0 }
    ]
  }
};

/**
 * Solves a Generalized Directed Acyclic Decay Graph (DAG) with optional:
 * 1) Periodic Radiochemical Generator Elutions ("Milking" of Gen-1 Daughter)
 * 2) In-Core Neutron Activation Source Term (for 0 <= t <= t_EOB)
 *
 * Uses L-stable 2-stage TR-BDF2 lower-triangular DAG integration so arbitrarily
 * stiff chains (e.g., Po-212 299 ns + Th-232 14 Gy) and branching splits converge
 * with strict non-negativity and exact conservation of nuclei.
 */
export interface DecaySimulationConfig {
  nodes: ChainNuclideNode[];
  edges: DecayBranchEdge[];
  initialParentAtoms: number;
  maxTimeSeconds: number;
  currentTimeSeconds: number;
  // Generator Elution ("Milking") Mode
  elutionEnabled: boolean;
  elutionIntervalSeconds: number;
  elutionEfficiency: number; // 0..1 (e.g., 0.95)
  parentBreakthroughFraction: number; // e.g., 2e-5 (0.02 uCi/mCi)
  // Neutron Activation Mode
  activationEnabled: boolean;
  targetInitialAtoms: number;
  sigmaActCm2: number;
  sigmaBurnCm2: number;
  neutronFluxNcm2s: number;
  irradiationTimeSeconds: number; // EOB time
}

export interface NuclideStateAtTime {
  nuclide: string;
  atoms: number;
  atomFractionPct: number;
  activityBq: number;
  activityMBq: number;
  alphaPowerWatts: number;
  betaPowerWatts: number;
  gammaPowerWatts: number;
  totalHeatWatts: number;
}

export interface DecaySimulationResult {
  statesAtT: NuclideStateAtTime[];
  harvestedDaughterAtomsCumulative: number;
  harvestedDaughterVialAtomsCurrent: number;
  harvestedDaughterVialActivityMBq: number;
  elutionEvents: GeneratorElutionEvent[];
  timeGridSeconds: number[];
  seriesAtomsByNuclide: number[][];
  seriesActivityMBqByNuclide: number[][];
  seriesHarvestedVialMBq: number[];
  modalityPowerWatts: {
    alphaWatts: number;
    betaWatts: number;
    gammaWatts: number;
    totalWatts: number;
  };
  saturationActivityMBq?: number;
  eobActivityMBq?: number;
}

export function simulateGeneralizedDecayDAG(config: DecaySimulationConfig): DecaySimulationResult {
  const {
    nodes,
    edges,
    initialParentAtoms,
    maxTimeSeconds,
    currentTimeSeconds,
    elutionEnabled,
    elutionIntervalSeconds,
    elutionEfficiency,
    parentBreakthroughFraction,
    activationEnabled,
    targetInitialAtoms,
    sigmaActCm2,
    sigmaBurnCm2,
    neutronFluxNcm2s,
    irradiationTimeSeconds
  } = config;

  const m = nodes.length;
  if (m === 0) {
    return {
      statesAtT: [],
      harvestedDaughterAtomsCumulative: 0,
      harvestedDaughterVialAtomsCurrent: 0,
      harvestedDaughterVialActivityMBq: 0,
      elutionEvents: [],
      timeGridSeconds: [],
      seriesAtomsByNuclide: [],
      seriesActivityMBqByNuclide: [],
      seriesHarvestedVialMBq: [],
      modalityPowerWatts: { alphaWatts: 0, betaWatts: 0, gammaWatts: 0, totalWatts: 0 }
    };
  }

  const idxMap = new Map<string, number>();
  nodes.forEach((n, idx) => idxMap.set(n.nuclide, idx));

  // Build adjacency feed matrix B[toIdx][fromIdx] = branchFraction * lambda_from
  const feedLinks: { fromIdx: number; branchFraction: number }[][] = nodes.map(() => []);
  edges.forEach(e => {
    const u = idxMap.get(e.fromNuclide);
    const v = idxMap.get(e.toNuclide);
    if (u !== undefined && v !== undefined && v > u) {
      feedLinks[v].push({ fromIdx: u, branchFraction: e.branchFraction });
    }
  });

  const gamma = 2.0 - Math.SQRT2;
  const d1 = gamma / 2.0;
  const w1 = (1.0 - gamma) / (2.0 * (2.0 - gamma));
  const w2 = 1.0 / (2.0 * (2.0 - gamma));
  const d2 = (1.0 - gamma) / (2.0 - gamma);

  const stepInterval = (
    startAtoms: number[],
    tStart: number,
    tEnd: number,
    substeps: number
  ): number[] => {
    const dtTotal = tEnd - tStart;
    if (dtTotal <= 0) return [...startAtoms];
    let state = [...startAtoms];
    const dt = dtTotal / substeps;

    for (let s = 0; s < substeps; s++) {
      const tMid = tStart + (s + 0.5) * dt;
      const inCore = activationEnabled && tMid <= irradiationTimeSeconds;
      const prodRate0 = inCore
        ? sigmaActCm2 * neutronFluxNcm2s * targetInitialAtoms * Math.exp(-sigmaActCm2 * neutronFluxNcm2s * tMid)
        : 0;

      const effLambda = nodes.map((n, i) =>
        i === 0 && inCore ? n.lambda + sigmaBurnCm2 * neutronFluxNcm2s : n.lambda
      );

      const solveLowerTriangular = (rhs: number[], alphaDt: number, source0: number): number[] => {
        const out = new Array(m).fill(0);
        for (let i = 0; i < m; i++) {
          let feed = i === 0 ? alphaDt * source0 : 0;
          for (const link of feedLinks[i]) {
            feed += alphaDt * link.branchFraction * nodes[link.fromIdx].lambda * out[link.fromIdx];
          }
          const diag = 1.0 + alphaDt * effLambda[i];
          out[i] = Math.max(0, (rhs[i] + feed) / diag);
        }
        return out;
      };

      // Stage 1: Trapezoidal step
      const rhs1 = new Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        let feed = i === 0 ? prodRate0 : 0;
        for (const link of feedLinks[i]) {
          feed += link.branchFraction * nodes[link.fromIdx].lambda * state[link.fromIdx];
        }
        const deriv = feed - effLambda[i] * state[i];
        rhs1[i] = Math.max(0, state[i] + d1 * dt * deriv);
      }
      const stateGamma = solveLowerTriangular(rhs1, d1 * dt, prodRate0);

      // Stage 2: BDF2 step
      const rhs2 = new Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        rhs2[i] = Math.max(0, w2 * stateGamma[i] - w1 * state[i]);
      }
      state = solveLowerTriangular(rhs2, d2 * dt, prodRate0);

      // If closed decay system (no neutron activation & no elution removal), conserve exact total atoms
      if (!activationEnabled && !elutionEnabled) {
        const sumA = state.reduce((a, b) => a + b, 0);
        if (sumA > 0) {
          const scale = initialParentAtoms / sumA;
          for (let i = 0; i < m; i++) state[i] *= scale;
        }
      }
    }
    return state;
  };

  // Build time grid including exact elution points and currentTimeSeconds
  const baseSteps = 120;
  const rawTimes = new Set<number>([0, Math.min(maxTimeSeconds, Math.max(0, currentTimeSeconds)), maxTimeSeconds]);
  for (let k = 1; k <= baseSteps; k++) {
    rawTimes.add((maxTimeSeconds * k) / baseSteps);
  }

  const elutionTimes = new Set<number>();
  if (elutionEnabled && elutionIntervalSeconds > 0 && m >= 2) {
    for (
      let tEl = elutionIntervalSeconds;
      tEl <= maxTimeSeconds + 1e-6;
      tEl += elutionIntervalSeconds
    ) {
      const clampedT = Number(tEl.toFixed(4));
      if (clampedT > 0 && clampedT <= maxTimeSeconds) {
        elutionTimes.add(clampedT);
        rawTimes.add(Math.max(0, clampedT - 1e-3)); // Pre-elution peak
        rawTimes.add(clampedT);                     // Post-elution trough
      }
    }
  }

  if (activationEnabled && irradiationTimeSeconds > 0 && irradiationTimeSeconds <= maxTimeSeconds) {
    rawTimes.add(irradiationTimeSeconds);
  }

  const sortedTimes = Array.from(rawTimes).sort((a, b) => a - b);

  let currentAtoms = new Array(m).fill(0);
  currentAtoms[0] = activationEnabled ? 0 : initialParentAtoms;

  let harvestedCumulativeAtoms = 0;
  let harvestedVialAtoms = 0; // Decays with daughter lambda_1
  const daughterLambda = m >= 2 ? nodes[1].lambda : 0;

  let snapshotAtCurrentT: number[] = [...currentAtoms];
  let harvestedVialAtCurrentT = 0;
  let harvestedCumAtCurrentT = 0;

  const seriesAtomsByNuclide: number[][] = nodes.map(() => [currentAtoms[0]]);
  for (let i = 1; i < m; i++) seriesAtomsByNuclide[i][0] = 0;
  const seriesActivityMBqByNuclide: number[][] = nodes.map((n, i) => [(currentAtoms[i] * n.lambda) / 1e6]);
  const seriesHarvestedVialMBq: number[] = [0];
  const timeGridSeconds: number[] = [0];
  const elutionEvents: GeneratorElutionEvent[] = [];

  let prevT = 0;
  let eluteCount = 0;

  for (let idx = 1; idx < sortedTimes.length; idx++) {
    const nextT = sortedTimes[idx];
    const dt = nextT - prevT;
    if (dt > 0) {
      currentAtoms = stepInterval(currentAtoms, prevT, nextT, 6);
      if (daughterLambda > 0 && harvestedVialAtoms > 0) {
        harvestedVialAtoms *= Math.exp(-daughterLambda * dt);
      }
    }

    // Check if an elution ("Milking") occurs at nextT
    if (elutionTimes.has(nextT) && m >= 2) {
      eluteCount += 1;
      const preDaughterAtoms = currentAtoms[1];
      const strippedAtoms = preDaughterAtoms * elutionEfficiency;
      currentAtoms[1] = preDaughterAtoms - strippedAtoms;
      harvestedCumulativeAtoms += strippedAtoms;
      harvestedVialAtoms += strippedAtoms;

      const harvestedMBq = (strippedAtoms * daughterLambda) / 1e6;
      const harvestedMCi = harvestedMBq / 37.0;
      const residualMBq = (currentAtoms[1] * daughterLambda) / 1e6;
      const parentMBq = (currentAtoms[0] * nodes[0].lambda) / 1e6;
      const breakthroughUciPerMci = parentBreakthroughFraction * 1000.0 * (parentMBq / Math.max(1e-6, harvestedMBq));

      elutionEvents.push({
        elutionIndex: eluteCount,
        timeSeconds: nextT,
        timeDisplay: nextT,
        harvestedActivityMBq: harvestedMBq,
        harvestedActivityMCi: harvestedMCi,
        residualColumnDaughterMBq: residualMBq,
        parentActivityAtElutionMBq: parentMBq,
        breakthroughRatioUciPerMci: breakthroughUciPerMci,
        uspPass: breakthroughUciPerMci <= 0.15
      });
    }

    timeGridSeconds.push(nextT);
    for (let i = 0; i < m; i++) {
      seriesAtomsByNuclide[i].push(currentAtoms[i]);
      seriesActivityMBqByNuclide[i].push((currentAtoms[i] * nodes[i].lambda) / 1e6);
    }
    seriesHarvestedVialMBq.push((harvestedVialAtoms * daughterLambda) / 1e6);

    if (Math.abs(nextT - currentTimeSeconds) < 1e-5 || (prevT < currentTimeSeconds && nextT >= currentTimeSeconds)) {
      snapshotAtCurrentT = [...currentAtoms];
      harvestedVialAtCurrentT = harvestedVialAtoms;
      harvestedCumAtCurrentT = harvestedCumulativeAtoms;
    }

    prevT = nextT;
  }

  if (currentTimeSeconds <= 0) {
    snapshotAtCurrentT = new Array(m).fill(0);
    snapshotAtCurrentT[0] = activationEnabled ? 0 : initialParentAtoms;
    harvestedVialAtCurrentT = 0;
    harvestedCumAtCurrentT = 0;
  }

  const totalCurrentAtoms =
    snapshotAtCurrentT.reduce((a, b) => a + b, 0) +
    (elutionEnabled ? harvestedCumAtCurrentT : 0) || 1;

  let totalAlphaW = 0;
  let totalBetaW = 0;
  let totalGammaW = 0;

  const statesAtT: NuclideStateAtTime[] = nodes.map((n, i) => {
    const atoms = snapshotAtCurrentT[i];
    const activityBq = atoms * n.lambda;
    const activityMBq = activityBq / 1e6;

    // Partition emitted power into Alpha, Beta, and Gamma/IT/EC modalities
    const alphaMeV = n.qAlphaMeV;
    const betaMeV = n.qBetaMeV * 0.40; // Average beta kinetic energy ~ 0.40 * Q_beta (Fermi spectrum)
    const gammaMeV =
      n.principalGammaMeV > 0
        ? n.principalGammaMeV * (n.gammaYieldPct / 100)
        : n.qGammaOrEcMeV > 0
        ? n.qGammaOrEcMeV
        : n.qBetaMeV * 0.25;

    const alphaPowerWatts = activityBq * alphaMeV * 1.60217663e-13;
    const betaPowerWatts = activityBq * betaMeV * 1.60217663e-13;
    const gammaPowerWatts = activityBq * gammaMeV * 1.60217663e-13;
    const totalHeatWatts = alphaPowerWatts + betaPowerWatts + gammaPowerWatts;

    totalAlphaW += alphaPowerWatts;
    totalBetaW += betaPowerWatts;
    totalGammaW += gammaPowerWatts;

    return {
      nuclide: n.nuclide,
      atoms,
      atomFractionPct: (atoms / totalCurrentAtoms) * 100,
      activityBq,
      activityMBq,
      alphaPowerWatts,
      betaPowerWatts,
      gammaPowerWatts,
      totalHeatWatts
    };
  });

  // Compute saturation & EOB activity if activation mode is active
  let saturationActivityMBq: number | undefined;
  let eobActivityMBq: number | undefined;
  if (activationEnabled) {
    const rSatBq = sigmaActCm2 * neutronFluxNcm2s * targetInitialAtoms;
    saturationActivityMBq = rSatBq / 1e6;
    const lEff = nodes[0].lambda + sigmaBurnCm2 * neutronFluxNcm2s;
    eobActivityMBq = (rSatBq * (1 - Math.exp(-lEff * irradiationTimeSeconds))) / 1e6;
  }

  return {
    statesAtT,
    harvestedDaughterAtomsCumulative: harvestedCumAtCurrentT,
    harvestedDaughterVialAtomsCurrent: harvestedVialAtCurrentT,
    harvestedDaughterVialActivityMBq: (harvestedVialAtCurrentT * daughterLambda) / 1e6,
    elutionEvents,
    timeGridSeconds,
    seriesAtomsByNuclide,
    seriesActivityMBqByNuclide,
    seriesHarvestedVialMBq,
    modalityPowerWatts: {
      alphaWatts: totalAlphaW,
      betaWatts: totalBetaW,
      gammaWatts: totalGammaW,
      totalWatts: totalAlphaW + totalBetaW + totalGammaW
    },
    saturationActivityMBq,
    eobActivityMBq
  };
}
