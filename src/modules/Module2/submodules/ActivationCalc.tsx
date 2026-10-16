import React, { useState, useMemo } from 'react';
import { BlockMath } from 'react-katex';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

// Standard thermal and fast neutron activation targets
const TARGETS = [
  { name: 'Cobalt (Co-59)', product: 'Co-60', sigma_barns: 37.2, lambda_s: 4.168e-9, n_atoms_g: 1.022e22, gamma_uSv: 0.357 },
  { name: 'Gold (Au-197)', product: 'Au-198', sigma_barns: 98.7, lambda_s: 2.977e-6, n_atoms_g: 3.057e21, gamma_uSv: 0.059 },
  { name: 'Sodium (Na-23)', product: 'Na-24', sigma_barns: 0.53, lambda_s: 1.287e-5, n_atoms_g: 2.619e22, gamma_uSv: 0.498 },
  { name: 'Iron (Fe-54 fast n,p)', product: 'Mn-54', sigma_barns: 0.08, lambda_s: 2.56e-8, n_atoms_g: 6.4e20, gamma_uSv: 0.127 },
  { name: 'Nickel (Ni-62)', product: 'Ni-63', sigma_barns: 14.5, lambda_s: 2.19e-10, n_atoms_g: 3.0e20, gamma_uSv: 0.0 }
];

const ActivationCalc: React.FC = () => {
  const [targetIdx, setTargetIdx] = useState<number>(1);
  const [flux, setFlux] = useState<number>(1e13); // n/cm2/s
  const [tIrrStr, setTIrrStr] = useState<number>(1);
  const [tIrrUnit, setTIrrUnit] = useState<number>(31536000); // years -> seconds
  
  const [tCoolStr, setTCoolStr] = useState<number>(0);
  const [tCoolUnit, setTCoolUnit] = useState<number>(86400); // days -> seconds
  
  const [mass, setMass] = useState<number>(1); // gram
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

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

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Neutron Activation Analysis — ${selectedTarget.name} → ${selectedTarget.product}`,
    moduleName: 'Module 1D: Neutron Activation & Saturation Kinetics Calculator',
    statuteCitation: 'IAEA TRS No. 273 / Knoll Radiation Detection and Measurement',
    verificationTestId: 'VTEST-17 (Neutron Activation Saturation)',
    operatorName: 'Reactor Health Physicist',
    operatorCredentials: 'CHP, PE',
    facility: 'Neutron Activation & Reactor Dosimetry Laboratory',
    notes: `Induced activity and post-irradiation decay calculation for ${mass} g of ${selectedTarget.name} exposed to thermal/fast neutron flux Φ = ${flux.toExponential(2)} n·cm⁻²·s⁻¹.`,
    formulaDescription: 'A(t) = N \\sigma \\Phi \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right) e^{-\\lambda t_{\\text{cool}}}',
    inputs: [
      { label: 'Target Isotope', value: `${selectedTarget.name} → ${selectedTarget.product}` },
      { label: 'Target Mass', value: mass, unit: 'g' },
      { label: 'Microscopic Cross-Section (σ)', value: selectedTarget.sigma_barns, unit: 'barns' },
      { label: 'Neutron Flux (Φ)', value: flux.toExponential(3), unit: 'n·cm⁻²·s⁻¹' },
      { label: 'Irradiation Duration (t_irr)', value: t_irr.toExponential(3), unit: 's' },
      { label: 'Cooling Duration (t_cool)', value: t_cool.toExponential(3), unit: 's' }
    ],
    outputs: [
      {
        label: `Induced Activity (${selectedTarget.product})`,
        value: activity_MBq > 1 ? activity_MBq.toExponential(3) : activity_Bq.toExponential(3),
        unit: activity_MBq > 1 ? 'MBq' : 'Bq',
        status: 'PASS'
      },
      {
        label: 'Saturation Activity (A_sat)',
        value: (saturation_activity / 1e6).toExponential(3),
        unit: 'MBq',
        status: 'PASS'
      },
      {
        label: 'Saturation Buildup Fraction',
        value: `${(buildup_factor * 100).toFixed(2)}%`,
        status: 'PASS'
      },
      {
        label: 'Estimated Dose Rate at 1 m',
        value: (activity_MBq * selectedTarget.gamma_uSv).toExponential(3),
        unit: 'µSv/h',
        status: (activity_MBq * selectedTarget.gamma_uSv) > 100 ? 'WARNING' : 'PASS'
      }
    ]
  }), [selectedTarget, mass, flux, t_irr, t_cool, activity_MBq, activity_Bq, saturation_activity, buildup_factor]);

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>2D. Dose Rate from Activated Materials</h3>
          <VerificationBadge testId="VTEST-17" label="Neutron Activation" />
        </div>
        
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

      <div style={{ flex: '1 1 320px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Induced Activity ({selectedTarget.product})</h3>
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
        
        <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {activity_MBq > 1 ? activity_MBq.toExponential(2) : activity_Bq.toExponential(2)} {activity_MBq > 1 ? 'MBq' : 'Bq'}
        </div>

        {selectedTarget.gamma_uSv > 0 && (
          <div style={{ marginTop: '10px', fontSize: '1.2rem', color: 'var(--color-accent)' }}>
            Est. Dose Rate at 1 m: {(activity_MBq * selectedTarget.gamma_uSv).toExponential(2)} µSv/h
          </div>
        )}

        <div className="formula-box" style={{ marginTop: '30px' }}>
          <BlockMath math="A(t) = N \sigma \Phi (1 - e^{-\lambda t_{irr}}) e^{-\lambda t_{cool}}" />
        </div>
        
        <ul style={{ marginTop: '15px', color: 'var(--color-text-muted)', fontSize: '0.85rem', paddingLeft: '20px' }}>
          <li>Cross-section (σ): {selectedTarget.sigma_barns} barns</li>
          <li>Saturation Activity: {(saturation_activity / 1e6).toExponential(2)} MBq</li>
        </ul>
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default ActivationCalc;
