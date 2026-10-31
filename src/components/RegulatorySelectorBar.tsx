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
}

export const RegulatorySelectorBar: React.FC<RegulatorySelectorBarProps> = ({
  onOpenCommandPalette,
  isSidebarCollapsed = false,
  onToggleSidebar,
  activeModuleInfo,
  onStepModule,
  isActivePinned = false,
  onTogglePinActive
}) => {
  const { currentFramework, frameworkId, setFrameworkId, allFrameworks, unitSystem, setUnitSystem, formatDoseMSv } = useRegulatory();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<'standard' | 'tactical' | 'night_vision'>(() => {
    return (localStorage.getItem('radpro_theme') as any) || 'standard';
  });

  const setTheme = (theme: 'standard' | 'tactical' | 'night_vision') => {
    setCurrentThemeState(theme);
    localStorage.setItem('radpro_theme', theme);
    document.body.classList.remove('theme-tactical-hud', 'theme-night-vision');
    if (theme === 'tactical') document.body.classList.add('theme-tactical-hud');
    if (theme === 'night_vision') document.body.classList.add('theme-night-vision');
  };

  // Sync theme class on mount
  useEffect(() => {
    setTheme(currentTheme);
  }, []);

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
            <span style={{ fontSize: '1.05rem' }}>{currentFramework.flagEmoji}</span>
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              REGIME:
            </span>
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'rgba(0, 229, 255, 0.08)',
                border: `1px solid ${currentFramework.accentColor}`,
                color: currentFramework.accentColor,
                borderRadius: '6px',
                padding: '3px 9px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                boxShadow: `0 0 10px ${currentFramework.accentColor}25`
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
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '2px 3px',
              borderRadius: '6px',
              border: '1px solid rgba(0, 229, 255, 0.25)'
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
                  onClick={() => setUnitSystem(u.id)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.68rem',
                    fontWeight: active ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: active ? 'rgba(0, 229, 255, 0.22)' : 'transparent',
                    color: active ? '#00e5ff' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          {/* Key Limits Preview (dynamically formatted by unitSystem) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
            <span>Occ: <strong style={{ color: '#fff' }}>{formatDoseMSv(currentFramework.limits.occupationalAnnualEffective_mSv, '/yr')}</strong></span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>Public: <strong style={{ color: '#fff' }}>{formatDoseMSv(currentFramework.limits.publicAnnualEffective_mSv, '/yr')}</strong></span>
            <span style={{ opacity: 0.35 }}>|</span>
            <span>Life-Saving: <strong style={{ color: '#f59e0b' }}>{formatDoseMSv(currentFramework.limits.emergencyLifeSaving_mSv)}</strong></span>
          </div>
        </div>

        {/* Center: Command Palette Spotlight Launcher */}
        <button
          onClick={() => {
            if (onOpenCommandPalette) onOpenCommandPalette();
            else window.dispatchEvent(new CustomEvent('open-command-palette'));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 229, 255, 0.06)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '6px',
            padding: '4px 12px',
            color: 'var(--color-text-muted)',
            fontSize: '0.76rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Open Command Palette (Ctrl+K / ⌘K)"
        >
          <span style={{ color: 'var(--color-primary)', fontSize: '0.82rem' }}>🔍</span>
          <span style={{ color: '#94a3b8' }}>Search 35 modules, isotopes, standards...</span>
          <span style={{
            padding: '1px 5px',
            fontSize: '0.66rem',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#00e5ff',
            fontFamily: 'var(--font-mono)'
          }}>
            Ctrl+K
          </span>
        </button>

        {/* Right: Theme Switcher & Governing Body Standards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tactical Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}>
            <button
              title="Standard Deep Glassmorphic Theme"
              onClick={() => setTheme('standard')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: 'none',
                background: currentTheme === 'standard' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: currentTheme === 'standard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
            >
              🌌 Standard
            </button>
            <button
              title="Tactical High-Contrast OLED HUD Theme"
              onClick={() => setTheme('tactical')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: 'none',
                background: currentTheme === 'tactical' ? 'rgba(255, 183, 3, 0.25)' : 'transparent',
                color: currentTheme === 'tactical' ? '#ffb703' : 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
            >
              ⚡ HUD
            </button>
            <button
              title="Tactical Night-Vision Low-Lux Red Theme"
              onClick={() => setTheme('night_vision')}
              style={{
                padding: '2px 6px',
                fontSize: '0.67rem',
                borderRadius: '4px',
                border: 'none',
                background: currentTheme === 'night_vision' ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                color: currentTheme === 'night_vision' ? '#ef4444' : 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
            >
              🔴 NV-Red
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
                onClick={onTogglePinActive}
                title={isActivePinned ? 'Unpin module from Sidebar Favorites' : 'Pin module to Sidebar Favorites'}
                style={{
                  background: isActivePinned ? 'rgba(255, 183, 3, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isActivePinned ? 'rgba(255, 183, 3, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: isActivePinned ? '#ffb703' : '#94a3b8',
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
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
              onClick={handleCopyDeepLink}
              title={`Copy direct link to ${activeModuleInfo.label} (${location.pathname}${location.search})`}
              style={{
                background: copiedLink ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 229, 255, 0.08)',
                border: `1px solid ${copiedLink ? '#10b981' : 'rgba(0, 229, 255, 0.28)'}`,
                color: copiedLink ? '#10b981' : '#00e5ff',
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
              <span>{copiedLink ? '✓ Copied URL' : '🔗 Share Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/verify')}
              title="Open Module 34 Institutional 64/64 V&V Test Suite"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                borderRadius: '4px',
                padding: '1px 7px',
                fontSize: '0.67rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              ✓ 64/64 V&amp;V
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
