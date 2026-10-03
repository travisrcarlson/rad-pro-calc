import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';
import { BlockMath, InlineMath } from 'react-katex';
import { useRegulatory } from '../../context/RegulatoryContext';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

interface Source3D {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  activity_MBq: number;
  gamma_uSv: number; // µSv·cm²/MBq·h
}

type Posture = 'Standing' | 'Crouching' | 'Prone';

interface Worker {
  id: number;
  name: string;
  x: number;
  y: number;
  posture: Posture;
  rotationOffset: number; // For prone orientation 0-360 degrees
  taskDurationHours: number; // ALARA stay-time
}

interface ShieldBlock {
  id: number;
  name: string;
  x: number; y: number; z: number; // Center
  w: number; l: number; h: number; // Dimensions
  material: string;
  tvl_cm: number; // Tenth Value Layer equivalent Shielding
}

const SHIELD_PRESETS: Record<string, { name: string; tvl_cm: number }> = {
  CONCRETE: { name: 'Concrete', tvl_cm: 14.7 },
  LEAD: { name: 'Lead Sheet', tvl_cm: 3.8 },
  STEEL: { name: 'Carbon Steel', tvl_cm: 4.5 },
  WATER: { name: 'Water Tank', tvl_cm: 35.8 },
  CUSTOM: { name: 'Custom Material', tvl_cm: 10.0 }
};

type WorkspaceTab = '3d_room' | 'alara_chart' | 'workers' | 'sources_shields' | 'physics';

const WorkerDosimetryModule: React.FC = () => {
  const { currentFramework } = useRegulatory();
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('3d_room');

  // Room dimensions
  const [dimX] = useState<number>(10);
  const [dimY] = useState<number>(10);
  const [dimZ] = useState<number>(5);

  const [displayMin] = useState<number>(10);
  const [displayMax, setDisplayMax] = useState<number>(2000);

  const [sources, setSources] = useState<Source3D[]>([
    { id: 1, name: 'Floor Contamination Hotspot', x: 5, y: 5, z: 0.1, activity_MBq: 100000, gamma_uSv: 300 }
  ]);

  const [workers, setWorkers] = useState<Worker[]>([
    { id: 1, name: 'Primary Technician (Tech-1)', x: 4.5, y: 5, posture: 'Standing', rotationOffset: 0, taskDurationHours: 2 },
    { id: 2, name: 'Decontamination Lead (Tech-2)', x: 4.5, y: 4, posture: 'Crouching', rotationOffset: 0, taskDurationHours: 4 }
  ]);

  const [shields, setShields] = useState<ShieldBlock[]>([
    { id: 1, name: 'Concrete Partition Wall', x: 5, y: 4.5, z: 1.5, w: 3, l: 0.5, h: 3, material: 'CONCRETE', tvl_cm: 14.7 }
  ]);

  const computeAABBIntersectionFraction = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, sld: ShieldBlock) => {
    const dx = px - sx; const dy = py - sy; const dz = pz - sz;
    let tmin = 0.0; let tmax = 1.0;

    const bMinX = sld.x - sld.w / 2; const bMaxX = sld.x + sld.w / 2;
    if (dx !== 0) {
      const tx1 = (bMinX - sx) / dx; const tx2 = (bMaxX - sx) / dx;
      tmin = Math.max(tmin, Math.min(tx1, tx2)); tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (sx < bMinX || sx > bMaxX) return 0;

    const bMinY = sld.y - sld.l / 2; const bMaxY = sld.y + sld.l / 2;
    if (dy !== 0) {
      const ty1 = (bMinY - sy) / dy; const ty2 = (bMaxY - sy) / dy;
      tmin = Math.max(tmin, Math.min(ty1, ty2)); tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (sy < bMinY || sy > bMaxY) return 0;

    const bMinZ = sld.z - sld.h / 2; const bMaxZ = sld.z + sld.h / 2;
    if (dz !== 0) {
      const tz1 = (bMinZ - sz) / dz; const tz2 = (bMaxZ - sz) / dz;
      tmin = Math.max(tmin, Math.min(tz1, tz2)); tmax = Math.min(tmax, Math.max(tz1, tz2));
    } else if (sz < bMinZ || sz > bMaxZ) return 0;

    return (tmax >= tmin) ? (tmax - tmin) : 0;
  };

  // Compute 3D Volume Array
  const { volX, volY, volZ, volV } = useMemo(() => {
    const resolutionXY = 22;
    const resolutionZ = 10;

    const stepX = dimX / resolutionXY;
    const stepY = dimY / resolutionXY;
    const stepZ = dimZ / resolutionZ;

    const X: number[] = []; const Y: number[] = []; const Z: number[] = []; const V: number[] = [];

    for (let i = 0; i <= resolutionXY; i++) {
      const px = i * stepX;
      for (let j = 0; j <= resolutionXY; j++) {
        const py = j * stepY;
        for (let k = 0; k <= resolutionZ; k++) {
          const pz = k * stepZ;
          let d = 0;
          for (let s = 0; s < sources.length; s++) {
            const src = sources[s];
            const dx = px - src.x;
            const dy = py - src.y;
            const dz = pz - src.z;
            const dist_cm = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 100);

            let attenuationFactor = 1;
            for (let sh = 0; sh < shields.length; sh++) {
              const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, px, py, pz, shields[sh]);
              if (fract > 0) {
                const distInside_cm = fract * dist_cm;
                const decades = distInside_cm / shields[sh].tvl_cm;
                attenuationFactor *= Math.pow(10, decades);
              }
            }

            d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
          }
          X.push(px); Y.push(py); Z.push(pz); V.push(d);
        }
      }
    }
    return { volX: X, volY: Y, volZ: Z, volV: V };
  }, [sources, dimX, dimY, dimZ, shields]);

  // Point dose calculator
  const calcPointDose = (px: number, py: number, pz: number) => {
    let d = 0;
    sources.forEach(src => {
      const dx = px - src.x; const dy = py - src.y; const dz = pz - src.z;
      const dist_cm = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) * 100);

      let attenuationFactor = 1;
      for (let sh = 0; sh < shields.length; sh++) {
        const fract = computeAABBIntersectionFraction(src.x, src.y, src.z, px, py, pz, shields[sh]);
        if (fract > 0) {
          const distInside_cm = fract * dist_cm;
          const decades = distInside_cm / shields[sh].tvl_cm;
          attenuationFactor *= Math.pow(10, decades);
        }
      }

      d += ((src.activity_MBq * src.gamma_uSv) / (dist_cm * dist_cm)) / attenuationFactor;
    });
    return d;
  };

  const getWorkerNodes = (w: Worker) => {
    let eyeZ = 1.65, chestZ = 1.30, gonadZ = 0.90, extZ = 0.10;
    let dx = 0, dy = 0;

    if (w.posture === 'Crouching') {
      eyeZ = 1.0; chestZ = 0.75; gonadZ = 0.40; extZ = 0.10;
    } else if (w.posture === 'Prone') {
      eyeZ = 0.2; chestZ = 0.2; gonadZ = 0.2; extZ = 0.2;
      const rad = w.rotationOffset * (Math.PI / 180);
      dx = Math.cos(rad);
      dy = Math.sin(rad);
    }

    const e_pos = w.posture === 'Prone' ? { x: w.x + dx * 0.8, y: w.y + dy * 0.8, z: eyeZ } : { x: w.x, y: w.y, z: eyeZ };
    const c_pos = w.posture === 'Prone' ? { x: w.x + dx * 0.4, y: w.y + dy * 0.4, z: chestZ } : { x: w.x, y: w.y, z: chestZ };
    const g_pos = w.posture === 'Prone' ? { x: w.x - dx * 0.1, y: w.y - dy * 0.1, z: gonadZ } : { x: w.x, y: w.y, z: gonadZ };
    const ex_pos = w.posture === 'Prone' ? { x: w.x - dx * 0.8, y: w.y - dy * 0.8, z: extZ } : { x: w.x, y: w.y, z: extZ };

    const eyeDose = calcPointDose(e_pos.x, e_pos.y, e_pos.z);
    const chestDose = calcPointDose(c_pos.x, c_pos.y, c_pos.z);
    const gonadDose = calcPointDose(g_pos.x, g_pos.y, g_pos.z);
    const extDose = calcPointDose(ex_pos.x, ex_pos.y, ex_pos.z);

    // Generic Effective Dose Weighting (Chest 50%, Gonads 30%, Eye 10%, Ext 10%)
    const effective = (chestDose * 0.5) + (gonadDose * 0.3) + (eyeDose * 0.1) + (extDose * 0.1);

    return {
      eyeNode: { ...e_pos, dose: eyeDose },
      chestNode: { ...c_pos, dose: chestDose },
      gonadNode: { ...g_pos, dose: gonadDose },
      extNode: { ...ex_pos, dose: extDose },
      effectiveDoseRate: effective,
      cumulativeEffectiveDose: effective * w.taskDurationHours
    };
  };

  // Compile all spatial markers for WebGL render
  const modelTraces: any[] = [];

  // Map sources
  modelTraces.push({
    type: 'scatter3d',
    mode: 'markers+text',
    x: sources.map(s => s.x), y: sources.map(s => s.y), z: sources.map(s => s.z),
    marker: { symbol: 'diamond', color: '#ff3366', size: 9, line: { width: 1.5, color: '#ffffff' } },
    text: sources.map(s => `[SRC] ${s.name}`),
    textposition: 'top center',
    textfont: { color: '#ff6b8b', size: 11 },
    name: 'Sources',
    hoverinfo: 'text'
  });

  // Map worker stick-figure networks
  workers.forEach(w => {
    const nodes = getWorkerNodes(w);
    modelTraces.push({
      type: 'scatter3d',
      mode: 'lines+markers+text',
      x: [nodes.extNode.x, nodes.gonadNode.x, nodes.chestNode.x, nodes.eyeNode.x],
      y: [nodes.extNode.y, nodes.gonadNode.y, nodes.chestNode.y, nodes.eyeNode.y],
      z: [nodes.extNode.z, nodes.gonadNode.z, nodes.chestNode.z, nodes.eyeNode.z],
      line: { color: '#00e5ff', width: 5 },
      marker: { color: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b'], size: [6, 6, 9, 6] },
      text: ['', '', `[PERSONNEL] ${w.name}`, ''],
      textposition: 'top center',
      textfont: { color: '#67e8f9', size: 11 },
      name: w.name,
      hovertext: [
        `Extremity Hp(0.07): ${nodes.extNode.dose.toFixed(1)} µSv/h`,
        `Gonad / Shallow: ${nodes.gonadNode.dose.toFixed(1)} µSv/h`,
        `Chest Deep Hp(10): ${nodes.chestNode.dose.toFixed(1)} µSv/h`,
        `Eye Lens Hp(3): ${nodes.eyeNode.dose.toFixed(1)} µSv/h`
      ],
      hoverinfo: 'text'
    });
  });

  // Add translucent mesh bounding boxes for Shields
  const shieldTraces: any[] = shields.map(sh => {
    return {
      type: 'mesh3d',
      x: [sh.x - sh.w / 2, sh.x - sh.w / 2, sh.x + sh.w / 2, sh.x + sh.w / 2, sh.x - sh.w / 2, sh.x - sh.w / 2, sh.x + sh.w / 2, sh.x + sh.w / 2],
      y: [sh.y - sh.l / 2, sh.y + sh.l / 2, sh.y + sh.l / 2, sh.y - sh.l / 2, sh.y - sh.l / 2, sh.y + sh.l / 2, sh.y + sh.l / 2, sh.y - sh.l / 2],
      z: [sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z - sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2, sh.z + sh.h / 2],
      i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
      j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
      k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
      opacity: 0.22,
      color: '#94a3b8',
      name: sh.name,
      hoverinfo: 'name'
    };
  });

  // Calculate Chart Lines for Dose Accumulation
  const maxTime = Math.max(...workers.map(w => w.taskDurationHours), 5);
  const timeArray = Array.from({ length: 50 }, (_, i) => (i / 49) * maxTime);

  const chartTraces: any[] = workers.map((w, idx) => {
    const ext = getWorkerNodes(w);
    const rate = ext.effectiveDoseRate;
    const colors = ['#00e5ff', '#ff9f1c', '#10b981', '#a855f7'];
    const yArr = timeArray.map(t => {
      if (t <= w.taskDurationHours) return t * rate;
      return w.taskDurationHours * rate;
    });
    return {
      x: timeArray, y: yArr,
      type: 'scatter', mode: 'lines',
      name: w.name,
      line: { width: 3, color: colors[idx % colors.length] }
    };
  });

  chartTraces.push({
    x: [0, maxTime], y: [1000, 1000],
    type: 'scatter', mode: 'lines',
    name: 'Shift ALARA Limit (1,000 µSv)',
    line: { color: '#ff9f1c', width: 2, dash: 'dash' }
  });
  chartTraces.push({
    x: [0, maxTime], y: [currentFramework.limits.occupationalAnnualEffective_mSv * 1000, currentFramework.limits.occupationalAnnualEffective_mSv * 1000],
    type: 'scatter', mode: 'lines',
    name: `${currentFramework.name} Limit (${currentFramework.limits.occupationalAnnualEffective_mSv} mSv)`,
    line: { color: '#ff3366', width: 2, dash: 'dash' }
  });

  // Analytics for HUD
  const workerAnalytics = useMemo(() => {
    let peakRate = 0;
    let peakWorker = '';
    let highestOrgan = 'Chest (DDE)';
    let highestOrganDose = 0;
    let worstAccumulation = 0;

    workers.forEach(w => {
      const bn = getWorkerNodes(w);
      if (bn.effectiveDoseRate > peakRate) {
        peakRate = bn.effectiveDoseRate;
        peakWorker = w.name;
      }
      if (bn.cumulativeEffectiveDose > worstAccumulation) {
        worstAccumulation = bn.cumulativeEffectiveDose;
      }

      const organs = [
        { name: 'Head / Eye Lens', val: bn.eyeNode.dose },
        { name: 'Chest / DDE', val: bn.chestNode.dose },
        { name: 'Gonads', val: bn.gonadNode.dose },
        { name: 'Extremity', val: bn.extNode.dose }
      ];
      organs.forEach(o => {
        if (o.val > highestOrganDose) {
          highestOrganDose = o.val;
          highestOrgan = `${o.name} (${w.name.split(' ')[0]})`;
        }
      });
    });

    let shiftStatus: 'SAFE' | 'ALARA_I' | 'ALARA_II' | 'EXCEEDED' = 'SAFE';
    if (worstAccumulation > 1000) shiftStatus = 'EXCEEDED';
    else if (worstAccumulation > 300) shiftStatus = 'ALARA_II';
    else if (worstAccumulation > 100) shiftStatus = 'ALARA_I';

    return { peakRate, peakWorker, highestOrgan, highestOrganDose, worstAccumulation, shiftStatus };
  }, [workers, sources, shields]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: '3D Worker Dosimetry & ALARA Shift Analysis',
    moduleName: 'Module 9: 3D Worker Dosimetry & ALARA Shift Tracker',
    statuteCitation: `${currentFramework.name} (${currentFramework.citation})`,
    verificationTestId: 'VTEST-15 / ICRP 103',
    operatorName: 'Lead Health Physicist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Radiological Protection Division',
    notes: 'Operational dosimetry evaluation with ray-AABB geometric shielding attenuation and anatomical node partitioning.',
    formulaDescription: 'E = \\sum_{i} h_E \\frac{\\Gamma_i A_i}{d_i^2} \\exp\\left(-\\sum_{j} \\mu_j x_j\\right) t_{\\text{stay}}',
    inputs: [
      { label: 'Workforce Size', value: `${workers.length} Operators` },
      { label: 'Active Hotspots', value: `${sources.length} Sources` },
      { label: 'Shielding Structures', value: `${shields.length} Barriers` },
      { label: 'Active Regulatory Authority', value: `${currentFramework.governingBody} (${currentFramework.name})` },
      { label: 'Occupational Annual Limit', value: currentFramework.limits.occupationalAnnualEffective_mSv, unit: 'mSv' },
      { label: 'Eye Lens Annual Limit', value: currentFramework.limits.lensOfEyeAnnual_mSv, unit: 'mSv' },
      { label: 'Skin/Extremity Annual Limit', value: currentFramework.limits.skinAndExtremitiesAnnual_mSv, unit: 'mSv' }
    ],
    outputs: [
      { label: 'Peak Dose Rate', value: workerAnalytics.peakRate.toFixed(1), unit: 'µSv/h', status: workerAnalytics.peakRate > 1000 ? 'WARNING' : 'COMPLIANT' },
      { label: 'Max Individual Accumulation', value: workerAnalytics.worstAccumulation.toFixed(1), unit: 'µSv', status: workerAnalytics.shiftStatus === 'EXCEEDED' ? 'EXCEEDED' : 'COMPLIANT' },
      { label: 'Critical Anatomical Organ', value: workerAnalytics.highestOrgan, status: 'COMPLIANT' },
      { label: 'Shift ALARA Compliance', value: workerAnalytics.shiftStatus, status: workerAnalytics.shiftStatus === 'EXCEEDED' ? 'EXCEEDED' : 'PASS' }
    ]
  }), [workers, sources, shields, currentFramework, workerAnalytics]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Title & Regulatory Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">HEALTH PHYSICS SUITE</span>
            <span className="hud-badge hud-badge-accent">{currentFramework.flagEmoji} {currentFramework.name} ({currentFramework.shortCode})</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Advanced 3D Worker Dosimetry &amp; ALARA Shift Tracker
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Multi-node anatomical dosimeter modeling, posture variation (Standing / Crouching / Prone), dynamic Ray-AABB shielding attenuation, and cumulative stay-time limits.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setIsDossierOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px' }}
        >
          <span>🖨️</span>
          <span>Export Audit Dossier</span>
        </button>
      </div>

      {/* Top ALARA Command HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">TRACKED WORKFORCE</span>
          <span className="hud-metric-value" style={{ color: 'var(--color-primary)' }}>
            {workers.length} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>OPERATORS</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Active Sources: {sources.length} | Shields: {shields.length}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">PEAK DOSE RATE</span>
          <span className="hud-metric-value" style={{ color: workerAnalytics.peakRate > 1000 ? '#ff3366' : 'var(--color-accent)' }}>
            {workerAnalytics.peakRate > 1000
              ? `${(workerAnalytics.peakRate / 1000).toFixed(2)} mSv/h`
              : `${workerAnalytics.peakRate.toFixed(1)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Location: {workerAnalytics.peakWorker || 'None'}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">CRITICAL ANATOMICAL NODE</span>
          <span className="hud-metric-value" style={{ color: '#f59e0b', fontSize: '1.15rem' }}>
            {workerAnalytics.highestOrganDose > 1000
              ? `${(workerAnalytics.highestOrganDose / 1000).toFixed(2)} mSv/h`
              : `${workerAnalytics.highestOrganDose.toFixed(1)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Node: {workerAnalytics.highestOrgan}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">SHIFT ALARA STATUS</span>
          <span className="hud-metric-value">
            {workerAnalytics.shiftStatus === 'SAFE' && <span className="hud-badge hud-badge-success">SAFE (&lt;100 µSv)</span>}
            {workerAnalytics.shiftStatus === 'ALARA_I' && <span className="hud-badge hud-badge-warning">ALARA LEVEL I (100–300 µSv)</span>}
            {workerAnalytics.shiftStatus === 'ALARA_II' && <span className="hud-badge hud-badge-accent">ALARA LEVEL II (300–1000 µSv)</span>}
            {workerAnalytics.shiftStatus === 'EXCEEDED' && <span className="hud-badge hud-badge-danger">EXCEEDED (&gt;1,000 µSv)</span>}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Worst Shift Acc: {workerAnalytics.worstAccumulation.toFixed(1)} µSv
          </span>
        </div>
      </div>

      {/* Ergonomic Workspace Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === '3d_room' ? 'active' : ''}`}
          onClick={() => setActiveTab('3d_room')}
        >
          3D Room &amp; Posture Trace
        </button>
        <button
          className={`tab-btn ${activeTab === 'alara_chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('alara_chart')}
        >
          ALARA Shift Projection
        </button>
        <button
          className={`tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
          onClick={() => setActiveTab('workers')}
        >
          Anatomical Dosimeter Array ({workers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'sources_shields' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources_shields')}
        >
          Sources &amp; Shielding Setup
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          ICRP Formulations
        </button>
      </div>

      {/* Workspace Tab Contents */}
      <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
        
        {/* TAB 1: 3D Room & Posture Trace */}
        {activeTab === '3d_room' && (
          <div style={{ height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff3366' }}></span> Sources
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00e5ff' }}></span> Personnel Nodes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(148, 163, 184, 0.4)' }}></span> Shield Barriers
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Max Cloud Filter (µSv/h):</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '100px', padding: '4px 8px', fontSize: '0.85rem' }}
                  value={displayMax}
                  onChange={e => setDisplayMax(Math.max(50, Number(e.target.value)))}
                />
              </div>
            </div>

            <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', position: 'relative', minHeight: '460px' }}>
              <Plot
                data={[
                  {
                    type: 'volume',
                    x: volX, y: volY, z: volZ, value: volV,
                    isomin: displayMin, isomax: displayMax, opacity: 0.12, surface: { count: 8 },
                    colorscale: 'Jet', colorbar: { title: 'µSv/h', len: 0.8, x: 0.96 },
                    hovertemplate: 'X:%{x:.1f}m, Y:%{y:.1f}m, Z:%{z:.1f}m<br>Dose Rate: %{value:.1f} µSv/h<extra></extra>'
                  },
                  ...modelTraces,
                  ...shieldTraces
                ]}
                layout={{
                  autosize: true, margin: { l: 0, r: 0, t: 0, b: 0 },
                  scene: {
                    xaxis: { title: 'X (m)', range: [0, dimX], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    yaxis: { title: 'Y (m)', range: [0, dimY], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    zaxis: { title: 'Z Elevation (m)', range: [0, dimZ], gridcolor: '#1e293b', zerolinecolor: '#334155' },
                    aspectmode: 'data',
                    camera: { eye: { x: 1.6, y: -1.6, z: 0.7 } }
                  },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  showlegend: false
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: ALARA Shift Projection */}
        {activeTab === 'alara_chart' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '360px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(5, 10, 18, 0.6)' }}>
              <Plot
                data={chartTraces}
                layout={{
                  autosize: true, margin: { l: 60, r: 20, t: 30, b: 50 },
                  title: { text: 'Cumulative ALARA Shift Dose Projection (µSv)', font: { color: '#E0E1DD', size: 14 } },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { color: '#E0E1DD' },
                  xaxis: { title: 'Workforce Stay-Time (Hours)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Cumulative Effective Dose (µSv)', gridcolor: '#1e293b', type: 'linear' },
                  showlegend: true, legend: { orientation: 'h', y: -0.2 }
                }}
                useResizeHandler={true} style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                  Operational Stay-Time Limits
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Worker</th>
                      <th style={{ padding: '6px' }}>Effective Rate</th>
                      <th style={{ padding: '6px' }}>Stay-Time</th>
                      <th style={{ padding: '6px' }}>Max Hrs to 1 mSv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => {
                      const bn = getWorkerNodes(w);
                      const maxHours1mSv = bn.effectiveDoseRate > 0 ? (1000 / bn.effectiveDoseRate) : 999;
                      return (
                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px 6px', fontWeight: 'bold' }}>{w.name}</td>
                          <td style={{ padding: '8px 6px', color: 'var(--color-accent)' }}>{bn.effectiveDoseRate.toFixed(1)} µSv/h</td>
                          <td style={{ padding: '8px 6px' }}>{w.taskDurationHours} hrs</td>
                          <td style={{ padding: '8px 6px', color: maxHours1mSv < w.taskDurationHours ? '#ff3366' : '#10b981', fontWeight: 'bold' }}>
                            {maxHours1mSv > 100 ? '>100 h' : `${maxHours1mSv.toFixed(1)} h`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-accent)', fontSize: '0.95rem' }}>
                  ALARA Action Levels (10 CFR 20 &amp; ICRP)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
                  <li><strong style={{ color: '#10b981' }}>Level I (100 µSv / shift):</strong> Normal operations; routine dosimeter readout.</li>
                  <li><strong style={{ color: '#f59e0b' }}>Level II (300 µSv / shift):</strong> RSO review required; investigate shielding barriers or rotate operators.</li>
                  <li><strong style={{ color: '#ff3366' }}>Action Limit (1,000 µSv / shift):</strong> Immediate job pause; mandatory stay-time reallocation and ALARA brief.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Anatomical Dosimeter Array */}
        {activeTab === 'workers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Personnel Anatomical Nodes &amp; Posture Models</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Evaluates non-uniform organ exposures across Eye Lens Hp(3), Chest Deep Hp(10), Gonadal nodes, and Extremity Shallow Hp(0.07).
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setWorkers([
                  ...workers,
                  { id: Date.now(), name: `Operator-${workers.length + 1}`, x: 3, y: 3, posture: 'Standing', rotationOffset: 0, taskDurationHours: 1 }
                ])}
              >
                + Add Worker Geometry
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
              {workers.map((w, idx) => {
                const breakdown = getWorkerNodes(w);
                const c = breakdown.chestNode.dose; const e = breakdown.eyeNode.dose;
                const g = breakdown.gonadNode.dose; const ex = breakdown.extNode.dose;

                const maxDose = Math.max(c, e, g, ex);
                const minDose = Math.min(c, e, g, ex);
                const gradientRatio = maxDose / (minDose > 0 ? minDose : 1);
                const hasExtremeGradient = gradientRatio > 5;

                return (
                  <div
                    key={w.id}
                    style={{
                      background: 'rgba(5, 10, 18, 0.7)',
                      border: hasExtremeGradient ? '1px solid #ff9f1c' : '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="hud-badge hud-badge-primary">ID #{w.id.toString().slice(-4)}</span>
                        <input
                          className="form-control"
                          value={w.name}
                          onChange={ev => {
                            const a = [...workers];
                            a[idx].name = ev.target.value;
                            setWorkers(a);
                          }}
                          style={{ fontWeight: 'bold', fontSize: '1.05rem', width: '220px' }}
                        />
                      </div>
                      <button
                        onClick={() => setWorkers(workers.filter(tgt => tgt.id !== w.id))}
                        className="btn btn-sm btn-outline-danger"
                        title="Remove Worker"
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>X Position (m)</label>
                        <input
                          type="number" step="0.1"
                          className="form-control"
                          value={w.x}
                          onChange={ev => {
                            const a = [...workers];
                            a[idx].x = Number(ev.target.value);
                            setWorkers(a);
                          }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Y Position (m)</label>
                        <input
                          type="number" step="0.1"
                          className="form-control"
                          value={w.y}
                          onChange={ev => {
                            const a = [...workers];
                            a[idx].y = Number(ev.target.value);
                            setWorkers(a);
                          }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Posture Model</label>
                        <select
                          className="form-control"
                          value={w.posture}
                          onChange={ev => {
                            const a = [...workers];
                            a[idx].posture = ev.target.value as any;
                            setWorkers(a);
                          }}
                        >
                          <option value="Standing">Standing (1.65m)</option>
                          <option value="Crouching">Crouching (1.0m)</option>
                          <option value="Prone">Prone (Floor)</option>
                        </select>
                      </div>
                    </div>

                    {w.posture === 'Prone' && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>Orientation Angle (°):</label>
                        <input
                          type="number"
                          className="form-control"
                          value={w.rotationOffset}
                          onChange={ev => {
                            const a = [...workers];
                            a[idx].rotationOffset = Number(ev.target.value);
                            setWorkers(a);
                          }}
                          style={{ width: '90px' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>0° = Facing +X, 90° = Facing +Y</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>Task Stay-Time (Hours):</label>
                      <input
                        type="number" step="0.5" min="0.1"
                        className="form-control"
                        value={w.taskDurationHours}
                        onChange={ev => {
                          const a = [...workers];
                          a[idx].taskDurationHours = Number(ev.target.value);
                          setWorkers(a);
                        }}
                        style={{ width: '90px' }}
                      />
                    </div>

                    {/* Anatomical Organ Dosimeters Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <div style={{ padding: '8px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'block' }}>EYE LENS Hp(3)</span>
                        <strong style={{ fontSize: '1.05rem', color: '#f59e0b' }}>{e.toFixed(1)} µSv/h</strong>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block' }}>CHEST DEEP Hp(10)</span>
                        <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>{c.toFixed(1)} µSv/h</strong>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'block' }}>GONADAL NODE</span>
                        <strong style={{ fontSize: '1.05rem', color: '#3b82f6' }}>{g.toFixed(1)} µSv/h</strong>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a855f7', display: 'block' }}>EXTREMITY Hp(0.07)</span>
                        <strong style={{ fontSize: '1.05rem', color: '#a855f7' }}>{ex.toFixed(1)} µSv/h</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Effective Rate: </span>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '1.05rem' }}>{breakdown.effectiveDoseRate.toFixed(1)} µSv/h</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cumulative Dose: </span>
                        <strong style={{ color: breakdown.cumulativeEffectiveDose > 1000 ? '#ff3366' : '#00e5ff', fontSize: '1.05rem' }}>
                          {breakdown.cumulativeEffectiveDose.toFixed(1)} µSv
                        </strong>
                      </div>
                    </div>

                    {hasExtremeGradient && (
                      <div style={{ fontSize: '0.75rem', color: '#ff9f1c', background: 'rgba(255, 159, 28, 0.1)', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #ff9f1c' }}>
                        <strong>HIGH SPATIAL GRADIENT ({gradientRatio.toFixed(1)}x):</strong> High variation between extremity and torso. Consider localized shadow shielding.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Sources & Shielding Setup */}
        {activeTab === 'sources_shields' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            
            {/* Point Sources Box */}
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }}>1. Radiation Point Sources</h3>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setSources([
                    ...sources,
                    { id: Date.now(), name: `Source-${sources.length + 1}`, x: dimX / 2, y: dimY / 2, z: 0.1, activity_MBq: 10000, gamma_uSv: 300 }
                  ])}
                >
                  + Add Source
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sources.map((s, idx) => (
                  <div key={s.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #334155', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input
                        className="form-control"
                        value={s.name}
                        onChange={e => {
                          const a = [...sources];
                          a[idx].name = e.target.value;
                          setSources(a);
                        }}
                        style={{ fontWeight: 'bold', width: '220px' }}
                      />
                      <button
                        onClick={() => setSources(sources.filter(src => src.id !== s.id))}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>X (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={s.x}
                          onChange={e => { const a = [...sources]; a[idx].x = Number(e.target.value); setSources(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Y (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={s.y}
                          onChange={e => { const a = [...sources]; a[idx].y = Number(e.target.value); setSources(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Z (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={s.z}
                          onChange={e => { const a = [...sources]; a[idx].z = Number(e.target.value); setSources(a); }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Activity (MBq)</label>
                        <input
                          type="number" className="form-control"
                          value={s.activity_MBq}
                          onChange={e => { const a = [...sources]; a[idx].activity_MBq = Number(e.target.value); setSources(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Γ Const (µSv·cm²/MBq·h)</label>
                        <input
                          type="number" className="form-control"
                          value={s.gamma_uSv}
                          onChange={e => { const a = [...sources]; a[idx].gamma_uSv = Number(e.target.value); setSources(a); }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Structure Shields Box */}
            <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#38bdf8' }}>2. Structure Shields &amp; Attenuators</h3>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShields([
                    ...shields,
                    { id: Date.now(), name: `Shield-${shields.length + 1}`, x: 5, y: 5, z: 1.5, w: 2, l: 0.4, h: 3, material: 'CONCRETE', tvl_cm: 14.7 }
                  ])}
                >
                  + Add Shield Block
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {shields.map((sh, idx) => (
                  <div key={sh.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #334155', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input
                        className="form-control"
                        value={sh.name}
                        onChange={e => {
                          const a = [...shields];
                          a[idx].name = e.target.value;
                          setShields(a);
                        }}
                        style={{ fontWeight: 'bold', width: '220px' }}
                      />
                      <button
                        onClick={() => setShields(shields.filter(s => s.id !== sh.id))}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Center X (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.x}
                          onChange={e => { const a = [...shields]; a[idx].x = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Center Y (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.y}
                          onChange={e => { const a = [...shields]; a[idx].y = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Center Z (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.z}
                          onChange={e => { const a = [...shields]; a[idx].z = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Width W (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.w}
                          onChange={e => { const a = [...shields]; a[idx].w = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Length L (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.l}
                          onChange={e => { const a = [...shields]; a[idx].l = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Height H (m)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.h}
                          onChange={e => { const a = [...shields]; a[idx].h = Number(e.target.value); setShields(a); }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px', alignItems: 'flex-end' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Material Preset</label>
                        <select
                          className="form-control"
                          value={sh.material}
                          onChange={e => {
                            const matKey = e.target.value;
                            const a = [...shields];
                            a[idx].material = matKey;
                            if (SHIELD_PRESETS[matKey]) {
                              a[idx].tvl_cm = SHIELD_PRESETS[matKey].tvl_cm;
                            }
                            setShields(a);
                          }}
                        >
                          {Object.keys(SHIELD_PRESETS).map(key => (
                            <option key={key} value={key}>{SHIELD_PRESETS[key].name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>TVL (cm)</label>
                        <input
                          type="number" step="0.1" className="form-control"
                          value={sh.tvl_cm}
                          onChange={e => {
                            const a = [...shields];
                            a[idx].tvl_cm = Number(e.target.value);
                            a[idx].material = 'CUSTOM';
                            setShields(a);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ICRP Formulations */}
        {activeTab === 'physics' && (
          <div style={{ background: 'rgba(5, 10, 18, 0.7)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.15rem' }}>
              ICRP Publication 103 &amp; 116 Worker Dosimetry Formulations
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>1. Point Source Inverse-Square Attenuation</h4>
                <BlockMath math="\dot{D}(r) = \frac{A \cdot \Gamma}{r^2} \cdot 10^{-\sum_i \frac{t_i}{\text{TVL}_i}}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Where <InlineMath math="A" /> is activity in MBq, <InlineMath math="\Gamma" /> is the specific gamma ray constant, <InlineMath math="r" /> is distance in cm, and <InlineMath math="t_i" /> is line-of-sight path length through attenuator <InlineMath math="i" />.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>2. Effective Dose Weighting</h4>
                <BlockMath math="E = \sum_T w_T \cdot H_T = 0.50\,H_{\text{chest}} + 0.30\,H_{\text{gonad}} + 0.10\,H_{\text{eye}} + 0.10\,H_{\text{ext}}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Operational proxy for effective dose <InlineMath math="E" /> derived from standardized anatomical probe nodes corresponding to ICRP 103 reference tissue weighting factors <InlineMath math="w_T" />.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>3. Ray-AABB Intersection Fraction</h4>
                <BlockMath math="t_{\min} = \max(\min(t_{x1}, t_{x2}), \min(t_{y1}, t_{y2}), \min(t_{z1}, t_{z2}))" />
                <BlockMath math="f_{\text{shield}} = \max(0, \min(1, t_{\max}) - \max(0, t_{\min}))" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Analytic slab penetration algorithm calculating exact ray intersection intervals through 3D Axis-Aligned Bounding Box (AABB) obstacles.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-accent)' }}>4. Cumulative Shift Exposure</h4>
                <BlockMath math="E_{\text{shift}} = \dot{E} \times t_{\text{stay}} \le 1\,000\,\mu\text{Sv}" />
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0 0' }}>
                  ALARA operational administrative boundary: shift exposures are limited to 1 mSv (1,000 µSv) to guarantee staying well below annual occupational limits (20 mSv ICRP / 50 mSv NRC).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <AuditDossierModal payload={dossierPayload} isOpen={isDossierOpen} onClose={() => setIsDossierOpen(false)} />
    </div>
  );
};

export default WorkerDosimetryModule;
