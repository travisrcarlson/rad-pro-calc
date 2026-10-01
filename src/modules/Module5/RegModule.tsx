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

type WorkspaceTab = 'roster' | 'injector' | 'standards';

const RegModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('roster');
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
    if (ratio >= 1.0) return { pct: percentage, color: '#ef4444', text: 'VIOLATION', badgeClass: 'hud-badge-danger' };
    if (ratio >= 0.3) return { pct: percentage, color: '#f97316', text: 'ALARA LEVEL II', badgeClass: 'hud-badge-accent' };
    if (ratio >= 0.1) return { pct: percentage, color: '#f59e0b', text: 'ALARA LEVEL I', badgeClass: 'hud-badge-warning' };
    return { pct: percentage, color: '#10b981', text: 'SAFE', badgeClass: 'hud-badge-success' };
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

  // Compute metrics for top HUD
  let violationCount = 0;
  let alaraCount = 0;
  let highestTEDE = 0;
  let highestWorker = '';

  workers.forEach(w => {
    const rT = w.doseTEDE / activeLimits.TEDE;
    const rL = w.doseLDE / activeLimits.LDE;
    const rS = w.doseSDE / activeLimits.SDE;
    const maxR = Math.max(rT, rL, rS);

    if (maxR >= 1.0) violationCount++;
    else if (maxR >= 0.1) alaraCount++;

    if (w.doseTEDE > highestTEDE) {
      highestTEDE = w.doseTEDE;
      highestWorker = w.name;
    }
  });

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">RADIATION SAFETY OFFICER (RSO) HUD</span>
            <span className="hud-badge hud-badge-accent">{framework === 'US_NRC' ? '10 CFR 20' : 'ICRP 103'}</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Regulatory Dose Compliance &amp; ALARA Administration Dashboard
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Track occupational exposure records against Federal annual limits and internal ALARA investigation levels across Whole Body (TEDE), Lens of Eye (LDE), and Shallow Extremities (SDE).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Jurisdiction:</label>
          <select
            className="form-control"
            value={framework}
            onChange={e => setFramework(e.target.value as RegFramework)}
            style={{ fontWeight: 'bold', color: 'var(--color-primary)', width: '200px', padding: '4px 8px' }}
          >
            <option value="US_NRC">US NRC (10 CFR 20)</option>
            <option value="ICRP">ICRP 103 (International)</option>
          </select>
        </div>
      </div>

      {/* Top HUD Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">MONITORED WORKFORCE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)' }}>
            {workers.length} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>PERSONNEL</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Annual Period: Active Cycle
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">COMPLIANCE HEALTH</span>
          <span className="hud-metric-value">
            {violationCount > 0 ? (
              <span className="hud-badge hud-badge-danger">{violationCount} VIOLATION(S)</span>
            ) : alaraCount > 0 ? (
              <span className="hud-badge hud-badge-warning">{alaraCount} ALARA TRIGGERED</span>
            ) : (
              <span className="hud-badge hud-badge-success">100% COMPLIANT</span>
            )}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Standard: {framework === 'US_NRC' ? '50 mSv TEDE / 150 mSv LDE' : '20 mSv TEDE / 20 mSv LDE'}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PEAK WHOLE BODY (TEDE)</span>
          <span className="hud-metric-value" style={{ color: highestTEDE > activeLimits.TEDE ? '#ef4444' : 'var(--color-accent)' }}>
            {highestTEDE.toFixed(2)} mSv
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Worker: {highestWorker}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">EYE LENS REGULATORY CAP</span>
          <span className="hud-metric-value" style={{ color: '#fff' }}>
            {activeLimits.LDE} mSv / yr
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {framework === 'ICRP' ? 'ICRP 118 Cataract Limit' : 'NRC 10 CFR 20.1201'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          Personnel Dosimetry Roster ({workers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'injector' ? 'active' : ''}`}
          onClick={() => setActiveTab('injector')}
        >
          Dose Record Injector Terminal
        </button>
        <button
          className={`tab-btn ${activeTab === 'standards' ? 'active' : ''}`}
          onClick={() => setActiveTab('standards')}
        >
          Regulatory Standards Matrix
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
        
        {/* TAB 1: Personnel Dosimetry Roster */}
        {activeTab === 'roster' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {workers.map(w => {
              const statusT = getALARAStatus(w.doseTEDE, activeLimits.TEDE);
              const statusL = getALARAStatus(w.doseLDE, activeLimits.LDE);
              const statusS = getALARAStatus(w.doseSDE, activeLimits.SDE);

              const rT = w.doseTEDE / activeLimits.TEDE;
              const rL = w.doseLDE / activeLimits.LDE;
              const rS = w.doseSDE / activeLimits.SDE;
              const worstRatio = Math.max(rT, rL, rS);

              let cardBorder = '1px solid var(--color-border)';
              if (worstRatio >= 1.0) cardBorder = '1px solid #ef4444';
              else if (worstRatio >= 0.3) cardBorder = '1px solid #f97316';

              return (
                <div
                  key={w.id}
                  style={{
                    backgroundColor: 'rgba(5, 10, 18, 0.7)',
                    borderRadius: '8px',
                    padding: '18px',
                    border: cardBorder,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ backgroundColor: '#1e293b', color: 'var(--color-primary)', width: '38px', height: '38px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', border: '1px solid #334155' }}>
                        {w.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>{w.name}</h3>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ID: {w.id} | Department: {w.department}</span>
                      </div>
                    </div>

                    {worstRatio >= 1.0 ? (
                      <span className="hud-badge hud-badge-danger">EXPOSURE VIOLATION</span>
                    ) : worstRatio >= 0.3 ? (
                      <span className="hud-badge hud-badge-accent">ALARA TIER II</span>
                    ) : (
                      <span className="hud-badge hud-badge-success">NORMAL</span>
                    )}
                  </div>

                  {/* Progress Meters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* TEDE */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Whole Body (TEDE)</span>
                        <span>
                          {w.doseTEDE.toFixed(2)} / {activeLimits.TEDE.toFixed(2)} mSv &nbsp;|&nbsp;{' '}
                          <span className={`hud-badge ${statusT.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            {statusT.pct} ({statusT.text})
                          </span>
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (w.doseTEDE / activeLimits.TEDE) * 100)}%`, backgroundColor: statusT.color, transition: 'all 0.5s ease' }}></div>
                      </div>
                    </div>

                    {/* LDE */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Lens of Eye (LDE)</span>
                        <span>
                          {w.doseLDE.toFixed(2)} / {activeLimits.LDE.toFixed(2)} mSv &nbsp;|&nbsp;{' '}
                          <span className={`hud-badge ${statusL.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            {statusL.pct} ({statusL.text})
                          </span>
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (w.doseLDE / activeLimits.LDE) * 100)}%`, backgroundColor: statusL.color, transition: 'all 0.5s ease' }}></div>
                      </div>
                    </div>

                    {/* SDE */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Extremities / Skin (SDE)</span>
                        <span>
                          {w.doseSDE.toFixed(2)} / {activeLimits.SDE.toFixed(2)} mSv &nbsp;|&nbsp;{' '}
                          <span className={`hud-badge ${statusS.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            {statusS.pct} ({statusS.text})
                          </span>
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (w.doseSDE / activeLimits.SDE) * 100)}%`, backgroundColor: statusS.color, transition: 'all 0.5s ease' }}></div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Exposure Record Injector Terminal */}
        {activeTab === 'injector' && (
          <div style={{ maxWidth: '640px', background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                Simulated Exposure Record Injector
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Use this testing terminal to inject hypothetical dosimeter readings directly into a worker file to verify regulatory breach thresholds and internal ALARA alarms.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Target Personnel</label>
              <select className="form-control" value={targetWorker} onChange={e => setTargetWorker(e.target.value)}>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id}) - {w.department}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Anatomical Target Profile</label>
              <select className="form-control" value={doseType} onChange={e => setDoseType(e.target.value as 'TEDE' | 'LDE' | 'SDE')}>
                <option value="TEDE">Whole Body Deep Dose Equivalent (TEDE)</option>
                <option value="LDE">Lens of Eye Dose Equivalent (LDE)</option>
                <option value="SDE">Skin / Extremities Shallow Dose (SDE)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Recorded Dose Increment (mSv)</label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                className="form-control"
                value={doseAmount}
                onChange={e => setDoseAmount(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '10px 16px', fontWeight: 'bold', marginTop: '6px' }}
              onClick={handleInjectDose}
            >
              Inject Exposure Record Into Personnel File
            </button>
          </div>
        )}

        {/* TAB 3: Regulatory Standards Matrix */}
        {activeTab === 'standards' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              Comparison of Occupational Radiation Protection Limits
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(0,0,0,0.3)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Dose Category</th>
                  <th style={{ padding: '10px 12px' }}>US NRC (10 CFR 20.1201)</th>
                  <th style={{ padding: '10px 12px' }}>ICRP Publication 103 / 118</th>
                  <th style={{ padding: '10px 12px' }}>IAEA GSR Part 3</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#fff' }}>Whole Body Effective Dose (TEDE)</td>
                  <td style={{ padding: '10px 12px', color: '#f59e0b' }}>50 mSv / year</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-primary)' }}>20 mSv / year (avg over 5 yrs, max 50 in single yr)</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-primary)' }}>20 mSv / year (avg over 5 yrs)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#fff' }}>Lens of Eye (LDE)</td>
                  <td style={{ padding: '10px 12px', color: '#f59e0b' }}>150 mSv / year</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-primary)' }}>20 mSv / year (ICRP 118 reduction)</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-primary)' }}>20 mSv / year</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#fff' }}>Skin &amp; Extremities (SDE)</td>
                  <td style={{ padding: '10px 12px' }}>500 mSv / year</td>
                  <td style={{ padding: '10px 12px' }}>500 mSv / year</td>
                  <td style={{ padding: '10px 12px' }}>500 mSv / year</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#fff' }}>Embryo / Fetus (Declared Pregnant Worker)</td>
                  <td style={{ padding: '10px 12px' }}>5 mSv total gestation (0.5 mSv/mo)</td>
                  <td style={{ padding: '10px 12px' }}>1 mSv remainder of pregnancy</td>
                  <td style={{ padding: '10px 12px' }}>1 mSv remainder of pregnancy</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#fff' }}>General Public Individual</td>
                  <td style={{ padding: '10px 12px' }}>1 mSv / year (100 mrem)</td>
                  <td style={{ padding: '10px 12px' }}>1 mSv / year</td>
                  <td style={{ padding: '10px 12px' }}>1 mSv / year</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default RegModule;
