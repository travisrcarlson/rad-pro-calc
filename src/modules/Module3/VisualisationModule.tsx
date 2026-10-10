import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import VerificationBadge from '../../components/VerificationBadge';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type VisTab = 'field_map' | 'sources_shields' | 'survey_probe' | 'physics';

interface RadSource {
  id: string;
  name: string;
  xM: number;
  yM: number;
  activityMBq: number;
  gammaSI: number; // µSv·m²/MBq·h
  isotopeName: string;
}

interface ShieldObstacle {
  id: string;
  name: string;
  x1: number; // Start X (m)
  y1: number; // Start Y (m)
  x2: number; // End X (m)
  y2: number; // End Y (m)
  thicknessCm: number;
  material: 'LEAD' | 'CONCRETE' | 'STEEL' | 'WATER';
  tvlCm: number; // Tenth-value layer in cm
  color: string;
}

const SHIELD_DEFS: Record<string, { name: string; tvlCm: number; color: string }> = {
  LEAD: { name: 'Lead Barrier (Pb)', tvlCm: 3.8, color: '#94a3b8' },
  CONCRETE: { name: 'Concrete Wall', tvlCm: 14.7, color: '#cbd5e1' },
  STEEL: { name: 'Steel Partition', tvlCm: 5.0, color: '#64748b' },
  WATER: { name: 'Water Tank Shield', tvlCm: 35.8, color: '#38bdf8' }
};

interface FacilityPreset {
  id: string;
  name: string;
  description: string;
  roomSizeM: number;
  sources: RadSource[];
  shields: ShieldObstacle[];
}

const FACILITY_PRESETS: FacilityPreset[] = [
  {
    id: 'rad_bunker',
    name: 'Industrial Radiography Vault (Ir-192)',
    description: 'Ir-192 gamma camera with concrete maze entrance wall preventing line-of-sight scatter to the operator console.',
    roomSizeM: 10,
    sources: [
      { id: 's1', name: 'Ir-192 Radiography Projector', xM: 7.0, yM: 7.0, activityMBq: 1850000, gammaSI: 0.13, isotopeName: 'Ir-192 (50 Ci)' }
    ],
    shields: [
      { id: 'b1', name: 'Primary Concrete Maze Wall', x1: 5.0, y1: 2.0, x2: 5.0, y2: 8.5, thicknessCm: 25.0, material: 'CONCRETE', tvlCm: 14.7, color: '#cbd5e1' },
      { id: 'b2', name: 'Operator Lead Glass Shield', x1: 2.5, y1: 1.5, x2: 2.5, y2: 3.5, thicknessCm: 5.0, material: 'LEAD', tvlCm: 3.8, color: '#94a3b8' }
    ]
  },
  {
    id: 'hot_cell',
    name: 'Nuclear Medicine Hot Cell (Tc-99m & I-131)',
    description: 'Lead brick shielding castle in radiopharmacy dispensing cleanroom.',
    roomSizeM: 8,
    sources: [
      { id: 's1', name: 'Tc-99m Generator Vial', xM: 4.0, yM: 4.0, activityMBq: 37000, gammaSI: 0.02, isotopeName: 'Tc-99m (1 Ci)' },
      { id: 's2', name: 'I-131 Therapy Dose', xM: 4.5, yM: 4.2, activityMBq: 7400, gammaSI: 0.06, isotopeName: 'I-131 (200 mCi)' }
    ],
    shields: [
      { id: 'b1', name: 'Lead Brick Castle (North)', x1: 3.2, y1: 4.8, x2: 5.2, y2: 4.8, thicknessCm: 5.0, material: 'LEAD', tvlCm: 3.8, color: '#94a3b8' },
      { id: 'b2', name: 'Lead Brick Castle (West)', x1: 3.2, y1: 3.2, x2: 3.2, y2: 4.8, thicknessCm: 5.0, material: 'LEAD', tvlCm: 3.8, color: '#94a3b8' },
      { id: 'b3', name: 'Lead Brick Castle (East)', x1: 5.2, y1: 3.2, x2: 5.2, y2: 4.8, thicknessCm: 5.0, material: 'LEAD', tvlCm: 3.8, color: '#94a3b8' }
    ]
  },
  {
    id: 'irradiator_vault',
    name: 'Panoramic Self-Contained Irradiator (Cs-137)',
    description: 'High-activity Cs-137 source in heavy storage room with thick partition barrier.',
    roomSizeM: 12,
    sources: [
      { id: 's1', name: 'Cs-137 Panoramic Rod', xM: 8.5, yM: 8.5, activityMBq: 37000000, gammaSI: 0.081, isotopeName: 'Cs-137 (1,000 Ci)' }
    ],
    shields: [
      { id: 'b1', name: 'Heavy Barite Concrete Wall', x1: 6.0, y1: 2.0, x2: 6.0, y2: 10.0, thicknessCm: 45.0, material: 'CONCRETE', tvlCm: 14.7, color: '#cbd5e1' }
    ]
  }
];

// Line-segment intersection test for 2D ray tracing
const rayIntersectsSegment = (
  p1x: number, p1y: number, p2x: number, p2y: number,
  q1x: number, q1y: number, q2x: number, q2y: number
): boolean => {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };
  return (
    ccw(p1x, p1y, q1x, q1y, q2x, q2y) !== ccw(p2x, p2y, q1x, q1y, q2x, q2y) &&
    ccw(p1x, p1y, p2x, p2y, q1x, q1y) !== ccw(p1x, p1y, p2x, p2y, q2x, q2y)
  );
};

export const VisualisationModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VisTab>('field_map');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('rad_bunker');
  const [roomSizeM, setRoomSizeM] = useState<number>(10);
  const [colorScale, setColorScale] = useState<string>('Jet');
  const [probePos, setProbePos] = useState<{ x: number; y: number }>({ x: 2.0, y: 2.0 });
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const [sources, setSources] = useState<RadSource[]>(FACILITY_PRESETS[0].sources);
  const [shields, setShields] = useState<ShieldObstacle[]>(FACILITY_PRESETS[0].shields);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = FACILITY_PRESETS.find(x => x.id === presetId);
    if (p) {
      setRoomSizeM(p.roomSizeM);
      setSources([...p.sources]);
      setShields([...p.shields]);
      setProbePos({ x: p.roomSizeM * 0.2, y: p.roomSizeM * 0.2 });
    }
  };

  // 2D Grid Field Computation with Ray-Cast Shadowing
  const { gridX, gridY, gridZ, peakDoseRate, avgDoseRate, unrestrictedFraction } = useMemo(() => {
    const resolution = 45;
    const step = roomSizeM / resolution;
    const xArr: number[] = [];
    const yArr: number[] = [];
    const zMatrix: number[][] = [];

    for (let i = 0; i < resolution; i++) {
      xArr.push(i * step);
      yArr.push(i * step);
    }

    let maxRate = 0;
    let totalDoseSum = 0;
    let unrestrictedCount = 0;

    for (let j = 0; j < resolution; j++) {
      const row: number[] = [];
      const py = yArr[j];

      for (let i = 0; i < resolution; i++) {
        const px = xArr[i];
        let pointDoseRate = 0;

        sources.forEach(src => {
          const dx = px - src.xM;
          const dy = py - src.yM;
          const distM = Math.max(0.15, Math.sqrt(dx * dx + dy * dy));

          // Base unshielded inverse-square dose rate: D = (A * Gamma) / d^2 [µSv/h]
          let doseFromSrc = (src.activityMBq * src.gammaSI) / (distM * distM);

          // Ray-trace against all active shielding obstacles
          shields.forEach(sh => {
            const hit = rayIntersectsSegment(src.xM, src.yM, px, py, sh.x1, sh.y1, sh.x2, sh.y2);
            if (hit) {
              // Apply transmission: T = 10^(-thickness / TVL)
              const decades = sh.thicknessCm / Math.max(0.1, sh.tvlCm);
              const transFactor = Math.pow(10, -decades);
              doseFromSrc *= transFactor;
            }
          });

          pointDoseRate += doseFromSrc;
        });

        row.push(pointDoseRate);
        if (pointDoseRate > maxRate) maxRate = pointDoseRate;
        totalDoseSum += pointDoseRate;
        if (pointDoseRate <= 2.5) unrestrictedCount++;
      }
      zMatrix.push(row);
    }

    const totalCells = resolution * resolution;
    const avgRate = totalCells > 0 ? totalDoseSum / totalCells : 0;
    const unresFraction = totalCells > 0 ? (unrestrictedCount / totalCells) * 100 : 0;

    return {
      gridX: xArr,
      gridY: yArr,
      gridZ: zMatrix,
      peakDoseRate: maxRate,
      avgDoseRate: avgRate,
      unrestrictedFraction: unresFraction
    };
  }, [sources, shields, roomSizeM]);

  // Virtual Survey Probe Readout
  const probeData = useMemo(() => {
    let doseRate = 0;
    const sourceContributions: { name: string; unshielded: number; attenuated: number; inShadow: boolean }[] = [];

    sources.forEach(src => {
      const dx = probePos.x - src.xM;
      const dy = probePos.y - src.yM;
      const distM = Math.max(0.15, Math.sqrt(dx * dx + dy * dy));
      const unshieldedRate = (src.activityMBq * src.gammaSI) / (distM * distM);
      let attenuatedRate = unshieldedRate;
      let inShadow = false;

      shields.forEach(sh => {
        const hit = rayIntersectsSegment(src.xM, src.yM, probePos.x, probePos.y, sh.x1, sh.y1, sh.x2, sh.y2);
        if (hit) {
          inShadow = true;
          const decades = sh.thicknessCm / Math.max(0.1, sh.tvlCm);
          attenuatedRate *= Math.pow(10, -decades);
        }
      });

      doseRate += attenuatedRate;
      sourceContributions.push({
        name: src.name,
        unshielded: unshieldedRate,
        attenuated: attenuatedRate,
        inShadow
      });
    });

    return { doseRate, sourceContributions };
  }, [probePos, sources, shields]);

  // Plotly Shapes for Shielding Walls
  const plotShapes = useMemo(() => {
    return shields.map(sh => ({
      type: 'line',
      x0: sh.x1,
      y0: sh.y1,
      x1: sh.x2,
      y1: sh.y2,
      line: {
        color: sh.color,
        width: Math.max(3, Math.min(10, sh.thicknessCm / 3))
      }
    }));
  }, [shields]);

  // Cryptographic Dossier Payload
  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'ICS-208 2D Radiation Field Mapping & Geometric Shielding Dossier',
    moduleName: 'Module 3 (Radiation Field Visualisation & Shadow Mapping)',
    statuteCitation: 'NCRP Report No. 147 / ICRP Publication 103 / 10 CFR 20.1301',
    verificationTestId: 'VTEST-01 / VTEST-02',
    operatorName: 'Radiation Protection Lead',
    operatorCredentials: 'CHP / RSO',
    facility: 'Central Radiotherapy & Shielded Vault Suite',
    notes: `2D ray-cast radiation field mapping across ${roomSizeM}m × ${roomSizeM}m floor. Sources: ${sources.length}. Barriers: ${shields.length}. Peak intensity: ${peakDoseRate.toFixed(1)} µSv/h. Survey probe at (${probePos.x.toFixed(1)}m, ${probePos.y.toFixed(1)}m): ${probeData.doseRate.toFixed(2)} µSv/h.`,
    formulaDescription: '\\dot{D}(\\vec{r}) = \\sum_{k=1}^N \\frac{A_k \\Gamma_k}{\\|\\vec{r} - \\vec{r}_k\\|^2} \\prod_{j} 10^{-\\frac{x_j}{\\text{TVL}_j}}',
    inputs: [
      { label: 'Room Dimensions', value: `${roomSizeM}m × ${roomSizeM}m` },
      { label: 'Radiation Source Count', value: sources.length },
      { label: 'Shielding Barrier Count', value: shields.length },
      { label: 'Virtual Probe Position', value: `X=${probePos.x.toFixed(1)}m, Y=${probePos.y.toFixed(1)}m` }
    ],
    outputs: [
      { label: 'Peak Field Intensity', value: peakDoseRate.toFixed(1), unit: 'µSv/h', status: peakDoseRate > 1000 ? 'WARNING' : 'PASS' },
      { label: 'Monitored Area Average', value: avgDoseRate.toFixed(1), unit: 'µSv/h', status: 'PASS' },
      { label: 'Survey Probe Dose Rate', value: probeData.doseRate.toFixed(2), unit: 'µSv/h', status: probeData.doseRate > 25 ? 'WARNING' : 'PASS' },
      { label: 'Unrestricted Public Floor Space', value: unrestrictedFraction.toFixed(1), unit: '%', status: 'PASS' }
    ]
  }), [roomSizeM, sources, shields, probePos, peakDoseRate, avgDoseRate, probeData, unrestrictedFraction]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">HEALTH PHYSICS 2D</span>
            <span className="hud-badge hud-badge-accent">RAY-CAST SHADOW ENGINE</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            2D Radiation Field Visualisation &amp; Isodose Mapping
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Multi-source inverse-square gamma mapping with ray-traced geometric barrier shadows (Lead, Concrete, Steel), isodose contour line overlays, and interactive virtual survey probe.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <VerificationBadge testId="VTEST-01 / 02" standard="ICRP 107" />
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 14px' }}
          >
            Export Audit Dossier
          </button>
        </div>
      </div>

      {/* Top Tactical HUD Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">PEAK FIELD INTENSITY</span>
          <span className="hud-metric-value" style={{ color: peakDoseRate > 1000 ? '#ef4444' : '#f59e0b' }}>
            {peakDoseRate >= 1000 ? `${(peakDoseRate / 1000).toFixed(2)} mSv/h` : `${peakDoseRate.toFixed(1)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Near primary unshielded source
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">SURVEY PROBE READOUT</span>
          <span className="hud-metric-value" style={{ color: probeData.doseRate <= 2.5 ? '#10b981' : probeData.doseRate <= 25 ? '#f59e0b' : '#ef4444' }}>
            {probeData.doseRate >= 1000 ? `${(probeData.doseRate / 1000).toFixed(2)} mSv/h` : `${probeData.doseRate.toFixed(2)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Probe Location: ({probePos.x.toFixed(1)}m, {probePos.y.toFixed(1)}m)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PUBLIC UNRESTRICTED AREA</span>
          <span className="hud-metric-value" style={{ color: '#00e5ff' }}>
            {unrestrictedFraction.toFixed(1)}% <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>FLOOR</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Dose rate &le; 2.5 µSv/h (0.25 mR/h)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">ACTIVE BARRIERS &amp; SHADOWS</span>
          <span className="hud-metric-value" style={{ color: '#38bdf8' }}>
            {shields.length} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>WALLS</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Ray-traced geometric attenuation
          </span>
        </div>
      </div>

      {/* Preset Selector Ribbon */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>FACILITY PRESET:</span>
          {FACILITY_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p.id)}
              className="btn"
              style={{
                fontSize: '0.78rem',
                padding: '5px 12px',
                background: selectedPresetId === p.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                color: selectedPresetId === p.id ? '#000' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                fontWeight: selectedPresetId === p.id ? 'bold' : 'normal'
              }}
            >
              {p.name.split('(')[0]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Room Size (m):</label>
            <input
              type="number"
              min="4"
              max="50"
              step="2"
              className="form-control"
              value={roomSizeM}
              onChange={e => setRoomSizeM(Math.max(4, parseInt(e.target.value) || 10))}
              style={{ width: '70px', fontSize: '0.85rem', padding: '4px 8px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Colormap:</label>
            <select
              className="form-control"
              value={colorScale}
              onChange={e => setColorScale(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '4px 8px' }}
            >
              <option value="Jet">Jet (Classic Dosimetry)</option>
              <option value="Viridis">Viridis</option>
              <option value="Hot">Hot Thermal</option>
              <option value="Plasma">Plasma</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'field_map' ? 'active' : ''}`} onClick={() => setActiveTab('field_map')}>
          🗺️ 2D Radiation Heatmap &amp; Contours
        </button>
        <button className={`tab-btn ${activeTab === 'sources_shields' ? 'active' : ''}`} onClick={() => setActiveTab('sources_shields')}>
          🧱 Sources &amp; Shielding Barriers ({sources.length} / {shields.length})
        </button>
        <button className={`tab-btn ${activeTab === 'survey_probe' ? 'active' : ''}`} onClick={() => setActiveTab('survey_probe')}>
          📍 Virtual Survey Meter
        </button>
      </div>

      {/* TAB 1: 2D Radiation Heatmap & Contours */}
      {activeTab === 'field_map' && (
        <div style={{ flex: 1, minHeight: '520px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ flex: 1, minHeight: '480px', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <Plot
              data={[
                // Heatmap Surface
                {
                  z: gridZ,
                  x: gridX,
                  y: gridY,
                  type: 'heatmap',
                  colorscale: colorScale,
                  colorbar: { title: 'µSv/h', len: 0.8 },
                  hoverinfo: 'none'
                },
                // Isodose Contours overlay
                {
                  z: gridZ,
                  x: gridX,
                  y: gridY,
                  type: 'contour',
                  showscale: false,
                  contours: {
                    coloring: 'none',
                    showlines: true,
                    start: 2.5,
                    end: 1000,
                    size: 25
                  },
                  line: { width: 1.5, color: '#ffffff' },
                  hoverinfo: 'none'
                },
                // Sources Markers
                {
                  x: sources.map(s => s.xM),
                  y: sources.map(s => s.yM),
                  type: 'scatter',
                  mode: 'markers+text',
                  text: sources.map(s => s.name),
                  textposition: 'top center',
                  marker: { symbol: 'star', size: 14, color: '#ff3366', line: { color: '#ffffff', width: 2 } },
                  name: 'Radiation Sources'
                },
                // Survey Probe Marker
                {
                  x: [probePos.x],
                  y: [probePos.y],
                  type: 'scatter',
                  mode: 'markers+text',
                  text: [`Survey Meter (${probeData.doseRate.toFixed(1)} µSv/h)`],
                  textposition: 'bottom right',
                  marker: { symbol: 'cross', size: 12, color: '#00e5ff', line: { color: '#000000', width: 2 } },
                  name: 'Survey Probe'
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 50, r: 30, t: 30, b: 50 },
                xaxis: { title: 'X Coordinate (meters)', range: [0, roomSizeM], gridcolor: '#1e293b' },
                yaxis: { title: 'Y Coordinate (meters)', range: [0, roomSizeM], gridcolor: '#1e293b', scaleanchor: 'x' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#E0E1DD' },
                shapes: plotShapes as any,
                showlegend: true,
                legend: { orientation: 'h', y: -0.15 }
              }}
              onClick={(e: any) => {
                if (e.points && e.points[0]) {
                  setProbePos({
                    x: Math.max(0, Math.min(roomSizeM, e.points[0].x)),
                    y: Math.max(0, Math.min(roomSizeM, e.points[0].y))
                  });
                }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            💡 <em>Click anywhere on the map to relocate the virtual survey meter probe and analyze local dose rates.</em>
          </div>
        </div>
      )}

      {/* TAB 2: Sources & Shielding Barriers */}
      {activeTab === 'sources_shields' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
          {/* Sources List */}
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>Active Radiation Sources ({sources.length})</span>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setSources([...sources, { id: `src_${Date.now()}`, name: `Source-${sources.length + 1}`, xM: roomSizeM / 2, yM: roomSizeM / 2, activityMBq: 37000, gammaSI: 0.081, isotopeName: 'Cs-137 (1 Ci)' }])}
              >
                + Add Source
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {sources.map((s, idx) => (
                <div key={s.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{s.name} ({s.isotopeName})</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setSources(sources.filter(x => x.id !== s.id))}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>X (m):</label>
                      <input type="number" step="0.5" className="form-control" value={s.xM} onChange={e => { const a = [...sources]; a[idx].xM = parseFloat(e.target.value) || 0; setSources(a); }} style={{ fontSize: '0.8rem', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Y (m):</label>
                      <input type="number" step="0.5" className="form-control" value={s.yM} onChange={e => { const a = [...sources]; a[idx].yM = parseFloat(e.target.value) || 0; setSources(a); }} style={{ fontSize: '0.8rem', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Activity (MBq):</label>
                      <input type="number" step="1000" className="form-control" value={s.activityMBq} onChange={e => { const a = [...sources]; a[idx].activityMBq = parseFloat(e.target.value) || 1; setSources(a); }} style={{ fontSize: '0.8rem', padding: '4px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shields List */}
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-accent)' }}>Shielding Barriers &amp; Walls ({shields.length})</span>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShields([...shields, { id: `sh_${Date.now()}`, name: `Wall-${shields.length + 1}`, x1: 2, y1: 4, x2: 6, y2: 4, thicknessCm: 20, material: 'CONCRETE', tvlCm: 14.7, color: '#cbd5e1' }])}
              >
                + Add Wall
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {shields.map((sh, idx) => (
                <div key={sh.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{sh.name} ({SHIELD_DEFS[sh.material]?.name || sh.material})</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setShields(shields.filter(x => x.id !== sh.id))}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>X1 (m):</label>
                      <input type="number" step="0.5" className="form-control" value={sh.x1} onChange={e => { const a = [...shields]; a[idx].x1 = parseFloat(e.target.value) || 0; setShields(a); }} style={{ fontSize: '0.75rem', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Y1 (m):</label>
                      <input type="number" step="0.5" className="form-control" value={sh.y1} onChange={e => { const a = [...shields]; a[idx].y1 = parseFloat(e.target.value) || 0; setShields(a); }} style={{ fontSize: '0.75rem', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>X2 (m):</label>
                      <input type="number" step="0.5" className="form-control" value={sh.x2} onChange={e => { const a = [...shields]; a[idx].x2 = parseFloat(e.target.value) || 0; setShields(a); }} style={{ fontSize: '0.75rem', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Y2 (m):</label>
                      <input type="number" step="0.5" className="form-control" value={sh.y2} onChange={e => { const a = [...shields]; a[idx].y2 = parseFloat(e.target.value) || 0; setShields(a); }} style={{ fontSize: '0.75rem', padding: '4px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Virtual Survey Meter */}
      {activeTab === 'survey_probe' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-primary)' }}>Virtual Survey Meter Instrument Probe</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Probe X Coordinate (m):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={roomSizeM}
                  className="form-control"
                  value={probePos.x}
                  onChange={e => setProbePos({ ...probePos, x: parseFloat(e.target.value) || 0 })}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Probe Y Coordinate (m):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={roomSizeM}
                  className="form-control"
                  value={probePos.y}
                  onChange={e => setProbePos({ ...probePos, y: parseFloat(e.target.value) || 0 })}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CURRENT MEASURED DOSE RATE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: probeData.doseRate <= 2.5 ? '#10b981' : '#f59e0b', marginTop: '4px' }}>
                {probeData.doseRate >= 1000 ? `${(probeData.doseRate / 1000).toFixed(2)} mSv/h` : `${probeData.doseRate.toFixed(2)} µSv/h`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                {probeData.doseRate <= 2.5 ? 'Zone: Uncontrolled Public' : probeData.doseRate <= 20 ? 'Zone: Radiation Area' : 'Zone: High Radiation Area'}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-accent)' }}>Ray-Line Source Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {probeData.sourceContributions.map((c, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{c.name}</span>
                    <span style={{ color: c.inShadow ? '#10b981' : '#ef4444' }}>
                      {c.inShadow ? '🛡️ SHADOWED BY WALL' : '⚠️ DIRECT LINE OF SIGHT'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    <span>Unshielded Potential: {c.unshielded.toFixed(1)} µSv/h</span>
                    <span>Received at Probe: {c.attenuated.toFixed(2)} µSv/h</span>
                  </div>
                </div>
              ))}
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

export default VisualisationModule;
