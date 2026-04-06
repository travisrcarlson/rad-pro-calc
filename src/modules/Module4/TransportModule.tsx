import React, { useState } from 'react';
import { BlockMath } from 'react-katex';
// No Lucide
import nuclidesData from '../../data/nuclides.json'; // Contains generic Gamma constants

const MATERIALS = [
  { name: 'Lead (Pb)', density: 11.34, tvl: 3.8 }, // cm for ~1 MeV
  { name: 'Tungsten (W)', density: 19.3, tvl: 2.2 },
  { name: 'Depleted Uranium (DU)', density: 19.1, tvl: 2.3 },
  { name: 'Steel (Fe)', density: 7.87, tvl: 5.0 },
  { name: 'Concrete', density: 2.35, tvl: 14.7 },
  { name: 'Aluminum (Al)', density: 2.70, tvl: 16.5 },
  { name: 'Lead Glass', density: 5.20, tvl: 7.5 },
  { name: 'Water', density: 1.00, tvl: 33.0 },
  { name: 'Plexiglass (Acrylic/PMMA)', density: 1.18, tvl: 30.0 }, // Industry standard low-Z beta shield
  { name: 'Polyethylene (HDPE)', density: 0.95, tvl: 34.0 }, // (What you likely meant by "pyrene", standard poly) 
  { name: 'Packed Soil / Dirt', density: 1.60, tvl: 21.0 },
  { name: 'Air/Void', density: 0.001, tvl: 100000.0 } // Transparent
];

// IAEA SSR-6 (2018) Table 2 Generic Bounds (TBq)
const A_BOUNDS: Record<string, { A1: number, A2: number }> = {
  'Am-241': { A1: 10.0, A2: 0.001 },
  'Co-60': { A1: 0.4, A2: 0.4 },
  'Cs-137': { A1: 2.0, A2: 0.6 },
  'Ir-192': { A1: 1.0, A2: 0.6 },
  'Sr-90': { A1: 0.3, A2: 0.3 },
  'Tc-99m': { A1: 10.0, A2: 4.0 },
  'U-238': { A1: 10.0, A2: 10.0 }, // Unlimited for natural, 10 for placeholder
};

const TransportModule: React.FC = () => {
  const [nuclideSym, setNuclideSym] = useState('Cs-137');
  const [activity, setActivity] = useState(1);
  const [activityUnit, setActivityUnit] = useState(1); // 1 = TBq, 1e-3 = GBq, 1e-6 = MBq, 3.7e-2 = Ci
  const [form, setForm] = useState<'special'|'normal'>('normal');

  const [innerRadius, setInnerRadius] = useState<number>(5); // cm
  const [layers, setLayers] = useState<{ id: number, matIdx: number, thickness: number }[]>([
    { id: 1, matIdx: 0, thickness: 1 } // 1 cm of Lead
  ]);

  // Derived properties
  const nucData = nuclidesData.find(n => n.Symbol === nuclideSym);
  const actTBq = activity * activityUnit;
  const actMBq = actTBq * 1000000;
  
  // Parse Gamma: standard unit is (R·cm²/mCi·h)
  // 1 R = 10 mSv approximately (simplification)
  // If no gamma, we use a default proxy of 0 for pure beta like Sr-90 (unless Bremsstrahlung, which is complex)
  let gammaConstantVal = 0;
  if (nucData && nucData['Γ (R·cm²/mCi·h)'] !== '—' && nucData['Γ (R·cm²/mCi·h)'] !== undefined) {
    gammaConstantVal = Number(nucData['Γ (R·cm²/mCi·h)']);
  }
  // Convert Gamma from (R·cm²/mCi·h) to (µSv·cm²/MBq·h)
  // 1 mCi = 37 MBq. 1 R = 10,000 µSv.
  // G_uSv = G_R * (10000 / 37)
  const gamma_uSv = gammaConstantVal * 270.27;

  // Total shielding
  const totalThickness = layers.reduce((sum, l) => sum + l.thickness, 0);
  const distSurf_cm = innerRadius + totalThickness;
  const dist1m_cm = distSurf_cm + 100;

  let totalDecades = 0;
  layers.forEach(l => {
    const mat = MATERIALS[l.matIdx];
    totalDecades += l.thickness / mat.tvl;
  });
  const attenuationFactor = Math.pow(10, totalDecades);

  // Unshielded Dose Rates (uSv/h)
  const unshieldedSurf = (gamma_uSv * actMBq) / Math.max(1, (distSurf_cm * distSurf_cm));
  const unshielded1m = (gamma_uSv * actMBq) / Math.max(1, (dist1m_cm * dist1m_cm));

  // Shielded
  const doseSurf = unshieldedSurf / attenuationFactor;
  const dose1m = unshielded1m / attenuationFactor;

  const TI = dose1m / 10;

  // Determine Package Classification
  const defaultBounds = { A1: 1.0, A2: 1.0 };
  const bounds = A_BOUNDS[nuclideSym] || defaultBounds;
  const A_limit = form === 'special' ? bounds.A1 : bounds.A2;

  let pkgType = 'Exempt';
  let pkgColor = 'var(--color-success)';
  if (actTBq > 0.00001) { // 10k Bq generic exempt threshold check
    if (actTBq <= A_limit) {
      pkgType = 'Type A';
      pkgColor = '#3498db';
    } else {
      pkgType = 'Type B(U) / B(M)';
      pkgColor = '#e67e22';
    }
  }

  // Label Category
  let labelCategory = 'I-WHITE';
  let labelColor = '#ffffff';
  let labelTextColor = '#000000';
  
  if (doseSurf <= 5 && TI === 0) {
    labelCategory = 'I-WHITE';
  } else if ((doseSurf > 5 && doseSurf <= 500) || (TI > 0 && TI <= 1)) {
    labelCategory = 'II-YELLOW';
    labelColor = '#FFF176';
  } else if ((doseSurf > 500 && doseSurf <= 2000) || (TI > 1 && TI <= 10)) {
    labelCategory = 'III-YELLOW';
    labelColor = '#FBC02D';
  } else {
    labelCategory = 'EXCLUSIVE USE (Overrides Cat III)';
    labelColor = '#e74c3c';
    labelTextColor = '#fff';
  }

  const addLayer = () => {
    setLayers([...layers, { id: Date.now(), matIdx: 1, thickness: 1 }]);
  };

  const removeLayer = (id: number) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div className="panel-header">
        <h2>Module 4 — Shielding & Transport Eval (IAEA SSR-6)</h2>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* Source & Package Geometry Setup */}
        <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>1. Package Core</h3>
          
          <div className="form-group">
            <label className="form-label">Internal Source Nuclide</label>
            <select className="form-control" value={nuclideSym} onChange={e => setNuclideSym(e.target.value)}>
              {nuclidesData.map((n, i) => (
                <option key={i} value={n.Symbol}>{n.Nuclide} ({n.Symbol})</option>
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
                  <option value={1e-6}>MBq</option>
                  <option value={1e-3}>GBq</option>
                  <option value={1}>TBq</option>
                  <option value={0.037}>Curie (Ci)</option>
               </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Form</label>
            <select className="form-control" value={form} onChange={e => setForm(e.target.value as any)}>
              <option value="special">Special Form (Capsule/Solid/Sealed)</option>
              <option value="normal">Normal Form (Liquid/Gas/Powder)</option>
            </select>
          </div>

          <div className="form-group">
             <label className="form-label">Package Inner Radius (cm)</label>
             <input type="number" className="form-control" value={innerRadius} onChange={e => setInnerRadius(Number(e.target.value))} />
             <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Distance from point source to the beginning of shielding.</div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Required Package Classification:</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: pkgColor }}>{pkgType}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '5px' }}>
              Contains {actTBq.toFixed(6)} TBq (Limit: {A_limit} TBq)
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Gamma Const: {gamma_uSv === 0 ? 'Pure Beta / No Γ' : `${gamma_uSv.toFixed(1)} (µSv·cm²/MBq·h)`}
            </div>
          </div>
        </div>

        {/* Multi-Layer Shielding Configuration */}
        <div style={{ flex: '1 1 350px', minWidth: '350px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>2. Shielding Layers</h3>
            <button onClick={addLayer} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              ➕ Add Layer
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {layers.length === 0 && <span style={{ color: 'var(--color-text-muted)' }}>No shielding. Bare source.</span>}
            {layers.map((layer, index) => (
              <div key={layer.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '4px' }}>
                 <div>
                   <label className="form-label">Layer {index + 1} Material</label>
                   <select className="form-control" value={layer.matIdx} onChange={e => {
                     const nw = [...layers]; nw[index].matIdx = Number(e.target.value); setLayers(nw);
                   }}>
                     {MATERIALS.map((m, i) => (
                       <option key={i} value={i}>{m.name}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="form-label">Thickness (cm)</label>
                   <input type="number" className="form-control" value={layer.thickness} style={{ width: '80px' }} onChange={e => {
                     const nw = [...layers]; nw[index].thickness = Number(e.target.value); setLayers(nw);
                   }} />
                 </div>
                 <button onClick={() => removeLayer(layer.id)} style={{ padding: '8px', background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem' }}>
                   ❌
                 </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #444', borderRadius: '4px' }}>
             <table style={{ width: '100%', fontSize: '0.9rem' }}>
               <tbody>
                  <tr><td style={{ color: 'var(--color-text-muted)' }}>Package Surface Distance:</td> <td>{distSurf_cm} cm</td></tr>
                  <tr><td style={{ color: 'var(--color-text-muted)' }}>1-Meter Distance:</td> <td>{dist1m_cm} cm</td></tr>
                  <tr><td style={{ color: 'var(--color-text-muted)' }}>Shielding Attenuation ($10^{'{'}-n{'}'}$):</td> <td>$10^{'{'}-{totalDecades.toFixed(2)}{'}'}$</td></tr>
               </tbody>
             </table>
          </div>
        </div>

        {/* Output & Labelling */}
        <div style={{ flex: '1 1 350px', minWidth: '350px', borderLeft: '1px solid var(--color-border)', paddingLeft: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>3. Final Transport Index</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
             <span style={{ color: 'var(--color-text-muted)' }}>Surface Dose Rate:</span>
             <strong style={{ color: doseSurf > 2000 ? '#e74c3c' : 'white' }}>{doseSurf < 0.01 ? '<0.01' : doseSurf.toFixed(2)} µSv/h</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
             <span style={{ color: 'var(--color-text-muted)' }}>1m Dose Rate:</span>
             <strong>{dose1m < 0.01 ? '<0.01' : dose1m.toFixed(2)} µSv/h</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
            <div style={{ 
              width: '140px', height: '140px', 
              backgroundColor: labelColor, 
              color: labelTextColor,
              border: '2px solid #ccc',
              transform: 'rotate(45deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              transition: 'background-color 0.3s ease'
            }}>
              <div style={{ transform: 'rotate(-45deg)', textAlign: 'center', fontWeight: 'bold' }}>
                <span style={{ fontSize: '1.2rem', marginBottom: '5px' }}>🛡️</span><br/>
                RADIOACTIVE<br/>
                {labelCategory.split('-')[1] || labelCategory}<br/>
                <span style={{ fontSize: '0.9rem', color: labelTextColor }}>TI: {TI.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '5px' }}>Governing Mathematics:</div>
            <div className="formula-box" style={{ fontSize: '0.9rem', padding: '10px' }}>
              <BlockMath math="\dot{H}_{surf} = \frac{\Gamma \cdot A}{d_{surf}^2} \cdot 10^{-\sum\frac{x_i}{TVL_i}}" />
              <div style={{ height: '5px' }}></div>
              <BlockMath math="TI = \frac{\dot{H}_{1m} \ [\text{µSv/h}]}{10}" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TransportModule;
