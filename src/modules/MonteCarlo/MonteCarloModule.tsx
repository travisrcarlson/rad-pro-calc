import React, { useState, useEffect, useRef } from 'react';
import { runMonteCarloSimulation, type MonteCarloConfig, type MonteCarloResult } from '../../workers/monteCarloWorker';

interface PresetSource {
  name: string;
  energy_MeV: number;
  nuclide: string;
}

const PRESET_SOURCES: PresetSource[] = [
  { name: 'Cs-137 Gamma', energy_MeV: 0.6617, nuclide: 'Cs-137' },
  { name: 'Co-60 Gamma (Mean)', energy_MeV: 1.250, nuclide: 'Co-60' },
  { name: 'Ir-192 Radiography', energy_MeV: 0.380, nuclide: 'Ir-192' },
  { name: 'Tc-99m Medical', energy_MeV: 0.1405, nuclide: 'Tc-99m' },
  { name: 'F-18 Annihilation', energy_MeV: 0.511, nuclide: 'F-18' },
  { name: 'Am-241 Low Energy', energy_MeV: 0.0595, nuclide: 'Am-241' }
];

export const MonteCarloModule: React.FC = () => {
  const [materialId, setMaterialId] = useState<MonteCarloConfig['materialId']>('lead');
  const [thickness_cm, setThickness_cm] = useState<number>(5.0);
  const [energy_MeV, setEnergy_MeV] = useState<number>(0.6617);
  const [histories, setHistories] = useState<number>(50000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Run initial simulation on mount
  useEffect(() => {
    executeSimulation();
  }, []);

  const executeSimulation = () => {
    setIsRunning(true);
    // Use setTimeout so the UI renders the loader immediately
    setTimeout(() => {
      const config: MonteCarloConfig = {
        materialId,
        thickness_cm,
        initialEnergy_MeV: energy_MeV,
        histories,
        sampleTracksCount: 120
      };
      const res = runMonteCarloSimulation(config);
      setResult(res);
      setIsRunning(false);
    }, 20);
  };

  // Draw 2D photon tracks on canvas whenever results update
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping
    // Left border: x = -2 cm, Slab starts at x = 0 cm, ends at x = thickness_cm, Right border: x = thickness_cm + 2 cm
    const xMin = -2.0;
    const xMax = thickness_cm + 2.0;
    const yRange = 10.0; // +/- 5 cm

    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toCanvasY = (y: number) => height / 2 - (y / yRange) * (height / 2);

    const slabStartX = toCanvasX(0);
    const slabEndX = toCanvasX(thickness_cm);
    const slabWidth = slabEndX - slabStartX;

    // Draw slab background
    ctx.fillStyle = 'rgba(22, 36, 56, 0.7)';
    ctx.fillRect(slabStartX, 20, slabWidth, height - 40);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(slabStartX, 20, slabWidth, height - 40);

    // Slab label & hatch
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`SHIELD SLAB: ${materialId.toUpperCase()} (${thickness_cm.toFixed(1)} cm)`, slabStartX + 10, 38);

    // Incident source marker (x = -1.2 cm, y = 0)
    const srcX = toCanvasX(-1.2);
    const srcY = toCanvasY(0);
    ctx.beginPath();
    ctx.arc(srcX, srcY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff9f1c';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SRC', srcX - 9, srcY + 18);

    // Draw sample tracks
    result.sampleTracks.forEach(track => {
      if (track.points.length < 2) return;
      ctx.beginPath();
      const pt0 = track.points[0];
      ctx.moveTo(toCanvasX(pt0.x), toCanvasY(pt0.y));

      for (let i = 1; i < track.points.length; i++) {
        const pt = track.points[i];
        ctx.lineTo(toCanvasX(pt.x), toCanvasY(pt.y));
      }

      if (track.status === 'transmitted_uncollided') {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Green uncollided
        ctx.lineWidth = 1.2;
      } else if (track.status === 'transmitted_scattered') {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)'; // Cyan scattered
        ctx.lineWidth = 1.0;
      } else if (track.status === 'backscattered') {
        ctx.strokeStyle = 'rgba(255, 159, 28, 0.75)'; // Amber backscatter
        ctx.lineWidth = 1.0;
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Red absorbed
        ctx.lineWidth = 0.8;
      }
      ctx.stroke();

      // Draw collision vertices
      for (let i = 1; i < track.points.length; i++) {
        const pt = track.points[i];
        ctx.beginPath();
        ctx.arc(toCanvasX(pt.x), toCanvasY(pt.y), 2, 0, 2 * Math.PI);
        if (i === track.points.length - 1 && track.status === 'absorbed') {
          ctx.fillStyle = '#ef4444';
        } else {
          ctx.fillStyle = '#38bdf8';
        }
        ctx.fill();
      }
    });

  }, [result, materialId, thickness_cm]);

  const maxBinCount = result ? Math.max(...result.spectrumBins.map(b => b.count), 1) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 10, 18, 0.95))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🎲</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#10b981' }}>
                Civil Radiation Shielding Monte Carlo Micro-Kernel
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Stochastic Klein-Nishina Compton Scatter, Photoelectric Absorption & Pair Production Transport Engine
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontFamily: 'var(--font-mono)'
          }}>
            VTEST-25 // MONTE CARLO
          </span>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Material Selection */}
        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '8px' }}>
            SHIELD MATERIAL
          </label>
          <select
            className="form-control"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value as MonteCarloConfig['materialId'])}
            style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '6px' }}
          >
            <option value="lead">Lead (Pb) — ρ = 11.34 g/cm³, Z = 82</option>
            <option value="iron">Carbon Steel / Iron (Fe) — ρ = 7.87 g/cm³, Z = 26</option>
            <option value="concrete">NIST Standard Concrete — ρ = 2.30 g/cm³, Z = 11</option>
            <option value="tungsten">Tungsten (W) — ρ = 19.25 g/cm³, Z = 74</option>
            <option value="water">Water / Tissue Equivalent — ρ = 1.00 g/cm³, Z = 7.42</option>
            <option value="poly">Borated Polyethylene — ρ = 0.95 g/cm³, Z = 5.3</option>
          </select>

          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '4px' }}>
              SLAB THICKNESS (x): <span style={{ color: '#fff' }}>{thickness_cm.toFixed(1)} cm</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="25.0"
              step="0.5"
              value={thickness_cm}
              onChange={(e) => setThickness_cm(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Source Energy & Presets */}
        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)', display: 'block', marginBottom: '8px' }}>
            SOURCE PHOTON ENERGY: <span style={{ color: '#fff' }}>{energy_MeV.toFixed(4)} MeV</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="3.0"
            step="0.01"
            value={energy_MeV}
            onChange={(e) => setEnergy_MeV(parseFloat(e.target.value))}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {PRESET_SOURCES.map(preset => (
              <button
                key={preset.nuclide}
                onClick={() => setEnergy_MeV(preset.energy_MeV)}
                style={{
                  padding: '4px 6px',
                  fontSize: '0.70rem',
                  background: energy_MeV === preset.energy_MeV ? 'rgba(255, 159, 28, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${energy_MeV === preset.energy_MeV ? 'var(--color-accent)' : 'rgba(65, 90, 119, 0.3)'}`,
                  color: energy_MeV === preset.energy_MeV ? 'var(--color-accent)' : '#94a3b8',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {preset.nuclide} ({preset.energy_MeV.toFixed(3)}M)
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Configuration & Run */}
        <div className="panel" style={{ padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', display: 'block', marginBottom: '8px' }}>
              MONTE CARLO HISTORIES (N)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {[10000, 25000, 50000, 100000].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setHistories(cnt)}
                  style={{
                    padding: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: histories === cnt ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${histories === cnt ? '#10b981' : 'rgba(65, 90, 119, 0.3)'}`,
                    color: histories === cnt ? '#10b981' : '#94a3b8',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {(cnt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={executeSimulation}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: 800,
              background: isRunning ? 'rgba(65, 90, 119, 0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {isRunning ? 'SIMULATING HISTORIES...' : '▶ RUN STOCHASTIC SIMULATION'}
          </button>
        </div>
      </div>

      {/* Physics Tallies & Benchmark Scorecard */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>TOTAL TRANSMISSION (T)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
              {(result.transmissionFraction * 100).toFixed(3)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              {result.transmittedCount.toLocaleString()} / {result.histories.toLocaleString()} histories
            </div>
          </div>

          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #00e5ff' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>UNCOLLIDED TRANSMISSION (T₀)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00e5ff' }}>
              {(result.uncollidedFraction * 100).toFixed(4)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              Narrow-beam e^(-μx): {(result.analyticalNarrowBeam * 100).toFixed(4)}%
            </div>
          </div>

          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>BUILDUP FACTOR (B)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
              {result.buildupFactor.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              T / T₀ (Scatter enrichment)
            </div>
          </div>

          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #a78bfa' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>BACKSCATTER RATIO</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa' }}>
              {(result.backscatterFraction * 100).toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              {result.backscatteredCount.toLocaleString()} photons reflected
            </div>
          </div>

          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>ENERGY ABSORPTION</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
              {(result.energyAbsorptionFraction * 100).toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              {result.absorbedCount.toLocaleString()} photons stopped
            </div>
          </div>

          <div className="panel" style={{ padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>EXECUTION SPEED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
              {Math.round(result.histories / (result.executionTimeMs / 1000)).toLocaleString()} /s
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              {result.executionTimeMs.toFixed(1)} ms runtime
            </div>
          </div>
        </div>
      )}

      {/* Visualizer Row: 2D Canvas Photon Trajectories + Transmitted Energy Spectrum */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '16px' }}>
        {/* 2D Photon Trajectory Canvas */}
        <div className="panel" style={{ padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
              Stochastic Photon Trajectory Geometry (Cross-Section)
            </span>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem' }}>
              <span style={{ color: '#10b981' }}>● Uncollided</span>
              <span style={{ color: '#00e5ff' }}>● Scattered</span>
              <span style={{ color: '#ff9f1c' }}>● Backscatter</span>
              <span style={{ color: '#ef4444' }}>● Absorbed</span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={650}
            height={320}
            style={{ width: '100%', height: 'auto', background: '#050a12', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}
          />
        </div>

        {/* Transmitted Photon Energy Spectrum Degradation */}
        <div className="panel" style={{ padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
              Transmitted Photon Energy Degradation Spectrum
            </span>
            <span style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
              Mean Exit Energy: <strong style={{ color: '#fff' }}>{result?.meanTransmittedEnergy_MeV.toFixed(3)} MeV</strong>
            </span>
          </div>

          {result && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', height: '260px', background: '#050a12', padding: '10px 10px 20px 10px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)', position: 'relative' }}>
              {result.spectrumBins.map((bin, idx) => {
                const heightPercent = (bin.count / maxBinCount) * 100;
                return (
                  <div
                    key={idx}
                    title={`${bin.energy_MeV.toFixed(3)} MeV: ${bin.count} photons`}
                    style={{
                      flex: 1,
                      height: `${Math.max(2, heightPercent)}%`,
                      background: idx === result.spectrumBins.length - 1 ? '#10b981' : 'linear-gradient(to top, #38bdf8, #818cf8)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                );
              })}
              <div style={{ position: 'absolute', bottom: '2px', left: '10px', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                0.0 MeV (Cutoff)
              </div>
              <div style={{ position: 'absolute', bottom: '2px', right: '10px', fontSize: '0.65rem', color: '#10b981' }}>
                {energy_MeV.toFixed(3)} MeV (Primary Peak)
              </div>
            </div>
          )}
          <div style={{ marginTop: '8px', fontSize: '0.70rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Down-scattered Compton continuum below primary photon energy peak demonstrates degradation through shield thickness.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloModule;
