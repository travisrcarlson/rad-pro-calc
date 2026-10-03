// Civil Radiation Protection Monte Carlo Micro-Kernel
// Simulates photon transport through shielding slabs (Photoelectric, Klein-Nishina Compton, Pair Production)

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
  density: number; // g/cm^3
  Z: number;
  A: number;
}

const MATERIALS: Record<string, MaterialData> = {
  lead: { name: 'Lead (Pb)', density: 11.34, Z: 82, A: 207.2 },
  iron: { name: 'Carbon Steel / Iron (Fe)', density: 7.87, Z: 26, A: 55.85 },
  concrete: { name: 'NIST Standard Concrete', density: 2.30, Z: 11, A: 22.0 },
  water: { name: 'Water / Tissue Eq.', density: 1.00, Z: 7.42, A: 14.8 },
  tungsten: { name: 'Tungsten (W)', density: 19.25, Z: 74, A: 183.84 },
  poly: { name: 'Borated Polyethylene', density: 0.95, Z: 5.3, A: 10.6 }
};

// Classical electron radius squared in cm^2 (r_0^2 = (2.8179e-13 cm)^2 = 7.9408e-26 cm^2)
const R0_SQ = 7.9408e-26;
const AVOGADRO = 6.02214076e23;
const ELECTRON_MASS_MEV = 0.51099895;

/**
 * Total Klein-Nishina cross section per electron in cm^2
 */
function kleinNishinaTotal(alpha: number): number {
  if (alpha < 0.001) {
    // Thomson limit
    return (8 * Math.PI / 3) * R0_SQ * (1 - 2 * alpha + 5.2 * alpha * alpha);
  }
  const term1 = (1 + alpha) / (alpha * alpha);
  const term2 = (2 * (1 + alpha)) / (1 + 2 * alpha) - Math.log(1 + 2 * alpha) / alpha;
  const term3 = Math.log(1 + 2 * alpha) / (2 * alpha);
  const term4 = (1 + 3 * alpha) / Math.pow(1 + 2 * alpha, 2);
  return 2 * Math.PI * R0_SQ * (term1 * term2 + term3 - term4);
}

/**
 * Parametrized macroscopic cross sections (linear attenuation in cm^-1)
 */
function getLinearCrossSections(materialId: string, E: number): { mu_pe: number; mu_inc: number; mu_pp: number; mu_tot: number } {
  const mat = MATERIALS[materialId] || MATERIALS.lead;
  const alpha = E / ELECTRON_MASS_MEV;
  const electronsPerCm3 = (mat.density * AVOGADRO * mat.Z) / mat.A;

  // 1. Incoherent (Compton) scattering linear coefficient (cm^-1)
  const sigma_e = kleinNishinaTotal(alpha);
  const mu_inc = sigma_e * electronsPerCm3;

  // 2. Photoelectric absorption linear coefficient (cm^-1)
  // Empirical parametrization matching NIST XCOM scaling: ~ Z^4.2 / E^3.1
  let peScaling = 3.2e-31 * Math.pow(mat.Z, 4.3) * (mat.density * AVOGADRO / mat.A);
  // K-edge correction for heavy elements (Lead K-edge = 88.0 keV)
  if (mat.Z >= 50 && E < 0.088) {
    peScaling *= 0.18; // below K-edge
  }
  const mu_pe = Math.max(1e-6, peScaling / Math.pow(E, 3.05 + 0.1 * Math.log10(E + 0.01)));

  // 3. Pair production linear coefficient (cm^-1) (threshold 1.022 MeV)
  let mu_pp = 0;
  if (E > 2 * ELECTRON_MASS_MEV) {
    const delta = (E - 2 * ELECTRON_MASS_MEV) / E;
    const ppScaling = 4.8e-28 * Math.pow(mat.Z, 2.05) * (mat.density * AVOGADRO / mat.A);
    mu_pp = ppScaling * Math.log(2 * E / ELECTRON_MASS_MEV) * Math.pow(delta, 1.1);
  }

  const mu_tot = mu_pe + mu_inc + mu_pp;
  return { mu_pe, mu_inc, mu_pp, mu_tot };
}

/**
 * Sample Compton scattering polar angle theta using Kahn's rejection method
 */
function sampleComptonAngle(alpha: number): number {
  if (alpha < 0.01) {
    // Low energy Thomson dipole distribution: ~ 1 + cos^2(theta)
    const costh = 2 * Math.random() - 1;
    return Math.acos(Math.max(-1, Math.min(1, costh)));
  }

  // Kahn's rejection algorithm for Klein-Nishina distribution
  const alpha1 = 1 + 2 * alpha;
  const alpha2 = alpha1 / (alpha1 + 2);

  while (true) {
    let eta: number;
    if (Math.random() < alpha2) {
      const r1 = Math.random();
      eta = 1 + 2 * alpha * r1;
    } else {
      const r1 = Math.random();
      eta = alpha1 / (1 + 2 * alpha * r1);
    }

    const costh = 1 - (eta - 1) / alpha;
    if (costh < -1 || costh > 1) continue;

    const test = (1 + costh * costh) / (1 + Math.pow(1 / eta, 2));

    if (Math.random() <= test / 2) {
      return Math.acos(costh);
    }
  }
}

/**
 * Execute Monte Carlo Photon Simulation
 */
export function runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResult {
  const startTime = performance.now();
  const { materialId, thickness_cm, initialEnergy_MeV, histories, sampleTracksCount = 60 } = config;

  let uncollidedCount = 0;
  let scatteredCount = 0;
  let absorbedCount = 0;
  let backscatteredCount = 0;
  let totalTransmittedEnergy = 0;

  const numBins = 40;
  const binWidth = initialEnergy_MeV / numBins;
  const spectrumBins = Array.from({ length: numBins }, (_, i) => ({
    energy_MeV: (i + 0.5) * binWidth,
    count: 0
  }));

  const sampleTracks: PhotonTrack[] = [];
  const initialCross = getLinearCrossSections(materialId, initialEnergy_MeV);

  for (let h = 0; h < histories; h++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let ux = 1.0;
    let uy = 0.0;
    let uz = 0.0;
    let E = initialEnergy_MeV;
    let scatCount = 0;
    let status: PhotonTrack['status'] = 'absorbed';

    const trackPoints: PhotonPoint[] = [{ x: 0, y: 0, energy: E }];
    const recordTrack = h < sampleTracksCount;

    while (true) {
      const { mu_pe, mu_pp, mu_tot } = getLinearCrossSections(materialId, E);

      // Sample flight distance
      const s = -Math.log(Math.max(1e-12, Math.random())) / mu_tot;

      x += s * ux;
      y += s * uy;
      z += s * uz;

      // Check boundary conditions
      if (x > thickness_cm) {
        // Transmitted through front face
        const s_to_boundary = (thickness_cm - (x - s * ux)) / ux;
        const x_exit = thickness_cm;
        const y_exit = (y - s * uy) + s_to_boundary * uy;
        if (recordTrack) trackPoints.push({ x: x_exit, y: y_exit, energy: E });

        if (scatCount === 0) {
          uncollidedCount++;
          status = 'transmitted_uncollided';
        } else {
          scatteredCount++;
          status = 'transmitted_scattered';
        }

        totalTransmittedEnergy += E;
        const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor(E / binWidth)));
        spectrumBins[binIdx].count++;
        break;
      }

      if (x < 0) {
        // Backscattered out of entry face
        if (recordTrack) trackPoints.push({ x: 0, y, energy: E });
        backscatteredCount++;
        status = 'backscattered';
        break;
      }

      if (recordTrack) {
        trackPoints.push({ x, y, energy: E });
      }

      // Interaction inside slab: sample collision type
      const r_coll = Math.random() * mu_tot;
      if (r_coll < mu_pe) {
        // Photoelectric absorption
        absorbedCount++;
        status = 'absorbed';
        break;
      } else if (r_coll < mu_pe + mu_pp) {
        // Pair production: photon vanishes, 2 x 0.511 MeV annihilation photons produced
        scatCount++;
        E = ELECTRON_MASS_MEV; // Track 1st annihilation photon
        // Isotropic direction
        const costh = 2 * Math.random() - 1;
        const sinth = Math.sqrt(Math.max(0, 1 - costh * costh));
        const phi = 2 * Math.PI * Math.random();
        ux = sinth * Math.cos(phi);
        uy = sinth * Math.sin(phi);
        uz = costh;
      } else {
        // Compton Incoherent Scatter
        scatCount++;
        const alpha = E / ELECTRON_MASS_MEV;
        const theta = sampleComptonAngle(alpha);
        const phi = 2 * Math.PI * Math.random();

        // Energy after scatter
        E = E / (1 + alpha * (1 - Math.cos(theta)));

        // Cutoff low energy photons (absorbed locally if < 15 keV)
        if (E < 0.015) {
          absorbedCount++;
          status = 'absorbed';
          break;
        }

        // New direction vector relative to previous (ux, uy, uz)
        const costh = Math.cos(theta);
        const sinth = Math.sin(theta);
        const cosphi = Math.cos(phi);
        const sinphi = Math.sin(phi);

        if (Math.abs(ux) > 0.999) {
          ux = costh * Math.sign(ux);
          uy = sinth * cosphi;
          uz = sinth * sinphi;
        } else {
          const denom = Math.sqrt(1 - ux * ux);
          const ux_new = costh * ux + sinth * sinphi * denom;
          const uy_new = costh * uy + (sinth / denom) * (cosphi * uz - sinphi * ux * uy);
          const uz_new = costh * uz - (sinth / denom) * (cosphi * uy + sinphi * ux * uz);
          ux = ux_new;
          uy = uy_new;
          uz = uz_new;
        }

        // Normalize
        const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        ux /= len;
        uy /= len;
        uz /= len;
      }
    }

    if (recordTrack) {
      sampleTracks.push({ points: trackPoints, status });
    }
  }

  const transmittedCount = uncollidedCount + scatteredCount;
  const transmissionFraction = transmittedCount / histories;
  const uncollidedFraction = uncollidedCount / histories;
  const analyticalNarrowBeam = Math.exp(-initialCross.mu_tot * thickness_cm);
  const buildupFactor = uncollidedFraction > 0 ? transmissionFraction / uncollidedFraction : 1.0;
  const backscatterFraction = backscatteredCount / histories;
  const energyAbsorptionFraction = absorbedCount / histories;
  const meanTransmittedEnergy_MeV = transmittedCount > 0 ? totalTransmittedEnergy / transmittedCount : 0;
  const executionTimeMs = performance.now() - startTime;

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
    executionTimeMs,
    linearAttenTotal_per_cm: initialCross.mu_tot
  };
}

// Support WebWorker onmessage execution if loaded in worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<MonteCarloConfig>) => {
    const result = runMonteCarloSimulation(event.data);
    self.postMessage(result);
  };
}
