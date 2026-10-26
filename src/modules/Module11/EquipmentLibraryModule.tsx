import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import equipmentDataRaw from '../../data/equipment_database.json';
import HistoricalIncidentsModule from '../Module30/HistoricalIncidentsModule';

const IAEA_D_VALUES_TBQ: Record<string, number> = {
  'Co-60': 0.03,
  'Cs-137': 0.10,
  'Ir-192': 0.08,
  'Se-75': 0.20,
  'Am-241': 0.06,
  'Cf-252': 0.02,
  'Sr-90': 1.00,
  'Pu-238': 0.06,
  'Pu-239': 0.06,
  'Ra-226': 0.04,
  'Yb-169': 0.30,
  'Tm-170': 20.0,
  'Kr-85': 30.0,
  'Pm-147': 40.0,
  'Ni-63': 60.0,
  'H-3': 2000.0
};

function parseFirstNumericValue(str: string, defaultVal: number): number {
  const cleaned = str.replace(/,/g, '');
  const m = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!m) return defaultVal;
  const v = parseFloat(m[1]);
  return isNaN(v) || v <= 0 ? defaultVal : v;
}

interface EquipmentRecord {
  deviceName: string;
  manufacturer: string;
  sectorApp: string;
  category: string;
  primaryIsotope: string;
  activity: string;
  halfLife: string;
  radiationType: string;
  iaeaCategory: string;
  physicalForm: string;
  shieldingMaterial: string;
  orphanSourceRisk: string;
  hazardLevel: string;
  doseAt1m: string;
  hazardProfile: string;
  actionCode: string;
  sectorBadge: { code: string; label: string; color: string; bg: string };
}

const hazardColorMap: Record<string, { bg: string; border: string; text: string; badgeClass: string }> = {
  EXTREME: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444', badgeClass: 'hud-badge-danger' },
  HIGH: { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', text: '#f97316', badgeClass: 'hud-badge-accent' },
  MODERATE: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b', badgeClass: 'hud-badge-warning' },
  LOW: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6', badgeClass: 'hud-badge-primary' },
  SAFE: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981', badgeClass: 'hud-badge-success' },
  'VERY LOW': { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981', badgeClass: 'hud-badge-success' }
};

const getHazardColor = (hazard: string) => {
  const norm = hazard.toUpperCase().trim();
  return hazardColorMap[norm] || { bg: 'rgba(255,255,255,0.05)', border: '#64748b', text: '#94a3b8', badgeClass: 'hud-badge-primary' };
};

const getSectorBadge = (sector: string, name: string): { code: string; label: string; color: string; bg: string } => {
  const s = sector.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes('medical') || n.includes('therapy') || n.includes('teletherapy')) {
    return { code: 'MED', label: 'Medical Physics', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.12)' };
  }
  if (s.includes('oil') || s.includes('gas') || n.includes('wireline') || s.includes('well')) {
    return { code: 'LOG', label: 'Well Logging', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (n.includes('smoke') || n.includes('detector') || n.includes('security')) {
    return { code: 'DET', label: 'Ion Detection', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
  }
  if (n.includes('military') || n.includes('munitions') || n.includes('eod')) {
    return { code: 'DEF', label: 'Defense / EOD', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (n.includes('camera') || n.includes('radiography') || n.includes('ndt')) {
    return { code: 'NDT', label: 'Industrial Radiography', color: '#ff9f1c', bg: 'rgba(255, 159, 28, 0.12)' };
  }
  if (s.includes('space') || n.includes('rtg')) {
    return { code: 'RTG', label: 'Space RTG', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  if (s.includes('industrial') || n.includes('gauge') || s.includes('gauging')) {
    return { code: 'IND', label: 'Industrial Gauging', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  return { code: 'SRC', label: 'Sealed Source', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
};

const processedEquipment: EquipmentRecord[] = (equipmentDataRaw as any[]).map((raw: any) => {
  const sectorStr = String(raw['Sector / Application'] || 'Unknown');
  const catMatch = sectorStr.split('–')[0].split('-')[0].trim();
  const devName = raw['Device Name'] || 'Unknown Device';

  return {
    deviceName: devName,
    manufacturer: raw['Manufacturer / Owner'] || 'Unknown',
    sectorApp: sectorStr,
    category: catMatch,
    primaryIsotope: raw['Primary Isotope(s)'] || 'Unknown',
    activity: raw['Activity (Typical)'] || 'Unknown',
    halfLife: raw['Half-Life'] || 'Unknown',
    radiationType: raw['Radiation Type'] || 'Unknown',
    iaeaCategory: String(raw['IAEA Cat.'] || 'Unknown'),
    physicalForm: raw['Physical Form'] || 'Unknown',
    shieldingMaterial: raw['Shielding Material'] || 'Unknown',
    orphanSourceRisk: raw['Orphan Source Risk'] || 'Unknown',
    hazardLevel: String(raw['Hazard Level'] || 'UNKNOWN').toUpperCase(),
    doseAt1m: raw['Dose Rate @ 1m (Bare/Unshielded)'] || 'No Data',
    hazardProfile: raw['Hazard Profile Summary'] || 'No Description',
    actionCode: raw['First Responder Action Code'] || '',
    sectorBadge: getSectorBadge(sectorStr, String(devName))
  };
});

const EquipmentLibraryModule: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get('tab') === 'incidents' ? 'incidents' : 'equipment';
  const [activeTab, setActiveTab] = useState<'equipment' | 'incidents'>(initialTab);

  const [filter, setFilter] = useState<string>('All');
  const [hazardFilter, setHazardFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<EquipmentRecord | null>(null);
  const [inspectDistanceM, setInspectDistanceM] = useState<number>(2.0);
  const [inspectActivityGBq, setInspectActivityGBq] = useState<number>(370.0);
  const [inspectBareDoseUSvHr, setInspectBareDoseUSvHr] = useState<number>(48000.0);

  const handleOpenInspector = (eq: EquipmentRecord) => {
    setSelectedDevice(eq);
    setInspectDistanceM(2.0);
    // Parse activity in GBq (if Ci is first, convert Ci * 37)
    const actLower = eq.activity.toLowerCase();
    const rawNum = parseFirstNumericValue(eq.activity, 100);
    const gbqIdx = actLower.indexOf('gbq');
    const ciIdx = actLower.indexOf('ci');
    const tbqIdx = actLower.indexOf('tbq');
    let gbqVal = rawNum;
    if (tbqIdx !== -1 && (gbqIdx === -1 || tbqIdx < gbqIdx)) {
      gbqVal = rawNum * 1000;
    } else if (ciIdx !== -1 && (gbqIdx === -1 || ciIdx < gbqIdx)) {
      gbqVal = rawNum * 37.0;
    }
    setInspectActivityGBq(Number(gbqVal.toFixed(2)));
    setInspectBareDoseUSvHr(parseFirstNumericValue(eq.doseAt1m, 1000));
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'incidents' || tabParam === 'equipment') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'equipment' | 'incidents') => {
    setActiveTab(tab);
    setSearchParams(tab === 'equipment' ? {} : { tab });
  };

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    processedEquipment.forEach(eq => cats.add(eq.category));
    return Array.from(cats).sort();
  }, []);

  const filteredEquipment = useMemo(() => {
    const searchLower = search.toLowerCase();
    return processedEquipment.filter(eq => {
      const matchesCategory = filter === 'All' || eq.category === filter;
      const matchesHazard = hazardFilter === 'All' || eq.hazardLevel === hazardFilter;
      const matchesSearch =
        eq.deviceName.toLowerCase().includes(searchLower) ||
        eq.manufacturer.toLowerCase().includes(searchLower) ||
        eq.primaryIsotope.toLowerCase().includes(searchLower) ||
        eq.sectorApp.toLowerCase().includes(searchLower);

      return matchesCategory && matchesHazard && matchesSearch;
    });
  }, [search, filter, hazardFilter]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Primary Database Section Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabChange('equipment')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontWeight: activeTab === 'equipment' ? 'bold' : 'normal' }}
        >
          <span>📋 Industrial Equipment &amp; Sealed Sources</span>
          <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'equipment' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }}>
            {processedEquipment.length} Devices
          </span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'incidents' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleTabChange('incidents')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontWeight: activeTab === 'incidents' ? 'bold' : 'normal' }}
        >
          <span>📜 Historical Incident Archive &amp; Forensics</span>
          <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'incidents' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }}>
            INES 1–7
          </span>
        </button>
      </div>

      {activeTab === 'incidents' ? (
        <HistoricalIncidentsModule />
      ) : (
        <>
          {/* Header */}
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="hud-badge hud-badge-primary">COMMERCIAL SOURCE REGISTRY</span>
                <span className="hud-badge hud-badge-accent">IAEA SAFETY STANDARDS</span>
              </div>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
                Module 29 — Radioactive Equipment &amp; Sealed Source Library
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Identify commercial devices, industrial radiography cameras, well-logging tools, and medical teletherapy heads. Catalog contains {processedEquipment.length} validated profiles.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search device name, manufacturer, or isotope (e.g. 'Troxler', 'Cs-137', 'Sentinel', 'Ir-192')..."
              style={{ flex: '1 1 280px', padding: '8px 12px', fontSize: '0.9rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: '200px', fontSize: '0.85rem' }}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="All">All Application Sectors</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ width: '180px', fontSize: '0.85rem' }}
              value={hazardFilter}
              onChange={e => setHazardFilter(e.target.value)}
            >
              <option value="All">All Hazard Tiers</option>
              <option value="EXTREME">EXTREME (Category 1)</option>
              <option value="HIGH">HIGH (Category 2)</option>
              <option value="MODERATE">MODERATE (Category 3)</option>
              <option value="LOW">LOW (Category 4)</option>
              <option value="SAFE">SAFE / EXEMPT</option>
            </select>

          </div>

      {/* Equipment Card Grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px', alignContent: 'start', paddingRight: '4px' }}>
        {filteredEquipment.map((eq, i) => {
          const hazardColors = getHazardColor(eq.hazardLevel);

          return (
            <div
              key={i}
              style={{
                backgroundColor: 'rgba(5, 10, 18, 0.7)',
                border: `1px solid ${hazardColors.border}`,
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}
            >
              {/* Emergency Action Code Header */}
              {eq.actionCode && (
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderBottom: `2px solid ${hazardColors.border}`,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <span className="hud-badge hud-badge-danger" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                    ACTION CODE
                  </span>
                  <span style={{ color: '#ecf0f1', fontSize: '0.8rem', fontWeight: 500, flex: 1, lineHeight: '1.3' }}>
                    {eq.actionCode}
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div
                style={{
                  padding: '14px',
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#fff', lineHeight: 1.25 }}>
                    {eq.deviceName}
                  </h3>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {eq.manufacturer}
                  </div>
                </div>

                <div
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${eq.sectorBadge.color}`,
                    backgroundColor: eq.sectorBadge.bg,
                    color: eq.sectorBadge.color,
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                    flexShrink: 0
                  }}
                  title={eq.sectorBadge.label}
                >
                  [{eq.sectorBadge.code}]
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                    {eq.category}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {eq.sectorApp}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Primary Isotope</span>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>{eq.primaryIsotope}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Typical Activity</span>
                    <strong style={{ color: '#ecf0f1', fontSize: '0.82rem' }}>{eq.activity}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px', borderLeft: '3px solid #a855f7' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Half-Life</span>
                    <strong style={{ color: '#d8b4fe', fontSize: '0.8rem' }}>{eq.halfLife}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px', borderLeft: '3px solid #f59e0b' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>Radiation Type</span>
                    <strong style={{ color: '#fde047', fontSize: '0.8rem' }}>{eq.radiationType}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>IAEA Category</span>
                    <strong style={{ color: '#ecf0f1', fontSize: '0.8rem' }}>{eq.iaeaCategory}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Orphan Source Risk</span>
                    <strong
                      style={{
                        color: eq.orphanSourceRisk.includes('EXTREME') || eq.orphanSourceRisk.includes('CRITICAL')
                          ? '#ef4444'
                          : eq.orphanSourceRisk.includes('HIGH')
                          ? '#f97316'
                          : '#94a3b8',
                        fontSize: '0.78rem'
                      }}
                    >
                      {eq.orphanSourceRisk}
                    </strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #1e293b', padding: '8px 10px', borderRadius: '4px', fontSize: '0.78rem' }}>
                  <div>
                    <strong style={{ color: '#64748b' }}>Form: </strong> <span style={{ color: '#cbd5e1' }}>{eq.physicalForm}</span>
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    <strong style={{ color: '#64748b' }}>Shielding: </strong> <span style={{ color: '#cbd5e1' }}>{eq.shieldingMaterial}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '2px' }}>Hazard Profile:</strong>
                  {eq.hazardProfile}
                </div>
              </div>

              {/* Card Footer (Bare Exposure Rate) */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: hazardColors.bg,
                  borderTop: `1px solid ${hazardColors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ color: hazardColors.text, fontSize: '0.72rem', fontWeight: 'bold', display: 'block' }}>
                    UNSHIELDED @ 1 METER
                  </span>
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 600 }}>
                    {eq.doseAt1m}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenInspector(eq)}
                    style={{ fontSize: '0.72rem', padding: '4px 10px', borderColor: hazardColors.border }}
                  >
                    🔍 Standoff &amp; A/D Calc
                  </button>
                  <span className={`hud-badge ${hazardColors.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                    {eq.hazardLevel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEquipment.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No equipment found matching criteria. Try adjusting search terms or filters.
          </div>
        )}
      </div>
        </>
      )}

      {/* Commercial Device Hazard, Standoff & IAEA A/D Ratio Inspector Modal */}
      {selectedDevice && (() => {
        const primaryIsoClean = selectedDevice.primaryIsotope.split(/[;,/]/)[0].replace(':Be', '').trim();
        const dValTBq = IAEA_D_VALUES_TBQ[primaryIsoClean] || 0.10;
        const actTBq = inspectActivityGBq / 1000.0;
        const adRatio = actTBq / dValTBq;
        let iaeaCatComputed = 'Category 5 (Not Dangerous)';
        let catColor = '#10b981';
        if (adRatio >= 1000) {
          iaeaCatComputed = 'Category 1 (Extremely Dangerous, A/D ≥ 1000)';
          catColor = '#ef4444';
        } else if (adRatio >= 10) {
          iaeaCatComputed = 'Category 2 (Very Dangerous, 10 ≤ A/D < 1000)';
          catColor = '#f97316';
        } else if (adRatio >= 1) {
          iaeaCatComputed = 'Category 3 (Dangerous, 1 ≤ A/D < 10)';
          catColor = '#f59e0b';
        } else if (adRatio >= 0.01) {
          iaeaCatComputed = 'Category 4 (Unlikely Dangerous, 0.01 ≤ A/D < 1)';
          catColor = '#3b82f6';
        }

        const doseAtR_uSvHr = inspectBareDoseUSvHr / Math.pow(Math.max(0.1, inspectDistanceM), 2);
        const doseAtR_mSvHr = doseAtR_uSvHr / 1000.0;
        const hrsTo20mSv = doseAtR_mSvHr > 0 ? 20.0 / doseAtR_mSvHr : Infinity;
        const hrsTo100mSv = doseAtR_mSvHr > 0 ? 100.0 / doseAtR_mSvHr : Infinity;
        const hrsTo1GyARS = doseAtR_mSvHr > 0 ? 1000.0 / doseAtR_mSvHr : Infinity;
        const cordon20uSvM = Math.sqrt(inspectBareDoseUSvHr / 20.0);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(2, 6, 23, 0.85)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedDevice(null)}
          >
            <div
              style={{
                background: '#0b1323',
                border: '1px solid var(--color-primary)',
                borderRadius: '10px',
                maxWidth: '760px',
                width: '100%',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.75)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
                <div>
                  <span className="hud-badge hud-badge-primary" style={{ marginBottom: '4px', display: 'inline-block' }}>
                    IAEA RS-G-1.9 SOURCE HAZARD &amp; STANDOFF INSPECTOR
                  </span>
                  <h3 style={{ margin: '4px 0 2px 0', color: '#fff', fontSize: '1.25rem' }}>{selectedDevice.deviceName}</h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                    {selectedDevice.manufacturer} — {selectedDevice.sectorApp} ({selectedDevice.primaryIsotope})
                  </span>
                </div>
                <button className="btn btn-secondary" onClick={() => setSelectedDevice(null)} style={{ padding: '4px 10px' }}>✕ Close</button>
              </div>

              {/* Adjustable Source & Standoff Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.35)', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Source Activity A (GBq):</label>
                  <input
                    type="number"
                    step="10"
                    min="0.001"
                    className="form-control"
                    value={inspectActivityGBq}
                    onChange={e => setInspectActivityGBq(Math.max(0.001, parseFloat(e.target.value) || 1))}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{(inspectActivityGBq / 37).toFixed(2)} Ci ({actTBq.toFixed(4)} TBq)</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Unshielded Rate @ 1m (µSv/h):</label>
                  <input
                    type="number"
                    step="100"
                    min="0.1"
                    className="form-control"
                    value={inspectBareDoseUSvHr}
                    onChange={e => setInspectBareDoseUSvHr(Math.max(0.1, parseFloat(e.target.value) || 10))}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Catalog: {selectedDevice.doseAt1m}</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Responder Standoff r (m):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="200"
                    className="form-control"
                    value={inspectDistanceM}
                    onChange={e => setInspectDistanceM(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>20 µSv/h Cordon: {cordon20uSvM.toFixed(1)} m</span>
                </div>
              </div>

              {/* Computed IAEA A/D & Standoff Dose Readouts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${catColor}`, padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>IAEA RS-G-1.9 A/D Ratio</span>
                  <strong style={{ color: catColor, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                    A/D = {adRatio >= 100 ? adRatio.toFixed(1) : adRatio.toPrecision(3)}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block', marginTop: '2px' }}>
                    D({primaryIsoClean}) = {dValTBq} TBq
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #38bdf8', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Bare Rate @ r = {inspectDistanceM}m</span>
                  <strong style={{ color: '#38bdf8', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                    {doseAtR_uSvHr >= 1000 ? `${doseAtR_mSvHr.toFixed(2)} mSv/h` : `${doseAtR_uSvHr.toFixed(1)} µSv/h`}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block', marginTop: '2px' }}>
                    {(doseAtR_uSvHr / 10).toFixed(1)} mrem/h
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #f59e0b', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Time to 20 mSv / 100 mSv</span>
                  <strong style={{ color: '#f59e0b', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {hrsTo20mSv < 1 ? `${(hrsTo20mSv * 60).toFixed(1)} min` : `${hrsTo20mSv.toFixed(1)} h`} / {hrsTo100mSv < 1 ? `${(hrsTo100mSv * 60).toFixed(1)} min` : `${hrsTo100mSv.toFixed(1)} h`}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block', marginTop: '2px' }}>
                    Annual / Emergency Turn-Back
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Time to 1 Gy ARS Threshold</span>
                  <strong style={{ color: '#ef4444', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {hrsTo1GyARS < 1 ? `${(hrsTo1GyARS * 60).toFixed(1)} min` : hrsTo1GyARS > 9999 ? '> 1 yr' : `${hrsTo1GyARS.toFixed(1)} h`}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block', marginTop: '2px' }}>
                    {iaeaCatComputed.split('(')[0]}
                  </span>
                </div>
              </div>

              {/* 1-Click Module Dispatch Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>1-Click Cross-Module Dispatch:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                    onClick={() => navigate(`/dose?nuclide=${encodeURIComponent(primaryIsoClean)}&activityMBq=${(inspectActivityGBq * 1000).toFixed(0)}`)}
                  >
                    ⚡ Point Dose (Mod 1A)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                    onClick={() => navigate(`/shielding?activityMBq=${(inspectActivityGBq * 1000).toFixed(0)}`)}
                  >
                    🛡️ Shielding (Mod 14)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                    onClick={() => navigate(`/first-responder?doseRate=${inspectBareDoseUSvHr}`)}
                  >
                    🚨 First Responder (Mod 17)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default EquipmentLibraryModule;
