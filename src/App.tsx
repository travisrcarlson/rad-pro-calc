import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import 'katex/dist/katex.min.css';
import './index.css';

// Lazy-loaded computational micro-kernels & modules for high-performance code splitting
const NuclideTableModule = lazy(() => import('./modules/Module1/NuclideTableModule'));
const DoseCalculatorModule = lazy(() => import('./modules/Module2/DoseCalculatorModule'));
const VisualisationModule = lazy(() => import('./modules/Module3/VisualisationModule'));
const TransportModule = lazy(() => import('./modules/Module4/TransportModule'));
const RegModule = lazy(() => import('./modules/Module5/RegModule'));
const DecayModule = lazy(() => import('./modules/Module6/DecayModule'));
const VerificationModule = lazy(() => import('./modules/Module7/VerificationModule'));
const Spatial3DModule = lazy(() => import('./modules/Module8/Spatial3DModule'));
const WorkerDosimetryModule = lazy(() => import('./modules/Module9/WorkerDosimetryModule'));
const PulsedXRayModule = lazy(() => import('./modules/Module10/PulsedXRayModule'));
const EquipmentLibraryModule = lazy(() => import('./modules/Module11/EquipmentLibraryModule'));
const ReverseResponderModule = lazy(() => import('./modules/Module12/ReverseResponderModule'));
const PlumeModule = lazy(() => import('./modules/Module13/PlumeModule'));
const ShieldingModule = lazy(() => import('./modules/Module14/ShieldingModule'));
const LaserModule = lazy(() => import('./modules/Module15/LaserModule'));
const XRayTubeModule = lazy(() => import('./modules/Module16/XRayTubeModule'));
const InternalDosimetryModule = lazy(() => import('./modules/Module17/InternalDosimetryModule'));
const EMRModule = lazy(() => import('./modules/Module18/EMRModule'));
const CriticalityModule = lazy(() => import('./modules/Module19/CriticalityModule'));
const SpectroscopyModule = lazy(() => import('./modules/Module20/SpectroscopyModule'));
const LiteratureModule = lazy(() => import('./modules/Module21/LiteratureModule'));
const MARSSIMModule = lazy(() => import('./modules/Module22/MARSSIMModule'));
const BrachytherapyModule = lazy(() => import('./modules/Module23/BrachytherapyModule'));
const FirstResponderModule = lazy(() => import('./modules/Module24/FirstResponderModule'));
const MonteCarloModule = lazy(() => import('./modules/MonteCarlo/MonteCarloModule'));
const DetectorHardwareModule = lazy(() => import('./modules/Hardware/DetectorHardwareModule'));
const ScenarioBuilderModule = lazy(() => import('./modules/Scenarios/ScenarioBuilderModule'));

import { RegulatoryProvider } from './context/RegulatoryContext';
import { RegulatorySelectorBar } from './components/RegulatorySelectorBar';
import ErrorBoundary from './ErrorBoundary';

const ModuleLoadingSkeleton: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
    padding: '24px',
    background: 'rgba(5, 10, 18, 0.4)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 229, 255, 0.15)',
    animation: 'pulse 1.8s ease-in-out infinite'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ width: '180px', height: '18px', background: 'rgba(0, 229, 255, 0.15)', borderRadius: '4px' }} />
        <div style={{ width: '320px', height: '28px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px' }} />
        <div style={{ width: '450px', height: '14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px' }} />
      </div>
      <div style={{ width: '140px', height: '36px', background: 'rgba(0, 229, 255, 0.12)', borderRadius: '6px' }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: '90px',
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(0, 229, 255, 0.1)',
          borderRadius: '8px',
          padding: '14px'
        }}>
          <div style={{ width: '80px', height: '12px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', marginBottom: '8px' }} />
          <div style={{ width: '110px', height: '24px', background: 'rgba(0, 229, 255, 0.2)', borderRadius: '4px' }} />
        </div>
      ))}
    </div>

    <div style={{
      flex: 1,
      minHeight: '280px',
      background: 'rgba(0, 0, 0, 0.25)',
      border: '1px solid rgba(0, 229, 255, 0.08)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(0, 229, 255, 0.2)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.80rem', color: 'var(--color-text-muted)', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>
        HYDRATING COMPUTATIONAL MICRO-KERNEL...
      </span>
    </div>
  </div>
);

interface NavItem {
  path: string;
  label: string;
  badge: string;
  keywords: string[];
}

interface NavCategory {
  id: string;
  title: string;
  color: string;
  iconSymbol: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'dosimetry',
    title: 'Dosimetry & ALARA',
    color: '#00e5ff',
    iconSymbol: '◎',
    items: [
      { path: '/dose', label: 'Dose Calculator', badge: 'ICRP-103', keywords: ['dose', 'point', 'gamma', 'alara', 'attenuation', 'curie'] },
      { path: '/worker', label: 'Worker Dosimetry', badge: 'Occupational', keywords: ['worker', 'dosimetry', 'occupational', 'quarterly', 'annual', 'limit'] },
      { path: '/internal-dose', label: 'Internal Dosimetry', badge: 'MIRD', keywords: ['internal', 'mird', 'intake', 'inhalation', 'ingestion', 'organ'] },
      { path: '/spatial3d', label: '3D Spatial Workspace', badge: 'Point Cloud', keywords: ['3d', 'spatial', 'cad', 'workspace', 'mesh', 'voxels'] },
      { path: '/visualisation', label: 'Radiation Map', badge: 'Heatmap', keywords: ['map', 'heatmap', 'isodose', 'contour', 'zone'] }
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency & CBRN',
    color: '#ff9f1c',
    iconSymbol: '▲',
    items: [
      { path: '/first-responder', label: 'Tactical CBRN Response', badge: 'ERG/REAC-TS', keywords: ['first responder', 'cbrn', 'hazmat', 'triage', 'decon', 'ki', 'dtpa', 'cordon', 'erg 2024'] },
      { path: '/scenarios', label: 'Incident Scenario Drills', badge: 'INES / .radcase', keywords: ['scenario', 'drill', 'incident', 'case', 'goiania', 'tokaimura', 'cask', 'radcase'] },
      { path: '/responder', label: 'Reverse Triangulation', badge: 'Isopleths', keywords: ['responder', 'triangulation', 'source term', 'search', 'pinpoint'] },
      { path: '/plume', label: 'Plume Atmospheric Model', badge: 'Gaussian', keywords: ['plume', 'atmospheric', 'pasquill', 'dispersion', 'wind', 'fallout'] },
      { path: '/shielding', label: 'Shielding & ALARA PAGs', badge: 'NBS-107', keywords: ['shielding', 'pags', 'protective action', 'shelter', 'evacuation', 'epa-400'] },
      { path: '/transport', label: 'Transport Packaging', badge: 'IAEA SSR-6', keywords: ['transport', 'ssr-6', 'packaging', 'type a', 'type b', 'ti', 'csi'] }
    ]
  },
  {
    id: 'beams',
    title: 'Beams, X-Ray & EW',
    color: '#a78bfa',
    iconSymbol: '⚡',
    items: [
      { path: '/xray', label: 'Pulsed & Flash X-Ray', badge: 'NCRP-147', keywords: ['pulsed', 'flash', 'x-ray', 'duty cycle', 'beam'] },
      { path: '/xray-tube', label: 'X-Ray Tube Simulator', badge: 'Kramers/Birch', keywords: ['tube', 'spectra', 'anode', 'filtration', 'hvl', 'kvp'] },
      { path: '/laser', label: 'Laser Safety & NOHD', badge: 'ANSI Z136', keywords: ['laser', 'nohd', 'mpe', 'divergence', 'beam optical'] },
      { path: '/emr-safety', label: 'EW EMR & Microwave', badge: 'IEEE C95.1', keywords: ['emr', 'rf', 'microwave', 'radar', 'electromagnetic', 'sar'] }
    ]
  },
  {
    id: 'nuclear',
    title: 'Nuclear & Physics',
    color: '#10b981',
    iconSymbol: '⚛',
    items: [
      { path: '/criticality', label: 'Criticality & Reactor Core', badge: '4-Factor', keywords: ['criticality', 'reactor', 'keff', 'multiplication', 'fuel', 'lattice', 'buckling'] },
      { path: '/monte-carlo', label: 'Monte Carlo Micro-Kernel', badge: 'Klein-Nishina', keywords: ['monte carlo', 'stochastic', 'compton', 'pair production', 'cross section', 'buildup', 'histories'] },
      { path: '/decay', label: 'Radiolysis & Decay Chains', badge: 'Bateman', keywords: ['decay', 'bateman', 'radiolysis', 'g-value', 'daughter', 'chain'] },
      { path: '/spectroscopy', label: 'Gamma Spectroscopy', badge: 'MCA / FWHM', keywords: ['spectroscopy', 'mca', 'fwhm', 'channel', 'peak', 'resolution'] }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical & Decom',
    color: '#14b8a6',
    iconSymbol: '✚',
    items: [
      { path: '/brachytherapy', label: 'Brachytherapy Planner', badge: 'TG-43', keywords: ['brachytherapy', 'tg-43', 'seed', 'prostate', 'anisotropy', 'dose rate constant'] },
      { path: '/marssim', label: 'MARSSIM Decommissioning', badge: 'NUREG-1575', keywords: ['marssim', 'decommissioning', 'dcgl', 'wrs', 'sign test', 'survey'] }
    ]
  },
  {
    id: 'databases',
    title: 'Databases & Regs',
    color: '#38bdf8',
    iconSymbol: '▤',
    items: [
      { path: '/nuclides', label: 'Nuclide Database', badge: 'ICRP-107', keywords: ['nuclide', 'isotope', 'half-life', 'decay mode', 'energy', 'branching'] },
      { path: '/equipment', label: 'Equipment Catalog', badge: 'Detectors', keywords: ['equipment', 'detector', 'geiger', 'scintillator', 'efficiency'] },
      { path: '/hardware', label: 'Hardware Pulse Counter', badge: 'WebSerial/Audio', keywords: ['hardware', 'serial', 'audio', 'pulse', 'cpm', 'cps', 'currie', 'dead-time', 'geiger'] },
      { path: '/reg', label: 'Regulatory Dashboard', badge: '10 CFR 20', keywords: ['regulatory', 'nrc', 'agreement state', 'compliance', 'limits'] }
    ]
  },
  {
    id: 'qa',
    title: 'Verification & QA',
    color: '#c084fc',
    iconSymbol: '✓',
    items: [
      { path: '/verify', label: 'Verification Tests', badge: '34/34 Pass', keywords: ['verify', 'test', 'sqa', 'validation', 'benchmark', 'qa'] },
      { path: '/literature', label: 'Core Literature & Physics', badge: 'Derivations', keywords: ['literature', 'citations', 'physics', 'equations', 'formulations', 'references'] }
    ]
  }
];

const Sidebar = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track open state for each category. Default all to true for easy scanning
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_CATEGORIES.forEach(cat => {
      initial[cat.id] = true;
    });
    return initial;
  });

  // Ensure current active route's category is expanded whenever location changes
  useEffect(() => {
    const activeCategory = NAV_CATEGORIES.find(cat =>
      cat.items.some(item => item.path === location.pathname)
    );
    if (activeCategory && !openCategories[activeCategory.id]) {
      setOpenCategories(prev => ({ ...prev, [activeCategory.id]: true }));
    }
  }, [location.pathname]);

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const allExpanded = NAV_CATEGORIES.every(cat => openCategories[cat.id]);
  const toggleAll = () => {
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    NAV_CATEGORIES.forEach(cat => {
      updated[cat.id] = nextState;
    });
    setOpenCategories(updated);
  };

  // Filter items based on search term
  const query = searchTerm.trim().toLowerCase();
  
  const filteredCategories = NAV_CATEGORIES.map(cat => {
    if (!query) {
      return { ...cat, visibleItems: cat.items };
    }
    const matchingItems = cat.items.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(query);
      const matchBadge = item.badge.toLowerCase().includes(query);
      const matchKeywords = item.keywords.some(k => k.toLowerCase().includes(query));
      const matchCategory = cat.title.toLowerCase().includes(query);
      return matchLabel || matchBadge || matchKeywords || matchCategory;
    });
    return { ...cat, visibleItems: matchingItems };
  }).filter(cat => !query || cat.visibleItems.length > 0);

  const totalMatches = filteredCategories.reduce((acc, cat) => acc + cat.visibleItems.length, 0);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(0, 229, 255, 0.12)',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary)',
          fontSize: '1.1rem',
          boxShadow: '0 0 10px rgba(0, 229, 255, 0.25)'
        }}>
          ☢
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>RadPro Analyst</h1>
          <div style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>
            SUITE v4.5 // SQA VERIFIED
          </div>
        </div>
      </div>

      <div className="sidebar-search-container">
        <div className="sidebar-search-row">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search 27 tools & topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="sidebar-search-clear"
              title="Clear search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
        <div className="sidebar-search-meta">
          <span>{query ? `Showing ${totalMatches} of 27 tools` : '7 Categories (27 Tools)'}</span>
          {!query && (
            <button className="sidebar-toggle-all-btn" onClick={toggleAll}>
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-nav">
        {filteredCategories.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            No tools match &ldquo;{searchTerm}&rdquo;
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isOpen = query ? true : !!openCategories[cat.id];
            return (
              <div key={cat.id} style={{ marginBottom: '6px' }}>
                <button
                  type="button"
                  className="sidebar-category-header"
                  onClick={() => !query && toggleCategory(cat.id)}
                  style={{ cursor: query ? 'default' : 'pointer' }}
                >
                  <div className="sidebar-category-title" style={{ color: cat.color }}>
                    <span style={{ fontSize: '0.85rem' }}>{cat.iconSymbol}</span>
                    <span>{cat.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="sidebar-category-badge">
                      {cat.visibleItems.length}
                    </span>
                    {!query && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                        {isOpen ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {cat.visibleItems.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '6px' }}>
                          {item.label}
                        </span>
                        <span className="sidebar-module-badge">
                          {item.badge}
                        </span>
                      </NavLink>
                    ))}
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check if they already logged in during this session
    const authFlag = sessionStorage.getItem('radpro_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('radpro_auth', 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <RegulatoryProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <RegulatorySelectorBar />
            <div style={{ flex: 1, padding: '20px 30px', overflowY: 'auto' }}>
              <ErrorBoundary>
                <Suspense fallback={<ModuleLoadingSkeleton />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/nuclides" replace />} />
                    <Route path="/nuclides" element={<NuclideTableModule />} />
                    <Route path="/dose" element={<DoseCalculatorModule />} />
                    <Route path="/visualisation" element={<VisualisationModule />} />
                    <Route path="/transport" element={<TransportModule />} />
                    <Route path="/reg" element={<RegModule />} />
                    <Route path="/decay" element={<DecayModule />} />
                    <Route path="/verify" element={<VerificationModule />} />
                    <Route path="/spatial3d" element={<Spatial3DModule />} />
                    <Route path="/worker" element={<WorkerDosimetryModule />} />
                    <Route path="/xray" element={<PulsedXRayModule />} />
                    <Route path="/equipment" element={<EquipmentLibraryModule />} />
                    <Route path="/responder" element={<ReverseResponderModule />} />
                    <Route path="/shielding" element={<ShieldingModule />} />
                    <Route path="/plume" element={<PlumeModule />} />
                    <Route path="/laser" element={<LaserModule />} />
                    <Route path="/xray-tube" element={<XRayTubeModule />} />
                    <Route path="/internal-dose" element={<InternalDosimetryModule />} />
                    <Route path="/emr-safety" element={<EMRModule />} />
                    <Route path="/criticality" element={<CriticalityModule />} />
                    <Route path="/spectroscopy" element={<SpectroscopyModule />} />
                    <Route path="/marssim" element={<MARSSIMModule />} />
                    <Route path="/brachytherapy" element={<BrachytherapyModule />} />
                    <Route path="/first-responder" element={<FirstResponderModule />} />
                    <Route path="/monte-carlo" element={<MonteCarloModule />} />
                    <Route path="/hardware" element={<DetectorHardwareModule />} />
                    <Route path="/scenarios" element={<ScenarioBuilderModule />} />
                    <Route path="/literature" element={<LiteratureModule />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </Router>
    </RegulatoryProvider>
  );
};

export default App;
