import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

interface BandPreset {
  name: string;
  freqMHz: number;
  typicalApp: string;
  gainDBi: number;
  apertureM: number;
  isRadar: boolean;
}

const BAND_PRESETS: BandPreset[] = [
  { name: 'UHF Tactical Jammer', freqMHz: 450, typicalApp: 'AN/ALQ-99 Tactical Jammer (Low Band)', gainDBi: 6, apertureM: 0.8, isRadar: false },
  { name: 'L-Band Link 16 JTIDS', freqMHz: 1200, typicalApp: 'Secure Voice/Data & EW Signals', gainDBi: 12, apertureM: 0.5, isRadar: false },
  { name: 'S-Band Air Defense Radar', freqMHz: 3000, typicalApp: 'Patriot MPQ-53 Phased Array', gainDBi: 38, apertureM: 2.4, isRadar: true },
  { name: 'C-Band Weather & Search', freqMHz: 5600, typicalApp: 'Maritime Search & Track Radar', gainDBi: 35, apertureM: 1.8, isRadar: true },
  { name: 'X-Band Fire Control Radar', freqMHz: 9500, typicalApp: 'F-16 APG-68 Nose Radar', gainDBi: 32, apertureM: 0.7, isRadar: true },
  { name: 'Ku-Band EW Pod', freqMHz: 15000, typicalApp: 'Airborne Jamming & ECM Pod', gainDBi: 22, apertureM: 0.4, isRadar: false },
  { name: 'Ka-Band Targeting Radar', freqMHz: 35000, typicalApp: 'Mil-wave Target Acquisition Radar', gainDBi: 40, apertureM: 0.5, isRadar: true },
  { name: 'Active Denial System (ADS)', freqMHz: 95000, typicalApp: 'Non-lethal Microwave Weapon (95 GHz)', gainDBi: 52, apertureM: 2.0, isRadar: false }
];

const EMRModule: React.FC = () => {
  const [freqMHz, setFreqMHz] = useState<number>(3000);
  const [signalType, setSignalType] = useState<'CW' | 'Pulsed'>('Pulsed');
  const [peakPowerKW, setPeakPowerKW] = useState<number>(150); // kW
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(2.0); // % for pulsed
  const [pulseWidthUs, setPulseWidthUs] = useState<number>(10); // microseconds
  const [prfHz, setPrfHz] = useState<number>(2000); // Hz
  const [autoDutyCycle, setAutoDutyCycle] = useState<boolean>(true);
  
  const [gainDBi, setGainDBi] = useState<number>(38);
  const [apertureM, setApertureM] = useState<number>(2.4);
  const [standard, setStandard] = useState<'FCC' | 'ICNIRP'>('FCC');

  // Radar mechanical rotation / scanning parameters
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scanAngleDeg, setScanAngleDeg] = useState<number>(360); // 360 for full rotation, or sector size
  const [beamwidthHzDeg, setBeamwidthHzDeg] = useState<number>(2.0); // horizontal lobe beamwidth

  // Radome enclosure parameters
  const [hasRadome, setHasRadome] = useState<boolean>(true);
  const [radomeRadiusM, setRadomeRadiusM] = useState<number>(4.0);
  const [radomeLossDb, setRadomeLossDb] = useState<number>(0.5); // insertion loss (dB)
  const [radomeReflectionPct, setRadomeReflectionPct] = useState<number>(4.0); // reflection percentage (%)

  const [selectedDistance, setSelectedDistance] = useState<number>(15); // distance scrubber for inspection

  // Load a Preset
  const applyPreset = (preset: BandPreset) => {
    setFreqMHz(preset.freqMHz);
    setGainDBi(preset.gainDBi);
    setApertureM(preset.apertureM);
    setIsScanning(preset.isRadar);
    if (preset.isRadar) {
      setSignalType('Pulsed');
      setPeakPowerKW(preset.name.includes('Air Defense') ? 150 : 25);
      setDutyCyclePct(2.0);
      setPulseWidthUs(10);
      setPrfHz(2000);
      setAutoDutyCycle(true);
      setBeamwidthHzDeg(preset.freqMHz >= 10000 ? 1.0 : 2.0);
      setScanAngleDeg(360);
      setHasRadome(true);
      setRadomeRadiusM(preset.apertureM * 1.8);
    } else {
      setSignalType('CW');
      setPeakPowerKW(preset.name.includes('Denial') ? 100 : 2);
      setHasRadome(false);
    }
  };

  // Intermediate calculations
  const math = useMemo(() => {
    const c = 299792458; // m/s
    const freqHz = freqMHz * 1e6;
    const wavelength = c / freqHz; // meters

    // 1. Basic Duty Cycle (Pulse kinetics)
    let dutyFraction = 1.0;
    if (signalType === 'Pulsed') {
      if (autoDutyCycle) {
        dutyFraction = (pulseWidthUs * 1e-6) * prfHz;
      } else {
        dutyFraction = dutyCyclePct / 100;
      }
      dutyFraction = Math.min(1.0, Math.max(0.0001, dutyFraction));
    }

    const peakPowerW = peakPowerKW * 1000;
    const avgPowerW = peakPowerW * dutyFraction;
    
    // 2. Rotational Scanning Duty Factor
    // Reduces time-averaged exposure. DF = beamwidth / scanAngle
    const rotationalDF = isScanning ? Math.min(1.0, beamwidthHzDeg / Math.max(beamwidthHzDeg, scanAngleDeg)) : 1.0;

    // Scanning-averaged power
    const scanningAvgPowerW = avgPowerW * rotationalDF;
    
    // Antenna Linear Gain
    const linearGain = Math.pow(10, gainDBi / 10);
    
    // EIRP values (static vs scanning)
    const eirpPeakW = peakPowerW * linearGain;
    const eirpStaticAvgW = avgPowerW * linearGain;
    const eirpScanningAvgW = scanningAvgPowerW * linearGain;

    // Transition Distance (Near-field to Far-field boundary)
    // R = 2 * D^2 / lambda
    const transitionDistM = (2 * Math.pow(apertureM, 2)) / wavelength;

    // Aperture Area (circular assumption)
    const apertureArea = Math.PI * Math.pow(apertureM / 2, 2);

    // Near-field Maximum Power Density (W/m^2)
    const maxNearFieldPowerDensityW = (4 * avgPowerW) / apertureArea;
    const maxNearFieldPowerDensityScanningW = (4 * scanningAvgPowerW) / apertureArea;

    // Calculate Frequency-Dependent Exposure Limits
    let limitControlledW = 50.0; // W/m^2
    let limitUncontrolledW = 10.0; // W/m^2

    if (standard === 'FCC') {
      if (freqMHz >= 300 && freqMHz <= 1500) {
        limitControlledW = (freqMHz / 300) * 10;
        limitUncontrolledW = (freqMHz / 1500) * 10;
      } else if (freqMHz > 1500) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      } else {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      }
    } else {
      // ICNIRP (2020)
      if (freqMHz >= 400 && freqMHz <= 2000) {
        limitControlledW = freqMHz / 40;
        limitUncontrolledW = freqMHz / 200;
      } else if (freqMHz > 2000) {
        limitControlledW = 50.0;
        limitUncontrolledW = 10.0;
      } else {
        limitControlledW = 10.0;
        limitUncontrolledW = 2.0;
      }
    }

    // 3. Safe Exclusion distances (Static vs Scanning)
    // R = sqrt(EIRP / (4 * pi * Limit))
    // Static / Stopped Antenna
    let safeControlledDistStaticM = 0;
    let safeUncontrolledDistStaticM = 0;
    if (limitControlledW < maxNearFieldPowerDensityW) {
      safeControlledDistStaticM = Math.sqrt(eirpStaticAvgW / (4 * Math.PI * limitControlledW));
    }
    if (limitUncontrolledW < maxNearFieldPowerDensityW) {
      safeUncontrolledDistStaticM = Math.sqrt(eirpStaticAvgW / (4 * Math.PI * limitUncontrolledW));
    }

    // Scanning Active (Time-Averaged)
    let safeControlledDistScanningM = 0;
    let safeUncontrolledDistScanningM = 0;
    if (limitControlledW < maxNearFieldPowerDensityScanningW) {
      safeControlledDistScanningM = Math.sqrt(eirpScanningAvgW / (4 * Math.PI * limitControlledW));
    }
    if (limitUncontrolledW < maxNearFieldPowerDensityScanningW) {
      safeUncontrolledDistScanningM = Math.sqrt(eirpScanningAvgW / (4 * Math.PI * limitUncontrolledW));
    }

    // Antenna Half-Power Beamwidth (approximate in degrees)
    const beamwidthDeg = Math.min(180, (70 * wavelength) / apertureM);

    // 4. Radome Standing Wave Multiplier
    // Reflection R, multiplier F = (1 + sqrt(R))^2
    const reflectionFraction = radomeReflectionPct / 100;
    const standingWaveMultiplier = Math.pow(1 + Math.sqrt(reflectionFraction), 2);
    const radomeTransmissionFraction = Math.pow(10, -radomeLossDb / 10);

    // Calculate incident power density at radome skin radius (static average)
    let incidentRadomeW = 0;
    if (radomeRadiusM <= transitionDistM) {
      incidentRadomeW = maxNearFieldPowerDensityW;
    } else {
      incidentRadomeW = eirpStaticAvgW / (4 * Math.PI * Math.pow(radomeRadiusM, 2));
    }

    const internalRadomePeakW = incidentRadomeW * standingWaveMultiplier;
    const externalRadomeW = incidentRadomeW * radomeTransmissionFraction;
    
    // Radome safety lockout flag (if internal peaks exceed occupational limits)
    const radomeLockoutRequired = internalRadomePeakW > limitControlledW;

    return {
      wavelength,
      freqHz,
      dutyFraction,
      avgPowerW,
      peakPowerW,
      rotationalDF,
      scanningAvgPowerW,
      linearGain,
      eirpPeakW,
      eirpStaticAvgW,
      eirpScanningAvgW,
      transitionDistM,
      maxNearFieldPowerDensityW,
      maxNearFieldPowerDensityScanningW,
      limitControlledW,
      limitUncontrolledW,
      safeControlledDistStaticM,
      safeUncontrolledDistStaticM,
      safeControlledDistScanningM,
      safeUncontrolledDistScanningM,
      beamwidthDeg,
      apertureArea,
      standingWaveMultiplier,
      radomeTransmissionFraction,
      incidentRadomeW,
      internalRadomePeakW,
      externalRadomeW,
      radomeLockoutRequired
    };
  }, [freqMHz, signalType, peakPowerKW, dutyCyclePct, pulseWidthUs, prfHz, autoDutyCycle, gainDBi, apertureM, standard, isScanning, scanAngleDeg, beamwidthHzDeg, radomeRadiusM, radomeLossDb, radomeReflectionPct]);

  // Compute power density at scrubbed distance
  const scrubbedMetrics = useMemo(() => {
    const r = selectedDistance;
    let powerDensityW = 0;

    // Apply radome attenuation step if enabled
    const applyRadomeAttenuation = hasRadome && r > radomeRadiusM;
    const isInsideRadome = hasRadome && r <= radomeRadiusM;

    // Base power density calculation
    // If scanning is active, we look at the scanning-averaged power density
    const eirp = isScanning ? math.eirpScanningAvgW : math.eirpStaticAvgW;
    const maxNF = isScanning ? math.maxNearFieldPowerDensityScanningW : math.maxNearFieldPowerDensityW;

    if (r <= math.transitionDistM) {
      powerDensityW = maxNF;
    } else {
      powerDensityW = eirp / (4 * Math.PI * Math.pow(r, 2));
    }

    // Apply radome loss outside, or standing wave hotspot multiplier inside
    if (applyRadomeAttenuation) {
      powerDensityW *= math.radomeTransmissionFraction;
    } else if (isInsideRadome) {
      // Show peak standing wave hotspot power density
      powerDensityW *= math.standingWaveMultiplier;
    }

    const powerDensityMW = powerDensityW / 10; // W/m^2 to mW/cm^2
    const exceedsControlled = powerDensityW > math.limitControlledW;
    const exceedsUncontrolled = powerDensityW > math.limitUncontrolledW;
    const eField = Math.sqrt(powerDensityW * 377);

    return {
      r,
      powerDensityW,
      powerDensityMW,
      exceedsControlled,
      exceedsUncontrolled,
      eField,
      isInsideRadome
    };
  }, [selectedDistance, math, hasRadome, radomeRadiusM, isScanning]);

  // Chart data generation (incorporating radome step)
  const chartData = useMemo(() => {
    const distances: number[] = [];
    const densityValues: number[] = [];
    
    // Plot range goes out to uncontrolled safety limit or at least 50m
    const maxVal = Math.max(80, Math.max(math.safeUncontrolledDistStaticM, math.safeUncontrolledDistScanningM) * 1.6);
    const steps = 300;
    const step = maxVal / steps;

    for (let i = 0; i <= steps; i++) {
      const r = Math.max(0.1, i * step);
      distances.push(r);

      const eirp = isScanning ? math.eirpScanningAvgW : math.eirpStaticAvgW;
      const maxNF = isScanning ? math.maxNearFieldPowerDensityScanningW : math.maxNearFieldPowerDensityW;

      let baseS = 0;
      if (r <= math.transitionDistM) {
        baseS = maxNF;
      } else {
        baseS = eirp / (4 * Math.PI * Math.pow(r, 2));
      }

      // Add radome transitions
      if (hasRadome) {
        if (r <= radomeRadiusM) {
          // Standing wave hotspots inside
          baseS *= math.standingWaveMultiplier;
        } else {
          // Attenuated signal outside
          baseS *= math.radomeTransmissionFraction;
        }
      }

      densityValues.push(baseS / 10); // mW/cm^2
    }

    return { distances, densityValues };
  }, [math, hasRadome, radomeRadiusM, isScanning]);

  // Active Safe Distance limits based on current scan toggle
  const activeSafeControlled = isScanning ? math.safeControlledDistScanningM : math.safeControlledDistStaticM;
  const activeSafeUncontrolled = isScanning ? math.safeUncontrolledDistScanningM : math.safeUncontrolledDistStaticM;

  return (
    <div className="emr-module">
      <div className="panel-header">
        <h2>📡 Radar Systems & Radome Safety Calculator</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Assess electromagnetic radiation (EMR) hazard envelopes, analyze mechanical rotation scanning duty factors, and model radome near-field standing wave hotspots.
        </p>
      </div>

      {/* Preset Band Selector */}
      <div className="panel" style={{ padding: '15px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          EW & Radar System Presets
        </h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {BAND_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(22, 36, 56, 0.8)', color: '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
              onClick={() => applyPreset(preset)}
            >
              {preset.name} ({preset.freqMHz >= 1000 ? `${(preset.freqMHz / 1000).toFixed(1)} GHz` : `${preset.freqMHz} MHz`})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Controls Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Transmitter & Lobe Setup</h3>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Signal Waveform</label>
              <select
                className="form-control"
                value={signalType}
                onChange={(e) => setSignalType(e.target.value as any)}
              >
                <option value="CW">CW (Continuous Jammer)</option>
                <option value="Pulsed">Pulsed (Radar Waveform)</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Standard</label>
              <select
                className="form-control"
                value={standard}
                onChange={(e) => setStandard(e.target.value as any)}
              >
                <option value="FCC">FCC Part 1.1310</option>
                <option value="ICNIRP">ICNIRP (2020)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="form-label">Carrier Frequency</label>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {freqMHz >= 1000 ? `${(freqMHz / 1000).toFixed(2)} GHz` : `${freqMHz} MHz`}
              </span>
            </div>
            <input
              type="range"
              min="300"
              max="95000"
              step="100"
              value={freqMHz}
              className="form-control"
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              onChange={(e) => setFreqMHz(Number(e.target.value))}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Wavelength (λ): <strong>{(math.wavelength * 100).toFixed(2)} cm</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Peak Pulse Power</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={peakPowerKW}
                  min="0.01"
                  step="any"
                  onChange={(e) => setPeakPowerKW(Math.max(0.01, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>kW</span>
              </div>
            </div>

            {signalType === 'Pulsed' && (
              <div className="form-group" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Duty Cycle</label>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)' }}>
                    <input
                      type="checkbox"
                      checked={autoDutyCycle}
                      onChange={(e) => setAutoDutyCycle(e.target.checked)}
                    />
                    Auto
                  </label>
                </div>
                {autoDutyCycle ? (
                  <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                    {(math.dutyFraction * 100).toFixed(3)} %
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={dutyCyclePct}
                      min="0.001"
                      max="100"
                      onChange={(e) => setDutyCyclePct(Math.max(0.001, Math.min(100, Number(e.target.value))))}
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {signalType === 'Pulsed' && autoDutyCycle && (
            <div style={{ display: 'flex', gap: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pulse Width (τ)</label>
                <input
                  type="number"
                  className="form-control"
                  value={pulseWidthUs}
                  min="0.1"
                  onChange={(e) => setPulseWidthUs(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Pulse Rep Freq (PRF)</label>
                <input
                  type="number"
                  className="form-control"
                  value={prfHz}
                  min="1"
                  onChange={(e) => setPrfHz(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Antenna Gain</label>
              <input
                type="number"
                className="form-control"
                value={gainDBi}
                onChange={(e) => setGainDBi(Number(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Aperture Size (D)</label>
              <input
                type="number"
                className="form-control"
                value={apertureM}
                min="0.05"
                step="0.05"
                onChange={(e) => setApertureM(Math.max(0.05, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Mechanical Rotation / Scanning Inputs */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              <input
                type="checkbox"
                checked={isScanning}
                onChange={(e) => setIsScanning(e.target.checked)}
              />
              Enable Mechanical Scanning / Rotation
            </label>
            
            {isScanning && (
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px', padding: '10px', background: 'rgba(0, 229, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Horizontal Beamwidth</label>
                  <input
                    type="number"
                    className="form-control"
                    value={beamwidthHzDeg}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => setBeamwidthHzDeg(Math.max(0.1, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Scan Path Angle</label>
                  <select
                    className="form-control"
                    value={scanAngleDeg}
                    onChange={(e) => setScanAngleDeg(Number(e.target.value))}
                  >
                    <option value="360">360° (Full Circle)</option>
                    <option value="120">120° (Sector Scan)</option>
                    <option value="60">60° (Target Tracking)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Radome Inputs */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              <input
                type="checkbox"
                checked={hasRadome}
                onChange={(e) => setHasRadome(e.target.checked)}
              />
              Enable Radome Enclosure Analysis
            </label>

            {hasRadome && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Radome Radius (m)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeRadiusM}
                    step="0.5"
                    min="0.5"
                    onChange={(e) => setRadomeRadiusM(Math.max(0.5, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Wall Loss (dB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={radomeLossDb}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => setRadomeLossDb(Math.max(0.01, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Shell Reflection Coefficient</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>{radomeReflectionPct} %</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15.0"
                    step="0.5"
                    value={radomeReflectionPct}
                    style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                    onChange={(e) => setRadomeReflectionPct(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hazard Output Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Microwave Safety Mapping Summary</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
              Calculated boundaries comparing time-averaged active scanning limits with static stopped-antenna threats.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Controlled / Crew Limit */}
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                <h4 style={{ color: 'var(--color-warning)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Controlled (Occupational Crew) Zone
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>
                      {activeSafeControlled.toFixed(1)} meters
                    </div>
                    {isScanning && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Stopped Lobe Hazard: <strong>{math.safeControlledDistStaticM.toFixed(1)} m</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Limit: {(math.limitControlledW / 10).toFixed(2)} mW/cm²</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({math.limitControlledW.toFixed(0)} W/m²)</div>
                  </div>
                </div>
              </div>

              {/* Uncontrolled / Public Limit */}
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <h4 style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Uncontrolled (General Public) Zone
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff' }}>
                      {activeSafeUncontrolled.toFixed(1)} meters
                    </div>
                    {isScanning && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Stopped Lobe Hazard: <strong>{math.safeUncontrolledDistStaticM.toFixed(1)} m</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Limit: {(math.limitUncontrolledW / 10).toFixed(2)} mW/cm²</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({math.limitUncontrolledW.toFixed(0)} W/m²)</div>
                  </div>
                </div>
              </div>

              {/* Radome Standing Wave Warnings */}
              {hasRadome && (
                <div style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${math.radomeLockoutRequired ? 'var(--color-danger)' : 'var(--color-success)'}`, background: math.radomeLockoutRequired ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)' }}>
                  <h4 style={{ color: math.radomeLockoutRequired ? 'var(--color-danger)' : 'var(--color-success)', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Radome Internal Exposure Analysis
                  </h4>
                  <div style={{ fontSize: '0.85rem', marginTop: '5px', color: '#fff' }}>
                    Reflection Hotspot Multiplier: <strong style={{ color: 'var(--color-accent)' }}>{math.standingWaveMultiplier.toFixed(2)}x</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '3px' }}>
                    <span>Incident Power Density:</span>
                    <span>{(math.incidentRadomeW / 10).toExponential(2)} mW/cm²</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '3px' }}>
                    <span style={{ color: 'var(--color-accent)' }}>Internal Standing Peak:</span>
                    <strong style={{ color: 'var(--color-accent)' }}>{(math.internalRadomePeakW / 10).toExponential(2)} mW/cm²</strong>
                  </div>

                  {math.radomeLockoutRequired && (
                    <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
                      ⚠️ DANGER: LOCK-OUT TAG-OUT (LOTO) REQUIRED FOR RADOME ENTRY
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            {isScanning && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Rotational Duty Factor:</span>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{(math.rotationalDF * 100).toFixed(2)}% (1 in {(1 / math.rotationalDF).toFixed(0)})</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Near-Field Boundary (2 D² / λ):</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{math.transitionDistM.toFixed(2)} meters</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Max Aperture Power Density:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>
                {(math.maxNearFieldPowerDensityW / 10).toFixed(2)} mW/cm²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Radiation Lobe + Radome Overlay */}
      <div className="panel" style={{ overflowX: 'auto' }}>
        <h3>Radar Beam Profile & Radome Reflection Overlay</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
          Visual mapping of directional radar lobes. Concentric arcs represent internal standing wave peaks inside the radome.
        </p>

        <div style={{ minWidth: '800px', background: '#030712', borderRadius: '8px', padding: '20px', border: '1px solid var(--color-border)' }}>
          <svg viewBox="0 0 800 240" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="mainLobeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
              <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid concentric rings */}
            <circle cx="80" cy="120" r="140" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <circle cx="80" cy="120" r="280" fill="none" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <circle cx="80" cy="120" r="420" fill="none" stroke="rgba(255,255,255,0.02)" strokeDasharray="3 3" />

            {(() => {
              const beamHalfRad = (math.beamwidthDeg / 2) * Math.PI / 180;
              
              // Scale SVG elements so boundary fits comfortably
              const referenceDistance = Math.max(math.safeUncontrolledDistStaticM, math.safeUncontrolledDistScanningM);
              const scale = referenceDistance > 0 ? 280 / referenceDistance : 280;

              const controlledSVGWidth = Math.max(20, activeSafeControlled * scale);
              const uncontrolledSVGWidth = Math.max(40, activeSafeUncontrolled * scale);

              const cX = Math.min(680, 80 + controlledSVGWidth);
              const uX = Math.min(740, 80 + uncontrolledSVGWidth);

              const spreadControlledY = Math.max(10, controlledSVGWidth * Math.tan(beamHalfRad));
              const spreadUncontrolledY = Math.max(20, uncontrolledSVGWidth * Math.tan(beamHalfRad));

              // Radome SVG rendering
              const radomeSVGRadius = hasRadome ? radomeRadiusM * scale : 0;

              return (
                <>
                  {/* Safety Boundary Envelopes */}
                  <path 
                    d={`M 80,120 
                       Q ${80 + uncontrolledSVGWidth * 0.4},${120 - spreadUncontrolledY * 1.2} ${uX},120
                       Q ${80 + uncontrolledSVGWidth * 0.4},${120 + spreadUncontrolledY * 1.2} 80,120`}
                    fill="rgba(239, 68, 68, 0.06)"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  <path 
                    d={`M 80,120 
                       Q ${80 + controlledSVGWidth * 0.4},${120 - spreadControlledY * 1.2} ${cX},120
                       Q ${80 + controlledSVGWidth * 0.4},${120 + spreadControlledY * 1.2} 80,120`}
                    fill="rgba(245, 158, 11, 0.1)"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />

                  {/* Main Beam Lobe representation */}
                  <polygon
                    points={`80,118 720,${120 - Math.max(40, 600 * Math.tan(beamHalfRad))} 720,${120 + Math.max(40, 600 * Math.tan(beamHalfRad))} 80,122`}
                    fill="url(#mainLobeGrad)"
                    opacity="0.65"
                  />

                  {/* Side Leakage lobes */}
                  <path d="M 80,120 C 50,70 120,70 80,120 C 50,170 120,170 80,120" fill="rgba(245, 158, 11, 0.05)" stroke="rgba(245,158,11,0.2)" />

                  {/* Boundary Markers */}
                  {activeSafeControlled > 0 && (
                    <g transform={`translate(${cX}, 120)`}>
                      <line x1="0" y1="-30" x2="0" y2="30" stroke="#F59E0B" strokeWidth="1.5" />
                      <text x="5" y="-12" fill="#F59E0B" fontSize="8" fontWeight="bold">Controlled Zone ({activeSafeControlled.toFixed(1)}m)</text>
                    </g>
                  )}

                  {activeSafeUncontrolled > 0 && (
                    <g transform={`translate(${uX}, 120)`}>
                      <line x1="0" y1="-55" x2="0" y2="55" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" />
                      <text x="5" y="38" fill="#EF4444" fontSize="8" fontWeight="bold">Uncontrolled Zone ({activeSafeUncontrolled.toFixed(1)}m)</text>
                    </g>
                  )}

                  {/* Radome Circle shell */}
                  {hasRadome && radomeSVGRadius > 0 && (
                    <>
                      {/* Radome Wall */}
                      <circle cx="80" cy="120" r={radomeSVGRadius} fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 3" />
                      <text x={80} y={120 - radomeSVGRadius - 8} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                        Radome Wall ({radomeRadiusM}m)
                      </text>

                      {/* Standing Wave Hotspot Ring Arc representations inside radome */}
                      <path 
                        d={`M ${80 - radomeSVGRadius * 0.9} ${120} A ${radomeSVGRadius * 0.9} ${radomeSVGRadius * 0.9} 0 0 1 ${80 + radomeSVGRadius * 0.9} 120`} 
                        fill="none" 
                        stroke="#EF4444" 
                        strokeWidth="3.5" 
                        strokeOpacity="0.4"
                        strokeDasharray="1 10"
                        style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }}
                      />
                      <path 
                        d={`M ${80 - radomeSVGRadius * 0.75} ${120} A ${radomeSVGRadius * 0.75} ${radomeSVGRadius * 0.75} 0 0 1 ${80 + radomeSVGRadius * 0.75} 120`} 
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="2.5" 
                        strokeOpacity="0.3"
                        strokeDasharray="2 12"
                      />
                      <text x="80" y="145" fill="#EF4444" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.8">
                        ⚠️ STANDING WAVE HOTSPOTS
                      </text>
                    </>
                  )}
                </>
              );
            })()}

            {/* Antenna Dish Assembly */}
            <path d="M 60,95 C 72,95 72,145 60,145 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <rect x="38" y="112" width="22" height="16" fill="#334155" />
            <circle cx="68" cy="120" r="6" fill="url(#antennaGlow)" />

            <text x="45" y="165" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">ANTENNA</text>
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Plotly Power Density Chart */}
        <div className="panel" style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Power Density Decay Profile</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '10px', alignSelf: 'flex-start' }}>
            Power density ($mW/cm^2$) vs distance. Displays the radome transmission insertion step and standing wave reflection peaks inside the shell.
          </p>
          <div style={{ width: '100%' }}>
            <Plot
              data={[
                {
                  x: chartData.distances,
                  y: chartData.densityValues,
                  type: 'scatter',
                  mode: 'lines',
                  name: isScanning ? 'Density (Scanning Avg)' : 'Density (Static Avg)',
                  line: { color: 'var(--color-primary)', width: 3 },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(0, 229, 255, 0.05)'
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitControlledW / 10, math.limitControlledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Controlled Limit (Crew)',
                  line: { color: '#F59E0B', width: 2, dash: 'dash' }
                },
                {
                  x: [0, Math.max(...chartData.distances)],
                  y: [math.limitUncontrolledW / 10, math.limitUncontrolledW / 10],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Uncontrolled Limit (Public)',
                  line: { color: '#EF4444', width: 2, dash: 'dash' }
                },
                hasRadome ? {
                  x: [radomeRadiusM, radomeRadiusM],
                  y: [0, Math.max(...chartData.densityValues)],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Radome Shell Boundary',
                  line: { color: '#94A3B8', width: 1.5, dash: 'dot' }
                } : null
              ].filter(Boolean) as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Distance from Antenna (meters)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { 
                  title: { text: 'Power Density (mW/cm²)' }, 
                  type: 'log', 
                  color: '#94A3B8',
                  gridcolor: 'rgba(255,255,255,0.05)'
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 20, b: 60 },
                legend: { x: 0.5, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '380px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        {/* Distance inspector */}
        <div className="panel" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
          <h3>Distance Safety Inspector</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Inspect local power density values and biological compliance metrics at varying distances from the antenna.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Target Range:</span>
                <strong style={{ color: 'var(--color-accent)' }}>{selectedDistance} meters</strong>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(200, Math.round(math.safeUncontrolledDistStaticM * 1.5))}
                value={selectedDistance}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                onChange={(e) => setSelectedDistance(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Power Density:</span>
                <span style={{ fontWeight: 'bold', color: scrubbedMetrics.exceedsUncontrolled ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {scrubbedMetrics.powerDensityMW.toExponential(3)} mW/cm²
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Electric Field Intensity:</span>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>
                  {scrubbedMetrics.eField.toFixed(1)} V/m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Location Sector:</span>
                <span style={{ fontWeight: 'bold', color: hasRadome && scrubbedMetrics.isInsideRadome ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                  {hasRadome && scrubbedMetrics.isInsideRadome ? 'Inside Radome 🔴' : 'Outside Radome 🟢'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Crew Safe?</span>
                <span style={{ fontWeight: 'bold', color: scrubbedMetrics.exceedsControlled ? '#EF4444' : '#10B981' }}>
                  {scrubbedMetrics.exceedsControlled ? '⚠️ NO (Exceeds Limit)' : '✅ YES'}
                </span>
              </div>
            </div>

            {hasRadome && scrubbedMetrics.isInsideRadome && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-danger)', lineHeight: '1.4' }}>
                ⚠️ Warning: Inside the radome, reflected microwaves form strong standing wave patterns. The local power density is estimated to be {math.standingWaveMultiplier.toFixed(1)} times higher than free space due to interference.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Methodology Section */}
      <div className="panel">
        <h3>Radome Standing Wave & Mechanical Scanning Safety Principles</h3>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: '15px', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>Radome Reflection & Standing Waves</h4>
            <p>
              A radome (radar dome) protects delicate radar arrays from environmental damage, but its shell causes impedance mismatches. A small percentage of energy is reflected back inward. These reflected waves interfere with outgoing waves, creating peaks of high E-field intensity (standing waves) inside the dome. Under worst-case alignment, the hotspot power density multiplier is modeled as:
              <code> F_hotspot = (1 + sqrt(R_coeff))² </code>.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>Mechanical Scan Duty Factors</h4>
            <p>
              When a radar mechanically rotates (e.g. 360° or sector sweeps), the beam only dwells on a target location briefly. This reduces the time-averaged exposure. However, if the scanner fails or is stopped during active maintenance ("Stopped Beam" state), a person in the main lobe path will receive the full stationary average power density continuously, posing severe risk of thermal tissue damage.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>Radome Entry Hazards & LOTO</h4>
            <p>
              Because radome skin is close to the high-gain antenna (often well within the transition distance), the power density is extremely high. Combined with standing wave peaks, the controlled threshold limit is almost always breached. Lock-Out Tag-Out (LOTO) procedures must be strictly enforced on the transmitter prior to any personnel entering the radome.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMRModule;
