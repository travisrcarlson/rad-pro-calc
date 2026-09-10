import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

export interface DetectorSpec {
  name: string;
  type: 'Scintillator' | 'Semiconductor';
  fwhmAt662keV: number; // keV FWHM
  relativeEffPct: number;
  description: string;
}

export interface GammaLine {
  energyKeV: number;
  intensityPct: number;
}

export interface IsotopeSpec {
  name: string;
  symbol: string;
  category: 'Calibration Standard' | 'Industrial' | 'Medical' | 'Special Nuclear Material';
  gammas: GammaLine[];
  description: string;
}

const DETECTORS: DetectorSpec[] = [
  {
    name: 'HPGe Coaxial (High-Purity Germanium)',
    type: 'Semiconductor',
    fwhmAt662keV: 1.8, // 0.27% resolution
    relativeEffPct: 50,
    description: 'Cryogenically cooled HPGe semiconductor detector with ultra-high energy resolution (~1.8 keV FWHM at 662 keV).'
  },
  {
    name: 'NaI(Tl) 3" x 3" Scintillator',
    type: 'Scintillator',
    fwhmAt662keV: 46.3, // 7.0% resolution
    relativeEffPct: 100,
    description: 'Standard room-temperature Sodium Iodide scintillation detector with high stopping power.'
  },
  {
    name: 'LaBr3(Ce) Cerium-doped Lanthanum Bromide',
    type: 'Scintillator',
    fwhmAt662keV: 19.8, // 3.0% resolution
    relativeEffPct: 130,
    description: 'High-performance inorganic scintillator offering superior light yield and fast timing response.'
  },
  {
    name: 'CZT Coplanar Grid (Cadmium Zinc Telluride)',
    type: 'Semiconductor',
    fwhmAt662keV: 14.5, // 2.2% resolution
    relativeEffPct: 15,
    description: 'Room-temperature semiconductor detector ideal for handheld isotope identifiers (RIID).'
  }
];

const ISOTOPES: IsotopeSpec[] = [
  {
    name: 'Cesium-137 (Cs-137)',
    symbol: 'Cs-137',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 661.7, intensityPct: 85.1 },
      { energyKeV: 32.1, intensityPct: 5.8 } // Ba-137m K-alpha X-ray
    ],
    description: 'Fission product standard featuring a single prominent 661.7 keV photopeak and distinct Compton edge at 477 keV.'
  },
  {
    name: 'Cobalt-60 (Co-60)',
    symbol: 'Co-60',
    category: 'Industrial',
    gammas: [
      { energyKeV: 1173.2, intensityPct: 99.85 },
      { energyKeV: 1332.5, intensityPct: 99.98 }
    ],
    description: 'High-energy industrial gamma emitter with cascade twin photopeaks at 1173.2 keV and 1332.5 keV.'
  },
  {
    name: 'Barium-133 (Ba-133)',
    symbol: 'Ba-133',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 81.0, intensityPct: 34.1 },
      { energyKeV: 276.4, intensityPct: 7.16 },
      { energyKeV: 302.8, intensityPct: 18.3 },
      { energyKeV: 356.0, intensityPct: 62.05 },
      { energyKeV: 383.8, intensityPct: 8.94 }
    ],
    description: 'Multi-line calibration source mimicking low-to-medium energy gamma emitters.'
  },
  {
    name: 'Europium-152 (Eu-152)',
    symbol: 'Eu-152',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 121.8, intensityPct: 28.6 },
      { energyKeV: 244.7, intensityPct: 7.55 },
      { energyKeV: 344.3, intensityPct: 26.5 },
      { energyKeV: 778.9, intensityPct: 12.9 },
      { energyKeV: 964.1, intensityPct: 14.6 },
      { energyKeV: 1112.1, intensityPct: 13.6 },
      { energyKeV: 1408.0, intensityPct: 20.8 }
    ],
    description: 'Wide-spectrum efficiency calibration standard spanning 121 keV to 1408 keV.'
  },
  {
    name: 'Sodium-22 (Na-22)',
    symbol: 'Na-22',
    category: 'Calibration Standard',
    gammas: [
      { energyKeV: 511.0, intensityPct: 180.7 }, // Positron annihilation pair
      { energyKeV: 1274.5, intensityPct: 99.9 }
    ],
    description: 'Positron emitter producing a strong 511 keV annihilation peak along with a 1274.5 keV nuclear gamma.'
  },
  {
    name: 'Americium-241 (Am-241)',
    symbol: 'Am-241',
    category: 'Industrial',
    gammas: [
      { energyKeV: 59.54, intensityPct: 35.9 },
      { energyKeV: 13.9, intensityPct: 13.0 }
    ],
    description: 'Low-energy alpha/gamma emitter widely used in smoke detectors and X-ray fluorescence excitation.'
  },
  {
    name: 'Iridium-192 (Ir-192)',
    symbol: 'Ir-192',
    category: 'Medical',
    gammas: [
      { energyKeV: 295.9, intensityPct: 28.7 },
      { energyKeV: 308.5, intensityPct: 29.7 },
      { energyKeV: 316.5, intensityPct: 82.7 },
      { energyKeV: 468.1, intensityPct: 47.8 }
    ],
    description: 'Industrial radiography and high-dose-rate (HDR) brachytherapy medical isotope.'
  },
  {
    name: 'Special Nuclear Material Threat (Cs-137 + Co-60 + U-235)',
    symbol: 'SNM-Mix',
    category: 'Special Nuclear Material',
    gammas: [
      { energyKeV: 185.7, intensityPct: 57.0 }, // U-235
      { energyKeV: 661.7, intensityPct: 85.1 }, // Cs-137
      { energyKeV: 1173.2, intensityPct: 99.85 }, // Co-60
      { energyKeV: 1332.5, intensityPct: 99.98 }  // Co-60
    ],
    description: 'Complex urban nuclear security threat scenario containing HEU, Cs-137, and Co-60.'
  }
];

const SpectroscopyModule: React.FC = () => {
  const [detector, setDetector] = useState<DetectorSpec>(DETECTORS[0]); // HPGe by default
  const [isotope, setIsotope] = useState<IsotopeSpec>(ISOTOPES[0]); // Cs-137 default
  const [activityKBq, setActivityKBq] = useState<number>(50); // 50 kBq
  const [liveTimeSec, setLiveTimeSec] = useState<number>(300); // 300s acquisition
  const [hasShielding, setHasShielding] = useState<boolean>(true); // Lead shield
  const [isLogScale, setIsLogScale] = useState<boolean>(true); // Log y-axis
  const [addPoissonNoise, setAddPoissonNoise] = useState<boolean>(true);

  // Auto-ID search tolerance
  const [idToleranceKeV, setIdToleranceKeV] = useState<number>(5.0);

  // Generate 2048-Channel MCA Spectrum Data
  const spectrumData = useMemo(() => {
    const numChannels = 2048;
    const maxEnergyKeV = 3000;
    const keVPerChannel = maxEnergyKeV / numChannels;

    const channels: number[] = [];
    const energies: number[] = [];
    const rawCounts: number[] = Array(numChannels).fill(0);

    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(ch);
      energies.push(ch * keVPerChannel);
    }

    const detectorResAt662 = detector.fwhmAt662keV;

    // Process each gamma emission line
    isotope.gammas.forEach((gamma) => {
      const E_g = gamma.energyKeV;
      const intensity = gamma.intensityPct / 100;
      
      // Calculate FWHM at energy E_g: FWHM(E) = FWHM(662) * sqrt(E / 662)
      const fwhm = Math.max(0.5, detectorResAt662 * Math.sqrt(E_g / 662.0));
      const sigma = fwhm / 2.355; // Gaussian standard deviation

      // Total expected photopeak events
      const peakYield = activityKBq * 1000 * intensity * (detector.relativeEffPct / 100) * liveTimeSec * 0.005;

      // Compton Edge calculation: E_C = E_g / (1 + 511 / (2 * E_g))
      const comptonEdge = E_g / (1 + 511 / (2 * E_g));

      // Backscatter Peak energy: E_B = E_g / (1 + 2 * E_g / 511)
      const backscatterEnergy = E_g / (1 + (2 * E_g) / 511);

      // Single & Double Escape Energies
      const singleEscapeE = E_g - 511;
      const doubleEscapeE = E_g - 1022;

      for (let ch = 0; ch < numChannels; ch++) {
        const E = ch * keVPerChannel;

        // 1. Photopeak (Gaussian Distribution)
        const dE = E - E_g;
        if (Math.abs(dE) < 4 * sigma) {
          const photopeakCount = (peakYield / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dE * dE) / (2 * sigma * sigma)) * keVPerChannel;
          rawCounts[ch] += photopeakCount;
        }

        // 2. Compton Continuum (Flat step / Klein-Nishina ramp up to Compton Edge)
        if (E > 10 && E <= comptonEdge) {
          const comptonHeight = (peakYield * 0.45) / comptonEdge;
          const ramp = 0.8 + 0.4 * (E / comptonEdge); // slightly higher near Compton edge
          rawCounts[ch] += comptonHeight * ramp * keVPerChannel;
        }

        // 3. Backscatter Peak
        if (backscatterEnergy > 20) {
          const backscatterSigma = fwhm * 1.2;
          const dB = E - backscatterEnergy;
          if (Math.abs(dB) < 3 * backscatterSigma) {
            const bsCount = (peakYield * 0.08 / (backscatterSigma * Math.sqrt(2 * Math.PI))) * Math.exp(-(dB * dB) / (2 * backscatterSigma * backscatterSigma)) * keVPerChannel;
            rawCounts[ch] += bsCount;
          }
        }

        // 4. Single & Double Escape Peaks (if E_g > 1022 keV)
        if (E_g > 1022) {
          if (singleEscapeE > 0 && Math.abs(E - singleEscapeE) < 3 * sigma) {
            const seCount = (peakYield * 0.05 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - singleEscapeE, 2) / (2 * sigma * sigma)) * keVPerChannel;
            rawCounts[ch] += seCount;
          }
          if (doubleEscapeE > 0 && Math.abs(E - doubleEscapeE) < 3 * sigma) {
            const deCount = (peakYield * 0.03 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - doubleEscapeE, 2) / (2 * sigma * sigma)) * keVPerChannel;
            rawCounts[ch] += deCount;
          }
        }
      }
    });

    // 5. Environmental Background & Lead X-Rays
    const bgLevel = 0.05 * liveTimeSec;
    for (let ch = 0; ch < numChannels; ch++) {
      const E = ch * keVPerChannel;
      
      // Ambient background continuum
      rawCounts[ch] += bgLevel * Math.exp(-E / 1200);

      // Lead X-Rays (75 keV K-alpha) if Lead Shielding is enabled
      if (hasShielding && Math.abs(E - 75) < 3 * (detectorResAt662 * 0.4)) {
        const leadSigma = Math.max(1.0, detectorResAt662 * 0.35);
        rawCounts[ch] += (liveTimeSec * 0.8 / (leadSigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(E - 75, 2) / (2 * leadSigma * leadSigma));
      }
    }

    // 6. Apply Poisson Counting Noise
    const finalCounts = rawCounts.map((val) => {
      const counts = Math.max(0, val);
      if (!addPoissonNoise || counts === 0) return Math.round(counts);
      // Gaussian approximation to Poisson noise: N + N(0, sqrt(N))
      const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 1.15 * Math.sqrt(counts);
      return Math.max(1, Math.round(counts + noise));
    });

    return { numChannels, keVPerChannel, channels, energies, finalCounts };
  }, [detector, isotope, activityKBq, liveTimeSec, hasShielding, addPoissonNoise]);

  // Automated Peak Search & Isotope Identification Engine
  const identifiedPeaks = useMemo(() => {
    const { energies, finalCounts } = spectrumData;
    const peaks: {
      channel: number;
      energyKeV: number;
      counts: number;
      fwhmKeV: number;
      matchedIsotope: string;
      matchedLineKeV: number;
    }[] = [];

    // Simple peak detection: local maximum above threshold
    const windowSize = 5;
    const minCounts = Math.max(...finalCounts) * 0.02; // 2% of max spectrum height

    for (let i = windowSize; i < finalCounts.length - windowSize; i++) {
      const current = finalCounts[i];
      if (current < minCounts) continue;

      let isMax = true;
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i && finalCounts[j] > current) {
          isMax = false;
          break;
        }
      }

      if (isMax) {
        const energy = energies[i];
        const fwhm = detector.fwhmAt662keV * Math.sqrt(energy / 662.0);

        // Search isotope database for matching gamma line
        let bestMatch = 'Unidentified';
        let bestLine = 0;
        let minDiff = idToleranceKeV;

        ISOTOPES.forEach((iso) => {
          iso.gammas.forEach((gamma) => {
            const diff = Math.abs(gamma.energyKeV - energy);
            if (diff < minDiff) {
              minDiff = diff;
              bestMatch = iso.name;
              bestLine = gamma.energyKeV;
            }
          });
        });

        peaks.push({
          channel: i,
          energyKeV: energy,
          counts: current,
          fwhmKeV: fwhm,
          matchedIsotope: bestMatch,
          matchedLineKeV: bestLine
        });
      }
    }

    return peaks;
  }, [spectrumData, detector, idToleranceKeV]);

  return (
    <div className="spectroscopy-module">
      <div className="panel-header">
        <h2>🔬 Gamma Spectroscopy & MCA Spectrum Analyzer</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Simulate pulse-height energy spectra for NaI(Tl), HPGe, LaBr₃(Ce), and CZT detectors. Analyze photopeaks, Compton continuum, backscatter, escape peaks, and run automated isotopic identification.
        </p>
      </div>

      {/* Isotope Standard Presets */}
      <div className="panel" style={{ padding: '15px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Select Isotope Source / Standard
        </h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {ISOTOPES.map((iso) => {
            const isSelected = isotope.name === iso.name;
            return (
              <button
                key={iso.name}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                  color: isSelected ? '#00e5ff' : '#fff',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`
                }}
                onClick={() => setIsotope(iso)}
              >
                {iso.name}
              </button>
            );
          })}
        </div>
        {isotope && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '10px', margin: 0 }}>
            {isotope.description}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Controls Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Detector & Acquisition Config</h3>

          <div className="form-group">
            <label className="form-label">Detector System</label>
            <select
              className="form-control"
              value={detector.name}
              onChange={(e) => {
                const found = DETECTORS.find((d) => d.name === e.target.value);
                if (found) setDetector(found);
              }}
            >
              {DETECTORS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.fwhmAt662keV.toFixed(1)} keV FWHM)
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
              {detector.description}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Source Activity</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={activityKBq}
                  min="1"
                  max="10000"
                  step="10"
                  onChange={(e) => setActivityKBq(Math.max(1, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>kBq</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Acquisition Live Time</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={liveTimeSec}
                  min="10"
                  max="3600"
                  step="30"
                  onChange={(e) => setLiveTimeSec(Math.max(10, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>sec</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={hasShielding}
                onChange={(e) => setHasShielding(e.target.checked)}
              />
              Lead Shielding (75 keV Lead X-Rays)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={addPoissonNoise}
                onChange={(e) => setAddPoissonNoise(e.target.checked)}
              />
              Poisson Noise
            </label>
          </div>

          <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Auto-ID Tolerance</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={idToleranceKeV}
                  min="0.5"
                  max="20.0"
                  step="0.5"
                  onChange={(e) => setIdToleranceKeV(Math.max(0.5, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>keV</span>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                onClick={() => setIsLogScale(!isLogScale)}
              >
                Toggle Y-Axis ({isLogScale ? 'Logarithmic' : 'Linear'})
              </button>
            </div>
          </div>
        </div>

        {/* Spectral Physics Summary Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Spectral Physics & Resolution Metrics</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>FWHM @ 662 keV:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {detector.fwhmAt662keV.toFixed(1)} keV ({((detector.fwhmAt662keV / 661.7) * 100).toFixed(2)}%)
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Spectrum Counts:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                  {spectrumData.finalCounts.reduce((a, b) => a + b, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Detected Photopeaks:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                  {identifiedPeaks.length} Peaks
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>MCA Calibration:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                  {spectrumData.keVPerChannel.toFixed(3)} keV/ch
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
              <h4 style={{ color: 'var(--color-primary)', margin: '0 0 6px 0', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                Gamma Line Decay Table ({isotope.name})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {isotope.gammas.map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px stroke rgba(255,255,255,0.05)' }}>
                    <span>E = <strong>{g.energyKeV.toFixed(1)} keV</strong></span>
                    <span style={{ color: 'var(--color-text-muted)' }}>Intensity: {g.intensityPct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            Detector Technology: <strong>{detector.type}</strong> | Channels: <strong>2048 MCA</strong>
          </div>
        </div>
      </div>

      {/* Plotly 2048-Channel MCA Pulse-Height Spectrum */}
      <div className="panel" style={{ marginBottom: '20px' }}>
        <h3>2048-Channel Multi-Channel Analyzer (MCA) Pulse-Height Spectrum</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px' }}>
          Real-time energy spectrum ($Counts$ vs $keV$). Vertical markers indicate detected photopeaks and auto-identified isotopes.
        </p>

        <div style={{ width: '100%' }}>
          <Plot
            data={[
              {
                x: spectrumData.energies,
                y: spectrumData.finalCounts,
                type: 'scatter',
                mode: 'lines',
                name: `${isotope.symbol} Spectrum`,
                line: { color: 'var(--color-primary)', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(0, 229, 255, 0.08)'
              },
              ...identifiedPeaks.map((p) => ({
                x: [p.energyKeV, p.energyKeV],
                y: [1, p.counts * 1.15],
                type: 'scatter',
                mode: 'lines+text',
                name: `${p.energyKeV.toFixed(1)} keV`,
                text: [`${p.energyKeV.toFixed(1)} keV`],
                textposition: 'top center',
                line: { color: '#EF4444', width: 1.5, dash: 'dash' },
                showlegend: false
              }))
            ] as any}
            layout={{
              autosize: true,
              xaxis: { 
                title: { text: 'Energy (keV)' }, 
                color: '#94A3B8', 
                gridcolor: 'rgba(255,255,255,0.05)',
                range: [0, Math.max(1500, Math.max(...isotope.gammas.map(g => g.energyKeV)) * 1.25)]
              },
              yaxis: { 
                title: { text: 'Counts per Channel' }, 
                type: isLogScale ? 'log' : 'linear', 
                color: '#94A3B8',
                gridcolor: 'rgba(255,255,255,0.05)'
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#F8FAFC' },
              margin: { l: 60, r: 20, t: 30, b: 60 },
              legend: { x: 0.7, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '420px' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>

      {/* Auto-ID & Peak Search Analysis Table */}
      <div className="panel">
        <h3>Automated Isotope Identification (Auto-ID) & Peak Search</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
          Peak fitting and centroid matching against nuclear decay energy database (Tolerance: ±{idToleranceKeV} keV).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                <th style={{ padding: '8px' }}>Peak #</th>
                <th style={{ padding: '8px' }}>Centroid Energy</th>
                <th style={{ padding: '8px' }}>Peak Height</th>
                <th style={{ padding: '8px' }}>FWHM (keV)</th>
                <th style={{ padding: '8px' }}>FWHM (%)</th>
                <th style={{ padding: '8px' }}>Matched Isotope</th>
                <th style={{ padding: '8px' }}>Library Line</th>
              </tr>
            </thead>
            <tbody>
              {identifiedPeaks.map((peak, idx) => {
                const fwhmPct = (peak.fwhmKeV / peak.energyKeV) * 100;
                const isMatched = peak.matchedIsotope !== 'Unidentified';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>#{idx + 1}</td>
                    <td style={{ padding: '8px', color: '#00E5FF', fontWeight: 'bold' }}>{peak.energyKeV.toFixed(1)} keV</td>
                    <td style={{ padding: '8px' }}>{peak.counts.toLocaleString()} counts</td>
                    <td style={{ padding: '8px' }}>{peak.fwhmKeV.toFixed(2)} keV</td>
                    <td style={{ padding: '8px' }}>{fwhmPct.toFixed(2)} %</td>
                    <td style={{ padding: '8px', color: isMatched ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                      {peak.matchedIsotope}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>
                      {isMatched ? `${peak.matchedLineKeV.toFixed(1)} keV` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpectroscopyModule;
