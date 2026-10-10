import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PlotComponent from 'react-plotly.js';
import {
  getUnifiedGeospatialPins,
  getGeospatialCountries,
  calculateHaversineDistanceKm,
  buildGeospatialDossierPayload,
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

  // Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | GeospatialCategory>('all');

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

  // Filtered Pins
  const pins = useMemo(() => {
    return getUnifiedGeospatialPins({
      includeReactors: showReactors && (activeCategoryFilter === 'all' || activeCategoryFilter === 'reactor'),
      includeDetonations: showDetonations && (activeCategoryFilter === 'all' || activeCategoryFilter === 'detonation'),
      includeIncidents: showIncidents && (activeCategoryFilter === 'all' || activeCategoryFilter === 'incident'),
      searchQuery,
      country: selectedCountry
    });
  }, [showReactors, showDetonations, showIncidents, activeCategoryFilter, searchQuery, selectedCountry]);

  // Aggregate Statistics
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

  // Construct Plotly Traces by Category
  const plotData = useMemo(() => {
    const reactorPins = pins.filter(p => p.category === 'reactor');
    const detonationPins = pins.filter(p => p.category === 'detonation');
    const incidentPins = pins.filter(p => p.category === 'incident');

    const traces: any[] = [];

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
          size: reactorPins.map(p => Math.max(7, Math.min(18, Math.sqrt((p.rawReactor?.capacityMWe || 1000) / 18)))),
          color: '#10b981',
          opacity: 0.9,
          symbol: 'circle',
          line: { width: 1.5, color: '#34d399' }
        },
        customdata: reactorPins
      });
    }

    if (detonationPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `Detonations (${detonationPins.length})`,
        lat: detonationPins.map(p => p.coordinates.lat),
        lon: detonationPins.map(p => p.coordinates.lon),
        text: detonationPins.map(p => `<b>${p.name}</b><br>${p.location}<br>${p.primaryMetric}<br>${p.dateOrYear}`),
        hoverinfo: 'text',
        marker: {
          size: detonationPins.map(p => Math.max(8, Math.min(22, Math.sqrt((p.rawDetonation?.yieldKt || 20) / 15)))),
          color: '#ef4444',
          opacity: 0.9,
          symbol: 'diamond',
          line: { width: 1.5, color: '#f87171' }
        },
        customdata: detonationPins
      });
    }

    if (incidentPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `INES Accidents (${incidentPins.length})`,
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

    // Add great circle distance arc if distance pins are selected
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
  }, [pins, distancePinA, distancePinB]);

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
    <div className="global-nuclear-map-module" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      
      {/* Top Header */}
      <div className="panel-header" style={{ marginBottom: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🌍 Global Nuclear Geospatial &amp; 3D Earth Hub</span>
              <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
                IAEA PRIS // Nuclear Weapons Tests // Orthographic 3D
              </span>
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Interactive 3D planetary observatory mapping operational nuclear power stations, historic atomic &amp; thermonuclear detonations, and landmark radiological accident sites.
            </p>
          </div>

          {/* Projection Modes */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>Projection:</span>
            <button
              className={`btn ${projectionType === 'orthographic' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setProjectionType('orthographic')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              🌍 3D Globe
            </button>
            <button
              className={`btn ${projectionType === 'natural earth' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setProjectionType('natural earth')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              🗺️ Natural Earth
            </button>
            <button
              className={`btn ${projectionType === 'mercator' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setProjectionType('mercator')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              🧭 Mercator
            </button>
          </div>
        </div>
      </div>

      {/* Global Status HUD Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nuclear Power Stations</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
            {stats.reactorCount} Major Facilities
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {(stats.totalMWe / 1000).toFixed(1)}k MWe Global Capacity
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Weapons Detonations &amp; Sites</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
            {stats.detonationCount} Key Operations
          </div>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
            {stats.totalYieldMt.toFixed(1)} Megatons Historical Yield
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Landmark INES Incidents</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>
            {stats.incidentCount} Accidents
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Chernobyl, Fukushima, Goiânia...
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Active Map Markers</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
            {pins.length} Plotted Pins
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Instant Haversine &amp; Plume Link
          </div>
        </div>
      </div>

      {/* Controls & Layer Toggles Bar */}
      <div className="panel" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Layer Toggles */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className={`btn ${showReactors ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowReactors(!showReactors)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
            >
              <span>🟢 Nuclear Reactors ({stats.reactorCount})</span>
            </button>

            <button
              className={`btn ${showDetonations ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowDetonations(!showDetonations)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
            >
              <span>🔴 Nuclear Detonations ({stats.detonationCount})</span>
            </button>

            <button
              className={`btn ${showIncidents ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowIncidents(!showIncidents)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px' }}
            >
              <span>🟡 INES Incidents ({stats.incidentCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <input
            type="text"
            className="form-control"
            placeholder="Search facility name, test name, or country (e.g. 'Vogtle', 'Bikini', 'France')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 200px', fontSize: '0.82rem', padding: '6px 12px' }}
          />

          {/* Country Selector */}
          <select
            className="form-control"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ width: '180px', fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <option value="all">All Sovereign Nations</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Reset View */}
          <button
            className="btn btn-secondary"
            onClick={() => setCenterRotation({ lon: 10, lat: 25 })}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
            title="Reset globe to prime meridian"
          >
            ↺ Reset Globe
          </button>
        </div>
      </div>

      {/* Main Geospatial Workspace (Globe + Inspector Drawer) */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPin ? '1fr 380px' : '1fr', gap: '16px', flex: 1, minHeight: '520px' }}>
        
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
            borderRadius: '8px'
          }}
        >
          {/* Top Floating Helper Tag */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            zIndex: 10,
            background: 'rgba(5, 10, 18, 0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.76rem',
            color: 'var(--color-text-muted)'
          }}>
            🖱️ <strong>Click &amp; Drag</strong> to rotate 3D Globe // <strong>Scroll</strong> to zoom // <strong>Click marker</strong> to inspect
          </div>

          <Plot
            data={plotData}
            layout={{
              autosize: true,
              height: 540,
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
                bgcolor: 'rgba(5, 10, 18, 0.85)',
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
              background: 'rgba(5, 10, 18, 0.85)',
              border: `1px solid ${selectedPin.color}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              overflowY: 'auto'
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
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}>Core Equilibrium Inventory Estimate:</div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                  • I-131: {(selectedPin.rawReactor.fissionInventoryTBq.I131 / 1e6).toFixed(1)}M TBq<br />
                  • Cs-137: {(selectedPin.rawReactor.fissionInventoryTBq.Cs137 / 1e6).toFixed(1)}M TBq<br />
                  • Xe-133: {(selectedPin.rawReactor.fissionInventoryTBq.Xe133 / 1e6).toFixed(1)}M TBq
                </div>
                <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                  Operator: {selectedPin.rawReactor.operator}
                </div>
              </div>
            )}

            {/* Specific Detonation Details */}
            {selectedPin.rawDetonation && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>Prompt Weapon Effects Radii:</div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                  • 5-psi Moderate Blast Damage: {selectedPin.rawDetonation.promptEffects.blast5psiRadiusKm} km<br />
                  • 3rd Degree Thermal Burns: {selectedPin.rawDetonation.promptEffects.thermalRadiusKm_3rdDeg} km<br />
                  • 1.0 Sv Prompt Dose: {selectedPin.rawDetonation.promptEffects.promptRadiation1SvRadiusKm} km
                </div>
                <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                  Purpose: {selectedPin.rawDetonation.purpose}
                </div>
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

      {/* Distance Measurement Bar (When Active) */}
      {distancePinA && distancePinB && measuredDistanceKm !== null && (
        <div
          className="panel"
          style={{
            padding: '12px 16px',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', color: '#ecf0f1' }}>
              📏 Great Circle Distance between <strong>{distancePinA.name}</strong> and <strong>{distancePinB.name}</strong>:
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              {measuredDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              ({(measuredDistanceKm * 0.539957).toFixed(1)} Nautical Miles)
            </span>
            <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>
              ⚡ Shockwave transit: ~{(measuredDistanceKm / 0.34).toFixed(0)}s (air)
            </span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDistancePinA(null);
              setDistancePinB(null);
            }}
            style={{ fontSize: '0.76rem', padding: '4px 8px' }}
          >
            Clear Measurement
          </button>
        </div>
      )}

      {/* Bottom Directory Grid / Quick-Select Cards */}
      <div className="panel" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff' }}>
            📋 Global Nuclear Site Directory ({pins.length} Matches)
          </h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn ${activeCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategoryFilter('all')}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              All Types
            </button>
            <button
              className={`btn ${activeCategoryFilter === 'reactor' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategoryFilter('reactor')}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              Reactors
            </button>
            <button
              className={`btn ${activeCategoryFilter === 'detonation' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategoryFilter('detonation')}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              Detonations
            </button>
            <button
              className={`btn ${activeCategoryFilter === 'incident' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategoryFilter('incident')}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              Accidents
            </button>
          </div>
        </div>

        {/* Scrollable list of sites */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '10px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '4px'
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
                  {pin.category === 'reactor' ? 'PWR/BWR' : pin.category === 'detonation' ? 'TEST' : 'INES'}
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

      {/* Universal 21 CFR Part 11 Audit Dossier Modal */}
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
