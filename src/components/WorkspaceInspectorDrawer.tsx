import React, { useState, useMemo, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRegulatory,
  GLOBAL_SOURCE_PRESETS,
  ISOTOPE_QUICK_REF,
  type GlobalSourceContext
} from '../context/RegulatoryContext';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';
import { computeSourceQuickPhysics } from './GlobalSourceAndPinboardDrawer';
import { SmartQuantityInput } from './SmartQuantityInput';
import { CrossModulePipelineBar } from './CrossModulePipelineBar';
import { PhysicsTutorDrawer } from './PhysicsTutorDrawer';
import { AuditDossierModal } from './AuditDossierModal';
import { type CalculationDossierPayload } from '../services/auditDossierService';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const LazyModuleInfoTabPanel = lazyWithRetry(
  () => import('./ModuleInfoTabPanel'),
  'ModuleInfoTabPanel'
);

export type InspectorTabId = 'source' | 'pinboard' | 'guide' | 'tutor';

interface WorkspaceInspectorDrawerProps {
  isOpen: boolean;
  activeTab: InspectorTabId;
  onSelectTab: (tab: InspectorTabId) => void;
  onClose: () => void;
  onOpenFullWidthGuide: () => void;
  activeModuleInfo: ActiveModuleBreadcrumbInfo | null;
  onApplySourceToCurrentModule: (source: GlobalSourceContext) => void;
}

export const WorkspaceInspectorDrawer: React.FC<WorkspaceInspectorDrawerProps> = ({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
  onOpenFullWidthGuide,
  activeModuleInfo,
  onApplySourceToCurrentModule
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    activeSource,
    setActiveSource,
    pinnedResults,
    pinCalculation,
    removePinnedCalculation,
    clearPinnedCalculations,
    currentFramework,
    formatDoseMSv,
    formatActivityGBq,
    projectName,
    setProjectName,
    exportWorkspaceProject,
    importWorkspaceProject,
    liveModuleTelemetry
  } = useRegulatory();

  const [pinNote, setPinNote] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isMasterDossierOpen, setIsMasterDossierOpen] = useState(false);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
  };

  const quickPhysics = useMemo(
    () =>
      computeSourceQuickPhysics(
        activeSource,
        currentFramework.limits.occupationalAnnualEffective_mSv
      ),
    [activeSource, currentFramework.limits.occupationalAnnualEffective_mSv]
  );

  // Build unified Multi-Module Master Dossier Payload from all pinned calculations
  const masterDossierPayload = useMemo<CalculationDossierPayload>(() => {
    const inputs = [
      { label: 'Project / Evaluation Name', value: projectName },
      { label: 'Active Regulatory Framework', value: `${currentFramework.name} (${currentFramework.shortCode})` },
      {
        label: 'Occupational Annual Limit',
        value: currentFramework.limits.occupationalAnnualEffective_mSv,
        unit: 'mSv/yr'
      },
      {
        label: 'Reference Source Context',
        value: `${activeSource.isotope} (${activeSource.activityGBq} GBq @ ${activeSource.distanceM} m, ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial})`
      },
      { label: 'Compiled Pinned Modules', value: `${pinnedResults.length} calculation snapshots` }
    ];

    const outputs =
      pinnedResults.length > 0
        ? pinnedResults.flatMap((pin, idx) => [
            {
              label: `[#${idx + 1}] ${pin.title}`,
              value: pin.metrics.map(m => `${m.label}: ${m.value}`).join(' | ') || pin.summary,
              status: 'PASS' as const
            }
          ])
        : [
            {
              label: `Reference Shielded H*(10) [${activeSource.isotope}]`,
              value: `${quickPhysics.shieldedMSvPerHr.toPrecision(4)} mSv/h (Buildup B = ${quickPhysics.buildupFactor.toFixed(2)})`,
              status: 'PASS' as const
            }
          ];

    return {
      moduleName: `Multi-Module Master Engineering Report (${pinnedResults.length} Pins)`,
      reportTitle: `${projectName} — Consolidated Radiological Evaluation`,
      statuteCitation: `${currentFramework.citation} | ISO/IEC 17025:2017 Clause 7.8`,
      verificationTestId: 'VTEST-01..60',
      operatorName: 'Lead Health Physicist',
      operatorCredentials: 'CHP, RRPT',
      facility: 'Radiological Engineering & QA Evaluation Center',
      formulaDescription: '\\dot{H}^*(10) = \\frac{\\Gamma \\cdot A}{r^2} \\, B(\\mu x, E) \\, e^{-\\mu x}, \\qquad U = k \\cdot u_c \\; (k = 2)',
      inputs,
      outputs,
      notes: pinnedResults.map((p, i) => `[#${i + 1} ${p.moduleLabel}] ${p.summary}`).join(' • ')
    };
  }, [projectName, currentFramework, activeSource, pinnedResults, quickPhysics]);

  const handlePinSnapshot = () => {
    const modNum = activeModuleInfo ? activeModuleInfo.moduleNumber : 1;
    const modLabel = activeModuleInfo ? activeModuleInfo.label : 'Workspace';
    const modPath = activeModuleInfo ? activeModuleInfo.path : '/dose';

    const telemetryMetrics = liveModuleTelemetry
      ? Object.entries(liveModuleTelemetry.computedMetrics).map(([label, val]) => ({
          label,
          value: String(val)
        }))
      : [
          { label: 'Active Source', value: `${activeSource.isotope} (${formatActivityGBq(activeSource.activityGBq)})` },
          { label: 'Shielded H*(10)', value: formatDoseMSv(Number(quickPhysics.shieldedMSvPerHr.toPrecision(4)), '/h') },
          { label: 'Buildup B(μx)', value: `${quickPhysics.buildupFactor.toFixed(2)} (${quickPhysics.numHvls.toFixed(1)} HVLs)` }
        ];

    pinCalculation({
      moduleNumber: modNum,
      moduleLabel: modLabel,
      modulePath: `${modPath}${window.location.search}`,
      title: liveModuleTelemetry
        ? `M${String(modNum).padStart(2, '0')} ${modLabel} — ${liveModuleTelemetry.regimeSummary}`
        : `M${String(modNum).padStart(2, '0')} ${modLabel} — ${activeSource.isotope} (${formatActivityGBq(activeSource.activityGBq)})`,
      summary:
        pinNote.trim() ||
        (liveModuleTelemetry
          ? `${liveModuleTelemetry.regimeSummary} under ${currentFramework.shortCode}`
          : `${activeSource.isotope} @ ${activeSource.distanceM} m behind ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial}`),
      metrics: telemetryMetrics,
      notes: pinNote.trim() || undefined
    });
    setPinNote('');
    showToast('✓ Snapshot pinned to Calculation Pinboard');
  };

  if (!isOpen) return null;

  return (
    <>
      <aside
        style={{
          width: '430px',
          minWidth: '370px',
          maxWidth: '46vw',
          height: '100%',
          background: '#0b1220',
          borderLeft: '1px solid rgba(148, 163, 184, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        {/* Top Inspector Tab Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            padding: '8px 10px',
            background: '#090f1a',
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)'
          }}
        >
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
            {(
              [
                { id: 'source', label: '☢️ Source' },
                { id: 'pinboard', label: `📌 Pins (${pinnedResults.length})` },
                { id: 'guide', label: '📖 Guide' },
                { id: 'tutor', label: '🧠 Tutor' }
              ] as const
            ).map(t => (
              <button
                key={t.id}
                type="button"
                className={activeTab === t.id ? 'active' : ''}
                onClick={() => onSelectTab(t.id)}
                style={{
                  padding: '5px 9px',
                  borderRadius: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close Inspector Drawer (Esc)"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {statusToast && (
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(14, 116, 144, 0.28)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.35)',
              fontSize: '0.73rem',
              color: '#e0f2fe',
              fontWeight: 600
            }}
          >
            {statusToast}
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* TAB 1: GLOBAL SOURCE & SMART UNITS */}
          {activeTab === 'source' && (
            <>
              <div>
                <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '2px' }}>
                  Global Reference Source &amp; Smart Unit Synchronizer
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Type inline units (`10 Ci`, `250 mCi`, `3.7e11 Bq`, `6 ft`, `2 in`) and push directly to the active calculator.
                </div>
              </div>

              {/* Preset Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.69rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Quick Industry / Clinical Source Preset
                </label>
                <select
                  className="form-control"
                  value=""
                  onChange={e => {
                    const idx = Number(e.target.value);
                    if (!Number.isNaN(idx) && GLOBAL_SOURCE_PRESETS[idx]) {
                      setActiveSource(GLOBAL_SOURCE_PRESETS[idx]);
                    }
                  }}
                  style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                >
                  <option value="" disabled>
                    Choose standard source preset...
                  </option>
                  {GLOBAL_SOURCE_PRESETS.map((preset, i) => (
                    <option key={preset.label} value={i}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Isotope & Shield Material Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Radionuclide
                  </label>
                  <select
                    className="form-control"
                    value={activeSource.isotope}
                    onChange={e => setActiveSource({ isotope: e.target.value })}
                    style={{ fontSize: '0.78rem', padding: '5px 8px', fontFamily: 'var(--font-mono)' }}
                  >
                    {Object.keys(ISOTOPE_QUICK_REF).map(iso => (
                      <option key={iso} value={iso}>
                        {iso} ({ISOTOPE_QUICK_REF[iso].halfLifeStr})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    Shield Material
                  </label>
                  <select
                    className="form-control"
                    value={activeSource.shieldMaterial}
                    onChange={e =>
                      setActiveSource({
                        shieldMaterial: e.target.value as GlobalSourceContext['shieldMaterial']
                      })
                    }
                    style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                  >
                    {(['Lead', 'Tungsten', 'Depleted Uranium', 'Steel', 'Concrete', 'Water'] as const).map(mat => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Smart Unit Inputs (#6) */}
              <SmartQuantityInput
                label="Source Activity (A)"
                dimension="activity"
                valueBase={activeSource.activityGBq}
                onChangeBase={gbq => setActiveSource({ activityGBq: gbq })}
                minBase={1e-9}
                maxBase={1e9}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <SmartQuantityInput
                  label="Standoff Distance (r)"
                  dimension="distance"
                  valueBase={activeSource.distanceM}
                  onChangeBase={m => setActiveSource({ distanceM: m })}
                  minBase={0.05}
                  maxBase={10000}
                />
                <SmartQuantityInput
                  label="Shield Thickness (x)"
                  dimension="thickness"
                  valueBase={activeSource.shieldThicknessCm}
                  onChangeBase={cm => setActiveSource({ shieldThicknessCm: cm })}
                  minBase={0}
                  maxBase={500}
                />
              </div>

              {/* Live Broad-Beam Dose KPI Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '10px',
                  background: 'rgba(15, 23, 42, 0.72)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Unshielded H*(10)
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                    {formatDoseMSv(Number(quickPhysics.unshieldedMSvPerHr.toPrecision(4)), '/h')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Shielded (w/ Buildup)
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {formatDoseMSv(Number(quickPhysics.shieldedMSvPerHr.toPrecision(4)), '/h')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Buildup &amp; HVLs
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                    B = {quickPhysics.buildupFactor.toFixed(2)} ({quickPhysics.numHvls.toFixed(1)} HVLs)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    {currentFramework.shortCode} Stay Time
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                    {quickPhysics.stayTimeHours > 9999 ? '> 9,999 h' : `${quickPhysics.stayTimeHours.toFixed(1)} h`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="active"
                onClick={() => {
                  onApplySourceToCurrentModule(activeSource);
                  showToast(`✓ Applied ${activeSource.isotope} (${activeSource.activityGBq} GBq) to active module`);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.79rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⚡ Apply Source to Current Module
              </button>

              <CrossModulePipelineBar activeModuleInfo={activeModuleInfo} />
            </>
          )}

          {/* TAB 2: CALCULATION PINBOARD, .RADPROJ & MASTER DOSSIER */}
          {activeTab === 'pinboard' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.69rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Workspace Project Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  style={{ fontSize: '0.80rem', padding: '5px 9px' }}
                />
              </div>

              {/* Pin Current Snapshot */}
              <div
                style={{
                  padding: '10px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px'
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Capture Current Module Snapshot
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional engineering note (e.g. Case A — 5 cm Pb wall)..."
                  value={pinNote}
                  onChange={e => setPinNote(e.target.value)}
                  style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                />
                <button
                  type="button"
                  className="active"
                  onClick={handlePinSnapshot}
                  style={{ padding: '6px 10px', borderRadius: '5px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  📌 Pin Active Module Calculation
                </button>
              </div>

              {/* Project Portable File (.radproj) & Multi-Module Master Dossier Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsMasterDossierOpen(true)}
                  style={{
                    gridColumn: '1 / -1',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📜 Compile Master Audit Dossier ({pinnedResults.length} Pins)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportWorkspaceProject();
                    showToast('✓ Exported portable .radproj.json file');
                  }}
                  style={{ padding: '6px 8px', borderRadius: '5px', fontSize: '0.73rem', cursor: 'pointer' }}
                >
                  💾 Save .radproj
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '6px 8px', borderRadius: '5px', fontSize: '0.73rem', cursor: 'pointer' }}
                >
                  📂 Load .radproj
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.radproj"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const res = importWorkspaceProject(String(reader.result || ''));
                      showToast(res.ok ? `✓ ${res.message}` : `⚠ ${res.message}`);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Pinned Items List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#cbd5e1' }}>
                  Pinned Calculations ({pinnedResults.length})
                </span>
                {pinnedResults.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPinnedCalculations}
                    style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {pinnedResults.length === 0 ? (
                <div style={{ fontSize: '0.76rem', color: '#64748b', textAlign: 'center', padding: '18px 10px' }}>
                  No calculations pinned yet. Pin results across multiple modules to compare them or compile a unified Master Dossier.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pinnedResults.map(pin => (
                    <div
                      key={pin.id}
                      style={{
                        padding: '9px 10px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.72)',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <strong
                          onClick={() => navigate(pin.modulePath)}
                          style={{ fontSize: '0.76rem', color: '#e2e8f0', cursor: 'pointer', lineHeight: 1.35 }}
                          title="Click to reopen module with saved parameters"
                        >
                          {pin.title}
                        </strong>
                        <button
                          type="button"
                          onClick={() => removePinnedCalculation(pin.id)}
                          style={{ padding: '1px 5px', fontSize: '0.68rem', borderRadius: '3px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{pin.summary}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {pin.metrics.map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.67rem',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: 'rgba(30, 41, 59, 0.9)',
                              color: '#bae6fd',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            {m.label}: {m.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: TOOL GUIDE & WORKED EXAMPLES */}
          {activeTab === 'guide' && activeModuleInfo && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#e2e8f0' }}>
                  M{String(activeModuleInfo.moduleNumber).padStart(2, '0')} Reference Guide
                </span>
                <button
                  type="button"
                  onClick={onOpenFullWidthGuide}
                  style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '0.71rem', cursor: 'pointer' }}
                >
                  ⤢ Expand Full-Width
                </button>
              </div>
              <Suspense
                fallback={
                  <div style={{ padding: '20px', fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    Loading mathematical reference &amp; worked benchmark...
                  </div>
                }
              >
                <LazyModuleInfoTabPanel
                  moduleInfo={activeModuleInfo}
                  onReturnToTool={onClose}
                />
              </Suspense>
            </>
          )}

          {/* TAB 4: INTERACTIVE PHYSICS TUTOR V2 */}
          {activeTab === 'tutor' && (
            <PhysicsTutorDrawer
              embeddedInInspector
              activeModuleInfo={activeModuleInfo}
              onApplySourceToCurrentModule={() => onApplySourceToCurrentModule(activeSource)}
            />
          )}
        </div>
      </aside>

      <AuditDossierModal
        payload={masterDossierPayload}
        isOpen={isMasterDossierOpen}
        onClose={() => setIsMasterDossierOpen(false)}
      />
    </>
  );
};
