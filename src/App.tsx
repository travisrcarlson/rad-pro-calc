import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './Login';
import 'katex/dist/katex.min.css';
import './index.css';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { APP_NAME, APP_VERSION, VV_SUMMARY_BADGE, VV_PASS_BADGE } from './config/appMetadata';
import AboutStandardsModal from './components/AboutStandardsModal';

// Lazy-loaded computational micro-kernels & modules with auto-retry on stale deployments
const NuclideTableModule = lazyWithRetry(() => import('./modules/Module1/NuclideTableModule'), 'NuclideTableModule');
const DoseCalculatorModule = lazyWithRetry(() => import('./modules/Module2/DoseCalculatorModule'), 'DoseCalculatorModule');
const VisualisationModule = lazyWithRetry(() => import('./modules/Module3/VisualisationModule'), 'VisualisationModule');
const TransportModule = lazyWithRetry(() => import('./modules/Module4/TransportModule'), 'TransportModule');
const RegModule = lazyWithRetry(() => import('./modules/Module5/RegModule'), 'RegModule');
const DecayModule = lazyWithRetry(() => import('./modules/Module6/DecayModule'), 'DecayModule');
const VerificationModule = lazyWithRetry(() => import('./modules/Module7/VerificationModule'), 'VerificationModule');
const Spatial3DModule = lazyWithRetry(() => import('./modules/Module8/Spatial3DModule'), 'Spatial3DModule');
const WorkerDosimetryModule = lazyWithRetry(() => import('./modules/Module9/WorkerDosimetryModule'), 'WorkerDosimetryModule');
const PulsedXRayModule = lazyWithRetry(() => import('./modules/Module10/PulsedXRayModule'), 'PulsedXRayModule');
const EquipmentLibraryModule = lazyWithRetry(() => import('./modules/Module11/EquipmentLibraryModule'), 'EquipmentLibraryModule');
const ReverseResponderModule = lazyWithRetry(() => import('./modules/Module12/ReverseResponderModule'), 'ReverseResponderModule');
const PlumeModule = lazyWithRetry(() => import('./modules/Module13/PlumeModule'), 'PlumeModule');
const ShieldingModule = lazyWithRetry(() => import('./modules/Module14/ShieldingModule'), 'ShieldingModule');
const LaserModule = lazyWithRetry(() => import('./modules/Module15/LaserModule'), 'LaserModule');
const XRayTubeModule = lazyWithRetry(() => import('./modules/Module16/XRayTubeModule'), 'XRayTubeModule');
const InternalDosimetryModule = lazyWithRetry(() => import('./modules/Module17/InternalDosimetryModule'), 'InternalDosimetryModule');
const EMRModule = lazyWithRetry(() => import('./modules/Module18/EMRModule'), 'EMRModule');
const CriticalityModule = lazyWithRetry(() => import('./modules/Module19/CriticalityModule'), 'CriticalityModule');
const SpectroscopyModule = lazyWithRetry(() => import('./modules/Module20/SpectroscopyModule'), 'SpectroscopyModule');
const LiteratureModule = lazyWithRetry(() => import('./modules/Module21/LiteratureModule'), 'LiteratureModule');
const MARSSIMModule = lazyWithRetry(() => import('./modules/Module22/MARSSIMModule'), 'MARSSIMModule');
const BrachytherapyModule = lazyWithRetry(() => import('./modules/Module23/BrachytherapyModule'), 'BrachytherapyModule');
const FirstResponderModule = lazyWithRetry(() => import('./modules/Module24/FirstResponderModule'), 'FirstResponderModule');
const MonteCarloModule = lazyWithRetry(() => import('./modules/MonteCarlo/MonteCarloModule'), 'MonteCarloModule');
const DetectorHardwareModule = lazyWithRetry(() => import('./modules/Hardware/DetectorHardwareModule'), 'DetectorHardwareModule');
const ScenarioBuilderModule = lazyWithRetry(() => import('./modules/Scenarios/ScenarioBuilderModule'), 'ScenarioBuilderModule');
const XRayDistortionModule = lazyWithRetry(() => import('./modules/XRayDistortion/XRayDistortionModule'), 'XRayDistortionModule');
const CBRNConsequenceModule = lazyWithRetry(() => import('./modules/Module25/CBRNConsequenceModule'), 'CBRNConsequenceModule');
const NuclearWeaponEffectsModule = lazyWithRetry(() => import('./modules/Module26/NuclearWeaponEffectsModule'), 'NuclearWeaponEffectsModule');
const MedicalCountermeasuresModule = lazyWithRetry(() => import('./modules/Module27/MedicalCountermeasuresModule'), 'MedicalCountermeasuresModule');
const CAASCriticalityModule = lazyWithRetry(() => import('./modules/Module28/CAASCriticalityModule'), 'CAASCriticalityModule');
const TacticalGISModule = lazyWithRetry(() => import('./modules/Module29/TacticalGISModule'), 'TacticalGISModule');
const HistoricalIncidentsModule = lazyWithRetry(() => import('./modules/Module30/HistoricalIncidentsModule'), 'HistoricalIncidentsModule');
const GlobalNuclearMapModule = lazyWithRetry(() => import('./modules/Module31/GlobalNuclearMapModule'), 'GlobalNuclearMapModule');

import { useRegulatory, type GlobalSourceContext } from './context/RegulatoryContext';
import { RegulatoryProvider } from './context/RegulatoryProvider';
import { RegulatorySelectorBar } from './components/RegulatorySelectorBar';
import { CommandPalette } from './components/CommandPalette';
import { MODULE_USER_GUIDES } from './data/moduleUserGuides';
import type { InspectorTabId } from './components/WorkspaceInspectorDrawer';
import ErrorBoundary from './ErrorBoundary';

const ModuleInfoTabPanel = lazyWithRetry(() => import('./components/ModuleInfoTabPanel'), 'ModuleInfoTabPanel');
const WorkspaceInspectorDrawer = lazyWithRetry(
  () => import('./components/WorkspaceInspectorDrawer'),
  'WorkspaceInspectorDrawer'
);

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
        borderRight: '3px solid rgba(0, 229, 255, 0.2)',
        borderBottom: '3px solid rgba(0, 229, 255, 0.2)',
        borderLeft: '3px solid rgba(0, 229, 255, 0.2)',
        borderTop: '3px solid var(--color-primary)',
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
  moduleNumber: number;
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
    color: '#94a3b8',
    iconSymbol: '◎',
    items: [
      { moduleNumber: 1, path: '/dose', label: 'Dose Calculator', badge: 'ICRP-103', keywords: ['module 1', 'm01', 'dose', 'point', 'gamma', 'alara', 'attenuation', 'curie'] },
      { moduleNumber: 2, path: '/worker', label: 'Worker Dosimetry', badge: 'Occupational', keywords: ['module 2', 'm02', 'worker', 'dosimetry', 'occupational', 'quarterly', 'annual', 'limit'] },
      { moduleNumber: 3, path: '/internal-dose', label: 'Internal Dosimetry', badge: 'MIRD', keywords: ['module 3', 'm03', 'internal', 'mird', 'intake', 'inhalation', 'ingestion', 'organ'] },
      { moduleNumber: 4, path: '/spatial3d', label: '3D Spatial Workspace', badge: 'Point Cloud', keywords: ['module 4', 'm04', '3d', 'spatial', 'cad', 'workspace', 'mesh', 'voxels'] },
      { moduleNumber: 5, path: '/visualisation', label: 'Radiation Map', badge: 'Heatmap', keywords: ['module 5', 'm05', 'map', 'heatmap', 'isodose', 'contour', 'zone'] }
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency & CBRN',
    color: '#94a3b8',
    iconSymbol: '▲',
    items: [
      { moduleNumber: 6, path: '/first-responder', label: 'Tactical CBRN Response', badge: 'ERG/REAC-TS', keywords: ['module 6', 'm06', 'first responder', 'cbrn', 'hazmat', 'triage', 'decon', 'ki', 'dtpa', 'cordon', 'erg 2024'] },
      { moduleNumber: 7, path: '/cbrn-consequence', label: 'CBRN Fallout & Shelter', badge: 'Way-Wigner / NCRP-165', keywords: ['module 7', 'm07', 'cbrn', 'fallout', 'shelter', 'wigner', '7-10 rule', 'protection factor', 'aegl', 'tih', 'egress', 'evacuation', 'biodosimetry', 'dicentric', 'metrepol'] },
      { moduleNumber: 8, path: '/nuclear-weapons-effects', label: 'Prompt Blast & HEMP', badge: 'Kingery-Bulmash', keywords: ['module 8', 'm08', 'nuclear', 'weapon', 'blast', 'overpressure', 'thermal', 'burn', 'hemp', 'emp', 'shockwave', 'prompt radiation'] },
      { moduleNumber: 9, path: '/medical-countermeasures', label: 'Medical Countermeasures', badge: 'DTPA / PB / KI', keywords: ['module 9', 'm09', 'medical', 'countermeasures', 'chelation', 'dtpa', 'prussian blue', 'potassium iodide', 'ki', 'decorporation', 'actinide', 'cesium', 'iodine'] },
      { moduleNumber: 10, path: '/tactical-gis', label: 'Tactical GIS & ATAK Hub', badge: 'CoT / Vector', keywords: ['module 10', 'm10', 'gis', 'map', 'atak', 'wintak', 'cot', 'cursor on target', 'triangulation', 'multilateration', 'mesh', 'picket'] },
      { moduleNumber: 11, path: '/scenarios', label: 'Incident Scenario Drills', badge: 'INES / .radcase', keywords: ['module 11', 'm11', 'scenario', 'drill', 'incident', 'case', 'goiania', 'tokaimura', 'cask', 'radcase'] },
      { moduleNumber: 12, path: '/responder', label: 'Reverse Triangulation', badge: 'Isopleths', keywords: ['module 12', 'm12', 'responder', 'triangulation', 'source term', 'search', 'pinpoint'] },
      { moduleNumber: 13, path: '/plume', label: 'Plume Atmospheric Model', badge: 'Gaussian', keywords: ['module 13', 'm13', 'plume', 'atmospheric', 'pasquill', 'dispersion', 'wind', 'fallout'] },
      { moduleNumber: 14, path: '/shielding', label: 'Shielding & ALARA PAGs', badge: 'NBS-107', keywords: ['module 14', 'm14', 'shielding', 'pags', 'protective action', 'shelter', 'evacuation', 'epa-400'] },
      { moduleNumber: 15, path: '/transport', label: 'Transport Packaging', badge: 'IAEA SSR-6', keywords: ['module 15', 'm15', 'transport', 'ssr-6', 'packaging', 'type a', 'type b', 'ti', 'csi'] }
    ]
  },
  {
    id: 'beams',
    title: 'Beams, X-Ray & EW',
    color: '#94a3b8',
    iconSymbol: '⚡',
    items: [
      { moduleNumber: 16, path: '/xray', label: 'Pulsed & Flash X-Ray', badge: 'NCRP-147', keywords: ['module 16', 'm16', 'pulsed', 'flash', 'x-ray', 'duty cycle', 'beam'] },
      { moduleNumber: 17, path: '/xray-tube', label: 'X-Ray Tube Simulator', badge: 'Kramers/Birch', keywords: ['module 17', 'm17', 'tube', 'spectra', 'anode', 'filtration', 'hvl', 'kvp'] },
      { moduleNumber: 18, path: '/xray-distortion', label: 'X-Ray Distortion & Geometry', badge: 'SID / OID / Penumbra', keywords: ['module 18', 'm18', 'distortion', 'xray', 'sid', 'oid', 'sod', 'penumbra', 'unsharpness', 'magnification', 'depth', 'foreshortening', 'elongation', 'asme', 'ndt', 'geometry', 'frustum'] },
      { moduleNumber: 19, path: '/laser', label: 'Laser Safety & NOHD', badge: 'ANSI Z136', keywords: ['module 19', 'm19', 'laser', 'nohd', 'mpe', 'divergence', 'beam optical'] },
      { moduleNumber: 20, path: '/emr-safety', label: 'EW EMR & Microwave', badge: 'IEEE C95.1', keywords: ['module 20', 'm20', 'emr', 'rf', 'microwave', 'radar', 'electromagnetic', 'sar'] }
    ]
  },
  {
    id: 'nuclear',
    title: 'Nuclear & Physics',
    color: '#94a3b8',
    iconSymbol: '⚛',
    items: [
      { moduleNumber: 21, path: '/criticality', label: 'Criticality & Reactor Core', badge: '4-Factor', keywords: ['module 21', 'm21', 'criticality', 'reactor', 'keff', 'multiplication', 'fuel', 'lattice', 'buckling'] },
      { moduleNumber: 22, path: '/caas-criticality', label: 'CAAS Criticality Alarms', badge: 'ANSI/ANS-8.3', keywords: ['module 22', 'm22', 'caas', 'criticality', 'alarm', 'excursion', 'nordheim fuchs', 'godiva', 'fission burst', 'ans 8.3'] },
      { moduleNumber: 23, path: '/monte-carlo', label: 'Monte Carlo Micro-Kernel', badge: 'Klein-Nishina', keywords: ['module 23', 'm23', 'monte carlo', 'stochastic', 'compton', 'pair production', 'cross section', 'buildup', 'histories'] },
      { moduleNumber: 24, path: '/decay', label: 'Radiolysis & Decay Chains', badge: 'Bateman', keywords: ['module 24', 'm24', 'decay', 'bateman', 'radiolysis', 'g-value', 'daughter', 'chain'] },
      { moduleNumber: 25, path: '/spectroscopy', label: 'Gamma Spectroscopy', badge: 'MCA / FWHM', keywords: ['module 25', 'm25', 'spectroscopy', 'mca', 'fwhm', 'channel', 'peak', 'resolution'] }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical & Decom',
    color: '#94a3b8',
    iconSymbol: '✚',
    items: [
      { moduleNumber: 26, path: '/brachytherapy', label: 'Brachytherapy Planner', badge: 'TG-43', keywords: ['module 26', 'm26', 'brachytherapy', 'tg-43', 'seed', 'prostate', 'anisotropy', 'dose rate constant'] },
      { moduleNumber: 27, path: '/marssim', label: 'MARSSIM Decommissioning', badge: 'NUREG-1575', keywords: ['module 27', 'm27', 'marssim', 'decommissioning', 'dcgl', 'wrs', 'sign test', 'survey'] }
    ]
  },
  {
    id: 'databases',
    title: 'Databases & Regs',
    color: '#94a3b8',
    iconSymbol: '▤',
    items: [
      { moduleNumber: 28, path: '/nuclides', label: 'Nuclide Database', badge: 'ICRP-107', keywords: ['module 28', 'm28', 'nuclide', 'isotope', 'half-life', 'decay mode', 'energy', 'branching'] },
      { moduleNumber: 29, path: '/equipment', label: 'Equipment Catalog', badge: 'Detectors', keywords: ['module 29', 'm29', 'equipment', 'detector', 'geiger', 'scintillator', 'efficiency'] },
      { moduleNumber: 30, path: '/incidents', label: 'Historical Incidents DB', badge: 'INES 1-7', keywords: ['module 30', 'm30', 'historical', 'incident', 'accident', 'chernobyl', 'fukushima', 'goiania', 'tokaimura', 'sl-1', 'forensics', 'case'] },
      { moduleNumber: 31, path: '/global-map', label: 'Global 3D Earth Hub', badge: 'Reactors & Tests', keywords: ['module 31', 'm31', 'globe', 'map', 'earth', 'reactor', 'detonation', 'test site', 'nuclear', 'geospatial', '3d', 'coordinates', 'orbit', 'polygon'] },
      { moduleNumber: 32, path: '/hardware', label: 'Hardware Pulse Counter', badge: 'WebSerial/Audio', keywords: ['module 32', 'm32', 'hardware', 'serial', 'audio', 'pulse', 'cpm', 'cps', 'currie', 'dead-time', 'geiger'] },
      { moduleNumber: 33, path: '/reg', label: 'Regulatory Dashboard', badge: 'Bbs / 10 CFR 20', keywords: ['module 33', 'm33', 'regulatory', 'anvs', 'bbs', 'rbs', 'nrc', 'euratom', 'compliance', 'limits', 're_inh'] }
    ]
  },
  {
    id: 'qa',
    title: 'Verification & QA',
    color: '#94a3b8',
    iconSymbol: '✓',
    items: [
      { moduleNumber: 34, path: '/verify', label: 'Verification Tests', badge: VV_PASS_BADGE, keywords: ['module 34', 'm34', 'verify', 'test', 'sqa', 'validation', 'benchmark', 'qa'] },
      { moduleNumber: 35, path: '/literature', label: 'Core Literature & Physics', badge: 'Derivations', keywords: ['module 35', 'm35', 'literature', 'citations', 'physics', 'equations', 'formulations', 'references'] }
    ]
  }
];

const TOTAL_TOOLS_COUNT = NAV_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);

const ALL_FLAT_NAV_ITEMS = NAV_CATEGORIES.flatMap(cat =>
  cat.items.map(item => ({
    ...item,
    categoryId: cat.id,
    categoryTitle: cat.title,
    categoryColor: cat.color,
    categoryIcon: cat.iconSymbol
  }))
);

const DEFAULT_PINNED_PATHS = ['/dose', '/first-responder', '/shielding', '/nuclides'];

interface SidebarProps {
  onOpenCommandPalette?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pinnedPaths: string[];
  onTogglePin: (path: string, e?: React.MouseEvent) => void;
  recentPaths: string[];
  onClearRecent: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onOpenCommandPalette,
  isCollapsed,
  onToggleCollapse,
  pinnedPaths,
  onTogglePin,
  recentPaths,
  onClearRecent
}) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPinnedSection, setShowPinnedSection] = useState(true);
  const [showRecentSection, setShowRecentSection] = useState(true);

  // Track open state for each category. Default all to true for easy scanning
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_CATEGORIES.forEach(cat => {
      initial[cat.id] = true;
    });
    return initial;
  });

  // Ensure current active route's category is expanded whenever location changes
  const [prevPathname, setPrevPathname] = useState<string | null>(null);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    const activeCategory = NAV_CATEGORIES.find(cat =>
      cat.items.some(item => item.path === location.pathname)
    );
    if (activeCategory && !openCategories[activeCategory.id]) {
      setOpenCategories(prev => ({ ...prev, [activeCategory.id]: true }));
    }
  }

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
      const matchNum = String(item.moduleNumber) === query || `m${String(item.moduleNumber).padStart(2, '0')}` === query || `module ${item.moduleNumber}` === query;
      const matchLabel = item.label.toLowerCase().includes(query);
      const matchBadge = item.badge.toLowerCase().includes(query);
      const matchKeywords = item.keywords.some(k => k.toLowerCase().includes(query));
      const matchCategory = cat.title.toLowerCase().includes(query);
      return matchNum || matchLabel || matchBadge || matchKeywords || matchCategory;
    });
    return { ...cat, visibleItems: matchingItems };
  }).filter(cat => !query || cat.visibleItems.length > 0);

  const totalMatches = filteredCategories.reduce((acc, cat) => acc + cat.visibleItems.length, 0);

  const pinnedItems = useMemo(
    () =>
      pinnedPaths
        .map(p => ALL_FLAT_NAV_ITEMS.find(item => item.path === p))
        .filter((x): x is typeof ALL_FLAT_NAV_ITEMS[number] => Boolean(x)),
    [pinnedPaths]
  );

  const recentItems = useMemo(
    () =>
      recentPaths
        .map(p => ALL_FLAT_NAV_ITEMS.find(item => item.path === p))
        .filter((x): x is typeof ALL_FLAT_NAV_ITEMS[number] => Boolean(x)),
    [recentPaths]
  );

  // COMPACT RAIL VIEW (62px width)
  if (isCollapsed) {
    return (
      <div
        className="sidebar sidebar-collapsed"
        style={{
          width: '62px',
          minWidth: '62px',
          alignItems: 'center',
          transition: 'width 0.18s ease'
        }}
      >
        <div
          style={{
            padding: '12px 6px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          <div
            title={`${APP_NAME} v${APP_VERSION} — Click to Expand Sidebar (Ctrl+B)`}
            onClick={onToggleCollapse}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.25)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <circle cx="32" cy="32" r="28" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.45" />
              <path d="M32 32 L18.5 8.6 A27 27 0 0 1 45.5 8.6 Z" fill="#38bdf8" opacity="0.92" />
              <path d="M32 32 L59 32 A27 27 0 0 1 45.5 55.4 Z" fill="#38bdf8" opacity="0.92" />
              <path d="M32 32 L18.5 55.4 A27 27 0 0 1 5 32 Z" fill="#38bdf8" opacity="0.92" />
              <circle cx="32" cy="32" r="8.5" fill="#0b1220" />
              <circle cx="32" cy="32" r="5.0" fill="#38bdf8" />
            </svg>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Sidebar (Ctrl+B)"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#00e5ff',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            »
          </button>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Search All 35 Modules (Ctrl+K)"
            style={{
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.28)',
              color: '#00e5ff',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            🔍
          </button>
        </div>

        <div
          className="sidebar-nav"
          style={{
            width: '100%',
            padding: '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            overflowY: 'auto'
          }}
        >
          {ALL_FLAT_NAV_ITEMS.map(item => {
            const isPinned = pinnedPaths.includes(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={`M${String(item.moduleNumber).padStart(2, '0')}: ${item.label} [${item.badge}] — ${item.categoryTitle}`}
                style={({ isActive }) => ({
                  position: 'relative',
                  width: '44px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: isActive ? '#000' : item.categoryColor,
                  background: isActive ? item.categoryColor : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isActive ? item.categoryColor : `${item.categoryColor}40`}`,
                  boxShadow: isActive ? `0 0 10px ${item.categoryColor}60` : 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                })}
              >
                M{String(item.moduleNumber).padStart(2, '0')}
                {isPinned && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '1px',
                      fontSize: '0.52rem',
                      color: '#ffb703'
                    }}
                  >
                    ★
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar" style={{ transition: 'width 0.18s ease' }}>
      <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
            boxShadow: '0 0 10px rgba(56, 189, 248, 0.22)'
          }}>
            <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <circle cx="32" cy="32" r="28" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.45" />
              <path d="M32 32 L18.5 8.6 A27 27 0 0 1 45.5 8.6 Z" fill="#38bdf8" opacity="0.92" />
              <path d="M32 32 L59 32 A27 27 0 0 1 45.5 55.4 Z" fill="#38bdf8" opacity="0.92" />
              <path d="M32 32 L18.5 55.4 A27 27 0 0 1 5 32 Z" fill="#38bdf8" opacity="0.92" />
              <circle cx="32" cy="32" r="8.5" fill="#0b1220" />
              <circle cx="32" cy="32" r="5.0" fill="#38bdf8" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', margin: 0, lineHeight: 1.2 }}>{APP_NAME}</h1>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
              v{APP_VERSION} // {VV_SUMMARY_BADGE}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse Sidebar into Compact Rail (Ctrl+B)"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: 'var(--color-text-muted)',
            borderRadius: '5px',
            padding: '2px 7px',
            fontSize: '0.74rem',
            cursor: 'pointer'
          }}
        >
          «
        </button>
      </div>

      <div className="sidebar-search-container">
        <div className="sidebar-search-row">
          <input
            type="text"
            className="sidebar-search-input"
            placeholder={`Search ${TOTAL_TOOLS_COUNT} tools (Ctrl+K)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm ? (
            <button
              className="sidebar-search-clear"
              title="Clear search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          ) : (
            <button
              className="sidebar-search-clear"
              title="Open Command Palette (Ctrl+K / ⌘K)"
              onClick={onOpenCommandPalette}
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-primary)',
                padding: '2px 4px',
                borderRadius: '3px',
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                lineHeight: 1
              }}
            >
              ⌘K
            </button>
          )}
        </div>
        <div className="sidebar-search-meta">
          <span>{query ? `Showing ${totalMatches} of ${TOTAL_TOOLS_COUNT} tools` : `7 Categories (${TOTAL_TOOLS_COUNT} Tools)`}</span>
          {!query && (
            <button className="sidebar-toggle-all-btn" onClick={toggleAll}>
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-nav">
        {/* Pinned Favorites Section (when not searching) */}
        {!query && pinnedItems.length > 0 && (
          <div style={{ marginBottom: '6px', borderBottom: '1px solid rgba(255, 183, 3, 0.18)', paddingBottom: '4px' }}>
            <button
              type="button"
              className="sidebar-category-header"
              onClick={() => setShowPinnedSection(prev => !prev)}
            >
              <div className="sidebar-category-title" style={{ color: '#ffb703' }}>
                <span style={{ fontSize: '0.82rem' }}>★</span>
                <span>Pinned Favorites</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="sidebar-category-badge" style={{ color: '#ffb703' }}>
                  {pinnedItems.length}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                  {showPinnedSection ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {showPinnedSection && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {pinnedItems.map(item => (
                  <NavLink
                    key={`pinned-${item.path}`}
                    to={item.path}
                    className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span
                        role="button"
                        title="Unpin from Favorites"
                        onClick={(e) => onTogglePin(item.path, e)}
                        style={{ color: '#ffb703', fontSize: '0.74rem', cursor: 'pointer', lineHeight: 1.35, flexShrink: 0 }}
                      >
                        ★
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: item.categoryColor,
                        fontWeight: 700,
                        minWidth: '18px',
                        lineHeight: 1.4,
                        flexShrink: 0
                      }}>
                        {String(item.moduleNumber).padStart(2, '0')}
                      </span>
                      <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>
                        {item.label}
                      </span>
                    </span>
                    <span className="sidebar-module-badge">
                      {item.badge}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recently Visited Section (when not searching) */}
        {!query && recentItems.length > 1 && (
          <div style={{ marginBottom: '6px', borderBottom: '1px solid rgba(148, 163, 184, 0.14)', paddingBottom: '4px' }}>
            <div className="sidebar-category-header" style={{ paddingRight: '10px' }}>
              <div
                className="sidebar-category-title"
                style={{ color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setShowRecentSection(prev => !prev)}
              >
                <span style={{ fontSize: '0.78rem' }}>🕒</span>
                <span>Recent Modules</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={onClearRecent}
                  title="Clear recent history"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.62rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear
                </button>
                <span
                  style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowRecentSection(prev => !prev)}
                >
                  {showRecentSection ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {showRecentSection && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recentItems.slice(0, 4).map(item => (
                  <NavLink
                    key={`recent-${item.path}`}
                    to={item.path}
                    className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                    style={{ opacity: 0.9 }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.68rem',
                        color: item.categoryColor,
                        fontWeight: 700,
                        minWidth: '18px',
                        lineHeight: 1.4,
                        flexShrink: 0
                      }}>
                        {String(item.moduleNumber).padStart(2, '0')}
                      </span>
                      <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>
                        {item.label}
                      </span>
                    </span>
                    <span className="sidebar-module-badge">
                      {item.badge}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {cat.visibleItems.map(item => {
                      const isPinned = pinnedPaths.includes(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                        >
                          <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                            <span
                              role="button"
                              title={isPinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
                              onClick={(e) => onTogglePin(item.path, e)}
                              style={{
                                color: isPinned ? '#ffb703' : 'rgba(148, 163, 184, 0.4)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                lineHeight: 1.35,
                                flexShrink: 0
                              }}
                            >
                              {isPinned ? '★' : '☆'}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.68rem',
                              color: cat.color,
                              opacity: 0.85,
                              fontWeight: 700,
                              minWidth: '18px',
                              lineHeight: 1.4,
                              flexShrink: 0
                            }}>
                              {String(item.moduleNumber).padStart(2, '0')}
                            </span>
                            <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>
                              {item.label}
                            </span>
                          </span>
                          <span className="sidebar-module-badge">
                            {item.badge}
                          </span>
                        </NavLink>
                      );
                    })}
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

const AppShell: React.FC<{
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLockSession: () => void;
}> = ({ isCommandPaletteOpen, setIsCommandPaletteOpen, onLockSession }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('radpro_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('radpro_pinned_modules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore parse error
    }
    return DEFAULT_PINNED_PATHS;
  });

  const [recentPaths, setRecentPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('radpro_recent_modules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore parse error
    }
    return [];
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('radpro_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
      return next;
    });
  };

  const handleTogglePin = (path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPinnedPaths(prev => {
      const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      try {
        localStorage.setItem('radpro_pinned_modules', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleClearRecent = () => {
    setRecentPaths([]);
    try {
      localStorage.setItem('radpro_recent_modules', JSON.stringify([]));
    } catch {
      // Ignore storage errors
    }
  };

  const {
    activeSource,
    pinnedResults,
    liveModuleTelemetry,
    telemetryDeltaSummary,
    clearLiveModuleTelemetry,
    formatActivityGBq
  } = useRegulatory();

  // Track recent module visits and reset workspace tab to 'tool' on route change
  const [workspaceTab, setWorkspaceTab] = useState<'tool' | 'info'>('tool');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('tutor');
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  const toggleInspectorTab = useCallback((tab: InspectorTabId) => {
    setIsInspectorOpen(prevOpen => {
      const nextOpen = prevOpen && inspectorTab === tab ? false : true;
      setInspectorTab(tab);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
      return nextOpen;
    });
  }, [inspectorTab]);

  useEffect(() => {
    const handleOpenInspector = (e: Event) => {
      const evt = e as CustomEvent<{ tab?: InspectorTabId }>;
      if (evt.detail?.tab) {
        setInspectorTab(evt.detail.tab);
      }
      setIsInspectorOpen(true);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    };
    window.addEventListener('radpro:open-inspector', handleOpenInspector);
    return () => window.removeEventListener('radpro:open-inspector', handleOpenInspector);
  }, []);

  const handleSelectWorkspaceTab = (tab: 'tool' | 'info') => {
    setWorkspaceTab(tab);
    if (tab === 'tool') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    }
  };

  const handleApplySourceToCurrentModule = (source: GlobalSourceContext) => {
    const params = new URLSearchParams(location.search);
    params.set('isotope', source.isotope);
    params.set('nuclide', source.isotope);
    params.set('search', source.isotope);
    params.set('activity', String(source.activityGBq));
    params.set('unit', 'GBq');
    params.set('distance', String(source.distanceM));
    params.set('material', source.shieldMaterial);
    params.set('thickness', String(source.shieldThicknessCm));
    params.set('sync', String(Date.now()));
    window.dispatchEvent(new CustomEvent('radpro:apply-source', { detail: source }));
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    setWorkspaceTab('tool');
  };

  const handleCopyScenarioPermalink = () => {
    const params = new URLSearchParams(location.search);
    params.set('isotope', activeSource.isotope);
    params.set('activity', String(activeSource.activityGBq));
    params.set('distance', String(activeSource.distanceM));
    params.set('material', activeSource.shieldMaterial);
    params.set('thickness', String(activeSource.shieldThicknessCm));
    if (liveModuleTelemetry) {
      Object.entries(liveModuleTelemetry.parameters).forEach(([k, v]) => {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        params.set(cleanKey, String(v));
      });
    }
    const shareUrl = `${window.location.origin}${location.pathname}?${params.toString()}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const [prevMainPath, setPrevMainPath] = useState<string>(location.pathname);
  if (location.pathname !== prevMainPath) {
    setPrevMainPath(location.pathname);
    setWorkspaceTab('tool');
    const matched = ALL_FLAT_NAV_ITEMS.find(item => item.path === location.pathname);
    if (matched) {
      setRecentPaths(prev => [matched.path, ...prev.filter(p => p !== matched.path)].slice(0, 5));
    }
  }

  useEffect(() => {
    clearLiveModuleTelemetry();
  }, [location.pathname, clearLiveModuleTelemetry]);

  useEffect(() => {
    try {
      localStorage.setItem('radpro_recent_modules', JSON.stringify(recentPaths));
    } catch {
      // Ignore storage errors
    }
  }, [recentPaths]);

  const activeModuleInfo = useMemo(() => {
    return ALL_FLAT_NAV_ITEMS.find(item => item.path === location.pathname) || null;
  }, [location.pathname]);

  const activeUserGuide = useMemo(() => {
    if (!activeModuleInfo) return null;
    return MODULE_USER_GUIDES[activeModuleInfo.moduleNumber] || null;
  }, [activeModuleInfo]);

  const handleStepModule = useCallback((direction: -1 | 1) => {
    const idx = ALL_FLAT_NAV_ITEMS.findIndex(item => item.path === location.pathname);
    const currentIdx = idx >= 0 ? idx : 0;
    const nextIdx = (currentIdx + direction + ALL_FLAT_NAV_ITEMS.length) % ALL_FLAT_NAV_ITEMS.length;
    navigate(ALL_FLAT_NAV_ITEMS[nextIdx].path);
  }, [location.pathname, navigate]);

  // Global keyboard shortcuts: Ctrl+B (Sidebar), Alt+Left/Right (Module Stepper), Alt+I (Guide), Alt+T (Physics Tutor), Esc (Close Drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepModule(-1);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepModule(1);
      } else if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        toggleInspectorTab('guide');
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleInspectorTab('tutor');
      } else if (e.key === 'Escape' && isInspectorOpen) {
        setIsInspectorOpen(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, isInspectorOpen, inspectorTab, toggleInspectorTab, handleStepModule]);

  return (
    <div className="app-container">
      <Sidebar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        pinnedPaths={pinnedPaths}
        onTogglePin={handleTogglePin}
        recentPaths={recentPaths}
        onClearRecent={handleClearRecent}
      />
      <main className="main-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <div className="no-print">
          <RegulatorySelectorBar
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebarCollapse}
            activeModuleInfo={activeModuleInfo}
            onStepModule={handleStepModule}
            isActivePinned={activeModuleInfo ? pinnedPaths.includes(activeModuleInfo.path) : false}
            onTogglePinActive={activeModuleInfo ? () => handleTogglePin(activeModuleInfo.path) : undefined}
            onLockSession={onLockSession}
            onOpenAbout={() => setIsAboutModalOpen(true)}
          />
        </div>
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <AboutStandardsModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
          onOpenVerification={() => {
            setIsAboutModalOpen(false);
            navigate('/verify');
          }}
        />

        {/* Split Workspace Stage: [ Center Active Module Canvas ] + [ Docked Right-Hand Inspector Drawer ] */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, minWidth: 0, padding: '12px 24px 24px 24px', overflowY: 'auto' }}>
            {/* Single Consolidated Compact Workspace Ribbon (Reclaims ~190 px of vertical height) */}
            {activeModuleInfo && (
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '6px 10px',
                  background: 'rgba(9, 15, 26, 0.88)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px'
                }}
              >
                {/* Left: Active Module Mode Switcher & Live Context Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                  <button
                    type="button"
                    className={workspaceTab === 'tool' ? 'active' : ''}
                    onClick={() => handleSelectWorkspaceTab('tool')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    M{String(activeModuleInfo.moduleNumber).padStart(2, '0')}: {activeModuleInfo.label}
                  </button>

                  <span
                    title={activeUserGuide?.whatItDoes}
                    style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                      maxWidth: '380px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {liveModuleTelemetry
                      ? liveModuleTelemetry.regimeSummary
                      : `Ref: ${activeSource.isotope} • ${formatActivityGBq(activeSource.activityGBq)} @ ${activeSource.distanceM} m`}
                  </span>
                </div>

                {/* Right: Unified Inspector Drawer Triggers & Permalink Copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={isInspectorOpen && inspectorTab === 'source' ? 'active' : ''}
                    onClick={() => toggleInspectorTab('source')}
                    title="Open Global Reference Source, Smart Unit Converter & Cross-Module Pipeline"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Source ({activeSource.isotope})
                  </button>

                  <button
                    type="button"
                    className={isInspectorOpen && inspectorTab === 'grounding' ? 'active' : ''}
                    onClick={() => toggleInspectorTab('grounding')}
                    title="Inspect Physical Pellet Mass, Real Survey Meter Dead-Time Response, GUM ±2σ Uncertainty & NIST XCOM Provenance"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Physical Grounding
                  </button>

                  <button
                    type="button"
                    className={isInspectorOpen && inspectorTab === 'pinboard' ? 'active' : ''}
                    onClick={() => toggleInspectorTab('pinboard')}
                    title="Open Calculation Pinboard, .radproj Save/Load & Multi-Module Master Dossier"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Pins ({pinnedResults.length})
                  </button>

                  <button
                    type="button"
                    className={(isInspectorOpen && inspectorTab === 'guide') || workspaceTab === 'info' ? 'active' : ''}
                    onClick={() => toggleInspectorTab('guide')}
                    title="Open Tool Info, Worked Benchmark & Mathematical Reference (Shortcut: Alt+I)"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Guide
                  </button>

                  <button
                    type="button"
                    className={isInspectorOpen && inspectorTab === 'tutor' ? 'active' : ''}
                    onClick={() => toggleInspectorTab('tutor')}
                    title="Open Side-by-Side Interactive 'Why Does This Happen?' Physics Tutor (Shortcut: Alt+T)"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Physics Tutor{telemetryDeltaSummary ? ' • Δ' : ''}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyScenarioPermalink}
                    title="Copy shareable scenario permalink URL to clipboard"
                    style={{ padding: '4px 9px', borderRadius: '5px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {copiedShareLink ? '✓ Link Copied' : 'Share Link'}
                  </button>
                </div>
              </div>
            )}

            {workspaceTab === 'info' && activeModuleInfo && (
              <Suspense fallback={<ModuleLoadingSkeleton />}>
                <ModuleInfoTabPanel
                  moduleInfo={activeModuleInfo}
                  onReturnToTool={() => {
                    handleSelectWorkspaceTab('tool');
                  }}
                />
              </Suspense>
            )}

            <div style={{ display: workspaceTab === 'info' ? 'none' : 'block' }}>
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
                  <Route path="/xray-distortion" element={<XRayDistortionModule />} />
                  <Route path="/internal-dose" element={<InternalDosimetryModule />} />
                  <Route path="/emr-safety" element={<EMRModule />} />
                  <Route path="/criticality" element={<CriticalityModule />} />
                  <Route path="/spectroscopy" element={<SpectroscopyModule />} />
                  <Route path="/marssim" element={<MARSSIMModule />} />
                  <Route path="/brachytherapy" element={<BrachytherapyModule />} />
                  <Route path="/first-responder" element={<FirstResponderModule />} />
                  <Route path="/cbrn-consequence" element={<CBRNConsequenceModule />} />
                  <Route path="/nuclear-weapons-effects" element={<NuclearWeaponEffectsModule />} />
                  <Route path="/medical-countermeasures" element={<MedicalCountermeasuresModule />} />
                  <Route path="/caas-criticality" element={<CAASCriticalityModule />} />
                  <Route path="/tactical-gis" element={<TacticalGISModule />} />
                  <Route path="/incidents" element={<HistoricalIncidentsModule />} />
                  <Route path="/global-map" element={<GlobalNuclearMapModule />} />
                  <Route path="/monte-carlo" element={<MonteCarloModule />} />
                  <Route path="/hardware" element={<DetectorHardwareModule />} />
                  <Route path="/scenarios" element={<ScenarioBuilderModule />} />
                  <Route path="/literature" element={<LiteratureModule />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* Right-Hand Docked Split Workspace Inspector Drawer */}
          {isInspectorOpen && (
            <Suspense fallback={null}>
              <WorkspaceInspectorDrawer
                isOpen={isInspectorOpen}
                activeTab={inspectorTab}
                onSelectTab={tab => setInspectorTab(tab)}
                onClose={() => {
                  setIsInspectorOpen(false);
                  setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
                }}
                onOpenFullWidthGuide={() => {
                  setIsInspectorOpen(false);
                  handleSelectWorkspaceTab('info');
                }}
                activeModuleInfo={activeModuleInfo}
                onApplySourceToCurrentModule={handleApplySourceToCurrentModule}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = sessionStorage.getItem('radpro_auth');
      return auth === 'true' || auth === 'demo';
    } catch {
      return false;
    }
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Global Ctrl+K / Cmd+K and custom event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setIsCommandPaletteOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, []);

  const handleLogin = (mode: 'operator' | 'demo' = 'operator') => {
    try {
      sessionStorage.setItem('radpro_auth', mode === 'demo' ? 'demo' : 'true');
      localStorage.removeItem('radpro_auth');
    } catch {
      // Ignore storage quota errors in private mode
    }
    setIsAuthenticated(true);
  };

  const handleLockSession = () => {
    try {
      sessionStorage.removeItem('radpro_auth');
      localStorage.removeItem('radpro_auth');
    } catch {
      // Ignore storage access errors
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <RegulatoryProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <AppShell
            isCommandPaletteOpen={isCommandPaletteOpen}
            setIsCommandPaletteOpen={setIsCommandPaletteOpen}
            onLockSession={handleLockSession}
          />
        </Router>
      </RegulatoryProvider>
    </ErrorBoundary>
  );
};

export default App;
