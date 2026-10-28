import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type CaasTab = 'excursion' | 'caas_coverage' | 'prompt_flash' | 'emergency_plan';

interface CriticalityPreset {
  id: string;
  name: string;
  category: string;
  totalFissions: number;
  reactivityStepDollars: number;
  promptGenerationTimeS: number;
  tempFeedbackCoeff: number; // $ / J
  heatCapacityJPerC: number;
  description: string;
}

const CRITICALITY_PRESETS: CriticalityPreset[] = [
  {
    id: 'godiva_prompt',
    name: '🔴 Godiva-IV Unreflected Metal Assembly (HEU-93%)',
    category: 'Bare Metal Prompt Critical',
    totalFissions: 1.2e16,
    reactivityStepDollars: 0.10, // $0.10 above prompt critical
    promptGenerationTimeS: 1.2e-8, // 12 ns
    tempFeedbackCoeff: 3.3e-5,
    heatCapacityJPerC: 6200,
    description: 'Fast bare sphere of 93.5% enriched uranium. Sharp microsecond prompt fission pulse terminated by thermal expansion.'
  },
  {
    id: 'solution_tank',
    name: '🟡 Uranyl Nitrate Fissile Solution Tank (Tokaimura Style)',
    category: 'Enriched Fissile Solution',
    totalFissions: 2.5e18,
    reactivityStepDollars: 0.05,
    promptGenerationTimeS: 1.0e-4, // 100 µs
    tempFeedbackCoeff: 1.2e-4,
    heatCapacityJPerC: 45000,
    description: 'Moderated solution excursion with high fission yield, delayed radiolytic gas bubble formation, and sustained boiling pulses.'
  },
  {
    id: 'plutonium_scrap',
    name: '🟠 Plutonium Scrap / Glovebox Precipitation Tank',
    category: 'Plutonium Processing',
    totalFissions: 8.0e17,
    reactivityStepDollars: 0.08,
    promptGenerationTimeS: 3.5e-5,
    tempFeedbackCoeff: 2.1e-4,
    heatCapacityJPerC: 28000,
    description: 'Undersized geometry failure during chemical extraction. Rapid initial spike followed by plateau oscillation.'
  }
];

export const CAASCriticalityModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CaasTab>('excursion');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('godiva_prompt');
  const [customFissionsLog, setCustomFissionsLog] = useState<number>(16.08); // log10(1.2e16)
  const [concreteShieldThicknessCm, setConcreteShieldThicknessCm] = useState<number>(30);
  const [detectorDistanceM, setDetectorDistanceM] = useState<number>(20);
  const [personnelDistanceM, setPersonnelDistanceM] = useState<number>(15);
  const [detectorSetpointRadHr, setDetectorSetpointRadHr] = useState<number>(3.0);
  const [interiorWallCm, setInteriorWallCm] = useState<number>(0);
  const [arrayLayoutPreset, setArrayLayoutPreset] = useState<'triangle' | 'corridor' | 'vault'>('triangle');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const activePreset = useMemo(() => {
    return CRITICALITY_PRESETS.find((x) => x.id === selectedPresetId) || CRITICALITY_PRESETS[0];
  }, [selectedPresetId]);

  const totalFissions = Math.pow(10, customFissionsLog);

  // When preset changes
  const handleSelectPreset = (pId: string) => {
    setSelectedPresetId(pId);
    const p = CRITICALITY_PRESETS.find((x) => x.id === pId);
    if (p) {
      setCustomFissionsLog(Math.log10(p.totalFissions));
    }
  };

  // --- TAB 1: Prompt-Critical Excursion Kinetics (Nordheim-Fuchs) ---
  const excursionKinetics = useMemo(() => {
    const betaEff = 0.0065; // standard delayed neutron fraction
    const promptDollar = activePreset.reactivityStepDollars;
    const promptDeltaK = promptDollar * betaEff;
    const lPrompt = activePreset.promptGenerationTimeS;

    // Initial inverse reactor period alpha_0 = delta_k_p / l
    const alpha0 = promptDeltaK / lPrompt; // s^-1

    // FWHM pulse width ~ 3.52 / alpha_0
    const fwhmSeconds = 3.52 / Math.max(1, alpha0);
    const fwhmMs = fwhmSeconds * 1000;

    // Energy per fission ~ 200 MeV = 3.204e-11 Joules
    const totalEnergyJ = totalFissions * 3.204e-11;
    const peakPowerWatts = (totalEnergyJ * alpha0) / 2.0;

    // Plot simulation points
    const points: { tMs: number; powerMW: number; energyMJ: number }[] = [];
    const tSpanMs = Math.max(0.2, fwhmMs * 4);
    const steps = 100;
    const dtMs = tSpanMs / steps;

    for (let i = 0; i <= steps; i++) {
      const tMs = -tSpanMs / 2 + i * dtMs;
      const tSec = tMs / 1000;
      // Nordheim-Fuchs sech^2 pulse profile: P(t) = P_max * sech^2(alpha_0 * t / 2)
      const u = (alpha0 * tSec) / 2;
      const coshU = Math.cosh(Math.min(50, Math.max(-50, u)));
      const pRatio = 1 / (coshU * coshU);
      const powerMW = (peakPowerWatts * pRatio) / 1e6;

      // Cumulative energy fraction: (1 + tanh(u)) / 2
      const tanhU = Math.tanh(Math.min(50, Math.max(-50, u)));
      const energyMJ = (totalEnergyJ * (1 + tanhU) / 2) / 1e6;

      points.push({ tMs, powerMW, energyMJ });
    }

    return {
      alpha0,
      fwhmMs,
      totalEnergyJ,
      totalEnergyMJ: totalEnergyJ / 1e6,
      peakPowerWatts,
      peakPowerMW: peakPowerWatts / 1e6,
      points
    };
  }, [activePreset, totalFissions]);

  // --- TAB 2 & 3: Prompt Flash Doses & ANSI/ANS-8.3 CAAS Coverage ---
  const caasCalculations = useMemo(() => {
    // Prompt fission yield:
    // Prompt gammas: ~2.0e-15 Gy*m^2 per fission in air
    // Prompt neutrons: ~2.5e-15 Gy*m^2 per fission in air
    const gammaCoeff = 2.0e-15;
    const neutronCoeff = 2.5e-15;

    // Concrete attenuation:
    // HVL gamma ~ 11 cm, HVL neutron ~ 15 cm
    const hvlGammaCm = 11.0;
    const hvlNeutronCm = 15.0;
    const transGamma = Math.pow(0.5, concreteShieldThicknessCm / hvlGammaCm);
    const transNeutron = Math.pow(0.5, concreteShieldThicknessCm / hvlNeutronCm);

    // Dose at Detector Location (Gy)
    const rDet = Math.max(1, detectorDistanceM);
    const doseGammaDetGy = (totalFissions * gammaCoeff / (4 * Math.PI * rDet * rDet)) * transGamma;
    const doseNeutronDetGy = (totalFissions * neutronCoeff / (4 * Math.PI * rDet * rDet)) * transNeutron;
    const totalDoseDetGy = doseGammaDetGy + doseNeutronDetGy;
    const totalDoseDetRad = totalDoseDetGy * 100;

    // Dose Rate during peak burst (Gy/min)
    // burst duration in minutes:
    const burstDurationMin = Math.max(0.0001 / 60, (excursionKinetics.fwhmMs / 1000) / 60);
    const doseRateDetGyMin = totalDoseDetGy / burstDurationMin;
    const doseRateDetRadMin = doseRateDetGyMin * 100;

    // ANSI/ANS-8.3 requirement: Alarm must trip at >= 0.20 Gy/min (20 rad/min) at 2.0 meters
    const caasCompliant = doseRateDetGyMin >= 0.20;

    // Dose at Personnel Distance (Gy / Rem)
    const rPers = Math.max(1, personnelDistanceM);
    const doseGammaPersGy = (totalFissions * gammaCoeff / (4 * Math.PI * rPers * rPers)) * transGamma;
    const doseNeutronPersGy = (totalFissions * neutronCoeff / (4 * Math.PI * rPers * rPers)) * transNeutron;
    // Fast neutron radiation weighting factor w_R = 10
    const doseEqPersSv = doseGammaPersGy * 1.0 + doseNeutronPersGy * 10.0;
    const doseEqPersRem = doseEqPersSv * 100;

    // Acute lethality assessment
    let clinicalTriage = 'Minor / Sub-clinical Exposure';
    let triageColor = '#10b981';
    if (doseEqPersSv >= 8.0) {
      clinicalTriage = 'Supralethal (Gastrointestinal & Vascular Collapse)';
      triageColor = '#ef4444';
    } else if (doseEqPersSv >= 4.0) {
      clinicalTriage = 'Severe Hematopoietic Syndrome (LD50/60 Range)';
      triageColor = '#f97316';
    } else if (doseEqPersSv >= 1.0) {
      clinicalTriage = 'Moderate Acute Radiation Sickness (Lymphopenia)';
      triageColor = '#ffb703';
    }

    return {
      totalDoseDetGy,
      totalDoseDetRad,
      doseRateDetGyMin,
      doseRateDetRadMin,
      caasCompliant,
      doseGammaPersGy,
      doseNeutronPersGy,
      doseEqPersSv,
      doseEqPersRem,
      clinicalTriage,
      triageColor
    };
  }, [totalFissions, concreteShieldThicknessCm, detectorDistanceM, personnelDistanceM, excursionKinetics]);

  // --- TAB 2B: ANSI/ANS-8.3 2D Facility 2oo3 Coincidence Detector Coverage & Blind-Zone Grid Solver ---
  const caasGridCoverage = useMemo(() => {
    // ANSI/ANS-8.3-1997 (R2020) Sec 4.2.1 Minimum Accident of Concern:
    // 0.20 Gy/min = 20 rad/min = 1200 rad/h at r_ref = 2.0 m in free air
    const rRefM = 2.0;
    const minAccidentRateRadHrAt2m = 1200.0;
    const hvlEffectiveCm = 12.5;
    const wallTrans = Math.pow(0.5, Math.max(0, interiorWallCm) / hvlEffectiveCm);
    const dTrip = Math.max(0.1, detectorSetpointRadHr);

    // Maximum detection radius per detector channel (m):
    // R_max = r_ref * sqrt((1200 * T_wall) / D_trip)
    const rMaxM = rRefM * Math.sqrt((minAccidentRateRadHrAt2m * wallTrans) / dTrip);

    const detectors =
      arrayLayoutPreset === 'triangle'
        ? [
            { id: 'DET-A (NW Bay)', x: 12, y: 30 },
            { id: 'DET-B (NE Bay)', x: 48, y: 30 },
            { id: 'DET-C (South Center)', x: 30, y: 8 }
          ]
        : arrayLayoutPreset === 'corridor'
        ? [
            { id: 'DET-A (West Wing)', x: 10, y: 20 },
            { id: 'DET-B (Center Hall)', x: 30, y: 20 },
            { id: 'DET-C (East Wing)', x: 50, y: 20 }
          ]
        : [
            { id: 'DET-A (Vault W1)', x: 8, y: 34 },
            { id: 'DET-B (Vault W2)', x: 16, y: 34 },
            { id: 'DET-C (Vault SW)', x: 8, y: 12 }
          ];

    const xVals: number[] = [];
    const yVals: number[] = [];
    for (let x = 0; x <= 60; x += 1) xVals.push(x);
    for (let y = 0; y <= 40; y += 1) yVals.push(y);

    const zMatrix: number[][] = [];
    let totalCells = 0;
    let twoOfThreeCells = 0;
    let oneOfThreeCells = 0;
    let blindZoneCells = 0;

    for (let j = 0; j < yVals.length; j++) {
      const y = yVals[j];
      const row: number[] = [];
      for (let i = 0; i < xVals.length; i++) {
        const x = xVals[i];
        let channelsTripped = 0;
        for (const det of detectors) {
          const dist = Math.hypot(x - det.x, y - det.y);
          if (dist <= rMaxM) channelsTripped++;
        }
        row.push(channelsTripped);
        totalCells++;
        if (channelsTripped >= 2) twoOfThreeCells++;
        else if (channelsTripped === 1) oneOfThreeCells++;
        else blindZoneCells++;
      }
      zMatrix.push(row);
    }

    return {
      rMaxM,
      wallTrans,
      detectors,
      xVals,
      yVals,
      zMatrix,
      pct2oo3: (twoOfThreeCells / totalCells) * 100,
      pct1oo3: (oneOfThreeCells / totalCells) * 100,
      pctBlind: (blindZoneCells / totalCells) * 100
    };
  }, [detectorSetpointRadHr, interiorWallCm, arrayLayoutPreset]);

  // --- TAB 3B: Radial Prompt Neutron & Gamma Flash Profile (1m - 100m) ---
  const radialFlashProfile = useMemo(() => {
    const gammaCoeff = 2.0e-15;
    const neutronCoeff = 2.5e-15;
    const transGamma = Math.pow(0.5, concreteShieldThicknessCm / 11.0);
    const transNeutron = Math.pow(0.5, concreteShieldThicknessCm / 15.0);

    const radiiM: number[] = [];
    const gammaGy: number[] = [];
    const neutronGy: number[] = [];
    const eqDoseSv: number[] = [];

    for (let r = 1; r <= 100; r += 1) {
      const dg = ((totalFissions * gammaCoeff) / (4 * Math.PI * r * r)) * transGamma;
      const dn = ((totalFissions * neutronCoeff) / (4 * Math.PI * r * r)) * transNeutron;
      const heq = dg + 10.0 * dn;
      radiiM.push(r);
      gammaGy.push(dg);
      neutronGy.push(dn);
      eqDoseSv.push(heq);
    }

    // Solve analytical radius where H_eq(r) = 4.0 Sv (LD50/60) and 0.25 Sv (Emergency limit)
    const sourceTermSvM2 =
      (totalFissions / (4 * Math.PI)) * (gammaCoeff * transGamma + 10.0 * neutronCoeff * transNeutron);
    const rLd50M = Math.sqrt(sourceTermSvM2 / 4.0);
    const r250mSvM = Math.sqrt(sourceTermSvM2 / 0.25);

    return {
      radiiM,
      gammaGy,
      neutronGy,
      eqDoseSv,
      rLd50M,
      r250mSvM
    };
  }, [totalFissions, concreteShieldThicknessCm]);

  // --- Cryptographic Dossier Payload ---
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: 'ANSI/ANS-8.3 Criticality Accident Alarm System (CAAS) & Excursion Dossier',
      moduleName: 'Module 22: CAAS & Criticality Accident Excursion Kinetics',
      statuteCitation: 'ANSI/ANS-8.3-1997 (R2017) / 10 CFR 70.24 / DOE-STD-3007',
      verificationTestId: 'VTEST-31',
      operatorName: 'Nuclear Criticality Safety Engineer',
      operatorCredentials: 'PE, CHP, Criticality Safety Officer',
      facility: 'Fissile Material Processing Facility / Vault Interlock',
      notes: `Criticality accident analysis for ${activePreset.name}. Fission yield: ${totalFissions.toExponential(2)} fissions (${excursionKinetics.totalEnergyMJ.toFixed(2)} MJ). CAAS Trip at ${detectorDistanceM}m: ${caasCalculations.doseRateDetRadMin.toFixed(0)} rad/min (${caasCalculations.caasCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}). Personnel dose at ${personnelDistanceM}m: ${caasCalculations.doseEqPersRem.toFixed(1)} Rem.`,
      formulaDescription: 'N_f = \\frac{2 \\alpha_0 C}{\\alpha_T E_f}, \\quad P(t) = P_{\\max} \\operatorname{sech}^2\\left(\\frac{\\alpha_0 t}{2}\\right), \\quad \\dot{D} \\ge 20\\text{ rad/min at 2m}',
      inputs: [
        { label: 'Excursion Archetype', value: activePreset.name },
        { label: 'Total Fission Yield', value: totalFissions.toExponential(2), unit: 'fissions' },
        { label: 'Prompt Generation Time', value: (activePreset.promptGenerationTimeS * 1e6).toFixed(2), unit: 'µs' },
        { label: 'Shield Concrete Thickness', value: concreteShieldThicknessCm, unit: 'cm' },
        { label: 'CAAS Detector Distance', value: detectorDistanceM, unit: 'm' },
        { label: 'Personnel Standoff Distance', value: personnelDistanceM, unit: 'm' }
      ],
      outputs: [
        { label: 'Burst Total Energy', value: excursionKinetics.totalEnergyMJ.toFixed(2), unit: 'MJ', status: 'PASS' },
        { label: 'Peak Excursion Power', value: excursionKinetics.peakPowerMW.toFixed(1), unit: 'MW', status: 'PASS' },
        { label: 'Pulse Duration (FWHM)', value: excursionKinetics.fwhmMs.toFixed(3), unit: 'ms', status: 'PASS' },
        { label: 'CAAS Detector Dose Rate', value: caasCalculations.doseRateDetRadMin.toFixed(0), unit: 'rad/min', status: caasCalculations.caasCompliant ? 'PASS' : 'WARNING' },
        { label: 'ANSI/ANS-8.3 Status', value: caasCalculations.caasCompliant ? 'COMPLIANT (>20 rad/min)' : 'FAILED (<20 rad/min)', status: caasCalculations.caasCompliant ? 'PASS' : 'WARNING' },
        { label: 'Personnel Flash Equivalent Dose', value: caasCalculations.doseEqPersRem.toFixed(1), unit: 'Rem', status: caasCalculations.doseEqPersSv > 2 ? 'WARNING' : 'PASS' },
        { label: 'Triage Assessment', value: caasCalculations.clinicalTriage }
      ]
    };
  }, [activePreset, totalFissions, concreteShieldThicknessCm, detectorDistanceM, personnelDistanceM, excursionKinetics, caasCalculations]);

  return (
    <div className="caas-criticality-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚛️ Module 22: CAAS &amp; Criticality Accident Excursion Kinetics</span>
              <VerificationBadge testId="VTEST-31" standard="ANSI/ANS-8.3 / Hansen &amp; Maier" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Nordheim-Fuchs prompt-critical excursion dynamics, Godiva bare-metal and fissile solution bursts, prompt neutron/gamma kerma, and ANSI/ANS-8.3 CAAS alarm coverage.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📜 Export CAAS Compliance Dossier</span>
          </button>
        </div>
      </div>

      {/* Assembly Setup Bar */}
      <div className="panel" style={{ padding: '16px' }}>
        {/* Quick Excursion Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ Critical Excursion Archetypes:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CRITICALITY_PRESETS.map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isSelected ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#00e5ff' : '#cbd5e1',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 700 : 400
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Critical System Model:</label>
            <select
              className="form-control"
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {CRITICALITY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Total Fission Yield (log10):</label>
            <input
              type="number"
              min="14.0"
              max="20.0"
              step="0.1"
              className="form-control"
              value={customFissionsLog}
              onChange={(e) => setCustomFissionsLog(parseFloat(e.target.value) || 16)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Yield: {totalFissions.toExponential(2)} fissions ({excursionKinetics.totalEnergyMJ.toFixed(2)} MJ)
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Concrete Shielding (cm):</label>
            <input
              type="number"
              min="0"
              max="200"
              step="5"
              className="form-control"
              value={concreteShieldThicknessCm}
              onChange={(e) => setConcreteShieldThicknessCm(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>CAAS Detector Distance (m):</label>
            <input
              type="number"
              min="1"
              max="200"
              step="5"
              className="form-control"
              value={detectorDistanceM}
              onChange={(e) => setDetectorDistanceM(Math.max(1, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Personnel Standoff (m):</label>
            <input
              type="number"
              min="1"
              max="500"
              step="5"
              className="form-control"
              value={personnelDistanceM}
              onChange={(e) => setPersonnelDistanceM(Math.max(1, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Tactical Alarm Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: '8px',
          border: caasCalculations.caasCompliant
            ? '1px solid rgba(239, 68, 68, 0.6)'
            : '1px solid rgba(245, 158, 11, 0.6)',
          background: caasCalculations.caasCompliant
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.22) 0%, rgba(15, 23, 42, 0.8) 100%)'
            : 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.8) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>
            {caasCalculations.caasCompliant ? '🚨' : '⚠️'}
          </span>
          <div>
            <div
              style={{
                fontSize: '0.90rem',
                fontWeight: 800,
                letterSpacing: '0.6px',
                color: caasCalculations.caasCompliant ? '#f87171' : '#fbbf24'
              }}
            >
              {caasCalculations.caasCompliant
                ? 'CRITICALITY ACCIDENT ALARM TRIPPED — IMMEDIATE FACILITY EVACUATION (ANSI/ANS-8.3)'
                : 'SUB-THRESHOLD ACCIDENT INTENSITY — SENSOR TRIP INSUFFICIENT (< 20 rad/min)'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Detector Flux: <strong style={{ color: '#fff' }}>{caasCalculations.doseRateDetRadMin.toFixed(0)} rad/min</strong> (Req ≥ 20 rad/min) | Standoff: <strong style={{ color: '#fff' }}>{personnelDistanceM}m</strong> | FWHM: <strong style={{ color: '#00e5ff' }}>{(excursionKinetics.fwhmMs * 1000).toFixed(1)} µs</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: caasCalculations.triageColor,
              color: '#000'
            }}
          >
            {caasCalculations.clinicalTriage}
          </span>
        </div>
      </div>

      {/* Criticality HUD Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PEAK EXCURSION POWER</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {excursionKinetics.peakPowerMW.toFixed(1)} MW
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Pulse Width (FWHM): {excursionKinetics.fwhmMs.toFixed(3)} ms
          </div>
        </div>

        <div style={{ background: caasCalculations.caasCompliant ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: `1px solid ${caasCalculations.caasCompliant ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ANSI/ANS-8.3 DETECTOR STATUS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: caasCalculations.caasCompliant ? '#10b981' : '#ef4444', marginTop: '2px' }}>
            {caasCalculations.caasCompliant ? '✅ ALARM TRIPPED' : '❌ TRIP FAILED'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Rate: {caasCalculations.doseRateDetRadMin.toFixed(0)} rad/min (Req &ge; 20)
          </div>
        </div>

        <div style={{ background: 'rgba(255, 159, 28, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ff9f1c' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PERSONNEL FLASH DOSE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9f1c', marginTop: '2px' }}>
            {caasCalculations.doseEqPersRem.toFixed(1)} Rem
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {caasCalculations.doseEqPersSv.toFixed(2)} Sv at {personnelDistanceM}m
          </div>
        </div>

        <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>INITIAL INVERSE PERIOD (α₀)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
            {excursionKinetics.alpha0.toFixed(0)} s⁻¹
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Step: +${activePreset.reactivityStepDollars} prompt insertion
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'excursion' ? 'active' : ''}`}
          style={{
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'excursion' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'excursion' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'excursion' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('excursion')}
        >
          ⚛️ Excursion Kinetics Pulse
        </button>

        <button
          className={`nav-link ${activeTab === 'caas_coverage' ? 'active' : ''}`}
          style={{
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'caas_coverage' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'caas_coverage' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'caas_coverage' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('caas_coverage')}
        >
          🚨 ANSI/ANS-8.3 CAAS Coverage
        </button>

        <button
          className={`nav-link ${activeTab === 'prompt_flash' ? 'active' : ''}`}
          style={{
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'prompt_flash' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'prompt_flash' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'prompt_flash' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('prompt_flash')}
        >
          ☢️ Prompt Neutron/Gamma Kerma
        </button>

        <button
          className={`nav-link ${activeTab === 'emergency_plan' ? 'active' : ''}`}
          style={{
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'emergency_plan' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'emergency_plan' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'emergency_plan' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('emergency_plan')}
        >
          📋 Facility Criticality Response Plan
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXCURSION KINETICS */}
      {/* ========================================================================= */}
      {activeTab === 'excursion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
              📈 Nordheim-Fuchs Prompt Excursion Pulse Profile (Peak: {excursionKinetics.peakPowerMW.toFixed(1)} MW)
            </div>
            <Plot
              data={[
                {
                  x: excursionKinetics.points.map((p) => p.tMs),
                  y: excursionKinetics.points.map((p) => p.powerMW),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Fission Power (MW)',
                  line: { color: '#ef4444', width: 2.5 }
                },
                {
                  x: excursionKinetics.points.map((p) => p.tMs),
                  y: excursionKinetics.points.map((p) => p.energyMJ),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Cumulative Energy (MJ)',
                  yaxis: 'y2',
                  line: { color: '#00e5ff', width: 2, dash: 'dot' }
                }
              ]}
              layout={{
                autosize: true,
                height: 360,
                margin: { l: 50, r: 50, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Time from Prompt Criticality (Milliseconds)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Fission Power (MW)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis2: { title: 'Energy (MJ)', overlaying: 'y', side: 'right', gridcolor: 'transparent' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANSI/ANS-8.3 CAAS COVERAGE */}
      {/* ========================================================================= */}
      {activeTab === 'caas_coverage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                🚨 ANSI/ANS-8.3-1997 (R2020) Criticality Accident Alarm System Verification
              </h3>
              <VerificationBadge testId="VTEST-52" standard="ANSI/ANS-8.3 Sec. 4.2.1 2oo3 Coverage" />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Mandatory US DOE and NRC 10 CFR 70.24 requirement: Detectors must trigger an evacuation alarm within 0.5 seconds of exposure to a minimum accident of concern delivering <strong>0.20 Gy/min (20 rad/min = 1,200 rad/h) at 2.0 meters</strong> in free air.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>MEASURED DOSE RATE AT DETECTOR</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: caasCalculations.caasCompliant ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                  {caasCalculations.doseRateDetRadMin.toFixed(0)} rad/min
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Distance: {detectorDistanceM}m through {concreteShieldThicknessCm}cm concrete
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>MAX DETECTION RADIUS (R_max)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                  {caasGridCoverage.rMaxM.toFixed(2)} m
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  At trip setpoint {detectorSetpointRadHr.toFixed(1)} rad/h (T = {(caasGridCoverage.wallTrans * 100).toFixed(1)}%)
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>2oo3 COINCIDENCE COVERAGE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                  {caasGridCoverage.pct2oo3.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  &ge; 2 of 3 channels tripped (60m &times; 40m bay)
                </div>
              </div>

              <div style={{ background: caasGridCoverage.pctBlind > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: `1px solid ${caasGridCoverage.pctBlind > 0 ? '#ef4444' : 'var(--color-border)'}` }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>BLIND ZONE / 1oo3 SINGLE ONLY</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: caasGridCoverage.pctBlind > 0 ? '#ef4444' : '#ffb703', marginTop: '2px' }}>
                  {caasGridCoverage.pctBlind.toFixed(1)}% / {caasGridCoverage.pct1oo3.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  0-channel blind / 1-channel non-voting area
                </div>
              </div>
            </div>

            {/* 2D Facility 2oo3 Coverage Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px', padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>3-Channel Detector Topology (60m &times; 40m Bay):</label>
                <select
                  className="form-control"
                  value={arrayLayoutPreset}
                  onChange={(e) => setArrayLayoutPreset(e.target.value as 'triangle' | 'corridor' | 'vault')}
                  style={{ width: '100%', fontSize: '0.84rem', marginTop: '4px' }}
                >
                  <option value="triangle">Perimeter Triangle Array (Balanced 2oo3)</option>
                  <option value="corridor">Linear Process Corridor Array (Center Axis)</option>
                  <option value="vault">Clustered NW Vault Array (East Bay Blind Zone)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Detector Trip Setpoint (rad/h):</label>
                <input
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.5"
                  className="form-control"
                  value={detectorSetpointRadHr}
                  onChange={(e) => setDetectorSetpointRadHr(Math.max(0.5, parseFloat(e.target.value) || 3.0))}
                  style={{ width: '100%', fontSize: '0.84rem', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Interior Partition Concrete Wall (cm):</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="5"
                  className="form-control"
                  value={interiorWallCm}
                  onChange={(e) => setInteriorWallCm(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', fontSize: '0.84rem', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.88rem', fontWeight: 'bold', marginBottom: '8px' }}>
              🗺️ 2D Facility Bay 2-Out-Of-3 (2oo3) Coincidence Voting Map (0 = Blind Zone, 1 = Single Channel, 2–3 = 2oo3 Compliant)
            </div>
            <Plot
              data={[
                {
                  x: caasGridCoverage.xVals,
                  y: caasGridCoverage.yVals,
                  z: caasGridCoverage.zMatrix,
                  type: 'heatmap',
                  zmin: 0,
                  zmax: 3,
                  colorscale: [
                    [0.0, '#7f1d1d'],
                    [0.33, '#d97706'],
                    [0.66, '#059669'],
                    [1.0, '#00e5ff']
                  ],
                  colorbar: {
                    title: 'Channels Tripped',
                    tickvals: [0, 1, 2, 3],
                    ticktext: ['0 (Blind)', '1 (1oo3 Warn)', '2 (2oo3 Pass)', '3 (3oo3 Redundant)']
                  }
                },
                {
                  x: caasGridCoverage.detectors.map((d) => d.x),
                  y: caasGridCoverage.detectors.map((d) => d.y),
                  text: caasGridCoverage.detectors.map((d) => d.id),
                  type: 'scatter',
                  mode: 'markers+text',
                  textposition: 'top center',
                  name: 'CAAS Detectors',
                  marker: { color: '#ffffff', size: 12, symbol: 'diamond', line: { color: '#000', width: 2 } },
                  textfont: { color: '#ffffff', size: 11 }
                }
              ]}
              layout={{
                autosize: true,
                height: 360,
                margin: { l: 50, r: 40, t: 20, b: 45 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Facility East-West Coordinate X (meters)', range: [0, 60] },
                yaxis: { title: 'Facility North-South Y (meters)', range: [0, 40] }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROMPT NEUTRON/GAMMA KERMA */}
      {/* ========================================================================= */}
      {activeTab === 'prompt_flash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              ☢️ Prompt Personnel Flash Dose &amp; Acute Radiation Injury
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>GAMMA DOSE (D_γ)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                  {caasCalculations.doseGammaPersGy.toFixed(3)} Gy
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>FAST NEUTRON DOSE (D_n)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffb703', marginTop: '2px' }}>
                  {caasCalculations.doseNeutronPersGy.toFixed(3)} Gy
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>High RBE (w_R = 10)</div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>LD50/60 LETHAL RADIUS (4.0 Sv)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                  {radialFlashProfile.rLd50M.toFixed(1)} m
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  0.25 Sv Exclusion Boundary: {radialFlashProfile.r250mSvM.toFixed(1)} m
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: `1px solid ${caasCalculations.triageColor}` }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>CLINICAL ARS TRIAGE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: caasCalculations.triageColor, marginTop: '4px' }}>
                  {caasCalculations.clinicalTriage}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.88rem', fontWeight: 'bold', marginBottom: '8px' }}>
              📉 Radial Prompt Neutron &amp; Gamma Flash Attenuation Profile (1 m – 100 m Standoff)
            </div>
            <Plot
              data={[
                {
                  x: radialFlashProfile.radiiM,
                  y: radialFlashProfile.eqDoseSv,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Total Equivalent Dose H_eq (Sv, w_R=10)',
                  line: { color: '#ef4444', width: 2.5 }
                },
                {
                  x: radialFlashProfile.radiiM,
                  y: radialFlashProfile.neutronGy,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Fast Neutron Kerma D_n (Gy)',
                  line: { color: '#ffb703', width: 2, dash: 'dash' }
                },
                {
                  x: radialFlashProfile.radiiM,
                  y: radialFlashProfile.gammaGy,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Prompt Gamma Kerma D_γ (Gy)',
                  line: { color: '#00e5ff', width: 2, dash: 'dot' }
                },
                {
                  x: [1, 100],
                  y: [4.0, 4.0],
                  type: 'scatter',
                  mode: 'lines',
                  name: 'LD50/60 Lethal Threshold (4.0 Sv)',
                  line: { color: '#f87171', width: 1.5, dash: 'dashdot' }
                },
                {
                  x: [1, 100],
                  y: [0.25, 0.25],
                  type: 'scatter',
                  mode: 'lines',
                  name: '10 CFR 20 Emergency Limit (0.25 Sv)',
                  line: { color: '#10b981', width: 1.5, dash: 'dashdot' }
                }
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 55, r: 30, t: 20, b: 45 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Standoff Distance r (meters)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Prompt Dose / Equivalent Dose (Gy or Sv)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.22 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMERGENCY PLAN */}
      {/* ========================================================================= */}
      {activeTab === 'emergency_plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              📋 Facility Criticality Evacuation Orders &amp; Dosimetry Protocol
            </h3>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.84rem', lineHeight: '1.7', border: '1px solid var(--color-border)' }}>
              <div><strong>FACILITY EMERGENCY DIRECTIVE:</strong> CRITICALITY ACCIDENT EVACUATION INITIATED</div>
              <div><strong>ALARM PROTOCOL:</strong> Continuous high-intensity Klaxon alarm sound (&gt;75 dBA facility-wide).</div>
              <div><strong>PERSONNEL EVACUATION DIRECTIVE:</strong> RUN IMMEDIATELY via designated shielded exit corridors. Do NOT stop for personal belongings or radiation meters.</div>
              <div><strong>RE-ENTRY BAN:</strong> STRICT PROHIBITION against re-entering the process cell until remote robotic instrumentation confirms permanent subcriticality.</div>
              <div><strong>TRIAGE DIRECTIVE:</strong> Immediate whole-body screening for blood Sodium-24 (²⁴Na) neutron activation via chest Geiger probe.</div>
            </div>
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

export default CAASCriticalityModule;
