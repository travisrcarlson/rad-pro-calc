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

const SHIELDING_MATERIALS: Record<string, { name: string, tvl_cm: number }> = {
  'LEAD': { name: 'Lead', tvl_cm: 3.8 },
  'TUNGSTEN': { name: 'Tungsten', tvl_cm: 1.3 },
  'IRON': { name: 'Iron / Steel', tvl_cm: 4.5 },
  'CONCRETE': { name: 'Concrete', tvl_cm: 14.7 },
  'BRICK': { name: 'Brick', tvl_cm: 18.0 },
  'ALUMINUM': { name: 'Aluminum', tvl_cm: 16.5 },
  'WATER': { name: 'Water', tvl_cm: 35.8 },
  'CUSTOM': { name: 'Custom Material', tvl_cm: 10.0 }
};

const Spatial3DModule: React.FC = () => {
  // Room dimensions (meters)
  const [dimX] = useState<number>(10);
  const [dimY] = useState<number>(10);
  const [dimZ] = useState<number>(5);

  // Visualization Bound Cutoffs
  const [displayMin, setDisplayMin] = useState<number>(10); // uSv/h
  const [displayMax, setDisplayMax] = useState<number>(2000); // uSv/h

  // State
  const [sources, setSources] = useState<Source3D[]>([
    { id: 1, name: 'Cs-137 Source', x: 5, y: 5, z: 1.5, activity_MBq: 37000, gamma_uSv: 890 }
  ]);

  const [targets, setTargets] = useState<Target3D[]>([
    { id: 1, name: 'Worker Pos A', x: 6, y: 5, z: 1.5 },
    { id: 2, name: 'Detector B', x: 2, y: 8, z: 3.0 }
  ]);

  const [shields, setShields] = useState<ShieldBlock[]>([
    { id: 1, name: 'Concrete Wall', x: 5, y: 6.5, z: 1.5, w: 4, l: 0.5, h: 3, material: 'CONCRETE', tvl_cm: 14.7 }
  ]);

  // Fast math intersection for Ray-AABB volumetric slices
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

  // Compute 3D Voxel Engine Matrix
  const { volX, volY, volZ, volV } = useMemo(() => {
    // Keep resolution within manageable bounds for WebGL arrays natively without locking state
    const resolutionXY = 25;
    const resolutionZ = 12;

    const stepX = dimX / resolutionXY;
    const stepY = dimY / resolutionXY;
    const stepZ = dimZ / resolutionZ;

    const X: number[] = [];
    const Y: number[] = [];
    const Z: number[] = [];
    const V: number[] = [];

    // O(XYZ) Volume Sweep
    for (let i = 0; i <= resolutionXY; i++) {
        const px = i * stepX;
        for (let j = 0; j <= resolutionXY; j++) {
            const py = j * stepY;
            for (let k = 0; k <= resolutionZ; k++) {
                const pz = k * stepZ;
                
                let d = 0;
                // Additive dose fields
                for (let s=0; s < sources.length; s++) {
                  const src = sources[s];
                  const dx = px - src.x;
                  const dy = py - src.y;
                  const dz = pz - src.z;
                  const dist_cm = Math.max(1, Math.sqrt(dx*dx + dy*dy + dz*dz) * 100);
                  
                  // Compute raytraced shield shadow limits
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
      const dist_cm = Math.max(1, Math.sqrt(dx*dx + dy*dy + dz*dz) * 100);
      
      let attenuationFactor = 1;
      for (let sh=0; sh < shields.length; sh++) {
        const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, t.x, t.y, t.z, shields[sh]);
        if (fract > 0) {
           const distInside_cm = fract * dist_cm;
           const decades = distInside_cm / shields[sh].tvl_cm;
           attenuationFactor *= Math.pow(10, decades);
        }
      }

      d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
    });
    return d; // uSv/h
  };

  // Build scatter mesh tracing arrays for visual shields
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

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <h2>Module 8 — 3D Volumetric Workspace</h2>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative', overflow: 'hidden', minHeight: '500px' }}>
         <div style={{ position: 'absolute', top: 5, left: 10, zIndex: 10, color: '#fff', textShadow: '1px 1px 2px #000', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px' }}>
           <strong>Volumetric Radiation Cloud</strong> <br/>
           <span style={{fontSize: '0.8rem'}}>Hold left click to orbit, scroll to zoom</span>
         </div>
         <Plot
          data={[
            {
              type: 'volume',
              x: volX, y: volY, z: volZ, value: volV,
              // Without bounds, standard 1/r^2 blowup creates rendering singularities
              isomin: displayMin, 
              isomax: displayMax,
              opacity: 0.1, 
              surface: { count: 8 }, 
              colorscale: 'Jet',
              colorbar: { title: 'µSv/h', len: 0.8, x: 0.95 },
              hovertemplate: 'X: %{x}m<br>Y: %{y}m<br>Z: %{z}m<br>Dose: %{value:.2f} µSv/h<extra></extra>'
            },
            {
              type: 'scatter3d',
              mode: 'markers+text',
              x: sources.map(s => s.x), y: sources.map(s => s.y), z: sources.map(s => s.z),
              marker: { symbol: 'circle', color: '#e74c3c', size: 6, line: { width: 1, color: '#fff' } },
              text: sources.map(s => `☢️ ${s.name}`),
              textposition: 'top center',
              textfont: { color: '#ff7675' },
              name: 'Sources',
              hoverinfo: 'text'
            },
            {
              type: 'scatter3d',
              mode: 'markers+text',
              x: targets.map(t => t.x), y: targets.map(t => t.y), z: targets.map(t => t.z),
              marker: { symbol: 'circle-open', color: '#2ecc71', size: 8, line: { width: 3, color: '#2ecc71' } },
              text: targets.map(t => `🎯 ${t.name}`),
              textposition: 'bottom center',
              textfont: { color: '#55efc4' },
              name: 'Targets',
              hovertext: targets.map(t => `Dose Context: ${calcTargetDose(t).toFixed(2)} µSv/h`),
              hoverinfo: 'text'
            },
            ...shieldTraces
          ]}
          layout={{
            autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
            scene: {
               xaxis: { title: 'X (m)', range: [0, dimX], gridcolor: '#444' },
               yaxis: { title: 'Depth Y (m)', range: [0, dimY], gridcolor: '#444' },
               zaxis: { title: 'Elevation Z (m)', range: [0, dimZ], gridcolor: '#444' },
               aspectmode: 'data',
               camera: { eye: { x: 1.5, y: -1.5, z: 1.0 } }
            },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
            showlegend: false
          }}
          useResizeHandler={true} style={{ width: '100%', height: '100%' }}
         />
      </div>

      {/* Control Split */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px', height: '300px' }}>
        
        {/* Environment Boundaries */}
        <div style={{ flex: '0 0 250px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: 'var(--color-primary)' }}>1. Visual Cutoffs</h3>
           <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px' }}>
              Due to $1/r^{2}$, sources tend toward physics infinity at $r=0$. Define bounding visual filters to strip pure core-burnout structures so you can see the secondary field cloud.
           </p>
           <div className="form-group">
             <label className="form-label">Min Render Shell (µSv/h)</label>
             <input type="number" className="form-control" value={displayMin} onChange={e => setDisplayMin(Number(e.target.value))} />
           </div>
           <div className="form-group">
             <label className="form-label">Max Render Shell (µSv/h)</label>
             <input type="number" className="form-control" value={displayMax} onChange={e => setDisplayMax(Number(e.target.value))} />
           </div>
        </div>

        {/* Workspace Geometry */}
        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: 'var(--color-primary)' }}>2. Point Sources</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setSources([...sources, { id: Date.now(), name: 'New Source', x: dimX/2, y: dimY/2, z: dimZ/2, activity_MBq: 1000, gamma_uSv: 500 }])}>
             ➕ Add Source
           </button>
           {sources.map((s, idx) => (
             <div key={s.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', marginBottom: '5px', borderRadius: '4px' }}>
               <input className="form-control" value={s.name} onChange={e => { const a=[...sources]; a[idx].name=e.target.value; setSources(a); }} style={{ width: '120px' }} />
               X:<input type="number" step="0.1" className="form-control" value={s.x} onChange={e => { const a=[...sources]; a[idx].x=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
               Y:<input type="number" step="0.1" className="form-control" value={s.y} onChange={e => { const a=[...sources]; a[idx].y=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
               Z:<input type="number" step="0.1" className="form-control" value={s.z} onChange={e => { const a=[...sources]; a[idx].z=Number(e.target.value); setSources(a); }} style={{ width: '60px' }} />
               A (MBq):<input type="number" className="form-control" value={s.activity_MBq} onChange={e => { const a=[...sources]; a[idx].activity_MBq=Number(e.target.value); setSources(a); }} style={{ width: '80px' }} />
               Γ:<input type="number" className="form-control" value={s.gamma_uSv} onChange={e => { const a=[...sources]; a[idx].gamma_uSv=Number(e.target.value); setSources(a); }} style={{ width: '80px' }} title="µSv·cm²/MBq·h" />
               <button onClick={() => setSources(sources.filter(src => src.id !== s.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
             </div>
           ))}
        </div>

        {/* Dosimetry Objs */}
        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: '#e67e22' }}>3. Target Dosimeters</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: '#d35400', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setTargets([...targets, { id: Date.now(), name: 'New Target', x: 1, y: 1, z: 1 }])}>
             ➕ Add Target Sensor
           </button>
           
           <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
             <thead>
               <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                 <th style={{ padding: '8px' }}>Object Name</th>
                 <th style={{ padding: '8px' }}>[X, Y, Z] (m)</th>
                 <th style={{ padding: '8px', textAlign: 'right' }}>Absorbed Dose</th>
                 <th style={{ padding: '8px' }}></th>
               </tr>
             </thead>
             <tbody>
               {targets.map((t, idx) => {
                 const doseVal = calcTargetDose(t);
                 return (
                   <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <td style={{ padding: '8px' }}>
                       <input className="form-control" value={t.name} onChange={e => { const a=[...targets]; a[idx].name=e.target.value; setTargets(a); }} />
                     </td>
                     <td style={{ padding: '8px', display: 'flex', gap: '5px' }}>
                       <input type="number" step="0.1" className="form-control" value={t.x} onChange={e => { const a=[...targets]; a[idx].x=Number(e.target.value); setTargets(a); }} style={{ width: '50px' }} />
                       <input type="number" step="0.1" className="form-control" value={t.y} onChange={e => { const a=[...targets]; a[idx].y=Number(e.target.value); setTargets(a); }} style={{ width: '50px' }} />
                       <input type="number" step="0.1" className="form-control" value={t.z} onChange={e => { const a=[...targets]; a[idx].z=Number(e.target.value); setTargets(a); }} style={{ width: '50px' }} />
                     </td>
                     <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-success)' }}>
                       {doseVal > 1000 ? `${(doseVal/1000).toFixed(2)} mSv/h` : `${doseVal.toFixed(2)} µSv/h`}
                     </td>
                     <td style={{ padding: '8px', textAlign: 'right' }}>
                       <button onClick={() => setTargets(targets.filter(tgt => tgt.id !== t.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        </div>

        {/* Shields Config */}
        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           <h3 style={{ marginBottom: '10px', color: '#3498db' }}>4. Structure Shields</h3>
           <button style={{ marginBottom: '10px', padding: '5px 10px', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
             onClick={() => setShields([...shields, { id: Date.now(), name: 'Wall', x: 5, y: 5, z: 2.5, w: 2, l: 0.5, h: 5, material: 'CONCRETE', tvl_cm: 14.7 }])}>
             ➕ Add Shield Block
           </button>
           {shields.map((sh, idx) => (
             <div key={sh.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', marginBottom: '10px', borderRadius: '4px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input className="form-control" value={sh.name} onChange={e => { const a=[...shields]; a[idx].name=e.target.value; setShields(a); }} style={{ width: '120px' }} />
                  <button onClick={() => setShields(shields.filter(s => s.id !== sh.id))} style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center' }}>
                 Pos: X<input type="number" step="0.1" className="form-control" value={sh.x} onChange={e => { const a=[...shields]; a[idx].x=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 Y<input type="number" step="0.1" className="form-control" value={sh.y} onChange={e => { const a=[...shields]; a[idx].y=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 Z<input type="number" step="0.1" className="form-control" value={sh.z} onChange={e => { const a=[...shields]; a[idx].z=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center' }}>
                 Size: W<input type="number" step="0.1" className="form-control" value={sh.w} onChange={e => { const a=[...shields]; a[idx].w=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 L<input type="number" step="0.1" className="form-control" value={sh.l} onChange={e => { const a=[...shields]; a[idx].l=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
                 H<input type="number" step="0.1" className="form-control" value={sh.h} onChange={e => { const a=[...shields]; a[idx].h=Number(e.target.value); setShields(a); }} style={{ width: '50px' }} />
               </div>
               <div style={{ display: 'flex', gap: '5px', fontSize: '0.8rem', color: '#aaa', alignItems: 'center', flexWrap: 'wrap' }}>
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
                   style={{ flex: 1, minWidth: '100px' }}
                 >
                   {Object.keys(SHIELDING_MATERIALS).map(key => (
                     <option key={key} value={key}>{SHIELDING_MATERIALS[key].name}</option>
                   ))}
                 </select>
                 TVL (cm):<input type="number" className="form-control" value={sh.tvl_cm} onChange={e => { const a=[...shields]; a[idx].tvl_cm=Number(e.target.value); a[idx].material='CUSTOM'; setShields(a); }} style={{ width: '60px' }} />
               </div>
             </div>
           ))}
        </div>

      </div>

    </div>
  );
};

export default Spatial3DModule;
