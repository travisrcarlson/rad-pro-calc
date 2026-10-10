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
import {
  calculateEPZEvacuationPlan,
  buildEPZDossierPayload,
  DEFAULT_EPZ_CONFIG,
  type EPZEvacuationPlan
} from '../../services/epzConsequenceService';
import {
  invertSeismicMagnitudeToYield,
  calculateExpectedMbFromYield,
  buildSeismicYieldDossierPayload,
  GEOLOGICAL_MEDIA,
  type GeologicalMedium,
  type SeismicInversionResult
} from '../../services/seismicYieldInversionService';

const Plot = (PlotComponent as any).default || PlotComponent;

export const GlobalNuclearMapModule: React.FC = () => {
  const navigate = useNavigate();

  // Projection Type State
  const [projectionType, setProjectionType] = useState<'orthographic' | 'natural earth' | 'equirectangular' | 'mercator'>('orthographic');

  // Layer Visibility State
  const [showReactors, setShowReactors] = useState<boolean>(true);
  const [showDetonations, setShowDetonations] = useState<boolean>(true);
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showCTBTO, setShowCTBTO] = useState<boolean>(true);

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
  const [selectedCTBTOTech, setSelectedCTBTOTech] = useState<string>('all');

  // Bottom Command & Analysis Center Active Tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'directory' | 'epz_planner' | 'seismic_inversion'>('directory');

  // EPZ Evacuation Planning State
  const [isEPZOverlayActive, setIsEPZOverlayActive] = useState<boolean>(true);
  const [epzWindOriginDeg, setEpzWindOriginDeg] = useState<number>(315);
  const [epzWindSpeedMps, setEpzWindSpeedMps] = useState<number>(4.0);
  const [epzStabilityClass, setEpzStabilityClass] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('D');
  const [epzCoreReleaseFraction, setEpzCoreReleaseFraction] = useState<number>(0.05);
  const [epzTargetReactorId, setEpzTargetReactorId] = useState<string>('zaporizhzhia');

  // CTBTO Seismic Yield Inversion State
  const [seismicObservedMb, setSeismicObservedMb] = useState<number>(6.30);
  const [seismicMedium, setSeismicMedium] = useState<GeologicalMedium>('hard_rock');
  const [seismicBurialDepthM, setSeismicBurialDepthM] = useState<number>(550);
  const [seismicEpicenterCoords, setSeismicEpicenterCoords] = useState<{ lat: number; lon: number }>({ lat: 41.297, lon: 129.083 });
  const [seismicSiteName, setSeismicSiteName] = useState<string>('Punggye-ri Nuclear Test Site (Mt. Mantap)');

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
      includeCTBTO: showCTBTO && (activeCategoryFilter === 'all' || activeCategoryFilter === 'ctbto'),
      ctbtoTech: selectedCTBTOTech,
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
    showCTBTO,
    selectedCTBTOTech,
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
    const ctbtoCount = all.filter(p => p.category === 'ctbto').length;

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
      ctbtoCount,
      totalMWe,
      totalYieldMt: totalYieldKt / 1000
    };
  }, []);

  // EPZ Target Reactor Selection
  const allReactors = useMemo(() => {
    return getUnifiedGeospatialPins({ includeReactors: true, includeDetonations: false, includeIncidents: false, includeCTBTO: false });
  }, []);

  const selectedReactorForEPZ = useMemo(() => {
    if (selectedPin?.category === 'reactor' && selectedPin.rawReactor) {
      return selectedPin.rawReactor;
    }
    const match = allReactors.find(p => p.id === epzTargetReactorId)?.rawReactor;
    if (match) return match;
    return allReactors[0]?.rawReactor || null;
  }, [selectedPin, epzTargetReactorId, allReactors]);

  // EPZ Consequence Calculation
  const epzPlan: EPZEvacuationPlan | null = useMemo(() => {
    if (!selectedReactorForEPZ) return null;
    return calculateEPZEvacuationPlan({
      plantName: selectedReactorForEPZ.name,
      coordinates: selectedReactorForEPZ.coordinates,
      thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
      coreReleaseFraction: epzCoreReleaseFraction,
      windOriginDegrees: epzWindOriginDeg,
      windSpeedMps: epzWindSpeedMps,
      stabilityClass: epzStabilityClass,
      config: DEFAULT_EPZ_CONFIG
    });
  }, [selectedReactorForEPZ, epzCoreReleaseFraction, epzWindOriginDeg, epzWindSpeedMps, epzStabilityClass]);

  // Seismic Inversion Calculation
  const seismicResult: SeismicInversionResult = useMemo(() => {
    return invertSeismicMagnitudeToYield(
      seismicObservedMb,
      seismicMedium,
      seismicBurialDepthM,
      seismicEpicenterCoords
    );
  }, [seismicObservedMb, seismicMedium, seismicBurialDepthM, seismicEpicenterCoords]);

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

  // Open EPZ Emergency Planning Dossier
  const handleOpenEPZDossier = () => {
    if (!selectedReactorForEPZ || !epzPlan) return;
    const payload = buildEPZDossierPayload(
      {
        plantName: selectedReactorForEPZ.name,
        coordinates: selectedReactorForEPZ.coordinates,
        thermalPowerMWth: selectedReactorForEPZ.thermalMWth || 3000,
        coreReleaseFraction: epzCoreReleaseFraction,
        windOriginDegrees: epzWindOriginDeg,
        windSpeedMps: epzWindSpeedMps,
        stabilityClass: epzStabilityClass,
        config: DEFAULT_EPZ_CONFIG
      },
      epzPlan
    );
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  // Open CTBTO Seismic Yield Inversion Dossier
  const handleOpenSeismicDossier = () => {
    const payload = buildSeismicYieldDossierPayload(seismicResult, seismicSiteName);
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

    // 5. CTBTO International Monitoring System (IMS) Stations
    const ctbtoPins = pins.filter(p => p.category === 'ctbto');
    if (ctbtoPins.length > 0) {
      traces.push({
        type: 'scattergeo',
        mode: 'markers',
        name: `📡 CTBTO Stations (${ctbtoPins.length})`,
        lat: ctbtoPins.map(p => p.coordinates.lat),
        lon: ctbtoPins.map(p => p.coordinates.lon),
        text: ctbtoPins.map(p => `<b>📡 ${p.name}</b><br>${p.location}<br><b>${p.primaryMetric}</b><br>${p.secondaryMetric}`),
        hoverinfo: 'text',
        marker: {
          size: ctbtoPins.map(p => (p.isFeatured ? 9 : 7)),
          color: ctbtoPins.map(p => p.color),
          opacity: 0.88,
          symbol: 'square',
          line: { width: 1.2, color: '#f8fafc' }
        },
        customdata: ctbtoPins
      });
    }

    // 6. EPZ Emergency Planning Zones & Keyhole Evacuation Arc Overlay
    if (isEPZOverlayActive && epzPlan && selectedReactorForEPZ) {
      // Keyhole Wedge Area (Plume Evacuation Arc)
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        fill: 'toself',
        fillcolor: 'rgba(234, 179, 8, 0.22)',
        name: `🚨 Keyhole Arc (${epzPlan.affectedSectors.join('-')})`,
        lat: epzPlan.keyholeWedgePolygon.map(p => p.lat),
        lon: epzPlan.keyholeWedgePolygon.map(p => p.lon),
        line: { width: 2.5, color: '#facc15' },
        hoverinfo: 'text',
        text: `<b>🚨 Downwind Evacuation Keyhole Wedge</b><br>Centerline: ${epzPlan.plumeCenterlineBearingDeg}° (${epzPlan.keyholeCenterSector})<br>Evacuation Sectors: ${epzPlan.affectedSectors.join(', ')}<br>PAG Evacuation Radius: ${epzPlan.evacuationRadiusKm} km`
      });

      // PAZ 5 km Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `PAZ Ring (5 km) - ${selectedReactorForEPZ.name}`,
        lat: epzPlan.pazGeodesicRing.map(p => p.lat),
        lon: epzPlan.pazGeodesicRing.map(p => p.lon),
        line: { width: 2, color: '#ef4444', dash: 'dot' },
        hoverinfo: 'text',
        text: `<b>Precautionary Action Zone (PAZ)</b><br>5.0 km Radial Distance<br>Mandatory Immediate Evacuation`
      });

      // UPZ 16 km (10 mi) Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `UPZ Ring (16 km / 10 mi)`,
        lat: epzPlan.upzGeodesicRing.map(p => p.lat),
        lon: epzPlan.upzGeodesicRing.map(p => p.lon),
        line: { width: 2, color: '#f59e0b', dash: 'dash' },
        hoverinfo: 'text',
        text: `<b>Urgent Protective Action Zone (UPZ)</b><br>16.1 km (10.0 mi) Plume Exposure Distance`
      });

      // IPZ 80 km (50 mi) Ring
      traces.push({
        type: 'scattergeo',
        mode: 'lines',
        name: `IPZ Ingestion Ring (80 km / 50 mi)`,
        lat: epzPlan.ipzGeodesicRing.map(p => p.lat),
        lon: epzPlan.ipzGeodesicRing.map(p => p.lon),
        line: { width: 1.5, color: '#00e5ff', dash: 'dashdot' },
        hoverinfo: 'text',
        text: `<b>Ingestion Planning Zone (IPZ)</b><br>80.5 km (50.0 mi) Ingestion Pathway Distance`
      });
    }

    // 7. Great Circle Distance Path
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
  }, [pins, timelineMode, currentYear, distancePinA, distancePinB, isEPZOverlayActive, epzPlan, selectedReactorForEPZ]);

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

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CTBTO IMS Stations</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
            {stats.ctbtoCount} Certified Sites
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Radionuclide, Seismic, Infrasound
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Map Markers</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
            {pins.length} Plotted Pins
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {timelineMode !== 'off' ? `Timeline Year: ${currentYear}` : 'Instant Haversine & Plume Link'}
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

            <button
              onClick={() => setShowCTBTO(!showCTBTO)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: showCTBTO ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                color: showCTBTO ? '#38bdf8' : '#64748b',
                border: showCTBTO ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <span>📡 CTBTO ({stats.ctbtoCount})</span>
            </button>

            <button
              onClick={() => setIsEPZOverlayActive(!isEPZOverlayActive)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                padding: '5px 11px',
                borderRadius: '5px',
                cursor: 'pointer',
                background: isEPZOverlayActive ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                color: isEPZOverlayActive ? '#facc15' : '#64748b',
                border: isEPZOverlayActive ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)'
              }}
              title="Toggle EPZ 5km/16km/80km rings and keyhole evacuation wedge on selected plant"
            >
              <span>🚨 EPZ Keyhole {isEPZOverlayActive ? 'ON' : 'OFF'}</span>
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
              setShowCTBTO(true);
              setSelectedCTBTOTech('all');
              setIsEPZOverlayActive(true);
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

          {/* CTBTO IMS Technology Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>IMS Tech:</span>
            <select
              className="form-control"
              value={selectedCTBTOTech}
              onChange={(e) => setSelectedCTBTOTech(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', width: '145px' }}
            >
              <option value="all">All IMS Tech</option>
              <option value="Radionuclide">Radionuclide (Aerosol/Xe)</option>
              <option value="Primary Seismic">Primary Seismic</option>
              <option value="Infrasound">Infrasound</option>
              <option value="Hydroacoustic">Hydroacoustic</option>
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
                  {selectedPin.category === 'reactor' ? '⚛️ NUCLEAR REACTOR' : selectedPin.category === 'detonation' ? '💥 NUCLEAR DETONATION' : selectedPin.category === 'ctbto' ? '📡 CTBTO IMS STATION' : '⚠️ INES ACCIDENT'}
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

            {/* Specific CTBTO Details */}
            {selectedPin.rawCTBTO && (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>International Monitoring System (IMS):</div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                  • Station Code: {selectedPin.rawCTBTO.stationCode}<br />
                  • Technology: {selectedPin.rawCTBTO.technology}<br />
                  • Station Status: {selectedPin.rawCTBTO.status}<br />
                  • Noble Gas Detection: {selectedPin.rawCTBTO.nobleGasEquipped ? 'Certified High Sensitivity Xe-133/Xe-135 Detector' : 'Particulate Radionuclide Detector'}<br />
                  • Monitored Signatures: {selectedPin.rawCTBTO.targetIsotopes.join(', ') || 'Teleseismic Waveforms'}
                </div>
              </div>
            )}

            {/* Description Notes */}
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              {selectedPin.rawReactor?.notes || selectedPin.rawDetonation?.historicalSignificance || selectedPin.rawCTBTO?.notes || selectedPin.rawIncident?.summary}
            </p>

            {/* Cross-Module Calculation Launchers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                🚀 Launch Scenario Dispatchers:
              </div>

              {selectedPin.category === 'reactor' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDispatchPlume(selectedPin)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
                  >
                    💨 Model Atmospheric Plume from Plant
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setEpzTargetReactorId(selectedPin.id);
                      setActiveWorkspaceTab('epz_planner');
                    }}
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 10px',
                      width: '100%',
                      background: 'rgba(234, 179, 8, 0.15)',
                      color: '#facc15',
                      border: '1px solid #facc15'
                    }}
                  >
                    🚨 Plan EPZ Evacuation Arc & PAG Checklist
                  </button>
                </>
              )}

              {selectedPin.category === 'detonation' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDispatchNuclearEffects(selectedPin)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none' }}
                  >
                    💥 Simulate Weapon Blast & HEMP Profile
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setSeismicSiteName(selectedPin.name);
                      setSeismicEpicenterCoords(selectedPin.coordinates);
                      if (selectedPin.rawDetonation?.yieldKt) {
                        const expected = calculateExpectedMbFromYield(selectedPin.rawDetonation.yieldKt);
                        setSeismicObservedMb(expected);
                      }
                      setActiveWorkspaceTab('seismic_inversion');
                    }}
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 10px',
                      width: '100%',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid #38bdf8'
                    }}
                  >
                    📡 Invert Seismic Waveform Yield (CTBTO)
                  </button>
                </>
              )}

              {selectedPin.category === 'ctbto' && (
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveWorkspaceTab('seismic_inversion')}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none' }}
                >
                  📡 Launch Seismic Inversion Analysis
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

      {/* 7. BOTTOM COMMAND & ANALYSIS CENTER (MULTI-TABBED) */}
      <div className="panel" style={{ padding: '16px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Workspace Mode Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveWorkspaceTab('directory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'directory' ? 700 : 500,
                background: activeWorkspaceTab === 'directory' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'directory' ? 'var(--color-primary)' : '#94a3b8',
                border: activeWorkspaceTab === 'directory' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>📋 Global Directory</span>
              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(0,0,0,0.3)', color: '#ecf0f1' }}>
                {pins.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('epz_planner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'epz_planner' ? 700 : 500,
                background: activeWorkspaceTab === 'epz_planner' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'epz_planner' ? '#facc15' : '#94a3b8',
                border: activeWorkspaceTab === 'epz_planner' ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>🚨 EPZ Evacuation Planner</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(234, 179, 8, 0.25)', color: '#facc15', fontWeight: 'bold' }}>
                EPA PAG 2017
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('seismic_inversion')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: activeWorkspaceTab === 'seismic_inversion' ? 700 : 500,
                background: activeWorkspaceTab === 'seismic_inversion' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeWorkspaceTab === 'seismic_inversion' ? '#38bdf8' : '#94a3b8',
                border: activeWorkspaceTab === 'seismic_inversion' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <span>📡 CTBTO Seismic Yield Inversion</span>
              <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontWeight: 'bold' }}>
                Murphy-Ringdal
              </span>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {activeWorkspaceTab === 'directory' && `${pins.length} Facilities & Events Filtered`}
            {activeWorkspaceTab === 'epz_planner' && (selectedReactorForEPZ ? `Active Plant: ${selectedReactorForEPZ.name}` : 'Select a reactor')}
            {activeWorkspaceTab === 'seismic_inversion' && `Active Event: ${seismicSiteName}`}
          </div>
        </div>

        {/* TAB 1: DIRECTORY GRID */}
        {activeWorkspaceTab === 'directory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Filter directory records by category or search term:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                  All Types ({pins.length})
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
                  onClick={() => setActiveCategoryFilter('ctbto')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: activeCategoryFilter === 'ctbto' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: activeCategoryFilter === 'ctbto' ? '#38bdf8' : '#94a3b8',
                    border: activeCategoryFilter === 'ctbto' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  CTBTO Stations ({stats.ctbtoCount})
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
              maxHeight: '280px',
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
                      {pin.category === 'reactor' ? pin.typeOrClassification : pin.category === 'detonation' ? (pin.year ? `${pin.year}` : 'TEST') : pin.category === 'ctbto' ? 'CTBTO' : 'INES'}
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
        )}

        {/* TAB 2: EPZ EVACUATION PLANNER CONSOLE */}
        {activeWorkspaceTab === 'epz_planner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header / Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚨 IAEA GSR Part 7 &amp; EPA PAG 2017 Emergency Planning Zone Engine</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  16-Compass-Sector Keyhole Evacuation Arc (67.5° Downwind), Precautionary Action Zone (5 km), Plume Exposure Zone (16 km / 10 mi), and Ingestion Pathway Zone (80 km / 50 mi).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenEPZDossier}
                  disabled={!selectedReactorForEPZ || !epzPlan}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  📜 Sign Part 11 EPZ Dossier
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/plume')}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  💨 Dispatch to Plume Module
                </button>
              </div>
            </div>

            {/* Parameter Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px' }}>
              
              {/* Reactor Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Target Reactor Complex:</label>
                <select
                  className="form-control"
                  value={selectedReactorForEPZ?.id || ''}
                  onChange={(e) => {
                    setEpzTargetReactorId(e.target.value);
                    const sel = allReactors.find(r => r.id === e.target.value);
                    if (sel) {
                      setCenterRotation({ lon: sel.coordinates.lon, lat: sel.coordinates.lat });
                    }
                  }}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  {allReactors.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.country}) — {r.primaryMetric}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wind Direction Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Wind Origin Bearing:</span>
                  <strong style={{ color: '#facc15' }}>{epzWindOriginDeg}° (Origin) ➔ Downwind: {epzPlan?.plumeCenterlineBearingDeg}° ({epzPlan?.keyholeCenterSector})</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="5"
                  value={epzWindOriginDeg}
                  onChange={(e) => setEpzWindOriginDeg(parseInt(e.target.value, 10))}
                  style={{ accentColor: '#facc15' }}
                />
              </div>

              {/* Wind Speed Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Wind Speed:</span>
                  <strong style={{ color: '#38bdf8' }}>{epzWindSpeedMps} m/s ({(epzWindSpeedMps * 2.23694).toFixed(1)} mph)</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="20.0"
                  step="0.5"
                  value={epzWindSpeedMps}
                  onChange={(e) => setEpzWindSpeedMps(parseFloat(e.target.value))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Stability Class */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Atmospheric Stability Class:</label>
                <select
                  className="form-control"
                  value={epzStabilityClass}
                  onChange={(e) => setEpzStabilityClass(e.target.value as any)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  <option value="A">Class A - Very Unstable (Strong Daytime Sun)</option>
                  <option value="B">Class B - Moderately Unstable</option>
                  <option value="C">Class C - Slightly Unstable</option>
                  <option value="D">Class D - Neutral (Overcast / High Wind)</option>
                  <option value="E">Class E - Slightly Stable (Nighttime)</option>
                  <option value="F">Class F - Moderately Stable (Night Surface Inversion)</option>
                </select>
              </div>

              {/* Release Fraction Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Core Volatile Release:</span>
                  <strong style={{ color: epzCoreReleaseFraction > 0.05 ? '#ef4444' : '#fbbf24' }}>{(epzCoreReleaseFraction * 100).toFixed(1)}% of inventory</strong>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.20"
                  step="0.005"
                  value={epzCoreReleaseFraction}
                  onChange={(e) => setEpzCoreReleaseFraction(parseFloat(e.target.value))}
                  style={{ accentColor: epzCoreReleaseFraction > 0.05 ? '#ef4444' : '#fbbf24' }}
                />
              </div>

            </div>

            {/* Real-Time Consequence Telemetry Tiles */}
            {epzPlan && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid #facc15', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Downwind Center Sector</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#facc15' }}>
                    {epzPlan.plumeCenterlineBearingDeg}° ({epzPlan.keyholeCenterSector})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Compass Bearing</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Keyhole Evacuation Arc</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>
                    {epzPlan.affectedSectors.join(' // ')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>3 Sectors (67.5° Sweep)</div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>PAG Evacuation Radius</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                    {epzPlan.evacuationRadiusKm} km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    ({(epzPlan.evacuationRadiusKm * 0.621371).toFixed(1)} miles) // TEDE ≥ 1 rem
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Thyroid KI Radius</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                    {epzPlan.kiDistributionRadiusKm} km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    ({(epzPlan.kiDistributionRadiusKm * 0.621371).toFixed(1)} miles) // CDE ≥ 5 rem
                  </div>
                </div>
              </div>
            )}

            {/* EPA Protective Action Guides (PAG 2017) Threshold Matrix */}
            {epzPlan && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px' }}>
                  EPA-400-R-92-001 / IAEA GSR Part 7 Early-Phase Protective Action Thresholds:
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Standard / Action</th>
                        <th style={{ padding: '6px' }}>Regulatory Threshold</th>
                        <th style={{ padding: '6px' }}>Calculated Distance</th>
                        <th style={{ padding: '6px' }}>Zone Affected</th>
                        <th style={{ padding: '6px' }}>Guidance Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px', color: '#f87171', fontWeight: 600 }}>TEDE Early Evacuation</td>
                        <td style={{ padding: '6px' }}>≥ 1.0 rem (10 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.evacuationRadiusKm} km ({(epzPlan.evacuationRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>PAZ + Keyhole Wedge</td>
                        <td style={{ padding: '6px', color: '#f87171' }}>Immediate mandatory evacuation of population in affected 3 sectors</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px', color: '#38bdf8', fontWeight: 600 }}>Thyroid CDE Prophylaxis (KI)</td>
                        <td style={{ padding: '6px' }}>≥ 5.0 rem (50 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.kiDistributionRadiusKm} km ({(epzPlan.kiDistributionRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>UPZ (10-mile arc)</td>
                        <td style={{ padding: '6px', color: '#38bdf8' }}>Rapid distribution of stable Potassium Iodide (KI) to block radioiodine uptake</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px', color: '#fbbf24', fontWeight: 600 }}>Ingestion Interdiction (IPZ)</td>
                        <td style={{ padding: '6px' }}>≥ 0.5 rem (5 mSv)</td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)' }}>{epzPlan.interdictionRadiusKm} km ({(epzPlan.interdictionRadiusKm * 0.621371).toFixed(1)} mi)</td>
                        <td style={{ padding: '6px' }}>IPZ (50-mile arc)</td>
                        <td style={{ padding: '6px', color: '#fbbf24' }}>Embargo milk, produce, livestock grazing, and open reservoir drinking water</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Radial Distance Attenuation Table */}
            {epzPlan && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px' }}>
                  Plume Centerline Projected Dose Curve vs Radial Distance:
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '5px' }}>Distance</th>
                        <th style={{ padding: '5px' }}>Zone Tier</th>
                        <th style={{ padding: '5px' }}>Projected TEDE</th>
                        <th style={{ padding: '5px' }}>Thyroid CDE</th>
                        <th style={{ padding: '5px' }}>Evacuation Status</th>
                        <th style={{ padding: '5px' }}>KI Prophylaxis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epzPlan.doseCurve.map(pt => (
                        <tr key={pt.distanceKm} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)' }}>
                            {pt.distanceKm} km ({pt.distanceMiles.toFixed(1)} mi)
                          </td>
                          <td style={{ padding: '5px', color: pt.distanceKm <= 5 ? '#ef4444' : pt.distanceKm <= 16.1 ? '#f59e0b' : '#38bdf8' }}>
                            {pt.distanceKm <= 5 ? 'PAZ (Precautionary)' : pt.distanceKm <= 16.1 ? 'UPZ (Urgent 10-mi)' : 'IPZ (Ingestion 50-mi)'}
                          </td>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)', color: pt.evacuationRecommended ? '#f87171' : '#cbd5e1' }}>
                            {pt.projectedTedeRem} rem ({pt.projectedTedeMsv} mSv)
                          </td>
                          <td style={{ padding: '5px', fontFamily: 'var(--font-mono)', color: pt.kiAdministrationRecommended ? '#38bdf8' : '#cbd5e1' }}>
                            {pt.projectedThyroidCdeRem} rem ({pt.projectedThyroidCdeMsv} mSv)
                          </td>
                          <td style={{ padding: '5px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: pt.evacuationRecommended ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: pt.evacuationRecommended ? '#f87171' : '#34d399'
                            }}>
                              {pt.evacuationRecommended ? 'MANDATORY EVAC' : 'SHELTER / OK'}
                            </span>
                          </td>
                          <td style={{ padding: '5px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: pt.kiAdministrationRecommended ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              color: pt.kiAdministrationRecommended ? '#38bdf8' : '#94a3b8'
                            }}>
                              {pt.kiAdministrationRecommended ? 'ADMINISTER KI' : 'NOT REQUIRED'}
                            </span>
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

        {/* TAB 3: CTBTO SEISMIC YIELD INVERSION CONSOLE */}
        {activeWorkspaceTab === 'seismic_inversion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header / Subtitle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📡 CTBTO Teleseismic Weapon Yield Inversion Console</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Murphy-Ringdal-Nuttli Empirical Seismic Inversion linking observed body-wave magnitude (mb) to weapon explosive yield (kt) with Scaled Depth of Burial (SDOB) containment classification.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenSeismicDossier}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  📜 Sign Part 11 CTBT Dossier
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/nuclear-weapons-effects')}
                  style={{ fontSize: '0.78rem', padding: '5px 12px', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none' }}
                >
                  💥 Simulate Blast Effects
                </button>
              </div>
            </div>

            {/* Preset Test Sites Chips */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Historical Benchmarks:</span>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(6.30);
                  setSeismicMedium('hard_rock');
                  setSeismicBurialDepthM(550);
                  setSeismicEpicenterCoords({ lat: 41.297, lon: 129.083 });
                  setSeismicSiteName('2017 Punggye-ri DPRK Thermonuclear Test (Mt. Mantap)');
                  setCenterRotation({ lon: 129.083, lat: 41.297 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇰🇵 2017 Punggye-ri (mb 6.30)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(6.80);
                  setSeismicMedium('water_saturated');
                  setSeismicBurialDepthM(1870);
                  setSeismicEpicenterCoords({ lat: 51.470, lon: 179.176 });
                  setSeismicSiteName('1971 Project Cannikin (Amchitka, Alaska - 5 Mt)');
                  setCenterRotation({ lon: 179.176, lat: 51.470 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇺🇸 1971 Cannikin (mb 6.80)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(5.00);
                  setSeismicMedium('water_saturated');
                  setSeismicBurialDepthM(107);
                  setSeismicEpicenterCoords({ lat: 27.095, lon: 71.753 });
                  setSeismicSiteName('1974 Smiling Buddha (Pokhran, India)');
                  setCenterRotation({ lon: 71.753, lat: 27.095 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇮🇳 1974 Smiling Buddha (mb 5.00)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(2.70);
                  setSeismicMedium('decoupled_cavity');
                  setSeismicBurialDepthM(830);
                  setSeismicEpicenterCoords({ lat: 31.142, lon: -89.570 });
                  setSeismicSiteName('1966 Project Sterling Decoupled Cavity (Mississippi Salt Dome)');
                  setCenterRotation({ lon: -89.570, lat: 31.142 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇺🇸 1966 Sterling Decoupled (mb 2.70)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSeismicObservedMb(4.90);
                  setSeismicMedium('hard_rock');
                  setSeismicBurialDepthM(200);
                  setSeismicEpicenterCoords({ lat: 28.790, lon: 64.950 });
                  setSeismicSiteName('1998 Chagai-I (Ras Koh Hills, Pakistan)');
                  setCenterRotation({ lon: 64.950, lat: 28.790 });
                }}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                🇵🇰 1998 Chagai-I (mb 4.90)
              </button>
            </div>

            {/* Input Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px' }}>
              
              {/* Observed mb slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Observed Body-Wave Magnitude (mb):</span>
                  <strong style={{ color: '#38bdf8', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>mb {seismicObservedMb.toFixed(2)}</strong>
                </div>
                <input
                  type="range"
                  min="2.50"
                  max="7.50"
                  step="0.05"
                  value={seismicObservedMb}
                  onChange={(e) => setSeismicObservedMb(parseFloat(e.target.value))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Geological Medium selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Geological Medium / Cavity Coupling:</label>
                <select
                  className="form-control"
                  value={seismicMedium}
                  onChange={(e) => setSeismicMedium(e.target.value as any)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  <option value="hard_rock">Hard Granite / Basalt (Coupling: 100%, α=4.05, β=0.75)</option>
                  <option value="water_saturated">Water-Saturated Tuff / Sedimentary (Coupling: 75%, α=3.90, β=0.75)</option>
                  <option value="dry_alluvium">Dry Porous Alluvium (Coupling: 25%, α=3.45, β=0.80)</option>
                  <option value="decoupled_cavity">Decoupled Cavity / Salt Dome (Coupling: 1.5%, ~70x attenuation)</option>
                </select>
              </div>

              {/* Burial Depth input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Emplacement Depth (meters):</span>
                  <strong style={{ color: '#cbd5e1' }}>{seismicBurialDepthM} m</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={seismicBurialDepthM}
                  onChange={(e) => setSeismicBurialDepthM(parseInt(e.target.value, 10))}
                  style={{ accentColor: '#38bdf8' }}
                />
              </div>

              {/* Site Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Event / Test Site Name:</label>
                <input
                  type="text"
                  className="form-control"
                  value={seismicSiteName}
                  onChange={(e) => setSeismicSiteName(e.target.value)}
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                />
              </div>

            </div>

            {/* Inversion Results Telemetry HUD */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid #38bdf8', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Inverted Explosive Yield</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {seismicResult.estimatedYieldKt >= 1000
                    ? `${(seismicResult.estimatedYieldKt / 1000).toFixed(2)} Mt`
                    : `${seismicResult.estimatedYieldKt.toLocaleString()} kt`}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Nominal Best-Estimate</div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #f59e0b', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>1-Sigma Confidence (±0.15 mb)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
                  {seismicResult.yieldLowerBoundKt.toLocaleString()} – {seismicResult.yieldUpperBoundKt.toLocaleString()} kt
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>68% Teleseismic Confidence</div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Rayleigh Surface Wave (Ms)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                  Ms {seismicResult.expectedMs.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ms = 2.14 + 0.96·log(Y)</div>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderLeft: '3px solid #a855f7', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Scaled Depth of Burial (SDOB)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>
                  {seismicResult.scaledDepthOfBurial ? `${seismicResult.scaledDepthOfBurial} m/kt⅓` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.7rem', color: seismicResult.containmentCategory === 'Complete Containment' ? '#34d399' : '#f59e0b' }}>
                  {seismicResult.containmentCategory || 'Burial depth unknown'}
                </div>
              </div>
            </div>

            {/* Geological Media Parameters Callout */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '4px', fontSize: '0.78rem', color: '#cbd5e1', borderLeft: '3px solid #38bdf8' }}>
              <strong>{GEOLOGICAL_MEDIA[seismicMedium].name}:</strong> {GEOLOGICAL_MEDIA[seismicMedium].description}
            </div>

            {/* Nearby CTBTO IMS Monitoring Stations */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ecf0f1', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Certified CTBTO IMS Stations Within Teleseismic Detection Range:</span>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>P-wave (8.1 km/s) // Acoustic (0.33 km/s)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Station Code</th>
                      <th style={{ padding: '6px' }}>Station Name</th>
                      <th style={{ padding: '6px' }}>Technology</th>
                      <th style={{ padding: '6px' }}>Country</th>
                      <th style={{ padding: '6px' }}>Distance</th>
                      <th style={{ padding: '6px' }}>P-Wave Transit</th>
                      <th style={{ padding: '6px' }}>Infrasound Transit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seismicResult.nearbyIMSStations.map(ns => (
                      <tr key={ns.station.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                          {ns.station.stationCode}
                        </td>
                        <td style={{ padding: '6px', color: '#ecf0f1' }}>
                          {ns.station.name}
                        </td>
                        <td style={{ padding: '6px' }}>
                          <span style={{
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            background: ns.station.technology === 'Radionuclide' ? 'rgba(56, 189, 248, 0.2)' : ns.station.technology === 'Primary Seismic' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            color: ns.station.technology === 'Radionuclide' ? '#38bdf8' : ns.station.technology === 'Primary Seismic' ? '#fbbf24' : '#c084fc'
                          }}>
                            {ns.station.technology}
                          </span>
                        </td>
                        <td style={{ padding: '6px', color: '#94a3b8' }}>
                          {ns.station.country}
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#ecf0f1' }}>
                          {ns.distanceKm.toLocaleString()} km
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                          {ns.pWaveTransitSec}s (~{(ns.pWaveTransitSec / 60).toFixed(1)}m)
                        </td>
                        <td style={{ padding: '6px', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                          {ns.infrasoundTransitHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

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
