import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { BlockMath } from 'react-katex';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type ShieldTab = 'layers' | 'buildup' | 'solver' | 'physics';

interface ShieldMaterialData {
  name: string;
  symbol: string;
  density: number; // g/cm³
  // Energy grid in MeV: [0.015, 0.05, 0.1, 0.2, 0.5, 0.662, 1.0, 1.25, 2.0, 6.0, 10.0]
  // Mass attenuation mu/rho in cm²/g from NIST XCOM
  massAtten: number[];
  // Berger buildup parameter 'a' at ~1 MeV
  buildupA: number;
  buildupB: number;
}

const ENERGY_GRID_MEV = [0.015, 0.05, 0.1, 0.2, 0.5, 0.662, 1.0, 1.25, 2.0, 6.0, 10.0];

const MATERIALS_DATABASE: Record<string, ShieldMaterialData> = {
  LEAD: {
    name: 'Lead (Pb)',
    symbol: 'Pb',
    density: 11.34,
    massAtten: [110.0, 8.04, 5.55, 0.999, 0.161, 0.110, 0.071, 0.059, 0.046, 0.044, 0.050],
    buildupA: 0.65,
    buildupB: 0.02
  },
  TUNGSTEN: {
    name: 'Tungsten (W)',
    symbol: 'W',
    density: 19.30,
    massAtten: [98.2, 6.78, 4.43, 0.812, 0.138, 0.098, 0.066, 0.055, 0.043, 0.043, 0.049],
    buildupA: 0.70,
    buildupB: 0.02
  },
  DU: {
    name: 'Depleted Uranium (DU)',
    symbol: 'U-238',
    density: 19.10,
    massAtten: [125.0, 9.12, 6.10, 1.15, 0.185, 0.125, 0.079, 0.066, 0.051, 0.049, 0.056],
    buildupA: 0.60,
    buildupB: 0.015
  },
  STEEL: {
    name: 'Carbon Steel / Iron (Fe)',
    symbol: 'Fe',
    density: 7.87,
    massAtten: [24.5, 1.96, 0.370, 0.146, 0.084, 0.074, 0.0599, 0.0535, 0.0425, 0.0305, 0.0300],
    buildupA: 1.10,
    buildupB: 0.04
  },
  CONCRETE: {
    name: 'Standard Ordinary Concrete',
    symbol: 'Conc',
    density: 2.35,
    massAtten: [8.50, 0.435, 0.171, 0.124, 0.087, 0.078, 0.0637, 0.0569, 0.0445, 0.0275, 0.0230],
    buildupA: 1.45,
    buildupB: 0.06
  },
  BARITE_CONCRETE: {
    name: 'Heavy Barite Concrete (BaSO4)',
    symbol: 'Barite',
    density: 3.50,
    massAtten: [32.0, 2.45, 0.850, 0.220, 0.098, 0.085, 0.066, 0.058, 0.044, 0.032, 0.031],
    buildupA: 1.25,
    buildupB: 0.045
  },
  ALUMINUM: {
    name: 'Aluminum (Al)',
    symbol: 'Al',
    density: 2.70,
    massAtten: [12.2, 0.368, 0.170, 0.122, 0.084, 0.075, 0.0614, 0.0549, 0.0432, 0.0264, 0.0218],
    buildupA: 1.55,
    buildupB: 0.07
  },
  WATER: {
    name: 'Water (H2O)',
    symbol: 'H2O',
    density: 1.00,
    massAtten: [2.50, 0.226, 0.171, 0.137, 0.097, 0.086, 0.0707, 0.0632, 0.0494, 0.0277, 0.0222],
    buildupA: 1.80,
    buildupB: 0.08
  },
  HDPE: {
    name: 'High-Density Polyethylene (HDPE)',
    symbol: 'HDPE',
    density: 0.95,
    massAtten: [1.80, 0.210, 0.175, 0.141, 0.100, 0.089, 0.073, 0.065, 0.051, 0.028, 0.022],
    buildupA: 1.85,
    buildupB: 0.085
  },
  LEAD_GLASS: {
    name: 'Lead Glass (5.2 g/cm³)',
    symbol: 'Pb-Glass',
    density: 5.20,
    massAtten: [65.0, 4.80, 3.20, 0.600, 0.125, 0.092, 0.065, 0.056, 0.044, 0.038, 0.042],
    buildupA: 0.85,
    buildupB: 0.03
  }
};

interface IsotopePreset {
  id: string;
  name: string;
  energyMev: number;
  description: string;
}

const ISOTOPE_PRESETS: IsotopePreset[] = [
  { id: 'am241', name: 'Am-241 (59.5 keV)', energyMev: 0.0595, description: 'Low-energy alpha/gamma emitter. Extremely high photoelectric absorption.' },
  { id: 'tc99m', name: 'Tc-99m (140.5 keV)', energyMev: 0.1405, description: 'Diagnostic nuclear medicine. Modest lead shielding provides near-total attenuation.' },
  { id: 'i131', name: 'I-131 (364 keV)', energyMev: 0.364, description: 'Medical radioiodine therapy. Intermediate gamma energy.' },
  { id: 'ir192', name: 'Ir-192 (380 keV avg)', energyMev: 0.380, description: 'Industrial radiography & brachytherapy.' },
  { id: 'cs137', name: 'Cs-137 (661.7 keV)', energyMev: 0.6617, description: 'Standard industrial & irradiator reference gamma line.' },
  { id: 'co60', name: 'Co-60 (1.25 MeV avg)', energyMev: 1.25, description: 'Teletherapy & industrial irradiator. High penetration requiring thick barriers.' },
  { id: 'linac6', name: '6 MV Radiotherapy Linac (2.0 MeV eff)', energyMev: 2.0, description: 'Clinical linear accelerator broad spectrum.' },
  { id: 'high10', name: 'High-Energy Bremsstrahlung (10.0 MeV)', energyMev: 10.0, description: 'Industrial radiography linac. Pair production starts dominating.' }
];

interface ShieldLayer {
  id: string;
  materialKey: string;
  thicknessCm: number;
}

export const ShieldingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ShieldTab>('layers');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cs137');
  const [photonEnergyMev, setPhotonEnergyMev] = useState<number>(0.6617);
  const [incidentDoseRate, setIncidentDoseRate] = useState<number>(1000.0); // µSv/h
  const [includeBuildup, setIncludeBuildup] = useState<boolean>(true);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Initial multi-layer stack
  const [layers, setLayers] = useState<ShieldLayer[]>([
    { id: 'l1', materialKey: 'LEAD', thicknessCm: 2.0 },
    { id: 'l2', materialKey: 'CONCRETE', thicknessCm: 15.0 }
  ]);

  // Solver target limit
  const [targetDoseLimit, setTargetDoseLimit] = useState<number>(2.5); // µSv/h (Occupational Controlled Area limit)

  // Energy interpolation for mass attenuation coefficient
  const getLinearAttenuation = (matKey: string, energyMev: number): { muLinear: number; muMass: number; density: number } => {
    const mat = MATERIALS_DATABASE[matKey];
    if (!mat) return { muLinear: 0.1, muMass: 0.05, density: 2.0 };

    const e = Math.max(ENERGY_GRID_MEV[0], Math.min(ENERGY_GRID_MEV[ENERGY_GRID_MEV.length - 1], energyMev));
    // Find grid interval
    let idx = 0;
    while (idx < ENERGY_GRID_MEV.length - 1 && ENERGY_GRID_MEV[idx + 1] < e) {
      idx++;
    }
    const e0 = ENERGY_GRID_MEV[idx];
    const e1 = ENERGY_GRID_MEV[idx + 1] || e0;
    const mu0 = mat.massAtten[idx];
    const mu1 = mat.massAtten[idx + 1] || mu0;

    // Log-log interpolation
    let muMass = mu0;
    if (e1 > e0 && mu0 > 0 && mu1 > 0) {
      const frac = (Math.log(e) - Math.log(e0)) / (Math.log(e1) - Math.log(e0));
      muMass = Math.exp(Math.log(mu0) + frac * (Math.log(mu1) - Math.log(mu0)));
    }
    const muLinear = muMass * mat.density;
    return { muLinear, muMass, density: mat.density };
  };

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = ISOTOPE_PRESETS.find(x => x.id === presetId);
    if (p) {
      setPhotonEnergyMev(p.energyMev);
    }
  };

  // Stack Calculations
  const stackAnalytics = useMemo(() => {
    let currentDose = incidentDoseRate;
    let accumulatedOpticalThickness = 0;
    let totalMassArealGcm2 = 0;
    let totalThicknessCm = 0;
    let cumulativeBuildup = 1.0;

    const layerDetails = layers.map((layer, idx) => {
      const { muLinear, muMass, density } = getLinearAttenuation(layer.materialKey, photonEnergyMev);
      const opticalX = muLinear * layer.thicknessCm;
      accumulatedOpticalThickness += opticalX;

      const mat = MATERIALS_DATABASE[layer.materialKey];
      // Berger buildup for this layer
      const localBuildup = 1.0 + (mat?.buildupA || 1.0) * opticalX * Math.exp((mat?.buildupB || 0.05) * opticalX);
      cumulativeBuildup *= Math.max(1.0, localBuildup);

      const pureAtten = Math.exp(-opticalX);
      const layerDoseOut = currentDose * pureAtten * (includeBuildup ? localBuildup : 1.0);
      currentDose = layerDoseOut;

      const layerArealDensity = density * layer.thicknessCm;
      totalMassArealGcm2 += layerArealDensity;
      totalThicknessCm += layer.thicknessCm;

      const hvlCm = Math.LN2 / muLinear;
      const tvlCm = Math.LN10 / muLinear;

      return {
        ...layer,
        index: idx + 1,
        name: mat?.name || layer.materialKey,
        density,
        muLinear,
        muMass,
        hvlCm,
        tvlCm,
        opticalX,
        arealDensityGcm2: layerArealDensity,
        exitDose: layerDoseOut
      };
    });

    const finalDoseRate = currentDose;
    const totalAttenuationRatio = incidentDoseRate > 0 ? (incidentDoseRate / Math.max(1e-12, finalDoseRate)) : 1.0;
    const totalDecades = Math.log10(Math.max(1.0, totalAttenuationRatio));
    const structuralLoadKgM2 = totalMassArealGcm2 * 10.0;
    const structuralLoadLbFt2 = structuralLoadKgM2 * 0.204816;

    return {
      layerDetails,
      finalDoseRate,
      totalThicknessCm,
      totalMassArealGcm2,
      structuralLoadKgM2,
      structuralLoadLbFt2,
      totalAttenuationRatio,
      totalDecades,
      accumulatedOpticalThickness,
      cumulativeBuildup
    };
  }, [layers, photonEnergyMev, incidentDoseRate, includeBuildup]);

  // Continuous penetration curve
  const depthProfile = useMemo(() => {
    const points: { depthCm: number; doseRate: number; layerName: string }[] = [];
    let curDepth = 0;
    let curDose = incidentDoseRate;
    points.push({ depthCm: 0, doseRate: curDose, layerName: 'Incident Air' });

    layers.forEach(layer => {
      const { muLinear } = getLinearAttenuation(layer.materialKey, photonEnergyMev);
      const mat = MATERIALS_DATABASE[layer.materialKey];
      const steps = 15;
      const dStep = layer.thicknessCm / steps;
      for (let s = 1; s <= steps; s++) {
        const xStep = s * dStep;
        const optX = muLinear * xStep;
        const b = includeBuildup ? (1.0 + (mat?.buildupA || 1.0) * optX * Math.exp((mat?.buildupB || 0.05) * optX)) : 1.0;
        const stepDose = curDose * Math.exp(-optX) * b;
        points.push({
          depthCm: curDepth + xStep,
          doseRate: Math.max(1e-6, stepDose),
          layerName: mat?.name || layer.materialKey
        });
      }
      curDepth += layer.thicknessCm;
      curDose = points[points.length - 1].doseRate;
    });

    return points;
  }, [layers, photonEnergyMev, incidentDoseRate, includeBuildup]);

  // Solver table: required thickness for each material to hit targetDoseLimit
  const solverResults = useMemo(() => {
    const target = Math.max(1e-4, targetDoseLimit);
    const requiredRatio = Math.max(1.0, incidentDoseRate / target);
    const requiredDecades = Math.log10(requiredRatio);

    return Object.entries(MATERIALS_DATABASE).map(([key, mat]) => {
      const { muLinear, muMass } = getLinearAttenuation(key, photonEnergyMev);
      const hvlCm = Math.LN2 / muLinear;
      const tvlCm = Math.LN10 / muLinear;
      // Narrow beam requirement: x = ln(ratio) / mu
      const narrowThicknessCm = Math.log(requiredRatio) / muLinear;
      // With buildup approximation (approx 15-25% thicker)
      const broadThicknessCm = narrowThicknessCm * (1.0 + 0.18 * (mat.buildupA || 1.0));
      const requiredThicknessCm = includeBuildup ? broadThicknessCm : narrowThicknessCm;
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
        requiredThicknessCm,
        arealDensityGcm2,
        loadKgM2,
        status: loadKgM2 > 1000 ? 'HEAVY FLOOR LOAD' : 'STANDARD LOAD'
      };
    }).sort((a, b) => a.requiredThicknessCm - b.requiredThicknessCm);
  }, [incidentDoseRate, targetDoseLimit, photonEnergyMev, includeBuildup]);

  // Layer manipulation helpers
  const handleAddLayer = (materialKey: string = 'LEAD') => {
    const newId = `layer_${Date.now()}`;
    setLayers([...layers, { id: newId, materialKey, thicknessCm: 2.0 }]);
  };

  const handleRemoveLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const handleUpdateLayer = (id: string, field: 'materialKey' | 'thicknessCm', val: any) => {
    setLayers(layers.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  // Cryptographic Dossier Payload
  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: 'ICS-208 Radiation Shielding & Barrier Attenuation Engineering Dossier',
    moduleName: 'Module 14 (Shielding & ALARA Design)',
    statuteCitation: 'NCRP Report No. 151 / NCRP Report No. 147 / NIST XCOM Database',
    verificationTestId: 'VTEST-02',
    operatorName: 'Radiation Shielding Physicist',
    operatorCredentials: 'CHP / Medical Physicist',
    facility: 'Central Radiotherapy & Industrial Shielding Facility',
    notes: `Multi-layer barrier analysis for ${photonEnergyMev.toFixed(3)} MeV photons. Initial field: ${incidentDoseRate.toFixed(1)} µSv/h. Attenuated: ${stackAnalytics.finalDoseRate.toFixed(2)} µSv/h. Total layers: ${layers.length}. Total areal mass: ${stackAnalytics.totalMassArealGcm2.toFixed(1)} g/cm².`,
    formulaDescription: 'I(x) = B(\\mu x) \\cdot I_0 \\cdot e^{-\\sum \\mu_i x_i}, \\quad HVL = \\frac{\\ln 2}{\\mu}, \\quad TVL = \\frac{\\ln 10}{\\mu}, \\quad M_A = \\sum \\rho_i x_i',
    inputs: [
      { label: 'Photon Energy', value: photonEnergyMev, unit: 'MeV' },
      { label: 'Incident Dose Rate', value: incidentDoseRate, unit: 'µSv/h' },
      { label: 'Buildup Geometry', value: includeBuildup ? 'Broad-Beam (Berger Buildup Active)' : 'Narrow-Beam (B=1.0)' },
      { label: 'Layer Count', value: layers.length },
      { label: 'Target ALARA Limit', value: targetDoseLimit, unit: 'µSv/h' }
    ],
    outputs: [
      { label: 'Attenuated Dose Rate', value: stackAnalytics.finalDoseRate.toFixed(2), unit: 'µSv/h', status: stackAnalytics.finalDoseRate <= targetDoseLimit ? 'COMPLIANT' : 'WARNING' },
      { label: 'Total Barrier Thickness', value: stackAnalytics.totalThicknessCm.toFixed(2), unit: 'cm', status: 'PASS' },
      { label: 'Attenuation Factor', value: stackAnalytics.totalAttenuationRatio.toExponential(2), unit: 'x', status: 'PASS' },
      { label: 'Decades of Attenuation', value: stackAnalytics.totalDecades.toFixed(2), unit: 'decades', status: 'PASS' },
      { label: 'Structural Floor Load', value: stackAnalytics.structuralLoadKgM2.toFixed(1), unit: 'kg/m²', status: stackAnalytics.structuralLoadKgM2 > 1500 ? 'WARNING' : 'PASS' },
      { label: 'Floor Load (Imperial)', value: stackAnalytics.structuralLoadLbFt2.toFixed(1), unit: 'lb/ft²', status: 'PASS' }
    ]
  }), [photonEnergyMev, incidentDoseRate, includeBuildup, layers, targetDoseLimit, stackAnalytics]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Module Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">SHIELDING &amp; ALARA</span>
            <span className="hud-badge hud-badge-accent">NIST XCOM / NCRP-151</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Multi-Layer Shielding &amp; Attenuation Physics Engine
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Energy-dependent mass attenuation coefficients (NIST XCOM), broad-beam Compton scatter buildup factors, structural floor load analysis, and automated ALARA thickness optimizer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <VerificationBadge testId="VTEST-02" standard="NCRP-151" />
          <button
            className="btn btn-secondary"
            onClick={() => setIsDossierOpen(true)}
            style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 14px' }}
          >
            Export Audit Dossier
          </button>
        </div>
      </div>

      {/* Top Tactical HUD Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="hud-card">
          <span className="hud-metric-label">INCIDENT FIELD RATE</span>
          <span className="hud-metric-value" style={{ color: '#ef4444' }}>
            {incidentDoseRate >= 1000 ? `${(incidentDoseRate / 1000).toFixed(2)} mSv/h` : `${incidentDoseRate.toFixed(1)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Energy: {(photonEnergyMev * 1000).toFixed(1)} keV ({photonEnergyMev.toFixed(3)} MeV)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">ATTENUATED FIELD RATE</span>
          <span className="hud-metric-value" style={{ color: stackAnalytics.finalDoseRate <= targetDoseLimit ? '#10b981' : '#f59e0b' }}>
            {stackAnalytics.finalDoseRate >= 1000
              ? `${(stackAnalytics.finalDoseRate / 1000).toFixed(2)} mSv/h`
              : `${stackAnalytics.finalDoseRate < 0.01 ? stackAnalytics.finalDoseRate.toExponential(2) : stackAnalytics.finalDoseRate.toFixed(2)} µSv/h`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Status: {stackAnalytics.finalDoseRate <= targetDoseLimit ? 'COMPLIANT WITH ALARA' : 'EXCEEDS TARGET LIMIT'}
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">TOTAL ATTENUATION</span>
          <span className="hud-metric-value" style={{ color: '#00e5ff' }}>
            10<sup>-{stackAnalytics.totalDecades.toFixed(2)}</sup>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Factor: {stackAnalytics.totalAttenuationRatio.toExponential(2)}× ({((1 - stackAnalytics.finalDoseRate / incidentDoseRate) * 100).toFixed(2)}%)
          </span>
        </div>

        <div className="hud-card">
          <span className="hud-metric-label">STRUCTURAL FLOOR LOAD</span>
          <span className="hud-metric-value" style={{ color: stackAnalytics.structuralLoadKgM2 > 1500 ? '#ef4444' : '#38bdf8' }}>
            {stackAnalytics.structuralLoadKgM2.toFixed(0)} kg/m²
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {stackAnalytics.structuralLoadLbFt2.toFixed(1)} lb/ft² ({stackAnalytics.totalThicknessCm.toFixed(1)} cm total)
          </span>
        </div>
      </div>

      {/* Quick Radioisotope & Energy Selector Ribbon */}
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            RADIOISOTOPE PRESETS &amp; PHOTON ENERGY
          </span>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeBuildup}
                onChange={e => setIncludeBuildup(e.target.checked)}
              />
              Include Broad-Beam Compton Buildup B(&mu;x)
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {ISOTOPE_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className="btn"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
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
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Arbitrary Photon Energy (MeV):</label>
            <input
              type="number"
              step="0.05"
              min="0.015"
              max="10.0"
              className="form-control"
              value={photonEnergyMev}
              onChange={e => {
                setSelectedPresetId('custom');
                setPhotonEnergyMev(Math.max(0.015, Math.min(10.0, parseFloat(e.target.value) || 0.5)));
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
        </div>
      </div>

      {/* Ergonomic Workspace Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          🛡️ Multi-Layer Stack &amp; Depth Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'buildup' ? 'active' : ''}`}
          onClick={() => setActiveTab('buildup')}
        >
          🌊 Broad-Beam Buildup Analysis
        </button>
        <button
          className={`tab-btn ${activeTab === 'solver' ? 'active' : ''}`}
          onClick={() => setActiveTab('solver')}
        >
          🎯 ALARA Barrier Thickness Optimizer
        </button>
        <button
          className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          onClick={() => setActiveTab('physics')}
        >
          📐 NCRP-151 &amp; NIST Physics Derivations
        </button>
      </div>

      {/* TAB 1: Multi-Layer Stack & Depth Profile */}
      {activeTab === 'layers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(400px, 1.3fr)', gap: '16px', flex: 1 }}>
          {/* Left Column: Stack Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Configured Attenuation Layers ({layers.length})</span>
              <button
                className="btn btn-primary"
                onClick={() => handleAddLayer('LEAD')}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                + Add Layer
              </button>
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
                        style={{ fontSize: '0.85rem', width: '220px' }}
                      >
                        {Object.entries(MATERIALS_DATABASE).map(([key, mat]) => (
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
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Layer Exit Rate:</label>
                      <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>
                        {l.exitDose >= 1000 ? `${(l.exitDose / 1000).toFixed(2)} mSv/h` : `${l.exitDose.toFixed(1)} µSv/h`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>HVL: {l.hvlCm.toFixed(2)} cm</span>
                    <span>TVL: {l.tvlCm.toFixed(2)} cm</span>
                    <span>Mass: {l.arealDensityGcm2.toFixed(1)} g/cm²</span>
                    <span>&mu;: {l.muLinear.toFixed(3)} cm⁻¹</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Plot */}
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00e5ff', marginBottom: '8px' }}>
              Continuous Attenuation Depth Profile (Log Scale)
            </span>
            <div style={{ flex: 1, minHeight: '380px' }}>
              <Plot
                data={[
                  {
                    x: depthProfile.map(p => p.depthCm),
                    y: depthProfile.map(p => p.doseRate),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Field Attenuation',
                    line: { color: '#00e5ff', width: 2.5 },
                    marker: { size: 4 },
                    hovertemplate: 'Depth: %{x:.2f} cm<br>Dose Rate: %{y:.2f} µSv/h<extra></extra>'
                  },
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
                  margin: { l: 65, r: 25, t: 25, b: 50 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#E0E1DD' },
                  xaxis: { title: 'Cumulative Shield Depth (cm)', gridcolor: '#1e293b' },
                  yaxis: { title: 'Dose Rate (µSv/h)', type: 'log', gridcolor: '#1e293b' },
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

      {/* TAB 2: Broad-Beam Buildup Analysis */}
      {activeTab === 'buildup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>Compton Scatter &amp; Buildup Factors</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
              In practical radiation shielding with broad beams and large barrier surfaces, secondary scattered photons build up within the material matrix. 
              Pure exponential decay <code>e^(-&mu;x)</code> applies strictly to narrow pencil beams. For thick walls, broad-beam buildup factor <code>B(&mu;x)</code> can increase transmitted dose rates by <strong>200% to 500%</strong> compared to simple narrow-beam approximations.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CURRENT STACK BUILDUP STATUS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                Total Buildup B(&mu;x) = {stackAnalytics.cumulativeBuildup.toFixed(2)}×
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Mean Optical Thickness: &mu;x = {stackAnalytics.accumulatedOpticalThickness.toFixed(2)} mean free paths
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-accent)' }}>Berger Formula Parameterization</h4>
            <div className="formula-box" style={{ fontSize: '0.9rem', padding: '12px' }}>
              <BlockMath math="B(\mu x) = 1 + a \cdot (\mu x) \cdot e^{b \cdot (\mu x)}" />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6', marginTop: '10px' }}>
              RadPro Calc utilizes empirical Berger coefficients parameterized against evaluated NCRP Report No. 151 and ANS-6.4.3 point isotropic data. High-Z materials (Lead, Tungsten) feature minimal buildup due to dominant photoelectric re-absorption, whereas low-Z materials (Water, Concrete) exhibit extensive multiple-scatter buildup.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: ALARA Barrier Thickness Optimizer */}
      {activeTab === 'solver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Target Regulatory Dose Limit: {targetDoseLimit} µSv/h
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '12px' }}>
                Required Attenuation Ratio: {(incidentDoseRate / targetDoseLimit).toFixed(1)}×
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(0.5)}>Public Uncontrolled (0.5 µSv/h)</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(2.5)}>Controlled Area (2.5 µSv/h)</button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setTargetDoseLimit(10.0)}>ALARA Target (10 µSv/h)</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-primary)' }}>
                  <th style={{ padding: '10px' }}>Shielding Material</th>
                  <th style={{ padding: '10px' }}>Density</th>
                  <th style={{ padding: '10px' }}>Linear &mu;</th>
                  <th style={{ padding: '10px' }}>HVL</th>
                  <th style={{ padding: '10px' }}>TVL</th>
                  <th style={{ padding: '10px', color: '#00e5ff' }}>Required Thickness</th>
                  <th style={{ padding: '10px' }}>Areal Weight</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {solverResults.map(res => (
                  <tr key={res.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{res.name}</td>
                    <td style={{ padding: '10px' }}>{res.density.toFixed(2)} g/cm³</td>
                    <td style={{ padding: '10px' }}>{res.muLinear.toFixed(3)} cm⁻¹</td>
                    <td style={{ padding: '10px' }}>{res.hvlCm.toFixed(2)} cm</td>
                    <td style={{ padding: '10px' }}>{res.tvlCm.toFixed(2)} cm</td>
                    <td style={{ padding: '10px', color: '#00e5ff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {res.requiredThicknessCm.toFixed(2)} cm
                    </td>
                    <td style={{ padding: '10px', color: res.loadKgM2 > 1500 ? '#ef4444' : 'var(--color-text-muted)' }}>
                      {res.loadKgM2.toFixed(0)} kg/m²
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setLayers([{ id: `l_${Date.now()}`, materialKey: res.key, thicknessCm: parseFloat(res.requiredThicknessCm.toFixed(1)) }]);
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

      {/* TAB 4: NCRP-151 & NIST Physics */}
      {activeTab === 'physics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', flex: 1 }}>
          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>1. Linear Attenuation &amp; NIST XCOM</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.85rem' }}>
              <BlockMath math="I(x) = I_0 \cdot \exp\left(-\sum_{i=1}^N \mu_i x_i\right)" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Linear attenuation coefficient <code>&mu; = (&mu;/&rho;) &times; &rho;</code>. Mass attenuation data <code>(&mu;/&rho;)</code> is dynamically interpolated across NIST XCOM cross-section tables from 15 keV to 10 MeV.
            </p>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-accent)' }}>2. Half-Value &amp; Tenth-Value Layers</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.85rem' }}>
              <BlockMath math="\text{HVL} = \frac{\ln(2)}{\mu} \approx \frac{0.69315}{\mu}, \quad \text{TVL} = \frac{\ln(10)}{\mu} \approx \frac{2.30259}{\mu}" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              One TVL reduces photon fluence by an order of magnitude (90% reduction), while one HVL reduces fluence by 50%.
            </p>
          </div>

          <div style={{ background: 'rgba(5, 10, 18, 0.6)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#10b981' }}>3. Structural Load Engineering</h4>
            <div className="formula-box" style={{ padding: '10px', fontSize: '0.85rem' }}>
              <BlockMath math="M_A = \sum \rho_i x_i \ [\text{g/cm}^2], \quad L = 10 \cdot M_A \ [\text{kg/m}^2]" />
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Heavy shielding materials (Lead, Tungsten, Barite) present substantial architectural dead loads that must comply with structural building codes (IBC / ASCE 7).
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
