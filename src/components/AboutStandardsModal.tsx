import React, { useEffect } from 'react';
import {
  APP_NAME,
  APP_VERSION,
  APP_SUBTITLE,
  MODULE_COUNT,
  PHYSICS_KERNEL_COUNT,
  REGULATORY_REGIME_COUNT,
  VV_ANALYTICAL_COUNT,
  VV_STRESS_COUNT,
  VV_TOTAL_COUNT,
  VV_MAX_DRIFT_PCT
} from '../config/appMetadata';

interface AboutStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVerification: () => void;
}

const REFERENCE_GROUPS = [
  {
    category: 'Dosimetry & Nuclear Decay',
    items: 'ICRP Publications 103, 107, 119, 68/78 • ICRU Operational Quantities H*(10) / Hp(10)'
  },
  {
    category: 'Photon & Neutron Shielding',
    items: 'NIST XCOM Mass Attenuation • ANSI/ANS-6.4.3 GP Buildup • NCRP Reports 147 & 151'
  },
  {
    category: `Regulatory Frameworks (${REGULATORY_REGIME_COUNT})`,
    items: 'NL ANVS / Bbs (Stb. 2017, 404) • EU 2013/59/Euratom & UK IRR17 • IAEA GSR Part 3 & SSR-6 • US 10 CFR 20 / 835 • NATO STANAG 2083 / AEP-66 / ATP-45 • CNSC SOR/2000-203'
  },
  {
    category: 'Metrology, Criticality & Consequence',
    items: 'ISO 11929-1 • ISO 7503-1 • ISO 4037-3 • ISO/IEC Guide 98-3 (GUM k=2) • ANSI/ANS-8.3 • NUREG-1575 MARSSIM • Glasstone & Dolan EM-1'
  }
];

export const AboutStandardsModal: React.FC<AboutStandardsModalProps> = ({
  isOpen,
  onClose,
  onOpenVerification
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Technical Specification and Verification Scope"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 8, 18, 0.84)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: '20px'
      }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          paddingBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <circle cx="32" cy="32" r="28" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.45" />
                <circle cx="32" cy="32" r="5.2" fill="#38bdf8" />
                <path d="M32 32 L18.5 8.6 A27 27 0 0 1 45.5 8.6 Z" fill="#38bdf8" opacity="0.92" />
                <path d="M32 32 L59 32 A27 27 0 0 1 45.5 55.4 Z" fill="#38bdf8" opacity="0.92" />
                <path d="M32 32 L18.5 55.4 A27 27 0 0 1 5 32 Z" fill="#38bdf8" opacity="0.92" />
                <circle cx="32" cy="32" r="8.5" fill="#0b1220" />
                <circle cx="32" cy="32" r="5.0" fill="#38bdf8" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  {APP_NAME}
                </h2>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8'
                }}>
                  v{APP_VERSION}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {APP_SUBTITLE} — Technical Specification &amp; Validation Scope
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            aria-label="Close technical specification modal"
          >
            Close
          </button>
        </div>

        {/* 1. Build & Computational Architecture */}
        <div>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-primary)',
            marginBottom: '8px'
          }}>
            1. Build &amp; Computational Architecture
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Engine Build', value: `v${APP_VERSION}` },
              { label: 'Engineering Modules', value: `${MODULE_COUNT} (7 Domains)` },
              { label: 'Coupled Kernels', value: `${PHYSICS_KERNEL_COUNT} Pure TS` },
              { label: 'FPU Arithmetic', value: 'IEEE 754 Binary64' }
            ].map(spec => (
              <div key={spec.label} style={{
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: '6px',
                padding: '9px 11px'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>{spec.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.80rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            100% client-side deterministic browser execution with zero external telemetry exfiltration and offline PWA bundle support.
          </p>
        </div>

        {/* 2. Verification & Validation Scorecard */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981' }}>
              2. Verification &amp; Validation Scorecard
            </div>
            <div style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600, marginTop: '3px' }}>
              {VV_TOTAL_COUNT}/{VV_TOTAL_COUNT} Deterministic Vectors ({VV_ANALYTICAL_COUNT} Analytical VTEST-01..{VV_ANALYTICAL_COUNT} + {VV_STRESS_COUNT} Stress STRESS-01..0{VV_STRESS_COUNT})
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
              Maximum relative analytical deviation bounded by &delta;_max &le; {VV_MAX_DRIFT_PCT.toFixed(2)}% across all production solvers.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onClose();
              onOpenVerification();
            }}
          >
            Inspect Module 34 V&amp;V Suite
          </button>
        </div>

        {/* 3. Reference Standards & Regulatory Frameworks Matrix */}
        <div>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-primary)',
            marginBottom: '8px'
          }}>
            3. Reference Standards &amp; Regulatory Frameworks Matrix
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
            {REFERENCE_GROUPS.map(group => (
              <div key={group.category} style={{
                background: 'rgba(2, 6, 23, 0.55)',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: '6px',
                padding: '10px 12px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                  {group.category}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.45 }}>
                  {group.items}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Intended Use & Modeling Boundaries */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          borderRadius: '8px',
          padding: '12px 14px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: '4px' }}>
            4. Intended Use &amp; Modeling Boundaries
          </div>
          <p style={{ margin: 0, fontSize: '0.79rem', color: '#cbd5e1', lineHeight: 1.55 }}>
            Analytical point-kernel buildup, Gaussian atmospheric plume dispersion, semi-empirical blast/fallout, and biokinetic compartmental models provide rapid engineering decision-support, education, and independent hand-check verification. For safety-class regulatory licensing, clinical patient administration, or complex heterogeneous 3D transport geometries, results must be reviewed by a qualified radiation protection expert (CHP / SBD / QMP / RSO) and corroborated using full stochastic transport codes (e.g., MCNP, FLUKA, GEANT4).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutStandardsModal;
