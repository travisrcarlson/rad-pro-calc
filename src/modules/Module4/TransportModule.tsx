import React, { useState } from 'react';
import { BlockMath } from 'react-katex';
import PlotComponent from 'react-plotly.js';
const Plot = (PlotComponent as any).default || PlotComponent;
import nuclidesData from '../../data/nuclides.json'; // Contains generic Gamma constants
import equipmentDataRaw from '../../data/equipment_database.json';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [selectedElement, setSelectedElement] = useState('Cs');
  const [selectedMass, setSelectedMass] = useState('137');
  const nuclideSym = `${selectedElement}-${selectedMass}`;
  const [activity, setActivity] = useState(1);
  const [activityUnit, setActivityUnit] = useState(1); // 1 = TBq, 1e-3 = GBq, 1e-6 = MBq, 3.7e-2 = Ci
  const [form, setForm] = useState<'special'|'normal'>('normal');

  const [innerRadius, setInnerRadius] = useState<number>(5); // cm
  const [cavityWidth, setCavityWidth] = useState<number>(10); // cm, assumed cubic cavity for mass optimization

  const [layers, setLayers] = useState<{ id: number, matIdx: number, thickness: number }[]>([
    { id: 1, matIdx: 0, thickness: 1 } // 1 cm of Lead
  ]);

  const handleEquipmentImport = (eqName: string) => {
    const eq: any = equipmentDataRaw.find((e: any) => e['Device Name'] === eqName);
    if (!eq) return;

    // Isotope
    const isoStr = eq['Primary Isotope(s) भी'] || eq['Primary Isotope(s)'] || '';
    const primaryIso = isoStr.split(';')[0].trim();
    // Element & Mass
    const [sym, mass] = primaryIso.split('-');
    if (sym && mass && elementsMap[`${sym}-${mass}`]) {
      setSelectedElement(sym);
      setSelectedMass(mass);
    }
    
    // Activity
    const mbq = parseActivityMBq(eq['Activity (Typical)'] || '');
    setActivity(mbq);
    setActivityUnit(1e-6); // set unit to MBq
  };

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const handleExportPDF = async () => {
    const reportElem = document.getElementById('transport-report');
    if (!reportElem) return;
    setPdfGenerating(true);
    try {
        const canvas = await html2canvas(reportElem, { backgroundColor: '#1a1a1a', scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Transport_Manifest_${nuclideSym}.pdf`);
    } catch (err) {
        console.error("PDF generation failed", err);
    }
    setPdfGenerating(false);
  };

  // Derived unique elements
  const elementsMap = React.useMemo(() => {
    const map: Record<string, {name: string, masses: string[]}> = {};
    nuclidesData.forEach(n => {
       const [sym, mass] = n.Symbol.split('-');
       const elName = n.Nuclide.split('-')[0];
       if (!map[sym]) map[sym] = { name: elName, masses: [] };
       if (!map[sym].masses.includes(mass)) {
           map[sym].masses.push(mass);
       }
    });
    return map;
  }, []);

  // Derived properties
  const nucData = nuclidesData.find(n => n.Symbol === nuclideSym) || nuclidesData[0];
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

  // Transportation Category Matrix
  let activeCatId = 'I-WHITE';
  if (doseSurf > 10000) {
    activeCatId = 'OVER-LIMIT';
  } else if ((doseSurf > 2000) || (TI > 10)) {
    activeCatId = 'EXCLUSIVE';
  } else if ((doseSurf > 500 && doseSurf <= 2000) || (TI > 1 && TI <= 10)) {
    activeCatId = 'III-YELLOW';
  } else if ((doseSurf > 5 && doseSurf <= 500) || (TI > 0 && TI <= 1)) {
    activeCatId = 'II-YELLOW';
  }

  const transportCategories = [
    { id: 'I-WHITE', name: 'WHITE I', bg: '#fff', text: '#000', reqs: ['No external placards', 'General commercial logistics', 'Permitted on Passenger Aircraft'] },
    { id: 'II-YELLOW', name: 'YELLOW II', bg: '#FFF176', text: '#000', reqs: ['Vehicle must carry placards', 'Total TI per vehicle ≤ 50', 'Maintains basic segregation'] },
    { id: 'III-YELLOW', name: 'YELLOW III', bg: '#FBC02D', text: '#000', reqs: ['Banned from Passenger Aircraft', 'Strict highway segregation enforced', 'Carrier pre-authorization required'] },
    { id: 'EXCLUSIVE', name: 'EXCLUSIVE', bg: '#e74c3c', text: '#fff', reqs: ['Requires dedicated privately-chartered truck', 'Package must be structurally braced', 'Driver requires written radiation logs'] },
    { id: 'OVER-LIMIT', name: 'OVER LIMIT', bg: '#000', text: '#e74c3c', border: '#e74c3c', reqs: ['ILLEGAL FOR HIGHWAY TRANSIT', 'Requires massive Type B(U) / C shielding upgrades', 'Extreme external operator risk'] }
  ];

  const activeCategoryData = transportCategories.find(c => c.id === activeCatId) || transportCategories[0];

  // --- Shielding Optimization Engine ---
  
  const optimizationMaterials = [
    MATERIALS[3], // Steel
    MATERIALS[4], // Concrete
    MATERIALS[0], // Lead
    MATERIALS[1], // Tungsten
    MATERIALS[2]  // DU
  ].sort((a,b) => a.tvl - b.tvl); // Sort by most efficient TVL
  
  const stackTargets = [
    { name: 'Exclusive Use', maxSurf: 10000, max1m: Infinity, color: '#e74c3c' },
    { name: 'Yellow-III', maxSurf: 2000, max1m: 100, color: '#d35400' },
    { name: 'Yellow-II', maxSurf: 500, max1m: 10, color: '#f39c12' },
    { name: 'White-I', maxSurf: 5, max1m: 0.5, color: '#ecf0f1' }
  ];

  const plotDataList: any[] = stackTargets.map((t, tIdx) => {
      const xVals = optimizationMaterials.map(m => {
          let req = 0;
          while (req < 200) {
              const currentSurfDist = innerRadius + req;
              const current1mDist = currentSurfDist + 100;
              const attF = Math.pow(10, req / m.tvl);
              
              const dSurf = ((gamma_uSv * actMBq) / Math.max(1, currentSurfDist * currentSurfDist)) / attF;
              const d1m = ((gamma_uSv * actMBq) / Math.max(1, current1mDist * current1mDist)) / attF;
              
              if (dSurf <= t.maxSurf && d1m <= t.max1m) break;
              req += 0.1;
          }
          
          let prevReq = 0;
          if (tIdx > 0) {
              const prevTarget = stackTargets[tIdx - 1];
              while (prevReq < 200) {
                  const pSurfDist = innerRadius + prevReq;
                  const p1mDist = pSurfDist + 100;
                  const pAttF = Math.pow(10, prevReq / m.tvl);
                  const pSurf = ((gamma_uSv * actMBq) / Math.max(1, pSurfDist * pSurfDist)) / pAttF;
                  const p1m = ((gamma_uSv * actMBq) / Math.max(1, p1mDist * p1mDist)) / pAttF;
                  if (pSurf <= prevTarget.maxSurf && p1m <= prevTarget.max1m) break;
                  prevReq += 0.1;
              }
          }
          return Math.max(0, req - prevReq);
      });

      return {
          x: xVals,
          y: optimizationMaterials.map(m => m.name),
          type: 'bar',
          orientation: 'h',
          name: t.name,
          marker: { color: t.color, line: { color: '#0f0f0f', width: 2 } },
          text: xVals.map(val => val > 0.1 ? `${val.toFixed(1)} cm` : ''),
          textposition: 'inside',
          insidetextanchor: 'middle',
          hoverinfo: 'name+x+y'
      };
  });

  // --- Combinatorial Multi-Layer Solver ---
  // Calculates required outer shell thickness given a fixed inner core
  const combinations = [
      { coreMat: MATERIALS[1], coreIdx: 1, coreThickness: 1, shellMat: MATERIALS[0], shellIdx: 0 }, // Tungsten + Lead
      { coreMat: MATERIALS[0], coreIdx: 0, coreThickness: 2, shellMat: MATERIALS[3], shellIdx: 3 }, // Lead + Steel
      { coreMat: MATERIALS[2], coreIdx: 2, coreThickness: 2, shellMat: MATERIALS[3], shellIdx: 3 }, // DU + Steel
      { coreMat: MATERIALS[0], coreIdx: 0, coreThickness: 1, shellMat: MATERIALS[4], shellIdx: 4 }, // Lead + Concrete
  ];

  const compositeScenarios = combinations.map(combo => {
      const massCoreTemplate = ((Math.pow(cavityWidth + 2 * combo.coreThickness, 3) - Math.pow(cavityWidth, 3)) * combo.coreMat.density) / 1000;
      const targetInnerRadius = cavityWidth / 2;

      const thresholds = stackTargets.map(t => {
          let reqShell = 0;
          let massShellKg = 0;
          
          while (reqShell < 200) {
              const currentTotalThick = combo.coreThickness + reqShell;
              const currentSurfDist = targetInnerRadius + currentTotalThick;
              const current1mDist = currentSurfDist + 100;
              
              const totalDecades = (combo.coreThickness / combo.coreMat.tvl) + (reqShell / combo.shellMat.tvl);
              const attF = Math.pow(10, totalDecades);
              
              const dSurf = ((gamma_uSv * actMBq) / Math.max(1, currentSurfDist * currentSurfDist)) / attF;
              const d1m = ((gamma_uSv * actMBq) / Math.max(1, current1mDist * current1mDist)) / attF;
              
              if (dSurf <= t.maxSurf && d1m <= t.max1m) break;
              reqShell += 0.1;
          }

          if (reqShell > 0 && reqShell < 200) {
              const vMid = Math.pow(cavityWidth + 2 * combo.coreThickness, 3);
              const vOuter = Math.pow((cavityWidth + 2 * combo.coreThickness) + 2 * reqShell, 3);
              massShellKg = ((vOuter - vMid) * combo.shellMat.density) / 1000;
          }
          return { name: t.name, reqShell, massTotalKg: massCoreTemplate + massShellKg };
      });

      return { combo, thresholds, massCoreKg: massCoreTemplate };
  });

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

          <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>1. Package Core</h3>
          
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Element</label>
              <select className="form-control" value={selectedElement} onChange={e => {
                 setSelectedElement(e.target.value);
                 setSelectedMass(elementsMap[e.target.value].masses[0]);
              }}>
                {Object.keys(elementsMap).sort().map(sym => (
                  <option key={sym} value={sym}>{elementsMap[sym].name} ({sym})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Isotope Mass</label>
              <select className="form-control" value={selectedMass} onChange={e => setSelectedMass(e.target.value)}>
                {elementsMap[selectedElement]?.masses.map(mass => (
                  <option key={mass} value={mass}>{mass}</option>
                ))}
              </select>
            </div>
          </div>
          {['U-235', 'U-233', 'Pu-239', 'Pu-241'].includes(nuclideSym) && (
             <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', borderRadius: '4px', color: '#e74c3c', fontSize: '0.85rem' }}>
               <strong>⚠️ FISSILE MATERIAL</strong><br/>
               This isotope fundamentally supports nuclear fission. Legal transport compliance requires intensive Monte Carlo Criticality Safety Index (CSI) simulations that significantly override foundational attenuation metrics.
             </div>
          )}

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
            <select className="form-control" value={form} onChange={e => setForm(e.target.value as 'special' | 'normal')}>
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

        {/* Transportation Index & Summary */}
        <div id="transport-report" style={{ flex: '1 1 300px', minWidth: '300px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', height: 'fit-content' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Compliance Manifest</h3>
            <button 
               onClick={handleExportPDF} 
               disabled={pdfGenerating}
               style={{ background: '#3498db', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {pdfGenerating ? 'Generating...' : '📄 Export PDF'}
            </button>
          </div>
          
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '15px 0' }}/>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
             <span style={{ color: 'var(--color-text-muted)' }}>Surface Dose Rate:</span>
             <strong style={{ color: doseSurf > 2000 ? '#e74c3c' : 'white' }}>{doseSurf < 0.01 ? '<0.01' : doseSurf.toFixed(2)} µSv/h</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
             <span style={{ color: 'var(--color-text-muted)' }}>1m Dose Rate:</span>
             <strong>{dose1m < 0.01 ? '<0.01' : dose1m.toFixed(2)} µSv/h</strong>
          </div>

          <div style={{ display: 'flex', gap: '5px', alignSelf: 'stretch', margin: '20px 0 15px 0' }}>
            {transportCategories.map(cat => (
               <div key={cat.id} style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '8px 2px', 
                  backgroundColor: activeCatId === cat.id ? cat.bg : 'rgba(255,255,255,0.05)', 
                  color: activeCatId === cat.id ? cat.text : '#555',
                  border: `1px solid ${activeCatId === cat.id ? (cat.border || cat.bg) : '#333'}`,
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: activeCatId === cat.id ? 'bold' : 'normal',
                  transition: 'all 0.3s'
               }}>
                  {cat.name}
               </div>
            ))}
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${activeCategoryData.border || activeCategoryData.bg}`, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
             <div style={{ flex: '1 1 200px' }}>
                 <h4 style={{ margin: '0 0 10px 0', color: (activeCategoryData.bg === '#000' || activeCategoryData.bg === '#fff') ? '#ccc' : activeCategoryData.bg }}>
                   {activeCategoryData.name} Restrictions
                 </h4>
                 <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#bbb', lineHeight: '1.4' }}>
                    {activeCategoryData.reqs.map((req, i) => <li key={i}>{req}</li>)}
                 </ul>
                 <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#fff' }}><strong>Calculated TI: {TI.toFixed(1)}</strong></div>
             </div>
             
             <div style={{ 
               width: '90px', height: '90px', 
               backgroundColor: activeCategoryData.bg, 
               color: activeCategoryData.text,
               border: `2px solid ${activeCategoryData.border || '#ccc'}`,
               transform: 'rotate(45deg)',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
               margin: '10px 20px', flexShrink: 0
             }}>
               <div style={{ transform: 'rotate(-45deg)', textAlign: 'center', fontWeight: 'bold' }}>
                 <span style={{ fontSize: '1rem', display: 'block', marginBottom: '2px' }}>🛡️</span>
                 <span style={{ fontSize: '0.6rem', lineHeight: '1' }}>RADIOACTIVE</span><br/>
                 <span style={{ fontSize: '0.7rem' }}>{activeCategoryData.id.split('-')[1] || activeCategoryData.id}</span>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '30px', alignItems: 'stretch' }}>
        {/* --- Optimized Shielding Recommendations --- */}
        <div style={{ flex: '1 1 450px', minWidth: '450px', padding: '20px', borderTop: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '15px' }}>
               <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Composite Transport Geometries</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '25px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Assumed Cubic Target Cavity Width:</span>
                     <input type="number" className="form-control" style={{ width: '80px', padding: '5px' }} value={cavityWidth} onChange={e => setCavityWidth(Number(e.target.value))} />
                     <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>cm</span>
                  </div>
               </div>
           </div>
           <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
             The stacked lengths dictate the <strong>maximum shielding offsets</strong> required to reach the restrictive White-I limits. Visual hashes delineate the precise offsets achieved when loosening restrictions to Yellow-II, Yellow-III, or Exclusive Use parameters. 
           </p>
           
           <div style={{ height: '350px', width: '100%', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
              <Plot
                 data={plotDataList}
                 layout={{
                    autosize: true,
                    margin: { t: 20, l: 100, r: 20, b: 40 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#E0E1DD' },
                    xaxis: { title: 'Required Thickness (cm)' as any, color: '#aaa', gridcolor: '#333' },
                    barmode: 'stack'
                 }}
                 useResizeHandler
                 style={{ width: '100%', height: '100%' }}
              />
           </div>
           {unshielded1m <= 0.5 && (
              <div style={{ padding: '15px', marginTop: '15px', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', border: '1px solid #2ecc71', borderRadius: '4px', textAlign: 'center' }}>
                 Current payload naturally satisfies White-I parameters without any additional shielding.
              </div>
           )}
        </div>
  
        {/* --- Composite Shielding Combinations --- */}
        <div style={{ flex: '1 1 500px', minWidth: '500px', padding: '20px', borderTop: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            <h3 style={{ marginBottom: '10px', color: 'var(--color-primary)' }}>Combinatorial Shielding Matrices</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
              Theoretical dual-layer configurations mapping an extremely dense internal core geometry nested within broader structural packaging forms to achieve the bounds natively.
            </p>
  
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <thead>
                 <tr style={{ borderBottom: '1px solid #444' }}>
                   <th style={{ padding: '12px', color: '#ccc' }}>Dense Inner Core Configuration</th>
                   {stackTargets.map(t => (
                      <th key={t.name} style={{ padding: '12px', color: t.color }}>{t.name}</th>
                   ))}
                 </tr>
              </thead>
              <tbody>
                 {compositeScenarios.map((scen, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '12px', minWidth: '150px' }}>
                        <strong style={{ color: '#8e44ad' }}>{scen.combo.coreThickness} cm</strong> of {scen.combo.coreMat.name}
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>Core Mass: {scen.massCoreKg.toFixed(1)} kg</div>
                      </td>
                      {scen.thresholds.map((th, i) => (
                         <td key={i} style={{ padding: '12px', verticalAlign: 'top', minWidth: '130px' }}>
                            {th.reqShell <= 0 ? (
                               <span style={{ color: '#2ecc71', fontSize: '0.85rem' }}>Core fully subdues field</span>
                            ) : (
                               <>
                                  <div><strong style={{ color: '#ecf0f1' }}>+{th.reqShell.toFixed(1)} cm</strong> {scen.combo.shellMat.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>Cask Wt: {th.massTotalKg.toFixed(0)} kg</div>
                                  <button 
                                    onClick={() => {
                                       setInnerRadius(cavityWidth / 2);
                                       const newLayers = [];
                                       newLayers.push({ id: Date.now(), matIdx: scen.combo.coreIdx, thickness: scen.combo.coreThickness });
                                       newLayers.push({ id: Date.now() + 1, matIdx: scen.combo.shellIdx, thickness: Number(th.reqShell.toFixed(2)) });
                                       setLayers(newLayers);
                                       
                                       const panel = document.querySelector('.panel');
                                       if (panel) panel.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    style={{ marginTop: '8px', padding: '3px 8px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                  >
                                     Inject Array
                                  </button>
                               </>
                            )}
                         </td>
                      ))}
                    </tr>
                 ))}
              </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default TransportModule;
