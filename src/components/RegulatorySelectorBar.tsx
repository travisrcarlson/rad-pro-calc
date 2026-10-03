import React, { useState } from 'react';
import { useRegulatory } from '../context/RegulatoryContext';

export const RegulatorySelectorBar: React.FC = () => {
  const { currentFramework, frameworkId, setFrameworkId, allFrameworks } = useRegulatory();
  const [isOpen, setIsOpen] = useState(false);
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
  React.useEffect(() => {
    setTheme(currentTheme);
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 18px',
      background: 'rgba(9, 17, 30, 0.85)',
      borderBottom: '1px solid rgba(65, 90, 119, 0.35)',
      backdropFilter: 'blur(12px)',
      fontSize: '0.82rem',
      position: 'relative',
      zIndex: 90
    }}>
      {/* Left: Active Regime Badge & Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.1rem' }}>{currentFramework.flagEmoji}</span>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            REGIME:
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'rgba(0, 229, 255, 0.08)',
              border: `1px solid ${currentFramework.accentColor}`,
              color: currentFramework.accentColor,
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: `0 0 10px ${currentFramework.accentColor}25`
            }}
          >
            <span>{currentFramework.shortCode}</span>
            <span style={{ fontSize: '0.65rem' }}>{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Key Limits Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          <span>Occ. Limit: <strong style={{ color: '#fff' }}>{currentFramework.limits.occupationalAnnualEffective_mSv} mSv/yr</strong></span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>Public: <strong style={{ color: '#fff' }}>{currentFramework.limits.publicAnnualEffective_mSv} mSv/yr</strong></span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>Life-Saving: <strong style={{ color: '#f59e0b' }}>{currentFramework.limits.emergencyLifeSaving_mSv} mSv</strong></span>
        </div>
      </div>

      {/* Right: Theme Switcher & Governing Body Standards */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Tactical Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}>
          <button
            title="Standard Deep Glassmorphic Theme"
            onClick={() => setTheme('standard')}
            style={{
              padding: '2px 6px',
              fontSize: '0.68rem',
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
              fontSize: '0.68rem',
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
              fontSize: '0.68rem',
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
          fontSize: '0.70rem',
          fontFamily: 'var(--font-mono)',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--color-text-muted)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {currentFramework.keyStatutes[0]}
        </span>
        <span style={{
          fontSize: '0.68rem',
          color: 'var(--color-success)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
          SYNCHRONIZED
        </span>
      </div>

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
            width: '460px',
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
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.70rem', color: '#cbd5e1' }}>
                    <span>Annual Limit: <strong>{fw.limits.occupationalAnnualEffective_mSv} mSv</strong></span>
                    <span>Eye Lens: <strong>{fw.limits.lensOfEyeAnnual_mSv} mSv</strong></span>
                    <span>Life Saving: <strong>{fw.limits.emergencyLifeSaving_mSv} mSv</strong></span>
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
