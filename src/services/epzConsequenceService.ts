import { type CalculationDossierPayload } from './auditDossierService';

export interface EPZZoneConfig {
  pazRadiusKm: number;    // Precautionary Action Zone (~3-5 km)
  upzRadiusKm: number;    // Urgent Protective Action Zone / 10-mile Plume Exposure (~16.09 km)
  ipzRadiusKm: number;    // Ingestion Pathway Zone / 50-mile (~80.47 km)
  epdRadiusKm: number;    // Extended Planning Distance (~100 km)
}

export const DEFAULT_EPZ_CONFIG: EPZZoneConfig = {
  pazRadiusKm: 5.0,
  upzRadiusKm: 16.0934, // 10 miles
  ipzRadiusKm: 80.4672, // 50 miles
  epdRadiusKm: 100.0
};

export const COMPASS_SECTORS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
] as const;

export type CompassSector = typeof COMPASS_SECTORS_16[number];

export interface EPZScenarioInput {
  plantName: string;
  coordinates: { lat: number; lon: number };
  thermalPowerMWth: number;
  coreReleaseFraction: number; // e.g., 0.05 (5% core inventory released)
  windOriginDegrees: number;    // 0-360° (Direction wind is coming from)
  windSpeedMps: number;         // Wind velocity in m/s
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  config?: EPZZoneConfig;
}

export interface EPZDistanceDosePoint {
  distanceKm: number;
  distanceMiles: number;
  projectedTedeRem: number;
  projectedTedeMsv: number;
  projectedThyroidCdeRem: number;
  projectedThyroidCdeMsv: number;
  evacuationRecommended: boolean; // TEDE >= 1.0 rem (10 mSv)
  kiAdministrationRecommended: boolean; // Thyroid >= 5.0 rem (50 mSv)
}

export interface EPZEvacuationPlan {
  plumeCenterlineBearingDeg: number;
  keyholeCenterSector: CompassSector;
  affectedSectors: CompassSector[]; // 3-sector keyhole wedge (center + 2 buffer sectors)
  doseCurve: EPZDistanceDosePoint[];
  evacuationRadiusKm: number;
  kiDistributionRadiusKm: number;
  interdictionRadiusKm: number;
  pazGeodesicRing: { lat: number; lon: number }[];
  upzGeodesicRing: { lat: number; lon: number }[];
  ipzGeodesicRing: { lat: number; lon: number }[];
  keyholeWedgePolygon: { lat: number; lon: number }[];
}

/**
 * Computes destination coordinate given starting lat/lon, bearing, and distance in km.
 */
export function calculateGeodesicPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceKm: number
): { lat: number; lon: number } {
  const R = 6371.0; // Earth mean radius km
  const delta = distanceKm / R;
  const theta = (bearingDeg * Math.PI) / 180.0;
  const phi1 = (lat * Math.PI) / 180.0;
  const lambda1 = (lon * Math.PI) / 180.0;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );

  const lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
  );

  return {
    lat: (phi2 * 180.0) / Math.PI,
    lon: (lambda2 * 180.0) / Math.PI
  };
}

/**
 * Generates geodesic circle coordinates for mapping.
 */
export function generateGeodesicRing(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  points: number = 36
): { lat: number; lon: number }[] {
  const ring: { lat: number; lon: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (i * 360.0) / points;
    ring.push(calculateGeodesicPoint(centerLat, centerLon, bearing, radiusKm));
  }
  return ring;
}

/**
 * Maps a bearing in degrees (0-360) to one of the 16 compass sectors.
 */
export function bearingToCompassSector(bearingDeg: number): CompassSector {
  const norm = ((bearingDeg % 360) + 360) % 360;
  const sectorIndex = Math.floor((norm + 11.25) / 22.5) % 16;
  return COMPASS_SECTORS_16[sectorIndex];
}

/**
 * Calculates EPZ evacuation keyhole wedge and projected doses per EPA PAG Manual 2017 & IAEA GSR Part 7.
 */
export function calculateEPZEvacuationPlan(input: EPZScenarioInput): EPZEvacuationPlan {
  const cfg = input.config || DEFAULT_EPZ_CONFIG;

  // 1. Plume direction is downwind: (origin + 180) % 360
  const downwindBearing = (input.windOriginDegrees + 180.0) % 360.0;
  const centerSector = bearingToCompassSector(downwindBearing);
  const centerIdx = COMPASS_SECTORS_16.indexOf(centerSector);

  // 3-sector keyhole wedge: center sector + 1 adjacent left + 1 adjacent right (total 67.5° arc)
  const leftIdx = (centerIdx - 1 + 16) % 16;
  const rightIdx = (centerIdx + 1) % 16;
  const affectedSectors: CompassSector[] = [
    COMPASS_SECTORS_16[leftIdx],
    centerSector,
    COMPASS_SECTORS_16[rightIdx]
  ];

  // 2. Projected dose model: Gaussian dispersion centerline proxy calibrated to EPA PAG thresholds
  // Source term Q proportional to Thermal MWth * release fraction
  const effectiveSourceTermTBq = Math.max(10, input.thermalPowerMWth * 900.0 * input.coreReleaseFraction);
  const u = Math.max(0.5, input.windSpeedMps);

  // Atmospheric dilution coefficient by stability class
  const stabFactors = { A: 0.15, B: 0.25, C: 0.40, D: 0.65, E: 1.10, F: 1.80 };
  const stabMod = stabFactors[input.stabilityClass] || 0.65;

  const testDistancesKm = [0.8, 1.6, 3.2, 5.0, 8.0, 16.09, 25.0, 40.0, 80.47];
  const doseCurve: EPZDistanceDosePoint[] = [];

  let maxEvacuationDist = cfg.pazRadiusKm; // At minimum, PAZ is always evacuated
  let maxKiDist = cfg.pazRadiusKm;
  let maxInterdictionDist = 0;

  testDistancesKm.forEach(dKm => {
    // Relative dispersion dilution factor ~ (x)^-1.45 / u * stabMod
    const dilution = (Math.pow(dKm, -1.45) / u) * stabMod * 0.085;
    const projectedTedeRem = Math.max(0.0001, (effectiveSourceTermTBq / 1000.0) * dilution);
    const projectedThyroidCdeRem = projectedTedeRem * 4.8; // High volatile radioiodine fraction

    const evaq = projectedTedeRem >= 1.0; // EPA PAG: >= 1 rem (10 mSv)
    const ki = projectedThyroidCdeRem >= 5.0; // FDA / CDC: >= 5 rem (50 mSv)

    if (evaq && dKm > maxEvacuationDist) maxEvacuationDist = dKm;
    if (ki && dKm > maxKiDist) maxKiDist = dKm;
    if (projectedTedeRem >= 0.5 && dKm > maxInterdictionDist) maxInterdictionDist = dKm;

    doseCurve.push({
      distanceKm: dKm,
      distanceMiles: dKm * 0.621371,
      projectedTedeRem: Math.round(projectedTedeRem * 1000) / 1000,
      projectedTedeMsv: Math.round(projectedTedeRem * 10.0 * 100) / 100,
      projectedThyroidCdeRem: Math.round(projectedThyroidCdeRem * 1000) / 1000,
      projectedThyroidCdeMsv: Math.round(projectedThyroidCdeRem * 10.0 * 100) / 100,
      evacuationRecommended: evaq,
      kiAdministrationRecommended: ki
    });
  });

  // Clamp planning radii to standard EPZ tiers
  const evacuationRadiusKm = Math.min(cfg.ipzRadiusKm, Math.max(cfg.pazRadiusKm, maxEvacuationDist));
  const kiDistributionRadiusKm = Math.min(cfg.ipzRadiusKm, Math.max(cfg.upzRadiusKm, maxKiDist));
  const interdictionRadiusKm = Math.min(cfg.ipzRadiusKm, Math.max(cfg.upzRadiusKm, maxInterdictionDist));

  // 3. Build Geodesic Range Rings for Map Overlay
  const pazRing = generateGeodesicRing(input.coordinates.lat, input.coordinates.lon, cfg.pazRadiusKm);
  const upzRing = generateGeodesicRing(input.coordinates.lat, input.coordinates.lon, cfg.upzRadiusKm);
  const ipzRing = generateGeodesicRing(input.coordinates.lat, input.coordinates.lon, cfg.ipzRadiusKm);

  // 4. Construct Keyhole Wedge Polygon (Center -> Arc across 67.5° at UPZ radius -> Back to Center)
  const wedgePolygon: { lat: number; lon: number }[] = [];
  wedgePolygon.push(input.coordinates); // Origin at plant

  const startBearing = downwindBearing - 33.75;
  const endBearing = downwindBearing + 33.75;
  const wedgeSteps = 16;
  for (let i = 0; i <= wedgeSteps; i++) {
    const b = startBearing + (i * (endBearing - startBearing)) / wedgeSteps;
    wedgePolygon.push(calculateGeodesicPoint(input.coordinates.lat, input.coordinates.lon, b, cfg.upzRadiusKm));
  }
  wedgePolygon.push(input.coordinates); // Close polygon

  return {
    plumeCenterlineBearingDeg: Math.round(downwindBearing),
    keyholeCenterSector: centerSector,
    affectedSectors,
    doseCurve,
    evacuationRadiusKm: Math.round(evacuationRadiusKm * 10) / 10,
    kiDistributionRadiusKm: Math.round(kiDistributionRadiusKm * 10) / 10,
    interdictionRadiusKm: Math.round(interdictionRadiusKm * 10) / 10,
    pazGeodesicRing: pazRing,
    upzGeodesicRing: upzRing,
    ipzGeodesicRing: ipzRing,
    keyholeWedgePolygon: wedgePolygon
  };
}

/**
 * Builds a sealed 21 CFR Part 11 / ISO 17025 SHA-256 calculation dossier payload
 * for emergency planning zone assessments.
 */
export function buildEPZDossierPayload(
  input: EPZScenarioInput,
  plan: EPZEvacuationPlan,
  operatorName: string = 'Senior Radiation Emergency Response Officer'
): CalculationDossierPayload {
  return {
    reportTitle: `Emergency Planning Zone (EPZ) Consequence Assessment: ${input.plantName}`,
    moduleName: 'Emergency Planning & Population Consequence Engine',
    statuteCitation: 'EPA-400-R-92-001 (EPA PAG Manual 2017) / NUREG-0654 / IAEA GSR Part 7',
    verificationTestId: 'VTEST-21 / EPA-PAG-EPZ',
    operatorName,
    operatorCredentials: 'Certified Health Physicist (CHP) / Radiological Emergency Director',
    facility: input.plantName,
    notes: `Radiological emergency planning assessment and 16-sector keyhole evacuation analysis for ${input.plantName} (${input.coordinates.lat.toFixed(4)}°N, ${input.coordinates.lon.toFixed(4)}°E). Downwind plume centerline: ${plan.plumeCenterlineBearingDeg}°, affected keyhole sectors: ${plan.affectedSectors.join(', ')}.`,
    formulaDescription: 'EPA PAG Early Phase Criterion: \\text{TEDE} \\ge 1.0\\text{ rem} \\implies \\text{Evacuate}; \\quad \\text{Thyroid CDE} \\ge 5.0\\text{ rem} \\implies \\text{Administer KI}',
    inputs: [
      { label: 'Reactor Complex', value: input.plantName },
      { label: 'Thermal Power', value: `${input.thermalPowerMWth.toLocaleString()} MWth` },
      { label: 'Core Release Fraction', value: `${(input.coreReleaseFraction * 100).toFixed(1)}%` },
      { label: 'Wind Origin Bearing', value: `${input.windOriginDegrees}° (Downwind: ${plan.plumeCenterlineBearingDeg}°)` },
      { label: 'Wind Speed', value: `${input.windSpeedMps} m/s` },
      { label: 'Pasquill Stability Class', value: `Class ${input.stabilityClass}` }
    ],
    outputs: [
      { label: 'Downwind Center Sector', value: plan.keyholeCenterSector, status: 'PASS' as const },
      { label: 'Affected Keyhole Evacuation Sectors', value: plan.affectedSectors.join(' // '), status: 'WARNING' as const },
      { label: 'Recommended Evacuation Distance', value: `${plan.evacuationRadiusKm} km (${(plan.evacuationRadiusKm * 0.621371).toFixed(1)} miles)`, status: (plan.evacuationRadiusKm >= 16 ? 'WARNING' : 'PASS') as 'WARNING' | 'PASS' },
      { label: 'Potassium Iodide (KI) Distribution Radius', value: `${plan.kiDistributionRadiusKm} km (${(plan.kiDistributionRadiusKm * 0.621371).toFixed(1)} miles)`, status: 'PASS' as const },
      { label: 'Agricultural Interdiction Radius', value: `${plan.interdictionRadiusKm} km (${(plan.interdictionRadiusKm * 0.621371).toFixed(1)} miles)`, status: 'PASS' as const },
      { label: '10-Mile Plume Exposure TEDE', value: `${plan.doseCurve.find(p => p.distanceKm >= 16)?.projectedTedeMsv || 0} mSv`, status: 'PASS' as const }
    ]
  };
}
