import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;

// Pasquill-Gifford Stability Classes (A-F)
const STABILITY_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F'];

const STABILITY_INFO: Record<string, { label: string; desc: string }> = {
  A: { label: 'Class A — Extremely Unstable', desc: 'Strong solar radiation, daytime light winds. Severe vertical mixing.' },
  B: { label: 'Class B — Moderately Unstable', desc: 'Moderate solar radiation, daytime moderate winds.' },
  C: { label: 'Class C — Slightly Unstable', desc: 'Slight solar radiation, daytime winds.' },
  D: { label: 'Class D — Neutral (Standard)', desc: 'Overcast skies (day/night) or heavy overcast. Wind speed > 5 m/s.' },
  E: { label: 'Class E — Slightly Stable', desc: 'Nighttime, partial cloud cover, light wind.' },
  F: { label: 'Class F — Moderately Stable', desc: 'Clear nighttime, low winds. Strong temperature inversion with trapped plume.' }
};

// Simplified Briggs dispersion parameters for open country
const getDispersionCoefficients = (x: number, stability: string) => {
  const xSafe = Math.max(x, 1);
  let sy = 0;
  let sz = 0;

  switch (stability) {
    case 'A':
      sy = 0.22 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.20 * xSafe;
      break;
    case 'B':
      sy = 0.16 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.12 * xSafe;
      break;
    case 'C':
      sy = 0.11 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.08 * xSafe * Math.pow(1 + 0.0002 * xSafe, -0.5);
      break;
    case 'D':
      sy = 0.08 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.06 * xSafe * Math.pow(1 + 0.0015 * xSafe, -0.5);
      break;
    case 'E':
      sy = 0.06 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.03 * xSafe * Math.pow(1 + 0.0003 * xSafe, -1);
      break;
    case 'F':
      sy = 0.04 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.016 * xSafe * Math.pow(1 + 0.0003 * xSafe, -1);
      break;
    default:
      sy = 0.08 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.06 * xSafe * Math.pow(1 + 0.0015 * xSafe, -0.5);
  }
  return { sy, sz };
};

type WorkspaceTab = 'footprint' | 'centerline' | 'controls' | 'physics';

const PlumeModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('footprint');
  const [releaseRate, setReleaseRate] = useState<number>(1.0); // Curies per second
  const [windSpeed, setWindSpeed] = useState<number>(2.0); // meters per second
  const [releaseHeight, setReleaseHeight] = useState<number>(10.0); // meters
  const [stability, setStability] = useState<string>('D'); // D is neutral
  const [maxDistance, setMaxDistance] = useState<number>(1000); // meters downwind

  // 2D Contour Grid
  const { xVals, yVals, zVals } = useMemo(() => {
    const xSteps = 50;
    const ySteps = 50;
    const xArr: number[] = [];
    const yArr: number[] = [];
    const zArr: number[][] = [];
    const halfWidth = maxDistance * 0.3;

    for (let i = 0; i <= ySteps; i++) {
      yArr.push(-halfWidth + (2 * halfWidth * i) / ySteps);
    }
    for (let i = 0; i <= xSteps; i++) {
      xArr.push(1 + (maxDistance * i) / xSteps);
    }

    for (let i = 0; i <= ySteps; i++) {
      const row: number[] = [];
      const y = yArr[i];
      for (let j = 0; j <= xSteps; j++) {
        const x = xArr[j];
        const { sy, sz } = getDispersionCoefficients(x, stability);
        let concentration = 0;
        if (sy > 0 && sz > 0 && windSpeed > 0) {
          const factor = releaseRate / (Math.PI * windSpeed * sy * sz);
          const expY = Math.exp(-(y * y) / (2 * sy * sy));
          const expZ = Math.exp(-(releaseHeight * releaseHeight) / (2 * sz * sz));
          concentration = factor * expY * expZ;
        }
        row.push(concentration);
      }
      zArr.push(row);
    }

    return { xVals: xArr, yVals: yArr, zVals: zArr };
  }, [releaseRate, windSpeed, releaseHeight, stability, maxDistance]);

  // Centerline Profile
  const centerlineData = useMemo(() => {
    const steps = 100;
    const xLine: number[] = [];
    const cLine: number[] = [];
    let peakC = 0;
    let peakX = 0;

    for (let i = 0; i <= steps; i++) {
      const x = Math.max(1, (maxDistance * i) / steps);
      xLine.push(x);
      const { sy, sz } = getDispersionCoefficients(x, stability);
      let concentration = 0;
      if (sy > 0 && sz > 0 && windSpeed > 0) {
        const factor = releaseRate / (Math.PI * windSpeed * sy * sz);
        const expZ = Math.exp(-(releaseHeight * releaseHeight) / (2 * sz * sz));
        concentration = factor * expZ;
      }
      cLine.push(concentration);
      if (concentration > peakC) {
        peakC = concentration;
        peakX = x;
      }
    }

    return { xLine, cLine, peakC, peakX };
  }, [releaseRate, windSpeed, releaseHeight, stability, maxDistance]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">ATMOSPHERIC TRANSPORT</span>
            <span className="hud-badge hud-badge-accent">GAUSSIAN PLUME / BRIGGS</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Atmospheric Dispersion &amp; Gaussian Plume Modeling
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Estimate downwind radioactive plume concentration, ground touch-down peak distances, and crosswind isopleths using standard Briggs dispersion coefficients.
          </p>
        </div>
      </div>

      {/* Top HUD Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">SOURCE RELEASE RATE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)' }}>
            {releaseRate} Ci/s
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {(releaseRate * 37).toFixed(1)} GBq/s | Height: {releaseHeight}m
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PEAK GROUND CONCENTRATION</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-accent)' }}>
            {centerlineData.peakC < 1e-4 ? centerlineData.peakC.toExponential(2) : centerlineData.peakC.toFixed(4)} Ci/m³
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Touchdown: @ {centerlineData.peakX.toFixed(0)}m downwind
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PASQUILL STABILITY</span>
          <span className="hud-metric-value" style={{ color: '#fff' }}>
            CLASS {stability}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Wind Speed: {windSpeed} m/s ({ (windSpeed * 2.237).toFixed(1) } mph)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">DOWNWIND HORIZON</span>
          <span className="hud-metric-value" style={{ color: '#10b981' }}>
            {maxDistance.toLocaleString()} m
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Crosswind Span: ±{(maxDistance * 0.3).toFixed(0)}m
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'footprint' ? 'active' : ''}`}
          onClick={() => setActiveTab('footprint')}
        >
          Ground Isopleth Footprint
        </button>
        <button
          className={`tab-btn ${activeTab === 'centerline' ? 'active' : ''}`}
          onClick={() => setActiveTab('centerline')}
        >
          Centerline Concentration Decay
        </button>
        <button
          className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          Meteorological &amp; Release Setup
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          Gaussian Plume Mathematics
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
        
        {/* TAB 1: Ground Isopleth Footprint */}
        {activeTab === 'footprint' && (
          <div style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '440px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={[
                  {
                    z: zVals,
                    x: xVals,
                    y: yVals,
                    type: 'contour',
                    colorscale: 'Jet',
                    contours: { showlines: false },
                    colorbar: {
                      title: { text: 'Activity (Ci/m³)' },
                      len: 0.8,
                      x: 0.98
                    }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: `Ground Concentration Footprint (Class ${stability}, u = ${windSpeed} m/s, H = ${releaseHeight}m)`, font: { color: '#E0E1DD', size: 14 } },
                  xaxis: { title: { text: 'Downwind Distance x (meters)' }, gridcolor: '#1e293b' },
                  yaxis: { title: { text: 'Crosswind Distance y (meters)' }, gridcolor: '#1e293b' },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD' },
                  margin: { l: 60, r: 60, t: 40, b: 50 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Centerline Profile */}
        {activeTab === 'centerline' && (
          <div style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '360px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={[
                  {
                    x: centerlineData.xLine,
                    y: centerlineData.cLine,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Ground Centerline C(x, 0, 0)',
                    line: { color: 'var(--color-primary)', width: 3 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(0, 229, 255, 0.1)'
                  },
                  {
                    x: [centerlineData.peakX],
                    y: [centerlineData.peakC],
                    type: 'scatter',
                    mode: 'markers+text',
                    name: 'Peak Ground Touchdown',
                    marker: { symbol: 'star', color: '#ff9f1c', size: 12 },
                    text: [`Peak @ ${centerlineData.peakX.toFixed(0)}m`],
                    textposition: 'top center',
                    textfont: { color: '#ff9f1c', size: 11 }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: 'Ground-Level Centerline Concentration C(x, y=0, z=0) vs. Downwind Distance', font: { color: '#E0E1DD', size: 14 } },
                  xaxis: { title: 'Downwind Distance x (meters)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Ground Concentration (Ci/m³)', gridcolor: '#1e293b' },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD' },
                  margin: { l: 70, r: 30, t: 40, b: 50 },
                  showlegend: true
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>Plume Ground Touchdown Dynamics</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  For an elevated release (<InlineMath math={`H = ${releaseHeight}\\text{ m}`} />), ground-level concentration is zero immediately at the stack base. The plume expands downward at rate <InlineMath math="\sigma_z(x)" /> until touching down at <strong style={{ color: '#fff' }}>{centerlineData.peakX.toFixed(0)} meters</strong>, after which atmospheric dilution causes continuous concentration decay.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Atmospheric Dilution Capacity</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                  Dilution is inversely proportional to wind speed <InlineMath math="u" /> and the product of dispersion coefficients <InlineMath math="\sigma_y \cdot \sigma_z" />. Higher wind speeds stretch the plume along the wind axis, reducing localized air concentration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Meteorological & Release Setup */}
        {activeTab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>1. Release Source Term</h3>

              <div className="form-group">
                <label className="form-label">Release Rate Q (Ci/s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  className="form-control"
                  value={releaseRate}
                  onChange={e => setReleaseRate(Math.max(0.001, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Equivalent to {(releaseRate * 37000).toLocaleString()} MBq/s.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Effective Release Height H (m)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  value={releaseHeight}
                  onChange={e => setReleaseHeight(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Physical stack height plus thermal/momentum plume rise.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Evaluation Downwind Distance (m)</label>
                <input
                  type="number"
                  step="100"
                  min="200"
                  max="50000"
                  className="form-control"
                  value={maxDistance}
                  onChange={e => setMaxDistance(Math.max(200, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-accent)' }}>2. Atmospheric Meteorology</h3>

              <div className="form-group">
                <label className="form-label">Mean Horizontal Wind Speed u (m/s)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="40"
                  className="form-control"
                  value={windSpeed}
                  onChange={e => setWindSpeed(Math.max(0.5, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Measured at stack height (minimum 0.5 m/s to prevent calm singularities).</span>
              </div>

              <div className="form-group">
                <label className="form-label">Pasquill-Gifford Stability Class</label>
                <select
                  className="form-control"
                  value={stability}
                  onChange={e => setStability(e.target.value)}
                >
                  {STABILITY_CLASSES.map(cls => (
                    <option key={cls} value={cls}>{STABILITY_INFO[cls].label}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  CLASS {stability} METEOROLOGY:
                </span>
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {STABILITY_INFO[stability].desc}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Gaussian Plume Mathematics */}
        {activeTab === 'physics' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              Gaussian Atmospheric Dispersion Formulations (EPA / NRC Reg Guide 1.145)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>1. Steady-State Elevated Release</h4>
                <BlockMath math="C(x, y, z) = \frac{Q}{2\pi u \sigma_y \sigma_z} \exp\left(-\frac{y^2}{2\sigma_y^2}\right) \left[\exp\left(-\frac{(z - H)^2}{2\sigma_z^2}\right) + \exp\left(-\frac{(z + H)^2}{2\sigma_z^2}\right)\right]" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Total ground reflection is represented by the image source term at <InlineMath math="z = -H" />. At ground level (<InlineMath math="z = 0" />), the two vertical exponentials combine to <InlineMath math="2 \exp(-H^2 / 2\sigma_z^2)" />.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>2. Ground-Level Centerline</h4>
                <BlockMath math="C(x, 0, 0) = \frac{Q}{\pi u \sigma_y(x) \sigma_z(x)} \exp\left(-\frac{H^2}{2\sigma_z(x)^2}\right)" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  The governing concentration along the central wind axis. Setting <InlineMath math="H = 0" /> recovers the standard ground-level accidental spill release.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>3. Briggs Open-Country Dispersion Coefficients</h4>
                <BlockMath math="\sigma_y(x) = a \cdot x \, (1 + b \cdot x)^{-1/2}, \quad \sigma_z(x) = c \cdot x \, (1 + d \cdot x)^p" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Empirical parameters derived for open terrain across Pasquill stability classes A through F (Briggs 1973).
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>4. Distance to Maximum Ground Touchdown</h4>
                <BlockMath math="\sigma_z(x_{\max}) = \frac{H}{\sqrt{2}} \approx 0.707 \, H" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  The peak ground concentration occurs when the vertical plume standard deviation <InlineMath math="\sigma_z" /> expands to roughly 71% of the effective stack release height <InlineMath math="H" />.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PlumeModule;
