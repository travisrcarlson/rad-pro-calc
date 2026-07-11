import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

// Standard presets for Laser Safety
interface LaserPreset {
  name: string;
  wavelength: number; // nm
  power: number; // mW
  diameter: number; // mm
  divergence: number; // mrad
  mode: 'CW' | 'Pulsed';
}

const PRESETS: LaserPreset[] = [
  { name: 'Green Laser Pointer', wavelength: 532, power: 5, diameter: 1.5, divergence: 1.2, mode: 'CW' },
  { name: 'Red Laser Pointer', wavelength: 650, power: 1, diameter: 1.2, divergence: 1.0, mode: 'CW' },
  { name: 'Medical Nd:YAG', wavelength: 1064, power: 20000, diameter: 2.0, divergence: 2.0, mode: 'CW' },
  { name: 'Industrial CO₂ Cutter', wavelength: 10600, power: 100000, diameter: 5.0, divergence: 3.0, mode: 'CW' },
  { name: 'Research Ti:Sapphire', wavelength: 800, power: 500, diameter: 1.0, divergence: 1.0, mode: 'CW' },
  { name: 'UV Excimer Laser', wavelength: 248, power: 5000, diameter: 3.0, divergence: 1.5, mode: 'CW' }
];

// Helper to convert wavelength to RGB/HEX color for beam rendering
const wavelengthToColor = (nm: number): { hex: string; isVisible: boolean; name: string } => {
  if (nm < 400) {
    return { hex: '#a855f7', isVisible: false, name: 'Ultraviolet (Invisible)' }; // Ultraviolet (represented as neon purple)
  }
  if (nm > 700) {
    return { hex: '#ef4444', isVisible: false, name: 'Infrared (Invisible)' }; // Infrared (represented as deep red)
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

  // Scale intensity near edges of visibility
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

const LaserModule: React.FC = () => {
  const [wavelength, setWavelength] = useState<number>(532);
  const [power, setPower] = useState<number>(5); // in mW
  const [diameter, setDiameter] = useState<number>(1.5); // in mm
  const [divergence, setDivergence] = useState<number>(1.2); // in mrad
  const [exposureDuration, setExposureDuration] = useState<number>(0.25); // in seconds
  const [customDuration, setCustomDuration] = useState<string>('0.25');

  // Load a preset
  const applyPreset = (preset: LaserPreset) => {
    setWavelength(preset.wavelength);
    setPower(preset.power);
    setDiameter(preset.diameter);
    setDivergence(preset.divergence);
    setExposureDuration(0.25);
    setCustomDuration('0.25');
  };

  // Color matching physics
  const beamColor = useMemo(() => wavelengthToColor(wavelength), [wavelength]);

  // ANSI Calculations Engine
  const calculations = useMemo(() => {
    // 1. Calculate Ocular Maximum Permissible Exposure (MPE) in mW/cm^2
    let mpe = 1.0; // default standard

    if (wavelength >= 400 && wavelength <= 700) {
      // Visible region - Eye Blink Reflex (0.25s) vs. Long Term Accidental
      if (exposureDuration <= 0.25) {
        mpe = 2.5; // mW/cm^2
      } else if (exposureDuration <= 10) {
        mpe = 1.0; // mW/cm^2
      } else {
        // Occupational workday limit (30,000s) -> drops to microWatts/cm^2
        mpe = 1.0; // simplified visible ocular constant
      }
    } else if (wavelength >= 315 && wavelength < 400) {
      // UV-A: Eye cornea/lens hazard
      mpe = 1.0; // mW/cm^2
    } else if (wavelength >= 180 && wavelength < 315) {
      // UV-B/C: Highly photochemical cornea hazard
      mpe = 0.003; // mW/cm^2 (3.0 microWatts/cm^2)
    } else if (wavelength > 700 && wavelength <= 1400) {
      // Near-Infrared: Thermal hazard, eye focus active but no blink reflex
      // CA correction factor based on retinal absorption
      let ca = 1.0;
      if (wavelength < 1050) {
        ca = Math.pow(10, 0.002 * (wavelength - 700));
      } else {
        ca = 5.0; // standard at 1064nm and above
      }
      mpe = 1.6 * ca; // mW/cm^2 (e.g. at 1064nm, 8.0 mW/cm^2)
    } else if (wavelength > 1400) {
      // Mid/Far-Infrared: Cornea thermal absorption hazard
      mpe = 100.0; // mW/cm^2 (e.g. 10.6 micron CO2 is safe up to 100 mW/cm^2)
    }

    // 2. Unit Conversions for NOHD
    const powerW = power / 1000; // mW -> Watts
    const mpeWcm2 = mpe / 1000; // mW/cm^2 -> W/cm^2
    const diamCm = diameter / 10; // mm -> cm
    const divRad = divergence / 1000; // mrad -> rad

    // Aperture Area (cm^2)
    const apertureArea = (Math.PI * Math.pow(diamCm, 2)) / 4;
    // Irradiance at Aperture (W/cm^2)
    const irradianceAperture = powerW / apertureArea;

    // 3. Nominal Ocular Hazard Distance (NOHD)
    // NOHD = (1/div) * [ sqrt( (4*P)/(pi * MPE) ) - diameter ]
    let nohdMeters = 0;
    if (irradianceAperture > mpeWcm2) {
      const term = Math.sqrt((4 * powerW) / (Math.PI * mpeWcm2));
      const nohdCm = (term - diamCm) / divRad;
      nohdMeters = Math.max(0, nohdCm / 100);
    } else {
      nohdMeters = 0; // Already eye-safe at the aperture itself
    }

    // 4. Laser Safety Classification
    let laserClass = 'Class 1';
    let classColor = 'var(--color-success)';
    let classDescription = 'Safe under all conditions of normal use. Eye-safe.';
    let glowStyle = '0 0 10px rgba(16, 185, 129, 0.3)';

    if (wavelength >= 400 && wavelength <= 700) {
      // Visible lasers
      if (power <= 0.39) {
        laserClass = 'Class 1';
        classColor = '#10B981'; // Green
        classDescription = 'Safe under all conditions of normal use.';
        glowStyle = '0 0 15px rgba(16, 185, 129, 0.4)';
      } else if (power <= 1.0) {
        laserClass = 'Class 2';
        classColor = '#3B82F6'; // Blue
        classDescription = 'Safe for accidental exposure due to the blink reflex (0.25s). Do not stare.';
        glowStyle = '0 0 15px rgba(59, 130, 246, 0.4)';
      } else if (power <= 5.0) {
        laserClass = 'Class 3R';
        classColor = '#F59E0B'; // Amber
        classDescription = 'Marginally hazardous. Direct viewing of beam is hazardous, but risk is low.';
        glowStyle = '0 0 15px rgba(245, 158, 11, 0.4)';
      } else if (power <= 500) {
        laserClass = 'Class 3B';
        classColor = '#F97316'; // Orange
        classDescription = 'Hazardous for direct eye viewing. Diffuse reflections are generally safe. Eyewear required.';
        glowStyle = '0 0 15px rgba(249, 115, 22, 0.4)';
      } else {
        laserClass = 'Class 4';
        classColor = '#EF4444'; // Red
        classDescription = 'DANGER: Extremely hazardous. Direct beam, specular reflections, and diffuse reflections cause eye and skin burns. Fire hazard.';
        glowStyle = '0 0 20px rgba(239, 68, 68, 0.6)';
      }
    } else {
      // Invisible lasers (UV / IR) - No blink reflex!
      if (power <= 0.39) {
        laserClass = 'Class 1';
        classColor = '#10B981';
        classDescription = 'Safe under all conditions of normal use.';
        glowStyle = '0 0 15px rgba(16, 185, 129, 0.4)';
      } else if (power <= 5.0) {
        laserClass = 'Class 3R';
        classColor = '#F59E0B';
        classDescription = 'Marginally hazardous for invisible wavelengths. Eyewear highly recommended.';
        glowStyle = '0 0 15px rgba(245, 158, 11, 0.4)';
      } else if (power <= 500) {
        laserClass = 'Class 3B';
        classColor = '#F97316';
        classDescription = 'Hazardous to the eye from direct beam. Invisible beam increases risk. Eyewear mandatory.';
        glowStyle = '0 0 15px rgba(249, 115, 22, 0.4)';
      } else {
        laserClass = 'Class 4';
        classColor = '#EF4444';
        classDescription = 'DANGER: Extremely high power invisible laser. Direct and diffuse viewing causes ocular and skin burns. Eyewear mandatory.';
        glowStyle = '0 0 20px rgba(239, 68, 68, 0.6)';
      }
    }

    // 5. Eyewear Optical Density (OD) Required at Aperture
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
      classDescription,
      glowStyle,
      odRequired,
      divRad,
      diamCm,
      powerW
    };
  }, [wavelength, power, diameter, divergence, exposureDuration]);

  // Generates dynamic data for the Plotly Irradiance Chart & OD Table
  const distanceData = useMemo(() => {
    const steps = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const chartDistances = Array.from({ length: 200 }, (_, i) => 0.1 + (i * Math.max(10, calculations.nohdMeters * 1.5)) / 200);

    const calcDetails = (rMeters: number) => {
      const rCm = rMeters * 100;
      // Beam expands: D(r) = aperture_diameter + divergence * r
      const beamDiamCm = calculations.diamCm + calculations.divRad * rCm;
      const beamArea = (Math.PI * Math.pow(beamDiamCm, 2)) / 4;
      const irr = calculations.powerW / beamArea; // W/cm^2
      const irrMW = irr * 1000; // mW/cm^2
      
      const od = irrMW > calculations.mpe
        ? Math.max(0, Math.log10(irrMW / calculations.mpe))
        : 0;

      return {
        rMeters,
        beamDiamMm: beamDiamCm * 10,
        irradiance: irrMW,
        od
      };
    };

    const tableRows = steps
      .filter(step => step <= Math.max(100, calculations.nohdMeters * 2))
      .map(step => calcDetails(step));

    const plotX = chartDistances;
    const plotY = chartDistances.map(r => calcDetails(r).irradiance);

    return { tableRows, plotX, plotY };
  }, [calculations]);

  return (
    <div className="laser-module">
      <div className="panel-header">
        <h2>⚡ Laser Radiation Safety & NOHD Calculator</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Assess non-ionizing optical hazards, define ocular exclusion zones (NOHD), and calculate protective eyewear requirements (ANSI Z136.1).
        </p>
      </div>

      {/* Preset Fast Picker */}
      <div className="panel" style={{ padding: '15px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Quick Presets
        </h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {PRESETS.map((preset) => (
            <button 
              key={preset.name}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(22, 36, 56, 0.8)', color: '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
              onClick={() => applyPreset(preset)}
            >
              {preset.name} ({preset.wavelength}nm)
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Input Parameters Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>Laser System Parameters</h3>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Laser Wavelength (λ)</label>
              <span style={{ fontSize: '0.9rem', color: beamColor.hex, fontWeight: 'bold' }}>
                {wavelength} nm ({beamColor.name})
              </span>
            </div>
            <input 
              type="range" 
              min="180" 
              max="11000" 
              value={wavelength} 
              className="form-control"
              style={{ width: '100%', accentColor: beamColor.hex, background: '#111827', margin: '8px 0' }}
              onChange={(e) => setWavelength(Number(e.target.value))}
            />
            <input
              type="number"
              className="form-control"
              value={wavelength}
              onChange={(e) => setWavelength(Math.max(180, Math.min(100000, Number(e.target.value))))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Beam Power (P)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ flex: 1 }}
                value={power}
                min="0.01"
                step="any"
                onChange={(e) => setPower(Math.max(0.01, Number(e.target.value)))}
              />
              <span style={{ color: 'var(--color-text-muted)', width: '40px' }}>mW</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              ({power >= 1000 ? `${(power / 1000).toFixed(2)} W` : `${power} mW`})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Beam Waist Diameter (a)</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={diameter}
                  min="0.1"
                  step="0.1"
                  onChange={(e) => setDiameter(Math.max(0.1, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>mm</span>
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Beam Divergence (θ)</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="form-control"
                  value={divergence}
                  min="0.1"
                  step="0.1"
                  onChange={(e) => setDivergence(Math.max(0.1, Number(e.target.value)))}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>mrad</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Exposure Duration (T)</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button 
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 8px', background: exposureDuration === 0.25 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: exposureDuration === 0.25 ? '#000' : '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
                onClick={() => { setExposureDuration(0.25); setCustomDuration('0.25'); }}
              >
                0.25s (Blink)
              </button>
              <button 
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 8px', background: exposureDuration === 10 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: exposureDuration === 10 ? '#000' : '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
                onClick={() => { setExposureDuration(10); setCustomDuration('10'); }}
              >
                10s (Accidental)
              </button>
              <button 
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 8px', background: exposureDuration === 600 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: exposureDuration === 600 ? '#000' : '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
                onClick={() => { setExposureDuration(600); setCustomDuration('600'); }}
              >
                10m (Extended)
              </button>
              <button 
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 8px', background: exposureDuration === 30000 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', color: exposureDuration === 30000 ? '#000' : '#fff', border: '1px solid var(--color-border)', boxShadow: 'none' }}
                onClick={() => { setExposureDuration(30000); setCustomDuration('30000'); }}
              >
                8hr (Workday)
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-control"
                style={{ flex: 1 }}
                value={customDuration}
                min="0.001"
                onChange={(e) => {
                  setCustomDuration(e.target.value);
                  const val = Number(e.target.value);
                  if (val > 0) setExposureDuration(val);
                }}
              />
              <span style={{ color: 'var(--color-text-muted)' }}>seconds</span>
            </div>
          </div>
        </div>

        {/* Hazard Classification & Assessment Panel */}
        <div className="panel" style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3>Laser Hazard Assessment</h3>
            
            {/* Classification Display */}
            <div 
              style={{ 
                marginTop: '15px', 
                padding: '20px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(5, 10, 18, 0.4)',
                border: `2px solid ${calculations.classColor}`,
                boxShadow: calculations.glowStyle,
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                ANSI Hazard Classification
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: calculations.classColor, textShadow: `0 0 10px ${calculations.classColor}66` }}>
                {calculations.laserClass}
              </div>
              <p style={{ fontSize: '0.9rem', color: '#fff', marginTop: '10px', lineHeight: '1.4' }}>
                {calculations.classDescription}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Ocular MPE Limit:</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>
                {calculations.mpe.toFixed(4)} mW/cm²
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Aperture Irradiance (E₀):</span>
              <span style={{ fontWeight: 'bold', color: calculations.irradianceAperture * 1000 > calculations.mpe ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {(calculations.irradianceAperture * 1000).toExponential(3)} mW/cm²
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Required Eyewear OD (at source):</span>
              <span 
                style={{ 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem',
                  color: calculations.odRequired > 0 ? 'var(--color-accent)' : 'var(--color-success)',
                  textShadow: calculations.odRequired > 0 ? 'var(--neon-glow-accent)' : 'none'
                }}
              >
                {calculations.odRequired > 0 ? `OD ${calculations.odRequired.toFixed(2)}` : 'No Protection Needed'}
              </span>
            </div>

            {/* NOHD Core Result */}
            <div style={{ marginTop: '10px', padding: '15px', borderRadius: '6px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Nominal Ocular Hazard Distance (NOHD)
                </h4>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginTop: '5px' }}>
                  {calculations.nohdMeters > 0 
                    ? `${calculations.nohdMeters.toFixed(2)} meters` 
                    : '0 meters (Eye-Safe)'}
                </div>
                {calculations.nohdMeters > 0 && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    ({(calculations.nohdMeters * 3.28084).toFixed(1)} feet ocular exclusion zone)
                  </span>
                )}
              </div>
              <span style={{ fontSize: '2rem' }}>🔦</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Beam Profile Renderer */}
      <div className="panel" style={{ overflowX: 'auto' }}>
        <h3>Interactive Laser Beam & Hazard Exclusion Zone</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
          Schematic visualization showing optical divergence and spatial hazard boundary. The yellow line represents the NOHD.
        </p>

        <div style={{ minWidth: '800px', background: '#030712', borderRadius: '8px', padding: '20px', border: '1px solid var(--color-border)', position: 'relative' }}>
          <svg viewBox="0 0 800 200" style={{ width: '100%', height: 'auto' }}>
            <defs>
              {/* Glowing gradients */}
              <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={beamColor.hex} stopOpacity="1" />
                <stop offset="80%" stopColor={beamColor.hex} stopOpacity="0.4" />
                <stop offset="100%" stopColor={beamColor.hex} stopOpacity="0" />
              </linearGradient>

              <radialGradient id="apertureGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="50%" stopColor={beamColor.hex} stopOpacity="0.8" />
                <stop offset="100%" stopColor={beamColor.hex} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="300" y1="20" x2="300" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="500" y1="20" x2="500" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="700" y1="20" x2="700" y2="180" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

            {/* Labels */}
            <text x="100" y="195" fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">0.5 NOHD</text>
            <text x="300" y="195" fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">NOHD</text>
            <text x="500" y="195" fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">1.5 NOHD</text>
            <text x="700" y="195" fill="var(--color-text-muted)" fontSize="10" textAnchor="middle">2.0 NOHD</text>

            {/* Laser Aperture Device */}
            <rect x="10" y="75" width="40" height="50" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <rect x="50" y="88" width="10" height="24" rx="2" fill="#334155" />
            
            {/* Glowing Aperture Point */}
            <circle cx="58" cy="100" r="10" fill="url(#apertureGlow)" />

            {calculations.nohdMeters > 0 ? (
              <>
                {/* Laser Beam Shape (Hazard Zone) */}
                <polygon 
                  points="58,98 300,75 300,125 58,102" 
                  fill="url(#beamGrad)" 
                  style={{ filter: 'drop-shadow(0px 0px 8px ' + beamColor.hex + ')' }} 
                />

                {/* Safe Beam Extension Beyond NOHD */}
                <polygon 
                  points="300,75 750,55 750,145 300,125" 
                  fill={beamColor.hex}
                  fillOpacity="0.08"
                  stroke={beamColor.hex}
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />

                {/* Exclusion Zone Box (Red Overlay) */}
                <rect x="58" y="20" width="242" height="160" fill="rgba(239, 68, 68, 0.08)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
                <text x="179" y="38" fill="#EF4444" fontSize="12" fontWeight="bold" textAnchor="middle">🔴 OCULAR HAZARD ZONE</text>

                {/* Safe Zone Box (Green Overlay) */}
                <rect x="300" y="20" width="450" height="160" fill="rgba(16, 185, 129, 0.05)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                <text x="525" y="38" fill="#10B981" fontSize="12" fontWeight="bold" textAnchor="middle">🟢 EYE SAFE ZONE</text>

                {/* NOHD Intersect Boundary line */}
                <line x1="300" y1="20" x2="300" y2="180" stroke="var(--color-accent)" strokeWidth="3" />
                <circle cx="300" cy="100" r="6" fill="var(--color-accent)" style={{ filter: 'drop-shadow(0 0 5px var(--color-accent))' }} />
                
                {/* Threat Indicators */}
                {/* Retinal Danger Icon inside Hazard Zone */}
                <g transform="translate(170, 90)">
                  <circle cx="10" cy="10" r="14" fill="#EF4444" />
                  <text x="10" y="14" fill="#000" fontSize="13" fontWeight="bold" textAnchor="middle">⚠️</text>
                </g>
                <text x="180" y="125" fill="#EF4444" fontSize="10" textAnchor="middle">Retina Hazard</text>

                {/* Safe Goggles Icon in Safe Zone */}
                <g transform="translate(515, 90)">
                  <circle cx="10" cy="10" r="14" fill="#10B981" />
                  <text x="10" y="14" fill="#000" fontSize="13" textAnchor="middle">👓</text>
                </g>
                <text x="525" y="125" fill="#10B981" fontSize="10" textAnchor="middle">Safe to View</text>
              </>
            ) : (
              <>
                {/* 100% Safe Low Power Beam */}
                <polygon 
                  points="58,98 750,75 750,125 58,102" 
                  fill={beamColor.hex}
                  fillOpacity="0.15"
                  stroke={beamColor.hex}
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0px 0px 4px ' + beamColor.hex + ')' }} 
                />
                <rect x="58" y="20" width="692" height="160" fill="rgba(16, 185, 129, 0.05)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                <text x="404" y="38" fill="#10B981" fontSize="14" fontWeight="bold" textAnchor="middle">🟢 EYE SAFE AT ALL DISTANCES (NOHD = 0)</text>
              </>
            )}
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Plotly Analytical Chart */}
        <div className="panel" style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Irradiance vs. Range Profile</h3>
          <div style={{ width: '100%', marginTop: '15px' }}>
            <Plot
              data={[
                {
                  x: distanceData.plotX,
                  y: distanceData.plotY,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Irradiance',
                  line: { color: beamColor.hex, width: 3 },
                  fill: 'tozeroy',
                  fillcolor: `${beamColor.hex}15`
                },
                {
                  x: [0, Math.max(10, calculations.nohdMeters * 1.5)],
                  y: [calculations.mpe, calculations.mpe],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Ocular MPE Limit',
                  line: { color: '#EF4444', width: 2, dash: 'dash' }
                }
              ] as any}
              layout={{
                autosize: true,
                xaxis: { title: { text: 'Distance from Laser (meters)' }, color: '#94A3B8', gridcolor: 'rgba(255,255,255,0.05)' },
                yaxis: { 
                  title: { text: 'Irradiance (mW/cm²)' }, 
                  type: 'log', 
                  color: '#94A3B8',
                  gridcolor: 'rgba(255,255,255,0.05)'
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 20, b: 60 },
                legend: { x: 0.7, y: 0.9, bgcolor: 'rgba(5, 10, 18, 0.8)' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '380px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>

        {/* Optical Density Requirements Table */}
        <div className="panel" style={{ flex: '1 1 400px' }}>
          <h3>Eyewear OD Requirements</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Recommended minimum filter attenuation (Optical Density, OD) required at varying workspace distances.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 5px', color: 'var(--color-primary)' }}>Range (m)</th>
                <th style={{ padding: '10px 5px', color: 'var(--color-primary)' }}>Beam Size (mm)</th>
                <th style={{ padding: '10px 5px', color: 'var(--color-primary)' }}>Irradiance</th>
                <th style={{ padding: '10px 5px', color: 'var(--color-primary)' }}>Req. OD</th>
              </tr>
            </thead>
            <tbody>
              {distanceData.tableRows.map((row, index) => (
                <tr 
                  key={index} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    backgroundColor: row.od > 0 ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '10px 5px', fontWeight: 'bold' }}>{row.rMeters} m</td>
                  <td style={{ padding: '10px 5px' }}>{row.beamDiamMm.toFixed(1)} mm</td>
                  <td style={{ padding: '10px 5px' }}>
                    {row.irradiance.toExponential(2)} mW/cm²
                  </td>
                  <td style={{ padding: '10px 5px' }}>
                    <span 
                      style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        backgroundColor: row.od > 0 ? 'rgba(255, 159, 28, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: row.od > 0 ? 'var(--color-accent)' : 'var(--color-success)',
                        border: `1px solid ${row.od > 0 ? 'rgba(255, 159, 28, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}
                    >
                      {row.od > 0 ? `OD ${row.od.toFixed(2)}` : 'Safe'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Reference & Standards panel */}
      <div className="panel">
        <h3>Laser Safety Principles & ANSI Standard Definitions</h3>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: '15px' }}>
          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>What is the MPE?</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              The <strong>Maximum Permissible Exposure (MPE)</strong> is the level of laser radiation to which a person may be exposed without hazardous effects or biological changes in the eye or skin. It is determined by the laser's wavelength, pulse profile (if any), and duration of exposure.
            </p>
          </div>
          
          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>What is the NOHD?</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              The <strong>Nominal Ocular Hazard Distance (NOHD)</strong> defines the critical boundaries of the ocular exclusion zone. Within this range, direct beam exposure exceeds the ocular MPE, requiring mandatory eye protection (safety glasses). Beyond the NOHD, the beam diameter has diverged sufficiently to dilute irradiance below the hazard threshold.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px' }}>Control Measures & OD Specs</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              For **Class 3B** and **Class 4** lasers, standard safety eyewear must be marked with the correct **Optical Density (OD)** matching the laser wavelength. Safety interlocks, beam dumps, warning lights, and laser warning signs are mandatory engineering controls required under OSHA and ANSI Z136 regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaserModule;
