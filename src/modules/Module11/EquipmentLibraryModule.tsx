import React, { useState, useMemo } from 'react';
import equipmentDataRaw from '../../data/equipment_database.json';

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
  const [filter, setFilter] = useState<string>('All');
  const [hazardFilter, setHazardFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

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
      
      {/* Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="hud-badge hud-badge-primary">COMMERCIAL SOURCE REGISTRY</span>
            <span className="hud-badge hud-badge-accent">IAEA SAFETY STANDARDS</span>
          </div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', letterSpacing: '0.03em' }}>
            Radioactive Equipment &amp; Sealed Source Library
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

        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
          Showing <strong>{filteredEquipment.length}</strong> of {processedEquipment.length} items
        </span>
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
                <span className={`hud-badge ${hazardColors.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                  {eq.hazardLevel}
                </span>
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

    </div>
  );
};

export default EquipmentLibraryModule;
