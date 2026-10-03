import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PRESET_SCENARIOS, type IncidentScenario, exportScenarioToJson, importScenarioFromJson } from '../../services/scenarioService';

export const ScenarioBuilderModule: React.FC = () => {
  const [scenarios, setScenarios] = useState<IncidentScenario[]>(PRESET_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // New scenario form state
  const [newTitle, setNewTitle] = useState('');
  const [newNuclide, setNewNuclide] = useState('Cs-137');
  const [newActivityTBq, setNewActivityTBq] = useState(1.0);
  const [newSummary, setNewSummary] = useState('');

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const filteredScenarios = scenarios.filter(s => {
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    const matchesQuery = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.sourceTerm.nuclide.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleDownloadRadcase = (scenario: IncidentScenario) => {
    const jsonStr = exportScenarioToJson(scenario);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id}.radcase`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importScenarioFromJson(text);
        setScenarios(prev => [imported, ...prev.filter(s => s.id !== imported.id)]);
        setSelectedScenarioId(imported.id);
        alert(`Successfully imported scenario: ${imported.title}`);
      } catch (err) {
        alert(`Failed to import scenario: ${err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const customId = `custom_${Date.now()}`;
    const customScenario: IncidentScenario = {
      id: customId,
      title: newTitle,
      category: 'emergency_drill',
      inesLevel: 2,
      incidentDate: new Date().toLocaleDateString(),
      location: 'Custom Training Facility',
      summary: newSummary || 'Custom radiological incident drill scenario.',
      sourceTerm: {
        nuclide: newNuclide,
        activity_TBq: newActivityTBq,
        activity_Ci: newActivityTBq * 27.027,
        chemicalForm: 'Custom Form',
        physicalState: 'solid_sealed',
        halfLife: 'Custom',
        primaryEmissions: 'Ionizing Radiation'
      },
      environmental: {
        distance_meters: 5.0,
        fieldDoseRate_mSv_h: 12.5
      },
      protectiveActions: {
        hotZoneRadius_m: 25.0,
        warmZoneRadius_m: 75.0,
        ppeLevel: 'Level C',
        workerStayTimeLimit_min: 24.0,
        recommendedGuide: 'DOT ERG Guide 163'
      },
      keyLessonsLearned: [
        'Adherence to ALARA operational principles (Time, Distance, Shielding).',
        'Continuous radiation survey perimeter verification.'
      ],
      recommendedModules: [
        { path: '/dose', name: 'Dose Calculator', rationale: 'Compute field dose rate and distance falloff.' },
        { path: '/first-responder', name: 'Tactical CBRN Response', rationale: 'Establish cordon boundaries and worker stay-time limits.' }
      ]
    };

    setScenarios(prev => [customScenario, ...prev]);
    setSelectedScenarioId(customId);
    setIsCreatingNew(false);
    setNewTitle('');
    setNewSummary('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 159, 28, 0.15), rgba(5, 10, 18, 0.95))',
        border: '1px solid rgba(255, 159, 28, 0.3)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>📂</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-accent)' }}>
              Unified Scenario Builder & Incident Case File System
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Multi-Module Historical Case Studies, Emergency Response Drills & Standalone .radcase Packages
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(65, 90, 119, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📥 Import .radcase</span>
            <input type="file" accept=".json,.radcase" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff9f1c, #d97706)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(255, 159, 28, 0.3)'
            }}
          >
            {isCreatingNew ? '✕ Cancel' : '＋ New Custom Drill'}
          </button>
        </div>
      </div>

      {/* Custom Scenario Form Modal */}
      {isCreatingNew && (
        <form onSubmit={handleCreateCustom} className="panel" style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--color-accent)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-accent)' }}>Create Custom Emergency Training Scenario</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Scenario Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hospital Irradiator Stuck Source Drill"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Primary Nuclide</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Cs-137, Co-60, Ir-192"
                value={newNuclide}
                onChange={(e) => setNewNuclide(e.target.value)}
                style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Source Activity (TBq)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={newActivityTBq}
                onChange={(e) => setNewActivityTBq(parseFloat(e.target.value) || 0.1)}
                style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Scenario Briefing & Incident Context</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="Provide tactical details regarding source location, equipment status, and operational challenges..."
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              style={{ width: '100%', padding: '6px', background: '#000', color: '#fff', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 20px',
              fontSize: '0.80rem',
              fontWeight: 800,
              background: '#10b981',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ✓ Save & Activate Custom Drill
          </button>
        </form>
      )}

      {/* Main Two-Column Layout: Scenario Sidebar List + Active Scenario Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Filter & Case List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Category Tabs */}
          <div className="panel" style={{ padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {['all', 'historical', 'industrial', 'transport', 'emergency_drill'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: activeCategory === cat ? 'rgba(255, 159, 28, 0.2)' : 'transparent',
                    border: `1px solid ${activeCategory === cat ? 'var(--color-accent)' : 'transparent'}`,
                    color: activeCategory === cat ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.78rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                color: '#fff'
              }}
            />
          </div>

          {/* Scenario Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto' }}>
            {filteredScenarios.map(sc => {
              const isSelected = sc.id === currentScenario.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(255, 159, 28, 0.12)' : 'rgba(22, 36, 56, 0.55)',
                    border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(65, 90, 119, 0.3)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: sc.inesLevel >= 4 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.25)',
                      color: sc.inesLevel >= 4 ? '#ef4444' : '#38bdf8'
                    }}>
                      INES Level {sc.inesLevel}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      {sc.incidentDate}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? 'var(--color-accent)' : '#fff', marginBottom: '4px', lineHeight: 1.3 }}>
                    {sc.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                    <span>Nuclide: <strong style={{ color: '#fff' }}>{sc.sourceTerm.nuclide}</strong></span>
                    <span>Activity: <strong style={{ color: '#fff' }}>{sc.sourceTerm.activity_TBq} TBq</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Comprehensive Active Incident Dossier */}
        <div className="panel" style={{ padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dossier Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(65, 90, 119, 0.3)', paddingBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: currentScenario.inesLevel >= 4 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: currentScenario.inesLevel >= 4 ? '#ef4444' : '#38bdf8',
                  border: `1px solid ${currentScenario.inesLevel >= 4 ? '#ef4444' : '#38bdf8'}`
                }}>
                  IAEA INES LEVEL {currentScenario.inesLevel}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  📍 {currentScenario.location} ({currentScenario.incidentDate})
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-accent)' }}>
                {currentScenario.title}
              </h3>
            </div>

            <button
              onClick={() => handleDownloadRadcase(currentScenario)}
              style={{
                padding: '6px 12px',
                fontSize: '0.74rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(65, 90, 119, 0.4)',
                borderRadius: '6px',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>💾 Export .radcase</span>
            </button>
          </div>

          {/* Narrative Summary */}
          <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '6px', borderLeft: '3px solid var(--color-accent)' }}>
            {currentScenario.summary}
          </div>

          {/* Source Term & Field Parameters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                ☢️ Radiological Source Term
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Nuclide: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.nuclide}</strong></div>
                <div>Activity: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.activity_TBq} TBq</strong> ({currentScenario.sourceTerm.activity_Ci.toLocaleString()} Ci)</div>
                <div>Chemical Form: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.chemicalForm}</strong></div>
                <div>Physical State: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.physicalState.toUpperCase()}</strong></div>
                <div>Half-Life: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.halfLife}</strong></div>
                <div>Emissions: <strong style={{ color: '#fff' }}>{currentScenario.sourceTerm.primaryEmissions}</strong></div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' }}>
                🛡️ Tactical Protective Actions
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Hot Zone Perimeter: <strong style={{ color: '#ef4444' }}>{currentScenario.protectiveActions.hotZoneRadius_m} meters</strong></div>
                <div>Warm Zone Perimeter: <strong style={{ color: '#f59e0b' }}>{currentScenario.protectiveActions.warmZoneRadius_m} meters</strong></div>
                <div>PPE Protocol: <strong style={{ color: '#fff' }}>{currentScenario.protectiveActions.ppeLevel}</strong></div>
                <div>Worker Entry Stay-Time: <strong style={{ color: '#fff' }}>{currentScenario.protectiveActions.workerStayTimeLimit_min} minutes</strong></div>
                <div>DOT ERG Action Guide: <strong style={{ color: '#00e5ff' }}>{currentScenario.protectiveActions.recommendedGuide}</strong></div>
                {currentScenario.protectiveActions.countermeasureDrug && (
                  <div>Countermeasure: <strong style={{ color: '#a78bfa' }}>{currentScenario.protectiveActions.countermeasureDrug}</strong></div>
                )}
              </div>
            </div>
          </div>

          {/* Lessons Learned */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(65, 90, 119, 0.3)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Operational Health Physics Lessons Learned
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {currentScenario.keyLessonsLearned.map((lesson, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{lesson}</li>
              ))}
            </ul>
          </div>

          {/* 1-Click "Dispatch to Module" Action Bar */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Linked Analytical Modules (1-Click Drill Dispatch)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {currentScenario.recommendedModules.map(mod => (
                <NavLink
                  key={mod.path}
                  to={mod.path}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(0, 229, 255, 0.05)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.05)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      ➔ {mod.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>LAUNCH</span>
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--color-text-muted)' }}>
                    {mod.rationale}
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioBuilderModule;
