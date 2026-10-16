import React, { useState, useMemo } from 'react';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';
import { useRegulatory } from '../../../context/RegulatoryContext';
import VerificationBadge from '../../../components/VerificationBadge';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

const getAliInhal = (n: any) => n?.['ALI Inhal. (μCi)'] ?? n?.['ALI Inhal. (µCi)'];
const getAliIngest = (n: any) => n?.['ALI Ingest. (μCi)'] ?? n?.['ALI Ingest. (µCi)'];
const getDac = (n: any) => n?.['DAC (μCi/mL)'] ?? n?.['DAC (µCi/mL)'];

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

  const intakeBq = intake * intakeUnit;

  // Read ALI from data depending on pathway (10 CFR 20 Appendix B basis)
  const ali_uCi_raw = pathway === 'inhalation' ? getAliInhal(selectedNuclide) : getAliIngest(selectedNuclide);
  const ali_uCi = parseFloat(String(ali_uCi_raw ?? '0')) || 0;
  
  // 1 uCi = 37,000 Bq
  const aliBq = ali_uCi * 37000;

  // Committed Effective Dose Coefficient e(50)
  // US 10 CFR Part 20 Appendix B defines the stochastic ALI based on 5 rem = 50 mSv = 0.05 Sv
  // Therefore, e(50) [Sv/Bq] = 0.05 / aliBq
  const e50 = aliBq > 0 ? 0.05 / aliBq : 0;
  
  // E(50) = I * e(50) = intakeBq * e50 (result in Sv, convert to mSv)
  const doseSv = intakeBq * e50;
  const dose_mSv = doseSv * 1000;

  const occLimit_mSv = currentFramework?.limits?.occupationalAnnualEffective_mSv || 20;

  const dac_uCi_ml = parseFloat(String(getDac(selectedNuclide) ?? '0')) || 0;
  const dac_Bq_m3 = dac_uCi_ml * 37000 * 1000000; // 1 mL = 1e-6 m3

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Internal Dosimetry Committed Effective Dose E(50) — ${selectedNuclide?.Nuclide || 'Isotope'}`,
    moduleName: 'Module 1C: Internal Dosimetry & ALI Engine',
    statuteCitation: `${currentFramework.name} (${currentFramework.citation}) / ICRP Publication 119`,
    verificationTestId: 'VTEST-04 (Committed Effective Dose E(50))',
    operatorName: 'Internal Dosimetrist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Bioassay & Internal Dosimetry Division',
    notes: `Assessment of 50-year committed effective dose E(50) for ${pathway} intake of ${selectedNuclide?.Nuclide}.`,
    formulaDescription: 'E(50) = I \\cdot e(50), \\quad e(50) = \\frac{0.05\\text{ Sv}}{\\text{ALI}_{\\text{10 CFR 20}}}',
    inputs: [
      { label: 'Radionuclide', value: `${selectedNuclide?.Nuclide} (${selectedNuclide?.Symbol || ''})` },
      { label: 'Intake Pathway', value: pathway === 'inhalation' ? 'Inhalation' : 'Ingestion' },
      { label: 'Total Intake Activity (I)', value: intakeBq.toExponential(3), unit: 'Bq' },
      { label: 'Annual Limit on Intake (ALI)', value: aliBq.toExponential(3), unit: `Bq (${ali_uCi} µCi)` },
      { label: 'Dose Coefficient e(50)', value: e50.toExponential(3), unit: 'Sv/Bq' }
    ],
    outputs: [
      { label: 'Committed Effective Dose E(50)', value: dose_mSv < 0.001 ? dose_mSv.toExponential(3) : dose_mSv.toFixed(4), unit: 'mSv', status: dose_mSv > occLimit_mSv ? 'EXCEEDED' : 'PASS' },
      { label: 'Dose Equivalent (µSv)', value: (dose_mSv * 1000).toFixed(2), unit: 'µSv', status: 'PASS' },
      { label: 'Occupational Limit Utilization', value: `${((dose_mSv / occLimit_mSv) * 100).toFixed(2)}%`, status: dose_mSv > occLimit_mSv ? 'EXCEEDED' : 'PASS' }
    ]
  }), [selectedNuclide, pathway, intakeBq, aliBq, ali_uCi, e50, dose_mSv, occLimit_mSv, currentFramework]);

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>2C. Internal Dose Calculator</h3>
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

        <div className="form-group">
          <label className="form-label">Pathway</label>
          <select className="form-control" value={pathway} onChange={e => setPathway(e.target.value as any)}>
            <option value="inhalation">Inhalation</option>
            <option value="ingestion">Ingestion</option>
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label className="form-label">Intake (I)</label>
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

        <div style={{ marginTop: '20px' }}>
           <label className="form-label">Regulatory Limits (ICRP/NRC)</label>
           <ul style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', paddingLeft: '20px' }}>
             <li><strong>ALI:</strong> {aliBq.toExponential(2)} Bq ({ali_uCi} µCi)</li>
             {pathway === 'inhalation' && dac_Bq_m3 > 0 && (
               <li><strong>DAC:</strong> {dac_Bq_m3.toExponential(2)} Bq/m³</li>
             )}
             <li><strong>Calculated e(50):</strong> {e50.toExponential(2)} Sv/Bq</li>
           </ul>
        </div>
      </div>

      <div style={{ flex: '1 1 320px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ marginBottom: '15px' }}>Committed Effective Dose, E(50)</h3>
          
          <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
            {dose_mSv < 0.001 && dose_mSv > 0 ? dose_mSv.toExponential(2) : dose_mSv.toFixed(4)} mSv
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
            {(dose_mSv * 1000).toFixed(2)} µSv
          </div>

          <div style={{ marginTop: '15px', color: dose_mSv > occLimit_mSv ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
            {dose_mSv > occLimit_mSv ? `⚠️ EXCEEDS ${occLimit_mSv} mSv OCCUPATIONAL LIMIT` : `✓ Within ${occLimit_mSv} mSv Occupational Limit (${currentFramework?.shortCode || 'Statutory'})`}
          </div>

          <div className="formula-box" style={{ marginTop: '24px' }}>
            <BlockMath math="E(50) = I \cdot e(50)" />
            <BlockMath math="e(50) = \frac{0.05 \text{ Sv}}{\text{ALI}_{\text{10 CFR 20}}} \quad \left[\text{ICRP ALI} = \frac{0.02 \text{ Sv}}{e(50)}\right]" />
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setIsDossierOpen(true)}
          style={{ marginTop: '16px', width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
        >
          📋 Generate Certified QA Calculation Dossier
        </button>
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
