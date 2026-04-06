import React, { useState } from 'react';

type RegFramework = 'US_NRC' | 'ICRP';

interface WorkerRecord {
  id: string;
  name: string;
  department: string;
  doseTEDE: number; // mSv Whole Body
  doseLDE: number;  // mSv Lens of Eye
  doseSDE: number;  // mSv Shallow Dose Extremities
}

const INITIAL_WORKERS: WorkerRecord[] = [
  { id: 'W001', name: 'Dr. Arthur Vance', department: 'Industrial Radiography', doseTEDE: 3.5, doseLDE: 4.0, doseSDE: 12.0 },
  { id: 'W002', name: 'Sarah Jenkins', department: 'Medical / Hot Cell', doseTEDE: 14.8, doseLDE: 22.0, doseSDE: 135.0 },
  { id: 'W003', name: 'James Holden', department: 'Waste Logistics', doseTEDE: 0.1, doseLDE: 0.1, doseSDE: 0.5 },
];

const RegModule: React.FC = () => {
  const [framework, setFramework] = useState<RegFramework>('US_NRC');
  const [workers, setWorkers] = useState<WorkerRecord[]>(INITIAL_WORKERS);
  
  // Injector Forms
  const [targetWorker, setTargetWorker] = useState('W001');
  const [doseAmount, setDoseAmount] = useState('1.0');
  const [doseType, setDoseType] = useState<'TEDE' | 'LDE' | 'SDE'>('TEDE');

  // Regulatory Logic
  const limits = {
    US_NRC: { TEDE: 50, LDE: 150, SDE: 500 },
    ICRP: { TEDE: 20, LDE: 20, SDE: 500 }
  };
  const activeLimits = limits[framework];

  const getALARAStatus = (dose: number, limit: number) => {
    const ratio = dose / limit;
    const percentage = (ratio * 100).toFixed(1) + '%';
    if (ratio >= 1.0) return { pct: percentage, color: '#e74c3c', text: 'VIOLATION', badge: '🔴' };
    if (ratio >= 0.3) return { pct: percentage, color: '#e67e22', text: 'ALARA LEVEL II', badge: '🟠' }; // 30% Limit
    if (ratio >= 0.1) return { pct: percentage, color: '#f1c40f', text: 'ALARA LEVEL I', badge: '🟡' }; // 10% Limit
    return { pct: percentage, color: '#2ecc71', text: 'SAFE', badge: '🟢' };
  };

  const handleInjectDose = () => {
    const amt = parseFloat(doseAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    setWorkers(workers.map(w => {
      if (w.id === targetWorker) {
        return {
          ...w,
          doseTEDE: doseType === 'TEDE' ? w.doseTEDE + amt : w.doseTEDE,
          doseLDE: doseType === 'LDE' ? w.doseLDE + amt : w.doseLDE,
          doseSDE: doseType === 'SDE' ? w.doseSDE + amt : w.doseSDE,
        };
      }
      return w;
    }));
    
    setDoseAmount('');
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
            <h2>Module 5 — Regulatory Compliance Dashboard</h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
              RSO Administration Panel tracking cumulative physical doses against Federal Limits and ALARA metrics.
            </p>
         </div>
         <div>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Active Jurisdiction: </label>
            <select 
              className="form-control" 
              value={framework} 
              onChange={e => setFramework(e.target.value as RegFramework)}
              style={{ fontWeight: 'bold', color: '#f1c40f' }}
            >
              <option value="US_NRC">US NRC (10 CFR 20)</option>
              <option value="ICRP">ICRP (International)</option>
            </select>
         </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
        
        {/* Left Col: Roster & Cards */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {workers.map(w => {
            const statusT = getALARAStatus(w.doseTEDE, activeLimits.TEDE);
            const statusL = getALARAStatus(w.doseLDE, activeLimits.LDE);
            const statusS = getALARAStatus(w.doseSDE, activeLimits.SDE);
            
            // Critical overall status is the worst of the three
            const rT = w.doseTEDE/activeLimits.TEDE;
            const rL = w.doseLDE/activeLimits.LDE;
            const rS = w.doseSDE/activeLimits.SDE;
            const worstRatio = Math.max(rT, rL, rS);
            
            let cardBorder = '1px solid #333';
            if (worstRatio >= 1.0) cardBorder = '2px solid #e74c3c';
            else if (worstRatio >= 0.3) cardBorder = '1px solid #e67e22';

            return (
              <div key={w.id} style={{ 
                backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', 
                border: cardBorder, position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <div style={{ backgroundColor: '#2c3e50', padding: '10px 15px', borderRadius: '50%', fontWeight: 'bold', fontSize: '1.2rem' }}>
                       {w.name.charAt(0)}
                     </div>
                     <div>
                       <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{w.name}</h3>
                       <span style={{ color: '#aaa', fontSize: '0.85rem' }}>ID: {w.id} | Dept: {w.department}</span>
                     </div>
                  </div>
                  {worstRatio >= 1.0 && <span style={{ color: '#e74c3c', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>⚠️ VIOLATION DETECTED</span>}
                </div>

                {/* Progress Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {/* TEDE */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>Whole Body (TEDE)</span>
                      <span>{w.doseTEDE.toFixed(2)} / {activeLimits.TEDE.toFixed(2)} mSv &nbsp; | &nbsp; <span style={{ color: statusT.color }}>{statusT.badge} {statusT.pct} ({statusT.text})</span></span>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, (w.doseTEDE/activeLimits.TEDE)*100)+'%', backgroundColor: statusT.color, transition: 'all 0.5s ease' }}></div>
                    </div>
                  </div>

                  {/* LDE */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>Lens of Eye (LDE)</span>
                      <span>{w.doseLDE.toFixed(2)} / {activeLimits.LDE.toFixed(2)} mSv &nbsp; | &nbsp; <span style={{ color: statusL.color }}>{statusL.badge} {statusL.pct} ({statusL.text})</span></span>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, (w.doseLDE/activeLimits.LDE)*100)+'%', backgroundColor: statusL.color, transition: 'all 0.5s ease' }}></div>
                    </div>
                  </div>

                  {/* SDE */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>Extremities/Skin (SDE)</span>
                      <span>{w.doseSDE.toFixed(2)} / {activeLimits.SDE.toFixed(2)} mSv &nbsp; | &nbsp; <span style={{ color: statusS.color }}>{statusS.badge} {statusS.pct} ({statusS.text})</span></span>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, (w.doseSDE/activeLimits.SDE)*100)+'%', backgroundColor: statusS.color, transition: 'all 0.5s ease' }}></div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
        
        {/* Right Col: Interactive Dose Injector Simulator */}
        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid #444', borderRadius: '12px', padding: '20px', alignSelf: 'flex-start', position: 'sticky', top: '20px' }}>
           <h3 style={{ borderBottom: '1px solid #555', paddingBottom: '10px', marginTop: 0 }}>🔬 Simulated Exposure Injector</h3>
           <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '20px' }}>
             Use this terminal to inject hypothetical dosimeter readings directly into a worker's file to verify ALARA alarm configurations.
           </p>

           <div className="form-group">
              <label>Target Personnel</label>
              <select className="form-control" value={targetWorker} onChange={e => setTargetWorker(e.target.value)}>
                 {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
              </select>
           </div>
           
           <div className="form-group">
              <label>Body Target Profile</label>
              <select className="form-control" value={doseType} onChange={e => setDoseType(e.target.value as 'TEDE' | 'LDE' | 'SDE')}>
                 <option value="TEDE">Whole Body (TEDE)</option>
                 <option value="LDE">Lens of Eye (LDE)</option>
                 <option value="SDE">Skin/Extremities Range (SDE)</option>
              </select>
           </div>

           <div className="form-group">
              <label>Recorded Shift Dose (mSv)</label>
              <input 
                type="number" 
                min="0"
                step="0.1"
                className="form-control" 
                value={doseAmount} 
                onChange={e => setDoseAmount(e.target.value)} 
                placeholder="e.g. 1.5"
              />
           </div>

           <button 
             className="btn btn-primary" 
             style={{ width: '100%', marginTop: '15px', fontWeight: 'bold' }} 
             onClick={handleInjectDose}
           >
             INJECT EXPOSURE RECORD
           </button>
        </div>

      </div>
    </div>
  );
};

export default RegModule;
