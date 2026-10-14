import React, { useState, useMemo } from 'react';
import { BlockMath } from 'react-katex';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

// Example generic shielding data for standard materials (simplified from ANSI/ANS and NIST)
const MATERIALS = [
  { name: 'Lead (Pb)', density: 11.34, tvl1_1MeV: 3.8, tvle_1MeV: 4.0 }, // cm
  { name: 'Concrete (ordinary)', density: 2.35, tvl1_1MeV: 14.7, tvle_1MeV: 15.0 },
  { name: 'Steel (Fe)', density: 7.87, tvl1_1MeV: 5.0, tvle_1MeV: 5.2 },
  { name: 'Water', density: 1.00, tvl1_1MeV: 33.0, tvle_1MeV: 35.0 },
  { name: 'Tungsten', density: 19.3, tvl1_1MeV: 2.2, tvle_1MeV: 2.4 },
  { name: 'Aluminium', density: 2.70, tvl1_1MeV: 12.0, tvle_1MeV: 13.0 }
];

const ShieldingCalc: React.FC = () => {
  const [h0, setH0] = useState<number>(1000); // Initial dose rate uSv/h
  const [targetH, setTargetH] = useState<number>(10); // Target dose rate uSv/h
  const [materialIdx, setMaterialIdx] = useState<number>(0);
  
  const [thicknessInput, setThicknessInput] = useState<number>(5); // cm
  const [calcMode, setCalcMode] = useState<'thickness' | 'transmission'>('thickness');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const selectedMaterial = MATERIALS[materialIdx];

  // Calculation logic
  let result = 0;
  let resultLabel = '';
  let decadesComputed = 0;

  if (calcMode === 'thickness') {
    // Required shield thickness using TVL method for target attenuation
    if (h0 > targetH && targetH > 0) {
      decadesComputed = Math.log10(h0 / targetH);
      if (decadesComputed <= 1) {
        result = decadesComputed * selectedMaterial.tvl1_1MeV;
      } else {
        result = selectedMaterial.tvl1_1MeV + (decadesComputed - 1) * selectedMaterial.tvle_1MeV;
      }
    }
    resultLabel = 'Required Thickness (cm)';
  } else {
    // Transmitted dose rate for a given thickness
    // Reverse the TVL equation
    if (thicknessInput <= selectedMaterial.tvl1_1MeV) {
      decadesComputed = thicknessInput / selectedMaterial.tvl1_1MeV;
    } else {
      decadesComputed = 1 + (thicknessInput - selectedMaterial.tvl1_1MeV) / selectedMaterial.tvle_1MeV;
    }
    result = h0 / Math.pow(10, decadesComputed);
    resultLabel = 'Transmitted Dose Rate (µSv/h)';
  }

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Broad-Beam TVL Shielding Assessment — ${selectedMaterial.name}`,
    moduleName: 'Module 2B: Broad-Beam Tenth-Value Layer (TVL) Shielding Calculator',
    statuteCitation: 'NCRP Report No. 151 / ANSI/ANS-6.4.3 / NIST XCOM',
    verificationTestId: 'VTEST-02 (Gamma Shielding TVL)',
    operatorName: 'Health Physicist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Radiological Shielding & ALARA Engineering Division',
    notes: `Evaluation of ${calcMode === 'thickness' ? 'required barrier thickness' : 'transmitted ambient dose equivalent rate'} through ${selectedMaterial.name} (ρ = ${selectedMaterial.density} g/cm³) using 1 MeV broad-beam equilibrium Tenth-Value Layers.`,
    formulaDescription: 'x = \\text{TVL}_1 + (n - 1)\\cdot\\text{TVL}_e, \\quad \\dot{H} = \\dot{H}_0 \\cdot 10^{-n}',
    inputs: [
      { label: 'Shielding Material', value: `${selectedMaterial.name} (ρ = ${selectedMaterial.density} g/cm³)` },
      { label: 'Calculation Mode', value: calcMode === 'thickness' ? 'Solve Required Thickness' : 'Solve Transmitted Dose Rate' },
      { label: 'Unshielded Dose Rate (H₀)', value: h0, unit: 'µSv/h' },
      calcMode === 'thickness'
        ? { label: 'Target Dose Rate (H_target)', value: targetH, unit: 'µSv/h' }
        : { label: 'Barrier Thickness (x)', value: thicknessInput, unit: 'cm' },
      { label: 'First Tenth-Value Layer (TVL₁)', value: selectedMaterial.tvl1_1MeV, unit: 'cm' },
      { label: 'Equilibrium Tenth-Value Layer (TVLₑ)', value: selectedMaterial.tvle_1MeV, unit: 'cm' }
    ],
    outputs: [
      {
        label: resultLabel,
        value: result.toFixed(2),
        unit: calcMode === 'thickness' ? 'cm' : 'µSv/h',
        status: 'PASS'
      },
      {
        label: 'Attenuation Decades (n)',
        value: decadesComputed.toFixed(3),
        unit: 'TVLs',
        status: 'PASS'
      },
      {
        label: 'Transmission Factor (B·e^-µx)',
        value: Math.pow(10, -decadesComputed).toExponential(3),
        status: 'PASS'
      }
    ]
  }), [selectedMaterial, calcMode, h0, targetH, thicknessInput, resultLabel, result, decadesComputed]);

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>2B. Shielding Calculator (1 MeV reference)</h3>
          <VerificationBadge testId="VTEST-02" label="NCRP 151 TVL" />
        </div>
        
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ display: 'inline-block', marginRight: '15px' }}>
            <input type="radio" checked={calcMode === 'thickness'} onChange={() => setCalcMode('thickness')} /> Calculate Required Thickness
          </label>
          <label className="form-label" style={{ display: 'inline-block' }}>
            <input type="radio" checked={calcMode === 'transmission'} onChange={() => setCalcMode('transmission')} /> Calculate Transmitted Dose
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Material</label>
          <select className="form-control" value={materialIdx} onChange={e => setMaterialIdx(Number(e.target.value))}>
            {MATERIALS.map((m, i) => (
              <option key={i} value={i}>{m.name} (ρ = {m.density} g/cm³)</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Initial Dose Rate H₀ (µSv/h)</label>
          <input type="number" className="form-control" value={h0} onChange={e => setH0(Number(e.target.value))} />
        </div>

        {calcMode === 'thickness' ? (
          <div className="form-group">
            <label className="form-label">Target Dose Rate (µSv/h)</label>
            <input type="number" className="form-control" value={targetH} onChange={e => setTargetH(Number(e.target.value))} />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Shield Thickness (cm)</label>
            <input type="number" className="form-control" value={thicknessInput} onChange={e => setThicknessInput(Number(e.target.value))} />
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 320px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Results</h3>
          <button
            onClick={() => setIsDossierOpen(true)}
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📜 QA Calculation Dossier
          </button>
        </div>
        
        <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>{resultLabel}</div>
        <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {result.toFixed(2)}
        </div>

        <div className="formula-box" style={{ marginTop: '30px' }}>
          <BlockMath math="x = TVL_1 + (n-1) \cdot TVL_e" />
          <BlockMath math="\dot{H} = \frac{\dot{H}_0}{10^n}" />
        </div>
        
        <div style={{ marginTop: '20px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Assuming 1 MeV equivalent effective photon energy representing typical mixed Gamma fields (e.g. Co-60, Cs-137 average). 
          TVL₁ = {selectedMaterial.tvl1_1MeV} cm, TVLₑ = {selectedMaterial.tvle_1MeV} cm.
        </div>
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default ShieldingCalc;
