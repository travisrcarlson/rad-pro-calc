/**
 * Live Meteorological Telemetry (Open-Meteo API + Turner Pasquill-Gifford Stability Classifier)
 * & Topographic Elevation Transect / Line-of-Sight Terrain Ray-Shadowing Engine
 *
 * References:
 * - Turner, D.B. (1964), "A Diffusion Model for an Urban Area", J. Appl. Meteorol. 3, 83-91.
 * - US EPA-454/R-99-005 (2000), "Meteorological Monitoring Guidance for Regulatory Modeling Applications".
 * - Glasstone & Dolan (1977), "The Effects of Nuclear Weapons", Ch. IV & VII (Terrain Masking & Slope Reflection).
 */

export type PasquillClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface TurnerStabilityResult {
  stabilityClass: PasquillClass;
  insolationCategory: 'Strong Solar (>600 W/m²)' | 'Moderate Solar (300–600 W/m²)' | 'Slight Solar (50–300 W/m²)' | 'Overcast Neutral' | 'Night Cloudy (≥50%)' | 'Night Clear (<50%)';
  mixingHeightMeters: number;
  moninObukhovLengthM: number;
  rationale: string;
}

export interface LiveMeteorologySnapshot {
  siteName: string;
  latitude: number;
  longitude: number;
  timestampIso: string;
  sourceMode: 'LIVE_OPEN_METEO' | 'OFFLINE_CLIMATOLOGY';
  windSpeed10mMs: number;
  windSpeed80mMs: number;
  windDirectionDeg: number; // Meteorological direction wind is blowing FROM (deg)
  downwindBearingDeg: number; // Direction plume travels TOWARD ((windDirectionDeg + 180) % 360)
  temperatureC: number;
  surfacePressureHpa: number;
  cloudCoverPct: number;
  shortwaveSolarWm2: number;
  isDaytime: boolean;
  turner: TurnerStabilityResult;
}

export interface ReferenceMetSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  defaultWindMs: number;
  defaultWindDirDeg: number;
  defaultSolarWm2: number;
  defaultCloudPct: number;
}

export const REFERENCE_MET_SITES: ReferenceMetSite[] = [
  { id: 'ornl', name: 'Oak Ridge National Lab (ORNL, USA)', latitude: 35.9311, longitude: -84.3100, defaultWindMs: 2.8, defaultWindDirDeg: 235, defaultSolarWm2: 540, defaultCloudPct: 25 },
  { id: 'lanl', name: 'Los Alamos National Lab (LANL, Mesa)', latitude: 35.8441, longitude: -106.2872, defaultWindMs: 4.2, defaultWindDirDeg: 260, defaultSolarWm2: 720, defaultCloudPct: 10 },
  { id: 'zaporizhzhia', name: 'Zaporizhzhia NPP (Enerhodar)', latitude: 47.5122, longitude: 34.5858, defaultWindMs: 5.4, defaultWindDirDeg: 110, defaultSolarWm2: 380, defaultCloudPct: 60 },
  { id: 'fukushima', name: 'Fukushima Daiichi NPP (Okuma, Japan)', latitude: 37.4211, longitude: 141.0328, defaultWindMs: 4.8, defaultWindDirDeg: 310, defaultSolarWm2: 490, defaultCloudPct: 40 },
  { id: 'chernobyl', name: 'Chernobyl Exclusion Zone (Pripyat)', latitude: 51.3890, longitude: 30.0990, defaultWindMs: 3.1, defaultWindDirDeg: 145, defaultSolarWm2: 290, defaultCloudPct: 70 },
  { id: 'nts_sedan', name: 'Nevada National Security Site (Yucca Flat)', latitude: 37.1769, longitude: -116.0461, defaultWindMs: 3.6, defaultWindDirDeg: 210, defaultSolarWm2: 780, defaultCloudPct: 5 },
  { id: 'punggye', name: 'Mt. Mantap Proving Ground (High-Relief Terrain)', latitude: 41.2980, longitude: 129.0780, defaultWindMs: 4.5, defaultWindDirDeg: 285, defaultSolarWm2: 510, defaultCloudPct: 35 }
];

/**
 * Classifies Pasquill-Gifford atmospheric stability class (A-F) using the
 * Turner (1964) / EPA-454/R-99-005 solar insolation & wind speed matrix.
 */
export function classifyTurnerPasquillStability(
  windSpeed10mMs: number,
  shortwaveSolarWm2: number,
  cloudCoverPct: number,
  isDaytime: boolean
): TurnerStabilityResult {
  const u = Math.max(0.1, windSpeed10mMs);
  const clouds = Math.max(0, Math.min(100, cloudCoverPct));
  const solar = Math.max(0, shortwaveSolarWm2);

  // Wind speed column index: 0: <2 m/s, 1: 2-3 m/s, 2: 3-5 m/s, 3: 5-6 m/s, 4: >6 m/s
  const wIdx = u < 2.0 ? 0 : u < 3.0 ? 1 : u < 5.0 ? 2 : u < 6.0 ? 3 : 4;

  // Heavy overcast sky day or night forces Neutral Class D (Turner Rule)
  if (clouds >= 88) {
    return {
      stabilityClass: 'D',
      insolationCategory: 'Overcast Neutral',
      mixingHeightMeters: 850,
      moninObukhovLengthM: 9999,
      rationale: `Heavy cloud cover (${clouds.toFixed(0)}%) suppresses both solar convective heating and nocturnal radiative cooling → Class D (Neutral).`
    };
  }

  let stabilityClass: PasquillClass = 'D';
  let insolationCategory: TurnerStabilityResult['insolationCategory'] = 'Moderate Solar (300–600 W/m²)';

  if (isDaytime && solar >= 50) {
    if (solar > 600) {
      insolationCategory = 'Strong Solar (>600 W/m²)';
      const row: PasquillClass[] = ['A', 'A', 'B', 'C', 'C'];
      stabilityClass = row[wIdx];
    } else if (solar >= 300) {
      insolationCategory = 'Moderate Solar (300–600 W/m²)';
      const row: PasquillClass[] = ['A', 'B', 'B', 'C', 'D'];
      stabilityClass = row[wIdx];
    } else {
      insolationCategory = 'Slight Solar (50–300 W/m²)';
      const row: PasquillClass[] = ['B', 'C', 'C', 'D', 'D'];
      stabilityClass = row[wIdx];
    }
  } else {
    // Nighttime or twilight (<50 W/m²)
    if (clouds >= 50) {
      insolationCategory = 'Night Cloudy (≥50%)';
      const row: PasquillClass[] = ['E', 'E', 'D', 'D', 'D'];
      stabilityClass = row[wIdx];
    } else {
      insolationCategory = 'Night Clear (<50%)';
      const row: PasquillClass[] = ['F', 'F', 'E', 'D', 'D'];
      stabilityClass = row[wIdx];
    }
  }

  const mixingMap: Record<PasquillClass, number> = {
    A: 1800,
    B: 1400,
    C: 1050,
    D: 800,
    E: 350,
    F: 150
  };

  const moMap: Record<PasquillClass, number> = {
    A: -12,
    B: -28,
    C: -85,
    D: 9999,
    E: 65,
    F: 18
  };

  return {
    stabilityClass,
    insolationCategory,
    mixingHeightMeters: mixingMap[stabilityClass],
    moninObukhovLengthM: moMap[stabilityClass],
    rationale: `u₁₀ = ${u.toFixed(1)} m/s, Solar = ${solar.toFixed(0)} W/m², Clouds = ${clouds.toFixed(0)}% (${insolationCategory}) → Turner Class ${stabilityClass}.`
  };
}

/**
 * Fetches live meteorology from Open-Meteo for (latitude, longitude) and runs Turner classification.
 * Falls back gracefully to deterministic site climatology if offline.
 */
export async function fetchLiveSiteMeteorology(
  latitude: number,
  longitude: number,
  siteName = 'Custom Coordinates'
): Promise<LiveMeteorologySnapshot> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_speed_80m,is_day,shortwave_radiation&wind_speed_unit=ms`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data.current || {};

    const windSpeed10mMs = Math.max(0.5, Number(cur.wind_speed_10m ?? 3.2));
    const windSpeed80mMs = Math.max(0.5, Number(cur.wind_speed_80m ?? windSpeed10mMs * 1.35));
    const windDirectionDeg = Number(cur.wind_direction_10m ?? 240);
    const cloudCoverPct = Number(cur.cloud_cover ?? 30);
    const shortwaveSolarWm2 = Number(cur.shortwave_radiation ?? 450);
    const isDaytime = Number(cur.is_day ?? 1) === 1;
    const temperatureC = Number(cur.temperature_2m ?? 18.0);
    const surfacePressureHpa = Number(cur.surface_pressure ?? 1013.25);

    const turner = classifyTurnerPasquillStability(windSpeed10mMs, shortwaveSolarWm2, cloudCoverPct, isDaytime);

    return {
      siteName,
      latitude,
      longitude,
      timestampIso: new Date().toISOString(),
      sourceMode: 'LIVE_OPEN_METEO',
      windSpeed10mMs,
      windSpeed80mMs,
      windDirectionDeg,
      downwindBearingDeg: (windDirectionDeg + 180) % 360,
      temperatureC,
      surfacePressureHpa,
      cloudCoverPct,
      shortwaveSolarWm2,
      isDaytime,
      turner
    };
  } catch {
    // Offline fallback using closest preset or latitude-based climatology
    const preset = REFERENCE_MET_SITES.find(
      s => Math.abs(s.latitude - latitude) < 1.0 && Math.abs(s.longitude - longitude) < 1.0
    );
    const windSpeed10mMs = preset?.defaultWindMs ?? 3.4;
    const windDirectionDeg = preset?.defaultWindDirDeg ?? 245;
    const shortwaveSolarWm2 = preset?.defaultSolarWm2 ?? 480;
    const cloudCoverPct = preset?.defaultCloudPct ?? 35;
    const turner = classifyTurnerPasquillStability(windSpeed10mMs, shortwaveSolarWm2, cloudCoverPct, true);

    return {
      siteName,
      latitude,
      longitude,
      timestampIso: new Date().toISOString(),
      sourceMode: 'OFFLINE_CLIMATOLOGY',
      windSpeed10mMs,
      windSpeed80mMs: Number((windSpeed10mMs * 1.32).toFixed(2)),
      windDirectionDeg,
      downwindBearingDeg: (windDirectionDeg + 180) % 360,
      temperatureC: 19.5,
      surfacePressureHpa: 1008.0,
      cloudCoverPct,
      shortwaveSolarWm2,
      isDaytime: true,
      turner
    };
  }
}

export interface TerrainTransectPoint {
  distanceKm: number;
  latitude: number;
  longitude: number;
  groundElevationM: number;
  lineOfSightRayHeightM: number; // Height of limiting LOS ray at this distance
  isShadowed: boolean;           // True if blocked by an upstream topographic ridge
  slopeDeg: number;              // Local terrain gradient (+ windward upslope, - leeward downslope)
  thermalTransmissionFactor: number; // 1.0 if exposed, 0.04 if shadowed (sky-scatter only)
  promptRadTransmissionFactor: number; // 1.0 if exposed, 0.12 if shadowed (Compton air-skyshine only)
  blastSlopeFactor: number;      // >1 on forward windward slope, <1 in leeward shadow behind ridge
}

export interface TerrainShadowTransectResult {
  sourceMode: 'LIVE_SRTM_DEM' | 'ANALYTICAL_RIDGE_DEM';
  bearingDeg: number;
  groundZeroElevationM: number;
  burstAltitudeAboveGroundM: number;
  burstAbsoluteElevationM: number;
  shadowedFractionPct: number;
  firstShadowStartKm: number | null;
  points: TerrainTransectPoint[];
}

/**
 * Queries real SRTM/COP-DEM 30m/90m elevation transect along a radial bearing from (lat0, lon0)
 * out to maxDistanceKm, and computes Line-of-Sight (LOS) fireball ray-shadowing and blast slope reflection.
 */
export async function fetchAndComputeTerrainShadowing(
  lat0: number,
  lon0: number,
  bearingDeg: number,
  maxDistanceKm: number,
  burstAltitudeAboveGroundM: number
): Promise<TerrainShadowTransectResult> {
  const numSteps = 32;
  const distsKm: number[] = [];
  const lats: number[] = [];
  const lons: number[] = [];

  const brgRad = (bearingDeg * Math.PI) / 180;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);

  for (let i = 0; i <= numSteps; i++) {
    const dKm = (maxDistanceKm * i) / numSteps;
    distsKm.push(dKm);
    const dNorthKm = dKm * Math.cos(brgRad);
    const dEastKm = dKm * Math.sin(brgRad);
    const lat = lat0 + dNorthKm / 111.32;
    const lon = lon0 + dEastKm / Math.max(10, 111.32 * cosLat);
    lats.push(Number(lat.toFixed(5)));
    lons.push(Number(lon.toFixed(5)));
  }

  let elevationsM: number[] = [];
  let sourceMode: 'LIVE_SRTM_DEM' | 'ANALYTICAL_RIDGE_DEM' = 'LIVE_SRTM_DEM';

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.elevation) && data.elevation.length === distsKm.length) {
      elevationsM = data.elevation.map((v: any) => Number(v) || 0);
    } else {
      throw new Error('Invalid elevation array');
    }
  } catch {
    sourceMode = 'ANALYTICAL_RIDGE_DEM';
    // Realistic synthetic ridge-and-valley terrain profile seeded by coordinates
    const baseElev = 240 + Math.abs(Math.sin(lat0 * 3.1 + lon0 * 1.7)) * 320;
    elevationsM = distsKm.map(d => {
      const ridge1 = 260 * Math.exp(-Math.pow((d - maxDistanceKm * 0.34) / (maxDistanceKm * 0.11), 2));
      const ridge2 = 380 * Math.exp(-Math.pow((d - maxDistanceKm * 0.72) / (maxDistanceKm * 0.14), 2));
      const valley = -95 * Math.exp(-Math.pow((d - maxDistanceKm * 0.52) / (maxDistanceKm * 0.09), 2));
      return Math.round(baseElev + ridge1 + ridge2 + valley);
    });
  }

  const gzElevM = elevationsM[0] || 0;
  // Fireball effective radiating center height (minimum 2m above surface for surface/shallow bursts)
  const effectiveSourceHeightAboveGz = Math.max(2, burstAltitudeAboveGroundM);
  const burstAbsoluteElevationM = gzElevM + effectiveSourceHeightAboveGz;

  let maxHorizonAngleRad = -Math.PI / 2;
  let shadowedCount = 0;
  let firstShadowStartKm: number | null = null;

  const points: TerrainTransectPoint[] = distsKm.map((dKm, idx) => {
    const groundElev = elevationsM[idx];
    const rMeters = Math.max(1, dKm * 1000);

    // Local terrain slope (degrees)
    let slopeDeg = 0;
    if (idx > 0) {
      const dr = (distsKm[idx] - distsKm[idx - 1]) * 1000;
      const dz = groundElev - elevationsM[idx - 1];
      slopeDeg = (Math.atan2(dz, Math.max(1, dr)) * 180) / Math.PI;
    }

    if (idx === 0) {
      return {
        distanceKm: 0,
        latitude: lats[0],
        longitude: lons[0],
        groundElevationM: groundElev,
        lineOfSightRayHeightM: burstAbsoluteElevationM,
        isShadowed: false,
        slopeDeg: 0,
        thermalTransmissionFactor: 1.0,
        promptRadTransmissionFactor: 1.0,
        blastSlopeFactor: 1.0
      };
    }

    // Angle from burst center to receptor (1.5m above local ground)
    const receptorElev = groundElev + 1.5;
    const angleToReceptor = Math.atan2(receptorElev - burstAbsoluteElevationM, rMeters);

    const isShadowed = angleToReceptor < maxHorizonAngleRad - 0.0005;
    if (!isShadowed) {
      maxHorizonAngleRad = Math.max(maxHorizonAngleRad, angleToReceptor);
    } else {
      shadowedCount++;
      if (firstShadowStartKm === null) firstShadowStartKm = dKm;
    }

    // Height of the limiting horizon ray at distance rMeters
    const lineOfSightRayHeightM = Math.max(
      groundElev,
      burstAbsoluteElevationM + rMeters * Math.tan(maxHorizonAngleRad)
    );

    // Glasstone & Dolan Ch. IV/VII terrain modifiers:
    // - Forward upslope enhances reflected Mach overpressure up to +22%; leeward reverse slope reduces it by ~28%
    const blastSlopeFactor = isShadowed
      ? 0.72
      : Math.max(0.78, Math.min(1.24, 1.0 + 0.015 * slopeDeg));

    return {
      distanceKm: Number(dKm.toFixed(3)),
      latitude: lats[idx],
      longitude: lons[idx],
      groundElevationM: groundElev,
      lineOfSightRayHeightM: Number(lineOfSightRayHeightM.toFixed(1)),
      isShadowed,
      slopeDeg: Number(slopeDeg.toFixed(1)),
      thermalTransmissionFactor: isShadowed ? 0.04 : 1.0,
      promptRadTransmissionFactor: isShadowed ? 0.12 : 1.0,
      blastSlopeFactor: Number(blastSlopeFactor.toFixed(2))
    };
  });

  return {
    sourceMode,
    bearingDeg,
    groundZeroElevationM: gzElevM,
    burstAltitudeAboveGroundM,
    burstAbsoluteElevationM,
    shadowedFractionPct: Number(((shadowedCount / Math.max(1, numSteps)) * 100).toFixed(1)),
    firstShadowStartKm,
    points
  };
}
