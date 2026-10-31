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

export type ShieldTab = 'layers' | 'buildup' | 'solver' | 'pet_tg108' | 'labyrinth_skyshine' | 'physics';

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
  { id: 'f18', name: 'F-18 PET (511 keV)', energyMev: 0.511, description: 'Positron annihilation photon (AAPM TG-108 PET facility design).' },
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

  // Initial multi-layer stack
  const [layers, setLayers] = useState<ShieldLayer[]>([
    { id: 'l1', materialKey: 'CONCRETE', thicknessCm: 15.0 },
    { id: 'l2', materialKey: 'LEAD', thicknessCm: 2.0 }
  ]);

  // AAPM TG-108 PET / Nuclear Medicine Clinic Shielding State
  const [petActivityMBq, setPetActivityMBq] = useState<number>(555); // 15 mCi F-18 FDG
  const [petPatientsPerWeek, setPetPatientsPerWeek] = useState<number>(40);
  const [petUptakeTimeMin, setPetUptakeTimeMin] = useState<number>(60);
  const [petImagingTimeMin, setPetImagingTimeMin] = useState<number>(30);
  const [petDistanceM, setPetDistanceM] = useState<number>(2.5);
  const [petOccupancyT, setPetOccupancyT] = useState<number>(1.0);
  const [petWeeklyGoalUSv, setPetWeeklyGoalUSv] = useState<number>(20.0); // 20 uSv/wk public, 100 uSv/wk controlled
  const [petBarrierMaterial, setPetBarrierMaterial] = useState<'LEAD' | 'CONCRETE' | 'IRON'>('LEAD');
  const [petBarrierThicknessCm, setPetBarrierThicknessCm] = useState<number>(1.2); // 12 mm Pb

  // NCRP-151 Vault Labyrinth (Kersey) & Skyshine State
  const [mazeWorkloadDoseAt1mSvH, setMazeWorkloadDoseAt1mSvH] = useState<number>(50.0); // Sv/h at 1 m from isocenter/source
  const [mazeLeg1LengthM, setMazeLeg1LengthM] = useState<number>(4.5); // d1 (m)
  const [mazeLeg2LengthM, setMazeLeg2LengthM] = useState<number>(6.0); // d2 (m)
  const [mazeWidthM, setMazeWidthM] = useState<number>(1.5);
  const [mazeHeightM, setMazeHeightM] = useState<number>(2.4);
  const [mazeDoorBpeCm, setMazeDoorBpeCm] = useState<number>(10.0); // Borated Polyethylene cm
  const [mazeDoorLeadCm, setMazeDoorLeadCm] = useState<number>(1.5); // Lead cm
  const [skyRoofThicknessConcreteCm, setSkyRoofThicknessConcreteCm] = useState<number>(60.0);
  const [skySolidAngleSr, setSkySolidAngleSr] = useState<number>(0.85);
  const [skyHorizontalDistM, setSkyHorizontalDistM] = useState<number>(30.0);

  useEffect(() => {
    const eParam = searchParams.get('energyMeV');
    const actParam = searchParams.get('activityMBq');
    const isoParam = searchParams.get('isotope');
    const actGBqParam = searchParams.get('activity');
    const distParam = searchParams.get('distance');
    const matParam = searchParams.get('material');
    const thickParam = searchParams.get('thickness');

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
        setIncidentDoseRate(Math.max(1, Number((actMBq * 0.12).toFixed(1))));
      }
    }
    if (isoParam) {
      const lower = isoParam.toLowerCase().replace('-', '');
      const matched = ISOTOPE_PRESETS.find(p => p.id === lower || p.name.toLowerCase().includes(isoParam.toLowerCase()));
      if (matched) {
        setSelectedPresetId(matched.id);
        setPhotonEnergyMev(matched.energyMev);
      }
    }
    if (actGBqParam) {
      const gBq = parseFloat(actGBqParam);
      const r = distParam ? Math.max(0.1, parseFloat(distParam)) : 1.0;
      if (!isNaN(gBq) && gBq > 0) {
        // Estimate incident dose rate in uSv/h at distance r
        const gammaMap: Record<string, number> = {
          'Co-60': 308.5,
          'Cs-137': 77.2,
          'Ir-192': 116.8,
          'F-18': 143.0,
          'I-131': 52.2,
          'Tc-99m': 14.1,
          'Am-241': 3.1
        };
        const gConst = (isoParam && gammaMap[isoParam]) || 120.0;
        const rateUSvH = (gConst * gBq) / (r * r);
        setIncidentDoseRate(Math.max(0.1, Number(rateUSvH.toFixed(1))));
      }
    }
    if (matParam && thickParam) {
      const tVal = parseFloat(thickParam);
      const matUpper = matParam.toUpperCase();
      const validKey =
        matUpper.includes('LEAD') ? 'LEAD' :
        matUpper.includes('CONCRETE') ? 'CONCRETE' :
        matUpper.includes('STEEL') || matUpper.includes('IRON') ? 'IRON' :
        matUpper.includes('TUNGSTEN') ? 'TUNGSTEN' :
        matUpper.includes('WATER') ? 'WATER' : 'LEAD';
      if (!isNaN(tVal) && tVal > 0) {
        setLayers([{ id: 'l_sync_1', materialKey: validKey, thicknessCm: tVal }]);
      }
    }
  }, [searchParams]);

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

  // AAPM TG-108 PET / Nuclear Medicine Facility Shielding Analytics (511 keV Annihilation Photons)
  const petTg108Analytics = useMemo(() => {
    const halfLifeMin = 109.77; // F-18 half-life in minutes
    const gammaPatient = 0.092; // uSv·m²/(MBq·h) including 0.36 patient body self-attenuation
    const tU = Math.max(1, petUptakeTimeMin);
    const tI = Math.max(1, petImagingTimeMin);
    const d = Math.max(0.3, petDistanceM);

    const rU = ((1.443 * halfLifeMin) / tU) * (1 - Math.exp((-Math.LN2 * tU) / halfLifeMin));
    const rI = ((1.443 * halfLifeMin) / tI) * (1 - Math.exp((-Math.LN2 * tI) / halfLifeMin));
    const fU = Math.exp((-Math.LN2 * tU) / halfLifeMin);
    const fVoid = 0.85; // 15% urinary excretion post-uptake

    const unshieldedUptakeWeeklyUSv =
      gammaPatient * petActivityMBq * petPatientsPerWeek * (tU / 60.0) * rU * (petOccupancyT / (d * d));
    const unshieldedImagingWeeklyUSv =
      gammaPatient * petActivityMBq * fVoid * fU * petPatientsPerWeek * (tI / 60.0) * rI * (petOccupancyT / (d * d));

    // AAPM TG-108 Table II Archer parameters for 511 keV (adjusted for thickness x in cm)
    const archerParams: Record<'LEAD' | 'CONCRETE' | 'IRON', { alpha: number; beta: number; gamma: number; density: number; label: string }> = {
      LEAD:     { alpha: 1.543,  beta: -0.4408, gamma: 0.2136, density: 11.35, label: 'Lead (Pb)' },
      CONCRETE: { alpha: 0.1539, beta: -0.1161, gamma: 0.2075, density: 2.35,  label: 'Concrete (2.35 g/cm³)' },
      IRON:     { alpha: 0.5704, beta: -0.3063, gamma: 0.6326, density: 7.87,  label: 'Steel / Iron (Fe)' }
    };

    const evalArcher = (mat: 'LEAD' | 'CONCRETE' | 'IRON', xCm: number) => {
      if (xCm <= 0) return 1.0;
      const p = archerParams[mat];
      const base = (1 + p.beta / p.alpha) * Math.exp(p.alpha * p.gamma * xCm) - p.beta / p.alpha;
      return Math.pow(Math.max(1.0, base), -1.0 / p.gamma);
    };

    const solveArcherThicknessCm = (mat: 'LEAD' | 'CONCRETE' | 'IRON', reqB: number) => {
      if (reqB >= 1.0) return 0.0;
      const p = archerParams[mat];
      const term = (Math.pow(reqB, -p.gamma) + p.beta / p.alpha) / (1 + p.beta / p.alpha);
      if (term <= 1.0) return 0.0;
      return Math.log(term) / (p.alpha * p.gamma);
    };

    const currentTransmissionB = evalArcher(petBarrierMaterial, petBarrierThicknessCm);
    const shieldedUptakeWeeklyUSv = unshieldedUptakeWeeklyUSv * currentTransmissionB;
    const shieldedImagingWeeklyUSv = unshieldedImagingWeeklyUSv * currentTransmissionB;

    const reqBUptake = Math.min(1.0, petWeeklyGoalUSv / Math.max(1e-6, unshieldedUptakeWeeklyUSv));
    const reqBImaging = Math.min(1.0, petWeeklyGoalUSv / Math.max(1e-6, unshieldedImagingWeeklyUSv));

    const reqUptakeThicknessCm = solveArcherThicknessCm(petBarrierMaterial, reqBUptake);
    const reqImagingThicknessCm = solveArcherThicknessCm(petBarrierMaterial, reqBImaging);

    // Build curve points for Plotly
    const maxCurveCm = petBarrierMaterial === 'CONCRETE' ? 50 : petBarrierMaterial === 'IRON' ? 15 : 5.0;
    const xs: number[] = [];
    const uptakeCurve: number[] = [];
    const imagingCurve: number[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = (i / 50) * maxCurveCm;
      const b = evalArcher(petBarrierMaterial, x);
      xs.push(Number(x.toFixed(2)));
      uptakeCurve.push(unshieldedUptakeWeeklyUSv * b);
      imagingCurve.push(unshieldedImagingWeeklyUSv * b);
    }

    return {
      rU,
      rI,
      fU,
      unshieldedUptakeWeeklyUSv,
      unshieldedImagingWeeklyUSv,
      currentTransmissionB,
      shieldedUptakeWeeklyUSv,
      shieldedImagingWeeklyUSv,
      reqBUptake,
      reqBImaging,
      reqUptakeThicknessCm,
      reqImagingThicknessCm,
      xs,
      uptakeCurve,
      imagingCurve,
      materialLabel: archerParams[petBarrierMaterial].label
    };
  }, [
    petActivityMBq,
    petPatientsPerWeek,
    petUptakeTimeMin,
    petImagingTimeMin,
    petDistanceM,
    petOccupancyT,
    petWeeklyGoalUSv,
    petBarrierMaterial,
    petBarrierThicknessCm
  ]);

  // NCRP-151 Vault Labyrinth (Kersey / Cossairt) & Roof Skyshine Analytics
  const labyrinthSkyshineAnalytics = useMemo(() => {
    const areaM2 = Math.max(0.5, mazeWidthM * mazeHeightM);
    const sqrtA = Math.sqrt(areaM2);
    const d1 = Math.max(1.0, mazeLeg1LengthM);
    const d2 = Math.max(0.5, mazeLeg2LengthM);

    const doseAtMazeMouthSvH = mazeWorkloadDoseAt1mSvH / (d1 * d1);
    const evaluateLeg2SvH = (dist2: number) => {
      const geomFactor = areaM2 / (d1 * d1);
      const decay2 = 0.20 * Math.exp(-dist2 / (1.95 * sqrtA)) + 0.80 * Math.exp(-dist2 / (5.4 * sqrtA));
      return doseAtMazeMouthSvH * geomFactor * decay2;
    };

    const unshieldedDoorDoseUSvH = evaluateLeg2SvH(d2) * 1e6; // convert Sv/h to uSv/h
    const doorAttenuation =
      0.65 * Math.pow(10, -mazeDoorBpeCm / 4.5) + 0.35 * Math.pow(10, -mazeDoorLeadCm / 5.0);
    const shieldedDoorDoseUSvH = unshieldedDoorDoseUSvH * doorAttenuation;

    // Roof Skyshine (NCRP-151 Eq. 5.12)
    const roofTransmission = Math.pow(10, -skyRoofThicknessConcreteCm / 37.0);
    const dRoofInternalM = 4.0;
    const evaluateSkyshineUSvH = (dHoriz: number) => {
      const baseSvH =
        ((2.5e-2 * mazeWorkloadDoseAt1mSvH * roofTransmission * Math.pow(skySolidAngleSr, 1.3)) /
          Math.pow(dRoofInternalM + 2.0, 2)) *
        Math.exp(-dHoriz / 90.0);
      return baseSvH * 1e6;
    };

    const skyshineAtReceptorUSvH = evaluateSkyshineUSvH(skyHorizontalDistM);

    // Build Leg 2 profile & Skyshine radial profile
    const leg2Xs: number[] = [];
    const leg2DoseUSvH: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = 0.5 + (i / 40) * 11.5;
      leg2Xs.push(Number(x.toFixed(2)));
      leg2DoseUSvH.push(evaluateLeg2SvH(x) * 1e6);
    }

    const skyXs: number[] = [];
    const skyDoseUSvH: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const r = 5 + (i / 40) * 195;
      skyXs.push(Number(r.toFixed(1)));
      skyDoseUSvH.push(evaluateSkyshineUSvH(r));
    }

    return {
      areaM2,
      doseAtMazeMouthSvH,
      unshieldedDoorDoseUSvH,
      doorAttenuation,
      shieldedDoorDoseUSvH,
      roofTransmission,
      skyshineAtReceptorUSvH,
      leg2Xs,
      leg2DoseUSvH,
      skyXs,
      skyDoseUSvH
    };
  }, [
    mazeWorkloadDoseAt1mSvH,
    mazeLeg1LengthM,
    mazeLeg2LengthM,
    mazeWidthM,
    mazeHeightM,
    mazeDoorBpeCm,
    mazeDoorLeadCm,
    skyRoofThicknessConcreteCm,
    skySolidAngleSr,
    skyHorizontalDistM
  ]);

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
      moduleName: 'Module 14: Multi-Layer Shielding, GP Buildup & NIST XCOM Engine',
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
          className={`tab-btn ${activeTab === 'pet_tg108' ? 'active' : ''}`}
          onClick={() => setActiveTab('pet_tg108')}
        >
          🏥 AAPM TG-108 PET Clinic Shielding
        </button>
        <button
          className={`tab-btn ${activeTab === 'labyrinth_skyshine' ? 'active' : ''}`}
          onClick={() => setActiveTab('labyrinth_skyshine')}
        >
          🌀 NCRP-151 Labyrinth &amp; Skyshine
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

      {/* TAB 4A: AAPM TG-108 PET / Nuclear Medicine Clinic Shielding (511 keV Annihilation) */}
      {activeTab === 'pet_tg108' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(5, 10, 18, 0.65)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#00e5ff' }}>🏥 AAPM TG-108 PET/CT Clinic Workload &amp; Barrier Inputs</h4>
                <VerificationBadge testId="VTEST-53" standard="AAPM TG-108 (2006)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Administered F-18 Activity A₀ (MBq):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={petActivityMBq}
                    onChange={e => setPetActivityMBq(Math.max(10, Number(e.target.value) || 370))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Weekly Patient Workload N_w (pts/wk):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={petPatientsPerWeek}
                    onChange={e => setPetPatientsPerWeek(Math.max(1, Number(e.target.value) || 40))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Uptake Room Time t_U (min):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={petUptakeTimeMin}
                    onChange={e => setPetUptakeTimeMin(Math.max(5, Number(e.target.value) || 60))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>PET/CT Scan Time t_I (min):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={petImagingTimeMin}
                    onChange={e => setPetImagingTimeMin(Math.max(5, Number(e.target.value) || 30))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Distance to Receptor d (m):</label>
                  <input
                    type="number"
                    step="0.25"
                    className="form-control"
                    value={petDistanceM}
                    onChange={e => setPetDistanceM(Math.max(0.5, Number(e.target.value) || 2.5))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Occupancy Factor T (0.025–1.0):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.025"
                    max="1.0"
                    className="form-control"
                    value={petOccupancyT}
                    onChange={e => setPetOccupancyT(Math.max(0.025, Math.min(1.0, Number(e.target.value) || 1.0)))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Weekly Dose Design Goal P (µSv/wk):</label>
                  <select
                    className="form-control"
                    value={petWeeklyGoalUSv}
                    onChange={e => setPetWeeklyGoalUSv(Number(e.target.value))}
                  >
                    <option value={20}>20 µSv/wk (1 mSv/yr Uncontrolled Public)</option>
                    <option value={100}>100 µSv/wk (5 mSv/yr Controlled ALARA)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem' }}>Barrier Material &amp; Thickness (cm):</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-control"
                      value={petBarrierMaterial}
                      onChange={e => setPetBarrierMaterial(e.target.value as 'LEAD' | 'CONCRETE' | 'IRON')}
                    >
                      <option value="LEAD">Lead (Pb)</option>
                      <option value="CONCRETE">Concrete</option>
                      <option value="IRON">Steel (Fe)</option>
                    </select>
                    <input
                      type="number"
                      step="0.2"
                      className="form-control"
                      value={petBarrierThicknessCm}
                      onChange={e => setPetBarrierThicknessCm(Math.max(0, Number(e.target.value) || 0))}
                      style={{ width: '90px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="formula-box" style={{ padding: '10px', fontSize: '0.78rem' }}>
                <BlockMath math="D_{\text{uptake}} = 0.092 \cdot A_0 \cdot N_w \cdot \frac{t_U}{60} \cdot R_U \cdot \frac{T}{d^2} \cdot B_{\text{Archer}}(x), \quad R_U = \frac{1.443 T_{1/2}}{t_U}\left(1 - e^{-\ln 2 \cdot t_U / T_{1/2}}\right)" />
              </div>
            </div>

            <div style={{ background: 'rgba(5, 10, 18, 0.65)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, color: '#10b981' }}>📊 AAPM TG-108 Uptake Room vs. Scanner Room Results</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="hud-card">
                  <span className="hud-metric-label">UPTAKE ROOM SHIELDED</span>
                  <span className="hud-metric-value" style={{ color: petTg108Analytics.shieldedUptakeWeeklyUSv <= petWeeklyGoalUSv ? '#10b981' : '#ef4444' }}>
                    {petTg108Analytics.shieldedUptakeWeeklyUSv.toFixed(1)} µSv/wk
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Unshielded: {petTg108Analytics.unshieldedUptakeWeeklyUSv.toFixed(1)} µSv/wk (R_U = {petTg108Analytics.rU.toFixed(3)})
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">SCANNER ROOM SHIELDED</span>
                  <span className="hud-metric-value" style={{ color: petTg108Analytics.shieldedImagingWeeklyUSv <= petWeeklyGoalUSv ? '#10b981' : '#ef4444' }}>
                    {petTg108Analytics.shieldedImagingWeeklyUSv.toFixed(1)} µSv/wk
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Unshielded: {petTg108Analytics.unshieldedImagingWeeklyUSv.toFixed(1)} µSv/wk (F_U = {petTg108Analytics.fU.toFixed(3)})
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">REQ. UPTAKE WALL ({petTg108Analytics.materialLabel})</span>
                  <span className="hud-metric-value" style={{ color: '#00e5ff' }}>
                    {petTg108Analytics.reqUptakeThicknessCm.toFixed(2)} cm
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {(petTg108Analytics.reqUptakeThicknessCm * 10).toFixed(1)} mm for P ≤ {petWeeklyGoalUSv} µSv/wk
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">REQ. SCANNER WALL ({petTg108Analytics.materialLabel})</span>
                  <span className="hud-metric-value" style={{ color: '#38bdf8' }}>
                    {petTg108Analytics.reqImagingThicknessCm.toFixed(2)} cm
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Archer B(x) = {petTg108Analytics.currentTransmissionB.toExponential(3)}
                  </span>
                </div>
              </div>

              <Plot
                data={[
                  {
                    x: petTg108Analytics.xs,
                    y: petTg108Analytics.uptakeCurve,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Uptake Room (µSv/wk)',
                    line: { color: '#ef4444', width: 2.5 }
                  },
                  {
                    x: petTg108Analytics.xs,
                    y: petTg108Analytics.imagingCurve,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'PET/CT Scanner Room (µSv/wk)',
                    line: { color: '#00e5ff', width: 2.5 }
                  },
                  {
                    x: [petTg108Analytics.xs[0], petTg108Analytics.xs[petTg108Analytics.xs.length - 1]],
                    y: [petWeeklyGoalUSv, petWeeklyGoalUSv],
                    type: 'scatter',
                    mode: 'lines',
                    name: `Design Goal (${petWeeklyGoalUSv} µSv/wk)`,
                    line: { color: '#10b981', width: 2, dash: 'dash' }
                  }
                ]}
                layout={{
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'rgba(0,0,0,0.25)',
                  margin: { t: 24, r: 20, b: 42, l: 55 },
                  height: 250,
                  font: { color: '#cbd5e1', size: 11 },
                  xaxis: { title: `${petTg108Analytics.materialLabel} Thickness x (cm)`, gridcolor: 'rgba(255,255,255,0.06)' },
                  yaxis: { title: 'Weekly Dose (µSv/wk)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                  legend: { orientation: 'h', y: 1.14 }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4B: NCRP-151 Vault Labyrinth (Kersey / Cossairt) & Skyshine Solver */}
      {activeTab === 'labyrinth_skyshine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(5, 10, 18, 0.65)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#f59e0b' }}>🌀 NCRP-151 Vault Maze (Kersey/Cossairt) &amp; Roof Skyshine</h4>
                <VerificationBadge testId="VTEST-54" standard="NCRP Report No. 151" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Source 1m Dose Rate H₀ (Sv/h):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={mazeWorkloadDoseAt1mSvH}
                    onChange={e => setMazeWorkloadDoseAt1mSvH(Math.max(0.1, Number(e.target.value) || 50))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Leg 1 Distance d₁ (m) &amp; Leg 2 Length d₂ (m):</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={mazeLeg1LengthM}
                      onChange={e => setMazeLeg1LengthM(Math.max(1.0, Number(e.target.value) || 4.5))}
                      title="Distance d1 from source to maze mouth (m)"
                    />
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={mazeLeg2LengthM}
                      onChange={e => setMazeLeg2LengthM(Math.max(1.0, Number(e.target.value) || 6.0))}
                      title="Maze corridor length d2 (m)"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Maze Corridor Width W × Height H (m):</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={mazeWidthM}
                      onChange={e => setMazeWidthM(Math.max(0.8, Number(e.target.value) || 1.5))}
                    />
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={mazeHeightM}
                      onChange={e => setMazeHeightM(Math.max(1.8, Number(e.target.value) || 2.4))}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Vault Door: BPE (cm) + Lead (cm):</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="1.0"
                      className="form-control"
                      value={mazeDoorBpeCm}
                      onChange={e => setMazeDoorBpeCm(Math.max(0, Number(e.target.value) || 0))}
                      title="Borated Polyethylene thickness (cm)"
                    />
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={mazeDoorLeadCm}
                      onChange={e => setMazeDoorLeadCm(Math.max(0, Number(e.target.value) || 0))}
                      title="Door Lead thickness (cm)"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Concrete Roof Thickness (cm) &amp; Solid Angle Ω (sr):</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="5"
                      className="form-control"
                      value={skyRoofThicknessConcreteCm}
                      onChange={e => setSkyRoofThicknessConcreteCm(Math.max(0, Number(e.target.value) || 60))}
                    />
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={skySolidAngleSr}
                      onChange={e => setSkySolidAngleSr(Math.max(0.05, Number(e.target.value) || 0.85))}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Skyshine Ground Distance d_s (m):</label>
                  <input
                    type="number"
                    step="5"
                    className="form-control"
                    value={skyHorizontalDistM}
                    onChange={e => setSkyHorizontalDistM(Math.max(5, Number(e.target.value) || 30))}
                  />
                </div>
              </div>

              <div className="formula-box" style={{ padding: '10px', fontSize: '0.76rem' }}>
                <BlockMath math="\dot{H}_{\text{maze}}(d_2) = \frac{\dot{H}_0 A}{d_1^4}\left(0.20 e^{-d_2 / 1.95\sqrt{A}} + 0.80 e^{-d_2 / 5.4\sqrt{A}}\right), \quad \dot{H}_{\text{sky}}(d_s) = \frac{2.5\times 10^{-2} \dot{H}_0 B_{\text{roof}} \Omega^{1.3}}{(d_i + 2)^2} e^{-d_s/90}" />
              </div>
            </div>

            <div style={{ background: 'rgba(5, 10, 18, 0.65)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, color: '#00e5ff' }}>📊 Maze Door &amp; Ground Skyshine Readouts</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="hud-card">
                  <span className="hud-metric-label">UNSHIELDED MAZE DOOR (d₂={mazeLeg2LengthM}m)</span>
                  <span className="hud-metric-value" style={{ color: '#f59e0b' }}>
                    {labyrinthSkyshineAnalytics.unshieldedDoorDoseUSvH.toFixed(1)} µSv/h
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Cross-Section A = {labyrinthSkyshineAnalytics.areaM2.toFixed(2)} m²
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">SHIELDED OUTSIDE DOOR</span>
                  <span className="hud-metric-value" style={{ color: labyrinthSkyshineAnalytics.shieldedDoorDoseUSvH <= 10 ? '#10b981' : '#ef4444' }}>
                    {labyrinthSkyshineAnalytics.shieldedDoorDoseUSvH.toFixed(2)} µSv/h
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {mazeDoorBpeCm} cm BPE + {mazeDoorLeadCm} cm Pb (×{labyrinthSkyshineAnalytics.doorAttenuation.toExponential(2)})
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">ROOF TRANSMISSION B_roof</span>
                  <span className="hud-metric-value" style={{ color: '#38bdf8' }}>
                    {labyrinthSkyshineAnalytics.roofTransmission.toExponential(2)}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {skyRoofThicknessConcreteCm} cm Concrete Roof (TVL = 37 cm)
                  </span>
                </div>
                <div className="hud-card">
                  <span className="hud-metric-label">SKYSHINE AT d_s = {skyHorizontalDistM} m</span>
                  <span className="hud-metric-value" style={{ color: labyrinthSkyshineAnalytics.skyshineAtReceptorUSvH <= 2.5 ? '#10b981' : '#f59e0b' }}>
                    {labyrinthSkyshineAnalytics.skyshineAtReceptorUSvH.toFixed(2)} µSv/h
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    NCRP-151 Air-Scattered Skyshine
                  </span>
                </div>
              </div>

              <Plot
                data={[
                  {
                    x: labyrinthSkyshineAnalytics.leg2Xs,
                    y: labyrinthSkyshineAnalytics.leg2DoseUSvH,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Maze Leg 2 Dose Rate (µSv/h)',
                    line: { color: '#f59e0b', width: 2.5 }
                  }
                ]}
                layout={{
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'rgba(0,0,0,0.25)',
                  margin: { t: 24, r: 20, b: 42, l: 55 },
                  height: 240,
                  font: { color: '#cbd5e1', size: 11 },
                  xaxis: { title: 'Maze Leg 2 Distance d₂ (m)', gridcolor: 'rgba(255,255,255,0.06)' },
                  yaxis: { title: 'Unshielded Maze Dose (µSv/h)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                  legend: { orientation: 'h', y: 1.14 }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>
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
