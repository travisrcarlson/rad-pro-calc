# RadPro Analyst `v4.6.0` — Technical & Editorial Publication Brief

**Target Audiences:**
1. **Defense & CBRN Periodicals** (*CBRNe World*, *Militaire Spectator*, *European Security & Defence*)
2. **Radiation Protection Academia & Regulatory Peers** (TU Delft *Coördinator Stralingsbescherming* Level 4A / 4B & *Algemeen Coördinerend Deskundige* SBD review)

---

## 1. Executive Summary

Field radiation protection officers, hospital physics units, and military CBRN reconnaissance teams frequently face a capability gap: legacy regulatory codes (MCNP, MicroShield, HotSpot) require workstation installs or cloud licensing, whereas quick mobile calculators rely on unverified narrow-beam approximations without regulatory traceability.

**RadPro Analyst (`v4.6.0`)** is a zero-telemetry, 100% offline-capable **Progressive Web App (PWA)** uniting **35 computational engineering modules** on top of **56 shared, deterministic IEEE 754-2019 Binary64 physics kernels** and **7 switchable statutory regimes** (defaulting to **Netherlands ANVS / Bbs**, *Besluit basisveiligheidsnormen stralingsbescherming*, Stb. 2017, 404). Every calculation is backed by a live **70/70 Verification & Validation (V&V) suite** importing the exact production TypeScript solvers—achieving a worst-case relative analytical deviation of **δ = 0.0464%** across all 62 analytical benchmarks and 8 boundary stress tests.

---

## 2. Operational & Academic Differentiators

1. **Zero Shadow Lambdas (Unified Solver Provenance):**
   CLI verification (`npm test`) and the interactive Module 34 QA panel (`/verify`) execute the *same* production functions used by interactive UI charts and sliders—preventing code/test divergence.
2. **Real Physics Over Heuristic Shortcuts:**
   - **Shielding & 3D Ray-Tracing:** Multi-line discrete photon spectra (`ICRP-107`) attenuated via `NIST XCOM` mass attenuation tables and `ANSI/ANS-6.4.3` Geometric Progression (GP) broad-beam buildup factors across 3D Kay-Kajiya slab intersections.
   - **Radiochemistry & Generator Elution:** L-stable 2-stage **TR-BDF2** integration over bifurcating decay DAGs (`Mo-99 → Tc-99m`, `Ra-226`, `Th-232`, `U-238`), paired with an $O(\log N)$ timeline scrubber and interactive Karlsruhe nuclide chart (`/decay`).
   - **Dutch ANVS / Bbs Radiotoxicity & Exemption Engine (`/reg`):** Live **$Re_{\text{inh}}$ D/C/B-Laboratory classifier** (`VTEST-61`), **Bijlage 3 / EU Euratom Annex VII Table B** exemption & decay-in-storage hold-time solver (`VTEST-62`), and one-click TU Delft Level 4A cross-module scenarios.
   - **CBRN & Defense Field Suite:** Kingery-Bulmash blast/thermal/prompt-radiation effects, Way-Wigner fallout shelter sizing, Chamberlain wet/dry plume depletion, `1/r²` Levenberg-Marquardt multilateration, NATO `STANAG 2083` Operational Exposure Guidance, and Cursor-on-Target (CoT / ATAK) XML & KML exports.
3. **Disconnected & Air-Gapped Readiness:**
   Runs locally in any modern browser without external APIs or user tracking. Background service worker caching preloads all module chunks, KaTeX fonts, and datasets (`precache-manifest.json`), with high-contrast **Standard**, **Tactical HUD**, and **Night-Vision Red** visual modes.

---

## 3. Suggested Publication Angles

### Track A — Defense Magazine Feature (*Operational CBRN & Sovereign Edge Readiness*)
- **Working Title:** *"Zero-Connectivity CBRN Decision Support: Bringing 70/70 V&V Radiological Physics to the Disconnected Tactical Edge"*
- **Narrative Arc:**
  1. Why cloud-tethered emergency software fails in contested/RF-denied environments and why narrow-beam "rule-of-thumb" calculators under-predict broad-beam scatter and prompt fallout hazards.
  2. Architecture of an offline deterministic PWA: 56 audited TypeScript kernels, client-side Web Worker Monte Carlo photon transport (`Pb`/`W` K-edge physics), and ATAK/WinTAK Cursor-on-Target export.
  3. Built-in verification discipline: running IEEE 754 precision & NQA-1/ISO 17025 benchmark checks on the tactical tablet in ~1 second before relying on cordon or stay-time numbers.

### Track B — TU Delft / Radiation Protection Peer Note (*Level 4A Pedagogy & NL Bbs Traceability*)
- **Working Title:** *"Interactive Verification of ANVS Bbs $Re_{\text{inh}}$ Lab Limits, Bijlage 3 Exemptions, and Coupled Decay-Shielding Workflows"*
- **Narrative Arc:**
  1. Connecting Level 4A statutory coursework (*Radiotoxische equivalenten* $Re_{\text{inh}}$, Bijlage 3 *vrijstellingsgrenzen*, decay-in-storage hold times, ICRP-119 `F/M/S` inhalation classes, and ADR Class 7 Transport Index) into one continuous multi-module pipeline.
  2. Eliminating opaque black-box steps: every module exposes step-by-step KaTeX derivations, ISO/IEC Guide 98-3 (GUM $k=2$) uncertainty framing, and printable SHA-256 decision-support dossiers.

---

## 4. Press-Kit Figure Guide (`docs/screenshots/`)

| Figure | File | Suggested Caption |
| :--- | :--- | :--- |
| **Fig. 1** | [`01-entry-console.png`](screenshots/01-entry-console.png) | **Entry Console:** Local SHA-256 authentication gateway and external peer-review demo entry displaying suite scorecard (`35` modules, `56` kernels, `70/70` V&V, `7` statutory regimes) under the default Netherlands ANVS / Bbs baseline. |
| **Fig. 2** | [`02-decay-scrubber-karlsruhe.png`](screenshots/02-decay-scrubber-karlsruhe.png) | **Decay Kinetics & Karlsruhe Nuclide Chart (`/decay`):** Synchronized TR-BDF2 parent-daughter evolution (`Mo-99 → Tc-99m → Tc-99`), interactive timeline scrubber with live composition bar, bifurcating DAG topology, and Chart of the Nuclides. |
| **Fig. 3** | [`03-nl-bbs-level4a-lab.png`](screenshots/03-nl-bbs-level4a-lab.png) | **Netherlands ANVS / Bbs Laboratory Classification (`/reg`):** Live inhalation radiotoxicity equivalent (`Re_inh`) D/C/B-Laboratory classifier paired with Bbs Bijlage 3 / EU Euratom Annex VII exemption ratios and decay-in-storage hold-time kinetics. |
| **Fig. 4** | [`04-worker-3d-alara.png`](screenshots/04-worker-3d-alara.png) | **3D Worker ALARA Workspace (`/worker`):** Real-time WebGL room dose superposition incorporating point-source inverse-square fields, oblique barrier attenuation, anatomical dosimeter nodes ($H_p(3), H_p(10), H_p(0.07)$), and shift stay-time alerts. |
| **Fig. 5** | [`05-atmospheric-plume.png`](screenshots/05-atmospheric-plume.png) | **Atmospheric Gaussian Dispersion (`/plume`):** Ground-level downwind concentration footprint with Briggs rural dispersion, Turner planetary boundary layer capping-inversion reflection, and wet/dry Chamberlain depletion controls. |
| **Fig. 6** | [`06-verification-matrix.png`](screenshots/06-verification-matrix.png) | **Automated V&V Engine (`/verify`):** Live browser execution of all `62` analytical benchmark vectors (`VTEST-01`–`62`, $\delta_{\max} = 0.0464\%$) and `8` boundary stress tests directly against production solvers. |

---

## 5. Peer-Review Evaluation Instructions

Reviewers can evaluate RadPro Analyst either via the hosted static build (`https://travisrcarlson.github.io/rad-pro-calc/` once Pages is active) or locally with Node.js 22:

```bash
git clone https://github.com/travisrcarlson/rad-pro-calc.git
cd rad-pro-calc
npm install
npm test        # Reproduces the 70/70 V&V suite (~1 s)
npm run dev     # Starts local workstation; click "Open Peer-Review / Demo Session"
```

*Scope Note: RadPro Analyst is an analytical decision-support and verification aid; statutory licensing, emergency protective actions, and clinical applications remain the responsibility of an accredited radiation protection expert (NL SBD / RSO / CHP).*
