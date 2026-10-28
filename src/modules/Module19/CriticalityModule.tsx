import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type CellType = 
  | 'FUEL' 
  | 'POISON' 
  | 'VOID' 
  | 'CONTROL' 
  | 'MODERATOR' 
  | 'REFLECTOR' 
  | 'INSTRUMENT';

export type ReactorCategory = 
  | 'Commercial Power'
  | 'Gen IV & Advanced'
  | 'Naval & Space'
  | 'Research & Criticality';

export interface LatticeCell {
  type: CellType;
  localEnrichmentPct?: number;
  voidFractionPct?: number;
  poisonWtPct?: number;
  controlInsertionPct?: number;
}

export interface CorePreset {
  name: string;
  category: ReactorCategory;
  enrichmentPct: number;
  moderatorType: 'Light Water (H2O)' | 'Heavy Water (D2O)' | 'Graphite' | 'Sodium/None';
  controlInsertionPct: number;
  boronPpm: number;
  coreHeightM: number;
  pitchM: number;
  description: string;
  physicsNote: string;
  grid: LatticeCell[][];
}

// Helper to construct a standard 7x7 lattice grid with full multi-variable cells
const create7x7Grid = (
  defaultType: CellType = 'FUEL',
  controlPositions: [number, number][] = [],
  defaultEnrichment = 3.5
): LatticeCell[][] => {
  const grid: LatticeCell[][] = [];
  for (let r = 0; r < 7; r++) {
    const row: LatticeCell[] = [];
    for (let c = 0; c < 7; c++) {
      if (r === 0 || r === 6 || c === 0 || c === 6) {
        row.push({
          type: 'REFLECTOR',
          localEnrichmentPct: 0,
          voidFractionPct: 0,
          poisonWtPct: 0,
          controlInsertionPct: 0
        });
      } else {
        row.push({
          type: defaultType,
          localEnrichmentPct: defaultType === 'FUEL' ? defaultEnrichment : 0,
          voidFractionPct: 0,
          poisonWtPct: 0,
          controlInsertionPct: 0
        });
      }
    }
    grid.push(row);
  }
  
  // Set specific control rod channels
  controlPositions.forEach(([r, c]) => {
    if (grid[r] && grid[r][c]) {
      grid[r][c] = {
        type: 'CONTROL',
        localEnrichmentPct: 0,
        voidFractionPct: 0,
        poisonWtPct: 0,
        controlInsertionPct: 100
      };
    }
  });

  return grid;
};

const PRESETS: CorePreset[] = [
  // 1. Commercial Power
  {
    name: 'PWR Assembly (3.5% U-235)',
    category: 'Commercial Power',
    enrichmentPct: 3.5,
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 30,
    boronPpm: 600,
    coreHeightM: 3.66,
    pitchM: 0.21,
    description: 'Standard Pressurized Water Reactor core with low-enriched UO₂ fuel and soluble boron control.',
    physicsNote: 'Operates in a thermal neutron spectrum. Utilizes moderate light water moderator/coolant. Safe negative moderator temperature coefficient limits runaway excursions.',
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 3], [3, 5], [5, 3]], 3.5)
  },
  {
    name: 'BWR/6 Assembly (4.2% U-235)',
    category: 'Commercial Power',
    enrichmentPct: 4.2,
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 40,
    boronPpm: 0,
    coreHeightM: 3.8,
    pitchM: 0.16,
    description: 'Boiling Water Reactor assembly with cruciform control blades and upper core boiling voids.',
    physicsNote: 'Thermal spectrum. Boiling causes steam voids which reduce moderation, providing a strong negative void coefficient of reactivity.',
    grid: create7x7Grid('FUEL', [[1, 1], [1, 5], [5, 1], [5, 5]], 4.2)
  },
  {
    name: 'VVER-1200 Core Lattice',
    category: 'Commercial Power',
    enrichmentPct: 4.95,
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 25,
    boronPpm: 400,
    coreHeightM: 3.73,
    pitchM: 0.24,
    description: 'Russian hexagonal VVER pressurized water core layout modeled on a square equivalent.',
    physicsNote: 'Features highly enriched commercial UO₂ fuel clusters with robust mechanical control rod banks and dissolved boric acid control.',
    grid: create7x7Grid('FUEL', [[2, 2], [2, 4], [4, 2], [4, 4]], 4.95)
  },
  {
    name: 'CANDU D2O Lattice (0.71%)',
    category: 'Commercial Power',
    enrichmentPct: 0.71, // Natural Uranium
    moderatorType: 'Heavy Water (D2O)',
    controlInsertionPct: 15,
    boronPpm: 0,
    coreHeightM: 5.9,
    pitchM: 0.285,
    description: 'Canadian Deuterium Uranium reactor using natural unenriched uranium fuel elements.',
    physicsNote: 'Uses heavy water (D₂O) which has a thermal absorption cross section 1000x lower than H₂O, enabling criticality using natural uranium.',
    grid: create7x7Grid('FUEL', [[2, 3], [3, 2], [3, 4], [4, 3]], 0.71)
  },

  // 2. Gen IV & Advanced
  {
    name: 'Sodium Fast Reactor (SFR MOX)',
    category: 'Gen IV & Advanced',
    enrichmentPct: 20.0,
    moderatorType: 'Sodium/None',
    controlInsertionPct: 35,
    boronPpm: 0,
    coreHeightM: 1.0,
    pitchM: 0.15,
    description: 'Sodium-Cooled Fast Reactor fueled with Mixed Oxide (MOX) plutonium/uranium.',
    physicsNote: 'Operates in a fast neutron spectrum. No moderator is used. Sodium coolant does not slow down neutrons, enabling plutonium breeding and actinide burning.',
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 3], [3, 5], [5, 3]], 20.0)
  },
  {
    name: 'HTGR Pebble Bed (Graphite)',
    category: 'Gen IV & Advanced',
    enrichmentPct: 9.6,
    moderatorType: 'Graphite',
    controlInsertionPct: 20,
    boronPpm: 0,
    coreHeightM: 10.0,
    pitchM: 0.35,
    description: 'High-Temperature Gas-Cooled Reactor using TRISO coated fuel particles in graphite pebbles.',
    physicsNote: 'Graphite moderator operates at extreme temperatures (>800°C). Helium coolant is chemically inert with zero neutron absorption cross section.',
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 5], [5, 3]], 9.6)
  },
  {
    name: 'Molten Salt Reactor (MSR)',
    category: 'Gen IV & Advanced',
    enrichmentPct: 5.0,
    moderatorType: 'Graphite',
    controlInsertionPct: 10,
    boronPpm: 0,
    coreHeightM: 3.5,
    pitchM: 0.18,
    description: 'Liquid fluoride fuel salt (LiF-BeF₂-UF₄) circulating through graphite moderator channels.',
    physicsNote: 'Liquid fuel provides passive safety: salt expands rapidly when heated, introducing a powerful negative temperature reactivity feedback.',
    grid: create7x7Grid('FUEL', [[2, 2], [2, 4], [4, 2], [4, 4]], 5.0)
  },

  // 3. Naval & Space
  {
    name: 'S9G Naval Submarine (HEU)',
    category: 'Naval & Space',
    enrichmentPct: 93.0, // High-enriched uranium naval reactor
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 65,
    boronPpm: 0,
    coreHeightM: 1.5,
    pitchM: 0.08,
    description: 'US Navy Virginia-class submarine propulsion core designed for 33+ years life-of-the-ship operation without refueling.',
    physicsNote: 'High enrichment (93% U-235) yields massive excess reactivity at beginning of life, controlled through heavy hafnium control blades and zirconium matrix fuel.',
    grid: create7x7Grid('FUEL', [[1, 2], [1, 4], [3, 2], [3, 4], [5, 2], [5, 4]], 93.0)
  },
  {
    name: 'NERVA Nuclear Rocket (Space)',
    category: 'Naval & Space',
    enrichmentPct: 93.0,
    moderatorType: 'Graphite',
    controlInsertionPct: 40,
    boronPpm: 0,
    coreHeightM: 1.3,
    pitchM: 0.09,
    description: 'Nuclear Thermal Propulsion rocket core with hydrogen propellant flowing through enriched graphite fuel elements.',
    physicsNote: 'Designed for extreme power density (1.5 GW thermal in a compact core). Cooled by cryogenic liquid hydrogen which also acts as a powerful temporary moderator.',
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 5], [5, 3]], 93.0)
  },

  // 4. Research & Criticality
  {
    name: 'TRIGA Mark II (20% LEU)',
    category: 'Research & Criticality',
    enrichmentPct: 19.75,
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 50,
    boronPpm: 0,
    coreHeightM: 0.76,
    pitchM: 0.07,
    description: 'Training, Research, Isotopes, General Atomics reactor with Uranium-Zirconium Hydride (UZrH) fuel.',
    physicsNote: 'Hydrogen is chemically bound inside the fuel matrix. High temperature instantly hardens the neutron spectrum inside the fuel pin, making TRIGA passively safe against prompt critical pulses.',
    grid: create7x7Grid('FUEL', [[2, 2], [2, 4], [4, 2], [4, 4]], 19.75)
  },
  {
    name: 'Spent Fuel Rack (Subcritical)',
    category: 'Research & Criticality',
    enrichmentPct: 4.5,
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 100,
    boronPpm: 2400,
    coreHeightM: 4.0,
    pitchM: 0.35,
    description: 'High-density spent fuel wet storage pool incorporating boron poison absorber panels.',
    physicsNote: 'Maintained highly subcritical using a combination of dense Boral plates and soluble boric acid in the storage water pool.',
    grid: create7x7Grid('MODERATOR', [[1, 1], [1, 5], [3, 3], [5, 1], [5, 5]], 4.5)
  },
  {
    name: 'Godiva II Bare HEU Sphere',
    category: 'Research & Criticality',
    enrichmentPct: 93.7, // Bare metal HEU
    moderatorType: 'Sodium/None',
    controlInsertionPct: 10,
    boronPpm: 0,
    coreHeightM: 0.3,
    pitchM: 0.05,
    description: 'Bare, unmoderated sphere of highly enriched uranium metal used for prompt burst experiments.',
    physicsNote: 'No moderator or reflector is present. Relies entirely on fast fission multiplication in solid uranium metal. Fission energy causes thermal expansion, safely limiting the burst.',
    grid: create7x7Grid('FUEL', [], 93.7)
  }
];

const CATEGORIES: (ReactorCategory | 'All')[] = [
  'All',
  'Commercial Power',
  'Gen IV & Advanced',
  'Naval & Space',
  'Research & Criticality'
];

export type MapDisplayMode = 'FLUX' | 'K_INF' | 'POWER';
export type FissileIsotopeKey = 'U-235' | 'Pu-239' | 'U-233';

interface DelayedGroupSpec {
  group: number;
  halfLifeS: number;
  lambdaSInv: number;
  relYieldAi: number;
  precursors: string;
}

const KEEPIN_DELAYED_GROUPS: Record<FissileIsotopeKey, {
  name: string;
  betaEff: number;
  promptGenTimeS: number;
  groups: DelayedGroupSpec[];
}> = {
  'U-235': {
    name: 'U-235 Thermal Fission (Keepin 1965, β_eff = 650 pcm)',
    betaEff: 0.00650,
    promptGenTimeS: 1.0e-4,
    groups: [
      { group: 1, halfLifeS: 55.72, lambdaSInv: 0.0124, relYieldAi: 0.033, precursors: 'Br-87' },
      { group: 2, halfLifeS: 22.72, lambdaSInv: 0.0305, relYieldAi: 0.219, precursors: 'I-137, Br-88' },
      { group: 3, halfLifeS: 6.22,  lambdaSInv: 0.1110, relYieldAi: 0.196, precursors: 'I-138, Br-89, Rb-93' },
      { group: 4, halfLifeS: 2.30,  lambdaSInv: 0.3010, relYieldAi: 0.395, precursors: 'I-139, Cs-143, Br-90' },
      { group: 5, halfLifeS: 0.61,  lambdaSInv: 1.1400, relYieldAi: 0.115, precursors: 'I-140, Kr-93' },
      { group: 6, halfLifeS: 0.23,  lambdaSInv: 3.0100, relYieldAi: 0.042, precursors: 'Br-91, Rb-95' }
    ]
  },
  'Pu-239': {
    name: 'Pu-239 Thermal/MOX Fission (Keepin 1965, β_eff = 210 pcm)',
    betaEff: 0.00210,
    promptGenTimeS: 5.0e-5,
    groups: [
      { group: 1, halfLifeS: 54.28, lambdaSInv: 0.0128, relYieldAi: 0.035, precursors: 'Br-87' },
      { group: 2, halfLifeS: 23.04, lambdaSInv: 0.0301, relYieldAi: 0.298, precursors: 'I-137, Br-88' },
      { group: 3, halfLifeS: 5.60,  lambdaSInv: 0.1240, relYieldAi: 0.211, precursors: 'I-138, Br-89' },
      { group: 4, halfLifeS: 2.13,  lambdaSInv: 0.3250, relYieldAi: 0.326, precursors: 'I-139, Cs-143' },
      { group: 5, halfLifeS: 0.62,  lambdaSInv: 1.1200, relYieldAi: 0.086, precursors: 'I-140, Kr-93' },
      { group: 6, halfLifeS: 0.26,  lambdaSInv: 2.6900, relYieldAi: 0.044, precursors: 'Br-91, Rb-95' }
    ]
  },
  'U-233': {
    name: 'U-233 Thorium Cycle Fission (Keepin 1965, β_eff = 264 pcm)',
    betaEff: 0.00264,
    promptGenTimeS: 8.0e-5,
    groups: [
      { group: 1, halfLifeS: 55.00, lambdaSInv: 0.0126, relYieldAi: 0.086, precursors: 'Br-87' },
      { group: 2, halfLifeS: 20.57, lambdaSInv: 0.0337, relYieldAi: 0.299, precursors: 'I-137, Br-88' },
      { group: 3, halfLifeS: 5.00,  lambdaSInv: 0.1390, relYieldAi: 0.252, precursors: 'I-138, Br-89' },
      { group: 4, halfLifeS: 2.13,  lambdaSInv: 0.3250, relYieldAi: 0.278, precursors: 'I-139, Cs-143' },
      { group: 5, halfLifeS: 0.61,  lambdaSInv: 1.1300, relYieldAi: 0.051, precursors: 'I-140' },
      { group: 6, halfLifeS: 0.28,  lambdaSInv: 2.5000, relYieldAi: 0.034, precursors: 'Br-91' }
    ]
  }
};

const CriticalityModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReactorCategory | 'All'>('All');
  const [activePreset, setActivePreset] = useState<CorePreset>(PRESETS[0]);

  // Core Physics Global Controls
  const [enrichmentPct, setEnrichPct] = useState<number>(3.5);
  const [moderatorType, setModeratorType] = useState<'Light Water (H2O)' | 'Heavy Water (D2O)' | 'Graphite' | 'Sodium/None'>('Light Water (H2O)');
  const [controlInsertionPct, setControlInsertionPct] = useState<number>(30);
  const [boronPpm, setBoronPpm] = useState<number>(600);
  const [coreHeightM, setCoreHeightM] = useState<number>(3.66);
  const [pitchM, setPitchM] = useState<number>(0.21);

  // 7x7 Grid Matrix with Cell-by-Cell Properties
  const [grid, setGrid] = useState<LatticeCell[][]>(PRESETS[0].grid);

  // Active selected cell for Inspector tuning
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 3, c: 3 });

  // Map visualization mode
  const [mapMode, setMapMode] = useState<MapDisplayMode>('FLUX');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Filter presets by active tab
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'All') return PRESETS;
    return PRESETS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  // Apply Preset
  const applyPreset = (preset: CorePreset) => {
    setActivePreset(preset);
    setEnrichPct(preset.enrichmentPct);
    setModeratorType(preset.moderatorType);
    setControlInsertionPct(preset.controlInsertionPct);
    setBoronPpm(preset.boronPpm);
    setCoreHeightM(preset.coreHeightM);
    setPitchM(preset.pitchM);
    setGrid(preset.grid.map(row => row.map(cell => ({ ...cell }))));
  };

  // Select cell on click
  const handleSelectCell = (r: number, c: number) => {
    setSelectedCell({ r, c });
  };

  // Update specific field of the currently selected cell
  const handleUpdateSelectedCell = (field: keyof LatticeCell, val: any) => {
    const { r, c } = selectedCell;
    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c] = {
      ...newGrid[r][c],
      [field]: val
    };
    setGrid(newGrid);
  };

  // Cycle cell type on double click / click
  const handleCycleCellType = (r: number, c: number) => {
    setSelectedCell({ r, c });
    const current = grid[r][c].type;
    const order: CellType[] = ['FUEL', 'POISON', 'VOID', 'CONTROL', 'MODERATOR', 'REFLECTOR', 'INSTRUMENT'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    const nextType = order[nextIndex];

    const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c] = {
      ...newGrid[r][c],
      type: nextType,
      localEnrichmentPct: nextType === 'FUEL' ? enrichmentPct : 0,
      poisonWtPct: nextType === 'POISON' ? 5.0 : 0,
      controlInsertionPct: nextType === 'CONTROL' ? controlInsertionPct : 0,
      voidFractionPct: nextType === 'VOID' ? 50 : 0
    };
    setGrid(newGrid);
  };

  // Physics Calculations Engine with Cell-by-Cell Heterogeneous Cross-Sections
  const math = useMemo(() => {
    // Moderator absorption coefficient
    let modAbsorptionCoeff = 0.022; // H2O
    if (moderatorType === 'Heavy Water (D2O)') modAbsorptionCoeff = 0.0005;
    if (moderatorType === 'Graphite') modAbsorptionCoeff = 0.003;
    if (moderatorType === 'Sodium/None') modAbsorptionCoeff = 0.0001;

    const boronAbsorption = (boronPpm / 1000) * 0.05;

    // 1. Compute Local Cross-Sections and Local k_inf for each of the 49 cells
    const localKInfMatrix: number[][] = [];
    const sigmaAMatrix: number[][] = [];
    const nuSigmaFMatrix: number[][] = [];

    let totalFuelCount = 0;
    let totalFissionProduction = 0;
    let totalAbsorption = 0;

    for (let r = 0; r < 7; r++) {
      const kRow: number[] = [];
      const saRow: number[] = [];
      const nsfRow: number[] = [];

      for (let c = 0; c < 7; c++) {
        const cell = grid[r][c];
        let sa = 0.01;
        let nsf = 0.0;
        let kCell = 0.0;

        switch (cell.type) {
          case 'FUEL': {
            totalFuelCount++;
            const localEnrich = (cell.localEnrichmentPct ?? enrichmentPct) / 100;
            const localVoid = (cell.voidFractionPct ?? 0) / 100;

            // Fission cross-section scales with enrichment and density reduction from voids
            nsf = (0.20 + localEnrich * 1.5) * (1 - 0.7 * localVoid);
            // Absorption cross-section includes fuel, local moderator, and boron
            sa = (0.16 + localEnrich * 1.1) * (1 - 0.7 * localVoid) + modAbsorptionCoeff * (1 - localVoid) + boronAbsorption;
            
            // Fast fission & resonance escape factors
            const pLocal = 0.88 * (1 - 0.15 * localVoid);
            const epsLocal = moderatorType === 'Sodium/None' ? 1.15 : 1.03;

            kCell = (nsf / Math.max(0.001, sa)) * pLocal * epsLocal;
            break;
          }
          case 'POISON': {
            totalFuelCount++;
            const localEnrich = (cell.localEnrichmentPct ?? enrichmentPct) / 100;
            const poisonWt = (cell.poisonWtPct ?? 5.0) / 10;
            // High thermal absorption from Gd-157 / Boral
            sa = 0.20 + poisonWt * 1.8 + boronAbsorption;
            nsf = (0.15 + localEnrich * 1.2) * 0.8; // suppressed fission
            kCell = Math.min(0.65, nsf / Math.max(0.001, sa));
            break;
          }
          case 'VOID': {
            // Steam void / channel: minimal absorption, zero fission, low moderation
            sa = 0.002 + boronAbsorption * 0.1;
            nsf = 0.0;
            kCell = 0.0;
            break;
          }
          case 'CONTROL': {
            // Control rod blade: absorption scales with insertion depth
            const depth = (cell.controlInsertionPct ?? controlInsertionPct) / 100;
            sa = 0.05 + depth * 2.8 + boronAbsorption;
            nsf = 0.0;
            kCell = 0.0;
            break;
          }
          case 'MODERATOR': {
            sa = modAbsorptionCoeff + boronAbsorption;
            nsf = 0.0;
            kCell = 0.0;
            break;
          }
          case 'REFLECTOR': {
            sa = 0.004 + (moderatorType === 'Sodium/None' ? 0.001 : 0.005);
            nsf = 0.0;
            kCell = 0.0;
            break;
          }
          case 'INSTRUMENT': {
            sa = 0.02 + boronAbsorption;
            nsf = 0.005; // tiny fission chamber signal
            kCell = 0.15;
            break;
          }
        }

        totalFissionProduction += nsf;
        totalAbsorption += sa;

        kRow.push(Number(kCell.toFixed(3)));
        saRow.push(Number(sa.toFixed(4)));
        nsfRow.push(Number(nsf.toFixed(4)));
      }
      localKInfMatrix.push(kRow);
      sigmaAMatrix.push(saRow);
      nuSigmaFMatrix.push(nsfRow);
    }

    // Four-Factor core-averaged parameters
    const avgKInf = totalAbsorption > 0 ? totalFissionProduction / totalAbsorption : 0;
    const eFrac = Math.max(0.0071, enrichmentPct / 100);
    const eta = 2.08 * (eFrac / (eFrac + 0.045));
    const f = Math.min(0.99, (totalFissionProduction * 0.7) / Math.max(0.001, totalAbsorption));
    const p = moderatorType === 'Heavy Water (D2O)' ? 0.95 : moderatorType === 'Graphite' ? 0.89 : 0.86;
    const epsilon = moderatorType === 'Sodium/None' ? 1.15 : 1.03;
    const kInf = eta * f * p * epsilon;

    // Geometric Buckling & Leakage
    const coreWidthM = 7 * pitchM;
    const radiusM = coreWidthM / 2;
    const B2 = Math.pow(Math.PI / (radiusM + 0.1), 2) + Math.pow(Math.PI / (coreHeightM + 0.1), 2);

    let migrationAreaM2 = 0.006; // H2O
    if (moderatorType === 'Heavy Water (D2O)') migrationAreaM2 = 0.035;
    if (moderatorType === 'Graphite') migrationAreaM2 = 0.030;
    if (moderatorType === 'Sodium/None') migrationAreaM2 = 0.045;

    // Count reflectors on perimeter
    let nReflector = 0;
    grid.forEach(row => row.forEach(c => { if (c.type === 'REFLECTOR') nReflector++; }));
    const reflectorSavings = (nReflector / 24) * 0.35;
    const leakagePenalty = Math.max(0.01, (B2 * migrationAreaM2) * (1 - reflectorSavings));

    // Effective Multiplication Factor k_eff
    const kEff = kInf / (1 + leakagePenalty);

    // Reactivity rho in pcm
    const rhoPcm = ((kEff - 1) / Math.max(0.001, kEff)) * 1e5;

    // Kinetics parameters
    const beta = 0.0065;
    const promptLifetime = moderatorType === 'Sodium/None' ? 1e-7 : 2e-5;
    const precursorLambda = 0.08;

    let reactorPeriodS = 0;
    const rhoFrac = (kEff - 1) / Math.max(0.001, kEff);
    if (rhoFrac >= beta) {
      reactorPeriodS = promptLifetime / Math.max(1e-9, rhoFrac - beta);
    } else if (rhoFrac > 0) {
      reactorPeriodS = (beta - rhoFrac) / Math.max(1e-6, precursorLambda * rhoFrac);
    } else if (rhoFrac < 0) {
      reactorPeriodS = (beta - rhoFrac) / Math.min(-1e-6, precursorLambda * rhoFrac);
    }

    // Criticality classification
    let state: 'Subcritical' | 'Critical' | 'Supercritical' | 'Prompt Critical' = 'Subcritical';
    let stateColor = '#10B981';

    if (kEff >= 1 + beta) {
      state = 'Prompt Critical';
      stateColor = '#EF4444';
    } else if (kEff > 1.002) {
      state = 'Supercritical';
      stateColor = '#F59E0B';
    } else if (kEff >= 0.998) {
      state = 'Critical';
      stateColor = '#00E5FF';
    } else {
      state = 'Subcritical';
      stateColor = '#10B981';
    }

    // 2. Heterogeneous 2D Jacobi Diffusion Flux Solver
    const fluxMatrix: number[][] = Array(7).fill(0).map(() => Array(7).fill(0.1));
    const D = 0.9; // cm
    const h = pitchM * 100; // cm grid cell width

    for (let iter = 0; iter < 50; iter++) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          let neighborSum = 0;
          let count = 0;
          if (r > 0) { neighborSum += fluxMatrix[r - 1][c]; count++; }
          if (r < 6) { neighborSum += fluxMatrix[r + 1][c]; count++; }
          if (c > 0) { neighborSum += fluxMatrix[r][c - 1]; count++; }
          if (c < 6) { neighborSum += fluxMatrix[r][c + 1]; count++; }

          const sa = sigmaAMatrix[r][c];
          const nsf = nuSigmaFMatrix[r][c];
          const fissionSource = (nsf / Math.max(0.1, kEff)) * fluxMatrix[r][c];

          const denom = count + (h * h / D) * sa;
          const numer = neighborSum + (h * h / D) * fissionSource;

          fluxMatrix[r][c] = Math.max(0.01, 0.4 * fluxMatrix[r][c] + 0.6 * (numer / Math.max(0.001, denom)));
        }
      }
    }

    // Normalize Flux Matrix
    let maxFlux = 0.001;
    fluxMatrix.forEach(row => row.forEach(val => { if (val > maxFlux) maxFlux = val; }));
    const normalizedFlux = fluxMatrix.map(row => row.map(val => (val / maxFlux) * 100));

    // 3. Relative Power Density & Radial Peaking Factor F_xy
    const powerMatrix: number[][] = [];
    let sumPower = 0;
    let maxPower = 0;
    let activeFuelPins = 0;

    for (let r = 0; r < 7; r++) {
      const pRow: number[] = [];
      for (let c = 0; c < 7; c++) {
        const pVal = nuSigmaFMatrix[r][c] * normalizedFlux[r][c];
        pRow.push(pVal);
        if (grid[r][c].type === 'FUEL' || grid[r][c].type === 'POISON') {
          sumPower += pVal;
          activeFuelPins++;
          if (pVal > maxPower) maxPower = pVal;
        }
      }
      powerMatrix.push(pRow);
    }

    const avgFuelPower = activeFuelPins > 0 ? sumPower / activeFuelPins : 1.0;
    const normalizedPower = powerMatrix.map(row =>
      row.map(val => Number((val / Math.max(0.001, avgFuelPower)).toFixed(2)))
    );
    const peakingFactorFxy = Number((maxPower / Math.max(0.001, avgFuelPower)).toFixed(2));

    return {
      totalFuelCount,
      eta,
      f,
      p,
      epsilon,
      kInf,
      avgKInf,
      B2,
      leakagePenalty,
      kEff,
      rhoPcm,
      reactorPeriodS,
      state,
      stateColor,
      localKInfMatrix,
      sigmaAMatrix,
      nuSigmaFMatrix,
      normalizedFlux,
      normalizedPower,
      peakingFactorFxy
    };
  }, [grid, enrichmentPct, moderatorType, controlInsertionPct, boronPpm, coreHeightM, pitchM]);

  // Population dynamics time series chart
  const populationChartData = useMemo(() => {
    const times: number[] = [];
    const powerLevels: number[] = [];
    
    const maxTime = 30;
    const steps = 100;
    const step = maxTime / steps;

    for (let i = 0; i <= steps; i++) {
      const t = i * step;
      times.push(Number(t.toFixed(1)));
      let p = 1.0;
      if (math.state === 'Prompt Critical') {
        p = Math.min(1e12, Math.exp(t / Math.max(1e-4, math.reactorPeriodS)));
      } else if (math.state === 'Supercritical') {
        p = Math.min(1e8, Math.exp(t / Math.max(0.1, math.reactorPeriodS)));
      } else if (math.state === 'Critical') {
        p = 1.0;
      } else {
        p = Math.max(1e-5, Math.exp(t / Math.min(-0.1, math.reactorPeriodS)));
      }
      powerLevels.push(p);
    }

    return { times, powerLevels };
  }, [math.state, math.reactorPeriodS]);

  // Currently inspected cell
  const currentCell = grid[selectedCell.r]?.[selectedCell.c] || grid[3][3];

  // Helper for cell badge colors on the 7x7 grid
  const getCellColor = (cell: LatticeCell) => {
    switch (cell.type) {
      case 'FUEL': return '#00E5FF';
      case 'POISON': return '#D946EF';
      case 'VOID': return '#94A3B8';
      case 'CONTROL': return '#EF4444';
      case 'MODERATOR': return '#3B82F6';
      case 'REFLECTOR': return '#10B981';
      case 'INSTRUMENT': return '#F59E0B';
    }
  };

  const getCellLabel = (cell: LatticeCell) => {
    switch (cell.type) {
      case 'FUEL': return `${(cell.localEnrichmentPct ?? enrichmentPct).toFixed(1)}%`;
      case 'POISON': return 'Gd';
      case 'VOID': return 'VOID';
      case 'CONTROL': return 'B4C';
      case 'MODERATOR': return 'MOD';
      case 'REFLECTOR': return 'REF';
      case 'INSTRUMENT': return 'DET';
    }
  };

  // --- Keepin (1965) 6-Group Delayed Neutron Inhour Equation & Point Kinetics State ---
  const [fissileIsotope, setFissileIsotope] = useState<FissileIsotopeKey>('U-235');
  const [useLiveCoreReactivity, setUseLiveCoreReactivity] = useState<boolean>(false);
  const [inhourStepDollars, setInhourStepDollars] = useState<number>(0.25);

  const inhourKinetics = useMemo(() => {
    const spec = KEEPIN_DELAYED_GROUPS[fissileIsotope];
    const betaEff = spec.betaEff;
    const Lambda = spec.promptGenTimeS;
    const rhoDollars = useLiveCoreReactivity ? (math.rhoPcm * 1e-5) / betaEff : inhourStepDollars;
    const rhoAbs = rhoDollars * betaEff;
    const rhoPcm = rhoAbs * 1e5;

    // Exact 6-Group Inhour Equation: rho(omega) = (Lambda * omega)/(1 + Lambda * omega) + (beta_eff / (1 + Lambda * omega)) * sum(a_i * omega / (omega + lambda_i))
    const evalRhoAtOmega = (omega: number): number => {
      const denom0 = 1.0 + Lambda * omega;
      let delayedSum = 0;
      for (const g of spec.groups) {
        delayedSum += (g.relYieldAi * omega) / (omega + g.lambdaSInv);
      }
      return (Lambda * omega) / denom0 + (betaEff / denom0) * delayedSum;
    };

    // Solve for asymptotic inverse period omega_0 (s^-1) via robust bisection
    let omega0 = 0;
    if (Math.abs(rhoAbs) < 1e-8) {
      omega0 = 0;
    } else if (rhoAbs > 0) {
      let lo = 1e-7;
      let hi = Math.max(100, (rhoAbs / Lambda) * 2.5);
      for (let iter = 0; iter < 80; iter++) {
        const mid = 0.5 * (lo + hi);
        if (evalRhoAtOmega(mid) < rhoAbs) lo = mid;
        else hi = mid;
      }
      omega0 = 0.5 * (lo + hi);
    } else {
      // Principal negative root lies strictly in (-lambda_1, 0) where lambda_1 is Group 1 decay constant
      const lambda1 = spec.groups[0].lambdaSInv;
      let lo = -lambda1 + 1e-6;
      let hi = -1e-7;
      if (evalRhoAtOmega(lo) >= rhoAbs) {
        omega0 = -lambda1 + 1e-5;
      } else {
        for (let iter = 0; iter < 80; iter++) {
          const mid = 0.5 * (lo + hi);
          if (evalRhoAtOmega(mid) < rhoAbs) lo = mid;
          else hi = mid;
        }
        omega0 = 0.5 * (lo + hi);
      }
    }

    const asymptoticPeriodS = Math.abs(omega0) < 1e-7 ? Infinity : 1.0 / omega0;
    const doublingTimeS = asymptoticPeriodS * Math.LN2;
    const promptJumpRatio = rhoDollars < 0.99 ? 1.0 / (1.0 - rhoDollars) : Infinity;
    const meanDelayedLifetimeS = spec.groups.reduce((acc, g) => acc + g.relYieldAi / g.lambdaSInv, 0);

    // Group-by-group partial reactivity contribution at omega0
    const groupRows = spec.groups.map(g => {
      const betaI_pcm = g.relYieldAi * betaEff * 1e5;
      const partialDollars = Math.abs(omega0) < 1e-7 ? 0 : (g.relYieldAi * omega0) / (omega0 + g.lambdaSInv);
      return {
        ...g,
        betaI_pcm,
        tauI_s: 1.0 / g.lambdaSInv,
        partialDollars
      };
    });

    // Generate Inhour Curve (Period T vs Reactivity in $) for supercritical (+0.05 to +200 s) and subcritical (-85 to -2 s)
    const superPeriods: number[] = [];
    const superDollars: number[] = [];
    for (let i = 0; i <= 60; i++) {
      const T = 0.05 * Math.pow(4000, i / 60);
      const w = 1.0 / T;
      superPeriods.push(T);
      superDollars.push(evalRhoAtOmega(w) / betaEff);
    }

    const subPeriods: number[] = [];
    const subDollars: number[] = [];
    const minSubT = -1.0 / (spec.groups[0].lambdaSInv * 0.96); // approaches -1/lambda_1 asymptote (~ -80.6 s for U-235)
    for (let i = 0; i <= 50; i++) {
      const T = -1.5 - ((Math.abs(minSubT) - 1.5) * i) / 50;
      const w = 1.0 / T;
      subPeriods.push(T);
      subDollars.push(evalRhoAtOmega(w) / betaEff);
    }

    return {
      spec,
      betaEff,
      rhoDollars,
      rhoPcm,
      omega0,
      asymptoticPeriodS,
      doublingTimeS,
      promptJumpRatio,
      meanDelayedLifetimeS,
      groupRows,
      superPeriods,
      superDollars,
      subPeriods,
      subDollars
    };
  }, [fissileIsotope, useLiveCoreReactivity, inhourStepDollars, math.rhoPcm]);

  // --- Fission-Product Poison Transients (I-135 -> Xe-135 Xenon Pit & Pm-149 -> Sm-149) ---
  const [preScramFluxLog10, setPreScramFluxLog10] = useState<number>(13.70); // 5.0e13 n/(cm^2*s) nominal PWR
  const [excessReactivityMarginPcm, setExcessReactivityMarginPcm] = useState<number>(3500);

  const poisonTransients = useMemo(() => {
    const phi0 = Math.pow(10, preScramFluxLog10); // n/(cm^2*s)
    // Nuclear constants for I-135 / Xe-135 & Pm-149 / Sm-149 (Lamarsh & Baratta 3rd Ed. Table 7.4)
    const gammaI = 0.0639;
    const gammaX = 0.00237;
    const gammaSum = gammaI + gammaX; // 0.06627
    const lambdaI = 2.931e-5; // s^-1 (T_1/2 = 6.57 h)
    const lambdaX = 2.106e-5; // s^-1 (T_1/2 = 9.14 h)
    const sigmaX = 2.65e-18;  // cm^2 (2.65e6 barns!)
    const nu = 2.42;          // neutrons per U-235 thermal fission
    const thermalUtilF = Math.max(0.55, Math.min(0.95, math.f));

    // Steady-state equilibrium Xenon-135 negative reactivity worth:
    // -Delta_rho_Xe_inf = (gamma_I + gamma_X) * f / nu * [ (sigma_X * phi0) / (lambda_X + sigma_X * phi0) ]
    const burnRateX = sigmaX * phi0;
    const maxScaleWorthPcm = ((gammaSum * thermalUtilF) / nu) * 1e5; // ~ 2,190 to 2,500 pcm asymptotic high-flux ceiling
    const eqXeWorthPcm = maxScaleWorthPcm * (burnRateX / (lambdaX + burnRateX));

    // Ratio of equilibrium I-135 to Xe-135 nuclei at t = 0 (prior to SCRAM):
    // I_0 = gamma_I * Sigma_f * phi0 / lambda_I
    // X_0 = (gamma_I + gamma_X) * Sigma_f * phi0 / (lambda_X + sigma_X * phi0)
    // Since -Delta_rho_Xe(t) is proportional to X(t), we normalize by X_0 -> eqXeWorthPcm:
    const ratioI0ToX0 = (gammaI / gammaSum) * ((lambdaX + burnRateX) / lambdaI);

    // Post-SCRAM (phi -> 0 at t = 0) analytical Xenon-135 evolution:
    // X(t) / X_0 = exp(-lambda_X * t) + ratioI0ToX0 * (lambda_I / (lambda_I - lambda_X)) * (exp(-lambda_X * t) - exp(-lambda_I * t))
    const kFactor = ratioI0ToX0 * (lambdaI / (lambdaI - lambdaX));

    // Exact post-SCRAM peak time t_max (seconds -> hours):
    // dX/dt = 0 => exp((lambda_I - lambda_X)*t_max) = (lambda_I / lambda_X) * [ kFactor / (1 + kFactor) ]
    const argPeak = (lambdaI / lambdaX) * (kFactor / (1.0 + kFactor));
    const tMaxSec = argPeak > 1.0 ? Math.log(argPeak) / (lambdaI - lambdaX) : 0;
    const tMaxHours = tMaxSec / 3600.0;

    const evalXeWorthPcmAtSec = (tSec: number): number => {
      const term1 = Math.exp(-lambdaX * tSec);
      const term2 = kFactor * (Math.exp(-lambdaX * tSec) - Math.exp(-lambdaI * tSec));
      return eqXeWorthPcm * Math.max(0, term1 + term2);
    };

    const peakXeWorthPcm = evalXeWorthPcmAtSec(tMaxSec);

    // Samarium-149 (Pm-149 T_1/2 = 53.1 h -> stable Sm-149, sigma_Sm = 4.01e4 barns, gamma_Pm = 0.0107)
    const gammaPm = 0.0107;
    const lambdaPm = 3.626e-6; // s^-1 (53.1 h)
    const sigmaSm = 4.01e-20;  // cm^2
    const eqSmWorthPcm = ((gammaPm * thermalUtilF) / nu) * 1e5; // flux-independent equilibrium ~ 350-400 pcm
    const postScramSmWorthAdditionMaxPcm = eqSmWorthPcm * ((sigmaSm * phi0) / lambdaPm);

    // Compute 72-hour post-SCRAM time series & Xenon Dead-Time Window
    const hours: number[] = [];
    const xeWorthCurvePcm: number[] = [];
    const smWorthCurvePcm: number[] = [];
    const marginLinePcm: number[] = [];
    let deadStartHr: number | null = null;
    let deadEndHr: number | null = null;

    for (let h = 0; h <= 72; h += 0.5) {
      const tSec = h * 3600;
      const wXe = evalXeWorthPcmAtSec(tSec);
      const wSm = eqSmWorthPcm + postScramSmWorthAdditionMaxPcm * (1.0 - Math.exp(-lambdaPm * tSec));
      hours.push(h);
      xeWorthCurvePcm.push(Number(wXe.toFixed(1)));
      smWorthCurvePcm.push(Number(wSm.toFixed(1)));
      marginLinePcm.push(excessReactivityMarginPcm);

      if (wXe > excessReactivityMarginPcm) {
        if (deadStartHr === null) deadStartHr = h;
        deadEndHr = h;
      }
    }

    const deadDurationHr = deadStartHr !== null && deadEndHr !== null ? deadEndHr - deadStartHr : 0;

    return {
      phi0,
      eqXeWorthPcm,
      peakXeWorthPcm,
      tMaxHours,
      eqSmWorthPcm,
      deadStartHr,
      deadEndHr,
      deadDurationHr,
      hours,
      xeWorthCurvePcm,
      smWorthCurvePcm,
      marginLinePcm
    };
  }, [preScramFluxLog10, excessReactivityMarginPcm, math.f]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'Reactor Core Criticality & Four-Factor Safety Dossier',
    moduleName: 'Module 21: Criticality Safety & Reactor Core Simulator',
    statuteCitation: 'ANSI/ANS-8.1 / IAEA Safety Standards Series No. SSG-27',
    verificationTestId: 'VTEST-13',
    operatorName: 'Reactor Physics & Criticality Safety Officer',
    operatorCredentials: 'Senior Reactor Operator (SRO) / Nuclear Physicist',
    facility: 'Nuclear Reactor Core Simulation Facility',
    notes: `Core neutronics calculation for ${activePreset.name} (${moderatorType}). Nominal enrichment: ${enrichmentPct}%. Control insertion: ${controlInsertionPct}%. Soluble boron: ${boronPpm} ppm. Core state: ${math.state}.`,
    formulaDescription: 'k_{\\text{eff}} = \\frac{\\eta \\cdot \\epsilon \\cdot p \\cdot f}{1 + M^2 B^2}, \\quad \\rho = \\frac{k_{\\text{eff}} - 1}{k_{\\text{eff}}}',
    inputs: [
      { label: 'Core Configuration', value: activePreset.name },
      { label: 'Moderator System', value: moderatorType },
      { label: 'U-235 Enrichment', value: enrichmentPct, unit: '%' },
      { label: 'Soluble Boron Concentration', value: boronPpm, unit: 'ppm' },
      { label: 'Control Rod Bank Insertion', value: controlInsertionPct, unit: '%' },
      { label: 'Active Core Height', value: coreHeightM, unit: 'm' },
      { label: 'Lattice Pitch', value: pitchM, unit: 'm' }
    ],
    outputs: [
      { label: 'Effective Multiplication Factor (k_eff)', value: math.kEff.toFixed(5), status: math.kEff >= 1.0 ? 'WARNING' : 'PASS' },
      { label: 'Infinite Multiplication Factor (k_inf)', value: math.kInf.toFixed(5), status: 'PASS' },
      { label: 'Reactivity (ρ)', value: math.rhoPcm.toFixed(1), unit: 'pcm', status: math.rhoPcm > 0 ? 'WARNING' : 'PASS' },
      { label: 'Criticality State', value: math.state, status: math.state === 'Subcritical' ? 'PASS' : 'WARNING' },
      { label: 'Reactor Period (T)', value: math.reactorPeriodS > 1e4 ? 'Infinite (Stable)' : `${math.reactorPeriodS.toFixed(2)} s`, status: 'PASS' },
      { label: 'Thermal Fission Factor (η)', value: math.eta.toFixed(4), status: 'PASS' },
      { label: 'Resonance Escape (p)', value: math.p.toFixed(4), status: 'PASS' },
      { label: 'Thermal Utilization (f)', value: math.f.toFixed(4), status: 'PASS' },
      { label: 'Fast Fission Factor (ε)', value: math.epsilon.toFixed(4), status: 'PASS' }
    ]
  }), [activePreset, moderatorType, enrichmentPct, boronPpm, controlInsertionPct, coreHeightM, pitchM, math]);

  return (
    <div className="criticality-module">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ margin: 0 }}>⚛️ Module 21 — Criticality Safety &amp; Reactor Core Simulator (Multi-Variable Engine)</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Model nuclear criticality, four-factor neutron economy, heterogeneous pin-by-pin variables (burnable poisons, steam voids, enrichment grading), and 2D finite-difference spatial diffusion.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              color: '#00e5ff',
              background: 'rgba(0, 229, 255, 0.08)'
            }}
          >
            <span>🛡️</span>
            <span>Audit Dossier (21 CFR Part 11)</span>
          </button>
          <VerificationBadge testId="VTEST-13" standard="Lamarsh / IAEA" />
        </div>
      </div>

      {/* Preset Library Category Tabs */}
      <div className="panel" style={{ padding: '15px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Reactor Core Presets Library
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            12 Historical & Commercial Core Configurations
          </span>
        </div>

        {/* Category Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '6px 14px',
                background: selectedCategory === cat ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedCategory === cat ? '#000' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                boxShadow: 'none',
                fontWeight: selectedCategory === cat ? 'bold' : 'normal'
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset Buttons Grid */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {filteredPresets.map((p) => {
            const isSelected = activePreset.name === p.name;
            return (
              <button
                key={p.name}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                  color: isSelected ? '#00e5ff' : '#fff',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`
                }}
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Active Preset Operational Context Card */}
        {activePreset && (
          <div style={{ padding: '12px 15px', background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: 'var(--color-primary)' }}>{activePreset.name}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', padding: '2px 6px', background: 'rgba(255,159,28,0.1)', borderRadius: '4px' }}>
                {activePreset.category}
              </span>
            </div>
            <div style={{ color: '#fff', marginBottom: '4px' }}>{activePreset.description}</div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.4' }}>
              <strong>Operational Physics Note:</strong> {activePreset.physicsNote}
            </p>
          </div>
        )}
      </div>

      {/* Real-Time Tactical Core Neutronics HUD Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            borderTop: `1px solid ${math.stateColor}60`,
            borderRight: `1px solid ${math.stateColor}60`,
            borderBottom: `1px solid ${math.stateColor}60`,
            borderLeft: `4px solid ${math.stateColor}`,
            borderRadius: '8px',
            padding: '12px 16px'
          }}
        >
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Effective Multiplication (k_eff)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {math.kEff.toFixed(4)}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: math.stateColor,
                padding: '2px 6px',
                borderRadius: '4px',
                background: `${math.stateColor}20`
              }}
            >
              {math.state}
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '12px 16px'
          }}
        >
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Core Reactivity (ρ)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: math.rhoPcm > 0 ? '#f59e0b' : '#00e5ff', fontFamily: 'var(--font-mono)' }}>
              {math.rhoPcm >= 0 ? `+${math.rhoPcm.toFixed(0)}` : math.rhoPcm.toFixed(0)}
            </span>
            <span style={{ fontSize: '0.80rem', color: '#94a3b8' }}>pcm</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: 'auto' }}>
              (${(math.rhoPcm / 650).toFixed(2)})
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '12px 16px'
          }}
        >
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Asymptotic Reactor Period (T)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: math.state === 'Prompt Critical' ? '#ef4444' : '#fff', fontFamily: 'var(--font-mono)' }}>
              {math.reactorPeriodS > 1e4 ? '∞ (Stable)' : `${math.reactorPeriodS.toFixed(1)} s`}
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '12px 16px'
          }}
        >
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Radial Peaking Factor (F_xy)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: math.peakingFactorFxy > 2.0 ? '#f59e0b' : '#34d399', fontFamily: 'var(--font-mono)' }}>
              {math.peakingFactorFxy.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {math.peakingFactorFxy > 2.0 ? 'Hot Channel Risk' : 'Acceptable Flux'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Core Controls */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Core-Wide Controls &amp; Coolant Chemistry</h3>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Global Fuel Enrichment</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={enrichmentPct}
                  min="0.71"
                  max="93.7"
                  step="0.1"
                  onChange={(e) => setEnrichPct(Math.max(0.71, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>%</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Coolant / Moderator</label>
              <select
                className="form-control"
                value={moderatorType}
                onChange={(e) => setModeratorType(e.target.value as any)}
              >
                <option value="Light Water (H2O)">Light Water (H₂O)</option>
                <option value="Heavy Water (D2O)">Heavy Water (D₂O)</option>
                <option value="Graphite">Nuclear Graphite</option>
                <option value="Sodium/None">Fast Spectrum / Sodium</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Global Control Bank Insertion (B₄C)</label>
              <span style={{ fontWeight: 'bold', color: controlInsertionPct > 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {controlInsertionPct} %
              </span>
            </div>

            {/* Quick Rod Bank Buttons */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
              {[
                { label: '🔴 Full SCRAM (100%)', val: 100 },
                { label: '🟠 Shutdown (80%)', val: 80 },
                { label: '🟢 Critical Trim (30%)', val: 30 },
                { label: '⚪ Full Rod Out (0%)', val: 0 }
              ].map((rb) => (
                <button
                  key={rb.val}
                  type="button"
                  onClick={() => setControlInsertionPct(rb.val)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.70rem',
                    borderRadius: '4px',
                    border: controlInsertionPct === rb.val ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: controlInsertionPct === rb.val ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.03)',
                    color: controlInsertionPct === rb.val ? '#00e5ff' : '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  {rb.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={controlInsertionPct}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              onChange={(e) => setControlInsertionPct(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Soluble Boron (Chemical Shim)</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={boronPpm}
                  min="0"
                  max="3000"
                  step="50"
                  onChange={(e) => setBoronPpm(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>ppm</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Assembly Pitch</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={pitchM}
                  min="0.05"
                  max="0.50"
                  step="0.01"
                  onChange={(e) => setPitchM(Math.max(0.05, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>m</span>
              </div>
            </div>
          </div>

          {/* Material Palette Legend */}
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              Multi-Variable Lattice Palette
            </h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#00E5FF', borderRadius: '2px' }}></span> Fuel (UO₂)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#D946EF', borderRadius: '2px' }}></span> Burnable Poison (Gd₂O₃)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#94A3B8', borderRadius: '2px' }}></span> Steam / Void
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></span> Control (B₄C)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }}></span> Moderator
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></span> Reflector
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }}></span> Instrument
              </span>
            </div>
          </div>
        </div>

        {/* Four-Factor & Criticality Output Summary */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Neutron Multiplication & Core Reactivity</h3>
            
            {/* Main Status Badge */}
            <div style={{ padding: '15px', borderRadius: '8px', border: `2px solid ${math.stateColor}`, background: `${math.stateColor}15`, marginBottom: '15px', textAlign: 'center' }}>
              <h3 style={{ color: math.stateColor, margin: 0, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {math.state}
              </h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                k_eff = {math.kEff.toFixed(4)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Reactivity (ρ): <strong>{math.rhoPcm.toFixed(0)} pcm</strong>
              </div>

              {math.state === 'Prompt Critical' && (
                <div style={{ marginTop: '10px', padding: '6px', background: 'rgba(239, 68, 68, 0.3)', border: '1px solid #EF4444', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
                  ⚠️ PROMPT CRITICAL EXCURSION: k_eff ≥ 1 + β_eff (UNCONTROLLED RUNAWAY)
                </div>
              )}
            </div>

            {/* Four-Factor Breakdown Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Thermal Reproduction (η):</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{math.eta.toFixed(3)}</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Thermal Utilization (f):</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{math.f.toFixed(3)}</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Resonance Escape (p):</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{math.p.toFixed(3)}</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fast Fission (ε):</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{math.epsilon.toFixed(3)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Core Infinite Multiplication (k_∞):</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{math.kInf.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Radial Peaking Factor (F_xy):</span>
              <span style={{ fontWeight: 'bold', color: math.peakingFactorFxy > 1.65 ? '#ef4444' : '#2ecc71' }}>
                {math.peakingFactorFxy.toFixed(2)} {math.peakingFactorFxy > 1.65 ? '(High Peaking!)' : '(Compliant)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Asymptotic Period (T):</span>
              <span style={{ fontWeight: 'bold', color: math.stateColor }}>
                {math.state === 'Critical' ? 'Infinite (Stable)' : `${math.reactorPeriodS.toFixed(2)} sec`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Heatmap & Interactive Lattice Grid Section */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Interactive 7x7 Grid Matrix Canvas */}
        <div className="panel" style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>7x7 Lattice Material Grid</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Click to select &amp; edit</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 44px)', gap: '6px', background: '#030712', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const bg = getCellColor(cell);
                const label = getCellLabel(cell);

                return (
                  <button
                    key={`${r}-${c}`}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '4px',
                      background: bg,
                      border: isSelected ? '3px solid #FFF' : '1px solid rgba(0,0,0,0.5)',
                      boxShadow: isSelected ? '0 0 12px #00E5FF' : 'none',
                      cursor: 'pointer',
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      color: '#000',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px'
                    }}
                    onClick={() => handleSelectCell(r, c)}
                    onDoubleClick={() => handleCycleCellType(r, c)}
                    title={`Row ${r+1}, Col ${c+1}: ${cell.type}. Click to inspect, double-click to cycle.`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Cell Inspector Drawer / Tuning Panel */}
          <div style={{ width: '100%', marginTop: '15px', padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>
                Selected Cell: [Row {selectedCell.r + 1}, Col {selectedCell.c + 1}]
              </strong>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: getCellColor(currentCell), color: '#000', fontWeight: 'bold' }}>
                {currentCell.type}
              </span>
            </div>

            {/* Cell Material Selector */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Cell Material Type</label>
              <select
                className="form-control"
                value={currentCell.type}
                style={{ fontSize: '0.8rem', padding: '5px' }}
                onChange={(e) => handleUpdateSelectedCell('type', e.target.value as CellType)}
              >
                <option value="FUEL">Fuel (UO₂ Enriched)</option>
                <option value="POISON">Burnable Poison (Gd₂O₃)</option>
                <option value="VOID">Steam / Void Channel</option>
                <option value="CONTROL">Control Rod (B₄C Absorber)</option>
                <option value="MODERATOR">Moderator / Coolant Channel</option>
                <option value="REFLECTOR">Radial Reflector</option>
                <option value="INSTRUMENT">In-Core Detector Thimble</option>
              </select>
            </div>

            {/* Context-Specific Sliders */}
            {currentCell.type === 'FUEL' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Local Enrichment: {(currentCell.localEnrichmentPct ?? enrichmentPct).toFixed(1)}%</label>
                  <input
                    type="range"
                    min="0.71"
                    max="20.0"
                    step="0.1"
                    value={currentCell.localEnrichmentPct ?? enrichmentPct}
                    className="form-control"
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    onChange={(e) => handleUpdateSelectedCell('localEnrichmentPct', Number(e.target.value))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Local Void: {currentCell.voidFractionPct ?? 0}%</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={currentCell.voidFractionPct ?? 0}
                    className="form-control"
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    onChange={(e) => handleUpdateSelectedCell('voidFractionPct', Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {currentCell.type === 'POISON' && (
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Gadolinia Concentration: {(currentCell.poisonWtPct ?? 5.0).toFixed(1)} wt% Gd₂O₃
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={currentCell.poisonWtPct ?? 5.0}
                  className="form-control"
                  style={{ width: '100%', accentColor: '#D946EF' }}
                  onChange={(e) => handleUpdateSelectedCell('poisonWtPct', Number(e.target.value))}
                />
              </div>
            )}

            {currentCell.type === 'CONTROL' && (
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Local Rod Insertion: {currentCell.controlInsertionPct ?? controlInsertionPct}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentCell.controlInsertionPct ?? controlInsertionPct}
                  className="form-control"
                  style={{ width: '100%', accentColor: '#EF4444' }}
                  onChange={(e) => handleUpdateSelectedCell('controlInsertionPct', Number(e.target.value))}
                />
              </div>
            )}

            {/* Local physics parameter feedback */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px', fontSize: '0.72rem', background: '#030712', padding: '8px', borderRadius: '4px' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Local k_∞:</span>
                <strong style={{ display: 'block', color: '#00e5ff' }}>
                  {math.localKInfMatrix[selectedCell.r]?.[selectedCell.c] ?? 0}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Local Σ_a:</span>
                <strong style={{ display: 'block', color: '#fff' }}>
                  {math.sigmaAMatrix[selectedCell.r]?.[selectedCell.c] ?? 0} cm⁻¹
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Power P/P_avg:</span>
                <strong style={{ display: 'block', color: '#2ecc71' }}>
                  {math.normalizedPower[selectedCell.r]?.[selectedCell.c] ?? 0}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2D Multi-Mode Spatial Heatmap */}
        <div className="panel" style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>Core Spatial Distribution Map</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-primary"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  background: mapMode === 'FLUX' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                  color: mapMode === 'FLUX' ? '#000' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)'
                }}
                onClick={() => setMapMode('FLUX')}
              >
                ⚡ Thermal Flux (φ)
              </button>
              <button
                className="btn btn-primary"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  background: mapMode === 'K_INF' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                  color: mapMode === 'K_INF' ? '#000' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)'
                }}
                onClick={() => setMapMode('K_INF')}
              >
                ⚛️ Lattice k_∞ Map
              </button>
              <button
                className="btn btn-primary"
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  background: mapMode === 'POWER' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                  color: mapMode === 'POWER' ? '#000' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)'
                }}
                onClick={() => setMapMode('POWER')}
              >
                🔥 Power Density (F_xy)
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            {mapMode === 'FLUX' && '2D Jacobi Finite-Difference thermal neutron flux solution (% of peak flux).'}
            {mapMode === 'K_INF' && 'Local cell infinite multiplication factor k_∞ showing pin-by-pin fissile economy.'}
            {mapMode === 'POWER' && `Relative pin fission power density (P / P_avg). Maximum assembly peaking F_xy = ${math.peakingFactorFxy}.`}
          </p>

          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  z: mapMode === 'FLUX' ? math.normalizedFlux : mapMode === 'K_INF' ? math.localKInfMatrix : math.normalizedPower,
                  x: [1, 2, 3, 4, 5, 6, 7],
                  y: [1, 2, 3, 4, 5, 6, 7],
                  type: 'heatmap',
                  colorscale: mapMode === 'FLUX' ? 'Jet' : mapMode === 'K_INF' ? 'Viridis' : 'Hot',
                  colorbar: {
                    title: {
                      text: mapMode === 'FLUX' ? 'Flux (%)' : mapMode === 'K_INF' ? 'k_∞' : 'P / P_avg'
                    },
                    tickfont: { color: '#F8FAFC' }
                  }
                }
              ] as any}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 40, r: 20, t: 20, b: 40 },
                xaxis: { title: { text: 'Core X (Lattice Column)' }, tickmode: 'linear', dtick: 1 },
                yaxis: { title: { text: 'Core Y (Lattice Row)' }, tickmode: 'linear', dtick: 1, autorange: 'reverse' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '360px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      </div>

      {/* Plotly Relative Power Dynamics Chart */}
      <div className="panel">
        <h3>Neutron Population Kinetics & Power Ascension</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px' }}>
          Relative reactor power level P(t) / P₀ over time based on computed period T.
        </p>
        <div style={{ width: '100%' }}>
          <Plot
            data={[
              {
                x: populationChartData.times,
                y: populationChartData.powerLevels,
                type: 'scatter',
                mode: 'lines',
                name: 'Relative Power Level',
                line: { color: math.stateColor, width: 3 }
              }
            ] as any}
            layout={{
              autosize: true,
              xaxis: { title: { text: 'Time (seconds)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
              yaxis: { 
                title: { text: 'Relative Power Level (P / P₀)' }, 
                type: 'log', 
                color: '#94A3B8',
                gridcolor: 'rgba(255,255,255,0.05)'
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#F8FAFC' },
              margin: { l: 60, r: 20, t: 20, b: 60 }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '320px' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPGRADE 1: KEEPIN (1965) 6-GROUP DELAYED NEUTRON INHOUR EQUATION SOLVER    */}
      {/* ========================================================================= */}
      <div className="panel" style={{ marginTop: '20px', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#10b981' }}>
              ⏱️ Keepin (1965) 6-Group Delayed Neutron Inhour Equation &amp; Point Reactor Kinetics
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Exact 6-precursor-group Inhour relationship solving asymptotic reactor period T, doubling time T₂, and prompt jump ratio n₁/n₀ = β_eff / (β_eff − ρ) across U-235, Pu-239, and U-233 cores.
            </p>
          </div>
          <VerificationBadge testId="VTEST-50" standard="Keepin (1965) 6-Group Inhour" />
        </div>

        {/* Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Fissile Fuel Isotope (Delayed Fraction β_eff)</label>
            <select
              className="form-control"
              value={fissileIsotope}
              onChange={(e) => setFissileIsotope(e.target.value as FissileIsotopeKey)}
              style={{ fontSize: '0.82rem' }}
            >
              <option value="U-235">U-235 Thermal (β_eff = 650 pcm / 0.00650)</option>
              <option value="Pu-239">Pu-239 Fast/MOX (β_eff = 210 pcm / 0.00210)</option>
              <option value="U-233">U-233 Thorium (β_eff = 264 pcm / 0.00264)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', margin: 0 }}>
                Step Reactivity Insertion (ρ in $):
              </label>
              <strong style={{ fontSize: '0.82rem', color: inhourKinetics.rhoDollars >= 1.0 ? '#ef4444' : inhourKinetics.rhoDollars >= 0 ? '#10b981' : '#38bdf8' }}>
                {inhourKinetics.rhoDollars >= 0 ? `+$${inhourKinetics.rhoDollars.toFixed(2)}` : `-$${Math.abs(inhourKinetics.rhoDollars).toFixed(2)}`} ({inhourKinetics.rhoPcm.toFixed(0)} pcm)
              </strong>
            </div>
            <input
              type="range"
              min="-1.50"
              max="1.15"
              step="0.05"
              disabled={useLiveCoreReactivity}
              value={inhourStepDollars}
              onChange={(e) => setInhourStepDollars(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#64748b' }}>
              <span>-$1.50 (SCRAM)</span>
              <span>$0.00 (Critical)</span>
              <span>+$1.00 (Prompt Crit)</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', cursor: 'pointer', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={useLiveCoreReactivity}
                onChange={(e) => setUseLiveCoreReactivity(e.target.checked)}
              />
              Couple to 7×7 Lattice Core Reactivity ({math.rhoPcm.toFixed(0)} pcm)
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '-$0.50', val: -0.50 },
                { label: '+$0.10', val: 0.10 },
                { label: '+$0.25', val: 0.25 },
                { label: '+$0.50', val: 0.50 },
                { label: '+$1.05', val: 1.05 }
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => { setUseLiveCoreReactivity(false); setInhourStepDollars(b.val); }}
                  style={{
                    fontSize: '0.70rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: !useLiveCoreReactivity && Math.abs(inhourStepDollars - b.val) < 0.001 ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                    background: !useLiveCoreReactivity && Math.abs(inhourStepDollars - b.val) < 0.001 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Kinetics Readout Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>ASYMPTOTIC PERIOD (T = 1/ω₀)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {!Number.isFinite(inhourKinetics.asymptoticPeriodS)
                ? '∞ s (Steady)'
                : Math.abs(inhourKinetics.asymptoticPeriodS) < 0.1
                ? `${(inhourKinetics.asymptoticPeriodS * 1000).toFixed(2)} ms`
                : `${inhourKinetics.asymptoticPeriodS.toFixed(2)} s`}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              ω₀ = {inhourKinetics.omega0.toExponential(3)} s⁻¹
            </div>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>POWER DOUBLING / HALVING TIME</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {!Number.isFinite(inhourKinetics.doublingTimeS)
                ? '∞ s'
                : `${Math.abs(inhourKinetics.doublingTimeS).toFixed(2)} s`}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              T₂ = T · ln(2) ({inhourKinetics.rhoDollars >= 0 ? 'Doubling' : 'Halving'})
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>PROMPT JUMP RATIO (n₁ / n₀)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: inhourKinetics.rhoDollars >= 1.0 ? '#ef4444' : '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {!Number.isFinite(inhourKinetics.promptJumpRatio)
                ? 'PROMPT CRIT (≥$1)'
                : `${inhourKinetics.promptJumpRatio.toFixed(3)}×`}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              1 / (1 − ρ_$) Instantaneous Step
            </div>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>MEAN DELAYED LIFETIME (τ̄_d)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {inhourKinetics.meanDelayedLifetimeS.toFixed(2)} s
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Min Subcritical Period: {(-1.0 / inhourKinetics.spec.groups[0].lambdaSInv).toFixed(1)} s
            </div>
          </div>
        </div>

        {/* 6-Group Table + Inhour Plot */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
              Keepin 6-Group Delayed Precursor Yields &amp; Partial Inhour Contributions
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Grp</th>
                  <th style={{ padding: '6px 8px' }}>Dominant Precursors</th>
                  <th style={{ padding: '6px 8px' }}>T₁/₂ (s)</th>
                  <th style={{ padding: '6px 8px' }}>λ_i (s⁻¹)</th>
                  <th style={{ padding: '6px 8px' }}>a_i</th>
                  <th style={{ padding: '6px 8px' }}>β_i (pcm)</th>
                  <th style={{ padding: '6px 8px' }}>ρ_i ($)</th>
                </tr>
              </thead>
              <tbody>
                {inhourKinetics.groupRows.map((g) => (
                  <tr key={g.group} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#10b981' }}>G{g.group}</td>
                    <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{g.precursors}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{g.halfLifeS.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{g.lambdaSInv.toFixed(4)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{g.relYieldAi.toFixed(3)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#38bdf8' }}>{g.betaI_pcm.toFixed(1)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#f59e0b' }}>
                      {g.partialDollars >= 0 ? `+${g.partialDollars.toFixed(3)}` : g.partialDollars.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
              6-Group Inhour Characteristic Curve: Reactivity ρ ($) vs. Reactor Period T (s)
            </div>
            <Plot
              data={[
                {
                  x: inhourKinetics.superPeriods,
                  y: inhourKinetics.superDollars,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Supercritical Branch (+T)',
                  line: { color: '#10b981', width: 2.5 }
                },
                {
                  x: inhourKinetics.subPeriods,
                  y: inhourKinetics.subDollars,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Subcritical Branch (−T)',
                  line: { color: '#38bdf8', width: 2.5, dash: 'dash' }
                },
                ...(Number.isFinite(inhourKinetics.asymptoticPeriodS) && Math.abs(inhourKinetics.asymptoticPeriodS) <= 200
                  ? [
                      {
                        x: [inhourKinetics.asymptoticPeriodS],
                        y: [inhourKinetics.rhoDollars],
                        type: 'scatter',
                        mode: 'markers',
                        name: 'Active Operating Point',
                        marker: { color: '#f59e0b', size: 11, line: { color: '#fff', width: 2 } }
                      }
                    ]
                  : [])
              ] as any}
              layout={{
                autosize: true,
                height: 255,
                margin: { l: 50, r: 20, t: 10, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#cbd5e1', size: 11 },
                xaxis: { title: { text: 'Asymptotic Reactor Period T (seconds)' }, range: [-90, 150], gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: { text: 'Reactivity ρ ($)' }, range: [-1.6, 1.3], gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: 1.14, font: { size: 10 } }
              }}
              useResizeHandler={true}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPGRADE 2: FISSION-PRODUCT POISON TRANSIENTS (XE-135 PIT & SM-149)        */}
      {/* ========================================================================= */}
      <div className="panel" style={{ marginTop: '20px', border: '1px solid rgba(217, 70, 239, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#e879f9' }}>
              🧪 Fission-Product Poison Transients: Post-SCRAM ¹³⁵I → ¹³⁵Xe Pit &amp; ¹⁴⁹Sm Buildup
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Analytical solution of coupled Iodine-135 (T₁/₂ = 6.57 h) and Xenon-135 (T₁/₂ = 9.14 h, σ_a = 2.65×10⁶ b) differential equations predicting post-shutdown Xenon peak time t_max, negative reactivity worth, and reactor restart dead-time window.
            </p>
          </div>
          <VerificationBadge testId="VTEST-51" standard="Lamarsh Ch. 7 Xenon Kinetics" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', margin: 0 }}>Pre-SCRAM Thermal Flux φ₀:</label>
              <strong style={{ fontSize: '0.82rem', color: '#e879f9', fontFamily: 'monospace' }}>
                {poisonTransients.phi0.toExponential(2)} n/(cm²·s)
              </strong>
            </div>
            <input
              type="range"
              min="12.5"
              max="14.7"
              step="0.05"
              value={preScramFluxLog10}
              onChange={(e) => setPreScramFluxLog10(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#d946ef' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#64748b' }}>
              <span>3×10¹² (Low Power)</span>
              <span>5×10¹³ (Nominal PWR)</span>
              <span>5×10¹⁴ (High Flux HFIR)</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', margin: 0 }}>Available Restart Excess Reactivity:</label>
              <strong style={{ fontSize: '0.82rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                {excessReactivityMarginPcm} pcm (${(excessReactivityMarginPcm / 650).toFixed(2)})
              </strong>
            </div>
            <input
              type="range"
              min="1500"
              max="8000"
              step="100"
              value={excessReactivityMarginPcm}
              onChange={(e) => setExcessReactivityMarginPcm(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#64748b' }}>
              <span>1,500 pcm (End of Cycle)</span>
              <span>3,500 pcm (Mid-Cycle)</span>
              <span>8,000 pcm (BOL)</span>
            </div>
          </div>
        </div>

        {/* 4 Poison Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(217, 70, 239, 0.08)', border: '1px solid rgba(217, 70, 239, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>EQUILIBRIUM FULL-POWER ¹³⁵Xe WORTH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e879f9', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              −{poisonTransients.eqXeWorthPcm.toFixed(0)} pcm
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              −${(poisonTransients.eqXeWorthPcm / 650).toFixed(2)} Steady-State Poison
            </div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>POST-SCRAM PEAK ¹³⁵Xe WORTH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              −{poisonTransients.peakXeWorthPcm.toFixed(0)} pcm
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {(poisonTransients.peakXeWorthPcm / Math.max(1, poisonTransients.eqXeWorthPcm)).toFixed(2)}× Pre-SCRAM Equilibrium
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>XENON PEAK TIME (t_max)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {poisonTransients.tMaxHours.toFixed(2)} hrs
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Post-Shutdown Maximum Iodine Pit
            </div>
          </div>

          <div style={{ background: poisonTransients.deadDurationHr > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${poisonTransients.deadDurationHr > 0 ? '#ef4444' : '#10b981'}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>REACTOR XENON DEAD-TIME WINDOW</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: poisonTransients.deadDurationHr > 0 ? '#ef4444' : '#10b981', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {poisonTransients.deadDurationHr > 0
                ? `${poisonTransients.deadDurationHr.toFixed(1)} hrs (${poisonTransients.deadStartHr}h–${poisonTransients.deadEndHr}h)`
                : '0 hrs (Override Capable)'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Equilibrium ¹⁴⁹Sm Worth: −{poisonTransients.eqSmWorthPcm.toFixed(0)} pcm
            </div>
          </div>
        </div>

        <Plot
          data={[
            {
              x: poisonTransients.hours,
              y: poisonTransients.xeWorthCurvePcm,
              type: 'scatter',
              mode: 'lines',
              name: '¹³⁵Xe Negative Reactivity Worth (pcm)',
              line: { color: '#e879f9', width: 3 },
              fill: 'tozeroy',
              fillcolor: 'rgba(217, 70, 239, 0.10)'
            },
            {
              x: poisonTransients.hours,
              y: poisonTransients.smWorthCurvePcm,
              type: 'scatter',
              mode: 'lines',
              name: '¹⁴⁹Sm Permanent Poison Worth (pcm)',
              line: { color: '#f59e0b', width: 2, dash: 'dot' }
            },
            {
              x: poisonTransients.hours,
              y: poisonTransients.marginLinePcm,
              type: 'scatter',
              mode: 'lines',
              name: `Available Restart Margin (${excessReactivityMarginPcm} pcm)`,
              line: { color: '#38bdf8', width: 2, dash: 'dash' }
            }
          ] as any}
          layout={{
            autosize: true,
            height: 290,
            margin: { l: 60, r: 20, t: 15, b: 45 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#cbd5e1', size: 11 },
            xaxis: { title: { text: 'Time Elapsed After Full-Power SCRAM (Hours)' }, gridcolor: 'rgba(255,255,255,0.06)' },
            yaxis: { title: { text: 'Negative Poison Reactivity Worth (−Δρ in pcm)' }, gridcolor: 'rgba(255,255,255,0.06)' },
            legend: { orientation: 'h', y: 1.14 }
          }}
          useResizeHandler={true}
          style={{ width: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>

      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default CriticalityModule;
