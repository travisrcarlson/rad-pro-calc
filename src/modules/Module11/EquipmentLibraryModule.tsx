import React, { useState } from 'react';

type EquipmentCategory = 'Industrial' | 'Medical' | 'Security' | 'Civil Defense' | 'All';

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  category: EquipmentCategory;
  isotopes: {
    nuclide: string;
    activityString: string;
    activityGBq: number;
  }[];
  application: string;
  hazardProfile: string;
  unshieldedDoseAt1m: string; // Precalculated nominal reference
  imageIcon: string;
}

const EQUIPMENT_DATABASE: Equipment[] = [
  {
    id: 'troxler_3440',
    name: '3440 Moisture-Density Gauge',
    manufacturer: 'Troxler Laboratories',
    category: 'Industrial',
    application: 'Soil/Asphalt Compaction Testing (Construction)',
    isotopes: [
      { nuclide: 'Cs-137', activityString: '8 mCi', activityGBq: 0.3 },
      { nuclide: 'Am-241:Be', activityString: '40 mCi', activityGBq: 1.48 }
    ],
    hazardProfile: 'Retractable Gamma/Neutron source rod. Extreme localized hazard if rod is severed or crushed outside the tungsten/lead housing. Safe to handle briefly when locked in housing.',
    unshieldedDoseAt1m: '~ 26 µSv/h (Bare Cs-137 limit) + Neutron scatter',
    imageIcon: '🚧'
  },
  {
    id: 'sentinel_880',
    name: 'SENTINEL 880 Delta',
    manufacturer: 'QSA Global',
    category: 'Industrial',
    application: 'Industrial Radiography (NDT/Pipelines)',
    isotopes: [
      { nuclide: 'Ir-192', activityString: '150 Ci', activityGBq: 5550 } // Max capacity
    ],
    hazardProfile: 'EXTREME FATAL HAZARD. Cast depleted-uranium housing. Deploys bare source down guide-tube. Bare source will cause lethal acute radiation syndrome (ARS) within minutes if handled.',
    unshieldedDoseAt1m: '~ 720,000 µSv/h (0.72 Sv/h)',
    imageIcon: '☢️'
  },
  {
    id: 'gammacell_220',
    name: 'Gammacell 220 Irradiator',
    manufacturer: 'MDS Nordion',
    category: 'Medical',
    application: 'Blood Irradiation / Sterilization',
    isotopes: [
      { nuclide: 'Co-60', activityString: '24,000 Ci', activityGBq: 888000 }
    ],
    hazardProfile: 'Massive encapsulated facility unit. Extremely dangerous internally (megadose levels). Massive lead shielding ensures safe external handling unless housing is breached by heavy machinery.',
    unshieldedDoseAt1m: '~ 312,000,000 µSv/h (312 Sv/h)',
    imageIcon: '🏥'
  },
  {
    id: 'smoke_detector',
    name: 'Ionization Smoke Detector',
    manufacturer: 'Generic Residential',
    category: 'Security',
    application: 'Home Fire Detection',
    isotopes: [
      { nuclide: 'Am-241', activityString: '1 µCi', activityGBq: 0.000037 }
    ],
    hazardProfile: 'Alpha-emitter. Harmless externally due to plastic housing and dead-skin barrier. Internalization/Ingestion hazard only.',
    unshieldedDoseAt1m: '< 0.01 µSv/h',
    imageIcon: '🔔'
  },
  {
    id: 'cdv_778',
    name: 'CDV-778 Radiation Training Set',
    manufacturer: 'FEMA / Civil Defense',
    category: 'Civil Defense',
    application: 'Cold-War Era Meter Calibration',
    isotopes: [
      { nuclide: 'Cs-137', activityString: '30 mCi (Total across 6 capsules)', activityGBq: 1.11 }
    ],
    hazardProfile: 'Set of 6 small sealed brass capsules often found in civil-defense caches. Can cause significant localized burns if pocketed. Moderate hazard.',
    unshieldedDoseAt1m: '~ 95 µSv/h (Bare, total set)',
    imageIcon: '🛡️'
  },
  {
    id: 'tritium_exit',
    name: 'Tritium Exit Sign',
    manufacturer: 'Various Commercial',
    category: 'Security',
    application: 'Non-electric Emergency Lighting',
    isotopes: [
      { nuclide: 'H-3 (Tritium)', activityString: '25 Ci (Gaseous)', activityGBq: 925 }
    ],
    hazardProfile: 'Low-energy Beta emitter. Completely harmless externally. Hazard occurs if glass tubes break indoors, leading to Tritium gas inhalation.',
    unshieldedDoseAt1m: '0 µSv/h (Does not penetrate glass)',
    imageIcon: '🚪'
  }
];

const EquipmentLibraryModule: React.FC = () => {
  const [filter, setFilter] = useState<EquipmentCategory>('All');
  const [search, setSearch] = useState<string>('');

  const filteredEquipment = EQUIPMENT_DATABASE.filter(eq => {
    const matchesCategory = filter === 'All' || eq.category === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchLower) || 
      eq.manufacturer.toLowerCase().includes(searchLower) ||
      eq.isotopes.some(i => i.nuclide.toLowerCase().includes(searchLower));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ marginBottom: '10px' }}>
         <h2>Module 11 — Radioactive Equipment Reference Database</h2>
         <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
           Identify commercial devices, machines, and civic infrastructure containing sealed radioactive sources.
         </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '15px', padding: '0 20px 20px 20px' }}>
         <input 
           type="text" 
           className="form-control" 
           placeholder="Search by Name, Manufacturer, or Isotope (e.g. 'Troxler', 'Cs-137')" 
           style={{ flex: 1, padding: '10px' }}
           value={search}
           onChange={e => setSearch(e.target.value)}
         />
         <select 
           className="form-control" 
           style={{ width: '250px' }}
           value={filter}
           onChange={e => setFilter(e.target.value as EquipmentCategory)}
         >
            <option value="All">All Sectors</option>
            <option value="Industrial">Industrial & Construction</option>
            <option value="Medical">Medical Facilities</option>
            <option value="Security">Security & Public Tech</option>
            <option value="Civil Defense">Civil Defense caches</option>
         </select>
      </div>

      {/* Grid View */}
      <div style={{ flex: 1, padding: '0 20px 20px 20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px', alignContent: 'start' }}>
        
        {filteredEquipment.map(eq => (
          <div key={eq.id} style={{ 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '8px', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
             {/* Card Header */}
             <div style={{ padding: '15px', borderBottom: '1px solid #444', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#fff' }}>{eq.name}</h3>
                   <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{eq.manufacturer}</span>
                </div>
                <div style={{ fontSize: '2rem' }}>{eq.imageIcon}</div>
             </div>
             
             {/* Card Body */}
             <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ backgroundColor: '#2980b9', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{eq.category}</span>
                  <span style={{ color: '#888', fontSize: '0.8rem', alignSelf: 'center' }}>{eq.application}</span>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#e74c3c', fontSize: '0.9rem' }}>CONTAINED ISOTOPES:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                    {eq.isotopes.map((iso, i) => (
                       <span key={i} style={{ 
                         backgroundColor: 'rgba(231, 76, 60, 0.1)', 
                         color: '#ff7675', 
                         border: '1px solid rgba(231, 76, 60, 0.3)',
                         padding: '4px 8px', 
                         borderRadius: '4px', 
                         fontSize: '0.85rem',
                         fontFamily: 'monospace'
                       }}>
                         {iso.nuclide} : {iso.activityString} ({iso.activityGBq} GBq)
                       </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4' }}>
                   <strong>Hazard Profile:</strong> <br/>
                   {eq.hazardProfile}
                </div>

             </div>

             {/* Card Footer (Precalc Dose) */}
             <div style={{ padding: '10px 15px', backgroundColor: 'rgba(241, 196, 15, 0.05)', borderTop: '1px solid rgba(241, 196, 15, 0.2)' }}>
                <span style={{ color: '#f1c40f', fontSize: '0.8rem', fontWeight: 'bold' }}>BARE EXPOSURE @ 1 METER:</span><br/>
                <span style={{ color: '#fff', fontSize: '0.95rem', fontFamily: 'monospace' }}>{eq.unshieldedDoseAt1m}</span>
             </div>

          </div>
        ))}
        
        {filteredEquipment.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#888' }}>
             No equipment found matching your layout restrictions.
          </div>
        )}

      </div>

    </div>
  );
};

export default EquipmentLibraryModule;
