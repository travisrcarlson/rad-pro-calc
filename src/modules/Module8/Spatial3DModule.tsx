import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';
import VerificationBadge from '../../components/VerificationBadge';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

interface Source3D {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  activity_MBq: number;
  gamma_uSv: number; // µSv·cm²/MBq·h
}

interface Target3D {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
}

interface ShieldBlock {
  id: number;
  name: string;
  x: number; y: number; z: number; // Center
  w: number; l: number; h: number; // Dimensions
  material: string;
  tvl_cm: number; // Tenth Value Layer equivalent Shielding
}

const SHIELDING_MATERIALS: Record<string, { name: string; tvl_cm: number }> = {
  LEAD: { name: 'Lead', tvl_cm: 3.8 },
  TUNGSTEN: { name: 'Tungsten', tvl_cm: 1.3 },
  IRON: { name: 'Iron / Steel', tvl_cm: 4.5 },
  CONCRETE: { name: 'Concrete', tvl_cm: 14.7 },
  BRICK: { name: 'Brick', tvl_cm: 18.0 },
  ALUMINUM: { name: 'Aluminum', tvl_cm: 16.5 },
  WATER: { name: 'Water', tvl_cm: 35.8 },
  CUSTOM: { name: 'Custom Material', tvl_cm: 10.0 }
};

type WorkspaceTab = '3d_cloud' | 'sensor_network' | 'sources' | 'shields' | 'physics';

const Spatial3DModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('3d_cloud');

  // Room dimensions (meters)
  const [dimX] = useState<number>(10);
  const [dimY] = useState<number>(10);
  const [dimZ] = useState<number>(5);

  // Visualization Bound Cutoffs
  const [displayMin, setDisplayMin] = useState<number>(10); // uSv/h
  const [displayMax, setDisplayMax] = useState<number>(2000); // uSv/h
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // State
  const [sources, setSources] = useState<Source3D[]>([
    { id: 1, name: 'Cs-137 Calibrator', x: 5, y: 5, z: 1.5, activity_MBq: 37000, gamma_uSv: 890 }
  ]);

  const [targets, setTargets] = useState<Target3D[]>([
    { id: 1, name: 'Operator Console Alpha', x: 6, y: 5, z: 1.5 },
    { id: 2, name: 'Perimeter Sensor Bravo', x: 2, y: 8, z: 3.0 }
  ]);

  const [shields, setShields] = useState<ShieldBlock[]>([
    { id: 1, name: 'Concrete Shield Wall', x: 5, y: 6.5, z: 1.5, w: 4, l: 0.5, h: 3, material: 'CONCRETE', tvl_cm: 14.7 }
  ]);

  // Fast math intersection for Ray-AABB volumetric slices
  const computeAABBIntersectionFraction = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, sld: ShieldBlock) => {
    const dx = px - sx; const dy = py - sy; const dz = pz - sz;
    let tmin = 0.0; let tmax = 1.0;

    const bMinX = sld.x - sld.w / 2; const bMaxX = sld.x + sld.w / 2;
    if (dx !== 0) {
      const tx1 = (bMinX - sx) / dx; const tx2 = (bMaxX - sx) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2)); tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (sx < bMinX || sx > bMaxX) return 0;

    const bMinY = sld.y - sld.l / 2; const bMaxY = sld.y + sld.l / 2;
    if (dy !== 0) {
      const ty1 = (bMinY - sy) / dy; const ty2 = (bMaxY - sy) / dy;
      tmin = Math.max(tmin, Math.min(ty1, ty2)); tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (sy < bMinY || sy > bMaxY) return 0;

    const bMinZ = sld.z - sld.h / 2; const bMaxZ = sld.z + sld.h / 2;
    if (dz !== 0) {
      const tz1 = (bMinZ - sz) / dz; const tz2 = (bMaxZ - sz) / dz;
      tmin = Math.max(tmin, Math.min(tz1, tz2)); tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else if (sz < bMinZ || sz > bMaxZ) return 0;

    return (tmax >= tmin) ? (tmax - tmin) : 0;
  };

  // Compute 3D Voxel Engine Matrix
  const { volX, volY, volZ, volV } = useMemo(() => {
    const resolutionXY = 22;
    const resolutionZ = 10;

    const stepX = dimX / resolutionXY;
    const stepY = dimY / resolutionXY;
    const stepZ = dimZ / resolutionZ;

    const X: number[] = [];
    const Y: number[] = [];
    const Z: number[] = [];
    const V: number[] = [];

    for (let i = 0; i <= resolutionXY; i++) {
      const px = i * stepX;
      for (let j = 0; j <= resolutionXY; j++) {
        const py = j * stepY;
        for (let k = 0; k <= resolutionZ; k++) {
          const pz = k * stepZ;
          let d = 0;
          for (let s = 0; s < sources.length; s++) {
            const src = sources[s];
            const dx = px - src.x;
            const dy = py - src.y;
            const dz = pz - src.z;
            const dist_cm = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 100);

            let attenuationFactor = 1;
            for (let sh = 0; sh < shields.length; sh++) {
              const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, px, py, pz, shields[sh]);
              if (fract > 0) {
                const distInside_cm = fract * dist_cm;
                const decades = distInside_cm / shields[sh].tvl_cm;
                attenuationFactor *= Math.pow(10, decades);
              }
            }

            d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
          }

          X.push(px);
          Y.push(py);
          Z.push(pz);
          V.push(d);
        }
      }
    }

    return { volX: X, volY: Y, volZ: Z, volV: V };
  }, [sources, dimX, dimY, dimZ, shields]);

  const calcTargetDose = (t: Target3D) => {
    let d = 0;
    sources.forEach(src => {
      const dx = t.x - src.x;
      const dy = t.y - src.y;
      const dz = t.z - src.z;
      const dist_cm = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 100);

      let attenuationFactor = 1;
      for (let sh = 0; sh < shields.length; sh++) {
        const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, t.x, t.y, t.z, shields[sh]);
        if (fract > 0) {
          const distInside_cm = fract * dist_cm;
          const decades = distInside_cm / shields[sh].tvl_cm;
          attenuationFactor *= Math.pow(10, decades);
        }
      }

      d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
    });
    return d;
  };

  // Build scatter mesh tracing arrays for visual shields
  const shieldTraces: any[] = shields.map(sh => {
    return {
      type: 'mesh3d',
      x: [sh.x - sh.w / 2, sh.x - sh.w / 2, sh.x + sh.w / 2, sh.x + sh.w / 2, sh.x - sh.w / 2, sh.x - sh.w / 2, sh.x + sh.w / 2, sh.x + sh.w / 2],
      y: [sh.y - sh.l / 2, sh.y + sh.l / 2, sh.y + sh.l / 2, sh.y - sh.l / 2, sh.y - sh.l / 2, sh.y + sh.l / 2, sh.y + sh.l / 2, sh.y - sh.l / 2],
      z: [sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2],
      i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
      j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
      k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
      opacity: 0.22,
      color: '#94a3b8',
      name: sh.name,
      hoverinfo: 'name'
    };
  });

  // Analytics for HUD
  const analytics = useMemo(() => {
    let totalMBq = 0;
    sources.forEach(s => { totalMBq += s.activity_MBq; });

    let maxSensorDose = 0;
    let worstSensor = 'None';
    targets.forEach(t => {
      const d = calcTargetDose(t);
      if (d > maxSensorDose) {
        maxSensorDose = d;
        worstSensor = t.name;
      }
    });

    return {
      totalMBq,
      totalCi: totalMBq / 37000,
      maxSensorDose,
      worstSensor,
      totalShields: shields.length
    };
  }, [sources, targets, shields]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: '3D Volumetric Shielding & Sensor Network Dossier',
    moduleName: 'Module 8: 3D Volumetric Radiation Field & Shielding Workspace',
    statuteCitation: 'NCRP Report No. 151 / 10 CFR Part 20 Subpart C',
    verificationTestId: 'STRESS-01',
    operatorName: 'Radiation Protection Physicist',
    operatorCredentials: 'Certified Health Physicist / Facility Engineer',
    facility: 'Volumetric Radiotherapy Bunker & Hot-Cell Vault',
    notes: `Volumetric raycast simulation of ${sources.length} radiation sources with ${shields.length} geometric shielding blocks. Peak detected sensor: ${analytics.worstSensor} (${analytics.maxSensorDose.toFixed(2)} µSv/h).`,
    formulaDescription: '\\dot{D} = \\sum_{i} \\frac{A_i \\cdot \\Gamma_i}{r_i^2} \\cdot 10^{-\\sum \\frac{x_j}{\\text{TVL}_j}}, \\quad r_i = \\max(r, r_{\\min})',
    inputs: [
      { label: 'Enclosure Dimensions', value: `${dimX}m × ${dimY}m × ${dimZ}m (${dimX * dimY * dimZ} m³)` },
      { label: 'Active Sources Count', value: sources.length },
      { label: 'Total Source Activity', value: `${analytics.totalMBq.toFixed(0)} MBq (${analytics.totalCi.toFixed(3)} Ci)` },
      { label: 'Active Shield Blocks', value: shields.length },
      { label: 'Virtual Sensor Count', value: targets.length }
    ],
    outputs: [
      { label: 'Max Sensor Dose Rate', value: analytics.maxSensorDose.toFixed(2), unit: 'µSv/h', status: analytics.maxSensorDose > 25 ? 'WARNING' : 'PASS' },
      { label: 'Critical Highest Exposure Target', value: analytics.worstSensor, status: 'PASS' },
      { label: 'Total Installed Shields', value: analytics.totalShields, unit: 'blocks', status: 'PASS' },
      { label: 'Enclosure Volume', value: dimX * dimY * dimZ, unit: 'm³', status: 'PASS' }
    ]
  }), [dimX, dimY, dimZ, sources, shields, targets, analytics]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">3D SPATIAL ENGINE</span>
            <span className="hud-badge hud-badge-accent">RAY-AABB RAYTRACER</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            3D Volumetric Radiation Field &amp; Shielding Workspace
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Simulate multi-source 3D radiation isodose volumes, geometric obstacle attenuation with Axis-Aligned Bounding Box (AABB) raytracing, and virtual sensor networks.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.08)'
            }}
          >
            <span>🛡️</span>
            <span>Audit Dossier (21 CFR Part 11)</span>
          </button>
          <VerificationBadge testId="STRESS-01" standard="NCRP-151" />
        </div>
      </div>

      {/* Top HUD Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">ACTIVE SOURCES</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)' }}>
            {sources.length} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>NODES</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Total Activity: {analytics.totalCi >= 1 ? `${analytics.totalCi.toFixed(2)} Ci` : `${(analytics.totalCi * 1000).toFixed(1)} mCi`} ({analytics.totalMBq.toLocaleString()} MBq)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PEAK TARGET DOSE</span>
          <span className="hud-metric-value" style={{ color: analytics.maxSensorDose > 1000 ? '#ff3366' : 'var(--color-accent)' }}>
            {analytics.maxSensorDose > 1000
              ? `${(analytics.maxSensorDose / 1000).toFixed(2)} mSv/h`
              : `${analytics.maxSensorDose.toFixed(2)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            At: {analytics.worstSensor}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">TARGET SENSORS</span>
          <span className="hud-metric-value" style={{ color: '#10b981' }}>
            {targets.length} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>DETECTORS</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            3D Spatial Grid: {dimX}m × {dimY}m × {dimZ}m
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">SHIELD BARRIERS</span>
          <span className="hud-metric-value" style={{ color: '#38bdf8' }}>
            {shields.length} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>BLOCKS</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Ray-AABB Intersection Active
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === '3d_cloud' ? 'active' : ''}`}
          onClick={() => setActiveTab('3d_cloud')}
        >
          3D Radiation Cloud
        </button>
        <button
          className={`tab-btn ${activeTab === 'sensor_network' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensor_network')}
        >
          Target Sensor Array ({targets.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          Point Sources ({sources.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'shields' ? 'active' : ''}`}
          onClick={() => setActiveTab('shields')}
        >
          Structure Shields ({shields.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          Physics &amp; Derivations
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
        
        {/* TAB 1: 3D Radiation Cloud */}
        {activeTab === '3d_cloud' && (
          <div style={{ height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff3366' }}></span> Sources
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Sensors
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(148, 163, 184, 0.4)' }}></span> Barriers
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Min Shell (µSv/h):</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '80px', padding: '4px 8px', fontSize: '0.85rem' }}
                    value={displayMin}
                    onChange={e => setDisplayMin(Math.max(1, Number(e.target.value)))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Max Shell (µSv/h):</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: '90px', padding: '4px 8px', fontSize: '0.85rem' }}
                    value={displayMax}
                    onChange={e => setDisplayMax(Math.max(10, Number(e.target.value)))}
                  />
                </div>
              </div>
            </div>

            <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '460px', position: 'relative' }}>
              <Plot
                data={[
                  {
                    type: 'volume',
                    x: volX, y: volY, z: volZ, value: volV,
                    isomin: displayMin,
                    isomax: displayMax,
                    opacity: 0.12,
                    surface: { count: 8 },
                    colorscale: 'Jet',
                    colorbar: { title: 'µSv/h', len: 0.8, x: 0.96 },
                    hovertemplate: 'X: %{x:.1f}m<br>Y: %{y:.1f}m<br>Z: %{z:.1f}m<br>Field: %{value:.1f} µSv/h<extra></extra>'
                  },
                  {
                    type: 'scatter3d',
                    mode: 'markers+text',
                    x: sources.map(s => s.x), y: sources.map(s => s.y), z: sources.map(s => s.z),
                    marker: { symbol: 'diamond', color: '#ff3366', size: 8, line: { width: 1.5, color: '#ffffff' } },
                    text: sources.map(s => `[SRC] ${s.name}`),
                    textposition: 'top center',
                    textfont: { color: '#ff6b8b', size: 11 },
                    name: 'Sources',
                    hoverinfo: 'text'
                  },
                  {
                    type: 'scatter3d',
                    mode: 'markers+text',
                    x: targets.map(t => t.x), y: targets.map(t => t.y), z: targets.map(t => t.z),
                    marker: { symbol: 'circle-open', color: '#10b981', size: 9, line: { width: 3, color: '#10b981' } },
                    text: targets.map(t => `[SENS] ${t.name}`),
                    textposition: 'bottom center',
                    textfont: { color: '#6ee7b7', size: 11 },
                    name: 'Targets',
                    hovertext: targets.map(t => `Dose Rate: ${calcTargetDose(t).toFixed(2)} µSv/h`),
                    hoverinfo: 'text'
                  },
                  ...shieldTraces
                ]}
                layout={{
                  autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
                  scene: {
                    xaxis: { title: 'X (m)', range: [0, dimX], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    yaxis: { title: 'Depth Y (m)', range: [0, dimY], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    zaxis: { title: 'Elevation Z (m)', range: [0, dimZ], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    aspectmode: 'data',
                    camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } }
                  },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  showlegend: false
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Target Sensor Network */}
        {activeTab === 'sensor_network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Target Sensor &amp; Virtual Detector Network</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Active sensor probe coordinates and point dose evaluation including multi-barrier attenuation.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setTargets([
                  ...targets,
                  { id: Date.now(), name: `Sensor-${targets.length + 1}`, x: 2, y: 2, z: 1 }
                ])}
              >
                + Add Target Sensor
              </button>
            </div>

            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(0,0,0,0.3)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Sensor Name</th>
                    <th style={{ padding: '12px' }}>Position Coordinates [X, Y, Z] (m)</th>
                    <th style={{ padding: '12px' }}>Absorbed Dose Rate</th>
                    <th style={{ padding: '12px' }}>ALARA Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t, idx) => {
                    const doseVal = calcTargetDose(t);
                    let badge = <span className="hud-badge hud-badge-success">SAFE (&lt;10 µSv/h)</span>;
                    if (doseVal > 1000) badge = <span className="hud-badge hud-badge-danger">HIGH RADIATION (&gt;1 mSv/h)</span>;
                    else if (doseVal > 100) badge = <span className="hud-badge hud-badge-warning">RADIATION AREA (&gt;100 µSv/h)</span>;
                    else if (doseVal > 10) badge = <span className="hud-badge hud-badge-primary">CONTROLLED (&gt;10 µSv/h)</span>;

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            className="form-control"
                            value={t.name}
                            onChange={e => {
                              const a = [...targets];
                              a[idx].name = e.target.value;
                              setTargets(a);
                            }}
                            style={{ fontWeight: 'bold', width: '200px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>X:</span>
                            <input
                              type="number" step="0.1" className="form-control"
                              value={t.x}
                              onChange={e => { const a = [...targets]; a[idx].x = Number(e.target.value); setTargets(a); }}
                              style={{ width: '65px' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Y:</span>
                            <input
                              type="number" step="0.1" className="form-control"
                              value={t.y}
                              onChange={e => { const a = [...targets]; a[idx].y = Number(e.target.value); setTargets(a); }}
                              style={{ width: '65px' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Z:</span>
                            <input
                              type="number" step="0.1" className="form-control"
                              value={t.z}
                              onChange={e => { const a = [...targets]; a[idx].z = Number(e.target.value); setTargets(a); }}
                              style={{ width: '65px' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', fontSize: '1rem', color: doseVal > 1000 ? '#ff3366' : 'var(--color-primary)' }}>
                          {doseVal > 1000 ? `${(doseVal / 1000).toFixed(2)} mSv/h` : `${doseVal.toFixed(2)} µSv/h`}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{badge}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => setTargets(targets.filter(tgt => tgt.id !== t.id))}
                            className="btn btn-sm btn-outline-danger"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Point Sources */}
        {activeTab === 'sources' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Radiation Point Sources</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Isotropic point source emitters characterized by 3D coordinates, activity, and specific gamma-ray constants.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setSources([
                  ...sources,
                  { id: Date.now(), name: `Source-${sources.length + 1}`, x: dimX / 2, y: dimY / 2, z: dimZ / 2, activity_MBq: 1000, gamma_uSv: 500 }
                ])}
              >
                + Add Point Source
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
              {sources.map((s, idx) => (
                <div key={s.id} style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="hud-badge hud-badge-accent">SOURCE #{idx + 1}</span>
                      <input
                        className="form-control"
                        value={s.name}
                        onChange={e => {
                          const a = [...sources];
                          a[idx].name = e.target.value;
                          setSources(a);
                        }}
                        style={{ fontWeight: 'bold', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => setSources(sources.filter(src => src.id !== s.id))}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>X (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={s.x}
                        onChange={e => { const a = [...sources]; a[idx].x = Number(e.target.value); setSources(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Y (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={s.y}
                        onChange={e => { const a = [...sources]; a[idx].y = Number(e.target.value); setSources(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Z (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={s.z}
                        onChange={e => { const a = [...sources]; a[idx].z = Number(e.target.value); setSources(a); }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Activity (MBq)</label>
                      <input
                        type="number" className="form-control"
                        value={s.activity_MBq}
                        onChange={e => { const a = [...sources]; a[idx].activity_MBq = Number(e.target.value); setSources(a); }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        ≈ {(s.activity_MBq / 37000).toFixed(3)} Ci
                      </span>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Γ Const (µSv·cm²/MBq·h)</label>
                      <input
                        type="number" className="form-control"
                        value={s.gamma_uSv}
                        onChange={e => { const a = [...sources]; a[idx].gamma_uSv = Number(e.target.value); setSources(a); }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Unshielded @ 1m: {((s.activity_MBq * s.gamma_uSv) / 10000).toFixed(1)} µSv/h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Structure Shields */}
        {activeTab === 'shields' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8' }}>Structure Shields &amp; Geometric Obstacles</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  3D solid barrier volumes with Ray-AABB intersection calculations and Tenth-Value Layer attenuation.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShields([
                  ...shields,
                  { id: Date.now(), name: `Shield-${shields.length + 1}`, x: 5, y: 5, z: 2.5, w: 2, l: 0.5, h: 5, material: 'CONCRETE', tvl_cm: 14.7 }
                ])}
              >
                + Add Shield Block
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
              {shields.map((sh, idx) => (
                <div key={sh.id} style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="hud-badge hud-badge-primary">BARRIER #{idx + 1}</span>
                      <input
                        className="form-control"
                        value={sh.name}
                        onChange={e => {
                          const a = [...shields];
                          a[idx].name = e.target.value;
                          setShields(a);
                        }}
                        style={{ fontWeight: 'bold', width: '220px' }}
                      />
                    </div>
                    <button
                      onClick={() => setShields(shields.filter(s => s.id !== sh.id))}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Center X (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.x}
                        onChange={e => { const a = [...shields]; a[idx].x = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Center Y (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.y}
                        onChange={e => { const a = [...shields]; a[idx].y = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Center Z (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.z}
                        onChange={e => { const a = [...shields]; a[idx].z = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Width W (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.w}
                        onChange={e => { const a = [...shields]; a[idx].w = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Length L (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.l}
                        onChange={e => { const a = [...shields]; a[idx].l = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Height H (m)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.h}
                        onChange={e => { const a = [...shields]; a[idx].h = Number(e.target.value); setShields(a); }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Material Preset</label>
                      <select
                        className="form-control"
                        value={sh.material || 'CUSTOM'}
                        onChange={e => {
                          const matKey = e.target.value;
                          const a = [...shields];
                          a[idx].material = matKey;
                          if (SHIELDING_MATERIALS[matKey]) {
                            a[idx].tvl_cm = SHIELDING_MATERIALS[matKey].tvl_cm;
                          }
                          setShields(a);
                        }}
                      >
                        {Object.keys(SHIELDING_MATERIALS).map(key => (
                          <option key={key} value={key}>{SHIELDING_MATERIALS[key].name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>TVL (cm)</label>
                      <input
                        type="number" step="0.1" className="form-control"
                        value={sh.tvl_cm}
                        onChange={e => {
                          const a = [...shields];
                          a[idx].tvl_cm = Number(e.target.value);
                          a[idx].material = 'CUSTOM';
                          setShields(a);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Physics & Derivations */}
        {activeTab === 'physics' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              3D Radiation Field &amp; Ray-AABB Geometric Intersection Formulations
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>1. 3D Inverse-Square Dose Superposition</h4>
                <BlockMath math="\dot{D}(x, y, z) = \sum_{s=1}^N \frac{A_s \cdot \Gamma_s}{r_s^2} \cdot 10^{-\sum_k \frac{t_{s,k}}{\text{TVL}_k}}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Total absorbed dose rate at any spatial coordinate $(x, y, z)$ is the linear superposition of all point sources, attenuated by line-of-sight barrier penetration.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>2. Fast Ray-AABB Intersection Fraction</h4>
                <BlockMath math="t_{x1} = \frac{x_{\min} - s_x}{p_x - s_x}, \quad t_{x2} = \frac{x_{\max} - s_x}{p_x - s_x}" />
                <BlockMath math="t_{\text{enter}} = \max(\min(t_{x1}, t_{x2}), \min(t_{y1}, t_{y2}), \min(t_{z1}, t_{z2}))" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Slab clipping algorithm calculating parameter interval <InlineMath math="[t_{\text{enter}}, t_{\text{exit}}]" /> along normalized ray <InlineMath math="\vec{r}(t) = \vec{s} + t(\vec{p} - \vec{s})" />.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>3. Tenth-Value Layer (TVL) Decade Attenuation</h4>
                <BlockMath math="\text{Decades} = \frac{f_{\text{shield}} \cdot d_{\text{total}}}{\text{TVL}}, \quad \text{AttenFactor} = 10^{\text{Decades}}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Each Tenth-Value Layer reduces photon transmission by exactly 90% (factor of 10). Multi-material paths sum decades linearly.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>4. Voxel Cloud Filtering &amp; Singularities</h4>
                <BlockMath math="\lim_{r \to 0} \frac{A \cdot \Gamma}{r^2} = \infty" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Inverse-square law produces a mathematical singularity at <InlineMath math="r=0" />. Minimum range clamping (<InlineMath math="r_{\min} = 1\text{ cm}" />) and adjustable shell boundaries (<InlineMath math="D_{\min}, D_{\max}" />) ensure stable WebGL isosurface rendering.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default Spatial3DModule;
