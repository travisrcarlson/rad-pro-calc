import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  if (m.includes('A')) return '#ef4444'; // Alpha (red)
  if (m.includes('B-')) return '#3b82f6'; // Beta- (blue)
  if (m.includes('B+')) return '#ec4899'; // Beta+ (pink)
  if (m.includes('IT')) return '#00e5ff'; // IT Gamma (cyan)
  if (m.includes('EC')) return '#a855f7'; // Electron Capture (purple)
  if (m.includes('SF')) return '#10b981'; // Spontaneous Fission (emerald)
  if (m.includes('N') || m.includes('P')) return '#f97316';
  return '#64748b';
};

const getDetectionMethod = (modes: string) => {
  if (!modes) return 'Standard GM Tube';
  const m = modes.toUpperCase();
  if (m.includes('SF') || m.includes('N')) return 'Neutron Proportional (He-3/BF3)';
  if (m.includes('A') && m.includes('IT')) return 'NaI(Tl) Scintillator & ZnS(Ag) Probe';
  if (m.includes('A')) return 'ZnS(Ag) Scintillator / PIPS / Alpha Spec';
  if (m === 'IT' || m === 'G') return 'HPGe Spectrometer / NaI(Tl) Scintillator';
  if (m.includes('B') || m.includes('B-')) return 'Pancake GM / Liquid Scintillation';
  if (m.includes('EC')) return 'Thin-Window NaI / HPGe X-Ray Spectrometer';
  return 'Standard Geiger-Muller (Pancake)';
};

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

export const NuclideTableModule: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set(['Cs', 'Co', 'Ir', 'I', 'U', 'Am']));
  const [inspectNuclide, setInspectNuclide] = useState<NuclideRecord | null>(null);

  const [nuclides] = useState<NuclideRecord[]>(() => {
    if (Array.isArray(nuclidesData)) {
      return nuclidesData as unknown as NuclideRecord[];
    }
    return [];
  });

  // Group nuclides by Base Atomic Symbol (Z) directly from IAEA dataset
  const groupedNuclides = useMemo(() => {
    const groups: Record<string, NuclideRecord[]> = {};
    const searchLower = searchTerm.toLowerCase().trim();

    for (const n of nuclides) {
      if (!n.Symbol) continue;

      const fullElementName = ELEMENT_NAMES[n.Symbol.trim()] || n.Symbol;
      const decayMode = (n['Decay Mode'] || '').toUpperCase();

      // Mode filter check
      if (modeFilter !== 'ALL') {
        if (modeFilter === 'STABLE' && decayMode !== 'STABLE' && decayMode !== '') continue;
        if (modeFilter === 'ALPHA' && !decayMode.includes('A')) continue;
        if (modeFilter === 'BETA_MINUS' && !decayMode.includes('B-')) continue;
        if (modeFilter === 'BETA_PLUS' && !decayMode.includes('B+') && !decayMode.includes('EC')) continue;
        if (modeFilter === 'GAMMA_IT' && !decayMode.includes('IT')) continue;
        if (modeFilter === 'SF' && !decayMode.includes('SF')) continue;
      }

      const matchSearch =
        n.Nuclide.toLowerCase().includes(searchLower) ||
        fullElementName.toLowerCase().includes(searchLower) ||
        n.Symbol.toLowerCase() === searchLower ||
        decayMode.includes(searchLower);

      if (!matchSearch && searchTerm !== '') continue;

      const baseElement = n.Symbol.trim();
      if (!groups[baseElement]) {
        groups[baseElement] = [];
      }
      groups[baseElement].push(n);
    }
    return groups;
  }, [searchTerm, modeFilter, nuclides]);

  const toggleElement = (element: string) => {
    const newExp = new Set(expandedElements);
    if (newExp.has(element)) {
      newExp.delete(element);
    } else {
      newExp.add(element);
    }
    setExpandedElements(newExp);
  };

  // Cross-Module Action Dispatchers
  const launchDoseCalc = (n: NuclideRecord) => {
    navigate(`/dose?nuclide=${encodeURIComponent(n.Nuclide)}&activity=100&unit=MBq`);
  };

  const launchTransport = (n: NuclideRecord) => {
    navigate(`/transport?nuclide=${encodeURIComponent(n.Nuclide)}`);
  };

  const launchPlume = (n: NuclideRecord) => {
    navigate(`/plume?nuclide=${encodeURIComponent(n.Nuclide)}&activity=100`);
  };

  const launchDecayChain = (n: NuclideRecord) => {
    navigate(`/decay?isotope=${encodeURIComponent(n.Nuclide)}`);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">IAEA NNDC REFERENCE</span>
            <span className="hud-badge hud-badge-accent">{nuclides.length} GLOBAL ISOTOPES</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Master Radionuclide Database &amp; Cross-Module Action Dispatcher
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Explore nuclear structure, decay energies, half-lives, and dispatch selected isotopes directly to Dose, Transport, Plume, or Decay Chain simulators.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search isotope (e.g. Cobalt-60, Cs-137, Uranium)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '320px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Mode Filter Pills Ribbon */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'ALL', label: 'All Modes' },
          { id: 'ALPHA', label: 'α Alpha Emitters' },
          { id: 'BETA_MINUS', label: 'β⁻ Beta Minus' },
          { id: 'BETA_PLUS', label: 'β⁺ / EC Positron' },
          { id: 'GAMMA_IT', label: 'IT Isomeric Gamma' },
          { id: 'SF', label: 'Spontaneous Fission' },
          { id: 'STABLE', label: 'Stable Isotopes' }
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => setModeFilter(pill.id)}
            className="btn"
            style={{
              fontSize: '0.78rem',
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              background: modeFilter === pill.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
              color: modeFilter === pill.id ? '#000' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              fontWeight: modeFilter === pill.id ? 'bold' : 'normal'
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="data-table-container" style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {Object.keys(groupedNuclides).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--color-text-muted)' }}>
            No isotopes match your filter and search criteria.
          </div>
        ) : (
          Object.entries(groupedNuclides)
            .sort(([_aSym, aIso], [_bSym, bIso]) => (aIso[0]?.Z || 0) - (bIso[0]?.Z || 0))
            .map(([symbol, isotopes]) => {
              const isExpanded = expandedElements.has(symbol) || searchTerm !== '';
              const fullName = ELEMENT_NAMES[symbol] || symbol;

              return (
                <div
                  key={symbol}
                  style={{
                    marginBottom: '12px',
                    backgroundColor: 'rgba(5, 10, 18, 0.6)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Element Header */}
                  <div
                    onClick={() => toggleElement(symbol)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="hud-badge hud-badge-primary">Z={isotopes[0]?.Z}</span>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#00e5ff' }}>
                        {fullName} ({symbol})
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        ({isotopes.length} isotopes)
                      </span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Isotopes Sub-Table */}
                  {isExpanded && (
                    <div style={{ padding: '8px 14px 14px 14px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-primary)' }}>
                            <th style={{ padding: '8px' }}>Isotope</th>
                            <th style={{ padding: '8px' }}>Half-Life</th>
                            <th style={{ padding: '8px' }}>Primary Decay</th>
                            <th style={{ padding: '8px' }}>Q-Value Profile</th>
                            <th style={{ padding: '8px' }}>Optimal Detection</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Quick Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isotopes.map((n, idx) => {
                            const modes = n['Decay Mode'] || 'Stable';
                            const decayPaths = [];
                            if (n['Decay Mode']) decayPaths.push({ mode: n['Decay Mode'], perc: n['Decay %'] });
                            if (n['Decay 2']) decayPaths.push({ mode: n['Decay 2'], perc: n['Decay 2 %'] });

                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onClick={() => setInspectNuclide(n)}
                              >
                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>
                                  {n.Nuclide}
                                </td>
                                <td style={{ padding: '8px', color: n['Half-Life'] === 'STABLE' ? '#10b981' : 'var(--color-text-muted)' }}>
                                  {n['Half-Life'] || 'Stable'}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {decayPaths.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      {decayPaths.map((dp, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            fontSize: '0.72rem',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: getDecayBadgeColor(dp.mode),
                                            color: '#fff',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {dp.mode.trim()} {dp.perc ? `(${dp.perc}%)` : ''}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#10b981' }}>Stable</span>
                                  )}
                                </td>
                                <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94a3b8' }}>
                                  {formatQValue(n)}
                                </td>
                                <td style={{ padding: '8px', color: '#10b981', fontSize: '0.78rem' }}>
                                  {n.Z > 0 && modes !== 'Stable' ? getDetectionMethod(modes) : 'Non-Radioactive'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      title="Calculate Point Source External Dose"
                                      onClick={() => launchDoseCalc(n)}
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    >
                                      Dose
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      title="Package for Transport (IAEA SSR-6)"
                                      onClick={() => launchTransport(n)}
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    >
                                      Pack
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      title="Simulate Atmospheric Release Plume"
                                      onClick={() => launchPlume(n)}
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    >
                                      Plume
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      title="Inspect Bateman Decay Chain"
                                      onClick={() => launchDecayChain(n)}
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    >
                                      Chain
                                    </button>
                                  </div>
                                </td>
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

      {/* Nuclide Inspector Modal */}
      {inspectNuclide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setInspectNuclide(null)}
        >
          <div
            style={{
              background: '#0d131f',
              border: '1px solid #00e5ff',
              borderRadius: '10px',
              padding: '24px',
              maxWidth: '550px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="hud-badge hud-badge-primary">IAEA NNDC RECORD</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', color: '#00e5ff' }}>
                  {inspectNuclide.Nuclide} ({ELEMENT_NAMES[inspectNuclide.Symbol] || inspectNuclide.Symbol})
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => setInspectNuclide(null)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Atomic Number (Z):</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>{inspectNuclide.Z}</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Neutron Count (N):</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>{inspectNuclide.N || (parseInt(inspectNuclide.Nuclide.split('-')[1]) - inspectNuclide.Z)}</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Half-Life:</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#f59e0b' }}>{inspectNuclide['Half-Life'] || 'Stable'}</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Decay Modes:</span>
                <strong style={{ display: 'block', fontSize: '1.0rem', color: '#38bdf8' }}>{inspectNuclide['Decay Mode'] || 'None (Stable)'}</strong>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PRIMARY DETECTION METHODOLOGY</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {getDetectionMethod(inspectNuclide['Decay Mode'])}
              </div>
            </div>

            {/* Direct Launch Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>DISPATCH TO COMPUTATIONAL MODULE:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { launchDoseCalc(inspectNuclide); setInspectNuclide(null); }}
                  style={{ fontSize: '0.8rem' }}
                >
                  🎯 Calculate Point Dose
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { launchTransport(inspectNuclide); setInspectNuclide(null); }}
                  style={{ fontSize: '0.8rem' }}
                >
                  📦 Transport Packaging
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { launchPlume(inspectNuclide); setInspectNuclide(null); }}
                  style={{ fontSize: '0.8rem' }}
                >
                  🌬️ Plume Dispersion
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { launchDecayChain(inspectNuclide); setInspectNuclide(null); }}
                  style={{ fontSize: '0.8rem' }}
                >
                  🔗 Bateman Decay Chain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NuclideTableModule;
