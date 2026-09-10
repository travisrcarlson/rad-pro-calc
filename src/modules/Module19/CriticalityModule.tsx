import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

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

  return (
    <div className="criticality-module">
      <div className="panel-header">
        <h2>⚛️ Criticality Safety & Reactor Core Simulator (Multi-Variable Engine)</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Model nuclear criticality, four-factor neutron economy, heterogeneous pin-by-pin variables (burnable poisons, steam voids, enrichment grading), and 2D finite-difference spatial diffusion.
        </p>
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

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Core Controls */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Core-Wide Controls & Coolant Chemistry</h3>

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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Global Control Bank Insertion (B₄C)</label>
              <span style={{ fontWeight: 'bold', color: controlInsertionPct > 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {controlInsertionPct} %
              </span>
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
          Relative reactor power level $P(t) / P_0$ over time based on computed period $T$.
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
    </div>
  );
};

export default CriticalityModule;
