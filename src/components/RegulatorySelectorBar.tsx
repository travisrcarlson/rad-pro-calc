import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRegulatory, type UnitSystemMode } from '../context/RegulatoryContext';

export interface ActiveModuleBreadcrumbInfo {
  moduleNumber: number;
  path: string;
  label: string;
  badge: string;
  categoryTitle: string;
  categoryColor: string;
  categoryIcon: string;
}

interface RegulatorySelectorBarProps {
  onOpenCommandPalette?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activeModuleInfo?: ActiveModuleBreadcrumbInfo | null;
  onStepModule?: (direction: -1 | 1) => void;
  isActivePinned?: boolean;
  onTogglePinActive?: () => void;
  onLockSession?: () => void;
}

export const RegulatorySelectorBar: React.FC<RegulatorySelectorBarProps> = ({
  onOpenCommandPalette,
  isSidebarCollapsed = false,
  onToggleSidebar,
  activeModuleInfo,
  onStepModule,
  isActivePinned = false,
  onTogglePinActive,
  onLockSession
}) => {
  const { currentFramework, frameworkId, setFrameworkId, allFrameworks, unitSystem, setUnitSystem, formatDoseMSv } = useRegulatory();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<'standard' | 'tactical' | 'night_vision'>(() => {
    try {
      const saved = localStorage.getItem('radpro_theme');
      if (saved === 'tactical' || saved === 'night_vision' || saved === 'standard') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'standard';
  });

  const setTheme = (theme: 'standard' | 'tactical' | 'night_vision') => {
    setCurrentThemeState(theme);
    try {
      localStorage.setItem('radpro_theme', theme);
    } catch {
      // Ignore storage access errors
    }
    document.body.classList.remove('theme-tactical-hud', 'theme-night-vision');
    if (theme === 'tactical') document.body.classList.add('theme-tactical-hud');
    if (theme === 'night_vision') document.body.classList.add('theme-night-vision');
  };

  // Sync theme class on mount and whenever theme changes
  useEffect(() => {
    document.body.classList.remove('theme-tactical-hud', 'theme-night-vision');
    if (currentTheme === 'tactical') document.body.classList.add('theme-tactical-hud');
    if (currentTheme === 'night_vision') document.body.classList.add('theme-night-vision');
  }, [currentTheme]);

  const handleCopyDeepLink = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(9, 17, 30, 0.90)',
      borderBottom: '1px solid rgba(65, 90, 119, 0.35)',
      backdropFilter: 'blur(12px)',
      fontSize: '0.82rem',
      position: 'relative',
      zIndex: 90
    }}>
      {/* Row 1: Primary Regime, Unit System Toggle, Spotlight Search & Theme Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 16px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Left: Sidebar Rail Toggle + Active Regime Badge & Dynamic Unit Limits */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={`${isSidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar Rail (Ctrl+B)`}
              style={{
                background: isSidebarCollapsed ? 'rgba(0, 229, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: 'var(--color-primary)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{isSidebarCollapsed ? '»' : '«'}</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>Ctrl+B</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.0rem' }}>{currentFramework.flagEmoji}</span>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              REGIME:
            </span>
            <button
              type="button"
              className={isOpen ? 'active' : ''}
              onClick={() => setIsOpen(!isOpen)}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.24)',
                borderRadius: '6px',
                padding: '3px 9px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{currentFramework.shortCode}</span>
              <span style={{ fontSize: '0.62rem' }}>{isOpen ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* SI / US Customary / Dual Unit System Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(15, 23, 42, 0.65)',
              padding: '2px 3px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.22)'
            }}
            title="Switch Statutory Readout Units: SI (mSv, GBq), Traditional US (rem, mrem, Ci), or Dual"
          >
            {([
              { id: 'SI', label: 'SI (Sv/Bq)' },
              { id: 'TRADITIONAL', label: 'US (rem/Ci)' },
              { id: 'DUAL', label: 'Dual' }
            ] as { id: UnitSystemMode; label: string }[]).map(u => {
              const active = unitSystem === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  className={active ? 'active' : ''}
                  onClick={() => setUnitSystem(u.id)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.68rem',
                    fontWeight: active ? 600 : 500,
                    borderRadius: '4px',
                    border: '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          {/* Key Limits Preview (dynamically formatted by unitSystem) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
            <span>Occ: <strong style={{ color: '#e2e8f0' }}>{formatDoseMSv(currentFramework.limits.occupationalAnnualEffective_mSv, '/yr')}</strong></span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>Public: <strong style={{ color: '#e2e8f0' }}>{formatDoseMSv(currentFramework.limits.publicAnnualEffective_mSv, '/yr')}</strong></span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>Life-Saving: <strong style={{ color: '#cbd5e1' }}>{formatDoseMSv(currentFramework.limits.emergencyLifeSaving_mSv)}</strong></span>
          </div>
        </div>

        {/* Center: Command Palette Spotlight Launcher */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCommandPalette) onOpenCommandPalette();
            else window.dispatchEvent(new CustomEvent('open-command-palette'));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '0.76rem',
            cursor: 'pointer'
          }}
          title="Open Command Palette (Ctrl+K / ⌘K)"
        >
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>🔍</span>
          <span style={{ color: '#94a3b8' }}>Search 35 modules, isotopes, standards...</span>
          <span style={{
            padding: '1px 5px',
            fontSize: '0.66rem',
            borderRadius: '4px',
            background: 'rgba(148, 163, 184, 0.14)',
            color: '#cbd5e1',
            fontFamily: 'var(--font-mono)'
          }}>
            Ctrl+K
          </span>
        </button>

        {/* Right: Theme Switcher & Governing Body Standards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tactical Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(15, 23, 42, 0.65)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.22)' }}>
            <button
              type="button"
              className={currentTheme === 'standard' ? 'active' : ''}
              title="Standard Deep Slate Theme"
              onClick={() => setTheme('standard')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              Standard
            </button>
            <button
              type="button"
              className={currentTheme === 'tactical' ? 'active' : ''}
              title="High-Contrast OLED HUD Theme"
              onClick={() => setTheme('tactical')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              HUD
            </button>
            <button
              type="button"
              className={currentTheme === 'night_vision' ? 'active' : ''}
              title="Night-Vision Low-Lux Red Theme"
              onClick={() => setTheme('night_vision')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: '1px solid transparent',
                cursor: 'pointer'
              }}
            >
              NV-Red
            </button>
          </div>

          <span style={{
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text-muted)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {currentFramework.keyStatutes[0]}
          </span>
          {onLockSession && (
            <button
              type="button"
              onClick={onLockSession}
              title="Lock session & return to login screen"
              style={{
                padding: '2px 8px',
                fontSize: '0.68rem',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🔒 Lock
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Active Module Breadcrumb Navigation, Pin Star, Sequential Stepper & Deep-Link Share */}
      {activeModuleInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px',
          background: 'rgba(3, 8, 16, 0.65)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.74rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* Breadcrumb Trail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: activeModuleInfo.categoryColor,
              fontWeight: 600,
              fontSize: '0.72rem'
            }}>
              <span>{activeModuleInfo.categoryIcon}</span>
              <span>{activeModuleInfo.categoryTitle}</span>
            </span>
            <span style={{ color: '#475569' }}>›</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.70rem',
              padding: '1px 5px',
              borderRadius: '4px',
              background: `${activeModuleInfo.categoryColor}20`,
              border: `1px solid ${activeModuleInfo.categoryColor}50`,
              color: activeModuleInfo.categoryColor,
              fontWeight: 700
            }}>
              M{String(activeModuleInfo.moduleNumber).padStart(2, '0')}
            </span>
            <strong style={{ color: '#f8fafc', fontSize: '0.76rem' }}>
              {activeModuleInfo.label}
            </strong>
            <span style={{
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#94a3b8'
            }}>
              {activeModuleInfo.badge}
            </span>

            {onTogglePinActive && (
              <button
                type="button"
                className={isActivePinned ? 'active' : ''}
                onClick={onTogglePinActive}
                title={isActivePinned ? 'Unpin module from Sidebar Favorites' : 'Pin module to Sidebar Favorites'}
                style={{
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  borderRadius: '4px',
                  padding: '1px 7px',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{isActivePinned ? '★' : '☆'}</span>
                <span>{isActivePinned ? 'Pinned' : 'Pin'}</span>
              </button>
            )}
          </div>

          {/* Right: Prev / Next Module Stepper + Copy Deep-Link + Verify Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onStepModule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => onStepModule(-1)}
                  title="Previous Module (Alt + ←)"
                  style={{
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    borderRadius: '4px',
                    padding: '1px 7px',
                    fontSize: '0.70rem',
                    cursor: 'pointer'
                  }}
                >
                  ‹ Prev
                </button>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)', padding: '0 3px' }}>
                  {activeModuleInfo.moduleNumber}/35
                </span>
                <button
                  type="button"
                  onClick={() => onStepModule(1)}
                  title="Next Module (Alt + →)"
                  style={{
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    borderRadius: '4px',
                    padding: '1px 7px',
                    fontSize: '0.70rem',
                    cursor: 'pointer'
                  }}
                >
                  Next ›
                </button>
              </div>
            )}

            <button
              type="button"
              className={copiedLink ? 'active' : ''}
              onClick={handleCopyDeepLink}
              title={`Copy direct link to ${activeModuleInfo.label} (${location.pathname}${location.search})`}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                borderRadius: '4px',
                padding: '1px 8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{copiedLink ? '✓ Copied URL' : 'Share Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/verify')}
              title="Open Module 34 Institutional 68/68 V&V Test Suite"
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                borderRadius: '4px',
                padding: '1px 7px',
                fontSize: '0.67rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              ✓ 68/68 V&amp;V
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'transparent' }}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '18px',
            marginTop: '6px',
            background: '#09111e',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
            zIndex: 120,
            width: '480px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Select Jurisdictional Regulatory Framework
            </div>
            {allFrameworks.map(fw => {
              const isSelected = fw.id === frameworkId;
              return (
                <div
                  key={fw.id}
                  onClick={() => {
                    setFrameworkId(fw.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? fw.accentColor : 'rgba(65, 90, 119, 0.3)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: fw.accentColor }}>
                      <span style={{ fontSize: '1.1rem' }}>{fw.flagEmoji}</span>
                      <span>{fw.name}</span>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.65rem', background: fw.accentColor, color: '#000', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    <strong>Statutes:</strong> {fw.keyStatutes.join(', ')}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.70rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
                    <span>Annual Limit: <strong>{formatDoseMSv(fw.limits.occupationalAnnualEffective_mSv)}</strong></span>
                    <span>Eye Lens: <strong>{formatDoseMSv(fw.limits.lensOfEyeAnnual_mSv)}</strong></span>
                    <span>Life Saving: <strong>{formatDoseMSv(fw.limits.emergencyLifeSaving_mSv)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
