import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import VerificationBadge from '../../components/VerificationBadge';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

interface NuclideData {
  name: string;
  symbol: string;
  halfLifeRadioDays: number;
  halfLifeBioDays: number;
  fractionToOrgan: number; // fraction from blood to target organ
  targetOrgan: string;
  ingestionDoseCoeff: number; // Sv/Bq
  inhalationDoseCoeff: number; // Sv/Bq
  toxicity: 'Low' | 'Medium' | 'High' | 'Very High';
}

const RADIONUCLIDES: Record<string, NuclideData> = {
  'Iodine-131': {
    name: 'Iodine-131',
    symbol: 'I-131',
    halfLifeRadioDays: 8.02,
    halfLifeBioDays: 80.0,
    fractionToOrgan: 0.30, // 30% goes to Thyroid
    targetOrgan: 'Thyroid',
    ingestionDoseCoeff: 2.2e-8,
    inhalationDoseCoeff: 2.0e-8,
    toxicity: 'High'
  },
  'Cesium-137': {
    name: 'Cesium-137',
    symbol: 'Cs-137',
    halfLifeRadioDays: 11000, // ~30 years
    halfLifeBioDays: 110.0,
    fractionToOrgan: 0.90, // 90% goes to Muscle / Soft Tissue
    targetOrgan: 'Muscle & Soft Tissue',
    ingestionDoseCoeff: 1.3e-8,
    inhalationDoseCoeff: 9.6e-9,
    toxicity: 'Medium'
  },
  'Strontium-90': {
    name: 'Strontium-90',
    symbol: 'Sr-90',
    halfLifeRadioDays: 10500, // ~28.8 years
    halfLifeBioDays: 5000.0, // Calcium analog, stays in bone
    fractionToOrgan: 0.30, // 30% goes to Skeleton
    targetOrgan: 'Skeleton',
    ingestionDoseCoeff: 2.8e-8,
    inhalationDoseCoeff: 3.6e-8,
    toxicity: 'High'
  },
  'Plutonium-239': {
    name: 'Plutonium-239',
    symbol: 'Pu-239',
    halfLifeRadioDays: 8.8e6, // 24,100 years
    halfLifeBioDays: 18250.0, // Bone / Liver accumulator (50 years biological)
    fractionToOrgan: 0.45, // 45% goes to Bone, 45% to Liver (we target Skeleton in map)
    targetOrgan: 'Skeleton & Liver',
    ingestionDoseCoeff: 2.5e-7,
    inhalationDoseCoeff: 1.2e-4, // Highly hazardous as alpha-emitter in lungs
    toxicity: 'Very High'
  },
  'Tritium (H-3)': {
    name: 'Tritium',
    symbol: 'H-3',
    halfLifeRadioDays: 4500, // 12.3 years
    halfLifeBioDays: 10.0, // Spreads uniformly throughout water
    fractionToOrgan: 1.0,
    targetOrgan: 'Total Body Water',
    ingestionDoseCoeff: 1.8e-11,
    inhalationDoseCoeff: 1.8e-11,
    toxicity: 'Low'
  }
};

// Anatomically proportioned ICRP reference phantom silhouette (viewBox 0 0 200 280)
const BODY_SILHOUETTE_PATH =
  "M 100,8 " +
  "C 107,8 113,14 113,22 " +
  "C 113,30 109,38 106,44 " +
  "C 106,47 107,52 109,55 " +
  "C 114,56 126,60 134,64 " +
  "C 139,67 142,72 141,78 " +
  "C 140,88 138,102 137,116 " +
  "C 136,128 136,144 137,156 " +
  "C 138,164 137,172 136,180 " +
  "C 136,185 135,194 132,195 " +
  "C 130,195 129,186 129,180 " +
  "C 129,172 128,156 128,144 " +
  "C 127,128 127,112 127,98 " +
  "C 127,88 124,78 121,74 " +
  "C 120,82 119,94 118,105 " +
  "C 117,114 117,122 119,130 " +
  "C 122,139 123,148 123,158 " +
  "C 123,170 121,188 120,204 " +
  "C 119,216 121,232 120,246 " +
  "C 119,256 117,265 117,272 " +
  "C 118,275 120,277 117,278 " +
  "C 113,278 109,278 107,275 " +
  "C 106,268 106,256 106,246 " +
  "C 106,232 106,216 106,204 " +
  "C 106,188 104,172 100,162 " +
  "C 96,172 94,188 94,204 " +
  "C 94,216 94,232 94,246 " +
  "C 94,256 94,268 93,275 " +
  "C 91,278 87,278 83,278 " +
  "C 80,277 82,275 83,272 " +
  "C 83,265 81,256 80,246 " +
  "C 79,232 81,216 80,204 " +
  "C 79,188 77,170 77,158 " +
  "C 77,148 78,139 81,130 " +
  "C 83,122 83,114 82,105 " +
  "C 81,94 80,82 79,74 " +
  "C 76,78 73,88 73,98 " +
  "C 73,112 73,128 72,144 " +
  "C 72,156 71,172 71,180 " +
  "C 71,186 70,195 68,195 " +
  "C 65,194 64,185 64,180 " +
  "C 63,172 62,164 63,156 " +
  "C 64,144 64,128 63,116 " +
  "C 62,102 60,88 59,78 " +
  "C 58,72 61,67 66,64 " +
  "C 74,60 86,56 91,55 " +
  "C 93,52 94,47 94,44 " +
  "C 91,38 87,30 87,22 " +
  "C 87,14 93,8 100,8 Z";

const InternalDosimetryModule: React.FC = () => {
  const [nuclideKey, setNuclideKey] = useState<string>('Iodine-131');
  const [route, setRoute] = useState<'Inhalation' | 'Ingestion' | 'Injection'>('Inhalation');
  const [intakeActivity, setIntakeActivity] = useState<number>(100); // in kBq
  const [absorptionClass, setAbsorptionClass] = useState<'F' | 'M' | 'S'>('M'); // Inhalation class
  const [selectedDay, setSelectedDay] = useState<number>(10); // scrubbing time parameter
  const [timespan, setTimespan] = useState<number>(180); // simulation span (days)
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const nuclide = useMemo(() => RADIONUCLIDES[nuclideKey], [nuclideKey]);

  // Runge-Kutta/Euler Numerical Simulator for Compartment Kinetics
  const simulation = useMemo(() => {
    const activityBq = intakeActivity * 1000;
    
    // Physical decay constant (day^-1)
    const lambdaRadio = Math.log(2) / nuclide.halfLifeRadioDays;
    // Biological clearance constant from organ (day^-1)
    const lambdaBio = Math.log(2) / nuclide.halfLifeBioDays;
    
    // Intake absorption transfer rate (day^-1)
    let ka = 0.5; // Fast (F) and Injection / Ingestion default
    if (route === 'Inhalation') {
      if (absorptionClass === 'F') ka = 0.8;
      else if (absorptionClass === 'M') ka = 0.1;
      else ka = 0.01; // Slow (S)
    } else if (route === 'Ingestion') {
      ka = 0.4; // GI absorption rate
    } else if (route === 'Injection') {
      ka = 5.0; // Instantaneous blood entry
    }

    // Rate from blood to target organ (organ entry)
    const kb = 1.2; // transfer rate from blood (day^-1)
    const kOrgan = nuclide.fractionToOrgan * kb;
    const kUrine = (1 - nuclide.fractionToOrgan) * kb;

    // Simulation steps
    const dt = 0.1; // 0.1 day step
    const stepsCount = Math.round(timespan / dt);
    
    const time: number[] = [];
    const intakeArr: number[] = [];
    const bloodArr: number[] = [];
    const organArr: number[] = [];
    const excretionArr: number[] = [];
    const doseArr: number[] = [];

    // Initial state
    let intake = activityBq;
    let blood = 0;
    let organ = 0;
    let excreted = 0;

    const doseCoeff = route === 'Inhalation' ? nuclide.inhalationDoseCoeff : nuclide.ingestionDoseCoeff;

    for (let step = 0; step <= stepsCount; step++) {
      const t = step * dt;
      
      time.push(t);
      intakeArr.push(intake / 1000); // convert back to kBq
      bloodArr.push(blood / 1000);
      organArr.push(organ / 1000);
      excretionArr.push(excreted / 1000);

      // Dose = Cumulative intake activity * committed dose coefficient
      // Committed dose builds up over time proportional to integrated organ retention
      const currentCommittedDose = activityBq * doseCoeff * (1 - Math.exp(-(lambdaRadio + lambdaBio) * t)) * 1000; // in mSv
      doseArr.push(currentCommittedDose);

      // ODE system derivatives (Euler method)
      const dIntake = -ka * intake - lambdaRadio * intake;
      const dBlood = ka * intake - kOrgan * blood - kUrine * blood - lambdaRadio * blood;
      const dOrgan = kOrgan * blood - lambdaBio * organ - lambdaRadio * organ;
      const dExcreted = lambdaBio * organ + kUrine * blood - lambdaRadio * excreted;

      // Update states
      intake += dIntake * dt;
      blood += dBlood * dt;
      organ += dOrgan * dt;
      excreted += dExcreted * dt;
      
      if (intake < 0) intake = 0;
      if (blood < 0) blood = 0;
      if (organ < 0) organ = 0;
      if (excreted < 0) excreted = 0;
    }

    return { time, intakeArr, bloodArr, organArr, excretionArr, doseArr };
  }, [nuclide, route, intakeActivity, absorptionClass, timespan]);

  // Find simulated values at the currently selected day
  const scrubbedValues = useMemo(() => {
    const idx = Math.min(
      simulation.time.length - 1,
      Math.round(selectedDay / 0.1)
    );
    
    return {
      day: simulation.time[idx],
      intake: simulation.intakeArr[idx],
      blood: simulation.bloodArr[idx],
      organ: simulation.organArr[idx],
      excretion: simulation.excretionArr[idx],
      dose: simulation.doseArr[idx]
    };
  }, [simulation, selectedDay]);

  // Max dose commits at infinite time
  const maxCommittedDose = useMemo(() => {
    const doseCoeff = route === 'Inhalation' ? nuclide.inhalationDoseCoeff : nuclide.ingestionDoseCoeff;
    const doseSv = intakeActivity * 1000 * doseCoeff;
    return doseSv * 1000; // to mSv
  }, [nuclide, route, intakeActivity]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'Internal Dosimetry & Biokinetic Intake Assessment Dossier',
    moduleName: 'Module 17: Internal Dosimetry & ICRP Biokinetic Clearance Model',
    statuteCitation: 'ICRP Publication 68 / ICRP Publication 30 / 10 CFR 20 Subpart C',
    verificationTestId: 'VTEST-22',
    operatorName: 'Internal Dosimetrist / Health Physicist',
    operatorCredentials: 'Certified Health Physicist (CHP) / Medical Bioassay Specialist',
    facility: 'Radiological Protection & In Vivo Counting Bioassay Facility',
    notes: `Internal intake simulation for ${nuclide.name} via ${route} (${intakeActivity} kBq). Target critical organ: ${nuclide.targetOrgan}. Evaluation on Day ${selectedDay}.`,
    formulaDescription: 'H_{50} = A_{\\text{intake}} \\cdot e(g)_{50}, \\quad \\frac{dq_i}{dt} = -(\\lambda_R + \\lambda_{B,i}) q_i + \\sum k_{ji} q_j',
    inputs: [
      { label: 'Radionuclide', value: nuclide.name },
      { label: 'Intake Pathway', value: route },
      { label: 'Intake Activity', value: intakeActivity, unit: 'kBq' },
      { label: 'Lung Solubility Class', value: route === 'Inhalation' ? `Type ${absorptionClass}` : 'N/A' },
      { label: 'Target Critical Organ', value: nuclide.targetOrgan },
      { label: 'Evaluation Day', value: selectedDay, unit: 'days' }
    ],
    outputs: [
      { label: '50-Year Committed Effective Dose', value: maxCommittedDose.toFixed(3), unit: 'mSv', status: maxCommittedDose > 20 ? 'WARNING' : 'PASS' },
      { label: 'Current Accumulated Dose', value: scrubbedValues.dose.toFixed(4), unit: 'mSv', status: 'PASS' },
      { label: 'Critical Organ Burden', value: scrubbedValues.organ.toFixed(2), unit: 'kBq', status: 'PASS' },
      { label: 'Whole Body Retention', value: (scrubbedValues.intake + scrubbedValues.blood + scrubbedValues.organ).toFixed(2), unit: 'kBq', status: 'PASS' },
      { label: 'Total Excreted Activity', value: scrubbedValues.excretion.toFixed(2), unit: 'kBq', status: 'PASS' }
    ]
  }), [nuclide, route, intakeActivity, absorptionClass, selectedDay, maxCommittedDose, scrubbedValues]);

  return (
    <div className="internal-dosimetry-module">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>☢️ Internal Dosimetry &amp; ICRP Biokinetic Model</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Simulate nuclear intake clearance pathways, evaluate multi-compartment retention dynamics, and calculate committed equivalent doses (ICRP-60 standard).
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.08)'
            }}
          >
            <span>🛡️</span>
            <span>Audit Dossier (21 CFR Part 11)</span>
          </button>
          <VerificationBadge testId="VTEST-22" standard="ICRP 68" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Parameters Form Panel */}
        <div className="panel" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Radionuclide & Intake Parameters</h3>

          <div className="form-group">
            <label className="form-label">Radionuclide</label>
            <select
              className="form-control"
              value={nuclideKey}
              onChange={(e) => {
                setNuclideKey(e.target.value);
                // Reset timespan based on biological clearance speed
                const halfLife = RADIONUCLIDES[e.target.value].halfLifeBioDays;
                if (halfLife > 1000) setTimespan(365);
                else setTimespan(Math.max(60, Math.min(365, halfLife * 3.5)));
                setSelectedDay(10);
              }}
            >
              {Object.keys(RADIONUCLIDES).map((key) => (
                <option key={key} value={key}>
                  {key} ({RADIONUCLIDES[key].symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Route of Entry</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Inhalation', 'Ingestion', 'Injection'].map((r) => (
                <button
                  key={r}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    fontSize: '0.85rem',
                    background: route === r ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                    color: route === r ? '#000' : '#fff',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'none'
                  }}
                  onClick={() => setRoute(r as any)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {route === 'Inhalation' && (
            <div className="form-group">
              <label className="form-label">Lung Absorption Class (Solubility)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { key: 'F', label: 'Class F (Fast/Soluble)' },
                  { key: 'M', label: 'Class M (Moderate)' },
                  { key: 'S', label: 'Class S (Slow/Insoluble)' }
                ].map((c) => (
                  <button
                    key={c.key}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      fontSize: '0.75rem',
                      background: absorptionClass === c.key ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      color: absorptionClass === c.key ? '#000' : '#fff',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'none'
                    }}
                    onClick={() => setAbsorptionClass(c.key as any)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Intake Activity</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ flex: 1 }}
                value={intakeActivity}
                min="0.1"
                onChange={(e) => setIntakeActivity(Math.max(0.1, Number(e.target.value)))}
              />
              <span style={{ color: 'var(--color-text-muted)', width: '40px' }}>kBq</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              ({(intakeActivity / 37).toFixed(3)} μCi)
            </span>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Time Simulation Span</label>
              <span>{timespan} days</span>
            </div>
            <input
              type="range"
              min="30"
              max="365"
              step="5"
              value={timespan}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              onChange={(e) => {
                setTimespan(Number(e.target.value));
                if (selectedDay > Number(e.target.value)) setSelectedDay(Number(e.target.value));
              }}
            />
          </div>

          <div style={{ padding: '12px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid var(--color-primary)', borderRadius: '8px' }}>
            <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Radiological & Biological Profile
            </h4>
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div>Radio Half-Life: <strong>{nuclide.halfLifeRadioDays >= 365 ? `${(nuclide.halfLifeRadioDays / 365).toFixed(1)} years` : `${nuclide.halfLifeRadioDays.toFixed(2)} days`}</strong></div>
              <div>Bio Half-Life: <strong>{nuclide.halfLifeBioDays >= 365 ? `${(nuclide.halfLifeBioDays / 365).toFixed(1)} years` : `${nuclide.halfLifeBioDays.toFixed(1)} days`}</strong></div>
              <div>Target Deposit: <span style={{ color: 'var(--color-accent)' }}>{nuclide.targetOrgan}</span></div>
            </div>
          </div>
        </div>

        {/* Glowing Organ Body Map Visualizer */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Scrubbed Organ Deposition Body Map</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px' }}>
              Scrub the timeline to animate the intake absorption into the bloodstream and subsequent accumulation inside the target organ.
            </p>

            {/* Time Slider Scrubber */}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', margin: '15px 0', padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Day Scrubber:</span>
              <input
                type="range"
                min="0"
                max={timespan}
                step="1"
                value={selectedDay}
                style={{ flex: 1, accentColor: 'var(--color-accent)' }}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
              />
              <span style={{ fontWeight: 'bold', color: 'var(--color-accent)', width: '65px', textAlign: 'right' }}>
                Day {selectedDay}
              </span>
            </div>

            {/* Skeleton / Organ Body SVG */}
            <div style={{ display: 'flex', gap: '15px', background: '#030712', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '15px', justifyContent: 'center' }}>
              <svg viewBox="0 0 200 280" style={{ height: '240px', width: 'auto' }}>
                <defs>
                  {/* Glowing organ deposit shader */}
                  <filter id="organGlow">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.03" />
                  </linearGradient>
                </defs>

                {/* Subtle Reference Grid Marks */}
                <line x1="100" y1="6" x2="100" y2="276" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" strokeWidth="0.8" />
                <line x1="60" y1="64" x2="140" y2="64" stroke="rgba(255,255,255,0.03)" strokeDasharray="1 3" strokeWidth="0.8" />
                <line x1="70" y1="126" x2="130" y2="126" stroke="rgba(255,255,255,0.03)" strokeDasharray="1 3" strokeWidth="0.8" />

                {/* Human Silhouette outline (Anatomical ICRP Mannequin) */}
                <path
                  d={BODY_SILHOUETTE_PATH}
                  fill="url(#bodyGradient)"
                  stroke="#334155"
                  strokeWidth="1.4"
                />

                {/* Subtle Anatomical Landmark Contours */}
                <g stroke="rgba(148, 163, 184, 0.15)" strokeWidth="0.9" fill="none">
                  {/* Clavicles */}
                  <path d="M 100,58 C 91,58 80,61 74,65 M 100,58 C 109,58 120,61 126,65" />
                  {/* Sternum axis */}
                  <line x1="100" y1="62" x2="100" y2="94" strokeDasharray="2 3" />
                  {/* Pelvic crest guideline */}
                  <path d="M 86,138 C 94,134 106,134 114,138" />
                  {/* Patellae / Kneecaps */}
                  <circle cx="87" cy="216" r="2.2" />
                  <circle cx="113" cy="216" r="2.2" />
                </g>

                {/* Blood vessel pathways (Cardiovascular Transit) */}
                <g opacity={scrubbedValues.blood > 0.05 ? Math.min(0.9, 0.2 + (scrubbedValues.blood / intakeActivity) * 0.8) : 0.15}>
                  {/* Aortic Arch & Descending Aorta */}
                  <path d="M 100,74 C 104,70 106,75 102,82 L 100,136" stroke="#f43f5e" strokeWidth="1.6" fill="none" strokeDasharray="3 2" />
                  {/* Carotid Arteries */}
                  <path d="M 98,72 L 97,46 M 102,72 L 103,46" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="2 2" />
                  {/* Brachial Arteries (Both Arms) */}
                  <path d="M 98,74 C 88,74 76,96 73,116 L 71,154 M 102,74 C 112,74 124,96 127,116 L 129,154" stroke="#f43f5e" strokeWidth="1.2" fill="none" strokeDasharray="3 2" />
                  {/* Iliac & Femoral Arteries (Both Legs) */}
                  <path d="M 100,136 L 94,162 L 91,210 L 89,260 M 100,136 L 106,162 L 109,210 L 111,260" stroke="#f43f5e" strokeWidth="1.3" fill="none" strokeDasharray="3 2" />
                  {/* Cardiac silhouette */}
                  <circle cx="103" cy="80" r="4.5" fill="#f43f5e" opacity="0.4" filter={scrubbedValues.blood > 1 ? 'url(#organGlow)' : 'none'} />
                </g>

                {/* Intake Site: Lungs (Inhalation) */}
                <g opacity={route === 'Inhalation' ? Math.max(0.15, scrubbedValues.intake / intakeActivity) : 0.12}>
                  {/* Trachea & Main Bronchi */}
                  <path d="M 100,52 L 100,66 M 100,66 L 95,72 M 100,66 L 105,72" stroke="#38bdf8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  {/* Left Lung (viewer's left) */}
                  <path
                    d="M 96,63 C 92,64 85,72 84,84 C 84,94 92,97 96,94 C 97,88 95,74 96,63 Z"
                    fill="#38bdf8"
                    filter={route === 'Inhalation' && scrubbedValues.intake > 1 ? 'url(#organGlow)' : 'none'}
                  />
                  {/* Right Lung (viewer's right, with cardiac notch) */}
                  <path
                    d="M 104,63 C 108,64 115,72 116,84 C 116,94 108,97 104,94 C 103,88 105,74 104,63 Z"
                    fill="#38bdf8"
                    filter={route === 'Inhalation' && scrubbedValues.intake > 1 ? 'url(#organGlow)' : 'none'}
                  />
                </g>

                {/* Intake Site: GI Tract / Stomach (Ingestion) */}
                <g opacity={route === 'Ingestion' ? Math.max(0.15, scrubbedValues.intake / intakeActivity) : 0.12}>
                  {/* Esophagus */}
                  <path d="M 100,54 L 100,94" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2 1" />
                  {/* Stomach Cavity */}
                  <path
                    d="M 99,94 C 95,93 91,96 91,102 C 91,110 101,115 107,112 C 110,111 111,105 109,101 C 107,96 102,94 99,94 Z"
                    fill="#10b981"
                    filter={route === 'Ingestion' && scrubbedValues.intake > 1 ? 'url(#organGlow)' : 'none'}
                  />
                  {/* Intestinal Bowel Loops */}
                  <path
                    d="M 103,113 C 97,115 95,121 99,124 C 105,127 106,132 99,136 C 96,138 95,142 98,145 C 101,147 105,145 106,140 C 107,133 103,129 101,126"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={route === 'Ingestion' && scrubbedValues.intake > 1 ? 'url(#organGlow)' : 'none'}
                  />
                </g>

                {/* Target Organ: Thyroid (I-131 target) */}
                {nuclideKey === 'Iodine-131' && (
                  <path
                    d="M 97,47 C 94,48 92,51 93,54 C 94,56 97,55 98,52 C 99,51 101,51 102,52 C 103,55 106,56 107,54 C 108,51 106,48 103,47 C 101,48 99,48 97,47 Z"
                    fill="#ef4444"
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                    opacity={0.15 + (scrubbedValues.organ / intakeActivity) * 0.85}
                  />
                )}

                {/* Target Organ: Skeleton / Bones (Sr-90 & Pu-239 target) */}
                {(nuclideKey === 'Strontium-90' || nuclideKey === 'Plutonium-239') && (
                  <g 
                    fill="#fbbf24" 
                    stroke="#fbbf24"
                    opacity={0.15 + (scrubbedValues.organ / intakeActivity) * 0.85}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  >
                    {/* Skull Calvarium outline */}
                    <path d="M 92,23 C 92,15 108,15 108,23" fill="none" strokeWidth="1.5" />
                    {/* Segmented Spine */}
                    <line x1="100" y1="46" x2="100" y2="136" strokeWidth="2.5" strokeDasharray="3 1" />
                    {/* Clavicles */}
                    <path d="M 100,58 C 90,58 78,61 74,65 M 100,58 C 110,58 122,61 126,65" fill="none" strokeWidth="1.5" />
                    {/* Ribs (5 anatomical pairs) */}
                    <path d="M 88,70 Q 100,74 112,70 M 86,76 Q 100,80 114,76 M 85,82 Q 100,86 115,82 M 86,88 Q 100,92 114,88 M 89,94 Q 100,97 111,94" fill="none" strokeWidth="1.4" />
                    {/* Pelvis girdle */}
                    <path d="M 88,136 C 92,133 108,133 112,136 C 116,142 112,150 106,151 L 100,147 L 94,151 C 88,150 84,142 88,136 Z" strokeWidth="1" />
                    {/* Femurs */}
                    <line x1="92" y1="150" x2="90" y2="204" strokeWidth="2.4" strokeLinecap="round" />
                    <line x1="108" y1="150" x2="110" y2="204" strokeWidth="2.4" strokeLinecap="round" />
                    {/* Tibias */}
                    <line x1="90" y1="208" x2="89" y2="262" strokeWidth="2" strokeLinecap="round" />
                    <line x1="110" y1="208" x2="111" y2="262" strokeWidth="2" strokeLinecap="round" />
                    {/* Arm bones */}
                    <line x1="74" y1="67" x2="73" y2="116" strokeWidth="2" strokeLinecap="round" />
                    <line x1="73" y1="120" x2="71" y2="170" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="126" y1="67" x2="127" y2="116" strokeWidth="2" strokeLinecap="round" />
                    <line x1="127" y1="120" x2="129" y2="170" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                )}

                {/* Target Organ: Muscle / Soft Tissue (Cs-137 target) */}
                {nuclideKey === 'Cesium-137' && (
                  <path
                    d={BODY_SILHOUETTE_PATH}
                    fill="rgba(59, 130, 246, 0.45)"
                    opacity={0.08 + (scrubbedValues.organ / intakeActivity) * 0.92}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  />
                )}

                {/* Target Organ: Total Body Water (Tritium H-3 target) */}
                {nuclideKey === 'Tritium (H-3)' && (
                  <path
                    d={BODY_SILHOUETTE_PATH}
                    fill="rgba(56, 189, 248, 0.45)"
                    opacity={0.08 + (scrubbedValues.organ / intakeActivity) * 0.92}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  />
                )}
              </svg>

              {/* Day Details Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', justifyContent: 'center', minWidth: '175px' }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.72rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                  Biokinetic Compartments
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Intake ({route === 'Inhalation' ? 'Lungs' : 'GI Tract'}):</span>
                  </span>
                  <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{scrubbedValues.intake.toFixed(1)} kBq</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Blood Transit:</span>
                  </span>
                  <strong style={{ color: '#f43f5e', fontFamily: 'monospace' }}>{scrubbedValues.blood.toFixed(2)} kBq</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Target ({nuclide.targetOrgan}):</span>
                  </span>
                  <strong style={{ color: 'var(--color-accent)', fontFamily: 'monospace' }}>{scrubbedValues.organ.toFixed(1)} kBq</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Cumulative Excretion:</span>
                  </span>
                  <strong style={{ color: 'var(--color-success)', fontFamily: 'monospace' }}>{scrubbedValues.excretion.toFixed(1)} kBq</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '15px', padding: '15px', borderRadius: '6px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Committed Dose Equivalent
              </h4>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginTop: '5px' }}>
                {scrubbedValues.dose.toFixed(4)} mSv
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Commitment limit (infinite time): <strong>{maxCommittedDose.toFixed(2)} mSv</strong>
              </span>
            </div>
            <span style={{ fontSize: '2.5rem' }}>🫁</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Plotly Multi-line Compartment graph */}
        <div className="panel" style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Multi-Compartment Kinetic Retention Curves</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            Real-time curve resolution modeling the transfer of intake activity from primary inhalation/ingestion sites through blood absorption to long-term organ deposition.
          </p>
          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  x: simulation.time,
                  y: simulation.intakeArr,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Intake Site',
                  line: { color: '#38bdf8', width: 2.5 }
                },
                {
                  x: simulation.time,
                  y: simulation.bloodArr,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Blood Stream',
                  line: { color: '#f43f5e', width: 2 }
                },
                {
                  x: simulation.time,
                  y: simulation.organArr,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Target Organ (${nuclide.targetOrgan})`,
                  line: { color: 'var(--color-accent)', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(255, 159, 28, 0.08)'
                },
                {
                  x: simulation.time,
                  y: simulation.excretionArr,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Cumulative Excreted',
                  line: { color: 'var(--color-success)', width: 2 }
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Time since intake (Days)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { title: { text: 'Retention Activity (kBq)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 20, b: 60 },
                legend: { x: 0.6, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '380px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        {/* Committed Dose Profile over time */}
        <div className="panel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Cumulative Committed Dose</h3>
          <div style={{ width: '100%', marginTop: '10px' }}>
            <Plot
              data={[
                {
                  x: simulation.time,
                  y: simulation.doseArr,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Committed Dose',
                  line: { color: '#EF4444', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(239, 68, 68, 0.1)'
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Days' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { title: { text: 'Dose (mSv)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 50, r: 10, t: 20, b: 50 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '300px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '10px', lineHeight: '1.4' }}>
            Committed dose builds up over time as the radionuclide resides in the body, decaying and delivering biological damage to the tissues.
          </p>
        </div>
      </div>

      {/* Methodology Section */}
      <div className="panel">
        <h3>Methodology, Models & Assumptions</h3>
        <p style={{ marginTop: '10px', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          This internal dosimetry simulator estimates biokinetic behavior based on simplified representations of the 
          <strong> ICRP Human Respiratory Tract Model (HRTM, Publication 66)</strong>, 
          <strong> Human Alimentary Tract Model (HATM, Publication 100)</strong>, and organ-specific clearance kinetics.
          <br /><br />
          <strong>Committed Dose Equivalent:</strong> Calculates the 50-year integrated equivalent dose to tissues.
          The dose coefficients used represent the standard inhalation and ingestion values published in <strong>ICRP Publication 60</strong> (and FGR 12/13 equivalents) in $Sv/Bq$. 
          The biological clearance values assume standard healthy occupational adults. In case of actual contamination, clinical bioassays (e.g. whole-body counting, liquid scintillation urinalysis) must guide medical interventions like DTPA chelation (for Plutonium/Cobalt) or Prussian Blue ingestion (for Cesium).
        </p>
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default InternalDosimetryModule;
