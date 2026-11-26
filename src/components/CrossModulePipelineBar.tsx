import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegulatory } from '../context/RegulatoryContext';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';

export interface PipelineTarget {
  label: string;
  targetPath: string;
  reason: string;
  extraQuery?: Record<string, string>;
}

const MODULE_PIPELINE_MAP: Record<string, PipelineTarget[]> = {
  '/spectroscopy': [
    { label: 'M01 Dose Calculator', targetPath: '/dose', reason: 'Compute H*(10) dose rate from identified nuclide' },
    { label: 'M12 Reverse Triangulation', targetPath: '/responder', reason: 'Localize unknown source standoff & activity' },
    { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Size attenuation slab for identified photopeak' }
  ],
  '/decay': [
    { label: 'M01 Dose Calculator', targetPath: '/dose', reason: 'Evaluate external dose rate of aged source' },
    { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Design shielding for daughter gamma ingrowth' },
    { label: 'M15 Transport Packaging', targetPath: '/transport', reason: 'Verify IAEA SSR-6 Type A/B & TI limits' }
  ],
  '/reg': [
    { label: 'M24 Decay Chains', targetPath: '/decay', reason: 'Model decay-in-storage clearance to Bbs Bijlage 3 exemption' },
    { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Size lab bench shielding for ALARA & dose constraint' },
    { label: 'M03 Internal Dosimetry', targetPath: '/internal-dose', reason: 'Cross-check ICRP-119 e(50) committed effective dose' },
    { label: 'M15 Transport Packaging', targetPath: '/transport', reason: 'Verify IAEA SSR-6 Type A/B & ADR transport limits' }
  ],
  '/dose': [
    { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Calculate HVL/TVL slab to meet ALARA target' },
    { label: 'M02 Worker Dosimetry', targetPath: '/worker', reason: 'Compute RCA stay-time & turn-back alarms' },
    { label: 'M15 Transport Packaging', targetPath: '/transport', reason: 'Check Transport Index (TI) & package label' }
  ],
  '/shielding': [
    { label: 'M02 Worker Dosimetry', targetPath: '/worker', reason: 'Apply shielded dose rate to worker entry plan' },
    { label: 'M23 Monte Carlo Kernel', targetPath: '/monte-carlo', reason: 'Cross-check analytical buildup via stochastic transport' },
    { label: 'M04 3D Spatial Workspace', targetPath: '/spatial3d', reason: 'Model 3D room geometry & ray-traced walls' }
  ],
  '/nuclear-weapons-effects': [
    { label: 'M07 CBRN Fallout & Shelter', targetPath: '/cbrn-consequence', reason: 'Model 7:10 Way-Wigner fallout decay & shelter PF' },
    { label: 'M13 Plume Dispersion', targetPath: '/plume', reason: 'Track downwind Gaussian cloud transport' },
    { label: 'M06 Tactical CBRN Response', targetPath: '/first-responder', reason: 'Establish hot/warm/cold cordons & triage' }
  ],
  '/criticality': [
    { label: 'M22 CAAS Criticality Alarms', targetPath: '/caas-criticality', reason: 'Evaluate ANSI/ANS-8.3 excursion alarm & prompt dose' },
    { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Design biological concrete/water neutron shield' }
  ],
  '/plume': [
    { label: 'M03 Internal Dosimetry', targetPath: '/internal-dose', reason: 'Evaluate inhalation E(50) organ committed dose' },
    { label: 'M09 Medical Countermeasures', targetPath: '/medical-countermeasures', reason: 'Assess KI / Prussian Blue / DTPA decorporation' },
    { label: 'M27 MARSSIM Decommissioning', targetPath: '/marssim', reason: 'Plan post-plume surface DCGL status survey' }
  ]
};

const DEFAULT_PIPELINE_TARGETS: PipelineTarget[] = [
  { label: 'M01 Dose Calculator', targetPath: '/dose', reason: 'Compute external H*(10) dose rate' },
  { label: 'M14 Shielding & PAGs', targetPath: '/shielding', reason: 'Size broad-beam attenuation shielding' },
  { label: 'M24 Decay Chains', targetPath: '/decay', reason: 'Simulate Bateman daughter ingrowth & decay' },
  { label: 'M15 Transport Packaging', targetPath: '/transport', reason: 'Evaluate IAEA SSR-6 package limits' }
];

interface CrossModulePipelineBarProps {
  activeModuleInfo: ActiveModuleBreadcrumbInfo | null;
  compact?: boolean;
}

export const CrossModulePipelineBar: React.FC<CrossModulePipelineBarProps> = ({
  activeModuleInfo,
  compact = false
}) => {
  const navigate = useNavigate();
  const { activeSource, setActiveSource, liveModuleTelemetry, formatActivityGBq } = useRegulatory();

  const currentPath = activeModuleInfo?.path || '';
  const targets = (MODULE_PIPELINE_MAP[currentPath] || DEFAULT_PIPELINE_TARGETS).filter(
    t => t.targetPath !== currentPath
  );

  // Extract live nuclide & activity from active module telemetry if present
  const telemetryParams = liveModuleTelemetry?.parameters || {};
  const liveIsoRaw =
    telemetryParams['Isotope'] ??
    telemetryParams['Nuclide'] ??
    telemetryParams['Parent Nuclide'] ??
    telemetryParams['Identified Nuclide'] ??
    telemetryParams['Source Nuclide'];
  const effectiveIso = liveIsoRaw ? String(liveIsoRaw).trim() : activeSource.isotope;

  const liveActGBqRaw =
    telemetryParams['Activity (GBq)'] ??
    telemetryParams['Source Activity (GBq)'];
  const parsedLiveAct = liveActGBqRaw !== undefined ? parseFloat(String(liveActGBqRaw)) : NaN;
  const effectiveActivityGBq =
    Number.isFinite(parsedLiveAct) && parsedLiveAct > 0 ? parsedLiveAct : activeSource.activityGBq;

  const liveDistRaw = telemetryParams['Distance (m)'] ?? telemetryParams['Standoff (m)'];
  const parsedLiveDist = liveDistRaw !== undefined ? parseFloat(String(liveDistRaw)) : NaN;
  const effectiveDistanceM =
    Number.isFinite(parsedLiveDist) && parsedLiveDist > 0 ? parsedLiveDist : activeSource.distanceM;

  const handleChainToModule = (target: PipelineTarget) => {
    const params = new URLSearchParams();
    params.set('isotope', effectiveIso);
    params.set('nuclide', effectiveIso);
    params.set('search', effectiveIso);
    params.set('activity', String(effectiveActivityGBq));
    params.set('unit', 'GBq');
    params.set('distance', String(effectiveDistanceM));
    params.set('material', activeSource.shieldMaterial);
    params.set('thickness', String(activeSource.shieldThicknessCm));

    if (telemetryParams['Energy (MeV)'] !== undefined) {
      params.set('energyMeV', String(telemetryParams['Energy (MeV)']));
    }
    if (telemetryParams['Yield (kT)'] !== undefined) {
      params.set('yieldKt', String(telemetryParams['Yield (kT)']));
    }
    if (target.extraQuery) {
      Object.entries(target.extraQuery).forEach(([k, v]) => params.set(k, v));
    }

    // Keep global activeSource aligned with chained scenario
    if (effectiveIso !== activeSource.isotope || effectiveActivityGBq !== activeSource.activityGBq) {
      setActiveSource({
        isotope: effectiveIso,
        activityGBq: effectiveActivityGBq,
        distanceM: effectiveDistanceM
      });
    }

    navigate(`${target.targetPath}?${params.toString()}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: compact ? '8px 10px' : '10px 12px',
        background: 'rgba(15, 23, 42, 0.55)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: '6px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.71rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ⇄ Chain Active Scenario To Next Tool
        </span>
        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
          {effectiveIso} • {formatActivityGBq(effectiveActivityGBq)}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {targets.map(t => (
          <button
            key={t.targetPath}
            type="button"
            onClick={() => handleChainToModule(t)}
            title={t.reason}
            style={{
              padding: '4px 9px',
              borderRadius: '5px',
              fontSize: '0.73rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>{t.label}</span>
            <span style={{ opacity: 0.7 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
};
