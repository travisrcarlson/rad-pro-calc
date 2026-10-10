import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  getAllHistoricalIncidents,
  filterHistoricalIncidents,
  type HistoricalIncidentRecord,
  buildIncidentDossierPayload,
  getAllGlobalRegisterIncidents,
  filterGlobalRegisterIncidents,
  type GlobalIncidentRegisterRecord,
  getGlobalRegisterCountries,
  getGlobalRegisterDecades,
  getGlobalRegisterStats,
  buildGlobalIncidentDossierPayload,
  getIncidentById
} from '../../services/historicalIncidentsService';
import { AuditDossierModal } from '../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../services/auditDossierService';

const inesColorMap: Record<number, { bg: string; text: string; border: string; label: string }> = {
  7: { bg: 'rgba(239, 68, 68, 0.22)', text: '#ef4444', border: '#ef4444', label: 'INES 7: Major Accident' },
  6: { bg: 'rgba(249, 115, 22, 0.20)', text: '#f97316', border: '#f97316', label: 'INES 6: Serious Accident' },
  5: { bg: 'rgba(245, 158, 11, 0.18)', text: '#f59e0b', border: '#f59e0b', label: 'INES 5: Accident with Off-site Risk' },
  4: { bg: 'rgba(234, 179, 8, 0.18)', text: '#eab308', border: '#eab308', label: 'INES 4: Accident without Significant Off-site Risk' },
  3: { bg: 'rgba(0, 229, 255, 0.18)', text: '#00e5ff', border: '#00e5ff', label: 'INES 3: Serious Incident' },
  2: { bg: 'rgba(59, 130, 246, 0.18)', text: '#3b82f6', border: '#3b82f6', label: 'INES 2: Incident' },
  1: { bg: 'rgba(16, 185, 129, 0.18)', text: '#10b981', border: '#10b981', label: 'INES 1: Anomaly' },
  0: { bg: 'rgba(148, 163, 184, 0.18)', text: '#94a3b8', border: '#64748b', label: 'INES 0: Deviation' }
};

export const HistoricalIncidentsModule: React.FC = () => {
  // Top-level View Mode: Global Register vs Forensic Deep Dives
  const [activeView, setActiveView] = useState<'global_register' | 'forensic'>('global_register');

  // Forensic Deep-Dive State
  const allForensicIncidents = useMemo(() => getAllHistoricalIncidents(), []);
  const [forensicSearch, setForensicSearch] = useState('');
  const [forensicInes, setForensicInes] = useState<number | 'all'>('all');
  const [forensicEventType, setForensicEventType] = useState<string>('all');
  const [forensicIsotope, setForensicIsotope] = useState<string>('all');
  const [forensicFatalitiesOnly, setForensicFatalitiesOnly] = useState<boolean>(false);
  const [inspectedIncident, setInspectedIncident] = useState<HistoricalIncidentRecord | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'chronology' | 'health_physics' | 'root_causes' | 'countermeasures'>('chronology');

  // Global Register State
  const allGlobalRecords = useMemo(() => getAllGlobalRegisterIncidents(), []);
  const globalCountries = useMemo(() => getGlobalRegisterCountries(), []);
  const globalDecades = useMemo(() => getGlobalRegisterDecades(), []);
  const globalStats = useMemo(() => getGlobalRegisterStats(), []);

  const [globalSearch, setGlobalSearch] = useState('');
  const [globalClassification, setGlobalClassification] = useState<'all' | 'incident' | 'near_miss'>('all');
  const [globalInes, setGlobalInes] = useState<number | 'all' | 'unrated'>('all');
  const [globalDecade, setGlobalDecade] = useState<number | 'all'>('all');
  const [globalCountry, setGlobalCountry] = useState<string>('all');
  const [globalFatalitiesOnly, setGlobalFatalitiesOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  const [inspectedGlobalRecord, setInspectedGlobalRecord] = useState<GlobalIncidentRegisterRecord | null>(null);

  // Universal Audit Dossier Modal State
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activeDossierPayload, setActiveDossierPayload] = useState<CalculationDossierPayload | null>(null);

  // Filtered Forensic Records
  const filteredForensic = useMemo(() => {
    return filterHistoricalIncidents({
      searchQuery: forensicSearch,
      inesLevel: forensicInes,
      eventType: forensicEventType,
      primaryIsotope: forensicIsotope,
      fatalitiesOnly: forensicFatalitiesOnly
    });
  }, [forensicSearch, forensicInes, forensicEventType, forensicIsotope, forensicFatalitiesOnly]);

  // Forensic Aggregate Stats
  const forensicStats = useMemo(() => {
    let totalFatalities = 0;
    let totalArs = 0;
    let level7Count = 0;
    let level6Count = 0;
    let level5Count = 0;
    let level4Count = 0;

    allForensicIncidents.forEach(i => {
      totalFatalities += i.fatalities;
      totalArs += i.arsCases;
      if (i.inesLevel === 7) level7Count++;
      if (i.inesLevel === 6) level6Count++;
      if (i.inesLevel === 5) level5Count++;
      if (i.inesLevel === 4) level4Count++;
    });

    return { totalFatalities, totalArs, level7Count, level6Count, level5Count, level4Count };
  }, [allForensicIncidents]);

  // Filtered Global Records
  const filteredGlobal = useMemo(() => {
    return filterGlobalRegisterIncidents({
      searchQuery: globalSearch,
      classification: globalClassification,
      inesLevel: globalInes,
      decade: globalDecade,
      country: globalCountry,
      fatalitiesOnly: globalFatalitiesOnly
    });
  }, [globalSearch, globalClassification, globalInes, globalDecade, globalCountry, globalFatalitiesOnly]);

  // Paginated Global Records
  const paginatedGlobal = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGlobal.slice(start, start + pageSize);
  }, [filteredGlobal, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredGlobal.length / pageSize));

  const handleOpenForensicDossier = (incident: HistoricalIncidentRecord) => {
    const payload = buildIncidentDossierPayload(incident);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  const handleOpenGlobalDossier = (record: GlobalIncidentRegisterRecord) => {
    const payload = buildGlobalIncidentDossierPayload(record);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  const handleLaunchForensicFromGlobal = (dossierId: string) => {
    const doc = getIncidentById(dossierId);
    if (doc) {
      setInspectedGlobalRecord(null);
      setInspectedIncident(doc);
      setActiveModalTab('chronology');
      setActiveView('forensic');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Record_ID', 'Year', 'Date', 'Title', 'Country', 'Location', 'Classification', 'INES', 'EventType', 'Dose_rem', 'Deaths', 'Injuries', 'Radionuclide', 'Source', 'URL'];
    const rows = filteredGlobal.map(r => [
      r.id,
      r.year ?? '',
      `"${(r.date ?? '').replace(/"/g, '""')}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.country.replace(/"/g, '""')}"`,
      `"${r.location.replace(/"/g, '""')}"`,
      `"${r.classification.replace(/"/g, '""')}"`,
      r.ines !== null ? r.ines : '',
      `"${r.eventType.replace(/"/g, '""')}"`,
      `"${r.highestDoseRem ?? ''}"`,
      r.deaths,
      r.injuries,
      `"${r.radionuclide ?? ''}"`,
      `"${r.source.replace(/"/g, '""')}"`,
      `"${r.url ?? ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `radpro_global_radiological_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredGlobal, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `radpro_global_radiological_incidents_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="historical-incidents-module" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Header Banner */}
      <div className="panel-header" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📜 Global Radiological Incidents &amp; Historical Forensics</span>
              <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
                IAEA INES 0–7 // 2,370+ Research Events
              </span>
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Comprehensive open-source research repository of global nuclear reactor meltdowns, criticality bursts, orphan teletherapy sources, industrial overexposures, and safety precursors.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <span>📥 Export CSV</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportJSON}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <span>💾 Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeView === 'global_register' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('global_register')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontWeight: activeView === 'global_register' ? 'bold' : 'normal' }}
        >
          <span>🌐 Global Incident &amp; Near-Miss Register</span>
          <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeView === 'global_register' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }}>
            {allGlobalRecords.length.toLocaleString()} Records
          </span>
        </button>

        <button
          type="button"
          className={`btn ${activeView === 'forensic' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('forensic')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontWeight: activeView === 'forensic' ? 'bold' : 'normal' }}
        >
          <span>🔬 Forensic Deep-Dive Investigations</span>
          <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeView === 'forensic' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }}>
            {allForensicIncidents.length} Landmark Accidents
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: GLOBAL INCIDENT & NEAR-MISS REGISTER (1,568 RECORDS)   */}
      {/* ============================================================== */}
      {activeView === 'global_register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Global Register Statistics HUD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Registered Global Events</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>{globalStats.totalCount.toLocaleString()} Events</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1896 – Present (IAEA &amp; History)</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Near Misses &amp; Precursors</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>{globalStats.nearMissCount.toLocaleString()} Precursors</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Safety-Significant Deviations</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Fatal Incident Records</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>{globalStats.fatalitiesEventsCount} Events</div>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>{globalStats.totalDeaths} Fatalities / {globalStats.totalInjuries} Injuries</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #a855f7' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Global Geographic Reach</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#c084fc', marginTop: '2px' }}>{globalStats.countriesCount} Countries</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>US, USSR, FR, IN, JP, SE, KR...</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>INES-Rated Incidents</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#34d399', marginTop: '2px' }}>
                {(globalStats.totalCount - globalStats.unratedCount).toLocaleString()} Events
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Levels 0–7 ({globalStats.unratedCount} Historical Unrated)</div>
            </div>
          </div>

          {/* Global Register Filter Console */}
          <div className="panel" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
              
              {/* Search Field */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Search Register (ID, Title, Location, Isotope, Text):</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 'Salem', 'Davis-Besse', 'Ir-192', 'Mayak', 'radiography', 'valve'..."
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Classification */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Classification:</label>
                <select
                  className="form-control"
                  value={globalClassification}
                  onChange={(e) => {
                    setGlobalClassification(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All Classifications ({allGlobalRecords.length})</option>
                  <option value="near_miss">Near Misses &amp; Deviations ({globalStats.nearMissCount})</option>
                  <option value="incident">Accidents &amp; Overexposures ({allGlobalRecords.length - globalStats.nearMissCount})</option>
                </select>
              </div>

              {/* INES Scale */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>IAEA INES Scale:</label>
                <select
                  className="form-control"
                  value={globalInes === 'unrated' ? 'unrated' : globalInes === 'all' ? 'all' : globalInes.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGlobalInes(val === 'all' ? 'all' : val === 'unrated' ? 'unrated' : parseInt(val));
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All INES Ratings</option>
                  <option value="7">INES Level 7: Major Accident</option>
                  <option value="6">INES Level 6: Serious Accident</option>
                  <option value="5">INES Level 5: Off-site Risk</option>
                  <option value="4">INES Level 4: Local Consequences</option>
                  <option value="3">INES Level 3: Serious Incident</option>
                  <option value="2">INES Level 2: Incident</option>
                  <option value="1">INES Level 1: Anomaly</option>
                  <option value="0">INES Level 0: Deviation</option>
                  <option value="unrated">Unrated / Historical Occurrence</option>
                </select>
              </div>

              {/* Decade */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Decade:</label>
                <select
                  className="form-control"
                  value={globalDecade.toString()}
                  onChange={(e) => {
                    setGlobalDecade(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All Time Periods</option>
                  {globalDecades.map(dec => (
                    <option key={dec} value={dec}>{dec}s</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Country / Territory:</label>
                <select
                  className="form-control"
                  value={globalCountry}
                  onChange={(e) => {
                    setGlobalCountry(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All Countries ({globalCountries.length})</option>
                  {globalCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Fatalities Only Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="globalFatalitiesToggle"
                  checked={globalFatalitiesOnly}
                  onChange={(e) => {
                    setGlobalFatalitiesOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                />
                <label htmlFor="globalFatalitiesToggle" style={{ fontSize: '0.82rem', cursor: 'pointer', color: globalFatalitiesOnly ? '#ef4444' : 'inherit' }}>
                  Fatalities / Casualty Only
                </label>
              </div>
            </div>

            {/* Pagination & Filter Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Showing <strong>{filteredGlobal.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredGlobal.length)}</strong> of <strong>{filteredGlobal.length.toLocaleString()}</strong> events matching filters
              </span>

              {/* Pagination controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  ◀ Prev
                </button>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '0 6px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>

          {/* Global Register Records List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paginatedGlobal.map((record) => {
              const inesBadge = record.ines !== null ? inesColorMap[record.ines] : null;

              return (
                <div
                  key={record.id}
                  className="panel"
                  style={{
                    padding: '14px 18px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: record.isNearMiss ? 'rgba(245, 158, 11, 0.03)' : 'rgba(5, 10, 18, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Row Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
                        {record.id}
                      </span>

                      {record.isNearMiss ? (
                        <span className="hud-badge hud-badge-warning" style={{ fontSize: '0.7rem' }}>
                          ⚠️ NEAR MISS / PRECURSOR
                        </span>
                      ) : (
                        <span className="hud-badge hud-badge-danger" style={{ fontSize: '0.7rem' }}>
                          ☢️ INCIDENT / ACCIDENT
                        </span>
                      )}

                      {inesBadge ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: inesBadge.bg,
                            color: inesBadge.text,
                            border: `1px solid ${inesBadge.border}`
                          }}
                        >
                          {inesBadge.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                          INES Unrated
                        </span>
                      )}

                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        📅 {record.date || record.year || 'Date Unknown'}
                      </span>
                    </div>

                    {/* Right Tag: Country */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>
                        🌐 {record.country}
                      </span>
                    </div>
                  </div>

                  {/* Title & Facility */}
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#fff', lineHeight: 1.3 }}>
                      {record.title}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      📍 {record.location || 'Location Not Specified'}
                      {record.eventType && ` // Type: ${record.eventType}`}
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {record.deaths > 0 && (
                      <span className="hud-badge hud-badge-danger" style={{ fontSize: '0.72rem' }}>
                        ☠️ {record.deaths} Fatalities
                      </span>
                    )}

                    {record.injuries > 0 && (
                      <span className="hud-badge hud-badge-warning" style={{ fontSize: '0.72rem' }}>
                        🩹 {record.injuries} Injuries
                      </span>
                    )}

                    {record.highestDoseRem && (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px' }}>
                        ⚡ Dose: {record.highestDoseRem} rem
                      </span>
                    )}

                    {record.radionuclide && (
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(0, 229, 255, 0.08)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '4px' }}>
                        ⚛️ {record.radionuclide}
                      </span>
                    )}

                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                      Source: {record.source}
                    </span>
                  </div>

                  {/* Description snippet */}
                  {record.description && (
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {record.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setInspectedGlobalRecord(record)}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      🔍 Inspect Details
                    </button>

                    {record.dossierId && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleLaunchForensicFromGlobal(record.dossierId!)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)', border: 'none' }}
                      >
                        🔬 Full Forensic Investigation
                      </button>
                    )}

                    {record.url && (
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>🔗 Official Report</span>
                      </a>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenGlobalDossier(record)}
                      style={{ padding: '4px 10px', fontSize: '0.78rem', marginLeft: 'auto' }}
                    >
                      📜 Sign Part 11 Dossier
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredGlobal.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-muted)' }}>
                No radiological incidents or near-misses found matching your query criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: FORENSIC DEEP-DIVE INVESTIGATIONS (16 LANDMARK CASES) */}
      {/* ============================================================== */}
      {activeView === 'forensic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Stats Summary Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Documented Cases</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>{allForensicIncidents.length} Landmark Accidents</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1945 – Present (Forensic V&amp;V)</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Direct ARS Fatalities</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>{forensicStats.totalFatalities} Fatalities</div>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>+{forensicStats.totalArs} Confirmed ARS Cases</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f97316' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>INES 7 Catastrophes</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f97316', marginTop: '2px' }}>{forensicStats.level7Count} Events</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Chernobyl &amp; Fukushima</div>
            </div>

            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>INES 5 &amp; 6 Accidents</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>{forensicStats.level5Count + forensicStats.level6Count} Events</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Kyshtym, TMI, Windscale, Goiânia</div>
            </div>
          </div>

          {/* Search & Multi-Filter Control Console */}
          <div className="panel" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
              {/* Search Box */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Search Forensic Archive:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by incident name, location, isotope (Cs-137), or root causes..."
                  value={forensicSearch}
                  onChange={(e) => setForensicSearch(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* INES Level Filter */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>IAEA INES Scale:</label>
                <select
                  className="form-control"
                  value={forensicInes}
                  onChange={(e) => setForensicInes(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All INES Levels (3–7)</option>
                  <option value="7">INES Level 7 (Major Accident)</option>
                  <option value="6">INES Level 6 (Serious Accident)</option>
                  <option value="5">INES Level 5 (Accident w/ Off-site Risk)</option>
                  <option value="4">INES Level 4 (Accident w/o Off-site Risk)</option>
                  <option value="3">INES Level 3 (Serious Incident)</option>
                </select>
              </div>

              {/* Event Type Filter */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Classification / Vector:</label>
                <select
                  className="form-control"
                  value={forensicEventType}
                  onChange={(e) => setForensicEventType(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All Event Types</option>
                  <option value="Reactor Meltdown">Reactor Meltdown</option>
                  <option value="Criticality">Criticality Excursion</option>
                  <option value="Orphan">Orphan Medical / Teletherapy Source</option>
                  <option value="Industrial Radiography">Industrial Radiography</option>
                  <option value="Waste">Waste Tank / Repository</option>
                  <option value="Software">Software Safety Failure</option>
                  <option value="RTG">Radioisotope Thermoelectric (RTG)</option>
                  <option value="Naval">Naval Submarine Reactor</option>
                  <option value="Space">Space Nuclear Re-entry</option>
                </select>
              </div>

              {/* Primary Isotope Filter */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Primary Radionuclide:</label>
                <select
                  className="form-control"
                  value={forensicIsotope}
                  onChange={(e) => setForensicIsotope(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="all">All Radionuclides</option>
                  <option value="Cs-137">Caesium-137 (Cs-137)</option>
                  <option value="I-131">Iodine-131 (I-131)</option>
                  <option value="Co-60">Cobalt-60 (Co-60)</option>
                  <option value="Sr-90">Strontium-90 (Sr-90)</option>
                  <option value="Ir-192">Iridium-192 (Ir-192)</option>
                  <option value="Pu-239">Plutonium-239 (Pu-239)</option>
                  <option value="U-235">Uranium-235 (U-235)</option>
                </select>
              </div>

              {/* Fatalities Only Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="forensicFatalitiesToggle"
                  checked={forensicFatalitiesOnly}
                  onChange={(e) => setForensicFatalitiesOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                />
                <label htmlFor="forensicFatalitiesToggle" style={{ fontSize: '0.82rem', cursor: 'pointer', color: forensicFatalitiesOnly ? '#ef4444' : 'inherit' }}>
                  Fatalities Only
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Showing <strong>{filteredForensic.length}</strong> of {allForensicIncidents.length} landmark forensic dossiers
              </span>
            </div>
          </div>

          {/* Forensic Incident Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
            {filteredForensic.map((incident) => {
              const inesBadge = inesColorMap[incident.inesLevel] || inesColorMap[4];

              return (
                <div
                  key={incident.id}
                  className="panel"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: `1px solid ${inesBadge.border}`,
                    background: 'rgba(5, 10, 18, 0.65)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Top Row: INES Badge & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          letterSpacing: '0.04em',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: inesBadge.bg,
                          color: inesBadge.text,
                          border: `1px solid ${inesBadge.border}`
                        }}
                      >
                        {inesBadge.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        📅 {incident.date}
                      </span>
                    </div>

                    {/* Incident Name & Location */}
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#fff', lineHeight: 1.25 }}>
                      {incident.name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-primary)', marginBottom: '10px' }}>
                      📍 {incident.location}
                    </div>

                    {/* Summary Excerpt */}
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.45, marginBottom: '14px' }}>
                      {incident.summary}
                    </p>

                    {/* Key Metric Tags */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid var(--color-primary)' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Primary Isotope</span>
                        <strong style={{ fontSize: '0.84rem', color: '#fff' }}>{incident.primaryIsotope}</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #ef4444' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Casualties</span>
                        <strong style={{ fontSize: '0.84rem', color: incident.fatalities > 0 ? '#ef4444' : '#fff' }}>
                          {incident.fatalities} Dead / {incident.arsCases} ARS
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #f59e0b' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Activity Inventory</span>
                        <strong style={{ fontSize: '0.82rem', color: '#fff' }}>
                          {incident.estimatedActivityTBq >= 1000 ? `${(incident.estimatedActivityTBq / 1000).toFixed(0)}k TBq` : `${incident.estimatedActivityTBq.toLocaleString()} TBq`}
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #a855f7' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Peak Dose Rate</span>
                        <strong style={{ fontSize: '0.82rem', color: '#fff' }}>
                          {incident.peakContactDoseRate_Gy_h} Gy/h
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setInspectedIncident(incident);
                        setActiveModalTab('chronology');
                      }}
                      style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem' }}
                    >
                      🔬 Deep-Dive Inspector
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenForensicDossier(incident)}
                      style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                      title="Generate Sealed SHA-256 Part 11 Audit Dossier"
                    >
                      📜 Part 11 Dossier
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredForensic.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-muted)' }}>
                No historical incidents found matching your query criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* GLOBAL REGISTER RECORD INSPECTOR MODAL                          */}
      {/* ============================================================== */}
      {inspectedGlobalRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}>
          <div className="panel" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.7)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(0, 229, 255, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px' }}>
                    {inspectedGlobalRecord.id}
                  </span>
                  {inspectedGlobalRecord.isNearMiss ? (
                    <span className="hud-badge hud-badge-warning" style={{ fontSize: '0.72rem' }}>
                      ⚠️ NEAR MISS / PRECURSOR
                    </span>
                  ) : (
                    <span className="hud-badge hud-badge-danger" style={{ fontSize: '0.72rem' }}>
                      ☢️ INCIDENT / ACCIDENT
                    </span>
                  )}
                  {inspectedGlobalRecord.ines !== null && (
                    <span className="hud-badge hud-badge-accent" style={{ fontSize: '0.72rem' }}>
                      IAEA INES Level {inspectedGlobalRecord.ines}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', lineHeight: 1.25 }}>
                  {inspectedGlobalRecord.title}
                </h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                  📍 {inspectedGlobalRecord.location || 'Location Not Specified'} ({inspectedGlobalRecord.country})
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setInspectedGlobalRecord(null)}
                style={{ padding: '4px 10px', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Event Metrics Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Date Reported</span>
                  <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{inspectedGlobalRecord.date || inspectedGlobalRecord.year || 'Unknown'}</strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Classification</span>
                  <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{inspectedGlobalRecord.classification}</strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Reported Casualties</span>
                  <strong style={{ fontSize: '0.88rem', color: inspectedGlobalRecord.deaths > 0 ? '#ef4444' : '#fff' }}>
                    {inspectedGlobalRecord.deaths} Fatalities / {inspectedGlobalRecord.injuries} Injuries
                  </strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Highest Dose Reported</span>
                  <strong style={{ fontSize: '0.88rem', color: '#38bdf8' }}>
                    {inspectedGlobalRecord.highestDoseRem ? `${inspectedGlobalRecord.highestDoseRem} rem` : 'Not Reported / Contained'}
                  </strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Radionuclide / Source Term</span>
                  <strong style={{ fontSize: '0.88rem', color: '#fde047' }}>
                    {inspectedGlobalRecord.radionuclide || 'Unspecified / N/A'}
                  </strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>Environmental Release</span>
                  <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                    {inspectedGlobalRecord.release || 'None Reported / Contained'}
                  </strong>
                </div>
              </div>

              {/* Narrative Description */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #00e5ff' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                  Detailed Event Description &amp; Regulatory Basis:
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {inspectedGlobalRecord.description || 'No detailed narrative provided for this record.'}
                </p>
              </div>

              {/* Source & Citations */}
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                <strong>Dataset Provenance:</strong> {inspectedGlobalRecord.source}
                {inspectedGlobalRecord.url && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Direct Investigation URL:</strong>{' '}
                    <a href={inspectedGlobalRecord.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                      {inspectedGlobalRecord.url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {inspectedGlobalRecord.dossierId ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleLaunchForensicFromGlobal(inspectedGlobalRecord.dossierId!)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>🔬 Open Full Forensic Investigation</span>
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleOpenGlobalDossier(inspectedGlobalRecord)}
                >
                  📜 Sign &amp; Export Audit Dossier
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setInspectedGlobalRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FORENSIC DEEP-DIVE INSPECTOR MODAL                             */}
      {/* ============================================================== */}
      {inspectedIncident && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}>
          <div className="panel" style={{
            width: '100%',
            maxWidth: '920px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            border: `1px solid ${inesColorMap[inspectedIncident.inesLevel]?.border || 'var(--color-primary)'}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.7)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span className="hud-badge hud-badge-primary" style={{ fontSize: '0.72rem' }}>
                    {inesColorMap[inspectedIncident.inesLevel]?.label || `INES ${inspectedIncident.inesLevel}`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    📅 {inspectedIncident.date} ({inspectedIncident.year})
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', lineHeight: 1.2 }}>
                  {inspectedIncident.name}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                  📍 {inspectedIncident.location}
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setInspectedIncident(null)}
                style={{ padding: '4px 10px', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.2)',
              overflowX: 'auto'
            }}>
              <button
                className={`btn ${activeModalTab === 'chronology' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveModalTab('chronology')}
                style={{ borderRadius: 0, border: 'none', borderBottom: activeModalTab === 'chronology' ? '2px solid var(--color-primary)' : 'none', padding: '10px 16px', fontSize: '0.84rem' }}
              >
                ⏱️ Failure Timeline
              </button>
              <button
                className={`btn ${activeModalTab === 'health_physics' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveModalTab('health_physics')}
                style={{ borderRadius: 0, border: 'none', borderBottom: activeModalTab === 'health_physics' ? '2px solid var(--color-primary)' : 'none', padding: '10px 16px', fontSize: '0.84rem' }}
              >
                ☢️ Health Physics &amp; Dosimetry
              </button>
              <button
                className={`btn ${activeModalTab === 'root_causes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveModalTab('root_causes')}
                style={{ borderRadius: 0, border: 'none', borderBottom: activeModalTab === 'root_causes' ? '2px solid var(--color-primary)' : 'none', padding: '10px 16px', fontSize: '0.84rem' }}
              >
                🔬 Root Causes &amp; Lessons
              </button>
              <button
                className={`btn ${activeModalTab === 'countermeasures' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveModalTab('countermeasures')}
                style={{ borderRadius: 0, border: 'none', borderBottom: activeModalTab === 'countermeasures' ? '2px solid var(--color-primary)' : 'none', padding: '10px 16px', fontSize: '0.84rem' }}
              >
                💉 Medical Response &amp; Actions
              </button>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* TAB 1: CHRONOLOGY */}
              {activeModalTab === 'chronology' && (
                <>
                  <div style={{ background: 'rgba(0, 229, 255, 0.05)', borderLeft: '3px solid var(--color-primary)', padding: '12px 14px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', color: 'var(--color-primary)' }}>Accident Overview</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {inspectedIncident.summary}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#fff' }}>Step-by-Step Failure Sequence</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                      {inspectedIncident.chronology.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(0, 229, 255, 0.15)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {idx + 1}
                          </span>
                          <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.45, background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', flex: 1 }}>
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: HEALTH PHYSICS & DOSIMETRY */}
              {activeModalTab === 'health_physics' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Estimated Activity Released</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
                        {inspectedIncident.estimatedActivityTBq.toLocaleString()} TBq
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ({inspectedIncident.estimatedActivityCi.toLocaleString()} Curies)
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Peak Field / Contact Dose Rate</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                        {inspectedIncident.peakContactDoseRate_Gy_h} Gy/h
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Unshielded / Near-Field Contact
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Casualties &amp; ARS</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                        {inspectedIncident.fatalities} Confirmed Fatalities
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                        {inspectedIncident.arsCases} Acute Radiation Syndrome Cases
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Protective Evacuations</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>
                        {inspectedIncident.evacuees.toLocaleString()} Persons
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {inspectedIncident.peopleScreened.toLocaleString()} Screened
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#ef4444' }}>Health Physics &amp; Radiological Assessment</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {inspectedIncident.healthPhysicsImpact}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#fff' }}>Radionuclides Involved</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {inspectedIncident.radionuclides.map(r => (
                        <span key={r} style={{ padding: '4px 10px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          ⚛️ {r}
                        </span>
                      ))}
                      <span style={{ padding: '4px 10px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', borderRadius: '4px', fontSize: '0.8rem' }}>
                        Physical Form: {inspectedIncident.physicalForm}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: ROOT CAUSES & LESSONS */}
              {activeModalTab === 'root_causes' && (
                <>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: '#f59e0b' }}>Root Causes &amp; Systemic Vulnerabilities</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inspectedIncident.rootCauses.map((rc, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(245, 158, 11, 0.08)', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                          <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>⚠️</span>
                          <span style={{ fontSize: '0.84rem', color: '#ecf0f1', lineHeight: 1.45 }}>{rc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '14px 0 10px 0', fontSize: '0.92rem', color: '#10b981' }}>Regulatory Reforms &amp; Modern Safety Standards</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inspectedIncident.regulatoryReforms.map((reform, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓</span>
                          <span style={{ fontSize: '0.84rem', color: '#ecf0f1', lineHeight: 1.45 }}>{reform}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    <strong>Official Documentation:</strong> {inspectedIncident.iaeaReportReference}
                  </div>
                </>
              )}

              {/* TAB 4: MEDICAL RESPONSE & ACTIONS */}
              {activeModalTab === 'countermeasures' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid #a855f7' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Decorporation Agents Deployed</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#d8b4fe', marginTop: '4px' }}>
                        {inspectedIncident.medicalResponse.decorporationAgents.join(', ') || 'None Indicated (External Exposure)'}
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid #38bdf8' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Biodosimetry Protocols</span>
                      <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginTop: '4px' }}>
                        {inspectedIncident.medicalResponse.biodosimetryMethods.join(' • ')}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#10b981' }}>Clinical Management &amp; Treatment Protocols</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {inspectedIncident.medicalResponse.treatmentProtocols}
                    </p>
                  </div>

                  {/* Related Module Calculation Dispatchers */}
                  <div>
                    <h4 style={{ margin: '14px 0 10px 0', fontSize: '0.92rem', color: '#fff' }}>
                      🔗 Simulate Historical Parameters in RadPro Modules:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      {inspectedIncident.relatedModules.map((m, idx) => (
                        <NavLink
                          key={idx}
                          to={m.modulePath}
                          style={{
                            textDecoration: 'none',
                            background: 'rgba(0, 229, 255, 0.08)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            borderRadius: '6px',
                            padding: '10px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.86rem' }}>
                            {m.moduleName} ↗
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                            {m.actionPrompt}
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Coordinates: {inspectedIncident.coordinates.lat.toFixed(4)}°N, {inspectedIncident.coordinates.lon.toFixed(4)}°E
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleOpenForensicDossier(inspectedIncident)}
                >
                  📜 Sign &amp; Export Audit Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default HistoricalIncidentsModule;
