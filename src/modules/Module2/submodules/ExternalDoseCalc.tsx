import React, { useState } from 'react';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';
import equipmentDataRaw from '../../../data/equipment_database.json';

const parseActivityMBq = (activityStr: string) => {
  const str = activityStr.toLowerCase();
  const matches = str.match(/([0-9.,]+)\s*(tbq|gbq|mbq|kbq|ci|mci|uci|µci)/i);
  if (!matches) return 100; // default 100 MBq
  const val = parseFloat(matches[1].replace(/,/g, ''));
  const unit = matches[2];
  if (unit === 'tbq') return val * 1000000;
  if (unit === 'gbq') return val * 1000;
  if (unit === 'mbq') return val;
  if (unit === 'kbq') return val / 1000;
  if (unit === 'ci') return val * 37000;
  if (unit === 'mci') return val * 37;
  if (unit === 'uci' || unit === 'µci') return val * 0.037;
  return val;
};

const ExternalDoseCalc: React.FC = () => {
  const nuclides = nuclidesData as any[];
  const [selectedNuclide, setSelectedNuclide] = useState(nuclides.find(n => n.Nuclide === 'Cobalt-60') || nuclides[0]);
  const [activity, setActivity] = useState<number>(100);
  const [activityUnit, setActivityUnit] = useState<number>(1); // Multiplier to get MBq
  const [distance, setDistance] = useState<number>(1); // meters

  const handleEquipmentImport = (eqName: string) => {
    const eq: any = equipmentDataRaw.find((e: any) => e['Device Name'] === eqName);
    if (!eq) return;

    // Isotope
    const isoStr = eq['Primary Isotope(s) भी'] || eq['Primary Isotope(s)'] || '';
    const primaryIso = isoStr.split(';')[0].trim();
    const matchedNuc = nuclides.find((n: any) => n.Symbol === primaryIso || n.Nuclide.startsWith(primaryIso));
    if (matchedNuc) setSelectedNuclide(matchedNuc);
    
    // Activity
    const mbq = parseActivityMBq(eq['Activity (Typical)'] || '');
    setActivity(mbq);
    setActivityUnit(1); // set unit to MBq
  };

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
        <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #3498db', marginBottom: '20px' }}>
           <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#3498db', fontSize: '1rem' }}>Import from Catalog</h3>
           <select 
             className="form-control" 
             onChange={e => handleEquipmentImport(e.target.value)}
             style={{ width: '100%' }}
           >
             <option value="">-- Select Equipment Profile --</option>
             {equipmentDataRaw.map((eq: any, idx) => (
                <option key={idx} value={eq['Device Name']}>{eq['Device Name']}</option>
             ))}
           </select>
        </div>

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
