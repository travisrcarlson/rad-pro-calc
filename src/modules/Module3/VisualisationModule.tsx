import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import * as katexModule from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;
const BlockMath = (katexModule as any).BlockMath || (katexModule as any).default?.BlockMath;

interface Source {
  id: number;
  x: number;
  y: number;
  activity_mCi: number;
  nuclideGamma: number; // R·cm2/mCi·h
  name: string;
}

const VisualisationModule: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([
    { id: 1, x: 5, y: 5, activity_mCi: 100, nuclideGamma: 3.3, name: 'Cs-137' } // Cs-137 Gamma is ~3.3 mR/h at 1 m per mCi ? Actually let's just make it a number for now.
  ]);
  
  const [roomSize, setRoomSize] = useState(10); // meters

  const { zData, xData, yData } = useMemo(() => {
    const resolution = 50;
    const z: number[][] = [];
    const x: number[] = [];
    const y: number[] = [];
    
    const step = roomSize / resolution;

    for (let i = 0; i < resolution; i++) {
      x.push(i * step);
      y.push(i * step);
    }

    // Compute Dose
    for (let j = 0; j < resolution; j++) {
      const row: number[] = [];
      const py = y[j];
      for (let i = 0; i < resolution; i++) {
        const px = x[i];
        
        let dose = 0;
        sources.forEach(src => {
          const dx = px - src.x;
          const dy = py - src.y;
          // distance in cm (since Gamma is usually given in R*cm^2 / mCi*h)
          // Wait, if roomSize is meters, then distance in cm = d * 100
          const dist_m = Math.sqrt(dx*dx + dy*dy);
          const dist_cm = dist_m * 100;
          
          if (dist_cm > 1) { // prevent singularity
            // Rate in mR/h
            const rate = (src.activity_mCi * src.nuclideGamma) / (dist_cm * dist_cm);
            dose += rate * 10; // convert to uSv/h approximately (1 mR/h ~ 10 uSv/h)
          } else {
             dose += 10000;
          }
        });
        
        row.push(dose);
      }
      z.push(row);
    }

    return { zData: z, xData: x, yData: y };
  }, [sources, roomSize]);

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* Left panel: Heatmap */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header">
          <h2>Module 3 — Radiation Field Visualisation</h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Plot
            data={[
              {
                z: zData,
                x: xData,
                y: yData,
                type: 'heatmap',
                colorscale: 'Viridis',
                colorbar: { title: { text: 'µSv/h' } }
              }
            ]}
            layout={{
              autosize: true,
              margin: { l: 40, r: 20, t: 20, b: 40 },
              xaxis: { title: { text: 'X (meters)' } },
              yaxis: { title: { text: 'Y (meters)' }, scaleanchor: 'x', scaleratio: 1 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#E0E1DD' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      
      {/* Right panel: Controls */}
      <div className="panel" style={{ width: '350px' }}>
        <div className="panel-header">
          <h2>Scene Controls</h2>
        </div>
        
        <div className="form-group">
          <label className="form-label">Room Size (m)</label>
          <input 
            type="number" 
            className="form-control" 
            value={roomSize} 
            onChange={(e) => setRoomSize(Number(e.target.value))} 
          />
        </div>

        <div className="formula-box">
          <label className="form-label">Active Formula</label>
          <BlockMath math="\dot{H}_{total} = \sum_{i} \frac{A_i \cdot \Gamma_i}{d_i^2}" />
        </div>
        
        <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Sources</h3>
        {sources.map((s, index) => (
          <div key={s.id} style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '10px' }}>
            <strong>{s.name}</strong>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <div style={{ flex: 1 }}>
                 <label className="form-label">X (m)</label>
                 <input type="number" className="form-control" value={s.x} onChange={e => {
                   const nw = [...sources]; nw[index].x = Number(e.target.value); setSources(nw);
                 }} />
               </div>
               <div style={{ flex: 1 }}>
                 <label className="form-label">Y (m)</label>
                 <input type="number" className="form-control" value={s.y} onChange={e => {
                   const nw = [...sources]; nw[index].y = Number(e.target.value); setSources(nw);
                 }} />
               </div>
            </div>
            <div style={{ marginTop: '10px' }}>
               <label className="form-label">Activity (mCi)</label>
               <input type="number" className="form-control" value={s.activity_mCi} onChange={e => {
                   const nw = [...sources]; nw[index].activity_mCi = Number(e.target.value); setSources(nw);
               }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisualisationModule;
