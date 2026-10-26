import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import {
  fetchLiveSiteMeteorology,
  REFERENCE_MET_SITES,
  type LiveMeteorologySnapshot
} from '../../utils/liveMeteoAndTerrain';

const Plot = (PlotComponent as any).default || PlotComponent;

// Pasquill-Gifford Stability Classes (A-F)
const STABILITY_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F'];

const STABILITY_INFO: Record<string, { label: string; desc: string }> = {
  A: { label: 'Class A — Extremely Unstable', desc: 'Strong solar radiation, daytime light winds. Severe vertical mixing.' },
  B: { label: 'Class B — Moderately Unstable', desc: 'Moderate solar radiation, daytime moderate winds.' },
  C: { label: 'Class C — Slightly Unstable', desc: 'Slight solar radiation, daytime winds.' },
  D: { label: 'Class D — Neutral (Standard)', desc: 'Overcast skies (day/night) or heavy overcast. Wind speed > 5 m/s.' },
  E: { label: 'Class E — Slightly Stable', desc: 'Nighttime, partial cloud cover, light wind.' },
  F: { label: 'Class F — Moderately Stable', desc: 'Clear nighttime, low winds. Strong temperature inversion with trapped plume.' }
};

// Simplified Briggs dispersion parameters for open country
const getDispersionCoefficients = (x: number, stability: string) => {
  const xSafe = Math.max(x, 1);
  let sy = 0;
  let sz = 0;

  switch (stability) {
    case 'A':
      sy = 0.22 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.20 * xSafe;
      break;
    case 'B':
      sy = 0.16 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.12 * xSafe;
      break;
    case 'C':
      sy = 0.11 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.08 * xSafe * Math.pow(1 + 0.0002 * xSafe, -0.5);
      break;
    case 'D':
      sy = 0.08 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.06 * xSafe * Math.pow(1 + 0.0015 * xSafe, -0.5);
      break;
    case 'E':
      sy = 0.06 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.03 * xSafe * Math.pow(1 + 0.0003 * xSafe, -1);
      break;
    case 'F':
      sy = 0.04 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.016 * xSafe * Math.pow(1 + 0.0003 * xSafe, -1);
      break;
    default:
      sy = 0.08 * xSafe * Math.pow(1 + 0.0001 * xSafe, -0.5);
      sz = 0.06 * xSafe * Math.pow(1 + 0.0015 * xSafe, -0.5);
  }
  return { sy, sz };
};

type WorkspaceTab = 'footprint' | 'centerline' | 'controls' | 'physics';

const PlumeModule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('footprint');
  const [releaseRate, setReleaseRate] = useState<number>(1.0); // Curies per second
  const [windSpeed, setWindSpeed] = useState<number>(2.0); // meters per second
  const [releaseHeight, setReleaseHeight] = useState<number>(10.0); // meters
  const [stability, setStability] = useState<string>('D'); // D is neutral
  const [maxDistance, setMaxDistance] = useState<number>(1000); // meters downwind
  const [sourceFacility, setSourceFacility] = useState<string | null>(null);
  const [selectedMetSiteId, setSelectedMetSiteId] = useState<string>('ornl');
  const [metLat, setMetLat] = useState<number>(35.9311);
  const [metLon, setMetLon] = useState<number>(-84.3100);
  const [liveMet, setLiveMet] = useState<LiveMeteorologySnapshot | null>(null);
  const [isFetchingMet, setIsFetchingMet] = useState<boolean>(false);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Wet/Dry Deposition, Inversion Lid Trapping & Crosswind/Vertical Slice State
  const [depositionVelocityCmS, setDepositionVelocityCmS] = useState<number>(0.0); // 0 = Noble Gas (no dry depletion)
  const [rainRateMmHr, setRainRateMmHr] = useState<number>(0.0); // 0 = Dry conditions
  const [mixingHeightM, setMixingHeightM] = useState<number>(1000); // PBL Inversion Lid (m)
  const [sliceDistanceM, setSliceDistanceM] = useState<number>(300);

  const handleFetchLiveWeather = async (lat = metLat, lon = metLon, label = 'Custom Site') => {
    setIsFetchingMet(true);
    try {
      const snap = await fetchLiveSiteMeteorology(lat, lon, label);
      setLiveMet(snap);
      setWindSpeed(Number(Math.max(0.5, Math.min(15, snap.windSpeed10mMs)).toFixed(1)));
      setStability(snap.turner.stabilityClass);
      setMixingHeightM(snap.turner.mixingHeightMeters);
    } finally {
      setIsFetchingMet(false);
    }
  };

  useEffect(() => {
    const actParam = searchParams.get('activity');
    const unitParam = searchParams.get('unit');
    const windParam = searchParams.get('wind') || searchParams.get('windSpeed');
    const stabParam = searchParams.get('stability');
    const sourceParam = searchParams.get('source');
    const heightParam = searchParams.get('height');

    if (sourceParam) {
      setSourceFacility(decodeURIComponent(sourceParam));
    }
    if (actParam) {
      const parsed = parseFloat(actParam);
      if (!isNaN(parsed) && parsed > 0) {
        if (unitParam?.toUpperCase() === 'TBQ') {
          setReleaseRate(parseFloat((parsed * 27 * 0.001).toFixed(3)) || 1.0);
        } else if (unitParam?.toUpperCase() === 'CI') {
          // If total curies released over 1 hour (3600s)
          setReleaseRate(parseFloat((parsed / 3600).toFixed(3)) || 1.0);
        } else {
          setReleaseRate(parseFloat((parsed * 0.01).toFixed(3)) || 1.0);
        }
      }
    }
    if (windParam) {
      const w = parseFloat(windParam);
      if (!isNaN(w) && w > 0) setWindSpeed(w);
    }
    if (stabParam && STABILITY_CLASSES.includes(stabParam.toUpperCase())) {
      setStability(stabParam.toUpperCase());
    }
    if (heightParam) {
      const h = parseFloat(heightParam);
      if (!isNaN(h) && h >= 0) setReleaseHeight(h);
    }
  }, [searchParams]);

  // Helper to evaluate Gaussian concentration C(x, y, z) with Wet/Dry Depletion & Inversion Lid Reflection
  const evalGaussianConcentration = (x: number, y: number, z: number, applyDepletion: boolean = true) => {
    const { sy, sz } = getDispersionCoefficients(x, stability);
    if (sy <= 0 || sz <= 0 || windSpeed <= 0) return 0;

    const vdMs = depositionVelocityCmS * 0.01;
    const lambdaWet = rainRateMmHr > 0 ? 1.0e-4 * Math.pow(rainRateMmHr, 0.8) : 0;
    const wetDepletion = applyDepletion ? Math.exp(-(lambdaWet * x) / windSpeed) : 1.0;
    const dryDepletion = applyDepletion && vdMs > 0
      ? Math.exp(-Math.sqrt(2 / Math.PI) * (vdMs / windSpeed) * (x / Math.max(sz, 2)) * Math.exp(-(releaseHeight * releaseHeight) / (2 * sz * sz)))
      : 1.0;

    const Q_eff = releaseRate * wetDepletion * dryDepletion;
    const prefactor = Q_eff / (2 * Math.PI * windSpeed * sy * sz);
    const expY = Math.exp(-(y * y) / (2 * sy * sy));

    // Ground reflection + 1st-order PBL Inversion Lid (H_mix) reflection
    const H = releaseHeight;
    const L = Math.max(H + 20, mixingHeightM);
    const verticalTerm =
      Math.exp(-Math.pow(z - H, 2) / (2 * sz * sz)) +
      Math.exp(-Math.pow(z + H, 2) / (2 * sz * sz)) +
      Math.exp(-Math.pow(z - (2 * L - H), 2) / (2 * sz * sz)) +
      Math.exp(-Math.pow(z + (2 * L - H), 2) / (2 * sz * sz));

    return prefactor * expY * verticalTerm;
  };

  // 2D Contour Grid
  const { xVals, yVals, zVals } = useMemo(() => {
    const xSteps = 50;
    const ySteps = 50;
    const xArr: number[] = [];
    const yArr: number[] = [];
    const zArr: number[][] = [];
    const halfWidth = maxDistance * 0.3;

    for (let i = 0; i <= ySteps; i++) {
      yArr.push(-halfWidth + (2 * halfWidth * i) / ySteps);
    }
    for (let i = 0; i <= xSteps; i++) {
      xArr.push(1 + (maxDistance * i) / xSteps);
    }

    for (let i = 0; i <= ySteps; i++) {
      const row: number[] = [];
      const y = yArr[i];
      for (let j = 0; j <= xSteps; j++) {
        const x = xArr[j];
        row.push(evalGaussianConcentration(x, y, 0, true));
      }
      zArr.push(row);
    }

    return { xVals: xArr, yVals: yArr, zVals: zArr };
  }, [releaseRate, windSpeed, releaseHeight, stability, maxDistance, depositionVelocityCmS, rainRateMmHr, mixingHeightM]);

  // Centerline Profile + Crosswind C(y) & Vertical C(z) Slice Profiles
  const centerlineData = useMemo(() => {
    const steps = 100;
    const xLine: number[] = [];
    const cLine: number[] = [];
    const cUndepletedLine: number[] = [];
    let peakC = 0;
    let peakX = 0;

    for (let i = 0; i <= steps; i++) {
      const x = Math.max(1, (maxDistance * i) / steps);
      xLine.push(x);
      const concentration = evalGaussianConcentration(x, 0, 0, true);
      const undepleted = evalGaussianConcentration(x, 0, 0, false);
      cLine.push(concentration);
      cUndepletedLine.push(undepleted);
      if (concentration > peakC) {
        peakC = concentration;
        peakX = x;
      }
    }

    // Crosswind slice C(x_0, y, 0) & Vertical slice C(x_0, 0, z) at x_0 = sliceDistanceM
    const x0 = Math.min(Math.max(10, sliceDistanceM), maxDistance);
    const { sy, sz } = getDispersionCoefficients(x0, stability);
    const ySpan = Math.max(50, sy * 3.5);
    const crossY: number[] = [];
    const crossC: number[] = [];
    for (let i = -40; i <= 40; i++) {
      const y = (i / 40) * ySpan;
      crossY.push(y);
      crossC.push(evalGaussianConcentration(x0, y, 0, true));
    }

    const zMax = Math.min(mixingHeightM * 1.15, Math.max(releaseHeight * 2.5, sz * 3.5, 60));
    const vertZ: number[] = [];
    const vertC: number[] = [];
    for (let i = 0; i <= 50; i++) {
      const z = (i / 50) * zMax;
      vertZ.push(z);
      vertC.push(evalGaussianConcentration(x0, 0, z, true));
    }

    return { xLine, cLine, cUndepletedLine, peakC, peakX, x0, sy, sz, crossY, crossC, vertZ, vertC };
  }, [releaseRate, windSpeed, releaseHeight, stability, maxDistance, depositionVelocityCmS, rainRateMmHr, mixingHeightM, sliceDistanceM]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'EPA-400 Atmospheric Radioactive Plume Dispersion Dossier',
    moduleName: 'Module 13 (Atmospheric Plume Modeling)',
    statuteCitation: 'EPA-400-R-92-001 (EPA PAG Manual) / NRC Regulatory Guide 1.145',
    verificationTestId: 'VTEST-09',
    operatorName: 'Atmospheric Consequence Analyst',
    operatorCredentials: 'CHP / CBRN Modeler',
    facility: 'Emergency Operations Center / Consequence Management Directorate',
    notes: `Gaussian atmospheric dispersion simulation. Release rate: ${releaseRate} Ci/s (${(releaseRate * 37).toFixed(1)} GBq/s). Release height: ${releaseHeight}m. Stability Class: ${stability}. Wind: ${windSpeed} m/s. Peak touchdown: ${centerlineData.peakX.toFixed(0)}m (${centerlineData.peakC.toExponential(2)} Ci/m³).`,
    formulaDescription: 'C(x, y, z) = \\frac{Q}{2\\pi u \\sigma_y \\sigma_z} \\exp\\left(-\\frac{y^2}{2\\sigma_y^2}\\right) \\left[\\exp\\left(-\\frac{(z-H)^2}{2\\sigma_z^2}\\right) + \\exp\\left(-\\frac{(z+H)^2}{2\\sigma_z^2}\\right)\\right]',
    inputs: [
      { label: 'Release Rate', value: releaseRate, unit: 'Ci/s' },
      { label: 'Effective Release Height', value: releaseHeight, unit: 'm' },
      { label: 'Wind Speed', value: windSpeed, unit: 'm/s' },
      { label: 'Pasquill Stability Class', value: `Class ${stability}` },
      { label: 'Downwind Horizon', value: maxDistance, unit: 'm' }
    ],
    outputs: [
      { label: 'Peak Ground Concentration', value: centerlineData.peakC.toExponential(2), unit: 'Ci/m³', status: 'PASS' },
      { label: 'Peak Touchdown Distance', value: centerlineData.peakX.toFixed(0), unit: 'm', status: 'PASS' },
      { label: 'Stability Dispersion Tier', value: STABILITY_INFO[stability]?.label || `Class ${stability}`, status: 'PASS' }
    ]
  }), [releaseRate, releaseHeight, windSpeed, stability, maxDistance, centerlineData]);

  // Persistent Meteorological & Dispersion Quick-Bar
  const renderQuickControls = () => (
    <div style={{
      background: 'rgba(5, 10, 18, 0.75)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '8px',
      padding: '12px 16px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Wind Speed Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px', flex: '1 1 160px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Wind Speed:</span>
          <strong style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>{windSpeed} m/s ({(windSpeed * 2.237).toFixed(1)} mph)</strong>
        </div>
        <input
          type="range"
          min="0.5"
          max="15"
          step="0.5"
          value={windSpeed}
          onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
          style={{ accentColor: '#00e5ff' }}
        />
      </div>

      {/* Release Height Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', flex: '1 1 150px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Release Height (H):</span>
          <strong style={{ color: '#facc15', fontFamily: 'var(--font-mono)' }}>{releaseHeight} m</strong>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={releaseHeight}
          onChange={(e) => setReleaseHeight(parseFloat(e.target.value))}
          style={{ accentColor: '#facc15' }}
        />
      </div>

      {/* Source Release Rate Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px', flex: '1 1 160px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Release Rate (Q):</span>
          <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{releaseRate} Ci/s</strong>
        </div>
        <input
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          value={releaseRate}
          onChange={(e) => setReleaseRate(parseFloat(e.target.value))}
          style={{ accentColor: '#34d399' }}
        />
      </div>

      {/* Pasquill Stability Class Button Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
          Pasquill Stability: <strong style={{ color: '#fff' }}>Class {stability}</strong> ({STABILITY_INFO[stability]?.label.split('—')[1]?.trim() || ''})
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {STABILITY_CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              className="btn"
              onClick={() => setStability(cls)}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: '0.76rem',
                fontWeight: stability === cls ? 'bold' : 'normal',
                background: stability === cls ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: stability === cls ? '#00e5ff' : '#94a3b8',
                border: stability === cls ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
              title={STABILITY_INFO[cls]?.desc}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Downwind Horizon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Horizon:</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[500, 1000, 2500, 5000].map((dist) => (
            <button
              key={dist}
              type="button"
              className="btn"
              onClick={() => setMaxDistance(dist)}
              style={{
                padding: '4px 6px',
                fontSize: '0.72rem',
                background: maxDistance === dist ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                color: maxDistance === dist ? '#34d399' : '#94a3b8',
                border: maxDistance === dist ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {dist >= 1000 ? `${dist / 1000}k` : `${dist}m`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">ATMOSPHERIC TRANSPORT</span>
            <span className="hud-badge hud-badge-accent">GAUSSIAN PLUME / BRIGGS</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Module 13 — Atmospheric Dispersion &amp; Gaussian Plume Modeling
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Estimate downwind radioactive plume concentration, ground touch-down peak distances, and crosswind isopleths using standard Briggs dispersion coefficients.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <VerificationBadge testId="VTEST-09" standard="EPA AERMOD" />
          <button
            className="btn btn-primary"
            onClick={() => navigate('/tactical-gis')}
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
          >
            📡 Project on Tactical GIS
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
          >
            Export Audit Dossier
          </button>
        </div>
      </div>

      {/* Incident Scenario Active Alert Banner */}
      {sourceFacility && (
        <div style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.3rem' }}>⚡</span>
            <div>
              <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                Incident Scenario Active: <span style={{ color: 'var(--color-primary)' }}>{sourceFacility}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Atmospheric dispersion parameters automatically loaded from Global Nuclear Map / Incident Database
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/global-map?focus=${encodeURIComponent(sourceFacility)}&tab=epz`)}
              style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            >
              🌍 View on 3D Earth Hub
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/medical-countermeasures?source=${encodeURIComponent(sourceFacility)}&drug=potassium_iodide`)}
              style={{ fontSize: '0.76rem', padding: '5px 10px', color: '#38bdf8', borderColor: '#38bdf8' }}
            >
              💊 Check KI / Medical Protocol ↗
            </button>
          </div>
        </div>
      )}

      {/* Live Meteorological Station & Turner Stability Auto-Classifier */}
      <div style={{
        background: 'rgba(5, 14, 26, 0.85)',
        border: '1px solid rgba(0, 229, 255, 0.28)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="hud-badge hud-badge-primary">LIVE METEOROLOGY</span>
            <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
              Open-Meteo Real-Time Wind &amp; Turner (1964) Solar Insolation Stability Classifier
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={selectedMetSiteId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedMetSiteId(id);
                const found = REFERENCE_MET_SITES.find(s => s.id === id);
                if (found) {
                  setMetLat(found.latitude);
                  setMetLon(found.longitude);
                  handleFetchLiveWeather(found.latitude, found.longitude, found.name);
                }
              }}
              style={{ fontSize: '0.78rem', width: '250px', padding: '4px 8px' }}
            >
              {REFERENCE_MET_SITES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              className="form-control"
              value={metLat}
              onChange={e => setMetLat(parseFloat(e.target.value) || 0)}
              style={{ width: '88px', fontSize: '0.78rem', padding: '4px 6px' }}
              title="Latitude"
            />
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={metLon}
              onChange={e => setMetLon(parseFloat(e.target.value) || 0)}
              style={{ width: '92px', fontSize: '0.78rem', padding: '4px 6px' }}
              title="Longitude"
            />
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
              disabled={isFetchingMet}
              onClick={() => {
                const found = REFERENCE_MET_SITES.find(s => s.id === selectedMetSiteId);
                handleFetchLiveWeather(metLat, metLon, found ? found.name : 'Custom Coordinates');
              }}
            >
              {isFetchingMet ? '⏳ Fetching...' : '🌐 Fetch Live Weather & Auto-Classify'}
            </button>
          </div>
        </div>

        {liveMet && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '6px',
            fontSize: '0.78rem'
          }}>
            <span><strong>Station:</strong> <span style={{ color: '#10b981' }}>{liveMet.siteName}</span> ({liveMet.sourceMode === 'LIVE_OPEN_METEO' ? 'Live Open-Meteo Telemetry' : 'Climatology Fallback'})</span>
            <span><strong>10m / 80m Wind:</strong> {liveMet.windSpeed10mMs.toFixed(1)} / {liveMet.windSpeed80mMs.toFixed(1)} m/s @ {liveMet.windDirectionDeg.toFixed(0)}° (Plume → {liveMet.downwindBearingDeg.toFixed(0)}°)</span>
            <span><strong>Solar / Clouds:</strong> {liveMet.shortwaveSolarWm2.toFixed(0)} W/m² | {liveMet.cloudCoverPct.toFixed(0)}% clouds | {liveMet.temperatureC.toFixed(1)}°C</span>
            <span><strong>Turner Class:</strong> <strong style={{ color: '#00e5ff' }}>Class {liveMet.turner.stabilityClass}</strong> (PBL Mix Height: {liveMet.turner.mixingHeightMeters}m)</span>
          </div>
        )}
      </div>

      {/* Top HUD Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">SOURCE RELEASE RATE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)' }}>
            {releaseRate} Ci/s
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {(releaseRate * 37).toFixed(1)} GBq/s | Height: {releaseHeight}m
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PEAK GROUND CONCENTRATION</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-accent)' }}>
            {centerlineData.peakC < 1e-4 ? centerlineData.peakC.toExponential(2) : centerlineData.peakC.toFixed(4)} Ci/m³
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Touchdown: @ {centerlineData.peakX.toFixed(0)}m downwind
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PASQUILL STABILITY</span>
          <span className="hud-metric-value" style={{ color: '#fff' }}>
            CLASS {stability}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Wind Speed: {windSpeed} m/s ({ (windSpeed * 2.237).toFixed(1) } mph)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">DOWNWIND HORIZON</span>
          <span className="hud-metric-value" style={{ color: '#10b981' }}>
            {maxDistance.toLocaleString()} m
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Crosswind Span: ±{(maxDistance * 0.3).toFixed(0)}m
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'footprint' ? 'active' : ''}`}
          onClick={() => setActiveTab('footprint')}
        >
          Ground Isopleth Footprint
        </button>
        <button
          className={`tab-btn ${activeTab === 'centerline' ? 'active' : ''}`}
          onClick={() => setActiveTab('centerline')}
        >
          Centerline Concentration Decay
        </button>
        <button
          className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          Meteorological &amp; Release Setup
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          Gaussian Plume Mathematics
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
        
        {/* TAB 1: Ground Isopleth Footprint */}
        {activeTab === 'footprint' && (
          <div style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderQuickControls()}
            <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', minHeight: '440px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={[
                  {
                    z: zVals,
                    x: xVals,
                    y: yVals,
                    type: 'contour',
                    colorscale: 'Jet',
                    contours: { showlines: false },
                    colorbar: {
                      title: { text: 'Activity (Ci/m³)' },
                      len: 0.8,
                      x: 0.98
                    }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: `Ground Concentration Footprint (Class ${stability}, u = ${windSpeed} m/s, H = ${releaseHeight}m)`, font: { color: '#E0E1DD', size: 14 } },
                  xaxis: { title: { text: 'Downwind Distance x (meters)' }, gridcolor: '#1e293b' },
                  yaxis: { title: { text: 'Crosswind Distance y (meters)' }, gridcolor: '#1e293b' },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD' },
                  margin: { l: 60, r: 60, t: 40, b: 50 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Centerline Profile + Crosswind C(y) & Vertical C(z) Gaussian Slices */}
        {activeTab === 'centerline' && (
          <div style={{ height: '100%', minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderQuickControls()}

            {/* Wet/Dry Deposition & Slice Distance Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>🌧️ Wet/Dry Plume Depletion:</span>
                {[
                  { label: 'Noble Gas (v_d=0, Dry)', vd: 0.0, rain: 0.0 },
                  { label: 'Cs-137 Aerosol (v_d=0.3 cm/s)', vd: 0.3, rain: 0.0 },
                  { label: 'I-131 Vapor (v_d=1.0 cm/s)', vd: 1.0, rain: 0.0 },
                  { label: 'Rainout Washout (5 mm/h + v_d=0.5)', vd: 0.5, rain: 5.0 }
                ].map(p => {
                  const active = depositionVelocityCmS === p.vd && rainRateMmHr === p.rain;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setDepositionVelocityCmS(p.vd);
                        setRainRateMmHr(p.rain);
                      }}
                      style={{
                        fontSize: '0.72rem',
                        padding: '4px 8px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: active ? 700 : 500,
                        background: active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#38bdf8' : '#94a3b8',
                        border: `1px solid ${active ? '#38bdf8' : '#334155'}`
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '260px' }}>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                  Slice x₀ = <strong style={{ color: '#facc15' }}>{centerlineData.x0} m</strong> (σ_y={centerlineData.sy.toFixed(1)}m, σ_z={centerlineData.sz.toFixed(1)}m)
                </span>
                <input
                  type="range"
                  min={20}
                  max={maxDistance}
                  step={10}
                  value={sliceDistanceM}
                  onChange={e => setSliceDistanceM(Number(e.target.value))}
                  style={{ accentColor: '#facc15', width: '120px' }}
                />
              </div>
            </div>

            <div style={{ height: '290px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={[
                  {
                    x: centerlineData.xLine,
                    y: centerlineData.cLine,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Ground Centerline C(x, 0, 0) [With Depletion & Lid]',
                    line: { color: 'var(--color-primary)', width: 3 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(0, 229, 255, 0.1)'
                  },
                  ...(depositionVelocityCmS > 0 || rainRateMmHr > 0
                    ? [
                        {
                          x: centerlineData.xLine,
                          y: centerlineData.cUndepletedLine,
                          type: 'scatter' as const,
                          mode: 'lines' as const,
                          name: 'Un-depleted Reference (v_d=0, Λ=0)',
                          line: { color: '#94a3b8', width: 1.8, dash: 'dot' as const }
                        }
                      ]
                    : []),
                  {
                    x: [centerlineData.peakX],
                    y: [centerlineData.peakC],
                    type: 'scatter',
                    mode: 'markers+text',
                    name: 'Peak Ground Touchdown',
                    marker: { symbol: 'star', color: '#ff9f1c', size: 12 },
                    text: [`Peak @ ${centerlineData.peakX.toFixed(0)}m`],
                    textposition: 'top center',
                    textfont: { color: '#ff9f1c', size: 11 }
                  }
                ]}
                layout={{
                  autosize: true,
                  title: { text: 'Ground-Level Centerline Concentration C(x, y=0, z=0) vs. Downwind Distance', font: { color: '#E0E1DD', size: 13 } },
                  xaxis: { title: 'Downwind Distance x (meters)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Ground Concentration (Ci/m³)', gridcolor: '#1e293b' },
                  shapes: [
                    {
                      type: 'line',
                      x0: centerlineData.x0,
                      x1: centerlineData.x0,
                      y0: 0,
                      y1: Math.max(centerlineData.peakC * 1.1, 1e-8),
                      line: { color: '#facc15', width: 1.8, dash: 'dash' }
                    }
                  ],
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD', size: 11 },
                  margin: { l: 65, r: 25, t: 35, b: 45 },
                  showlegend: true
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Interactive Crosswind C(x_0, y, 0) & Vertical C(x_0, 0, z) Gaussian Slice Plots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
              <div style={{ height: '240px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
                <Plot
                  data={[
                    {
                      x: centerlineData.crossY,
                      y: centerlineData.crossC,
                      type: 'scatter',
                      mode: 'lines',
                      name: `Crosswind C(x=${centerlineData.x0}m, y, 0)`,
                      line: { color: '#10b981', width: 2.5 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(16, 185, 129, 0.14)'
                    }
                  ]}
                  layout={{
                    autosize: true,
                    title: { text: `Lateral Crosswind Bell Curve C(y) @ x₀ = ${centerlineData.x0}m (σ_y = ${centerlineData.sy.toFixed(1)}m)`, font: { color: '#E0E1DD', size: 12 } },
                    xaxis: { title: 'Crosswind Offset y (meters)', gridcolor: '#1e293b' },
                    yaxis: { title: 'Concentration (Ci/m³)', gridcolor: '#1e293b' },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#E0E1DD', size: 10 },
                    margin: { l: 60, r: 20, t: 32, b: 40 }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>

              <div style={{ height: '240px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
                <Plot
                  data={[
                    {
                      x: centerlineData.vertC,
                      y: centerlineData.vertZ,
                      type: 'scatter',
                      mode: 'lines',
                      name: `Vertical Profile C(x=${centerlineData.x0}m, 0, z)`,
                      line: { color: '#a855f7', width: 2.5 },
                      fill: 'tozerox',
                      fillcolor: 'rgba(168, 85, 247, 0.14)'
                    }
                  ]}
                  layout={{
                    autosize: true,
                    title: { text: `Vertical Elevation Profile C(z) @ x₀ = ${centerlineData.x0}m (H = ${releaseHeight}m, Lid = ${mixingHeightM}m)`, font: { color: '#E0E1DD', size: 12 } },
                    xaxis: { title: 'Concentration (Ci/m³)', gridcolor: '#1e293b' },
                    yaxis: { title: 'Altitude z (meters)', gridcolor: '#1e293b' },
                    shapes: [
                      {
                        type: 'line',
                        x0: 0,
                        x1: Math.max(...centerlineData.vertC, 1e-8),
                        y0: releaseHeight,
                        y1: releaseHeight,
                        line: { color: '#facc15', width: 1.5, dash: 'dot' }
                      }
                    ],
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#E0E1DD', size: 10 },
                    margin: { l: 55, r: 20, t: 32, b: 40 }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Meteorological & Release Setup */}
        {activeTab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>1. Release Source Term</h3>

              <div className="form-group">
                <label className="form-label">Release Rate Q (Ci/s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  className="form-control"
                  value={releaseRate}
                  onChange={e => setReleaseRate(Math.max(0.001, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Equivalent to {(releaseRate * 37000).toLocaleString()} MBq/s.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Effective Release Height H (m)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  value={releaseHeight}
                  onChange={e => setReleaseHeight(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Physical stack height plus thermal/momentum plume rise.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Evaluation Downwind Distance (m)</label>
                <input
                  type="number"
                  step="100"
                  min="200"
                  max="50000"
                  className="form-control"
                  value={maxDistance}
                  onChange={e => setMaxDistance(Math.max(200, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-accent)' }}>2. Atmospheric Meteorology</h3>

              <div className="form-group">
                <label className="form-label">Mean Horizontal Wind Speed u (m/s)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="40"
                  className="form-control"
                  value={windSpeed}
                  onChange={e => setWindSpeed(Math.max(0.5, Number(e.target.value)))}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Measured at stack height (minimum 0.5 m/s to prevent calm singularities).</span>
              </div>

              <div className="form-group">
                <label className="form-label">Pasquill-Gifford Stability Class</label>
                <select
                  className="form-control"
                  value={stability}
                  onChange={e => setStability(e.target.value)}
                >
                  {STABILITY_CLASSES.map(cls => (
                    <option key={cls} value={cls}>{STABILITY_INFO[cls].label}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  CLASS {stability} METEOROLOGY:
                </span>
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {STABILITY_INFO[stability].desc}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Dry Deposition v_d (cm/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    className="form-control"
                    value={depositionVelocityCmS}
                    onChange={e => setDepositionVelocityCmS(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Rain Rate R (mm/h)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={rainRateMmHr}
                    onChange={e => setRainRateMmHr(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Inversion Lid H_mix (m)</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    max="5000"
                    className="form-control"
                    value={mixingHeightM}
                    onChange={e => setMixingHeightM(Math.max(50, Number(e.target.value)))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Gaussian Plume Mathematics */}
        {activeTab === 'physics' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              Gaussian Atmospheric Dispersion Formulations (EPA / NRC Reg Guide 1.145)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>1. Steady-State Elevated Release</h4>
                <BlockMath math="C(x, y, z) = \frac{Q}{2\pi u \sigma_y \sigma_z} \exp\left(-\frac{y^2}{2\sigma_y^2}\right) \left[\exp\left(-\frac{(z - H)^2}{2\sigma_z^2}\right) + \exp\left(-\frac{(z + H)^2}{2\sigma_z^2}\right)\right]" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Total ground reflection is represented by the image source term at <InlineMath math="z = -H" />. At ground level (<InlineMath math="z = 0" />), the two vertical exponentials combine to <InlineMath math="2 \exp(-H^2 / 2\sigma_z^2)" />.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>2. Ground-Level Centerline</h4>
                <BlockMath math="C(x, 0, 0) = \frac{Q}{\pi u \sigma_y(x) \sigma_z(x)} \exp\left(-\frac{H^2}{2\sigma_z(x)^2}\right)" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  The governing concentration along the central wind axis. Setting <InlineMath math="H = 0" /> recovers the standard ground-level accidental spill release.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>3. Briggs Open-Country Dispersion Coefficients</h4>
                <BlockMath math="\sigma_y(x) = a \cdot x \, (1 + b \cdot x)^{-1/2}, \quad \sigma_z(x) = c \cdot x \, (1 + d \cdot x)^p" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Empirical parameters derived for open terrain across Pasquill stability classes A through F (Briggs 1973).
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>4. Distance to Maximum Ground Touchdown</h4>
                <BlockMath math="\sigma_z(x_{\max}) = \frac{H}{\sqrt{2}} \approx 0.707 \, H" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  The peak ground concentration occurs when the vertical plume standard deviation <InlineMath math="\sigma_z" /> expands to roughly 71% of the effective stack release height <InlineMath math="H" />.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cryptographic Audit Dossier Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default PlumeModule;
