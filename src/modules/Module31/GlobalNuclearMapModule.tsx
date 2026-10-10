import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PlotComponent from 'react-plotly.js';
import {
  getUnifiedGeospatialPins,
  getGeospatialCountries,
  calculateHaversineDistanceKm,
  buildGeospatialDossierPayload,
  exportGeospatialPinsToCSV,
  exportGeospatialPinsToJSON,
  getTimelineYearStats,
  type UnifiedGeospatialPin,
  type GeospatialCategory
} from '../../services/globalGeospatialService';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const Plot = (PlotComponent as any).default || PlotComponent;

export const GlobalNuclearMapModule: React.FC = () => {
  const navigate = useNavigate();

  // Projection Type State
  const [projectionType, setProjectionType] = useState<'orthographic' | 'natural earth' | 'equirectangular' | 'mercator'>('orthographic');

  // Layer Visibility State
  const [showReactors, setShowReactors] = useState<boolean>(true);
  const [showDetonations, setShowDetonations] = useState<boolean>(true);
  const [showIncidents, setShowIncidents] = useState<boolean>(true);

  // Timeline Player State
  const [timelineMode, setTimelineMode] = useState<'cumulative' | 'single' | 'off'>('cumulative');
  const [currentYear, setCurrentYear] = useState<number>(1962);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = 800ms per year
  const playTimerRef = useRef<any>(null);

  // Advanced Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | GeospatialCategory>('all');
  const [featuredDetonationsOnly, setFeaturedDetonationsOnly] = useState<boolean>(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [selectedReactorStatus, setSelectedReactorStatus] = useState<string>('all');
  const [selectedReactorType, setSelectedReactorType] = useState<string>('all');

  // Globe Center Rotation State (Controlled for centering on clicks)
  const [centerRotation, setCenterRotation] = useState<{ lon: number; lat: number }>({ lon: 10, lat: 25 });

  // Selected Pin for Inspector
  const [selectedPin, setSelectedPin] = useState<UnifiedGeospatialPin | null>(null);

  // Distance Measurement Tool State
  const [distancePinA, setDistancePinA] = useState<UnifiedGeospatialPin | null>(null);
  const [distancePinB, setDistancePinB] = useState<UnifiedGeospatialPin | null>(null);

  // Audit Dossier State
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activeDossierPayload, setActiveDossierPayload] = useState<CalculationDossierPayload | null>(null);

  // All Available Countries
  const countries = useMemo(() => getGeospatialCountries(), []);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const intervalMs = Math.round(900 / playbackSpeed);
    playTimerRef.current = setInterval(() => {
      setCurrentYear(prev => {
        if (prev >= 2024) {
          setIsPlaying(false);
          return 2024;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Year Telemetry Stats for Active Year
  const yearStats = useMemo(() => {
    return getTimelineYearStats(currentYear);
  }, [currentYear]);

  // Filtered Pins with Timeline Support
  const pins = useMemo(() => {
    return getUnifiedGeospatialPins({
      includeReactors: showReactors && (activeCategoryFilter === 'all' || activeCategoryFilter === 'reactor'),
      includeDetonations: showDetonations && (activeCategoryFilter === 'all' || activeCategoryFilter === 'detonation'),
      includeIncidents: showIncidents && (activeCategoryFilter === 'all' || activeCategoryFilter === 'incident'),
      searchQuery,
      country: selectedCountry,
      featuredOnly: featuredDetonationsOnly,
      environment: selectedEnvironment,
      reactorStatus: selectedReactorStatus,
      reactorType: selectedReactorType,
      timelineMode,
      timelineYear: currentYear
    });
  }, [
    showReactors,
    showDetonations,
    showIncidents,
    activeCategoryFilter,
    searchQuery,
    selectedCountry,
    featuredDetonationsOnly,
    selectedEnvironment,
    selectedReactorStatus,
    selectedReactorType,
    timelineMode,
    currentYear
  ]);

  // Global Aggregate Statistics
  const stats = useMemo(() => {
    const all = getUnifiedGeospatialPins();
    const reactorCount = all.filter(p => p.category === 'reactor').length;
    const detonationCount = all.filter(p => p.category === 'detonation').length;
    const incidentCount = all.filter(p => p.category === 'incident').length;

    let totalMWe = 0;
    all.forEach(p => {
      if (p.rawReactor) totalMWe += p.rawReactor.capacityMWe;
    });

    let totalYieldKt = 0;
    all.forEach(p => {
      if (p.rawDetonation) totalYieldKt += p.rawDetonation.yieldKt;
    });

    return {
      reactorCount,
      detonationCount,
      incidentCount,
      totalMWe,
      totalYieldMt: totalYieldKt / 1000
    };
  }, []);

  // Distance calculation if both pins selected
  const measuredDistanceKm = useMemo(() => {
    if (!distancePinA || !distancePinB) return null;
    return calculateHaversineDistanceKm(
      distancePinA.coordinates.lat,
      distancePinA.coordinates.lon,
      distancePinB.coordinates.lat,
      distancePinB.coordinates.lon
    );
  }, [distancePinA, distancePinB]);

  // Center on pin
  const handleSelectPin = (pin: UnifiedGeospatialPin) => {
    setSelectedPin(pin);
    setCenterRotation({
      lon: pin.coordinates.lon,
      lat: pin.coordinates.lat
    });
  };

  // Open Dossier
  const handleOpenDossier = (pin: UnifiedGeospatialPin) => {
    const payload = buildGeospatialDossierPayload(pin);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  // Export handlers
  const handleExportCSV = () => {
    const csv = exportGeospatialPinsToCSV(pins);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radpro_geospatial_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const json = exportGeospatialPinsToJSON(pins);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `radpro_geospatial_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dispatch to Plume Module
  const handleDispatchPlume = (_pin: UnifiedGeospatialPin) => {
    navigate('/plume');
  };

  // Dispatch to Nuclear Weapon Effects Module
  const handleDispatchNuclearEffects = (_pin: UnifiedGeospatialPin) => {
    navigate('/nuclear-weapons-effects');
  };

  // Dispatch to Historical Incidents Module
  const handleDispatchIncidents = (_pin: UnifiedGeospatialPin) => {
    navigate('/incidents');
  };

  // Construct Plotly Traces by Category with Active Year Flash Highlighting
  const plotData = useMemo(() => {
    const reactorPins = pins.filter(p => p.category === 'reactor');
    const pastDetonationPins = pins.filter(p => p.category === 'detonation' && !p.isCurrentYear);
    const currentYearDetonationPins = pins.filter(p => p.category === 'detonation' && p.isCurrentYear);
    const incidentPins = pins.filter(p => p.category === 'incident');

    const traces: any[] = [];

    // 1. Civil Nuclear Power & Research Reactors
    if (reactorPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `Reactors (${reactorPins.length})`,
        lat: reactorPins.map(p => p.coordinates.lat),
        lon: reactorPins.map(p => p.coordinates.lon),
        text: reactorPins.map(p => `<b>${p.name}</b><br>${p.location}<br>Capacity: ${p.primaryMetric}<br>Type: ${p.typeOrClassification}`),
        hoverinfo: 'text',
        marker: {
          size: reactorPins.map(p => {
            if (p.typeOrClassification === 'Research') return 8;
            return Math.max(6, Math.min(16, Math.sqrt((p.rawReactor?.capacityMWe || 1000) / 25)));
          }),
          color: reactorPins.map(p => p.color),
          opacity: 0.85,
          symbol: 'circle',
          line: { width: 1.2, color: '#34d399' }
        },
        customdata: reactorPins
      });
    }

    // 2. Historical Past Detonations (Cumulative timeline prior years)
    if (pastDetonationPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: timelineMode !== 'off' ? `Past Tests (${pastDetonationPins.length})` : `Detonations (${pastDetonationPins.length})`,
        lat: pastDetonationPins.map(p => p.coordinates.lat),
        lon: pastDetonationPins.map(p => p.coordinates.lon),
        text: pastDetonationPins.map(p => `<b>${p.name}</b><br>${p.location}<br>${p.primaryMetric}<br>${p.dateOrYear} // ${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: pastDetonationPins.map(p => {
            const y = p.rawDetonation?.yieldKt || 20;
            if (y >= 1000) return 12;
            if (y >= 100) return 9;
            if (y >= 10) return 6;
            return 4.5;
          }),
          color: pastDetonationPins.map(p => p.color),
          opacity: 0.75,
          symbol: 'diamond',
          line: { width: 0.8, color: '#f87171' }
        },
        customdata: pastDetonationPins
      });
    }

    // 3. Current Year Active Explosions (Flashing Highlight Effect)
    if (currentYearDetonationPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `💥 Year ${currentYear} Blasts (${currentYearDetonationPins.length})`,
        lat: currentYearDetonationPins.map(p => p.coordinates.lat),
        lon: currentYearDetonationPins.map(p => p.coordinates.lon),
        text: currentYearDetonationPins.map(p => `<b>💥 ${p.name} (${p.dateOrYear})</b><br>${p.location}<br><b>${p.primaryMetric}</b><br>${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: currentYearDetonationPins.map(p => {
            const y = p.rawDetonation?.yieldKt || 20;
            if (y >= 1000) return 22;
            if (y >= 100) return 17;
            if (y >= 10) return 13;
            return 10;
          }),
          color: '#facc15', // Brilliant electric yellow/gold
          opacity: 0.98,
          symbol: 'star',
          line: { width: 2.5, color: '#ffffff' }
        },
        customdata: currentYearDetonationPins
      });
    }

    // 4. INES Historical Accidents
    if (incidentPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `Accidents (${incidentPins.length})`,
        lat: incidentPins.map(p => p.coordinates.lat),
        lon: incidentPins.map(p => p.coordinates.lon),
        text: incidentPins.map(p => `<b>${p.name}</b><br>${p.location}<br>${p.primaryMetric}<br>${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: incidentPins.map(p => Math.max(9, (p.rawIncident?.inesLevel || 4) * 2.2)),
          color: '#f59e0b',
          opacity: 0.92,
          symbol: 'hexagram',
          line: { width: 1.5, color: '#fbbf24' }
        },
        customdata: incidentPins
      });
    }

    // 5. Great Circle Distance Path
    if (distancePinA && distancePinB) {
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: 'Great Circle Path',
        lat: [distancePinA.coordinates.lat, distancePinB.coordinates.lat],
        lon: [distancePinA.coordinates.lon, distancePinB.coordinates.lon],
        line: {
          width: 3,
          color: '#00e5ff',
          dash: 'dash'
        },
        hoverinfo: 'none'
      });
    }

    return traces;
  }, [pins, timelineMode, currentYear, distancePinA, distancePinB]);

  // Handle click on map markers
  const handlePlotClick = (data: any) => {
    if (data.points && data.points.length > 0) {
      const pt = data.points[0];
      if (pt.customdata) {
        handleSelectPin(pt.customdata as UnifiedGeospatialPin);
      }
    }
  };

  return (
    <div
      className="global-nuclear-map-module"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        minHeight: '100%',
        paddingBottom: '40px'
      }}
    >
      
      {/* 1. TOP HEADER & PROJECTION SELECTOR */}
      <div className="panel" style={{ padding: '14px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
              <span>🌍 Global Nuclear Geospatial &amp; 3D Earth Hub</span>
              <span style={{ fontSize: '0.72rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px', fontWeight: 600 }}>
                IAEA PRIS (739 Units) // 2,038 Weapons Tests // Orthographic 3D
              </span>
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.86rem' }}>
              Comprehensive planetary observatory mapping 319 civil &amp; research complexes (739 commercial power units), 2,038 historic atomic/thermonuclear detonations (1945–present), and landmark radiological accident sites.
            </p>
          </div>

          {/* Action & Projection Modes */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(0,0,0,0.35)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>Projection:</span>
              <button
                className="btn"
                onClick={() => setProjectionType('orthographic')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'orthographic' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'orthographic' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'orthographic' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🌍 3D Globe
              </button>
              <button
                className="btn"
                onClick={() => setProjectionType('natural earth')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'natural earth' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'natural earth' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'natural earth' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🗺️ Natural Earth
              </button>
              <button
                className="btn"
                onClick={() => setProjectionType('mercator')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  background: projectionType === 'mercator' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: projectionType === 'mercator' ? '#00e5ff' : '#94a3b8',
                  border: projectionType === 'mercator' ? '1px solid #00e5ff' : '1px solid transparent'
                }}
              >
                🧭 Mercator
              </button>
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export filtered records as CSV"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              >
                📥 CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportJSON}
                title="Export filtered records as JSON"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
              >
                📥 JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GLOBAL STATUS HUD METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', flexShrink: 0 }}>
        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nuclear Power Complexes</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
            {stats.reactorCount} Sites (739 Units)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {(stats.totalMWe / 1000).toFixed(1)}k MWe Global Net Output
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weapons Detonations &amp; Tests</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {stats.detonationCount} Recorded Events
          </div>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
            {stats.totalYieldMt.toFixed(1)} Mt Historical Explosive Yield
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Landmark INES Incidents</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>
            {stats.incidentCount} Accidents
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Chernobyl, Fukushima, Goiânia...
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Map Markers</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
            {pins.length} Plotted Pins
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {timelineMode !== 'off' ? `Timeline Year: ${currentYear}` : 'Instant Haversine &amp; Plume Link'}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE HISTORICAL TIMELINE PLAYER (NEW FEATURE) */}
      <div
        className="panel"
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0
        }}
      >
        {/* Timeline Header & Transport Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ecf0f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏱️ Nuclear Testing Timeline</span>
            </span>

            {/* Play/Pause Button */}
            <button
              className="btn"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '5px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                color: isPlaying ? '#f87171' : '#34d399',
                border: isPlaying ? '1px solid #ef4444' : '1px solid #10b981',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{isPlaying ? '⏸ Pause' : '▶ Play Timelapse'}</span>
            </button>

            {/* Step -1 / +1 Year */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentYear(y => Math.max(1945, y - 1))}
                disabled={currentYear <= 1945}
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                title="Step backward one year"
              >
                ⏮ -1 Yr
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentYear(y => Math.min(2024, y + 1))}
                disabled={currentYear >= 2024}
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                title="Step forward one year"
              >
                +1 Yr ⏭
              </button>
            </div>

            {/* Speed Pills */}
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }}>
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  style={{
                    background: playbackSpeed === s ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    color: playbackSpeed === s ? '#00e5ff' : '#64748b',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: playbackSpeed === s ? 700 : 400
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Mode Selector & Active Year Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setTimelineMode('cumulative')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'cumulative' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  color: timelineMode === 'cumulative' ? '#00e5ff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timelineMode === 'cumulative' ? 600 : 400
                }}
                title="Shows all detonations up to the active year"
              >
                Cumulative (1945 → {currentYear})
              </button>
              <button
                onClick={() => setTimelineMode('single')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'single' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: timelineMode === 'single' ? '#f59e0b' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: timelineMode === 'single' ? 600 : 400
                }}
                title="Shows only detonations in the selected year"
              >
                Single Year ({currentYear})
              </button>
              <button
                onClick={() => setTimelineMode('off')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.73rem',
                  background: timelineMode === 'off' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: timelineMode === 'off' ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Shows all detonations without timeline filtering"
              >
                All Years (Off)
              </button>
            </div>

            {/* Large Active Year Display */}
            <div style={{
              background: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: '6px',
              padding: '4px 14px',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 800
            }}>
              {currentYear}
            </div>
          </div>
        </div>

        {/* Timeline Range Scrubber Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="range"
            min="1945"
            max="2024"
            step="1"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              accentColor: 'var(--color-primary)',
              cursor: 'pointer',
              height: '6px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
            <span>1945 (Trinity)</span>
            <span>1954 (Bravo)</span>
            <span>1961 (Tsar)</span>
            <span>1962 (Peak)</span>
            <span>1963 (PTBT)</span>
            <span>1974 (India)</span>
            <span>1992 (Moratorium)</span>
            <span>1998 (Pakistan)</span>
            <span>2017 (DPRK)</span>
            <span>2024</span>
          </div>
        </div>

        {/* Milestone & Annual Telemetry Banner */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderLeft: yearStats.milestoneTitle ? '3px solid #facc15' : '3px solid rgba(0, 229, 255, 0.3)',
          padding: '8px 12px',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            {yearStats.milestoneTitle ? (
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#facc15', marginRight: '6px' }}>
                  {yearStats.flag} {yearStats.milestoneTitle}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {yearStats.milestoneNote}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Nuclear testing operations continuing under international treaty regimes.
              </span>
            )}
          </div>

          {/* Quick Year Telemetry Stats */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#ecf0f1' }}>
              Tests in {currentYear}: <strong style={{ color: '#facc15' }}>{yearStats.annualTestCount}</strong> ({yearStats.annualYieldMt.toFixed(2)} Mt)
            </span>
            <span style={{ color: '#94a3b8' }}>
              Cumulative: <strong style={{ color: '#38bdf8' }}>{yearStats.cumulativeTestCount}</strong> ({yearStats.cumulativeYieldMt.toFixed(1)} Mt)
            </span>
          </div>
        </div>
      </div>

      {/* 4. CONTROLS & FILTER BAR */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
        
        {/* Row 1: Layer Switches + Search + Country */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Layer Visibility Toggles */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setShowReactors(!showReactors)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showReactors ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showReactors ? '#34d399' : '#64748b',
                border: showReactors ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🟢 Reactors ({stats.reactorCount})</span>
            </button>

            <button
              onClick={() => setShowDetonations(!showDetonations)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showDetonations ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showDetonations ? '#f87171' : '#64748b',
                border: showDetonations ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🔴 Detonations ({stats.detonationCount})</span>
            </button>

            <button
              onClick={() => setShowIncidents(!showIncidents)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showIncidents ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showIncidents ? '#fbbf24' : '#64748b',
                border: showIncidents ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>🟡 Accidents ({stats.incidentCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <input
            type="text"
            className="form-control"
            placeholder="Search facility name, test name, series, or country (e.g. 'Castle Bravo', 'Novaya Zemlya', 'Bruce')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 240px', fontSize: '0.82rem', padding: '6px 12px' }}
          />

          {/* Country Selector */}
          <select
            className="form-control"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ width: '180px', fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">All Nations ({countries.length})</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Reset View */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setCenterRotation({ lon: 10, lat: 25 });
              setSelectedCountry('all');
              setSearchQuery('');
              setSelectedEnvironment('all');
              setSelectedReactorStatus('all');
              setSelectedReactorType('all');
              setFeaturedDetonationsOnly(false);
              setTimelineMode('cumulative');
              setCurrentYear(1962);
            }}
            style={{ fontSize: '0.76rem', padding: '5px 10px' }}
            title="Reset all filters, timeline, and globe position"
          >
            ↺ Reset All
          </button>
        </div>

        {/* Row 2: Deep Drilldown Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
          
          {/* Landmark Featured Tests Switch */}
          <button
            onClick={() => setFeaturedDetonationsOnly(!featuredDetonationsOnly)}
            style={{
              fontSize: '0.74rem',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              background: featuredDetonationsOnly ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
              color: featuredDetonationsOnly ? 'var(--color-primary)' : '#94a3b8',
              border: featuredDetonationsOnly ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)'
            }}
            title="Toggle between landmark operations (77) and the full historical detonations catalog (2,038)"
          >
            {featuredDetonationsOnly ? '⭐ Landmark Tests Only (77)' : '🌐 All Weapons Tests (2,038)'}
          </button>

          {/* Test Environment Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Environment:</span>
            <select
              className="form-control"
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '135px' }}
            >
              <option value="all">All Environments</option>
              <option value="Atmospheric">Atmospheric / Air</option>
              <option value="Underground">Underground</option>
              <option value="Underwater">Underwater</option>
              <option value="Space/High-Altitude">Space / Exoatmospheric</option>
            </select>
          </div>

          {/* Reactor Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Plant Status:</span>
            <select
              className="form-control"
              value={selectedReactorStatus}
              onChange={(e) => setSelectedReactorStatus(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '135px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Permanent Shutdown">Permanent Shutdown</option>
              <option value="Suspended Operation">Suspended Operation</option>
            </select>
          </div>

          {/* Reactor Architecture / Family Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Architecture:</span>
            <select
              className="form-control"
              value={selectedReactorType}
              onChange={(e) => setSelectedReactorType(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '140px' }}
            >
              <option value="all">All Architectures</option>
              <option value="PWR">PWR</option>
              <option value="BWR">BWR</option>
              <option value="VVER">VVER (PWR)</option>
              <option value="PHWR/CANDU">PHWR / CANDU</option>
              <option value="RBMK/LWGR">RBMK / LWGR</option>
              <option value="GCR/AGR family">Gas-Cooled (AGR/GCR)</option>
              <option value="Fast Reactor">Fast Breeder (FBR)</option>
              <option value="Research">Research Reactor</option>
            </select>
          </div>

        </div>
      </div>

      {/* 5. MAIN GEOSPATIAL WORKSPACE (GLOBE CANVAS + INSPECTOR PANEL) */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPin ? '1fr 410px' : '1fr', gap: '18px', minHeight: '580px', flexShrink: 0 }}>
        
        {/* Globe Visualization Canvas */}
        <div
          className="panel"
          style={{
            position: 'relative',
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#070b14',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '8px',
            minHeight: '580px'
          }}
        >
          {/* Top Floating Helper Tag */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            zIndex: 10,
            background: 'rgba(5, 10, 18, 0.88)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.76rem',
            color: 'var(--color-text-muted)'
          }}>
            🖱️ <strong>Click &amp; Drag</strong> to rotate 3D Globe // <strong>Scroll</strong> to zoom // <strong>Click marker</strong> to inspect ({pins.length} active)
          </div>

          <Plot
            data={plotData}
            layout={{
              autosize: true,
              height: 580,
              margin: { t: 0, b: 0, l: 0, r: 0 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              geo: {
                projection: {
                  type: projectionType as any,
                  rotation: projectionType === 'orthographic' ? centerRotation : undefined
                },
                showland: true,
                landcolor: '#111827',
                showocean: true,
                oceancolor: '#070b14',
                showcountries: true,
                countrycolor: 'rgba(0, 229, 255, 0.25)',
                countrywidth: 0.8,
                showcoastlines: true,
                coastlinecolor: 'rgba(0, 229, 255, 0.4)',
                coastlinewidth: 1.0,
                showlakes: true,
                lakecolor: '#070b14',
                bgcolor: 'transparent'
              },
              showlegend: true,
              legend: {
                x: 0.02,
                y: 0.05,
                bgcolor: 'rgba(5, 10, 18, 0.88)',
                bordercolor: 'rgba(0, 229, 255, 0.3)',
                borderwidth: 1,
                font: { color: '#ecf0f1', size: 11 }
              }
            }}
            config={{
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ['select2d', 'lasso2d']
            }}
            onClick={handlePlotClick}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Tactical Inspector Flyout Panel */}
        {selectedPin && (
          <div
            className="panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(5, 10, 18, 0.92)',
              border: `1px solid ${selectedPin.color}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              overflowY: 'auto',
              maxHeight: '620px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `${selectedPin.color}22`,
                    color: selectedPin.color,
                    border: `1px solid ${selectedPin.color}`
                  }}
                >
                  {selectedPin.category === 'reactor' ? '⚛️ NUCLEAR REACTOR' : selectedPin.category === 'detonation' ? '💥 NUCLEAR DETONATION' : '⚠️ INES ACCIDENT'}
                </span>
                <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.15rem', color: '#fff', lineHeight: 1.25 }}>
                  {selectedPin.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                  📍 {selectedPin.location}
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedPin(null)}
                style={{ padding: '2px 8px', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {/* Coordinates & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Coordinates</span>
                <div style={{ fontSize: '0.78rem', color: '#ecf0f1', fontFamily: 'var(--font-mono)' }}>
                  {selectedPin.coordinates.lat.toFixed(4)}°, {selectedPin.coordinates.lon.toFixed(4)}°
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Date / Grid</span>
                <div style={{ fontSize: '0.78rem', color: '#ecf0f1' }}>
                  {selectedPin.dateOrYear}
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Specification:</span>
                <strong style={{ color: selectedPin.color }}>{selectedPin.primaryMetric}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Classification:</span>
                <strong style={{ color: '#fff' }}>{selectedPin.typeOrClassification}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Status / Context:</span>
                <span style={{ color: '#cbd5e1' }}>{selectedPin.secondaryMetric}</span>
              </div>
            </div>

            {/* Specific Reactor Details */}
            {selectedPin.rawReactor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}>Core Equilibrium Screening Inventory:</div>
                  <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                    • I-131: {((selectedPin.rawReactor.fissionInventoryTBq.i131 || selectedPin.rawReactor.fissionInventoryTBq.I131 || 0) / 1e6).toFixed(2)}M TBq<br />
                    • Cs-137: {((selectedPin.rawReactor.fissionInventoryTBq.cs137 || selectedPin.rawReactor.fissionInventoryTBq.Cs137 || 0) / 1e6).toFixed(2)}M TBq<br />
                    • Xe-133: {((selectedPin.rawReactor.fissionInventoryTBq.xe133 || selectedPin.rawReactor.fissionInventoryTBq.Xe133 || 0) / 1e6).toFixed(2)}M TBq
                  </div>
                  <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                    Operator: {selectedPin.rawReactor.operator}
                  </div>
                </div>

                {/* Individual Units Breakdown (PRIS Roster) */}
                {selectedPin.rawReactor.units && selectedPin.rawReactor.units.length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <div style={{ color: '#ecf0f1', fontWeight: 600, marginBottom: '6px' }}>
                      Operational Units at this Site ({selectedPin.rawReactor.units.length}):
                    </div>
                    <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedPin.rawReactor.units.map(u => (
                        <div key={u.unitName} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>
                          <span style={{ color: '#38bdf8' }}>{u.unitName} ({u.model})</span>
                          <span style={{ color: u.status === 'Operational' ? '#10b981' : '#f59e0b' }}>{u.capacityMWe > 0 ? `${u.capacityMWe} MWe` : u.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Specific Detonation Details */}
            {selectedPin.rawDetonation && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>Prompt Weapon Effects Radii:</div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                  • Fireball Radius: {selectedPin.rawDetonation.fireballRadiusM} m<br />
                  • 5-psi Blast Overpressure: {selectedPin.rawDetonation.promptEffects.blast5psiRadiusKm ?? ((selectedPin.rawDetonation.promptEffects.blast5psiRadiusM || 0) / 1000).toFixed(2)} km<br />
                  • 3rd Degree Thermal Burns: {selectedPin.rawDetonation.promptEffects.thermalRadiusKm_3rdDeg ?? ((selectedPin.rawDetonation.promptEffects.thermalBurn3rdDegRadiusM || 0) / 1000).toFixed(2)} km<br />
                  • 1.0 Sv Prompt Dose: {selectedPin.rawDetonation.promptEffects.promptRadiation1SvRadiusKm ?? ((selectedPin.rawDetonation.promptEffects.prompt1SvDoseRadiusM || 0) / 1000).toFixed(2)} km
                </div>
                {selectedPin.rawDetonation.operationSeries && (
                  <div style={{ marginTop: '6px', color: 'var(--color-primary)', fontSize: '0.74rem' }}>
                    Series: {selectedPin.rawDetonation.operationSeries}
                  </div>
                )}
              </div>
            )}

            {/* Description Notes */}
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              {selectedPin.rawReactor?.notes || selectedPin.rawDetonation?.historicalSignificance || selectedPin.rawIncident?.summary}
            </p>

            {/* Cross-Module Calculation Launchers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                🚀 Launch Scenario Dispatchers:
              </div>

              {selectedPin.category === 'reactor' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleDispatchPlume(selectedPin)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
                >
                  💨 Model Atmospheric Plume from Plant
                </button>
              )}

              {selectedPin.category === 'detonation' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleDispatchNuclearEffects(selectedPin)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none' }}
                >
                  💥 Simulate Weapon Blast &amp; HEMP Profile
                </button>
              )}

              {selectedPin.category === 'incident' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleDispatchIncidents(selectedPin)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
                >
                  🔬 View Full Forensic Accident Investigation
                </button>
              )}

              {/* Set Pin as Distance Target */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                <button
                  className={`btn ${distancePinA?.id === selectedPin.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDistancePinA(selectedPin)}
                  style={{ fontSize: '0.74rem', padding: '4px 6px' }}
                >
                  📍 Set Point A
                </button>
                <button
                  className={`btn ${distancePinB?.id === selectedPin.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDistancePinB(selectedPin)}
                  style={{ fontSize: '0.74rem', padding: '4px 6px' }}
                >
                  🎯 Set Point B
                </button>
              </div>

              {/* Part 11 Audit Dossier */}
              <button
                className="btn btn-secondary"
                onClick={() => handleOpenDossier(selectedPin)}
                style={{ fontSize: '0.78rem', padding: '6px 10px', marginTop: '4px' }}
              >
                📜 Generate Signed Part 11 Dossier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. DISTANCE MEASUREMENT BANNER (WHEN ACTIVE) */}
      {distancePinA && distancePinB && measuredDistanceKm !== null && (
        <div
          className="panel"
          style={{
            padding: '12px 18px',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.86rem', color: '#ecf0f1' }}>
              📏 Great Circle Distance between <strong>{distancePinA.name}</strong> and <strong>{distancePinB.name}</strong>:
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {measuredDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              ({(measuredDistanceKm * 0.539957).toFixed(1)} Nautical Miles)
            </span>
            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>
              ⚡ Shockwave transit: ~{(measuredDistanceKm / 0.34).toFixed(0)}s (air speed)
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDistancePinA(null);
              setDistancePinB(null);
            }}
            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
          >
            Clear Measurement
          </button>
        </div>
      )}

      {/* 7. BOTTOM DIRECTORY GRID / QUICK-SELECT CARDS */}
      <div className="panel" style={{ padding: '14px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '0.94rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋 Global Nuclear Site Directory</span>
            <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', color: 'var(--color-text-muted)' }}>
              {pins.length} Matches Plotted
            </span>
          </h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveCategoryFilter('all')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 9px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeCategoryFilter === 'all' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                color: activeCategoryFilter === 'all' ? 'var(--color-primary)' : '#94a3b8',
                border: activeCategoryFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              All Types
            </button>
            <button
              onClick={() => setActiveCategoryFilter('reactor')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 9px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeCategoryFilter === 'reactor' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeCategoryFilter === 'reactor' ? '#34d399' : '#94a3b8',
                border: activeCategoryFilter === 'reactor' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              Reactors ({stats.reactorCount})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('detonation')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 9px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeCategoryFilter === 'detonation' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: activeCategoryFilter === 'detonation' ? '#f87171' : '#94a3b8',
                border: activeCategoryFilter === 'detonation' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              Detonations ({stats.detonationCount})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('incident')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 9px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeCategoryFilter === 'incident' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: activeCategoryFilter === 'incident' ? '#fbbf24' : '#94a3b8',
                border: activeCategoryFilter === 'incident' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              Accidents ({stats.incidentCount})
            </button>
          </div>
        </div>

        {/* Scrollable list of sites */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '6px'
        }}>
          {pins.map(pin => (
            <div
              key={pin.id}
              onClick={() => handleSelectPin(pin)}
              style={{
                background: selectedPin?.id === pin.id ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${selectedPin?.id === pin.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all 0.12s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pin.name}
                </span>
                <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: `${pin.color}22`, color: pin.color, fontWeight: 'bold' }}>
                  {pin.category === 'reactor' ? pin.typeOrClassification : pin.category === 'detonation' ? (pin.year ? `${pin.year}` : 'TEST') : 'INES'}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                📍 {pin.location}
              </div>
              <div style={{ fontSize: '0.74rem', color: pin.color, marginTop: '2px' }}>
                {pin.primaryMetric}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. UNIVERSAL 21 CFR PART 11 AUDIT DOSSIER MODAL */}
      {activeDossierPayload && (
        <AuditDossierModal
          isOpen={isDossierOpen}
          onClose={() => setIsDossierOpen(false)}
          payload={activeDossierPayload}
        />
      )}
    </div>
  );
};

export default GlobalNuclearMapModule;
