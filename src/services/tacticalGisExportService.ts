/**
 * Tactical GIS & Field Interoperability Export Service
 * Generates standards-compliant GeoJSON (RFC 7946), Google Earth KML (OGC KML 2.2),
 * and ATAK/WinTAK Cursor-on-Target (CoT XML v2.0) for field emergency management.
 */

import { type EPZScenarioInput, type EPZEvacuationPlan } from './epzConsequenceService';

/**
 * Triggers a client-side file download in the browser.
 */
export function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports EPZ Evacuation Plan as standard GeoJSON FeatureCollection (RFC 7946)
 * Note: GeoJSON specification mandates [longitude, latitude] coordinate ordering.
 */
export function generateEPZGeoJSON(scenario: EPZScenarioInput, plan: EPZEvacuationPlan): string {
  const sanitizeName = scenario.plantName.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Helper to convert { lat, lon }[] to closed [lon, lat][]
  const toClosedGeoJsonRing = (pts: { lat: number; lon: number }[]): number[][] => {
    if (pts.length === 0) return [];
    const ring = pts.map(p => [Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]);
    // Ensure ring is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
    return ring;
  };

  // Centerline Vector: From plant coordinates along plumeCenterlineBearingDeg out to 80 km
  const centerlineEndPt = plan.ipzGeodesicRing.length > 0 
    ? plan.ipzGeodesicRing[Math.floor(plan.ipzGeodesicRing.length / 2)] // fallback
    : { lat: scenario.coordinates.lat, lon: scenario.coordinates.lon };

  const geoJson = {
    type: 'FeatureCollection',
    name: `EPZ_Evacuation_Plan_${sanitizeName}`,
    metadata: {
      generatedAt: new Date().toISOString(),
      standard: 'EPA-400-R-92-001 (EPA PAG 2017) / IAEA GSR Part 7',
      facility: scenario.plantName,
      coordinates: scenario.coordinates,
      thermalPowerMWth: scenario.thermalPowerMWth,
      coreReleaseFraction: scenario.coreReleaseFraction,
      windSpeedMps: scenario.windSpeedMps,
      windOriginDegrees: scenario.windOriginDegrees,
      downwindBearingDegrees: plan.plumeCenterlineBearingDeg,
      keyholeSector: plan.keyholeCenterSector,
      affectedSectors: plan.affectedSectors,
      evacuationRadiusKm: plan.evacuationRadiusKm,
      kiDistributionRadiusKm: plan.kiDistributionRadiusKm,
      interdictionRadiusKm: plan.interdictionRadiusKm
    },
    features: [
      // 1. Point Feature: Facility Ground Zero
      {
        type: 'Feature',
        id: `FACILITY_${sanitizeName}`,
        properties: {
          name: scenario.plantName,
          category: 'Nuclear Power Station',
          thermalPowerMWth: scenario.thermalPowerMWth,
          coreReleaseFraction: `${(scenario.coreReleaseFraction * 100).toFixed(1)}%`,
          windOriginDeg: scenario.windOriginDegrees,
          downwindBearingDeg: plan.plumeCenterlineBearingDeg,
          keyholeCenterSector: plan.keyholeCenterSector,
          affectedSectors: plan.affectedSectors.join(', '),
          'marker-color': '#00e5ff',
          'marker-symbol': 'danger'
        },
        geometry: {
          type: 'Point',
          coordinates: [Number(scenario.coordinates.lon.toFixed(6)), Number(scenario.coordinates.lat.toFixed(6))]
        }
      },

      // 2. Polygon Feature: Keyhole Evacuation Arc (Immediate Mandatory Evacuation)
      {
        type: 'Feature',
        id: 'ZONE_KEYHOLE_EVAC_ARC',
        properties: {
          name: `Keyhole Evacuation Arc (${plan.affectedSectors.join('-')})`,
          zoneTier: 'Mandatory Evacuation Wedge (TEDE >= 1.0 rem / 10 mSv)',
          radiusKm: plan.evacuationRadiusKm,
          arcSweepDegrees: 67.5,
          affectedSectors: plan.affectedSectors,
          actionRequired: 'Mandatory immediate evacuation of all personnel in affected 3 sectors',
          fill: '#ef4444',
          'fill-opacity': 0.35,
          stroke: '#ef4444',
          'stroke-width': 2.5
        },
        geometry: {
          type: 'Polygon',
          coordinates: [toClosedGeoJsonRing(plan.keyholeWedgePolygon)]
        }
      },

      // 3. Polygon Feature: Precautionary Action Zone (PAZ - 5 km)
      {
        type: 'Feature',
        id: 'ZONE_PAZ_5KM',
        properties: {
          name: 'Precautionary Action Zone (PAZ)',
          zoneTier: 'Circular 5 km Rapid Shelter/Evac Cordon',
          radiusKm: 5.0,
          actionRequired: 'Immediate sheltering-in-place and precautionary evacuation readiness',
          fill: '#f59e0b',
          'fill-opacity': 0.15,
          stroke: '#f59e0b',
          'stroke-width': 2.0,
          'stroke-dasharray': '5,5'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [toClosedGeoJsonRing(plan.pazGeodesicRing)]
        }
      },

      // 4. Polygon Feature: Urgent Protective Action Zone (UPZ - 10 miles / 16.1 km)
      {
        type: 'Feature',
        id: 'ZONE_UPZ_10MI',
        properties: {
          name: 'Urgent Protective Action Zone (UPZ)',
          zoneTier: '10-Mile Plume Exposure EPZ (16.1 km)',
          radiusKm: 16.0934,
          actionRequired: 'Rapid distribution of stable Potassium Iodide (KI) for thyroid CDE prophylaxis',
          fill: '#eab308',
          'fill-opacity': 0.08,
          stroke: '#eab308',
          'stroke-width': 1.8,
          'stroke-dasharray': '8,4'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [toClosedGeoJsonRing(plan.upzGeodesicRing)]
        }
      },

      // 5. Polygon Feature: Ingestion Pathway Zone (IPZ - 50 miles / 80.5 km)
      {
        type: 'Feature',
        id: 'ZONE_IPZ_50MI',
        properties: {
          name: 'Ingestion Pathway Zone (IPZ)',
          zoneTier: '50-Mile Food & Water Interdiction EPZ (80.5 km)',
          radiusKm: 80.4672,
          actionRequired: 'Agricultural interdiction of milk, livestock, produce, and open reservoir drinking water',
          fill: '#38bdf8',
          'fill-opacity': 0.04,
          stroke: '#38bdf8',
          'stroke-width': 1.5,
          'stroke-dasharray': '12,6'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [toClosedGeoJsonRing(plan.ipzGeodesicRing)]
        }
      },

      // 6. LineString Feature: Downwind Plume Centerline Axis
      {
        type: 'Feature',
        id: 'VECTOR_PLUME_CENTERLINE',
        properties: {
          name: `Downwind Plume Centerline (${plan.plumeCenterlineBearingDeg}° / ${plan.keyholeCenterSector})`,
          bearingDeg: plan.plumeCenterlineBearingDeg,
          lengthKm: 80.4672,
          stroke: '#f59e0b',
          'stroke-width': 3.0,
          'stroke-dasharray': '4,4'
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [Number(scenario.coordinates.lon.toFixed(6)), Number(scenario.coordinates.lat.toFixed(6))],
            [Number(centerlineEndPt.lon.toFixed(6)), Number(centerlineEndPt.lat.toFixed(6))]
          ]
        }
      }
    ]
  };

  return JSON.stringify(geoJson, null, 2);
}

/**
 * Exports EPZ Evacuation Plan as OGC KML 2.2 with color-coded styles and description balloons
 * for Google Earth, ArcGIS Earth, and desktop GIS tools.
 */
export function generateEPZKML(scenario: EPZScenarioInput, plan: EPZEvacuationPlan): string {
  const sanitizeName = scenario.plantName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const timestamp = new Date().toISOString();

  const toKmlCoordinates = (pts: { lat: number; lon: number }[]): string => {
    if (pts.length === 0) return '';
    const closed = [...pts];
    if (closed[0].lat !== closed[closed.length - 1].lat || closed[0].lon !== closed[closed.length - 1].lon) {
      closed.push(closed[0]);
    }
    return closed.map(p => `${p.lon.toFixed(6)},${p.lat.toFixed(6)},0`).join('\n              ');
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>EPZ Evacuation Plan - ${sanitizeName}</name>
    <open>1</open>
    <description><![CDATA[
      <h2>Rad Pro Calc: Emergency Planning Zone (EPZ) Consequence Map</h2>
      <p><strong>Standard:</strong> EPA-400-R-92-001 (EPA PAG 2017) / IAEA GSR Part 7</p>
      <p><strong>Facility:</strong> ${sanitizeName}</p>
      <p><strong>Wind Direction:</strong> Blowing from ${scenario.windOriginDegrees}° towards ${plan.plumeCenterlineBearingDeg}° (${plan.keyholeCenterSector})</p>
      <p><strong>Affected Keyhole Sectors:</strong> ${plan.affectedSectors.join(', ')}</p>
      <p><strong>Calculated Evacuation Radius:</strong> ${plan.evacuationRadiusKm} km (${(plan.evacuationRadiusKm * 0.621371).toFixed(1)} miles)</p>
      <p><strong>Generated At:</strong> ${timestamp}</p>
    ]]></description>

    <!-- STYLES -->
    <!-- Facility Pushpin Style -->
    <Style id="facilityPin">
      <IconStyle>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/caution.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <color>ff00ffff</color>
        <scale>1.0</scale>
      </LabelStyle>
    </Style>

    <!-- Keyhole Evacuation Wedge Style (Red Semi-transparent) -->
    <Style id="keyholeWedgeStyle">
      <LineStyle>
        <color>ff0000ff</color> <!-- KML aabbggrr: Red line -->
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>660000ff</color> <!-- 40% opacity red fill -->
      </PolyStyle>
    </Style>

    <!-- PAZ 5km Style (Orange) -->
    <Style id="pazStyle">
      <LineStyle>
        <color>ff00a5ff</color> <!-- Orange line -->
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>3300a5ff</color> <!-- 20% opacity orange fill -->
      </PolyStyle>
    </Style>

    <!-- UPZ 10mi Style (Yellow) -->
    <Style id="upzStyle">
      <LineStyle>
        <color>ff00ffff</color> <!-- Yellow line -->
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>2200ffff</color> <!-- 13% opacity yellow fill -->
      </PolyStyle>
    </Style>

    <!-- IPZ 50mi Style (Cyan) -->
    <Style id="ipzStyle">
      <LineStyle>
        <color>ffffff00</color> <!-- Cyan line -->
        <width>1.5</width>
      </LineStyle>
      <PolyStyle>
        <color>15ffff00</color> <!-- 8% opacity cyan fill -->
      </PolyStyle>
    </Style>

    <!-- PLACEMARKS -->
    <!-- 1. Facility Origin Placemark -->
    <Placemark>
      <name>📍 ${sanitizeName}</name>
      <styleUrl>#facilityPin</styleUrl>
      <description><![CDATA[
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:11px;">
          <tr bgcolor="#0f172a" style="color:#38bdf8;"><th>Parameter</th><th>Value</th></tr>
          <tr><td>Facility Name</td><td><strong>${sanitizeName}</strong></td></tr>
          <tr><td>Latitude / Longitude</td><td>${scenario.coordinates.lat.toFixed(4)}°, ${scenario.coordinates.lon.toFixed(4)}°</td></tr>
          <tr><td>Thermal Power</td><td>${scenario.thermalPowerMWth} MWth</td></tr>
          <tr><td>Core Release Fraction</td><td>${(scenario.coreReleaseFraction * 100).toFixed(1)}%</td></tr>
          <tr><td>Wind Speed</td><td>${scenario.windSpeedMps} m/s (${(scenario.windSpeedMps * 2.237).toFixed(1)} mph)</td></tr>
          <tr><td>Downwind Axis</td><td>${plan.plumeCenterlineBearingDeg}° (${plan.keyholeCenterSector})</td></tr>
        </table>
      ]]></description>
      <Point>
        <coordinates>${scenario.coordinates.lon.toFixed(6)},${scenario.coordinates.lat.toFixed(6)},0</coordinates>
      </Point>
    </Placemark>

    <!-- 2. Keyhole Evacuation Wedge -->
    <Placemark>
      <name>🚨 Mandatory Keyhole Evacuation Arc (${plan.affectedSectors.join('-')})</name>
      <styleUrl>#keyholeWedgeStyle</styleUrl>
      <description><![CDATA[
        <div style="font-family:sans-serif;font-size:12px;">
          <h3 style="color:#ef4444;margin:0 0 6px 0;">MANDATORY EARLY-PHASE EVACUATION</h3>
          <p><strong>Regulatory Threshold:</strong> Projected TEDE &ge; 1.0 rem (10 mSv)</p>
          <p><strong>Keyhole Radius:</strong> ${plan.evacuationRadiusKm} km (${(plan.evacuationRadiusKm * 0.621371).toFixed(1)} miles)</p>
          <p><strong>Sector Span:</strong> 3 compass sectors (67.5° arc sweep)</p>
          <p><strong>Immediate Action:</strong> Immediate evacuation of all general population downwind.</p>
        </div>
      ]]></description>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${toKmlCoordinates(plan.keyholeWedgePolygon)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- 3. Precautionary Action Zone (5 km) -->
    <Placemark>
      <name>⚠️ Precautionary Action Zone (PAZ - 5 km)</name>
      <styleUrl>#pazStyle</styleUrl>
      <description><![CDATA[
        <div style="font-family:sans-serif;font-size:12px;">
          <p><strong>Boundary:</strong> 5.0 km circular radius around facility</p>
          <p><strong>Action:</strong> Rapid precautionary evacuation and in-place sheltering.</p>
        </div>
      ]]></description>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${toKmlCoordinates(plan.pazGeodesicRing)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- 4. Urgent Protective Action Zone (16 km / 10 mi) -->
    <Placemark>
      <name>🛡️ Urgent Protective Action Zone (UPZ - 10 Miles)</name>
      <styleUrl>#upzStyle</styleUrl>
      <description><![CDATA[
        <div style="font-family:sans-serif;font-size:12px;">
          <p><strong>Boundary:</strong> 16.09 km (10 miles) Plume Exposure Pathway EPZ</p>
          <p><strong>Thyroid KI Threshold:</strong> Projected Committed Dose Equivalent (CDE) &ge; 5.0 rem (50 mSv)</p>
          <p><strong>Action:</strong> Rapid distribution of Potassium Iodide (KI) to block radioiodine uptake.</p>
        </div>
      ]]></description>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${toKmlCoordinates(plan.upzGeodesicRing)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- 5. Ingestion Pathway Zone (80 km / 50 mi) -->
    <Placemark>
      <name>🌾 Ingestion Pathway Zone (IPZ - 50 Miles)</name>
      <styleUrl>#ipzStyle</styleUrl>
      <description><![CDATA[
        <div style="font-family:sans-serif;font-size:12px;">
          <p><strong>Boundary:</strong> 80.47 km (50 miles) Ingestion Interdiction Pathway EPZ</p>
          <p><strong>Threshold:</strong> Projected Ingestion / Relocation Dose &ge; 0.5 rem (5 mSv)</p>
          <p><strong>Action:</strong> Embargo of milk, fresh leafy produce, livestock feed, and open reservoirs.</p>
        </div>
      ]]></description>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${toKmlCoordinates(plan.ipzGeodesicRing)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

  </Document>
</kml>`;
}

/**
 * Exports EPZ Evacuation Plan as DoD Cursor-on-Target (CoT v2.0) XML event stream
 * for direct tactical ingestion into Android Tactical Assault Kit (ATAK) and WinTAK.
 */
export function generateEPZCursorOnTargetXML(scenario: EPZScenarioInput, plan: EPZEvacuationPlan): string {
  const now = new Date();
  const timeIso = now.toISOString();
  const staleIso = new Date(now.getTime() + 6 * 3600 * 1000).toISOString(); // 6-hour operational freshness
  const sanitizeName = scenario.plantName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uid = `RADPRO-EPZ-${sanitizeName}-${Date.now().toString(36).toUpperCase()}`;

  // CoT 2.0 type for Radiological Hazard Event: a-h-G-U-C-R (Atom - Hazard - Ground - Unit - CBRN - Radiological)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<event version="2.0" uid="${uid}" type="a-h-G-U-C-R" time="${timeIso}" start="${timeIso}" stale="${staleIso}" how="m-g">
  <point lat="${scenario.coordinates.lat.toFixed(6)}" lon="${scenario.coordinates.lon.toFixed(6)}" hae="0.0" ce="10.0" le="10.0"/>
  <detail>
    <contact callsign="EPZ-${sanitizeName}" endpoint="mesh:radpro/tacgis"/>
    <remarks>
      [CRITICAL CBRN ADVISORY]
      Facility: ${scenario.plantName}
      Standard: EPA PAG 2017 / IAEA GSR Part 7
      Release Fraction: ${(scenario.coreReleaseFraction * 100).toFixed(1)}% Core Inventory
      Wind Vector: Bearing ${plan.plumeCenterlineBearingDeg}° (${plan.keyholeCenterSector}) at ${scenario.windSpeedMps} m/s
      Affected Keyhole Sectors: ${plan.affectedSectors.join(', ')} (67.5 deg arc)
      Mandatory Evac Radius: ${plan.evacuationRadiusKm} km (${(plan.evacuationRadiusKm * 0.621371).toFixed(1)} mi) - TEDE >= 1.0 rem
      Thyroid KI Prophylaxis Radius: ${plan.kiDistributionRadiusKm} km (${(plan.kiDistributionRadiusKm * 0.621371).toFixed(1)} mi) - CDE >= 5.0 rem
      Ingestion Interdiction (IPZ): ${plan.interdictionRadiusKm} km (${(plan.interdictionRadiusKm * 0.621371).toFixed(1)} mi)
    </remarks>
    <emergency type="CBRN-Radiological" status="Active"/>
    <cbrn_plume>
      <origin_lat>${scenario.coordinates.lat.toFixed(6)}</origin_lat>
      <origin_lon>${scenario.coordinates.lon.toFixed(6)}</origin_lon>
      <downwind_bearing_deg>${plan.plumeCenterlineBearingDeg}</downwind_bearing_deg>
      <arc_sweep_deg>67.5</arc_sweep_deg>
      <affected_sectors>${plan.affectedSectors.join(',')}</affected_sectors>
      <evac_radius_m>${Math.round(plan.evacuationRadiusKm * 1000)}</evac_radius_m>
      <paz_radius_m>5000</paz_radius_m>
      <upz_radius_m>16093</upz_radius_m>
      <ipz_radius_m>80467</ipz_radius_m>
    </cbrn_plume>
    <color argb="-65536"/> <!-- Red warning banner in ATAK HUD -->
  </detail>
</event>`;
}
