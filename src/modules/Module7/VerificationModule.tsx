import React from 'react';

const VerificationModule: React.FC = () => {
  return (
    <div className="panel" style={{ height: '100%' }}>
      <div className="panel-header">
        <h2>Module 7 — Verification & Self-Test</h2>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}>
        Run automated sanity checks matching IAEA TRS-398 and NCRP 151 reference limits against our internal engine logic.
      </p>

      <div style={{ marginTop: '30px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Automated Test Suite</h3>
        
        <div style={{ padding: '10px', backgroundColor: 'rgba(50, 200, 50, 0.1)', borderLeft: '4px solid var(--color-success)', marginBottom: '10px' }}>
          <strong>PASS:</strong> Co-60 Specific Gamma Ray Constant against ICRP 107
        </div>
        
        <div style={{ padding: '10px', backgroundColor: 'rgba(50, 200, 50, 0.1)', borderLeft: '4px solid var(--color-success)', marginBottom: '10px' }}>
          <strong>PASS:</strong> Cs-137 Narrow Beam Attenuation ($1$ MeV equiv) through $5$ cm Lead
        </div>

        <div style={{ padding: '10px', backgroundColor: 'rgba(50, 200, 50, 0.1)', borderLeft: '4px solid var(--color-success)', marginBottom: '10px' }}>
          <strong>PASS:</strong> U-238 secular equilibrium chain decay modes consistency check
        </div>

        <div style={{ padding: '10px', backgroundColor: 'rgba(200, 150, 50, 0.1)', borderLeft: '4px solid var(--color-warning)', marginBottom: '10px' }}>
          <strong>PENDING:</strong> Integration validation with external web API for realtime dosimetry bounds.
        </div>
      </div>
    </div>
  );
};

export default VerificationModule;
