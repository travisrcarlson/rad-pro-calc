import React, { useState, useMemo } from 'react';
import {
  computePhysicalMatterAnchor,
  computeDoseEquivalenceBenchmarks,
  simulateRealSurveyMeters,
  evaluateValidityAndUncertainty,
  extractPrimaryDataProvenance,
  AMBIENT_BACKGROUND_BASELINES,
  fetchNearestSafecastReading,
  NUCLIDE_PHYSICAL_CATALOG
} from '../utils/physicalGroundingEngine';

export interface PhysicalGroundingPanelProps {
  isotope: string;
  activityGBq: number;
  distanceM: number;
  shieldMaterial: string;
  shieldThicknessCm: number;
  evaluatedDoseRateMSvHr: number;
  compact?: boolean;
}

export const PhysicalGroundingPanel: React.FC<PhysicalGroundingPanelProps> = ({
  isotope,
  activityGBq,
  distanceM,
  shieldMaterial,
  shieldThicknessCm,
  evaluatedDoseRateMSvHr,
  compact = false
}) => {
  const [selectedBgId, setSelectedBgId] = useState<string>('global_avg');
  const [safecastStatus, setSafecastStatus] = useState<string | null>(null);
  const [isQueryingSafecast, setIsQueryingSafecast] = useState<boolean>(false);
  const [showProvenance, setShowProvenance] = useState<boolean>(false);

  const spec = NUCLIDE_PHYSICAL_CATALOG[isotope] || NUCLIDE_PHYSICAL_CATALOG['Co-60'];
  const matter = useMemo(
    () => computePhysicalMatterAnchor(isotope, activityGBq),
    [isotope, activityGBq]
  );
  const doseBench = useMemo(
    () => computeDoseEquivalenceBenchmarks(evaluatedDoseRateMSvHr),
    [evaluatedDoseRateMSvHr]
  );
  const meters = useMemo(
    () => simulateRealSurveyMeters(evaluatedDoseRateMSvHr, spec.meanPhotonEnergyMeV),
    [evaluatedDoseRateMSvHr, spec.meanPhotonEnergyMeV]
  );
  const validity = useMemo(
    () =>
      evaluateValidityAndUncertainty(
        isotope,
        distanceM,
        shieldMaterial,
        shieldThicknessCm,
        evaluatedDoseRateMSvHr,
        matter.equivalentSphereDiameterMm
      ),
    [
      isotope,
      distanceM,
      shieldMaterial,
      shieldThicknessCm,
      evaluatedDoseRateMSvHr,
      matter.equivalentSphereDiameterMm
    ]
  );
  const provenance = useMemo(
    () => extractPrimaryDataProvenance(isotope, shieldMaterial, shieldThicknessCm),
    [isotope, shieldMaterial, shieldThicknessCm]
  );

  const activeBg =
    AMBIENT_BACKGROUND_BASELINES.find(b => b.id === selectedBgId) ||
    AMBIENT_BACKGROUND_BASELINES[1];
  const ratioAboveSelectedBg =
    (evaluatedDoseRateMSvHr * 1e6) / Math.max(1, activeBg.ambientNSvPerHr);

  const handleQueryLiveSafecast = async () => {
    setIsQueryingSafecast(true);
    setSafecastStatus(null);
    // Default to Fukushima / Tokyo or NYC reference coordinates if geolocation unavailable
    const res = await fetchNearestSafecastReading(37.4211, 141.0328);
    setIsQueryingSafecast(false);
    if (res.ok && res.uSvPerHr !== undefined) {
      setSafecastStatus(
        `Live Safecast Telemetry: ${res.uSvPerHr} µSv/h (${res.cpm} CPM${res.capturedAt ? ` • ${res.capturedAt}` : ''})`
      );
    } else {
      setSafecastStatus(
        `Offline Mode — Using Verified UNSCEAR / Regional Baseline (${activeBg.ambientNSvPerHr} nSv/h)`
      );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '10px' : '12px'
      }}
    >
      {/* 1. Physical Matter, Pellet Geometry & Radiogenic Self-Heating */}
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.73rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Physical Matter &amp; Pellet Reality ({isotope})
          </strong>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {matter.chemicalForm}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '8px' }}>
          <div style={{ background: 'rgba(9, 14, 24, 0.65)', padding: '6px 8px', borderRadius: '5px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pure Nuclide Mass</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
              {matter.formattedMass}
            </div>
          </div>
          <div style={{ background: 'rgba(9, 14, 24, 0.65)', padding: '6px 8px', borderRadius: '5px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Solid Sphere Ø</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {matter.equivalentSphereDiameterMm < 0.01
                ? `${(matter.equivalentSphereDiameterMm * 1000).toFixed(1)} µm`
                : `${matter.equivalentSphereDiameterMm.toFixed(2)} mm`}
            </div>
          </div>
          <div style={{ background: 'rgba(9, 14, 24, 0.65)', padding: '6px 8px', borderRadius: '5px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Decay Self-Heat</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
              {matter.formattedHeat}
            </div>
          </div>
          <div style={{ background: 'rgba(9, 14, 24, 0.65)', padding: '6px 8px', borderRadius: '5px' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Specific Activity</div>
            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
              {matter.specificActivityTBqPerGram >= 0.01
                ? `${matter.specificActivityTBqPerGram.toFixed(2)} TBq/g`
                : `${(matter.specificActivityTBqPerGram * 1e6).toFixed(2)} MBq/g`}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
          <strong>Tangible Scale:</strong> {matter.sizeAnalogy}
        </div>
      </div>

      {/* 2. Everyday Dose Equivalence & Ambient Background Grounding */}
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.73rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            2. Real-World Dose &amp; Natural Background Anchor
          </strong>
          <button
            type="button"
            onClick={handleQueryLiveSafecast}
            disabled={isQueryingSafecast}
            style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isQueryingSafecast ? 'Querying...' : '🌍 Live Safecast Check'}
          </button>
        </div>

        <div style={{ fontSize: '0.76rem', color: '#bae6fd', fontWeight: 600, lineHeight: 1.4 }}>
          {doseBench.contextualComparison}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            value={selectedBgId}
            onChange={e => setSelectedBgId(e.target.value)}
            style={{ fontSize: '0.73rem', padding: '3px 7px', flex: '1 1 200px' }}
          >
            {AMBIENT_BACKGROUND_BASELINES.map(bg => (
              <option key={bg.id} value={bg.id}>
                {bg.region} ({bg.ambientNSvPerHr} nSv/h)
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
            {ratioAboveSelectedBg >= 1000
              ? `${ratioAboveSelectedBg.toExponential(2)}×`
              : `${ratioAboveSelectedBg.toFixed(1)}×`}{' '}
            regional background
          </span>
        </div>

        <div style={{ fontSize: '0.69rem', color: '#94a3b8' }}>
          {activeBg.geologyNote}
          {safecastStatus ? ` • ${safecastStatus}` : ''}
        </div>
      </div>

      {/* 3. Simulated Real Survey Meter Readouts (Dead-Time Foldback & Energy Response) */}
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.73rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            3. What Real Field Meters Actually Read
          </strong>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            True H*(10) = {evaluatedDoseRateMSvHr < 0.01 ? `${(evaluatedDoseRateMSvHr * 1000).toFixed(2)} µSv/h` : `${evaluatedDoseRateMSvHr.toFixed(3)} mSv/h`}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {meters.map(m => {
            const isDanger = m.status === 'DEAD-TIME FOLDBACK!';
            const isWarn = m.status === 'SATURATED / OVER-RANGE' || m.status === 'OVER-RESPONDING' || m.status === 'UNDER-RESPONDING';
            return (
              <div
                key={m.instrumentName}
                style={{
                  padding: '6px 8px',
                  borderRadius: '5px',
                  background: isDanger
                    ? 'rgba(239, 68, 68, 0.14)'
                    : isWarn
                    ? 'rgba(245, 158, 11, 0.10)'
                    : 'rgba(9, 14, 24, 0.65)',
                  border: isDanger
                    ? '1px solid rgba(239, 68, 68, 0.45)'
                    : isWarn
                    ? '1px solid rgba(245, 158, 11, 0.28)'
                    : '1px solid rgba(148, 163, 184, 0.14)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#f1f5f9' }}>
                    {m.instrumentName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: isDanger ? '#fca5a5' : isWarn ? '#fde68a' : '#34d399'
                    }}
                  >
                    {m.displayedReadout} [{m.status}]
                  </span>
                </div>
                <div style={{ fontSize: '0.69rem', color: isDanger ? '#fecaca' : '#94a3b8', marginTop: '2px', lineHeight: 1.35 }}>
                  {m.engineeringWarning}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Analytical Validity Guardrails & ISO GUM Uncertainty (k = 2) */}
      <div
        style={{
          padding: '10px 12px',
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <strong style={{ fontSize: '0.73rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            4. Model Validity &amp; GUM 95% Uncertainty (k = 2)
          </strong>
          <span style={{ fontSize: '0.71rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            ±{validity.expandedUncertaintyPct.toFixed(1)}% [{validity.lowerBound95MSvHr.toPrecision(3)} – {validity.upperBound95MSvHr.toPrecision(3)} mSv/h]
          </span>
        </div>

        {validity.validityFlags.map((vf, idx) => (
          <div
            key={idx}
            style={{
              fontSize: '0.70rem',
              lineHeight: 1.4,
              color:
                vf.severity === 'OUT_OF_BOUNDS'
                  ? '#fca5a5'
                  : vf.severity === 'ADVISORY'
                  ? '#fde68a'
                  : '#cbd5e1'
            }}
          >
            <strong>
              {vf.severity === 'OUT_OF_BOUNDS' ? '⛔ ' : vf.severity === 'ADVISORY' ? '⚠️ ' : '✓ '}
              {vf.rule}:
            </strong>{' '}
            {vf.detail}
          </div>
        ))}
      </div>

      {/* 5. Click-to-Inspect Primary NIST XCOM / ANSI-6.4.3 / ICRP-107 Provenance */}
      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(9, 14, 24, 0.78)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '6px'
        }}
      >
        <button
          type="button"
          onClick={() => setShowProvenance(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <span>🔍 Primary Reference Constants (NIST XCOM / ANS-6.4.3 / ICRP-107)</span>
          <span>{showProvenance ? '▲' : '▼'}</span>
        </button>

        {showProvenance && (
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              fontSize: '0.70rem',
              fontFamily: 'var(--font-mono)',
              color: '#cbd5e1'
            }}
          >
            <div>• <strong>Nuclide Source:</strong> {provenance.nuclideCitation}</div>
            <div>• <strong>Principal Lines:</strong> {provenance.emissionLines}</div>
            <div>• <strong>ICRP-119 e(50) Inhal:</strong> {provenance.inhalationE50SvPerBq.toExponential(2)} Sv/Bq</div>
            <div>• <strong>NIST XCOM Material:</strong> {provenance.xcomMaterialName} (ρ = {provenance.densityGcm3} g/cm³, Z_eff = {provenance.effectiveZ})</div>
            <div>• <strong>Interpolated @ {provenance.evaluatedEnergyMeV.toFixed(3)} MeV:</strong> μ/ρ = {provenance.muMassCm2G.toFixed(4)} cm²/g | μ_en/ρ = {provenance.muEnMassCm2G.toFixed(4)} cm²/g | μ = {provenance.muLinearCm1.toFixed(4)} cm⁻¹</div>
            <div>• <strong>Optical Thickness:</strong> μx = {provenance.opticalMfp.toFixed(3)} mfp | Harima GP Buildup B = {provenance.gpBuildupB.toFixed(3)}</div>
            <div>• <strong>ANS-6.4.3 GP Vector:</strong> b={provenance.gpParams.b.toFixed(3)}, c={provenance.gpParams.c.toFixed(3)}, a={provenance.gpParams.a.toFixed(3)}, X_k={provenance.gpParams.Xk.toFixed(2)}, d={provenance.gpParams.d.toFixed(3)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
