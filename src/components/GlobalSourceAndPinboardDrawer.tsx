import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRegulatory,
  GLOBAL_SOURCE_PRESETS,
  ISOTOPE_QUICK_REF,
  type GlobalSourceContext
} from '../context/RegulatoryContext';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';

interface GlobalSourceAndPinboardDrawerProps {
  activeModuleInfo: ActiveModuleBreadcrumbInfo | null;
  onApplySourceToCurrentModule: (source: GlobalSourceContext) => void;
}

const MATERIAL_HVL_SCALE: Record<GlobalSourceContext['shieldMaterial'], number> = {
  'Lead': 1.0,
  'Tungsten': 0.72,
  'Depleted Uranium': 0.62,
  'Steel': 2.25,
  'Concrete': 5.2,
  'Water': 10.5
};

export const computeSourceQuickPhysics = (source: GlobalSourceContext, occLimitMSv: number) => {
  const ref = ISOTOPE_QUICK_REF[source.isotope] || ISOTOPE_QUICK_REF['Co-60'];
  const r = Math.max(0.1, source.distanceM);
  const unshieldedMSvPerHr = (ref.gammaConst_mSv_m2_h_GBq * source.activityGBq) / (r * r);

  const matScale = MATERIAL_HVL_SCALE[source.shieldMaterial] || 1.0;
  const effectiveHvlCm = Math.max(0.01, ref.hvlLeadCm * matScale);
  const numHvls = Math.max(0, source.shieldThicknessCm / effectiveHvlCm);
  const mfp = numHvls * Math.LN2;
  // Taylor / linear-quadratic broad-beam buildup approximation B(μx) ≈ 1 + 0.85*(μx) + 0.12*(μx)^1.6
  const buildupFactor = 1.0 + 0.85 * mfp + 0.12 * Math.pow(mfp, 1.6);
  const narrowAttenuation = Math.pow(0.5, numHvls);
  const broadTransmission = Math.min(1.0, narrowAttenuation * buildupFactor);
  const shieldedMSvPerHr = unshieldedMSvPerHr * broadTransmission;
  const stayTimeHours = shieldedMSvPerHr > 1e-9 ? occLimitMSv / shieldedMSvPerHr : 99999;

  return {
    unshieldedMSvPerHr,
    shieldedMSvPerHr,
    effectiveHvlCm,
    numHvls,
    buildupFactor,
    broadTransmission,
    stayTimeHours,
    halfLifeStr: ref.halfLifeStr
  };
};

export const GlobalSourceAndPinboardDrawer: React.FC<GlobalSourceAndPinboardDrawerProps> = ({
  activeModuleInfo,
  onApplySourceToCurrentModule
}) => {
  const navigate = useNavigate();
  const {
    activeSource,
    setActiveSource,
    pinnedResults,
    pinCalculation,
    removePinnedCalculation,
    clearPinnedCalculations,
    currentFramework,
    formatDoseMSv,
    formatActivityGBq
  } = useRegulatory();

  const [openDrawer, setOpenDrawer] = useState<'none' | 'source' | 'pinboard'>('none');
  const [customPinNote, setCustomPinNote] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [justPinned, setJustPinned] = useState(false);

  const quickPhysics = useMemo(
    () => computeSourceQuickPhysics(activeSource, currentFramework.limits.occupationalAnnualEffective_mSv),
    [activeSource, currentFramework.limits.occupationalAnnualEffective_mSv]
  );

  const handlePinCurrentModuleSnapshot = () => {
    const modNum = activeModuleInfo ? activeModuleInfo.moduleNumber : 1;
    const modLabel = activeModuleInfo ? activeModuleInfo.label : 'Dose & Shielding Calculator';
    const modPath = activeModuleInfo ? activeModuleInfo.path : '/dose';

    pinCalculation({
      moduleNumber: modNum,
      moduleLabel: modLabel,
      modulePath: `${modPath}${window.location.search}`,
      title: `M${String(modNum).padStart(2, '0')} ${modLabel} — ${activeSource.isotope} (${formatActivityGBq(activeSource.activityGBq)})`,
      summary:
        customPinNote.trim() ||
        `Source ${activeSource.isotope} (${formatActivityGBq(activeSource.activityGBq)}) at r = ${activeSource.distanceM} m behind ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial} under ${currentFramework.shortCode}.`,
      metrics: [
        { label: 'Active Source', value: `${activeSource.isotope} (${formatActivityGBq(activeSource.activityGBq)})` },
        { label: 'Geometry & Shield', value: `r = ${activeSource.distanceM} m | ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial}` },
        { label: 'Unshielded H*(10)', value: formatDoseMSv(Number(quickPhysics.unshieldedMSvPerHr.toPrecision(4)), '/h') },
        { label: 'Shielded H*(10) w/ Buildup', value: formatDoseMSv(Number(quickPhysics.shieldedMSvPerHr.toPrecision(4)), '/h') },
        { label: 'Buildup B(μx) & HVL#', value: `B = ${quickPhysics.buildupFactor.toFixed(2)} (${quickPhysics.numHvls.toFixed(1)} HVLs)` },
        {
          label: `Stay Time (${currentFramework.shortCode})`,
          value: quickPhysics.stayTimeHours > 9999 ? '> 9,999 h' : `${quickPhysics.stayTimeHours.toFixed(2)} h`
        }
      ],
      notes: customPinNote.trim() || undefined
    });
    setCustomPinNote('');
    setJustPinned(true);
    setTimeout(() => setJustPinned(false), 1800);
  };

  const buildCombinedMarkdownReport = () => {
    const lines: string[] = [
      `# RADPRO CALC — MULTI-MODULE RADIOLOGICAL ENGINEERING REPORT`,
      `- **Generated**: ${new Date().toISOString()}`,
      `- **Active Regulatory Framework**: ${currentFramework.name} (${currentFramework.shortCode})`,
      `- **Occupational Annual Limit**: ${formatDoseMSv(currentFramework.limits.occupationalAnnualEffective_mSv, '/yr')}`,
      `- **Active Reference Source**: ${activeSource.isotope} | Activity: ${formatActivityGBq(activeSource.activityGBq)} | Distance: ${activeSource.distanceM} m | Shield: ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial}`,
      ``,
      `---`,
      `## Pinned Module Calculations (${pinnedResults.length} Entries)`,
      ``
    ];

    pinnedResults.forEach((item, idx) => {
      lines.push(`### ${idx + 1}. [M${String(item.moduleNumber).padStart(2, '0')}] ${item.title} (${item.timestamp})`);
      lines.push(`- **Module**: ${item.moduleLabel} (\`${item.modulePath}\`)`);
      lines.push(`- **Summary**: ${item.summary}`);
      item.metrics.forEach(m => {
        lines.push(`  - **${m.label}**: ${m.value}`);
      });
      lines.push(``);
    });

    return lines.join('\n');
  };

  const handleCopyMarkdownReport = () => {
    const md = buildCombinedMarkdownReport();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).catch(() => {});
    }
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleExportJsonReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      regulatoryFramework: currentFramework,
      activeSource,
      pinnedCalculations: pinnedResults
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RadPro_MultiModule_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginBottom: '14px' }}>
      {/* Compact Global Source & Pinboard Control Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '7px 12px',
          borderRadius: '8px',
          background: 'rgba(5, 12, 24, 0.82)',
          border: '1px solid rgba(56, 189, 248, 0.25)'
        }}
      >
        {/* Left: Global Active Source Summary & Quick Apply */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setOpenDrawer(prev => (prev === 'source' ? 'none' : 'source'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: openDrawer === 'source' ? 'rgba(255, 183, 3, 0.22)' : 'rgba(255, 183, 3, 0.1)',
              border: '1px solid rgba(255, 183, 3, 0.45)',
              color: '#ffb703'
            }}
            title="Configure shared Global Active Source (Isotope, Activity, Standoff, Shielding) across modules"
          >
            <span>☢️ Active Source:</span>
            <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {activeSource.isotope} ({formatActivityGBq(activeSource.activityGBq)}) @ {activeSource.distanceM}m
            </strong>
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
              [{activeSource.shieldThicknessCm}cm {activeSource.shieldMaterial}]
            </span>
            <span style={{ fontSize: '0.62rem' }}>{openDrawer === 'source' ? '▲' : '▼'}</span>
          </button>

          <button
            type="button"
            onClick={() => onApplySourceToCurrentModule(activeSource)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(0, 229, 255, 0.12)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              color: '#00e5ff'
            }}
            title="Push the Global Active Source parameters into the current module"
          >
            📥 Sync Source to Current Tool
          </button>

          <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Unshielded:{' '}
            <strong style={{ color: '#f8fafc' }}>
              {formatDoseMSv(Number(quickPhysics.unshieldedMSvPerHr.toPrecision(3)), '/h')}
            </strong>{' '}
            → Shielded:{' '}
            <strong style={{ color: '#10b981' }}>
              {formatDoseMSv(Number(quickPhysics.shieldedMSvPerHr.toPrecision(3)), '/h')}
            </strong>
          </span>
        </div>

        {/* Right: Quick Pin & Calculation Pinboard Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePinCurrentModuleSnapshot}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: justPinned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${justPinned ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}`,
              color: '#10b981'
            }}
            title="Pin a snapshot of this module and active source calculation to the Multi-Module Report Ledger"
          >
            <span>{justPinned ? '✓ Pinned to Ledger!' : '📌 Pin to Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOpenDrawer(prev => (prev === 'pinboard' ? 'none' : 'pinboard'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: openDrawer === 'pinboard' ? 'rgba(192, 132, 252, 0.24)' : 'rgba(192, 132, 252, 0.1)',
              border: '1px solid rgba(192, 132, 252, 0.45)',
              color: '#c084fc'
            }}
            title="Open Multi-Module Calculation Pinboard & Combined Dossier Exporter"
          >
            <span>📋 Calculation Pinboard</span>
            <span
              style={{
                padding: '0 6px',
                borderRadius: '10px',
                background: pinnedResults.length > 0 ? '#c084fc' : 'rgba(255,255,255,0.1)',
                color: pinnedResults.length > 0 ? '#000' : '#cbd5e1',
                fontWeight: 800,
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {pinnedResults.length}
            </span>
            <span style={{ fontSize: '0.62rem' }}>{openDrawer === 'pinboard' ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Drawer 1: Global Active Source Configurator & Cross-Module Launcher */}
      {openDrawer === 'source' && (
        <div
          className="panel"
          style={{
            marginTop: '8px',
            marginBottom: 0,
            padding: '14px 16px',
            border: '1px solid rgba(255, 183, 3, 0.4)',
            background: 'rgba(9, 16, 28, 0.96)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#ffb703' }}>
                ☢️ Global Active Source Context (Cross-Module Shared Radionuclide &amp; Geometry)
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                Configure your working source once and sync or launch it directly into Dose, Shielding, Decay, Transport, or First Responder tools.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenDrawer('none')}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>

          {/* Preset Selector Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {GLOBAL_SOURCE_PRESETS.map((preset, i) => {
              const isSelected =
                activeSource.isotope === preset.isotope &&
                Math.abs(activeSource.activityGBq - preset.activityGBq) < 1e-4;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSource(preset)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 183, 3, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isSelected ? '#ffb703' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: isSelected ? '#ffb703' : '#cbd5e1',
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  {preset.isotope} ({formatActivityGBq(preset.activityGBq)}) — {preset.label.split(' ')[0]} {preset.label.split(' ')[1]}
                </button>
              );
            })}
          </div>

          {/* Input Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Radionuclide</label>
              <select
                className="form-select"
                value={activeSource.isotope}
                onChange={e => setActiveSource({ isotope: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
              >
                {Object.keys(ISOTOPE_QUICK_REF).map(iso => (
                  <option key={iso} value={iso}>
                    {iso} (T½ = {ISOTOPE_QUICK_REF[iso].halfLifeStr})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                Activity (GBq) [{(activeSource.activityGBq / 37).toFixed(2)} Ci]
              </label>
              <input
                type="number"
                className="form-input"
                min="0.0001"
                step="any"
                value={activeSource.activityGBq}
                onChange={e => setActiveSource({ activityGBq: Math.max(0.0001, Number(e.target.value) || 0) })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Standoff Distance r (m)</label>
              <input
                type="number"
                className="form-input"
                min="0.1"
                step="0.1"
                value={activeSource.distanceM}
                onChange={e => setActiveSource({ distanceM: Math.max(0.1, Number(e.target.value) || 0.1) })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Shield Material</label>
              <select
                className="form-select"
                value={activeSource.shieldMaterial}
                onChange={e => setActiveSource({ shieldMaterial: e.target.value as GlobalSourceContext['shieldMaterial'] })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
              >
                {Object.keys(MATERIAL_HVL_SCALE).map(mat => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>Shield Thickness x (cm)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="0.5"
                value={activeSource.shieldThicknessCm}
                onChange={e => setActiveSource({ shieldThicknessCm: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* 1-Click Cross-Module Launch Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() => {
                  onApplySourceToCurrentModule(activeSource);
                  setOpenDrawer('none');
                }}
              >
                📥 Apply to Current Module
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() =>
                  navigate(
                    `/dose?isotope=${encodeURIComponent(activeSource.isotope)}&activity=${activeSource.activityGBq}&unit=GBq&distance=${activeSource.distanceM}`
                  )
                }
              >
                ⚡ M01 Dose Calc
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() =>
                  navigate(
                    `/shielding?isotope=${encodeURIComponent(activeSource.isotope)}&activity=${activeSource.activityGBq}&distance=${activeSource.distanceM}&material=${encodeURIComponent(activeSource.shieldMaterial)}&thickness=${activeSource.shieldThicknessCm}`
                  )
                }
              >
                🛡️ M04 Shielding
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() =>
                  navigate(`/decay?isotope=${encodeURIComponent(activeSource.isotope)}&activity=${activeSource.activityGBq}`)
                }
              >
                ⚛️ M24 Decay Chains
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() =>
                  navigate(`/transport?isotope=${encodeURIComponent(activeSource.isotope)}&activity=${activeSource.activityGBq}`)
                }
              >
                📦 M15 Transport
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                onClick={() =>
                  navigate(`/first-responder?isotope=${encodeURIComponent(activeSource.isotope)}&activity=${activeSource.activityGBq}`)
                }
              >
                🚨 M08 First Responder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Drawer 2: Multi-Module Calculation Pinboard & Combined Engineering Report */}
      {openDrawer === 'pinboard' && (
        <div
          className="panel"
          style={{
            marginTop: '8px',
            marginBottom: 0,
            padding: '14px 16px',
            border: '1px solid rgba(192, 132, 252, 0.45)',
            background: 'rgba(9, 16, 28, 0.96)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#c084fc' }}>
                📋 Multi-Module Calculation Pinboard &amp; Combined Engineering Report ({pinnedResults.length} Pinned)
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                Pin snapshots from any module to build a unified cross-module radiation safety calculation dossier.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyMarkdownReport}
                disabled={pinnedResults.length === 0}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: pinnedResults.length === 0 ? 'not-allowed' : 'pointer',
                  background: copiedReport ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 229, 255, 0.14)',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  color: copiedReport ? '#10b981' : '#00e5ff'
                }}
              >
                {copiedReport ? '✓ Copied Markdown Dossier' : '📋 Copy Markdown Report'}
              </button>
              <button
                type="button"
                onClick={handleExportJsonReport}
                disabled={pinnedResults.length === 0}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: pinnedResults.length === 0 ? 'not-allowed' : 'pointer',
                  background: 'rgba(192, 132, 252, 0.14)',
                  border: '1px solid rgba(192, 132, 252, 0.35)',
                  color: '#c084fc'
                }}
              >
                💾 Export JSON
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={pinnedResults.length === 0}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: pinnedResults.length === 0 ? 'not-allowed' : 'pointer',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0'
                }}
              >
                🖨️ Print Report
              </button>
              {pinnedResults.length > 0 && (
                <button
                  type="button"
                  onClick={clearPinnedCalculations}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.73rem',
                    cursor: 'pointer',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444'
                  }}
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpenDrawer('none')}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Add Note + Pin Row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Optional engineering note for this pin (e.g., 'Hot cell west wall check — 5 cm Pb')..."
              value={customPinNote}
              onChange={e => setCustomPinNote(e.target.value)}
              style={{ flex: '1 1 280px', padding: '6px 10px', fontSize: '0.78rem' }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePinCurrentModuleSnapshot}
              style={{ padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700 }}
            >
              📌 Pin Current Module &amp; Source
            </button>
          </div>

          {pinnedResults.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
              No calculations pinned yet. Click <strong>"📌 Pin to Report"</strong> on any module to build a multi-module comparison ledger.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
              {pinnedResults.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(192, 132, 252, 0.28)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(item.modulePath)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#00e5ff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {item.title}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{item.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => removePinnedCalculation(item.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                        title="Remove pinned entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{item.summary}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginTop: '4px' }}>
                    {item.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem'
                        }}
                      >
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.64rem' }}>{m.label}</span>
                        <strong style={{ color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{m.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
