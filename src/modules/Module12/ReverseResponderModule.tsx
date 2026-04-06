import React, { useState, useMemo } from 'react';
import allNuclidesData from '../../data/all_nuclides.json'; // Contains Z, N, Nuclide, Half-Life, Decay Mode, etc.

type Equipment = 
  | 'Alpha Probe (ZnS)' 
  | 'Pancake GM' 
  | 'Gamma Scint/Ion Chamber'
  | 'NaI(Tl) Spectrum Analyzer'
  | 'HPGe Spectrometer'
  | 'Proportional Counter (Alpha/Beta)'
  | 'Neutron Rem Meter';

type Unit = 'CPM' | 'mSv/hr' | 'µSv/hr' | 'R/hr' | 'mR/hr';
type EnergyUnit = 'keV' | 'MeV';

const ReverseResponderModule: React.FC = () => {
  const [distance, setDistance] = useState<number>(1);
  const [reading, setReading] = useState<number>(1000);
  const [equipment, setEquipment] = useState<Equipment>('NaI(Tl) Spectrum Analyzer');
  const [efficiency, setEfficiency] = useState<number>(10); // %
  const [unit, setUnit] = useState<Unit>('mSv/hr');
  const [detectedEnergy, setDetectedEnergy] = useState<string>('');
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>('MeV');

  const nuclideDict = useMemo(() => {
     const dict: Record<string, unknown> = {};
     for (const n of allNuclidesData) {
         dict[`${n.Z}_${n.N}`] = n;
     }
     return dict;
  }, []);

  const handleEquipmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eq = e.target.value as Equipment;
    setEquipment(eq);
    if (eq === 'Alpha Probe (ZnS)' || eq === 'Pancake GM' || eq === 'Proportional Counter (Alpha/Beta)' || eq === 'Neutron Rem Meter') {
      setUnit('CPM');
      setEfficiency(eq === 'Alpha Probe (ZnS)' ? 20 : eq === 'Proportional Counter (Alpha/Beta)' ? 30 : 10);
    } else {
      setUnit('mSv/hr');
      setEfficiency(eq === 'HPGe Spectrometer' ? 5 : 100); 
    }
    // Clear energy input if changing away from spectrometer, though keeping it is harmless
  };

  const results = useMemo(() => {
    if (distance <= 0 || reading <= 0 || efficiency <= 0) return [];

    let reading_mSv_hr = 0;
    let reading_cpm = 0;

    // Normalize units
    if (unit === 'CPM') {
        reading_cpm = reading;
    } else {
        reading_mSv_hr = reading;
        if (unit === 'µSv/hr') reading_mSv_hr = reading / 1000;
        if (unit === 'R/hr') reading_mSv_hr = reading * 10;
        if (unit === 'mR/hr') reading_mSv_hr = reading / 100;
    }

    const candidates = [];
    const effFraction = efficiency / 100;

    // Loop through database
    for (const n of allNuclidesData) {
      if (n['Half-Life'] === 'STABLE') continue;

      const mode = String(n['Decay Mode']).toUpperCase() || '';
      let isValidForDetector = false;
      let impliedActivityMBq = 0;

      // 0. Graph Search Spectral Energy Filter Check
      let passesEnergyFilter = true;
      let solvedByChain = false;
      let targetChainLength = 1;

      if (detectedEnergy.trim() !== '') {
          // Parse all comma-separated peaks into MeV
          const rawInputs = detectedEnergy.split(',').map(s => parseFloat(s.trim())).filter(num => !isNaN(num) && num > 0);
          
          if (rawInputs.length > 0) {
              const targetsMeV = energyUnit === 'keV' ? rawInputs.map(v => v / 1000) : rawInputs;
              passesEnergyFilter = false;

              // BFS to build max 6 generations of descendant chain
              const chainNodes = new Set<Record<string, unknown>>();
              let currentGen = [n as Record<string, unknown>];
              chainNodes.add(n as Record<string, unknown>);

              for (let g = 0; g < 6; g++) {
                 const nextGen: Record<string, unknown>[] = [];
                 for (const c of currentGen) {
                     if (c['Half-Life'] === 'STABLE') continue;
                     const cmodes = String(c['Decay Mode'] || '').split(',');
                     cmodes.forEach((m: string) => {
                         let nZ = Number(c.Z); let nN = Number(c.N); const modeTrim = m.trim();
                         if (modeTrim.startsWith('A')) { nZ -= 2; nN -= 2; }
                         else if (modeTrim.startsWith('B-')) { nZ += 1; nN -= 1; }
                         else if (modeTrim.startsWith('EC') || modeTrim.startsWith('B+')) { nZ -= 1; nN += 1; }
                         else if (modeTrim.startsWith('N')) { nN -= 1; }
                         else if (modeTrim.startsWith('P')) { nZ -= 1; }
                         
                         if (nZ !== Number(c.Z) || nN !== Number(c.N)) {
                             const d = nuclideDict[`${nZ}_${nN}`] as Record<string, unknown>;
                             if (d && !chainNodes.has(d)) {
                                 chainNodes.add(d);
                                 nextGen.push(d);
                             }
                         }
                     });
                 }
                 if (nextGen.length === 0) break;
                 currentGen = nextGen;
              }

              const chainArray = Array.from(chainNodes);
              let parentAloneSatisfiedAll = true;
              let allTargetsMatched = true;

              // Check if EVERY target entered is solved by at least ONE node in the chain
              for (const target of targetsMeV) {
                  let targetMatchedInChain = false;
                  let targetMatchedByParent = false;

                  for (const cNode of chainArray) {
                      const cmode = String(cNode['Decay Mode']).toUpperCase() || '';
                      let nodeMatchesTarget = false;

                      if (equipment.includes('Alpha') || (equipment.includes('Spectr') && cmode.includes('A'))) {
                          const qA = parseFloat((cNode['Q-Alpha'] as string) || '0') / 1000;
                          if (qA > 0 && Math.abs(qA - target) < 0.25) nodeMatchesTarget = true;
                      }
                      if (!nodeMatchesTarget && equipment.includes('Spectr')) {
                          const qB = parseFloat((cNode['Q-Beta'] as string) || '0') / 1000;
                          const qEC = parseFloat((cNode['Q-EC'] as string) || '0') / 1000;
                          if ((qB >= target && qB <= target + 2.5) || (qEC >= target && qEC <= target + 2.5)) {
                              nodeMatchesTarget = true;
                          }
                      }

                      if (nodeMatchesTarget) {
                          targetMatchedInChain = true;
                          if (cNode === n) targetMatchedByParent = true;
                      }
                  }

                  if (!targetMatchedInChain) {
                      allTargetsMatched = false;
                      break; // Missing at least one peak physically anywhere in the lineage! Chain is dead.
                  }
                  if (!targetMatchedByParent) {
                      parentAloneSatisfiedAll = false;
                  }
              }

              if (allTargetsMatched) {
                  passesEnergyFilter = true;
                  if (!parentAloneSatisfiedAll && chainArray.length > 1) {
                      solvedByChain = true;
                      targetChainLength = chainArray.length;
                  }
              }
          }
      }

      if (!passesEnergyFilter) continue;

      // 1. Filter logic & Inverse Square Math
      if (equipment === 'Alpha Probe (ZnS)') {
          if (mode.includes('A')) {
              isValidForDetector = true;
              const d_cm = distance * 100;
              const sphereArea = 4 * Math.PI * Math.pow(d_cm, 2);
              const detectorArea = 50; // cm^2
              const solidAngle = detectorArea / sphereArea;
              const particlesPerSec = (reading_cpm / 60) / (effFraction * solidAngle);
              impliedActivityMBq = particlesPerSec / 1e6;
          }
      } 
      else if (equipment === 'Pancake GM' || equipment === 'Proportional Counter (Alpha/Beta)') {
          if (mode.includes('A') || mode.includes('B-') || mode.includes('EC')) {
              isValidForDetector = true;
              const d_cm = distance * 100;
              const sphereArea = 4 * Math.PI * Math.pow(d_cm, 2);
              const detectorArea = equipment === 'Pancake GM' ? 15 : 100; // cm^2
              const solidAngle = detectorArea / sphereArea;
              const particlesPerSec = (reading_cpm / 60) / (effFraction * solidAngle);
              impliedActivityMBq = particlesPerSec / 1e6;
          }
      }
      else if (equipment.includes('Gamma') || equipment.includes('Spectrometer') || equipment.includes('Analyzer')) {
          if (mode.includes('B-') || mode.includes('EC') || mode.includes('IT')) {
              isValidForDetector = true;
              impliedActivityMBq = reading_mSv_hr * Math.pow(distance, 2) * 3700 * (1 / effFraction);
          }
      }
      else if (equipment === 'Neutron Rem Meter') {
          if (mode.includes('SF') || mode.includes('N')) {
              isValidForDetector = true;
              // Very coarse generic proxy for neutron dose
              impliedActivityMBq = reading_mSv_hr * Math.pow(distance, 2) * 1500 * (1 / effFraction);
          }
      }

      if (isValidForDetector && impliedActivityMBq > 0) {
          candidates.push({
              nuclide: n.Nuclide,
              mode: mode,
              halfLife: n['Half-Life'],
              mbq: impliedActivityMBq,
              solvedByChain,
              chainLength: targetChainLength,
              qAlpha: n['Q-Alpha'] ? (parseFloat(n['Q-Alpha']) / 1000).toFixed(2) : '-',
              qBeta: n['Q-Beta'] ? (parseFloat(n['Q-Beta']) / 1000).toFixed(2) : '-',
              qEC: n['Q-EC'] ? (parseFloat(n['Q-EC']) / 1000).toFixed(2) : '-'
          });
      }
    }

    // Sort by Implied Activity (Ascending -> the 'strongest' candidates are ones that require plausible amounts)
    return candidates.sort((a, b) => a.mbq - b.mbq).slice(0, 500);
  }, [distance, reading, equipment, efficiency, unit, detectedEnergy, energyUnit, nuclideDict]);

  const formatActivity = (mbq: number) => {
      if (mbq > 1e6) return (mbq / 1e6).toFixed(2) + ' TBq';
      if (mbq > 1e3) return (mbq / 1e3).toFixed(2) + ' GBq';
      if (mbq < 1) return (mbq * 1000).toFixed(2) + ' kBq';
      return mbq.toFixed(2) + ' MBq';
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', margin: '0 0 10px 0' }}>Reverse Responder Tool</h2>
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Input field telemetry to back-calculate implied source activities ($A_0$) across the nuclide database.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* LEFT COLUMN - INPUTS */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Field Telemetry</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Distance from Source (meters)</label>
              <input 
                type="number" value={distance} onChange={e => setDistance(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                min="0.01" step="0.1"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Instrument Reading</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="number" value={reading} onChange={e => setReading(parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                  min="0" step="1"
                />
                <select 
                  value={unit} onChange={e => setUnit(e.target.value as Unit)}
                  style={{ padding: '10px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="CPM">CPM</option>
                  <option value="µSv/hr">µSv/hr</option>
                  <option value="mSv/hr">mSv/hr</option>
                  <option value="mR/hr">mR/hr</option>
                  <option value="R/hr">R/hr</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Equipment Profile</label>
              <select 
                value={equipment} onChange={handleEquipmentChange}
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
              >
                <optgroup label="Gross Count Detectors">
                  <option value="Pancake GM">Pancake GM Probe - 15cm²</option>
                  <option value="Proportional Counter (Alpha/Beta)">Proportional Counter - 100cm²</option>
                  <option value="Alpha Probe (ZnS)">Alpha Probe (ZnS) - 50cm²</option>
                </optgroup>
                <optgroup label="Dose / Neutron">
                  <option value="Gamma Scint/Ion Chamber">Ion Chamber / Survey Meter</option>
                  <option value="Neutron Rem Meter">He-3 Neutron Rem Meter</option>
                </optgroup>
                <optgroup label="Spectrum Analyzers">
                  <option value="NaI(Tl) Spectrum Analyzer">NaI(Tl) Gamma Spectrometer</option>
                  <option value="HPGe Spectrometer">HPGe High-Purity Spectrometer</option>
                </optgroup>
              </select>
            </div>

            {equipment.includes('Spectr') && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#66AAFF', fontSize: '0.9rem' }}>
                  Identified Spectral Peaks (Comma Separated)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" value={detectedEnergy} onChange={e => setDetectedEnergy(e.target.value)}
                    placeholder="e.g., 662, 1173"
                    style={{ flex: 1, padding: '10px', background: 'rgba(102,170,255,0.1)', border: '1px solid #336699', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                  />
                  <select 
                    value={energyUnit} onChange={e => setEnergyUnit(e.target.value as EnergyUnit)}
                    style={{ padding: '10px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
                  >
                    <option value="keV">keV</option>
                    <option value="MeV">MeV</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>
                {equipment.includes('Gamma') || equipment.includes('Spectr') ? 'Reading Accuracy / Scaling (%)' : 'Detector Efficiency (%)'}
              </label>
              <input 
                type="number" value={efficiency} onChange={e => setEfficiency(parseFloat(e.target.value) || 1)}
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                min="0.1" max="1000" step="1"
              />
            </div>
          </div>
          
          <div style={{ padding: '20px', background: '#0a0a0a', border: '1px solid #336699', borderRadius: '8px' }}>
             <h4 style={{ margin: '0 0 10px 0', color: '#66AAFF' }}>Physics Engine Status</h4>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
               Filtering database down to strictly <strong>{equipment.includes('Alpha') ? 'Alpha (α)' : equipment.includes('Neutron') ? 'Neutron (n)' : equipment.includes('Gamma') || equipment.includes('Spectr') ? 'Beta/Gamma (β/γ)' : 'Alpha/Beta/Gamma'}</strong> emitters.
               Using 4π point-source inverse square backward propagation.
               {detectedEnergy !== '' && equipment.includes('Spectr') && (
                  <span style={{ display: 'block', marginTop: '8px', color: '#FFD700' }}>
                    <strong>Spectrum Bandpass:</strong> Isolating isotopes capable of supporting {detectedEnergy} {energyUnit} transition energies.
                  </span>
               )}
             </p>
          </div>
        </div>

        {/* RIGHT COLUMN - TARGET ENGINE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', minHeight: 0 }}>
          <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#E0E1DD' }}>Isolated Candidates ({results.length})</h3>
            <span style={{ fontSize: '0.85rem', color: '#888' }}>Sorted by Implied Source Activity (A₀)</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#151515', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Nuclide</th>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Half-Life</th>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Primary Decay</th>
                  <th style={{ padding: '15px 20px', color: '#F4D03F', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-Alpha (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#5DADE2', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-Beta (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#E74C3C', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-EC (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#E0E1DD', fontWeight: 'bold', borderBottom: '1px solid #333' }}>Implied Activity</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res, i) => (
                  <tr key={res.nuclide} style={{ borderBottom: '1px solid #222', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 20px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                      {res.nuclide}
                      {res.solvedByChain && (
                         <span style={{ marginLeft: '10px', fontSize: '0.75rem', background: '#336699', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                           + {res.chainLength - 1} Daughters
                         </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', color: '#aaa' }}>{res.halfLife}</td>
                    <td style={{ padding: '12px 20px', color: '#aaa' }}>{res.mode}</td>
                    <td style={{ padding: '12px 20px', color: '#F4D03F', fontSize: '0.9rem' }}>{res.qAlpha}</td>
                    <td style={{ padding: '12px 20px', color: '#5DADE2', fontSize: '0.9rem' }}>{res.qBeta}</td>
                    <td style={{ padding: '12px 20px', color: '#E74C3C', fontSize: '0.9rem' }}>{res.qEC}</td>
                    <td style={{ padding: '12px 20px', color: '#E0E1DD', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                      {formatActivity(res.mbq)}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                      No viable candidates could produce this reading.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReverseResponderModule;
