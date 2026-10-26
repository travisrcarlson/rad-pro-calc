import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';
import { useRegulatory } from '../../../context/RegulatoryContext';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

const getAliInhal = (n: any) => n?.['ALI Inhal. (μCi)'] ?? n?.['ALI Inhal. (µCi)'];
const getAliIngest = (n: any) => n?.['ALI Ingest. (μCi)'] ?? n?.['ALI Ingest. (µCi)'];
const getDac = (n: any) => n?.['DAC (μCi/mL)'] ?? n?.['DAC (µCi/mL)'];

type LungAbsorptionType = 'F' | 'M' | 'S';

interface AbsorptionConfig {
  code: LungAbsorptionType;
  label: string;
  fastFraction: number;
  fastHalfLifeDays: number;
  slowFraction: number;
  slowHalfLifeDays: number;
  doseModifier: number; // relative modifier to baseline inhalation e(50)
  compounds: string;
}

const LUNG_ABSORPTION_TYPES: Record<LungAbsorptionType, AbsorptionConfig> = {
  F: {
    code: 'F',
    label: 'Type F — Fast Clearance (T½ ≈ 10 min → Systemic)',
    fastFraction: 0.70,
    fastHalfLifeDays: 0.5,
    slowFraction: 0.30,
    slowHalfLifeDays: 50,
    doseModifier: 0.85,
    compounds: 'Soluble halides, nitrates, alkali/alkaline-earth salts (CsCl, NaI, HTO)'
  },
  M: {
    code: 'M',
    label: 'Type M — Moderate Clearance (T½ ≈ 140 days)',
    fastFraction: 0.20,
    fastHalfLifeDays: 3.0,
    slowFraction: 0.80,
    slowHalfLifeDays: 140,
    doseModifier: 1.00,
    compounds: 'Hydroxides, carbonates, lanthanides, actinide nitrates (Am, Ra, SrCO₃)'
  },
  S: {
    code: 'S',
    label: 'Type S — Slow Clearance (T½ ≈ 7,000 days)',
    fastFraction: 0.05,
    fastHalfLifeDays: 5.0,
    slowFraction: 0.95,
    slowHalfLifeDays: 7000,
    doseModifier: 1.45,
    compounds: 'High-fired refractory oxides, insoluble silicates (PuO₂, UO₂, Co₃O₄)'
  }
};

const RESPIRATOR_APF_OPTIONS = [
  { apf: 1, label: 'APF = 1 — No Respiratory Protection (Ambient Air)' },
  { apf: 10, label: 'APF = 10 — Half-Mask Elastomeric APR / N95 (10 CFR 20 App A)' },
  { apf: 50, label: 'APF = 50 — Full-Facepiece Negative-Pressure APR (P100)' },
  { apf: 1000, label: 'APF = 1,000 — Powered Air-Purifying (PAPR) / Supplied-Air Hood' },
  { apf: 10000, label: 'APF = 10,000 — Pressure-Demand SCBA' }
];

const InternalDoseCalc: React.FC = () => {
  const { currentFramework } = useRegulatory();
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const nuclides = nuclidesData as any[];
  const validNuclides = nuclides.filter(n => {
    const inhal = parseFloat(String(getAliInhal(n) ?? '0'));
    const ingest = parseFloat(String(getAliIngest(n) ?? '0'));
    return inhal > 0 || ingest > 0;
  });

  const [selectedNuclide, setSelectedNuclide] = useState(validNuclides[0] || nuclides[0]);
  const [intake, setIntake] = useState<number>(1000);
  const [intakeUnit, setIntakeUnit] = useState<number>(1); // 1 = Bq, 1000 = kBq, etc.
  const [pathway, setPathway] = useState<'inhalation' | 'ingestion'>('inhalation');
  const [lungType, setLungType] = useState<LungAbsorptionType>('M');

  // Airborne DAC Stay-Time & Respirator APF Calculator State
  const [airborneDacMultiple, setAirborneDacMultiple] = useState<number>(2.5);
  const [exposureHours, setExposureHours] = useState<number>(4);
  const [respiratorApf, setRespiratorApf] = useState<number>(1);

  const intakeBq = intake * intakeUnit;

  // Read ALI from data depending on pathway (10 CFR 20 Appendix B basis)
  const ali_uCi_raw = pathway === 'inhalation' ? getAliInhal(selectedNuclide) : getAliIngest(selectedNuclide);
  const ali_uCi = parseFloat(String(ali_uCi_raw ?? '0')) || 0;

  // 1 uCi = 37,000 Bq
  const aliBq = ali_uCi * 37000;

  // Committed Effective Dose Coefficient e(50)
  // US 10 CFR Part 20 Appendix B defines the stochastic ALI based on 5 rem = 50 mSv = 0.05 Sv
  const lungMod = pathway === 'inhalation' ? LUNG_ABSORPTION_TYPES[lungType].doseModifier : 1.0;
  const e50_base = aliBq > 0 ? 0.05 / aliBq : 0;
  const e50 = e50_base * lungMod;

  // E(50) = I * e(50) = intakeBq * e50 (result in Sv, convert to mSv)
  const doseSv = intakeBq * e50;
  const dose_mSv = doseSv * 1000;

  const occLimit_mSv = currentFramework?.limits?.occupationalAnnualEffective_mSv || 20;

  const dac_uCi_ml = parseFloat(String(getDac(selectedNuclide) ?? '0')) || 0;
  const dac_Bq_m3 = dac_uCi_ml * 37000 * 1000000; // 1 mL = 1e-6 m3

  // Physical half-life in days (fallback to 365 days if not present)
  const halfLifeSec = parseFloat(String(selectedNuclide?.HalfLifeSeconds ?? selectedNuclide?.['Half-life (s)'] ?? '31536000')) || 31536000;
  const halfLifeDays = Math.max(halfLifeSec / 86400, 1e-4);
  const lambdaPhysDay = Math.LN2 / halfLifeDays;

  // Airborne DAC-Hour & Stay-Time Calculations (ICRP 66 Reference Worker B = 1.2 m³/h)
  const breathingRate_m3_h = 1.2;
  const effectiveDacMultiple = airborneDacMultiple / Math.max(respiratorApf, 1);
  const accruedDacHours = effectiveDacMultiple * exposureHours;
  const stayTimeTo40DacHrs = effectiveDacMultiple > 0 ? 40 / effectiveDacMultiple : Infinity;
  const stayTimeTo2000DacHrs = effectiveDacMultiple > 0 ? 2000 / effectiveDacMultiple : Infinity;
  const airborneIntakeBq = dac_Bq_m3 > 0
    ? effectiveDacMultiple * dac_Bq_m3 * breathingRate_m3_h * exposureHours
    : 0;

  // Biokinetic Whole-Body Retention Curve R(t) over 0 -> 365 days (ICRP 66/130 2-compartment + physical decay)
  const bioassaySeries = useMemo(() => {
    const days: number[] = [];
    const retF: number[] = [];
    const retM: number[] = [];
    const retS: number[] = [];
    const activeBq: number[] = [];

    const evalType = (cfg: AbsorptionConfig, t: number) => {
      const bio =
        cfg.fastFraction * Math.exp(-(Math.LN2 / cfg.fastHalfLifeDays) * t) +
        cfg.slowFraction * Math.exp(-(Math.LN2 / cfg.slowHalfLifeDays) * t);
      const phys = Math.exp(-lambdaPhysDay * t);
      return bio * phys;
    };

    for (let d = 0; d <= 365; d += 2.5) {
      days.push(d);
      const rF = evalType(LUNG_ABSORPTION_TYPES.F, d);
      const rM = evalType(LUNG_ABSORPTION_TYPES.M, d);
      const rS = evalType(LUNG_ABSORPTION_TYPES.S, d);
      retF.push(rF * 100);
      retM.push(rM * 100);
      retS.push(rS * 100);
      const activeFrac = lungType === 'F' ? rF : lungType === 'M' ? rM : rS;
      activeBq.push(intakeBq * activeFrac);
    }

    const activeCfg = LUNG_ABSORPTION_TYPES[lungType];
    const r1d = evalType(activeCfg, 1) * intakeBq;
    const r7d = evalType(activeCfg, 7) * intakeBq;
    const r30d = evalType(activeCfg, 30) * intakeBq;

    return { days, retF, retM, retS, activeBq, r1d, r7d, r30d };
  }, [lungType, lambdaPhysDay, intakeBq]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Internal Dosimetry Committed Effective Dose E(50) — ${selectedNuclide?.Nuclide || 'Isotope'}`,
    moduleName: 'Module 1C: Internal Dosimetry, DAC Stay-Time & Bioassay Retention',
    statuteCitation: `${currentFramework.name} (${currentFramework.citation}) / ICRP Publication 119 & 130`,
    verificationTestId: 'VTEST-04 (Committed Effective Dose E(50))',
    operatorName: 'Internal Dosimetrist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Bioassay & Internal Dosimetry Division',
    notes: `Assessment of 50-year committed effective dose E(50) for ${pathway} intake (${pathway === 'inhalation' ? `ICRP Lung Type ${lungType}` : 'GI Tract'}) of ${selectedNuclide?.Nuclide}.`,
    formulaDescription: 'E(50) = I \\cdot e(50), \\quad R_{\\text{eff}}(t) = R_{\\text{bio}}(t) \\cdot e^{-\\lambda_{\\text{phys}} t}',
    inputs: [
      { label: 'Radionuclide', value: `${selectedNuclide?.Nuclide} (${selectedNuclide?.Symbol || ''})` },
      { label: 'Intake Pathway', value: pathway === 'inhalation' ? `Inhalation (Lung Type ${lungType})` : 'Ingestion' },
      { label: 'Total Intake Activity (I)', value: intakeBq.toExponential(3), unit: 'Bq' },
      { label: 'Annual Limit on Intake (ALI)', value: aliBq.toExponential(3), unit: `Bq (${ali_uCi} µCi)` },
      { label: 'Dose Coefficient e(50)', value: e50.toExponential(3), unit: 'Sv/Bq' }
    ],
    outputs: [
      { label: 'Committed Effective Dose E(50)', value: dose_mSv < 0.001 ? dose_mSv.toExponential(3) : dose_mSv.toFixed(4), unit: 'mSv', status: dose_mSv > occLimit_mSv ? 'EXCEEDED' : 'PASS' },
      { label: 'Dose Equivalent (µSv)', value: (dose_mSv * 1000).toFixed(2), unit: 'µSv', status: 'PASS' },
      { label: 'Whole-Body Retention at t = 7 d', value: bioassaySeries.r7d.toExponential(3), unit: 'Bq', status: 'PASS' },
      { label: 'Occupational Limit Utilization', value: `${((dose_mSv / occLimit_mSv) * 100).toFixed(2)}%`, status: dose_mSv > occLimit_mSv ? 'EXCEEDED' : 'PASS' }
    ]
  }), [selectedNuclide, pathway, lungType, intakeBq, aliBq, ali_uCi, e50, dose_mSv, occLimit_mSv, bioassaySeries.r7d, currentFramework]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>1C. Internal Dosimetry, DAC Stay-Time & Bioassay Retention</h3>
            <VerificationBadge testId="VTEST-04" standard="ICRP 119 / 10 CFR 20" />
          </div>

          <div className="form-group">
            <label className="form-label">Nuclide (with 10 CFR 20 / ICRP ALI data)</label>
            <select
              className="form-control"
              value={selectedNuclide?.Nuclide}
              onChange={e => setSelectedNuclide(validNuclides.find(n => n.Nuclide === e.target.value) || validNuclides[0])}
            >
              {validNuclides.map((n, i) => (
                <option key={i} value={n.Nuclide}>{n.Nuclide} ({n.Symbol})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Pathway</label>
              <select className="form-control" value={pathway} onChange={e => setPathway(e.target.value as any)}>
                <option value="inhalation">Inhalation (HRTM)</option>
                <option value="ingestion">Ingestion (HAT)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ICRP 66 Lung Clearance Type</label>
              <select
                className="form-control"
                value={lungType}
                disabled={pathway !== 'inhalation'}
                onChange={e => setLungType(e.target.value as LungAbsorptionType)}
              >
                <option value="F">Type F (Fast — Soluble)</option>
                <option value="M">Type M (Moderate — Default)</option>
                <option value="S">Type S (Slow — Insoluble Oxide)</option>
              </select>
            </div>
          </div>

          {pathway === 'inhalation' && (
            <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '10px', background: 'rgba(15,23,42,0.55)', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <strong style={{ color: '#38bdf8' }}>{LUNG_ABSORPTION_TYPES[lungType].label}:</strong> {LUNG_ABSORPTION_TYPES[lungType].compounds}
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Total Intake Activity (I)</label>
              <input type="number" className="form-control" value={intake} onChange={e => setIntake(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Unit</label>
              <select className="form-control" value={intakeUnit} onChange={e => setIntakeUnit(Number(e.target.value))}>
                <option value={1}>Bq</option>
                <option value={1000}>kBq</option>
                <option value={1000000}>MBq</option>
                <option value={37000}>µCi</option>
                <option value={37000000}>mCi</option>
              </select>
            </div>
          </div>

          {/* Airborne DAC Stay-Time & Respirator APF Sub-Panel */}
          <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              😷 Airborne DAC-Hour, Respirator APF & RWP Stay-Time
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Airborne Conc. (× DAC)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  className="form-control"
                  value={airborneDacMultiple}
                  onChange={e => setAirborneDacMultiple(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Shift Exposure (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  className="form-control"
                  value={exposureHours}
                  onChange={e => setExposureHours(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Respirator Protection Factor (10 CFR 20 App. A)</label>
              <select
                className="form-control"
                value={respiratorApf}
                onChange={e => setRespiratorApf(Number(e.target.value))}
              >
                {RESPIRATOR_APF_OPTIONS.map(opt => (
                  <option key={opt.apf} value={opt.apf}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.74rem', marginTop: '8px' }}>
              <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: '5px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem' }}>NET DAC-HOURS</div>
                <div style={{ color: accruedDacHours > 40 ? '#f59e0b' : '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                  {accruedDacHours.toFixed(2)} DAC·h
                </div>
              </div>
              <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: '5px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem' }}>STAY-TIME (40 DAC·h)</div>
                <div style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                  {Number.isFinite(stayTimeTo40DacHrs) ? `${stayTimeTo40DacHrs.toFixed(1)} h` : '∞'}
                </div>
              </div>
              <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: '5px', border: '1px solid #1e293b' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem' }}>STAY-TIME (1 ALI)</div>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>
                  {Number.isFinite(stayTimeTo2000DacHrs) ? `${stayTimeTo2000DacHrs.toFixed(0)} h` : '∞'}
                </div>
              </div>
            </div>
            {airborneIntakeBq > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPathway('inhalation');
                  setIntakeUnit(1);
                  setIntake(Number(airborneIntakeBq.toFixed(2)));
                }}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  color: '#38bdf8',
                  borderRadius: '5px',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Apply Net Airborne Intake ({airborneIntakeBq.toExponential(2)} Bq @ 1.2 m³/h) to Intake (I)
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 340px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '12px' }}>Committed Effective Dose, E(50)</h3>

            <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
              {dose_mSv < 0.001 && dose_mSv > 0 ? dose_mSv.toExponential(2) : dose_mSv.toFixed(4)} mSv
            </div>
            <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
              {(dose_mSv * 1000).toFixed(2)} µSv &nbsp;|&nbsp; {(dose_mSv * 100).toFixed(3)} mrem
            </div>

            <div style={{ marginTop: '12px', color: dose_mSv > occLimit_mSv ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
              {dose_mSv > occLimit_mSv ? `⚠️ EXCEEDS ${occLimit_mSv} mSv OCCUPATIONAL LIMIT` : `✓ Within ${occLimit_mSv} mSv Occupational Limit (${currentFramework?.shortCode || 'Statutory'})`}
            </div>

            {/* Predicted Whole-Body Counter (WBC) Bioassay Checkpoints */}
            <div style={{ marginTop: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' }}>
                🧬 Predicted In-Vivo Bioassay Retention R(t) (Type {lungType})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.76rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.66rem' }}>t = 24 HOURS</div>
                  <div style={{ color: '#f8fafc', fontFamily: 'monospace', fontWeight: 700 }}>{bioassaySeries.r1d.toExponential(2)} Bq</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.66rem' }}>t = 7 DAYS</div>
                  <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{bioassaySeries.r7d.toExponential(2)} Bq</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.66rem' }}>t = 30 DAYS</div>
                  <div style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{bioassaySeries.r30d.toExponential(2)} Bq</div>
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.73rem', color: '#94a3b8' }}>
                <strong>ALI:</strong> {aliBq.toExponential(2)} Bq ({ali_uCi} µCi) &nbsp;|&nbsp;
                {dac_Bq_m3 > 0 && <><strong>DAC:</strong> {dac_Bq_m3.toExponential(2)} Bq/m³ &nbsp;|&nbsp;</>}
                <strong>e(50):</strong> {e50.toExponential(2)} Sv/Bq
              </div>
            </div>

            <div className="formula-box" style={{ marginTop: '14px' }}>
              <BlockMath math="E(50) = I \cdot e(50), \quad I_{\text{air}} = \frac{C_{\text{air}} \cdot B \cdot t}{\text{APF}}" />
              <BlockMath math="R_{\text{eff}}(t) = \left[f_1 e^{-\lambda_{b,1} t} + f_2 e^{-\lambda_{b,2} t}\right] e^{-\lambda_{\text{phys}} t}" />
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ marginTop: '14px', width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            📋 Generate Certified QA Calculation Dossier
          </button>
        </div>
      </div>

      {/* Biokinetic Whole-Body Retention Curve (0 -> 365 Days) */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem' }}>
              📈 ICRP 66/130 Biokinetic Whole-Body Retention Curve R(t) — {selectedNuclide?.Nuclide} (0 → 365 Days Post-Intake)
            </h4>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Compares Type F (Fast), Type M (Moderate), and Type S (Slow) biological clearance coupled with physical radioactive decay (T½ = {halfLifeDays < 1 ? `${(halfLifeDays * 24).toFixed(2)} h` : `${halfLifeDays.toFixed(1)} d`}).
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'monospace', background: 'rgba(56,189,248,0.1)', padding: '4px 10px', borderRadius: '999px', border: '1px solid rgba(56,189,248,0.3)' }}>
            Active Selection: Type {lungType}
          </span>
        </div>
        <Plot
          data={[
            {
              x: bioassaySeries.days,
              y: bioassaySeries.retF,
              type: 'scatter',
              mode: 'lines',
              name: 'Type F (Fast Clearance)',
              line: { color: '#38bdf8', width: lungType === 'F' ? 3 : 1.5, dash: lungType === 'F' ? 'solid' : 'dot' }
            },
            {
              x: bioassaySeries.days,
              y: bioassaySeries.retM,
              type: 'scatter',
              mode: 'lines',
              name: 'Type M (Moderate Clearance)',
              line: { color: '#10b981', width: lungType === 'M' ? 3 : 1.5, dash: lungType === 'M' ? 'solid' : 'dot' }
            },
            {
              x: bioassaySeries.days,
              y: bioassaySeries.retS,
              type: 'scatter',
              mode: 'lines',
              name: 'Type S (Slow Oxide Clearance)',
              line: { color: '#f59e0b', width: lungType === 'S' ? 3 : 1.5, dash: lungType === 'S' ? 'solid' : 'dot' }
            }
          ]}
          layout={{
            height: 290,
            margin: { t: 15, r: 20, b: 45, l: 55 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(15,23,42,0.55)',
            font: { color: '#cbd5e1', size: 11 },
            xaxis: {
              title: { text: 'Days Post-Intake (d)' },
              gridcolor: '#1e293b',
              zerolinecolor: '#334155'
            },
            yaxis: {
              title: { text: 'Retained Body Burden (% of Intake)' },
              type: 'log',
              gridcolor: '#1e293b',
              zerolinecolor: '#334155'
            },
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

export default InternalDoseCalc;
