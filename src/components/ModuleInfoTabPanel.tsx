import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockMath, InlineMath } from 'react-katex';
import { METHOD_DOCS } from '../data/methodDocsData';
import { type ActiveModuleBreadcrumbInfo } from './RegulatorySelectorBar';
import { MODULE_WORKED_EXAMPLES } from '../data/moduleWorkedExamples';
import { useRegulatory } from '../context/RegulatoryContext';
import { MODULE_USER_GUIDES, type ModuleUserGuide } from '../data/moduleUserGuides';
export { MODULE_USER_GUIDES, type ModuleUserGuide };

interface ModuleInfoTabPanelProps {
  moduleInfo: ActiveModuleBreadcrumbInfo;
  onReturnToTool: () => void;
}

export const ModuleInfoTabPanel: React.FC<ModuleInfoTabPanelProps> = ({
  moduleInfo,
  onReturnToTool
}) => {
  const navigate = useNavigate();
  const { setActiveSource, pinCalculation } = useRegulatory();
  const guide = MODULE_USER_GUIDES[moduleInfo.moduleNumber] || MODULE_USER_GUIDES[1];
  const workedExample = MODULE_WORKED_EXAMPLES[moduleInfo.moduleNumber] || MODULE_WORKED_EXAMPLES[1];
  const methodDoc = METHOD_DOCS.find(
    doc => doc.moduleId === `Module ${moduleInfo.moduleNumber}`
  );

  // Extract first VTEST-XX if mentioned in benchmarks
  const vtestMatch = methodDoc?.benchmarks.match(/VTEST-\d+/);
  const primaryVtestId = vtestMatch ? vtestMatch[0] : null;

  const handleLoadWorkedExample = () => {
    if (workedExample.sourceSync) {
      setActiveSource(workedExample.sourceSync);
    }
    if (workedExample.queryParams) {
      navigate(`${moduleInfo.path}${workedExample.queryParams}`);
    }
    onReturnToTool();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '28px' }}>
      {/* Top Hero Card */}
      <div
        className="panel"
        style={{
          marginBottom: 0,
          border: `1px solid ${moduleInfo.categoryColor}55`,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(5, 10, 18, 0.96) 100%)',
          boxShadow: `0 8px 28px rgba(0, 0, 0, 0.45), 0 0 18px ${moduleInfo.categoryColor}18`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: `${moduleInfo.categoryColor}22`,
                  border: `1px solid ${moduleInfo.categoryColor}`,
                  color: moduleInfo.categoryColor
                }}
              >
                MODULE {String(moduleInfo.moduleNumber).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#cbd5e1'
                }}
              >
                {moduleInfo.categoryIcon} {moduleInfo.categoryTitle}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  color: '#00e5ff'
                }}
              >
                {moduleInfo.badge}
              </span>
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', color: '#fff' }}>
              ℹ️ {moduleInfo.label} — Tool Guide &amp; Scientific Reference
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              {guide.whatItDoes}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onReturnToTool}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '9px 16px'
              }}
            >
              <span>⚡ Open Interactive Calculator</span>
            </button>
            {primaryVtestId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onReturnToTool();
                  navigate(`/verify?test=${primaryVtestId}`);
                }}
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              >
                ✓ Verify ({primaryVtestId})
              </button>
            )}
          </div>
        </div>

        {/* Key Capabilities Pill Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {guide.keyCapabilities.map((cap, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.07)',
                border: '1px solid rgba(0, 229, 255, 0.22)',
                color: '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ color: '#00e5ff', fontWeight: 700 }}>✓</span>
              <span>{cap}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Two-Column Operational Guide: When To Use + Step-by-Step How To Use */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span>
            <span>When to Use This Tool (Operational Scenarios)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.whenToUse.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${moduleInfo.categoryColor}`
                }}
              >
                <span style={{ color: moduleInfo.categoryColor, fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  0{idx + 1}
                </span>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#ffb703', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧭</span>
            <span>Step-by-Step Operator Workflow</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.howToUseSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #ffb703'
                }}
              >
                <span
                  style={{
                    background: 'rgba(255, 183, 3, 0.18)',
                    color: '#ffb703',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  STEP {idx + 1}
                </span>
                <span style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worked Engineering Example (Step-by-Step Solved Problem with 1-Click Tool Loader) */}
      {workedExample && (
        <div
          className="panel"
          style={{
            marginBottom: 0,
            border: '1px solid rgba(16, 185, 129, 0.45)',
            background: 'linear-gradient(135deg, rgba(6, 22, 24, 0.92) 0%, rgba(8, 15, 28, 0.96) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: '1 1 420px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#10b981'
                  }}
                >
                  WORKED ENGINEERING PROBLEM — M{String(moduleInfo.moduleNumber).padStart(2, '0')}
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.08rem', color: '#fff' }}>
                🧪 {workedExample.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.55 }}>
                {workedExample.scenario}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLoadWorkedExample}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  border: '1px solid #34d399',
                  color: '#fff'
                }}
              >
                <span>⚡ Try Worked Example in Tool</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  pinCalculation({
                    moduleNumber: moduleInfo.moduleNumber,
                    moduleLabel: moduleInfo.label,
                    modulePath: moduleInfo.path,
                    title: `[Worked Benchmark] M${String(moduleInfo.moduleNumber).padStart(2, '0')}: ${workedExample.title}`,
                    summary: workedExample.result,
                    metrics: workedExample.inputs.map(inp => ({ label: inp.label, value: inp.value }))
                  });
                }}
                style={{ padding: '8px 12px', fontSize: '0.78rem' }}
              >
                📌 Pin Example to Report
              </button>
            </div>
          </div>

          {/* Worked Example Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            {workedExample.inputs.map((inp, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '8px 10px'
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {inp.label}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#00e5ff', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {inp.value}
                </div>
              </div>
            ))}
          </div>

          {/* Step-by-Step Solution Walkthrough */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {workedExample.steps.map((st, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #10b981'
                }}
              >
                <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.76rem', flexShrink: 0 }}>
                  [{idx + 1}]
                </span>
                <span style={{ fontSize: '0.83rem', color: '#e2e8f0', lineHeight: 1.5 }}>{st}</span>
              </div>
            ))}
          </div>

          {/* Final Verified Engineering Result */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                ✓ Verified Solution &amp; Engineering Conclusion
              </span>
              <strong style={{ fontSize: '0.88rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {workedExample.result}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Governing Physics & Mathematical Formulations (from METHOD_DOCS) */}
      {methodDoc && (
        <div className="panel" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>
                📐 Governing Physics Formulations &amp; Mathematical Basis
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                {methodDoc.title}
              </div>
            </div>
            <span className="hud-badge hud-badge-primary" style={{ fontSize: '0.72rem' }}>
              {methodDoc.domain}
            </span>
          </div>

          <div
            style={{
              background: 'rgba(5, 10, 18, 0.85)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: '8px',
              padding: '14px 18px',
              overflowX: 'auto',
              marginBottom: '14px'
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', fontWeight: 700 }}>
              Primary Governing Equation
            </div>
            <BlockMath math={methodDoc.primaryFormula} />
          </div>

          {methodDoc.secondaryFormulas && methodDoc.secondaryFormulas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {methodDoc.secondaryFormulas.map((sf, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    overflowX: 'auto'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '4px' }}>
                    {sf.label}
                  </div>
                  <BlockMath math={sf.formula} />
                </div>
              ))}
            </div>
          )}

          {/* Variables & Units Table */}
          {methodDoc.variables && methodDoc.variables.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nomenclature, Symbols &amp; Units
              </h4>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.45)', color: 'var(--color-primary)' }}>
                      <th style={{ padding: '8px 12px', width: '140px' }}>Symbol</th>
                      <th style={{ padding: '8px 12px' }}>Physical Quantity Description</th>
                      <th style={{ padding: '8px 12px', width: '180px' }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodDoc.variables.map((v, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '7px 12px', color: '#00e5ff' }}>
                          <InlineMath math={v.symbol} />
                        </td>
                        <td style={{ padding: '7px 12px', color: '#e2e8f0' }}>{v.description}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: '#94a3b8', fontSize: '0.76rem' }}>
                          {v.units}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standards, Assumptions & Verification Benchmarks */}
      {methodDoc && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.96rem', color: '#10b981' }}>
              🏛️ Authoritative Standards &amp; Regulatory Citations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {methodDoc.standards.map((st, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '6px',
                    padding: '9px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <strong style={{ color: '#00e5ff', fontSize: '0.8rem' }}>
                      {st.org} — {st.code}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {st.year}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{st.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.96rem', color: '#c084fc' }}>
                🔬 Physical Assumptions &amp; V&amp;V Benchmark Status
              </h3>
              <ul style={{ margin: '0 0 14px 18px', padding: 0, color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.55 }}>
                {methodDoc.assumptions.map((a, i) => (
                  <li key={i} style={{ marginBottom: '5px' }}>{a}</li>
                ))}
              </ul>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#e2e8f0'
              }}
            >
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', marginBottom: '3px' }}>
                ✓ ASME NQA-1 / IEEE 730 Verification Benchmark
              </div>
              <div>{methodDoc.benchmarks}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleInfoTabPanel;
