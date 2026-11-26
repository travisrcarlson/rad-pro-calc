import React, { useState } from 'react';
import { sha256Hex } from './utils/cryptoHash';
import {
  APP_NAME,
  APP_VERSION,
  APP_SUBTITLE,
  MODULE_COUNT,
  PHYSICS_KERNEL_COUNT,
  REGULATORY_REGIME_COUNT,
  VV_TOTAL_COUNT
} from './config/appMetadata';

interface LoginProps {
  onLogin: (mode?: 'operator' | 'demo') => void;
}

const AUTHORIZED_PASSPHRASE_SHA256 = '88D21BA4C7AE623F17B4C53F2F1A060AD58FA38CFDA381D34799AC1AB8801225';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digest = await sha256Hex(password);
    if (digest === AUTHORIZED_PASSPHRASE_SHA256) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2400);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '28px',
      background:
        'radial-gradient(circle at 20% 20%, rgba(14, 116, 144, 0.14) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(30, 58, 138, 0.14) 0%, transparent 45%), linear-gradient(180deg, #060b14 0%, #090f1d 100%)',
      backgroundImage:
        'linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px), radial-gradient(circle at 22% 18%, rgba(56, 189, 248, 0.12) 0%, transparent 42%), linear-gradient(180deg, #060b14 0%, #090f1d 100%)',
      backgroundSize: '36px 36px, 36px 36px, 100% 100%, 100% 100%',
      fontFamily: 'var(--font-main)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '920px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        backgroundColor: 'rgba(11, 18, 32, 0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.24)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
      }}>
        {/* Left: Technical Capabilities & Verification Overview */}
        <div style={{
          padding: '34px 32px',
          background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(6, 11, 20, 0.96))',
          borderRight: '1px solid rgba(148, 163, 184, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '22px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.38)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {/* Clean ISO 7010 W003 Vector Radiation Trefoil Emblem */}
                <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
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
                  <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', letterSpacing: '0.02em', fontWeight: 700 }}>
                    {APP_NAME}
                  </h1>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(148, 163, 184, 0.14)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#cbd5e1'
                  }}>
                    v{APP_VERSION}
                  </span>
                </div>
                <div style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '2px' }}>
                  {APP_SUBTITLE}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '18px'
            }}>
              {[
                { value: `${MODULE_COUNT}`, label: 'Engineering Modules' },
                { value: `${PHYSICS_KERNEL_COUNT}`, label: 'Coupled Physics Kernels' },
                { value: `${VV_TOTAL_COUNT}/${VV_TOTAL_COUNT}`, label: 'Deterministic V&V Suite' },
                { value: `${REGULATORY_REGIME_COUNT}`, label: 'Regulatory Regimes' }
              ].map(metric => (
                <div
                  key={metric.label}
                  style={{
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.08rem',
                    fontWeight: 800,
                    color: '#38bdf8',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: '0.71rem', color: '#94a3b8', marginTop: '2px' }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
              padding: '9px 11px',
              borderRadius: '6px',
              background: 'rgba(2, 6, 23, 0.55)',
              border: '1px solid rgba(148, 163, 184, 0.14)',
              fontFamily: 'var(--font-mono)'
            }}>
              ICRP-103/107/119 • NIST XCOM • ANSI/ANS-6.4.3 • IAEA GSR-3 • EU 2013/59 / NL ANVS Bbs • NATO STANAG 2083 • ISO 11929 • GUM
            </div>
            <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.45 }}>
              100% client-side deterministic computation (IEEE 754-2019 Binary64) • Zero external telemetry • Analytical decision-support &amp; verification workstation.
            </div>
          </div>
        </div>

        {/* Right: Passphrase Authentication Panel */}
        <div style={{
          padding: '34px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '18px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.70rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
              padding: '3px 9px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              marginBottom: '12px'
            }}>
              <span>SHA-256 Local Verification</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
              Authorized Access Gateway
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Enter your operator passphrase to unlock the workstation session. Verification runs locally inside your browser via Web Crypto SHA-256.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                htmlFor="radpro-passphrase"
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '6px'
                }}
              >
                Access Passphrase
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="radpro-passphrase"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passphrase"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 68px 11px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${error ? '#ef4444' : 'rgba(148, 163, 184, 0.28)'}`,
                    background: 'rgba(2, 6, 23, 0.68)',
                    color: '#f8fafc',
                    fontSize: '0.96rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    padding: '4px 8px',
                    fontSize: '0.70rem',
                    fontWeight: 600,
                    background: 'rgba(148, 163, 184, 0.14)',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    borderRadius: '5px',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '0.80rem'
                }}
              >
                Invalid verification passphrase.
              </div>
            )}

            <button
              type="submit"
              style={{
                padding: '11px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.55)',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(2, 132, 199, 0.36))',
                color: '#f8fafc',
                fontWeight: 700,
                fontSize: '0.94rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
                marginTop: '4px'
              }}
            >
              Authenticate &amp; Launch
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '2px 0',
              fontSize: '0.70rem',
              color: '#64748b',
              fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.18)' }} />
              <span>or for external peer review</span>
              <span style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.18)' }} />
            </div>

            <button
              type="button"
              onClick={() => onLogin('demo')}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.72)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease'
              }}
            >
              Open Peer-Review / Demo Session
            </button>
          </form>

          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid rgba(148, 163, 184, 0.14)',
            fontSize: '0.72rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>Default Regime: NL ANVS / Bbs (SI)</span>
            <span>Session Storage Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
