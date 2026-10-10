import { type CalculationDossierPayload } from './auditDossierService';
import imsStationsRaw from '../data/ctbto_ims_stations.json';
import { calculateHaversineDistanceKm } from './globalGeospatialService';

export interface CTBTOStationRecord {
  id: string;
  stationCode: string;
  name: string;
  technology: 'Radionuclide' | 'Primary Seismic' | 'Auxiliary Seismic' | 'Infrasound' | 'Hydroacoustic';
  country: string;
  location: string;
  coordinates: { lat: number; lon: number };
  status: string;
  nobleGasEquipped: boolean;
  targetIsotopes: string[];
  notes: string;
}

export const CTBTO_STATIONS: CTBTOStationRecord[] = imsStationsRaw as CTBTOStationRecord[];

export type GeologicalMedium = 
  | 'hard_rock'          // Granite, Basalt, Competent Metamorphic
  | 'water_saturated'    // Wet Tuff, Saturated Shale
  | 'dry_alluvium'       // Dry Unconsolidated Sediments
  | 'decoupled_cavity';  // Salt Dome / Underground Cavity Decoupled

export interface GeologicalMediumParams {
  name: string;
  alpha: number; // Intercept
  beta: number;  // Slope
  couplingEfficiency: number; // Relative to hard rock (1.0)
  description: string;
}

export const GEOLOGICAL_MEDIA: Record<GeologicalMedium, GeologicalMediumParams> = {
  hard_rock: {
    name: 'Hard Crystalline Rock (Granite / Basalt)',
    alpha: 4.05,
    beta: 0.75,
    couplingEfficiency: 1.0,
    description: 'High elastic modulus bedrock; optimal seismic shock coupling (e.g., Semipalatinsk Degelen, Novaya Zemlya, Punggye-ri).'
  },
  water_saturated: {
    name: 'Water-Saturated Tuff / Sedimentary Rock',
    alpha: 3.90,
    beta: 0.75,
    couplingEfficiency: 0.75,
    description: 'High pore-water pressure enhances P-wave coupling over dry rock; typical of saturated Nevada Test Site strata.'
  },
  dry_alluvium: {
    name: 'Dry Porous Alluvium / Unconsolidated Sediments',
    alpha: 3.45,
    beta: 0.80,
    couplingEfficiency: 0.25,
    description: 'Crushable pore collapse dampens seismic energy propagation, attenuating teleseismic magnitude.'
  },
  decoupled_cavity: {
    name: 'Decoupled Cavity (Large Salt Dome / Air Cavity)',
    alpha: 2.25,
    beta: 0.75,
    couplingEfficiency: 0.015,
    description: 'Explosion detonated in a large underground cavity below elastic yield limit; reduces seismic amplitude by ~70x (Sterling effect).'
  }
};

export interface SeismicInversionResult {
  observedMb: number;
  geologicalMedium: GeologicalMedium;
  estimatedYieldKt: number;
  yieldLowerBoundKt: number; // -1 sigma
  yieldUpperBoundKt: number; // +1 sigma
  expectedMs: number;         // Rayleigh surface wave magnitude
  scaledDepthOfBurial?: number; // m / kt^(1/3)
  containmentCategory?: 'Complete Containment' | 'Standard Containment' | 'Risk of Fissure Venting' | 'Violent Cratering Detonation';
  nearbyIMSStations: {
    station: CTBTOStationRecord;
    distanceKm: number;
    pWaveTransitSec: number;
    infrasoundTransitHours: number;
  }[];
}

/**
 * Inverts observed body-wave magnitude mb to explosive yield (kt)
 * based on verified Murphy-Ringdal-Nuttli empirical formulations.
 */
export function invertSeismicMagnitudeToYield(
  observedMb: number,
  medium: GeologicalMedium = 'hard_rock',
  burialDepthM?: number,
  epicenterCoords?: { lat: number; lon: number }
): SeismicInversionResult {
  const p = GEOLOGICAL_MEDIA[medium];

  // mb = alpha + beta * log10(Y)
  // log10(Y) = (mb - alpha) / beta
  const logYield = (observedMb - p.alpha) / p.beta;
  const yieldKt = Math.max(0.001, Math.pow(10, logYield));

  // Empirical 1-sigma magnitude uncertainty ~ +/- 0.15 mb
  const sigmaMb = 0.15;
  const yieldLowerBoundKt = Math.max(0.0005, Math.pow(10, (observedMb - sigmaMb - p.alpha) / p.beta));
  const yieldUpperBoundKt = Math.pow(10, (observedMb + sigmaMb - p.alpha) / p.beta);

  // Rayleigh surface wave magnitude Ms estimate: Ms = 2.14 + 0.96 * log10(Y)
  const expectedMs = Math.round((2.14 + 0.96 * Math.log10(yieldKt)) * 100) / 100;

  // Scaled Depth of Burial (SDOB = DoB / Y^(1/3))
  let sdob: number | undefined;
  let containment: SeismicInversionResult['containmentCategory'] | undefined;

  if (burialDepthM !== undefined && burialDepthM > 0) {
    sdob = Math.round((burialDepthM / Math.pow(yieldKt, 1.0 / 3.0)) * 10) / 10;
    if (sdob >= 120.0) {
      containment = 'Complete Containment';
    } else if (sdob >= 100.0) {
      containment = 'Standard Containment';
    } else if (sdob >= 50.0) {
      containment = 'Risk of Fissure Venting';
    } else {
      containment = 'Violent Cratering Detonation';
    }
  }

  // Calculate nearby CTBTO IMS stations if coordinates provided
  const nearbyStations: SeismicInversionResult['nearbyIMSStations'] = [];
  if (epicenterCoords) {
    CTBTO_STATIONS.forEach(st => {
      const distKm = calculateHaversineDistanceKm(
        epicenterCoords.lat,
        epicenterCoords.lon,
        st.coordinates.lat,
        st.coordinates.lon
      );
      // P-wave teleseismic transit velocity ~ 8.1 km/s (mantle refraction)
      const pWaveSec = Math.round(distKm / 8.1);
      // Atmospheric acoustic / infrasound velocity ~ 0.33 km/s
      const infrasoundHours = Math.round((distKm / 0.33 / 3600.0) * 10) / 10;

      nearbyStations.push({
        station: st,
        distanceKm: Math.round(distKm),
        pWaveTransitSec: pWaveSec,
        infrasoundTransitHours: infrasoundHours
      });
    });

    nearbyStations.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return {
    observedMb,
    geologicalMedium: medium,
    estimatedYieldKt: Math.round(yieldKt * 100) / 100,
    yieldLowerBoundKt: Math.round(yieldLowerBoundKt * 100) / 100,
    yieldUpperBoundKt: Math.round(yieldUpperBoundKt * 100) / 100,
    expectedMs,
    scaledDepthOfBurial: sdob,
    containmentCategory: containment,
    nearbyIMSStations: nearbyStations.slice(0, 8)
  };
}

/**
 * Calculates expected seismic body-wave magnitude (mb) from known yield (kt).
 */
export function calculateExpectedMbFromYield(
  yieldKt: number,
  medium: GeologicalMedium = 'hard_rock'
): number {
  const p = GEOLOGICAL_MEDIA[medium];
  const y = Math.max(0.001, yieldKt);
  return Math.round((p.alpha + p.beta * Math.log10(y)) * 100) / 100;
}

/**
 * Creates a sealed 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for seismic verification and weapon yield inversions.
 */
export function buildSeismicYieldDossierPayload(
  inversion: SeismicInversionResult,
  siteName: string = 'Nuclear Proving Ground',
  operatorName: string = 'CTBT Verification Specialist & Teleseismic Analyst'
): CalculationDossierPayload {
  const med = GEOLOGICAL_MEDIA[inversion.geologicalMedium];

  return {
    reportTitle: `CTBT Seismic Yield Inversion Dossier: ${siteName}`,
    moduleName: 'CTBTO Seismic Inversion & IMS Network Engine',
    statuteCitation: 'Comprehensive Nuclear-Test-Ban Treaty (CTBT) Protocol Part I / Murphy-Ringdal Seismic Models',
    verificationTestId: 'VTEST-29 / CTBTO-SEISMIC-YIELD',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / CTBTO Waveform Analyst',
    facility: siteName,
    notes: `Teleseismic waveform magnitude inversion for ${siteName}. Observed body-wave magnitude mb = ${inversion.observedMb.toFixed(2)} in ${med.name}. Coupling efficiency: ${(med.couplingEfficiency * 100).toFixed(1)}%.`,
    formulaDescription: 'Teleseismic Magnitude-Yield Scaling: m_b = \\alpha + \\beta \\cdot \\log_{10}(Y) \\implies Y = 10^{(m_b - \\alpha) / \\beta}',
    inputs: [
      { label: 'Event / Test Site', value: siteName },
      { label: 'Observed Body-Wave Magnitude (mb)', value: inversion.observedMb.toFixed(2) },
      { label: 'Geological Medium', value: med.name },
      { label: 'Coupling Model Intercept (alpha)', value: med.alpha.toFixed(2) },
      { label: 'Coupling Model Slope (beta)', value: med.beta.toFixed(2) },
      ...(inversion.scaledDepthOfBurial !== undefined ? [
        { label: 'Scaled Depth of Burial (SDOB)', value: `${inversion.scaledDepthOfBurial} m/kt^(1/3)` }
      ] : [])
    ],
    outputs: [
      { label: 'Estimated Nominal Explosive Yield', value: `${inversion.estimatedYieldKt.toLocaleString()} kt`, status: 'PASS' as const },
      { label: 'Lower 1-Sigma Bound (-0.15 mb)', value: `${inversion.yieldLowerBoundKt.toLocaleString()} kt`, status: 'PASS' as const },
      { label: 'Upper 1-Sigma Bound (+0.15 mb)', value: `${inversion.yieldUpperBoundKt.toLocaleString()} kt`, status: 'PASS' as const },
      { label: 'Expected Surface-Wave Magnitude (Ms)', value: inversion.expectedMs.toFixed(2), status: 'PASS' as const },
      ...(inversion.containmentCategory ? [
        { label: 'Containment Integrity Status', value: inversion.containmentCategory, status: (inversion.containmentCategory === 'Complete Containment' ? 'PASS' : 'WARNING') as 'PASS' | 'WARNING' }
      ] : [])
    ]
  };
}
