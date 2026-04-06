import React, { useState } from 'react';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';

const InternalDoseCalc: React.FC = () => {
  const nuclides = nuclidesData as any[];
  const validNuclides = nuclides.filter(n => n['ALI Inhal. (µCi)'] || n['ALI Ingest. (µCi)']);
  
  const [selectedNuclide, setSelectedNuclide] = useState(validNuclides[0] || nuclides[0]);
  const [intake, setIntake] = useState<number>(1000);
  const [intakeUnit, setIntakeUnit] = useState<number>(1); // 1 = Bq, 1000 = kBq, etc.
  const [pathway, setPathway] = useState<'inhalation' | 'ingestion'>('inhalation');

  const intakeBq = intake * intakeUnit;

  // Read ALI from data depending on pathway
  const ali_uCi_str = pathway === 'inhalation' ? selectedNuclide['ALI Inhal. (µCi)'] : selectedNuclide['ALI Ingest. (µCi)'];
  const ali_uCi = parseFloat(ali_uCi_str || '0');
  
  // 1 uCi = 37,000 Bq
  const aliBq = ali_uCi * 37000;

  // Committed Effective Dose E(50)
  // ALI is defined as the intake resulting in 20 mSv (0.02 Sv) dose.
  // Therefore, e(50) [Sv/Bq] = 0.02 / aliBq
  const e50 = aliBq > 0 ? 0.02 / aliBq : 0;
  
  // E(50) = I * e(50) = intakeBq * e50 (result is in Sv, convert to mSv)
  const doseSv = intakeBq * e50;
  const dose_mSv = doseSv * 1000;

  const dac_uCi_ml = parseFloat(selectedNuclide['DAC (µCi/mL)'] || '0');
  const dac_Bq_m3 = dac_uCi_ml * 37000 * 1000000; // 1 mL = 1e-6 m3

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: '15px' }}>2C. Internal Dose Calculator</h3>
        
        <div className="form-group">
          <label className="form-label">Nuclide (only those with ALI data)</label>
          <select 
            className="form-control" 
            value={selectedNuclide?.Nuclide} 
            onChange={e => setSelectedNuclide(validNuclides.find(n => n.Nuclide === e.target.value) || validNuclides[0])}
          >
            {validNuclides.map((n, i) => (
              <option key={i} value={n.Nuclide}>{n.Nuclide}</option>
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
            <label className="form-label">Intake ($I$)</label>
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

      <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Committed Effective Dose, E(50)</h3>
        
        <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {dose_mSv < 0.001 ? dose_mSv.toExponential(2) : dose_mSv.toFixed(4)} mSv
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>
          {(dose_mSv * 1000).toFixed(2)} µSv
        </div>

        <div style={{ marginTop: '15px', color: dose_mSv > 20 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
          {dose_mSv > 20 ? '⚠️ EXCEEDS 20 mSv OCCUPATIONAL LIMIT' : '✓ Within 20 mSv Occupational Limit'}
        </div>

        <div className="formula-box" style={{ marginTop: '30px' }}>
          <BlockMath math="E(50) = I \cdot e(50)" />
          <BlockMath math="ALI = \frac{0.02 \text{ Sv}}{e(50)}" />
        </div>
      </div>
    </div>
  );
};

export default InternalDoseCalc;
