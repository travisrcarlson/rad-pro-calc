import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

interface AnodeMaterial {
  name: string;
  symbol: string;
  z: number;
  kEdge: number; // keV
  kAlpha1: number; // keV
  kAlpha2: number; // keV
  kBeta1: number; // keV
}

const ANODES: Record<string, AnodeMaterial> = {
  Tungsten: { name: 'Tungsten', symbol: 'W', z: 74, kEdge: 69.5, kAlpha1: 59.3, kAlpha2: 57.9, kBeta1: 67.2 },
  Molybdenum: { name: 'Molybdenum', symbol: 'Mo', z: 42, kEdge: 20.0, kAlpha1: 17.5, kAlpha2: 17.4, kBeta1: 19.6 },
  Rhodium: { name: 'Rhodium', symbol: 'Rh', z: 45, kEdge: 23.2, kAlpha1: 20.2, kAlpha2: 20.1, kBeta1: 22.7 }
};

const XRayTubeModule: React.FC = () => {
  const [target, setTarget] = useState<string>('Tungsten');
  const [kvp, setKvp] = useState<number>(80); // tube voltage in kV
  const [ma, setMa] = useState<number>(100); // tube current in mA
  const [time, setTime] = useState<number>(0.1); // exposure time in seconds
  const [filterAl, setFilterAl] = useState<number>(2.0); // mm of Aluminum
  const [filterCu, setFilterCu] = useState<number>(0.0); // mm of Copper
  const [anodeAngle, setAnodeAngle] = useState<number>(12); // degrees

  const material = useMemo(() => ANODES[target], [target]);

  // Compute energy spectrum arrays
  const spectrum = useMemo(() => {
    const energies: number[] = [];
    const rawIntensities: number[] = [];
    const filteredIntensities: number[] = [];

    const deltaE = 0.5; // step size in keV
    const sigma = 0.8; // Gaussian broadening for characteristic lines

    // Helper for Gaussian peak rendering
    const gaussian = (x: number, mean: number, area: number) => {
      return (area / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(sigma, 2)));
    };

    // Empirical scaling factor for characteristic X-rays based on kVp excess
    let charScale = 0;
    if (kvp > material.kEdge) {
      charScale = Math.pow((kvp - material.kEdge) / material.kEdge, 1.6);
    }

    for (let e = 1.0; e <= kvp; e += deltaE) {
      energies.push(e);

      // 1. Bremsstrahlung Continuum (Kramers' Law approximation)
      // I = C * Z * (kVp - E)
      let bremsstrahlung = 1.5 * material.z * (kvp - e);
      if (bremsstrahlung < 0) bremsstrahlung = 0;

      // 2. Add Target Self-Absorption Correction ( Heel Effect model )
      const angleRad = (anodeAngle * Math.PI) / 180;
      const targetMu = 4500 * Math.pow(Math.max(5, e), -2.6); // self-absorption coeff
      const heelTransmission = Math.exp(-targetMu * 0.002 * Math.cos(angleRad) / Math.max(0.1, Math.sin(angleRad)));
      bremsstrahlung *= heelTransmission;

      // 3. Characteristic K-shell peaks
      let characteristic = 0;
      if (kvp > material.kEdge) {
        // K-alpha 1, K-alpha 2, K-beta 1
        characteristic += gaussian(e, material.kAlpha1, charScale * 600 * material.z);
        characteristic += gaussian(e, material.kAlpha2, charScale * 300 * material.z);
        characteristic += gaussian(e, material.kBeta1, charScale * 180 * material.z);
      }

      const totalRaw = bremsstrahlung + characteristic;
      rawIntensities.push(totalRaw);

      // 4. Added Filtration Attenuation
      // mu = linear attenuation coeff in mm^-1
      const muAl = 2800 * Math.pow(Math.max(8, e), -2.95);
      const muCu = 240000 * Math.pow(Math.max(8, e), -3.15);

      const transmission = Math.exp(-muAl * filterAl - muCu * filterCu);
      filteredIntensities.push(totalRaw * transmission);
    }

    return { energies, rawIntensities, filteredIntensities };
  }, [material, kvp, filterAl, filterCu, anodeAngle]);

  // Calculations for HVL, mean energy, and exposure
  const metrics = useMemo(() => {
    let totalRaw = 0;
    let totalFiltered = 0;
    let energySum = 0;

    const deltaE = 0.5;

    for (let i = 0; i < spectrum.energies.length; i++) {
      totalRaw += spectrum.rawIntensities[i] * deltaE;
      totalFiltered += spectrum.filteredIntensities[i] * deltaE;
      energySum += spectrum.energies[i] * spectrum.filteredIntensities[i] * deltaE;
    }

    const meanEnergy = totalFiltered > 0 ? energySum / totalFiltered : 0;

    // Calculate HVL (Half Value Layer) in mm Al
    const getFilteredSum = (addedAl: number) => {
      let sum = 0;
      for (let i = 0; i < spectrum.energies.length; i++) {
        const e = spectrum.energies[i];
        const raw = spectrum.rawIntensities[i];
        const muAl = 2800 * Math.pow(Math.max(8, e), -2.95);
        const muCu = 240000 * Math.pow(Math.max(8, e), -3.15);
        const trans = Math.exp(-muAl * (filterAl + addedAl) - muCu * filterCu);
        sum += raw * trans * deltaE;
      }
      return sum;
    };

    const targetHvlIntensity = totalFiltered / 2;
    let hvl = 0;
    if (totalFiltered > 0) {
      let low = 0;
      let high = 15;
      for (let step = 0; step < 15; step++) {
        const mid = (low + high) / 2;
        const currentSum = getFilteredSum(mid);
        if (currentSum > hvl ? currentSum > targetHvlIntensity : currentSum > targetHvlIntensity) {
          low = mid;
        } else {
          high = mid;
        }
      }
      hvl = (low + high) / 2;
    }

    // Exposure at 1m in air (mGy or mR)
    // Dynamic calibration: 100 kVp, 2.5 mm Al filter yields ~50 microGy/mAs at 1m
    const mAs = ma * time;
    const baseOutputScale = 1.4e-6; // custom scaling to match physical values
    const doseRate = totalFiltered * baseOutputScale * mAs * 1000; // in microGy at 1m

    return {
      meanEnergy,
      hvl,
      doseRate,
      mAs
    };
  }, [spectrum, filterAl, filterCu, ma, time, kvp]);

  return (
    <div className="xray-tube-module">
      <div className="panel-header">
        <h2>⚡ X-Ray Tube Physics & Spectrum Generator</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Model Bremsstrahlung continuum production, characteristic line peaks, filtration attenuation (beam hardening), and measure X-ray dose outputs.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Controls Panel */}
        <div className="panel" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>X-Ray Tube Parameters</h3>

          <div className="form-group">
            <label className="form-label">Anode Target Material</label>
            <select
              className="form-control"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {Object.keys(ANODES).map((name) => (
                <option key={name} value={name}>
                  {name} ({ANODES[name].symbol}, Z={ANODES[name].z})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Tube Voltage (kVp)</label>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{kvp} kV</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              value={kvp}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              onChange={(e) => setKvp(Number(e.target.value))}
            />
            <input
              type="number"
              className="form-control"
              value={kvp}
              onChange={(e) => setKvp(Math.max(20, Math.min(150, Number(e.target.value))))}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tube Current (mA)</label>
              <input
                type="number"
                className="form-control"
                value={ma}
                min="1"
                max="1000"
                onChange={(e) => setMa(Math.max(1, Math.min(1000, Number(e.target.value))))}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Exposure Time (s)</label>
              <input
                type="number"
                className="form-control"
                value={time}
                step="0.01"
                min="0.001"
                max="10"
                onChange={(e) => setTime(Math.max(0.001, Math.min(10, Number(e.target.value))))}
              />
            </div>
          </div>

          <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
            Charge Output: <strong>{metrics.mAs.toFixed(2)} mAs</strong>
          </div>

          <h3 style={{ marginTop: '10px' }}>Beam Filtration</h3>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Added Aluminum (mm Al)</label>
              <input
                type="number"
                className="form-control"
                value={filterAl}
                step="0.5"
                min="0"
                max="10"
                onChange={(e) => setFilterAl(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Added Copper (mm Cu)</label>
              <input
                type="number"
                className="form-control"
                value={filterCu}
                step="0.05"
                min="0"
                max="2"
                onChange={(e) => setFilterCu(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Anode Angle (Target Heel Effect)</label>
              <span style={{ fontWeight: 'bold' }}>{anodeAngle}°</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              value={anodeAngle}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              onChange={(e) => setAnodeAngle(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Dynamic Graphic SVG Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>X-Ray Tube Interaction Graphic</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
              Dynamic physics visualization of high voltage electron acceleration colliding with the angled target anode, creating a filtered X-ray cone.
            </p>
            
            <div style={{ background: '#030712', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '15px', position: 'relative' }}>
              <svg viewBox="0 0 500 240" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  {/* Glowing cathode filament */}
                  <filter id="glowFilament">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glowFocalSpot">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Accelerated electron stream gradient */}
                  <linearGradient id="electronBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
                  </linearGradient>
                  {/* Filtered X-Ray emission gradient */}
                  <linearGradient id="xrayBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Glass Tube Outer Shell */}
                <rect x="60" y="30" width="380" height="140" rx="70" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="300 20 50 20" />
                <path d="M 60,100 L 10,100 M 440,100 L 490,100" stroke="#64748b" strokeWidth="3" />

                {/* Cathode Structure (Left side) */}
                <rect x="70" y="70" width="40" height="60" rx="5" fill="#334155" stroke="#475569" />
                {/* Focusing Cup */}
                <path d="M 110,75 L 125,85 L 125,115 L 110,125 Z" fill="#475569" />
                
                {/* Hot Glowing Filament */}
                <circle cx="120" cy="100" r="4" fill={ma > 200 ? '#f97316' : '#ea580c'} filter="url(#glowFilament)" style={{ animation: 'pulse 2s infinite' }} />

                {/* Rotating Anode Target Structure (Right side) */}
                <rect x="360" y="50" width="30" height="100" rx="3" fill="#64748b" />
                {/* Angled Target Face */}
                <polygon points="360,50 330,60 330,140 360,150" fill="#94a3b8" stroke="#475569" />
                {/* Rotating Rotor Shaft */}
                <rect x="390" y="85" width="50" height="30" fill="#475569" />

                {/* Electron Stream (Cathode to Anode) */}
                <path d="M 125,100 Q 220,95 332,100" fill="none" stroke="url(#electronBeam)" strokeWidth={Math.max(2, ma / 100)} strokeDasharray="8 4" style={{ strokeDashoffset: -20, animation: 'dash 1s linear infinite' }} />
                
                {/* Anode Focal Spot Hot Glow */}
                <circle cx="332" cy="100" r={Math.min(12, 4 + kvp / 15)} fill="#ef4444" opacity="0.8" filter="url(#glowFocalSpot)" />

                {/* X-Ray Cone Beam */}
                <polygon points="332,100 240,240 380,240" fill="url(#xrayBeam)" opacity={0.6 + filterAl * -0.05} />

                {/* Filter Layers placed at the bottom window */}
                {/* Glass window */}
                <line x1="200" y1="170" x2="300" y2="170" stroke="#38bdf8" strokeWidth="4" />
                
                {/* Aluminum Filter Graphic */}
                {filterAl > 0 && (
                  <rect x="230" y="180" width="60" height={Math.min(10, filterAl * 2)} fill="#94a3b8" rx="1" />
                )}
                
                {/* Copper Filter Graphic */}
                {filterCu > 0 && (
                  <rect x="230" y="195" width="60" height={Math.min(10, filterCu * 6)} fill="#ea580c" rx="1" />
                )}

                {/* Text overlays */}
                <text x="90" y="60" fill="var(--color-text-muted)" fontSize="10">Filament (Cathode)</text>
                <text x="360" y="40" fill="var(--color-text-muted)" fontSize="10">Target (Anode)</text>
                <text x="180" y="160" fill="var(--color-primary)" fontSize="10" fontWeight="bold">X-Ray Window</text>
                {filterAl > 0 && <text x="300" y="188" fill="#94a3b8" fontSize="8">Al ({filterAl} mm)</text>}
                {filterCu > 0 && <text x="300" y="203" fill="#ea580c" fontSize="8">Cu ({filterCu} mm)</text>}
              </svg>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Average Photon Energy:</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{metrics.meanEnergy.toFixed(2)} keV</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>HVL (Half-Value Layer):</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>{metrics.hvl.toFixed(3)} mm Al</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Output Exposure Rate (at 1m):</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {metrics.doseRate.toFixed(2)} μGy
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Plotly Dual Spectra Chart */}
        <div className="panel" style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Unfiltered vs. Filtered X-Ray Spectrum</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            Plots show raw Bremsstrahlung and characteristic peaks (gray dashed line) compared to the filtered, hardened output beam (solid blue fill).
          </p>
          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  x: spectrum.energies,
                  y: spectrum.rawIntensities,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Raw Spectrum (Unfiltered)',
                  line: { color: 'rgba(255,255,255,0.2)', width: 2, dash: 'dash' }
                },
                {
                  x: spectrum.energies,
                  y: spectrum.filteredIntensities,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Filtered output (Hardened)',
                  line: { color: 'var(--color-primary)', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(0, 229, 255, 0.15)'
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Photon Energy (keV)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { title: { text: 'Relative Fluence (Photons / keV)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 20, b: 60 },
                legend: { x: 0.6, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '380px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        {/* Physical Interpretation Panel */}
        <div className="panel" style={{ flex: '1 1 300px' }}>
          <h3>Beam Hardening & Physics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <div>
              <h4 style={{ color: 'var(--color-accent)', marginBottom: '5px' }}>Bremsstrahlung Continuum</h4>
              <p>
                As high-speed electrons from the cathode crash into the target anode, they are deflected by positive atomic nuclei. This deceleration releases electromagnetic radiation, creating a continuous spectrum up to the maximum potential (kVp).
              </p>
            </div>
            
            <div>
              <h4 style={{ color: 'var(--color-accent)', marginBottom: '5px' }}>Characteristic X-Rays</h4>
              <p>
                When an incoming electron knocks out an inner-shell (K-shell) electron from a target atom, an outer-shell electron drops down to fill the vacancy, emitting a photon at a discrete, characteristic energy specific to that element (e.g. 59.3 keV for Tungsten).
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--color-accent)', marginBottom: '5px' }}>Beam Hardening</h4>
              <p>
                Lower-energy X-rays have a very high probability of photoelectric absorption. Filters like Aluminum or Copper absorb these "soft" X-rays, causing the average energy of the remaining beam to shift higher ("harder"), making it much more penetrating.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XRayTubeModule;
