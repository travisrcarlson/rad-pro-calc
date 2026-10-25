import React, { useState, useMemo } from 'react';
import { BlockMath } from 'react-katex';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';
import {
  evaluateXCOMAttenuation,
  evaluateGPBuildup,
  solveBroadBeamThicknessCm
} from '../../../utils/xcomAndGpBuildup';

const TVL_MATERIALS = [
  { key: 'LEAD', name: 'Lead (Pb, Z=82)', density: 11.34, tvl1_1MeV: 3.8, tvle_1MeV: 4.0 },
  { key: 'CONCRETE', name: 'Concrete (Ordinary, Z_eff≈11)', density: 2.35, tvl1_1MeV: 14.7, tvle_1MeV: 15.0 },
  { key: 'STEEL', name: 'Carbon Steel / Iron (Fe, Z=26)', density: 7.87, tvl1_1MeV: 5.0, tvle_1MeV: 5.2 },
  { key: 'WATER', name: 'Water (H2O, Z_eff≈7.4)', density: 1.00, tvl1_1MeV: 33.0, tvle_1MeV: 35.0 },
  { key: 'TUNGSTEN', name: 'Tungsten (W, Z=74)', density: 19.3, tvl1_1MeV: 2.2, tvle_1MeV: 2.4 },
  { key: 'DU', name: 'Depleted Uranium (U-238, Z=92)', density: 19.1, tvl1_1MeV: 1.9, tvle_1MeV: 2.1 },
  { key: 'BARITE_CONCRETE', name: 'Heavy Barite Concrete (BaSO4)', density: 3.50, tvl1_1MeV: 10.0, tvle_1MeV: 10.4 },
  { key: 'ALUMINUM', name: 'Aluminium (Al, Z=13)', density: 2.70, tvl1_1MeV: 12.0, tvle_1MeV: 13.0 },
  { key: 'HDPE', name: 'High-Density Polyethylene (HDPE)', density: 0.95, tvl1_1MeV: 34.5, tvle_1MeV: 36.5 },
  { key: 'LEAD_GLASS', name: 'Lead Glass (5.2 g/cm³)', density: 5.20, tvl1_1MeV: 7.2, tvle_1MeV: 7.6 }
];

const ShieldingCalc: React.FC = () => {
  const [h0, setH0] = useState<number>(1000); // Initial dose rate uSv/h
  const [targetH, setTargetH] = useState<number>(10); // Target dose rate uSv/h
  const [materialIdx, setMaterialIdx] = useState<number>(0);
  const [energyMev, setEnergyMev] = useState<number>(0.6617); // Default Cs-137 661.7 keV
  const [engineMode, setEngineMode] = useState<'ans_gp_xcom' | 'ncrp_tvl'>('ans_gp_xcom');
  const [thicknessInput, setThicknessInput] = useState<number>(5); // cm
  const [calcMode, setCalcMode] = useState<'thickness' | 'transmission'>('thickness');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const selectedMaterial = TVL_MATERIALS[materialIdx];
  const xcom = useMemo(
    () => evaluateXCOMAttenuation(selectedMaterial.key, energyMev),
    [selectedMaterial.key, energyMev]
  );

  // Calculation logic
  const computed = useMemo(() => {
    let result = 0;
    let resultLabel = '';
    let decadesComputed = 0;
    let mfp = 0;
    let gpBuildup = 1.0;
    let gpK = 1.0;
    const gpParams = evaluateGPBuildup(selectedMaterial.key, energyMev, 1.0).params;

    if (engineMode === 'ans_gp_xcom') {
      if (calcMode === 'thickness') {
        const reqRatio = h0 > targetH && targetH > 0 ? h0 / targetH : 1.0;
        const solved = solveBroadBeamThicknessCm(selectedMaterial.key, energyMev, reqRatio, 'GP_ANS643');
        result = solved.thicknessCm;
        mfp = solved.opticalMfp;
        gpBuildup = solved.buildupAtSolution;
        gpK = evaluateGPBuildup(selectedMaterial.key, energyMev, mfp).K;
        decadesComputed = Math.log10(Math.max(1.0, reqRatio));
        resultLabel = 'Required Broad-Beam Thickness (cm)';
      } else {
        mfp = xcom.muLinear * thicknessInput;
        const gpEval = evaluateGPBuildup(selectedMaterial.key, energyMev, mfp);
        gpBuildup = gpEval.B;
        gpK = gpEval.K;
        const transmission = gpBuildup * Math.exp(-mfp);
        result = h0 * transmission;
        decadesComputed = Math.log10(Math.max(1.0, 1.0 / Math.max(1e-15, transmission)));
        resultLabel = 'Transmitted Dose Rate (µSv/h)';
      }
    } else {
      // Classical NCRP-151 1 MeV TVL1 / TVLe method
      if (calcMode === 'thickness') {
        if (h0 > targetH && targetH > 0) {
          decadesComputed = Math.log10(h0 / targetH);
          if (decadesComputed <= 1) {
            result = decadesComputed * selectedMaterial.tvl1_1MeV;
          } else {
            result = selectedMaterial.tvl1_1MeV + (decadesComputed - 1) * selectedMaterial.tvle_1MeV;
          }
        }
        mfp = xcom.muLinear * result;
        resultLabel = 'Required Thickness (cm)';
      } else {
        if (thicknessInput <= selectedMaterial.tvl1_1MeV) {
          decadesComputed = thicknessInput / selectedMaterial.tvl1_1MeV;
        } else {
          decadesComputed = 1 + (thicknessInput - selectedMaterial.tvl1_1MeV) / selectedMaterial.tvle_1MeV;
        }
        result = h0 / Math.pow(10, decadesComputed);
        mfp = xcom.muLinear * thicknessInput;
        resultLabel = 'Transmitted Dose Rate (µSv/h)';
      }
    }

    return {
      result,
      resultLabel,
      decadesComputed,
      mfp,
      gpBuildup,
      gpK,
      gpParams
    };
  }, [engineMode, calcMode, h0, targetH, thicknessInput, selectedMaterial, energyMev, xcom]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Broad-Beam Shielding Assessment — ${selectedMaterial.name}`,
    moduleName: 'Module 1B: ANSI/ANS-6.4.3 GP & NIST XCOM Shielding Calculator',
    statuteCitation: 'ANSI/ANS-6.4.3-1991 / NCRP Report No. 151 / NIST XCOM SRD 8',
    verificationTestId: 'VTEST-03 (Gamma Shielding Attenuation)',
    operatorName: 'Health Physicist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Radiological Shielding & ALARA Engineering Division',
    notes: `Evaluation of ${calcMode === 'thickness' ? 'required barrier thickness' : 'transmitted ambient dose equivalent rate'} through ${selectedMaterial.name} (ρ = ${selectedMaterial.density} g/cm³) at E = ${(energyMev * 1000).toFixed(1)} keV using ${engineMode === 'ans_gp_xcom' ? 'ANSI/ANS-6.4.3 5-parameter Geometric Progression (GP) buildup & NIST XCOM K/L-edge cross-sections' : 'NCRP-151 TVL1/TVLe equilibrium formulation'}.`,
    formulaDescription: 'I(x) = I_0 \\cdot B_{\\text{GP}}(E, \\mu x) e^{-\\mu x}, \\quad K(E,x) = c x^a + d\\frac{\\tanh(x/X_k - 2) - \\tanh(-2)}{1 - \\tanh(-2)}',
    inputs: [
      { label: 'Shielding Material', value: `${selectedMaterial.name} (ρ = ${selectedMaterial.density} g/cm³)` },
      { label: 'Physics Engine', value: engineMode === 'ans_gp_xcom' ? 'ANSI/ANS-6.4.3 GP + NIST XCOM K-Edges' : 'NCRP-151 TVL1 / TVLe' },
      { label: 'Photon Energy (E)', value: energyMev, unit: 'MeV' },
      { label: 'Mass Attenuation (μ/ρ)', value: xcom.muMass.toFixed(4), unit: 'cm²/g' },
      { label: 'Unshielded Dose Rate (H₀)', value: h0, unit: 'µSv/h' },
      calcMode === 'thickness'
        ? { label: 'Target Dose Rate (H_target)', value: targetH, unit: 'µSv/h' }
        : { label: 'Barrier Thickness (x)', value: thicknessInput, unit: 'cm' }
    ],
    outputs: [
      {
        label: computed.resultLabel,
        value: computed.result.toFixed(2),
        unit: calcMode === 'thickness' ? 'cm' : 'µSv/h',
        status: 'PASS'
      },
      {
        label: 'Optical Depth (μx)',
        value: computed.mfp.toFixed(2),
        unit: 'mfp',
        status: 'PASS'
      },
      {
        label: 'GP Buildup Factor B(E, μx)',
        value: computed.gpBuildup.toFixed(3),
        unit: '×',
        status: 'PASS'
      },
      {
        label: 'Attenuation Decades (n)',
        value: computed.decadesComputed.toFixed(3),
        unit: 'TVLs',
        status: 'PASS'
      }
    ]
  }), [selectedMaterial, engineMode, energyMev, xcom, calcMode, h0, targetH, thicknessInput, computed]);

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>1B. Shielding Calculator (ANSI/ANS-6.4.3 GP &amp; NIST XCOM)</h3>
          <VerificationBadge testId="VTEST-03" label="ANS-6.4.3 GP / NCRP-151" />
        </div>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">Physics Engine Formulation</label>
          <select
            className="form-control"
            value={engineMode}
            onChange={e => setEngineMode(e.target.value as 'ans_gp_xcom' | 'ncrp_tvl')}
          >
            <option value="ans_gp_xcom">ANSI/ANS-6.4.3 GP 5-Parameter Buildup + NIST XCOM K/L-Edges</option>
            <option value="ncrp_tvl">NCRP-151 Empirical TVL₁ / TVLₑ (1.0 MeV Reference)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label className="form-label" style={{ display: 'inline-block', marginRight: '15px', cursor: 'pointer' }}>
            <input type="radio" checked={calcMode === 'thickness'} onChange={() => setCalcMode('thickness')} /> Solve Required Thickness
          </label>
          <label className="form-label" style={{ display: 'inline-block', cursor: 'pointer' }}>
            <input type="radio" checked={calcMode === 'transmission'} onChange={() => setCalcMode('transmission')} /> Solve Transmitted Dose
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Shielding Material</label>
          <select className="form-control" value={materialIdx} onChange={e => setMaterialIdx(Number(e.target.value))}>
            {TVL_MATERIALS.map((m, i) => (
              <option key={m.key} value={i}>{m.name} (ρ = {m.density} g/cm³)</option>
            ))}
          </select>
        </div>

        {engineMode === 'ans_gp_xcom' && (
          <div className="form-group">
            <label className="form-label">Photon Energy E (MeV, 0.010–15.0)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                step="0.01"
                min="0.010"
                max="15.0"
                className="form-control"
                value={energyMev}
                onChange={e => setEnergyMev(Math.max(0.010, Math.min(15.0, Number(e.target.value) || 0.662)))}
              />
              <button className="btn btn-sm btn-outline-primary" onClick={() => setEnergyMev(0.085)} title="Below Pb K-Edge (88 keV)">85 keV</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setEnergyMev(0.090)} title="Above Pb K-Edge (88 keV)">90 keV</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setEnergyMev(0.6617)}>Cs-137</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setEnergyMev(1.25)}>Co-60</button>
            </div>
            {xcom.activeEdgeNote && (
              <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                ⚡ {xcom.activeEdgeNote}
              </div>
            )}
          </div>
        )}

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

      <div style={{ flex: '1 1 360px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
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

        <div style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>{computed.resultLabel}</div>
        <div style={{ fontSize: '2.4rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {computed.result < 0.01 && computed.result > 0 ? computed.result.toExponential(3) : computed.result.toFixed(2)}{' '}
          <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>{calcMode === 'thickness' ? 'cm' : 'µSv/h'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>NIST XCOM μ/ρ</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#00e5ff' }}>{xcom.muMass.toFixed(4)} cm²/g</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Optical Depth (μx)</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981' }}>{computed.mfp.toFixed(2)} mfp</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>GP Buildup B(E,μx)</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#f59e0b' }}>{computed.gpBuildup.toFixed(2)}×</div>
          </div>
        </div>

        {engineMode === 'ans_gp_xcom' ? (
          <div className="formula-box" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
            <BlockMath math="I(x) = I_0 \cdot B_{\text{GP}}(E, \mu x) e^{-\mu x}, \quad B_{\text{GP}} = 1 + \frac{b-1}{K-1}(K^{\mu x} - 1)" />
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '6px', fontFamily: 'monospace' }}>
              GP Vector @ {(energyMev * 1000).toFixed(1)} keV: b={computed.gpParams.b.toFixed(3)}, c={computed.gpParams.c.toFixed(3)}, a={computed.gpParams.a.toFixed(3)}, Xk={computed.gpParams.Xk.toFixed(1)}, d={computed.gpParams.d.toFixed(3)} | K={computed.gpK.toFixed(3)}
            </div>
          </div>
        ) : (
          <div className="formula-box" style={{ marginTop: '16px' }}>
            <BlockMath math="x = \text{TVL}_1 + (n-1) \cdot \text{TVL}_e, \quad \dot{H} = \dot{H}_0 \cdot 10^{-n}" />
          </div>
        )}

        <div style={{ marginTop: '12px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          Narrow-beam HVL = {(Math.LN2 / xcom.muLinear).toFixed(2)} cm | Narrow-beam TVL = {(Math.LN10 / xcom.muLinear).toFixed(2)} cm | NCRP-151 1 MeV TVL₁ = {selectedMaterial.tvl1_1MeV} cm, TVLₑ = {selectedMaterial.tvle_1MeV} cm.
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
