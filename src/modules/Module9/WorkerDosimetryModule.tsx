import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

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

type Posture = 'Standing' | 'Crouching' | 'Prone';

interface Worker {
  id: number;
  name: string;
  x: number;
  y: number;
  posture: Posture;
  rotationOffset: number; // For prone orientation 0-360 degrees
  taskDurationHours: number; // ALARA stay-time
}

interface ShieldBlock {
  id: number;
  name: string;
  x: number; y: number; z: number; // Center
  w: number; l: number; h: number; // Dimensions
  tvl_cm: number; // Tenth Value Layer equivalent Shielding
}

interface WorkerBreakdown {
  eyeNode: { x: number, y: number, z: number, dose: number };
  chestNode: { x: number, y: number, z: number, dose: number };
  gonadNode: { x: number, y: number, z: number, dose: number };
  extNode: { x: number, y: number, z: number, dose: number };
  effectiveDoseRate: number;
  cumulativeEffectiveDose: number; // Rate * duration
}

const WorkerDosimetryModule: React.FC = () => {
  // Room dimensions
  const [dimX, setDimX] = useState<number>(10);
  const [dimY, setDimY] = useState<number>(10);
  const [dimZ, setDimZ] = useState<number>(5);

  const [displayMin, setDisplayMin] = useState<number>(10); 
  const [displayMax, setDisplayMax] = useState<number>(2000); 

  const [sources, setSources] = useState<Source3D[]>([
    { id: 1, name: 'Floor Spill', x: 5, y: 5, z: 0.1, activity_MBq: 100000, gamma_uSv: 300 }
  ]);

  const [workers, setWorkers] = useState<Worker[]>([
    { id: 1, name: 'Worker A', x: 4.5, y: 5, posture: 'Standing', rotationOffset: 0, taskDurationHours: 2 },
    { id: 2, name: 'Worker B (Clean)', x: 4.5, y: 4, posture: 'Crouching', rotationOffset: 0, taskDurationHours: 4 }
  ]);

  const [shields, setShields] = useState<ShieldBlock[]>([
    { id: 1, name: 'Concrete Wall', x: 5, y: 4.5, z: 1.5, w: 3, l: 0.5, h: 3, tvl_cm: 14.7 }
  ]);

  const computeAABBIntersectionFraction = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, sld: ShieldBlock) => {
    const dx = px - sx; const dy = py - sy; const dz = pz - sz;
    let tmin = 0.0; let tmax = 1.0;
    
    const bMinX = sld.x - sld.w/2; const bMaxX = sld.x + sld.w/2;
    if (dx !== 0) {
       const tx1 = (bMinX - sx) / dx; const tx2 = (bMaxX - sx) / dx;
       tmin = Math.max(tmin, Math.min(tx1, tx2)); tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (sx < bMinX || sx > bMaxX) return 0;
    
    const bMinY = sld.y - sld.l/2; const bMaxY = sld.y + sld.l/2;
    if (dy !== 0) {
       const ty1 = (bMinY - sy) / dy; const ty2 = (bMaxY - sy) / dy;
       tmin = Math.max(tmin, Math.min(ty1, ty2)); tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (sy < bMinY || sy > bMaxY) return 0;
    
    const bMinZ = sld.z - sld.h/2; const bMaxZ = sld.z + sld.h/2;
    if (dz !== 0) {
       const tz1 = (bMinZ - sz) / dz; const tz2 = (bMaxZ - sz) / dz;
       tmin = Math.max(tmin, Math.min(tz1, tz2)); tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else if (sz < bMinZ || sz > bMaxZ) return 0;

    return (tmax >= tmin) ? (tmax - tmin) : 0;
  };

  // Compute 3D Volume Array
  const { volX, volY, volZ, volV } = useMemo(() => {
    const resolutionXY = 25;
    const resolutionZ = 12;

    const stepX = dimX / resolutionXY;
    const stepY = dimY / resolutionXY;
    const stepZ = dimZ / resolutionZ;

    const X: number[] = []; const Y: number[] = []; const Z: number[] = []; const V: number[] = [];

    for (let i = 0; i <= resolutionXY; i++) {
        const px = i * stepX;
        for (let j = 0; j <= resolutionXY; j++) {
            const py = j * stepY;
            for (let k = 0; k <= resolutionZ; k++) {
                const pz = k * stepZ;
                let d = 0;
                for (let s=0; s < sources.length; s++) {
                  const src = sources[s];
                  const dx = px - src.x;
                  const dy = py - src.y;
                  const dz = pz - src.z;
                  const dist_cm = Math.max(1, Math.sqrt(dx*dx + dy*dy + dz*dz) * 100);
                  
                  let attenuationFactor = 1;
                  for (let sh=0; sh < shields.length; sh++) {
                    const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, px, py, pz, shields[sh]);
                    if (fract > 0) {
                       const distInside_cm = fract * dist_cm;
                       const decades = distInside_cm / shields[sh].tvl_cm;
                       attenuationFactor *= Math.pow(10, decades);
                    }
                  }

                  d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
                }
                X.push(px); Y.push(py); Z.push(pz); V.push(d);
            }
        }
    }
    return { volX: X, volY: Y, volZ: Z, volV: V };
  }, [sources, dimX, dimY, dimZ, shields]);

  // Point dose calculator
  const calcPointDose = (px: number, py: number, pz: number) => {
    let d = 0;
    sources.forEach(src => {
      const dx = px - src.x; const dy = py - src.y; const dz = pz - src.z;
      const dist_cm = Math.max(1, Math.sqrt(dx*dx + dy*dy + dz*dz) * 100);
      
      let attenuationFactor = 1;
      for (let sh=0; sh < shields.length; sh++) {
        const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, px, py, pz, shields[sh]);
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

  const getWorkerNodes = (w: Worker) => {
    let eyeZ = 1.65, chestZ = 1.30, gonadZ = 0.90, extZ = 0.10;
    let dx = 0, dy = 0; // for prone extensions
    
    if (w.posture === 'Crouching') {
      eyeZ = 1.0; chestZ = 0.75; gonadZ = 0.40; extZ = 0.10;
    } else if (w.posture === 'Prone') {
      // If prone, Z is roughly 0.2m for all, but they spread out along the floor via rotation
      eyeZ = 0.2; chestZ = 0.2; gonadZ = 0.2; extZ = 0.2;
      const rad = w.rotationOffset * (Math.PI / 180);
      // Assuming 1.8m body length total. Center is at (x,y). 
      // Head is +0.9m along angle, Ext is -0.9m along angle.
      dx = Math.cos(rad);
      dy = Math.sin(rad);
    }

    // Positions (Prone applies horizontal displacement)
    const e_pos = w.posture === 'Prone' ? { x: w.x + dx*0.8, y: w.y + dy*0.8, z: eyeZ } : { x: w.x, y: w.y, z: eyeZ };
    const c_pos = w.posture === 'Prone' ? { x: w.x + dx*0.4, y: w.y + dy*0.4, z: chestZ } : { x: w.x, y: w.y, z: chestZ };
    const g_pos = w.posture === 'Prone' ? { x: w.x - dx*0.1, y: w.y - dy*0.1, z: gonadZ } : { x: w.x, y: w.y, z: gonadZ };
    const ex_pos = w.posture === 'Prone' ? { x: w.x - dx*0.8, y: w.y - dy*0.8, z: extZ } : { x: w.x, y: w.y, z: extZ };

    const eyeDose = calcPointDose(e_pos.x, e_pos.y, e_pos.z);
    const chestDose = calcPointDose(c_pos.x, c_pos.y, c_pos.z);
    const gonadDose = calcPointDose(g_pos.x, g_pos.y, g_pos.z);
    const extDose = calcPointDose(ex_pos.x, ex_pos.y, ex_pos.z);

    // Generic Effective Dose Weighting (Chest 50%, Gonads 30%, Eye 10%, Ext 10%)
    const effective = (chestDose * 0.5) + (gonadDose * 0.3) + (eyeDose * 0.1) + (extDose * 0.1);

    return {
      eyeNode: { ...e_pos, dose: eyeDose },
      chestNode: { ...c_pos, dose: chestDose },
      gonadNode: { ...g_pos, dose: gonadDose },
      extNode: { ...ex_pos, dose: extDose },
      effectiveDoseRate: effective,
      cumulativeEffectiveDose: effective * w.taskDurationHours
    };
  };

  // Compile all spatial markers for WebGL render
  const modelTraces: any[] = [];

  // Map sources
  modelTraces.push({
    type: 'scatter3d',
    mode: 'markers+text',
    x: sources.map(s => s.x), y: sources.map(s => s.y), z: sources.map(s => s.z),
    marker: { symbol: 'circle', color: '#e74c3c', size: 8, line: { width: 1, color: '#fff' } },
    text: sources.map(s => `☢️ ${s.name}`),
    textposition: 'top center',
    textfont: { color: '#ff7675' },
    name: 'Sources',
    hoverinfo: 'text'
  });

  // Map worker stick-figure networks
  workers.forEach(w => {
    const nodes = getWorkerNodes(w);
    // Draw strict lines for stick figure (Ext -> Gonad -> Chest -> Eye)
    modelTraces.push({
      type: 'scatter3d',
      mode: 'lines+markers+text',
      x: [nodes.extNode.x, nodes.gonadNode.x, nodes.chestNode.x, nodes.eyeNode.x],
      y: [nodes.extNode.y, nodes.gonadNode.y, nodes.chestNode.y, nodes.eyeNode.y],
      z: [nodes.extNode.z, nodes.gonadNode.z, nodes.chestNode.z, nodes.eyeNode.z],
      line: { color: '#2ecc71', width: 4 },
      marker: { color: ['#9b59b6', '#3498db', '#2ecc71', '#f1c40f'], size: [5, 5, 8, 5] },
      text: ['', '', `🧑‍⚕️ ${w.name}`, ''],
      textposition: 'top center',
      textfont: { color: '#55efc4' },
      name: w.name,
      hovertext: [
        `Extremity: ${nodes.extNode.dose.toFixed(1)} µSv/h`,
        `Gonads: ${nodes.gonadNode.dose.toFixed(1)} µSv/h`,
        `Chest (DDE): ${nodes.chestNode.dose.toFixed(1)} µSv/h`,
        `Eye Lens: ${nodes.eyeNode.dose.toFixed(1)} µSv/h`
      ],
      hoverinfo: 'text'
    });
  });

  // Add translucent mesh bounding boxes for Shields
  const shieldTraces: any[] = shields.map(sh => {
    return {
      type: 'mesh3d',
      x: [sh.x - sh.w/2, sh.x - sh.w/2, sh.x + sh.w/2, sh.x + sh.w/2, sh.x - sh.w/2, sh.x - sh.w/2, sh.x + sh.w/2, sh.x + sh.w/2],
      y: [sh.y - sh.l/2, sh.y + sh.l/2, sh.y + sh.l/2, sh.y - sh.l/2, sh.y - sh.l/2, sh.y + sh.l/2, sh.y + sh.l/2, sh.y - sh.l/2],
      z: [sh.z - sh.h/2, sh.z - sh.h/2, sh.z - sh.h/2, sh.z - sh.h/2, sh.z + sh.h/2, sh.z + sh.h/2, sh.z + sh.h/2, sh.z + sh.h/2],
      i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
      j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
      k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
      opacity: 0.15,
      color: '#bdc3c7',
      name: sh.name,
      hoverinfo: 'name'
    };
  });

  // Calculate Chart Lines for Dose Accumulation
  let maxTime = Math.max(...workers.map(w => w.taskDurationHours), 5);
  const timeArray = Array.from({length: 50}, (_, i) => (i / 49) * maxTime);
  
  const chartTraces: any[] = workers.map((w, idx) => {
     const ext = getWorkerNodes(w);
     const rate = ext.effectiveDoseRate;
     const yArr = timeArray.map(t => {
         if (t <= w.taskDurationHours) return t * rate;
         return w.taskDurationHours * rate; // Plateaus when task ends
     });
     return {
        x: timeArray, y: yArr,
        type: 'scatter', mode: 'lines',
        name: w.name,
        line: { width: 3 }
     }
  });

  // Regulatory limits lines
  chartTraces.push({
      x: [0, maxTime], y: [1000, 1000],
      type: 'scatter', mode: 'lines',
      name: 'Shift ALARA Limit (1000 µSv)',
      line: { color: '#f39c12', width: 2, dash: 'dash' }
  });
  chartTraces.push({
      x: [0, maxTime], y: [50000, 50000],
      type: 'scatter', mode: 'lines',
      name: 'Annual Admin Limit (50 mSv)',
      line: { color: '#e74c3c', width: 2, dash: 'dash' }
  });

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <h2>Module 9 — Advanced Worker Dosimetry</h2>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
         <div style={{ position: 'absolute', top: 5, left: 10, zIndex: 10, color: '#fff', textShadow: '1px 1px 2px #000', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px' }}>
           <strong>Anatomical Dose Trace</strong> <br/>
           <span style={{fontSize: '0.8rem'}}>Stick Figures adapt dynamically to Posture changes</span>
         </div>
         <Plot
          data={[
            {
              type: 'volume',
              x: volX, y: volY, z: volZ, value: volV,
              isomin: displayMin, isomax: displayMax, opacity: 0.1, surface: { count: 8 }, 
              colorscale: 'Jet', colorbar: { title: 'µSv/h', len: 0.8, x: 0.95 },
              hovertemplate: 'X:%{x}m, Y:%{y}m, Z:%{z}m<br>Field: %{value:.1f} µSv/h<extra></extra>'
            },
            ...modelTraces,
            ...shieldTraces
          ]}
          layout={{
            autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: {
               xaxis: { title: 'X (m)', range: [0, dimX], gridcolor: '#444' },
               yaxis: { title: 'Y (m)', range: [0, dimY], gridcolor: '#444' },
               zaxis: { title: 'Z (m)', range: [0, dimZ], gridcolor: '#444' },
               aspectmode: 'data',
               camera: { eye: { x: 1.5, y: -1.5, z: 0.5 } }
            },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
            showlegend: false
          }}
          useResizeHandler={true} style={{ width: '100%', height: '100%' }}
         />
      </div>

      {/* NEW: ALARA DOSE ACCUMULATION CHART */}
      <div style={{ height: '250px', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '10px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
         <Plot
           data={chartTraces}
           layout={{
             autosize: true, margin: { l: 60, r: 20, t: 30, b: 40 },
             title: { text: 'Cumulative ALARA Dose Tracking', font: { color: '#E0E1DD', size: 14 } },
             paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
             xaxis: { title: 'Task Duration (Hours)', gridcolor: '#333' },
             yaxis: { title: 'Cumulative Dose (µSv)', gridcolor: '#333', type: 'linear' },
             showlegend: true, legend: { orientation: 'h', y: -0.2 }
           }}
           useResizeHandler={true} style={{ width: '100%', height: '100%' }}
         />
      </div>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px', height: '350px' }}>
        
        {/* Source Control */}
        <div style={{ flex: '0 0 350px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: 'var(--color-primary)' }}>1. Point Sources</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setSources([...sources, { id: Date.now(), name: 'New Source', x: dimX/2, y: dimY/2, z: 0.1, activity_MBq: 1000, gamma_uSv: 500 }])}>
             ➕ Add Source
           </button>
           {sources.map((s, idx) => (
             <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', marginBottom: '10px', borderRadius: '4px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input className="form-control" value={s.name} onChange={e => { const a=[...sources]; a[idx].name=e.target.value; setSources(a); }} style={{ width: '120px' }} />
                  <button onClick={() => setSources(sources.filter(src => src.id !== s.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
               </div>
               <div style={{ display: 'flex', gap: '5px' }}>
                 X<input type="number" step="0.1" className="form-control" value={s.x} onChange={e => { const a=[...sources]; a[idx].x=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
                 Y<input type="number" step="0.1" className="form-control" value={s.y} onChange={e => { const a=[...sources]; a[idx].y=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
                 Z<input type="number" step="0.1" className="form-control" value={s.z} onChange={e => { const a=[...sources]; a[idx].z=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
               </div>
               <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                 A:<input type="number" className="form-control" value={s.activity_MBq} onChange={e => { const a=[...sources]; a[idx].activity_MBq=Number(e.target.value); setSources(a); }} style={{ width: '80px' }} title="MBq" />
                 Γ:<input type="number" className="form-control" value={s.gamma_uSv} onChange={e => { const a=[...sources]; a[idx].gamma_uSv=Number(e.target.value); setSources(a); }} style={{ width: '80px' }} title="µSv/h at 1cm" />
               </div>
             </div>
           ))}
           <hr style={{ borderColor: '#444', margin: '15px 0' }}/>
           <div className="form-group">
             <label className="form-label" style={{ fontSize: '0.8rem' }}>Volumetric Map Render Limit (µSv/h)</label>
             <input type="number" className="form-control" value={displayMax} onChange={e => setDisplayMax(Number(e.target.value))} />
           </div>
        </div>

        {/* Worker Objs */}
        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: '#e67e22' }}>2. Anatomical Worker Array</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: '#d35400', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setWorkers([...workers, { id: Date.now(), name: 'New Worker', x: 2, y: 2, posture: 'Standing', rotationOffset: 0, taskDurationHours: 1 }])}>
             ➕ Add Worker Geometry
           </button>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px' }}>
               {workers.map((w, idx) => {
                 const breakdown = getWorkerNodes(w);
                 const c = breakdown.chestNode.dose; const e = breakdown.eyeNode.dose; 
                 const g = breakdown.gonadNode.dose; const ex = breakdown.extNode.dose;
                 
                 // Warnings if gradient is huge
                 const maxDose = Math.max(c, e, g, ex);
                 const minDose = Math.min(c, e, g, ex);
                 const gradientRatio = maxDose / (minDose > 0 ? minDose : 1);
                 const warning = gradientRatio > 5 
                   ? `⚠️ Extreme Gradient: Max dose is ${gradientRatio.toFixed(1)}x greater than lowest anatomical node.` 
                   : null;

                 return (
                   <div key={w.id} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid #444', borderRadius: '6px', padding: '10px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <input className="form-control" value={w.name} onChange={e => { const a=[...workers]; a[idx].name=e.target.value; setWorkers(a); }} style={{ fontWeight: 'bold' }} />
                        <button onClick={() => setWorkers(workers.filter(tgt => tgt.id !== w.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                     </div>
                     
                     <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div>X:<input type="number" step="0.1" className="form-control" value={w.x} onChange={e => { const a=[...workers]; a[idx].x=Number(e.target.value); setWorkers(a); }} style={{ width:'60px' }}/></div>
                        <div>Y:<input type="number" step="0.1" className="form-control" value={w.y} onChange={e => { const a=[...workers]; a[idx].y=Number(e.target.value); setWorkers(a); }} style={{ width:'60px' }}/></div>
                        <div>
                          Posture:
                          <select className="form-control" value={w.posture} onChange={e => { const a=[...workers]; a[idx].posture=e.target.value as any; setWorkers(a); }}>
                            <option value="Standing">Standing</option>
                            <option value="Crouching">Crouching</option>
                            <option value="Prone">Prone</option>
                          </select>
                        </div>
                     </div>
                     {w.posture === 'Prone' && (
                        <div style={{ marginBottom: '10px' }}>
                          Orientation (deg): <input type="number" className="form-control" value={w.rotationOffset} onChange={e => { const a=[...workers]; a[idx].rotationOffset=Number(e.target.value); setWorkers(a); }} style={{ width:'80px', display:'inline-block' }}/>
                        </div>
                     )}
                     <div style={{ marginBottom: '10px' }}>
                       Task Stay-Time (Hrs): <input type="number" step="0.5" className="form-control" value={w.taskDurationHours} onChange={e => { const a=[...workers]; a[idx].taskDurationHours=Number(e.target.value); setWorkers(a); }} style={{ width:'80px', display:'inline-block' }}/>
                     </div>

                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.85rem' }}>
                        <div style={{ padding: '4px', backgroundColor: '#333', borderRadius:'4px' }}>👁️ Head: <span style={{color: '#f1c40f'}}>{e.toFixed(1)} µSv/h</span></div>
                        <div style={{ padding: '4px', backgroundColor: '#333', borderRadius:'4px' }}>🫁 Chest: <span style={{color: '#2ecc71'}}>{c.toFixed(1)} µSv/h</span></div>
                        <div style={{ padding: '4px', backgroundColor: '#333', borderRadius:'4px' }}>🛡️ Gonads: <span style={{color: '#3498db'}}>{g.toFixed(1)} µSv/h</span></div>
                        <div style={{ padding: '4px', backgroundColor: '#333', borderRadius:'4px' }}>🥾 Ext: <span style={{color: '#9b59b6'}}>{ex.toFixed(1)} µSv/h</span></div>
                     </div>
                     
                     <div style={{ marginTop: '10px', padding: '8px', borderTop: '1px solid #555', textAlign: 'center', fontSize: '1.05rem' }}>
                        Dose Rate: <strong style={{color: '#e67e22'}}>{breakdown.effectiveDoseRate.toFixed(1)} µSv/h</strong> <br/>
                        <span style={{ fontSize: '0.9rem' }}>Task Accumulation: <strong style={{color: (breakdown.cumulativeEffectiveDose > 1000 ? '#e74c3c' : '#3498db')}}>{breakdown.cumulativeEffectiveDose.toFixed(1)} µSv</strong></span>
                     </div>
                     {warning && <div style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '5px' }}>{warning}</div>}
                   </div>
                 );
               })}
           </div>
        </div>

        {/* Shields Config */}
        <div style={{ flex: '0 0 350px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: '#3498db' }}>3. Structure Shields</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setShields([...shields, { id: Date.now(), name: 'Wall', x: 5, y: 5, z: 2.5, w: 2, l: 0.5, h: 5, tvl_cm: 14.7 }])}>
             ➕ Add Shield Block
           </button>
           {shields.map((sh, idx) => (
             <div key={sh.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', marginBottom: '10px', borderRadius: '4px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input className="form-control" value={sh.name} onChange={e => { const a=[...shields]; a[idx].name=e.target.value; setShields(a); }} style={{ width: '120px' }} />
                  <button onClick={() => setShields(shields.filter(s => s.id !== sh.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center' }}>
                 Cen: X<input type="number" step="0.1" className="form-control" value={sh.x} onChange={e => { const a=[...shields]; a[idx].x=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 Y<input type="number" step="0.1" className="form-control" value={sh.y} onChange={e => { const a=[...shields]; a[idx].y=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 Z<input type="number" step="0.1" className="form-control" value={sh.z} onChange={e => { const a=[...shields]; a[idx].z=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center' }}>
                 Size: W<input type="number" step="0.1" className="form-control" value={sh.w} onChange={e => { const a=[...shields]; a[idx].w=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 L<input type="number" step="0.1" className="form-control" value={sh.l} onChange={e => { const a=[...shields]; a[idx].l=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 H<input type="number" step="0.1" className="form-control" value={sh.h} onChange={e => { const a=[...shields]; a[idx].h=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center' }}>
                 TVL(cm):<input type="number" step="0.1" className="form-control" value={sh.tvl_cm} onChange={e => { const a=[...shields]; a[idx].tvl_cm=Number(e.target.value); setShields(a); }} style={{ width: '60px' }} title="Concrete ~14.7cm, Lead ~3.8cm" />
               </div>
             </div>
           ))}
        </div>

      </div>

    </div>
  );
};

export default WorkerDosimetryModule;
