import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import nuclidesData from '../../../data/nuclides.json';
import { BlockMath } from 'react-katex';
import PlotComponent from 'react-plotly.js';
import equipmentDataRaw from '../../../data/equipment_database.json';

const Plot = (PlotComponent as any).default || PlotComponent;
import { useRegulatory } from '../../../context/RegulatoryContext';
import { AuditDossierModal } from '../../../components/AuditDossierModal';
import { type CalculationDossierPayload } from '../../../services/auditDossierService';

const parseActivityMBq = (activityStr: string) => {
  const str = activityStr.toLowerCase();
  const matches = str.match(/([0-9.,]+)\s*(tbq|gbq|mbq|kbq|ci|mci|uci|µci)/i);
  if (!matches) return 100; // default 100 MBq
  const val = parseFloat(matches[1].replace(/,/g, ''));
  const unit = matches[2];
  if (unit === 'tbq') return val * 1000000;
  if (unit === 'gbq') return val * 1000;
  if (unit === 'mbq') return val;
  if (unit === 'kbq') return val / 1000;
  if (unit === 'ci') return val * 37000;
  if (unit === 'mci') return val * 37;
  if (unit === 'uci' || unit === 'µci') return val * 0.037;
  return val;
};

const ExternalDoseCalc: React.FC = () => {
  const { currentFramework } = useRegulatory();
  const [searchParams] = useSearchParams();
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const nuclides = nuclidesData as any[];
  const [selectedNuclide, setSelectedNuclide] = useState(nuclides.find(n => n.Nuclide === 'Cobalt-60') || nuclides[0]);
  const [activity, setActivity] = useState<number>(100);
  const [activityUnit, setActivityUnit] = useState<number>(1); // Multiplier to get MBq
  const [distance, setDistance] = useState<number>(1); // meters

  // Ingest URL params from Scenario Builder or external links
  useEffect(() => {
    const nuclideParam = searchParams.get('nuclide');
    const actParam = searchParams.get('activity');
    const unitParam = searchParams.get('unit');

    if (nuclideParam) {
      const match = nuclides.find((n: any) => 
        n.Symbol?.toLowerCase() === nuclideParam.toLowerCase() ||
        n.Nuclide?.toLowerCase() === nuclideParam.toLowerCase() ||
        n.Nuclide?.toLowerCase().includes(nuclideParam.toLowerCase())
      );
      if (match) setSelectedNuclide(match);
    }

    if (actParam) {
      const val = parseFloat(actParam);
      if (!isNaN(val) && val > 0) {
        setActivity(val);
        if (unitParam) {
          const u = unitParam.toUpperCase();
          if (u === 'TBQ') setActivityUnit(1000000);
          else if (u === 'GBQ') setActivityUnit(1000);
          else if (u === 'MBQ') setActivityUnit(1);
          else if (u === 'KBQ') setActivityUnit(0.001);
          else if (u === 'CI') setActivityUnit(37000);
          else if (u === 'MCI') setActivityUnit(37);
        }
      }
    }
  }, [searchParams]);

  const handleEquipmentImport = (eqName: string) => {
    const eq: any = equipmentDataRaw.find((e: any) => e['Device Name'] === eqName);
    if (!eq) return;

    // Isotope
    const isoStr = eq['Primary Isotope(s) भी'] || eq['Primary Isotope(s)'] || '';
    const primaryIso = isoStr.split(';')[0].trim();
    const matchedNuc = nuclides.find((n: any) => n.Symbol === primaryIso || n.Nuclide.startsWith(primaryIso));
    if (matchedNuc) setSelectedNuclide(matchedNuc);
    
    // Activity
    const mbq = parseActivityMBq(eq['Activity (Typical)'] || '');
    setActivity(mbq);
    setActivityUnit(1); // set unit to MBq
  };

  // Gamma is in R·cm2/mCi·h. We will convert it to µSv·m²/h·MBq
  // 1 R = 10 mSv = 10,000 µSv
  // 1 mCi = 37 MBq
  // So, Γ (µSv·m²/h·MBq) = Γ (R·cm²/h·mCi) * 10,000 (µSv/R) * (1/10000 m²/cm²) / 37 (mCi/MBq)
  // Which simplifies to: Γ_SI = Γ_old * 1 / 37
  // OR simply: 1 R/h = 10 mSv/h. So 1 R·cm2/mCi·h -> 10000 uSv * cm2 / (37 MBq * h) -> 10000 / 10000 m2 / 37 = 1/37
  const gammaOld = parseFloat(selectedNuclide['Γ (R·cm²/mCi·h)'] || selectedNuclide['Γ (R·cm2/mCi·h)'] || '0');
  const gammaSI = gammaOld / 37.0;

  const activityMBq = activity * activityUnit;
  const doseRate = (activityMBq * gammaSI) / (distance * distance); // µSv/h

  const unitLabel = useMemo(() => {
    if (activityUnit === 1000000) return 'TBq';
    if (activityUnit === 1000) return 'GBq';
    if (activityUnit === 1) return 'MBq';
    if (activityUnit === 0.001) return 'kBq';
    if (activityUnit === 0.000001) return 'Bq';
    if (activityUnit === 37000) return 'Ci';
    if (activityUnit === 37) return 'mCi';
    return 'MBq';
  }, [activityUnit]);

  const dossierPayload: CalculationDossierPayload = useMemo(() => ({
    reportTitle: `Point Source External Gamma Dosimetry — ${selectedNuclide?.Nuclide || 'Isotope'}`,
    moduleName: 'Module 2: Point Source Calculation Engine',
    statuteCitation: `${currentFramework.name} (${currentFramework.citation}) / ICRP 107`,
    verificationTestId: 'VTEST-01 (Inverse Square Law)',
    operatorName: 'Health Physicist',
    operatorCredentials: 'CHP, RRPT',
    facility: 'Radiological Assessment Division',
    notes: `Evaluation of ambient dose equivalent rate H*(10) at ${distance} m from a ${activity} ${unitLabel} ${selectedNuclide?.Nuclide} point source.`,
    formulaDescription: '\\dot{H}^*(10) = \\frac{A \\cdot \\Gamma_{\\text{SI}}}{d^2}',
    inputs: [
      { label: 'Nuclide', value: `${selectedNuclide?.Nuclide} (${selectedNuclide?.Symbol})` },
      { label: 'Activity', value: activity, unit: unitLabel },
      { label: 'Distance', value: distance, unit: 'm' },
      { label: 'Gamma Constant Γ', value: gammaSI.toFixed(4), unit: 'µSv·m²/(h·MBq)' },
      { label: 'Regulatory Framework', value: `${currentFramework.governingBody} (${currentFramework.name})` },
      { label: 'Occupational Limit', value: currentFramework.limits.occupationalAnnualEffective_mSv, unit: 'mSv/yr' },
      { label: 'Public Dose Limit', value: currentFramework.limits.publicAnnualEffective_mSv, unit: 'mSv/yr' }
    ],
    outputs: [
      { label: 'Dose Equivalent Rate', value: doseRate.toFixed(2), unit: 'µSv/h', status: doseRate > 20 ? 'WARNING' : 'PASS' },
      { label: 'Dose Rate (mSv/h)', value: (doseRate / 1000).toFixed(4), unit: 'mSv/h', status: doseRate > 20 ? 'WARNING' : 'PASS' },
      { label: 'Public Limit Fraction (8760h continuous)', value: `${(((doseRate * 8760) / 1000) / currentFramework.limits.publicAnnualEffective_mSv * 100).toFixed(1)}%`, status: (doseRate * 8760 / 1000) > currentFramework.limits.publicAnnualEffective_mSv ? 'EXCEEDED' : 'PASS' },
      { label: 'Stay-Time to 1 mSv ALARA Action Target', value: `${(1000 / Math.max(0.0001, doseRate)).toFixed(1)} hrs`, status: 'PASS' }
    ]
  }), [selectedNuclide, activity, unitLabel, distance, gammaSI, currentFramework, doseRate]);

  const navigate = useNavigate();

  // Distance vs Dose Rate and Stay-Time profile (0.1m to 30m)
  const distanceProfile = useMemo(() => {
    const pts = 60;
    const distArr: number[] = [];
    const doseArr: number[] = [];
    const stayTimeArr: number[] = []; // hours to 1 mSv (1000 µSv)

    for (let i = 0; i <= pts; i++) {
      const logMin = Math.log10(0.1);
      const logMax = Math.log10(30);
      const r = Math.pow(10, logMin + (i / pts) * (logMax - logMin));
      distArr.push(r);
      const rate = (activityMBq * gammaSI) / (r * r);
      doseArr.push(rate);
      const st = rate > 0 ? (1000 / rate) : 10000;
      stayTimeArr.push(Math.min(1000, st));
    }
    return { distArr, doseArr, stayTimeArr };
  }, [activityMBq, gammaSI]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 350px' }}>
        <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #3498db', marginBottom: '20px' }}>
           <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#3498db', fontSize: '1rem' }}>Import from Catalog</h3>
           <select 
             className="form-control" 
             onChange={e => handleEquipmentImport(e.target.value)}
             style={{ width: '100%' }}
           >
             <option value="">-- Select Equipment Profile --</option>
             {equipmentDataRaw.map((eq: any, idx) => (
                <option key={idx} value={eq['Device Name']}>{eq['Device Name']}</option>
             ))}
           </select>
        </div>

        <h3 style={{ marginBottom: '15px' }}>2A. Point Source Calculator</h3>
        
        <div className="form-group">
          <label className="form-label">Nuclide</label>
          <select 
            className="form-control" 
            value={selectedNuclide?.Nuclide} 
            onChange={e => setSelectedNuclide(nuclides.find(n => n.Nuclide === e.target.value))}
          >
            {nuclides.map((n, i) => (
              <option key={i} value={n.Nuclide}>{n.Nuclide} ({n.Symbol})</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 2 }}>
            <label className="form-label">Activity</label>
            <input type="number" className="form-control" value={activity} onChange={e => setActivity(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Unit</label>
            <select className="form-control" value={activityUnit} onChange={e => setActivityUnit(Number(e.target.value))}>
              <option value={0.000001}>Bq</option>
              <option value={0.001}>kBq</option>
              <option value={1}>MBq</option>
              <option value={1000}>GBq</option>
              <option value={1000000}>TBq</option>
              <option value={37}>mCi</option>
              <option value={37000}>Ci</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Distance (m)</label>
          <input type="number" className="form-control" value={distance} onChange={e => setDistance(Number(e.target.value))} />
        </div>
        
        <div style={{ marginTop: '20px' }}>
           <label className="form-label">Extracted Physical Parameter</label>
           <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
             $\Gamma$ = {gammaSI.toFixed(4)} µSv·m²/(h·MBq) 
             <br/>(Calculated from ICRP/NuDat: {gammaOld} R·cm²/(mCi·h))
           </p>
        </div>
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid var(--color-border)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Results</h3>
          <span className="hud-badge hud-badge-secondary">{currentFramework.flagEmoji} {currentFramework.name}</span>
        </div>
        
        <div>
          <div style={{ fontSize: '2rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
            {doseRate.toFixed(2)} µSv/h
          </div>
          <div style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>
            {(doseRate / 1000).toFixed(4)} mSv/h
          </div>
        </div>

        {/* Regulatory Context Callout */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.78rem' }}>
          <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            {currentFramework.shortCode} Annual Reference:
          </div>
          <div>Occupational: <strong style={{ color: '#00e5ff' }}>{currentFramework.limits.occupationalAnnualEffective_mSv} mSv/yr</strong> (~{((currentFramework.limits.occupationalAnnualEffective_mSv * 1000) / 2000).toFixed(1)} µSv/h for 2000h work year)</div>
          <div>Public: <strong style={{ color: '#10b981' }}>{currentFramework.limits.publicAnnualEffective_mSv} mSv/yr</strong> (~{(currentFramework.limits.publicAnnualEffective_mSv * 1000 / 8760).toFixed(2)} µSv/h continuous)</div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setIsDossierOpen(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', marginTop: '4px' }}
        >
          <span>🖨️</span>
          <span>Export Audit Dossier</span>
        </button>

        <div className="formula-box" style={{ marginTop: '10px' }}>
          <BlockMath math="\dot{H}^*(10) = \frac{A \cdot \Gamma}{d^2}" />
        </div>
      </div>
    </div>

    {/* Interactive Falloff Curve & ALARA Stay-Time */}
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
            Inverse-Square Dose Falloff &amp; Stay-Time Profile (0.1m to 30m)
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Logarithmic distance sweep displaying ambient dose rate and stay-time to reach the 1.0 mSv ALARA limit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate('/shielding')}
          >
            🛡️ Multilayer Shielding (Module 14)
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate('/internal-dose')}
          >
            🫁 Internal MIRD (Module 17)
          </button>
        </div>
      </div>

      <div style={{ height: '360px', width: '100%', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <Plot
          data={[
            {
              x: distanceProfile.distArr,
              y: distanceProfile.doseArr,
              type: 'scatter',
              mode: 'lines',
              name: 'Dose Rate (µSv/h)',
              line: { color: '#00e5ff', width: 2.5 },
              hovertemplate: 'Distance: %{x:.2f} m<br>Dose Rate: %{y:.2f} µSv/h<extra></extra>'
            },
            {
              x: [distance],
              y: [doseRate],
              type: 'scatter',
              mode: 'markers',
              name: `Current Target (${distance}m)`,
              marker: { color: '#ff3366', size: 12, symbol: 'star' }
            },
            {
              x: distanceProfile.distArr,
              y: distanceProfile.stayTimeArr,
              yaxis: 'y2',
              type: 'scatter',
              mode: 'lines',
              name: 'Stay-Time to 1 mSv (Hours)',
              line: { color: '#10b981', dash: 'dash', width: 2 },
              hovertemplate: 'Distance: %{x:.2f} m<br>Stay-Time to 1 mSv: %{y:.1f} hrs<extra></extra>'
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 65, r: 65, t: 25, b: 45 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#E0E1DD' },
            xaxis: { title: 'Distance from Source (meters)', type: 'log', gridcolor: '#1e293b' },
            yaxis: { title: 'Dose Rate (µSv/h)', type: 'log', gridcolor: '#1e293b', titlefont: { color: '#00e5ff' }, tickfont: { color: '#00e5ff' } },
            yaxis2: {
              title: 'Stay-Time to 1 mSv (Hours)',
              type: 'log',
              overlaying: 'y',
              side: 'right',
              titlefont: { color: '#10b981' },
              tickfont: { color: '#10b981' }
            },
            showlegend: true,
            legend: { orientation: 'h', y: -0.2 }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>
    </div>

    <AuditDossierModal payload={dossierPayload} isOpen={isDossierOpen} onClose={() => setIsDossierOpen(false)} />
  </div>
);
};

export default ExternalDoseCalc;
