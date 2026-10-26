import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { BlockMath } from 'react-katex';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

// Standard thermal, epithermal resonance integral (I_0), and fast neutron activation targets
const TARGETS = [
  { name: 'Cobalt (Co-59)', product: 'Co-60', sigma_barns: 37.2, resonance_I0_barns: 74.0, lambda_s: 4.168e-9, halfLifeLabel: '5.271 y', n_atoms_g: 1.022e22, gamma_uSv: 0.357 },
  { name: 'Gold (Au-197)', product: 'Au-198', sigma_barns: 98.7, resonance_I0_barns: 1550.0, lambda_s: 2.977e-6, halfLifeLabel: '2.695 d', n_atoms_g: 3.057e21, gamma_uSv: 0.059 },
  { name: 'Sodium (Na-23)', product: 'Na-24', sigma_barns: 0.53, resonance_I0_barns: 0.31, lambda_s: 1.287e-5, halfLifeLabel: '14.96 h', n_atoms_g: 2.619e22, gamma_uSv: 0.498 },
  { name: 'Iron (Fe-54 fast n,p)', product: 'Mn-54', sigma_barns: 0.08, resonance_I0_barns: 0.05, lambda_s: 2.56e-8, halfLifeLabel: '312.2 d', n_atoms_g: 6.4e20, gamma_uSv: 0.127 },
  { name: 'Nickel (Ni-62)', product: 'Ni-63', sigma_barns: 14.5, resonance_I0_barns: 6.8, lambda_s: 2.19e-10, halfLifeLabel: '100.1 y', n_atoms_g: 3.0e20, gamma_uSv: 0.0 },
  { name: 'Manganese (Mn-55)', product: 'Mn-56', sigma_barns: 13.3, resonance_I0_barns: 14.0, lambda_s: 7.467e-5, halfLifeLabel: '2.579 h', n_atoms_g: 1.096e22, gamma_uSv: 0.242 },
  { name: 'Copper (Cu-63)', product: 'Cu-64', sigma_barns: 4.50, resonance_I0_barns: 4.97, lambda_s: 1.516e-5, halfLifeLabel: '12.70 h', n_atoms_g: 6.56e21, gamma_uSv: 0.031 },
  { name: 'Iridium (Ir-191)', product: 'Ir-192', sigma_barns: 954.0, resonance_I0_barns: 3500.0, lambda_s: 1.086e-7, halfLifeLabel: '73.83 d', n_atoms_g: 1.167e21, gamma_uSv: 0.130 }
];

const getActivationUnitLabel = (unitSec: number) => {
  if (unitSec === 31536000) return 'y';
  if (unitSec === 86400) return 'd';
  if (unitSec === 3600) return 'h';
  return 's';
};

const ActivationCalc: React.FC = () => {
  const [targetIdx, setTargetIdx] = useState<number>(1);
  const [flux, setFlux] = useState<number>(1e13); // Thermal flux n/cm2/s
  const [epiToThermalRatio, setEpiToThermalRatio] = useState<number>(0.0); // Phi_epi / Phi_th (0 = pure thermal)
  const [tIrrStr, setTIrrStr] = useState<number>(1);
  const [tIrrUnit, setTIrrUnit] = useState<number>(31536000); // years -> seconds

  const [tCoolStr, setTCoolStr] = useState<number>(0);
  const [tCoolUnit, setTCoolUnit] = useState<number>(86400); // days -> seconds

  const [mass, setMass] = useState<number>(1); // gram
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const selectedTarget = TARGETS[targetIdx];

  const t_irr = Math.max(0, tIrrStr * tIrrUnit);
  const t_cool = Math.max(0, tCoolStr * tCoolUnit);
  const sigma_cm2 = selectedTarget.sigma_barns * 1e-24;
  const resonance_I0_cm2 = selectedTarget.resonance_I0_barns * 1e-24;
  const epiFlux = flux * Math.max(0, epiToThermalRatio);

  const N_total = selectedTarget.n_atoms_g * mass;

  // Westcott 2-group reaction rate: R = N * (sigma_0 * Phi_th + I_0 * Phi_epi)
  const thermalReactionRate = N_total * sigma_cm2 * flux;
  const epithermalReactionRate = N_total * resonance_I0_cm2 * epiFlux;
  const saturation_activity = thermalReactionRate + epithermalReactionRate;

  // Cadmium ratio R_Cd = 1 + (sigma_0 * Phi_th) / (I_0 * Phi_epi)
  const cadmiumRatio = epithermalReactionRate > 0
    ? 1 + (thermalReactionRate / epithermalReactionRate)
    : Infinity;

  const buildup_factor = 1 - Math.exp(-selectedTarget.lambda_s * t_irr);
  const decay_factor = Math.exp(-selectedTarget.lambda_s * t_cool);

  const activity_eob_Bq = saturation_activity * buildup_factor;
  const activity_Bq = activity_eob_Bq * decay_factor;
  const activity_MBq = activity_Bq / 1000000;

  // Generate Two-Phase Irradiation Buildup (0 -> t_irr) + Cooling (t_irr -> t_irr + t_cool) Curve
  const kineticsSeries = useMemo(() => {
    const plotUnitSec = tIrrUnit >= 86400 ? 86400 : tIrrUnit >= 3600 ? 3600 : 1;
    const plotUnitName = plotUnitSec === 86400 ? 'Days' : plotUnitSec === 3600 ? 'Hours' : 'Seconds';

    const irrDuration = Math.max(t_irr, plotUnitSec);
    const coolDuration = t_cool > 0 ? t_cool : Math.min(irrDuration * 0.6, (Math.LN2 / selectedTarget.lambda_s) * 2);

    const irrX: number[] = [];
    const irrY_MBq: number[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = (irrDuration * i) / steps;
      irrX.push(t / plotUnitSec);
      const act = saturation_activity * (1 - Math.exp(-selectedTarget.lambda_s * t));
      irrY_MBq.push(act / 1e6);
    }

    const coolX: number[] = [];
    const coolY_MBq: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const tc = (coolDuration * i) / steps;
      coolX.push((irrDuration + tc) / plotUnitSec);
      const act = activity_eob_Bq * Math.exp(-selectedTarget.lambda_s * tc);
      coolY_MBq.push(act / 1e6);
    }

    const eobX = irrDuration / plotUnitSec;
    const currentX = (irrDuration + t_cool) / plotUnitSec;
    const satMBq = saturation_activity / 1e6;

    return { irrX, irrY_MBq, coolX, coolY_MBq, eobX, currentX, satMBq, plotUnitName };
  }, [t_irr, t_cool, tIrrUnit, saturation_activity, activity_eob_Bq, selectedTarget.lambda_s]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Neutron Activation Analysis — ${selectedTarget.name} → ${selectedTarget.product}`,
    moduleName: 'Module 1D: Thermal & Epithermal Neutron Activation Kinetics',
    statuteCitation: 'IAEA TRS No. 273 / Knoll Radiation Detection and Measurement',
    verificationTestId: 'VTEST-17 (Neutron Activation Saturation)',
    operatorName: 'Reactor Health Physicist',
    operatorCredentials: 'CHP, PE',
    facility: 'Neutron Activation & Reactor Dosimetry Laboratory',
    notes: `Induced activity and post-irradiation decay calculation for ${mass} g of ${selectedTarget.name} exposed to thermal flux Φ_th = ${flux.toExponential(2)} n·cm⁻²·s⁻¹ and epithermal ratio Φ_epi/Φ_th = ${epiToThermalRatio}.`,
    formulaDescription: 'A(t) = N (\\sigma_0 \\Phi_{\\text{th}} + I_0 \\Phi_{\\text{epi}}) \\left(1 - e^{-\\lambda t_{\\text{irr}}}\\right) e^{-\\lambda t_{\\text{cool}}}',
    inputs: [
      { label: 'Target Isotope', value: `${selectedTarget.name} → ${selectedTarget.product} (T½ = ${selectedTarget.halfLifeLabel})` },
      { label: 'Target Mass', value: mass, unit: 'g' },
      { label: 'Thermal Cross-Section (σ₀) / Resonance Integral (I₀)', value: `${selectedTarget.sigma_barns} b / ${selectedTarget.resonance_I0_barns} b` },
      { label: 'Thermal Neutron Flux (Φ_th)', value: flux.toExponential(3), unit: 'n·cm⁻²·s⁻¹' },
      { label: 'Epithermal Flux Ratio (Φ_epi / Φ_th)', value: epiToThermalRatio.toFixed(3), unit: Number.isFinite(cadmiumRatio) ? `R_Cd = ${cadmiumRatio.toFixed(2)}` : 'Pure Thermal' },
      { label: 'Irradiation Duration (t_irr)', value: `${tIrrStr} ${getActivationUnitLabel(tIrrUnit)} (${t_irr.toExponential(3)} s)` },
      { label: 'Cooling Duration (t_cool)', value: `${tCoolStr} ${getActivationUnitLabel(tCoolUnit)} (${t_cool.toExponential(3)} s)` }
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
  }), [selectedTarget, mass, flux, epiToThermalRatio, cadmiumRatio, tIrrStr, tIrrUnit, tCoolStr, tCoolUnit, t_irr, t_cool, activity_MBq, activity_Bq, saturation_activity, buildup_factor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>1D. Thermal & Epithermal Neutron Activation Kinetics</h3>
            <VerificationBadge testId="VTEST-17" label="Neutron Activation" />
          </div>

          <div className="form-group">
            <label className="form-label">Target Material (Thermal σ₀ & Resonance Integral I₀)</label>
            <select className="form-control" value={targetIdx} onChange={e => setTargetIdx(Number(e.target.value))}>
              {TARGETS.map((t, i) => (
                <option key={i} value={i}>{t.name} → {t.product} (σ₀={t.sigma_barns}b, I₀={t.resonance_I0_barns}b, T½={t.halfLifeLabel})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Target Mass (g)</label>
              <input type="number" className="form-control" value={mass} onChange={e => setMass(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="form-label">Thermal Flux Φ_th (n·cm⁻²·s⁻¹)</label>
              <input type="number" className="form-control" value={flux} onChange={e => setFlux(Number(e.target.value))} />
            </div>
          </div>

          {/* Epithermal Flux Ratio & Reactor Spectrum Presets */}
          <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', color: '#38bdf8' }}>
                Epithermal-to-Thermal Flux Ratio (Φ_epi / Φ_th)
              </label>
              <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#fbbf24' }}>
                {Number.isFinite(cadmiumRatio) ? `Cadmium Ratio R_Cd = ${cadmiumRatio.toFixed(2)}` : 'Pure Thermal (R_Cd = ∞)'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'Pure Thermal (0.0)', ratio: 0.0 },
                { label: 'Thermal Column (0.02)', ratio: 0.02 },
                { label: 'TRIGA Pool Core (0.08)', ratio: 0.08 },
                { label: 'PWR / LWR In-Core (0.18)', ratio: 0.18 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setEpiToThermalRatio(preset.ratio)}
                  style={{
                    background: epiToThermalRatio === preset.ratio ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                    border: `1px solid ${epiToThermalRatio === preset.ratio ? '#38bdf8' : '#334155'}`,
                    color: epiToThermalRatio === preset.ratio ? '#38bdf8' : '#94a3b8',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              min={0}
              className="form-control"
              value={epiToThermalRatio}
              onChange={e => setEpiToThermalRatio(Math.max(0, Number(e.target.value)))}
            />
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
              <label className="form-label">Cooling Time Post-EOB (t_cool)</label>
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

        <div style={{ flex: '1 1 340px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
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
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            {(activity_Bq / 3.7e7).toExponential(2)} mCi &nbsp;|&nbsp; Saturation Fraction: <strong style={{ color: '#38bdf8' }}>{(buildup_factor * 100).toFixed(2)}%</strong>
          </div>

          {selectedTarget.gamma_uSv > 0 && (
            <div style={{ marginTop: '10px', fontSize: '1.15rem', color: 'var(--color-accent)', fontWeight: 700 }}>
              Est. Unshielded Dose Rate at 1 m: {(activity_MBq * selectedTarget.gamma_uSv).toExponential(2)} µSv/h
            </div>
          )}

          {/* Westcott Thermal vs Epithermal Breakdown Card */}
          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(15,23,42,0.65)', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.75rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.65rem' }}>SATURATION CEILING</div>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace' }}>{(saturation_activity / 1e6).toExponential(2)} MBq</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.65rem' }}>ACTIVITY AT EOB</div>
              <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>{(activity_eob_Bq / 1e6).toExponential(2)} MBq</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.65rem' }}>EPITHERMAL SHARE</div>
              <div style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                {saturation_activity > 0 ? `${((epithermalReactionRate / saturation_activity) * 100).toFixed(1)}%` : '0.0%'}
              </div>
            </div>
          </div>

          <div className="formula-box" style={{ marginTop: '16px' }}>
            <BlockMath math="A(t) = N (\sigma_0 \Phi_{\text{th}} + I_0 \Phi_{\text{epi}}) (1 - e^{-\lambda t_{\text{irr}}}) e^{-\lambda t_{\text{cool}}}" />
            <BlockMath math="R_{\text{Cd}} = 1 + \frac{\sigma_0 \Phi_{\text{th}}}{I_0 \Phi_{\text{epi}}}" />
          </div>

          <ul style={{ marginTop: '12px', color: 'var(--color-text-muted)', fontSize: '0.82rem', paddingLeft: '20px' }}>
            <li><strong>Thermal Cross-Section (σ₀):</strong> {selectedTarget.sigma_barns} barns &nbsp;|&nbsp; <strong>Resonance Integral (I₀):</strong> {selectedTarget.resonance_I0_barns} barns</li>
            <li><strong>Product Half-Life:</strong> {selectedTarget.halfLifeLabel} (λ = {selectedTarget.lambda_s.toExponential(3)} s⁻¹)</li>
          </ul>
        </div>
      </div>

      {/* Two-Phase In-Core Irradiation Buildup + Post-EOB Cooling Plot */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem' }}>
              ⚡ Two-Phase In-Core Irradiation Buildup & Post-EOB Cooling Curve — {selectedTarget.name} → {selectedTarget.product}
            </h4>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Phase I (0 → EOB): Asymptotic saturation buildup in reactor flux &nbsp;|&nbsp; Phase II (Post-EOB): Exponential decay after sample discharge.
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontFamily: 'monospace', background: 'rgba(245,158,11,0.12)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(245,158,11,0.35)' }}>
            EOB = {kineticsSeries.eobX.toFixed(2)} {kineticsSeries.plotUnitName}
          </span>
        </div>
        <Plot
          data={[
            {
              x: kineticsSeries.irrX,
              y: kineticsSeries.irrY_MBq,
              type: 'scatter',
              mode: 'lines',
              name: 'Phase I: In-Core Irradiation Buildup',
              fill: 'tozeroy',
              fillcolor: 'rgba(245, 158, 11, 0.12)',
              line: { color: '#f59e0b', width: 3 }
            },
            {
              x: kineticsSeries.coolX,
              y: kineticsSeries.coolY_MBq,
              type: 'scatter',
              mode: 'lines',
              name: 'Phase II: Post-EOB Decay Cooling',
              fill: 'tozeroy',
              fillcolor: 'rgba(56, 189, 248, 0.12)',
              line: { color: '#38bdf8', width: 3 }
            },
            {
              x: [0, kineticsSeries.coolX[kineticsSeries.coolX.length - 1] || 1],
              y: [kineticsSeries.satMBq, kineticsSeries.satMBq],
              type: 'scatter',
              mode: 'lines',
              name: 'Saturation Ceiling (A_sat)',
              line: { color: '#ef4444', width: 1.5, dash: 'dash' }
            },
            {
              x: [kineticsSeries.currentX],
              y: [activity_MBq],
              type: 'scatter',
              mode: 'markers',
              name: 'Evaluated State',
              marker: { color: '#10b981', size: 10, line: { color: '#ffffff', width: 2 } }
            }
          ]}
          layout={{
            height: 290,
            margin: { t: 15, r: 20, b: 45, l: 60 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(15,23,42,0.55)',
            font: { color: '#cbd5e1', size: 11 },
            xaxis: {
              title: { text: `Elapsed Time (${kineticsSeries.plotUnitName})` },
              gridcolor: '#1e293b',
              zerolinecolor: '#334155'
            },
            yaxis: {
              title: { text: `Induced Activity ${selectedTarget.product} (MBq)` },
              gridcolor: '#1e293b',
              zerolinecolor: '#334155'
            },
            shapes: [
              {
                type: 'line',
                x0: kineticsSeries.eobX,
                x1: kineticsSeries.eobX,
                y0: 0,
                y1: Math.max(kineticsSeries.satMBq, 1e-6),
                line: { color: '#eab308', width: 1.5, dash: 'dot' }
              }
            ],
            legend: { orientation: 'h', y: 1.14, x: 0 }
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
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
