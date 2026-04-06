import React, { useState } from 'react';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';

const ExternalDoseCalc: React.FC = () => {
  const nuclides = nuclidesData as any[];
  const [selectedNuclide, setSelectedNuclide] = useState(nuclides.find(n => n.Nuclide === 'Cobalt-60') || nuclides[0]);
  const [activity, setActivity] = useState<number>(100);
  const [activityUnit, setActivityUnit] = useState<number>(1); // Multiplier to get MBq
  const [distance, setDistance] = useState<number>(1); // meters

  // Gamma is in R·cm2/mCi·h. We will convert it to µSv·m²/h·MBq
  // 1 R = 10 mSv = 10,000 µSv
  // 1 mCi = 37 MBq
  // So, Γ (µSv·m²/h·MBq) = Γ (R·cm²/h·mCi) * 10,000 (µSv/R) * (1/10000 m²/cm²) / 37 (mCi/MBq)
  // Which simplifies to: Γ_SI = Γ_old * 1 / 37
  // OR simply: 1 R/h = 10 mSv/h. So 1 R·cm2/mCi·h -> 10000 uSv * cm2 / (37 MBq * h) -> 10000 / 10000 m2 / 37 = 1/37
  const gammaOld = parseFloat(selectedNuclide['Γ (R·cm²/mCi·h)'] || selectedNuclide['Γ (R·cm2/mCi·h)'] || '0');
  const gammaSI = gammaOld / 37.0;

  const activityMBq = activity * activityUnit;
  const doseRate = (activityMBq * gammaSI) / (distance * distance); // µSv/h

  return (
    <div className="panel" style={{ display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: '15px' }}>2A. Point Source Calculator</h3>
        
        <div className="form-group">
          <label className="form-label">Nuclide</label>
          <select 
            className="form-control" 
            value={selectedNuclide?.Nuclide} 
            onChange={e => setSelectedNuclide(nuclides.find(n => n.Nuclide === e.target.value))}
          >
            {nuclides.map((n, i) => (
              <option key={i} value={n.Nuclide}>{n.Nuclide} ({n.Symbol})</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label className="form-label">Activity</label>
            <input type="number" className="form-control" value={activity} onChange={e => setActivity(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Unit</label>
            <select className="form-control" value={activityUnit} onChange={e => setActivityUnit(Number(e.target.value))}>
              <option value={0.000001}>Bq</option>
              <option value={0.001}>kBq</option>
              <option value={1}>MBq</option>
              <option value={1000}>GBq</option>
              <option value={1000000}>TBq</option>
              <option value={37}>mCi</option>
              <option value={37000}>Ci</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Distance (m)</label>
          <input type="number" className="form-control" value={distance} onChange={e => setDistance(Number(e.target.value))} />
        </div>
        
        <div style={{ marginTop: '20px' }}>
           <label className="form-label">Extracted Physical Parameter</label>
           <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
             $\Gamma$ = {gammaSI.toFixed(4)} µSv·m²/(h·MBq) 
             <br/>(Calculated from ICRP/NuDat: {gammaOld} R·cm²/(mCi·h))
           </p>
        </div>
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Results</h3>
        
        <div style={{ fontSize: '2rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {doseRate.toFixed(2)} µSv/h
        </div>
        <div style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
          {(doseRate / 1000).toFixed(4)} mSv/h
        </div>

        <div className="formula-box" style={{ marginTop: '30px' }}>
          <BlockMath math="\dot{H}^*(10) = \frac{A \cdot \Gamma}{d^2}" />
        </div>
      </div>
    </div>
  );
};

export default ExternalDoseCalc;
