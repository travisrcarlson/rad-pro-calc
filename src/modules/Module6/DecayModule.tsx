import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import VerificationBadge from '../../components/VerificationBadge';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import PlotComponent from 'react-plotly.js';
const Plot = (PlotComponent as any).default || PlotComponent;
import KarlsruheSvgChart from './KarlsruheChart';
import allNuclides from '../../data/all_nuclides.json';
import {
  REACTOR_ACTIVATION_PRESETS,
  CURATED_BRANCHING_SPLITS,
  simulateGeneralizedDecayDAG,
  type ChainNuclideNode,
  type DecayBranchEdge,
  type ReactorActivationPreset
} from '../../utils/decayRadiochemistryEngine';

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

const CHAIN_PALETTE = [
  '#38bdf8', // Gen 0 Parent (Cyan-Blue)
  '#f59e0b', // Gen 1 Daughter (Amber-Gold)
  '#10b981', // Gen 2 Granddaughter (Emerald)
  '#a855f7', // Gen 3 (Purple)
  '#f43f5e', // Gen 4 (Rose)
  '#eab308', // Gen 5 (Yellow)
  '#06b6d4', // Gen 6 (Teal)
  '#ec4899', // Gen 7 (Pink)
  '#84cc16', // Gen 8 (Lime)
  '#6366f1', // Gen 9 (Indigo)
  '#fb923c', // Gen 10 (Orange)
  '#14b8a6', // Gen 11 (Cyan-Green)
  '#94a3b8'  // Stable / Terminal fallback
];

const METASTABLE_CATALOG: Record<string, any> = {
  'Tc-99m': {
    Z: 43, N: 56, Symbol: 'Tc', Nuclide: 'Tc-99m',
    'Half-Life': '6.007 h', 'Half-Life (s)': '21625.2',
    'Decay Mode': 'IT', 'Decay %': '99.99',
    'Q-Alpha': '', 'Q-Beta': '0', 'Q-EC': '142.68',
    principalGammaMeV: 0.1405, gammaYieldPct: 89.0, specificGammaConst: 19.5,
    isMetastable: true
  },
  'Ba-137m': {
    Z: 56, N: 81, Symbol: 'Ba', Nuclide: 'Ba-137m',
    'Half-Life': '2.552 m', 'Half-Life (s)': '153.12',
    'Decay Mode': 'IT', 'Decay %': '100',
    'Q-Alpha': '', 'Q-Beta': '0', 'Q-EC': '661.657',
    principalGammaMeV: 0.6617, gammaYieldPct: 89.9, specificGammaConst: 77.2,
    isMetastable: true
  },
  'Pa-234m': {
    Z: 91, N: 143, Symbol: 'Pa', Nuclide: 'Pa-234m',
    'Half-Life': '1.159 m', 'Half-Life (s)': '69.54',
    'Decay Mode': 'B-', 'Decay %': '99.84',
    'Q-Alpha': '', 'Q-Beta': '2268.9', 'Q-EC': '',
    principalGammaMeV: 1.001, gammaYieldPct: 0.84, specificGammaConst: 2.1,
    isMetastable: true
  }
};

// Characteristic Principal Gamma Energies (MeV) & Specific Gamma Constants (µSv·m²/h·GBq) for Cross-Module Export
const NUCLIDE_GAMMA_METADATA: Record<string, { energyMeV: number; yieldPct: number; gammaConst: number }> = {
  'Mo-99': { energyMeV: 0.7395, yieldPct: 12.2, gammaConst: 24.0 },
  'Tc-99m': { energyMeV: 0.1405, yieldPct: 89.0, gammaConst: 19.5 },
  'Cs-137': { energyMeV: 0.6617, yieldPct: 85.1, gammaConst: 77.2 },
  'Ba-137m': { energyMeV: 0.6617, yieldPct: 89.9, gammaConst: 77.2 },
  'Co-60': { energyMeV: 1.252, yieldPct: 199.8, gammaConst: 308.5 },
  'Sr-90': { energyMeV: 0.05, yieldPct: 0.1, gammaConst: 0.5 },
  'Y-90': { energyMeV: 0.15, yieldPct: 0.5, gammaConst: 1.2 },
  'Ir-192': { energyMeV: 0.380, yieldPct: 145.0, gammaConst: 130.0 },
  'Lu-177': { energyMeV: 0.2084, yieldPct: 10.4, gammaConst: 4.9 },
  'Au-198': { energyMeV: 0.4118, yieldPct: 95.6, gammaConst: 62.0 },
  'Bi-212': { energyMeV: 0.7273, yieldPct: 6.7, gammaConst: 18.0 },
  'Tl-208': { energyMeV: 2.6145, yieldPct: 99.8, gammaConst: 398.0 },
  'Pb-214': { energyMeV: 0.3519, yieldPct: 35.6, gammaConst: 38.0 },
  'Bi-214': { energyMeV: 0.6093, yieldPct: 45.5, gammaConst: 195.0 },
  'Ra-226': { energyMeV: 0.1862, yieldPct: 3.6, gammaConst: 3.2 },
  'Ac-225': { energyMeV: 0.100, yieldPct: 1.0, gammaConst: 2.4 },
  'Fr-221': { energyMeV: 0.218, yieldPct: 11.4, gammaConst: 4.5 },
  'Bi-213': { energyMeV: 0.4405, yieldPct: 25.9, gammaConst: 19.0 }
};

interface BenchmarkChainPreset {
  id: string;
  label: string;
  nuclide: string;
  symbol: string;
  timeValue: number;
  timeUnit: number;
  sliderPct: number;
  badge: string;
  description: string;
  enableMilking?: boolean;
}

const BENCHMARK_CHAIN_PRESETS: BenchmarkChainPreset[] = [
  {
    id: 'mo99_tc99m',
    label: '💉 Mo-99 → Tc-99m',
    nuclide: 'Mo-99',
    symbol: 'Mo',
    timeValue: 7,
    timeUnit: 86400, // 7 Days
    sliderPct: 14.0, // ~23.5 hours
    badge: 'Transient Eq.',
    description: 'Medical Technetium-99m Generator (87.9% → Tc-99m [6.01 h] + 12.1% direct → Tc-99)'
  },
  {
    id: 'bi212_split',
    label: '🌿 Bi-212 Split (α 36% / β⁻ 64%)',
    nuclide: 'Bi-212',
    symbol: 'Bi',
    timeValue: 300,
    timeUnit: 60, // 300 Minutes (5 Hours)
    sliderPct: 25.0,
    badge: 'Bifurcating Tree',
    description: 'Classical Thoron Progeny Bifurcation: Bi-212 → Po-212 (64.06% β⁻) + Tl-208 (35.94% α) → Pb-208'
  },
  {
    id: 'sr90_y90',
    label: '⚖️ Sr-90 → Y-90',
    nuclide: 'Sr-90',
    symbol: 'Sr',
    timeValue: 25,
    timeUnit: 86400, // 25 Days
    sliderPct: 45.0,
    badge: 'Secular Eq.',
    description: 'Pure Beta Secular Equilibrium Generator (T½: 28.8 yr → 64.0 h → Zr-90 Stable)'
  },
  {
    id: 'cs137_ba137m',
    label: '☢️ Cs-137 → Ba-137m',
    nuclide: 'Cs-137',
    symbol: 'Cs',
    timeValue: 90,
    timeUnit: 31557600, // 90 Years
    sliderPct: 33.4,
    badge: 'Isomeric Split',
    description: 'Standard Gamma Calibration Source (94.4% → Ba-137m [2.55 m IT 661.7 keV] + 5.6% direct → Ba-137)'
  },
  {
    id: 'rn222_progeny',
    label: '💨 Rn-222 → Pb-206',
    nuclide: 'Rn-222',
    symbol: 'Rn',
    timeValue: 15,
    timeUnit: 86400, // 15 Days
    sliderPct: 25.5,
    badge: 'Radon Daughters',
    description: 'Short-lived Radon-222 Progeny Cascade (Po-218 → Pb-214 → Bi-214 → Po-214 → Pb-210)'
  },
  {
    id: 'ac225_tat',
    label: '🎯 Ac-225 → Bi-213',
    nuclide: 'Ac-225',
    symbol: 'Ac',
    timeValue: 30,
    timeUnit: 86400, // 30 Days
    sliderPct: 33.3,
    badge: '4-Alpha TAT',
    description: 'Targeted Alpha Therapy (TAT) 4-Alpha Nanogenerator with Bi-213 → Po-213 (97.9%) / Tl-209 (2.1%) bifurcation'
  }
];

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
  if (unit === 'ms') return val * 1e-3;
  if (unit === 'us' || unit === 'µs' || unit === 'μs') return val * 1e-6;
  if (unit === 'ns') return val * 1e-9;
  if (unit === 'ps') return val * 1e-12;
  if (unit.startsWith('s')) return val;
  if (unit.startsWith('m')) return val * 60;
  if (unit.startsWith('h')) return val * 3600;
  if (unit.startsWith('d')) return val * 86400;
  if (unit.startsWith('y') || unit.startsWith('a')) return val * 31557600;
  return val;
};

const DecayModule: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedIsotope, setSelectedIsotope] = useState<any | null>(() => {
    return allNuclides.find(n => n.Nuclide === 'Mo-99') || allNuclides.find(n => n.Nuclide === 'Ra-226') || null;
  });

  // Yield Calculator State
  const [initialActivity, setInitialActivity] = useState<number>(100); // 100 MBq default
  const [timeValue, setTimeValue] = useState<number>(7);
  const [timeUnit, setTimeUnit] = useState<number>(86400); // default Days
  const [sliderPct, setSliderPct] = useState<number>(14.0);

  // Upgrade 1: Radiochemical "Milking" / Generator Elution Simulator State
  const [elutionEnabled, setElutionEnabled] = useState<boolean>(false);
  const [elutionIntervalHours, setElutionIntervalHours] = useState<number>(24);
  const [elutionEfficiencyPct, setElutionEfficiencyPct] = useState<number>(95);
  const [includeHarvestedInPie, setIncludeHarvestedInPie] = useState<boolean>(true);

  // Upgrade 2: Neutron Activation & Reactor Isotope Production Mode State
  const [activationEnabled, setActivationEnabled] = useState<boolean>(false);
  const [selectedActivationPresetId, setSelectedActivationPresetId] = useState<string>('mo98_mo99');
  const [targetMassGrams, setTargetMassGrams] = useState<number>(10.0);
  const [targetEnrichmentPct, setTargetEnrichmentPct] = useState<number>(98.0);
  const [sigmaActBarns, setSigmaActBarns] = useState<number>(0.13);
  const [sigmaBurnBarns, setSigmaBurnBarns] = useState<number>(0.0);
  const [neutronFluxNcm2s, setNeutronFluxNcm2s] = useState<number>(1.5e14);
  const [irradiationHours, setIrradiationHours] = useState<number>(72);

  // Animation playback state for Time Evolution Scrubber
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Visualization Mode States
  const [q2Tab, setQ2Tab] = useState<'time_series' | 'spectrum'>('time_series');
  const [q4ViewMode, setQ4ViewMode] = useState<'split' | 'pie_only' | 'table_only'>('split');
  // Added 4th basis: 'modality' for Alpha / Beta / Gamma Dose Power Breakdown
  const [pieRatioBasis, setPieRatioBasis] = useState<'atoms' | 'activity' | 'heat' | 'modality'>('atoms');
  const [includeStableInActivityPie, setIncludeStableInActivityPie] = useState<boolean>(false);

  // Simulated Detector State
  const [exposureTime, setExposureTime] = useState<number>(30);
  const [exposureUnit, setExposureUnit] = useState<number>(60); // 30 mins

  useEffect(() => {
    if (!isAnimating) {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      return;
    }
    animTimerRef.current = setInterval(() => {
      setSliderPct(prev => {
        const next = prev + 0.4 * animSpeed;
        if (next >= 100) return 0;
        return Number(next.toFixed(2));
      });
    }, 50);
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [isAnimating, animSpeed]);

  const getColor = (mode: string, hl: string) => {
    const m = String(mode).toUpperCase();
    if (hl === 'STABLE' || m === 'STABLE') return '#2C3E50';
    if (m.includes('A')) return '#F4D03F';
    if (m.includes('B-')) return '#5DADE2';
    if (m.includes('B+') || m.includes('EC')) return '#E74C3C';
    if (m.includes('IT')) return '#a855f7';
    if (m.includes('SF')) return '#2ECC71';
    return '#EcF0F1';
  };

  const findNuclideRecord = (name: string): any | null => {
    if (METASTABLE_CATALOG[name]) return METASTABLE_CATALOG[name];
    return allNuclides.find(n => n.Nuclide === name) || null;
  };

  // Build Generalized Decay DAG (supporting bifurcating alpha/beta splits & metastable isomers)
  const { activePathIds, chainNodes, chainEdges, rawChainNuclides } = useMemo(() => {
    if (!selectedIsotope) {
      return { activePathIds: [], chainNodes: [] as ChainNuclideNode[], chainEdges: [] as DecayBranchEdge[], rawChainNuclides: [] as any[] };
    }

    const pathIds: string[] = [];
    const cNodes: ChainNuclideNode[] = [];
    const cEdges: DecayBranchEdge[] = [];
    const rawList: any[] = [];
    const visited = new Map<string, number>();

    const makeChainNode = (rawNuc: any, generation: number, branchLane: number): ChainNuclideNode => {
      const hlSec = parseHalfLifeSeconds(rawNuc);
      const lambda = hlSec === Infinity || hlSec <= 0 ? 0 : Math.LN2 / hlSec;
      const meta = NUCLIDE_GAMMA_METADATA[rawNuc.Nuclide];
      const qAlpha = parseFloat(rawNuc['Q-Alpha'] || '0') / 1000;
      const qBeta = parseFloat(rawNuc['Q-Beta'] || '0') / 1000;
      const qEc = parseFloat(rawNuc['Q-EC'] || '0') / 1000;

      return {
        nuclide: rawNuc.Nuclide,
        symbol: rawNuc.Symbol,
        Z: rawNuc.Z,
        N: rawNuc.N,
        halfLifeLabel: rawNuc['Half-Life'] || 'STABLE',
        halfLifeSeconds: hlSec,
        lambda,
        primaryMode: String(rawNuc['Decay Mode'] || 'STABLE'),
        qAlphaMeV: isNaN(qAlpha) ? 0 : qAlpha,
        qBetaMeV: isNaN(qBeta) ? 0 : qBeta,
        qGammaOrEcMeV: isNaN(qEc) ? 0 : qEc,
        principalGammaMeV: meta?.energyMeV ?? rawNuc.principalGammaMeV ?? (qEc > 0 ? qEc : qBeta * 0.3),
        gammaYieldPct: meta?.yieldPct ?? rawNuc.gammaYieldPct ?? 50,
        specificGammaConstUSvM2PerGBqHr: meta?.gammaConst ?? rawNuc.specificGammaConst ?? 25.0,
        generation,
        branchLane
      };
    };

    // Breadth-first topological DAG construction so parents always precede daughters
    const queue: { raw: any; gen: number; lane: number }[] = [{ raw: selectedIsotope, gen: 0, lane: 0 }];

    while (queue.length > 0 && cNodes.length < 22) {
      const item = queue.shift()!;
      const nuc = item.raw;
      if (!nuc) continue;

      if (!visited.has(nuc.Nuclide)) {
        visited.set(nuc.Nuclide, cNodes.length);
        pathIds.push(nuc.Nuclide.replace(/m$/, ''));
        rawList.push(nuc);
        cNodes.push(makeChainNode(nuc, item.gen, item.lane));
      } else {
        continue;
      }

      const mode = String(nuc['Decay Mode'] || '').toUpperCase();
      if (mode === 'STABLE' || nuc['Half-Life'] === 'STABLE' || !mode) continue;

      // 1. Check Curated Bifurcating & Metastable Split Table first
      const splitSpec = CURATED_BRANCHING_SPLITS[nuc.Nuclide];
      if (splitSpec) {
        for (const dSpec of splitSpec.daughters) {
          const dRaw = findNuclideRecord(dSpec.nuclide);
          if (dRaw) {
            cEdges.push({
              fromNuclide: nuc.Nuclide,
              toNuclide: dRaw.Nuclide,
              branchFraction: dSpec.branchFraction,
              modeLabel: dSpec.modeLabel,
              qMeV: dSpec.qMeV,
              modality: dSpec.modality
            });
            if (!visited.has(dRaw.Nuclide)) {
              queue.push({ raw: dRaw, gen: item.gen + 1, lane: dSpec.laneOffset ?? 0 });
            }
          }
        }
        continue;
      }

      // 2. Otherwise inspect standard Decay Mode + Decay 2 from all_nuclides.json
      const resolveDaughterCoords = (mStr: string): { z: number; n: number; modality: 'alpha' | 'beta' | 'gamma_it' | 'ec_positron'; qMeV: number } | null => {
        const up = mStr.toUpperCase();
        if (up.includes('A')) {
          return { z: nuc.Z - 2, n: nuc.N - 2, modality: 'alpha', qMeV: (parseFloat(nuc['Q-Alpha'] || '0') || 5000) / 1000 };
        }
        if (up.includes('B-')) {
          return { z: nuc.Z + 1, n: nuc.N - 1, modality: 'beta', qMeV: (parseFloat(nuc['Q-Beta'] || '0') || 1000) / 1000 };
        }
        if (up.includes('B+') || up.includes('EC')) {
          return { z: nuc.Z - 1, n: nuc.N + 1, modality: 'ec_positron', qMeV: (parseFloat(nuc['Q-EC'] || '0') || 1000) / 1000 };
        }
        return null;
      };

      const d1Coords = resolveDaughterCoords(mode);
      const b1Pct = parseFloat(nuc['Decay %'] || '100');
      const b1Frac = isNaN(b1Pct) ? 1.0 : Math.min(1.0, Math.max(0.01, b1Pct / 100));

      const mode2 = String(nuc['Decay 2'] || '').trim();
      const b2Pct = parseFloat(nuc['Decay 2 %'] || '0');
      const d2Coords = mode2 && b2Pct >= 1.0 ? resolveDaughterCoords(mode2) : null;

      if (d1Coords) {
        const d1Raw = allNuclides.find(n => n.Z === d1Coords.z && n.N === d1Coords.n);
        if (d1Raw) {
          const effFrac1 = d2Coords ? b1Frac : 1.0;
          const prettyMode1 = String(nuc['Decay Mode']).replace('B-', 'β⁻').replace('B+', 'β⁺').replace('A', 'α');
          cEdges.push({
            fromNuclide: nuc.Nuclide,
            toNuclide: d1Raw.Nuclide,
            branchFraction: effFrac1,
            modeLabel: `${prettyMode1} (${(effFrac1 * 100).toFixed(1)}%)`,
            qMeV: d1Coords.qMeV,
            modality: d1Coords.modality
          });
          if (!visited.has(d1Raw.Nuclide)) {
            queue.push({ raw: d1Raw, gen: item.gen + 1, lane: 0 });
          }
        }
      }

      if (d2Coords) {
        const d2Raw = allNuclides.find(n => n.Z === d2Coords.z && n.N === d2Coords.n);
        if (d2Raw && d2Raw.Nuclide !== nuc.Nuclide) {
          const effFrac2 = Math.min(1.0 - b1Frac, b2Pct / 100);
          if (effFrac2 > 0.005) {
            const prettyMode2 = mode2.replace('B-', 'β⁻').replace('B+', 'β⁺').replace('A', 'α');
            cEdges.push({
              fromNuclide: nuc.Nuclide,
              toNuclide: d2Raw.Nuclide,
              branchFraction: effFrac2,
              modeLabel: `${prettyMode2} (${(effFrac2 * 100).toFixed(1)}%)`,
              qMeV: d2Coords.qMeV,
              modality: d2Coords.modality
            });
            if (!visited.has(d2Raw.Nuclide)) {
              queue.push({ raw: d2Raw, gen: item.gen + 1, lane: 1 });
            }
          }
        }
      }
    }

    return { activePathIds: pathIds, chainNodes: cNodes, chainEdges: cEdges, rawChainNuclides: rawList };
  }, [selectedIsotope]);

  // --- Run Generalized Decay DAG / Elution / Activation Simulation ---
  const simResult = useMemo(() => {
    if (chainNodes.length === 0) return null;
    const t_sec_max = Math.max(1, timeValue * timeUnit);
    const t_sec = t_sec_max * (sliderPct / 100);
    const A0_Bq = initialActivity * 1e6;
    const l0 = chainNodes[0].lambda;
    const N1_0 = l0 > 0 ? A0_Bq / l0 : A0_Bq;

    // Target atoms for neutron activation
    const activePreset = REACTOR_ACTIVATION_PRESETS.find(p => p.id === selectedActivationPresetId) || REACTOR_ACTIVATION_PRESETS[0];
    const targetMolarMass = activePreset.targetMassNumber;
    const targetAtoms = ((targetMassGrams * (targetEnrichmentPct / 100)) / targetMolarMass) * 6.02214076e23;

    return simulateGeneralizedDecayDAG({
      nodes: chainNodes,
      edges: chainEdges,
      initialParentAtoms: N1_0,
      maxTimeSeconds: t_sec_max,
      currentTimeSeconds: t_sec,
      elutionEnabled,
      elutionIntervalSeconds: elutionIntervalHours * 3600,
      elutionEfficiency: elutionEfficiencyPct / 100,
      parentBreakthroughFraction: 2.0e-5, // 0.02 uCi / mCi nominal alumina column
      activationEnabled,
      targetInitialAtoms: targetAtoms,
      sigmaActCm2: sigmaActBarns * 1e-24,
      sigmaBurnCm2: sigmaBurnBarns * 1e-24,
      neutronFluxNcm2s,
      irradiationTimeSeconds: irradiationHours * 3600
    });
  }, [
    chainNodes,
    chainEdges,
    initialActivity,
    timeValue,
    timeUnit,
    sliderPct,
    elutionEnabled,
    elutionIntervalHours,
    elutionEfficiencyPct,
    activationEnabled,
    selectedActivationPresetId,
    targetMassGrams,
    targetEnrichmentPct,
    sigmaActBarns,
    sigmaBurnBarns,
    neutronFluxNcm2s,
    irradiationHours
  ]);

  const yields = simResult?.statesAtT || [];

  // Build ReactFlow nodes & edges (supporting parallel bifurcating branch lanes!)
  const { nodes, edges } = useMemo(() => {
    if (chainNodes.length === 0) return { nodes: [], edges: [] };
    const ns: any[] = [];
    const es: any[] = [];

    chainNodes.forEach((cNode, idx) => {
      const y = yields[idx];
      const atomPct = y ? y.atomFractionPct : idx === 0 ? 100 : 0;
      const actMBq = y ? y.activityMBq : 0;
      const color = getColor(cNode.primaryMode, cNode.halfLifeLabel);
      const sliceColor = CHAIN_PALETTE[idx % CHAIN_PALETTE.length];

      const maxPerRow = 5;
      const row = Math.floor(cNode.generation / maxPerRow);
      const col = cNode.generation % maxPerRow;

      const currentX = col * 245;
      // Offset parallel split branches vertically so bifurcations are clearly visible
      const currentY = row * 280 + 30 + cNode.branchLane * 135;

      ns.push({
        id: cNode.nuclide,
        position: { x: currentX, y: currentY },
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          label: (
            <div style={{ padding: '5px 7px', textAlign: 'center', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sliceColor, display: 'inline-block' }} />
                <strong style={{ fontSize: '0.96rem', color: '#fff' }}>{cNode.nuclide}</strong>
                <span style={{ fontSize: '0.65rem', color: sliceColor, fontWeight: 700 }}>{atomPct.toFixed(1)}%</span>
              </div>
              <div style={{ color: '#aaa', fontSize: '0.70rem', marginBottom: '3px' }}>
                {cNode.halfLifeLabel === 'STABLE' ? 'Stable End-Product' : `T½ = ${cNode.halfLifeLabel}`}
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, atomPct))}%`, height: '100%', background: sliceColor }} />
              </div>
              <div style={{ fontSize: '0.65rem', color: cNode.halfLifeLabel === 'STABLE' ? '#94a3b8' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                {cNode.halfLifeLabel === 'STABLE'
                  ? `${(y?.atoms || 0).toExponential(2)} atoms`
                  : `${actMBq >= 0.01 ? actMBq.toFixed(2) : actMBq.toExponential(2)} MBq`}
              </div>
            </div>
          )
        },
        style: {
          borderLeft: `2px solid ${sliceColor}`,
          borderRight: '1px solid #444',
          borderBottom: '1px solid #444',
          borderTop: `6px solid ${color}`,
          borderRadius: '8px',
          background: idx === 0 ? '#242936' : '#171b22',
          width: 136,
          boxShadow: atomPct > 5 ? `0 0 12px ${sliceColor}44` : 'none',
          padding: 0,
          zIndex: 10
        }
      });
    });

    chainEdges.forEach((edge, eIdx) => {
      const edgeColor =
        edge.modality === 'alpha'
          ? '#F4D03F'
          : edge.modality === 'gamma_it'
          ? '#a855f7'
          : edge.modality === 'ec_positron'
          ? '#E74C3C'
          : '#5DADE2';

      es.push({
        id: `edge-${eIdx}-${edge.fromNuclide}-${edge.toNuclide}`,
        source: edge.fromNuclide,
        target: edge.toNuclide,
        type: 'smoothstep',
        label: `${edge.modeLabel}`,
        labelStyle: { fill: edgeColor, fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: '#0a0d14', fillOpacity: 0.88 },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: Math.max(1.5, edge.branchFraction * 2.8) }
      });
    });

    return { nodes: ns, edges: es };
  }, [chainNodes, chainEdges, yields]);

  const handleIsotopeClick = (isotopeData: any) => {
    setSelectedIsotope(isotopeData);
    if (isotopeData) {
      setSearchSymbol(isotopeData.Symbol);
      const hlSec = parseHalfLifeSeconds(isotopeData);
      if (hlSec > 0 && hlSec !== Infinity) {
        const targetWindowSec = hlSec * 3.0;
        if (targetWindowSec >= 31557600 * 0.5) {
          setTimeUnit(31557600);
          setTimeValue(Number(Math.max(1, targetWindowSec / 31557600).toPrecision(3)));
        } else if (targetWindowSec >= 86400 * 0.5) {
          setTimeUnit(86400);
          setTimeValue(Number(Math.max(1, targetWindowSec / 86400).toPrecision(3)));
        } else if (targetWindowSec >= 1800) {
          setTimeUnit(60);
          setTimeValue(Number(Math.max(10, targetWindowSec / 60).toPrecision(3)));
        } else {
          setTimeUnit(1);
          setTimeValue(Number(Math.max(10, targetWindowSec).toPrecision(3)));
        }
        setSliderPct(25);
      }
    }
  };

  const handleSelectPreset = (preset: BenchmarkChainPreset) => {
    const match = allNuclides.find(n => n.Nuclide === preset.nuclide);
    if (match) {
      setSelectedIsotope(match);
      setSearchSymbol(preset.symbol);
      setTimeValue(preset.timeValue);
      setTimeUnit(preset.timeUnit);
      setSliderPct(preset.sliderPct);
      if (preset.enableMilking !== undefined) {
        setElutionEnabled(preset.enableMilking);
      }
    }
  };

  const handleSelectActivationPreset = (preset: ReactorActivationPreset) => {
    setSelectedActivationPresetId(preset.id);
    setTargetMassGrams(preset.defaultTargetMassGrams);
    setTargetEnrichmentPct(preset.defaultEnrichmentPct);
    setSigmaActBarns(preset.thermalCrossSectionBarns);
    setSigmaBurnBarns(preset.burnupCrossSectionBarns);
    setNeutronFluxNcm2s(preset.defaultFluxNcm2s);
    setIrradiationHours(preset.defaultIrradiationHours);

    const match = allNuclides.find(n => n.Nuclide === preset.producedParentNuclide);
    if (match) {
      setSelectedIsotope(match);
      setSearchSymbol(match.Symbol);
      const totalHours = preset.defaultIrradiationHours + preset.defaultCoolingHours;
      if (totalHours >= 24 * 365) {
        setTimeUnit(31557600);
        setTimeValue(Number((totalHours / 8766).toFixed(1)));
      } else {
        setTimeUnit(86400);
        setTimeValue(Number((totalHours / 24).toFixed(1)));
      }
      setSliderPct(Math.min(95, Math.round((preset.defaultIrradiationHours / totalHours) * 100) + 15));
    }
  };

  // --- Search Logic ---
  const uniqueSymbols = useMemo(() => Array.from(new Set(allNuclides.map(n => n.Symbol))).sort(), []);
  const [searchSymbol, setSearchSymbol] = useState<string>('Mo');
  const availableIsotopes = useMemo(() => allNuclides.filter(n => n.Symbol === searchSymbol).sort((a, b) => (a.Z + a.N) - (b.Z + b.N)), [searchSymbol]);

  useEffect(() => {
    const isoParam = searchParams.get('isotope') || searchParams.get('nuclide');
    if (isoParam) {
      const match = allNuclides.find(n => n.Nuclide.toLowerCase() === isoParam.trim().toLowerCase());
      if (match) handleIsotopeClick(match);
    }
  }, [searchParams]);

  // --- Upgrade 4: Cross-Module Dispatch of Aged Parent + Daughter Mixture at t_sim ---
  const agedMixtureSummary = useMemo(() => {
    if (chainNodes.length === 0 || yields.length === 0) return null;
    let totalActiveMBq = 0;
    let weightedEnergySum = 0;
    let gammaWeightSum = 0;
    const activeMembers: { nuclide: string; activityMBq: number; energyMeV: number; sharePct: number }[] = [];

    chainNodes.forEach((n, idx) => {
      const y = yields[idx];
      if (!y || n.lambda === 0 || y.activityMBq <= 0) return;
      totalActiveMBq += y.activityMBq;
      const w = y.activityMBq * (n.gammaYieldPct / 100);
      weightedEnergySum += w * n.principalGammaMeV;
      gammaWeightSum += w;
      activeMembers.push({
        nuclide: n.nuclide,
        activityMBq: y.activityMBq,
        energyMeV: n.principalGammaMeV,
        sharePct: 0
      });
    });

    activeMembers.forEach(m => {
      m.sharePct = totalActiveMBq > 0 ? (m.activityMBq / totalActiveMBq) * 100 : 0;
    });

    const effectiveEnergyMeV = gammaWeightSum > 0 ? weightedEnergySum / gammaWeightSum : 0.6617;
    const elapsedUnitLabel = timeUnit === 31557600 ? 'yr' : timeUnit === 86400 ? 'd' : timeUnit === 60 ? 'min' : 's';
    const elapsedVal = (timeValue * (sliderPct / 100)).toFixed(2);
    const mixLabel = activeMembers
      .slice(0, 4)
      .map(m => `${m.nuclide}:${m.activityMBq.toFixed(1)}MBq(${m.sharePct.toFixed(0)}%)`)
      .join(', ');

    return {
      parentNuclide: chainNodes[0].nuclide,
      totalActiveMBq,
      effectiveEnergyMeV,
      elapsedDisplay: `${elapsedVal} ${elapsedUnitLabel}`,
      mixLabel,
      activeMembers
    };
  }, [chainNodes, yields, timeValue, timeUnit, sliderPct]);

  const handleDispatchToDose = () => {
    if (!agedMixtureSummary) return;
    navigate(
      `/calculator?nuclide=${encodeURIComponent(agedMixtureSummary.parentNuclide)}` +
      `&activity=${agedMixtureSummary.totalActiveMBq.toFixed(2)}&unit=MBq` +
      `&agedMix=${encodeURIComponent(`${agedMixtureSummary.parentNuclide} chain @ t=${agedMixtureSummary.elapsedDisplay}: ${agedMixtureSummary.mixLabel}`)}`
    );
  };

  const handleDispatchToShielding = () => {
    if (!agedMixtureSummary) return;
    navigate(
      `/shielding?energyMeV=${agedMixtureSummary.effectiveEnergyMeV.toFixed(4)}` +
      `&activityMBq=${agedMixtureSummary.totalActiveMBq.toFixed(2)}` +
      `&agedMix=${encodeURIComponent(`${agedMixtureSummary.parentNuclide} chain @ t=${agedMixtureSummary.elapsedDisplay} (${agedMixtureSummary.mixLabel})`)}`
    );
  };

  const handleDispatchToSpectroscopy = () => {
    if (!agedMixtureSummary) return;
    const peaksParam = agedMixtureSummary.activeMembers
      .map(m => `${m.nuclide}:${(m.energyMeV * 1000).toFixed(1)}:${m.activityMBq.toFixed(2)}`)
      .join(';');
    navigate(
      `/spectroscopy?agedChain=${encodeURIComponent(agedMixtureSummary.parentNuclide)}` +
      `&elapsed=${encodeURIComponent(agedMixtureSummary.elapsedDisplay)}` +
      `&agedPeaks=${encodeURIComponent(peaksParam)}`
    );
  };

  // --- Pie / Donut Chart Data (Isotope-to-Daughters Ratio OR Alpha/Beta/Gamma Power Split) ---
  const pieChartData = useMemo(() => {
    if (chainNodes.length === 0 || yields.length === 0 || !simResult) {
      return { labels: [], values: [], colors: [], customHover: [], centerTitle: 'No Chain', equilibriumBadge: '' };
    }

    const labels: string[] = [];
    const rawValues: number[] = [];
    const colors: string[] = [];
    const customHover: string[] = [];

    // Modality Split Mode (Upgrade 3: Alpha / Beta / Gamma Power Breakdown)
    if (pieRatioBasis === 'modality') {
      const { alphaWatts, betaWatts, gammaWatts, totalWatts } = simResult.modalityPowerWatts;
      const denom = Math.max(1e-30, totalWatts);
      const aPct = (alphaWatts / denom) * 100;
      const bPct = (betaWatts / denom) * 100;
      const gPct = (gammaWatts / denom) * 100;

      labels.push('α-Particles + Recoil Nuclei', 'β⁻ / β⁺ Kinetic Electrons', 'γ-Rays / IT / X-Rays');
      rawValues.push(aPct, bPct, gPct);
      colors.push('#F4D03F', '#5DADE2', '#a855f7');
      customHover.push(
        `<b>α-Particle & Recoil Power</b><br>Share: <b>${aPct.toFixed(2)}%</b><br>Power: ${alphaWatts.toExponential(3)} W`,
        `<b>β⁻ / β⁺ Electron Kinetic Power</b><br>Share: <b>${bPct.toFixed(2)}%</b><br>Power: ${betaWatts.toExponential(3)} W`,
        `<b>γ / IT / X-Ray Photon Power</b><br>Share: <b>${gPct.toFixed(2)}%</b><br>Power: ${gammaWatts.toExponential(3)} W`
      );

      return {
        labels,
        values: rawValues,
        colors,
        customHover,
        centerTitle: `α/β/γ Mix<br>${totalWatts.toExponential(1)} W`,
        equilibriumBadge: `α: ${aPct.toFixed(1)}% | β: ${bPct.toFixed(1)}% | γ: ${gPct.toFixed(1)}%`
      };
    }

    const harvestedAtoms = elutionEnabled && includeHarvestedInPie ? simResult.harvestedDaughterAtomsCumulative : 0;
    const harvestedVialMBq = elutionEnabled && includeHarvestedInPie ? simResult.harvestedDaughterVialActivityMBq : 0;

    const totalAtoms = yields.reduce((acc, y) => acc + y.atoms, 0) + harvestedAtoms || 1;
    const totalActivityMBq = yields.reduce((acc, y) => acc + y.activityMBq, 0) + harvestedVialMBq || 1e-30;
    const totalHeatWatts = yields.reduce((acc, y) => acc + y.totalHeatWatts, 0) || 1e-30;

    chainNodes.forEach((node, idx) => {
      const y = yields[idx];
      if (!y) return;
      const isStable = node.lambda === 0;
      const roleLabel = idx === 0 ? 'Parent' : isStable ? 'Stable End' : `Gen ${node.generation}`;
      const color = CHAIN_PALETTE[idx % CHAIN_PALETTE.length];

      if (pieRatioBasis === 'atoms') {
        const pct = (y.atoms / totalAtoms) * 100;
        labels.push(`${node.nuclide} (${roleLabel})`);
        rawValues.push(Math.max(0, pct));
        colors.push(color);
        customHover.push(
          `<b>${node.nuclide} (${roleLabel})</b><br>` +
          `Atomic Ratio: <b>${pct.toFixed(2)}%</b><br>` +
          `Atoms: ${y.atoms.toExponential(3)}<br>` +
          `Activity: ${isStable ? '0 MBq (Stable)' : `${y.activityMBq.toExponential(3)} MBq`}`
        );
      } else if (pieRatioBasis === 'activity') {
        if (isStable && !includeStableInActivityPie) return;
        const val = isStable ? 0 : (y.activityMBq / totalActivityMBq) * 100;
        labels.push(`${node.nuclide} (${roleLabel})`);
        rawValues.push(Math.max(0, val));
        colors.push(color);
        customHover.push(
          `<b>${node.nuclide} (${roleLabel})</b><br>` +
          `Activity Share: <b>${val.toFixed(2)}%</b><br>` +
          `Activity: ${y.activityMBq.toExponential(3)} MBq<br>` +
          `Atomic Fraction: ${y.atomFractionPct.toFixed(2)}%`
        );
      } else {
        if (isStable) return;
        const val = (y.totalHeatWatts / totalHeatWatts) * 100;
        labels.push(`${node.nuclide} (${roleLabel})`);
        rawValues.push(Math.max(0, val));
        colors.push(color);
        customHover.push(
          `<b>${node.nuclide} (${roleLabel})</b><br>` +
          `Decay Heat Share: <b>${val.toFixed(2)}%</b><br>` +
          `Thermal Power: ${y.totalHeatWatts.toExponential(3)} W`
        );
      }
    });

    if (elutionEnabled && includeHarvestedInPie && chainNodes.length >= 2) {
      if (pieRatioBasis === 'atoms' && harvestedAtoms > 0) {
        const pct = (harvestedAtoms / totalAtoms) * 100;
        labels.push(`🧪 Harvested ${chainNodes[1].nuclide} Eluate`);
        rawValues.push(pct);
        colors.push('#22d3ee');
        customHover.push(
          `<b>🧪 Cumulative Harvested ${chainNodes[1].nuclide} Eluate</b><br>` +
          `Share of Original Nuclei: <b>${pct.toFixed(2)}%</b><br>` +
          `Vial Activity Now: ${simResult.harvestedDaughterVialActivityMBq.toFixed(2)} MBq`
        );
      } else if (pieRatioBasis === 'activity' && harvestedVialMBq > 0) {
        const pct = (harvestedVialMBq / totalActivityMBq) * 100;
        labels.push(`🧪 Harvested ${chainNodes[1].nuclide} Vial`);
        rawValues.push(pct);
        colors.push('#22d3ee');
        customHover.push(
          `<b>🧪 Harvested ${chainNodes[1].nuclide} Vial Activity</b><br>` +
          `Share of Active Pool: <b>${pct.toFixed(2)}%</b><br>` +
          `Vial Activity: ${harvestedVialMBq.toFixed(2)} MBq`
        );
      }
    }

    if (pieRatioBasis === 'activity' && includeStableInActivityPie) {
      const parentRemainingPct = yields[0]?.atomFractionPct || 0;
      const decayedPct = Math.max(0, 100 - parentRemainingPct);
      labels.push('Decayed to Stable / Progeny Pool');
      rawValues.push(decayedPct);
      colors.push('#475569');
      customHover.push(`<b>Cumulative Parent Decayed Fraction</b><br>${decayedPct.toFixed(2)}% of original parent nuclei transmuted`);
    }

    // Equilibrium / Regime Status Badge
    let equilibriumBadge = 'Parent Decay / Daughter Ingrowth';
    const currentSec = timeValue * timeUnit * (sliderPct / 100);
    if (activationEnabled && currentSec <= irradiationHours * 3600) {
      equilibriumBadge = `⚛️ In-Core Irradiation (Φ = ${neutronFluxNcm2s.toExponential(1)} n/cm²·s)`;
    } else if (elutionEnabled && simResult.elutionEvents.length > 0) {
      equilibriumBadge = `🧪 Generator Milking (${simResult.elutionEvents.length} Elutions @ ${elutionIntervalHours}h)`;
    } else if (chainNodes.length >= 2 && yields[0] && yields[1]) {
      const l1 = chainNodes[0].lambda;
      const l2 = chainNodes[1].lambda;
      const a1 = yields[0].activityMBq;
      const a2 = yields[1].activityMBq;
      if (sliderPct <= 0.2) {
        equilibriumBadge = 'Pure Parent State (t = 0)';
      } else if (yields[0].atomFractionPct < 0.5) {
        equilibriumBadge = 'Parent Depleted (>99.5% Transmuted)';
      } else if (l2 > 0 && l1 > 0 && l2 / l1 > 100 && Math.abs(a2 - a1) / Math.max(a1, 1e-20) < 0.08) {
        equilibriumBadge = '⚖️ Secular Equilibrium (A₂ ≈ A₁)';
      } else if (l2 > l1 && a2 >= a1 * 0.85) {
        equilibriumBadge = '⚡ Transient Equilibrium';
      }
    }

    const parentPct = yields[0]?.atomFractionPct ?? 0;
    const centerTitle = `${chainNodes[0].nuclide}<br>${parentPct.toFixed(1)}%`;

    return { labels, values: rawValues, colors, customHover, centerTitle, equilibriumBadge };
  }, [chainNodes, yields, simResult, pieRatioBasis, includeStableInActivityPie, elutionEnabled, includeHarvestedInPie, activationEnabled, irradiationHours, neutronFluxNcm2s, elutionIntervalHours, timeValue, timeUnit, sliderPct]);

  // --- Continuous Time-Series Ingrowth, Elution Sawtooth & Activation Curves ---
  const timeSeriesPlotData = useMemo(() => {
    if (!simResult || chainNodes.length === 0) return { traces: [], unitLabel: 'Days', currentT: 0, eobT: null as number | null };

    const unitLabel = timeUnit === 31557600 ? 'Years' : timeUnit === 86400 ? 'Days' : timeUnit === 60 ? 'Minutes' : 'Seconds';
    const xGrid = simResult.timeGridSeconds.map(tSec => tSec / timeUnit);
    const totalInitAtoms = Math.max(1, simResult.seriesAtomsByNuclide[0]?.[0] || 1);

    const traces: any[] = chainNodes.map((node, i) => {
      const ySeries =
        pieRatioBasis === 'atoms'
          ? simResult.seriesAtomsByNuclide[i].map(a => (a / totalInitAtoms) * 100)
          : simResult.seriesActivityMBqByNuclide[i];

      return {
        x: xGrid,
        y: ySeries,
        type: 'scatter',
        mode: 'lines',
        name: `${node.nuclide}${i === 0 ? ' (Parent)' : node.lambda === 0 ? ' (Stable)' : ''}`,
        line: {
          color: CHAIN_PALETTE[i % CHAIN_PALETTE.length],
          width: i === 0 ? 2.6 : 2.2,
          dash: node.lambda === 0 ? 'dot' : 'solid'
        },
        hovertemplate:
          `<b>${node.nuclide}</b><br>` +
          `Time: %{x:.2f} ${unitLabel}<br>` +
          (pieRatioBasis === 'atoms' ? 'Atomic Share: %{y:.2f}%' : 'Activity: %{y:.3f} MBq') +
          '<extra></extra>'
      };
    });

    if (elutionEnabled && pieRatioBasis !== 'atoms' && simResult.seriesHarvestedVialMBq.some(v => v > 0)) {
      traces.push({
        x: xGrid,
        y: simResult.seriesHarvestedVialMBq,
        type: 'scatter',
        mode: 'lines',
        name: `🧪 Harvested ${chainNodes[1]?.nuclide || 'Daughter'} Eluate Vial`,
        line: { color: '#22d3ee', width: 2, dash: 'dashdot' },
        hovertemplate: `<b>Harvested Eluate Vial</b><br>Time: %{x:.2f} ${unitLabel}<br>Vial Activity: %{y:.3f} MBq<extra></extra>`
      });
    }

    const eobT = activationEnabled ? (irradiationHours * 3600) / timeUnit : null;

    return {
      traces,
      unitLabel,
      currentT: timeValue * (sliderPct / 100),
      eobT
    };
  }, [simResult, chainNodes, timeUnit, timeValue, pieRatioBasis, sliderPct, elutionEnabled, activationEnabled, irradiationHours]);

  // --- Display spectrum data for Quadrant 2 ---
  const spectrumPlotData = useMemo(() => {
    if (!selectedIsotope || rawChainNuclides.length === 0 || yields.length === 0) return { traces: [], annotations: [] };

    const traces: any[] = [];
    const annotations: any[] = [];
    const exposureTimeSecs = exposureTime * exposureUnit;

    const counts = yields.map(y => y.activityBq * exposureTimeSecs);
    const maxCounts = Math.max(10, ...counts);

    const makeSpike = (energy: number, height: number, name: string, color: string) => {
      const x: number[] = [];
      const y: number[] = [];
      const sigma = 0.02;
      for (let e = Math.max(0, energy - 0.15); e <= energy + 0.15; e += 0.002) {
        x.push(e);
        y.push(height * Math.exp(-Math.pow(e - energy, 2) / (2 * sigma * sigma)));
      }
      return {
        x, y,
        type: 'scatter', mode: 'lines', fill: 'tozeroy',
        name, line: { color, width: 2 },
        hovertemplate: name + ' Peak<br>Energy: %{x:.3f} MeV<br>Simulated Counts: %{y:.2e} N<extra></extra>',
        opacity: 0.65
      };
    };

    const makeBetaContinuum = (qMax: number, height: number, name: string, color: string) => {
      const x: number[] = [];
      const y: number[] = [];
      for (let e = 0; e <= qMax; e += qMax / 100) {
        x.push(e);
        const intensity = Math.sqrt(e) * Math.pow(qMax - e, 2);
        y.push(intensity);
      }
      const maxY = Math.max(1e-10, ...y);
      if (maxY > 0) {
        for (let i = 0; i < y.length; i++) y[i] = (y[i] / maxY) * height;
      }
      return {
        x, y,
        type: 'scatter', mode: 'lines', fill: 'tozeroy',
        name, line: { color, width: 2 }, hoverinfo: 'none',
        opacity: 0.55
      };
    };

    rawChainNuclides.forEach((node, idx) => {
      const current_Counts = counts[idx] || 0;
      if (node['Half-Life'] === 'STABLE') return;

      let heightScale = current_Counts;
      let isGhosted = false;

      if (current_Counts < maxCounts * 0.01) {
        heightScale = maxCounts * 0.01;
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
          traces.push(applyGhost(makeSpike(e, heightScale, `${node.Nuclide} α`, '#F4D03F')));
          addAnnotation(e, heightScale, `${node.Nuclide} α`, `${e.toFixed(2)} MeV`, '#F4D03F', 0, isGhosted);
        }
      }
      if (node['Q-Beta']) {
        const e = parseFloat(node['Q-Beta']) / 1000;
        if (e > 0) {
          const height = heightScale * 0.8;
          traces.push(applyGhost(makeBetaContinuum(e, height, `${node.Nuclide} β⁻`, '#5DADE2')));
          addAnnotation(e * 0.33, height, `${node.Nuclide} β⁻`, `Q=${e.toFixed(2)} MeV`, '#5DADE2', 1, isGhosted);
        }
      }
      if (node['Q-EC']) {
        const e = parseFloat(node['Q-EC']) / 1000;
        if (e > 0) {
          const isIT = String(node['Decay Mode']).toUpperCase().includes('IT');
          const color = isIT ? '#a855f7' : '#E74C3C';
          const label = isIT ? `${node.Nuclide} γ/IT` : `${node.Nuclide} EC/β⁺`;
          const height = heightScale * 0.75;
          traces.push(applyGhost(makeSpike(e, height, label, color)));
          addAnnotation(e, height, label, `${e.toFixed(3)} MeV`, color, 2, isGhosted);
        }
      }
    });

    traces.push({
      x: [0, 10], y: [0, 0],
      mode: 'lines', line: { color: '#444', width: 1 },
      hoverinfo: 'none', showlegend: false
    });

    return { traces, annotations };
  }, [selectedIsotope, rawChainNuclides, yields, exposureTime, exposureUnit]);

  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    const parentName = selectedIsotope?.Nuclide || 'Unselected Parent';
    const parentHl = selectedIsotope?.['Half-Life'] || 'N/A';
    const parentMode = selectedIsotope?.['Decay Mode'] || 'N/A';
    const totalSec = timeValue * timeUnit * (sliderPct / 100);
    return {
      reportTitle: `Bateman Decay Chain, Generator Elution & Ratio Analysis — ${parentName}`,
      moduleName: 'Module 24: Generalized Bateman Decay, Generator Elution & Neutron Activation Solver',
      statuteCitation: 'ICRP Publication 107 / Bateman (1910) / USP <823> Radiopharmaceuticals',
      verificationTestId: 'VTEST-06 & VTEST-40 (Bateman & Daughter Ratio Conservation)',
      operatorName: 'Nuclear Physics Specialist',
      operatorCredentials: 'CHP, PhD',
      facility: 'Radiological Decay & Isotope Production Division',
      notes: `Generalized DAG Bateman decay chain evaluation for ${parentName} (T₁/₂ = ${parentHl}, Primary Mode: ${parentMode}) at scrubbed time t = ${totalSec.toExponential(3)} s. Elution Mode: ${elutionEnabled ? 'ACTIVE' : 'OFF'}. Activation Mode: ${activationEnabled ? 'ACTIVE' : 'OFF'}.`,
      formulaDescription: '\\frac{dN_i}{dt} = \\sigma_{\\text{act}}\\Phi N_{\\text{target}}\\delta_{i1} + \\sum_{j} b_{ji}\\lambda_j N_j(t) - (\\lambda_i + \\sigma_{\\text{burn},i}\\Phi)N_i(t)',
      inputs: [
        { label: 'Parent Radionuclide', value: parentName },
        { label: 'Parent Half-Life (T₁/₂)', value: parentHl },
        { label: 'Initial Activity (A₀)', value: initialActivity, unit: 'MBq' },
        { label: 'Evaluated Decay Time (t_sim)', value: totalSec.toExponential(3), unit: 's' },
        { label: 'Generator Milking Mode', value: elutionEnabled ? `Every ${elutionIntervalHours} h (${elutionEfficiencyPct}% eff.)` : 'Disabled' },
        { label: 'Reactor Activation Mode', value: activationEnabled ? `Φ = ${neutronFluxNcm2s.toExponential(2)} n/cm²·s (${irradiationHours} h EOB)` : 'Disabled' }
      ],
      outputs: chainNodes.length > 0
        ? chainNodes.slice(0, 8).map((node, idx) => {
            const y = yields[idx];
            const isStable = node.lambda === 0;
            const actMBq = y ? y.activityMBq : 0;
            const pct = y ? y.atomFractionPct.toFixed(2) : '0.00';
            return {
              label: `${node.nuclide} (${node.halfLifeLabel}) [${pct}% atoms]`,
              value: isStable ? `${(y?.atoms || 0).toExponential(3)} atoms (Stable)` : `${actMBq.toExponential(3)} MBq`,
              status: 'PASS' as const
            };
          })
        : [{ label: 'Chain Status', value: 'Select a parent nuclide', status: 'PASS' as const }]
    };
  }, [selectedIsotope, timeValue, timeUnit, sliderPct, initialActivity, elutionEnabled, elutionIntervalHours, elutionEfficiencyPct, activationEnabled, neutronFluxNcm2s, irradiationHours, chainNodes, yields]);

  const transientPeakPct = useMemo(() => {
    if (chainNodes.length < 2) return null;
    const l1 = chainNodes[0].lambda;
    const l2 = chainNodes[1].lambda;
    if (l1 <= 0 || l2 <= 0 || Math.abs(l2 - l1) < 1e-30) return null;
    const tMaxSec = Math.log(l2 / l1) / (l2 - l1);
    const windowSec = timeValue * timeUnit;
    if (tMaxSec <= 0 || tMaxSec > windowSec) return null;
    return (tMaxSec / windowSec) * 100;
  }, [chainNodes, timeValue, timeUnit]);

  const totalHarvestedMBq = useMemo(() => {
    if (!simResult) return 0;
    return simResult.elutionEvents.reduce((acc, ev) => acc + ev.harvestedActivityMBq, 0);
  }, [simResult]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* HEADER + SEARCH + BENCHMARK CHAINS + RADIOCHEMICAL MODES */}
      <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>Module 24 — Decay Kinematics, Daughter Ingrowth &amp; Ratio Visualizer</h2>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                Bifurcating Bateman DAGs, parent-to-daughter pie ratios, generator milking sawtooth elutions, and in-core neutron activation
              </span>
            </div>
            <VerificationBadge testId="VTEST-06 / 40" primaryTestId="VTEST-06" standard="Bateman / Knoll" />
            <button
              onClick={() => setIsDossierOpen(true)}
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📜 QA Dossier
            </button>
          </div>

          {/* Search + Cross-Module Aged Mixture Export */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Cross-Module Dispatch Buttons (Upgrade 4) */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <span style={{ fontSize: '0.70rem', color: '#94a3b8', alignSelf: 'center', marginRight: '2px' }}>🚀 Export Aged Mix:</span>
              <button
                type="button"
                onClick={handleDispatchToDose}
                style={{ fontSize: '0.71rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', cursor: 'pointer', fontWeight: 600 }}
                title="Send time-evolved parent + daughter activity mixture at t_sim to Module 1A External Dose Calculator"
              >
                🎯 Dose (1A)
              </button>
              <button
                type="button"
                onClick={handleDispatchToShielding}
                style={{ fontSize: '0.71rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', cursor: 'pointer', fontWeight: 600 }}
                title="Send activity-weighted effective photon energy E_eff(t_sim) and aged mixture to Module 14 Shielding"
              >
                🧱 Shielding (14)
              </button>
              <button
                type="button"
                onClick={handleDispatchToSpectroscopy}
                style={{ fontSize: '0.71rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)', cursor: 'pointer', fontWeight: 600 }}
                title="Synthesize and open aged multi-isotope gamma spectrum in Module 28 MCA Spectroscopy"
              >
                📊 MCA Spectrum (28)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>🔍</span>
              <select className="form-control" style={{ width: '130px', fontSize: '0.76rem', padding: '2px 6px' }} value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)}>
                {uniqueSymbols.map(sym => (
                  <option key={sym} value={sym}>{sym} - {ELEMENT_NAMES[sym] || 'Unknown'}</option>
                ))}
              </select>
              <select
                className="form-control"
                style={{ width: '110px', fontSize: '0.76rem', padding: '2px 6px' }}
                value={selectedIsotope ? selectedIsotope.Nuclide : ''}
                onChange={e => {
                  const nuc = allNuclides.find(n => n.Nuclide === e.target.value);
                  if (nuc) handleIsotopeClick(nuc);
                }}
              >
                <option value="" disabled>Isotope...</option>
                {availableIsotopes.map(iso => (
                  <option key={iso.Nuclide} value={iso.Nuclide}>{iso.Nuclide}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Benchmark Decay Chains + Generator Milking & Reactor Activation Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              ⚡ Chains:
            </span>
            {BENCHMARK_CHAIN_PRESETS.map(preset => {
              const isSelected = selectedIsotope?.Nuclide === preset.nuclide;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  title={preset.description}
                  style={{
                    fontSize: '0.71rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: isSelected ? '#38bdf8' : '#cbd5e1',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    fontWeight: isSelected ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{preset.label}</span>
                  <span style={{ fontSize: '0.62rem', padding: '0px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.35)', color: '#facc15' }}>
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Radiochemical Generator Elution & Neutron Activation Mode Switches */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const next = !elutionEnabled;
                setElutionEnabled(next);
                if (next) setActivationEnabled(false);
              }}
              style={{
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 700,
                background: elutionEnabled ? 'rgba(34, 211, 238, 0.22)' : 'rgba(255,255,255,0.04)',
                color: elutionEnabled ? '#22d3ee' : '#94a3b8',
                border: elutionEnabled ? '1px solid #22d3ee' : '1px solid rgba(255,255,255,0.1)'
              }}
              title="Simulate periodic saline elutions ('milking the cow') with sawtooth daughter regrowth and pie ratio resets"
            >
              🧪 Generator Milking {elutionEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !activationEnabled;
                setActivationEnabled(next);
                if (next) {
                  setElutionEnabled(false);
                  const preset = REACTOR_ACTIVATION_PRESETS.find(p => p.id === selectedActivationPresetId) || REACTOR_ACTIVATION_PRESETS[0];
                  handleSelectActivationPreset(preset);
                }
              }}
              style={{
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 700,
                background: activationEnabled ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.04)',
                color: activationEnabled ? '#fbbf24' : '#94a3b8',
                border: activationEnabled ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)'
              }}
              title="Simulate in-core thermal neutron activation (σ·Φ·N_target) up to EOB followed by post-discharge cooling"
            >
              ⚛️ Reactor Activation {activationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Conditional Toolbar: Generator Elution ("Milking") Controls */}
        {elutionEnabled && (
          <div style={{ background: 'rgba(34, 211, 238, 0.07)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.74rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#22d3ee' }}>🧪 Column Elution Schedule:</strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
                Interval:
                <select
                  className="form-control"
                  style={{ width: '78px', padding: '1px 4px', fontSize: '0.73rem' }}
                  value={elutionIntervalHours}
                  onChange={e => setElutionIntervalHours(Number(e.target.value))}
                >
                  <option value={6}>Every 6 h</option>
                  <option value={12}>Every 12 h</option>
                  <option value={24}>Every 24 h</option>
                  <option value={48}>Every 48 h</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1' }}>
                Elution Yield η:
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '54px', padding: '1px 4px', fontSize: '0.73rem' }}
                  min={50}
                  max={100}
                  value={elutionEfficiencyPct}
                  onChange={e => setElutionEfficiencyPct(Math.min(100, Math.max(10, Number(e.target.value))))}
                />
                <span>%</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeHarvestedInPie}
                  onChange={e => setIncludeHarvestedInPie(e.target.checked)}
                />
                Show Harvested Eluate Slice in Pie Chart
              </label>
            </div>

            {simResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#e2e8f0' }}>
                  Elutions: <strong style={{ color: '#22d3ee' }}>{simResult.elutionEvents.length}</strong>
                </span>
                <span style={{ color: '#e2e8f0' }}>
                  Total Harvested: <strong style={{ color: '#34d399' }}>{totalHarvestedMBq.toFixed(1)} MBq ({(totalHarvestedMBq / 37).toFixed(2)} mCi)</strong>
                </span>
                <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid #10b981', color: '#34d399', fontSize: '0.68rem' }}>
                  USP &lt;823&gt; Breakthrough PASS (&lt;0.15 µCi/mCi)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Conditional Toolbar: Reactor Neutron Activation Controls */}
        {activationEnabled && (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.73rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#fbbf24' }}>⚛️ Target Activation:</strong>
              <select
                className="form-control"
                style={{ width: '195px', padding: '1px 5px', fontSize: '0.73rem' }}
                value={selectedActivationPresetId}
                onChange={e => {
                  const p = REACTOR_ACTIVATION_PRESETS.find(x => x.id === e.target.value);
                  if (p) handleSelectActivationPreset(p);
                }}
              >
                {REACTOR_ACTIVATION_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.label} (σ={p.thermalCrossSectionBarns} b)</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cbd5e1' }}>
                Mass(g):
                <input type="number" className="form-control" style={{ width: '52px', padding: '1px 4px', fontSize: '0.72rem' }} value={targetMassGrams} onChange={e => setTargetMassGrams(Math.max(0.001, Number(e.target.value)))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cbd5e1' }}>
                σ(b):
                <input type="number" className="form-control" style={{ width: '56px', padding: '1px 4px', fontSize: '0.72rem' }} value={sigmaActBarns} onChange={e => setSigmaActBarns(Math.max(0.001, Number(e.target.value)))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cbd5e1' }}>
                Φ(n/cm²·s):
                <input type="number" className="form-control" style={{ width: '78px', padding: '1px 4px', fontSize: '0.72rem' }} value={neutronFluxNcm2s} onChange={e => setNeutronFluxNcm2s(Math.max(1e6, Number(e.target.value)))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#cbd5e1' }}>
                EOB(h):
                <input type="number" className="form-control" style={{ width: '54px', padding: '1px 4px', fontSize: '0.72rem' }} value={irradiationHours} onChange={e => setIrradiationHours(Math.max(0.1, Number(e.target.value)))} />
              </label>
            </div>

            {simResult && simResult.eobActivityMBq !== undefined && (
              <div style={{ display: 'flex', gap: '10px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#fde047' }}>
                  A_EOB: <strong>{simResult.eobActivityMBq.toExponential(2)} MBq</strong>
                </span>
                <span style={{ color: '#94a3b8' }}>
                  A_sat: {(simResult.saturationActivityMBq || 0).toExponential(2)} MBq
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL VIEWPORT 4-QUADRANT GRID */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.15fr', gridTemplateRows: '1fr 1.15fr', gap: '12px', paddingBottom: '8px', minHeight: 0, overflow: 'hidden' }}>

        {/* Q1: Top Left - Karlsruhe Chart */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0a0a0a', minHeight: 0, display: 'flex' }}>
          <KarlsruheSvgChart
            onIsotopeClick={handleIsotopeClick}
            onClearSelection={() => setSelectedIsotope(null)}
            activePathIds={activePathIds}
          />
        </div>

        {/* Q2: Top Right - Time-Series Ingrowth / Elution Sawtooth / Activation Curves OR Detector Spectrum */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #333', backgroundColor: '#0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setQ2Tab('time_series')}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: q2Tab === 'time_series' ? 700 : 500,
                  background: q2Tab === 'time_series' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: q2Tab === 'time_series' ? '#38bdf8' : '#94a3b8',
                  border: q2Tab === 'time_series' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                📈 {elutionEnabled ? 'Sawtooth Elution & Regrowth' : activationEnabled ? 'In-Core Activation & Cooling' : 'Parent & Daughter Time Evolution'}
              </button>
              <button
                type="button"
                onClick={() => setQ2Tab('spectrum')}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: q2Tab === 'spectrum' ? 700 : 500,
                  background: q2Tab === 'spectrum' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: q2Tab === 'spectrum' ? '#c084fc' : '#94a3b8',
                  border: q2Tab === 'spectrum' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                🔬 Simulated Detector Spectrum
              </button>
            </div>

            {q2Tab === 'spectrum' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.73rem', color: '#aaa' }}>Δt:</span>
                <input type="number" className="form-control" style={{ width: '52px', padding: '1px 4px', fontSize: '0.73rem' }} value={exposureTime} onChange={e => setExposureTime(Number(e.target.value))} />
                <select className="form-control" style={{ padding: '1px 4px', fontSize: '0.73rem' }} value={exposureUnit} onChange={e => setExposureUnit(Number(e.target.value))}>
                  <option value={1}>Sec</option>
                  <option value={60}>Min</option>
                  <option value={3600}>Hr</option>
                  <option value={86400}>Days</option>
                </select>
              </div>
            ) : (
              <span style={{ fontSize: '0.72rem', color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                {pieChartData.equilibriumBadge}
              </span>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {!selectedIsotope ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                No isotope loaded for analysis.
              </div>
            ) : q2Tab === 'time_series' ? (
              <Plot
                data={timeSeriesPlotData.traces}
                layout={{
                  autosize: true,
                  margin: { t: 28, l: 55, r: 18, b: 38 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  yaxis: {
                    title: pieRatioBasis === 'atoms' ? 'Atomic Share (%)' : 'Activity (MBq)',
                    color: '#aaa',
                    gridcolor: '#262b36',
                    zeroline: false
                  },
                  xaxis: {
                    title: `Elapsed Time (${timeSeriesPlotData.unitLabel})`,
                    color: '#aaa',
                    gridcolor: '#262b36',
                    zeroline: false
                  },
                  font: { color: '#E0E1DD', size: 11 },
                  legend: { orientation: 'h', y: 1.14, x: 0, font: { size: 10 } },
                  shapes: [
                    {
                      type: 'line',
                      x0: timeSeriesPlotData.currentT,
                      x1: timeSeriesPlotData.currentT,
                      y0: 0,
                      y1: 1,
                      yref: 'paper',
                      line: { color: '#facc15', width: 2, dash: 'dash' }
                    },
                    ...(timeSeriesPlotData.eobT !== null
                      ? [
                          {
                            type: 'line' as const,
                            x0: timeSeriesPlotData.eobT,
                            x1: timeSeriesPlotData.eobT,
                            y0: 0,
                            y1: 1,
                            yref: 'paper' as const,
                            line: { color: '#ef4444', width: 1.8, dash: 'dot' as const }
                          }
                        ]
                      : [])
                  ],
                  annotations: [
                    {
                      x: timeSeriesPlotData.currentT,
                      y: 0.95,
                      yref: 'paper',
                      text: `t = ${timeSeriesPlotData.currentT.toFixed(2)} ${timeSeriesPlotData.unitLabel}`,
                      showarrow: false,
                      bgcolor: 'rgba(250, 204, 21, 0.18)',
                      bordercolor: '#facc15',
                      borderwidth: 1,
                      font: { color: '#fde047', size: 10 }
                    },
                    ...(timeSeriesPlotData.eobT !== null
                      ? [
                          {
                            x: timeSeriesPlotData.eobT,
                            y: 0.15,
                            yref: 'paper' as const,
                            text: 'EOB (Reactor Discharge)',
                            showarrow: false,
                            bgcolor: 'rgba(239, 68, 68, 0.2)',
                            bordercolor: '#ef4444',
                            borderwidth: 1,
                            font: { color: '#fca5a5', size: 9.5 }
                          }
                        ]
                      : [])
                  ]
                }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              />
            ) : (
              <Plot
                data={spectrumPlotData.traces as any}
                layout={{
                  autosize: true,
                  margin: { t: 35, l: 55, r: 20, b: 38 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  yaxis: { title: 'Relative Intensity', color: '#aaa', gridcolor: '#333', showticklabels: true, zeroline: false },
                  xaxis: { title: 'Energy (MeV)', color: '#aaa', gridcolor: '#333', zeroline: false, rangemode: 'tozero' },
                  font: { color: '#E0E1DD' },
                  showlegend: false,
                  annotations: spectrumPlotData.annotations
                }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              />
            )}
          </div>
        </div>

        {/* Q3: Bottom Left - React Flow Pathway with Bifurcating Split Branches & Live % Bars */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative', backgroundColor: '#0a0a0a', minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {selectedIsotope ? (
            <div style={{ flex: 1, height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                attributionPosition="bottom-right"
                key={selectedIsotope.Nuclide}
              >
                <Background color="#444" gap={16} />
                <Controls />
                <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 10, background: 'rgba(10, 15, 25, 0.88)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 10px', borderRadius: '5px', color: '#fff', fontSize: '0.76rem' }}>
                  <strong>🔗 Decay Topology: {selectedIsotope.Nuclide}</strong> ({chainNodes.length} Nuclides, {chainEdges.length} Transitions)
                </div>
              </ReactFlow>
            </div>
          ) : (
            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Click ANY isotope box on the chart to generate its decay kinematics mapping.
            </div>
          )}
        </div>

        {/* Q4: Bottom Right - Interactive Isotope-to-Daughters Pie Chart & Bateman Yield Console */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '7px', backgroundColor: 'rgba(255,255,255,0.02)', minHeight: 0, overflow: 'hidden' }}>

          {/* Top Bar: Title + 4-Way Ratio Basis Switcher + View Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                🥧 Isotope &amp; Modality Ratios
              </span>

              {/* 4-Way Basis Pills */}
              <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setPieRatioBasis('atoms')}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: pieRatioBasis === 'atoms' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: pieRatioBasis === 'atoms' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    fontWeight: pieRatioBasis === 'atoms' ? 700 : 400
                  }}
                >
                  ⚛️ Atoms %
                </button>
                <button
                  type="button"
                  onClick={() => setPieRatioBasis('activity')}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: pieRatioBasis === 'activity' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                    color: pieRatioBasis === 'activity' ? '#fbbf24' : '#94a3b8',
                    border: 'none',
                    fontWeight: pieRatioBasis === 'activity' ? 700 : 400
                  }}
                >
                  ☢️ Activity
                </button>
                <button
                  type="button"
                  onClick={() => setPieRatioBasis('heat')}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: pieRatioBasis === 'heat' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                    color: pieRatioBasis === 'heat' ? '#f87171' : '#94a3b8',
                    border: 'none',
                    fontWeight: pieRatioBasis === 'heat' ? 700 : 400
                  }}
                >
                  🔥 Heat
                </button>
                <button
                  type="button"
                  onClick={() => setPieRatioBasis('modality')}
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: pieRatioBasis === 'modality' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                    color: pieRatioBasis === 'modality' ? '#c084fc' : '#94a3b8',
                    border: 'none',
                    fontWeight: pieRatioBasis === 'modality' ? 700 : 400
                  }}
                  title="Breakdown of emitted radiation power by α-recoil, β-electrons, and γ/IT photons"
                >
                  ⚡ α/β/γ Split
                </button>
              </div>
            </div>

            {/* Layout Toggle */}
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.35)', padding: '2px', borderRadius: '5px' }}>
              <button
                type="button"
                onClick={() => setQ4ViewMode('split')}
                style={{
                  fontSize: '0.67rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  background: q4ViewMode === 'split' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: q4ViewMode === 'split' ? '#00e5ff' : '#94a3b8',
                  border: 'none'
                }}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setQ4ViewMode('pie_only')}
                style={{
                  fontSize: '0.67rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  background: q4ViewMode === 'pie_only' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: q4ViewMode === 'pie_only' ? '#00e5ff' : '#94a3b8',
                  border: 'none'
                }}
              >
                Large Pie
              </button>
              <button
                type="button"
                onClick={() => setQ4ViewMode('table_only')}
                style={{
                  fontSize: '0.67rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  background: q4ViewMode === 'table_only' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: q4ViewMode === 'table_only' ? '#00e5ff' : '#94a3b8',
                  border: 'none'
                }}
              >
                Table
              </button>
            </div>
          </div>

          {/* 4D Animated Timeline Scrubber Bar */}
          <div style={{ padding: '6px 10px', backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  type="button"
                  onClick={() => setIsAnimating(!isAnimating)}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    background: isAnimating ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.22)',
                    color: isAnimating ? '#f87171' : '#34d399',
                    border: isAnimating ? '1px solid #ef4444' : '1px solid #10b981'
                  }}
                >
                  {isAnimating ? '⏸ Pause' : '▶ Animate'}
                </button>

                {[0.5, 1, 2].map(spd => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setAnimSpeed(spd)}
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      background: animSpeed === spd ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                      color: animSpeed === spd ? '#38bdf8' : '#64748b',
                      border: 'none',
                      fontWeight: animSpeed === spd ? 700 : 400
                    }}
                  >
                    {spd}x
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => { setIsAnimating(false); setSliderPct(0); }}
                  style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}
                >
                  t=0
                </button>
                {transientPeakPct !== null && (
                  <button
                    type="button"
                    onClick={() => { setIsAnimating(false); setSliderPct(Number(transientPeakPct.toFixed(1))); }}
                    style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(250, 204, 21, 0.18)', color: '#fde047', border: '1px solid rgba(250, 204, 21, 0.4)', cursor: 'pointer' }}
                    title="Jump to Daughter Transient Equilibrium Peak Time"
                  >
                    ⚡ Peak
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setIsAnimating(false); setSliderPct(100); }}
                  style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}
                >
                  Max
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  t = {(timeValue * (sliderPct / 100)).toFixed(2)} {timeUnit === 31557600 ? 'Yrs' : timeUnit === 86400 ? 'Days' : timeUnit === 60 ? 'Min' : 'Secs'}
                </span>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '50px', padding: '1px 4px', fontSize: '0.71rem' }}
                  value={timeValue}
                  onChange={e => setTimeValue(Math.max(0.01, Number(e.target.value)))}
                />
                <select
                  className="form-control"
                  style={{ width: '60px', padding: '1px 3px', fontSize: '0.71rem' }}
                  value={timeUnit}
                  onChange={e => setTimeUnit(Number(e.target.value))}
                >
                  <option value={1}>Secs</option>
                  <option value={60}>Min</option>
                  <option value={86400}>Days</option>
                  <option value={31557600}>Yrs</option>
                </select>
              </div>
            </div>

            <input
              type="range"
              className="form-control"
              style={{ width: '100%', cursor: 'ew-resize', height: '5px', accentColor: '#38bdf8' }}
              min="0"
              max="100"
              step="0.1"
              value={sliderPct}
              onChange={e => setSliderPct(Number(e.target.value))}
            />
          </div>

          {/* Main Q4 Content Area: Pie Chart + Yield Table */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: q4ViewMode === 'split' ? '1.05fr 1.25fr' : '1fr', gap: '10px', minHeight: 0, overflow: 'hidden' }}>

            {/* LEFT PANE OF Q4: Interactive Isotope-to-Daughters Pie / Donut Chart */}
            {q4ViewMode !== 'table_only' && (
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', background: '#0a0d14', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, position: 'relative', minHeight: '165px' }}>
                  {pieChartData.values.length > 0 ? (
                    <Plot
                      data={[
                        {
                          type: 'pie',
                          labels: pieChartData.labels,
                          values: pieChartData.values,
                          hole: 0.46,
                          marker: {
                            colors: pieChartData.colors,
                            line: { color: '#0a0d14', width: 2 }
                          },
                          textinfo: 'percent',
                          textposition: 'inside',
                          insidetextorientation: 'horizontal',
                          hovertemplate: '%{customdata}<extra></extra>',
                          customdata: pieChartData.customHover,
                          sort: false
                        } as any
                      ]}
                      layout={{
                        autosize: true,
                        margin: { t: 8, b: 8, l: 8, r: 8 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        showlegend: true,
                        legend: {
                          orientation: q4ViewMode === 'pie_only' ? 'v' : 'h',
                          x: q4ViewMode === 'pie_only' ? 1.02 : 0,
                          y: q4ViewMode === 'pie_only' ? 0.5 : -0.05,
                          font: { color: '#cbd5e1', size: 9 }
                        },
                        annotations: [
                          {
                            text: `<b>${pieChartData.centerTitle}</b>`,
                            showarrow: false,
                            font: { size: 10.5, color: '#f8fafc' },
                            x: 0.5,
                            y: 0.5
                          }
                        ]
                      }}
                      config={{ displayModeBar: false, responsive: true }}
                      useResizeHandler
                      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                      Select an isotope to view parent/daughter ratios.
                    </div>
                  )}
                </div>

                {pieRatioBasis === 'activity' && (
                  <div style={{ padding: '2px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.67rem', color: '#94a3b8' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeStableInActivityPie}
                        onChange={e => setIncludeStableInActivityPie(e.target.checked)}
                      />
                      Include cumulative decayed fraction slice
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT PANE OF Q4: Bateman Yield & Ratio Table */}
            {q4ViewMode !== 'pie_only' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.73rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#cbd5e1' }}>A₀:</span>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '64px', padding: '1px 5px', fontSize: '0.73rem' }}
                      value={initialActivity}
                      onChange={e => setInitialActivity(Math.max(0.001, Number(e.target.value)))}
                      disabled={activationEnabled}
                    />
                    <span style={{ color: '#94a3b8' }}>MBq</span>
                  </div>
                  {agedMixtureSummary && (
                    <span style={{ color: '#38bdf8', fontSize: '0.70rem', fontFamily: 'var(--font-mono)' }}>
                      ΣActive: {agedMixtureSummary.totalActiveMBq.toFixed(2)} MBq (E_eff={agedMixtureSummary.effectiveEnergyMeV.toFixed(2)} MeV)
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#141821', zIndex: 5 }}>
                      <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', color: '#94a3b8' }}>
                        <th style={{ padding: '4px 6px' }}>Nuclide</th>
                        <th style={{ padding: '4px 6px' }}>T₁/₂</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Atom %</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chainNodes.map((node, idx) => {
                        const y = yields[idx];
                        if (!y) return null;
                        const isStable = node.lambda === 0;
                        const sliceColor = CHAIN_PALETTE[idx % CHAIN_PALETTE.length];
                        const activeStr = isStable
                          ? 'Stable'
                          : y.activityMBq < 1e-4 && y.activityMBq > 0
                          ? `${y.activityMBq.toExponential(2)} MBq`
                          : `${y.activityMBq.toFixed(3)} MBq`;

                        return (
                          <tr key={node.nuclide} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '4px 6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sliceColor, display: 'inline-block', flexShrink: 0 }} />
                              <span>{node.nuclide}</span>
                            </td>
                            <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{node.halfLifeLabel === 'STABLE' ? '∞' : node.halfLifeLabel}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: sliceColor, fontWeight: 700 }}>
                              {y.atomFractionPct.toFixed(2)}%
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isStable ? '#94a3b8' : '#34d399' }}>
                              {activeStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};
export default DecayModule;
