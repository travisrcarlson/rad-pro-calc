import React, { useState, useMemo } from 'react';
import nuclidesData from '../../data/all_nuclides.json';

interface NuclideRecord {
  Nuclide: string;
  Symbol: string;
  Z: number;
  N: number;
  'Half-Life': string;
  'Decay Mode': string;
  'Decay %': string;
  'Q-Alpha': string;
  'Q-Beta': string;
  'Q-EC': string;
  [key: string]: any;
}

const getDecayBadgeColor = (mode: string) => {
  const m = (mode || '').toUpperCase();
  if (m.includes('A')) return 'var(--badge-alpha)';
  if (m.includes('B-')) return 'var(--badge-beta-minus)';
  if (m.includes('B+')) return 'var(--badge-beta-plus)';
  if (m.includes('IT')) return 'var(--badge-gamma)'; // Isomeric transition (Gamma emission)
  if (m.includes('EC')) return 'var(--badge-ec)';
  if (m.includes('SF')) return 'var(--badge-sf)';
  if (m.includes('N') || m.includes('P')) return '#d35400';
  return '#757575';
};

const getDetectionMethod = (modes: string) => {
  if (!modes) return 'Standard GM Tube';
  const m = modes.toUpperCase();
  if (m.includes('SF') || m.includes('N')) return 'Neutron Proportional (He-3/BF3)';
  if (m.includes('A') && m.includes('IT')) return 'NaI(Tl) Scintillator & ZnS(Ag) Probe';
  if (m.includes('A')) return 'ZnS(Ag) Scintillator / PIPS / CR-39';
  if (m == 'IT' || m == 'G') return 'HPGe Spectrometer / NaI(Tl) Scintillator';
  if (m.includes('B') || m.includes('B-')) return 'Pancake GM / Liquid Scintillation';
  if (m.includes('EC')) return 'Thin-Window NaI / HPGe X-Ray Spectrometer';
  return 'Standard Geiger-Muller (Pancake)';
};

// Map atomic symbols to full element names
const ELEMENT_NAMES: Record<string, string> = {
  'n': 'Neutron', 'H': 'Hydrogen', 'He': 'Helium', 'Li': 'Lithium', 'Be': 'Beryllium',
  'B': 'Boron', 'C': 'Carbon', 'N': 'Nitrogen', 'O': 'Oxygen', 'F': 'Fluorine',
  'Ne': 'Neon', 'Na': 'Sodium', 'Mg': 'Magnesium', 'Al': 'Aluminum', 'Si': 'Silicon',
  'P': 'Phosphorus', 'S': 'Sulfur', 'Cl': 'Chlorine', 'Ar': 'Argon', 'K': 'Potassium',
  'Ca': 'Calcium', 'Sc': 'Scandium', 'Ti': 'Titanium', 'V': 'Vanadium', 'Cr': 'Chromium',
  'Mn': 'Manganese', 'Fe': 'Iron', 'Co': 'Cobalt', 'Ni': 'Nickel', 'Cu': 'Copper',
  'Zn': 'Zinc', 'Ga': 'Gallium', 'Ge': 'Germanium', 'As': 'Arsenic', 'Se': 'Selenium',
  'Br': 'Bromine', 'Kr': 'Krypton', 'Rb': 'Rubidium', 'Sr': 'Strontium', 'Y': 'Yttrium',
  'Zr': 'Zirconium', 'Nb': 'Niobium', 'Mo': 'Molybdenum', 'Tc': 'Technetium', 'Ru': 'Ruthenium',
  'Rh': 'Rhodium', 'Pd': 'Palladium', 'Ag': 'Silver', 'Cd': 'Cadmium', 'In': 'Indium',
  'Sn': 'Tin', 'Sb': 'Antimony', 'Te': 'Tellurium', 'I': 'Iodine', 'Xe': 'Xenon',
  'Cs': 'Cesium', 'Ba': 'Barium', 'La': 'Lanthanum', 'Ce': 'Cerium', 'Pr': 'Praseodymium',
  'Nd': 'Neodymium', 'Pm': 'Promethium', 'Sm': 'Samarium', 'Eu': 'Europium', 'Gd': 'Gadolinium',
  'Tb': 'Terbium', 'Dy': 'Dysprosium', 'Ho': 'Holmium', 'Er': 'Erbium', 'Tm': 'Thulium',
  'Yb': 'Ytterbium', 'Lu': 'Lutetium', 'Hf': 'Hafnium', 'Ta': 'Tantalum', 'W': 'Tungsten',
  'Re': 'Rhenium', 'Os': 'Osmium', 'Ir': 'Iridium', 'Pt': 'Platinum', 'Au': 'Gold',
  'Hg': 'Mercury', 'Tl': 'Thallium', 'Pb': 'Lead', 'Bi': 'Bismuth', 'Po': 'Polonium',
  'At': 'Astatine', 'Rn': 'Radon', 'Fr': 'Francium', 'Ra': 'Radium', 'Ac': 'Actinium',
  'Th': 'Thorium', 'Pa': 'Protactinium', 'U': 'Uranium', 'Np': 'Neptunium', 'Pu': 'Plutonium',
  'Am': 'Americium', 'Cm': 'Curium', 'Bk': 'Berkelium', 'Cf': 'Californium', 'Es': 'Einsteinium',
  'Fm': 'Fermium', 'Md': 'Mendelevium', 'No': 'Nobelium', 'Lr': 'Lawrencium', 'Rf': 'Rutherfordium',
  'Db': 'Dubnium', 'Sg': 'Seaborgium', 'Bh': 'Bohrium', 'Hs': 'Hassium', 'Mt': 'Meitnerium',
  'Ds': 'Darmstadtium', 'Rg': 'Roentgenium', 'Cn': 'Copernicium', 'Nh': 'Nihonium',
  'Fl': 'Flerovium', 'Mc': 'Moscovium', 'Lv': 'Livermorium', 'Ts': 'Tennessine', 'Og': 'Oganesson'
};

const formatQValue = (n: NuclideRecord) => {
  const res = [];
  if (n['Q-Alpha']) res.push(`α: ${n['Q-Alpha']} keV`);
  if (n['Q-Beta']) res.push(`β: ${n['Q-Beta']} keV`);
  if (n['Q-EC']) res.push(`EC: ${n['Q-EC']} keV`);
  return res.join(' | ') || '-';
};

const NuclideTableModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set(['U', 'H', 'Cs', 'Co']));
  
  const [nuclides] = useState<NuclideRecord[]>(() => {
    if (Array.isArray(nuclidesData)) {
      return nuclidesData as unknown as NuclideRecord[];
    }
    return [];
  });

  // Group nuclides by Base Atomic Symbol (Z) directly from IAEA dataset
  const groupedNuclides = useMemo(() => {
    const groups: Record<string, NuclideRecord[]> = {};
    const searchLower = searchTerm.toLowerCase();

    for (const n of nuclides) {
      if (!n.Symbol) continue;
      
      const fullElementName = ELEMENT_NAMES[n.Symbol.trim()] || n.Symbol;
      
      const matchSearch = n.Nuclide.toLowerCase().includes(searchLower) || 
                          fullElementName.toLowerCase().includes(searchLower) ||
                          n.Symbol.toLowerCase() === searchLower ||
                          (n['Decay Mode'] && n['Decay Mode'].toLowerCase().includes(searchLower));
      
      if (!matchSearch && searchTerm !== '') continue;

      const baseElement = n.Symbol.trim();
      if (!groups[baseElement]) {
        groups[baseElement] = [];
      }
      groups[baseElement].push(n);
    }
    return groups;
  }, [searchTerm, nuclides]);

  const toggleElement = (element: string) => {
    const newExp = new Set(expandedElements);
    if (newExp.has(element)) {
      newExp.delete(element);
    } else {
      newExp.add(element);
    }
    setExpandedElements(newExp);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Module 1 — Master Nuclide Database</h2>
          <span className="form-label">Reference data sourced dynamically from IAEA NNDC ({nuclides.length} global isotopes tracked)</span>
        </div>
        <div>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search element, isotope, or radiation (e.g. Uranium, Cs-137)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '400px' }}
          />
        </div>
      </div>
      
      <div className="data-table-container" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {Object.keys(groupedNuclides).length === 0 ? (
           <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>No elements match your search query.</div>
        ) : (
          Object.entries(groupedNuclides).sort(([_aSym, aIso], [_bSym, bIso]) => (aIso[0]?.Z || 0) - (bIso[0]?.Z || 0)).map(([symbol, isotopes]) => {
            const isExpanded = expandedElements.has(symbol) || searchTerm !== '';
            const fullName = ELEMENT_NAMES[symbol] || symbol;
            return (
              <div key={symbol} style={{ marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                
                {/* Element Header row */}
                <div 
                  onClick={() => toggleElement(symbol)}
                  style={{ 
                    padding: '15px 20px', backgroundColor: 'rgba(0,0,0,0.3)', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid #333' : 'none'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                     Atomic No. {isotopes[0]?.Z} — {fullName} ({symbol}) <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: '10px' }}>({isotopes.length} isotopes isolated)</span>
                  </h3>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{isExpanded ? '−' : '+'}</span>
                </div>

                {/* Isotopes Table */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 20px' }}>
                    <table className="data-table" style={{ marginTop: '15px', background: 'transparent' }}>
                      <thead>
                        <tr>
                          <th>Isotope</th>
                          <th>Half-Life</th>
                          <th>Decay Emission Profiles</th>
                          <th>Q-Value Energy Profile</th>
                          <th style={{ color: '#f1c40f' }}>Best Detection Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isotopes.map((n, idx) => {
                          const modes = n['Decay Mode'] || 'Stable';
                          
                          // Consolidate all decay paths available in the IAEA trace
                          const decayPaths = [];
                          if (n['Decay Mode']) decayPaths.push({ mode: n['Decay Mode'], perc: n['Decay %'] });
                          if (n['Decay 2']) decayPaths.push({ mode: n['Decay 2'], perc: n['Decay 2 %'] });
                          if (n['Decay 3']) decayPaths.push({ mode: n['Decay 3'], perc: n['Decay 3 %'] });

                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 'bold', color: '#E0E1DD' }}>{n.Nuclide}</td>
                              <td>{n['Half-Life'] || 'Stable'}</td>
                              <td>
                                {decayPaths.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {decayPaths.map((dp, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="decay-badge" style={{ backgroundColor: getDecayBadgeColor(dp.mode), minWidth: '40px', textAlign: 'center' }}>
                                          {dp.mode.trim()}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                          {dp.perc ? `${dp.perc}%` : (dp.mode ? '100%' : '')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#888' }}>Stable</span>
                                )}
                              </td>
                              <td style={{ fontFamily: 'monospace', color: '#999' }}>{formatQValue(n)}</td>
                              <td style={{ color: '#27ae60', fontFamily: 'monospace', fontWeight: 600 }}>{n.Z > 0 && modes !== 'Stable' ? getDetectionMethod(modes) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NuclideTableModule;
