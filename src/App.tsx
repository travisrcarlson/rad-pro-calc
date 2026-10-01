import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import 'katex/dist/katex.min.css';
import './index.css';

// Lazy load modules to improve performance if needed later, but standard imports for now
import NuclideTableModule from './modules/Module1/NuclideTableModule';
import VisualisationModule from './modules/Module3/VisualisationModule';
import DoseCalculatorModule from './modules/Module2/DoseCalculatorModule';
import TransportModule from './modules/Module4/TransportModule';
import RegModule from './modules/Module5/RegModule';
import DecayModule from './modules/Module6/DecayModule';
import VerificationModule from './modules/Module7/VerificationModule';
import Spatial3DModule from './modules/Module8/Spatial3DModule';
import WorkerDosimetryModule from './modules/Module9/WorkerDosimetryModule';
import PulsedXRayModule from './modules/Module10/PulsedXRayModule';
import EquipmentLibraryModule from './modules/Module11/EquipmentLibraryModule';
import ReverseResponderModule from './modules/Module12/ReverseResponderModule';
import PlumeModule from './modules/Module13/PlumeModule';
import ShieldingModule from './modules/Module14/ShieldingModule';
import LaserModule from './modules/Module15/LaserModule';
import XRayTubeModule from './modules/Module16/XRayTubeModule';
import InternalDosimetryModule from './modules/Module17/InternalDosimetryModule';
import EMRModule from './modules/Module18/EMRModule';
import CriticalityModule from './modules/Module19/CriticalityModule';
import SpectroscopyModule from './modules/Module20/SpectroscopyModule';
import LiteratureModule from './modules/Module21/LiteratureModule';
import MARSSIMModule from './modules/Module22/MARSSIMModule';
import BrachytherapyModule from './modules/Module23/BrachytherapyModule';
import FirstResponderModule from './modules/Module24/FirstResponderModule';
import ErrorBoundary from './ErrorBoundary';

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
      { path: '/reg', label: 'Regulatory Dashboard', badge: '10 CFR 20', keywords: ['regulatory', 'nrc', 'agreement state', 'compliance', 'limits'] }
    ]
  },
  {
    id: 'qa',
    title: 'Verification & QA',
    color: '#c084fc',
    iconSymbol: '✓',
    items: [
      { path: '/verify', label: 'Verification Tests', badge: '32/32 Pass', keywords: ['verify', 'test', 'sqa', 'validation', 'benchmark', 'qa'] },
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
            placeholder="Search 24 tools & topics..."
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
          <span>{query ? `Showing ${totalMatches} of 24 tools` : '7 Categories (24 Tools)'}</span>
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
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
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
              <Route path="/literature" element={<LiteratureModule />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
};

export default App;
