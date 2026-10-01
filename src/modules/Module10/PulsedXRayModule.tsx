import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;

type GeneratorMode = 'medical_continuous' | 'flash_pulsed';

interface Preset {
  id: string;
  name: string;
  mode: GeneratorMode;
  kvp: number;
  // Medical params
  ma?: number;
  timeSeconds?: number;
  // Flash params
  mrPerPulseAt30cm?: number;
  pulseWidthNs?: number;
  totalPulses?: number;
  manufacturer?: string;
}

const PRESETS: Preset[] = [
  { id: 'xr150', name: 'Golden Engineering XR150 (150 kVp)', mode: 'flash_pulsed', kvp: 150, mrPerPulseAt30cm: 2.4, pulseWidthNs: 50, totalPulses: 10, manufacturer: 'Golden Engineering' },
  { id: 'xr200', name: 'Golden Engineering XR200 (150 kVp)', mode: 'flash_pulsed', kvp: 150, mrPerPulseAt30cm: 3.0, pulseWidthNs: 50, totalPulses: 10, manufacturer: 'Golden Engineering' },
  { id: 'xrs3', name: 'Golden Engineering XRS-3 / XR300 (270 kVp)', mode: 'flash_pulsed', kvp: 270, mrPerPulseAt30cm: 3.0, pulseWidthNs: 25, totalPulses: 10, manufacturer: 'Golden Engineering' },
  { id: 'xrs4', name: 'Golden Engineering XRS-4 (370 kVp)', mode: 'flash_pulsed', kvp: 370, mrPerPulseAt30cm: 6.25, pulseWidthNs: 10, totalPulses: 10, manufacturer: 'Golden Engineering' },
  { id: 'dental', name: 'Standard Dental Intraoral (70 kVp)', mode: 'medical_continuous', kvp: 70, ma: 7, timeSeconds: 0.2, manufacturer: 'Diagnostic Clinical' },
  { id: 'fluoro', name: 'Surgical C-Arm Fluoro (100 kVp)', mode: 'medical_continuous', kvp: 100, ma: 3, timeSeconds: 60, manufacturer: 'Interventional Surgical' },
  { id: 'ct', name: 'Medical CT Scanner (120 kVp)', mode: 'medical_continuous', kvp: 120, ma: 200, timeSeconds: 1, manufacturer: 'Diagnostic Radiology' }
];

type WorkspaceTab = 'beam_map' | 'detector_saturation' | 'controls' | 'physics';

const PulsedXRayModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('beam_map');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('xr200');
  const [distanceMeters, setDistanceMeters] = useState<number>(1.0);

  // Custom manual overrides
  const [overrideMode, setOverrideMode] = useState<GeneratorMode>('flash_pulsed');
  const [customKvp, setCustomKvp] = useState<number>(150);

  // Flash
  const [customMrPerPulse, setCustomMrPerPulse] = useState<number>(3.0);
  const [customPulses, setCustomPulses] = useState<number>(10);
  const [customPulseWidthNs, setCustomPulseWidthNs] = useState<number>(50);

  // Medical
  const [customMa, setCustomMa] = useState<number>(10);
  const [customTime, setCustomTime] = useState<number>(1.0);

  const handlePresetChange = (pid: string) => {
    setSelectedPresetId(pid);
    if (pid !== 'custom') {
      const p = PRESETS.find(x => x.id === pid)!;
      setOverrideMode(p.mode);
      setCustomKvp(p.kvp);
      if (p.mode === 'flash_pulsed') {
        setCustomMrPerPulse(p.mrPerPulseAt30cm || 0);
        setCustomPulses(p.totalPulses || 1);
        setCustomPulseWidthNs(p.pulseWidthNs || 50);
      } else {
        setCustomMa(p.ma || 0);
        setCustomTime(p.timeSeconds || 1);
      }
    }
  };

  const calcDoseAtDistance = React.useCallback((dist_m: number) => {
    let accumulatedDose_uSv = 0;
    let instantaneousRate_Sv_H = 0;
    const dist = Math.max(dist_m, 0.05);

    if (overrideMode === 'flash_pulsed') {
      const doseAt30cm_uSv = customMrPerPulse * 10.0;
      const distanceFactor = Math.pow(0.3 / dist, 2);
      const dosePerPulseAtTarget_uSv = doseAt30cm_uSv * distanceFactor;
      accumulatedDose_uSv = dosePerPulseAtTarget_uSv * customPulses;
      const pulseWidthSec = customPulseWidthNs * 1e-9;
      const svPerSec = (dosePerPulseAtTarget_uSv / 1_000_000) / pulseWidthSec;
      instantaneousRate_Sv_H = svPerSec * 3600;
    } else {
      const mAs = customMa * customTime;
      const k = 0.00005;
      const doseAt1m_mSv = k * Math.pow(customKvp, 2) * mAs;
      const doseAtTarget_mSv = doseAt1m_mSv / Math.pow(dist, 2);
      accumulatedDose_uSv = doseAtTarget_mSv * 1000;
      const rateAt1m_mSvH = k * Math.pow(customKvp, 2) * customMa * 3600;
      const rateAtTarget_mSvH = rateAt1m_mSvH / Math.pow(dist, 2);
      instantaneousRate_Sv_H = rateAtTarget_mSvH / 1000;
    }
    return { accumulatedDose_uSv, instantaneousRate_Sv_H };
  }, [overrideMode, customMrPerPulse, customPulses, customPulseWidthNs, customMa, customTime, customKvp]);

  const results = calcDoseAtDistance(distanceMeters);
  const isSaturated = results.instantaneousRate_Sv_H > 1000;

  // Generate 2D Heatmap Grid
  const { mapX, mapY, mapZ, maxMapDose } = useMemo(() => {
    const minX = -8; const maxX = 8;
    const minY = -4; const maxY = 35;
    const res = 90;

    const mX: number[] = [];
    const mY: number[] = [];
    const mZ: number[][] = [];

    const beamAngleDeg = 45;
    const leakageFactor = 0.005;
    let maxFound = 0;

    for (let j = 0; j <= res; j++) {
      const y = minY + j * ((maxY - minY) / res);
      mY.push(y);
      const row: number[] = [];
      for (let i = 0; i <= res; i++) {
        const x = minX + i * ((maxX - minX) / res);
        if (j === 0) mX.push(x);

        const dist = Math.max(0.1, Math.sqrt(x * x + y * y));
        const theta = Math.atan2(x, y) * (180 / Math.PI);

        const isInsideCone = Math.abs(theta) <= (beamAngleDeg / 2);
        const geoMultiplier = isInsideCone ? 1.0 : leakageFactor;

        const localVal = calcDoseAtDistance(dist).accumulatedDose_uSv * geoMultiplier;
        if (localVal > maxFound && isInsideCone) maxFound = localVal;
        row.push(localVal);
      }
      mZ.push(row);
    }
    return { mapX: mX, mapY: mY, mapZ: mZ, maxMapDose: maxFound };
  }, [calcDoseAtDistance]);

  // Saturation Profile Curve vs Distance
  const saturationCurveData = useMemo(() => {
    const distances = Array.from({ length: 100 }, (_, i) => 0.1 + (i / 99) * 30);
    const rates = distances.map(d => calcDoseAtDistance(d).instantaneousRate_Sv_H);

    return {
      distances,
      rates
    };
  }, [calcDoseAtDistance]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">TRANSIENT RADIOGRAPHY</span>
            <span className="hud-badge hud-badge-accent">FLASH X-RAY &amp; MEDICAL</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Pulsed X-Ray Systems &amp; Detector Burnout Analyzer
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Model nanosecond pulsed flash radiography (Golden Engineering XR series) vs. continuous medical beam physics, evaluate detector paralyzation, and plot OSHA exclusion zones.
          </p>
        </div>
      </div>

      {/* Top Tactical HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">GENERATOR PROFILE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)', fontSize: '1.15rem' }}>
            {customKvp} kVp
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Mode: {overrideMode === 'flash_pulsed' ? `Flash Pulsed (${customPulses} shots @ ${customPulseWidthNs}ns)` : `Continuous (${customMa}mA, ${customTime}s)`}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">TARGET DISTANCE</span>
          <span className="hud-metric-value" style={{ color: '#fff' }}>
            {distanceMeters.toFixed(2)} m
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Beam Axis: Normal (0° Azimuth)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">TOTAL ACCUMULATED DOSE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-success)' }}>
            {results.accumulatedDose_uSv > 1000
              ? `${(results.accumulatedDose_uSv / 1000).toFixed(2)} mSv`
              : `${results.accumulatedDose_uSv.toFixed(2)} µSv`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            At Target Sensor Location ({distanceMeters}m)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">DETECTOR FLUX &amp; SATURATION</span>
          <span className="hud-metric-value">
            {isSaturated ? (
              <span className="hud-badge hud-badge-danger">SATURATION / FAIL-TO-ZERO</span>
            ) : (
              <span className="hud-badge hud-badge-success">LINEAR DETECTOR REGIME</span>
            )}
          </span>
          <span style={{ fontSize: '0.75rem', color: isSaturated ? '#ff3366' : 'var(--color-text-muted)', marginTop: '4px', fontWeight: isSaturated ? 'bold' : 'normal' }}>
            Peak Rate: {results.instantaneousRate_Sv_H > 1000
              ? `${(results.instantaneousRate_Sv_H / 1000).toExponential(2)}k Sv/h`
              : `${results.instantaneousRate_Sv_H.toExponential(2)} Sv/h`}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'beam_map' ? 'active' : ''}`}
          onClick={() => setActiveTab('beam_map')}
        >
          Beam Geometry &amp; Exclusion Zones
        </button>
        <button
          className={`tab-btn ${activeTab === 'detector_saturation' ? 'active' : ''}`}
          onClick={() => setActiveTab('detector_saturation')}
        >
          Detector Saturation Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          Machine Generator Parameters
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          Transient Physics &amp; Dead-Time
        </button>
      </div>

      {/* Workspace Tab Contents */}
      <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
        
        {/* TAB 1: Beam Geometry & Exclusion Zones */}
        {activeTab === 'beam_map' && (
          <div style={{ height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ff3366', borderRadius: '2px' }}></span> X-Ray Tube Window
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span> Target Sensor Position
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '2px', background: '#f59e0b', borderTop: '1px dashed #f59e0b' }}></span> Manufacturer Exclusion Perimeter (100ft Front / 10ft Rear)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Distance (m):</label>
                <input
                  type="number" step="0.2" min="0.1" max="30"
                  className="form-control"
                  style={{ width: '80px', padding: '4px 8px', fontSize: '0.85rem' }}
                  value={distanceMeters}
                  onChange={e => setDistanceMeters(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '460px', position: 'relative' }}>
              <Plot
                data={[
                  {
                    z: mapZ, x: mapX, y: mapY,
                    type: 'heatmap', colorscale: 'Hot',
                    zmin: 0, zmax: maxMapDose > 5000 ? 5000 : maxMapDose,
                    colorbar: { title: { text: 'µSv' }, len: 0.8, x: 0.98 }
                  },
                  {
                    x: [0], y: [distanceMeters],
                    mode: 'markers+text', type: 'scatter', name: 'Target',
                    marker: { symbol: 'cross', color: '#10b981', size: 14, line: { width: 3, color: '#ffffff' } },
                    text: [`[TARGET] ${distanceMeters.toFixed(1)}m`],
                    textposition: 'top right',
                    textfont: { color: '#6ee7b7', size: 11 },
                    hoverinfo: 'none'
                  },
                  {
                    x: [0], y: [0],
                    mode: 'markers+text', type: 'scatter', name: 'Tube',
                    marker: { symbol: 'square', color: '#ff3366', size: 10, line: { width: 2, color: '#ffffff' } },
                    text: ['[X-RAY TUBE APERTURE]'],
                    textposition: 'bottom center',
                    textfont: { color: '#ff6b8b', size: 11 },
                    hoverinfo: 'none'
                  }
                ]}
                layout={{
                  autosize: true, margin: { l: 50, r: 60, t: 20, b: 50 },
                  xaxis: { title: { text: 'Cross-Beam Lateral Offset X (m)' }, gridcolor: '#1e293b' },
                  yaxis: { title: { text: 'Forward Beam Distance Y (m)' }, scaleanchor: 'x', scaleratio: 1, gridcolor: '#1e293b' },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  showlegend: false,
                  shapes: overrideMode === 'flash_pulsed' ? [
                    // Front exclusion zone (100ft = 30.5m)
                    {
                      type: 'rect', xref: 'x', yref: 'y',
                      x0: -6.1, y0: 0, x1: 6.1, y1: 30.5,
                      line: { color: '#f59e0b', width: 2, dash: 'dot' },
                      fillcolor: 'rgba(245, 158, 11, 0.08)'
                    },
                    // Rear leakage zone (10ft = 3.05m)
                    {
                      type: 'rect', xref: 'x', yref: 'y',
                      x0: -3.05, y0: -3.05, x1: 3.05, y1: 0,
                      line: { color: '#f59e0b', width: 2, dash: 'dot' },
                      fillcolor: 'rgba(245, 158, 11, 0.08)'
                    },
                    // Centroid beamline
                    {
                      type: 'line', xref: 'x', yref: 'y',
                      x0: 0, y0: 0, x1: 0, y1: 30.5,
                      line: { color: '#ff3366', width: 1, dash: 'dash' }
                    }
                  ] : []
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Detector Saturation & Linearity Analysis */}
        {activeTab === 'detector_saturation' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '340px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={[
                  {
                    x: saturationCurveData.distances,
                    y: saturationCurveData.rates,
                    type: 'scatter', mode: 'lines',
                    name: 'Instantaneous Dose Rate',
                    line: { color: 'var(--color-primary)', width: 3 }
                  },
                  {
                    x: [0.1, 30],
                    y: [1000, 1000],
                    type: 'scatter', mode: 'lines',
                    name: 'Geiger-Müller Paralyzation Threshold (1,000 Sv/h)',
                    line: { color: '#ff3366', width: 2, dash: 'dash' }
                  },
                  {
                    x: [0.1, 30],
                    y: [10, 10],
                    type: 'scatter', mode: 'lines',
                    name: 'Standard EPD Linear Limit (10 Sv/h)',
                    line: { color: '#f59e0b', width: 2, dash: 'dot' }
                  }
                ]}
                layout={{
                  autosize: true, margin: { l: 70, r: 20, t: 30, b: 50 },
                  title: { text: 'Instantaneous Exposure Rate vs. Distance (Log Scale)', font: { color: '#E0E1DD', size: 14 } },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  xaxis: { title: 'Distance from Focal Spot (meters)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Peak Instant Rate (Sv/h)', type: 'log', gridcolor: '#1e293b' },
                  showlegend: true, legend: { orientation: 'h', y: -0.25 }
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: isSaturated ? '#ff3366' : '#10b981', fontSize: '0.95rem' }}>
                  Target Health Physics Assessment (@ {distanceMeters}m)
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                  {isSaturated ? (
                    <span>
                      <strong style={{ color: '#ff3366' }}>CRITICAL SATURATION WARNING:</strong> The peak instantaneous flux during the pulse ({results.instantaneousRate_Sv_H.toExponential(2)} Sv/h) exceeds the recovery dead-time of typical GM tubes and active Electronic Personal Dosimeters (EPDs). Active devices will paralyze into continuous discharge and display 0 µSv/h!
                    </span>
                  ) : (
                    <span>
                      <strong style={{ color: '#10b981' }}>LINEAR FLUX REGIME:</strong> Instantaneous dose rate is below paralyzable saturation thresholds. Active survey meters and electronic dosimeters will record valid linear readouts.
                    </span>
                  )}
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-accent)', fontSize: '0.95rem' }}>
                  Recommended Dosimetry Protocols for Flash Radiography
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
                  <li><strong>Passive Integrating Dosimetry:</strong> Thermoluminescent (TLD) and Optically Stimulated Luminescence (OSL) badges are immune to dose-rate dead-time effects.</li>
                  <li><strong>Pulsed-Field Survey Meters:</strong> Use pressurized ion chambers with high collection voltages (e.g. Fluke 451P) or specialized flash scintillation detectors.</li>
                  <li><strong>Exclusion Zone Verification:</strong> Never rely on GM probes within the 30.5m forward cone during active firing.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Machine Generator Parameters */}
        {activeTab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            
            {/* Presets & Mode Selection */}
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>1. Equipment Preset Library</h3>
              
              <div className="form-group">
                <label className="form-label">Manufacturer &amp; Model Preset</label>
                <select className="form-control" value={selectedPresetId} onChange={e => handlePresetChange(e.target.value)}>
                  <option value="custom">-- Custom User-Defined Generator --</option>
                  {PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} [{p.manufacturer}]</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Generation Mode</label>
                <select className="form-control" value={overrideMode} onChange={e => { setOverrideMode(e.target.value as any); setSelectedPresetId('custom'); }}>
                  <option value="flash_pulsed">Flash Radiography (Pulsed ns, High Flux)</option>
                  <option value="medical_continuous">Medical / Industrial (Continuous mA)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Peak Tube Potential (kVp)</label>
                <input type="number" min="20" max="600" className="form-control" value={customKvp} onChange={e => { setCustomKvp(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dictates photon penetration spectrum and Bremsstrahlung endpoint.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Target Evaluation Distance (m)</label>
                <input type="number" step="0.1" min="0.1" className="form-control" value={distanceMeters} onChange={e => setDistanceMeters(Math.max(0.1, Number(e.target.value)))} />
              </div>
            </div>

            {/* Flash or Continuous Parameters */}
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: overrideMode === 'flash_pulsed' ? 'var(--color-accent)' : '#38bdf8' }}>
                2. {overrideMode === 'flash_pulsed' ? 'Flash Pulse Dynamics' : 'Continuous Machine Parameters'}
              </h3>

              {overrideMode === 'flash_pulsed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Output per Pulse (mR @ 30cm)</label>
                    <input type="number" step="0.1" className="form-control" value={customMrPerPulse} onChange={e => { setCustomMrPerPulse(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Manufacturer spec at reference 1-foot calibration radius.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Pulses Fired (Shots)</label>
                    <input type="number" min="1" max="1000" className="form-control" value={customPulses} onChange={e => { setCustomPulses(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pulse Duration FWHM (nanoseconds)</label>
                    <input type="number" min="1" max="1000" className="form-control" value={customPulseWidthNs} onChange={e => { setCustomPulseWidthNs(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Golden Engineering systems typically fire 10 to 50 ns FWHM.</span>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Single Pulse Dose @ Target ({distanceMeters}m):</span>
                    <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                      {((customMrPerPulse * 10 * Math.pow(0.3 / distanceMeters, 2))).toFixed(2)} µSv / pulse
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Tube Current (mA)</label>
                    <input type="number" step="0.5" className="form-control" value={customMa} onChange={e => { setCustomMa(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exposure Time (Seconds)</label>
                    <input type="number" step="0.1" className="form-control" value={customTime} onChange={e => { setCustomTime(Number(e.target.value)); setSelectedPresetId('custom'); }} />
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Integrated Current-Time Product:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#fff' }}>
                      {(customMa * customTime).toFixed(2)} mAs
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Transient Physics & Dead-Time */}
        {activeTab === 'physics' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              Transient Flash Radiography Physics &amp; Dead-Time Mathematics
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>1. Flash Pulse Dose Divergence</h4>
                <BlockMath math="D_{\text{pulse}}(r) = D_{\text{ref}} \left(\frac{r_{\text{ref}}}{r}\right)^2, \quad D_{\text{tot}} = N \cdot D_{\text{pulse}}(r)" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Where <InlineMath math="r_{\text{ref}} = 0.30\text{ m}" /> (1 foot), <InlineMath math="N" /> is total pulses fired, and <InlineMath math="D_{\text{ref}} = 10 \times (\text{mR per pulse})" /> in µSv.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>2. Instantaneous Pulse Dose Rate</h4>
                <BlockMath math="\dot{D}_{\text{inst}} = \frac{D_{\text{pulse}}}{\tau_{\text{pulse}}} \times 3\,600 \quad [\text{Sv/h}]" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Because <InlineMath math="\tau_{\text{pulse}} \approx 10 - 50\text{ ns}" />, the instantaneous flux rate is amplified by <InlineMath math="10^8 - 10^9" /> relative to time-averaged rates.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>3. Paralyzable Detector Model</h4>
                <BlockMath math="m = n \, e^{-n \tau}, \quad \lim_{n \to \infty} m = 0" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  In paralyzable detectors (standard Geiger-Müller tubes), events arriving during the dead time <InlineMath math="\tau" /> extend the paralysis without generating counts, causing complete zero-reading failure.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>4. Continuous Diagnostic Output</h4>
                <BlockMath math="D_{\text{med}}(r) = \frac{k \cdot (\text{kVp})^2 \cdot (\text{mAs})}{r^2}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Kramer's empirical continuum formulation for continuous diagnostic tubes, where output scales quadratically with peak voltage and linearly with charge product.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PulsedXRayModule;
