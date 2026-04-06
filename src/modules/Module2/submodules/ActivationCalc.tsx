import React, { useState } from 'react';
import { BlockMath } from 'react-katex';

// Simplified library of standard activation targets for demonstration
const TARGETS = [
  { name: 'Iron (Fe-54)', product: 'Mn-54', sigma_barns: 0.1, lambda_s: 2.56e-8, n_atoms_g: 6.4e20, gamma_uSv: 1.2 }, // Rough approx
  { name: 'Cobalt (Co-59)', product: 'Co-60', sigma_barns: 37, lambda_s: 4.17e-9, n_atoms_g: 1.0e22, gamma_uSv: 3.5 },
  { name: 'Nickel (Ni-62)', product: 'Ni-63', sigma_barns: 14.5, lambda_s: 2.19e-10, n_atoms_g: 3e20, gamma_uSv: 0.0 }
];

const ActivationCalc: React.FC = () => {
  const [targetIdx, setTargetIdx] = useState<number>(1);
  const [flux, setFlux] = useState<number>(1e13); // n/cm2/s
  const [tIrrStr, setTIrrStr] = useState<number>(1);
  const [tIrrUnit, setTIrrUnit] = useState<number>(31536000); // years -> seconds
  
  const [tCoolStr, setTCoolStr] = useState<number>(0);
  const [tCoolUnit, setTCoolUnit] = useState<number>(86400); // days -> seconds
  
  const [mass, setMass] = useState<number>(1); // gram

  const selectedTarget = TARGETS[targetIdx];

  const t_irr = tIrrStr * tIrrUnit;
  const t_cool = tCoolStr * tCoolUnit;
  const sigma_cm2 = selectedTarget.sigma_barns * 1e-24;
  
  const N_total = selectedTarget.n_atoms_g * mass;
  
  // A(t) = N * sigma * phi * (1 - e^-lambda*t_irr) * e^-lambda*t_cool
  const saturation_activity = N_total * sigma_cm2 * flux;
  const buildup_factor = 1 - Math.exp(-selectedTarget.lambda_s * t_irr);
  const decay_factor = Math.exp(-selectedTarget.lambda_s * t_cool);
  
  const activity_Bq = saturation_activity * buildup_factor * decay_factor;
  const activity_MBq = activity_Bq / 1000000;

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: '15px' }}>2D. Dose Rate from Activated Materials</h3>
        
        <div className="form-group">
          <label className="form-label">Target Material</label>
          <select className="form-control" value={targetIdx} onChange={e => setTargetIdx(Number(e.target.value))}>
            {TARGETS.map((t, i) => (
              <option key={i} value={i}>{t.name} → {t.product}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Target Mass (g)</label>
          <input type="number" className="form-control" value={mass} onChange={e => setMass(Number(e.target.value))} />
        </div>

        <div className="form-group">
          <label className="form-label">Neutron Flux Φ (n·cm⁻²·s⁻¹)</label>
          <input type="number" className="form-control" value={flux} onChange={e => setFlux(Number(e.target.value))} />
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
             <label className="form-label">Irradiation Time (t_irr)</label>
             <input type="number" className="form-control" value={tIrrStr} onChange={e => setTIrrStr(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
             <label className="form-label">Unit</label>
             <select className="form-control" value={tIrrUnit} onChange={e => setTIrrUnit(Number(e.target.value))}>
                <option value={1}>sec</option>
                <option value={3600}>hours</option>
                <option value={86400}>days</option>
                <option value={31536000}>years</option>
             </select>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
             <label className="form-label">Cooling Time (t_cool)</label>
             <input type="number" className="form-control" value={tCoolStr} onChange={e => setTCoolStr(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
             <label className="form-label">Unit</label>
             <select className="form-control" value={tCoolUnit} onChange={e => setTCoolUnit(Number(e.target.value))}>
                <option value={1}>sec</option>
                <option value={3600}>hours</option>
                <option value={86400}>days</option>
                <option value={31536000}>years</option>
             </select>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Induced Activity ({selectedTarget.product})</h3>
        
        <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {activity_MBq > 1 ? activity_MBq.toExponential(2) : activity_Bq.toExponential(2)} {activity_MBq > 1 ? 'MBq' : 'Bq'}
        </div>

        {selectedTarget.gamma_uSv > 0 && (
          <div style={{ marginTop: '10px', fontSize: '1.2rem', color: 'var(--color-accent)' }}>
            Est. Contact Dose (1m): {(activity_MBq * selectedTarget.gamma_uSv).toExponential(2)} µSv/h
          </div>
        )}

        <div className="formula-box" style={{ marginTop: '30px' }}>
          <BlockMath math="A(t) = N \sigma \Phi (1 - e^{-\lambda t_{irr}}) e^{-\lambda t_{cool}}" />
        </div>
        
        <ul style={{ marginTop: '15px', color: 'var(--color-text-muted)', fontSize: '0.85rem', paddingLeft: '20px' }}>
          <li>Cross-section ($\sigma$): {selectedTarget.sigma_barns} barns</li>
          <li>Saturation Activity: {(saturation_activity / 1e6).toExponential(2)} MBq</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivationCalc;
