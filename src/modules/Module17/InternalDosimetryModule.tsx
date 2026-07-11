import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

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

const InternalDosimetryModule: React.FC = () => {
  const [nuclideKey, setNuclideKey] = useState<string>('Iodine-131');
  const [route, setRoute] = useState<'Inhalation' | 'Ingestion' | 'Injection'>('Inhalation');
  const [intakeActivity, setIntakeActivity] = useState<number>(100); // in kBq
  const [absorptionClass, setAbsorptionClass] = useState<'F' | 'M' | 'S'>('M'); // Inhalation class
  const [selectedDay, setSelectedDay] = useState<number>(10); // scrubbing time parameter
  const [timespan, setTimespan] = useState<number>(180); // simulation span (days)

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

  return (
    <div className="internal-dosimetry-module">
      <div className="panel-header">
        <h2>☢️ Internal Dosimetry & ICRP Biokinetic Model</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Simulate nuclear intake clearance pathways, evaluate multi-compartment retention dynamics, and calculate committed equivalent doses (ICRP-60 standard).
        </p>
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
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Human Silhouette outline */}
                <path
                  d="M 100,10 C 105,10 112,15 112,23 C 112,30 106,36 106,40 C 108,42 115,44 122,46 C 130,48 135,50 145,55 C 150,60 148,70 146,80 C 144,90 142,105 140,115 C 138,125 140,140 141,155 C 142,170 145,190 147,205 C 148,212 142,215 138,210 C 134,205 130,195 125,185 L 120,270 C 120,275 110,275 110,270 L 102,190 L 98,190 L 90,270 C 90,275 80,275 80,270 L 75,185 C 70,195 66,205 62,210 C 58,215 52,212 53,205 C 55,190 58,170 59,155 C 60,140 62,125 60,115 C 58,105 56,90 54,80 C 52,70 50,60 55,55 C 65,50 70,48 78,46 C 85,44 92,42 94,40 C 94,36 88,30 88,23 C 88,15 95,10 100,10 Z"
                  fill="rgba(255,255,255,0.03)"
                  stroke="#334155"
                  strokeWidth="1.5"
                />

                {/* Blood vessel pathways (Spreading to body) */}
                <path d="M 100,46 L 100,130 M 100,80 L 130,110 M 100,80 L 70,110 M 100,130 L 115,180 M 100,130 L 85,180" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" opacity={scrubbedValues.blood > 0.1 ? 0.6 : 0.1} />

                {/* Intake Site: Lungs (Inhalation) */}
                <g opacity={route === 'Inhalation' ? Math.max(0.1, scrubbedValues.intake / intakeActivity) : 0.1}>
                  {/* Left Lung */}
                  <path d="M 98,60 C 90,55 80,62 82,75 C 83,88 95,92 98,82 Z" fill="#38bdf8" />
                  {/* Right Lung */}
                  <path d="M 102,60 C 110,55 120,62 118,75 C 117,88 105,92 102,82 Z" fill="#38bdf8" />
                </g>

                {/* Intake Site: GI Tract / Stomach (Ingestion) */}
                <path
                  d="M 95,90 C 85,90 85,105 98,110 C 105,115 105,125 95,125 C 90,125 90,115 88,110 Z"
                  fill="#10b981"
                  opacity={route === 'Ingestion' ? Math.max(0.1, scrubbedValues.intake / intakeActivity) : 0.1}
                />

                {/* Target Organ: Thyroid (I-131 target) */}
                {nuclideKey === 'Iodine-131' && (
                  <path
                    d="M 96,38 C 96,36 104,36 104,38 L 102,42 L 98,42 Z"
                    fill="#ef4444"
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                    opacity={0.1 + (scrubbedValues.organ / intakeActivity) * 0.9}
                  />
                )}

                {/* Target Organ: Skeleton / Bones (Sr-90 & Pu-239 target) */}
                {(nuclideKey === 'Strontium-90' || nuclideKey === 'Plutonium-239') && (
                  <g 
                    fill="#fbbf24" 
                    opacity={0.1 + (scrubbedValues.organ / intakeActivity) * 0.9}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  >
                    {/* Spine */}
                    <rect x="98" y="46" width="4" height="85" rx="1" />
                    {/* Ribs */}
                    <path d="M 85,70 Q 100,75 115,70 M 82,80 Q 100,85 118,80 M 85,90 Q 100,95 115,90" fill="none" stroke="#fbbf24" strokeWidth="2" />
                    {/* Pelvis */}
                    <path d="M 88,130 Q 100,140 112,130 L 105,145 L 95,145 Z" />
                    {/* Femurs */}
                    <line x1="88" y1="135" x2="80" y2="185" stroke="#fbbf24" strokeWidth="3" />
                    <line x1="112" y1="135" x2="120" y2="185" stroke="#fbbf24" strokeWidth="3" />
                  </g>
                )}

                {/* Target Organ: Muscle / Soft Tissue (Cs-137 target) */}
                {nuclideKey === 'Cesium-137' && (
                  <path
                    d="M 100,10 C 105,10 112,15 112,23 C 112,30 106,36 106,40 C 108,42 115,44 122,46 C 130,48 135,50 145,55 C 150,60 148,70 146,80 C 144,90 142,105 140,115 C 138,125 140,140 141,155 C 142,170 145,190 147,205 C 148,212 142,215 138,210 C 134,205 130,195 125,185 L 120,270 L 102,190 L 98,190 L 90,270 L 75,185 C 70,195 66,205 62,210 C 58,215 52,212 53,205 C 55,190 58,170 59,155 C 60,140 62,125 60,115 C 58,105 56,90 54,80 C 52,70 50,60 55,55 C 65,50 70,48 78,46 C 85,44 92,42 94,40 C 94,36 88,30 88,23 C 88,15 95,10 100,10 Z"
                    fill="rgba(59, 130, 246, 0.4)"
                    opacity={0.05 + (scrubbedValues.organ / intakeActivity) * 0.95}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  />
                )}

                {/* Target Organ: Total Body Water (Tritium H-3 target) */}
                {nuclideKey === 'Tritium (H-3)' && (
                  <path
                    d="M 100,10 C 105,10 112,15 112,23 C 112,30 106,36 106,40 C 108,42 115,44 122,46 C 130,48 135,50 145,55 C 150,60 148,70 146,80 C 144,90 142,105 140,115 C 138,125 140,140 141,155 C 142,170 145,190 147,205 C 148,212 142,215 138,210 C 134,205 130,195 125,185 L 120,270 L 102,190 L 98,190 L 90,270 L 75,185 C 70,195 66,205 62,210 C 58,215 52,212 53,205 C 55,190 58,170 59,155 C 60,140 62,125 60,115 C 58,105 56,90 54,80 C 52,70 50,60 55,55 C 65,50 70,48 78,46 C 85,44 92,42 94,40 C 94,36 88,30 88,23 C 88,15 95,10 100,10 Z"
                    fill="rgba(56, 189, 248, 0.4)"
                    opacity={0.05 + (scrubbedValues.organ / intakeActivity) * 0.95}
                    filter={scrubbedValues.organ > 1 ? 'url(#organGlow)' : 'none'}
                  />
                )}
              </svg>

              {/* Day Details Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', justifyContent: 'center' }}>
                <div style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Compartment Status</div>
                <div>Intake Site: <strong style={{ color: '#38bdf8' }}>{scrubbedValues.intake.toFixed(1)} kBq</strong></div>
                <div>Bloodstream: <strong style={{ color: '#f43f5e' }}>{scrubbedValues.blood.toFixed(2)} kBq</strong></div>
                <div>Target Organ: <strong style={{ color: 'var(--color-accent)' }}>{scrubbedValues.organ.toFixed(1)} kBq</strong></div>
                <div>Excreted: <strong style={{ color: 'var(--color-success)' }}>{scrubbedValues.excretion.toFixed(1)} kBq</strong></div>
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
    </div>
  );
};

export default InternalDosimetryModule;
