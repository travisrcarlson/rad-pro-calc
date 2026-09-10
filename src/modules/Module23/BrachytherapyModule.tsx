import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';

const Plot = (PlotComponent as any).default || PlotComponent;

type ActiveTab = 'planner' | 'dvh' | 'physics' | 'presets';

export interface SeedModel {
  id: string;
  name: string;
  isotope: string;
  halfLifeDays: number;
  meanEnergyKeV: number;
  doseRateConstant: number; // Lambda in cGy / (h * U)
  activeLengthCm: number; // L in cm
  typicalPrescribedDoseGy: number;
  isPermanent: boolean;
  defaultAirKermaStrength: number; // U = cGy * cm^2 / h
}

export interface SeedInstance {
  id: string;
  x: number; // cm
  y: number; // cm
  angleDeg: number; // orientation angle in degrees
  airKermaStrength: number; // U
  dwellTimeSeconds?: number; // for HDR
}

export interface ClinicalPreset {
  id: string;
  title: string;
  clinicalSite: string;
  seedModelId: string;
  prescribedDoseGy: number;
  description: string;
  seeds: { x: number; y: number; angleDeg: number; u: number; dwell?: number }[];
  targetEllipse: { a: number; b: number; x: number; y: number };
  urethra: { r: number; x: number; y: number };
  rectum: { r: number; x: number; y: number };
}

const SEED_MODELS: Record<string, SeedModel> = {
  'I-125_6711': {
    id: 'I-125_6711',
    name: 'Iodine-125 (Model 6711 OncoSeed)',
    isotope: 'I-125',
    halfLifeDays: 59.4,
    meanEnergyKeV: 28.0,
    doseRateConstant: 0.965,
    activeLengthCm: 0.30,
    typicalPrescribedDoseGy: 145,
    isPermanent: true,
    defaultAirKermaStrength: 0.45
  },
  'Pd-103_200': {
    id: 'Pd-103_200',
    name: 'Palladium-103 (Model 200 TheraSeed)',
    isotope: 'Pd-103',
    halfLifeDays: 17.0,
    meanEnergyKeV: 20.7,
    doseRateConstant: 0.686,
    activeLengthCm: 0.30,
    typicalPrescribedDoseGy: 125,
    isPermanent: true,
    defaultAirKermaStrength: 1.40
  },
  'Cs-131_CS1': {
    id: 'Cs-131_CS1',
    name: 'Cesium-131 (Model CS-1)',
    isotope: 'Cs-131',
    halfLifeDays: 9.7,
    meanEnergyKeV: 29.0,
    doseRateConstant: 1.050,
    activeLengthCm: 0.40,
    typicalPrescribedDoseGy: 115,
    isPermanent: true,
    defaultAirKermaStrength: 1.80
  },
  'Ir-192_HDR': {
    id: 'Ir-192_HDR',
    name: 'Iridium-192 HDR (MicroSelectron v2)',
    isotope: 'Ir-192',
    halfLifeDays: 73.83,
    meanEnergyKeV: 380.0,
    doseRateConstant: 1.108,
    activeLengthCm: 0.35,
    typicalPrescribedDoseGy: 6.0, // per fraction
    isPermanent: false,
    defaultAirKermaStrength: 40000.0 // ~10 Ci source
  }
};

const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: 'prostate_i125',
    title: 'Prostate Permanent Implant (I-125 Modified Peripheral)',
    clinicalSite: 'Prostate (Low-Risk T1c Adenocarcinoma)',
    seedModelId: 'I-125_6711',
    prescribedDoseGy: 145,
    description: 'Modified peripheral loading pattern distributing 24 seeds around the prostate capsule with central sparing to protect the urethra.',
    targetEllipse: { a: 2.1, b: 1.6, x: 0.0, y: 0.0 },
    urethra: { r: 0.35, x: 0.0, y: 0.2 },
    rectum: { r: 0.75, x: 0.0, y: -2.3 },
    seeds: [
      // Outer peripheral ring
      { x: -1.7, y: 0.0, angleDeg: 90, u: 0.45 },
      { x: 1.7, y: 0.0, angleDeg: 90, u: 0.45 },
      { x: -1.5, y: 0.8, angleDeg: 90, u: 0.45 },
      { x: 1.5, y: 0.8, angleDeg: 90, u: 0.45 },
      { x: -1.5, y: -0.8, angleDeg: 90, u: 0.45 },
      { x: 1.5, y: -0.8, angleDeg: 90, u: 0.45 },
      { x: -0.9, y: 1.3, angleDeg: 90, u: 0.45 },
      { x: 0.9, y: 1.3, angleDeg: 90, u: 0.45 },
      { x: 0.0, y: 1.4, angleDeg: 90, u: 0.45 },
      { x: -0.9, y: -1.2, angleDeg: 90, u: 0.45 },
      { x: 0.9, y: -1.2, angleDeg: 90, u: 0.45 },
      { x: 0.0, y: -1.3, angleDeg: 90, u: 0.45 },
      // Intermediate ring
      { x: -1.0, y: 0.3, angleDeg: 90, u: 0.40 },
      { x: 1.0, y: 0.3, angleDeg: 90, u: 0.40 },
      { x: -1.0, y: -0.4, angleDeg: 90, u: 0.40 },
      { x: 1.0, y: -0.4, angleDeg: 90, u: 0.40 },
      { x: -0.5, y: 0.8, angleDeg: 90, u: 0.38 },
      { x: 0.5, y: 0.8, angleDeg: 90, u: 0.38 },
      { x: -0.5, y: -0.8, angleDeg: 90, u: 0.38 },
      { x: 0.5, y: -0.8, angleDeg: 90, u: 0.38 }
    ]
  },
  {
    id: 'prostate_pd103',
    title: 'Prostate Fast-Decay Implant (Pd-103 High Gleason)',
    clinicalSite: 'Prostate (Intermediate-Risk Gleason 7)',
    seedModelId: 'Pd-103_200',
    prescribedDoseGy: 125,
    description: 'Higher initial dose rate implant utilizing Palladium-103 (T1/2 = 17.0 d) suitable for rapidly proliferating prostate tumors.',
    targetEllipse: { a: 2.0, b: 1.5, x: 0.0, y: 0.0 },
    urethra: { r: 0.35, x: 0.0, y: 0.2 },
    rectum: { r: 0.75, x: 0.0, y: -2.2 },
    seeds: [
      { x: -1.6, y: 0.0, angleDeg: 90, u: 1.40 },
      { x: 1.6, y: 0.0, angleDeg: 90, u: 1.40 },
      { x: -1.4, y: 0.7, angleDeg: 90, u: 1.40 },
      { x: 1.4, y: 0.7, angleDeg: 90, u: 1.40 },
      { x: -1.4, y: -0.7, angleDeg: 90, u: 1.40 },
      { x: 1.4, y: -0.7, angleDeg: 90, u: 1.40 },
      { x: 0.0, y: 1.3, angleDeg: 90, u: 1.30 },
      { x: 0.0, y: -1.2, angleDeg: 90, u: 1.30 },
      { x: -0.9, y: 0.2, angleDeg: 90, u: 1.25 },
      { x: 0.9, y: 0.2, angleDeg: 90, u: 1.25 }
    ]
  },
  {
    id: 'cervix_hdr',
    title: 'Cervical HDR Intracavitary (Tandem & Ovoids)',
    clinicalSite: 'Gynaecological / Cervix Uteri',
    seedModelId: 'Ir-192_HDR',
    prescribedDoseGy: 6.0,
    description: 'Fletcher-Suit-Delclos style tandem and colpostat ovoid afterloader with stepped dwell positions delivering 6 Gy to Point A.',
    targetEllipse: { a: 2.2, b: 2.0, x: 0.0, y: 0.5 },
    urethra: { r: 0.40, x: 0.0, y: 3.0 }, // Bladder ref
    rectum: { r: 0.70, x: 0.0, y: -2.0 },
    seeds: [
      // Central uterine tandem dwell positions
      { x: 0.0, y: 2.0, angleDeg: 90, u: 40000, dwell: 8.5 },
      { x: 0.0, y: 1.0, angleDeg: 90, u: 40000, dwell: 12.0 },
      { x: 0.0, y: 0.0, angleDeg: 90, u: 40000, dwell: 14.0 },
      // Right & Left vaginal ovoid dwell positions
      { x: -1.5, y: -0.5, angleDeg: 90, u: 40000, dwell: 16.0 },
      { x: 1.5, y: -0.5, angleDeg: 90, u: 40000, dwell: 16.0 }
    ]
  }
];

// TG-43 Point Dose Rate Calculator: D_dot in cGy/h
const computeTG43DoseRate = (
  x: number, // cm
  y: number, // cm
  seed: SeedInstance,
  model: SeedModel
): number => {
  // Translate to seed-centered coordinate frame
  const dx = x - seed.x;
  const dy = y - seed.y;

  // Convert orientation angle to radians
  const phi = (seed.angleDeg * Math.PI) / 180;
  // Rotate so seed axis lies along local x'
  const xPrime = dx * Math.cos(phi) + dy * Math.sin(phi);
  const yPrime = -dx * Math.sin(phi) + dy * Math.cos(phi);

  const r = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  if (r < 0.05) return 2000; // prevent singularity within seed encapsulation

  const L = model.activeLengthCm;

  // 1. Geometry Factor G_L(r, theta)
  const absY = Math.max(0.0001, Math.abs(yPrime));
  const beta = Math.atan2(xPrime + L / 2, absY) - Math.atan2(xPrime - L / 2, absY);
  const GL = beta / (L * absY);

  // Reference Geometry Factor G_L(r0 = 1.0 cm, theta0 = 90 deg)
  const beta0 = 2 * Math.atan(L / 2);
  const GL0 = beta0 / L;

  // 2. Radial Dose Function g_L(r)
  let gl = 1.0;
  if (model.isotope === 'I-125') {
    gl = 1.014 - 0.003 * r - 0.012 * r * r + 0.001 * Math.pow(r, 3);
  } else if (model.isotope === 'Pd-103') {
    gl = 1.05 - 0.08 * r - 0.015 * r * r;
  } else if (model.isotope === 'Ir-192') {
    gl = 1.002 - 0.0015 * r;
  } else {
    gl = 1.0 / (1.0 + 0.02 * r);
  }
  gl = Math.max(0.01, gl);

  // 3. 2D Anisotropy Function F(r, theta)
  const cosTheta = Math.abs(xPrime) / r;
  const f0 = model.meanEnergyKeV < 50 ? 0.65 : 0.95; // low energy photons have higher self-absorption
  const F = 1.0 - (1.0 - f0) * Math.pow(cosTheta, 1.4);

  // TG-43 Dose rate: D_dot = S_K * Lambda * (GL / GL0) * gL * F [cGy/h]
  const doseRateCgyHr = seed.airKermaStrength * model.doseRateConstant * (GL / GL0) * gl * F;
  return doseRateCgyHr;
};

const BrachytherapyModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [selectedModelId, setSelectedModelId] = useState<string>('I-125_6711');
  const [prescribedDoseGy, setPrescribedDoseGy] = useState<number>(145);

  const currentModel = useMemo(() => SEED_MODELS[selectedModelId], [selectedModelId]);

  // Initial seed configuration from Preset 1
  const [seeds, setSeeds] = useState<SeedInstance[]>(
    CLINICAL_PRESETS[0].seeds.map((s, idx) => ({
      id: `seed_${idx + 1}`,
      x: s.x,
      y: s.y,
      angleDeg: s.angleDeg,
      airKermaStrength: s.u,
      dwellTimeSeconds: s.dwell || 10
    }))
  );

  const [targetOrgan, setTargetOrgan] = useState({ a: 2.1, b: 1.6, x: 0.0, y: 0.0 });
  const [urethra, setUrethra] = useState({ r: 0.35, x: 0.0, y: 0.2 });
  const [rectum, setRectum] = useState({ r: 0.75, x: 0.0, y: -2.3 });

  // Grid Resolution for 2D Dose Mapping
  const gridSize = 45;
  const xMin = -3.5, xMax = 3.5;
  const yMin = -3.5, yMax = 3.5;

  // 1. CALCULATE 2D DOSE DISTRIBUTION
  const doseDistribution = useMemo(() => {
    const xVals: number[] = [];
    const yVals: number[] = [];
    const zDoseGy: number[][] = [];

    const dx = (xMax - xMin) / (gridSize - 1);
    const dy = (yMax - yMin) / (gridSize - 1);

    for (let i = 0; i < gridSize; i++) xVals.push(xMin + i * dx);
    for (let j = 0; j < gridSize; j++) yVals.push(yMin + j * dy);

    // Cumulative integration factor: permanent vs HDR
    // For permanent: D_total (cGy) = 1.4427 * T_half_hours * D_dot_0 (cGy/h)
    // To get Gy: D_total (Gy) = D_total (cGy) / 100
    const timeFactorGy = currentModel.isPermanent
      ? (1.4427 * currentModel.halfLifeDays * 24) / 100.0
      : 1.0 / 100.0; // for HDR, dwell is scaled

    for (let j = 0; j < gridSize; j++) {
      const row: number[] = [];
      const y = yVals[j];
      for (let i = 0; i < gridSize; i++) {
        const x = xVals[i];
        let pointDoseRate = 0;

        seeds.forEach((s) => {
          const rate = computeTG43DoseRate(x, y, s, currentModel);
          if (currentModel.isPermanent) {
            pointDoseRate += rate;
          } else {
            // HDR: rate * (dwell / 3600)
            const dwellHr = (s.dwellTimeSeconds || 10) / 3600.0;
            pointDoseRate += rate * dwellHr * 100; // already in cGy
          }
        });

        const totalDoseGy = currentModel.isPermanent
          ? pointDoseRate * timeFactorGy
          : pointDoseRate / 100.0;

        row.push(Number(totalDoseGy.toFixed(2)));
      }
      zDoseGy.push(row);
    }

    return { xVals, yVals, zDoseGy };
  }, [seeds, currentModel, gridSize]);

  // 2. CALCULATE DOSE-VOLUME HISTOGRAM (DVH)
  const dvhMetrics = useMemo(() => {
    const targetDoses: number[] = [];
    const urethraDoses: number[] = [];
    const rectumDoses: number[] = [];

    // Dense Monte Carlo sampling of points inside organ geometries
    const numSamples = 2000;
    for (let k = 0; k < numSamples; k++) {
      // Sample within target bounding box
      const rx = (Math.random() * 2 - 1) * targetOrgan.a;
      const ry = (Math.random() * 2 - 1) * targetOrgan.b;
      if (Math.pow(rx / targetOrgan.a, 2) + Math.pow(ry / targetOrgan.b, 2) <= 1.0) {
        const x = targetOrgan.x + rx;
        const y = targetOrgan.y + ry;

        // Evaluate dose at this target voxel
        let doseRate = 0;
        seeds.forEach((s) => {
          doseRate += computeTG43DoseRate(x, y, s, currentModel);
        });
        const timeFactor = currentModel.isPermanent
          ? (1.4427 * currentModel.halfLifeDays * 24) / 100.0
          : 1.0 / 100.0;
        targetDoses.push(doseRate * timeFactor);
      }

      // Sample within urethra
      const uAngle = Math.random() * 2 * Math.PI;
      const uRadius = Math.sqrt(Math.random()) * urethra.r;
      const ux = urethra.x + uRadius * Math.cos(uAngle);
      const uy = urethra.y + uRadius * Math.sin(uAngle);
      let uDoseRate = 0;
      seeds.forEach((s) => {
        uDoseRate += computeTG43DoseRate(ux, uy, s, currentModel);
      });
      urethraDoses.push(uDoseRate * (currentModel.isPermanent ? (1.4427 * currentModel.halfLifeDays * 24) / 100.0 : 1.0 / 100.0));

      // Sample within rectum
      const rAngle = Math.random() * 2 * Math.PI;
      const rRadius = Math.sqrt(Math.random()) * rectum.r;
      const rcx = rectum.x + rRadius * Math.cos(rAngle);
      const rcy = rectum.y + rRadius * Math.sin(rAngle);
      let rDoseRate = 0;
      seeds.forEach((s) => {
        rDoseRate += computeTG43DoseRate(rcx, rcy, s, currentModel);
      });
      rectumDoses.push(rDoseRate * (currentModel.isPermanent ? (1.4427 * currentModel.halfLifeDays * 24) / 100.0 : 1.0 / 100.0));
    }

    // Sort target doses to compute V100 and D90
    targetDoses.sort((a, b) => a - b);
    const nT = targetDoses.length;
    const v100Count = targetDoses.filter((d) => d >= prescribedDoseGy).length;
    const v100Pct = nT > 0 ? (v100Count / nT) * 100 : 0;
    const v150Count = targetDoses.filter((d) => d >= prescribedDoseGy * 1.5).length;
    const v150Pct = nT > 0 ? (v150Count / nT) * 100 : 0;

    // D90: Dose covering 90% of target (10th percentile of ascending doses)
    const d90Index = Math.floor(nT * 0.10);
    const d90Gy = targetDoses[d90Index] || 0;
    const d90PctRx = (d90Gy / prescribedDoseGy) * 100;

    // Urethra V150 (% receiving >= 150% Rx)
    const uV150Count = urethraDoses.filter((d) => d >= prescribedDoseGy * 1.5).length;
    const uV150Pct = urethraDoses.length > 0 ? (uV150Count / urethraDoses.length) * 100 : 0;

    // Rectum V100 (% receiving >= 100% Rx)
    const rV100Count = rectumDoses.filter((d) => d >= prescribedDoseGy).length;
    const rV100Pct = rectumDoses.length > 0 ? (rV100Count / rectumDoses.length) * 100 : 0;

    // Generate cumulative DVH curves (Dose vs Volume %)
    const doseBins = 50;
    const maxDosePlot = prescribedDoseGy * 2.2;
    const dvhDoseAxis: number[] = [];
    const targetDvh: number[] = [];
    const urethraDvh: number[] = [];
    const rectumDvh: number[] = [];

    for (let b = 0; b <= doseBins; b++) {
      const dose = (b / doseBins) * maxDosePlot;
      dvhDoseAxis.push(Number(dose.toFixed(1)));
      targetDvh.push(nT > 0 ? (targetDoses.filter((d) => d >= dose).length / nT) * 100 : 0);
      urethraDvh.push(urethraDoses.length > 0 ? (urethraDoses.filter((d) => d >= dose).length / urethraDoses.length) * 100 : 0);
      rectumDvh.push(rectumDoses.length > 0 ? (rectumDoses.filter((d) => d >= dose).length / rectumDoses.length) * 100 : 0);
    }

    return {
      v100Pct,
      v150Pct,
      d90Gy,
      d90PctRx,
      uV150Pct,
      rV100Pct,
      dvhDoseAxis,
      targetDvh,
      urethraDvh,
      rectumDvh
    };
  }, [seeds, currentModel, prescribedDoseGy, targetOrgan, urethra, rectum]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: ClinicalPreset) => {
    setSelectedModelId(preset.seedModelId);
    setPrescribedDoseGy(preset.prescribedDoseGy);
    setTargetOrgan(preset.targetEllipse);
    setUrethra(preset.urethra);
    setRectum(preset.rectum);
    setSeeds(
      preset.seeds.map((s, idx) => ({
        id: `seed_${idx + 1}`,
        x: s.x,
        y: s.y,
        angleDeg: s.angleDeg,
        airKermaStrength: s.u,
        dwellTimeSeconds: s.dwell || 10
      }))
    );
    setActiveTab('planner');
  };

  // Add seed
  const handleAddSeed = () => {
    const newId = `seed_${Date.now().toString().slice(-4)}`;
    setSeeds([
      ...seeds,
      {
        id: newId,
        x: 0,
        y: 0,
        angleDeg: 90,
        airKermaStrength: currentModel.defaultAirKermaStrength,
        dwellTimeSeconds: 10
      }
    ]);
  };

  const handleRemoveSeed = (id: string) => {
    setSeeds(seeds.filter((s) => s.id !== id));
  };

  const handleUpdateSeed = (id: string, field: keyof SeedInstance, val: any) => {
    setSeeds(seeds.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  return (
    <div className="brachytherapy-module">
      <div className="panel-header">
        <h2>🏥 Medical Physics & AAPM TG-43 Brachytherapy Planner</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Clinical interstitial radioactive seed implant planning and High Dose Rate (HDR) afterloading using the gold-standard <strong>AAPM TG-43U1</strong> formalism with real-time isodose contours and Dose-Volume Histograms (DVH).
        </p>
      </div>

      {/* Main Tabs Header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px' }}>
        <button
          className={`nav-link ${activeTab === 'planner' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'planner' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'planner' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'planner' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('planner')}
        >
          📍 2D Seed Planner & Isodose Map
        </button>
        <button
          className={`nav-link ${activeTab === 'dvh' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'dvh' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'dvh' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'dvh' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('dvh')}
        >
          📊 Dose-Volume Histogram (DVH)
        </button>
        <button
          className={`nav-link ${activeTab === 'physics' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'physics' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'physics' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'physics' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('physics')}
        >
          📐 TG-43U1 Mathematical Physics
        </button>
        <button
          className={`nav-link ${activeTab === 'presets' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'presets' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'presets' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'presets' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('presets')}
        >
          🏥 Clinical Cases Library
        </button>
      </div>

      {/* TAB 1: 2D SEED PLANNER & ISODOSE MAP */}
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Controls & Seed Manager */}
          <div className="panel" style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Prescription & Seed Parameters</h3>

            <div className="form-group">
              <label className="form-label">Brachytherapy Seed Model</label>
              <select
                className="form-control"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
              >
                {Object.values(SEED_MODELS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.isPermanent ? 'Permanent' : 'HDR Temporary'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Prescribed Dose (Rx, Gy)</label>
                <input
                  type="number"
                  className="form-control"
                  value={prescribedDoseGy}
                  onChange={(e) => setPrescribedDoseGy(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Seed Count</label>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e5ff', paddingTop: '8px' }}>
                  {seeds.length} active seeds
                </div>
              </div>
            </div>

            {/* Quality metric badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '3px solid #2ecc71', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Target Coverage (V100)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: dvhMetrics.v100Pct >= 95 ? '#2ecc71' : '#f59e0b' }}>
                  {dvhMetrics.v100Pct.toFixed(1)}% <span style={{ fontSize: '0.75rem', color: '#888' }}>(Goal ≥95%)</span>
                </div>
              </div>

              <div style={{ padding: '10px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '3px solid #00e5ff', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Target D90 Dose</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e5ff' }}>
                  {dvhMetrics.d90Gy.toFixed(1)} Gy <span style={{ fontSize: '0.75rem', color: '#888' }}>({dvhMetrics.d90PctRx.toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            {/* Seed Table */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Seed Coordinates & Strength</strong>
                <button className="btn btn-primary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={handleAddSeed}>
                  + Add Seed
                </button>
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '5px' }}>#</th>
                      <th style={{ padding: '5px' }}>X (cm)</th>
                      <th style={{ padding: '5px' }}>Y (cm)</th>
                      <th style={{ padding: '5px' }}>U (S_K)</th>
                      <th style={{ padding: '5px' }}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seeds.map((s, idx) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '4px', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            step="0.1"
                            value={s.x}
                            onChange={(e) => handleUpdateSeed(s.id, 'x', Number(e.target.value))}
                            style={{ width: '50px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '0.75rem', padding: '2px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            step="0.1"
                            value={s.y}
                            onChange={(e) => handleUpdateSeed(s.id, 'y', Number(e.target.value))}
                            style={{ width: '50px', background: '#111', border: '1px solid #333', color: '#fff', fontSize: '0.75rem', padding: '2px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            step="0.05"
                            value={s.airKermaStrength}
                            onChange={(e) => handleUpdateSeed(s.id, 'airKermaStrength', Number(e.target.value))}
                            style={{ width: '55px', background: '#111', border: '1px solid #333', color: '#00e5ff', fontSize: '0.75rem', padding: '2px' }}
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <button
                            style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => handleRemoveSeed(s.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2D Plotly Isodose Map */}
          <div className="panel" style={{ flex: '2 1 550px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>2D Isodose Contours (Transverse Plane)</h3>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem' }}>
                <span style={{ color: '#2ecc71' }}>● 100% Rx ({prescribedDoseGy} Gy)</span>
                <span style={{ color: '#f59e0b' }}>● 150% ({(prescribedDoseGy * 1.5).toFixed(0)} Gy)</span>
                <span style={{ color: '#e74c3c' }}>● 200% ({(prescribedDoseGy * 2.0).toFixed(0)} Gy)</span>
                <span style={{ color: '#3498db' }}>● 90% ({(prescribedDoseGy * 0.9).toFixed(0)} Gy)</span>
              </div>
            </div>

            <div style={{ height: '480px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <Plot
                data={[
                  // 2D Dose Heatmap & Contour lines
                  {
                    z: doseDistribution.zDoseGy,
                    x: doseDistribution.xVals,
                    y: doseDistribution.yVals,
                    type: 'contour',
                    contours: {
                      coloring: 'heatmap',
                      showlabels: true,
                      labelfont: { size: 10, color: '#fff' }
                    },
                    colorscale: [
                      [0.0, 'rgba(10, 15, 30, 0.8)'],
                      [0.2, 'rgba(41, 128, 185, 0.8)'],
                      [0.45, 'rgba(46, 204, 113, 0.8)'], // 100% Rx zone
                      [0.7, 'rgba(241, 196, 15, 0.8)'], // 150%
                      [1.0, 'rgba(231, 76, 60, 0.95)'] // 200% hotspot
                    ],
                    colorbar: { title: { text: 'Dose (Gy)' }, tickfont: { color: '#888' } }
                  },
                  // Seeds as markers
                  {
                    x: seeds.map((s) => s.x),
                    y: seeds.map((s) => s.y),
                    mode: 'markers',
                    marker: { size: 8, color: '#ffffff', symbol: 'diamond' },
                    name: 'Radioactive Seeds',
                    type: 'scatter'
                  },
                  // Urethra marker
                  {
                    x: [urethra.x],
                    y: [urethra.y],
                    mode: 'markers+text',
                    text: ['Urethra'],
                    textposition: 'top center',
                    textfont: { color: '#f1c40f', size: 11 },
                    marker: { size: 14, color: 'rgba(241, 196, 15, 0.4)', line: { color: '#f1c40f', width: 2 } },
                    name: 'Urethra (OAR)',
                    type: 'scatter'
                  },
                  // Rectum marker
                  {
                    x: [rectum.x],
                    y: [rectum.y],
                    mode: 'markers+text',
                    text: ['Rectum'],
                    textposition: 'bottom center',
                    textfont: { color: '#e74c3c', size: 11 },
                    marker: { size: 24, color: 'rgba(231, 76, 60, 0.3)', line: { color: '#e74c3c', width: 2 } },
                    name: 'Rectum (OAR)',
                    type: 'scatter'
                  }
                ]}
                layout={{
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(3, 7, 18, 0.9)',
                  xaxis: { title: { text: 'Lateral X (cm)' }, color: '#888', range: [xMin, xMax], zeroline: false },
                  yaxis: { title: { text: 'Anterior-Posterior Y (cm)' }, color: '#888', range: [yMin, yMax], zeroline: false, scaleanchor: 'x' },
                  margin: { l: 45, r: 25, t: 25, b: 40 },
                  showlegend: false
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOSE-VOLUME HISTOGRAM (DVH) */}
      {activeTab === 'dvh' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Clinical Quality Indices Summary */}
          <div className="panel" style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Clinical Treatment Quality Indices</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Evaluates conformity to ABS (American Brachytherapy Society) and ESTRO consensus guidelines.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '4px solid #2ecc71' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Target Coverage V100</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: dvhMetrics.v100Pct >= 95 ? '#2ecc71' : '#f59e0b' }}>
                    {dvhMetrics.v100Pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Clinical guideline: ≥ 95% of target volume receives ≥ 100% of prescribed dose.
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '4px solid #00e5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Target Dose D90</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e5ff' }}>
                    {dvhMetrics.d90Gy.toFixed(1)} Gy ({dvhMetrics.d90PctRx.toFixed(0)}%)
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Clinical guideline: Dose covering 90% of target volume should be 100% to 120% of Rx.
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>High-Dose Volume V150</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: dvhMetrics.v150Pct <= 50 ? '#2ecc71' : '#f59e0b' }}>
                    {dvhMetrics.v150Pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Tissue necrosis prevention: &le; 50% target volume receiving &ge; 150% Rx.
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(3, 7, 18, 0.6)', borderRadius: '6px', borderLeft: '4px solid #e74c3c' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Urethra V150 / Rectum V100</strong>
                  <span style={{ fontSize: '1.0rem', fontWeight: 'bold', color: dvhMetrics.uV150Pct <= 10 ? '#2ecc71' : '#e74c3c' }}>
                    U: {dvhMetrics.uV150Pct.toFixed(1)}% / R: {dvhMetrics.rV100Pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Organ-at-risk limits: Urethra V150 &le; 10%, Rectum V100 &le; 1.0 cm³.
                </div>
              </div>
            </div>
          </div>

          {/* Cumulative DVH Chart */}
          <div className="panel" style={{ flex: '2 1 550px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Cumulative Dose-Volume Histogram (DVH)</h3>

            <div style={{ height: '420px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <Plot
                data={[
                  {
                    x: dvhMetrics.dvhDoseAxis,
                    y: dvhMetrics.targetDvh,
                    name: 'Target (Prostate)',
                    line: { color: '#2ecc71', width: 3 },
                    type: 'scatter'
                  },
                  {
                    x: dvhMetrics.dvhDoseAxis,
                    y: dvhMetrics.urethraDvh,
                    name: 'Urethra (OAR)',
                    line: { color: '#f1c40f', width: 2, dash: 'dot' },
                    type: 'scatter'
                  },
                  {
                    x: dvhMetrics.dvhDoseAxis,
                    y: dvhMetrics.rectumDvh,
                    name: 'Rectum (OAR)',
                    line: { color: '#e74c3c', width: 2, dash: 'dash' },
                    type: 'scatter'
                  }
                ]}
                layout={{
                  title: { text: 'Volume (%) Receiving ≥ Dose (Gy)', font: { color: '#fff', size: 12 } },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(3, 7, 18, 0.8)',
                  xaxis: { title: { text: 'Dose (Gy)' }, color: '#888', range: [0, prescribedDoseGy * 2.2], zeroline: false },
                  yaxis: { title: { text: 'Volume (%)' }, color: '#888', range: [0, 105], zeroline: false },
                  margin: { l: 45, r: 25, t: 30, b: 40 },
                  legend: { font: { color: '#fff' }, bgcolor: 'rgba(0,0,0,0.5)' }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TG-43U1 MATHEMATICAL PHYSICS */}
      {activeTab === 'physics' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3>AAPM TG-43U1 Mathematical Physics Formulation</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            In 1995, the American Association of Physicists in Medicine (AAPM) Radiation Therapy Committee Task Group 43 introduced a formal dosimetric methodology based on measured and Monte Carlo simulated parameters in liquid water.
          </p>

          <div style={{ padding: '20px', background: 'rgba(3, 7, 18, 0.75)', border: '1px solid var(--color-primary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>
              Governing TG-43U1 2D Formalism
            </div>
            <div style={{ fontSize: '1.3rem', color: '#fff' }}>
              <BlockMath math="\dot{D}(r, \theta) = S_K \cdot \Lambda \cdot \frac{G_L(r, \theta)}{G_L(r_0, \theta_0)} \cdot g_L(r) \cdot F(r, \theta)" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <strong style={{ color: '#00e5ff', fontSize: '0.85rem' }}>1. Air-Kerma Strength (S_K) & Dose-Rate Constant (Λ)</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0' }}>
                S_K is the air-kerma rate in free space at distance d multiplied by d². The dose-rate constant Λ converts air kerma to absorbed dose rate in water at reference point (r₀ = 1 cm, θ₀ = 90°):
              </p>
              <BlockMath math="\Lambda = \frac{\dot{D}(r_0, \theta_0)}{S_K} \quad [\text{cGy}\cdot\text{h}^{-1}\cdot\text{U}^{-1}]" />
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <strong style={{ color: '#00e5ff', fontSize: '0.85rem' }}>2. Line Source Geometry Factor G_L(r, θ)</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0' }}>
                Accounts for the physical distribution of radioactivity within the titanium cylindrical capsule of active length L:
              </p>
              <BlockMath math="G_L(r, \theta) = \frac{\beta}{L \cdot r \cdot \sin\theta} \quad (\beta = \theta_2 - \theta_1)" />
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <strong style={{ color: '#00e5ff', fontSize: '0.85rem' }}>3. Radial Dose Function g_L(r)</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0' }}>
                Models photon attenuation and Compton scatter along the transverse axis (θ₀ = 90°), normalized to 1.0 at r₀ = 1 cm:
              </p>
              <BlockMath math="g_L(r) = \frac{\dot{D}(r, \theta_0) \cdot G_L(r_0, \theta_0)}{\dot{D}(r_0, \theta_0) \cdot G_L(r, \theta_0)}" />
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <strong style={{ color: '#00e5ff', fontSize: '0.85rem' }}>4. 2D Anisotropy Function F(r, θ)</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0' }}>
                Quantifies directional photon absorption through the welded end welds and longitudinal titanium walls:
              </p>
              <BlockMath math="F(r, \theta) = \frac{\dot{D}(r, \theta) \cdot G_L(r, \theta_0)}{\dot{D}(r, \theta_0) \cdot G_L(r, \theta)}" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLINICAL CASES PRESETS */}
      {activeTab === 'presets' && (
        <div className="panel">
          <h3>Pre-Configured Clinical Brachytherapy Cases</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Load consensus anatomical geometry models, organ contours, and seed loading patterns.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {CLINICAL_PRESETS.map((preset) => (
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>
                      {preset.clinicalSite}
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', borderRadius: '4px' }}>
                      Rx: {preset.prescribedDoseGy} Gy
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#fff' }}>{preset.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc', lineHeight: '1.4' }}>
                    {preset.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Seeds Configured:</span>
                    <strong style={{ color: '#fff' }}>{preset.seeds.length} seeds</strong>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    Load Treatment Plan
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

export default BrachytherapyModule;
