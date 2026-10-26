import React, { useState, useMemo } from 'react';
import { useRegulatory } from '../../context/RegulatoryContext';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import VerificationBadge from '../../components/VerificationBadge';

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
  const { currentFramework, setFrameworkId, allFrameworks, frameworkId } = useRegulatory();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('roster');
  const [workers, setWorkers] = useState<WorkerRecord[]>(INITIAL_WORKERS);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Injector Forms
  const [targetWorker, setTargetWorker] = useState('W001');
  const [doseAmount, setDoseAmount] = useState('1.0');
  const [doseType, setDoseType] = useState<'TEDE' | 'LDE' | 'SDE'>('TEDE');

  // Emergency Turn-Back, PSE & Declared Pregnant Worker Calculator State
  const [calcFieldRateMSvHr, setCalcFieldRateMSvHr] = useState<number>(25.0); // 25 mSv/h (2.5 rem/h)
  const [calcPriorAnnualMSv, setCalcPriorAnnualMSv] = useState<number>(4.5);
  const [calcPriorLifetimePSE_mSv, setCalcPriorLifetimePSE_mSv] = useState<number>(30.0); // 10 CFR 20.1206 max 250 mSv lifetime PSE
  const [calcFetalPriorMSv, setCalcFetalPriorMSv] = useState<number>(0.4);
  const [calcFetalMonthsLeft, setCalcFetalMonthsLeft] = useState<number>(6);

  // Dynamic Framework Limits
  const activeLimits = {
    TEDE: currentFramework.limits.occupationalAnnualEffective_mSv,
    LDE: currentFramework.limits.lensOfEyeAnnual_mSv,
    SDE: currentFramework.limits.skinAndExtremitiesAnnual_mSv
  };

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

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Annual Regulatory Dose Compliance Dossier — ${currentFramework.name}`,
    moduleName: 'Module 33: Regulatory Compliance & ALARA Administration',
    statuteCitation: `${currentFramework.name} (${currentFramework.citation})`,
    verificationTestId: 'VTEST-01 / ICRP-103 / 21 CFR Part 11',
    operatorName: 'Radiation Safety Officer (RSO)',
    operatorCredentials: 'CHP, MS Health Physics',
    facility: 'Central Nuclear Operations',
    notes: `Workforce compliance assessment across ${workers.length} radiation workers against statutory limits: Whole Body (${activeLimits.TEDE} mSv), Lens of Eye (${activeLimits.LDE} mSv), Shallow Extremities (${activeLimits.SDE} mSv).`,
    formulaDescription: 'R_{\\text{ALARA}} = \\max\\left(\\frac{\\text{TEDE}}{\\text{Limit}_{\\text{WB}}}, \\frac{\\text{LDE}}{\\text{Limit}_{\\text{Eye}}}, \\frac{\\text{SDE}}{\\text{Limit}_{\\text{Ext}}}\\right)',
    inputs: [
      { label: 'Regulatory Framework', value: `${currentFramework.governingBody} (${currentFramework.name})` },
      { label: 'Statute / Directive', value: currentFramework.citation },
      { label: 'Total Monitored Workers', value: `${workers.length} individuals` },
      { label: 'Whole Body (TEDE) Limit', value: activeLimits.TEDE, unit: 'mSv/yr' },
      { label: 'Lens of Eye (LDE) Limit', value: activeLimits.LDE, unit: 'mSv/yr' },
      { label: 'Extremity (SDE) Limit', value: activeLimits.SDE, unit: 'mSv/yr' }
    ],
    outputs: [
      { label: 'Regulatory Violations', value: violationCount, status: violationCount > 0 ? 'EXCEEDED' : 'PASS' },
      { label: 'ALARA Action Triggers', value: alaraCount, status: alaraCount > 0 ? 'WARNING' : 'PASS' },
      { label: 'Peak Whole Body Accumulation', value: highestTEDE.toFixed(1), unit: 'mSv', status: highestTEDE > activeLimits.TEDE ? 'EXCEEDED' : 'PASS' },
      { label: 'Peak Dose Recipient', value: highestWorker || 'None', status: 'PASS' }
    ]
  }), [currentFramework, workers, activeLimits, violationCount, alaraCount, highestTEDE, highestWorker]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="hud-badge hud-badge-primary">RADIATION SAFETY OFFICER (RSO) HUD</span>
            <span className="hud-badge hud-badge-accent">{currentFramework.flagEmoji} {currentFramework.name} ({currentFramework.shortCode})</span>
            <VerificationBadge testId="VTEST-01" label="ICRP 103 / 10 CFR 20" />
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Module 33 — Regulatory Dose Compliance &amp; ALARA Administration Dashboard
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Track occupational exposure records against Federal annual limits and internal ALARA investigation levels across Whole Body (TEDE), Lens of Eye (LDE), and Shallow Extremities (SDE).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <label style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>Regime:</label>
            <select
              className="form-control"
              value={frameworkId}
              onChange={e => setFrameworkId(e.target.value as any)}
              style={{ fontWeight: 'bold', color: 'var(--color-primary)', width: '210px', padding: '4px 8px' }}
            >
              {allFrameworks.map(f => (
                <option key={f.id} value={f.id}>{f.flagEmoji} {f.name}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, padding: '7px 14px' }}
          >
            <span>🖨️</span>
            <span>Export Compliance Dossier</span>
          </button>
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
            Standard: {activeLimits.TEDE} mSv TEDE / {activeLimits.LDE} mSv LDE
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
            Directive: {currentFramework.shortCode}
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

        {/* TAB 3: Regulatory Standards Matrix & Emergency/PSE/Fetal Calculators */}
        {activeTab === 'standards' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
                    🌐 6-Regime International &amp; Federal Radiation Protection Concordance Matrix
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Click any regime header or use the top selector to switch the active enforcement framework across the application.
                  </p>
                </div>
                <span className="hud-badge hud-badge-accent">{currentFramework.flagEmoji} Active: {currentFramework.shortCode}</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(0,0,0,0.4)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Statutory Dose Limit / Action Level</th>
                      {allFrameworks.map(f => (
                        <th
                          key={f.id}
                          onClick={() => setFrameworkId(f.id)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            color: f.id === frameworkId ? '#00e5ff' : '#e2e8f0',
                            background: f.id === frameworkId ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                            borderBottom: f.id === frameworkId ? '2px solid #00e5ff' : 'none'
                          }}
                        >
                          {f.flagEmoji} {f.shortCode}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Occupational Whole Body (TEDE / yr)</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: f.id === frameworkId ? '#00e5ff' : '#f59e0b' }}>
                          {f.limits.occupationalAnnualEffective_mSv} mSv ({f.limits.occupationalAnnualEffective_mSv / 10} rem)
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Lens of the Eye (LDE / yr)</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace', color: f.limits.lensOfEyeAnnual_mSv <= 20 ? '#10b981' : '#cbd5e1' }}>
                          {f.limits.lensOfEyeAnnual_mSv} mSv
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Skin &amp; Extremities (SDE / yr)</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace' }}>
                          {f.limits.skinAndExtremitiesAnnual_mSv} mSv
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Embryo / Fetus (Declared Pregnant Worker)</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {f.limits.embryoFetusDeclared_mSv} mSv
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Public Individual (Annual Limit)</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace' }}>
                          {f.limits.publicAnnualEffective_mSv} mSv
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Emergency — Critical Property / Infrastructure</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#f97316' }}>
                          {f.limits.emergencyProperty_mSv} mSv
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#fff' }}>Emergency — Life-Saving / Large Population</td>
                      {allFrameworks.map(f => (
                        <td key={f.id} style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
                          {f.limits.emergencyLifeSaving_mSv} mSv
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.25)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#00e5ff' }}>{currentFramework.shortCode} Operational Guidance: </strong>
                {currentFramework.turnBackGuidanceNotes}
              </div>
            </div>

            {/* Interactive Emergency Turn-Back, Planned Special Exposure (PSE) & Fetal Budget Calculators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
              {/* Card 1: Emergency Turn-Back Stay-Time & 10 CFR 20.1206 Planned Special Exposure */}
              <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: '#00e5ff', fontSize: '1rem' }}>
                  ⏱️ Emergency Turn-Back Stay-Time &amp; Planned Special Exposure (10 CFR § 20.1206)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Field Rate (mSv/h):</label>
                    <input
                      type="number"
                      step="5"
                      min="0.1"
                      className="form-control"
                      value={calcFieldRateMSvHr}
                      onChange={e => setCalcFieldRateMSvHr(Math.max(0.01, parseFloat(e.target.value) || 1))}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Prior YTD Dose (mSv):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-control"
                      value={calcPriorAnnualMSv}
                      onChange={e => setCalcPriorAnnualMSv(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Prior Lifetime PSE (mSv):</label>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      className="form-control"
                      value={calcPriorLifetimePSE_mSv}
                      onChange={e => setCalcPriorLifetimePSE_mSv(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                {(() => {
                  const remAnnual = Math.max(0, activeLimits.TEDE - calcPriorAnnualMSv);
                  const stayRoutineMin = (remAnnual / calcFieldRateMSvHr) * 60.0;
                  const stayPropertyMin = (currentFramework.limits.emergencyProperty_mSv / calcFieldRateMSvHr) * 60.0;
                  const stayLifeMin = (currentFramework.limits.emergencyLifeSaving_mSv / calcFieldRateMSvHr) * 60.0;
                  // 10 CFR 20.1206: Annual PSE <= 50 mSv AND Lifetime PSE <= 250 mSv (5x annual limit)
                  const pseRemLifetime = Math.max(0, 250.0 - calcPriorLifetimePSE_mSv);
                  const pseAllowedYear = Math.min(50.0, pseRemLifetime);

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Routine Stay-Time ({remAnnual.toFixed(1)} mSv left)</span>
                        <strong style={{ color: '#10b981', fontSize: '0.95rem', fontFamily: 'monospace' }}>{stayRoutineMin.toFixed(1)} min ({(stayRoutineMin / 60).toFixed(2)} h)</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Property Protection ({currentFramework.limits.emergencyProperty_mSv} mSv)</span>
                        <strong style={{ color: '#f97316', fontSize: '0.95rem', fontFamily: 'monospace' }}>{stayPropertyMin.toFixed(1)} min ({(stayPropertyMin / 60).toFixed(2)} h)</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Life-Saving Ceiling ({currentFramework.limits.emergencyLifeSaving_mSv} mSv)</span>
                        <strong style={{ color: '#ef4444', fontSize: '0.95rem', fontFamily: 'monospace' }}>{stayLifeMin.toFixed(1)} min ({(stayLifeMin / 60).toFixed(2)} h)</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>10 CFR 20.1206 PSE Remaining</span>
                        <strong style={{ color: '#38bdf8', fontSize: '0.95rem', fontFamily: 'monospace' }}>{pseAllowedYear.toFixed(1)} mSv/yr ({pseRemLifetime.toFixed(0)} mSv life)</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card 2: Declared Pregnant Worker / Embryo-Fetus Monthly Dose Budget (10 CFR 20.1208 / Reg Guide 8.13) */}
              <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: '#00e5ff', fontSize: '1rem' }}>
                  🤰 Declared Pregnant Worker / Embryo-Fetus Dose Budget ({currentFramework.shortCode})
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Evaluates uniform monthly exposure rate limits under {currentFramework.shortCode} (Cap: {currentFramework.limits.embryoFetusDeclared_mSv} mSv; NRC Reg Guide 8.13 uniform monthly constraint ≤ 0.5 mSv/mo).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Dose Since Conception (mSv):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      value={calcFetalPriorMSv}
                      onChange={e => setCalcFetalPriorMSv(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Gestation Months Remaining (1–9):</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="9"
                      className="form-control"
                      value={calcFetalMonthsLeft}
                      onChange={e => setCalcFetalMonthsLeft(Math.max(1, Math.min(9, parseInt(e.target.value, 10) || 1)))}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                {(() => {
                  const capMSv = currentFramework.limits.embryoFetusDeclared_mSv;
                  const remFetalMSv = Math.max(0, capMSv - calcFetalPriorMSv);
                  const uniformMonthlyMSv = remFetalMSv / calcFetalMonthsLeft;
                  // 10 CFR 20.1208(d): if embryo/fetus has already exceeded cap or is within 0.5 mSv of cap at declaration, additional dose <= 0.5 mSv
                  const isNearOrOverCap = calcFetalPriorMSv >= capMSv - 0.5;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${isNearOrOverCap ? '#ef4444' : '#10b981'}` }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Remaining Gestation Budget</span>
                        <strong style={{ color: isNearOrOverCap ? '#ef4444' : '#10b981', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                          {remFetalMSv.toFixed(2)} mSv ({(remFetalMSv * 100).toFixed(0)} mrem)
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Uniform Monthly Allowance</span>
                        <strong style={{ color: '#38bdf8', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                          {uniformMonthlyMSv.toFixed(3)} mSv / month
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      <AuditDossierModal payload={dossierPayload} isOpen={isDossierOpen} onClose={() => setIsDossierOpen(false)} />
    </div>
  );
};

export default RegModule;
