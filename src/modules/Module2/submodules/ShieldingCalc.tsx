import React, { useState } from 'react';
import { BlockMath } from 'react-katex';

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

  const selectedMaterial = MATERIALS[materialIdx];

  // Calculation logic
  let result = 0;
  let resultLabel = '';

  if (calcMode === 'thickness') {
    // Required shield thickness using TVL method for target attenuation
    if (h0 > targetH && targetH > 0) {
      const decades = Math.log10(h0 / targetH);
      if (decades <= 1) {
        result = decades * selectedMaterial.tvl1_1MeV;
      } else {
        result = selectedMaterial.tvl1_1MeV + (decades - 1) * selectedMaterial.tvle_1MeV;
      }
    }
    resultLabel = 'Required Thickness (cm)';
  } else {
    // Transmitted dose rate for a given thickness
    // Reverse the TVL equation
    let decades = 0;
    if (thicknessInput <= selectedMaterial.tvl1_1MeV) {
      decades = thicknessInput / selectedMaterial.tvl1_1MeV;
    } else {
      decades = 1 + (thicknessInput - selectedMaterial.tvl1_1MeV) / selectedMaterial.tvle_1MeV;
    }
    result = h0 / Math.pow(10, decades);
    resultLabel = 'Transmitted Dose Rate (µSv/h)';
  }

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: '15px' }}>2B. Shielding Calculator (1 MeV reference)</h3>
        
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
          <label className="form-label">Initial Dose Rate H0 (µSv/h)</label>
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

      <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Results</h3>
        
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
    </div>
  );
};

export default ShieldingCalc;
