import React, { useState } from 'react';
import ExternalDoseCalc from './submodules/ExternalDoseCalc';
import ShieldingCalc from './submodules/ShieldingCalc';
import InternalDoseCalc from './submodules/InternalDoseCalc';
import ActivationCalc from './submodules/ActivationCalc';

const DoseCalculatorModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('external');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ marginBottom: '0' }}>
        <h2>Module 2 — Dose Calculation Engine</h2>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        <button 
          className={`nav-link ${activeTab === 'external' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'external' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('external')}
        >
          2A. External Dose
        </button>
        <button 
          className={`nav-link ${activeTab === 'shielding' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'shielding' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('shielding')}
        >
          2B. Shielding
        </button>
        <button 
          className={`nav-link ${activeTab === 'internal' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'internal' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('internal')}
        >
          2C. Internal Dose
        </button>
        <button 
          className={`nav-link ${activeTab === 'activation' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: activeTab === 'activation' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('activation')}
        >
          2D. Activation
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
