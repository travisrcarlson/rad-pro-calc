import React, { useState, useMemo } from 'react';
import equipmentDataRaw from '../../data/equipment_database.json';

type HazardLevel = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'SAFE' | 'VERY LOW' | string;

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
  hazardLevel: HazardLevel;
  doseAt1m: string;
  hazardProfile: string;
  actionCode: string;
  imageIcon: string;
}

// Map hazard levels to semantic colors
const hazardColorMap: Record<string, { bg: string, border: string, text: string }> = {
  'EXTREME': { bg: 'rgba(231, 76, 60, 0.15)', border: '#e74c3c', text: '#e74c3c' },
  'HIGH': { bg: 'rgba(230, 126, 34, 0.15)', border: '#e67e22', text: '#e67e22' },
  'MODERATE': { bg: 'rgba(241, 196, 15, 0.15)', border: '#f39c12', text: '#f1c40f' },
  'LOW': { bg: 'rgba(41, 128, 185, 0.15)', border: '#2980b9', text: '#3498db' },
  'SAFE': { bg: 'rgba(39, 174, 96, 0.15)', border: '#27ae60', text: '#2ecc71' },
  'VERY LOW': { bg: 'rgba(39, 174, 96, 0.15)', border: '#27ae60', text: '#2ecc71' }
};

// Fallback color logic
const getHazardColor = (hazard: string) => {
  const norm = hazard.toUpperCase().trim();
  return hazardColorMap[norm] || { bg: 'rgba(255,255,255,0.05)', border: '#888', text: '#ccc' };
};

// Icon mapping heuristics based on sector / keywords
const getIconForDevice = (sector: string, name: string): string => {
  const s = sector.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes('medical') || n.includes('therapy')) return '🏥';
  if (s.includes('oil') || s.includes('gas') || n.includes('wireline')) return '🛢️';
  if (n.includes('smoke') || n.includes('detector') || n.includes('security')) return '🔔';
  if (n.includes('military') || n.includes('munitions') || n.includes('eod')) return '🪖';
  if (n.includes('camera') || n.includes('radiography')) return '☢️';
  if (s.includes('space') || n.includes('rtg')) return '🛰️';
  if (s.includes('industrial') || n.includes('gauge')) return '🚧';
  return '📦';
};

const processedEquipment: EquipmentRecord[] = equipmentDataRaw.map((raw: any) => {
  const sectorStr = String(raw['Sector / Application'] || 'Unknown');
  const catMatch = sectorStr.split('–')[0].split('-')[0].trim();
  
  return {
    deviceName: raw['Device Name'] || 'Unknown Device',
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
    imageIcon: getIconForDevice(sectorStr, String(raw['Device Name']))
  };
});

const EquipmentLibraryModule: React.FC = () => {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // Extract unique categories dynamically
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    processedEquipment.forEach(eq => cats.add(eq.category));
    return Array.from(cats).sort();
  }, []);

  const filteredEquipment = useMemo(() => {
    const searchLower = search.toLowerCase();
    return processedEquipment.filter(eq => {
      const matchesCategory = filter === 'All' || eq.category === filter;
      const matchesSearch = 
        eq.deviceName.toLowerCase().includes(searchLower) || 
        eq.manufacturer.toLowerCase().includes(searchLower) ||
        eq.primaryIsotope.toLowerCase().includes(searchLower) ||
        eq.sectorApp.toLowerCase().includes(searchLower);
      
      return matchesCategory && matchesSearch;
    });
  }, [search, filter]);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ marginBottom: '10px' }}>
         <h2>Module 11 — Radioactive Equipment Catalog</h2>
         <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
           Identify commercial devices, machines, and civic infrastructure containing sealed radioactive sources. 
           Database contains {processedEquipment.length} records.
         </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '15px', padding: '0 20px 20px 20px', flexWrap: 'wrap' }}>
         <input 
           type="text" 
           className="form-control" 
           placeholder="Search by Name, Manufacturer, or Isotope (e.g. 'Troxler', 'Cs-137')" 
           style={{ flex: 1, minWidth: '300px', padding: '10px' }}
           value={search}
           onChange={e => setSearch(e.target.value)}
         />
         <select 
           className="form-control" 
           style={{ width: '250px' }}
           value={filter}
           onChange={e => setFilter(e.target.value)}
         >
            <option value="All">All Sectors</option>
            {uniqueCategories.map(cat => (
               <option key={cat} value={cat}>{cat}</option>
            ))}
         </select>
      </div>

      {/* Grid View */}
      <div style={{ flex: 1, padding: '0 20px 20px 20px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '20px', alignContent: 'flex-start' }}>
        
        {filteredEquipment.map((eq, i) => {
          const hazardColors = getHazardColor(eq.hazardLevel);
          return (
            <div key={i} style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              border: `1px solid ${hazardColors.border}`, 
              borderRadius: '8px', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 420px',
              maxWidth: '500px'
            }}>
               
               {/* First Responder Action Code Prominent Banner */}
               {eq.actionCode && (
                  <div style={{
                     backgroundColor: 'rgba(0,0,0,0.8)',
                     borderBottom: `2px solid ${hazardColors.border}`,
                     padding: '10px 15px',
                     color: '#f1c40f',
                     fontSize: '0.85rem',
                     fontWeight: 'bold',
                     display: 'flex',
                     alignItems: 'flex-start',
                     gap: '10px',
                     lineHeight: '1.4'
                  }}>
                     <span style={{ marginTop: '2px' }}>🚨 ACTION CODE:</span> 
                     <span style={{ color: '#ecf0f1', flex: 1 }}>{eq.actionCode}</span>
                  </div>
               )}

               {/* Card Header */}
               <div style={{ padding: '15px', borderBottom: '1px solid #444', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                     <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff', lineHeight: 1.3 }}>{eq.deviceName}</h3>
                     <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{eq.manufacturer}</div>
                  </div>
                  <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{eq.imageIcon}</div>
               </div>
               
               {/* Card Body */}
               <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1 }}>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ backgroundColor: '#2980b9', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {eq.category}
                    </span>
                    <span style={{ color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>{eq.sectorApp}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Isotope(s)</span>
                        <strong style={{ color: '#3498db', fontSize: '0.95rem' }}>{eq.primaryIsotope}</strong>
                     </div>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>Typical Activity</span>
                        <strong style={{ color: '#ecf0f1', fontSize: '0.85rem' }}>{eq.activity}</strong>
                     </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #9b59b6' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', display: 'block' }}>Half-Life</span>
                        <strong style={{ color: '#d2b4de', fontSize: '0.85rem' }}>{eq.halfLife}</strong>
                     </div>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #f39c12' }}>
                        <span style={{ color: '#888', fontSize: '0.75rem', display: 'block' }}>Radiation Type</span>
                        <strong style={{ color: '#f8c471', fontSize: '0.85rem' }}>{eq.radiationType}</strong>
                     </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                        <span style={{ color: '#888', fontSize: '0.70rem', display: 'block' }}>IAEA Cat</span>
                        <strong style={{ color: '#ecf0f1', fontSize: '0.80rem' }}>{eq.iaeaCategory}</strong>
                     </div>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px', gridColumn: 'span 2' }}>
                        <span style={{ color: '#888', fontSize: '0.70rem', display: 'block' }}>Orphan Source Risk</span>
                        <strong style={{ color: eq.orphanSourceRisk.includes('EXTREME') ? '#e74c3c' : eq.orphanSourceRisk.includes('CRITICAL') ? '#e74c3c' : eq.orphanSourceRisk.includes('HIGH') ? '#e67e22' : '#ecf0f1', fontSize: '0.80rem' }}>{eq.orphanSourceRisk}</strong>
                     </div>
                  </div>
                  
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', border: '1px solid #333', padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '5px' }}>
                       <strong style={{ color: '#888' }}>Physical Form: </strong> <span style={{ color: '#ccc' }}>{eq.physicalForm}</span>
                    </div>
                    <div>
                       <strong style={{ color: '#888' }}>Shielding: </strong> <span style={{ color: '#ccc' }}>{eq.shieldingMaterial}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                     <strong>Hazard Profile:</strong> <br/>
                     <span style={{ color: '#bbb' }}>{eq.hazardProfile}</span>
                  </div>

               </div>

               {/* Card Footer (Precalc Dose) */}
               <div style={{ 
                 padding: '12px 15px', 
                 backgroundColor: hazardColors.bg, 
                 borderTop: `1px solid ${hazardColors.border}` 
               }}>
                  <span style={{ color: hazardColors.text, fontSize: '0.8rem', fontWeight: 'bold' }}>
                     BARE EXPOSURE @ 1 METER: {eq.hazardLevel} HAZARD
                  </span><br/>
                  <span style={{ color: '#fff', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                     {eq.doseAt1m}
                  </span>
               </div>

            </div>
          )
        })}
        
        {filteredEquipment.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#888' }}>
             No equipment found matching your criteria.
          </div>
        )}

      </div>

    </div>
  );
};

export default EquipmentLibraryModule;
