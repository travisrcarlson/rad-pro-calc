import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';
import {
  XCOM_GP_MATERIALS,
  evaluateXCOMAttenuation,
  evaluateGPBuildup,
  evaluateMultiLayerBuildup,
  solveBroadBeamThicknessCm,
  getMaterialNeutronRemoval,
  evaluateNeutronRemovalStack,
  type BuildupModelType
} from '../../utils/xcomAndGpBuildup';

const Plot = (PlotComponent as any).default || PlotComponent;

export type ShieldTab = 'layers' | 'buildup' | 'solver' | 'physics';

interface IsotopePreset {
  id: string;
  name: string;
  energyMev: number;
  description: string;
}

const ISOTOPE_PRESETS: IsotopePreset[] = [
  { id: 'ba133_x', name: 'Ba-133 / Pb-Edge Below (81.0 keV)', energyMev: 0.081, description: 'Just below Lead K-edge (88.005 keV) — demonstrates K-edge transmission window.' },
  { id: 'pb_above', name: 'Above Pb K-Edge (90.0 keV)', energyMev: 0.090, description: 'Just above Lead K-edge (88.005 keV) — 4.02× surge in photoelectric absorption.' },
  { id: 'am241', name: 'Am-241 (59.5 keV)', energyMev: 0.0595, description: 'Low-energy alpha/gamma emitter. High photoelectric absorption.' },
  { id: 'tc99m', name: 'Tc-99m (140.5 keV)', energyMev: 0.1405, description: 'Diagnostic nuclear medicine. Above Pb & U K-edges.' },
  { id: 'i131', name: 'I-131 (364 keV)', energyMev: 0.364, description: 'Medical radioiodine therapy. Intermediate gamma energy.' },
  { id: 'ir192', name: 'Ir-192 (380 keV avg)', energyMev: 0.380, description: 'Industrial radiography & HDR brachytherapy.' },
  { id: 'cs137', name: 'Cs-137 (661.7 keV)', energyMev: 0.6617, description: 'Standard industrial & irradiator reference gamma line.' },
  { id: 'co60', name: 'Co-60 (1.25 MeV avg)', energyMev: 1.25, description: 'Teletherapy & industrial irradiator. Compton-dominated deep penetration.' },
  { id: 'linac6', name: '6 MV Linac (2.0 MeV eff)', energyMev: 2.0, description: 'Clinical linear accelerator broad spectrum.' },
  { id: 'high10', name: 'High-Energy Bremsstrahlung (10.0 MeV)', energyMev: 10.0, description: 'Industrial linac. Pair production starts dominating in high-Z media.' }
];

interface ShieldLayer {
  id: string;
  materialKey: string;
  thicknessCm: number;
}

export const ShieldingModule: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ShieldTab>('layers');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cs137');
  const [photonEnergyMev, setPhotonEnergyMev] = useState<number>(0.6617);
  const [incidentDoseRate, setIncidentDoseRate] = useState<number>(1000.0); // µSv/h
  const [enableNeutronField, setEnableNeutronField] = useState<boolean>(true);
  const [incidentNeutronRate, setIncidentNeutronRate] = useState<number>(250.0); // µSv/h fast neutron
  const [buildupModel, setBuildupModel] = useState<BuildupModelType>('GP_ANS643');
  const [inspectMaterialKey, setInspectMaterialKey] = useState<string>('LEAD');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const agedMixBanner = searchParams.get('agedMix');

  useEffect(() => {
    const eParam = searchParams.get('energyMeV');
    const actParam = searchParams.get('activityMBq');
    if (eParam) {
      const val = parseFloat(eParam);
      if (!isNaN(val) && val > 0.005) {
        setPhotonEnergyMev(val);
        setSelectedPresetId('custom');
      }
    }
    if (actParam) {
      const actMBq = parseFloat(actParam);
      if (!isNaN(actMBq) && actMBq > 0) {
        // Approximate unshielded dose rate at 1m in uSv/h
        setIncidentDoseRate(Math.max(1, Number((actMBq * 0.12).toFixed(1))));
      }
    }
  }, [searchParams]);

  // Initial multi-layer stack
  const [layers, setLayers] = useState<ShieldLayer[]>([
    { id: 'l1', materialKey: 'CONCRETE', thicknessCm: 15.0 },
    { id: 'l2', materialKey: 'LEAD', thicknessCm: 2.0 }
  ]);

  // Solver target limit
  const [targetDoseLimit, setTargetDoseLimit] = useState<number>(2.5); // µSv/h

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = ISOTOPE_PRESETS.find(x => x.id === presetId);
    if (p) {
      setPhotonEnergyMev(p.energyMev);
    }
  };

  const handleReverseLayers = () => {
    setLayers(prev => [...prev].reverse());
  };

  // Stack Calculations with ANSI/ANS-6.4.3 GP + Kalos/Broder Multi-Layer Stratification
  const stackAnalytics = useMemo(() => {
    let accumulatedOpticalThickness = 0;
    let totalMassArealGcm2 = 0;
    let totalThicknessCm = 0;

    const rawLayers = layers.map(l => {
      const xcom = evaluateXCOMAttenuation(l.materialKey, photonEnergyMev);
      const mfp = xcom.muLinear * l.thicknessCm;
      return {
        ...l,
        ...xcom,
        mfp
      };
    });

    const multiBuildup = evaluateMultiLayerBuildup(
      rawLayers.map(r => ({ materialKey: r.materialKey, mfp: r.mfp })),
      photonEnergyMev,
      buildupModel
    );

    // Also evaluate reversed stack to show Kalos stratification effect
    const reversedRaw = [...rawLayers].reverse();
    const reversedBuildup = evaluateMultiLayerBuildup(
      reversedRaw.map(r => ({ materialKey: r.materialKey, mfp: r.mfp })),
      photonEnergyMev,
      buildupModel
    );

    const layerDetails = rawLayers.map((r, idx) => {
      accumulatedOpticalThickness += r.mfp;
      const layerArealDensity = r.density * r.thicknessCm;
      totalMassArealGcm2 += layerArealDensity;
      totalThicknessCm += r.thicknessCm;

      const cumMfp = multiBuildup.cumulativeMfpByLayer[idx];
      const cumB = multiBuildup.effectiveBuildupAtLayerExit[idx];
      const exitDose = incidentDoseRate * cumB * Math.exp(-cumMfp);

      const gpEval = evaluateGPBuildup(r.materialKey, photonEnergyMev, r.mfp);
      const mat = XCOM_GP_MATERIALS[r.materialKey];
      const nSpec = getMaterialNeutronRemoval(r.materialKey);

      return {
        id: r.id,
        materialKey: r.materialKey,
        thicknessCm: r.thicknessCm,
        index: idx + 1,
        name: mat?.name || r.materialKey,
        symbol: mat?.symbol || r.materialKey,
        effectiveZ: r.effectiveZ,
        density: r.density,
        muLinear: r.muLinear,
        muMass: r.muMass,
        muEnMass: r.muEnMass,
        activeEdgeNote: r.activeEdgeNote,
        hvlCm: Math.LN2 / r.muLinear,
        tvlCm: Math.LN10 / r.muLinear,
        opticalX: r.mfp,
        cumulativeMfp: cumMfp,
        cumulativeBuildupAtExit: cumB,
        gpSingleLayer: gpEval,
        arealDensityGcm2: layerArealDensity,
        exitDose,
        sigmaRMass: nSpec.sigmaRMass,
        sigmaRLinear: nSpec.sigmaRLinear,
        hvlNeutronCm: nSpec.hvlNeutronCm,
        sigmaRx: nSpec.sigmaRLinear * r.thicknessCm,
        captureNote: nSpec.captureNote
      };
    });

    const cumulativeBuildup = multiBuildup.totalBuildup;
    const narrowBeamDoseRate = incidentDoseRate * Math.exp(-accumulatedOpticalThickness);
    const finalDoseRate = narrowBeamDoseRate * cumulativeBuildup;
    const reversedDoseRate = narrowBeamDoseRate * reversedBuildup.totalBuildup;

    const neutronEval = evaluateNeutronRemovalStack(
      layers.map(l => ({ materialKey: l.materialKey, thicknessCm: l.thicknessCm })),
      enableNeutronField ? incidentNeutronRate : 0
    );

    const totalAttenuationRatio = incidentDoseRate > 0 ? incidentDoseRate / Math.max(1e-15, finalDoseRate) : 1.0;
    const totalDecades = Math.log10(Math.max(1.0, totalAttenuationRatio));
    const structuralLoadKgM2 = totalMassArealGcm2 * 10.0;
    const structuralLoadLbFt2 = structuralLoadKgM2 * 0.204816;

    return {
      layerDetails,
      finalDoseRate,
      narrowBeamDoseRate,
      reversedDoseRate,
      reversedBuildupFactor: reversedBuildup.totalBuildup,
      totalThicknessCm,
      totalMassArealGcm2,
      structuralLoadKgM2,
      structuralLoadLbFt2,
      totalAttenuationRatio,
      totalDecades,
      accumulatedOpticalThickness,
      cumulativeBuildup,
      neutronEval,
      combinedGammaNeutronExitRate: finalDoseRate + (enableNeutronField ? neutronEval.transmittedNeutronDoseRate : 0)
    };
  }, [layers, photonEnergyMev, incidentDoseRate, buildupModel, enableNeutronField, incidentNeutronRate]);

  // Continuous penetration curve (Broad-Beam vs Narrow-Beam + Fast Neutron Removal + Layer Boundary Regions)
  const depthProfile = useMemo(() => {
    const points: { depthCm: number; broadDoseRate: number; narrowDoseRate: number; neutronDoseRate: number; layerName: string }[] = [];
    points.push({
      depthCm: 0,
      broadDoseRate: incidentDoseRate,
      narrowDoseRate: incidentDoseRate,
      neutronDoseRate: enableNeutronField ? incidentNeutronRate : 1e-6,
      layerName: 'Incident Field'
    });

    const layerZones: { x0: number; x1: number; label: string; color: string }[] = [];
    const zonePalette = [
      'rgba(56, 189, 248, 0.08)',
      'rgba(168, 85, 247, 0.10)',
      'rgba(16, 185, 129, 0.08)',
      'rgba(245, 158, 11, 0.09)',
      'rgba(239, 68, 68, 0.08)'
    ];

    let curDepth = 0;
    const completedLayers: { materialKey: string; mfp: number }[] = [];
    const completedNeutronLayers: { materialKey: string; thicknessCm: number }[] = [];
    let cumMfpBefore = 0;

    layers.forEach((layer, lIdx) => {
      const { muLinear } = evaluateXCOMAttenuation(layer.materialKey, photonEnergyMev);
      const mat = XCOM_GP_MATERIALS[layer.materialKey];
      const steps = 16;
      const dStep = layer.thicknessCm / steps;

      layerZones.push({
        x0: curDepth,
        x1: curDepth + layer.thicknessCm,
        label: `#${lIdx + 1} ${mat?.symbol || layer.materialKey} (${layer.thicknessCm} cm)`,
        color: zonePalette[lIdx % zonePalette.length]
      });

      for (let s = 1; s <= steps; s++) {
        const xStep = s * dStep;
        const partialMfp = muLinear * xStep;
        const totalMfpAtStep = cumMfpBefore + partialMfp;

        const partialStack = [...completedLayers, { materialKey: layer.materialKey, mfp: partialMfp }];
        const bStep = evaluateMultiLayerBuildup(partialStack, photonEnergyMev, buildupModel).totalBuildup;

        const narrowStep = incidentDoseRate * Math.exp(-totalMfpAtStep);
        const broadStep = narrowStep * bStep;

        const partialNeutronStack = [...completedNeutronLayers, { materialKey: layer.materialKey, thicknessCm: xStep }];
        const nStep = enableNeutronField
          ? evaluateNeutronRemovalStack(partialNeutronStack, incidentNeutronRate).transmittedNeutronDoseRate
          : 1e-6;

        points.push({
          depthCm: curDepth + xStep,
          broadDoseRate: Math.max(1e-6, broadStep),
          narrowDoseRate: Math.max(1e-6, narrowStep),
          neutronDoseRate: Math.max(1e-6, nStep),
          layerName: mat?.name || layer.materialKey
        });
      }

      curDepth += layer.thicknessCm;
      const fullLayerMfp = muLinear * layer.thicknessCm;
      completedLayers.push({ materialKey: layer.materialKey, mfp: fullLayerMfp });
      completedNeutronLayers.push({ materialKey: layer.materialKey, thicknessCm: layer.thicknessCm });
      cumMfpBefore += fullLayerMfp;
    });

    return { points, layerZones };
  }, [layers, photonEnergyMev, incidentDoseRate, buildupModel, enableNeutronField, incidentNeutronRate]);

  // NIST XCOM K/L-Edge Continuous Energy Curve for inspected material
  const xcomSpectrumCurve = useMemo(() => {
    const mat = XCOM_GP_MATERIALS[inspectMaterialKey] || XCOM_GP_MATERIALS.LEAD;
    const energiesKeV: number[] = [];
    const muMassVals: number[] = [];
    const muEnVals: number[] = [];

    // Sample every segment including exact edge endpoints to render vertical K/L-edge jumps cleanly
    for (const seg of mat.segments) {
      const nSamples = 25;
      const logMin = Math.log(seg.minEnergyMev);
      const logMax = Math.log(seg.maxEnergyMev);
      for (let i = 0; i <= nSamples; i++) {
        // Offset endpoints by 1e-6 MeV to stay strictly inside segment boundaries
        let eMev = Math.exp(logMin + (i / nSamples) * (logMax - logMin));
        if (i === 0) eMev = seg.minEnergyMev + 1e-6;
        if (i === nSamples) eMev = seg.maxEnergyMev - 1e-6;

        const pts = seg.points;
        let idx = 0;
        while (idx < pts.length - 2 && pts[idx + 1][0] < eMev) idx++;
        const [e0, m0, me0] = pts[idx];
        const [e1, m1, me1] = pts[Math.min(pts.length - 1, idx + 1)];
        let mu = m0;
        let muEn = me0;
        if (e1 > e0) {
          const f = Math.max(0, Math.min(1, (Math.log(eMev) - Math.log(e0)) / (Math.log(e1) - Math.log(e0))));
          mu = Math.exp(Math.log(m0) + f * (Math.log(m1) - Math.log(m0)));
          muEn = Math.exp(Math.log(me0) + f * (Math.log(me1) - Math.log(me0)));
        }
        energiesKeV.push(eMev * 1000);
        muMassVals.push(mu);
        muEnVals.push(muEn);
      }
    }

    const currentPoint = evaluateXCOMAttenuation(inspectMaterialKey, photonEnergyMev);
    return { mat, energiesKeV, muMassVals, muEnVals, currentPoint };
  }, [inspectMaterialKey, photonEnergyMev]);

  // Exact Bisection Solver Table for required barrier thickness
  const solverResults = useMemo(() => {
    const target = Math.max(1e-4, targetDoseLimit);
    const requiredRatio = Math.max(1.0, incidentDoseRate / target);
    const requiredDecades = Math.log10(requiredRatio);

    return Object.entries(XCOM_GP_MATERIALS)
      .map(([key, mat]) => {
        const { muLinear, muMass } = evaluateXCOMAttenuation(key, photonEnergyMev);
        const hvlCm = Math.LN2 / muLinear;
        const tvlCm = Math.LN10 / muLinear;
        const narrowThicknessCm = Math.log(requiredRatio) / muLinear;

        const solved = solveBroadBeamThicknessCm(key, photonEnergyMev, requiredRatio, buildupModel);
        const requiredThicknessCm = solved.thicknessCm;
        const arealDensityGcm2 = requiredThicknessCm * mat.density;
        const loadKgM2 = arealDensityGcm2 * 10;

        return {
          key,
          name: mat.name,
          density: mat.density,
          muLinear,
          muMass,
          hvlCm,
          tvlCm,
          requiredDecades,
          narrowThicknessCm,
          requiredThicknessCm,
          opticalMfp: solved.opticalMfp,
          buildupAtSolution: solved.buildupAtSolution,
          arealDensityGcm2,
          loadKgM2
        };
      })
      .sort((a, b) => a.requiredThicknessCm - b.requiredThicknessCm);
  }, [incidentDoseRate, targetDoseLimit, photonEnergyMev, buildupModel]);

  const handleAddLayer = (materialKey: string = 'LEAD') => {
    const newId = `layer_${Date.now()}`;
    setLayers([...layers, { id: newId, materialKey, thicknessCm: 2.0 }]);
  };

  const handleRemoveLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const handleUpdateLayer = (id: string, field: 'materialKey' | 'thicknessCm', val: any) => {
    setLayers(layers.map(l => (l.id === id ? { ...l, [field]: val } : l)));
  };

  const dossierPayload: CalculationDossierPayload = useMemo(
    () => ({
      reportTitle: 'ICS-208 Radiation Shielding & ANSI/ANS-6.4.3 GP Buildup Engineering Dossier',
      moduleName: 'Module 14 (Shielding & ALARA Design)',
      statuteCitation: 'ANSI/ANS-6.4.3-1991 / NCRP Report No. 151 / NIST XCOM SRD 8',
      verificationTestId: 'VTEST-03',
      operatorName: 'Radiation Shielding Physicist',
      operatorCredentials: 'CHP / Medical Physicist',
      facility: 'Central Radiotherapy & Industrial Shielding Facility',
      notes: `Multi-layer barrier analysis for ${photonEnergyMev.toFixed(4)} MeV photons using ${buildupModel}. Initial field: ${incidentDoseRate.toFixed(1)} µSv/h. Broad-beam exit: ${stackAnalytics.finalDoseRate.toFixed(2)} µSv/h (B_total = ${stackAnalytics.cumulativeBuildup.toFixed(2)}×). Reversed stack exit: ${stackAnalytics.reversedDoseRate.toFixed(2)} µSv/h.`,
      formulaDescription:
        'I(x) = I_0 \\cdot B_{\\text{GP}}(E, \\sum \\mu_i x_i) \\cdot e^{-\\sum \\mu_i x_i}, \\quad K(E,x) = c x^a + d\\frac{\\tanh(x/X_k - 2) - \\tanh(-2)}{1 - \\tanh(-2)}',
      inputs: [
        { label: 'Photon Energy', value: photonEnergyMev, unit: 'MeV' },
        { label: 'Incident Dose Rate', value: incidentDoseRate, unit: 'µSv/h' },
        { label: 'Buildup Formulation', value: buildupModel },
        { label: 'Layer Count', value: layers.length },
        { label: 'Target ALARA Limit', value: targetDoseLimit, unit: 'µSv/h' }
      ],
      outputs: [
        {
          label: 'Broad-Beam Exit Dose Rate',
          value: stackAnalytics.finalDoseRate.toFixed(2),
          unit: 'µSv/h',
          status: stackAnalytics.finalDoseRate <= targetDoseLimit ? 'COMPLIANT' : 'WARNING'
        },
        {
          label: 'Total Stratified Buildup B(μx)',
          value: stackAnalytics.cumulativeBuildup.toFixed(3),
          unit: '×',
          status: 'PASS'
        },
        {
          label: 'Total Optical Depth',
          value: stackAnalytics.accumulatedOpticalThickness.toFixed(2),
          unit: 'mfp',
          status: 'PASS'
        },
        {
          label: 'Total Barrier Thickness',
          value: stackAnalytics.totalThicknessCm.toFixed(2),
          unit: 'cm',
          status: 'PASS'
        },
        {
          label: 'Structural Floor Load',
          value: stackAnalytics.structuralLoadKgM2.toFixed(1),
          unit: 'kg/m²',
          status: stackAnalytics.structuralLoadKgM2 > 1500 ? 'WARNING' : 'PASS'
        }
      ]
    }),
    [photonEnergyMev, incidentDoseRate, buildupModel, layers, targetDoseLimit, stackAnalytics]
  );

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Module Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">SHIELDING &amp; ALARA</span>
            <span className="hud-badge hud-badge-accent">ANSI/ANS-6.4.3 GP / NIST XCOM K-EDGES</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Module 14 — Multi-Layer Shielding, GP Buildup &amp; NIST XCOM K-Edge Engine
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Exact NIST XCOM mass attenuation with explicit K/L-shell photoelectric discontinuities, ANSI/ANS-6.4.3 5-parameter Geometric Progression (GP) buildup matrices, and Kalos stratified multi-layer synthesis.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <VerificationBadge testId="VTEST-03" standard="ANSI/ANS-6.4.3 & NCRP-151" />
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 14px' }}
          >
            Export Audit Dossier
          </button>
        </div>
      </div>

      {agedMixBanner && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#d1fae5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span>
            ⏱️ <strong>Aged Decay Mixture Imported from Module 24:</strong> {agedMixBanner}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            Weighted E_eff = {(photonEnergyMev * 1000).toFixed(1)} keV
          </span>
        </div>
      )}

      {/* Top Tactical HUD Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">INCIDENT FIELD RATE</span>
          <span className="hud-metric-value" style={{ color: '#ef4444' }}>
            {incidentDoseRate >= 1000 ? `${(incidentDoseRate / 1000).toFixed(2)} mSv/h` : `${incidentDoseRate.toFixed(1)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Energy: {(photonEnergyMev * 1000).toFixed(2)} keV ({photonEnergyMev.toFixed(4)} MeV)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">BROAD-BEAM EXIT RATE</span>
          <span className="hud-metric-value" style={{ color: stackAnalytics.finalDoseRate <= targetDoseLimit ? '#10b981' : '#f59e0b' }}>
            {stackAnalytics.finalDoseRate >= 1000
              ? `${(stackAnalytics.finalDoseRate / 1000).toFixed(2)} mSv/h`
              : `${stackAnalytics.finalDoseRate < 0.01 ? stackAnalytics.finalDoseRate.toExponential(2) : stackAnalytics.finalDoseRate.toFixed(2)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Narrow-Beam: {stackAnalytics.narrowBeamDoseRate < 0.01 ? stackAnalytics.narrowBeamDoseRate.toExponential(2) : stackAnalytics.narrowBeamDoseRate.toFixed(2)} µSv/h | B = {stackAnalytics.cumulativeBuildup.toFixed(2)}×
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">KALOS LAYER ORDERING</span>
          <span className="hud-metric-value" style={{ color: '#00e5ff' }}>
            B<sub>GP</sub> = {stackAnalytics.cumulativeBuildup.toFixed(2)}×
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            If Reversed: B = {stackAnalytics.reversedBuildupFactor.toFixed(2)}× ({stackAnalytics.reversedDoseRate.toFixed(1)} µSv/h)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">STRUCTURAL FLOOR LOAD</span>
          <span className="hud-metric-value" style={{ color: stackAnalytics.structuralLoadKgM2 > 1500 ? '#ef4444' : '#38bdf8' }}>
            {stackAnalytics.structuralLoadKgM2.toFixed(0)} kg/m²
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {stackAnalytics.structuralLoadLbFt2.toFixed(1)} lb/ft² ({stackAnalytics.accumulatedOpticalThickness.toFixed(2)} mfp total)
          </span>
        </div>
      </div>

      {/* Quick Radioisotope & Energy Selector Ribbon */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            RADIOISOTOPE &amp; K-EDGE PRESETS
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Buildup Formulation:</span>
            <select
              className="form-control"
              value={buildupModel}
              onChange={e => setBuildupModel(e.target.value as BuildupModelType)}
              style={{ fontSize: '0.8rem', padding: '4px 10px', width: 'auto' }}
            >
              <option value="GP_ANS643">ANSI/ANS-6.4.3 GP 5-Parameter (Harima / Kalos)</option>
              <option value="BERGER">Berger 2-Parameter Empirical Formula</option>
              <option value="TAYLOR">Taylor Two-Exponential Sum</option>
              <option value="NARROW_BEAM">Narrow-Beam Exponential Only (B = 1.0)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {ISOTOPE_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className="btn"
              style={{
                fontSize: '0.76rem',
                padding: '6px 11px',
                whiteSpace: 'nowrap',
                background: selectedPresetId === p.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                color: selectedPresetId === p.id ? '#000' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                fontWeight: selectedPresetId === p.id ? 'bold' : 'normal'
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '12px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Photon Energy (MeV, 0.010–15.0):</label>
            <input
              type="number"
              step="0.005"
              min="0.010"
              max="15.0"
              className="form-control"
              value={photonEnergyMev}
              onChange={e => {
                setSelectedPresetId('custom');
                setPhotonEnergyMev(Math.max(0.010, Math.min(15.0, parseFloat(e.target.value) || 0.5)));
              }}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Incident Dose Rate (µSv/h):</label>
            <input
              type="number"
              step="50"
              min="0.1"
              className="form-control"
              value={incidentDoseRate}
              onChange={e => setIncidentDoseRate(Math.max(0.01, parseFloat(e.target.value) || 100))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>ALARA Target Rate Limit (µSv/h):</label>
            <input
              type="number"
              step="0.5"
              min="0.01"
              className="form-control"
              value={targetDoseLimit}
              onChange={e => setTargetDoseLimit(Math.max(0.01, parseFloat(e.target.value) || 2.5))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: 0 }}>Fast Neutron Field (µSv/h):</label>
              <label style={{ fontSize: '0.72rem', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="checkbox"
                  checked={enableNeutronField}
                  onChange={e => setEnableNeutronField(e.target.checked)}
                />
                Enable Σ<sub>R</sub>
              </label>
            </div>
            <input
              type="number"
              step="25"
              min="0"
              disabled={!enableNeutronField}
              className="form-control"
              value={incidentNeutronRate}
              onChange={e => setIncidentNeutronRate(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: '100%', fontSize: '0.85rem', marginTop: '4px', opacity: enableNeutronField ? 1 : 0.45 }}
            />
          </div>
        </div>
      </div>

      {/* Ergonomic Workspace Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          🛡️ Multi-Layer Stack &amp; Kalos Stratification
        </button>
        <button
          className={`tab-btn ${activeTab === 'buildup' ? 'active' : ''}`}
          onClick={() => setActiveTab('buildup')}
        >
          🌊 ANS-6.4.3 GP Matrices &amp; NIST XCOM K/L-Edges
        </button>
        <button
          className={`tab-btn ${activeTab === 'solver' ? 'active' : ''}`}
          onClick={() => setActiveTab('solver')}
        >
          🎯 Exact Broad-Beam Thickness Solver
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          📐 ANS-6.4.3 &amp; NIST XCOM Formulations
        </button>
      </div>

      {/* TAB 1: Multi-Layer Stack & Depth Profile */}
      {activeTab === 'layers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.05fr) minmax(400px, 1.25fr)', gap: '16px', flex: 1 }}>
          {/* Left Column: Stack Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Configured Attenuation Layers ({layers.length})</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {layers.length >= 2 && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleReverseLayers}
                    style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                    title="Swap layer sequence to observe Kalos Low-Z -> High-Z vs High-Z -> Low-Z buildup difference"
                  >
                    🔄 Reverse Order (Kalos Test)
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => handleAddLayer('LEAD')}
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  + Add Layer
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stackAnalytics.layerDetails.map(l => (
                <div
                  key={l.id}
                  style={{
                    background: 'rgba(5, 10, 18, 0.7)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="hud-badge hud-badge-primary">#{l.index}</span>
                      <select
                        className="form-control"
                        value={l.materialKey}
                        onChange={e => handleUpdateLayer(l.id, 'materialKey', e.target.value)}
                        style={{ fontSize: '0.84rem', width: '240px' }}
                      >
                        {Object.entries(XCOM_GP_MATERIALS).map(([key, mat]) => (
                          <option key={key} value={key}>{mat.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRemoveLayer(l.id)}
                      title="Remove Layer"
                    >
                      Remove
                    </button>
                  </div>

                  {l.activeEdgeNote && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '4px 8px', borderRadius: '4px' }}>
                      ⚡ <strong>Photoelectric Edge Active:</strong> {l.activeEdgeNote}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Thickness (cm):</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        className="form-control"
                        value={l.thicknessCm}
                        onChange={e => handleUpdateLayer(l.id, 'thicknessCm', Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Cumulative Exit Rate (B={l.cumulativeBuildupAtExit.toFixed(2)}×):</label>
                      <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>
                        {l.exitDose >= 1000 ? `${(l.exitDose / 1000).toFixed(2)} mSv/h` : `${l.exitDose.toFixed(2)} µSv/h`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '0.74rem', color: 'var(--color-text-muted)', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>HVL<sub>&gamma;</sub>: {l.hvlCm.toFixed(2)} cm</span>
                    <span>TVL<sub>&gamma;</sub>: {l.tvlCm.toFixed(2)} cm</span>
                    <span>&mu;/&rho;: {l.muMass.toFixed(4)} cm²/g</span>
                    <span>&mu;x: {l.opticalX.toFixed(2)} mfp</span>
                    <span style={{ color: '#c084fc' }}>&Sigma;<sub>R</sub>: {l.sigmaRLinear.toFixed(3)} cm⁻¹ ({l.sigmaRx.toFixed(2)} mfp<sub>n</sub>)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Fast Neutron Removal (Σ_R) & Capture-Gamma Telemetry Card */}
            {enableNeutronField && (
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#d8b4fe' }}>
                    ⚛️ Albert-Welton / Spinney Fast Neutron Removal (&Sigma;<sub>R</sub>) &amp; Mixed n/&gamma; Cask
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '3px 9px' }}
                    onClick={() => {
                      setLayers([
                        { id: 'n1', materialKey: 'STEEL', thicknessCm: 10.0 },
                        { id: 'n2', materialKey: 'BORATED_PE', thicknessCm: 15.0 },
                        { id: 'n3', materialKey: 'LEAD', thicknessCm: 2.5 }
                      ]);
                      setPhotonEnergyMev(1.25);
                    }}
                  >
                    Load Cf-252 Cask (Fe + B-HDPE + Pb)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Neutron Relaxation (&Sigma;<sub>R</sub>x)</span>
                    <strong style={{ color: '#e9d5ff', fontSize: '0.88rem' }}>{stackAnalytics.neutronEval.totalSigmaRx.toFixed(2)} mfp<sub>n</sub></strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Neutron Buildup (B<sub>n</sub>)</span>
                    <strong style={{ color: '#e9d5ff', fontSize: '0.88rem' }}>{stackAnalytics.neutronEval.neutronBuildup.toFixed(2)}×</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Transmitted Fast-n Rate</span>
                    <strong style={{ color: '#c084fc', fontSize: '0.88rem' }}>{stackAnalytics.neutronEval.transmittedNeutronDoseRate.toFixed(2)} µSv/h</strong>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Combined (&gamma; + n) Exit</span>
                    <strong style={{ color: '#38bdf8', fontSize: '0.88rem' }}>{stackAnalytics.combinedGammaNeutronExitRate.toFixed(2)} µSv/h</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                  {stackAnalytics.neutronEval.advisory}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Plot */}
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00e5ff', marginBottom: '8px' }}>
              Broad-Beam (GP Stratified) vs. Narrow-Beam &amp; Fast Neutron (&Sigma;<sub>R</sub>) Attenuation Profile
            </span>
            <div style={{ flex: 1, minHeight: '380px' }}>
              <Plot
                data={[
                  {
                    x: depthProfile.points.map(p => p.depthCm),
                    y: depthProfile.points.map(p => p.broadDoseRate),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: `Gamma Broad-Beam (${buildupModel})`,
                    line: { color: '#00e5ff', width: 2.8 },
                    marker: { size: 4 },
                    hovertemplate: 'Depth: %{x:.2f} cm<br>Broad-Beam γ: %{y:.2f} µSv/h<extra></extra>'
                  },
                  {
                    x: depthProfile.points.map(p => p.depthCm),
                    y: depthProfile.points.map(p => p.narrowDoseRate),
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Gamma Uncollided (e^-μx)',
                    line: { color: '#f59e0b', dash: 'dot', width: 2 },
                    hovertemplate: 'Depth: %{x:.2f} cm<br>Uncollided γ: %{y:.2f} µSv/h<extra></extra>'
                  },
                  ...(enableNeutronField
                    ? [
                        {
                          x: depthProfile.points.map(p => p.depthCm),
                          y: depthProfile.points.map(p => p.neutronDoseRate),
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: 'Fast Neutron Removal (B_n·e^-Σ_Rx)',
                          line: { color: '#c084fc', dash: 'dashdot', width: 2.3 },
                          marker: { size: 3 },
                          hovertemplate: 'Depth: %{x:.2f} cm<br>Fast Neutron: %{y:.2f} µSv/h<extra></extra>'
                        }
                      ]
                    : []),
                  {
                    x: [0, stackAnalytics.totalThicknessCm * 1.05],
                    y: [targetDoseLimit, targetDoseLimit],
                    type: 'scatter',
                    mode: 'lines',
                    name: `ALARA Target (${targetDoseLimit} µSv/h)`,
                    line: { color: '#10b981', dash: 'dash', width: 1.5 }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 65, r: 25, t: 32, b: 50 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD' },
                  xaxis: { title: 'Cumulative Shield Depth z (cm)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Dose Rate Ḋ(z) (µSv/h)', type: 'log', gridcolor: '#1e293b' },
                  shapes: depthProfile.layerZones.map(z => ({
                    type: 'rect' as const,
                    xref: 'x' as const,
                    yref: 'paper' as const,
                    x0: z.x0,
                    x1: z.x1,
                    y0: 0,
                    y1: 1,
                    fillcolor: z.color,
                    line: { color: 'rgba(148, 163, 184, 0.35)', width: 1, dash: 'dot' as const }
                  })),
                  annotations: depthProfile.layerZones.map(z => ({
                    x: (z.x0 + z.x1) / 2,
                    y: 0.96,
                    xref: 'x' as const,
                    yref: 'paper' as const,
                    text: `<b>${z.label}</b>`,
                    showarrow: false,
                    font: { color: '#cbd5e1', size: 10 },
                    bgcolor: 'rgba(15, 23, 42, 0.75)',
                    bordercolor: '#334155',
                    borderwidth: 1,
                    borderpad: 3
                  })),
                  legend: { orientation: 'h', y: -0.2 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: false }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANS-6.4.3 GP Matrices & NIST XCOM K/L-Edges */}
      {activeTab === 'buildup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(350px, 1fr)', gap: '16px' }}>
            {/* Left: Interactive NIST XCOM Mass Attenuation Curve with K/L Shell Jumps */}
            <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00e5ff' }}>
                  NIST XCOM Mass Attenuation (&mu;/&rho;) &amp; Photoelectric K/L-Edges
                </span>
                <select
                  className="form-control"
                  value={inspectMaterialKey}
                  onChange={e => setInspectMaterialKey(e.target.value)}
                  style={{ fontSize: '0.8rem', width: '240px', padding: '4px 8px' }}
                >
                  {Object.entries(XCOM_GP_MATERIALS).map(([k, m]) => (
                    <option key={k} value={k}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ minHeight: '320px', flex: 1 }}>
                <Plot
                  data={[
                    {
                      x: xcomSpectrumCurve.energiesKeV,
                      y: xcomSpectrumCurve.muMassVals,
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Total Attenuation (μ/ρ)',
                      line: { color: '#00e5ff', width: 2.5 }
                    },
                    {
                      x: xcomSpectrumCurve.energiesKeV,
                      y: xcomSpectrumCurve.muEnVals,
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Energy-Absorption (μ_en/ρ)',
                      line: { color: '#10b981', dash: 'dot', width: 2 }
                    },
                    {
                      x: [photonEnergyMev * 1000],
                      y: [xcomSpectrumCurve.currentPoint.muMass],
                      type: 'scatter',
                      mode: 'markers',
                      name: `Active Energy (${(photonEnergyMev * 1000).toFixed(1)} keV)`,
                      marker: { color: '#ef4444', size: 11, symbol: 'diamond' }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 60, r: 20, t: 20, b: 45 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#E0E1DD', size: 11 },
                    xaxis: { title: 'Photon Energy E (keV, Log Scale)', type: 'log', gridcolor: '#1e293b' },
                    yaxis: { title: 'Mass Coefficient (cm²/g, Log Scale)', type: 'log', gridcolor: '#1e293b' },
                    legend: { orientation: 'h', y: -0.22 }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                  config={{ responsive: true, displayModeBar: false }}
                />
              </div>

              {xcomSpectrumCurve.mat.edges.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {xcomSpectrumCurve.mat.edges.map((ed, idx) => (
                    <span
                      key={idx}
                      onClick={() => setPhotonEnergyMev(ed.energyMev + 0.0005)}
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.14)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#f59e0b'
                      }}
                      title="Click to jump photon energy to this shell absorption edge"
                    >
                      <strong>{ed.shell}-Edge ({(ed.energyMev * 1000).toFixed(2)} keV):</strong> {ed.muMassBelow} → {ed.muMassAbove} cm²/g ({ed.jumpRatio}× jump)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: ANSI/ANS-6.4.3 5-Parameter GP Table for Active Stack */}
            <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>
                ANSI/ANS-6.4.3 Geometric Progression (GP) Parameters @ {(photonEnergyMev * 1000).toFixed(1)} keV
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                Interpolated 5-parameter Harima GP state vector <code style={{ color: '#00e5ff' }}>(b, c, a, X_k, d)</code> and dose multiplication factor <code style={{ color: '#f59e0b' }}>K(E, &mu;x)</code> for each configured barrier layer:
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Layer</th>
                      <th style={{ padding: '6px' }}>b (1 mfp)</th>
                      <th style={{ padding: '6px' }}>c</th>
                      <th style={{ padding: '6px' }}>a</th>
                      <th style={{ padding: '6px' }}>X<sub>k</sub></th>
                      <th style={{ padding: '6px' }}>d</th>
                      <th style={{ padding: '6px' }}>K(&mu;x)</th>
                      <th style={{ padding: '6px', color: '#f59e0b' }}>B<sub>GP</sub></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stackAnalytics.layerDetails.map(l => {
                      const p = l.gpSingleLayer.params;
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold' }}>#{l.index} {l.symbol} ({l.opticalX.toFixed(2)} mfp)</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.b.toFixed(3)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.c.toFixed(3)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.a.toFixed(3)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.Xk.toFixed(1)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{p.d.toFixed(3)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace', color: '#00e5ff' }}>{l.gpSingleLayer.K.toFixed(3)}</td>
                          <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 'bold', color: '#f59e0b' }}>{l.gpSingleLayer.B.toFixed(2)}×</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)', marginTop: 'auto' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  KALOS STRATIFIED MULTI-LAYER SYNTHESIS
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '4px' }}>
                  Current Order Buildup: {stackAnalytics.cumulativeBuildup.toFixed(3)}× → {stackAnalytics.finalDoseRate.toFixed(2)} µSv/h
                </div>
                <div style={{ fontSize: '0.82rem', color: '#f59e0b', marginTop: '4px' }}>
                  Reversed Order Buildup: {stackAnalytics.reversedBuildupFactor.toFixed(3)}× → {stackAnalytics.reversedDoseRate.toFixed(2)} µSv/h
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                  Placing high-Z Lead downstream of low-Z Concrete photoelectrically absorbs degraded Compton scatter generated in Concrete.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Exact Broad-Beam ALARA Barrier Thickness Optimizer */}
      {activeTab === 'solver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Target Regulatory Dose Limit: {targetDoseLimit} µSv/h
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '12px' }}>
                Required Net Attenuation: {(incidentDoseRate / targetDoseLimit).toFixed(1)}× ({Math.log10(Math.max(1, incidentDoseRate / targetDoseLimit)).toFixed(2)} TVLs)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(0.5)}>Public Uncontrolled (0.5 µSv/h)</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(2.5)}>Controlled Area (2.5 µSv/h)</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(10.0)}>ALARA Target (10 µSv/h)</button>
            </div>
          </div>

          {/* Iso-Transmission Material Thickness (cm) vs. Structural Floor Load (kg/m²) Tradeoff Chart */}
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#00e5ff' }}>
                ⚖️ Iso-Transmission Material Tradeoff: Required Broad-Beam Thickness (cm) vs. Structural Floor Load (kg/m²)
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Evaluated @ E = {(photonEnergyMev * 1000).toFixed(1)} keV for {incidentDoseRate} → {targetDoseLimit} µSv/h
              </span>
            </div>
            <div style={{ height: '245px' }}>
              <Plot
                data={[
                  {
                    x: solverResults.map(r => r.name.split(' (')[0]),
                    y: solverResults.map(r => Number(r.requiredThicknessCm.toFixed(2))),
                    name: 'Broad-Beam Thickness (cm)',
                    type: 'bar',
                    marker: { color: '#00e5ff' },
                    yaxis: 'y'
                  },
                  {
                    x: solverResults.map(r => r.name.split(' (')[0]),
                    y: solverResults.map(r => Number(r.loadKgM2.toFixed(0))),
                    name: 'Structural Floor Load (kg/m²)',
                    type: 'scatter',
                    mode: 'lines+markers',
                    marker: { color: '#f59e0b', size: 8 },
                    line: { color: '#f59e0b', width: 2.5 },
                    yaxis: 'y2'
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 55, r: 65, t: 15, b: 45 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD', size: 11 },
                  xaxis: { gridcolor: '#1e293b' },
                  yaxis: { title: 'Required Thickness (cm)', titlefont: { color: '#00e5ff' }, tickfont: { color: '#00e5ff' }, gridcolor: '#1e293b' },
                  yaxis2: { title: 'Floor Load (kg/m²)', titlefont: { color: '#f59e0b' }, tickfont: { color: '#f59e0b' }, overlaying: 'y', side: 'right', showgrid: false },
                  legend: { orientation: 'h', y: 1.15, x: 0 }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: false }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-primary)' }}>
                  <th style={{ padding: '10px' }}>Shielding Material</th>
                  <th style={{ padding: '10px' }}>Linear &mu;</th>
                  <th style={{ padding: '10px' }}>Narrow-Beam</th>
                  <th style={{ padding: '10px', color: '#f59e0b' }}>Converged B(&mu;x)</th>
                  <th style={{ padding: '10px', color: '#00e5ff' }}>Exact Broad-Beam Thickness</th>
                  <th style={{ padding: '10px' }}>Optical Depth</th>
                  <th style={{ padding: '10px' }}>Floor Load</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {solverResults.map(res => (
                  <tr key={res.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{res.name}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{res.muLinear.toFixed(3)} cm⁻¹</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{res.narrowThicknessCm.toFixed(2)} cm</td>
                    <td style={{ padding: '10px', color: '#f59e0b', fontWeight: 'bold' }}>{res.buildupAtSolution.toFixed(2)}×</td>
                    <td style={{ padding: '10px', color: '#00e5ff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {res.requiredThicknessCm.toFixed(2)} cm
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{res.opticalMfp.toFixed(2)} mfp</td>
                    <td style={{ padding: '10px', color: res.loadKgM2 > 1500 ? '#ef4444' : 'var(--color-text-muted)' }}>
                      {res.loadKgM2.toFixed(0)} kg/m²
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setLayers([{ id: `l_${Date.now()}`, materialKey: res.key, thicknessCm: parseFloat(res.requiredThicknessCm.toFixed(2)) }]);
                          setActiveTab('layers');
                        }}
                      >
                        Apply to Stack
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ANS-6.4.3 & NIST Physics */}
      {activeTab === 'physics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', flex: 1 }}>
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>1. ANSI/ANS-6.4.3 Geometric Progression (GP)</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.82rem' }}>
              <BlockMath math="B_{\text{GP}}(E, x) = 1 + \frac{b - 1}{K - 1}(K^x - 1), \quad K(E, x) = c x^a + d\frac{\tanh(x/X_k - 2) - \tanh(-2)}{1 - \tanh(-2)}" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Harima&apos;s 5-parameter Geometric Progression formulation reproduces point-isotropic Boltzmann transport and moments-method reference benchmarks within &pm;3% up to 40 mean free paths.
            </p>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-accent)' }}>2. Photoelectric K/L-Shell Absorption Edges</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.82rem' }}>
              <BlockMath math="\tau_{\text{pe}}(E) \propto \frac{Z^{4.5}}{E^{3.5}} \cdot \Theta(E - E_K), \quad \left.\frac{\mu}{\rho}\right|_{E_K^+} \approx 4.02 \times \left.\frac{\mu}{\rho}\right|_{E_K^-} \ (\text{Pb})" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              When photon energy crosses an inner atomic shell binding energy (<code style={{ color: '#f59e0b' }}>88.005 keV</code> for Lead, <code style={{ color: '#f59e0b' }}>69.525 keV</code> for Tungsten), K-shell electrons become energetically accessible for photoelectric ejection, causing an abrupt 4×–5× surge in attenuation.
            </p>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#10b981' }}>3. Kalos / Broder Multi-Layer Stratification</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.82rem' }}>
              <BlockMath math="B_{\text{total}} = B_N(\tau_N) + \sum_{k=1}^{N-1} \left[B_k(\tau_k) - B_{k+1}(\tau_k)\right] e^{-(\tau_N - \tau_k)\delta_{Z_k < Z_{k+1}}}" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Multi-layer buildup is non-commutative: placing a high-Z absorber (Pb) downstream of a low-Z scatterer (Concrete) strips out low-energy Compton scatter and substantially lowers transmitted dose compared to the reverse order.
            </p>
          </div>
        </div>
      )}

      {/* Audit Dossier Modal */}
      <AuditDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        payload={dossierPayload}
      />
    </div>
  );
};

export default ShieldingModule;
