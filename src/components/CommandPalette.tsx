import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  badge: string;
  path: string;
  description: string;
  keywords: string[];
  icon: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  // --- 1. DOSIMETRY & ALARA (Modules 1-5) ---
  {
    id: 'mod-dose',
    title: 'Module 1: Point Source Dose Calculator',
    category: 'Dosimetry & ALARA',
    categoryColor: '#00e5ff',
    badge: 'ICRP-103',
    path: '/dose',
    description: 'Calculate gamma & beta dose rates, inverse square law, attenuation with Taylor/Berger buildup factors.',
    keywords: ['module 1', 'm01', 'dose', 'calculator', 'inverse square', 'buildup', 'taylor', 'berger', 'curie', 'becquerel', 'alara'],
    icon: '◎'
  },
  {
    id: 'mod-worker',
    title: 'Module 2: 3D Worker Dosimetry & ALARA Shift Tracker',
    category: 'Dosimetry & ALARA',
    categoryColor: '#00e5ff',
    badge: 'Occupational',
    path: '/worker',
    description: 'Multi-worker stay-time tracking, 3D room voxel field, and multi-organ dose accumulation (Hp(10), Hp(3), Hp(0.07)).',
    keywords: ['module 2', 'm02', 'worker', 'dosimetry', 'alara', 'shift', 'stay time', 'organ dose', 'hp10', 'hp3', 'extremity'],
    icon: '👤'
  },
  {
    id: 'mod-internal',
    title: 'Module 3: Internal Dosimetry & Biokinetics',
    category: 'Dosimetry & ALARA',
    categoryColor: '#00e5ff',
    badge: 'MIRD / ICRP',
    path: '/internal-dose',
    description: 'ICRP 30/68/78 compartmental intake retention, inhalation classes (F/M/S), committed effective dose equivalent.',
    keywords: ['module 3', 'm03', 'internal', 'mird', 'biokinetics', 'intake', 'inhalation', 'ingestion', 'cede', 'organ burden'],
    icon: '🫁'
  },
  {
    id: 'mod-spatial3d',
    title: 'Module 4: 3D Spatial Room & Volumetric Workspace',
    category: 'Dosimetry & ALARA',
    categoryColor: '#00e5ff',
    badge: 'Point Cloud',
    path: '/spatial3d',
    description: 'Interactive WebGL 3D radiation voxel cloud, virtual sensor placement, and ray-AABB geometric shield boundaries.',
    keywords: ['module 4', 'm04', '3d', 'spatial', 'cad', 'workspace', 'mesh', 'voxels', 'isodose', 'point cloud', 'sensors'],
    icon: '📦'
  },
  {
    id: 'mod-visualisation',
    title: 'Module 5: Radiation Heatmap & Isodose Visualizer',
    category: 'Dosimetry & ALARA',
    categoryColor: '#00e5ff',
    badge: 'Heatmap',
    path: '/visualisation',
    description: '2D multi-source planar radiation field contours, isodose exclusion zones, and line-of-sight barrier shadowing.',
    keywords: ['module 5', 'm05', 'heatmap', 'isodose', 'contour', 'shadowing', '2d map', 'exclusion zone'],
    icon: '🗺️'
  },

  // --- 2. EMERGENCY & CBRN (Modules 6-15) ---
  {
    id: 'mod-first-responder',
    title: 'Module 6: Tactical First Responder & CBRN Hazard Command',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'ERG 2024 / REAC-TS',
    path: '/first-responder',
    description: 'Immediate RDD blast/radiation zoning, 10 R/h turn-back limits, worker dose tiers, and field decontamination protocols.',
    keywords: ['module 6', 'm06', 'first responder', 'cbrn', 'hazmat', 'triage', 'cordon', 'standoff', 'dirty bomb', 'rdd', 'turn-back'],
    icon: '🚨'
  },
  {
    id: 'mod-cbrn-consequence',
    title: 'Module 7: CBRN Fallout & Consequence Management',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'Way-Wigner / NCRP-165',
    path: '/cbrn-consequence',
    description: 't^-1.2 fission product decay, multi-layer shelter protection factors, egress optimizer, and cytogenetic biodosimetry.',
    keywords: ['module 7', 'm07', 'fallout', 'way wigner', 'shelter', 'protection factor', 'egress', 'aegl', 'chemical', 'biodosimetry', 'metrepol'],
    icon: '🛡️'
  },
  {
    id: 'mod-nuclear-weapons',
    title: 'Module 8: Nuclear Weapon Effects Simulator',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'Kingery-Bulmash',
    path: '/nuclear-weapons-effects',
    description: 'Blast overpressure (psi), dynamic wind speed, prompt thermal fluence, initial radiation, HOB/DOB subterranean bursts, and HEMP.',
    keywords: ['module 8', 'm08', 'nuclear', 'weapon', 'blast', 'overpressure', 'shockwave', 'thermal', 'burn', 'hemp', 'emp', 'yield', 'hiroshima'],
    icon: '💥'
  },
  {
    id: 'mod-medical-countermeasures',
    title: 'Module 9: Medical Countermeasures & Radioprotectants',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'DTPA / PB / KI',
    path: '/medical-countermeasures',
    description: 'Clinical pharmacokinetics: Potassium Iodide (KI), Prussian Blue decorporation, Ca/Zn-DTPA chelation, and G-CSF.',
    keywords: ['module 9', 'm09', 'medical', 'countermeasures', 'ki', 'potassium iodide', 'prussian blue', 'dtpa', 'chelation', 'decorporation', 'filgrastim'],
    icon: '💊'
  },
  {
    id: 'mod-tactical-gis',
    title: 'Module 10: Tactical GIS & Sensor Mesh ATAK Hub',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'CoT / ATAK',
    path: '/tactical-gis',
    description: 'Sensor mesh inverse multilateration, DoD Cursor-on-Target (CoT v2.0 XML) generation, and tactical GIS layers.',
    keywords: ['module 10', 'm10', 'gis', 'atak', 'wintak', 'cot', 'cursor on target', 'triangulation', 'multilateration', 'mesh', 'picket'],
    icon: '📡'
  },
  {
    id: 'mod-scenarios',
    title: 'Module 11: Incident Scenario Drills (.radcase)',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'INES / Drills',
    path: '/scenarios',
    description: 'Interactive incident exercise authoring and replay (Goiânia, Tokaimura, Industrial Radiography loss, Transport rollover).',
    keywords: ['module 11', 'm11', 'scenario', 'drill', 'incident', 'exercise', 'radcase', 'training', 'triage'],
    icon: '🎯'
  },
  {
    id: 'mod-responder',
    title: 'Module 12: Reverse Triangulation & Source Term Locator',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'Isopleths',
    path: '/responder',
    description: 'Multi-sensor gradient search to pinpoint unshielded radioactive sources and unknown curie inventories.',
    keywords: ['module 12', 'm12', 'responder', 'reverse', 'triangulation', 'search', 'source term', 'pinpoint', 'localization'],
    icon: '📍'
  },
  {
    id: 'mod-plume',
    title: 'Module 13: Atmospheric Dispersion & Gaussian Plume',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'Gaussian / Briggs',
    path: '/plume',
    description: 'Pasquill-Gifford dispersion classes A–F, ground reflection image sources, and centerline touchdown peak solver.',
    keywords: ['module 13', 'm13', 'plume', 'atmospheric', 'pasquill', 'dispersion', 'gaussian', 'touchdown', 'wind', 'fallout'],
    icon: '💨'
  },
  {
    id: 'mod-shielding',
    title: 'Module 14: Shielding & ALARA Protective Action Guides',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'EPA PAG / NBS',
    path: '/shielding',
    description: 'TEDE / thyroid CDE projections, early-phase evacuation triggers, and building structural attenuation.',
    keywords: ['module 14', 'm14', 'shielding', 'pags', 'protective action', 'shelter', 'evacuation', 'epa 400', 'tede'],
    icon: '🏢'
  },
  {
    id: 'mod-transport',
    title: 'Module 15: Transport Packaging & Type A/B Verification',
    category: 'Emergency & CBRN',
    categoryColor: '#ff9f1c',
    badge: 'IAEA SSR-6 / DOT',
    path: '/transport',
    description: 'Class 7 radioactive material transport, Transport Index (TI), Criticality Safety Index (CSI), and placard evaluation.',
    keywords: ['module 15', 'm15', 'transport', 'packaging', 'ssr-6', 'type a', 'type b', 'ti', 'csi', 'placard', 'dot 49 cfr'],
    icon: '🚚'
  },

  // --- 3. BEAMS, X-RAY & EW (Modules 16-20) ---
  {
    id: 'mod-pulsed-xray',
    title: 'Module 16: Pulsed & Flash X-Ray Systems',
    category: 'Beams, X-Ray & EW',
    categoryColor: '#a78bfa',
    badge: 'NCRP-147',
    path: '/xray',
    description: 'Nanosecond pulse duty cycles, dead-time detector saturation burnout, and security inspection exclusion boundaries.',
    keywords: ['module 16', 'm16', 'pulsed', 'flash', 'x-ray', 'duty cycle', 'burnout', 'dead time', 'golden engineering'],
    icon: '⚡'
  },
  {
    id: 'mod-xray-tube',
    title: 'Module 17: X-Ray Tube Simulator & Kramers Spectrum',
    category: 'Beams, X-Ray & EW',
    categoryColor: '#a78bfa',
    badge: 'Birch & Marshall',
    path: '/xray-tube',
    description: 'Simulate bremsstrahlung and characteristic tungsten/molybdenum X-ray spectra, HVL filtration, and tube efficiency.',
    keywords: ['module 17', 'm17', 'xray', 'tube', 'spectrum', 'kramers', 'filtration', 'hvl', 'kvp', 'anode', 'bremsstrahlung'],
    icon: '⚡'
  },
  {
    id: 'mod-xray-distortion',
    title: 'Module 18: X-Ray Distortion & Projection Geometry',
    category: 'Beams, X-Ray & EW',
    categoryColor: '#a78bfa',
    badge: 'SID / OID / Penumbra',
    path: '/xray-distortion',
    description: 'Geometric magnification, geometric penumbra unsharpness (Ug), focal spot blooming, and 3D projection frustum.',
    keywords: ['module 18', 'm18', 'distortion', 'xray', 'sid', 'oid', 'sod', 'penumbra', 'unsharpness', 'magnification', 'asme', 'ndt'],
    icon: '📐'
  },
  {
    id: 'mod-laser',
    title: 'Module 19: Laser Safety & NOHD Optical Bench',
    category: 'Beams, X-Ray & EW',
    categoryColor: '#a78bfa',
    badge: 'ANSI Z136.1',
    path: '/laser',
    description: 'Nominal Ocular Hazard Distance (NOHD), Gaussian beam caustic waist, MPE limits, and optical density (OD) ratings.',
    keywords: ['module 19', 'm19', 'laser', 'nohd', 'mpe', 'optical density', 'gaussian beam', 'caustic', 'divergence', 'eyewear', 'ansi z136'],
    icon: '🔬'
  },
  {
    id: 'mod-emr-safety',
    title: 'Module 20: Electronic Warfare EMR & Microwave Safety',
    category: 'Beams, X-Ray & EW',
    categoryColor: '#a78bfa',
    badge: 'FCC OET-65 / IEEE',
    path: '/emr-safety',
    description: 'Tactical RF radar HUD, Controlled and Uncontrolled standoff boundaries, AESA phased array lobes, and radome reflections.',
    keywords: ['module 20', 'm20', 'emr', 'rf', 'microwave', 'radar', 'electromagnetic', 'sar', 'fcc oet 65', 'ieee c95', 'aesa'],
    icon: '📡'
  },

  // --- 4. NUCLEAR & PHYSICS (Modules 21-25) ---
  {
    id: 'mod-criticality',
    title: 'Module 21: Criticality Safety & Reactor Core Simulator',
    category: 'Nuclear & Physics',
    categoryColor: '#10b981',
    badge: 'Four-Factor',
    path: '/criticality',
    description: 'Four-factor formula, 7x7 heterogeneous fuel assembly, control rod insertion, soluble boron chemistry, and 2D diffusion flux.',
    keywords: ['module 21', 'm21', 'criticality', 'reactor', 'keff', 'multiplication', 'four factor', 'fuel', 'boron', 'flux', 'pwr', 'bwr', 'vver', 'candu'],
    icon: '⚛️'
  },
  {
    id: 'mod-caas-criticality',
    title: 'Module 22: CAAS Criticality Accident Alarm Systems',
    category: 'Nuclear & Physics',
    categoryColor: '#10b981',
    badge: 'ANSI/ANS-8.3',
    path: '/caas-criticality',
    description: 'Nordheim-Fuchs prompt-critical excursion kinetics, Godiva bare-metal bursts, 0.2 Gy/min alarm compliance, and flash kerma.',
    keywords: ['module 22', 'm22', 'caas', 'criticality', 'alarm', 'excursion', 'nordheim fuchs', 'godiva', 'ans 8.3', 'prompt critical', 'burst'],
    icon: '⚠️'
  },
  {
    id: 'mod-monte-carlo',
    title: 'Module 23: Monte Carlo Micro-Kernel (Photon Transport)',
    category: 'Nuclear & Physics',
    categoryColor: '#10b981',
    badge: 'Klein-Nishina',
    path: '/monte-carlo',
    description: 'Stochastic photon transport simulator modeling photoelectric absorption, Compton scattering, and pair production.',
    keywords: ['module 23', 'm23', 'monte carlo', 'stochastic', 'klein nishina', 'compton', 'pair production', 'cross section', 'random walk'],
    icon: '🎲'
  },
  {
    id: 'mod-decay',
    title: 'Module 24: Bateman Decay Kinematics & Radiolysis',
    category: 'Nuclear & Physics',
    categoryColor: '#10b981',
    badge: 'Bateman Chains',
    path: '/decay',
    description: 'Multi-generation radioactive decay and ingrowth differential equation solver with radiolytic G-value gas generation.',
    keywords: ['module 24', 'm24', 'decay', 'bateman', 'kinetics', 'daughter', 'ingrowth', 'radiolysis', 'g-value', 'half-life'],
    icon: '⏳'
  },
  {
    id: 'mod-spectroscopy',
    title: 'Module 25: Gamma Spectroscopy & MCA Peak Search',
    category: 'Nuclear & Physics',
    categoryColor: '#10b981',
    badge: 'HPGe / NaI(Tl)',
    path: '/spectroscopy',
    description: 'Multi-Channel Analyzer (MCA) spectrum simulator, Gaussian deconvolution, FWHM resolution calibration, and isotope identification.',
    keywords: ['module 25', 'm25', 'spectroscopy', 'mca', 'gamma', 'fwhm', 'channel', 'hpge', 'nai', 'peak search', 'photopeak'],
    icon: '📊'
  },

  // --- 5. CLINICAL & DECOM (Modules 26-27) ---
  {
    id: 'mod-brachytherapy',
    title: 'Module 26: HDR/LDR Brachytherapy Clinical Treatment Planner',
    category: 'Clinical & Decom',
    categoryColor: '#14b8a6',
    badge: 'AAPM TG-43U1',
    path: '/brachytherapy',
    description: 'AAPM TG-43 formalism: air kerma strength, dose rate constant, radial dose function g_L(r), and 2D anisotropy F(r,θ).',
    keywords: ['module 26', 'm26', 'brachytherapy', 'tg-43', 'seed', 'prostate', 'anisotropy', 'dose rate constant', 'ir-192', 'i-125', 'air kerma'],
    icon: '💉'
  },
  {
    id: 'mod-marssim',
    title: 'Module 27: MARSSIM Decommissioning & Site Release',
    category: 'Clinical & Decom',
    categoryColor: '#14b8a6',
    badge: 'NUREG-1575',
    path: '/marssim',
    description: 'Final status survey release: Wilcoxon Rank Sum (WRS) test, Sign Test, DCGL derivation, Class 1/2/3 grid spacing.',
    keywords: ['module 27', 'm27', 'marssim', 'decommissioning', 'dcgl', 'wrs', 'sign test', 'survey', 'nureg 1575', 'site release'],
    icon: '📋'
  },

  // --- 6. DATABASES & REGS (Modules 28-33) ---
  {
    id: 'mod-nuclides',
    title: 'Module 28: Comprehensive Radionuclide Database',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: 'ICRP-107',
    path: '/nuclides',
    description: 'Search hundreds of isotopes for decay modes, branching ratios, half-lives, gamma dose rate constants, and ALI/DAC limits.',
    keywords: ['module 28', 'm28', 'nuclide', 'isotope', 'half-life', 'decay mode', 'energy', 'branching', 'cs-137', 'co-60', 'i-131', 'am-241'],
    icon: '📖'
  },
  {
    id: 'mod-equipment',
    title: 'Module 29: Industrial & Defense Equipment Catalog',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: 'Detectors & Gauges',
    path: '/equipment',
    description: 'Tactical reference of nuclear moisture gauges, well-logging tools, NDT projectors, RTGs, and first-responder protocols.',
    keywords: ['module 29', 'm29', 'equipment', 'detector', 'geiger', 'scintillator', 'moisture gauge', 'well logging', 'ndt', 'rtg'],
    icon: '🧰'
  },
  {
    id: 'mod-incidents',
    title: 'Module 30: Historical Incidents Forensic Database',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: 'INES 1-7',
    path: '/incidents',
    description: '130+ years of civilian and defense radiological history: Chernobyl, Fukushima, Goiânia, Tokaimura, SL-1, and Kyshtym.',
    keywords: ['module 30', 'm30', 'historical', 'incident', 'accident', 'chernobyl', 'fukushima', 'goiania', 'tokaimura', 'sl-1', 'forensics', 'ines'],
    icon: '🏛️'
  },
  {
    id: 'mod-global-map',
    title: 'Module 31: Global 3D Earth Hub & Nuclear Infrastructure',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: 'Reactors & Tests',
    path: '/global-map',
    description: 'Interactive 3D WebGL globe with 400+ nuclear power reactors, 2,000+ historical nuclear tests, EPZ keyhole planner, and CTBTO yield inversion.',
    keywords: ['module 31', 'm31', 'globe', 'map', 'earth', 'reactor', 'detonation', 'test site', 'epz', 'evacuation', 'ctbto', 'seismic', '3d'],
    icon: '🌍'
  },
  {
    id: 'mod-hardware',
    title: 'Module 32: Live Hardware & Detector Metrology Engine',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: 'WebSerial / Audio',
    path: '/hardware',
    description: 'Real-time USB serial / audio pulse counter, Currie critical decision level (Lc/Ld), and paralyzable dead-time compensation.',
    keywords: ['module 32', 'm32', 'hardware', 'serial', 'audio', 'pulse', 'cpm', 'cps', 'currie', 'dead-time', 'geiger', 'webserial'],
    icon: '🔌'
  },
  {
    id: 'mod-reg',
    title: 'Module 33: Regulatory Compliance & ALARA Dashboard',
    category: 'Databases & Regs',
    categoryColor: '#38bdf8',
    badge: '10 CFR 20 / ICRP',
    path: '/reg',
    description: 'Statutory compliance engine tracking multi-organ worker limits under US NRC (10 CFR 20), ICRP 103, and IAEA GSR Part 3.',
    keywords: ['module 33', 'm33', 'regulatory', 'nrc', 'agreement state', 'compliance', 'limits', '10 cfr 20', 'icrp 103', 'iaea gsr part 3'],
    icon: '⚖️'
  },

  // --- 7. VERIFICATION & QA (Modules 34-35) ---
  {
    id: 'mod-verify',
    title: 'Module 34: Institutional Verification & Validation Engine',
    category: 'Verification & QA',
    categoryColor: '#c084fc',
    badge: '43/43 Pass',
    path: '/verify',
    description: '43 gold-standard analytical & numerical stress benchmarks (35 analytical + 8 stress tests) verifying IEEE 730 / NQA-1 software quality.',
    keywords: ['module 34', 'm34', 'verify', 'test', 'sqa', 'validation', 'benchmark', 'qa', 'audit', 'nqa-1', 'iso 17025'],
    icon: '✅'
  },
  {
    id: 'mod-literature',
    title: 'Module 35: Core Literature Citations & Mathematical Proofs',
    category: 'Verification & QA',
    categoryColor: '#c084fc',
    badge: 'KaTeX Proofs',
    path: '/literature',
    description: 'Exhaustive bibliography of ICRU, ICRP, NCRP, IAEA, and ANSI publications with KaTeX equation proofs.',
    keywords: ['module 35', 'm35', 'literature', 'citations', 'physics', 'equations', 'formulations', 'references', 'katex'],
    icon: '📚'
  }
];

// Quick Radionuclide Shortcuts
const COMMON_NUCLIDES = [
  { symbol: 'Cs-137', name: 'Cesium-137', path: '/dose?isotope=Cs-137', desc: 'Fission product / High-activity RDD hazard (662 keV)' },
  { symbol: 'Co-60', name: 'Cobalt-60', path: '/dose?isotope=Co-60', desc: 'Industrial sterilizer / Radiotherapy source (1.17, 1.33 MeV)' },
  { symbol: 'I-131', name: 'Iodine-131', path: '/first-responder?nuclide=I-131', desc: 'Thyroid critical fission product (364 keV beta/gamma)' },
  { symbol: 'Ir-192', name: 'Iridium-192', path: '/dose?isotope=Ir-192', desc: 'Industrial radiography NDT source' },
  { symbol: 'Am-241', name: 'Americium-241', path: '/first-responder?nuclide=Am-241', desc: 'Alpha emitter / Moisture density gauge / Well-logging' },
  { symbol: 'Sr-90', name: 'Strontium-90', path: '/dose?isotope=Sr-90', desc: 'Bone-seeking beta emitter / RTG heat source' },
  { symbol: 'U-235', name: 'Uranium-235', path: '/criticality', desc: 'Fissile isotope for reactor fuel and nuclear weapons' },
  { symbol: 'Pu-239', name: 'Plutonium-239', path: '/criticality', desc: 'Fissile weapons-grade actinide' },
  { symbol: 'F-18', name: 'Fluorine-18', path: '/dose?isotope=F-18', desc: 'PET radiopharmaceutical positron emitter (511 keV)' },
  { symbol: 'Tc-99m', name: 'Technetium-99m', path: '/dose?isotope=Tc-99m', desc: 'Nuclear medicine diagnostic tracer (140.5 keV)' }
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter categories
  const categories = useMemo(() => {
    const set = new Set(COMMAND_ITEMS.map((item) => item.category));
    return ['All', ...Array.from(set), 'Nuclides'];
  }, []);

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (selectedFilter === 'Nuclides') {
      return COMMON_NUCLIDES.filter(
        (n) => !q || n.symbol.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)
      ).map((n) => ({
        id: `nuclide-${n.symbol}`,
        title: `${n.symbol} (${n.name})`,
        category: 'Radionuclide Shortcut',
        categoryColor: '#38bdf8',
        badge: 'Isotope',
        path: n.path,
        description: n.desc,
        keywords: [n.symbol, n.name],
        icon: '⚛️'
      }));
    }

    return COMMAND_ITEMS.filter((item) => {
      // Category filter check
      if (selectedFilter !== 'All' && item.category !== selectedFilter) {
        return false;
      }
      if (!q) return true;

      // Text search match
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBadge = item.badge.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(q));

      return matchTitle || matchBadge || matchCategory || matchDesc || matchKeyword;
    });
  }, [search, selectedFilter]);

  // Reset selected index on filter / search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: CommandItem) => {
    navigate(item.path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(180deg, rgba(13, 24, 41, 0.98) 0%, rgba(8, 15, 26, 0.98) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)'
          }}
        >
          <span style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 35 modules, isotopes (Cs-137, I-131), standards (10 CFR 20)..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '1.05rem',
              fontFamily: 'inherit'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ✕
            </button>
          )}
          <span
            style={{
              padding: '2px 8px',
              fontSize: '0.7rem',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)'
            }}
          >
            ESC
          </span>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 18px',
            background: 'rgba(0, 0, 0, 0.35)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#00e5ff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {filteredResults.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>🔎</div>
              <div>No modules or isotopes match &ldquo;{search}&rdquo;</div>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      color: item.categoryColor,
                      flexShrink: 0
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          color: isSelected ? '#00e5ff' : '#f1f5f9',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#94a3b8',
                          flexShrink: 0
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.description}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.70rem',
                      color: item.categoryColor,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${item.categoryColor}30`,
                      flexShrink: 0
                    }}
                  >
                    {item.category}
                  </span>

                  {isSelected && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
                      ↵
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hotkey Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 18px',
            background: 'rgba(0, 0, 0, 0.45)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.72rem',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>↑</kbd>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px', marginLeft: '2px' }}>↓</kbd> to navigate
            </span>
            <span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>↵</kbd> to open
            </span>
            <span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>esc</kbd> to dismiss
            </span>
          </div>
          <div>
            Showing <strong style={{ color: '#fff' }}>{filteredResults.length}</strong> of {COMMAND_ITEMS.length} modules
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
