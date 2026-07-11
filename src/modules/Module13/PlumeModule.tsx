import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

// Pasquill-Gifford Stability Classes (A-F)
const STABILITY_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F'];

// Simplified Briggs dispersion parameters for open country
const getDispersionCoefficients = (x: number, stability: string) => {
  // x is downwind distance in meters
  let sy = 0;
  let sz = 0;
  
  // To avoid division by zero or log errors at x=0, set a minimum x
  const xSafe = Math.max(x, 1);

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

const PlumeModule: React.FC = () => {
  const [releaseRate, setReleaseRate] = useState<number>(1.0); // Curies per second
  const [windSpeed, setWindSpeed] = useState<number>(2.0); // meters per second
  const [releaseHeight, setReleaseHeight] = useState<number>(10.0); // meters
  const [stability, setStability] = useState<string>('D'); // D is neutral
  const [maxDistance, setMaxDistance] = useState<number>(1000); // meters downwind
  
  // Calculate Gaussian plume concentration matrix for plotting
  const plotData = useMemo(() => {
    const xSteps = 50;
    const ySteps = 50;
    
    const xVals: number[] = [];
    const yVals: number[] = [];
    const zVals: number[][] = [];
    
    // y goes from -half_width to +half_width
    const halfWidth = maxDistance * 0.3; // estimate plume spread
    
    for (let i = 0; i <= ySteps; i++) {
      yVals.push(-halfWidth + (2 * halfWidth * i) / ySteps);
    }
    
    for (let i = 0; i <= xSteps; i++) {
      // x goes from 1 to maxDistance (avoid 0 for math stability)
      xVals.push(1 + (maxDistance * i) / xSteps);
    }
    
    for (let i = 0; i <= ySteps; i++) {
      const row: number[] = [];
      const y = yVals[i];
      for (let j = 0; j <= xSteps; j++) {
        const x = xVals[j];
        
        const { sy, sz } = getDispersionCoefficients(x, stability);
        
        // C = (Q / (pi * u * sy * sz)) * exp(-y^2 / (2*sy^2)) * exp(-H^2 / (2*sz^2))
        // Using arbitrary units (Curies/m^3) for Q=Ci/s
        let concentration = 0;
        if (sy > 0 && sz > 0 && windSpeed > 0) {
          const factor = releaseRate / (Math.PI * windSpeed * sy * sz);
          const expY = Math.exp(-(y * y) / (2 * sy * sy));
          const expZ = Math.exp(-(releaseHeight * releaseHeight) / (2 * sz * sz));
          concentration = factor * expY * expZ;
        }
        
        row.push(concentration);
      }
      zVals.push(row);
    }
    
    return [
      {
        z: zVals,
        x: xVals,
        y: yVals,
        type: 'contour',
        colorscale: 'Jet',
        contours: {
          showlines: false,
        },
        colorbar: {
          title: 'Activity (Ci/m³)',
          titleside: 'right',
        }
      }
    ];
  }, [releaseRate, windSpeed, releaseHeight, stability, maxDistance]);

  return (
    <div className="plume-module">
      <div className="panel-header">
        <h2>Atmospheric Dispersion Plume Modeling</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Estimate downwind concentration using the Gaussian plume model.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: '1 1 300px' }}>
          <h3>Release Parameters</h3>
          <div className="form-group" style={{ marginTop: '15px' }}>
            <label className="form-label">Release Rate (Ci/s)</label>
            <input 
              type="number" 
              className="form-control" 
              value={releaseRate} 
              onChange={(e) => setReleaseRate(Number(e.target.value))} 
              step="0.1" 
              min="0.001" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Release Height (m)</label>
            <input 
              type="number" 
              className="form-control" 
              value={releaseHeight} 
              onChange={(e) => setReleaseHeight(Number(e.target.value))} 
              step="1" 
              min="0" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wind Speed (m/s)</label>
            <input 
              type="number" 
              className="form-control" 
              value={windSpeed} 
              onChange={(e) => setWindSpeed(Number(e.target.value))} 
              step="0.5" 
              min="0.5" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pasquill-Gifford Stability Class</label>
            <select 
              className="form-control" 
              value={stability} 
              onChange={(e) => setStability(e.target.value)}
            >
              {STABILITY_CLASSES.map(cls => (
                <option key={cls} value={cls}>Class {cls} {cls==='A'?'(Very Unstable)':cls==='D'?'(Neutral)':cls==='F'?'(Very Stable)':''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Plot Max Downwind Distance (m)</label>
            <input 
              type="number" 
              className="form-control" 
              value={maxDistance} 
              onChange={(e) => setMaxDistance(Number(e.target.value))} 
              step="100" 
              min="100" 
            />
          </div>
        </div>

        <div className="panel" style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Downwind Plume Contour</h3>
          <div style={{ width: '100%', maxWidth: '800px', marginTop: '15px' }}>
            <Plot
              data={plotData as any}
              layout={{
                autosize: true,
                title: { text: `Plume Footprint (Stability ${stability}, ${windSpeed} m/s wind)` },
                xaxis: { title: { text: 'Downwind Distance x (m)' }, color: '#94A3B8' },
                yaxis: { title: { text: 'Crosswind Distance y (m)' }, color: '#94A3B8' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 60, t: 40, b: 60 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '400px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      </div>
      
      <div className="panel">
        <h3>About the Gaussian Plume Model</h3>
        <p style={{ marginTop: '10px', color: 'var(--color-text-muted)' }}>
          This estimation tool utilizes the standard Gaussian dispersion equation for continuous ground-level or elevated releases. 
          Dispersion coefficients ($\sigma_y$ and $\sigma_z$) are approximated using Briggs formulas for open country. 
          This tool assumes uniform wind fields, flat terrain, and zero ground deposition, making it a conservative 
          first-order approximation suitable for training and rapid ALARA estimations.
        </p>
      </div>
    </div>
  );
};

export default PlumeModule;
