import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

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
}

const PRESETS: Preset[] = [
  // Golden Engineering Flash X-Rays (Averages from Spec Sheet)
  { id: 'xr150', name: 'Golden Engineering XR150 (150 kVp)', mode: 'flash_pulsed', kvp: 150, mrPerPulseAt30cm: 2.4, pulseWidthNs: 50, totalPulses: 10 },
  { id: 'xr200', name: 'Golden Engineering XR200 (150 kVp)', mode: 'flash_pulsed', kvp: 150, mrPerPulseAt30cm: 3.0, pulseWidthNs: 50, totalPulses: 10 },
  { id: 'xrs3', name: 'Golden Engineering XRS-3 / XR300 (270 kVp)', mode: 'flash_pulsed', kvp: 270, mrPerPulseAt30cm: 3.0, pulseWidthNs: 25, totalPulses: 10 },
  { id: 'xrs4', name: 'Golden Engineering XRS-4 (370 kVp)', mode: 'flash_pulsed', kvp: 370, mrPerPulseAt30cm: 6.25, pulseWidthNs: 10, totalPulses: 10 },
  // Medical/Dental Generics
  { id: 'dental', name: 'Standard Dental Intraoral (70 kVp)', mode: 'medical_continuous', kvp: 70, ma: 7, timeSeconds: 0.2 },
  { id: 'fluoro', name: 'Surgical C-Arm Fluoro (100 kVp)', mode: 'medical_continuous', kvp: 100, ma: 3, timeSeconds: 60 },
  { id: 'ct', name: 'Medical CT Scanner (120 kVp)', mode: 'medical_continuous', kvp: 120, ma: 200, timeSeconds: 1 }
];

const PulsedXRayModule: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('xr200');
  const [distanceMeters, setDistanceMeters] = useState<number>(1.0);
  
  // Custom manual overrides
  const [overrideMode, setOverrideMode] = useState<GeneratorMode>('flash_pulsed');
  const [customKvp, setCustomKvp] = useState<number>(150);
  
  // Flash
  const [customMrPerPulse, setCustomMrPerPulse] = useState<number>(2.7);
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
    
    // Safety bounding
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

  // Generate the 2D Map for the X-Ray Field
  const { mapX, mapY, mapZ, maxMapDose } = useMemo(() => {
    const minX = -8; const maxX = 8;
    const minY = -4; const maxY = 35;
    const res = 100; // 100x100 grid for larger area
    
    const mX: number[] = [];
    const mY: number[] = [];
    const mZ: number[][] = [];
    
    const beamAngleDeg = 45; // 45 degree spread (±22.5 deg from Y axis)
    const leakageFactor = 0.005; // 0.5% tube scatter/leakage
    let maxFound = 0;

    for (let j = 0; j <= res; j++) {
      const y = minY + j * ((maxY - minY) / res);
      mY.push(y);
      const row: number[] = [];
      for (let i = 0; i <= res; i++) {
        const x = minX + i * ((maxX - minX) / res);
        if (j === 0) mX.push(x);
        
        const dist = Math.max(0.1, Math.sqrt(x*x + y*y));
        const theta = Math.atan2(x, y) * (180 / Math.PI); // degrees from positive Y
        
        const isInsideCone = Math.abs(theta) <= (beamAngleDeg / 2);
        const geoMultiplier = isInsideCone ? 1.0 : leakageFactor;
        
        let localVal = calcDoseAtDistance(dist).accumulatedDose_uSv * geoMultiplier;
        
        if (localVal > maxFound && isInsideCone) maxFound = localVal;
        row.push(localVal);
      }
      mZ.push(row);
    }
    return { mapX: mX, mapY: mY, mapZ: mZ, maxMapDose: maxFound };
  }, [calcDoseAtDistance]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
         <h2>Module 10 — Pulsed X-Ray & Machine Systems</h2>
         <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
           Transient Machine Generation Physics. Track Flash X-Ray pulses (Golden Engineering) and continuous Medical exposures.
         </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, padding: '20px' }}>
        
        {/* Left Col: Setup */}
        <div style={{ flex: '0 0 450px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
           
           <div className="form-group" style={{ marginBottom: '20px' }}>
             <label className="form-label" style={{ color: '#3498db', fontWeight: 'bold' }}>Select Manufacturer Preset</label>
             <select className="form-control" value={selectedPresetId} onChange={e => handlePresetChange(e.target.value)}>
                <option value="custom">-- Custom Manual System --</option>
                {PRESETS.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                ))}
             </select>
           </div>

           <hr style={{ borderColor: '#444', margin: '20px 0' }}/>

           <div className="form-group">
             <label className="form-label">System Generation Mode</label>
             <select className="form-control" value={overrideMode} onChange={e => {setOverrideMode(e.target.value as any); setSelectedPresetId('custom');}}>
                <option value="flash_pulsed">Flash Radiography (Pulsed ns)</option>
                <option value="medical_continuous">Medical/Industrial (Continuous mA)</option>
             </select>
           </div>

           <div className="form-group">
             <label className="form-label">Tube Peak Energy (kVp)</label>
             <input type="number" className="form-control" value={customKvp} onChange={e => {setCustomKvp(Number(e.target.value)); setSelectedPresetId('custom');}} />
           </div>

           {overrideMode === 'flash_pulsed' ? (
             <div style={{ backgroundColor: 'rgba(230, 126, 34, 0.1)', padding: '15px', borderRadius: '4px', border: '1px solid rgba(230, 126, 34, 0.4)' }}>
               <h4 style={{ color: '#e67e22', marginBottom: '10px' }}>Flash Pulse Parameters</h4>
               <div className="form-group">
                 <label className="form-label">Bare Output per Pulse (mR @ 30cm)</label>
                 <input type="number" step="0.1" className="form-control" value={customMrPerPulse} onChange={e => {setCustomMrPerPulse(Number(e.target.value)); setSelectedPresetId('custom');}} />
               </div>
               <div className="form-group">
                 <label className="form-label">Total Pulses / Shots Fired</label>
                 <input type="number" className="form-control" value={customPulses} onChange={e => {setCustomPulses(Number(e.target.value)); setSelectedPresetId('custom');}} />
               </div>
               <div className="form-group">
                 <label className="form-label">Pulse Duration (nanoseconds - ns)</label>
                 <input type="number" className="form-control" value={customPulseWidthNs} onChange={e => {setCustomPulseWidthNs(Number(e.target.value)); setSelectedPresetId('custom');}} />
                 <small style={{color: '#888'}}>Critical for paralyzable detector testing.</small>
               </div>
             </div>
           ) : (
             <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '4px', border: '1px solid rgba(52, 152, 219, 0.4)' }}>
               <h4 style={{ color: '#3498db', marginBottom: '10px' }}>Continuous Operation Parameters</h4>
               <div className="form-group">
                 <label className="form-label">Tube Current (mA)</label>
                 <input type="number" step="0.5" className="form-control" value={customMa} onChange={e => {setCustomMa(Number(e.target.value)); setSelectedPresetId('custom');}} />
               </div>
               <div className="form-group">
                 <label className="form-label">Exposure Time (Seconds)</label>
                 <input type="number" step="0.1" className="form-control" value={customTime} onChange={e => {setCustomTime(Number(e.target.value)); setSelectedPresetId('custom');}} />
               </div>
             </div>
           )}

           <hr style={{ borderColor: '#444', margin: '20px 0' }}/>
           <div className="form-group">
             <label className="form-label" style={{ fontSize: '1.1rem', color: '#fff' }}>Target Distance (meters)</label>
             <input type="number" step="0.1" className="form-control" value={distanceMeters} onChange={e => setDistanceMeters(Number(e.target.value))} style={{ fontSize: '1.1rem', padding: '10px' }} />
           </div>

        </div>

        {/* Right Col: Diagnostics */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
           <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--color-border)', flex: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 5, left: 10, zIndex: 10, color: '#fff', textShadow: '1px 1px 2px #000' }}>
                 <strong>Beam Geometry Map</strong> <br/>
                 <span style={{fontSize: '0.8rem'}}>Top-Down projection (incl. 0.5% internal leakage)</span>
              </div>
              <Plot
                data={[
                  {
                    z: mapZ, x: mapX, y: mapY,
                    type: 'heatmap', colorscale: 'Hot',
                    zmin: 0, zmax: maxMapDose > 5000 ? 5000 : maxMapDose, // Clamp white-hot core
                    colorbar: { title: { text: 'µSv' }, x: 1.05 }
                  },
                  {
                    x: [0], y: [distanceMeters],
                    mode: 'markers+text', type: 'scatter', name: 'Target',
                    marker: { symbol: 'cross', color: '#2ecc71', size: 14, line: { width: 3 } },
                    text: [`🎯 Dose Tgt (${distanceMeters}m)`],
                    textposition: 'top right',
                    textfont: { color: '#55efc4' },
                    hoverinfo: 'none'
                  },
                  {
                    x: [0], y: [0],
                    mode: 'markers+text', type: 'scatter', name: 'Tube',
                    marker: { symbol: 'square', color: '#e74c3c', size: 10 },
                    text: ['⚡ X-Ray Window'],
                    textposition: 'bottom center',
                    textfont: { color: '#ff7675' },
                    hoverinfo: 'none'
                  }
                ]}
                layout={{
                  autosize: true, margin: { l: 40, r: 60, t: 20, b: 40 },
                  xaxis: { title: { text: 'X (m)' } },
                  yaxis: { title: { text: 'Forward Distance Y (m)' }, scaleanchor: 'x', scaleratio: 1 },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  showlegend: false,
                  shapes: overrideMode === 'flash_pulsed' ? [
                    // Manufacturer Exclusion Zone (Front) - 100ft (30.5m) long, +/- 20ft (6.1m) wide
                    {
                      type: 'rect', xref: 'x', yref: 'y',
                      x0: -6.1, y0: 0, x1: 6.1, y1: 30.5,
                      line: { color: '#f1c40f', width: 2, dash: 'dot' },
                      fillcolor: 'rgba(241, 196, 15, 0.1)'
                    },
                    // Manufacturer Exclusion Zone (Back) - 10ft (3.05m) deep, +/- 10ft (3.05m) wide
                    {
                      type: 'rect', xref: 'x', yref: 'y',
                      x0: -3.05, y0: -3.05, x1: 3.05, y1: 0,
                      line: { color: '#f1c40f', width: 2, dash: 'dot' },
                      fillcolor: 'rgba(241, 196, 15, 0.1)'
                    },
                    // X-Ray Beam Centroid Line
                    {
                      type: 'line', xref: 'x', yref: 'y',
                      x0: 0, y0: 0, x1: 0, y1: 30.5,
                      line: { color: '#e74c3c', width: 1 }
                    }
                  ] : []
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%', minHeight: '400px' }}
              />
           </div>

           <div style={{ display: 'flex', gap: '20px' }}>
             <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ color: '#aaa', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Accumulated Dose</h3>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-success)', textShadow: '0 0 20px rgba(46, 204, 113, 0.4)' }}>
                  {results.accumulatedDose_uSv > 1000 
                    ? `${(results.accumulatedDose_uSv / 1000).toFixed(2)} mSv`
                    : `${results.accumulatedDose_uSv.toFixed(2)} µSv`
                  }
                </div>
                <p style={{ marginTop: '10px', color: '#888', fontSize: '1.0rem' }}>
                  At exactly {distanceMeters}m (Target 🎯)
                </p>
             </div>

             <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
                
                {results.instantaneousRate_Sv_H > 100 && overrideMode === 'flash_pulsed' && (
                   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid #e74c3c', borderRadius: '8px', animation: 'pulse 2s infinite', pointerEvents: 'none' }} />
                )}

                <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>Detector Burnout (Peak Rate)</h3>
                <p style={{ color: '#ccc', marginBottom: '15px', lineHeight: '1.4', fontSize: '0.8rem' }}>
                   Standard GM/Solid-State dosimeters paralyze and read <strong>0 µSv/h</strong> if blasted with absolute instantaneous rates exceeding roughly 1,000 Sv/h.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                   <span style={{ fontSize: '1.0rem', color: '#888' }}>Peak Instant Rate:</span>
                   <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e74c3c' }}>
                      {results.instantaneousRate_Sv_H > 1000 
                       ? `${(results.instantaneousRate_Sv_H/1000).toExponential(2)}k Sv/h` 
                       : `${results.instantaneousRate_Sv_H.toExponential(2)} Sv/h`
                      }
                   </span>
                </div>
                
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: results.instantaneousRate_Sv_H > 1000 ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.1)', borderRadius: '4px', fontSize: '0.85rem' }}>
                   {results.instantaneousRate_Sv_H > 1000 
                     ? "⚠️ CRITICAL WARNING: Beam exceeds detector saturation limits. Normal active dosimetry will paralyze and fail-to-zero!"
                     : "✅ Safe Flux: Standard EPDs should read linearly."
                   }
                </div>

             </div>
           </div>
        </div>

      </div>

    </div>
  );
};

export default PulsedXRayModule;
