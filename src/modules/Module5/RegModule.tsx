import React from 'react';

const RegModule: React.FC = () => {
  return (
    <div className="panel" style={{ height: '100%' }}>
      <h2>Module 5 — Regulatory Compliance Dashboard</h2>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}>
        Dashboard tracking worker doses vs limits (e.g. 20 mSv/y), ALI/DAC utilisation, and ALARA constraints.
      </p>
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <h3>Work in Progress</h3>
        <p>This module is slated for the next development sprint.</p>
      </div>
    </div>
  );
}

export default RegModule;
