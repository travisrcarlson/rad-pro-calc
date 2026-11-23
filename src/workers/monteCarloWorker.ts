// Civil Radiation Protection Monte Carlo Micro-Kernel
// Simulates coupled photon transport through shielding slabs:
//   - Calibrated to NIST XCOM total linear attenuation coefficients μ_tot(E) (including exact element K-edges: Pb 88.005 keV, W 69.525 keV)
//   - Klein-Nishina incoherent Compton scatter (Kahn / Butcher-Messel rejection + exact 1 + cos²θ Rayleigh/Thomson sampling)
//   - Pair production (E > 1.022 MeV) tracking BOTH opposing 0.511 MeV annihilation photons via secondary stack + local kinetic energy deposition (E - 1.022 MeV)
//   - True slab energy deposition tally (Compton recoil electrons + photoelectric + pair kinetic) and energy-fluence buildup factor

import { evaluateXCOMAttenuation } from '../utils/xcomAndGpBuildup.ts';

export interface MonteCarloConfig {
  materialId: 'lead' | 'concrete' | 'iron' | 'water' | 'tungsten' | 'poly';
  thickness_cm: number;
  initialEnergy_MeV: number;
  histories: number;
  sampleTracksCount?: number;
}

export interface PhotonPoint {
  x: number; // cm (along slab normal, 0 to thickness)
  y: number; // cm (transverse)
  energy: number; // MeV
}

export interface PhotonTrack {
  points: PhotonPoint[];
  status: 'transmitted_uncollided' | 'transmitted_scattered' | 'absorbed' | 'backscattered';
}

export interface MonteCarloResult {
  histories: number;
  uncollidedCount: number;
  scatteredCount: number;
  transmittedCount: number;
  absorbedCount: number;
  backscatteredCount: number;
  transmissionFraction: number;
  uncollidedFraction: number;
  analyticalNarrowBeam: number;
  buildupFactor: number;
  backscatterFraction: number;
  energyAbsorptionFraction: number;
  meanTransmittedEnergy_MeV: number;
  spectrumBins: { energy_MeV: number; count: number }[];
  sampleTracks: PhotonTrack[];
  executionTimeMs: number;
  linearAttenTotal_per_cm: number;
}

interface MaterialData {
  name: string;
  xcomKey: string;
  density: number; // g/cm^3
  Z: number;
  A: number;
  kEdgeMeV: number; // Exact K-shell binding energy [MeV]
  kFluorescenceMeV: number; // Weighted K-alpha/beta fluorescence photon energy [MeV]
  kFluorescenceYield: number; // K-shell radiative fluorescence yield omega_K
}

const MATERIALS: Record<string, MaterialData> = {
  lead: { name: 'Lead (Pb)', xcomKey: 'LEAD', density: 11.34, Z: 82, A: 207.2, kEdgeMeV: 0.088005, kFluorescenceMeV: 0.0750, kFluorescenceYield: 0.968 },
  iron: { name: 'Carbon Steel / Iron (Fe)', xcomKey: 'STEEL', density: 7.87, Z: 26, A: 55.85, kEdgeMeV: 0.007112, kFluorescenceMeV: 0.0064, kFluorescenceYield: 0.351 },
  concrete: { name: 'NIST Standard Concrete', xcomKey: 'CONCRETE', density: 2.35, Z: 11, A: 22.0, kEdgeMeV: 0.001839, kFluorescenceMeV: 0.0, kFluorescenceYield: 0.0 },
  water: { name: 'Water / Tissue Eq.', xcomKey: 'WATER', density: 1.00, Z: 7.42, A: 14.8, kEdgeMeV: 0.000543, kFluorescenceMeV: 0.0, kFluorescenceYield: 0.0 },
  tungsten: { name: 'Tungsten (W)', xcomKey: 'TUNGSTEN', density: 19.30, Z: 74, A: 183.84, kEdgeMeV: 0.069525, kFluorescenceMeV: 0.0593, kFluorescenceYield: 0.955 },
  poly: { name: 'Borated Polyethylene (BPE)', xcomKey: 'BORATED_PE', density: 1.04, Z: 5.4, A: 10.6, kEdgeMeV: 0.000284, kFluorescenceMeV: 0.0, kFluorescenceYield: 0.0 }
};

const R0_SQ = 7.9407877e-26; // r_e^2 [cm^2]
const AVOGADRO = 6.02214076e23;
const ELECTRON_MASS_MEV = 0.51099895;

/**
 * Exact Klein-Nishina cross section per electron [cm²]
 */
function kleinNishinaTotal(alpha: number): number {
  if (alpha < 0.001) {
    return ((8.0 * Math.PI) / 3.0) * R0_SQ * (1.0 - 2.0 * alpha + 5.2 * alpha * alpha);
  }
  const term1 = (1.0 + alpha) / (alpha * alpha);
  const term2 = (2.0 * (1.0 + alpha)) / (1.0 + 2.0 * alpha) - Math.log(1.0 + 2.0 * alpha) / alpha;
  const term3 = Math.log(1.0 + 2.0 * alpha) / (2.0 * alpha);
  const term4 = (1.0 + 3.0 * alpha) / Math.pow(1.0 + 2.0 * alpha, 2);
  return 2.0 * Math.PI * R0_SQ * (term1 * term2 + term3 - term4);
}

/**
 * Macroscopic partial & total linear cross sections [cm⁻¹] anchored to NIST XCOM μ_tot(E).
 */
function getLinearCrossSections(
  materialId: string,
  E: number
): { mu_pe: number; mu_inc: number; mu_coh: number; mu_pp: number; mu_tot: number } {
  const mat = MATERIALS[materialId] || MATERIALS.lead;
  const eClamped = Math.max(0.015, E);
  const xcom = evaluateXCOMAttenuation(mat.xcomKey, eClamped);
  const mu_tot = Math.max(1e-5, xcom.muLinear);

  const alpha = eClamped / ELECTRON_MASS_MEV;
  const atomsPerCm3 = (mat.density * AVOGADRO) / mat.A;
  const electronsPerCm3 = atomsPerCm3 * mat.Z;

  // 1. Incoherent Klein-Nishina Compton linear coefficient
  const mu_inc_raw = kleinNishinaTotal(alpha) * electronsPerCm3;

  // 2. Coherent Rayleigh elastic scatter (~ Z^2.5 / E^1.85 at low E)
  const mu_coh_raw = 1.4e-27 * Math.pow(mat.Z, 2.5) * atomsPerCm3 / Math.pow(eClamped, 1.85);

  // 3. Pair + Triplet production above 2 * m_e * c^2 = 1.022 MeV
  let mu_pp_raw = 0;
  if (eClamped > 2.0 * ELECTRON_MASS_MEV) {
    const delta = (eClamped - 2.0 * ELECTRON_MASS_MEV) / eClamped;
    const ppScale = 5.1e-28 * mat.Z * (mat.Z + 1.0) * atomsPerCm3;
    mu_pp_raw = ppScale * Math.log((2.0 * eClamped) / ELECTRON_MASS_MEV) * Math.pow(delta, 1.12);
  }

  // 4. Photoelectric absorption reconciled so partial channels sum identically to NIST XCOM mu_tot
  //    (automatically preserving element-accurate K-edges: W = 69.525 keV, Pb = 88.005 keV)
  const nonPeRaw = mu_inc_raw + mu_coh_raw + mu_pp_raw;
  if (nonPeRaw < mu_tot) {
    const mu_pe = mu_tot - nonPeRaw;
    return { mu_pe, mu_inc: mu_inc_raw, mu_coh: mu_coh_raw, mu_pp: mu_pp_raw, mu_tot };
  }

  // Normalize partial channels if analytical sum slightly exceeds XCOM table at high energy
  let peFloor = 2.8e-31 * Math.pow(mat.Z, 4.3) * atomsPerCm3 / Math.pow(eClamped, 3.1);
  if (eClamped < mat.kEdgeMeV) peFloor *= 0.19;
  const sumRaw = nonPeRaw + peFloor;
  const scale = mu_tot / Math.max(1e-12, sumRaw);
  return {
    mu_pe: peFloor * scale,
    mu_inc: mu_inc_raw * scale,
    mu_coh: mu_coh_raw * scale,
    mu_pp: mu_pp_raw * scale,
    mu_tot
  };
}

/**
 * Sample Rayleigh / Thomson dipole angular distribution p(cos θ) = (3/8)(1 + cos²θ)
 */
function sampleDipoleAngle(): number {
  while (true) {
    const costh = 2.0 * Math.random() - 1.0;
    if (2.0 * Math.random() <= 1.0 + costh * costh) {
      return Math.acos(Math.max(-1.0, Math.min(1.0, costh)));
    }
  }
}

/**
 * Sample Compton scattering polar angle θ using Kahn's exact Klein-Nishina rejection method
 */
function sampleComptonAngle(alpha: number): number {
  if (alpha < 0.01) {
    return sampleDipoleAngle();
  }

  const alpha1 = 1.0 + 2.0 * alpha;
  const alpha2 = alpha1 / (alpha1 + 2.0);

  while (true) {
    let eta: number;
    if (Math.random() < alpha2) {
      eta = 1.0 + 2.0 * alpha * Math.random();
    } else {
      eta = alpha1 / (1.0 + 2.0 * alpha * Math.random());
    }

    const costh = 1.0 - (eta - 1.0) / alpha;
    if (costh < -1.0 || costh > 1.0) continue;

    const test = (1.0 + costh * costh) / (1.0 + 1.0 / (eta * eta));
    if (Math.random() <= 0.5 * test) {
      return Math.acos(costh);
    }
  }
}

function rotateDirection(
  ux: number,
  uy: number,
  uz: number,
  theta: number,
  phi: number
): [number, number, number] {
  const costh = Math.cos(theta);
  const sinth = Math.sin(theta);
  const cosphi = Math.cos(phi);
  const sinphi = Math.sin(phi);

  let nx: number;
  let ny: number;
  let nz: number;
  if (Math.abs(ux) > 0.9999) {
    nx = costh * Math.sign(ux);
    ny = sinth * cosphi;
    nz = sinth * sinphi;
  } else {
    const denom = Math.sqrt(Math.max(1e-12, 1.0 - ux * ux));
    nx = costh * ux + sinth * sinphi * denom;
    ny = costh * uy + (sinth / denom) * (cosphi * uz - sinphi * ux * uy);
    nz = costh * uz - (sinth / denom) * (cosphi * uy + sinphi * ux * uz);
  }
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
  return [nx / len, ny / len, nz / len];
}

interface PhotonState {
  x: number;
  y: number;
  z: number;
  ux: number;
  uy: number;
  uz: number;
  E: number;
  scatCount: number;
  isSecondary: boolean;
}

/**
 * Execute Coupled Photon + Positron-Annihilation Monte Carlo Slab Simulation
 */
export function runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { materialId, thickness_cm, initialEnergy_MeV, histories, sampleTracksCount = 60 } = config;
  const mat = MATERIALS[materialId] || MATERIALS.lead;

  let uncollidedCount = 0;
  let scatteredCount = 0;
  let absorbedCount = 0;
  let backscatteredCount = 0;
  let totalTransmittedEnergy = 0;
  let totalTransmittedAirKermaFluence = 0;
  let totalDepositedEnergy = 0;

  const numBins = 40;
  const maxBinEnergy = Math.max(0.02, initialEnergy_MeV * 1.0001);
  const binWidth = maxBinEnergy / numBins;
  const spectrumBins = Array.from({ length: numBins }, (_, i) => ({
    energy_MeV: (i + 0.5) * binWidth,
    count: 0
  }));

  const sampleTracks: PhotonTrack[] = [];
  const initialCross = getLinearCrossSections(materialId, initialEnergy_MeV);
  const initialAirMuEn = evaluateXCOMAttenuation('AIR', Math.max(0.015, initialEnergy_MeV)).muEnMass;
  const totalIncidentEnergy = Math.max(1e-12, histories * initialEnergy_MeV);

  for (let h = 0; h < histories; h++) {
    const recordTrack = h < sampleTracksCount;
    const primaryTrackPoints: PhotonPoint[] = [{ x: 0, y: 0, energy: initialEnergy_MeV }];
    let primaryStatus: PhotonTrack['status'] = 'absorbed';
    let historyAnyExitedForward = false;
    let historyAnyExitedBack = false;

    const stack: PhotonState[] = [
      {
        x: 0,
        y: 0,
        z: 0,
        ux: 1.0,
        uy: 0.0,
        uz: 0.0,
        E: initialEnergy_MeV,
        scatCount: 0,
        isSecondary: false
      }
    ];

    while (stack.length > 0) {
      const p = stack.pop()!;
      let { x, y, z, ux, uy, uz, E, scatCount } = p;
      const traceThis = recordTrack && !p.isSecondary;

      while (true) {
        const { mu_pe, mu_coh, mu_pp, mu_tot } = getLinearCrossSections(materialId, E);
        const s = -Math.log(Math.max(1e-12, Math.random())) / mu_tot;

        const prevX = x;
        const prevY = y;
        x += s * ux;
        y += s * uy;
        z += s * uz;

        // Forward exit face (x > thickness_cm)
        if (x > thickness_cm) {
          const sBound = ux > 1e-9 ? (thickness_cm - prevX) / ux : 0;
          const yExit = prevY + sBound * uy;
          if (traceThis) primaryTrackPoints.push({ x: thickness_cm, y: yExit, energy: E });

          if (!historyAnyExitedForward) {
            if (scatCount === 0 && !p.isSecondary) {
              uncollidedCount++;
              primaryStatus = 'transmitted_uncollided';
            } else {
              scatteredCount++;
              if (traceThis) primaryStatus = 'transmitted_scattered';
            }
            historyAnyExitedForward = true;
          } else if (recordTrack && primaryStatus === 'absorbed') {
            primaryStatus = 'transmitted_scattered';
          }

          totalTransmittedEnergy += E;
          const airMuEn = evaluateXCOMAttenuation('AIR', Math.max(0.015, E)).muEnMass;
          const scalarCosWeight = 1.0 / Math.max(0.05, Math.abs(ux));
          totalTransmittedAirKermaFluence += E * airMuEn * scalarCosWeight;
          const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor(E / binWidth)));
          spectrumBins[binIdx].count++;
          break;
        }

        // Entrance face backscatter (x < 0)
        if (x < 0) {
          const sBound = ux < -1e-9 ? -prevX / ux : 0;
          const yExit = prevY + sBound * uy;
          if (traceThis) {
            primaryTrackPoints.push({ x: 0, y: yExit, energy: E });
            primaryStatus = 'backscattered';
          }
          historyAnyExitedBack = true;
          break;
        }

        if (traceThis) {
          primaryTrackPoints.push({ x, y, energy: E });
        }

        // Sample interaction channel inside slab
        const rColl = Math.random() * mu_tot;
        if (rColl < mu_pe) {
          // Photoelectric absorption with High-Z K-shell fluorescence re-emission
          if (
            E > mat.kEdgeMeV &&
            mat.kFluorescenceMeV >= 0.015 &&
            Math.random() < mat.kFluorescenceYield * 0.80
          ) {
            totalDepositedEnergy += Math.max(0, E - mat.kFluorescenceMeV);
            const costh = 2.0 * Math.random() - 1.0;
            const sinth = Math.sqrt(Math.max(0, 1.0 - costh * costh));
            const phi = 2.0 * Math.PI * Math.random();
            stack.push({
              x,
              y,
              z,
              ux: sinth * Math.cos(phi),
              uy: sinth * Math.sin(phi),
              uz: costh,
              E: mat.kFluorescenceMeV,
              scatCount: scatCount + 1,
              isSecondary: true
            });
          } else {
            totalDepositedEnergy += E;
          }
          if (traceThis) primaryStatus = 'absorbed';
          break;
        } else if (rColl < mu_pe + mu_pp) {
          // Pair production: deposit kinetic energy (E - 1.022 MeV) locally & emit TWO collinear opposing 0.511 MeV photons
          totalDepositedEnergy += Math.max(0, E - 2.0 * ELECTRON_MASS_MEV);
          const costh = 2.0 * Math.random() - 1.0;
          const sinth = Math.sqrt(Math.max(0, 1.0 - costh * costh));
          const phi = 2.0 * Math.PI * Math.random();
          const ax = sinth * Math.cos(phi);
          const ay = sinth * Math.sin(phi);
          const az = costh;

          // Push opposing 2nd 0.511 MeV annihilation photon onto secondary stack
          stack.push({
            x,
            y,
            z,
            ux: -ax,
            uy: -ay,
            uz: -az,
            E: ELECTRON_MASS_MEV,
            scatCount: scatCount + 1,
            isSecondary: true
          });

          // Continue following 1st 0.511 MeV annihilation photon
          scatCount++;
          E = ELECTRON_MASS_MEV;
          ux = ax;
          uy = ay;
          uz = az;
        } else if (rColl < mu_pe + mu_pp + mu_coh) {
          // Coherent Rayleigh scatter: elastic (E' = E), dipole angular distribution
          scatCount++;
          const theta = sampleDipoleAngle();
          const phi = 2.0 * Math.PI * Math.random();
          [ux, uy, uz] = rotateDirection(ux, uy, uz, theta, phi);
        } else {
          // Incoherent Klein-Nishina Compton scatter
          scatCount++;
          const alpha = E / ELECTRON_MASS_MEV;
          const theta = sampleComptonAngle(alpha);
          const phi = 2.0 * Math.PI * Math.random();
          const eNew = E / (1.0 + alpha * (1.0 - Math.cos(theta)));

          // Deposit recoil Compton electron kinetic energy (E - E') locally
          totalDepositedEnergy += Math.max(0, E - eNew);
          E = eNew;

          if (E < 0.015) {
            totalDepositedEnergy += E;
            if (traceThis) primaryStatus = 'absorbed';
            break;
          }

          [ux, uy, uz] = rotateDirection(ux, uy, uz, theta, phi);
        }
      }
    }

    if (!historyAnyExitedForward) {
      if (historyAnyExitedBack) {
        backscatteredCount++;
      } else {
        absorbedCount++;
      }
    }

    if (recordTrack) {
      sampleTracks.push({ points: primaryTrackPoints, status: primaryStatus });
    }
  }

  const transmittedCount = Math.min(histories, uncollidedCount + scatteredCount);
  const transmissionFraction = Math.min(1.0, transmittedCount / histories);
  const uncollidedFraction = Math.min(1.0, uncollidedCount / histories);
  const analyticalNarrowBeam = Math.exp(-initialCross.mu_tot * thickness_cm);
  const uncollidedAirKerma = initialEnergy_MeV * initialAirMuEn * analyticalNarrowBeam;
  const mcAirKermaMean = totalTransmittedAirKermaFluence / Math.max(1, histories);
  const buildupFactor =
    uncollidedAirKerma > 1e-18
      ? Math.max(1.0, mcAirKermaMean / uncollidedAirKerma)
      : uncollidedFraction > 0
        ? Math.max(1.0, transmissionFraction / uncollidedFraction)
        : 1.0;
  const backscatterFraction = Math.min(1.0, backscatteredCount / histories);
  const energyAbsorptionFraction = Math.min(1.0, totalDepositedEnergy / totalIncidentEnergy);
  const meanTransmittedEnergy_MeV = transmittedCount > 0 ? totalTransmittedEnergy / transmittedCount : 0;
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    histories,
    uncollidedCount,
    scatteredCount,
    transmittedCount,
    absorbedCount,
    backscatteredCount,
    transmissionFraction,
    uncollidedFraction,
    analyticalNarrowBeam,
    buildupFactor,
    backscatterFraction,
    energyAbsorptionFraction,
    meanTransmittedEnergy_MeV,
    spectrumBins,
    sampleTracks,
    executionTimeMs: endTime - startTime,
    linearAttenTotal_per_cm: initialCross.mu_tot
  };
}

// Web Worker message handler
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<MonteCarloConfig>) => {
    const result = runMonteCarloSimulation(event.data);
    self.postMessage(result);
  };
}
