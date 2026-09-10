import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;

type ActiveTab = 'detection_limits' | 'sample_size' | 'decision_engine' | 'presets';
type StatisticalTestType = 'Sign' | 'WRS';
type GridShape = 'Triangular' | 'Square';

interface FacilityPreset {
  id: string;
  name: string;
  facilityType: string;
  contaminant: string;
  radiationType: 'Alpha' | 'Beta' | 'Gamma' | 'Beta-Gamma';
  testType: StatisticalTestType;
  classType: 1 | 2 | 3;
  areaM2: number;
  dcglW: number; // in dpm/100cm2 or pCi/g
  lbgr: number;
  sigma: number;
  alpha: number;
  beta: number;
  bgCountRateCpm: number;
  sampleCountTimeSec: number;
  instrumentEff: number;
  surfaceEff: number;
  probeAreaCm2: number;
  wipeRecovery: number; // 0.1 for smear, 1.0 for direct
  sampleUnitLabel: string;
  description: string;
}

const PRESETS: FacilityPreset[] = [
  {
    id: 'pwr_bioshield',
    name: 'Commercial NPP Bio-Shield Concrete',
    facilityType: 'Nuclear Power Plant Decommissioning',
    contaminant: 'Co-60 & Cs-137 (Activation & Fission)',
    radiationType: 'Beta-Gamma',
    testType: 'Sign',
    classType: 1,
    areaM2: 100,
    dcglW: 5000,
    lbgr: 2500,
    sigma: 1000,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 60,
    sampleCountTimeSec: 60,
    instrumentEff: 0.45,
    surfaceEff: 0.50,
    probeAreaCm2: 100,
    wipeRecovery: 1.0,
    sampleUnitLabel: 'dpm/100 cm²',
    description: 'High-radiation inner sacrificial shield concrete containing deep thermal neutron activation products (Co-60) and surface cesium contamination.'
  },
  {
    id: 'cyclotron_vault',
    name: 'Medical Cyclotron Vault Wall',
    facilityType: 'Particle Accelerator Facility',
    contaminant: 'Co-57, Zn-65, Mn-54 (Fast Proton Activation)',
    radiationType: 'Gamma',
    testType: 'Sign',
    classType: 1,
    areaM2: 80,
    dcglW: 7200,
    lbgr: 3600,
    sigma: 1200,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 45,
    sampleCountTimeSec: 60,
    instrumentEff: 0.40,
    surfaceEff: 0.50,
    probeAreaCm2: 100,
    wipeRecovery: 1.0,
    sampleUnitLabel: 'dpm/100 cm²',
    description: '18 MeV medical isotope production vault subjected to secondary neutron spallation and target scattering.'
  },
  {
    id: 'fuel_fab_floor',
    name: 'Uranium Fuel Fabrication Floor Slab',
    facilityType: 'Nuclear Fuel Cycle Facility',
    contaminant: 'Enriched U-235, U-234, U-238 (Alpha)',
    radiationType: 'Alpha',
    testType: 'Sign',
    classType: 1,
    areaM2: 100,
    dcglW: 1000,
    lbgr: 500,
    sigma: 220,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 2,
    sampleCountTimeSec: 120,
    instrumentEff: 0.35,
    surfaceEff: 0.25,
    probeAreaCm2: 100,
    wipeRecovery: 1.0,
    sampleUnitLabel: 'dpm/100 cm²',
    description: 'Enriched uranium oxide powder manufacturing facility floor with low alpha background and stringent alpha release criteria.'
  },
  {
    id: 'hotcell_wipe',
    name: 'Radiopharmaceutical Hot Cell Removable Smears',
    facilityType: 'Radiopharmacy & Nuclear Medicine',
    contaminant: 'I-131 & Tc-99m (Removable Contamination)',
    radiationType: 'Beta-Gamma',
    testType: 'Sign',
    classType: 2,
    areaM2: 25,
    dcglW: 1000,
    lbgr: 500,
    sigma: 180,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 30,
    sampleCountTimeSec: 60,
    instrumentEff: 0.40,
    surfaceEff: 0.50,
    probeAreaCm2: 15.5,
    wipeRecovery: 0.10, // 10% wipe collection fraction
    sampleUnitLabel: 'dpm/100 cm²',
    description: 'Removable surface contamination wipe survey across stainless steel manipulator cell work surfaces.'
  },
  {
    id: 'radium_soil',
    name: 'Legacy Radium Dial Facility Soil',
    facilityType: 'Environmental Remediation Site',
    contaminant: 'Ra-226 (Contaminant in Natural Background)',
    radiationType: 'Gamma',
    testType: 'WRS',
    classType: 1,
    areaM2: 2000,
    dcglW: 5.0, // pCi/g above background
    lbgr: 2.5,
    sigma: 1.2,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 120,
    sampleCountTimeSec: 300,
    instrumentEff: 0.30,
    surfaceEff: 0.50,
    probeAreaCm2: 100,
    wipeRecovery: 1.0,
    sampleUnitLabel: 'pCi/g',
    description: 'Open soil footprint contaminated with Ra-226 where natural terrestrial uranium series isotopes require Wilcoxon Rank Sum background subtraction.'
  },
  {
    id: 'coolant_pipe',
    name: 'Research Reactor Coolant Loop Piping',
    facilityType: 'Research Reactor',
    contaminant: 'Sr-90 / Y-90 (Pure Hard Beta)',
    radiationType: 'Beta',
    testType: 'Sign',
    classType: 2,
    areaM2: 50,
    dcglW: 3500,
    lbgr: 1750,
    sigma: 700,
    alpha: 0.05,
    beta: 0.05,
    bgCountRateCpm: 40,
    sampleCountTimeSec: 60,
    instrumentEff: 0.42,
    surfaceEff: 0.50,
    probeAreaCm2: 100,
    wipeRecovery: 1.0,
    sampleUnitLabel: 'dpm/100 cm²',
    description: 'Primary coolant return piping exterior surfaces with pure high-energy beta decay from fission-product strontium-90.'
  }
];

// Standard normal cumulative distribution approximation
const normalCdf = (z: number): number => {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1.0 - p : p;
};

// Inverse normal CDF (probit) approximation
const normalInv = (p: number): number => {
  if (p <= 0 || p >= 1) return 0;
  // Rational approximation for normal quantile
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  } else {
    const r = p < 0.5 ? p : 1.0 - p;
    const s = Math.log(-Math.log(r));
    let t = c[0] + s * (c[1] + s * (c[2] + s * (c[3] + s * (c[4] + s * c[5]))));
    t /= 1.0 + s * (d[0] + s * (d[1] + s * (d[2] + s * d[3])));
    return p < 0.5 ? -t : t;
  }
};

const MARSSIMModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('detection_limits');

  // --- STATE FOR DETECTION LIMITS (TAB 1) ---
  const [bgCounts, setBgCounts] = useState<number>(60); // counts in time tB
  const [bgTimeSec, setBgTimeSec] = useState<number>(60);
  const [sampleTimeSec, setSampleTimeSec] = useState<number>(60);
  const [instrEfficiency, setInstrEfficiency] = useState<number>(0.40); // 40%
  const [surfaceEfficiency, setSurfaceEfficiency] = useState<number>(0.50); // 50%
  const [probeAreaCm2, setProbeAreaCm2] = useState<number>(100);
  const [wipeRecovery, setWipeRecovery] = useState<number>(1.0); // 1.0 = direct, 0.10 = 10% smear
  const [alphaRisk, setAlphaRisk] = useState<number>(0.05);

  // --- STATE FOR FSS SAMPLE SIZE & GRID (TAB 2) ---
  const [testType, setTestType] = useState<StatisticalTestType>('Sign');
  const [classType, setClassType] = useState<1 | 2 | 3>(1);
  const [surveyAreaM2, setSurveyAreaM2] = useState<number>(100);
  const [dcglW, setDcglW] = useState<number>(5000);
  const [lbgr, setLbgr] = useState<number>(2500);
  const [sigma, setSigma] = useState<number>(1000);
  const [typeIError, setTypeIError] = useState<number>(0.05); // alpha
  const [typeIIError, setTypeIIError] = useState<number>(0.05); // beta
  const [gridShape, setGridShape] = useState<GridShape>('Triangular');

  // --- STATE FOR HYPOTHESIS DECISION ENGINE (TAB 3) ---
  const [datasetString, setDatasetString] = useState<string>('2400, 3100, 1850, 4200, 2900, 3300, 4800, 2100, 3650, 2750, 3900, 1950, 3200, 2600');
  const [refDatasetString, setRefDatasetString] = useState<string>('35, 42, 38, 55, 40, 48, 52, 39, 44, 46, 50, 37');

  // 1. CALCULATIONS: CURRIE DETECTION LIMITS
  const detectionLimits = useMemo(() => {
    const rB = bgCounts / bgTimeSec; // cps
    const zAlpha = normalInv(1 - alphaRisk);
    
    // Currie formulation with paired count times
    // sigma_B = sqrt( (C_B / t_B^2) * t_S^2 + C_B )
    // When t_B = t_S: sigma_0 = sqrt(2 * C_B)
    const timeRatio = sampleTimeSec / bgTimeSec;
    const varDiff = bgCounts * timeRatio * (1 + timeRatio);
    const sigmaNet = Math.sqrt(varDiff);

    // Critical level LC (Decision Level in counts)
    const lcCounts = zAlpha * sigmaNet;
    
    // Detection limit LD (Currie net counts)
    const ldCounts = Math.pow(zAlpha, 2) + 2 * zAlpha * sigmaNet;

    // Total efficiency
    const totalEff = instrEfficiency * surfaceEfficiency * wipeRecovery;

    // Minimum Detectable Activity (MDA)
    const mdaBq = ldCounts / (totalEff * sampleTimeSec);
    const mdaDpm = mdaBq * 60; // 1 Bq = 60 dpm

    // Minimum Detectable Concentration (MDC)
    const probeFactor = probeAreaCm2 / 100;
    const mdcDpm100cm2 = mdaDpm / probeFactor;
    const mdcBqCm2 = mdaBq / probeAreaCm2;

    // Static vs Scan MDC (surveyor efficiency p = 0.5, d' = 1.38 for 95% detection)
    const dPrime = 1.38;
    const scanRateCps = (dPrime * Math.sqrt(rB * 1.0)) / (Math.sqrt(0.5) * 1.0);
    const scanMdaBq = scanRateCps / totalEff;
    const scanMdcDpm100cm2 = (scanMdaBq * 60) / probeFactor;

    return {
      lcCounts: Math.max(0, lcCounts),
      ldCounts: Math.max(0, ldCounts),
      mdaBq: Math.max(0, mdaBq),
      mdaDpm: Math.max(0, mdaDpm),
      mdcDpm100cm2: Math.max(0, mdcDpm100cm2),
      mdcBqCm2: Math.max(0, mdcBqCm2),
      scanMdcDpm100cm2: Math.max(0, scanMdcDpm100cm2),
      totalEff
    };
  }, [bgCounts, bgTimeSec, sampleTimeSec, instrEfficiency, surfaceEfficiency, probeAreaCm2, wipeRecovery, alphaRisk]);

  // 2. CALCULATIONS: FSS SAMPLE SIZE & GRID SPACING
  const surveyPlanning = useMemo(() => {
    const delta = Math.max(0.001, dcglW - lbgr);
    const relShift = Math.max(0.1, delta / Math.max(0.001, sigma));

    const zAlpha = normalInv(1 - typeIError);
    const zBeta = normalInv(1 - typeIIError);
    const zSumSquared = Math.pow(zAlpha + zBeta, 2);

    let rawN = 0;
    let signP = 0;
    let pr = 0;

    if (testType === 'Sign') {
      // Sign test parameter: p = Phi(Delta / sigma)
      signP = normalCdf(relShift);
      const denom = 4 * Math.pow(signP - 0.5, 2);
      rawN = denom > 0 ? zSumSquared / denom : 100;
    } else {
      // WRS test parameter: Pr = Phi(Delta / (sqrt(2) * sigma))
      pr = normalCdf(relShift / Math.SQRT2);
      const denom = 3 * Math.pow(pr - 0.5, 2);
      rawN = denom > 0 ? zSumSquared / denom : 100;
    }

    // MARSSIM 20% overage factor for lost / inaccessible points
    const recommendedN = Math.max(10, Math.ceil(rawN * 1.20));

    // Grid Spacing L (meters)
    let gridSpacing = 0;
    if (gridShape === 'Triangular') {
      gridSpacing = Math.sqrt(surveyAreaM2 / (0.866 * recommendedN));
    } else {
      gridSpacing = Math.sqrt(surveyAreaM2 / recommendedN);
    }

    // Generate 2D sample coordinates within survey unit (aspect ratio ~ 1.5)
    const aspect = 1.3;
    const width = Math.sqrt(surveyAreaM2 * aspect);
    const height = surveyAreaM2 / width;

    const sampleCoords: { x: number; y: number; id: number }[] = [];
    const rows = Math.ceil(height / (gridSpacing * 0.866));
    const cols = Math.ceil(width / gridSpacing);

    let count = 0;
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * gridSpacing * 0.866;
      if (y > height) continue;
      const xOffset = (gridShape === 'Triangular' && r % 2 === 1) ? gridSpacing * 0.5 : 0;
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * gridSpacing + xOffset;
        if (x > width) continue;
        if (count < recommendedN) {
          count++;
          sampleCoords.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), id: count });
        }
      }
    }

    return {
      delta,
      relShift,
      rawN: Math.ceil(rawN),
      recommendedN,
      gridSpacing,
      width,
      height,
      sampleCoords,
      signP,
      pr
    };
  }, [testType, surveyAreaM2, dcglW, lbgr, sigma, typeIError, typeIIError, gridShape]);

  // 3. CALCULATIONS: NONPARAMETRIC HYPOTHESIS DECISION ENGINE
  const decisionResult = useMemo(() => {
    // Parse sample measurements
    const samples = datasetString
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((v) => !isNaN(v));

    const refSamples = refDatasetString
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((v) => !isNaN(v));

    if (samples.length === 0) {
      return { valid: false, message: 'Please enter valid comma-separated numeric measurements.' };
    }

    const n = samples.length;
    const mean = samples.reduce((acc, v) => acc + v, 0) / n;
    const variance = samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);
    const maxVal = Math.max(...samples);
    const minVal = Math.min(...samples);

    if (testType === 'Sign') {
      // Sign Test: y_i = DCGL_w - x_i
      const differences = samples.map((x) => dcglW - x);
      const sPlus = differences.filter((d) => d > 0).length;

      // Critical value k from normal approximation
      const zAlpha = normalInv(1 - typeIError);
      const meanS = n / 2;
      const sigmaS = Math.sqrt(n / 4);
      const kCritical = Math.ceil(meanS + zAlpha * sigmaS);

      // p-value
      const zScore = (sPlus - 0.5 - meanS) / sigmaS;
      const pValue = 1 - normalCdf(zScore);

      const passed = sPlus >= kCritical;

      return {
        valid: true,
        test: 'Sign Test',
        n,
        mean,
        stdDev,
        maxVal,
        minVal,
        sPlus,
        kCritical,
        pValue,
        passed,
        verdict: passed ? 'PASS — UNRESTRICTED RELEASE' : 'FAIL — REMEDIATION REQUIRED',
        verdictColor: passed ? '#2ecc71' : '#e74c3c',
        explanation: passed
          ? `Test statistic S+ (${sPlus}) meets or exceeds critical threshold k (${kCritical}). The null hypothesis is rejected: survey unit satisfies DCGL_w release criteria.`
          : `Test statistic S+ (${sPlus}) is less than critical threshold k (${kCritical}). Null hypothesis cannot be rejected: survey unit exceeds allowable contamination.`
      };
    } else {
      // WRS Test
      const m = refSamples.length;
      if (m === 0) {
        return { valid: false, message: 'Wilcoxon Rank Sum test requires Reference Area background measurements.' };
      }

      // Step 1: Add DCGL_w to Reference Area measurements: Z_i = R_i + DCGL_w
      const adjustedRef = refSamples.map((r) => ({ val: r + dcglW, isRef: true }));
      const suData = samples.map((s) => ({ val: s, isRef: false }));

      // Step 2: Pool and rank
      const pooled = [...adjustedRef, ...suData].sort((a, b) => a.val - b.val);
      let refRankSum = 0;
      pooled.forEach((item, index) => {
        const rank = index + 1;
        if (item.isRef) refRankSum += rank;
      });

      // Critical value for WRS
      const zAlpha = normalInv(1 - typeIError);
      const meanW = (m * (m + n + 1)) / 2;
      const sigmaW = Math.sqrt((m * n * (m + n + 1)) / 12);
      const wCritical = Math.ceil(meanW + zAlpha * sigmaW);

      const passed = refRankSum >= wCritical;
      const zScore = (refRankSum - 0.5 - meanW) / sigmaW;
      const pValue = 1 - normalCdf(zScore);

      return {
        valid: true,
        test: 'Wilcoxon Rank Sum (WRS)',
        n,
        m,
        mean,
        stdDev,
        maxVal,
        minVal,
        refRankSum,
        wCritical,
        pValue,
        passed,
        verdict: passed ? 'PASS — UNRESTRICTED RELEASE' : 'FAIL — BACKGROUND ADJUSTED EXCEEDANCE',
        verdictColor: passed ? '#2ecc71' : '#e74c3c',
        explanation: passed
          ? `Reference rank sum W_R (${refRankSum}) exceeds critical value W_c (${wCritical}). Survey unit contamination does not statistically exceed background + DCGL_w.`
          : `Reference rank sum W_R (${refRankSum}) does not exceed critical value W_c (${wCritical}). Survey unit is not cleared for unrestricted release.`
      };
    }
  }, [datasetString, refDatasetString, dcglW, typeIError, testType]);

  // Load a preset
  const handleLoadPreset = (preset: FacilityPreset) => {
    setDcglW(preset.dcglW);
    setLbgr(preset.lbgr);
    setSigma(preset.sigma);
    setTestType(preset.testType);
    setClassType(preset.classType);
    setSurveyAreaM2(preset.areaM2);
    setTypeIError(preset.alpha);
    setTypeIIError(preset.beta);
    setBgCounts(preset.bgCountRateCpm);
    setBgTimeSec(60);
    setSampleTimeSec(preset.sampleCountTimeSec);
    setInstrEfficiency(preset.instrumentEff);
    setSurfaceEfficiency(preset.surfaceEff);
    setProbeAreaCm2(preset.probeAreaCm2);
    setWipeRecovery(preset.wipeRecovery);

    // Generate realistic synthetic dataset conforming to this preset's parameters
    const n = Math.max(12, Math.ceil(preset.areaM2 / 8));
    const meanTarget = preset.lbgr * 0.9;
    const synthData = Array.from({ length: n }, () => {
      const val = meanTarget + (Math.random() - 0.5) * preset.sigma * 1.5;
      return Math.max(10, Math.round(val));
    });
    setDatasetString(synthData.join(', '));

    if (preset.testType === 'WRS') {
      const synthRef = Array.from({ length: 12 }, () => {
        const val = 1.2 + (Math.random() - 0.5) * 0.4;
        return Number(val.toFixed(2));
      });
      setRefDatasetString(synthRef.join(', '));
    }

    setActiveTab('sample_size');
  };

  return (
    <div className="marssim-module">
      <div className="panel-header">
        <h2>🏗️ MARSSIM Decommissioning & Statistical Site Release (NUREG-1575)</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Design and analyze radiological Final Status Surveys (FSS), calculate Currie detection limits (MDA/MDC), plan triangular sample grids, and evaluate Sign/WRS hypothesis tests for license termination.
        </p>
      </div>

      {/* Main Tabs Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px' }}>
        <button
          className={`nav-link ${activeTab === 'detection_limits' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'detection_limits' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'detection_limits' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'detection_limits' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('detection_limits')}
        >
          🎯 Detection Limits & MDA / MDC
        </button>
        <button
          className={`nav-link ${activeTab === 'sample_size' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'sample_size' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'sample_size' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'sample_size' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('sample_size')}
        >
          📐 FSS Sample Size & 2D Grid Planner
        </button>
        <button
          className={`nav-link ${activeTab === 'decision_engine' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'decision_engine' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'decision_engine' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'decision_engine' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('decision_engine')}
        >
          ⚖️ Nonparametric Decision Engine (Sign & WRS)
        </button>
        <button
          className={`nav-link ${activeTab === 'presets' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'presets' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'presets' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'presets' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('presets')}
        >
          🏭 Facility Presets Library
        </button>
      </div>

      {/* TAB 1: CURRIE DETECTION LIMITS & MDA / MDC */}
      {activeTab === 'detection_limits' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Controls Column */}
          <div className="panel" style={{ flex: '1 1 420px' }}>
            <h3>Instrument & Background Parameters</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              ISO 11929 and Currie (1968) classical detection thresholds for paired blank background and sample counting.
            </p>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Background Counts (C_B)</label>
                <input
                  type="number"
                  className="form-control"
                  value={bgCounts}
                  onChange={(e) => setBgCounts(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Bg Count Time (t_B, s)</label>
                <input
                  type="number"
                  className="form-control"
                  value={bgTimeSec}
                  onChange={(e) => setBgTimeSec(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Sample Count Time (t_S, s)</label>
                <input
                  type="number"
                  className="form-control"
                  value={sampleTimeSec}
                  onChange={(e) => setSampleTimeSec(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Alpha Risk (False Pos)</label>
                <select
                  className="form-control"
                  value={alphaRisk}
                  onChange={(e) => setAlphaRisk(Number(e.target.value))}
                >
                  <option value={0.05}>5% (Z = 1.645)</option>
                  <option value={0.025}>2.5% (Z = 1.960)</option>
                  <option value={0.01}>1% (Z = 2.326)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Instrument Efficiency (ε_i)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={instrEfficiency}
                  onChange={(e) => setInstrEfficiency(Math.min(1.0, Math.max(0.01, Number(e.target.value))))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Surface Efficiency (ε_s)</label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control"
                  value={surfaceEfficiency}
                  onChange={(e) => setSurfaceEfficiency(Math.min(1.0, Math.max(0.01, Number(e.target.value))))}
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>0.5 beta &gt;0.4 MeV; 0.25 alpha</small>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Physical Probe Area (cm²)</label>
                <input
                  type="number"
                  className="form-control"
                  value={probeAreaCm2}
                  onChange={(e) => setProbeAreaCm2(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Survey Measurement Mode</label>
                <select
                  className="form-control"
                  value={wipeRecovery}
                  onChange={(e) => setWipeRecovery(Number(e.target.value))}
                >
                  <option value={1.0}>Direct Surface Probe (100%)</option>
                  <option value={0.10}>Smear Wipe Test (10% Removable)</option>
                  <option value={0.20}>Smear Wipe Test (20% Removable)</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '15px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>Governing Currie Net Count Formulation</span>
              <BlockMath math="L_D = 2.71 + 4.65 \sqrt{C_B} \quad (\text{for } \alpha = \beta = 0.05)" />
            </div>
          </div>

          {/* Results Column */}
          <div className="panel" style={{ flex: '1 1 460px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Calculated Detection Limits</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '4px solid #f59e0b', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.78rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 'bold' }}>Critical Level (L_C)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                  {detectionLimits.lcCounts.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>counts</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Decision threshold: counts above this indicate real activity (α = 5%).</div>
              </div>

              <div style={{ padding: '14px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '4px solid #00e5ff', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.78rem', color: '#00e5ff', textTransform: 'uppercase', fontWeight: 'bold' }}>Currie Limit (L_D)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                  {detectionLimits.ldCounts.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>net counts</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Minimum net counts guaranteeing 95% detection confidence.</div>
              </div>
            </div>

            <div style={{ padding: '18px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>
                Minimum Detectable Activity (MDA)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '2.0rem', fontWeight: 'bold', color: '#00e5ff' }}>
                    {detectionLimits.mdaDpm.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '1.0rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>dpm</span>
                </div>
                <div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                    {detectionLimits.mdaBq.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>Bq ({ (detectionLimits.mdaBq * 27.027).toFixed(1) } pCi)</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '18px', background: 'rgba(50, 205, 50, 0.05)', border: '1px solid rgba(50, 205, 50, 0.25)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#2ecc71', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>
                Static Surface Minimum Detectable Concentration (MDC)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '2.0rem', fontWeight: 'bold', color: '#2ecc71' }}>
                    {detectionLimits.mdcDpm100cm2.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '1.0rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>dpm / 100 cm²</span>
                </div>
                <div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                    {detectionLimits.mdcBqCm2.toFixed(3)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>Bq / cm²</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '0.85rem' }}>Estimated Scanning MDC (Scan MDC)</strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Accounting for surveyor speed and 1.0s observation interval.</p>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                  {detectionLimits.scanMdcDpm100cm2.toFixed(0)} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>dpm/100 cm²</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARSSIM FSS SAMPLE SIZE & 2D GRID PLANNER */}
      {activeTab === 'sample_size' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Inputs Column */}
          <div className="panel" style={{ flex: '1 1 380px' }}>
            <h3>Survey Unit & Decision Bounds</h3>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Statistical Test</label>
                <select
                  className="form-control"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as StatisticalTestType)}
                >
                  <option value="Sign">Sign Test (Not in Background)</option>
                  <option value="WRS">Wilcoxon Rank Sum (In Background)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">MARSSIM Class</label>
                <select
                  className="form-control"
                  value={classType}
                  onChange={(e) => setClassType(Number(e.target.value) as 1 | 2 | 3)}
                >
                  <option value={1}>Class 1 (High Potential &gt; DCGL)</option>
                  <option value={2}>Class 2 (Moderate, &le; DCGL)</option>
                  <option value={3}>Class 3 (Clean / Unlikely)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Survey Area (A, m²)</label>
                <input
                  type="number"
                  className="form-control"
                  value={surveyAreaM2}
                  onChange={(e) => setSurveyAreaM2(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Grid Geometry</label>
                <select
                  className="form-control"
                  value={gridShape}
                  onChange={(e) => setGridShape(e.target.value as GridShape)}
                >
                  <option value="Triangular">Triangular Grid (Hexagonal)</option>
                  <option value="Square">Square Grid (Orthogonal)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Release Limit (DCGL_w)</label>
                <input
                  type="number"
                  className="form-control"
                  value={dcglW}
                  onChange={(e) => setDcglW(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Lower Gray Bound (LBGR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={lbgr}
                  onChange={(e) => setLbgr(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Survey Std Dev (σ)</label>
                <input
                  type="number"
                  className="form-control"
                  value={sigma}
                  onChange={(e) => setSigma(Math.max(0.001, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Type I Error (α)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={typeIError}
                  onChange={(e) => setTypeIError(Math.max(0.001, Number(e.target.value)))}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Type II Error (β)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={typeIIError}
                  onChange={(e) => setTypeIIError(Math.max(0.001, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Relative Shift (Δ/σ)</label>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e5ff', paddingTop: '8px' }}>
                  {surveyPlanning.relShift.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 229, 255, 0.04)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>MARSSIM Relative Shift Guidance</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Optimal Δ/σ range is between 1.0 and 3.0. A ratio &lt; 1.0 sharply increases required sample size, while &gt; 3.0 indicates over-conservative gray region.
              </p>
            </div>
          </div>

          {/* Sizing & 2D Grid Visualizer */}
          <div className="panel" style={{ flex: '2 1 550px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Statistical Sizing & 2D Systematic Grid</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  MARSSIM Table 5.1/5.2 sizing with 20% overage for inaccessible points.
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 'bold' }}>Grid Spacing (L)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                  {surveyPlanning.gridSpacing.toFixed(2)} <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>meters</span>
                </div>
              </div>
            </div>

            {/* Sizing summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '3px solid #00e5ff' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Theoretical N</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{surveyPlanning.rawN} points</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '3px solid #2ecc71' }}>
                <div style={{ fontSize: '0.7rem', color: '#2ecc71' }}>Recommended N (+20%)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2ecc71' }}>{surveyPlanning.recommendedN} points</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Class Max Area Rule</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                  {classType === 1 ? '≤ 100 m² (Pass)' : classType === 2 ? '≤ 1,000 m² (Pass)' : 'Unlimited (Pass)'}
                </div>
              </div>
            </div>

            {/* 2D Survey Unit Plotly Grid */}
            <div style={{ height: '360px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <Plot
                data={[
                  {
                    x: surveyPlanning.sampleCoords.map((c) => c.x),
                    y: surveyPlanning.sampleCoords.map((c) => c.y),
                    text: surveyPlanning.sampleCoords.map((c) => `Point #${c.id} (${c.x}m, ${c.y}m)`),
                    mode: 'markers+text',
                    textposition: 'top center',
                    textfont: { color: '#00e5ff', size: 9 },
                    marker: { size: 10, color: '#00e5ff', symbol: 'hexagon' },
                    name: 'Sample Points',
                    type: 'scatter'
                  }
                ]}
                layout={{
                  title: { text: `Survey Unit 2D Grid (${surveyPlanning.width.toFixed(1)}m × ${surveyPlanning.height.toFixed(1)}m)`, font: { color: '#fff', size: 13 } },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(3, 7, 18, 0.8)',
                  xaxis: { title: { text: 'X Position (m)' }, color: '#888', range: [0, surveyPlanning.width * 1.05], zeroline: false },
                  yaxis: { title: { text: 'Y Position (m)' }, color: '#888', range: [0, surveyPlanning.height * 1.05], zeroline: false, scaleanchor: 'x' },
                  margin: { l: 45, r: 25, t: 35, b: 40 }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NONPARAMETRIC HYPOTHESIS DECISION ENGINE */}
      {activeTab === 'decision_engine' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Data Inputs */}
          <div className="panel" style={{ flex: '1 1 420px' }}>
            <h3>Final Status Survey Sample Data</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Enter calibrated survey unit measurements to perform the formal hypothesis test ({testType} Test).
            </p>

            <div className="form-group">
              <label className="form-label">
                Survey Unit Measurements ({testType === 'Sign' ? 'dpm/100cm²' : 'pCi/g'})
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={datasetString}
                onChange={(e) => setDatasetString(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                placeholder="Comma-separated values e.g. 2400, 3100, 1850..."
              />
              <small style={{ color: 'var(--color-text-muted)' }}>
                Current Sample Count: {datasetString.split(',').filter((x) => x.trim()).length} points
              </small>
            </div>

            {testType === 'WRS' && (
              <div className="form-group">
                <label className="form-label">Reference Area Background Measurements (pCi/g)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={refDatasetString}
                  onChange={(e) => setRefDatasetString(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder="Reference area background values..."
                />
                <small style={{ color: 'var(--color-text-muted)' }}>
                  Reference Area Samples: {refDatasetString.split(',').filter((x) => x.trim()).length} points
                </small>
              </div>
            )}

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Release Limit (DCGL_w)</label>
                <input
                  type="number"
                  className="form-control"
                  value={dcglW}
                  onChange={(e) => setDcglW(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Alpha Risk (α)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={typeIError}
                  onChange={(e) => setTypeIError(Math.max(0.001, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {
                  // Quick synthetic dataset generation
                  const count = surveyPlanning.recommendedN;
                  const synth = Array.from({ length: count }, () => {
                    const val = lbgr * 0.95 + (Math.random() - 0.5) * sigma * 1.4;
                    return Math.max(10, Math.round(val));
                  });
                  setDatasetString(synth.join(', '));
                }}
              >
                🎲 Generate Synthetic Data
              </button>
            </div>
          </div>

          {/* Test Evaluation & Verdict */}
          <div className="panel" style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Statistical Hypothesis Evaluation</h3>

            {decisionResult.valid ? (
              <>
                {/* Large Decision Banner */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    border: `2px solid ${decisionResult.verdictColor}`,
                    background: `${decisionResult.verdictColor}15`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: decisionResult.verdictColor, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    {decisionResult.test} Decision Verdict
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: decisionResult.verdictColor, margin: '8px 0' }}>
                    {decisionResult.verdict}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                    {decisionResult.explanation}
                  </div>
                </div>

                {/* Statistical Parameters Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Survey Unit Mean / Median</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>
                          {decisionResult.mean?.toFixed(1)} / {decisionResult.maxVal && ((decisionResult.maxVal + (decisionResult.minVal || 0)) / 2).toFixed(1)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Survey Unit Sample Std Dev</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>
                          {decisionResult.stdDev?.toFixed(1)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Sample Min / Max Range</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>
                          {decisionResult.minVal?.toFixed(1)} to {decisionResult.maxVal?.toFixed(1)}
                        </td>
                      </tr>
                      {testType === 'Sign' ? (
                        <>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Positive Differences S+ (Below DCGL_w)</td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#00e5ff' }}>
                              {decisionResult.sPlus} out of {decisionResult.n}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Critical Threshold k (α = {typeIError})</td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#f59e0b' }}>
                              {decisionResult.kCritical}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Reference Area Rank Sum (W_R)</td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#00e5ff' }}>
                              {decisionResult.refRankSum}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Critical Rank Value W_c</td>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#f59e0b' }}>
                              {decisionResult.wCritical}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>Hypothesis p-value</td>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#fff' }}>
                          {decisionResult.pValue !== undefined ? decisionResult.pValue.toFixed(4) : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: '20px', color: '#e74c3c' }}>{decisionResult.message}</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DECOMMISSIONING FACILITY PRESETS */}
      {activeTab === 'presets' && (
        <div className="panel">
          <h3>Real-World Decommissioning & Environmental Facility Profiles</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Select a verified decommissioning profile to instantly configure DCGLs, isotope mixtures, background rates, and survey unit classification rules.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {PRESETS.map((preset) => (
              <div
                key={preset.id}
                style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Class {preset.classType} • {preset.testType} Test
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', borderRadius: '4px' }}>
                      {preset.radiationType}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#fff' }}>{preset.name}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {preset.facilityType}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>
                    {preset.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>DCGL_w:</span>
                    <strong style={{ color: '#fff' }}>{preset.dcglW} {preset.sampleUnitLabel}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Area:</span>
                    <strong style={{ color: '#fff' }}>{preset.areaM2} m²</strong>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    onClick={() => handleLoadPreset(preset)}
                  >
                    Load Facility Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MARSSIMModule;
