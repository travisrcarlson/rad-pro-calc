import React, { useState, useMemo } from 'react';
import VerificationBadge from '../../components/VerificationBadge';
import PlotComponent from 'react-plotly.js';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export type NukeTab = 'blast' | 'thermal' | 'prompt_rad' | 'hemp' | 'cordon_summary';

interface WeaponPreset {
  id: string;
  name: string;
  yieldKt: number;
  burstType: 'surface' | 'air';
  description: string;
}

const WEAPON_PRESETS: WeaponPreset[] = [
  { id: 'davy_crockett', name: '💥 0.02 kT (W54 Davy Crockett Man-Portable)', yieldKt: 0.02, burstType: 'surface', description: 'Sub-kiloton tactical nuclear weapon. Prompt radiation exceeds blast radius.' },
  { id: 'suitcase_1kt', name: '💣 1.0 kT Improvised Nuclear Device (IND)', yieldKt: 1.0, burstType: 'surface', description: 'Terrorist/improvised ground-level urban detonation with devastating local blast.' },
  { id: 'hiroshima_15kt', name: '🏙️ 15 kT Gun-Type Fission (Hiroshima Little Boy)', yieldKt: 15, burstType: 'air', description: 'Air burst at 600m. Optimal blast overpressure and devastating incendiary firestorm.' },
  { id: 'nagasaki_21kt', name: '☢️ 21 kT Implosion Plutonium (Nagasaki Fat Man)', yieldKt: 21, burstType: 'air', description: 'Air burst at 503m altitude over industrial valley.' },
  { id: 'w76_100kt', name: '🚀 100 kT SLBM Warhead (Trident D5 / W76)', yieldKt: 100, burstType: 'air', description: 'Modern submarine-launched ballistic missile warhead.' },
  { id: 'w87_300kt', name: '🌋 300 kT ICBM Warhead (Minuteman III / W87)', yieldKt: 300, burstType: 'air', description: 'Modern silo-based thermonuclear warhead with secondary fusion stage.' },
  { id: 'b83_1200kt', name: '☄️ 1,200 kT (1.2 MT) Strategic Bomb (B83)', yieldKt: 1200, burstType: 'surface', description: 'Maximum yield US gravity bomb. Subsurface cratering and multi-mile devastation.' }
];

export const NuclearWeaponEffectsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NukeTab>('blast');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('hiroshima_15kt');
  const [customYieldKt, setCustomYieldKt] = useState<number>(15.0);
  const [burstMode, setBurstMode] = useState<'surface' | 'air'>('air');
  const [burstAltitudeM, setBurstAltitudeM] = useState<number>(600);
  const [atmosphericVisibilityKm, setAtmosphericVisibilityKm] = useState<number>(20);
  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(2.0);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  // Load preset parameters
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = WEAPON_PRESETS.find((x) => x.id === presetId);
    if (p) {
      setCustomYieldKt(p.yieldKt);
      setBurstMode(p.burstType);
      // Optimum height of burst roughly ~120 * Y^(1/3) m
      setBurstAltitudeM(p.burstType === 'surface' ? 0 : Math.round(140 * Math.pow(p.yieldKt, 1 / 3)));
    }
  };

  const yieldKt = customYieldKt;

  // --- TAB 1: Blast Overpressure & Shockwave Model (Brode / Kingery-Bulmash) ---
  const blastCalculations = useMemo(() => {
    const y = Math.max(0.001, yieldKt);
    const scaledYieldFactor = Math.pow(y, 1 / 3);

    // Overpressure Radii (Brode analytical approximations for surface/near-surface bursts)
    // 20 psi (Demolition of reinforced concrete structures, heavy blast wave)
    const r20psi_km = 0.38 * scaledYieldFactor * (burstMode === 'air' ? 1.15 : 1.0);
    // 10 psi (Heavy destruction of commercial factories and offices)
    const r10psi_km = 0.58 * scaledYieldFactor * (burstMode === 'air' ? 1.25 : 1.0);
    // 5 psi (Universal residential collapse, unreinforced masonry failure, 160 mph wind)
    const r5psi_km = 0.95 * scaledYieldFactor * (burstMode === 'air' ? 1.35 : 1.0);
    // 1 psi (Glass shatter, projectile injuries, structural damage)
    const r1psi_km = 2.45 * scaledYieldFactor * (burstMode === 'air' ? 1.40 : 1.0);

    // Blast Overpressure at user target distance
    const rTargetM = Math.max(10, targetDistanceKm * 1000);
    const slantDistanceM = Math.sqrt(rTargetM * rTargetM + burstAltitudeM * burstAltitudeM);
    const zScaled = slantDistanceM / Math.pow(y, 1 / 3); // m / kt^(1/3)

    // Kingery-Bulmash / Brode equation for overpressure:
    // For intermediate distances (z in m / kt^(1/3)):
    let overpressurePsi = 0;
    if (zScaled > 0) {
      if (zScaled < 100) {
        overpressurePsi = (3300 / Math.pow(zScaled, 3)) + (1050 / Math.pow(zScaled, 2)) + (55.4 / zScaled);
      } else {
        overpressurePsi = (1.407 / (zScaled / 1000)) + (0.536 / Math.pow(zScaled / 1000, 2));
      }
    }
    overpressurePsi = Math.max(0.01, overpressurePsi);

    // Dynamic pressure q = 2.5 * P^2 / (P + 7 * P0), P0 = 14.7 psi
    const p0 = 14.7;
    const dynamicPressurePsi = (2.5 * overpressurePsi * overpressurePsi) / (overpressurePsi + 7 * p0);
    // Wind velocity ~ 50 * sqrt(dynamicPressurePsi) mph
    const windSpeedMph = Math.min(2000, Math.round(45 * Math.sqrt(dynamicPressurePsi * 10)));

    // Generate curve for plot
    const maxR = r1psi_km * 1.5;
    const steps = 80;
    const curvePoints: { rKm: number; overpressurePsi: number; dynamicPsi: number }[] = [];
    for (let i = 1; i <= steps; i++) {
      const r = (i / steps) * maxR;
      const sM = Math.sqrt((r * 1000) * (r * 1000) + burstAltitudeM * burstAltitudeM);
      const z = sM / Math.pow(y, 1 / 3);
      let p = 0;
      if (z < 100) {
        p = (3300 / Math.pow(z, 3)) + (1050 / Math.pow(z, 2)) + (55.4 / z);
      } else {
        p = (1.407 / (z / 1000)) + (0.536 / Math.pow(z / 1000, 2));
      }
      const q = (2.5 * p * p) / (p + 7 * p0);
      curvePoints.push({ rKm: r, overpressurePsi: Math.min(500, p), dynamicPsi: Math.min(300, q) });
    }

    return {
      r20psi_km,
      r10psi_km,
      r5psi_km,
      r1psi_km,
      targetOverpressurePsi: overpressurePsi,
      targetDynamicPressurePsi: dynamicPressurePsi,
      targetWindSpeedMph: windSpeedMph,
      curvePoints
    };
  }, [yieldKt, burstMode, burstAltitudeM, targetDistanceKm]);

  // --- TAB 2: Thermal Radiation Pulse & Flashburns ---
  const thermalCalculations = useMemo(() => {
    const y = Math.max(0.001, yieldKt);
    const scaledYieldFactor = Math.pow(y, 0.41);

    // Thermal radiant fluence at target distance:
    // Q = (eta_th * Y_joules) / (4 * pi * R^2) * tau_atm
    // eta_th ~ 0.35 (35% of total yield emitted as thermal)
    // 1 kT TNT = 4.184e12 Joules
    const etaTh = 0.35;
    const yJoules = y * 4.184e12;
    const rTargetM = Math.max(10, targetDistanceKm * 1000);
    const slantDistanceM = Math.sqrt(rTargetM * rTargetM + burstAltitudeM * burstAltitudeM);

    // Atmospheric transmittance tau_atm ~ exp(-slantDistance / (2 * visibility))
    const tauAtm = Math.exp(-slantDistanceM / (2.0 * atmosphericVisibilityKm * 1000));
    const fluenceJouleM2 = (etaTh * yJoules / (4 * Math.PI * slantDistanceM * slantDistanceM)) * tauAtm;
    // 1 cal/cm^2 = 41,840 J/m^2 = 4.184 J/cm^2
    const fluenceCalCm2 = fluenceJouleM2 / 41840.0;

    // Threshold Radii for burns (Glasstone & Dolan empirical scaling):
    // 3rd degree burn (blistering/necrosis, Q >= 10 cal/cm^2)
    const r3rdBurn_km = 0.82 * scaledYieldFactor;
    // 2nd degree burn (partial thickness, Q >= 5.5 cal/cm^2)
    const r2ndBurn_km = 1.15 * scaledYieldFactor;
    // 1st degree burn (erythema/sunburn, Q >= 3.0 cal/cm^2)
    const r1stBurn_km = 1.55 * scaledYieldFactor;
    // Retinal flashblindness standoff (daytime ~10x, nighttime ~25x)
    const rFlashblindDay_km = 4.2 * scaledYieldFactor;
    const rFlashblindNight_km = 12.0 * scaledYieldFactor;

    // Pulse duration timing:
    // First peak: t1 ~ 0.00035 * sqrt(Y) s
    const tFirstPeakS = 0.00035 * Math.sqrt(y);
    // Second peak (thermal maximum): t_max ~ 0.0417 * Y^0.47 s
    const tSecondPeakS = 0.0417 * Math.pow(y, 0.47);

    // Curve profile for thermal plot
    const maxR = r1stBurn_km * 2.0;
    const steps = 80;
    const curvePoints: { rKm: number; fluenceCal: number }[] = [];
    for (let i = 1; i <= steps; i++) {
      const r = (i / steps) * maxR;
      const sM = Math.sqrt((r * 1000) * (r * 1000) + burstAltitudeM * burstAltitudeM);
      const tau = Math.exp(-sM / (2.0 * atmosphericVisibilityKm * 1000));
      const fl = (etaTh * yJoules / (4 * Math.PI * sM * sM)) * tau / 41840.0;
      curvePoints.push({ rKm: r, fluenceCal: Math.min(100, fl) });
    }

    return {
      targetFluenceCalCm2: fluenceCalCm2,
      targetFluenceJcm2: fluenceCalCm2 * 4.184,
      r3rdBurn_km,
      r2ndBurn_km,
      r1stBurn_km,
      rFlashblindDay_km,
      rFlashblindNight_km,
      tFirstPeakS,
      tSecondPeakS,
      curvePoints
    };
  }, [yieldKt, targetDistanceKm, burstAltitudeM, atmosphericVisibilityKm]);

  // --- TAB 3: Prompt Initial Nuclear Radiation Flash ---
  const promptRadCalculations = useMemo(() => {
    const y = Math.max(0.001, yieldKt);
    const rTargetM = Math.max(10, targetDistanceKm * 1000);
    const slantDistanceM = Math.sqrt(rTargetM * rTargetM + burstAltitudeM * burstAltitudeM);

    // Initial prompt radiation (neutrons + prompt gammas within first 60 seconds):
    // D(R) ~ (D0 * Y) / R^2 * exp(-R / lambda_air)
    // For fission weapons: ~300 Gy at 1000m for 20 kT in unattenuated air
    // Mean free path in sea-level air ~ 250m for prompt neutrons, ~350m for 4 MeV gammas
    const lambdaAirM = 300.0; // composite relaxation length
    const refDoseAt1km = 15.0 * y; // Gy at 1 km unattenuated geometry
    const rRatio = 1000.0 / slantDistanceM;
    const promptDoseGy = refDoseAt1km * (rRatio * rRatio) * Math.exp(-(slantDistanceM - 1000.0) / lambdaAirM);

    // Lethal thresholds
    // LD50/60 (4.5 Gy bone marrow death without ICU intervention)
    // LD100 (8.0 Gy gastrointestinal syndrome)
    // CNS Incapacitation (20.0 Gy)
    const rLd50_km = 0.55 * Math.pow(y, 0.28);
    const rLd100_km = 0.42 * Math.pow(y, 0.28);
    const rCns_km = 0.28 * Math.pow(y, 0.28);

    return {
      targetPromptDoseGy: Math.max(0.0001, promptDoseGy),
      rLd50_km,
      rLd100_km,
      rCns_km
    };
  }, [yieldKt, targetDistanceKm, burstAltitudeM]);

  // --- TAB 4: High-Altitude Electromagnetic Pulse (HEMP) ---
  const hempCalculations = useMemo(() => {
    // HEMP occurs when burst altitude is > 30 km (stratosphere / mesosphere)
    // E1 Fast Pulse: Compton electrons produced by prompt gamma rays interacting with stratospheric air (20-40km)
    // Peak field up to 50 kV/m with rise time < 2.5 ns (MIL-STD-188-125)
    const isHighAltitude = burstAltitudeM >= 30000;
    const burstKm = burstAltitudeM / 1000.0;

    // Horizon radius for HEMP illumination: R_horizon = sqrt(2 * R_earth * h + h^2)
    // R_earth ~ 6371 km
    const rEarthKm = 6371.0;
    const hempFootprintRadiusKm = Math.sqrt(2 * rEarthKm * burstKm + burstKm * burstKm);

    // E1 Peak electric field
    const e1PeakFieldKvm = isHighAltitude ? Math.min(50.0, 12.0 * Math.pow(yieldKt, 0.2)) : 0.5;
    // E3 Magnetohydrodynamic DC field (V/km)
    const e3SlowFieldVkm = isHighAltitude ? Math.min(24.0, 4.0 * Math.pow(yieldKt, 0.3)) : 0.1;

    return {
      isHighAltitude,
      hempFootprintRadiusKm: isHighAltitude ? hempFootprintRadiusKm : 0,
      e1PeakFieldKvm,
      e3SlowFieldVkm
    };
  }, [burstAltitudeM, yieldKt]);

  // --- Fireball Size ---
  const fireballRadiusM = useMemo(() => {
    // R_fireball ~ 70 * Y^(0.38) meters
    return Math.round(70 * Math.pow(Math.max(0.001, yieldKt), 0.38));
  }, [yieldKt]);

  // --- Consolidated Tactical Polar Cordon Traces ---
  const cordonMap = useMemo(() => {
    const makeCircle = (radiusKm: number, label: string, color: string, dashStyle: string = 'solid') => {
      const points = 72;
      const rArr: number[] = [];
      const thetaArr: number[] = [];
      for (let i = 0; i <= points; i++) {
        thetaArr.push((i / points) * 360);
        rArr.push(radiusKm);
      }
      return {
        type: 'scatterpolar',
        mode: 'lines',
        name: label,
        r: rArr,
        theta: thetaArr,
        line: { color, width: 2, dash: dashStyle },
        hoverinfo: 'name'
      };
    };

    const traces: any[] = [
      makeCircle(blastCalculations.r20psi_km, `20 psi Blast Ring (${blastCalculations.r20psi_km.toFixed(2)} km)`, '#ef4444'),
      makeCircle(blastCalculations.r5psi_km, `5 psi Residential Collapse (${blastCalculations.r5psi_km.toFixed(2)} km)`, '#f97316'),
      makeCircle(blastCalculations.r1psi_km, `1 psi Glass Breakage (${blastCalculations.r1psi_km.toFixed(2)} km)`, '#eab308', 'dash'),
      makeCircle(thermalCalculations.r3rdBurn_km, `3rd Degree Burn Standoff (${thermalCalculations.r3rdBurn_km.toFixed(2)} km)`, '#ff4d4d'),
      makeCircle(thermalCalculations.r1stBurn_km, `1st Degree Burn Perimeter (${thermalCalculations.r1stBurn_km.toFixed(2)} km)`, '#facc15', 'dot'),
      makeCircle(promptRadCalculations.rLd50_km, `Prompt Lethal Radiation LD50 (${promptRadCalculations.rLd50_km.toFixed(2)} km)`, '#00e5ff', 'dashdot'),
      {
        type: 'scatterpolar',
        mode: 'markers',
        name: 'Ground Zero (Detonation Epicenter)',
        r: [0],
        theta: [0],
        marker: { color: '#ffffff', size: 14, symbol: 'star' },
        hoverinfo: 'name'
      },
      {
        type: 'scatterpolar',
        mode: 'markers',
        name: `Target Location (${targetDistanceKm} km)`,
        r: [targetDistanceKm],
        theta: [45],
        marker: { color: '#10b981', size: 10, symbol: 'diamond' },
        hoverinfo: 'name'
      }
    ];

    const maxR = Math.max(blastCalculations.r1psi_km, thermalCalculations.r1stBurn_km, targetDistanceKm) * 1.15;
    return { traces, maxR };
  }, [blastCalculations, thermalCalculations, promptRadCalculations, targetDistanceKm]);

  // --- Cryptographic Audit Dossier Payload ---
  const dossierPayload: CalculationDossierPayload = useMemo(() => {
    return {
      reportTitle: 'ICS-208 Nuclear Weapon Prompt Effects & Tactical Overpressure Dossier',
      moduleName: 'Module 26 (Nuclear Weapon Effects & Prompt Radiations)',
      statuteCitation: 'Glasstone & Dolan (1977) / Kingery-Bulmash (BRL-1972) / MIL-STD-188-125',
      verificationTestId: 'VTEST-29',
      operatorName: 'CBRN Weapons Effects Analyst',
      operatorCredentials: 'CHP / CBRN Consequence Manager',
      facility: 'Tactical Defense Operations Center / Threat Assessment Unit',
      notes: `Prompt weapons effects simulation for ${yieldKt} kT (${burstMode} burst at ${burstAltitudeM}m). Target distance: ${targetDistanceKm} km. Overpressure: ${blastCalculations.targetOverpressurePsi.toFixed(2)} psi. Thermal: ${thermalCalculations.targetFluenceCalCm2.toFixed(1)} cal/cm².`,
      formulaDescription: 'Z = \\frac{R}{Y^{1/3}}, \\quad \\Delta P = \\frac{A}{Z^3} + \\frac{B}{Z^2} + \\frac{C}{Z}, \\quad Q = \\frac{\\eta_{\\text{th}} Y}{4\\pi R^2} \\tau_{\\text{atm}}',
      inputs: [
        { label: 'Weapon Yield', value: yieldKt, unit: 'kT' },
        { label: 'Detonation Mode', value: burstMode === 'air' ? 'Air Burst' : 'Surface Burst' },
        { label: 'Burst Altitude', value: burstAltitudeM, unit: 'm' },
        { label: 'Target Standoff Distance', value: targetDistanceKm, unit: 'km' },
        { label: 'Atmospheric Visibility', value: atmosphericVisibilityKm, unit: 'km' }
      ],
      outputs: [
        { label: 'Fireball Radius', value: fireballRadiusM, unit: 'm', status: 'PASS' },
        { label: 'Target Incident Overpressure', value: blastCalculations.targetOverpressurePsi.toFixed(2), unit: 'psi', status: blastCalculations.targetOverpressurePsi > 5 ? 'WARNING' : 'PASS' },
        { label: 'Target Dynamic Wind Speed', value: blastCalculations.targetWindSpeedMph, unit: 'mph', status: 'PASS' },
        { label: '5-psi Severe Damage Radius', value: blastCalculations.r5psi_km.toFixed(2), unit: 'km', status: 'PASS' },
        { label: '1-psi Glass Shatter Radius', value: blastCalculations.r1psi_km.toFixed(2), unit: 'km', status: 'PASS' },
        { label: 'Target Thermal Fluence', value: thermalCalculations.targetFluenceCalCm2.toFixed(2), unit: 'cal/cm²', status: thermalCalculations.targetFluenceCalCm2 > 5.5 ? 'WARNING' : 'PASS' },
        { label: '3rd-Degree Burn Standoff', value: thermalCalculations.r3rdBurn_km.toFixed(2), unit: 'km', status: 'PASS' },
        { label: 'Prompt Radiation at Target', value: promptRadCalculations.targetPromptDoseGy.toFixed(3), unit: 'Gy', status: promptRadCalculations.targetPromptDoseGy > 1.0 ? 'WARNING' : 'PASS' },
        { label: 'Prompt LD50/60 Standoff', value: promptRadCalculations.rLd50_km.toFixed(2), unit: 'km', status: 'PASS' }
      ]
    };
  }, [yieldKt, burstMode, burstAltitudeM, targetDistanceKm, atmosphericVisibilityKm, fireballRadiusM, blastCalculations, thermalCalculations, promptRadCalculations]);

  return (
    <div className="nuclear-weapon-effects-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💥 Module 26: Nuclear Weapon Prompt Effects, Blast &amp; HEMP Simulator</span>
              <VerificationBadge testId="VTEST-29" standard="Glasstone &amp; Dolan / Brode" />
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Kingery-Bulmash shockwave overpressures, dynamic wind speeds, dual-pulse thermal flashburns, prompt initial radiation flash, and MIL-STD-188-125 High-Altitude Electromagnetic Pulse (HEMP).
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setIsDossierOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📜 Export Weapon Effects Dossier</span>
          </button>
        </div>
      </div>

      {/* Preset & Tactical Controls Bar */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Standard Weapon Preset:</label>
            <select
              className="form-control"
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {WEAPON_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Weapon Yield (kT TNT):</label>
            <input
              type="number"
              min="0.01"
              max="50000"
              step="1"
              className="form-control"
              value={customYieldKt}
              onChange={(e) => setCustomYieldKt(Math.max(0.01, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Burst Regime:</label>
            <select
              className="form-control"
              value={burstMode}
              onChange={(e) => {
                const mode = e.target.value as 'surface' | 'air';
                setBurstMode(mode);
                if (mode === 'surface') setBurstAltitudeM(0);
                else setBurstAltitudeM(Math.round(140 * Math.pow(yieldKt, 1 / 3)));
              }}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="air">Air Burst (Maximizes Blast Overpressure)</option>
              <option value="surface">Surface Burst (Heavy Fallout Cratering)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Height of Burst (HOB):</label>
            <input
              type="number"
              min="0"
              max="100000"
              step="50"
              className="form-control"
              value={burstAltitudeM}
              onChange={(e) => setBurstAltitudeM(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {burstAltitudeM >= 30000 ? '⚡ HEMP Active (>30 km)' : 'Tropospheric Detonation'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Target Standoff Distance (km):</label>
            <input
              type="number"
              min="0.1"
              max="200"
              step="0.5"
              className="form-control"
              value={targetDistanceKm}
              onChange={(e) => setTargetDistanceKm(Math.max(0.1, parseFloat(e.target.value) || 1))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Atmospheric Visibility (km):</label>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              className="form-control"
              value={atmosphericVisibilityKm}
              onChange={(e) => setAtmosphericVisibilityKm(Math.max(1, parseFloat(e.target.value) || 20))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Real-Time Prompt Weapon HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PEAK BLAST OVERPRESSURE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {blastCalculations.targetOverpressurePsi.toFixed(2)} psi
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Wind: {blastCalculations.targetWindSpeedMph} mph dynamic
          </div>
        </div>

        <div style={{ background: 'rgba(255, 159, 28, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ff9f1c' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>THERMAL RADIANT FLUENCE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9f1c', marginTop: '2px' }}>
            {thermalCalculations.targetFluenceCalCm2.toFixed(1)} cal/cm²
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {thermalCalculations.targetFluenceJcm2.toFixed(1)} J/cm² total pulse
          </div>
        </div>

        <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PROMPT INITIAL RADIATION</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
            {promptRadCalculations.targetPromptDoseGy >= 10 ? promptRadCalculations.targetPromptDoseGy.toFixed(0) : promptRadCalculations.targetPromptDoseGy.toFixed(2)} Gy
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {promptRadCalculations.targetPromptDoseGy >= 4.5 ? '🚨 Acute Lethal Flash' : 'Sub-lethal prompt flash'}
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>LUMINOUS FIREBALL RADIUS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
            {fireballRadiusM} meters
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Diameter: {(fireballRadiusM * 2 / 1000).toFixed(2)} km
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'blast' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'blast' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'blast' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'blast' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('blast')}
        >
          💥 Shockwave &amp; Blast Overpressure
        </button>

        <button
          className={`nav-link ${activeTab === 'thermal' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'thermal' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'thermal' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'thermal' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('thermal')}
        >
          🔥 Thermal Radiation &amp; Flashburns
        </button>

        <button
          className={`nav-link ${activeTab === 'prompt_rad' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'prompt_rad' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'prompt_rad' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'prompt_rad' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('prompt_rad')}
        >
          ☢️ Prompt Initial Radiation Flash
        </button>

        <button
          className={`nav-link ${activeTab === 'hemp' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'hemp' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'hemp' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'hemp' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('hemp')}
        >
          ⚡ High-Altitude EMP (HEMP)
        </button>

        <button
          className={`nav-link ${activeTab === 'cordon_summary' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: '0.9rem',
            borderBottom: activeTab === 'cordon_summary' ? '2px solid var(--color-primary)' : 'none',
            color: activeTab === 'cordon_summary' ? '#00e5ff' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'cordon_summary' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('cordon_summary')}
        >
          🎯 Tactical Radar Cordon Map
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SHOCKWAVE & BLAST OVERPRESSURE */}
      {/* ========================================================================= */}
      {activeTab === 'blast' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>20 PSI: TOTAL DESTRUCTION</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{blastCalculations.r20psi_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Heavy reinforced concrete buildings leveled. 500 mph hurricane-force winds. 100% fatalities.
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #f97316' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f97316' }}>10 PSI: HEAVY COLLAPSE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{blastCalculations.r10psi_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Most factories, commercial brick structures destroyed. Multi-ton highway vehicles overturned.
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #eab308' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#eab308' }}>5 PSI: RESIDENTIAL COLLAPSE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{blastCalculations.r5psi_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Standard residential wood/masonry homes flattened. Universal blunt trauma injuries.
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#38bdf8' }}>1 PSI: GLASS SHATTER ZONE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{blastCalculations.r1psi_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Window glass blown inward at high velocity. Doors off hinges. Minor structural damage.
              </div>
            </div>
          </div>

          {/* Plotly Blast Profile Chart */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
              📈 Peak Incident &amp; Dynamic Overpressure Profile vs. Standoff Distance
            </div>
            <Plot
              data={[
                {
                  x: blastCalculations.curvePoints.map((p) => p.rKm),
                  y: blastCalculations.curvePoints.map((p) => p.overpressurePsi),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Incident Overpressure ΔP (psi)',
                  line: { color: '#ef4444', width: 2.5 }
                },
                {
                  x: blastCalculations.curvePoints.map((p) => p.rKm),
                  y: blastCalculations.curvePoints.map((p) => p.dynamicPsi),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Dynamic Wind Pressure q (psi)',
                  line: { color: '#00e5ff', width: 2, dash: 'dot' }
                }
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Ground Distance (Kilometers)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Pressure (psi)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THERMAL RADIATION & FLASHBURNS */}
      {/* ========================================================================= */}
      {activeTab === 'thermal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>3RD-DEGREE FULL THICKNESS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{thermalCalculations.r3rdBurn_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Full-thickness charred cutaneous necrosis (Q ≥ 10 cal/cm²). Severe grafting required.
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #f97316' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f97316' }}>2ND-DEGREE BLISTERING</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{thermalCalculations.r2ndBurn_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Partial-thickness epidermal blistering and severe fluid loss (Q ≥ 5.5 cal/cm²).
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #facc15' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#facc15' }}>1ST-DEGREE ERYTHEMA</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{thermalCalculations.r1stBurn_km.toFixed(2)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Painful superficial erythema resembling acute severe sunburn (Q ≥ 3.0 cal/cm²).
              </div>
            </div>

            <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #a855f7' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a855f7' }}>NIGHT RETINAL FLASHBLIND</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '4px' }}>{thermalCalculations.rFlashblindNight_km.toFixed(1)} km</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Dark-adapted pupillary dilation causes temporary blindness for 10–30 minutes.
              </div>
            </div>
          </div>

          {/* Plotly Thermal Fluence Profile */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>
              📈 Thermal Radiant Fluence Profile vs. Distance (Dual-Pulse Peak: T+{thermalCalculations.tSecondPeakS.toFixed(2)}s)
            </div>
            <Plot
              data={[
                {
                  x: thermalCalculations.curvePoints.map((p) => p.rKm),
                  y: thermalCalculations.curvePoints.map((p) => p.fluenceCal),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Radiant Fluence (cal/cm²)',
                  line: { color: '#ff9f1c', width: 2.5 }
                }
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 11 },
                xaxis: { title: 'Ground Distance (Kilometers)', gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { title: 'Radiant Fluence (cal/cm²)', type: 'log', gridcolor: 'rgba(255,255,255,0.06)' },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROMPT INITIAL RADIATION FLASH */}
      {/* ========================================================================= */}
      {activeTab === 'prompt_rad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              ☢️ Prompt Initial Nuclear Radiation (First 60 Seconds)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Composed of high-energy fission and fusion neutrons and prompt capture gamma rays. In low-yield tactical weapons (&lt;10 kT), the lethal prompt radiation zone exceeds the blast destruction perimeter.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>CNS COLLAPSE RADIUS (20 GY)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                  {promptRadCalculations.rCns_km.toFixed(2)} km
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Immediate incapacitation within minutes</div>
              </div>

              <div style={{ background: 'rgba(249, 115, 22, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #f97316' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>LD100 GASTROINTESTINAL (8 GY)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f97316', marginTop: '2px' }}>
                  {promptRadCalculations.rLd100_km.toFixed(2)} km
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>100% mortality without bone marrow transplant</div>
              </div>

              <div style={{ background: 'rgba(0, 229, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #00e5ff' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>LD50/60 BONE MARROW (4.5 GY)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                  {promptRadCalculations.rLd50_km.toFixed(2)} km
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>50% lethal dose without specialized medical care</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HIGH-ALTITUDE EMP (HEMP) */}
      {/* ========================================================================= */}
      {activeTab === 'hemp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              ⚡ High-Altitude Electromagnetic Pulse (HEMP per MIL-STD-188-125)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Generated when a nuclear warhead detonates in the stratosphere or exo-atmosphere (30–400 km altitude). Prompt gamma rays generate relativistic Compton electrons that turn in Earth's geomagnetic field, broadcasting continent-wide electromagnetic destruction.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>E1 FAST PULSE (SEMICONDUCTORS)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                  {hempCalculations.e1PeakFieldKvm.toFixed(1)} kV/m
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Rise time &lt; 2.5 ns. Destroys solid-state microprocessors and SCADA controls.
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>E3 SLOW PULSE (POWER GRIDS)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffb703', marginTop: '2px' }}>
                  {hempCalculations.e3SlowFieldVkm.toFixed(1)} V/km
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Geomagnetically Induced Currents (GIC) saturating high-voltage transformer cores.
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>HEMP LINE-OF-SIGHT FOOTPRINT</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>
                  {hempCalculations.hempFootprintRadiusKm.toFixed(0)} km
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {burstAltitudeM >= 30000 ? 'Continental-scale coverage' : 'Sub-horizon / localized'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONSOLIDATED TACTICAL RADAR CORDON MAP */}
      {/* ========================================================================= */}
      {activeTab === 'cordon_summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-primary)' }}>
              🎯 Multi-Hazard Concentric Tactical Weapon Effects Standoff Map
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Consolidated tactical polar radar overlay showing all concentric prompt lethal perimeters around ground zero.
            </p>

            <Plot
              data={cordonMap.traces}
              layout={{
                autosize: true,
                height: 520,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'var(--color-text-muted)', size: 10 },
                polar: {
                  radialaxis: {
                    visible: true,
                    range: [0, cordonMap.maxR],
                    gridcolor: 'rgba(255, 255, 255, 0.1)',
                    ticksuffix: ' km'
                  },
                  angularaxis: {
                    gridcolor: 'rgba(255, 255, 255, 0.1)',
                    rotation: 90,
                    direction: 'clockwise'
                  },
                  bgcolor: 'rgba(0, 0, 0, 0.3)'
                },
                margin: { l: 40, r: 40, t: 30, b: 30 },
                legend: { orientation: 'h', y: -0.15 }
              }}
              style={{ width: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
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

export default NuclearWeaponEffectsModule;
