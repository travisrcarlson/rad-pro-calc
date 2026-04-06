import React, { useState, useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import PlotComponent from 'react-plotly.js';
const Plot = (PlotComponent as any).default || PlotComponent;
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
  
  const secStr = nuc['Half-Life (s)'];
  if (secStr && String(secStr).trim() !== '') {
     const val = parseFloat(secStr);
     if (!isNaN(val) && val > 0) return val;
  }

  const hlStr = nuc['Half-Life'];
  if (!hlStr) return Infinity;
  const parts = String(hlStr).trim().split(' ');
  const val = parseFloat(parts[0]);
  if (isNaN(val)) return Infinity;
  
  if (parts.length < 2) return val;
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
  const [sliderPct, setSliderPct] = useState<number>(0); // 0 to 100 scale

  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date(Date.now() + 5*31557600*1000).toISOString().split('T')[0]);

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
    const cData: any[] = [];
    const visited = new Set<string>();

    const buildPath = (currentNuclide: any, step: number) => {
      if (!currentNuclide || visited.has(currentNuclide.Nuclide) || step > 20) return;
      visited.add(currentNuclide.Nuclide);
      pathIds.push(currentNuclide.Nuclide);
      cData.push(currentNuclide);

      const color = getColor(currentNuclide['Decay Mode'], currentNuclide['Half-Life']);
      
      const maxPerRow = 5;
      const row = Math.floor(step / maxPerRow);
      const col = step % maxPerRow;

      const currentX = col * 260; 
      const currentY = row * 240 + 50; 

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
          width: 120,
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
           const modeColor = getColor(mStr, '1 s'); 
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
        
        let transX = currentX + 135; 
        let transY = currentY + 15;
        let transTPos = 'left';
        let transSPos = 'right';

        if (isWrapEdge) {
           transX = currentX + 10; 
           transY = currentY + 110;
           transTPos = 'top';
           transSPos = 'left';
        }

        ns.push({
           id: transId,
           position: { x: transX, y: transY },
           sourcePosition: transSPos,
           targetPosition: transTPos,
           data: { label: <div style={{ padding: '2px', textAlign: 'center' }}>{emissionsElements}</div> },
           style: { border: '1px solid #333', borderRadius: '6px', background: '#0a0a0a', width: 'auto', maxWidth: 105, whiteSpace: 'normal', padding: '4px', zIndex: 15 }
        });

        es.push({ id: `e1-${currentNuclide.Nuclide}-${transId}`, source: currentNuclide.Nuclide, target: transId, type: 'default', style: { stroke: '#E0E1DD', strokeWidth: 2 } });
        es.push({ id: `e2-${transId}-${daughter.Nuclide}`, source: transId, target: daughter.Nuclide, type: isWrapEdge ? 'smoothstep' : 'default', markerEnd: { type: MarkerType.ArrowClosed, color: '#E0E1DD' }, style: { stroke: '#E0E1DD', strokeWidth: 2 } });
        
        buildPath(daughter, step + 1);
      }
    };

    buildPath(selectedIsotope, 0);
    return { nodes: ns, edges: es, activePathIds: pathIds, chainData: cData };
  }, [selectedIsotope]);

  const handleIsotopeClick = (isotopeData: any) => {
    setSelectedIsotope(isotopeData);
    if (isotopeData) setSearchSymbol(isotopeData.Symbol);
  };

  // --- Bateman Solver ---
  const yields = useMemo(() => {
    if (chainData.length === 0) return [];
    const lambdas = chainData.map(n => {
       const T12 = parseHalfLifeSeconds(n);
       return T12 === Infinity ? 0 : Math.LN2 / T12;
    });

    const t_sec_max = timeValue * timeUnit;
    const t_sec = t_sec_max * (sliderPct / 100);
    const A0_Bq = initialActivity * 1e6;
    const N1_0 = lambdas[0] > 0 ? A0_Bq / lambdas[0] : A0_Bq; 

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
                 if (Math.abs(diff) < 1e-35) diff = 1e-25; 
                 denoms.push(diff);
               }
            }
            let C_j = 1.0;
            for (let c = 0; c < i; c++) {
               C_j *= (factors[c] / denoms[c]);
            }
            N_t += C_j * Math.exp(-lambdas[j] * t_sec);
         }
         currentAtoms = Math.max(0, N1_0 * N_t); 
       }
       return currentAtoms;
    });

    const finalYields = [];
    let prevConsumed = 0;

    for (let i = 0; i < chainData.length; i++) {
        const arrived = (i === 0) ? N1_0 : prevConsumed;
        const current = yieldsData[i];
        const consumed = Math.max(0, arrived - current);

        finalYields.push({ arrived, current, consumed, lambda: lambdas[i] });
        prevConsumed = consumed;
    }
    
    return finalYields;
  }, [chainData, initialActivity, timeValue, timeUnit, sliderPct]);

  // --- Search Logic ---
  const uniqueSymbols = useMemo(() => Array.from(new Set(allNuclides.map(n => n.Symbol))).sort(), []);
  const [searchSymbol, setSearchSymbol] = useState<string>('U');
  const availableIsotopes = useMemo(() => allNuclides.filter(n => n.Symbol === searchSymbol).sort((a,b) => (a.Z+a.N) - (b.Z+b.N)), [searchSymbol]);

  // --- Display spectrum data for Quadrant 2 ---
  const spectrumPlotData = useMemo(() => {
     if (!selectedIsotope || chainData.length === 0 || yields.length === 0) return { traces: [], annotations: [] };
     
     const traces: any[] = [];
     const annotations: any[] = [];
     
     // Map instantaneous activities
     const activities = yields.map(y => (y.current * y.lambda) / 1e6); // MBq
     const maxActivity = Math.max(0.000001, ...activities);
     
     // 1. Mono-energetic Gaussian Peak Simulator (Alpha, Gammas, EC)
     const makeSpike = (energy: number, height: number, name: string, color: string) => {
         const x: number[] = [];
         const y: number[] = [];
         const sigma = 0.02; // 20 keV simulated detector resolution
         for (let e = Math.max(0, energy - 0.15); e <= energy + 0.15; e += 0.002) {
             x.push(e);
             y.push(height * Math.exp(-Math.pow(e - energy, 2) / (2 * sigma * sigma)));
         }
         return {
             x, y,
             type: 'scatter', mode: 'lines', fill: 'tozeroy',
             name: name, line: { color, width: 2 }, hoverinfo: 'none', // Removed hard-to-read hover
             opacity: 0.6
         };
     };

     // 2. Continuous Beta Fermi Distribution Simulator
     const makeBetaContinuum = (qMax: number, height: number, name: string, color: string) => {
         const x: number[] = [];
         const y: number[] = [];
         for (let e = 0; e <= qMax; e += qMax / 100) {
             x.push(e);
             const intensity = Math.sqrt(e) * Math.pow(qMax - e, 2);
             y.push(intensity);
         }
         // Normalize amplitude
         const maxY = Math.max(...y);
         if (maxY > 0) {
            for(let i=0; i<y.length; i++) y[i] = (y[i] / maxY) * height;
         }
         return {
             x, y,
             type: 'scatter', mode: 'lines', fill: 'tozeroy',
             name: name, line: { color, width: 2 }, hoverinfo: 'none', // Disable hover on beta to favor box annotations
             opacity: 0.6
         };
     };

     // Render all descendant peaks
     chainData.forEach((node, idx) => {
         const current_MBq = activities[idx];
         if (node['Half-Life'] === 'STABLE') return;

         let relativeScale = (current_MBq / maxActivity) * 100;
         let isGhosted = false;

         // If isotope is dead or unborn, keep it visible as a 'ghost' trace 
         // so users know its characteristic line exists in this chain's potential spectrum
         if (relativeScale < 2) {
             relativeScale = 2; // Flat 2% baseline height
             isGhosted = true;
         }
         
         const addAnnotation = (xId: number, yId: number, title: string, sub: string, color: string, staggerStep: number, ghosted: boolean) => {
             const yOffset = -30 - ((idx * 3 + staggerStep) % 6) * 18;
             annotations.push({
                 x: xId, y: yId,
                 text: `<b>${title}</b><br>${sub}`,
                 showarrow: true, arrowhead: 2, arrowcolor: ghosted ? '#444' : color,
                 ax: 0, ay: yOffset,
                 bgcolor: ghosted ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.85)',
                 bordercolor: ghosted ? '#333' : color, borderwidth: 1, borderpad: 4,
                 font: { color: ghosted ? '#666' : color, size: 10 }
             });
         };

         // Apply ghost transparency mapping to traces
         const applyGhost = (trace: any) => {
             if (isGhosted) {
                 trace.opacity = 0.15;
                 trace.line.color = '#555';
             }
             return trace;
         };

         if (node['Q-Alpha']) {
             const e = parseFloat(node['Q-Alpha']) / 1000;
             if (e > 0) {
                 traces.push(applyGhost(makeSpike(e, relativeScale, `${node.Nuclide} α`, '#F4D03F')));
                 addAnnotation(e, relativeScale, `${node.Nuclide} α`, `${e.toFixed(2)} MeV`, '#F4D03F', 0, isGhosted);
             }
         }
         if (node['Q-Beta']) {
             const e = parseFloat(node['Q-Beta']) / 1000;
             if (e > 0) {
                 const height = relativeScale * 0.8;
                 traces.push(applyGhost(makeBetaContinuum(e, height, `${node.Nuclide} β⁻`, '#5DADE2')));
                 addAnnotation(e * 0.33, height, `${node.Nuclide} β⁻`, `Q=${e.toFixed(2)} MeV`, '#5DADE2', 1, isGhosted);
             }
         }
         if (node['Q-EC']) {
             const e = parseFloat(node['Q-EC']) / 1000;
             if (e > 0) {
                 const height = relativeScale * 0.6;
                 traces.push(applyGhost(makeSpike(e, height, `${node.Nuclide} EC/β⁺`, '#E74C3C')));
                 addAnnotation(e, height, `${node.Nuclide} EC/β⁺`, `${e.toFixed(2)} MeV`, '#E74C3C', 2, isGhosted);
             }
         }
     });

     // Add Baseline
     traces.push({
         x: [0, 10], y: [0, 0],
         mode: 'lines', line: { color: '#444', width: 1 },
         hoverinfo: 'none', showlegend: false
     });

     return { traces, annotations };
  }, [selectedIsotope, chainData, yields]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Module 6 — Decay Kinematics & Yield Solver</h2>
        
        {/* Search Searchbar - Back to the Header! */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '8px' }}>
           <span style={{ fontSize: '0.9rem', color: '#ccc' }}>🔍 Search Isotope:</span>
           <select className="form-control" style={{ width: '160px' }} value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)}>
             {uniqueSymbols.map(sym => (
               <option key={sym} value={sym}>{sym} - {ELEMENT_NAMES[sym] || 'Unknown'}</option>
             ))}
           </select>
           <select className="form-control" style={{ width: '150px' }} value={selectedIsotope ? selectedIsotope.Nuclide : ''} onChange={e => {
              const nuc = allNuclides.find(n => n.Nuclide === e.target.value);
              if (nuc) handleIsotopeClick(nuc);
           }}>
             <option value="" disabled>Select Isotope...</option>
             {availableIsotopes.map(iso => (
               <option key={iso.Nuclide} value={iso.Nuclide}>{iso.Nuclide}</option>
             ))}
           </select>
        </div>
      </div>
      
      {/* FULL VIEWPORT 4-QUADRANT GRID */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '15px', paddingBottom: '15px', minHeight: 0, overflow: 'hidden' }}>
        
        {/* Q1: Top Left - Karlsruhe Chart */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0a0a0a', minHeight: 0, display: 'flex' }}>
          <KarlsruheSvgChart 
            onIsotopeClick={handleIsotopeClick} 
            onClearSelection={() => setSelectedIsotope(null)}
            activePathIds={activePathIds} 
          />
        </div>

        {/* Q2: Top Right - Energy Spectrum Plotly */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '10px 15px', borderBottom: '1px solid #333', backgroundColor: '#0a0a0a' }}>
             <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#E0E1DD' }}>Decay Energy Spectrum (Q-Values)</h3>
             <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Simulated Detector Output (MeV)</p>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {selectedIsotope ? (
               <Plot
                 data={spectrumPlotData.traces as any}
                 layout={{
                    autosize: true, margin: { t: 40, l: 60, r: 20, b: 40 },
                    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    yaxis: { title: 'Relative Intensity', color: '#aaa', gridcolor: '#333', showticklabels: true, zeroline: false },
                    xaxis: { title: 'Energy (MeV)', color: '#aaa', gridcolor: '#333', zeroline: false, rangemode: 'tozero' }, 
                    font: { color: '#E0E1DD' }, showlegend: false,
                    annotations: spectrumPlotData.annotations
                 }}
                 useResizeHandler style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
               />
            ) : (
               <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                 No isotope loaded for spectral analysis.
               </div>
            )}
          </div>
        </div>

        {/* Q3: Bottom Left - React Flow Pathway */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative', backgroundColor: '#0a0a0a', minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {selectedIsotope ? (
             <div style={{ flex: 1, height: '100%' }}>
               <ReactFlow 
                nodes={nodes} edges={edges} fitView
                attributionPosition="bottom-right" key={selectedIsotope.Nuclide}
              >
                <Background color="#555" gap={16} />
                <Controls />
                <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '4px', color: '#fff' }}>
                  <strong>Linear Chain: {selectedIsotope.Nuclide}</strong>
                </div>
              </ReactFlow>
             </div>
          ) : (
            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Click ANY isotope box on the chart to generate its strict linear decay kinematics mapping.
            </div>
          )}
        </div>

        {/* Q4: Bottom Right - Bateman Yield Calculator (Restoring Original Full Table Detail!) */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.02)', minHeight: 0, overflow: 'hidden' }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '10px', marginTop: 0 }}>Bateman Yield Calculator</h3>
          
          {/* New 4D Timeline Scrubber (Moved Up) */}
          <div style={{ padding: '10px 15px', backgroundColor: 'rgba(52, 152, 219, 0.05)', border: '1px solid rgba(52, 152, 219, 0.4)', borderRadius: '6px', marginBottom: '15px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3498db', fontWeight: 'bold', marginBottom: '5px' }}>
                <span>Timeline Scrubber ($t_{'{'}sim{'}'}$)</span>
                <span style={{ fontSize: '1.1rem', textShadow: '0 0 5px rgba(52, 152, 219, 0.5)' }}>{(() => {
                   const t = timeValue * (sliderPct / 100);
                   return t.toFixed(2) + (timeUnit === 31557600 ? ' Years' : timeUnit === 86400 ? ' Days' : ' Secs');
                })()}</span>
             </div>
             <input type="range" className="form-control" style={{ width: '100%', cursor: 'ew-resize' }} min="0" max="100" step="0.1" value={sliderPct} onChange={e => setSliderPct(Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', flex: 1, gap: '15px', minHeight: 0 }}>
             
             {/* Left Side: Entry Data */}
             <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '5px' }}>
                 <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <label className="form-label" style={{ color: '#fff' }}>Initial Parent Activity</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                     <input type="number" className="form-control" value={initialActivity} onChange={e => setInitialActivity(Number(e.target.value))} />
                     <span style={{ fontSize: '0.8rem', color: '#888' }}>MBq</span>
                   </div>
                   {chainData.length > 0 && (
                      <div style={{ marginTop: '5px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                         Mass: {(() => {
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

                 <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <label className="form-label" style={{ color: '#66AAFF', fontSize: '0.8rem' }}>Start Date</label>
                     <input type="date" className="form-control" value={startDate} onChange={e => {
                         setStartDate(e.target.value);
                         const d1 = new Date(e.target.value);
                         const d2 = new Date(endDate);
                         if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                             const diff = (d2.getTime() - d1.getTime()) / 1000;
                             if (diff > 0) { setTimeUnit(86400); setTimeValue(parseFloat((diff / 86400).toFixed(2))); }
                         }
                     }} />
                 </div>

                 <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <label className="form-label" style={{ color: '#66AAFF', fontSize: '0.8rem' }}>End Date</label>
                     <input type="date" className="form-control" value={endDate} onChange={e => {
                         setEndDate(e.target.value);
                         const d1 = new Date(startDate);
                         const d2 = new Date(e.target.value);
                         if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                             const diff = (d2.getTime() - d1.getTime()) / 1000;
                             if (diff > 0) { setTimeUnit(86400); setTimeValue(parseFloat((diff / 86400).toFixed(2))); }
                         }
                     }} />
                 </div>

                 <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <label className="form-label" style={{ fontSize: '0.8rem' }}>Max Analysis Time</label>
                   <div style={{ display: 'flex', gap: '5px' }}>
                     <input type="number" className="form-control" style={{ flex: 1 }} value={timeValue} onChange={e => {
                         const v = Number(e.target.value); setTimeValue(v);
                         const d1 = new Date(startDate);
                         if (!isNaN(d1.getTime())) setEndDate(new Date(d1.getTime() + (v * timeUnit * 1000)).toISOString().split('T')[0]);
                     }} />
                     <select className="form-control" style={{ width: '80px' }} value={timeUnit} onChange={e => {
                         const u = Number(e.target.value); setTimeUnit(u);
                         const d1 = new Date(startDate);
                         if (!isNaN(d1.getTime())) setEndDate(new Date(d1.getTime() + (timeValue * u * 1000)).toISOString().split('T')[0]);
                     }}>
                       <option value={1}>Secs</option>
                       <option value={86400}>Days</option>
                       <option value={31557600}>Yrs</option>
                     </select>
                   </div>
                 </div>
             </div>

             {/* Right Side: Generated Isotopes Table */}
             <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #444', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1d21', zIndex: 5 }}>
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
                        const massA = node.Z + node.N;
                        
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
                               <div style={{ fontSize: '0.70rem', color: '#888' }}>{formatMass(activeMassGrams)}</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#e67e22', borderLeft: '1px solid #444' }}>
                               <div>{consumedStr}</div>
                               <div style={{ fontSize: '0.70rem', color: '#888' }}>{formatMass(consumedMassGrams)}</div>
                            </td>
                          </tr>
                        );
                     })}
                  </tbody>
                </table>
                {chainData.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '30px', color: '#666' }}>Select an isotope to begin tracking yields.</div>
                )}
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};
export default DecayModule;
