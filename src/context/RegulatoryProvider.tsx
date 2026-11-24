import React, { useState, useCallback } from 'react';
import {
  RegulatoryContext,
  REGULATORY_FRAMEWORKS,
  GLOBAL_SOURCE_PRESETS,
  safeStorageGet,
  safeStorageSet,
  areTelemetryRecordsEqual,
  type RegulatoryFrameworkId,
  type UnitSystemMode,
  type GlobalSourceContext,
  type PinnedCalculationItem,
  type LiveModuleTelemetry,
  type RadProWorkspaceProject,
} from './RegulatoryContext';

export const RegulatoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [frameworkId, setFrameworkIdState] = useState<RegulatoryFrameworkId>(() => {
    const saved = safeStorageGet('radpro_regulatory_framework');
    if (saved && saved in REGULATORY_FRAMEWORKS) {
      return saved as RegulatoryFrameworkId;
    }
    return 'NL_ANVS_BBS';
  });

  const [unitSystem, setUnitSystemState] = useState<UnitSystemMode>(() => {
    const saved = safeStorageGet('radpro_unit_system');
    if (saved === 'SI' || saved === 'TRADITIONAL' || saved === 'DUAL') {
      return saved;
    }
    return 'SI';
  });

  const [activeSource, setActiveSourceState] = useState<GlobalSourceContext>(() => {
    try {
      const saved = safeStorageGet('radpro_global_active_source');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isotope) return parsed;
      }
    } catch {
      // ignore
    }
    return GLOBAL_SOURCE_PRESETS[0];
  });

  const [pinnedResults, setPinnedResultsState] = useState<PinnedCalculationItem[]>(() => {
    try {
      const saved = safeStorageGet('radpro_pinned_calculations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const setActiveSource = (partial: Partial<GlobalSourceContext>) => {
    setActiveSourceState(prev => {
      const next = { ...prev, ...partial };
      safeStorageSet('radpro_global_active_source', JSON.stringify(next));
      return next;
    });
  };

  const pinCalculation = (item: Omit<PinnedCalculationItem, 'id' | 'timestamp'>) => {
    setPinnedResultsState(prev => {
      const newItem: PinnedCalculationItem = {
        ...item,
        id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      const next = [newItem, ...prev].slice(0, 30);
      safeStorageSet('radpro_pinned_calculations', JSON.stringify(next));
      return next;
    });
  };

  const removePinnedCalculation = (id: string) => {
    setPinnedResultsState(prev => {
      const next = prev.filter(p => p.id !== id);
      safeStorageSet('radpro_pinned_calculations', JSON.stringify(next));
      return next;
    });
  };

  const [projectName, setProjectNameState] = useState<string>(() => {
    return safeStorageGet('radpro_project_name') || 'RadPro Engineering Evaluation';
  });

  const setProjectName = useCallback((name: string) => {
    setProjectNameState(name);
    safeStorageSet('radpro_project_name', name);
  }, []);

  const [liveModuleTelemetry, setLiveModuleTelemetryState] = useState<LiveModuleTelemetry | null>(null);
  const [previousModuleTelemetry, setPreviousModuleTelemetryState] = useState<LiveModuleTelemetry | null>(null);
  const [telemetryDeltaSummary, setTelemetryDeltaSummaryState] = useState<string | null>(null);

  const setLiveModuleTelemetry = useCallback((telemetry: LiveModuleTelemetry | null) => {
    setLiveModuleTelemetryState(prev => {
      if (!telemetry) {
        if (!prev) return prev;
        setPreviousModuleTelemetryState(null);
        setTelemetryDeltaSummaryState(null);
        return null;
      }
      if (areTelemetryRecordsEqual(prev, telemetry)) {
        return prev;
      }
      if (prev && prev.moduleId === telemetry.moduleId) {
        const paramChanges: string[] = [];
        for (const [k, v] of Object.entries(telemetry.parameters)) {
          const oldVal = prev.parameters[k];
          if (oldVal !== undefined && String(oldVal) !== String(v)) {
            paramChanges.push(`${k}: ${oldVal} → ${v}`);
          }
        }
        const metricChanges: string[] = [];
        for (const [k, v] of Object.entries(telemetry.computedMetrics)) {
          const oldVal = prev.computedMetrics[k];
          if (oldVal !== undefined && String(oldVal) !== String(v)) {
            metricChanges.push(`${k}: ${oldVal} → ${v}`);
          }
        }
        if (paramChanges.length > 0 || metricChanges.length > 0) {
          setPreviousModuleTelemetryState(prev);
          const summaryParts = [...paramChanges.slice(0, 2), ...metricChanges.slice(0, 2)];
          setTelemetryDeltaSummaryState(summaryParts.join(' | '));
        }
      } else {
        setPreviousModuleTelemetryState(null);
        setTelemetryDeltaSummaryState(null);
      }
      return telemetry;
    });
  }, []);

  const clearLiveModuleTelemetry = useCallback(() => {
    setLiveModuleTelemetryState(prev => (prev === null ? prev : null));
    setPreviousModuleTelemetryState(prev => (prev === null ? prev : null));
    setTelemetryDeltaSummaryState(prev => (prev === null ? prev : null));
  }, []);

  const openInspectorDrawer = useCallback((tab: 'source' | 'grounding' | 'pinboard' | 'guide' | 'tutor') => {
    window.dispatchEvent(new CustomEvent('radpro:open-inspector', { detail: { tab } }));
  }, []);

  const openPhysicsTutor = useCallback((promptQuestion?: string, customTelemetry?: LiveModuleTelemetry) => {
    if (customTelemetry) {
      setLiveModuleTelemetryState(prev =>
        areTelemetryRecordsEqual(prev, customTelemetry) ? prev : customTelemetry
      );
    }
    window.dispatchEvent(new CustomEvent('radpro:open-inspector', { detail: { tab: 'tutor' } }));
    window.dispatchEvent(
      new CustomEvent('radpro:open-physics-tutor', {
        detail: { promptQuestion, customTelemetry }
      })
    );
  }, []);

  const exportWorkspaceProject = useCallback(() => {
    const payload: RadProWorkspaceProject = {
      formatVersion: '1.0',
      projectName,
      exportedAt: new Date().toISOString(),
      frameworkId,
      unitSystem,
      activeSource,
      pinnedResults
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'radpro-project';
    a.download = `${safeSlug}-${new Date().toISOString().slice(0, 10)}.radproj.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName, frameworkId, unitSystem, activeSource, pinnedResults]);

  const importWorkspaceProject = useCallback((jsonContent: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonContent) as Partial<RadProWorkspaceProject>;
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, message: 'Invalid .radproj file structure.' };
      }
      if (parsed.projectName) {
        setProjectNameState(parsed.projectName);
        safeStorageSet('radpro_project_name', parsed.projectName);
      }
      if (parsed.frameworkId && parsed.frameworkId in REGULATORY_FRAMEWORKS) {
        setFrameworkIdState(parsed.frameworkId);
        safeStorageSet('radpro_regulatory_framework', parsed.frameworkId);
      }
      if (parsed.unitSystem === 'SI' || parsed.unitSystem === 'TRADITIONAL' || parsed.unitSystem === 'DUAL') {
        setUnitSystemState(parsed.unitSystem);
        safeStorageSet('radpro_unit_system', parsed.unitSystem);
      }
      if (parsed.activeSource && parsed.activeSource.isotope) {
        setActiveSourceState(parsed.activeSource);
        safeStorageSet('radpro_global_active_source', JSON.stringify(parsed.activeSource));
      }
      if (Array.isArray(parsed.pinnedResults)) {
        setPinnedResultsState(parsed.pinnedResults);
        safeStorageSet('radpro_pinned_calculations', JSON.stringify(parsed.pinnedResults));
      }
      return {
        ok: true,
        message: `Loaded project "${parsed.projectName || 'Workspace'}" (${parsed.pinnedResults?.length || 0} pinned calculations).`
      };
    } catch {
      return { ok: false, message: 'Could not parse JSON in .radproj file.' };
    }
  }, []);

  const clearPinnedCalculations = () => {
    setPinnedResultsState([]);
    safeStorageSet('radpro_pinned_calculations', JSON.stringify([]));
  };

  const setFrameworkId = (id: RegulatoryFrameworkId) => {
    setFrameworkIdState(id);
    safeStorageSet('radpro_regulatory_framework', id);
  };

  const setUnitSystem = (mode: UnitSystemMode) => {
    setUnitSystemState(mode);
    safeStorageSet('radpro_unit_system', mode);
  };

  const formatDoseMSv = useCallback((mSv: number, suffix = ''): string => {
    if (!Number.isFinite(mSv)) return `0 mSv${suffix}`;
    const absMSv = Math.abs(mSv);
    const siStr =
      absMSv === 0
        ? `0 mSv${suffix}`
        : absMSv >= 1000
          ? `${+(mSv / 1000).toPrecision(4)} Sv${suffix}`
          : absMSv >= 0.1
            ? `${+mSv.toPrecision(4)} mSv${suffix}`
            : absMSv >= 1e-4
              ? `${+(mSv * 1000).toPrecision(4)} µSv${suffix}`
              : `${(mSv * 1000).toExponential(2)} µSv${suffix}`;

    const rem = mSv / 10.0;
    const mrem = mSv * 100.0;
    const absMrem = Math.abs(mrem);
    const tradCore =
      absMrem === 0
        ? '0 mrem'
        : Math.abs(rem) >= 1.0
          ? `${+rem.toPrecision(4)} rem`
          : absMrem >= 0.01
            ? `${+mrem.toPrecision(4)} mrem`
            : `${mrem.toExponential(2)} mrem`;
    const tradStr = `${tradCore}${suffix}`;

    if (unitSystem === 'SI') return siStr;
    if (unitSystem === 'TRADITIONAL') return tradStr;
    return `${siStr} (${tradStr})`;
  }, [unitSystem]);

  const formatDoseRateMSvHr = useCallback((mSvHr: number): string => formatDoseMSv(mSvHr, '/h'), [formatDoseMSv]);

  const formatActivityGBq = useCallback((gBq: number): string => {
    if (!Number.isFinite(gBq)) return '0 GBq';
    const absGBq = Math.abs(gBq);
    const siStr =
      absGBq === 0
        ? '0 Bq'
        : absGBq >= 1000
          ? `${+(gBq / 1000).toPrecision(4)} TBq`
          : absGBq >= 1
            ? `${+gBq.toPrecision(4)} GBq`
            : absGBq >= 1e-3
              ? `${+(gBq * 1e3).toPrecision(4)} MBq`
              : absGBq >= 1e-6
                ? `${+(gBq * 1e6).toPrecision(4)} kBq`
                : `${+(gBq * 1e9).toPrecision(4)} Bq`;

    const ci = gBq / 37.0;
    const absCi = Math.abs(ci);
    const tradStr =
      absCi === 0
        ? '0 Ci'
        : absCi >= 0.1
          ? `${+ci.toPrecision(4)} Ci`
          : absCi >= 1e-4
            ? `${+(ci * 1e3).toPrecision(4)} mCi`
            : `${+(ci * 1e6).toPrecision(4)} µCi`;

    if (unitSystem === 'SI') return siStr;
    if (unitSystem === 'TRADITIONAL') return tradStr;
    return `${siStr} (${tradStr})`;
  }, [unitSystem]);

  const currentFramework = REGULATORY_FRAMEWORKS[frameworkId];
  const allFrameworks = Object.values(REGULATORY_FRAMEWORKS);

  return (
    <RegulatoryContext.Provider
      value={{
        currentFramework,
        frameworkId,
        setFrameworkId,
        allFrameworks,
        unitSystem,
        setUnitSystem,
        formatDoseMSv,
        formatDoseRateMSvHr,
        formatActivityGBq,
        activeSource,
        setActiveSource,
        pinnedResults,
        pinCalculation,
        removePinnedCalculation,
        clearPinnedCalculations,
        liveModuleTelemetry,
        previousModuleTelemetry,
        telemetryDeltaSummary,
        setLiveModuleTelemetry,
        clearLiveModuleTelemetry,
        openPhysicsTutor,
        openInspectorDrawer,
        projectName,
        setProjectName,
        exportWorkspaceProject,
        importWorkspaceProject
      }}
    >
      {children}
    </RegulatoryContext.Provider>
  );
};
