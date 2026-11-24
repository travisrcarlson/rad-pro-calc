import React, { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import VerificationBadge from '../../components/VerificationBadge';
import {
  XCOM_GP_MATERIALS,
  evaluateXCOMAttenuation,
  getMaterialNeutronRemoval
} from '../../utils/xcomAndGpBuildup';

import { METHOD_DOCS, type DomainCategory, type ViewTab, type MethodDoc } from '../../data/methodDocsData';
export { METHOD_DOCS, type DomainCategory, type ViewTab, type MethodDoc };

const DOMAINS: DomainCategory[] = [
  'All Domains',
  'Dose, Transport & Shielding',
  'Nuclear Kinetics & Reactivity',
  'Non-Ionizing EMR & Lasers',
  'Spectroscopy & Radiation Detection',
  'Internal Dosimetry & Biokinetics',
  'Environmental Dispersion & Response',
  'Regulatory Standards & Transport Security',
  'Medical & Advanced Expansion'
];

const ICRP74_PHOTON_H10_TABLE: [number, number][] = [
  // [E_MeV, h*(10) in pSv·cm²] per ICRP Publication 74 / 116
  [0.015, 0.83],
  [0.020, 1.05],
  [0.030, 0.81],
  [0.040, 0.64],
  [0.050, 0.55],
  [0.060, 0.51],
  [0.080, 0.53],
  [0.100, 0.61],
  [0.150, 0.89],
  [0.200, 1.20],
  [0.300, 1.80],
  [0.400, 2.38],
  [0.500, 2.93],
  [0.600, 3.44],
  [0.662, 3.75],
  [0.800, 4.38],
  [1.000, 5.20],
  [1.250, 6.12],
  [1.500, 6.90],
  [2.000, 8.60],
  [3.000, 11.1],
  [4.000, 13.4],
  [6.000, 17.6],
  [8.000, 21.6],
  [10.00, 25.6]
];

const ICRP74_NEUTRON_H10_TABLE: [number, number][] = [
  // [E_MeV, h*(10) in pSv·cm²] per ICRP Publication 74 / 116
  [2.5e-8, 10.6], // Thermal (0.025 eV)
  [1.0e-6, 12.9], // 1 eV epithermal
  [1.0e-4, 10.4], // 100 eV
  [0.001, 9.9],   // 1 keV
  [0.010, 10.5],  // 10 keV
  [0.020, 16.6],  // 20 keV
  [0.050, 41.1],  // 50 keV
  [0.100, 88.0],  // 100 keV
  [0.200, 170.0], // 200 keV
  [0.500, 322.0], // 500 keV
  [1.000, 416.0], // 1 MeV fission peak
  [2.000, 420.0], // 2 MeV (Cf-252 avg)
  [4.500, 408.0], // 4.5 MeV (Am-Be avg)
  [5.000, 405.0],
  [10.00, 440.0],
  [14.10, 520.0], // 14.1 MeV D-T fusion
  [20.00, 600.0]
];

function interpolateFluenceCoeff(table: [number, number][], energyMev: number): number {
  const e = Math.max(table[0][0], Math.min(table[table.length - 1][0], energyMev));
  let idx = 0;
  while (idx < table.length - 2 && table[idx + 1][0] < e) idx++;
  const [e0, h0] = table[idx];
  const [e1, h1] = table[Math.min(table.length - 1, idx + 1)];
  if (e1 <= e0) return h0;
  const f = (Math.log(e) - Math.log(e0)) / (Math.log(e1) - Math.log(e0));
  return Math.exp(Math.log(h0) + Math.max(0, Math.min(1, f)) * (Math.log(h1) - Math.log(h0)));
}

function evaluateNeutronWr(energyMev: number): number {
  const e = Math.max(1e-9, energyMev);
  if (e < 1.0) {
    return 2.5 + 18.2 * Math.exp(-Math.pow(Math.log(e), 2) / 6.0);
  }
  if (e <= 50.0) {
    return 5.0 + 17.0 * Math.exp(-Math.pow(Math.log(2.0 * e), 2) / 6.0);
  }
  return 2.5 + 3.25 * Math.exp(-Math.pow(Math.log(0.04 * e), 2) / 6.0);
}

const LiteratureModule: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<DomainCategory>('All Domains');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('current');
  const [activeDocId, setActiveDocId] = useState<string>(METHOD_DOCS[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Reference Calculators state (in 'constants' tab)
  const [refActivityGBq, setRefActivityGBq] = useState<number>(37.0); // 1 Ci default
  const [refDoseMSv, setRefDoseMSv] = useState<number>(20.0); // 2 rem default
  const [refExposureR, setRefExposureR] = useState<number>(1.0); // 1 R default
  const [refParticleType, setRefParticleType] = useState<'photon' | 'neutron'>('photon');
  const [refParticleEnergyMev, setRefParticleEnergyMev] = useState<number>(0.662);
  const [refFluenceRateCm2S, setRefFluenceRateCm2S] = useState<number>(10000);
  const [refXcomEnergyMev, setRefXcomEnergyMev] = useState<number>(1.25);

  const handleCopyLatex = (tex: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(tex);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  // Filter documents based on domain, search query, and active tab
  const filteredDocs = useMemo(() => {
    return METHOD_DOCS.filter((doc) => {
      // Tab filter
      if (activeTab === 'current' && doc.isExpansion) return false;
      if (activeTab === 'expansion' && !doc.isExpansion) return false;
      if (activeTab === 'derivations' && (!doc.derivationSteps || doc.derivationSteps.length === 0)) return false;

      // Domain filter
      const matchesDomain = selectedDomain === 'All Domains' || doc.domain === selectedDomain;

      // Search query filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(q) ||
        doc.moduleName.toLowerCase().includes(q) ||
        doc.moduleId.toLowerCase().includes(q) ||
        doc.overview.toLowerCase().includes(q) ||
        doc.standards.some((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q));

      return matchesDomain && matchesSearch;
    });
  }, [selectedDomain, searchQuery, activeTab]);

  // Currently active selected document
  const activeDoc = useMemo(() => {
    const found = filteredDocs.find((d) => d.id === activeDocId);
    return found || filteredDocs[0] || METHOD_DOCS[0];
  }, [filteredDocs, activeDocId]);

  return (
    <div className="literature-module">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0' }}>📚 Module 35 — Core Literature, Physics Formulations, Reference Calculators &amp; Standards</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Comprehensive peer-reviewed scientific methodology compendium documenting the governing mathematical equations, analytical derivations, interactive reference calculators, and international regulatory standards across all active and expansion modules.
          </p>
        </div>
        <VerificationBadge testId="VTEST-01" label="50/50 Benchmarks Indexed" />
      </div>

      {/* Main Mode View Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '20px', gap: '5px', flexWrap: 'wrap' }}>
        <button
          className={`nav-link ${activeTab === 'current' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'current' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'current' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'current' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('current')}
        >
          🔬 Active Validated Modules (1–35)
        </button>
        <button
          className={`nav-link ${activeTab === 'derivations' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'derivations' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'derivations' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'derivations' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('derivations')}
        >
          📐 Analytical Derivations &amp; Proofs
        </button>
        <button
          className={`nav-link ${activeTab === 'expansion' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'expansion' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'expansion' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'expansion' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('expansion')}
        >
          🚀 Research &amp; Expansion Specs (36–40)
        </button>
        <button
          className={`nav-link ${activeTab === 'constants' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'constants' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'constants' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'constants' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('constants')}
        >
          🧮 Constants, ICRP 103 Weights &amp; Conversions
        </button>
        <button
          className={`nav-link ${activeTab === 'standards' ? 'active' : ''}`}
          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '10px 18px', borderBottom: activeTab === 'standards' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'standards' ? '#00e5ff' : 'var(--color-text-muted)', fontWeight: activeTab === 'standards' ? 'bold' : 'normal' }}
          onClick={() => setActiveTab('standards')}
        >
          🏛️ Standards Registry &amp; Bibliography
        </button>
      </div>

      {/* Domain Navigation & Search Controls (for methodology views) */}
      {activeTab !== 'standards' && activeTab !== 'constants' && (
        <div className="panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DOMAINS.map((dom) => (
                <button
                  key={dom}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '5px 12px',
                    background: selectedDomain === dom ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                    color: selectedDomain === dom ? '#000' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    fontWeight: selectedDomain === dom ? 'bold' : 'normal'
                  }}
                  onClick={() => setSelectedDomain(dom)}
                >
                  {dom}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div style={{ minWidth: '260px' }}>
              <input
                type="text"
                placeholder="🔍 Search equations, standards, variables..."
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Module Document Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            {filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(22, 36, 56, 0.8)',
                    color: isSelected ? '#00e5ff' : '#fff',
                    border: `1px solid ${isSelected ? '#00e5ff' : 'var(--color-border)'}`
                  }}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <strong>{doc.moduleId}:</strong> {doc.moduleName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Methodology View */}
      {activeTab !== 'standards' && activeTab !== 'constants' && activeDoc && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '25px' }}>
          {/* Main Equation & Theory Panel */}
          <div className="panel" style={{ flex: '2 1 650px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  {activeDoc.moduleId} — {activeDoc.domain}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: activeDoc.isExpansion ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 229, 255, 0.1)', color: activeDoc.isExpansion ? '#f59e0b' : 'var(--color-primary)', borderRadius: '4px', border: `1px solid ${activeDoc.isExpansion ? '#f59e0b' : 'rgba(0,229,255,0.3)'}` }}>
                  {activeDoc.isExpansion ? 'Expansion Specification' : 'Peer-Reviewed Reference Formulation'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#fff' }}>{activeDoc.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>{activeDoc.overview}</p>
            </div>

            {/* Primary Governing Equation Box */}
            <div style={{ padding: '20px', background: 'rgba(3, 7, 18, 0.75)', border: '1px solid var(--color-primary)', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  Primary Mathematical Formulation
                </div>
                <button
                  onClick={() => handleCopyLatex(activeDoc.primaryFormula, `${activeDoc.id}-primary`)}
                  style={{ fontSize: '0.72rem', padding: '3px 9px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: '4px', cursor: 'pointer' }}
                  title="Copy raw LaTeX equation to clipboard"
                >
                  {copiedKey === `${activeDoc.id}-primary` ? '✓ Copied LaTeX' : '📋 Copy LaTeX'}
                </button>
              </div>
              <div style={{ fontSize: '1.3rem', color: '#fff', margin: '10px 0', overflowX: 'auto' }}>
                <BlockMath math={activeDoc.primaryFormula} />
              </div>
            </div>

            {/* Step-by-Step Analytical Derivation */}
            {activeDoc.derivationSteps && activeDoc.derivationSteps.length > 0 && (
              <div style={{ background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  📐 Step-by-Step Analytical Derivation &amp; Proof
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeDoc.derivationSteps.map((step, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'rgba(3, 7, 18, 0.6)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{step.stepTitle}</strong>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '4px 0 8px 0' }}>{step.explanation}</p>
                      <div style={{ fontSize: '1.05rem', color: '#00e5ff', overflowX: 'auto' }}>
                        <BlockMath math={step.math} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auxiliary Formulations */}
            {activeDoc.secondaryFormulas && activeDoc.secondaryFormulas.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Auxiliary &amp; Governing Sub-Equations
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                  {activeDoc.secondaryFormulas.map((sub, idx) => (
                    <div key={idx} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>
                          {sub.label}
                        </span>
                        <button
                          onClick={() => handleCopyLatex(sub.formula, `${activeDoc.id}-sub-${idx}`)}
                          style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                          title="Copy sub-equation LaTeX"
                        >
                          {copiedKey === `${activeDoc.id}-sub-${idx}` ? '✓' : 'LaTeX'}
                        </button>
                      </div>
                      <div style={{ fontSize: '1rem', color: '#fff', overflowX: 'auto' }}>
                        <BlockMath math={sub.formula} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variable Nomenclature Table */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Symbol Nomenclature &amp; Units
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', width: '20%' }}>Variable</th>
                      <th style={{ padding: '8px', textAlign: 'left', width: '55%' }}>Physical Description</th>
                      <th style={{ padding: '8px', textAlign: 'left', width: '25%' }}>SI / Standard Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDoc.variables.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#00E5FF' }}>
                          <InlineMath math={v.symbol} />
                        </td>
                        <td style={{ padding: '8px', color: '#fff' }}>{v.description}</td>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{v.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Standards & Boundaries Sidebar */}
          <div className="panel" style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Regulatory Codes &amp; Standards</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeDoc.standards.map((s, idx) => (
                <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>{s.org} {s.code}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.year}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fff' }}>{s.title}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Physical Assumptions &amp; Validity
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeDoc.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Analytical Benchmark
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', lineHeight: '1.4' }}>
                {activeDoc.benchmarks}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fundamental Constants, ICRP 103 Weighting Factors & Unit Conversions Reference Tab */}
      {activeTab === 'constants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            {/* CODATA Physical & Radiological Constants */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>⚛️ Fundamental Physical &amp; Radiological Constants (CODATA / ICRU)</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Exact and consensus physical constants embedded across the RadPro Analyst calculation engines.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Constant Name</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Adopted Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="c" /></td>
                    <td style={{ padding: '7px 8px' }}>Speed of light in vacuum</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.99792458 × 10⁸ m/s</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="m_e c^2" /></td>
                    <td style={{ padding: '7px 8px' }}>Electron rest-mass energy</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.51099895 MeV (511.0 keV)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="m_n c^2" /></td>
                    <td style={{ padding: '7px 8px' }}>Neutron rest-mass energy</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>939.56542 MeV</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="r_0" /></td>
                    <td style={{ padding: '7px 8px' }}>Classical electron radius (<InlineMath math="e^2 / 4\pi\varepsilon_0 m_e c^2" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.81794032 × 10⁻¹⁵ m</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="\sigma_T" /></td>
                    <td style={{ padding: '7px 8px' }}>Thomson scattering cross-section (<InlineMath math="\frac{8}{3}\pi r_0^2" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.66524587 barns (6.652 × 10⁻²⁹ m²)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="\alpha" /></td>
                    <td style={{ padding: '7px 8px' }}>Fine-structure constant</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 / 137.035999 (7.29735 × 10⁻³)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="N_A" /></td>
                    <td style={{ padding: '7px 8px' }}>Avogadro constant</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>6.02214076 × 10²³ mol⁻¹</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="e" /></td>
                    <td style={{ padding: '7px 8px' }}>Elementary charge</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1.602176634 × 10⁻¹⁹ C</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="(W/e)_{\text{air}}" /></td>
                    <td style={{ padding: '7px 8px' }}>Mean energy per ion pair in dry air (ICRU 90)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>33.97 eV / ion pair (J/C)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="W_{\text{Ge}} / W_{\text{Si}}" /></td>
                    <td style={{ padding: '7px 8px' }}>Electron-hole pair creation energy (HPGe / Si)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>2.96 eV (Ge @ 77K) / 3.62 eV (Si)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="G(\text{H}_2)_{\gamma,\alpha}" /></td>
                    <td style={{ padding: '7px 8px' }}>Water radiolysis hydrogen yield (<InlineMath math="\gamma/\beta" /> vs <InlineMath math="\alpha" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.45 vs 1.6 molecules / 100 eV</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SI <-> Traditional Radiological Unit Conversions */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🔄 Exact SI ↔ Traditional Radiological Unit Conversions</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Statutory conversion factors linking SI radiological quantities to US/traditional health physics units.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>SI Unit</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Exact Conversion Identity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Activity (<InlineMath math="A" />)</td>
                    <td style={{ padding: '7px 8px' }}>Becquerel (<InlineMath math="\text{Bq} = \text{s}^{-1}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Ci = 3.7 × 10¹⁰ Bq = 37 GBq</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Absorbed Dose (<InlineMath math="D" />)</td>
                    <td style={{ padding: '7px 8px' }}>Gray (<InlineMath math="\text{Gy} = \text{J/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Gy = 100 rad | 1 rad = 10 mGy</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Equivalent / Effective Dose (<InlineMath math="H, E" />)</td>
                    <td style={{ padding: '7px 8px' }}>Sievert (<InlineMath math="\text{Sv} = \text{J/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 Sv = 100 rem | 1 mSv = 100 mrem</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Exposure (<InlineMath math="X" />)</td>
                    <td style={{ padding: '7px 8px' }}>Coulomb/kg (<InlineMath math="\text{C/kg}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 R = 2.58 × 10⁻⁴ C/kg (dry air)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Exposure → Air Kerma (<InlineMath math="K_{\text{air}}" />)</td>
                    <td style={{ padding: '7px 8px' }}>Gy per Roentgen</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 R ≈ 0.00877 Gy (air) ≈ 0.0096 Gy (tissue)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Radon Concentration / PAEC</td>
                    <td style={{ padding: '7px 8px' }}><InlineMath math="\text{Bq/m}^3" /> / <InlineMath math="\text{WL}" /></td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 pCi/L = 37 Bq/m³ | 1 WL = 2.08 × 10⁻⁵ J/m³</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Reactivity (<InlineMath math="\rho" />)</td>
                    <td style={{ padding: '7px 8px' }}><InlineMath math="\Delta k / k" /></td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 pcm = 10⁻⁵ Δk/k | 1 $ = β_eff (≈ 650 pcm U-235)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Microscopic Cross-Section (<InlineMath math="\sigma" />)</td>
                    <td style={{ padding: '7px 8px' }}>Barn (<InlineMath math="\text{b}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 barn = 10⁻²⁴ cm² = 10⁻²⁸ m²</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Explosive Yield (<InlineMath math="W" />)</td>
                    <td style={{ padding: '7px 8px' }}>Kiloton TNT (<InlineMath math="\text{kt}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 kt TNT = 4.184 × 10¹² J ≈ 1.45 × 10²³ fissions</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Blast Overpressure (<InlineMath math="\Delta P" />)</td>
                    <td style={{ padding: '7px 8px' }}>Kilopascal (<InlineMath math="\text{kPa}" />)</td>
                    <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>1 psi = 6.89476 kPa | 1 atm = 101.325 kPa</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ICRP Publication 103 Radiation & Tissue Weighting Factors */}
          <div className="panel">
            <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🛡️ ICRP Publication 103 (2007) Radiation (<InlineMath math="w_R" />) &amp; Tissue (<InlineMath math="w_T" />) Weighting Factors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginTop: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Table 2: Radiation Weighting Factors (<InlineMath math="H_T = \sum_R w_R D_{T,R}" />)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Radiation Type</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Weighting Factor <InlineMath math="w_R" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Photons (X-rays, <InlineMath math="\gamma" />-rays, bremsstrahlung, all energies)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>1.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Electrons (<InlineMath math="\beta^\pm" />, Auger, internal conversion) and Muons</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>1.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Protons and charged pions</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>2.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Alpha particles (<InlineMath math="\alpha" />), fission fragments, heavy ions</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#f59e0b' }}>20.0</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="E_n < 1\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="2.5 + 18.2\exp\!\left[-(\ln E_n)^2 / 6\right]" /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="1\text{ MeV} \le E_n \le 50\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="5.0 + 17.0\exp\!\left[-(\ln(2E_n))^2 / 6\right]" /></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Neutrons (<InlineMath math="E_n > 50\text{ MeV}" />)</td>
                      <td style={{ padding: '7px 8px', color: '#00e5ff' }}><InlineMath math="2.5 + 3.25\exp\!\left[-(\ln(0.04E_n))^2 / 6\right]" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Table 3: Tissue Weighting Factors (<InlineMath math="E = \sum_T w_T H_T,\; \sum w_T = 1.00" />)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Organ / Tissue Group</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}><InlineMath math="w_T" /></th>
                      <th style={{ padding: '8px', textAlign: 'left' }}><InlineMath math="\sum w_T" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Red bone-marrow, Colon, Lung, Stomach, Breast, Remainder tissues (13 organs)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.12</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.72</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Gonads (heritable stochastic risk)</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.08</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.08</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Bladder, Oesophagus, Liver, Thyroid</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.04</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.16</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '7px 8px' }}>Bone surface, Brain, Salivary glands, Skin</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff' }}>0.01</td>
                      <td style={{ padding: '7px 8px', fontFamily: 'monospace' }}>0.04</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(0, 229, 255, 0.05)' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold' }}>Total Whole-Body Effective Dose Normalization</td>
                      <td style={{ padding: '7px 8px' }}>—</td>
                      <td style={{ padding: '7px 8px', fontWeight: 'bold', color: '#00e5ff', fontFamily: 'monospace' }}>1.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Interactive Reference Calculators: Unit Converter & ICRP 74/116 Fluence-to-Dose h*(10) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            {/* Live Bidirectional SI <-> Traditional Unit Solver */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>⚡ Live SI ↔ Traditional Radiological Unit Solver</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Instant bidirectional conversion across Activity, Dose Equivalent, and Ionization Exposure quantities.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Activity Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    1. Activity: GBq ↔ Ci / MBq / mCi / dpm
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Activity (GBq):</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
                        value={refActivityGBq}
                        onChange={e => setRefActivityGBq(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Activity (Curies, Ci):</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={Number((refActivityGBq / 37.0).toPrecision(5))}
                        onChange={e => setRefActivityGBq(Math.max(0, (parseFloat(e.target.value) || 0) * 37.0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.76rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    <span>{(refActivityGBq * 1000).toLocaleString()} MBq</span>
                    <span>{((refActivityGBq / 37.0) * 1000).toFixed(2)} mCi</span>
                    <span>{(refActivityGBq * 1e9 * 60).toExponential(2)} dpm</span>
                  </div>
                </div>

                {/* Dose Equivalent Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    2. Equivalent / Effective Dose: mSv ↔ rem / mrem / µSv
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dose (mSv):</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
                        value={refDoseMSv}
                        onChange={e => setRefDoseMSv(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dose (mrem):</label>
                      <input
                        type="number"
                        step="10"
                        className="form-control"
                        value={Number((refDoseMSv * 100.0).toPrecision(6))}
                        onChange={e => setRefDoseMSv(Math.max(0, (parseFloat(e.target.value) || 0) / 100.0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.76rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    <span>{(refDoseMSv / 1000).toFixed(4)} Sv</span>
                    <span>{(refDoseMSv / 10).toFixed(3)} rem</span>
                    <span>{(refDoseMSv * 1000).toLocaleString()} µSv</span>
                  </div>
                </div>

                {/* Exposure to Air Kerma Row */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '6px' }}>
                    3. Exposure (Roentgen, R) → Dry Air Kerma &amp; Soft Tissue Dose
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Exposure (R):</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control"
                        value={refExposureR}
                        onChange={e => setRefExposureR(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.77rem', fontFamily: 'monospace', color: '#e2e8f0' }}>
                      <span>Ion Charge: {(refExposureR * 2.58e-4).toExponential(3)} C/kg</span>
                      <span>Air Kerma K<sub>air</sub>: {(refExposureR * 8.77).toFixed(2)} mGy ({(refExposureR * 0.877).toFixed(3)} rad)</span>
                      <span>Soft Tissue D<sub>tissue</sub>: {(refExposureR * 9.60).toFixed(2)} mGy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ICRP Publication 74 / 116 Fluence-to-Dose h*(10) Calculator */}
            <div className="panel">
              <h3 style={{ marginTop: 0, color: '#00e5ff' }}>🎯 ICRP 74 / 116 Fluence-to-Dose Conversion (<InlineMath math="\Phi \to \dot{H}^*(10)" />)</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginBottom: '12px' }}>
                Computes ambient dose equivalent rate <InlineMath math="\dot{H}^*(10) = \phi \cdot h^*(10)" /> from monoenergetic photon or neutron particle flux.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Particle Modality:</label>
                  <select
                    className="form-control"
                    value={refParticleType}
                    onChange={e => setRefParticleType(e.target.value as 'photon' | 'neutron')}
                    style={{ fontSize: '0.84rem' }}
                  >
                    <option value="photon">Photons (γ / X-ray)</option>
                    <option value="neutron">Neutrons (Thermal–20 MeV)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Energy E (MeV):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.000000025"
                    max="20"
                    className="form-control"
                    value={refParticleEnergyMev}
                    onChange={e => setRefParticleEnergyMev(Math.max(2.5e-8, parseFloat(e.target.value) || 0.1))}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Flux φ (particles/cm²·s):</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    className="form-control"
                    value={refFluenceRateCm2S}
                    onChange={e => setRefFluenceRateCm2S(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {refParticleType === 'photon' ? (
                  <>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.0595)}>Am-241 (59.5 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.1405)}>Tc-99m (140 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(0.6617)}>Cs-137 (662 keV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(1.25)}>Co-60 (1.25 MeV)</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(2.5e-8)}>Thermal (0.025 eV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(1.0)}>Fission Peak (1 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(2.1)}>Cf-252 Avg (2.1 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(4.5)}>Am-Be Avg (4.5 MeV)</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => setRefParticleEnergyMev(14.1)}>D-T Fusion (14.1 MeV)</button>
                  </>
                )}
              </div>

              {(() => {
                const h10pSvCm2 = refParticleType === 'photon'
                  ? interpolateFluenceCoeff(ICRP74_PHOTON_H10_TABLE, refParticleEnergyMev)
                  : interpolateFluenceCoeff(ICRP74_NEUTRON_H10_TABLE, refParticleEnergyMev);
                // φ (cm^-2 s^-1) * h*(10) (10^-12 Sv cm^2) * 3600 (s/h) * 10^6 (µSv/Sv) = φ * h10 * 3.6e-3 µSv/h
                const doseRateUSvHr = refFluenceRateCm2S * h10pSvCm2 * 0.0036;
                const wrVal = refParticleType === 'neutron' ? evaluateNeutronWr(refParticleEnergyMev) : 1.0;

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Coeff. h*(10)</span>
                      <strong style={{ color: '#00e5ff', fontSize: '1rem', fontFamily: 'monospace' }}>{h10pSvCm2.toFixed(2)} pSv·cm²</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>ICRP 103 w<sub>R</sub>(E)</span>
                      <strong style={{ color: '#f59e0b', fontSize: '1rem', fontFamily: 'monospace' }}>{wrVal.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Ambient Rate Ḣ*(10)</span>
                      <strong style={{ color: '#10b981', fontSize: '1rem', fontFamily: 'monospace' }}>
                        {doseRateUSvHr >= 1000 ? `${(doseRateUSvHr / 1000).toFixed(2)} mSv/h` : `${doseRateUSvHr.toFixed(2)} µSv/h`}
                      </strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                        ({(doseRateUSvHr / 10.0).toFixed(2)} mrem/h)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 15-Material NIST XCOM + Fast Neutron Removal (Σ_R) Reference Matrix */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#00e5ff' }}>🧱 15-Material NIST XCOM Photon Attenuation &amp; Fast Neutron Removal (<InlineMath math="\Sigma_R" />) Matrix</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                  Live lookup of <InlineMath math="\mu/\rho" />, <InlineMath math="\mu_{\text{en}}/\rho" />, <InlineMath math="\text{HVL}_\gamma" />, <InlineMath math="\text{TVL}_\gamma" />, and Albert-Welton fast neutron removal <InlineMath math="\Sigma_R" /> across all 15 shielding media.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lookup Photon Energy (MeV):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.010"
                  max="15.0"
                  className="form-control"
                  value={refXcomEnergyMev}
                  onChange={e => setRefXcomEnergyMev(Math.max(0.010, Math.min(15.0, parseFloat(e.target.value) || 1.0)))}
                  style={{ width: '110px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Shielding Material</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Z<sub>eff</sub></th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&rho; (g/cm³)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&mu;/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>&mu;<sub>en</sub>/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>HVL<sub>&gamma;</sub> (cm)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>TVL<sub>&gamma;</sub> (cm)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>&Sigma;<sub>R</sub>/&rho; (cm²/g)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>&Sigma;<sub>R</sub> (cm⁻¹)</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#c084fc' }}>HVL<sub>n</sub> (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(XCOM_GP_MATERIALS).map(([key, mat]) => {
                    const xcom = evaluateXCOMAttenuation(key, refXcomEnergyMev);
                    const nSpec = getMaterialNeutronRemoval(key);
                    const hvlG = Math.LN2 / xcom.muLinear;
                    const tvlG = Math.LN10 / xcom.muLinear;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: '#fff' }}>{mat.name}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{mat.effectiveZ}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{mat.density.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#00e5ff' }}>{xcom.muMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{xcom.muEnMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>{hvlG.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{tvlG.toFixed(2)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#d8b4fe' }}>{nSpec.sigmaRMass.toFixed(4)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>{nSpec.sigmaRLinear.toFixed(3)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e9d5ff' }}>{nSpec.hvlNeutronCm.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Master Peer-Reviewed Bibliography & Standards Register (Full View or Tab) */}
      {(activeTab === 'standards' || activeTab === 'current') && (
        <div className="panel" style={{ marginTop: activeTab === 'current' ? '15px' : '0' }}>
          <h3>Master Scientific Bibliography &amp; International Standards Register</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            The mathematical and physical models in RadPro Analyst are implemented and benchmarked against the following international regulatory authorities, technical consensus reports, and academic treatises.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Standard / Citation</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Governing Body</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Year</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Title / Publication Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Implemented Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ICRP Publication 107</td>
                  <td style={{ padding: '10px' }}>ICRP</td>
                  <td style={{ padding: '10px' }}>2008</td>
                  <td style={{ padding: '10px' }}>Nuclear Decay Data for Dosimetric Calculations</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decay schemes, half-lives, transition energies, and branching fractions for 1,252 radionuclides.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ICRP Publication 103</td>
                  <td style={{ padding: '10px' }}>ICRP</td>
                  <td style={{ padding: '10px' }}>2007</td>
                  <td style={{ padding: '10px' }}>The 2007 Recommendations of the International Commission on Radiological Protection</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>System of radiological protection, occupational and public dose limits, w_R(E_n) and tissue weighting factors w_T.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA SSR-6 (Rev. 1)</td>
                  <td style={{ padding: '10px' }}>IAEA</td>
                  <td style={{ padding: '10px' }}>2018</td>
                  <td style={{ padding: '10px' }}>Regulations for the Safe Transport of Radioactive Material</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>A₁/A₂ package activity limits, Transport Index (TI), and Type Excepted/A/B shipping criteria.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>AAPM TG-43U1</td>
                  <td style={{ padding: '10px' }}>AAPM</td>
                  <td style={{ padding: '10px' }}>2004</td>
                  <td style={{ padding: '10px' }}>Update of AAPM Task Group No. 43 Report on Brachytherapy Dosimetry</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Air-kerma strength S_K, dose-rate constant Λ, radial dose function g(r), and 2D anisotropy F(r,θ).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MARSSIM (NUREG-1575)</td>
                  <td style={{ padding: '10px' }}>NRC / EPA / DOE / DOD</td>
                  <td style={{ padding: '10px' }}>2000</td>
                  <td style={{ padding: '10px' }}>Multi-Agency Radiation Survey and Site Investigation Manual (Rev. 1)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nonparametric statistical testing (WRS &amp; Sign), Currie detection limits (MDA/MDC), and site release surveys.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO 11929-1:2019</td>
                  <td style={{ padding: '10px' }}>ISO</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Determination of Characteristic Limits for Ionizing Radiation Measurements</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decision threshold, detection limit, and limits of the coverage interval for counting measurements.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI/ANS-8.1-2014</td>
                  <td style={{ padding: '10px' }}>ANS / ANSI</td>
                  <td style={{ padding: '10px' }}>2014</td>
                  <td style={{ padding: '10px' }}>Nuclear Criticality Safety in Operations with Fissionable Materials Outside Reactors</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Subcritical mass, volume, and dimension limits for U-235, Pu-239, and U-233 systems.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC 10 CFR 61</td>
                  <td style={{ padding: '10px' }}>US NRC</td>
                  <td style={{ padding: '10px' }}>2023</td>
                  <td style={{ padding: '10px' }}>Licensing Requirements for Land Disposal of Radioactive Waste (§ 61.55)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Low-level radioactive waste classification (Class A, B, C, GTCC) and Sum of Fractions rule.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI Z136.1-2022</td>
                  <td style={{ padding: '10px' }}>LIA / ANSI</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>American National Standard for Safe Use of Lasers</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Wavelength-dependent ocular Maximum Permissible Exposure (MPE), NOHD, and optical density (OD).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FCC OET Bulletin 65</td>
                  <td style={{ padding: '10px' }}>US FCC</td>
                  <td style={{ padding: '10px' }}>1997</td>
                  <td style={{ padding: '10px' }}>Evaluating Compliance with FCC Guidelines for Human Exposure to Radiofrequency Fields</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Near-field / far-field microwave power density limits, uncontrolled vs controlled exposure boundaries.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IEEE C95.1-2019</td>
                  <td style={{ padding: '10px' }}>IEEE / ICES</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Standard for Safety Levels with Respect to Human Exposure to Electromagnetic Fields</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Permissible exposure limits (PEL) for radiofrequency and microwave radiation from 0 kHz to 300 GHz.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NIST XCOM (SRD 8)</td>
                  <td style={{ padding: '10px' }}>NIST</td>
                  <td style={{ padding: '10px' }}>2010</td>
                  <td style={{ padding: '10px' }}>Photon Cross Sections Database (Berger, Hubbell, Seltzer)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Mass attenuation coefficients (μ/ρ) for elements Z=1 to 100 from 1 keV to 100 GeV.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC 10 CFR 20</td>
                  <td style={{ padding: '10px' }}>US NRC</td>
                  <td style={{ padding: '10px' }}>2023</td>
                  <td style={{ padding: '10px' }}>Title 10, Code of Federal Regulations, Part 20</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Statutory occupational dose limits (50 mSv TEDE, 150 mSv LDE, 500 mSv SDE) and ALARA programs.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US NRC Reg Guide 1.145</td>
                  <td style={{ padding: '10px' }}>US NRC</td>
                  <td style={{ padding: '10px' }}>1983</td>
                  <td style={{ padding: '10px' }}>Atmospheric Dispersion Models for Potential Accident Consequence Assessments</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Pasquill-Gifford Gaussian dispersion coefficients, plume rise, and ground-level concentration limits.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>US DOT ERG 2024</td>
                  <td style={{ padding: '10px' }}>US DOT / PHMSA</td>
                  <td style={{ padding: '10px' }}>2024</td>
                  <td style={{ padding: '10px' }}>Emergency Response Guidebook (Guide 163: Radioactive Materials)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Initial isolation perimeter cordons (100 m spill, 300 m fire/burst), hot/warm/cold zone boundaries.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>EPA PAG Manual</td>
                  <td style={{ padding: '10px' }}>US EPA</td>
                  <td style={{ padding: '10px' }}>2017</td>
                  <td style={{ padding: '10px' }}>Protective Action Guides and Planning Guidance for Radiological Incidents (EPA-400/R-17/001)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Emergency worker dose ceilings (50, 100, 250 mSv), turn-around thresholds, public relocation criteria.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>REAC/TS 4th Ed.</td>
                  <td style={{ padding: '10px' }}>ORAU / REAC/TS</td>
                  <td style={{ padding: '10px' }}>2021</td>
                  <td style={{ padding: '10px' }}>The Medical Basis for Radiation-Accident Preparedness: Medical Countermeasures</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decorporation pharmacokinetics: KI thyroid blocking, Prussian Blue Cs-137 chelation, Ca/Zn-DTPA actinide mobilization.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ASME BPVC Sec. V T-274.1</td>
                  <td style={{ padding: '10px' }}>ASME</td>
                  <td style={{ padding: '10px' }}>2023</td>
                  <td style={{ padding: '10px' }}>Boiler &amp; Pressure Vessel Code, Section V, Article 2, Table T-274.1</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Maximum geometric unsharpness (Ug) limits (0.51 mm to 1.78 mm) as function of weld thickness.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO 17636-1:2022</td>
                  <td style={{ padding: '10px' }}>ISO</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>Non-destructive testing of welds - Radiographic testing - Part 1: X- and gamma-ray techniques</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Geometric penumbra limits, minimum SID configurations, Class A and Class B radiographic testing techniques.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MCNP5 (LA-UR-03-1987)</td>
                  <td style={{ padding: '10px' }}>LANL</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>MCNP - A General Monte Carlo N-Particle Transport Code</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Photon stochastic transport micro-kernel, Kahn Klein-Nishina rejection sampling, Woodcock tracking.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Klein &amp; Nishina (1929)</td>
                  <td style={{ padding: '10px' }}>Z. Phys.</td>
                  <td style={{ padding: '10px' }}>1929</td>
                  <td style={{ padding: '10px' }}>Über die Streuung von Strahlung durch freie Elektronen nach der neuen relativistischen Quantendynamik von Dirac</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Quantum relativistic differential and total cross-section for Compton photon scattering off free electrons.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Currie Metrology (1968)</td>
                  <td style={{ padding: '10px' }}>Anal. Chem.</td>
                  <td style={{ padding: '10px' }}>1968</td>
                  <td style={{ padding: '10px' }}>Limits for Qualitative Detection and Quantitative Determination</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Decision threshold (Lc = 2.33*sqrt(B)), detection limit (Ld = 2.71 + 4.65*sqrt(B)), and MDA formulations.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA GSR Part 3</td>
                  <td style={{ padding: '10px' }}>IAEA</td>
                  <td style={{ padding: '10px' }}>2014</td>
                  <td style={{ padding: '10px' }}>Radiation Protection and Safety of Radiation Sources: International Basic Safety Standards</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Harmonized international dose constraints (20 mSv/yr 5-yr average, 20 mSv lens of eye limit).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>EURATOM 2013/59</td>
                  <td style={{ padding: '10px' }}>European Union</td>
                  <td style={{ padding: '10px' }}>2013</td>
                  <td style={{ padding: '10px' }}>Council Directive 2013/59/Euratom (Basic Safety Standards Directive)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>European statutory occupational dose framework, 1 mSv prenatal protection, 20 mSv/yr lens threshold.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NATO STANAG 2470</td>
                  <td style={{ padding: '10px' }}>NATO / Military</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>AMedP-7.1 Commander&apos;s Guide on Radiation Protection in Military Operations</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Military tactical Operational Exposure Guidance (OEG 1: 0.05 Gy, OEG 2: 0.25 Gy, OEG 3: 0.70 Gy).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>CNSC SOR/2000-203</td>
                  <td style={{ padding: '10px' }}>CNSC Canada</td>
                  <td style={{ padding: '10px' }}>2020</td>
                  <td style={{ padding: '10px' }}>Canadian Radiation Protection Regulations</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Nuclear Energy Worker (NEW) limits (100 mSv per 5-year period), pregnant NEW limits (4 mSv).</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA INES Manual</td>
                  <td style={{ padding: '10px' }}>IAEA / OECD-NEA</td>
                  <td style={{ padding: '10px' }}>2008</td>
                  <td style={{ padding: '10px' }}>The International Nuclear and Radiological Event Scale User&apos;s Manual</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>INES severity Levels 1 through 7, radiotoxicity equivalence multipliers normalized to Iodine-131.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FDA 21 CFR Part 11</td>
                  <td style={{ padding: '10px' }}>US FDA</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>Electronic Records; Electronic Signatures (Title 21 Code of Federal Regulations)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Computer-generated time-stamped audit trails, SHA-256 tamper-evident integrity verification.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ISO/IEC 17025:2017</td>
                  <td style={{ padding: '10px' }}>ISO / IEC</td>
                  <td style={{ padding: '10px' }}>2017</td>
                  <td style={{ padding: '10px' }}>General requirements for competence of testing and calibration laboratories (§ 7.11 Control of Data)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Data integrity validation, cryptographic traceability, software qualification criteria for radiological testing.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NCRP Report No. 165</td>
                  <td style={{ padding: '10px' }}>NCRP</td>
                  <td style={{ padding: '10px' }}>2010</td>
                  <td style={{ padding: '10px' }}>Responding to a Radiological or Nuclear Terrorism Incident: A Guide for Decision Makers</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Expedient shelter protection factors (PF), Way-Wigner decay modeling, and evacuation departure crossover timing.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FEMA Nuclear Guidance</td>
                  <td style={{ padding: '10px' }}>FEMA / DHS</td>
                  <td style={{ padding: '10px' }}>2022</td>
                  <td style={{ padding: '10px' }}>Nuclear Detonation Planning Guidance: Response and Recovery (2nd Edition)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Dangerous fallout zone boundaries, life-saving shelter-in-place protocols, and transit exposure minimizers.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA TRS-405</td>
                  <td style={{ padding: '10px' }}>IAEA</td>
                  <td style={{ padding: '10px' }}>2001</td>
                  <td style={{ padding: '10px' }}>Cytogenetic Analysis for Radiation Dose Assessment: A Manual</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Dicentric chromosome aberration calibration curves (linear-quadratic yield) and mass casualty biodosimetry triage.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Glasstone &amp; Dolan (1977)</td>
                  <td style={{ padding: '10px' }}>US DoD / ERDA</td>
                  <td style={{ padding: '10px' }}>1977</td>
                  <td style={{ padding: '10px' }}>The Effects of Nuclear Weapons (3rd Edition)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Blast overpressure scaling, Height-of-Burst Mach stem enhancement, thermal exposure, and prompt radiation flash.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>PNE-242F (Project Sedan)</td>
                  <td style={{ padding: '10px' }}>US AEC / Lawrence Livermore</td>
                  <td style={{ padding: '10px' }}>1962</td>
                  <td style={{ padding: '10px' }}>Project Sedan: 104 kt Thermonuclear Excavation Experiment (Nordyke Scaling)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Sub-surface Scaled Depth of Burst (SDOB), throwout crater radius, cavity camouflet containment, and venting fraction.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>Kingery-Bulmash (BRL-1972)</td>
                  <td style={{ padding: '10px' }}>US Army BRL</td>
                  <td style={{ padding: '10px' }}>1972</td>
                  <td style={{ padding: '10px' }}>Airblast Parameters from TNT Spherical Air Burst and Hemispherical Surface Burst (BRL Report 1341)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Polynomial scaled distance curves (Z = R / W^(1/3)) for peak incident overpressure and positive phase blast impulse.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MIL-STD-188-125-1</td>
                  <td style={{ padding: '10px' }}>US DoD</td>
                  <td style={{ padding: '10px' }}>2005</td>
                  <td style={{ padding: '10px' }}>High-Altitude Electromagnetic Pulse (HEMP) Protection for Ground-Based C4I Facilities</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>E1 fast prompt (2.5 ns rise, 50 kV/m), E2 intermediate scattered gamma, and E3 magnetohydrodynamic geomagnetically induced currents.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NCRP Report No. 166</td>
                  <td style={{ padding: '10px' }}>NCRP</td>
                  <td style={{ padding: '10px' }}>2010</td>
                  <td style={{ padding: '10px' }}>Population Monitoring and Radionuclide Decorporation Following a Radiological or Nuclear Incident</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Ca/Zn-DTPA chelation for actinides (Pu, Am, Cm), Prussian Blue for radiocesium, and urinary excretion biokinetics.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>ANSI/ANS-8.3-1997</td>
                  <td style={{ padding: '10px' }}>ANSI / ANS</td>
                  <td style={{ padding: '10px' }}>2003</td>
                  <td style={{ padding: '10px' }}>Criticality Accident Alarm System (CAAS)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>CAAS 20 rad/min at 2 meters trip criteria, Nordheim-Fuchs prompt excursion kinetics, and evacuation cordon radii.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>DoD CoT v2.0</td>
                  <td style={{ padding: '10px' }}>US DoD / MITRE</td>
                  <td style={{ padding: '10px' }}>2009</td>
                  <td style={{ padding: '10px' }}>Cursor-on-Target XML Schema and Mesh Protocol Specification</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Tactical machine-to-machine geospatial radiation telemetry (a-f-G-U-C-rad) and WinTAK/ATAK inter-agency sensor situational awareness.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>NUREG/CR-6673</td>
                  <td style={{ padding: '10px' }}>US NRC / ANL</td>
                  <td style={{ padding: '10px' }}>2000</td>
                  <td style={{ padding: '10px' }}>Hydrogen Generation in TRU Waste Transportation Packages</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Radiolytic G(H₂) water decomposition yields, headspace accumulation kinetics, and 4% Lower Flammability Limit (LFL) time-to-reach.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>FAA CARI-7A</td>
                  <td style={{ padding: '10px' }}>US FAA / CAMI</td>
                  <td style={{ padding: '10px' }}>2019</td>
                  <td style={{ padding: '10px' }}>Galactic Cosmic Ray Aviation Dosimetry Model</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Barometric altitude e-folding scale height (L = 135 g/cm²) and geomagnetic cutoff rigidity modulation for aircrew dose.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>MIRD Pamphlet No. 21</td>
                  <td style={{ padding: '10px' }}>SNMMI / MIRD</td>
                  <td style={{ padding: '10px' }}>2009</td>
                  <td style={{ padding: '10px' }}>A Generalized Schema for Radiopharmaceutical Dosimetry (Bolch et al.)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Time-integrated activity (TIA), S-value phantom matrices, and Lea-Catcheside Biologically Effective Dose (BED) for Lu-177 / Ac-225.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#00E5FF' }}>IAEA FENDL-3.2</td>
                  <td style={{ padding: '10px' }}>IAEA Nuclear Data Section</td>
                  <td style={{ padding: '10px' }}>2021</td>
                  <td style={{ padding: '10px' }}>Fusion Evaluated Nuclear Data Library (D-T 14.1 MeV Neutronics)</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>14.1 MeV D-T fusion kinematics, Lawson triple product ignition criteria, and Li-6/Li-7 Tritium Breeding Ratio (TBR).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiteratureModule;
