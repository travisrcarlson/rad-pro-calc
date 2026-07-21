import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

export type CellType = 'FUEL' | 'CONTROL' | 'MODERATOR' | 'REFLECTOR';

export type ReactorCategory = 
  | 'Commercial Power'
  | 'Gen IV & Advanced'
  | 'Naval & Space'
  | 'Research & Criticality';

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
  grid: CellType[][];
}

// Helper to construct a standard 7x7 lattice grid
const create7x7Grid = (defaultType: CellType = 'FUEL', controlPositions: [number, number][] = []): CellType[][] => {
  const grid: CellType[][] = [];
  for (let r = 0; r < 7; r++) {
    const row: CellType[] = [];
    for (let c = 0; c < 7; c++) {
      if (r === 0 || r === 6 || c === 0 || c === 6) {
        row.push('REFLECTOR');
      } else {
        row.push(defaultType);
      }
    }
    grid.push(row);
  }
  
  // Set specific control rod channels
  controlPositions.forEach(([r, c]) => {
    if (grid[r] && grid[r][c]) {
      grid[r][c] = 'CONTROL';
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
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 3], [3, 5], [5, 3]])
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
    description: 'Boiling Water Reactor assembly with cruciform control blades inserted from the bottom.',
    physicsNote: 'Thermal spectrum. Boiling causes steam voids which reduce moderation, providing a strong negative void coefficient of reactivity.',
    grid: create7x7Grid('FUEL', [[1, 1], [1, 5], [5, 1], [5, 5]])
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
    grid: create7x7Grid('FUEL', [[2, 2], [2, 4], [4, 2], [4, 4]])
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
    description: 'Canadian Deuterium Uranium reactor using natural unenriched uranium fuel fuel elements.',
    physicsNote: 'Uses heavy water (D₂O) which has a thermal absorption cross section 1000x lower than H₂O, enabling criticality using natural uranium.',
    grid: create7x7Grid('FUEL', [[2, 3], [3, 2], [3, 4], [4, 3]])
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
    grid: create7x7Grid('FUEL', [[1, 3], [3, 1], [3, 3], [3, 5], [5, 3]])
  },
  {
    name: 'HTGR Pebble Bed (Graphite)',
    category: 'Gen IV & Advanced',
    enrichmentPct: 8.5,
    moderatorType: 'Graphite',
    controlInsertionPct: 45,
    boronPpm: 0,
    coreHeightM: 6.0,
    pitchM: 0.35,
    description: 'High-Temperature Gas-Cooled Reactor using TRISO pebble fuel elements and helium coolant.',
    physicsNote: 'Solid graphite moderator blocks surround and contain spherical TRISO fuel elements. Passive containment allows decay heat rejection without active cooling.',
    grid: create7x7Grid('FUEL', [[2, 2], [2, 4], [4, 2], [4, 4]])
  },
  {
    name: 'Molten Salt Reactor (MSR)',
    category: 'Gen IV & Advanced',
    enrichmentPct: 15.0,
    moderatorType: 'Graphite',
    controlInsertionPct: 10,
    boronPpm: 0,
    coreHeightM: 3.0,
    pitchM: 0.22,
    description: 'Molten Fluoride Salt Reactor with circulating liquid fuel dissolved in fluoride carrier salt.',
    physicsNote: 'Graphite channels in the core provide moderation for the circulating salt. Soluble poison addition or freeze-plug dump valves provide emergency shutdown.',
    grid: create7x7Grid('FUEL', [[3, 3]])
  },

  // 3. Naval & Space
  {
    name: 'Naval Submarine Core (S9G HEU)',
    category: 'Naval & Space',
    enrichmentPct: 93.0, // Weapons-grade HEU
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 60,
    boronPpm: 0,
    coreHeightM: 1.2,
    pitchM: 0.14,
    description: 'US Navy S9G submarine propulsion reactor utilizing highly enriched uranium.',
    physicsNote: '93% HEU fuel core designed to operate for up to 33 years without refueling. Extreme enrichment requires high control rod reactivity worth.',
    grid: create7x7Grid('FUEL', [[1, 3], [2, 2], [2, 4], [3, 1], [3, 5], [4, 2], [4, 4], [5, 3]])
  },
  {
    name: 'NERVA Nuclear Rocket (HEU)',
    category: 'Naval & Space',
    enrichmentPct: 93.0,
    moderatorType: 'Graphite',
    controlInsertionPct: 15,
    boronPpm: 0,
    coreHeightM: 1.3,
    pitchM: 0.10,
    description: 'Nuclear Thermal Rocket prototype (NERVA) designed for deep space spacecraft propulsion.',
    physicsNote: 'Compact graphite-moderated core designed to heat liquid hydrogen coolant to over 2200°C to generate thrust. High leakage is offset by 93% HEU fuel.',
    grid: create7x7Grid('FUEL', [[3, 3]])
  },

  // 4. Research & Criticality
  {
    name: 'TRIGA Mark II (U-ZrH Pool)',
    category: 'Research & Criticality',
    enrichmentPct: 19.75, // HALEU
    moderatorType: 'Light Water (H2O)',
    controlInsertionPct: 20,
    boronPpm: 0,
    coreHeightM: 0.76,
    pitchM: 0.11,
    description: 'TRIGA research reactor with Uranium-Zirconium Hydride (U-ZrH) solid fuel-moderator elements.',
    physicsNote: 'The ZrH moderator material is bound directly into the fuel alloy. Heating the fuel shifts the thermal spectrum out of the fuel capture region, providing absolute protection against excursions.',
    grid: create7x7Grid('FUEL', [[3, 3]])
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
    grid: create7x7Grid('MODERATOR', [[1, 1], [1, 5], [3, 3], [5, 1], [5, 5]])
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
    grid: create7x7Grid('FUEL', [])
  }
];

const CATEGORIES: (ReactorCategory | 'All')[] = [
  'All',
  'Commercial Power',
  'Gen IV & Advanced',
  'Naval & Space',
  'Research & Criticality'
];

const CriticalityModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReactorCategory | 'All'>('All');
  const [activePreset, setActivePreset] = useState<CorePreset>(PRESETS[0]);

  // Physics Controls
  const [enrichmentPct, setEnrichPct] = useState<number>(3.5);
  const [moderatorType, setModeratorType] = useState<'Light Water (H2O)' | 'Heavy Water (D2O)' | 'Graphite' | 'Sodium/None'>('Light Water (H2O)');
  const [controlInsertionPct, setControlInsertionPct] = useState<number>(30);
  const [boronPpm, setBoronPpm] = useState<number>(600);
  const [coreHeightM, setCoreHeightM] = useState<number>(3.66);
  const [pitchM, setPitchM] = useState<number>(0.21);

  // 7x7 Grid Matrix
  const [grid, setGrid] = useState<CellType[][]>(PRESETS[0].grid);

  // Selected cell inspector
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>({ r: 3, c: 3 });

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
    setGrid(preset.grid.map(row => [...row]));
  };

  // Toggle cell type on click
  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c });
    const current = grid[r][c];
    const order: CellType[] = ['FUEL', 'CONTROL', 'MODERATOR', 'REFLECTOR'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = order[nextIndex];
    setGrid(newGrid);
  };

  // Physics Calculations Engine
  const math = useMemo(() => {
    // Count cell types in 7x7 grid
    let nFuel = 0;
    let nControl = 0;
    let nModerator = 0;
    let nReflector = 0;

    grid.forEach(row => {
      row.forEach(cell => {
        if (cell === 'FUEL') nFuel++;
        if (cell === 'CONTROL') nControl++;
        if (cell === 'MODERATOR') nModerator++;
        if (cell === 'REFLECTOR') nReflector++;
      });
    });

    const totalCells = 49;
    const effectiveFuelFraction = nFuel / totalCells;

    // 1. Thermal Reproduction Factor (eta)
    const eFrac = Math.max(0.0071, enrichmentPct / 100);
    const eta = 2.08 * (eFrac / (eFrac + 0.045));

    // 2. Thermal Utilization Factor (f)
    let modAbsorptionCoeff = 0.022; // H2O
    if (moderatorType === 'Heavy Water (D2O)') modAbsorptionCoeff = 0.0005;
    if (moderatorType === 'Graphite') modAbsorptionCoeff = 0.003;
    if (moderatorType === 'Sodium/None') modAbsorptionCoeff = 0.0001; // sodium absorption is very low

    const boronAbsorption = (boronPpm / 1000) * 0.05;
    const controlAbsorption = (nControl / totalCells) * (controlInsertionPct / 100) * 0.85;

    const sigmaFuel = effectiveFuelFraction * (0.15 + eFrac * 1.2);
    const sigmaMod = (nModerator / totalCells) * modAbsorptionCoeff;

    const sigmaTotalAbs = sigmaFuel + sigmaMod + boronAbsorption + controlAbsorption + 1e-6;
    const f = Math.min(0.99, sigmaFuel / sigmaTotalAbs);

    // 3. Resonance Escape Probability (p)
    const modToFuelRatio = (nModerator + nReflector) / Math.max(1, nFuel);
    let baseP = 0.85;
    if (moderatorType === 'Heavy Water (D2O)') baseP = 0.95;
    if (moderatorType === 'Graphite') baseP = 0.89;
    if (moderatorType === 'Sodium/None') baseP = 0.99; // fast core has almost no resonance capture in moderator

    const p = Math.min(0.99, baseP * (1 - Math.exp(-0.8 * modToFuelRatio)));

    // 4. Fast Fission Factor (epsilon)
    let epsilon = 1.03 + 0.02 * (nFuel / totalCells);
    if (moderatorType === 'Sodium/None') {
      epsilon = 1.15; // fast reactors have significant fast fission in U-238
    }

    // Infinite Multiplication Factor (k_infinity)
    const kInf = eta * f * p * epsilon;

    // 5. Geometric Buckling and Non-Leakage Probabilities
    const coreWidthM = 7 * pitchM;
    const radiusM = coreWidthM / 2;
    const B2 = Math.pow(Math.PI / (radiusM + 0.1), 2) + Math.pow(Math.PI / (coreHeightM + 0.1), 2); // m^-2

    // Migration area M^2
    let migrationAreaM2 = 0.006; // H2O
    if (moderatorType === 'Heavy Water (D2O)') migrationAreaM2 = 0.035;
    if (moderatorType === 'Graphite') migrationAreaM2 = 0.030;
    if (moderatorType === 'Sodium/None') migrationAreaM2 = 0.045; // fast neutrons travel further before thermalizing/capturing

    const reflectorSavings = (nReflector / 24) * 0.35;
    const leakagePenalty = Math.max(0.01, (B2 * migrationAreaM2) * (1 - reflectorSavings));

    // Effective Multiplication Factor (k_eff)
    const kEff = kInf / (1 + leakagePenalty);

    // Reactivity rho
    const rhoPcm = ((kEff - 1) / Math.max(0.001, kEff)) * 1e5;

    // Delayed neutron fraction (beta)
    const beta = 0.0065;
    const promptLifetime = moderatorType === 'Sodium/None' ? 1e-7 : 2e-5; // fast reactor prompt lifetime is ~100ns
    const precursorLambda = 0.08;

    // Reactor Period T (seconds)
    let reactorPeriodS = 0;
    const rhoFrac = (kEff - 1) / Math.max(0.001, kEff);

    if (rhoFrac >= beta) {
      reactorPeriodS = promptLifetime / Math.max(1e-9, rhoFrac - beta);
    } else if (rhoFrac > 0) {
      reactorPeriodS = (beta - rhoFrac) / Math.max(1e-6, precursorLambda * rhoFrac);
    } else if (rhoFrac < 0) {
      reactorPeriodS = (beta - rhoFrac) / Math.min(-1e-6, precursorLambda * rhoFrac);
    }

    // Criticality Classification State
    let state: 'Subcritical' | 'Critical' | 'Supercritical' | 'Prompt Critical' = 'Subcritical';
    let stateColor = '#10B981';

    if (kEff >= 1.0 + beta) {
      state = 'Prompt Critical';
      stateColor = '#EF4444';
    } else if (kEff > 1.0005) {
      state = 'Supercritical';
      stateColor = '#F59E0B';
    } else if (kEff >= 0.9995 && kEff <= 1.0005) {
      state = 'Critical';
      stateColor = '#00E5FF';
    } else {
      state = 'Subcritical';
      stateColor = '#10B981';
    }

    // 6. Finite-Difference 2D Spatial Neutron Flux Solver (7x7 Jacobi Iteration)
    const fluxMatrix: number[][] = Array(7).fill(0).map(() => Array(7).fill(0.1));

    // Iterate 40 steps
    for (let iter = 0; iter < 40; iter++) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const type = grid[r][c];

          let source = 0;
          if (type === 'FUEL') source = kEff * 1.5;
          if (type === 'CONTROL') source = -0.8 * (controlInsertionPct / 100);
          if (type === 'REFLECTOR') source = 0.2;

          let neighborSum = 0;
          let count = 0;
          if (r > 0) { neighborSum += fluxMatrix[r - 1][c]; count++; }
          if (r < 6) { neighborSum += fluxMatrix[r + 1][c]; count++; }
          if (c > 0) { neighborSum += fluxMatrix[r][c - 1]; count++; }
          if (c < 6) { neighborSum += fluxMatrix[r][c + 1]; count++; }

          const avgNeighbor = neighborSum / Math.max(1, count);
          fluxMatrix[r][c] = Math.max(0.01, 0.4 * fluxMatrix[r][c] + 0.6 * (avgNeighbor + 0.2 * source));
        }
      }
    }

    // Normalize Flux Matrix
    let maxFlux = 0.001;
    fluxMatrix.forEach(row => row.forEach(val => { if (val > maxFlux) maxFlux = val; }));
    const normalizedFlux = fluxMatrix.map(row => row.map(val => (val / maxFlux) * 100));

    return {
      nFuel,
      nControl,
      nModerator,
      nReflector,
      eta,
      f,
      p,
      epsilon,
      kInf,
      B2,
      leakagePenalty,
      kEff,
      rhoPcm,
      reactorPeriodS,
      state,
      stateColor,
      normalizedFlux
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
      times.push(t);

      let P = 1.0;
      if (math.state === 'Prompt Critical') {
        P = Math.min(1000, Math.exp(t / Math.max(0.1, math.reactorPeriodS)));
      } else if (math.state === 'Supercritical') {
        P = Math.min(500, Math.exp(t / Math.max(1.0, math.reactorPeriodS)));
      } else if (math.state === 'Subcritical') {
        P = Math.max(0.01, Math.exp(t / Math.min(-1.0, math.reactorPeriodS)));
      } else {
        P = 1.0;
      }
      powerLevels.push(P);
    }

    return { times, powerLevels };
  }, [math]);

  return (
    <div className="criticality-module">
      <div className="panel-header">
        <h2>☢️ Criticality Safety & Reactor Core Simulator</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Model neutron multiplication (k_eff), Four-Factor Formula parameters (η · f · p · ε), spatial neutron flux heatmaps, control rod reactivity insertions, and prompt criticality limits.
        </p>
      </div>

      {/* Categorized Reactor Presets */}
      <div className="panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            Nuclear Reactor Core Library
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredPresets.length} reactor designs
          </span>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className="btn btn-primary"
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: selectedCategory === cat ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
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
          <h3>Physics & Lattice Configuration</h3>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">U-235 Enrichment</label>
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
              <label className="form-label">Control Rod Insertion (B₄C Absorber)</label>
              <span style={{ fontWeight: 'bold', color: controlInsertionPct > 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {controlInsertionPct} % Inserted
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
              <label className="form-label">Soluble Boron</label>
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

          {/* Grid Legend & Interactive Instructions */}
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              Interactive 7x7 Lattice Map
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
              Click any cell in the 7x7 grid below to cycle material: <strong>Fuel Rod</strong> → <strong>Control Absorber</strong> → <strong>Moderator</strong> → <strong>Reflector</strong>.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#00E5FF', borderRadius: '2px' }}></span> UO₂ Fuel
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#EF4444', borderRadius: '2px' }}></span> Control Rod (B₄C)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#3B82F6', borderRadius: '2px' }}></span> Moderator
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '2px' }}></span> Reflector
              </span>
            </div>
          </div>
        </div>

        {/* Four-Factor & Criticality Output Summary */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Neutron Multiplication & Reactivity</h3>
            
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Reproduction Factor (η):</span>
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
              <span style={{ color: 'var(--color-text-muted)' }}>Infinite Multiplication (k_∞):</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{math.kInf.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Leakage Fraction:</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{(math.leakagePenalty * 100).toFixed(2)} %</span>
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

      {/* 2D Heatmap & Interactive Grid Section */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Interactive 7x7 Grid Matrix Canvas */}
        <div className="panel" style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>7x7 Lattice Material Map</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Click cells to edit core lattice configuration.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 44px)', gap: '6px', background: '#030712', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            {grid.map((row, r) =>
              row.map((cell, c) => {
                let bg = '#00E5FF';
                if (cell === 'CONTROL') bg = '#EF4444';
                if (cell === 'MODERATOR') bg = '#3B82F6';
                if (cell === 'REFLECTOR') bg = '#10B981';

                const isSelected = selectedCell?.r === r && selectedCell?.c === c;

                return (
                  <button
                    key={`${r}-${c}`}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '4px',
                      background: bg,
                      border: isSelected ? '2px solid #FFF' : '1px solid rgba(0,0,0,0.5)',
                      boxShadow: isSelected ? '0 0 10px #FFF' : 'none',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleCellClick(r, c)}
                    title={`Row ${r+1}, Col ${c+1}: ${cell}`}
                  >
                    {cell === 'FUEL' ? 'U' : cell === 'CONTROL' ? 'B4C' : cell === 'MODERATOR' ? 'MOD' : 'REF'}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Plotly 2D Spatial Neutron Flux Heatmap */}
        <div className="panel" style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Spatial Thermal Neutron Flux Heatmap</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            2D Finite-Difference diffusion equilibrium solution (% max flux).
          </p>
          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  z: math.normalizedFlux,
                  x: [1, 2, 3, 4, 5, 6, 7],
                  y: [1, 2, 3, 4, 5, 6, 7],
                  type: 'heatmap',
                  colorscale: 'Jet',
                  colorbar: { title: 'Flux (%)', titleside: 'right', tickfont: { color: '#F8FAFC' } }
                }
              ] as any}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 40, r: 20, t: 20, b: 40 },
                xaxis: { title: 'Core X (Lattice Index)', tickmode: 'linear', dtick: 1 },
                yaxis: { title: 'Core Y (Lattice Index)', tickmode: 'linear', dtick: 1, autorange: 'reverse' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '320px' }}
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
            style={{ width: '100%', height: '340px' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default CriticalityModule;
