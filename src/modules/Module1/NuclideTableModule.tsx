import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PlotComponent from 'react-plotly.js';
import nuclidesData from '../../data/all_nuclides.json';

const Plot = (PlotComponent as any).default || PlotComponent;

interface NuclideRecord {
  Nuclide: string;
  Symbol: string;
  Z: number;
  N: number;
  'Half-Life': string;
  'Half-Life (s)'?: string | number;
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

const parseNuclideHalfLifeSec = (n: NuclideRecord): number => {
  if (!n || n['Half-Life'] === 'STABLE' || String(n['Decay Mode']).toUpperCase() === 'STABLE') return Infinity;
  const rawS = n['Half-Life (s)'];
  if (rawS !== undefined && rawS !== '') {
    const parsed = parseFloat(String(rawS));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const hlStr = String(n['Half-Life'] || '').trim();
  if (!hlStr) return Infinity;
  const parts = hlStr.split(/\s+/);
  const val = parseFloat(parts[0]);
  if (isNaN(val) || val <= 0) return Infinity;
  const unit = (parts[1] || 's').toLowerCase();
  if (unit === 'ms') return val * 1e-3;
  if (unit === 'us' || unit === 'µs' || unit === 'μs') return val * 1e-6;
  if (unit === 'ns') return val * 1e-9;
  if (unit.startsWith('s')) return val;
  if (unit.startsWith('m')) return val * 60;
  if (unit.startsWith('h')) return val * 3600;
  if (unit.startsWith('d')) return val * 86400;
  if (unit.startsWith('y') || unit.startsWith('a')) return val * 31557600;
  return val;
};

const computeSpecificActivityTBqPerGram = (n: NuclideRecord): number => {
  const hlSec = parseNuclideHalfLifeSec(n);
  if (!Number.isFinite(hlSec) || hlSec <= 0) return 0;
  const A = Math.max(1, (n.Z || 1) + (n.N || parseInt(n.Nuclide.split('-')[1] || '1', 10) || 1));
  const avogadro = 6.02214076e23;
  const lambda = Math.LN2 / hlSec;
  return (lambda * avogadro) / (A * 1e12); // TBq/g
};

const getMaxQValueKeV = (n: NuclideRecord): number => {
  const qa = parseFloat(String(n['Q-Alpha'] || '0')) || 0;
  const qb = parseFloat(String(n['Q-Beta'] || '0')) || 0;
  const qec = parseFloat(String(n['Q-EC'] || '0')) || 0;
  return Math.max(qa, qb, qec);
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
  const [viewMode, setViewMode] = useState<'table' | 'scatter'>('table');
  const [scatterYMetric, setScatterYMetric] = useState<'qval' | 'spec_act'>('qval');
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set(['Cs', 'Co', 'Ir', 'I', 'U', 'Am']));
  const [inspectNuclide, setInspectNuclide] = useState<NuclideRecord | null>(null);
  const [sampleMassGrams, setSampleMassGrams] = useState<number>(0.001); // 1 mg default in inspector

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

  // Scatter Explorer Traces grouped by Decay Mode
  const scatterTraces = useMemo(() => {
    if (viewMode !== 'scatter') return [];
    const buckets: Record<string, { x: number[]; y: number[]; text: string[]; color: string }> = {
      'α Alpha': { x: [], y: [], text: [], color: '#ef4444' },
      'β⁻ Beta Minus': { x: [], y: [], text: [], color: '#3b82f6' },
      'EC / β⁺': { x: [], y: [], text: [], color: '#a855f7' },
      'IT / SF / Other': { x: [], y: [], text: [], color: '#10b981' }
    };

    Object.values(groupedNuclides).forEach(list => {
      list.forEach(n => {
        const hlSec = parseNuclideHalfLifeSec(n);
        if (!Number.isFinite(hlSec) || hlSec <= 0) return;
        const yVal = scatterYMetric === 'qval' ? getMaxQValueKeV(n) : computeSpecificActivityTBqPerGram(n);
        if (yVal <= 0) return;

        const m = String(n['Decay Mode'] || '').toUpperCase();
        const key = m.includes('A')
          ? 'α Alpha'
          : m.includes('B-')
          ? 'β⁻ Beta Minus'
          : m.includes('EC') || m.includes('B+')
          ? 'EC / β⁺'
          : 'IT / SF / Other';

        buckets[key].x.push(hlSec);
        buckets[key].y.push(yVal);
        buckets[key].text.push(`${n.Nuclide} (T½ = ${n['Half-Life']}, Mode: ${n['Decay Mode']})`);
      });
    });

    return Object.entries(buckets)
      .filter(([, b]) => b.x.length > 0)
      .map(([name, b]) => ({
        x: b.x,
        y: b.y,
        text: b.text,
        name,
        type: 'scattergl',
        mode: 'markers',
        marker: { color: b.color, size: 6.5, opacity: 0.8 }
      }));
  }, [viewMode, groupedNuclides, scatterYMetric]);

  const toggleElement = (element: string) => {
    const newExp = new Set(expandedElements);
    if (newExp.has(element)) {
      newExp.delete(element);
    } else {
      newExp.add(element);
    }
    setExpandedElements(newExp);
  };

  // Cross-Module Action Dispatchers (7 Modules)
  const launchDoseCalc = (n: NuclideRecord) => {
    navigate(`/dose?nuclide=${encodeURIComponent(n.Nuclide)}&activity=100&unit=MBq`);
  };
  const launchInternalDose = (n: NuclideRecord) => {
    navigate(`/internal-dose?nuclide=${encodeURIComponent(n.Nuclide)}`);
  };
  const launchShielding = (n: NuclideRecord) => {
    const qMeV = Math.max(0.05, Math.min(5.0, getMaxQValueKeV(n) / 1000 || 0.6617));
    navigate(`/shielding?energyMeV=${qMeV.toFixed(4)}&activityMBq=100`);
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
  const launchSpectroscopy = (n: NuclideRecord) => {
    const eKeV = Math.max(59.5, getMaxQValueKeV(n) || 661.7);
    navigate(`/spectroscopy?agedChain=${encodeURIComponent(n.Nuclide)}&elapsed=0d&agedPeaks=${encodeURIComponent(`${n.Nuclide}:${eKeV.toFixed(1)}:100`)}`);
  };

  const inspectedSpecActTBqG = inspectNuclide ? computeSpecificActivityTBqPerGram(inspectNuclide) : 0;
  const inspectedSpecActCiG = inspectedSpecActTBqG * 27.027;

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
            Module 28 — Master Radionuclide Database, Specific Activity &amp; Cross-Module Dispatcher
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Explore nuclear structure, decay Q-values, specific activity (TBq/g), and dispatch any isotope across 7 computational modules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                fontSize: '0.78rem',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontWeight: viewMode === 'table' ? 700 : 500,
                background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'table' ? '#000' : '#cbd5e1'
              }}
            >
              📋 Element Ledger
            </button>
            <button
              type="button"
              onClick={() => setViewMode('scatter')}
              style={{
                fontSize: '0.78rem',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
                fontWeight: viewMode === 'scatter' ? 700 : 500,
                background: viewMode === 'scatter' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'scatter' ? '#000' : '#cbd5e1'
              }}
            >
              📈 Half-Life vs. Activity / Q-Value Plot
            </button>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search isotope (e.g. Cobalt-60, Cs-137, Uranium)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '280px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Mode Filter Pills Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

        {viewMode === 'scatter' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Y-Axis Metric:</span>
            <button
              type="button"
              onClick={() => setScatterYMetric('qval')}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: scatterYMetric === 'qval' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
                color: scatterYMetric === 'qval' ? '#38bdf8' : '#94a3b8',
                border: `1px solid ${scatterYMetric === 'qval' ? '#38bdf8' : '#334155'}`
              }}
            >
              Decay Q-Value (keV)
            </button>
            <button
              type="button"
              onClick={() => setScatterYMetric('spec_act')}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: scatterYMetric === 'spec_act' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                color: scatterYMetric === 'spec_act' ? '#10b981' : '#94a3b8',
                border: `1px solid ${scatterYMetric === 'spec_act' ? '#10b981' : '#334155'}`
              }}
            >
              Specific Activity a_s (TBq/g)
            </button>
          </div>
        )}
      </div>

      {/* View Mode 2: Interactive Half-Life vs. Q-Value / Specific Activity Scatter Plot */}
      {viewMode === 'scatter' ? (
        <div style={{ flex: 1, minHeight: '420px', background: 'rgba(5, 10, 18, 0.65)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px' }}>
          <Plot
            data={scatterTraces as any}
            layout={{
              autosize: true,
              title: {
                text: scatterYMetric === 'qval'
                  ? 'IAEA Nuclide Landscape: Half-Life T½ (s) vs. Decay Q-Value (keV)'
                  : 'IAEA Nuclide Landscape: Half-Life T½ (s) vs. Specific Activity a_s (TBq/g)',
                font: { color: '#E0E1DD', size: 14 }
              },
              xaxis: { title: 'Half-Life T½ (seconds, Log Scale)', type: 'log', gridcolor: '#1e293b' },
              yaxis: {
                title: scatterYMetric === 'qval' ? 'Max Decay Q-Value (keV, Log Scale)' : 'Specific Activity a_s (TBq/g, Log Scale)',
                type: 'log',
                gridcolor: '#1e293b'
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#E0E1DD', size: 11 },
              margin: { l: 65, r: 25, t: 45, b: 50 },
              legend: { orientation: 'h', y: 1.1 }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      ) : (
        /* Data Table */
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
                              <th style={{ padding: '8px' }}>Specific Activity</th>
                              <th style={{ padding: '8px' }}>Q-Value Profile</th>
                              <th style={{ padding: '8px' }}>Optimal Detection</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Quick Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isotopes.map((n, idx) => {
                              const modes = n['Decay Mode'] || 'Stable';
                              const specActTBq = computeSpecificActivityTBqPerGram(n);
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
                                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                    {specActTBq > 0 ? `${specActTBq.toExponential(2)} TBq/g` : 'Stable'}
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
                                        style={{ padding: '3px 7px', fontSize: '0.71rem' }}
                                      >
                                        Dose
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        title="Shielding Attenuation (Module 14)"
                                        onClick={() => launchShielding(n)}
                                        style={{ padding: '3px 7px', fontSize: '0.71rem' }}
                                      >
                                        Shield
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        title="Package for Transport (IAEA SSR-6)"
                                        onClick={() => launchTransport(n)}
                                        style={{ padding: '3px 7px', fontSize: '0.71rem' }}
                                      >
                                        Pack
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        title="Inspect Bateman Decay Chain"
                                        onClick={() => launchDecayChain(n)}
                                        style={{ padding: '3px 7px', fontSize: '0.71rem' }}
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
      )}

      {/* Nuclide Inspector Modal with Specific Activity & Gram-to-Curie Calculator */}
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
              maxWidth: '600px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Protons (Z) / Neutrons (N):</span>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: '#fff' }}>
                  Z={inspectNuclide.Z} | N={inspectNuclide.N || (parseInt(inspectNuclide.Nuclide.split('-')[1]) - inspectNuclide.Z)}
                </strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Half-Life:</span>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: '#f59e0b' }}>{inspectNuclide['Half-Life'] || 'Stable'}</strong>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Specific Activity (a_s):</span>
                <strong style={{ display: 'block', fontSize: '0.98rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                  {inspectedSpecActTBqG > 0 ? `${inspectedSpecActTBqG.toExponential(2)} TBq/g` : 'Stable'}
                </strong>
              </div>
            </div>

            {/* Interactive Sample Mass <-> Activity Converter */}
            {inspectedSpecActTBqG > 0 && (
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                  ⚖️ Gravimetric Mass ↔ Activity Converter (a_s = {inspectedSpecActCiG.toExponential(2)} Ci/g)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', alignItems: 'center', fontSize: '0.78rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Sample Mass (grams)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="1e-12"
                      className="form-control"
                      value={sampleMassGrams}
                      onChange={e => setSampleMassGrams(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div style={{ background: '#0b0f19', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#64748b', fontSize: '0.65rem' }}>SI ACTIVITY</div>
                    <div style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                      {(inspectedSpecActTBqG * sampleMassGrams * 1000).toExponential(3)} GBq
                    </div>
                  </div>
                  <div style={{ background: '#0b0f19', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                    <div style={{ color: '#64748b', fontSize: '0.65rem' }}>TRADITIONAL ACTIVITY</div>
                    <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
                      {(inspectedSpecActCiG * sampleMassGrams).toExponential(3)} Ci
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PRIMARY DETECTION METHODOLOGY</span>
              <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                {getDetectionMethod(inspectNuclide['Decay Mode'])}
              </div>
            </div>

            {/* 7-Module Direct Launch Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>DISPATCH TO COMPUTATIONAL MODULE:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                <button className="btn btn-primary" onClick={() => { launchDoseCalc(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  🎯 Point Dose (1A)
                </button>
                <button className="btn btn-primary" onClick={() => { launchInternalDose(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  🫁 Internal Dose (3)
                </button>
                <button className="btn btn-primary" onClick={() => { launchShielding(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  🧱 Shielding (14)
                </button>
                <button className="btn btn-primary" onClick={() => { launchDecayChain(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  🔗 Decay Chain (24)
                </button>
                <button className="btn btn-primary" onClick={() => { launchSpectroscopy(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  📊 MCA Spectrum (25)
                </button>
                <button className="btn btn-primary" onClick={() => { launchTransport(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  📦 Transport (15)
                </button>
                <button className="btn btn-primary" onClick={() => { launchPlume(inspectNuclide); setInspectNuclide(null); }} style={{ fontSize: '0.78rem' }}>
                  🌬️ Plume Model (13)
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
