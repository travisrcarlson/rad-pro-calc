import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type MedTab = 'protocol' | 'kinetics' | 'bioassay' | 'timing' | 'orders';

interface CountermeasureDrug {
  id: string;
  name: string;
  targetRadionuclides: string[];
  route: string;
  adultDose: string;
  pediatricDose: string;
  mechanism: string;
  sideEffects: string;
  monitoring: string;
  retentionHalflifeBaselineDays: number;
  retentionHalflifeTreatedDays: number;
  efficacyWindowHours: number;
}

const DRUG_DATABASE: Record<string, CountermeasureDrug> = {
  prussian_blue: {
    id: 'prussian_blue',
    name: 'Prussian Blue (Insoluble Ferric Hexacyanoferrate)',
    targetRadionuclides: ['Cs-137', 'Cs-134', 'Tl-201'],
    route: 'Oral (Capsules 500 mg)',
    adultDose: '3.0 g/day orally (1.0 g TID with food)',
    pediatricDose: '2–12 yrs: 1.0 g/day (or 1.0–1.5 g/day divided)',
    mechanism: 'Ion-exchange trapping in GI tract; blocks enterohepatic recirculation and increases fecal clearance of Cs and Tl.',
    sideEffects: 'Constipation (treat with fiber/stool softeners), hypokalemia, blue-stained stools.',
    monitoring: 'Serial 24h stool and urine gamma spectrometry; serum electrolytes (potassium).',
    retentionHalflifeBaselineDays: 110,
    retentionHalflifeTreatedDays: 30,
    efficacyWindowHours: 72
  },
  ca_dtpa: {
    id: 'ca_dtpa',
    name: 'Calcium-DTPA (Pentetate Calcium Trisodium)',
    targetRadionuclides: ['Pu-239', 'Am-241', 'Cm-244', 'Cf-252'],
    route: 'Intravenous (Slow push over 3–5 min or 100mL D5W infusion) or Inhalation',
    adultDose: '1.0 g IV single daily dose (1 ampule in 5 mL)',
    pediatricDose: '<12 yrs: 14 mg/kg IV daily (max 1.0 g)',
    mechanism: 'Form chelates with free multivalent actinide cations; complex is rapidly excreted via renal glomerular filtration.',
    sideEffects: 'Endogenous trace metal depletion (Zn, Mn, Mg), nausea, injection site thrombophlebitis.',
    monitoring: 'Daily 24-hr urine actinide alpha spectrometry; serum zinc and magnesium.',
    retentionHalflifeBaselineDays: 7300, // Decades in bone/liver
    retentionHalflifeTreatedDays: 180,  // Enhanced early excretion fraction
    efficacyWindowHours: 24
  },
  zn_dtpa: {
    id: 'zn_dtpa',
    name: 'Zinc-DTPA (Pentetate Zinc Trisodium)',
    targetRadionuclides: ['Pu-239', 'Am-241', 'Cm-244'],
    route: 'Intravenous or Inhalation (Maintenance therapy)',
    adultDose: '1.0 g IV once daily for prolonged maintenance therapy',
    pediatricDose: '<12 yrs: 14 mg/kg IV daily (max 1.0 g)',
    mechanism: 'Less toxic than Ca-DTPA for long-term administration; maintains actinide chelation without acute zinc depletion.',
    sideEffects: 'Mild headache, nausea, mild transient metallic taste.',
    monitoring: 'Weekly 24h urine bioassay; renal function (BUN/creatinine).',
    retentionHalflifeBaselineDays: 7300,
    retentionHalflifeTreatedDays: 240,
    efficacyWindowHours: 168
  },
  potassium_iodide: {
    id: 'potassium_iodide',
    name: 'Potassium Iodide (KI)',
    targetRadionuclides: ['I-131', 'I-133', 'I-135'],
    route: 'Oral (Tablets 65mg or 130mg, or oral solution)',
    adultDose: '130 mg orally once daily (or 2x 65mg tablets)',
    pediatricDose: '3–18 yrs: 65 mg; 1 mo–3 yrs: 32 mg; birth–1 mo: 16 mg',
    mechanism: 'Floods sodium-iodide symporter (NIS); prevents thyroid uptake of radioactive iodine isotopes.',
    sideEffects: 'Salivary gland swelling, metallic taste, rare iodine hypersensitivity, transient hypothyroidism in neonates.',
    monitoring: 'Thyroid function tests in neonates; monitor community ingestion compliance.',
    retentionHalflifeBaselineDays: 80,
    retentionHalflifeTreatedDays: 0.5, // Blocks >98% if given early
    efficacyWindowHours: 4
  },
  sodium_bicarb: {
    id: 'sodium_bicarb',
    name: 'Sodium Bicarbonate (Urinary Alkalinization)',
    targetRadionuclides: ['U-238', 'U-235', 'Natural U'],
    route: 'Intravenous Infusion (1–2 ampules in 5% Dextrose)',
    adultDose: 'Titrate to maintain urine pH >= 7.5 (typically 50–100 mEq IV infusion)',
    pediatricDose: '1–2 mEq/kg IV titrated to urine pH >= 7.5',
    mechanism: 'Converts toxic uranyl ions (UO2²⁺) into non-reactive soluble uranyl tricarbonate complexes; prevents tubular necrosis.',
    sideEffects: 'Metabolic alkalosis, hypokalemia, volume overload.',
    monitoring: 'Hourly urine pH dipstick; arterial blood gases (ABG); serum creatinine.',
    retentionHalflifeBaselineDays: 15,
    retentionHalflifeTreatedDays: 3,
    efficacyWindowHours: 12
  }
};

interface IsotopePreset {
  id: string;
  name: string;
  recommendedDrugId: string;
  ingestionDoseCoeffSvBq: number; // e(50) Sv/Bq
  inhalationDoseCoeffSvBq: number;
  typicalIntakekBq: number;
}

const ISOTOPE_PRESETS: IsotopePreset[] = [
  { id: 'cs137', name: 'Cs-137 (Cesium Chloride / RDD Dispersal)', recommendedDrugId: 'prussian_blue', ingestionDoseCoeffSvBq: 1.3e-8, inhalationDoseCoeffSvBq: 3.9e-8, typicalIntakekBq: 2500 },
  { id: 'i131', name: 'I-131 (Reactor Release / Volatile Fission)', recommendedDrugId: 'potassium_iodide', ingestionDoseCoeffSvBq: 2.2e-8, inhalationDoseCoeffSvBq: 2.0e-8, typicalIntakekBq: 1000 },
  { id: 'pu239', name: 'Pu-239 (Alpha Inhalation / Actinide Dust)', recommendedDrugId: 'ca_dtpa', ingestionDoseCoeffSvBq: 2.5e-7, inhalationDoseCoeffSvBq: 8.3e-6, typicalIntakekBq: 50 },
  { id: 'am241', name: 'Am-241 (Alpha / Gamma Transuranic)', recommendedDrugId: 'ca_dtpa', ingestionDoseCoeffSvBq: 2.0e-7, inhalationDoseCoeffSvBq: 4.2e-6, typicalIntakekBq: 80 },
  { id: 'u238', name: 'U-238 (Depleted Uranium / Heavy Metal)', recommendedDrugId: 'sodium_bicarb', ingestionDoseCoeffSvBq: 4.5e-8, inhalationDoseCoeffSvBq: 2.9e-6, typicalIntakekBq: 500 }
];

export const MedicalCountermeasuresModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MedTab>('protocol');
  const [selectedIsotopeId, setSelectedIsotopeId] = useState<string>('cs137');
  const [intakeActivitykBq, setIntakeActivitykBq] = useState<number>(2500);
  const [routeOfIntake, setRouteOfIntake] = useState<'inhalation' | 'ingestion'>('inhalation');
  const [timeToTreatmentHours, setTimeToTreatmentHours] = useState<number>(4.0);
  const [patientWeightKg, setPatientWeightKg] = useState<number>(70);
  const [patientAgeGroup, setPatientAgeGroup] = useState<'adult' | 'pediatric'>('adult');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const activeIsotope = useMemo(() => {
    return ISOTOPE_PRESETS.find((x) => x.id === selectedIsotopeId) || ISOTOPE_PRESETS[0];
  }, [selectedIsotopeId]);

  const activeDrug = useMemo(() => {
    return DRUG_DATABASE[activeIsotope.recommendedDrugId] || DRUG_DATABASE['prussian_blue'];
  }, [activeIsotope]);

  // When isotope changes, set typical intake
  const handleSelectIsotope = (isoId: string) => {
    setSelectedIsotopeId(isoId);
    const iso = ISOTOPE_PRESETS.find((x) => x.id === isoId);
    if (iso) {
      setIntakeActivitykBq(iso.typicalIntakekBq);
    }
  };

  // --- Pharmacokinetics & Dose Averted Calculations ---
  const kinetics = useMemo(() => {
    const intakeBq = intakeActivitykBq * 1000;
    const doseCoeff = routeOfIntake === 'inhalation' ? activeIsotope.inhalationDoseCoeffSvBq : activeIsotope.ingestionDoseCoeffSvBq;

    // Committed Effective Dose without treatment (Sv):
    const baselineCedSv = intakeBq * doseCoeff;
    const baselineCedRem = baselineCedSv * 100;

    // Treatment efficacy factor based on delay:
    // Efficacy drops exponentially if delayed past optimal window
    let delayFactor = 1.0;
    if (activeDrug.id === 'potassium_iodide') {
      // KI curve: 98% at <=0h, 90% at 2h, 50% at 4h, 10% at 24h
      if (timeToTreatmentHours <= 0) delayFactor = 0.99;
      else if (timeToTreatmentHours <= 2) delayFactor = 0.90;
      else if (timeToTreatmentHours <= 4) delayFactor = 0.55;
      else if (timeToTreatmentHours <= 12) delayFactor = 0.25;
      else delayFactor = 0.05;
    } else {
      // DTPA / Prussian Blue:
      delayFactor = Math.exp(-timeToTreatmentHours / (activeDrug.efficacyWindowHours * 1.5));
      delayFactor = Math.max(0.15, Math.min(1.0, delayFactor));
    }

    // Treated biological half-life
    const tBioBaseline = activeDrug.retentionHalflifeBaselineDays;
    const tBioTreated = activeDrug.retentionHalflifeTreatedDays;
    const effectiveTreatedHalfLife = tBioBaseline - (tBioBaseline - tBioTreated) * delayFactor;

    // Dose reduction percentage
    const doseReductionPct = (1.0 - effectiveTreatedHalfLife / tBioBaseline) * 100 * delayFactor;
    const treatedCedSv = Math.max(0, baselineCedSv * (1.0 - doseReductionPct / 100));
    const treatedCedRem = treatedCedSv * 100;
    const doseAvertedRem = baselineCedRem - treatedCedRem;

    // Retention curve generation (180 days)
    const curveDays = 180;
    const steps = 90;
    const timeline: { day: number; baselineBq: number; treatedBq: number }[] = [];

    const lambdaBase = Math.LN2 / tBioBaseline;
    const lambdaTreated = Math.LN2 / effectiveTreatedHalfLife;

    for (let i = 0; i <= steps; i++) {
      const d = (i / steps) * curveDays;
      const rBase = intakeBq * Math.exp(-lambdaBase * d);
      const rTreat = intakeBq * Math.exp(-lambdaTreated * d);
      timeline.push({ day: d, baselineBq: rBase / 1000, treatedBq: rTreat / 1000 });
    }

    return {
      baselineCedSv,
      baselineCedRem,
      treatedCedSv,
      treatedCedRem,
      doseAvertedRem,
      doseReductionPct,
      delayFactor,
      effectiveTreatedHalfLife,
      timeline
    };
  }, [intakeActivitykBq, routeOfIntake, activeIsotope, activeDrug, timeToTreatmentHours]);

  // --- Bioassay & Excretion Prediction ---
  const bioassay = useMemo(() => {
    // 24h excretion prediction at day 1 post-treatment
    const intakeBq = intakeActivitykBq * 1000;
    const baselineDailyExcretionFraction = Math.LN2 / activeDrug.retentionHalflifeBaselineDays;
    const treatedDailyExcretionFraction = Math.LN2 / kinetics.effectiveTreatedHalfLife;

    const baselineExcretionDay1Bq = intakeBq * baselineDailyExcretionFraction;
    const treatedExcretionDay1Bq = intakeBq * treatedDailyExcretionFraction;
    const excretionMultiplier = treatedExcretionDay1Bq / Math.max(1, baselineExcretionDay1Bq);

    return {
      baselineExcretionDay1Bq,
      treatedExcretionDay1Bq,
      excretionMultiplier
    };
  }, [intakeActivitykBq, activeDrug, kinetics]);

  // --- Cryptographic Dossier Payload ---
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: 'Medical Countermeasure & Actinide Chelation Prescription Record',
      moduleName: 'Module 27 (Medical Countermeasures & Chelation Biokinetics)',
      statuteCitation: 'NCRP Report No. 166 / ICRP Publication 78 / FDA Medical Guidance',
      verificationTestId: 'VTEST-30',
      operatorName: 'Clinical Health Physicist / Radiologist',
      operatorCredentials: 'MD, CHP, Medical Triage Officer',
      facility: 'Emergency Department / Radiation Emergency Assistance Center',
      notes: `Countermeasure simulation for ${activeIsotope.name} (${intakeActivitykBq} kBq ${routeOfIntake}). Drug administered: ${activeDrug.name} at T+${timeToTreatmentHours}h. Dose averted: ${kinetics.doseAvertedRem.toFixed(2)} Rem (${kinetics.doseReductionPct.toFixed(1)}%).`,
      formulaDescription: 'R(t) = R_0 e^{-\\lambda_{\\text{eff}} t}, \\quad \\Delta H_E = H_{E,\\text{baseline}} - H_{E,\\text{treated}}, \\quad \\lambda_{\\text{eff}} = \\frac{\\ln 2}{T_{b,\\text{treated}}}',
      inputs: [
        { label: 'Radionuclide Threat', value: activeIsotope.name },
        { label: 'Estimated Intake', value: intakeActivitykBq, unit: 'kBq' },
        { label: 'Intake Route', value: routeOfIntake === 'inhalation' ? 'Inhalation (Aerosol)' : 'Ingestion (Soluble)' },
        { label: 'Prescribed Drug', value: activeDrug.name },
        { label: 'Time to Administration', value: timeToTreatmentHours, unit: 'hours' },
        { label: 'Patient Demographics', value: `${patientAgeGroup === 'adult' ? 'Adult' : 'Pediatric'} (${patientWeightKg} kg)` }
      ],
      outputs: [
        { label: 'Baseline Unchelated CED', value: kinetics.baselineCedRem.toFixed(2), unit: 'Rem', status: kinetics.baselineCedRem > 50 ? 'WARNING' : 'PASS' },
        { label: 'Treated Committed Dose', value: kinetics.treatedCedRem.toFixed(2), unit: 'Rem', status: 'PASS' },
        { label: 'Dose Averted by Therapy', value: kinetics.doseAvertedRem.toFixed(2), unit: 'Rem', status: 'PASS' },
        { label: 'Dose Burden Reduction', value: `${kinetics.doseReductionPct.toFixed(1)}%`, status: 'PASS' },
        { label: 'Effective Biological Half-life', value: kinetics.effectiveTreatedHalfLife.toFixed(1), unit: 'days' },
        { label: 'Day-1 Excretion Enhancement', value: `${bioassay.excretionMultiplier.toFixed(1)}× Baseline`, status: 'PASS' },
        { label: 'Clinical Prescription', value: patientAgeGroup === 'adult' ? activeDrug.adultDose : activeDrug.pediatricDose }
      ]
    };
  }, [activeIsotope, intakeActivitykBq, routeOfIntake, activeDrug, timeToTreatmentHours, patientAgeGroup, patientWeightKg, kinetics, bioassay]);

  return (
    <div className="medical-countermeasures-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💊 Module 27: Medical Countermeasures &amp; Actinide Chelation Biokinetics</span>
              <VerificationBadge testId="VTEST-30" standard="NCRP-166 / ICRP-78" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Decorporation pharmacology for radioactive cesium, transuranic actinides, and radioiodine. Ca-DTPA, Prussian Blue, Potassium Iodide (KI), and urinary alkalinization biokinetics.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📜 Export Patient Treatment Record</span>
          </button>
        </div>
      </div>

      {/* Triage & Patient Parameters */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Contaminating Isotope:</label>
            <select
              className="form-control"
              value={selectedIsotopeId}
              onChange={(e) => handleSelectIsotope(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {ISOTOPE_PRESETS.map((iso) => (
                <option key={iso.id} value={iso.id}>{iso.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Estimated Intake Activity (kBq):</label>
            <input
              type="number"
              min="1"
              max="5000000"
              step="50"
              className="form-control"
              value={intakeActivitykBq}
              onChange={(e) => setIntakeActivitykBq(Math.max(1, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Intake Pathway:</label>
            <select
              className="form-control"
              value={routeOfIntake}
              onChange={(e) => setRouteOfIntake(e.target.value as 'inhalation' | 'ingestion')}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="inhalation">Inhalation (Plume / Aerosol / Dust)</option>
              <option value="ingestion">Ingestion (Food / Water / G.I.)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Time to Administration (Hours):</label>
            <input
              type="number"
              min="0.1"
              max="168"
              step="0.5"
              className="form-control"
              value={timeToTreatmentHours}
              onChange={(e) => setTimeToTreatmentHours(Math.max(0.1, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Optimal window: &le; {activeDrug.efficacyWindowHours} hours
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Patient Cohort:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-control"
                value={patientAgeGroup}
                onChange={(e) => setPatientAgeGroup(e.target.value as 'adult' | 'pediatric')}
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                <option value="adult">Adult</option>
                <option value="pediatric">Pediatric</option>
              </select>
              <input
                type="number"
                min="5"
                max="180"
                value={patientWeightKg}
                onChange={(e) => setPatientWeightKg(parseInt(e.target.value) || 70)}
                style={{ width: '70px', fontSize: '0.85rem', padding: '4px' }}
                title="Weight (kg)"
              />
              <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical HUD Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>UNTREATED COMMITTED DOSE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {kinetics.baselineCedRem.toFixed(2)} Rem
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {(kinetics.baselineCedSv * 1000).toFixed(1)} mSv 50-year CED
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>DOSE AVERTED BY DRUG</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
            {kinetics.doseAvertedRem.toFixed(2)} Rem
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {kinetics.doseReductionPct.toFixed(1)}% total burden averted
          </div>
        </div>

        <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TREATED BIOLOGICAL T1/2</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
            {kinetics.effectiveTreatedHalfLife.toFixed(1)} days
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Baseline: {activeDrug.retentionHalflifeBaselineDays} days
          </div>
        </div>

        <div style={{ background: 'rgba(255, 159, 28, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ff9f1c' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>DAY-1 EXCRETION BOOST</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9f1c', marginTop: '2px' }}>
            {bioassay.excretionMultiplier.toFixed(1)}×
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Multiplied urinary / fecal clearance
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'protocol' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'protocol' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'protocol' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'protocol' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('protocol')}
        >
          💊 Pharmacotherapy Directive
        </button>

        <button
          className={`nav-link ${activeTab === 'kinetics' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'kinetics' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'kinetics' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'kinetics' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('kinetics')}
        >
          📉 Clearance Kinetics &amp; Dose Averted
        </button>

        <button
          className={`nav-link ${activeTab === 'bioassay' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'bioassay' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'bioassay' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'bioassay' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('bioassay')}
        >
          🧪 Bioassay &amp; Excretion Tracking
        </button>

        <button
          className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'orders' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'orders' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'orders' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('orders')}
        >
          📋 Clinical Prescription Orders
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PHARMACOTHERAPY DIRECTIVE */}
      {/* ========================================================================= */}
      {activeTab === 'protocol' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                  {activeDrug.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Indicated for Internal Decorporation of: <strong>{activeDrug.targetRadionuclides.join(', ')}</strong>
                </div>
              </div>
              <span className="hud-badge hud-badge-primary">FDA Approved Protocol</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00e5ff', marginBottom: '6px' }}>
                  ADMINISTRATION &amp; DOSAGE DIRECTIVE
                </div>
                <div style={{ fontSize: '0.84rem', lineHeight: '1.6' }}>
                  <strong>Route:</strong> {activeDrug.route}<br />
                  <strong>Adult Dosage:</strong> {activeDrug.adultDose}<br />
                  <strong>Pediatric Dosage:</strong> {activeDrug.pediatricDose}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981', marginBottom: '6px' }}>
                  MECHANISM OF ACTION
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  {activeDrug.mechanism}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffb703', marginBottom: '6px' }}>
                  ADVERSE REACTIONS &amp; CONTRAINDICATIONS
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  {activeDrug.sideEffects}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '6px' }}>
                  CLINICAL &amp; LABORATORY MONITORING
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  {activeDrug.monitoring}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLEARANCE KINETICS & DOSE AVERTED */}
      {/* ========================================================================= */}
      {activeTab === 'kinetics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
              📈 Whole-Body Retained Burden Profile Over 180 Days (Baseline vs. Treated)
            </div>
            <Plot
              data={[
                {
                  x: kinetics.timeline.map((p) => p.day),
                  y: kinetics.timeline.map((p) => p.baselineBq),
                  type: 'scatter',
                  mode: 'lines',
                  name: `Untreated Baseline (T1/2 = ${activeDrug.retentionHalflifeBaselineDays} d)`,
                  line: { color: '#ef4444', width: 2, dash: 'dot' }
                },
                {
                  x: kinetics.timeline.map((p) => p.day),
                  y: kinetics.timeline.map((p) => p.treatedBq),
                  type: 'scatter',
                  mode: 'lines',
                  name: `Treated with ${activeDrug.name} (T1/2 = ${kinetics.effectiveTreatedHalfLife.toFixed(1)} d)`,
                  line: { color: '#10b981', width: 2.5 }
                }
              ]}
              layout={{
                autosize: true,
                height: 360,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Days Post-Intake', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Retained Body Burden (kBq)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BIOASSAY & EXCRETION TRACKING */}
      {/* ========================================================================= */}
      {activeTab === 'bioassay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🧪 Quantitative Bioassay &amp; Excretion Multiplier
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Monitoring 24-hour urine and fecal excretion confirms that chelation or blocking therapy is accelerating radionuclide clearance.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>BASELINE 24H EXCRETION (DAY 1)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb703', marginTop: '2px' }}>
                  {(bioassay.baselineExcretionDay1Bq / 1000).toFixed(1)} kBq/day
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Natural unchelated biological rate</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>TREATED 24H EXCRETION (DAY 1)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                  {(bioassay.treatedExcretionDay1Bq / 1000).toFixed(1)} kBq/day
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{bioassay.excretionMultiplier.toFixed(1)}× enhancement factor</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>THERAPY TERMINATION TRIGGER</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '4px' }}>
                  &lt; 2× Baseline Rate
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Taper DTPA/PB when chelatable pool is depleted</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLINICAL ORDERS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              📋 Formal Medical Orders &amp; Pharmacy Dispensing Directive
            </h3>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.84rem', lineHeight: '1.7', border: '1px solid var(--color-border)' }}>
              <div><strong>PATIENT COHORT:</strong> {patientAgeGroup.toUpperCase()} ({patientWeightKg} kg)</div>
              <div><strong>SUSPECTED CONTAMINANT:</strong> {activeIsotope.name}</div>
              <div><strong>INTAKE MAGNITUDE:</strong> {intakeActivitykBq} kBq ({routeOfIntake.toUpperCase()})</div>
              <div><strong>INDICATED PHARMACEUTICAL:</strong> {activeDrug.name}</div>
              <div><strong>PRESCRIPTION DIRECTIVE:</strong> {patientAgeGroup === 'adult' ? activeDrug.adultDose : activeDrug.pediatricDose}</div>
              <div><strong>ADMINISTRATION ROUTE:</strong> {activeDrug.route}</div>
              <div><strong>THERAPY GOAL:</strong> Reduce committed effective dose from {kinetics.baselineCedRem.toFixed(1)} Rem to {kinetics.treatedCedRem.toFixed(1)} Rem ({kinetics.doseReductionPct.toFixed(1)}% dose averted).</div>
              <div><strong>MONITORING ORDER:</strong> Collect all urine and feces for 24h gamma/alpha spectrometry bioassay; monitor serum chemistry daily.</div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Dossier Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default MedicalCountermeasuresModule;
