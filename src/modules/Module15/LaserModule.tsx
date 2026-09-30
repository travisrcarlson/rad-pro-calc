import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;

// Standard presets for Laser Safety
interface LaserPreset {
  name: string;
  wavelength: number; // nm
  power: number; // mW
  diameter: number; // mm
  divergence: number; // mrad
  mode: 'CW' | 'Pulsed';
  description: string;
}

const PRESETS: LaserPreset[] = [
  { name: 'Green Pointer (532nm)', wavelength: 532, power: 5, diameter: 1.5, divergence: 1.2, mode: 'CW', description: 'DPSS frequency-doubled Nd:YAG pointer. High retinal hazard.' },
  { name: 'Red Pointer (650nm)', wavelength: 650, power: 1, diameter: 1.2, divergence: 1.0, mode: 'CW', description: 'Direct diode red laser for presentations. Class 2 eye-safe via blink reflex.' },
  { name: 'Blu-ray / Violet (405nm)', wavelength: 405, power: 50, diameter: 1.2, divergence: 1.4, mode: 'CW', description: 'GaN near-UV diode laser. Strong photochemical and thermal retinal risk.' },
  { name: 'He-Ne Gas Lab (632.8nm)', wavelength: 632.8, power: 10, diameter: 1.0, divergence: 1.0, mode: 'CW', description: 'Helium-Neon gas laser commonly used in university alignment optics.' },
  { name: 'Research Ti:Sapphire (800nm)', wavelength: 800, power: 500, diameter: 1.0, divergence: 1.0, mode: 'CW', description: 'Tunable near-infrared ultrafast laser. Invisible beam hazard.' },
  { name: 'Medical Nd:YAG (1064nm)', wavelength: 1064, power: 20000, diameter: 2.0, divergence: 2.0, mode: 'CW', description: 'High-power surgical/dermatological laser. Causes deep choroid and retinal lesions.' },
  { name: 'Industrial CO₂ Cutter (10.6µm)', wavelength: 10600, power: 100000, diameter: 5.0, divergence: 3.0, mode: 'CW', description: 'Far-infrared molecular gas laser. Severe corneal ablation and skin burn hazard.' },
  { name: 'UV Excimer (248nm KrF)', wavelength: 248, power: 5000, diameter: 3.0, divergence: 1.5, mode: 'CW', description: 'Deep ultraviolet excimer laser. Severe photochemical photokeratitis risk.' }
];

// Helper to convert wavelength to RGB/HEX color for beam rendering
const wavelengthToColor = (nm: number): { hex: string; isVisible: boolean; name: string } => {
  if (nm < 400) {
    return { hex: '#c084fc', isVisible: false, name: 'Ultraviolet (Invisible)' };
  }
  if (nm > 700) {
    return { hex: '#f87171', isVisible: false, name: 'Infrared (Invisible)' };
  }

  // Linear color interpolation for visible spectrum
  let r = 0, g = 0, b = 0;
  if (nm >= 400 && nm < 440) {
    r = -(nm - 440) / (440 - 400);
    b = 1.0;
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1.0;
  } else if (nm >= 490 && nm < 510) {
    g = 1.0;
    b = -(nm - 510) / (510 - 490);
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1.0;
  } else if (nm >= 580 && nm < 645) {
    r = 1.0;
    g = -(nm - 645) / (645 - 580);
  } else if (nm >= 645 && nm <= 700) {
    r = 1.0;
  }

  let factor = 1.0;
  if (nm >= 400 && nm < 420) {
    factor = 0.3 + 0.7 * (nm - 400) / (420 - 400);
  } else if (nm > 650 && nm <= 700) {
    factor = 0.3 + 0.7 * (700 - nm) / (700 - 650);
  }

  const toHex = (c: number) => {
    const val = Math.round(c * factor * 255);
    const hex = val.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    isVisible: true,
    name: 'Visible'
  };
};

type LaserTab = 'schematic' | 'decay' | 'eyewear' | 'physics';

const LaserModule: React.FC = () => {
  const [wavelength, setWavelength] = useState<number>(532);
  const [power, setPower] = useState<number>(5); // in mW
  const [powerUnit, setPowerUnit] = useState<'mW' | 'W'>('mW');
  const [diameter, setDiameter] = useState<number>(1.5); // in mm
  const [divergence, setDivergence] = useState<number>(1.2); // in mrad
  const [exposureDuration, setExposureDuration] = useState<number>(0.25); // in seconds
  const [customDuration, setCustomDuration] = useState<string>('0.25');
  const [activeTab, setActiveTab] = useState<LaserTab>('schematic');
  const [probeDistance, setProbeDistance] = useState<number>(1.0); // interactive probe distance in meters

  // Load a preset
  const applyPreset = (preset: LaserPreset) => {
    setWavelength(preset.wavelength);
    if (preset.power >= 1000) {
      setPower(preset.power / 1000);
      setPowerUnit('W');
    } else {
      setPower(preset.power);
      setPowerUnit('mW');
    }
    setDiameter(preset.diameter);
    setDivergence(preset.divergence);
    setExposureDuration(0.25);
    setCustomDuration('0.25');
  };

  // Color matching physics
  const beamColor = useMemo(() => wavelengthToColor(wavelength), [wavelength]);

  // Actual power in mW
  const actualPowerMW = powerUnit === 'W' ? power * 1000 : power;

  // ANSI Z136.1 Calculations Engine
  const calculations = useMemo(() => {
    // 1. Calculate Ocular Maximum Permissible Exposure (MPE) in mW/cm^2
    let mpe = 1.0;

    if (wavelength >= 400 && wavelength <= 700) {
      if (exposureDuration <= 0.25) {
        mpe = 2.5; // mW/cm^2 (standard eye blink reflex limit)
      } else if (exposureDuration <= 10) {
        mpe = 1.0;
      } else {
        mpe = 1.0;
      }
    } else if (wavelength >= 315 && wavelength < 400) {
      mpe = 1.0;
    } else if (wavelength >= 180 && wavelength < 315) {
      mpe = 0.003;
    } else if (wavelength > 700 && wavelength <= 1400) {
      let ca = 1.0;
      if (wavelength < 1050) {
        ca = Math.pow(10, 0.002 * (wavelength - 700));
      } else {
        ca = 5.0;
      }
      mpe = 1.6 * ca;
    } else if (wavelength > 1400) {
      mpe = 100.0;
    }

    // 2. Physical Unit Conversions
    const powerW = actualPowerMW / 1000;
    const mpeWcm2 = mpe / 1000;
    const diamCm = diameter / 10;
    const divRad = divergence / 1000;

    // Aperture Area (cm^2)
    const apertureArea = (Math.PI * Math.pow(diamCm, 2)) / 4;
    // Irradiance at Aperture (W/cm^2)
    const irradianceAperture = powerW / apertureArea;

    // 3. Nominal Ocular Hazard Distance (NOHD) in meters
    let nohdMeters = 0;
    if (irradianceAperture > mpeWcm2) {
      const term = Math.sqrt((4 * powerW) / (Math.PI * mpeWcm2));
      const nohdCm = (term - diamCm) / divRad;
      nohdMeters = Math.max(0, nohdCm / 100);
    } else {
      nohdMeters = 0;
    }

    // 4. Rayleigh Range (z_R) & Beam Waist (w_0)
    const waistRadiusCm = diamCm / 2;
    const wavelengthCm = (wavelength * 1e-9) * 100;
    const rayleighRangeM = (Math.PI * Math.pow(waistRadiusCm, 2) / wavelengthCm) / 100;

    // 5. ANSI Z136.1 / IEC 60825-1 Classification
    let laserClass = 'Class 1';
    let classColor = '#10B981';
    let classBadge = 'EYE-SAFE';
    let classDescription = 'Safe under all foreseeable operating conditions. Inherently eye-safe.';

    if (wavelength >= 400 && wavelength <= 700) {
      if (actualPowerMW <= 0.39) {
        laserClass = 'Class 1';
        classColor = '#10B981';
        classBadge = 'CLASS 1';
        classDescription = 'Safe under all conditions. Radiation emitted is below ocular MPE.';
      } else if (actualPowerMW <= 1.0) {
        laserClass = 'Class 2';
        classColor = '#3B82F6';
        classBadge = 'CLASS 2';
        classDescription = 'Safe for accidental exposure due to physiological aversion response (0.25s blink reflex).';
      } else if (actualPowerMW <= 5.0) {
        laserClass = 'Class 3R';
        classColor = '#F59E0B';
        classBadge = 'CLASS 3R';
        classDescription = 'Low risk of ocular injury. Direct intrabeam viewing is potentially hazardous; low diffuse hazard.';
      } else if (actualPowerMW <= 500) {
        laserClass = 'Class 3B';
        classColor = '#F97316';
        classBadge = 'CLASS 3B';
        classDescription = 'HAZARDOUS: Direct intrabeam and specular reflections cause acute retinal/corneal damage. Eyewear required.';
      } else {
        laserClass = 'Class 4';
        classColor = '#EF4444';
        classBadge = 'CLASS 4';
        classDescription = 'EXTREME DANGER: High-power laser. Direct, specular, and diffuse reflections cause severe eye injury and skin burns. Fire hazard.';
      }
    } else {
      // Invisible spectrum (UV / IR) - No natural aversion response
      if (actualPowerMW <= 0.39) {
        laserClass = 'Class 1';
        classColor = '#10B981';
        classBadge = 'CLASS 1';
        classDescription = 'Safe under all conditions. Emission below non-visible MPE threshold.';
      } else if (actualPowerMW <= 5.0) {
        laserClass = 'Class 3R';
        classColor = '#F59E0B';
        classBadge = 'CLASS 3R';
        classDescription = 'Invisible beam hazard. Eyewear strongly advised due to lack of human blink reflex.';
      } else if (actualPowerMW <= 500) {
        laserClass = 'Class 3B';
        classColor = '#F97316';
        classBadge = 'CLASS 3B';
        classDescription = 'HAZARDOUS: Invisible beam. Severe corneal/retinal injury without visual sensation. Interlocks and eyewear mandatory.';
      } else {
        laserClass = 'Class 4';
        classColor = '#EF4444';
        classBadge = 'CLASS 4';
        classDescription = 'CRITICAL DANGER: High-energy invisible beam. Severe tissue destruction, deep retinal photocoagulation, and skin burns.';
      }
    }

    // 6. Eyewear Optical Density (OD) Required at Source Aperture
    const odRequired = irradianceAperture > mpeWcm2 
      ? Math.max(0, Math.log10(irradianceAperture / mpeWcm2)) 
      : 0;

    return {
      mpe,
      mpeWcm2,
      irradianceAperture,
      nohdMeters,
      laserClass,
      classColor,
      classBadge,
      classDescription,
      odRequired,
      divRad,
      diamCm,
      powerW,
      rayleighRangeM,
      waistRadiusCm
    };
  }, [wavelength, actualPowerMW, diameter, divergence, exposureDuration]);

  // Generates dynamic data for the Plotly Irradiance Chart & OD Table
  const distanceData = useMemo(() => {
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000];
    const maxGraphRange = Math.max(10, calculations.nohdMeters * 1.5);
    const chartDistances = Array.from({ length: 150 }, (_, i) => 0.05 + (i * maxGraphRange) / 150);

    const calcDetails = (rMeters: number) => {
      const rCm = rMeters * 100;
      const beamDiamCm = calculations.diamCm + calculations.divRad * rCm;
      const beamArea = (Math.PI * Math.pow(beamDiamCm, 2)) / 4;
      const irrWcm2 = calculations.powerW / beamArea;
      const irrMW = irrWcm2 * 1000;
      
      const od = irrMW > calculations.mpe
        ? Math.max(0, Math.log10(irrMW / calculations.mpe))
        : 0;

      return {
        rMeters,
        beamDiamMm: beamDiamCm * 10,
        irradiance: irrMW,
        od,
        isSafe: irrMW <= calculations.mpe
      };
    };

    const tableRows = steps
      .filter(step => step <= Math.max(50, calculations.nohdMeters * 1.8))
      .map(step => calcDetails(step));

    const plotX = chartDistances;
    const plotY = chartDistances.map(r => calcDetails(r).irradiance);

    // Interactive probe calculation
    const probe = calcDetails(probeDistance);

    return { tableRows, plotX, plotY, probe, maxGraphRange };
  }, [calculations, probeDistance]);

  return (
    <div className="laser-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span>⚡ Laser Radiation Safety & NOHD Analyzer</span>
            <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
              ANSI Z136.1-2022 / IEC 60825-1
            </span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            High-precision optical engineering engine calculating ocular Maximum Permissible Exposure (MPE), Gaussian beam divergence caustics, Nominal Ocular Hazard Distance (NOHD), and optical density (OD) protection specs.
          </p>
        </div>
      </div>

      {/* Preset Library Toolbar */}
      <div className="panel" style={{ padding: '14px 20px', marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
            System Quick-Presets
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Select verified optical hardware
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => {
            const isSelected = wavelength === p.wavelength && actualPowerMW === p.power;
            const pColor = wavelengthToColor(p.wavelength);
            return (
              <button
                key={p.name}
                className="btn btn-primary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#00e5ff' : '#cbd5e1',
                  border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`,
                  boxShadow: isSelected ? '0 0 8px rgba(0, 229, 255, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => applyPreset(p)}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor.hex, display: 'inline-block' }} />
                <strong>{p.name}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Split Dashboard: Left Parameters | Right Hazard Readout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left Column: Laser Emitter Specifications */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Laser Emitter Parameters</h3>
            <span style={{ fontSize: '0.75rem', color: beamColor.hex, fontWeight: 'bold', padding: '2px 8px', background: `${beamColor.hex}15`, borderRadius: '4px', border: `1px solid ${beamColor.hex}40` }}>
              {wavelength} nm • {beamColor.name}
            </span>
          </div>

          {/* Wavelength Slider & Numeric Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Emission Wavelength (λ)</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '90px', padding: '3px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                  value={wavelength}
                  min="180"
                  max="11000"
                  step="1"
                  onChange={(e) => setWavelength(Math.max(180, Math.min(11000, Number(e.target.value))))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>nm</span>
              </div>
            </div>
            <input
              type="range"
              min="200"
              max="10600"
              step="5"
              value={wavelength}
              className="form-control"
              style={{ width: '100%', accentColor: beamColor.hex, background: '#111827', margin: '4px 0' }}
              onChange={(e) => setWavelength(Number(e.target.value))}
            />
          </div>

          {/* Optical Beam Power */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Average Optical Power (P)</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', background: powerUnit === 'mW' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: powerUnit === 'mW' ? '#000' : '#fff', border: '1px solid var(--color-border)', borderRadius: '3px', cursor: 'pointer' }}
                  onClick={() => setPowerUnit('mW')}
                >
                  mW
                </button>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', background: powerUnit === 'W' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: powerUnit === 'W' ? '#000' : '#fff', border: '1px solid var(--color-border)', borderRadius: '3px', cursor: 'pointer' }}
                  onClick={() => setPowerUnit('W')}
                >
                  Watts
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ flex: 1 }}
                value={power}
                min="0.001"
                step="any"
                onChange={(e) => setPower(Math.max(0.001, Number(e.target.value)))}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', width: '60px' }}>
                {actualPowerMW >= 1000 ? `${(actualPowerMW / 1000).toFixed(2)} W` : `${actualPowerMW} mW`}
              </span>
            </div>
          </div>

          {/* Beam Geometry: Diameter & Divergence */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '3px' }}>Aperture Waist (a)</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={diameter}
                  min="0.1"
                  step="0.1"
                  onChange={(e) => setDiameter(Math.max(0.1, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>mm</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '3px' }}>Divergence (θ)</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={divergence}
                  min="0.05"
                  step="0.05"
                  onChange={(e) => setDivergence(Math.max(0.05, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>mrad</span>
              </div>
            </div>
          </div>

          {/* Exposure Duration Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '4px' }}>ANSI Exposure Duration (T)</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {[
                { label: '0.25s (Blink)', val: 0.25 },
                { label: '10s (Accidental)', val: 10 },
                { label: '600s (Extended)', val: 600 },
                { label: '30,000s (8h Workday)', val: 30000 }
              ].map(d => (
                <button
                  key={d.val}
                  type="button"
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    background: exposureDuration === d.val ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                    color: exposureDuration === d.val ? '#000' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => { setExposureDuration(d.val); setCustomDuration(String(d.val)); }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                value={customDuration}
                min="0.001"
                onChange={(e) => {
                  setCustomDuration(e.target.value);
                  const val = Number(e.target.value);
                  if (val > 0) setExposureDuration(val);
                }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>seconds</span>
            </div>
          </div>
        </div>

        {/* Right Column: ANSI Hazard Assessment & Primary Instrument Gauge */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0, justifyContent: 'space-between' }}>
          {/* Classification Banner */}
          <div style={{ padding: '16px', background: 'rgba(3, 7, 18, 0.65)', border: `2px solid ${calculations.classColor}`, borderRadius: '8px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: calculations.classColor }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                ANSI Z136.1 / IEC 60825-1 CLASSIFICATION
              </span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: `${calculations.classColor}25`, color: calculations.classColor, borderRadius: '3px', fontWeight: 'bold', border: `1px solid ${calculations.classColor}60` }}>
                {calculations.classBadge}
              </span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: calculations.classColor, letterSpacing: '1px' }}>
              {calculations.laserClass}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '4px', lineHeight: '1.4' }}>
              {calculations.classDescription}
            </div>
          </div>

          {/* Primary NOHD Readout Box */}
          <div style={{ padding: '14px 18px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)', fontWeight: 'bold', display: 'block' }}>
                Nominal Ocular Hazard Distance (NOHD)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '2px 0' }}>
                {calculations.nohdMeters > 0 ? `${calculations.nohdMeters.toFixed(2)} m` : '0.00 m (Eye-Safe)'}
              </div>
              {calculations.nohdMeters > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Exclusion Boundary: {(calculations.nohdMeters * 3.28084).toFixed(1)} feet
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Eyewear Optical Density</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: calculations.odRequired > 0 ? 'var(--color-accent)' : 'var(--color-success)' }}>
                {calculations.odRequired > 0 ? `OD ≥ ${calculations.odRequired.toFixed(2)}` : 'None Required'}
              </div>
            </div>
          </div>

          {/* Critical Physical Quantities Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Ocular MPE Limit</span>
              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{calculations.mpe.toFixed(3)}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>mW/cm²</span>
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Aperture Irradiance E₀</span>
              <strong style={{ fontSize: '0.95rem', color: calculations.irradianceAperture * 1000 > calculations.mpe ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {(calculations.irradianceAperture * 1000).toExponential(2)}
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>mW/cm²</span>
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>Rayleigh Range (z_R)</span>
              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{calculations.rayleighRangeM.toFixed(2)}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>meters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs (Replaces endless vertical stacking) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'schematic' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'schematic' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'schematic' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'schematic' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('schematic')}
        >
          🔬 Optical Bench & Beam Caustic CAD Schematic
        </button>
        <button
          className={`nav-link ${activeTab === 'decay' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'decay' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'decay' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'decay' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('decay')}
        >
          📈 Irradiance Decay & Optical Density vs. Distance
        </button>
        <button
          className={`nav-link ${activeTab === 'eyewear' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'eyewear' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'eyewear' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'eyewear' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('eyewear')}
        >
          🛡️ Eyewear OD & Workplace Safety Table
        </button>
        <button
          className={`nav-link ${activeTab === 'physics' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '10px 18px', borderBottom: activeTab === 'physics' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'physics' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'physics' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('physics')}
        >
          📐 ANSI Z136.1 Physics & Derivations
        </button>
      </div>

      {/* Tab 1: Professional Engineering CAD Optical Bench */}
      {activeTab === 'schematic' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Optical Rail CAD Schematic: Gaussian Caustic Profile & Exclusion Boundary</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Physical Gaussian beam expansion w(z) = w₀ √(1 + (z/z_R)²) rendered with 1/e² and 1/e intensity contours. Drag or click the range probe to inspect spot size and irradiance.
              </p>
            </div>
            {/* Range Probe Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>PROBE:</span>
              <input
                type="range"
                min="0.1"
                max={Math.max(10, calculations.nohdMeters * 1.5)}
                step="0.1"
                value={probeDistance}
                style={{ width: '120px', accentColor: 'var(--color-primary)' }}
                onChange={(e) => setProbeDistance(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.8rem', color: '#fff', minWidth: '45px' }}>{probeDistance.toFixed(1)}m</span>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto', background: '#020617', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '15px 10px' }}>
            <svg viewBox="0 0 950 260" style={{ width: '100%', minWidth: '850px', height: 'auto', display: 'block' }}>
              <defs>
                {/* Optical breadboard hole pattern */}
                <pattern id="breadboardGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <circle cx="12.5" cy="12.5" r="1.2" fill="rgba(255,255,255,0.08)" />
                </pattern>

                {/* Laser core glow gradient */}
                <linearGradient id="causticGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={beamColor.hex} stopOpacity="0.9" />
                  <stop offset="40%" stopColor={beamColor.hex} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={beamColor.hex} stopOpacity="0.1" />
                </linearGradient>

                <linearGradient id="causticCenter" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="50%" stopColor={beamColor.hex} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={beamColor.hex} stopOpacity="0.15" />
                </linearGradient>

                {/* Anodized housing metal gradient */}
                <linearGradient id="housingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Background optical table grid */}
              <rect x="0" y="0" width="950" height="260" fill="#020617" />
              <rect x="0" y="0" width="950" height="260" fill="url(#breadboardGrid)" />

              {/* Optical Rail Center Axis Datum */}
              <line x1="120" y1="130" x2="930" y2="130" stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" strokeWidth="1" />

              {/* Metric Scale Ruler along bottom */}
              <line x1="120" y1="230" x2="920" y2="230" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              {[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map((mult, idx) => {
                const distM = mult * Math.max(5, calculations.nohdMeters);
                return (
                  <g key={idx} transform={`translate(${120 + idx * 130}, 230)`}>
                    <line x1="0" y1="-8" x2="0" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                    <text x="0" y="16" fill="var(--color-text-muted)" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {distM.toFixed(1)}m
                    </text>
                  </g>
                );
              })}

              {/* Laser Emitter Assembly */}
              <g transform="translate(20, 95)">
                {/* Laser chassis */}
                <rect x="0" y="0" width="90" height="70" rx="3" fill="url(#housingGrad)" stroke="#475569" strokeWidth="1.5" />
                {/* Cooling fin slots */}
                <line x1="18" y1="10" x2="18" y2="60" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="28" y1="10" x2="28" y2="60" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="38" y1="10" x2="38" y2="60" stroke="#0f172a" strokeWidth="2.5" />
                {/* Brass aperture collar */}
                <rect x="90" y="22" width="12" height="26" rx="2" fill="#ca8a04" stroke="#eab308" strokeWidth="1" />
                {/* Collimator emission ring */}
                <ellipse cx="102" cy="35" rx="3" ry="8" fill="#000" stroke="#475569" strokeWidth="1" />
                {/* Emission glow dot */}
                <circle cx="102" cy="35" r="4" fill={beamColor.hex} style={{ filter: `drop-shadow(0 0 6px ${beamColor.hex})` }} />
                {/* Technical label on chassis */}
                <text x="48" y="24" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                  EMISSION APERTURE
                </text>
                <text x="48" y="38" fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                  {wavelength} nm
                </text>
                <text x="48" y="50" fill="var(--color-accent)" fontSize="7" textAnchor="middle">
                  Ø {diameter}mm • {divergence}mrad
                </text>
              </g>

              {/* Gaussian Beam Caustic Rendering */}
              {(() => {
                const originX = 122;
                const nohdPixelDist = calculations.nohdMeters > 0 
                  ? Math.min(750, Math.max(80, (calculations.nohdMeters / Math.max(5, calculations.nohdMeters * 1.4)) * 680))
                  : 0;

                const endX = 920;
                const topDivergeNOHD = calculations.nohdMeters > 0 ? 130 - (10 + (nohdPixelDist / 15)) : 130 - 30;
                const botDivergeNOHD = calculations.nohdMeters > 0 ? 130 + (10 + (nohdPixelDist / 15)) : 130 + 30;
                const topDivergeEnd = 130 - (10 + ((endX - originX) / 15));
                const botDivergeEnd = 130 + (10 + ((endX - originX) / 15));

                return (
                  <>
                    {calculations.nohdMeters > 0 ? (
                      <>
                        {/* Hazard Zone Beam Envelope (Aperture to NOHD) */}
                        <polygon
                          points={`${originX},127 ${originX + nohdPixelDist},${topDivergeNOHD} ${originX + nohdPixelDist},${botDivergeNOHD} ${originX},133`}
                          fill="url(#causticGlow)"
                          style={{ filter: `drop-shadow(0 0 10px ${beamColor.hex}80)` }}
                        />
                        {/* Core intense center ray */}
                        <polygon
                          points={`${originX},129 ${originX + nohdPixelDist},${130 - (topDivergeNOHD - 130) * 0.4} ${originX + nohdPixelDist},${130 + (botDivergeNOHD - 130) * 0.4} ${originX},131`}
                          fill="url(#causticCenter)"
                        />

                        {/* Safe Beam Extension Beyond NOHD */}
                        <polygon
                          points={`${originX + nohdPixelDist},${topDivergeNOHD} ${endX},${topDivergeEnd} ${endX},${botDivergeEnd} ${originX + nohdPixelDist},${botDivergeNOHD}`}
                          fill={beamColor.hex}
                          fillOpacity="0.08"
                          stroke={beamColor.hex}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          strokeOpacity="0.4"
                        />

                        {/* NOHD Boundary Line */}
                        <line
                          x1={originX + nohdPixelDist}
                          y1="35"
                          x2={originX + nohdPixelDist}
                          y2="225"
                          stroke="var(--color-accent)"
                          strokeWidth="2.5"
                          strokeDasharray="6 3"
                        />
                        {/* Boundary Reticle Crosshair */}
                        <circle cx={originX + nohdPixelDist} cy="130" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                        <circle cx={originX + nohdPixelDist} cy="130" r="3" fill="var(--color-accent)" />

                        {/* NOHD Dimension Caliper Line */}
                        <line x1={originX} y1="42" x2={originX + nohdPixelDist} y2="42" stroke="var(--color-primary)" strokeWidth="1.5" />
                        <line x1={originX} y1="36" x2={originX} y2="48" stroke="var(--color-primary)" strokeWidth="1.5" />
                        <line x1={originX + nohdPixelDist} y1="36" x2={originX + nohdPixelDist} y2="48" stroke="var(--color-primary)" strokeWidth="1.5" />
                        <text
                          x={originX + nohdPixelDist / 2}
                          y="34"
                          fill="var(--color-primary)"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          NOHD = {calculations.nohdMeters.toFixed(2)} m ({(calculations.nohdMeters * 3.28084).toFixed(1)} ft)
                        </text>

                        {/* Exclusion Zone Tag Badge */}
                        <g transform={`translate(${originX + nohdPixelDist / 2 - 75}, 55)`}>
                          <rect x="0" y="0" width="150" height="20" rx="3" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1" />
                          <text x="75" y="14" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                            OCULAR HAZARD (E ≥ MPE)
                          </text>
                        </g>

                        {/* Eye-Safe Zone Tag Badge */}
                        <g transform={`translate(${originX + nohdPixelDist + 40}, 55)`}>
                          <rect x="0" y="0" width="150" height="20" rx="3" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="1" />
                          <text x="75" y="14" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                            EYE-SAFE ZONE (E &lt; MPE)
                          </text>
                        </g>
                      </>
                    ) : (
                      /* Eye-Safe Beam across all distances */
                      <>
                        <polygon
                          points={`${originX},127 ${endX},${topDivergeEnd} ${endX},${botDivergeEnd} ${originX},133`}
                          fill="url(#causticGlow)"
                          opacity="0.3"
                          stroke={beamColor.hex}
                          strokeWidth="1"
                        />
                        <g transform="translate(380, 50)">
                          <rect x="0" y="0" width="260" height="26" rx="4" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="1.5" />
                          <text x="130" y="17" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                            INHERENTLY EYE-SAFE AT APERTURE (NOHD = 0)
                          </text>
                        </g>
                      </>
                    )}

                    {/* Interactive Probe Position Line */}
                    {(() => {
                      const probePixel = originX + (probeDistance / Math.max(5, calculations.nohdMeters * 1.4)) * 680;
                      if (probePixel >= originX && probePixel <= endX) {
                        return (
                          <g transform={`translate(${probePixel}, 0)`}>
                            <line x1="0" y1="35" x2="0" y2="225" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                            <circle cx="0" cy="130" r="5" fill="#38bdf8" />
                            {/* Probe Info Tooltip */}
                            <g transform="translate(-60, 160)">
                              <rect x="0" y="0" width="120" height="42" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#38bdf8" strokeWidth="1" />
                              <text x="60" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
                                PROBE @ {probeDistance.toFixed(1)}m
                              </text>
                              <text x="60" y="26" fill="#fff" fontSize="8" textAnchor="middle">
                                Beam: Ø {distanceData.probe.beamDiamMm.toFixed(1)} mm
                              </text>
                              <text x="60" y="37" fill={distanceData.probe.isSafe ? '#10b981' : '#ef4444'} fontSize="8" fontWeight="bold" textAnchor="middle">
                                {distanceData.probe.isSafe ? 'EYE SAFE' : `REQ OD ${distanceData.probe.od.toFixed(1)}`}
                              </text>
                            </g>
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Tab 2: Plotly Irradiance & Optical Density Decay Profile */}
      {activeTab === 'decay' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>Irradiance vs. Range Profile & MPE Threshold</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 15px 0' }}>
            Semi-log irradiance curve showing geometric beam dilution. The horizontal dashed red line marks the ANSI Maximum Permissible Exposure (MPE).
          </p>
          <div style={{ width: '100%', height: '400px' }}>
            <Plot
              data={[
                {
                  x: distanceData.plotX,
                  y: distanceData.plotY,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Beam Irradiance (mW/cm²)',
                  line: { color: beamColor.hex, width: 3 },
                  fill: 'tozeroy',
                  fillcolor: `${beamColor.hex}18`
                },
                {
                  x: [0, distanceData.maxGraphRange],
                  y: [calculations.mpe, calculations.mpe],
                  type: 'scatter',
                  mode: 'lines',
                  name: `MPE Limit (${calculations.mpe.toFixed(2)} mW/cm²)`,
                  line: { color: '#EF4444', width: 2, dash: 'dash' }
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Distance from Laser Aperture (meters)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { 
                  title: { text: 'Irradiance (mW/cm²)' }, 
                  type: 'log', 
                  color: '#94A3B8',
                  gridcolor: 'rgba(255,255,255,0.06)'
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 65, r: 25, t: 25, b: 65 },
                legend: { x: 0.65, y: 0.95, bgcolor: 'rgba(5, 10, 18, 0.85)', bordercolor: 'var(--color-border)', borderwidth: 1 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Eyewear OD Requirements Table */}
      {activeTab === 'eyewear' && (
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Recommended Eyewear Optical Density (OD) by Distance</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Required attenuation factor for protective safety eyewear conforming to ANSI Z136.1 and EN 207 standards.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(255, 159, 28, 0.1)', color: 'var(--color-accent)', borderRadius: '4px', border: '1px solid rgba(255, 159, 28, 0.3)', fontWeight: 'bold' }}>
              Minimum Source OD: {calculations.odRequired.toFixed(2)}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Range (m)</th>
                  <th style={{ padding: '10px' }}>Beam Spot Ø (mm)</th>
                  <th style={{ padding: '10px' }}>Irradiance (mW/cm²)</th>
                  <th style={{ padding: '10px' }}>Required OD (ANSI)</th>
                  <th style={{ padding: '10px' }}>EN 207 Rating</th>
                  <th style={{ padding: '10px' }}>Safety Classification</th>
                </tr>
              </thead>
              <tbody>
                {distanceData.tableRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: row.od > 0 ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{row.rMeters} m</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{row.beamDiamMm.toFixed(1)} mm</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: row.isSafe ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {row.irradiance.toExponential(3)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', background: row.od > 0 ? 'rgba(255, 159, 28, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: row.od > 0 ? 'var(--color-accent)' : 'var(--color-success)', border: `1px solid ${row.od > 0 ? 'rgba(255, 159, 28, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                        {row.od > 0 ? `OD ≥ ${row.od.toFixed(2)}` : 'OD 0 (Safe)'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>
                      {row.od > 0 ? `D ${wavelength} L${Math.ceil(row.od)}` : 'None required'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ color: row.isSafe ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {row.isSafe ? '● Eye-Safe' : '▲ Hazardous'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: ANSI Z136.1 Physics & Formulations */}
      {activeTab === 'physics' && (
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#fff' }}>Governing ANSI Z136.1 Mathematical Formulations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                1. Nominal Ocular Hazard Distance (NOHD)
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="\text{NOHD} = \frac{1}{\theta} \left[ \sqrt{\frac{4 P}{\pi \cdot \text{MPE}}} - a \right]" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Distance along the optical axis at which beam irradiance dilutes below the ocular Maximum Permissible Exposure (MPE).
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                2. Optical Density (OD) Requirement
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="\text{OD} = \log_{10}\left(\frac{E(r)}{\text{MPE}}\right) = \log_{10}\left(\frac{1}{T}\right)" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Logarithmic attenuation factor required of protective filter lenses to reduce transmitted irradiance below MPE.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                3. Gaussian Beam Spot Expansion w(z)
              </span>
              <div style={{ margin: '10px 0', color: '#fff' }}>
                <BlockMath math="w(z) = w_0 \sqrt{1 + \left(\frac{z}{z_R}\right)^2}, \quad z_R = \frac{\pi w_0^2}{\lambda}" />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Hyperbolic caustic envelope where spot radius w(z) expands beyond the Rayleigh diffraction range z_R.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaserModule;
