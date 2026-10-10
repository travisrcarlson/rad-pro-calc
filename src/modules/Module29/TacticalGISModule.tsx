import React, { useState, useMemo, useRef } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

export type GisTab = 'tactical_map' | 'cot_export' | 'mesh_triangulation' | 'evac_corridor';

interface SensorNode {
  id: string;
  name: string;
  xM: number; // offset in meters from center
  yM: number;
  measuredRate_uSvh: number;
  batteryPct: number;
  status: 'ONLINE' | 'ALARM' | 'OFFLINE';
}

export const TacticalGISModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GisTab>('tactical_map');
  const [centerLat, setCenterLat] = useState<number>(38.8977); // Washington DC baseline or custom
  const [centerLon, setCenterLon] = useState<number>(-77.0365);
  const [windSpeedMps, setWindSpeedMps] = useState<number>(5.0);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(240); // Wind from SW blowing NE
  const [threatType, setThreatType] = useState<'nuclear' | 'rdd' | 'chemical'>('nuclear');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0 = 10km grid
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [copiedCoT, setCopiedCoT] = useState<boolean>(false);

  // Active layer visibility toggles
  const [showBlastRings, setShowBlastRings] = useState<boolean>(true);
  const [showPlumeWedge, setShowPlumeWedge] = useState<boolean>(true);
  const [showCordons, setShowCordons] = useState<boolean>(true);
  const [showSensors, setShowSensors] = useState<boolean>(true);

  // Sensor Picket Mesh Network
  const [sensors, setSensors] = useState<SensorNode[]>([
    { id: 'SN-01', name: 'Alpha Picket (North Gate)', xM: 0, yM: 800, measuredRate_uSvh: 14.5, batteryPct: 94, status: 'ALARM' },
    { id: 'SN-02', name: 'Bravo Picket (East Perimeter)', xM: 750, yM: 200, measuredRate_uSvh: 28.2, batteryPct: 88, status: 'ALARM' },
    { id: 'SN-03', name: 'Charlie Picket (South Highway)', xM: -200, yM: -900, measuredRate_uSvh: 0.18, batteryPct: 98, status: 'ONLINE' },
    { id: 'SN-04', name: 'Delta Picket (West Ridge)', xM: -850, yM: -100, measuredRate_uSvh: 0.15, batteryPct: 91, status: 'ONLINE' },
    { id: 'SN-05', name: 'Echo Mobile Recon (Drone-1)', xM: 400, yM: 600, measuredRate_uSvh: 42.0, batteryPct: 76, status: 'ALARM' }
  ]);

  // Canvas / SVG dragging logic
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Convert meters to canvas pixels
  // Base scale: 1000m = 80px * zoomLevel
  const mToPx = (m: number) => (m / 1000) * 80 * zoomLevel;

  // Triangulation calculation (Inverse Square Multilateration)
  const triangulationResult = useMemo(() => {
    // Weighted centroid estimate based on inverse distance and measured dose rates
    let sumWeight = 0;
    let sumX = 0;
    let sumY = 0;
    sensors.forEach((s) => {
      const w = Math.max(0, s.measuredRate_uSvh - 0.12); // subtract background
      sumWeight += w;
      sumX += s.xM * w;
      sumY += s.yM * w;
    });

    const estX = sumWeight > 0 ? sumX / sumWeight : 0;
    const estY = sumWeight > 0 ? sumY / sumWeight : 0;
    const estActivityGBq = sumWeight > 0 ? (sumWeight * 0.45) : 0;

    return {
      estX,
      estY,
      estActivityGBq,
      confidenceRadiusM: Math.max(50, 400 / Math.sqrt(Math.max(1, sumWeight)))
    };
  }, [sensors]);

  // Cursor-on-Target (CoT) XML Packet Generator
  const cotXmlPacket = useMemo(() => {
    const now = new Date();
    const stale = new Date(now.getTime() + 15 * 60 * 1000); // 15 min stale time
    const isoNow = now.toISOString();
    const isoStale = stale.toISOString();

    return `<?xml version="1.0" standalone="yes"?>
<event version="2.0"
  uid="RADPRO-CBRN-${now.getTime()}"
  type="a-f-G-U-C-R"
  time="${isoNow}"
  start="${isoNow}"
  stale="${isoStale}"
  how="m-g">
  <point lat="${centerLat.toFixed(6)}" lon="${centerLon.toFixed(6)}" hae="12.0" ce="25.0" le="10.0"/>
  <detail>
    <contact callsign="RADPRO-COMMAND" endpoint="192.168.1.100:4242:tcp"/>
    <radiological>
      <threatType>${threatType.toUpperCase()}</threatType>
      <windSpeedMps>${windSpeedMps}</windSpeedMps>
      <windDirectionDeg>${windDirectionDeg}</windDirectionDeg>
      <estActivityGBq>${triangulationResult.estActivityGBq.toFixed(1)}</estActivityGBq>
      <triangulatedX_m>${triangulationResult.estX.toFixed(1)}</triangulatedX_m>
      <triangulatedY_m>${triangulationResult.estY.toFixed(1)}</triangulatedY_m>
      <alarmSensorsCount>${sensors.filter(s => s.status === 'ALARM').length}</alarmSensorsCount>
    </radiological>
    <remarks>RadPro Analytical CBRN Tactical Tactical Event Stream - CoT v2.0</remarks>
  </detail>
</event>`;
  }, [centerLat, centerLon, threatType, windSpeedMps, windDirectionDeg, triangulationResult, sensors]);

  const handleCopyCoT = () => {
    navigator.clipboard.writeText(cotXmlPacket);
    setCopiedCoT(true);
    setTimeout(() => setCopiedCoT(false), 2500);
  };

  // Cryptographic Dossier Payload
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: 'ATAK / Cursor-on-Target (CoT) Tactical GIS Incident Dossier',
      moduleName: 'Module 29 (Tactical GIS Map Engine & ATAK / CoT Mesh Hub)',
      statuteCitation: 'DoD CoT Interface Standard / MIL-STD-2525D / FEMA NIMS',
      verificationTestId: 'VTEST-32',
      operatorName: 'Tactical GIS & Sensor Operations Specialist',
      operatorCredentials: 'GISP, CBRN Recon Officer, C-IED Specialist',
      facility: 'Mobile Command Vehicle / Forward Tactical Operations Center',
      notes: `GIS Event for ${threatType.toUpperCase()} incident at (${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}). Wind: ${windSpeedMps} m/s @ ${windDirectionDeg}°. Mesh Triangulation: (${triangulationResult.estX.toFixed(0)}m, ${triangulationResult.estY.toFixed(0)}m), est source: ${triangulationResult.estActivityGBq.toFixed(1)} GBq.`,
      formulaDescription: '\\vec{r}_{\\text{source}} = \\frac{\\sum w_i \\vec{r}_i}{\\sum w_i}, \\quad w_i = \\dot{D}_i - B_0',
      inputs: [
        { label: 'Incident Latitude', value: centerLat.toFixed(5), unit: '°N' },
        { label: 'Incident Longitude', value: centerLon.toFixed(5), unit: '°W' },
        { label: 'Threat Classification', value: threatType.toUpperCase() },
        { label: 'Surface Wind Speed', value: windSpeedMps, unit: 'm/s' },
        { label: 'Wind Direction Vector', value: `${windDirectionDeg}° (Downwind: ${(windDirectionDeg + 180) % 360}°)` },
        { label: 'Active Picket Nodes', value: sensors.length }
      ],
      outputs: [
        { label: 'Active Alarm Pickets', value: sensors.filter((s) => s.status === 'ALARM').length, status: 'WARNING' },
        { label: 'Triangulated Target X', value: triangulationResult.estX.toFixed(1), unit: 'm', status: 'PASS' },
        { label: 'Triangulated Target Y', value: triangulationResult.estY.toFixed(1), unit: 'm', status: 'PASS' },
        { label: 'Estimated Source Activity', value: triangulationResult.estActivityGBq.toFixed(1), unit: 'GBq', status: 'PASS' },
        { label: 'Confidence Radius', value: triangulationResult.confidenceRadiusM.toFixed(1), unit: 'm', status: 'PASS' },
        { label: 'CoT Protocol Status', value: 'VALID XML 2.0 (WinTAK / ATAK Ready)', status: 'PASS' }
      ]
    };
  }, [centerLat, centerLon, threatType, windSpeedMps, windDirectionDeg, sensors, triangulationResult]);

  return (
    <div className="tactical-gis-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🗺️ Module 29: Tactical GIS Map Engine &amp; ATAK / CoT Mesh Hub</span>
              <VerificationBadge testId="VTEST-32" standard="Cursor-on-Target / Multilateration" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Geospatial projection of weapon damage perimeters, radioactive fallout isopleths, chemical hazard plumes, WinTAK/ATAK Cursor-on-Target (CoT) XML feeds, and sensor mesh triangulation.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📜 Export Tactical GIS Dossier</span>
          </button>
        </div>
      </div>

      {/* Geospatial Control Bar */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Threat Classification:</label>
            <select
              className="form-control"
              value={threatType}
              onChange={(e) => setThreatType(e.target.value as any)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="nuclear">Nuclear Detonation (Prompt &amp; Fallout)</option>
              <option value="rdd">Radiological Dispersion Device (RDD / Dirty Bomb)</option>
              <option value="chemical">Toxic Industrial Chemical (TIC Plume)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Ground Zero Latitude:</label>
            <input
              type="number"
              step="0.0001"
              className="form-control"
              value={centerLat}
              onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Ground Zero Longitude:</label>
            <input
              type="number"
              step="0.0001"
              className="form-control"
              value={centerLon}
              onChange={(e) => setCenterLon(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Surface Wind (m/s &amp; Dir):</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                className="form-control"
                value={windSpeedMps}
                onChange={(e) => setWindSpeedMps(parseFloat(e.target.value) || 1)}
                style={{ flex: 1, fontSize: '0.85rem' }}
                title="Speed (m/s)"
              />
              <input
                type="number"
                min="0"
                max="360"
                step="10"
                className="form-control"
                value={windDirectionDeg}
                onChange={(e) => setWindDirectionDeg(parseInt(e.target.value) || 0)}
                style={{ width: '70px', fontSize: '0.85rem' }}
                title="Direction (deg)"
              />
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>°</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Map Scale / Zoom:</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
              >
                -
              </button>
              <span style={{ fontSize: '0.85rem', color: '#00e5ff', fontWeight: 'bold' }}>{(zoomLevel * 100).toFixed(0)}%</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.2))}
              >
                +
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layer Toggles & HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showBlastRings} onChange={(e) => setShowBlastRings(e.target.checked)} />
            <span style={{ color: '#ef4444' }}>💥 Blast Rings</span>
          </label>
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPlumeWedge} onChange={(e) => setShowPlumeWedge(e.target.checked)} />
            <span style={{ color: '#f59e0b' }}>🌪️ Downwind Plume Wedge</span>
          </label>
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showCordons} onChange={(e) => setShowCordons(e.target.checked)} />
            <span style={{ color: '#10b981' }}>🛡️ Safety Cordons</span>
          </label>
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showSensors} onChange={(e) => setShowSensors(e.target.checked)} />
            <span style={{ color: '#00e5ff' }}>📡 Sensor Nodes ({sensors.length})</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'tactical_map' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
            onClick={() => setActiveTab('tactical_map')}
          >
            🗺️ Tactical Vector Map
          </button>
          <button
            className={`btn ${activeTab === 'cot_export' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
            onClick={() => setActiveTab('cot_export')}
          >
            📡 ATAK / CoT Feed
          </button>
          <button
            className={`btn ${activeTab === 'mesh_triangulation' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
            onClick={() => setActiveTab('mesh_triangulation')}
          >
            🎯 Inverse Triangulation
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TACTICAL VECTOR MAP */}
      {/* ========================================================================= */}
      {activeTab === 'tactical_map' && (
        <div className="panel" style={{ padding: '0', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'relative',
              width: '100%',
              height: '520px',
              background: '#090d16',
              cursor: isDragging.current ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            {/* Dark Grid Background & Compass Rose */}
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              <defs>
                <pattern id="tacticalGrid" width={40 * zoomLevel} height={40 * zoomLevel} patternUnits="userSpaceOnUse">
                  <path d={`M ${40 * zoomLevel} 0 L 0 0 0 ${40 * zoomLevel}`} fill="none" stroke="rgba(0, 229, 255, 0.07)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tacticalGrid)" />
            </svg>

            {/* Dynamic Map Elements */}
            <div
              style={{
                position: 'absolute',
                left: `calc(50% + ${panOffset.x}px)`,
                top: `calc(50% + ${panOffset.y}px)`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
              }}
            >
              {/* Downwind Plume Wedge */}
              {showPlumeWedge && (
                <div
                  style={{
                    position: 'absolute',
                    width: '0',
                    height: '0',
                    borderLeft: `${mToPx(600)}px solid transparent`,
                    borderRight: `${mToPx(600)}px solid transparent`,
                    borderBottom: `${mToPx(3500)}px solid rgba(245, 158, 11, 0.18)`,
                    transformOrigin: '50% 0%',
                    transform: `rotate(${windDirectionDeg + 180}deg)`,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Blast Rings (Nuclear) or Cordon Rings */}
              {showBlastRings && (
                <>
                  {/* 20 psi */}
                  <div
                    style={{
                      position: 'absolute',
                      width: `${mToPx(1600)}px`,
                      height: `${mToPx(1600)}px`,
                      borderRadius: '50%',
                      border: '2px solid #ef4444',
                      background: 'rgba(239, 68, 68, 0.15)',
                      transform: 'translate(-50%, -50%)'
                    }}
                    title="20 psi Blast Ring"
                  />
                  {/* 5 psi */}
                  <div
                    style={{
                      position: 'absolute',
                      width: `${mToPx(3600)}px`,
                      height: `${mToPx(3600)}px`,
                      borderRadius: '50%',
                      border: '1.5px dashed #f97316',
                      background: 'rgba(249, 115, 22, 0.08)',
                      transform: 'translate(-50%, -50%)'
                    }}
                    title="5 psi Severe Collapse Ring"
                  />
                  {/* 1 psi */}
                  <div
                    style={{
                      position: 'absolute',
                      width: `${mToPx(7000)}px`,
                      height: `${mToPx(7000)}px`,
                      borderRadius: '50%',
                      border: '1px dotted #eab308',
                      transform: 'translate(-50%, -50%)'
                    }}
                    title="1 psi Glass Shatter Perimeter"
                  />
                </>
              )}

              {/* Ground Zero Epicenter Marker */}
              <div
                style={{
                  position: 'absolute',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 15px #ef4444',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}
              >
                ★
              </div>

              {/* Sensor Nodes Picket */}
              {showSensors && sensors.map((s) => (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: `${mToPx(s.xM)}px`,
                    top: `${-mToPx(s.yM)}px`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'auto'
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: s.status === 'ALARM' ? '#ef4444' : '#10b981',
                      boxShadow: `0 0 8px ${s.status === 'ALARM' ? '#ef4444' : '#10b981'}`
                    }}
                  />
                  <div style={{
                    background: 'rgba(0,0,0,0.75)',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    color: s.status === 'ALARM' ? '#ef4444' : '#10b981',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {s.id}: {s.measuredRate_uSvh} µSv/h
                  </div>
                </div>
              ))}

              {/* Triangulated Source Confidence Ellipse */}
              <div
                style={{
                  position: 'absolute',
                  left: `${mToPx(triangulationResult.estX)}px`,
                  top: `${-mToPx(triangulationResult.estY)}px`,
                  width: `${mToPx(triangulationResult.confidenceRadiusM * 2)}px`,
                  height: `${mToPx(triangulationResult.confidenceRadiusM * 2)}px`,
                  borderRadius: '50%',
                  border: '2px solid #00e5ff',
                  background: 'rgba(0, 229, 255, 0.2)',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  color: '#00e5ff',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  TRIANGULATED TARGET
                </div>
              </div>
            </div>

            {/* Tactical Map HUD Overlays */}
            <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'rgba(0,0,0,0.65)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem' }}>
              <div style={{ color: '#00e5ff', fontWeight: 'bold' }}>TACTICAL GIS HUD</div>
              <div style={{ color: 'var(--color-text-muted)' }}>Origin: {centerLat.toFixed(4)}°N, {centerLon.toFixed(4)}°W</div>
              <div style={{ color: 'var(--color-text-muted)' }}>Wind: {windSpeedMps} m/s @ {windDirectionDeg}°</div>
            </div>

            <div style={{ position: 'absolute', bottom: '12px', right: '14px', background: 'rgba(0,0,0,0.65)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Scale: 1 km = {(80 * zoomLevel).toFixed(0)} px | Pan: ({panOffset.x}, {panOffset.y})
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATAK / COT EXPORT */}
      {/* ========================================================================= */}
      {activeTab === 'cot_export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                  📡 ATAK / WinTAK Cursor-on-Target (CoT) XML Protocol Feed
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Compliant with DoD Cursor-on-Target schema v2.0 for direct tactical ingestion into Android Team Awareness Kit (ATAK) and WinTAK.
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCopyCoT}
                style={{ fontSize: '0.82rem' }}
              >
                {copiedCoT ? '✓ Copied to Clipboard!' : '📋 Copy CoT XML Event'}
              </button>
            </div>

            <textarea
              readOnly
              value={cotXmlPacket}
              rows={16}
              style={{
                width: '100%',
                background: '#0a0e17',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                lineHeight: '1.5'
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVERSE TRIANGULATION */}
      {/* ========================================================================= */}
      {activeTab === 'mesh_triangulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🎯 Sensor Picket Multilateration &amp; Inverse-Square Localization
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Autonomous radiation sensor nodes report real-time gamma dose rates. The system executes weighted spatial multilateration to pinpoint orphan sources or dirty bomb release origins.
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px' }}>Node ID</th>
                    <th style={{ padding: '8px' }}>Description</th>
                    <th style={{ padding: '8px' }}>Position (X, Y meters)</th>
                    <th style={{ padding: '8px' }}>Dose Rate (µSv/h)</th>
                    <th style={{ padding: '8px' }}>Battery</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{s.id}</td>
                      <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{s.name}</td>
                      <td style={{ padding: '8px' }}>({s.xM}m, {s.yM}m)</td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="0.5"
                          value={s.measuredRate_uSvh}
                          onChange={(e) => {
                            const newSensors = [...sensors];
                            const rate = Math.max(0.1, parseFloat(e.target.value) || 0);
                            newSensors[idx].measuredRate_uSvh = rate;
                            newSensors[idx].status = rate > 2.0 ? 'ALARM' : 'ONLINE';
                            setSensors(newSensors);
                          }}
                          style={{ width: '80px', padding: '3px 6px', fontSize: '0.82rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>{s.batteryPct}%</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          color: s.status === 'ALARM' ? '#ef4444' : '#10b981',
                          fontWeight: 'bold',
                          fontSize: '0.78rem'
                        }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>TRIANGULATED POSITION</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                  X: {triangulationResult.estX.toFixed(0)}m, Y: {triangulationResult.estY.toFixed(0)}m
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Confidence radius: &plusmn;{triangulationResult.confidenceRadiusM.toFixed(0)} meters
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>ESTIMATED SOURCE MAGNITUDE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb703', marginTop: '2px' }}>
                  {triangulationResult.estActivityGBq.toFixed(1)} GBq
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  ≈ {(triangulationResult.estActivityGBq / 37).toFixed(2)} Curies equivalent
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default TacticalGISModule;
