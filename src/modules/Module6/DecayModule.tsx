import React, { useState, useMemo, useEffect } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import KarlsruheSvgChart from './KarlsruheChart';
import allNuclides from '../../data/all_nuclides.json';

const ELEMENT_NAMES: Record<string, string> = {
  "H": "Hydrogen", "He": "Helium", "Li": "Lithium", "Be": "Beryllium", "B": "Boron", "C": "Carbon", "N": "Nitrogen", "O": "Oxygen", "F": "Fluorine", "Ne": "Neon",
  "Na": "Sodium", "Mg": "Magnesium", "Al": "Aluminum", "Si": "Silicon", "P": "Phosphorus", "S": "Sulfur", "Cl": "Chlorine", "Ar": "Argon", "K": "Potassium", "Ca": "Calcium",
  "Sc": "Scandium", "Ti": "Titanium", "V": "Vanadium", "Cr": "Chromium", "Mn": "Manganese", "Fe": "Iron", "Co": "Cobalt", "Ni": "Nickel", "Cu": "Copper", "Zn": "Zinc",
  "Ga": "Gallium", "Ge": "Germanium", "As": "Arsenic", "Se": "Selenium", "Br": "Bromine", "Kr": "Krypton", "Rb": "Rubidium", "Sr": "Strontium", "Y": "Yttrium", "Zr": "Zirconium",
  "Nb": "Niobium", "Mo": "Molybdenum", "Tc": "Technetium", "Ru": "Ruthenium", "Rh": "Rhodium", "Pd": "Palladium", "Ag": "Silver", "Cd": "Cadmium", "In": "Indium", "Sn": "Tin",
  "Sb": "Antimony", "Te": "Tellurium", "I": "Iodine", "Xe": "Xenon", "Cs": "Cesium", "Ba": "Barium", "La": "Lanthanum", "Ce": "Cerium", "Pr": "Praseodymium", "Nd": "Neodymium",
  "Pm": "Promethium", "Sm": "Samarium", "Eu": "Europium", "Gd": "Gadolinium", "Tb": "Terbium", "Dy": "Dysprosium", "Ho": "Holmium", "Er": "Erbium", "Tm": "Thulium",
  "Yb": "Ytterbium", "Lu": "Lutetium", "Hf": "Hafnium", "Ta": "Tantalum", "W": "Tungsten", "Re": "Rhenium", "Os": "Osmium", "Ir": "Iridium", "Pt": "Platinum", "Au": "Gold",
  "Hg": "Mercury", "Tl": "Thallium", "Pb": "Lead", "Bi": "Bismuth", "Po": "Polonium", "At": "Astatine", "Rn": "Radon", "Fr": "Francium", "Ra": "Radium", "Ac": "Actinium",
  "Th": "Thorium", "Pa": "Protactinium", "U": "Uranium", "Np": "Neptunium", "Pu": "Plutonium", "Am": "Americium", "Cm": "Curium", "Bk": "Berkelium", "Cf": "Californium",
  "Es": "Einsteinium", "Fm": "Fermium", "Md": "Mendelevium", "No": "Nobelium", "Lr": "Lawrencium", "Rf": "Rutherfordium", "Db": "Dubnium", "Sg": "Seaborgium", "Bh": "Bohrium",
  "Hs": "Hassium", "Mt": "Meitnerium", "Ds": "Darmstadtium", "Rg": "Roentgenium", "Cn": "Copernicium", "Nh": "Nihonium", "Fl": "Flerovium", "Mc": "Moscovium", "Lv": "Livermorium",
  "Ts": "Tennessine", "Og": "Oganesson"
};

const parseHalfLifeSeconds = (nuc: any): number => {
  if (!nuc || nuc['Half-Life'] === 'STABLE' || String(nuc['Decay Mode']).toUpperCase() === 'STABLE') return Infinity;
  
  // Use the pre-calculated seconds column if available
  const secStr = nuc['Half-Life (s)'];
  if (secStr && String(secStr).trim() !== '') {
     const val = parseFloat(secStr);
     if (!isNaN(val) && val > 0) return val;
  }

  // Fallback to text parsing
  const hlStr = nuc['Half-Life'];
  if (!hlStr) return Infinity;
  const parts = String(hlStr).trim().split(' ');
  const val = parseFloat(parts[0]);
  if (isNaN(val)) return Infinity;
  
  if (parts.length < 2) return val; // Assume seconds if no unit provided
  const unit = parts[1].toLowerCase();
  if (unit.startsWith('s')) return val;
  if (unit.startsWith('m')) return val * 60;
  if (unit.startsWith('h')) return val * 3600;
  if (unit.startsWith('d')) return val * 86400;
  if (unit.startsWith('y') || unit.startsWith('a')) return val * 31557600;
  return val;
};

const DecayModule: React.FC = () => {
  const [selectedIsotope, setSelectedIsotope] = useState<any | null>(null);

  // Yield Calculator State
  const [initialActivity, setInitialActivity] = useState<number>(1);
  const [timeValue, setTimeValue] = useState<number>(5);
  const [timeUnit, setTimeUnit] = useState<number>(31557600); // default years

  const getColor = (mode: string, hl: string) => {
    const m = String(mode).toUpperCase();
    if (hl === 'STABLE' || m === 'STABLE') return '#2C3E50';
    if (m.includes('A')) return '#F4D03F';
    if (m.includes('B-')) return '#5DADE2';
    if (m.includes('B+') || m.includes('EC')) return '#E74C3C';
    if (m.includes('SF')) return '#2ECC71';
    return '#EcF0F1';
  };

  const { nodes, edges, activePathIds, chainData } = useMemo(() => {
    if (!selectedIsotope) return { nodes: [], edges: [], activePathIds: [], chainData: [] };
    
    const ns: any[] = [];
    const es: any[] = [];
    const pathIds: string[] = [];
    const cData: any[] = []; // Array of nuclides in the sequential chain
    const visited = new Set<string>();

    const buildPath = (currentNuclide: any, step: number) => {
      if (!currentNuclide || visited.has(currentNuclide.Nuclide) || step > 20) return;
      visited.add(currentNuclide.Nuclide);
      pathIds.push(currentNuclide.Nuclide);
      cData.push(currentNuclide);

      const color = getColor(currentNuclide['Decay Mode'], currentNuclide['Half-Life']);
      const isUnknown = color === '#EcF0F1';

      // --- Wrapping Row Layout Logic (Typewriter Style) ---
      const maxPerRow = 5;
      const row = Math.floor(step / maxPerRow);
      const col = step % maxPerRow;

      const currentX = col * 260; // Highly compacted spacing
      const currentY = row * 240 + 50; // Extra vertical room for tight wrapping

      let sPos = 'right';
      let tPos = 'left';
      let isWrapEdge = false;

      if (col === maxPerRow - 1) {
        sPos = 'bottom';
        isWrapEdge = true;
      }
      if (step > 0 && col === 0) {
        tPos = 'top'; 
      }

      ns.push({
        id: currentNuclide.Nuclide,
        position: { x: currentX, y: currentY },
        sourcePosition: sPos,
        targetPosition: tPos,
        data: { 
          label: (
            <div style={{ padding: '6px', textAlign: 'center', fontSize: '0.8rem' }}>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{currentNuclide.Nuclide}</strong><br/>
              <span style={{ color: '#aaa', fontSize: '0.75rem' }}>
                {currentNuclide['Half-Life'] === 'STABLE' ? 'Stable' : `T½ = ${currentNuclide['Half-Life']}`}
              </span>
            </div>
          ) 
        },
        style: { 
          border: '1px solid #444',
          borderTop: `8px solid ${color}`, 
          borderRadius: '8px', 
          background: step === 0 ? '#2a2d34' : '#1a1d21', 
          width: 120, // Narrower isotope cards
          boxShadow: step === 0 ? `0 0 15px ${color}66` : 'none',
          padding: 0,
          zIndex: 10
        }
      });

      const mode = String(currentNuclide['Decay Mode']).toUpperCase();
      if (mode === 'STABLE' || currentNuclide['Half-Life'] === 'STABLE' || !mode) return;

      let nextZ = currentNuclide.Z;
      let nextN = currentNuclide.N;

      if (mode.includes('A')) {
        nextZ -= 2; nextN -= 2;
      } else if (mode.includes('B-')) {
        nextZ += 1; nextN -= 1;
      } else if (mode.includes('B+') || mode.includes('EC')) {
        nextZ -= 1; nextN += 1;
      } else if (mode.includes('IT')) {
        // Isomeric transition stays same coords
      } else if (mode.includes('SF')) {
        return; 
      } else {
        return;
      }

      const daughter = allNuclides.find(n => n.Z === nextZ && n.N === nextN);
      if (daughter) {
        // Resolve all possible branches to display in transition box
        const getQValue = (mStr: string) => {
           let qs = '';
           if (mStr.includes('A') && currentNuclide['Q-Alpha']) qs = `${(parseFloat(currentNuclide['Q-Alpha']) / 1000).toFixed(2)} MeV`;
           else if (mStr.includes('B-') && currentNuclide['Q-Beta']) qs = `${(parseFloat(currentNuclide['Q-Beta']) / 1000).toFixed(2)} MeV`;
           else if ((mStr.includes('B+') || mStr.includes('EC')) && currentNuclide['Q-EC']) qs = `${(parseFloat(currentNuclide['Q-EC']) / 1000).toFixed(2)} MeV`;
           return qs;
        };

        const emissionsElements: React.ReactNode[] = [];
        const processEmission = (modeRaw: string, percRaw: string) => {
           if (!modeRaw || modeRaw.trim() === '') return;
           const perc = String(percRaw).trim() !== '' ? percRaw : '100';
           const mStr = String(modeRaw).toUpperCase();
           const modeColor = getColor(mStr, '1 s'); // use a dummy short half-life to guarantee color assignment
           const modeLabel = modeRaw.replace('B-', 'β⁻').replace('B+', 'β⁺').replace('A', 'α');
           const qv = getQValue(mStr);
           
           emissionsElements.push(
             <div key={modeRaw} style={{ color: modeColor, padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <strong style={{ fontSize: '0.8rem' }}>{modeLabel} ({perc}%)</strong>
               {qv && <div style={{ fontSize: '0.65rem', color: '#aaa' }}>{qv}</div>}
             </div>
           );
        };

        processEmission(currentNuclide['Decay Mode'], currentNuclide['Decay %']);
        if (currentNuclide['Decay 2']) processEmission(currentNuclide['Decay 2'], currentNuclide['Decay 2 %']);
        if (currentNuclide['Decay 3']) processEmission(currentNuclide['Decay 3'], currentNuclide['Decay 3 %']);

        const transId = `t-${currentNuclide.Nuclide}-${daughter.Nuclide}`;
        
        let transX = currentX + 135; // Centered precisely in the new 140px gap
        let transY = currentY + 15;
        let transTPos = 'left';
        let transSPos = 'right';

        if (isWrapEdge) {
           transX = currentX + 10; // Centered under the 120px Isotope box
           transY = currentY + 110;
           transTPos = 'top';
           transSPos = 'left';
        }

        ns.push({
           id: transId,
           position: { x: transX, y: transY },
           sourcePosition: transSPos,
           targetPosition: transTPos,
           data: {
             label: (
               <div style={{ padding: '2px', textAlign: 'center' }}>
                 {emissionsElements}
               </div>
             )
           },
           style: {
             border: '1px solid #333',
             borderRadius: '6px',
             background: '#0a0a0a',
             width: 'auto',
             maxWidth: 105,
             whiteSpace: 'normal', // Let text wrap to prevent horizontal collisions
             padding: '4px',
             zIndex: 15
           }
        });

        es.push({
          id: `e1-${currentNuclide.Nuclide}-${transId}`,
          source: currentNuclide.Nuclide,
          target: transId,
          type: 'default',
          style: { stroke: '#E0E1DD', strokeWidth: 2 }
        });

        es.push({
          id: `e2-${transId}-${daughter.Nuclide}`,
          source: transId,
          target: daughter.Nuclide,
          type: isWrapEdge ? 'smoothstep' : 'default',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#E0E1DD' },
          style: { stroke: '#E0E1DD', strokeWidth: 2 }
        });
        
        buildPath(daughter, step + 1);
      }
    };

    buildPath(selectedIsotope, 0);
    return { nodes: ns, edges: es, activePathIds: pathIds, chainData: cData };
  }, [selectedIsotope]);

  const handleIsotopeClick = (isotopeData: any) => {
    setSelectedIsotope(isotopeData);
  };

  // --- Bateman Equation Solver ---
  const calculateYields = () => {
    if (chainData.length === 0) return [];
    
    // 1. Calculate decay constants (lambda) in s^-1
    const lambdas = chainData.map(n => {
       const T12 = parseHalfLifeSeconds(n);
       return T12 === Infinity ? 0 : Math.LN2 / T12;
    });

    const t_sec = timeValue * timeUnit;
    const A0_Bq = initialActivity * 1e6;
    const N1_0 = lambdas[0] > 0 ? A0_Bq / lambdas[0] : A0_Bq; // Base atoms pool

    const yieldsData = chainData.map((_n, i) => {
       let currentAtoms = 0;
       
       if (i === 0) {
         currentAtoms = N1_0 * Math.exp(-lambdas[0] * t_sec);
       } else {
         let N_t = 0;
         const factors = lambdas.slice(0, i);
         for (let j = 0; j <= i; j++) {
            const denoms = [];
            for (let p = 0; p <= i; p++) {
               if (p !== j) {
                 let diff = lambdas[p] - lambdas[j];
                 if (Math.abs(diff) < 1e-35) diff = 1e-25; // Anti-zero epsilon
                 denoms.push(diff);
               }
            }
            // Sequentially multiply fractions to avoid overflow limits!
            let C_j = 1.0;
            for (let c = 0; c < i; c++) {
               C_j *= (factors[c] / denoms[c]);
            }
            N_t += C_j * Math.exp(-lambdas[j] * t_sec);
         }
         currentAtoms = Math.max(0, N1_0 * N_t); // Wipe out tiny negative floats
       }
       return currentAtoms;
    });

    // Integrated Mass-Conservation Tracking
    const finalYields = [];
    let prevConsumed = 0;

    for (let i = 0; i < chainData.length; i++) {
        let arrived = (i === 0) ? N1_0 : prevConsumed;
        let current = yieldsData[i];
        let consumed = Math.max(0, arrived - current);

        finalYields.push({
           arrived,
           current,
           consumed,
           lambda: lambdas[i]
        });
        prevConsumed = consumed;
    }
    
    return finalYields;
  };

  const yields = useMemo(() => calculateYields(), [chainData, initialActivity, timeValue, timeUnit]);

  // --- Search Tool Logic ---
  const uniqueSymbols = useMemo(() => Array.from(new Set(allNuclides.map(n => n.Symbol))).sort(), []);
  
  // Keep dropdowns synced with chart clicks
  const [searchSymbol, setSearchSymbol] = useState<string>('U');
  const availableIsotopes = useMemo(() => allNuclides.filter(n => n.Symbol === searchSymbol).sort((a,b) => (a.Z+a.N) - (b.Z+b.N)), [searchSymbol]);

  useEffect(() => {
     if (selectedIsotope) {
        setSearchSymbol(selectedIsotope.Symbol);
     }
  }, [selectedIsotope]);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchSymbol(e.target.value);
  };

  const handleIsotopeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nucLabel = e.target.value;
    if (!nucLabel) return;
    const nuc = allNuclides.find(n => n.Nuclide === nucLabel);
    if (nuc) {
       setSelectedIsotope(nuc);
    }
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Module 6 — Decay Kinematics & Yield Solver</h2>
        
        {/* Search Searchbar */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '8px' }}>
           <span style={{ fontSize: '0.9rem', color: '#ccc' }}>🔍 Search Isotope:</span>
           <select className="form-control" style={{ width: '160px' }} value={searchSymbol} onChange={handleSymbolChange}>
             {uniqueSymbols.map(sym => (
               <option key={sym} value={sym}>{sym} - {ELEMENT_NAMES[sym] || 'Unknown'}</option>
             ))}
           </select>
           
           <select className="form-control" style={{ width: '150px' }} value={selectedIsotope ? selectedIsotope.Nuclide : ''} onChange={handleIsotopeSelect}>
             <option value="" disabled>Select Isotope...</option>
             {availableIsotopes.map(iso => (
               <option key={iso.Nuclide} value={iso.Nuclide}>{iso.Nuclide}</option>
             ))}
           </select>
        </div>
      </div>
      
      {/* Top Half: Karlsruhe Chart */}
      <div style={{ height: '50%', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
        <KarlsruheSvgChart 
          onIsotopeClick={handleIsotopeClick} 
          onClearSelection={() => setSelectedIsotope(null)}
          activePathIds={activePathIds} 
        />
      </div>

      {/* Bottom Half: Linear Graph & Bateman Tool split */}
      <div style={{ flex: 1, display: 'flex', gap: '15px' }}>
        
        {/* React Flow Linear Graph */}
        <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative' }}>
          {selectedIsotope ? (
             <ReactFlow 
              nodes={nodes} 
              edges={edges}
              fitView
              attributionPosition="bottom-right"
              key={selectedIsotope.Nuclide}
            >
              <Background color="#555" gap={16} />
              <Controls />
              <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '4px', color: '#fff' }}>
                <strong>Linear Chain: {selectedIsotope.Nuclide}</strong>
              </div>
            </ReactFlow>
          ) : (
            <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Click ANY isotope box on the chart to generate its strict linear decay kinematics mapping.
            </div>
          )}
        </div>

        {/* Bateman Yield Calculator */}
        <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', overflowY: 'auto' }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '15px' }}>Bateman Yield Calculator</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
             Input an initial source activity and elapsed time. The engine uses analytical Bateman differential calculus to project the exact sequential quantities (100% principal branch approximation).
          </p>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
             <div className="form-group" style={{ flex: 1 }}>
               <label className="form-label">Initial Parent Activity (MBq)</label>
               <input type="number" className="form-control" value={initialActivity} onChange={e => setInitialActivity(Number(e.target.value))} />
               {chainData.length > 0 && (
                  <div style={{ marginTop: '5px', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                     Initial Mass: {(() => {
                         const parent = chainData[0];
                         const T12 = parseHalfLifeSeconds(parent);
                         const lambda = T12 === Infinity ? 0 : Math.LN2 / T12;
                         if (lambda === 0) return '~0 g';
                         const N0_Atoms = (initialActivity * 1e6) / lambda;
                         const mGrams = (N0_Atoms * (parent.Z + parent.N)) / 6.022e23;
                         
                         if (mGrams === 0 || mGrams < 1e-15) return '~0 g';
                         if (mGrams < 1e-6) return `${(mGrams * 1e9).toFixed(4)} ng`;
                         if (mGrams < 1e-3) return `${(mGrams * 1e6).toFixed(4)} µg`;
                         if (mGrams < 1) return `${(mGrams * 1e3).toFixed(4)} mg`;
                         if (mGrams < 1e3) return `${mGrams.toFixed(4)} g`;
                         return `${(mGrams / 1e3).toFixed(4)} kg`;
                     })()}
                  </div>
               )}
             </div>
             
             <div className="form-group" style={{ flex: 1 }}>
               <label className="form-label">Elapsed Time ($t$)</label>
               <input type="number" className="form-control" value={timeValue} onChange={e => setTimeValue(Number(e.target.value))} />
             </div>
             
             <div className="form-group" style={{ flex: 1 }}>
               <label className="form-label">Time Unit</label>
               <select className="form-control" value={timeUnit} onChange={e => setTimeUnit(Number(e.target.value))}>
                 <option value={1}>Seconds</option>
                 <option value={86400}>Days</option>
                 <option value={31557600}>Years</option>
               </select>
              </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                   <th style={{ padding: '8px' }}>Gen</th>
                   <th style={{ padding: '8px' }}>Isotope</th>
                   <th style={{ padding: '8px' }}>$T_{'{'}1/2{'}'}$</th>
                   <th style={{ padding: '8px', textAlign: 'right' }}>Active Yield</th>
                   <th style={{ padding: '8px', textAlign: 'right', borderLeft: '1px solid #444' }}>Consumed Yield</th>
                 </tr>
               </thead>
               <tbody>
                  {chainData.map((node, idx) => {
                     const y = yields[idx];
                     if (!y) return null;
                     
                     const isStable = y.lambda === 0;
                     const activityMBq = (y.current * y.lambda) / 1e6;
                     
                     const activeStr = isStable 
                        ? (y.current < 1 ? '~0 Atoms' : `${y.current.toExponential(3)} Atoms`) 
                        : (activityMBq < 1e-6 && activityMBq > 0 ? `${y.current.toExponential(3)} Atoms` : `${activityMBq.toFixed(6)} MBq`);
                     
                     const consumedStr = y.consumed < 1 ? '~0 Atoms' : `${y.consumed.toExponential(3)} Atoms`;

                     const N_A = 6.022e23;
                     const massA = node.Z + node.N; // Atomic mass approx
                     
                     const formatMass = (mGrams: number) => {
                         if (mGrams === 0 || mGrams < 1e-15) return '~0 g';
                         if (mGrams < 1e-6) return `${(mGrams * 1e9).toFixed(4)} ng`;
                         if (mGrams < 1e-3) return `${(mGrams * 1e6).toFixed(4)} µg`;
                         if (mGrams < 1) return `${(mGrams * 1e3).toFixed(4)} mg`;
                         if (mGrams < 1e3) return `${mGrams.toFixed(4)} g`;
                         return `${(mGrams / 1e3).toFixed(4)} kg`;
                     };

                     const activeMassGrams = (y.current * massA) / N_A;
                     const consumedMassGrams = (y.consumed * massA) / N_A;

                     return (
                       <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <td style={{ padding: '8px', color: '#888' }}>{idx}</td>
                         <td style={{ padding: '8px', fontWeight: 'bold' }}>{node.Nuclide}</td>
                         <td style={{ padding: '8px' }}>{node['Half-Life'] === 'STABLE' ? '∞' : node['Half-Life']}</td>
                         <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-success)' }}>
                            <div>{activeStr}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>{formatMass(activeMassGrams)}</div>
                         </td>
                         <td style={{ padding: '8px', textAlign: 'right', color: '#e67e22', borderLeft: '1px solid #444' }}>
                            <div>{consumedStr}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>{formatMass(consumedMassGrams)}</div>
                         </td>
                       </tr>
                     );
                  })}
               </tbody>
             </table>
             {chainData.length === 0 && (
               <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>Select an isotope to begin tracking yields.</div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default DecayModule;
