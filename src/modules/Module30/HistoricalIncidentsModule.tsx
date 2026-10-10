import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  getAllHistoricalIncidents,
  filterHistoricalIncidents,
  type HistoricalIncidentRecord,
  buildIncidentDossierPayload
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
  1: { bg: 'rgba(16, 185, 129, 0.18)', text: '#10b981', border: '#10b981', label: 'INES 1: Anomaly' }
};

export const HistoricalIncidentsModule: React.FC = () => {
  const allIncidents = useMemo(() => getAllHistoricalIncidents(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInes, setSelectedInes] = useState<number | 'all'>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedIsotope, setSelectedIsotope] = useState<string>('all');
  const [fatalitiesOnly, setFatalitiesOnly] = useState<boolean>(false);

  // Inspector Modal State
  const [inspectedIncident, setInspectedIncident] = useState<HistoricalIncidentRecord | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'chronology' | 'health_physics' | 'root_causes' | 'countermeasures'>('chronology');

  // Dossier Modal State
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activeDossierPayload, setActiveDossierPayload] = useState<CalculationDossierPayload | null>(null);

  // Filtered incidents
  const filtered = useMemo(() => {
    return filterHistoricalIncidents({
      searchQuery,
      inesLevel: selectedInes,
      eventType: selectedEventType,
      primaryIsotope: selectedIsotope,
      fatalitiesOnly
    });
  }, [searchQuery, selectedInes, selectedEventType, selectedIsotope, fatalitiesOnly]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalFatalities = 0;
    let totalArs = 0;
    let level7Count = 0;
    let level6Count = 0;
    let level5Count = 0;
    let level4Count = 0;

    allIncidents.forEach(i => {
      totalFatalities += i.fatalities;
      totalArs += i.arsCases;
      if (i.inesLevel === 7) level7Count++;
      if (i.inesLevel === 6) level6Count++;
      if (i.inesLevel === 5) level5Count++;
      if (i.inesLevel === 4) level4Count++;
    });

    return { totalFatalities, totalArs, level7Count, level6Count, level5Count, level4Count };
  }, [allIncidents]);

  const handleOpenDossier = (incident: HistoricalIncidentRecord) => {
    const payload = buildIncidentDossierPayload(incident);
    setActiveDossierPayload(payload);
    setIsDossierOpen(true);
  };

  return (
    <div className="historical-incidents-module" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="panel-header" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📜 Historical Radiation Incidents &amp; Forensic Archive</span>
              <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px' }}>
                IAEA INES 1–7 // Forensic V&amp;V
              </span>
            </h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Peer-reviewed repository of global nuclear reactor meltdowns, solution criticality excursions, orphan teletherapy sources, and industrial overexposures.
            </p>
          </div>
          {allIncidents[0] && (
            <button
              className="btn btn-primary"
              onClick={() => handleOpenDossier(allIncidents[0])}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📜 Generate Forensic Audit Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Documented Cases</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '2px' }}>{allIncidents.length} Major Incidents</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1945 – Present</div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Direct ARS Fatalities</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>{stats.totalFatalities} Fatalities</div>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>+{stats.totalArs} Confirmed ARS Cases</div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f97316' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>INES 7 Catastrophes</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f97316', marginTop: '2px' }}>{stats.level7Count} Events</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Chernobyl &amp; Fukushima</div>
        </div>

        <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>INES 5 &amp; 6 Accidents</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>{stats.level5Count + stats.level6Count} Events</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Kyshtym, TMI, Windscale, Goiânia</div>
        </div>
      </div>

      {/* Search & Multi-Filter Control Console */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
          {/* Search Box */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Search Historical Incident Archive:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by incident name, location, isotope (Cs-137), or root causes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* INES Level Filter */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>IAEA INES Scale:</label>
            <select
              className="form-control"
              value={selectedInes}
              onChange={(e) => setSelectedInes(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="all">All INES Levels (1–7)</option>
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
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="all">All Event Types</option>
              <option value="Reactor Meltdown">Reactor Meltdown</option>
              <option value="Criticality">Criticality Excursion</option>
              <option value="Orphan">Orphan Medical / Teletherapy Source</option>
              <option value="Industrial Radiography">Industrial Radiography</option>
              <option value="Waste">Waste Tank / Repository</option>
              <option value="Software">Software Safety Failure</option>
              <option value="Submarine">Naval / Submarine Reactor</option>
              <option value="Satellite">Space Nuclear Satellite</option>
            </select>
          </div>

          {/* Radionuclide Filter */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Primary Radionuclide:</label>
            <select
              className="form-control"
              value={selectedIsotope}
              onChange={(e) => setSelectedIsotope(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="all">All Radionuclides</option>
              <option value="Cs-137">Cesium-137 (Cs-137)</option>
              <option value="Co-60">Cobalt-60 (Co-60)</option>
              <option value="Ir-192">Iridium-192 (Ir-192)</option>
              <option value="U-235">Uranium-235 (U-235)</option>
              <option value="Pu-239">Plutonium-239 (Pu-239)</option>
              <option value="Sr-90">Strontium-90 (Sr-90)</option>
              <option value="I-131">Iodine-131 (I-131)</option>
            </select>
          </div>

          {/* Fatalities Only Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={fatalitiesOnly}
                onChange={(e) => setFatalitiesOnly(e.target.checked)}
              />
              <span style={{ color: fatalitiesOnly ? '#ef4444' : 'var(--color-text-muted)', fontWeight: 600 }}>
                Fatal Incidents Only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Master Incident Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {filtered.map((incident) => {
          const inesStyle = inesColorMap[incident.inesLevel] || inesColorMap[3];

          return (
            <div
              key={incident.id}
              className="panel"
              style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                backgroundColor: 'rgba(10, 16, 26, 0.85)'
              }}
            >
              {/* Card Header with INES Level Badge */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--color-border)',
                background: 'rgba(0,0,0,0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: inesStyle.bg,
                    color: inesStyle.text,
                    border: `1px solid ${inesStyle.border}`,
                    letterSpacing: '0.04em'
                  }}
                >
                  INES LEVEL {incident.inesLevel}
                </span>

                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {incident.year} • {incident.date}
                </span>
              </div>

              {/* Card Main Body */}
              <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#fff', lineHeight: '1.3' }}>
                    {incident.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    📍 {incident.location}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(0, 229, 255, 0.08)',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(0, 229, 255, 0.2)'
                  }}>
                    {incident.eventType}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    ⚛ {incident.primaryIsotope}
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>EST. ACTIVITY</span>
                    <strong style={{ fontSize: '0.85rem', color: '#00e5ff' }}>
                      {incident.estimatedActivityTBq > 0 ? `${incident.estimatedActivityTBq.toLocaleString()} TBq` : 'Prompt Beam'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>CASUALTIES</span>
                    <strong style={{ fontSize: '0.85rem', color: incident.fatalities > 0 ? '#ef4444' : '#10b981' }}>
                      {incident.fatalities > 0 ? `${incident.fatalities} Fatal (${incident.arsCases} ARS)` : '0 Fatal (0 ARS)'}
                    </strong>
                  </div>
                </div>

                <p style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: '1.45',
                  margin: '4px 0 0 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {incident.summary}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--color-border)',
                background: 'rgba(0,0,0,0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '5px 12px', flex: 1 }}
                  onClick={() => {
                    setInspectedIncident(incident);
                    setActiveModalTab('chronology');
                  }}
                >
                  🔍 Forensic Details
                </button>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                  onClick={() => handleOpenDossier(incident)}
                  title="Generate Sealed Cryptographic Dossier"
                >
                  📜 Dossier
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No historical cases found matching current search and filter parameters.
          </div>
        )}
      </div>

      {/* Forensic Deep-Dive Inspector Modal */}
      {inspectedIncident && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#0d131f',
            border: '1px solid var(--color-primary)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(0, 229, 255, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'rgba(0,0,0,0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: inesColorMap[inspectedIncident.inesLevel]?.bg,
                    color: inesColorMap[inspectedIncident.inesLevel]?.text,
                    border: `1px solid ${inesColorMap[inspectedIncident.inesLevel]?.border}`
                  }}>
                    INES LEVEL {inspectedIncident.inesLevel}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {inspectedIncident.date} • {inspectedIncident.location}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                  {inspectedIncident.name}
                </h2>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.9rem' }}
                onClick={() => setInspectedIncident(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '10px 20px',
              background: 'rgba(0,0,0,0.2)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              {[
                { id: 'chronology', label: '⏱️ Failure Timeline' },
                { id: 'health_physics', label: '☢️ Health Physics & Dosimetry' },
                { id: 'root_causes', label: '🔬 Root Causes & Lessons' },
                { id: 'countermeasures', label: '💉 Medical Response & Actions' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`btn ${activeModalTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                  onClick={() => setActiveModalTab(tab.id as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeModalTab === 'chronology' && (
                <>
                  <div className="panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.3)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)', fontSize: '0.95rem' }}>Executive Case Summary</h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                      {inspectedIncident.summary}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '0.92rem' }}>Chronological Event Progression</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inspectedIncident.chronology.map((step, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          gap: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          borderLeft: '3px solid #00e5ff'
                        }}>
                          <span style={{ fontSize: '0.82rem', color: '#00e5ff', fontWeight: 'bold', minWidth: '22px' }}>
                            {idx + 1}.
                          </span>
                          <span style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeModalTab === 'health_physics' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div className="panel" style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>PRIMARY ISOTOPES</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '2px' }}>
                        {inspectedIncident.primaryIsotope}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        All: {inspectedIncident.radionuclides.join(', ')}
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>ESTIMATED ACTIVITY RELEASE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffb703', marginTop: '2px' }}>
                        {inspectedIncident.estimatedActivityTBq > 0 ? `${inspectedIncident.estimatedActivityTBq.toLocaleString()} TBq` : 'Electron Beam'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        ≈ {inspectedIncident.estimatedActivityCi.toLocaleString()} Curies
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>PEAK CONTACT DOSE RATE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ef4444', marginTop: '2px' }}>
                        {inspectedIncident.peakContactDoseRate_Gy_h} Gy/h
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Form: {inspectedIncident.physicalForm}
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>POPULATION IMPACT</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#a855f7', marginTop: '2px' }}>
                        {inspectedIncident.evacuees > 0 ? `${inspectedIncident.evacuees.toLocaleString()} Evacuated` : 'Contained Site'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Screened: {inspectedIncident.peopleScreened.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.3)' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#00e5ff', fontSize: '0.92rem' }}>Health Physics &amp; Epidemiological Impact</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      {inspectedIncident.healthPhysicsImpact}
                    </p>
                  </div>
                </>
              )}

              {activeModalTab === 'root_causes' && (
                <>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '0.92rem' }}>Root Causes &amp; Systemic Vulnerabilities</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inspectedIncident.rootCauses.map((rc, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          borderLeft: '3px solid #ef4444',
                          fontSize: '0.85rem',
                          color: '#fecaca',
                          lineHeight: '1.5'
                        }}>
                          <strong>Cause {idx + 1}:</strong> {rc}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#10b981', fontSize: '0.92rem' }}>Regulatory &amp; Engineering Reforms Triggered</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {inspectedIncident.regulatoryReforms.map((ref, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          borderLeft: '3px solid #10b981',
                          fontSize: '0.85rem',
                          color: '#a7f3d0',
                          lineHeight: '1.5'
                        }}>
                          ✓ {ref}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                    <strong>IAEA Reference:</strong> {inspectedIncident.iaeaReportReference}
                  </div>
                </>
              )}

              {activeModalTab === 'countermeasures' && (
                <>
                  <div className="panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.3)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff', fontSize: '0.92rem' }}>Medical Decorporation &amp; Clinical Management</h4>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>DECORPORATION PHARMACEUTICALS: </strong>
                      <span style={{ color: '#fff', fontSize: '0.85rem' }}>
                        {inspectedIncident.medicalResponse.decorporationAgents.join(', ') || 'None applicable'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      {inspectedIncident.medicalResponse.treatmentProtocols}
                    </p>
                  </div>

                  <div className="panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.3)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '0.92rem' }}>Biodosimetry Protocols Deployed</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      {inspectedIncident.medicalResponse.biodosimetryMethods.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive Calculation Links */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)', fontSize: '0.92rem' }}>
                      Simulate &amp; Calculate in RadPro Modules
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      {inspectedIncident.relatedModules.map((m, idx) => (
                        <NavLink
                          key={idx}
                          to={m.modulePath}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '10px 12px',
                            textAlign: 'left',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '0.82rem' }}>
                            🚀 {m.moduleName}
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
                  onClick={() => handleOpenDossier(inspectedIncident)}
                >
                  📜 Sign &amp; Export Audit Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 21 CFR Part 11 Audit Dossier Modal */}
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
