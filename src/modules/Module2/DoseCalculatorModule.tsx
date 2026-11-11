import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VerificationBadge from '../../components/VerificationBadge';
import { useRegulatory } from '../../context/RegulatoryContext';
import ExternalDoseCalc from './submodules/ExternalDoseCalc';
import ShieldingCalc from './submodules/ShieldingCalc';
import InternalDoseCalc from './submodules/InternalDoseCalc';
import ActivationCalc from './submodules/ActivationCalc';

const DoseCalculatorModule: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentFramework, unitSystem, setLiveModuleTelemetry } = useRegulatory();
  const [activeTab, setActiveTab] = useState<'external' | 'shielding' | 'internal' | 'activation'>(() => {
    const tab = searchParams.get('tab')?.toLowerCase();
    if (tab === 'shielding' || tab === 'internal' || tab === 'activation' || tab === 'external') {
      return tab;
    }
    return 'external';
  });

  useEffect(() => {
    const tab = searchParams.get('tab')?.toLowerCase();
    if (tab === 'shielding' || tab === 'internal' || tab === 'activation' || tab === 'external') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Clear telemetry when leaving Module 1 completely; active submodule publishes live telemetry
  useEffect(() => {
    return () => {
      setLiveModuleTelemetry(null);
    };
  }, [setLiveModuleTelemetry]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2>Module 1 — Dose Calculation Engine</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Multi-pathway external, shielding, biokinetic internal, and neutron activation dosimetry ({currentFramework.shortCode} · {unitSystem})
          </span>
        </div>
        <VerificationBadge testId="VTEST-01 / 02" primaryTestId="VTEST-01" standard="ICRP 107" />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        <button 
          className={`nav-link ${activeTab === 'external' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'external' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('external')}
        >
          1A. External Dose
        </button>
        <button 
          className={`nav-link ${activeTab === 'shielding' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'shielding' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('shielding')}
        >
          1B. Shielding
        </button>
        <button 
          className={`nav-link ${activeTab === 'internal' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'internal' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('internal')}
        >
          1C. Internal Dose
        </button>
        <button 
          className={`nav-link ${activeTab === 'activation' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'activation' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('activation')}
        >
          1D. Activation
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'external' && <ExternalDoseCalc />}
        {activeTab === 'shielding' && <ShieldingCalc />}
        {activeTab === 'internal' && <InternalDoseCalc />}
        {activeTab === 'activation' && <ActivationCalc />}
      </div>
    </div>
  );
};

export default DoseCalculatorModule;
