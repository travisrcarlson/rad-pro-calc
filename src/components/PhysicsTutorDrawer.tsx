import React, { useState, useEffect, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import {
  useRegulatory,
  ISOTOPE_QUICK_REF,
  type LiveModuleTelemetry
} from '../context/RegulatoryContext';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';
import { MODULE_USER_GUIDES } from '../data/moduleUserGuides';

export type AudienceDepthMode = 'intuitive' | 'engineering' | 'responder';

export interface PhysicsTutorMessage {
  id: string;
  role: 'user' | 'tutor';
  timestamp: string;
  question?: string;
  headline: string;
  regimeBadge: string;
  deltaContext?: string | null;
  intuitiveTakeaway: string;
  physicalMechanism: string[];
  governingEquations: { label: string; latex: string; meaning: string }[];
  liveSensitivityAnalysis: string[];
  regulatoryAndOperationalNote: string;
  sourceEngine: 'deterministic-physics' | 'gemini-2.5-flash' | 'local-ollama';
}

interface PhysicsTutorDrawerProps {
  activeModuleInfo: ActiveModuleBreadcrumbInfo | null;
  /** When true, renders embedded inside the right-hand WorkspaceInspectorDrawer without outer collapsible chrome */
  embeddedInInspector?: boolean;
  onApplySourceToCurrentModule?: () => void;
}

type TutorBackendMode = 'deterministic' | 'gemini' | 'ollama';

/** Renders text containing inline $...$ LaTeX segments cleanly via react-katex InlineMath */
const MathText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          return <InlineMath key={idx} math={latex} />;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};

function buildDeterministicPhysicsExplanation(
  question: string,
  telemetry: LiveModuleTelemetry | null,
  deltaSummary: string | null,
  activeModuleInfo: ActiveModuleBreadcrumbInfo | null,
  activeSource: {
    isotope: string;
    activityGBq: number;
    distanceM: number;
    shieldMaterial: string;
    shieldThicknessCm: number;
  },
  frameworkName: string,
  frameworkCode: string,
  occLimitMSv: number
): Omit<PhysicsTutorMessage, 'id' | 'role' | 'timestamp'> {
  const qLower = question.toLowerCase();
  const modPath = activeModuleInfo?.path || '';
  const modNum = activeModuleInfo?.moduleNumber || 1;
  const isoRef = ISOTOPE_QUICK_REF[activeSource.isotope] || ISOTOPE_QUICK_REF['Co-60'];
  const params = telemetry?.parameters || {};
  const metrics = telemetry?.computedMetrics || {};

  // --- CASE 1: NUCLEAR WEAPON EFFECTS & DETONATION REGIMES ---
  if (
    modPath === '/nuclear-weapons-effects' ||
    telemetry?.moduleId === 'nuclear-weapons-effects' ||
    qLower.includes('airburst') ||
    qLower.includes('mach stem') ||
    qLower.includes('underwater') ||
    qLower.includes('base surge') ||
    qLower.includes('baker') ||
    qLower.includes('high-altitude') ||
    qLower.includes('hemp') ||
    qLower.includes('sdob') ||
    qLower.includes('underground')
  ) {
    const yieldKt = Number(params['Yield (kT)'] ?? params.yieldKt ?? 23);
    const burstMode = String(params['Burst Mode'] ?? params.burstMode ?? 'air').toLowerCase();
    const altM = Number(params['Altitude / Depth (m)'] ?? params.burstAltitudeM ?? 530);
    const shob = Math.abs(altM) / Math.pow(Math.max(0.001, yieldKt), 1 / 3);
    const optHobM = Math.round(140 * Math.pow(Math.max(0.001, yieldKt), 1 / 3));

    if (
      qLower.includes('underwater') ||
      qLower.includes('water') ||
      qLower.includes('base surge') ||
      qLower.includes('baker') ||
      burstMode === 'underwater'
    ) {
      const depthM = Math.max(5, Math.abs(altM || 27));
      const sdow = depthM / Math.pow(Math.max(0.001, yieldKt), 1 / 3);
      const isDeep = sdow > 45;
      const rBubbleM = Math.round((42 * Math.pow(yieldKt, 1 / 3)) / Math.pow(depthM + 10, 0.25));

      return {
        question,
        deltaContext: deltaSummary,
        headline: isDeep
          ? `Deep Ocean Underwater Detonation (${yieldKt.toLocaleString()} kT at -${depthM} m)`
          : `Shallow Underwater Plume & Base Surge (${yieldKt.toLocaleString()} kT at -${depthM} m)`,
        regimeBadge: `🌊 Underwater • SDOW = ${sdow.toFixed(1)} m/kt¹/³ • Bubble Ø ${rBubbleM * 2} m`,
        intuitiveTakeaway: `Water acts like an optical and thermal sponge—it swallows the blinding heat flash within meters, boils into a giant high-pressure steam bubble ($R \\approx ${rBubbleM}\\text{ m}$), and hurls millions of tons of radioactive water skyward. When that water column falls back down, it splashes outward like a dense, invisible fog of concentrated fallout ("base surge").`,
        physicalMechanism: [
          `1. Thermal Quenching & Supercritical Steam Cavity: Liquid water has a high latent heat of vaporization ($2{,}260\\text{ kJ/kg}$). Prompt X-rays and thermal photons at $-${depthM}\\text{ m}$ are absorbed locally, vaporizing seawater into a supercritical steam bubble of radius $R_{\\text{bubble}} \\approx ${rBubbleM}\\text{ m}$.`,
          `2. Incompressible Hydraulic Shock ($1{,}500\\text{ m/s}$): Because water's bulk modulus ($K \\approx 2.2\\text{ GPa}$) makes it nearly incompressible, the underwater acoustic shock travels $>4\\times$ faster than in air, delivering hull-splitting impulse to submerged vessels.`,
          isDeep
            ? `3. Deep Hydrostatic Bubble Pulsation ($\\text{SDOW} = ${sdow.toFixed(1)} > 45$): High hydrostatic pressure forces the steam bubble through $2\\text{–}3$ expansion-contraction oscillations as it rises, venting at the surface as a foamy radioactive boil and gravity wave train.`
            : `3. Hollow Water Column & Base Surge Mist ($\\text{SDOW} = ${sdow.toFixed(1)} \\le 45$): The gas bubble blows out through the sea surface, throwing up a hollow cylindrical water column (Crossroads Baker geometry). Gravity collapse drives a ground-hugging aerosol mist ("base surge") out to ${metrics['Base Surge / Thermal'] || 'several km'}.`
        ],
        governingEquations: [
          {
            label: 'Underwater Steam Bubble Radius & Gravity Wave Speed',
            latex: 'R_{\\text{bubble}} \\approx \\frac{42 \\, Y^{1/3}}{(d + 10)^{1/4}} \\; [\\text{m}], \\qquad c_{\\text{wave}} = \\sqrt{g \\, h_{\\text{water}}}',
            meaning: `Predicts peak steam cavity radius (${rBubbleM} m) and outward surface tsunami phase velocity.`
          }
        ],
        liveSensitivityAnalysis: [
          `Depth $-${depthM}\\text{ m}$ vs. Airburst $+${optHobM}\\text{ m}$: Eliminates long-range 3rd-degree flash burns, shifting primary lethality to hydraulic shock and wet fission-product / $^{24}\\text{Na}$ base-surge contamination.`,
          `Transition to Deep Wigwam Regime: Lowering depth past $-${Math.round(45 * Math.pow(yieldKt, 1 / 3))}\\text{ m}$ ($\\text{SDOW} > 45$) suppresses the aerial water plume into a deep-water bubble pulsation boil.`
        ],
        regulatoryAndOperationalNote: `[${frameworkCode}] Wet base-surge mist adheres strongly to ship superstructures and coastal facilities. Immediate ventilation lockdown ("Citadel Mode"), respiratory protection, and continuous saltwater washdown are critical before aerosol droplets dry.`,
        sourceEngine: 'deterministic-physics'
      };
    }

    if (burstMode === 'underground' || qLower.includes('underground') || qLower.includes('sdob')) {
      const dobM = Math.max(1, Math.abs(altM || 150));
      const sdob = dobM / Math.pow(Math.max(0.001, yieldKt), 1 / 3);
      const isContained = sdob >= 115;
      const rCavityM = Math.round(11 * Math.pow(yieldKt, 1 / 3) * Math.pow(dobM / 100 + 0.5, -0.18));

      return {
        question,
        deltaContext: deltaSummary,
        headline: isContained
          ? `Deep Contained Subterranean Burst (${yieldKt.toLocaleString()} kT at -${dobM} m)`
          : `Shallow Cratering Subterranean Burst (${yieldKt.toLocaleString()} kT at -${dobM} m)`,
        regimeBadge: `🪨 Subterranean • SDOB = ${sdob.toFixed(0)} m/kt¹/³ • ${isContained ? 'Contained' : 'Cratering'}`,
        intuitiveTakeaway: isContained
          ? `Buried this deep ($-${dobM}\\text{ m}$), the sheer weight of the rock overhead acts like a pressure-cooker lid that never blows off. The blast melts a glass-lined underground cave ($R_c \\approx ${rCavityM}\\text{ m}$) that later collapses into a vertical rubble chimney without releasing fallout.`
          : `At $-${dobM}\\text{ m}$, the upward shock wave bounces off the ground surface and rips the rock lid open like a quarry blast, hurling millions of tons of pulverized, radioactive soil into a deep crater lip and dust surge.`,
        physicalMechanism: [
          `1. Silicate Vaporization Cavity: Temperatures $>10^7\\text{ K}$ vaporize rock into a cavity of radius $R_c \\approx ${rCavityM}\\text{ m}$ lined with molten glass that traps refractory fission products.`,
          `2. Seismic Coupling: Compressive shock fractures surrounding rock out to $\\sim 5 R_c$, coupling seismic energy equivalent to $m_b \\approx ${(4.0 + 0.75 * Math.log10(Math.max(0.001, yieldKt))).toFixed(2)}$.`,
          isContained
            ? `3. Full Containment ($\\text{SDOB} = ${sdob.toFixed(0)} \\ge 115$): Lithostatic overburden pressure exceeds cavity gas pressure, preventing atmospheric venting and collapsing upward into a breccia chimney.`
            : `3. Tensile Spall & Throwout Crater ($\\text{SDOB} = ${sdob.toFixed(0)} < 115$): Surface rarefaction spalls the overburden, venting high-pressure gases (peak cratering occurs near Sedan's $\\text{SDOB} \\approx 41$).`
        ],
        governingEquations: [
          {
            label: 'Scaled Depth of Burial & Full Containment Threshold',
            latex: '\\text{SDOB} = \\frac{d}{Y^{1/3}} \\; [\\text{m/kt}^{1/3}], \\qquad \\text{Contained:} \\; \\text{SDOB} \\ge 115',
            meaning: `Cube-root yield scaling for subterranean containment (current SDOB = ${sdob.toFixed(1)}).`
          }
        ],
        liveSensitivityAnalysis: [
          `Peak Cratering Depth: $-${Math.round(41 * Math.pow(yieldKt, 1 / 3))}\\text{ m}$ ($\\text{SDOB} = 41$) maximizes crater radius and local ejecta fallout.`,
          `Full Containment Depth: Below $-${Math.round(115 * Math.pow(yieldKt, 1 / 3))}\\text{ m}$ ($\\text{SDOB} \\ge 115$), surface blast and fallout drop to zero.`
        ],
        regulatoryAndOperationalNote: `[${frameworkCode}] Shallow cratering bursts create intense local fallout plumes requiring immediate sheltering ($\\text{PF} \\ge 10$) along the downwind axis per NCRP-165.`,
        sourceEngine: 'deterministic-physics'
      };
    }

    if (altM >= 10000 || shob > 280 || qLower.includes('high-altitude') || qLower.includes('hemp')) {
      return {
        question,
        deltaContext: deltaSummary,
        headline: `High-Altitude Ionospheric Burst & HEMP (${yieldKt.toLocaleString()} kT at +${(altM / 1000).toFixed(1)} km)`,
        regimeBadge: `⚡ High-Altitude • HOB = +${(altM / 1000).toFixed(1)} km • SHOB = ${Math.round(shob)}`,
        intuitiveTakeaway: `Up in the thin upper atmosphere ($+${(altM / 1000).toFixed(1)}\\text{ km}$), X-rays travel kilometers instead of meters, inflating a huge glowing plasma sphere. Because the blast is so far above the Earth, its suction never reaches the ground—so **no mushroom stem is pulled up**—while downward gamma rays knock electrons onto Earth's magnetic field lines to trigger a continental EMP.`,
        physicalMechanism: [
          `1. Decoupled Ground Afterwinds: Exponentially thin air density $\\rho(z) = \\rho_0 e^{-z/H}$ weakens the downward shock and prevents vortex updrafts from reaching Ground Zero—eliminating any dust column.`,
          `2. Rarefied X-Ray Deposition: Long photon mean free paths produce a wide, pancake-like luminescent ionospheric plasma sphere rather than a compact tropospheric torus.`,
          `3. Geomagnetic Compton $E_1$ HEMP: Downward prompt gammas strip Compton electrons in the $20\\text{–}40\\text{ km}$ layer; Lorentz deflection $\\mathbf{F} = -e(\\mathbf{v} \\times \\mathbf{B})$ radiates a coherent nanosecond electromagnetic pulse up to $50\\text{ kV/m}$.`
        ],
        governingEquations: [
          {
            label: 'Scale-Height Density & Geomagnetic Lorentz Synchrotron Deflection',
            latex: '\\rho(z) = \\rho_0 e^{-z/H_0}, \\qquad \\mathbf{F} = -e\\left(\\mathbf{v}_e \\times \\mathbf{B}_{\\text{Earth}}\\right)',
            meaning: 'Governs upper-atmospheric fireball expansion and coherent transverse HEMP current.'
          }
        ],
        liveSensitivityAnalysis: [
          `High Altitude ($+${(altM / 1000).toFixed(1)}\\text{ km}$) vs. Airburst ($+${optHobM}\\text{ m}$): Ground blast overpressure drops dramatically, while line-of-sight HEMP footprint spans hundreds to thousands of kilometers.`
        ],
        regulatoryAndOperationalNote: `[${frameworkCode}] Negligible local fallout occurs at ground level; critical infrastructure priority shifts to surge arrestors, Faraday shielding (MIL-STD-188-125), and backup power.`,
        sourceEngine: 'deterministic-physics'
      };
    }

    return {
      question,
      deltaContext: deltaSummary,
      headline:
        altM > 0
          ? `Optimal Airburst Mach-Stem & Upward Debris Column (${yieldKt.toLocaleString()} kT at +${altM} m)`
          : `Contact Surface Cratering & Fallout Burst (${yieldKt.toLocaleString()} kT at 0 m)`,
      regimeBadge:
        altM > 0
          ? `☁️ Airburst • HOB = +${altM} m (Opt ≈ +${optHobM} m) • SHOB = ${shob.toFixed(0)}`
          : `🌋 Surface Burst • HOB = 0 m • Heavy Fallout`,
      intuitiveTakeaway:
        altM > 0
          ? `Detonating at $+${altM}\\text{ m}$ bounces the downward shock wave off the ground so it merges with the outward shock into a single doubled-up wall of pressure (the **Mach Stem**). Meanwhile, the rising hot fireball acts like a giant chimney, sucking dust **strictly upward from Ground Zero** into the cloud base without mixing molten soil into the core.`
          : `Detonating right on the ground ($0\\text{ m}$) gouges a crater and sucks thousands of tons of vaporized soil straight into the nuclear fireball, coating heavy dust grains with fission products that rain back down as dangerous local fallout.`,
      physicalMechanism: [
        altM > 0
          ? `1. Mach-Stem Shock Coalescence: The ground-reflected wave travels through pre-heated, pre-compressed air behind the incident shock, catching up at a $\\sim 40^\\circ$ triple point to form a vertical Mach stem that extends the $5\\text{-psi}$ damage radius (${metrics['5 psi Blast Radius'] || ''}).`
          : `1. Hemispherical Crater Vaporization: Direct ground coupling vaporizes surface rock and soil directly into the incandescent plasma core.`,
        `2. Strictly Upward Afterwind Column: As the buoyant fireball rises and rolls into a rotating toroidal vortex ring, low pressure along its central axis generates $150\\text{–}300\\text{ km/h}$ inward/upward afterwinds that lift surface dust **upward from Ground Zero** into the cap.`,
        altM > 0
          ? `3. Fallout-Free Fireball Clearance: Above $H_{\\text{ff}} \\approx 55 \\, Y^{0.4} \\approx ${Math.round(55 * Math.pow(yieldKt, 0.4))}\\text{ m}$, the fireball never touches the ground, preventing refractory soil condensation with fission products.`
          : `3. Refractory Fallout Fractionation: Molten silica droplets condense around $^{90}\\text{Sr}$, $^{137}\\text{Cs}$, and $^{131}\\text{I}$, depositing intense local fallout downwind.`
      ],
      governingEquations: [
        {
          label: 'Cube-Root Mach-Stem Optimization & Fallout-Free Height',
          latex: 'H_{\\text{opt (5 psi)}} \\approx 140 \\, Y^{1/3} \\; [\\text{m}], \\qquad H_{\\text{fallout-free}} \\approx 55 \\, Y^{0.4} \\; [\\text{m}]',
          meaning: `For ${yieldKt} kT: optimal 5-psi height is +${optHobM} m; fallout-free clearance is +${Math.round(55 * Math.pow(yieldKt, 0.4))} m.`
        }
      ],
      liveSensitivityAnalysis: [
        `Height $+${altM}\\text{ m}$ vs. Surface $0\\text{ m}$: Airburst boosts $5\\text{-psi}$ structural damage area while cutting local fallout by $>90\\%$.`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] Surface bursts demand immediate $7:10$ Way-Wigner fallout shelter protocols ($R(t) = R_1 t^{-1.2}$), whereas fallout-free airbursts focus triage on blast trauma and flash burns.`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- CASE 2: DECAY CHAINS & RADIOLYSIS ---
  if (
    modPath === '/decay' ||
    telemetry?.moduleId === 'decay-chains' ||
    qLower.includes('decay') ||
    qLower.includes('bateman') ||
    qLower.includes('equilibrium') ||
    qLower.includes('radiolysis')
  ) {
    const parentIso = String(params['Parent Nuclide'] ?? activeSource.isotope ?? 'Mo-99');
    const halfLifeInfo = String(params['Parent Half-Life'] ?? isoRef.halfLifeStr ?? '65.94 h');
    const eqRegime = String(metrics['Equilibrium Regime'] ?? 'Bateman Ingrowth');
    const terminalNuclide = String(metrics['Terminal Stable Nuclide'] ?? 'Stable Ground State');

    return {
      question,
      deltaContext: deltaSummary,
      headline: `Bateman Decay Kinetics & Equilibrium (${parentIso} → ${terminalNuclide})`,
      regimeBadge: `☢️ Decay Chain • ${parentIso} (${halfLifeInfo}) • ${eqRegime}`,
      intuitiveTakeaway: `Think of a parent-daughter decay chain like two leaky buckets stacked vertically: ${parentIso} drains into its daughter at rate $\\lambda_1$, while the daughter drains into ${terminalNuclide} at rate $\\lambda_2$. If the top bucket drains much slower than the bottom bucket, the water level in the bottom bucket stabilizes so both flow at the exact same rate (**Equilibrium**)—until every atom eventually lands in a rock-solid **Stable** bucket at the bottom.`,
      physicalMechanism: [
        `1. Segrè Valley of Stability: Heavy nuclei ($Z > 82$) shed $\\alpha$ particles ($^4\\text{He}$) to relieve Coulomb repulsion; neutron-rich nuclei like ${parentIso} emit $\\beta^-$ electrons ($n \\to p + e^- + \\bar{\\nu}_e$); proton-rich nuclei capture orbital electrons or emit $\\beta^+$.`,
        `2. Secular vs. Transient Equilibrium: When $T_{1/2,1} \\gg T_{1/2,2}$ (e.g. $^{137}\\text{Cs} \\to {}^{137\\text{m}}\\text{Ba}$), daughter activity matches parent activity after $\\sim 7$ daughter half-lives (**Secular**). When $T_{1/2,1}$ is moderately longer (e.g. $^{99}\\text{Mo} \\to {}^{99\\text{m}}\\text{Tc}$), daughter activity peaks at $t_{\\max} = \\frac{\\ln(\\lambda_2/\\lambda_1)}{\\lambda_2 - \\lambda_1}$ (**Transient**).`,
        `3. Terminal Stability (${terminalNuclide}): Transmutation halts permanently once the nucleus reaches an energy minimum where $\\Delta M < 0$ for all decay modes (e.g. magic $Z=82$ Lead or stable $^{137}\\text{Ba}$).`
      ],
      governingEquations: [
        {
          label: 'Bateman Daughter Activity & Peak Ingrowth Time',
          latex: 'A_2(t) = A_1(0)\\frac{\\lambda_2}{\\lambda_2 - \\lambda_1}\\left(e^{-\\lambda_1 t} - e^{-\\lambda_2 t}\\right), \\qquad t_{\\max} = \\frac{\\ln(\\lambda_2/\\lambda_1)}{\\lambda_2 - \\lambda_1}',
          meaning: 'Exact analytical solution for daughter buildup and peak elution time.'
        }
      ],
      liveSensitivityAnalysis: [
        `Active Chain (${parentIso} → ${metrics['Daughter Progeny'] || terminalNuclide}): Total sample activity can initially *increase* over time as short-lived daughters grow in before decaying toward ${terminalNuclide}.`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] Dose assessments and transport manifests (IAEA SSR-6) must account for daughter ingrowth over maximum shipping/storage time—especially high-energy gamma daughters like $^{214}\\text{Bi}$ and $^{208}\\text{Tl}$.`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- CASE 3: CRITICALITY & REACTOR PHYSICS ---
  if (
    modPath === '/criticality' ||
    modPath === '/caas-criticality' ||
    telemetry?.moduleId === 'criticality' ||
    qLower.includes('criticality') ||
    qLower.includes('keff') ||
    qLower.includes('moderator') ||
    qLower.includes('delayed neutron')
  ) {
    const keff = Number(metrics['k_eff'] ?? 1.004);
    const kinf = Number(metrics['k_inf'] ?? 1.342);
    const rhoStr = String(metrics['Reactivity ρ'] ?? '+400 pcm');

    return {
      question,
      deltaContext: deltaSummary,
      headline: `Six-Factor Neutron Balance & Delayed-Neutron Control (k_eff = ${keff.toFixed(4)})`,
      regimeBadge: `⚛️ Neutronics • k_∞ = ${kinf.toFixed(4)} • k_eff = ${keff.toFixed(4)} • ρ = ${rhoStr}`,
      intuitiveTakeaway: `Fission neutrons are born moving way too fast ($\\sim 2\\text{ MeV}$) to easily split $^{235}\\text{U}$. Water moderator acts like bumper cars that slow neutrons down so $^{235}\\text{U}$ can catch them—and keeping slightly *less* water than ideal guarantees that if the core overheats and boils, $k_{\\text{eff}}$ drops automatically. Meanwhile, a tiny $0.65\\%$ trickle of **delayed neutrons** acts as a natural brake pedal so mechanical rods have seconds—not microseconds—to steer the reactor.`,
      physicalMechanism: [
        `1. Moderator-to-Fuel Optimum: Increasing moderator raises Resonance Escape Probability ($p$) past $^{238}\\text{U}$ capture resonances, but excess moderator parasitically absorbs thermal neutrons, lowering Thermal Utilization ($f$).`,
        `2. Inherent Negative Void Feedback: Designing lattices slightly *under-moderated* ensures coolant boiling/expansion reduces moderation ($p$ drops faster than $f$ rises), passively lowering $k_{\\text{eff}}$.`,
        `3. Delayed-Neutron Margin ($\\beta_{\\text{eff}} \\approx 0.0065$): Below $+\\$1.00$ ($\\rho < \\beta_{\\text{eff}}$), flux period follows delayed precursor half-lives ($\\sim 13\\text{ s}$). Above $+\\$1.00$ (**Prompt Critical**), multiplication accelerates onto the microsecond prompt neutron lifetime $l_p$.`
      ],
      governingEquations: [
        {
          label: 'Six-Factor Multiplication & Dollar Reactivity',
          latex: 'k_{\\text{eff}} = \\eta \\, f \\, p \\, \\epsilon \\, P_{\\text{FNL}} \\, P_{\\text{TNL}}, \\qquad \\rho_{[\\$]} = \\frac{k_{\\text{eff}} - 1}{k_{\\text{eff}} \\cdot \\beta_{\\text{eff}}}',
          meaning: `Current infinite lattice k_∞ = ${kinf.toFixed(4)}, finite core k_eff = ${keff.toFixed(4)}.`
        }
      ],
      liveSensitivityAnalysis: [
        `Live Core State ($k_{\\text{eff}} = ${keff.toFixed(4)}$): ${
          keff < 0.999
            ? 'Subcritical — fission chains decay exponentially.'
            : keff <= 1.0065
            ? 'Delayed Supercritical — controllable via B₄C rods and soluble boron shim.'
            : 'Prompt Supercritical (ρ ≥ $1.00) — rapid power excursion!'
        }`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] Out-of-reactor fissile storage requires $k_{\\text{eff}} + 2\\sigma \\le 0.95$ (ANSI/ANS-8.1) and dual-channel ANSI/ANS-8.3 CAAS criticality alarms.`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- CASE 4: GAMMA SPECTROSCOPY (Module 25 / /spectroscopy) ---
  if (
    modPath === '/spectroscopy' ||
    telemetry?.moduleId === 'spectroscopy' ||
    qLower.includes('compton edge') ||
    qLower.includes('backscatter') ||
    qLower.includes('photopeak') ||
    qLower.includes('fwhm')
  ) {
    const eGammaKeV = Number(params['Photopeak Energy (keV)'] ?? 661.7);
    const comptonEdgeKeV = eGammaKeV / (1 + 511.0 / (2 * eGammaKeV));
    const backscatterKeV = eGammaKeV - comptonEdgeKeV;

    return {
      question,
      deltaContext: deltaSummary,
      headline: `Gamma Pulse-Height Spectrum Features (${eGammaKeV.toFixed(1)} keV Photopeak)`,
      regimeBadge: `📊 Spectroscopy • E_γ = ${eGammaKeV.toFixed(1)} keV • Compton Edge = ${comptonEdgeKeV.toFixed(1)} keV`,
      intuitiveTakeaway: `A detector crystal only measures how much energy a gamma ray **leaves behind inside the crystal**. When the gamma is swallowed whole, you get the sharp **Photopeak** ($${eGammaKeV.toFixed(1)}\\text{ keV}$). When it ricochets off an electron and escapes out the side, it leaves a flat **Compton Shelf** ending at a sharp cliff—the **Compton Edge** ($${comptonEdgeKeV.toFixed(1)}\\text{ keV}$)—representing a head-on $180^\\circ$ billiard-ball collision!`,
      physicalMechanism: [
        `1. Full-Energy Photopeak ($E_\\gamma = ${eGammaKeV.toFixed(1)}\\text{ keV}$): Produced by photoelectric absorption (or multiple Compton scatters followed by absorption) depositing $100\\%$ of photon energy inside the active crystal.`,
        `2. Compton Continuum & Edge ($E_C = ${comptonEdgeKeV.toFixed(1)}\\text{ keV}$): Partial energy deposition when a photon scatters at angle $\\theta$ and escapes the detector. Maximum electron recoil occurs at $\\theta = 180^\\circ$, forming the sharp Compton Edge.`,
        `3. $180^\\circ$ Backscatter Peak ($E_{\\text{bs}} = ${backscatterKeV.toFixed(1)}\\text{ keV}$): Gamma rays that strike surrounding lead shield walls first, scatter backward at $\\sim 180^\\circ$, and then enter the detector deposit the leftover energy $E_\\gamma - E_C \\approx 180\\text{–}250\\text{ keV}$.`
      ],
      governingEquations: [
        {
          label: 'Compton Recoil Edge & Detector FWHM Energy Resolution',
          latex: 'E_{\\text{Compton Edge}} = \\frac{E_\\gamma}{1 + \\frac{m_e c^2}{2 E_\\gamma}}, \\qquad R(\\%) = \\frac{\\text{FWHM}}{H_0} \\times 100\\% \\propto \\frac{1}{\\sqrt{E_\\gamma}}',
          meaning: `HPGe semiconductors achieve ~0.15% resolution (3,000× more e-h pairs than NaI(Tl) scintillation photons at ~7% resolution).`
        }
      ],
      liveSensitivityAnalysis: [
        `At $E_\\gamma = ${eGammaKeV.toFixed(1)}\\text{ keV}$: Expect the Compton Edge at $${comptonEdgeKeV.toFixed(1)}\\text{ keV}$ and the shield Backscatter Peak near $${backscatterKeV.toFixed(1)}\\text{ keV}$. If $E_\\gamma > 1{,}022\\text{ keV}$, Single ($E_\\gamma - 511$) and Double ($E_\\gamma - 1022$) Escape Peaks also appear.`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] Never misidentify a ~$200\\text{ keV}$ shield backscatter peak or coincidence sum peak as a second contaminant nuclide; grading Lead shields with thin Copper/Tin liners suppresses Pb X-ray fluorescence ($75\\text{ keV}$).`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- CASE 5: ATMOSPHERIC PLUME DISPERSION (Module 13 / /plume) ---
  if (
    modPath === '/plume' ||
    telemetry?.moduleId === 'plume' ||
    qLower.includes('plume') ||
    qLower.includes('pasquill') ||
    qLower.includes('stability class')
  ) {
    const stabClass = String(params['Stability Class'] ?? 'D (Neutral)');
    const windMs = Number(params['Wind Speed (m/s)'] ?? 4.5);
    const stackM = Number(params['Release Height (m)'] ?? 30);

    return {
      question,
      deltaContext: deltaSummary,
      headline: `Gaussian Plume Turbulence & Stability Class Physics (Class ${stabClass})`,
      regimeBadge: `🌬️ Plume Model • Stability ${stabClass} • u = ${windMs} m/s • H = ${stackM} m`,
      intuitiveTakeaway: `Sunny daytime air (Class A/B) boils with thermal updrafts that whip a smoke plume up and down—bringing elevated stack releases down to the ground close to the source, but diluting them fast. Clear calm nights (Class F) create a smooth, laminar ribbon of air that keeps an elevated plume aloft nearby, or traps a ground release in a narrow, concentrated corridor many kilometers downwind!`,
      physicalMechanism: [
        `1. Turbulent Eddy Diffusion ($\\sigma_y, \\sigma_z$): Crosswind ($\\sigma_y$) and vertical ($\\sigma_z$) Briggs dispersion coefficients grow with downwind distance $x$ according to solar insolation and mechanical wind shear (Pasquill-Gifford Classes A–F).`,
        `2. Wind-Speed Dilution ($\\chi \\propto 1/u$): Doubling wind speed $u$ from $${windMs}\\text{ m/s}$ stretches the released activity over twice the volume of air per second, halving centerline concentration while halving arrival time.`,
        `3. Ground Reflection Image Term: For an elevated release ($H = ${stackM}\\text{ m}$), ground concentration is zero right at the stack base ($x \\to 0$) and peaks downwind where vertical spread $\\sigma_z(x) \\approx H / \\sqrt{2}$.`
      ],
      governingEquations: [
        {
          label: 'Ground-Level Centerline Gaussian Plume Equation',
          latex: '\\chi(x, 0, 0) = \\frac{Q}{\\pi \\, u \\, \\sigma_y(x) \\, \\sigma_z(x)} \\exp\\!\\left(-\\frac{H^2}{2\\sigma_z^2(x)}\\right)',
          meaning: 'Models ground-reflected airborne concentration χ [Bq/m³] along the downwind centerline.'
        }
      ],
      liveSensitivityAnalysis: [
        `Shifting Stability from Class D → Class F (Nighttime Inversion): Suppresses vertical mixing $\\sigma_z$, pushing peak ground concentration much farther downwind and keeping ground-level releases dangerously concentrated.`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] EPA PAG Manual & IAEA GSG-2 trigger sheltering at $10\\text{ mSv}$ and evacuation at $50\\text{ mSv}$ projected TEDE (plus $50\\text{ mGy}$ thyroid KI prophylaxis threshold for $^{131}\\text{I}$).`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- CASE 6: X-RAY TUBE & BREMSSTRAHLUNG SPECTRA (Module 16/17) ---
  if (
    modPath === '/xray-tube' ||
    modPath === '/xray' ||
    telemetry?.moduleId === 'xray-tube' ||
    qLower.includes('duane-hunt') ||
    qLower.includes('kvp') ||
    qLower.includes('filtration') ||
    qLower.includes('beam hardening')
  ) {
    const kvp = Number(params['Tube Potential (kVp)'] ?? 120);
    const filterMm = Number(params['Al Filtration (mm)'] ?? 2.5);
    const lambdaMinNm = 1.23984 / kvp;

    return {
      question,
      deltaContext: deltaSummary,
      headline: `Bremsstrahlung Continuum, Duane-Hunt Cutoff & Beam Hardening (${kvp} kVp)`,
      regimeBadge: `⚡ X-Ray Physics • ${kvp} kVp • λ_min = ${lambdaMinNm.toFixed(4)} nm • Filter = ${filterMm} mm Al`,
      intuitiveTakeaway: `Electrons slammed across $${kvp}\\text{ kVp}$ into a tungsten anode brake violently around heavy nuclei, spraying a continuous rainbow of X-rays (**Bremsstrahlung**) up to a hard energy ceiling of exactly $${kvp}\\text{ keV}$ (where a single electron gives up $100\\%$ of its kinetic energy in one shot). Adding Aluminum filtration strips away "soft" low-energy X-rays that would only burn patient skin without penetrating to the detector (**Beam Hardening**).`,
      physicalMechanism: [
        `1. Duane-Hunt Quantum Cutoff ($E_{\\max} = e V_{\\text{kVp}}$): Conservation of energy forbids any photon above $${kvp}\\text{ keV}$, fixing minimum wavelength at $\\lambda_{\\min} = ${lambdaMinNm.toFixed(4)}\\text{ nm}$.`,
        `2. Kramers Bremsstrahlung + Characteristic Lines: Braking radiation scales with $Z \\cdot I \\cdot V_{\\text{kVp}}^2$, superimposed with sharp $K_\\alpha / K_\\beta$ shell-transition spikes once kVp exceeds the target's K-edge ($69.5\\text{ keV}$ for Tungsten).`,
        `3. Aluminum Filtration & Beam Hardening ($${filterMm}\\text{ mm Al}$): Low-energy photons suffer $\\tau \\propto E^{-3}$ photoelectric absorption in the filter, shifting mean spectrum energy upward and increasing the Half-Value Layer (HVL).`
      ],
      governingEquations: [
        {
          label: 'Duane-Hunt Cutoff & Kramers Integrated Bremsstrahlung Intensity',
          latex: '\\lambda_{\\min} \\; [\\text{nm}] = \\frac{h c}{e V} = \\frac{1.2398}{\\text{kVp}}, \\qquad I_{\\text{total}} \\propto i_{\\text{mA}} \\cdot Z_{\\text{anode}} \\cdot (\\text{kVp})^2',
          meaning: 'Doubling kVp quadruples unfiltered X-ray power output while shifting penetrating power upward.'
        }
      ],
      liveSensitivityAnalysis: [
        `Increasing kVp vs. mA: Raising mA scales photon quantity linearly ($I \\propto \\text{mA}$) without changing HVL, whereas raising kVp increases both intensity ($\\propto \\text{kVp}^2$) and penetration.`
      ],
      regulatoryAndOperationalNote: `[${frameworkCode}] Diagnostic and NDT enclosures (NCRP Report 147) size primary barriers for unattenuated workload $W \\cdot U \\cdot T$ and secondary barriers for $90^\\circ$ patient scatter + tube housing leakage.`,
      sourceEngine: 'deterministic-physics'
    };
  }

  // --- DEFAULT CASE: DOSE, INVERSE-SQUARE & BROAD-BEAM SHIELDING ---
  const unshieldedDoseMSvH =
    (isoRef.gammaConst_mSv_m2_h_GBq * activeSource.activityGBq) /
    Math.pow(Math.max(0.1, activeSource.distanceM), 2);
  const hvlCount = activeSource.shieldThicknessCm / Math.max(0.01, isoRef.hvlLeadCm);
  const narrowTrans = Math.pow(0.5, hvlCount);
  const approxBuildup = 1 + 0.85 * hvlCount * Math.pow(Math.max(0.2, hvlCount), 0.25);
  const shieldedDoseMSvH = unshieldedDoseMSvH * narrowTrans * approxBuildup;

  return {
    question,
    deltaContext: deltaSummary,
    headline: `Inverse-Square Divergence & Compton Scatter Buildup (${activeSource.isotope}, ${activeSource.activityGBq} GBq)`,
    regimeBadge: `🛡️ M${String(modNum).padStart(2, '0')} • ${activeSource.isotope} @ ${activeSource.distanceM} m • ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial}`,
    intuitiveTakeaway: `Stepping twice as far from ${activeSource.isotope} spreads its gamma rays over $4\\times$ the spherical surface area ($1/r^2$). Placing ${activeSource.shieldThicknessCm} cm of ${activeSource.shieldMaterial} in between blocks most direct photons, **but** many gamma rays ricochet off electrons inside the shield (Compton scatter) and still emerge forward—meaning real-world "broad-beam" dose is $${approxBuildup.toFixed(1)}\\times$ higher than naive textbook exponential decay predicts!`,
    physicalMechanism: [
      `1. Geometric Inverse-Square Law ($1/r^2$): At $r = ${activeSource.distanceM}\\text{ m}$, isotropic $4\\pi r^2$ divergence yields an unshielded rate of $${unshieldedDoseMSvH.toFixed(3)}\\text{ mSv/h}$.`,
      `2. Broad-Beam Compton Buildup ($B(\\mu x) \\approx ${approxBuildup.toFixed(2)}$): Multiple-scattered degraded photons penetrate forward through thick barriers alongside uncollided photons ($e^{-\\mu x}$), raising true dose rate from $${(unshieldedDoseMSvH * narrowTrans).toFixed(4)}$ to $${shieldedDoseMSvH.toFixed(4)}\\text{ mSv/h}$.`,
      `3. High-$Z$ Photoelectric vs. Beta Bremsstrahlung: High-$Z$ shields ($\tau \\propto Z^4/E^3$) stop gammas efficiently, whereas pure $\\beta^-$ emitters require low-$Z$ plastic inner linings first to avoid radiative Bremsstrahlung ($f_{\\text{brem}} \\propto Z \\cdot E_\\beta$).`
    ],
    governingEquations: [
      {
        label: 'Broad-Beam Shielded Point-Source Dose Rate',
        latex: '\\dot{H}^*(10) = \\frac{\\Gamma \\cdot A}{r^2} \\, B(\\mu x, E) \\, e^{-\\mu(E) \\, x}, \\qquad \\text{TVL} = \\frac{\\ln(10)}{\\ln(2)}\\,\\text{HVL} \\approx 3.322\\,\\text{HVL}',
        meaning: `Γ = ${isoRef.gammaConst_mSv_m2_h_GBq} mSv·m²/(h·GBq) for ${activeSource.isotope}; 1 Pb TVL ≈ ${(isoRef.hvlLeadCm * 3.322).toFixed(2)} cm.`
      }
    ],
    liveSensitivityAnalysis: [
      `Adding $+1\\text{ TVL}$ ($+${(isoRef.hvlLeadCm * 3.322).toFixed(2)}\\text{ cm}$ Pb-eq): Cuts uncollided flux $10\\times$, though Compton buildup softens total reduction to $\\sim 6\\text{–}8\\times$.`,
      activeModuleInfo && MODULE_USER_GUIDES[activeModuleInfo.moduleNumber]
        ? `Active Tool (${activeModuleInfo.label}): ${MODULE_USER_GUIDES[activeModuleInfo.moduleNumber].whatItDoes}`
        : `Doubling Standoff Distance ($${activeSource.distanceM}\\text{ m} \\to ${(activeSource.distanceM * 2).toFixed(1)}\\text{ m}$): Cuts dose rate by exactly $75\\%$ with zero added shield weight.`
    ],
    regulatoryAndOperationalNote: `[${frameworkCode}] Annual occupational limit is $${occLimitMSv}\\text{ mSv/yr}$ (${frameworkName}). At $${shieldedDoseMSvH.toFixed(3)}\\text{ mSv/h}$, administrative stay-time ceiling is $${(occLimitMSv / Math.max(1e-6, shieldedDoseMSvH)).toFixed(1)}\\text{ h}$.`,
    sourceEngine: 'deterministic-physics'
  };
}

export const PhysicsTutorDrawer: React.FC<PhysicsTutorDrawerProps> = ({
  activeModuleInfo,
  embeddedInInspector = false,
  onApplySourceToCurrentModule
}) => {
  const {
    currentFramework,
    activeSource,
    setActiveSource,
    pinnedResults,
    pinCalculation,
    liveModuleTelemetry,
    telemetryDeltaSummary
  } = useRegulatory();

  const [isOpen, setIsOpen] = useState(embeddedInInspector);
  const [depthMode, setDepthMode] = useState<AudienceDepthMode>('engineering');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [backendMode, setBackendMode] = useState<TutorBackendMode>(() => {
    const saved = localStorage.getItem('radpro_tutor_backend');
    if (saved === 'gemini' || saved === 'ollama') return saved;
    return 'deterministic';
  });
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('radpro_gemini_api_key') || '';
  });
  const [ollamaUrl, setOllamaUrl] = useState<string>(() => {
    return localStorage.getItem('radpro_ollama_url') || 'http://localhost:11434';
  });
  const [ollamaModel, setOllamaModel] = useState<string>(() => {
    return localStorage.getItem('radpro_ollama_model') || 'llama3.2';
  });

  const [messages, setMessages] = useState<PhysicsTutorMessage[]>([]);

  const suggestedQuestions = useMemo(() => {
    if (liveModuleTelemetry?.suggestedQuestions && liveModuleTelemetry.suggestedQuestions.length > 0) {
      return liveModuleTelemetry.suggestedQuestions;
    }
    const path = activeModuleInfo?.path || '';
    if (path === '/nuclear-weapons-effects') {
      return [
        'Why does Optimal Airburst maximize 5-psi Mach-stem radius and pull the debris stem strictly upward?',
        'Why does an Underwater Baker burst quench thermal flash and create a radioactive base surge?',
        'Why does a High-Altitude burst (15 km+) form a spherical plasma cloud with no ground stem and generate HEMP?',
        'Why does SDOB determine whether an underground burst craters or stays fully contained?'
      ];
    }
    if (path === '/decay') {
      return [
        'Why does this parent nuclide follow its specific α / β⁻ / EC pathway toward stability?',
        'Why do parent-daughter pairs reach Secular vs. Transient Equilibrium?',
        'Why do all natural actinide chains end in stable Lead (Pb-206/207/208) or Bi-209?'
      ];
    }
    if (path === '/criticality' || path === '/caas-criticality') {
      return [
        'Why does the Six-Factor Formula peak at an optimal moderator-to-fuel ratio?',
        'Why does under-moderation provide inherent negative void/temperature safety?',
        'Why do delayed neutrons (β_eff) allow control while ρ ≥ $1.00 causes a prompt excursion?'
      ];
    }
    if (path === '/spectroscopy') {
      return [
        'Why does a gamma spectrum show a sharp Compton Edge and a ~200 keV Backscatter Peak?',
        'Why does HPGe have 30× sharper FWHM resolution than NaI(Tl)?'
      ];
    }
    if (path === '/plume') {
      return [
        'Why does nighttime Pasquill Class F carry concentrated plumes much farther downwind than daytime Class A?',
        'Why does an elevated stack release peak some distance downwind instead of at Ground Zero?'
      ];
    }
    if (path === '/xray-tube' || path === '/xray') {
      return [
        'Why does kVp set a hard Duane-Hunt cutoff while Aluminum filtration hardens the X-ray beam?'
      ];
    }
    return [
      `Why does ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial} produce Compton buildup B(μx) > 1 for ${activeSource.isotope}?`,
      'Why must pure beta emitters be shielded with low-Z plastic before high-Z Lead (Bremsstrahlung)?'
    ];
  }, [liveModuleTelemetry, activeModuleInfo, activeSource]);

  // Built-in bi-directional "What-If Experiment" actions (module-specific or Global Source fallback)
  const whatIfExperiments = useMemo(() => {
    if (liveModuleTelemetry?.whatIfActions && liveModuleTelemetry.whatIfActions.length > 0) {
      return liveModuleTelemetry.whatIfActions;
    }
    const isoRef = ISOTOPE_QUICK_REF[activeSource.isotope] || ISOTOPE_QUICK_REF['Co-60'];
    const tvlCm = Number((isoRef.hvlLeadCm * 3.322).toFixed(2));
    return [
      {
        label: `▶ Double Distance (${activeSource.distanceM} → ${(activeSource.distanceM * 2).toFixed(1)} m)`,
        description: 'Test 1/r² inverse-square 4× flux reduction',
        run: () => {
          setActiveSource({ distanceM: Number((activeSource.distanceM * 2).toFixed(2)) });
          if (onApplySourceToCurrentModule) setTimeout(onApplySourceToCurrentModule, 30);
        }
      },
      {
        label: `▶ Add +1 TVL Shield (+${tvlCm} cm)`,
        description: 'Add one Tenth-Value Layer and observe Compton buildup B(μx)',
        run: () => {
          setActiveSource({
            shieldThicknessCm: Number((activeSource.shieldThicknessCm + tvlCm).toFixed(2))
          });
          if (onApplySourceToCurrentModule) setTimeout(onApplySourceToCurrentModule, 30);
        }
      },
      {
        label: activeSource.isotope === 'Co-60' ? '▶ Switch Source → Cs-137' : '▶ Switch Source → Co-60',
        description: 'Compare 662 keV (Cs-137) vs 1.17/1.33 MeV (Co-60) penetration',
        run: () => {
          setActiveSource({ isotope: activeSource.isotope === 'Co-60' ? 'Cs-137' : 'Co-60' });
          if (onApplySourceToCurrentModule) setTimeout(onApplySourceToCurrentModule, 30);
        }
      }
    ];
  }, [liveModuleTelemetry, activeSource, setActiveSource, onApplySourceToCurrentModule]);

  const askTutorQuestion = async (questionText: string, overrideTelemetry?: LiveModuleTelemetry | null) => {
    const q = questionText.trim() || suggestedQuestions[0];
    const activeTel = overrideTelemetry !== undefined ? overrideTelemetry : liveModuleTelemetry;

    const deterministicBase = buildDeterministicPhysicsExplanation(
      q,
      activeTel,
      telemetryDeltaSummary,
      activeModuleInfo,
      activeSource,
      currentFramework.name,
      currentFramework.shortCode,
      currentFramework.limits.occupationalAnnualEffective_mSv
    );

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (backendMode === 'deterministic' || (backendMode === 'gemini' && !geminiApiKey.trim())) {
      const newMsg: PhysicsTutorMessage = {
        id: `tutor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'tutor',
        timestamp: nowStr,
        ...deterministicBase
      };
      setMessages(prev => [newMsg, ...prev].slice(0, 12));
      return;
    }

    setIsGenerating(true);
    try {
      const audienceNote =
        depthMode === 'intuitive'
          ? 'Use vivid physical analogies accessible to a student while keeping numbers exact.'
          : depthMode === 'responder'
          ? 'Focus on tactical field hazards, cordons, stay-time, and protective actions.'
          : 'Use rigorous Certified Health Physicist (CHP) / nuclear engineering terminology.';

      const systemPrompt = [
        `You are the RadPro Calc Interactive Physics Tutor (ISO/IEC 17025 Compliant). ${audienceNote}`,
        `CRITICAL RULE: Never guess math. Lock every number strictly to the verified simulator telemetry below:`,
        `- Active Module: ${activeModuleInfo ? `M${activeModuleInfo.moduleNumber}: ${activeModuleInfo.label}` : 'Workspace'}`,
        `- Global Source: ${activeSource.isotope}, ${activeSource.activityGBq} GBq at ${activeSource.distanceM} m, Shield: ${activeSource.shieldThicknessCm} cm ${activeSource.shieldMaterial}`,
        `- Regulatory Standard: ${currentFramework.shortCode} (Limit: ${currentFramework.limits.occupationalAnnualEffective_mSv} mSv/yr)`,
        activeTel
          ? `- Live Regime: ${activeTel.regimeSummary}\n- Live Parameters: ${JSON.stringify(activeTel.parameters)}\n- Computed Outputs: ${JSON.stringify(activeTel.computedMetrics)}`
          : '',
        telemetryDeltaSummary ? `- Recent Parameter Delta: ${telemetryDeltaSummary}` : '',
        pinnedResults.length > 0
          ? `- Pinned Calculations: ${JSON.stringify(pinnedResults.slice(0, 2).map(p => p.title))}`
          : ''
      ]
        .filter(Boolean)
        .join('\n');

      if (backendMode === 'gemini' && geminiApiKey.trim()) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey.trim())}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: q }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
            })
          }
        );
        if (res.ok) {
          const data = await res.json();
          const llmText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (llmText) {
            const paragraphs = llmText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
            setMessages(prev =>
              [
                {
                  id: `tutor-${Date.now()}`,
                  role: 'tutor' as const,
                  timestamp: nowStr,
                  ...deterministicBase,
                  physicalMechanism: paragraphs.length > 0 ? paragraphs : deterministicBase.physicalMechanism,
                  sourceEngine: 'gemini-2.5-flash' as const
                },
                ...prev
              ].slice(0, 12)
            );
            setIsGenerating(false);
            return;
          }
        }
      } else if (backendMode === 'ollama') {
        const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: ollamaModel, system: systemPrompt, prompt: q, stream: false })
        });
        if (res.ok) {
          const data = await res.json();
          const llmText: string | undefined = data?.response;
          if (llmText) {
            const paragraphs = llmText.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean);
            setMessages(prev =>
              [
                {
                  id: `tutor-${Date.now()}`,
                  role: 'tutor' as const,
                  timestamp: nowStr,
                  ...deterministicBase,
                  physicalMechanism: paragraphs.length > 0 ? paragraphs : deterministicBase.physicalMechanism,
                  sourceEngine: 'local-ollama' as const
                },
                ...prev
              ].slice(0, 12)
            );
            setIsGenerating(false);
            return;
          }
        }
      }
    } catch {
      // Fallback cleanly to deterministic physics engine
    }

    setMessages(prev =>
      [
        {
          id: `tutor-${Date.now()}`,
          role: 'tutor' as const,
          timestamp: nowStr,
          ...deterministicBase
        },
        ...prev
      ].slice(0, 12)
    );
    setIsGenerating(false);
  };

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ promptQuestion?: string; customTelemetry?: LiveModuleTelemetry }>;
      setIsOpen(true);
      const q = customEvt.detail?.promptQuestion || suggestedQuestions[0];
      askTutorQuestion(q, customEvt.detail?.customTelemetry);
    };
    window.addEventListener('radpro:open-physics-tutor', handleOpenEvent);
    return () => window.removeEventListener('radpro:open-physics-tutor', handleOpenEvent);
  });

  // Auto-generate explanation when opened or when switching modules while open
  useEffect(() => {
    if ((isOpen || embeddedInInspector) && messages.length === 0) {
      askTutorQuestion(suggestedQuestions[0]);
    }
  }, [isOpen, embeddedInInspector]);

  const currentExplanation = messages[0] || null;
  const previousHistory = messages.slice(1);

  const tutorBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Audience Depth Lens + Engine Settings Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'intuitive', label: '🎓 Intuitive' },
              { id: 'engineering', label: '⚛️ CHP / Physics' },
              { id: 'responder', label: '🚨 Field Ops' }
            ] as const
          ).map(mode => (
            <button
              key={mode.id}
              type="button"
              className={depthMode === mode.id ? 'active' : ''}
              onClick={() => setDepthMode(mode.id)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.71rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(prev => !prev)}
          style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.70rem', cursor: 'pointer' }}
        >
          ⚙️ {backendMode === 'deterministic' ? 'Offline Engine' : backendMode === 'gemini' ? 'Gemini 2.5' : 'Ollama'}
        </button>
      </div>

      {showSettings && (
        <div
          style={{
            padding: '10px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(
              [
                { id: 'deterministic', label: '⚡ Deterministic (Offline)' },
                { id: 'gemini', label: '✨ Gemini 2.5 API' },
                { id: 'ollama', label: '🖥️ Local Ollama' }
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                className={backendMode === opt.id ? 'active' : ''}
                onClick={() => {
                  setBackendMode(opt.id);
                  localStorage.setItem('radpro_tutor_backend', opt.id);
                }}
                style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.70rem', cursor: 'pointer' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {backendMode === 'gemini' && (
            <input
              type="password"
              className="form-control"
              placeholder="Paste Gemini API Key (AIza...)"
              value={geminiApiKey}
              onChange={e => {
                setGeminiApiKey(e.target.value);
                localStorage.setItem('radpro_gemini_api_key', e.target.value);
              }}
              style={{ fontSize: '0.74rem', padding: '4px 8px' }}
            />
          )}
          {backendMode === 'ollama' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-control"
                value={ollamaUrl}
                onChange={e => {
                  setOllamaUrl(e.target.value);
                  localStorage.setItem('radpro_ollama_url', e.target.value);
                }}
                style={{ fontSize: '0.73rem', padding: '4px 6px', flex: 1 }}
              />
              <input
                type="text"
                className="form-control"
                value={ollamaModel}
                onChange={e => {
                  setOllamaModel(e.target.value);
                  localStorage.setItem('radpro_ollama_model', e.target.value);
                }}
                style={{ fontSize: '0.73rem', padding: '4px 6px', width: '95px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Rolling Delta (Δ) Tracker Banner */}
      {telemetryDeltaSummary && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(14, 116, 144, 0.18)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: '#38bdf8' }}>
              Δ SLIDER CHANGE DETECTED
            </span>
            <button
              type="button"
              onClick={() => askTutorQuestion(`Why did changing ${telemetryDeltaSummary} alter the physics behavior?`)}
              style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.69rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Explain Δ Change →
            </button>
          </div>
          <div style={{ fontSize: '0.71rem', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
            {telemetryDeltaSummary}
          </div>
        </div>
      )}

      {/* Live Simulator Telemetry Pills */}
      {liveModuleTelemetry && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            padding: '7px 9px',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '6px',
            borderLeft: '3px solid #38bdf8'
          }}
        >
          {Object.entries(liveModuleTelemetry.parameters).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: '0.69rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(30, 41, 59, 0.9)',
                color: '#cbd5e1',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {k}: <strong style={{ color: '#f8fafc' }}>{String(v)}</strong>
            </span>
          ))}
          {Object.entries(liveModuleTelemetry.computedMetrics).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: '0.69rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(14, 116, 144, 0.24)',
                color: '#bae6fd',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {k}: <strong>{String(v)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Bi-Directional Clickable "Run What-If Experiment" Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <span style={{ fontSize: '0.69rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Interactive What-If Experiments (Live Control):
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {whatIfExperiments.map((act, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                act.run();
                setTimeout(() => {
                  askTutorQuestion(`Explain what happens when we run: ${act.label}`);
                }, 90);
              }}
              title={act.description}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '0.71rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Question Input */}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!customQuestion.trim()) return;
          askTutorQuestion(customQuestion);
          setCustomQuestion('');
        }}
        style={{ display: 'flex', gap: '6px' }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="Ask why any phenomenon happens..."
          value={customQuestion}
          onChange={e => setCustomQuestion(e.target.value)}
          style={{ flex: 1, fontSize: '0.77rem', padding: '6px 9px' }}
        />
        <button
          type="submit"
          disabled={isGenerating}
          style={{ padding: '6px 11px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {isGenerating ? '...' : 'Ask'}
        </button>
      </form>

      {/* Suggested Phenomenon Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {suggestedQuestions.map((sq, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => askTutorQuestion(sq)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.70rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            💡 {sq}
          </button>
        ))}
      </div>

      {/* Active Explanation Card (Adapted to Selected Audience Depth Lens) */}
      {currentExplanation && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.78)',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '11px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.14)', paddingBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {currentExplanation.regimeBadge}
              </div>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#f8fafc', lineHeight: 1.35 }}>
                {currentExplanation.headline}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                pinCalculation({
                  moduleNumber: activeModuleInfo?.moduleNumber || 0,
                  moduleLabel: activeModuleInfo?.label || 'Physics Tutor',
                  modulePath: activeModuleInfo?.path || '/',
                  title: `Physics Tutor: ${currentExplanation.headline}`,
                  summary: currentExplanation.intuitiveTakeaway,
                  metrics: [
                    { label: 'Regime', value: currentExplanation.regimeBadge },
                    { label: 'Engine', value: currentExplanation.sourceEngine }
                  ],
                  notes: currentExplanation.regulatoryAndOperationalNote
                });
              }}
              style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.69rem', cursor: 'pointer', flexShrink: 0 }}
              title="Pin explanation to Calculation Pinboard & Master Audit Dossier"
            >
              📌 Pin
            </button>
          </div>

          {/* Intuitive Summary Box (Highlighted first in 'intuitive' mode, compact callout in others) */}
          {(depthMode === 'intuitive' || depthMode === 'engineering') && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: depthMode === 'intuitive' ? 'rgba(14, 116, 144, 0.18)' : 'rgba(30, 41, 59, 0.55)',
                borderLeft: '3px solid #38bdf8',
                fontSize: '0.78rem',
                lineHeight: 1.52,
                color: '#e2e8f0'
              }}
            >
              <strong style={{ color: '#7dd3fc' }}>Intuitive Picture: </strong>
              <MathText text={currentExplanation.intuitiveTakeaway} />
            </div>
          )}

          {/* Detailed Engineering Mechanism & Equations (Shown in 'engineering' & 'intuitive') */}
          {depthMode !== 'responder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <strong style={{ fontSize: '0.72rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Causal Physics Mechanism
              </strong>
              {(depthMode === 'intuitive'
                ? currentExplanation.physicalMechanism.slice(0, 2)
                : currentExplanation.physicalMechanism
              ).map((para, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: '#cbd5e1' }}>
                  <MathText text={para} />
                </p>
              ))}
            </div>
          )}

          {depthMode === 'engineering' && currentExplanation.governingEquations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentExplanation.governingEquations.map((eq, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(9, 14, 24, 0.82)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '6px',
                    padding: '8px 10px'
                  }}
                >
                  <div style={{ fontSize: '0.70rem', fontWeight: 600, color: '#e2e8f0' }}>{eq.label}</div>
                  <div style={{ overflowX: 'auto', fontSize: '0.84rem' }}>
                    <BlockMath math={eq.latex} />
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#94a3b8', lineHeight: 1.38 }}>{eq.meaning}</div>
                </div>
              ))}
            </div>
          )}

          {/* Live Sensitivity */}
          <div
            style={{
              background: 'rgba(14, 116, 144, 0.10)',
              border: '1px solid rgba(56, 189, 248, 0.22)',
              borderRadius: '6px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <strong style={{ fontSize: '0.71rem', color: '#38bdf8', textTransform: 'uppercase' }}>
              Slider Sensitivity
            </strong>
            {currentExplanation.liveSensitivityAnalysis.map((item, idx) => (
              <div key={idx} style={{ fontSize: '0.76rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                • <MathText text={item} />
              </div>
            ))}
          </div>

          {/* Operational & Regulatory Box (Featured prominently in 'responder' mode) */}
          <div
            style={{
              padding: depthMode === 'responder' ? '10px 12px' : '6px 0 0 0',
              background: depthMode === 'responder' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              border: depthMode === 'responder' ? '1px solid rgba(245, 158, 11, 0.35)' : 'none',
              borderTop: depthMode === 'responder' ? undefined : '1px solid rgba(148, 163, 184, 0.14)',
              borderRadius: depthMode === 'responder' ? '6px' : '0',
              fontSize: '0.75rem',
              color: depthMode === 'responder' ? '#fde68a' : '#94a3b8',
              lineHeight: 1.48
            }}
          >
            <strong style={{ color: depthMode === 'responder' ? '#fbbf24' : '#cbd5e1' }}>
              {depthMode === 'responder' ? '🚨 Tactical Field Action & Limits: ' : 'Regulatory & Ops: '}
            </strong>
            <MathText text={currentExplanation.regulatoryAndOperationalNote} />
          </div>
        </div>
      )}

      {/* Collapsible Session Q&A History Thread */}
      {previousHistory.length > 0 && (
        <details style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
            Earlier Questions in This Session ({previousHistory.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {previousHistory.map(msg => (
              <div
                key={msg.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.15)'
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  {msg.timestamp} • {msg.regimeBadge}
                </div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginTop: '2px' }}>{msg.headline}</div>
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.45 }}>
                  <MathText text={msg.intuitiveTakeaway} />
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  if (embeddedInInspector) {
    return tutorBody;
  }

  return (
    <div
      style={{
        marginBottom: '12px',
        background: 'rgba(9, 15, 26, 0.90)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => setIsOpen(prev => !prev)} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
          🧠 Physics Tutor {isOpen ? '▲' : '▼'}
        </button>
      </div>
      {isOpen && <div style={{ padding: '12px 14px' }}>{tutorBody}</div>}
    </div>
  );
};
