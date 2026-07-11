import React, { useState, useMemo } from 'react';
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

// Approximate Linear Attenuation Coefficients (mu) in cm^-1 for ~1 MeV Gamma Rays
const SHIELDING_MATERIALS: Record<string, number> = {
  'Lead (Pb)': 0.77,
  'Tungsten (W)': 1.30,
  'Depleted Uranium (DU)': 1.50,
  'Iron / Steel (Fe)': 0.47,
  'Concrete': 0.15,
  'Aluminum (Al)': 0.16,
  'Water': 0.07,
  'Borated Polyethylene': 0.07, // Good for neutrons, acts like water for gammas
  'Soil': 0.10,
  'Air': 0.00008
};

interface Layer {
  id: string;
  material: string;
  thickness: number; // in cm
}

const ShieldingModule: React.FC = () => {
  const [initialDose, setInitialDose] = useState<number>(1000); // e.g. 1000 mR/hr
  const [layers, setLayers] = useState<Layer[]>([]);

  const addLayer = () => {
    setLayers([...layers, { id: Date.now().toString(), material: 'Lead (Pb)', thickness: 1.0 }]);
  };

  const removeLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
  };

  const updateLayer = (id: string, field: keyof Layer, value: any) => {
    setLayers(layers.map(layer => layer.id === id ? { ...layer, [field]: value } : layer));
  };

  // Calculate dose at each interface
  const { plotData, finalDose } = useMemo(() => {
    let currentDose = initialDose;
    const doses = [initialDose];
    const labels = ['Initial'];
    
    let totalThickness = 0;
    const xVals = [0];

    layers.forEach((layer) => {
      const mu = SHIELDING_MATERIALS[layer.material] || 0;
      // D = D0 * exp(-mu * x)
      currentDose = currentDose * Math.exp(-mu * layer.thickness);
      totalThickness += layer.thickness;
      
      doses.push(currentDose);
      labels.push(`After ${layer.material}`);
      xVals.push(totalThickness);
    });

    const data = [
      {
        x: labels,
        y: doses,
        type: 'bar',
        marker: {
          color: '#00e5ff',
          opacity: 0.8,
          line: {
            color: '#00e5ff',
            width: 1
          }
        }
      }
    ];

    return { plotData: data, finalDose: currentDose };
  }, [initialDose, layers]);

  return (
    <div className="shielding-module">
      <div className="panel-header">
        <h2>Shielding Optimization & ALARA Design</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Calculate multi-layer attenuation for ~1 MeV Gamma fields.</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: '1 1 400px' }}>
          <h3>Shielding Layers</h3>
          
          <div className="form-group" style={{ marginTop: '15px' }}>
            <label className="form-label">Initial Dose Rate (e.g. mR/hr or mSv/hr)</label>
            <input 
              type="number" 
              className="form-control" 
              value={initialDose} 
              onChange={(e) => setInitialDose(Number(e.target.value))} 
              step="10" 
              min="0" 
            />
          </div>

          <div style={{ margin: '20px 0' }}>
            {layers.map((layer, index) => (
              <div key={layer.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', width: '20px' }}>{index + 1}.</div>
                <select 
                  className="form-control" 
                  style={{ flex: 2 }}
                  value={layer.material} 
                  onChange={(e) => updateLayer(layer.id, 'material', e.target.value)}
                >
                  {Object.keys(SHIELDING_MATERIALS).map(mat => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ flex: 1 }}
                  value={layer.thickness} 
                  onChange={(e) => updateLayer(layer.id, 'thickness', Number(e.target.value))} 
                  step="0.5" 
                  min="0" 
                  placeholder="cm"
                />
                <span style={{ color: 'var(--color-text-muted)' }}>cm</span>
                <button className="btn btn-primary" onClick={() => removeLayer(layer.id)} style={{ backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', boxShadow: 'none' }}>
                  X
                </button>
              </div>
            ))}
          </div>
          
          <button className="btn btn-primary" onClick={addLayer} style={{ width: '100%' }}>
            + Add Shielding Layer
          </button>

          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: 'rgba(0, 229, 255, 0.1)', border: '1px solid var(--color-primary)', borderRadius: '8px' }}>
            <h4 style={{ color: 'var(--color-primary)', margin: 0 }}>Final Attenuated Dose Rate</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
              {finalDose.toExponential(3)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              ({(finalDose).toFixed(3)} units)
            </div>
            {layers.length > 0 && (
              <div style={{ fontSize: '0.9rem', color: 'var(--color-success)', marginTop: '10px' }}>
                Total Attenuation: {((1 - (finalDose / initialDose)) * 100).toFixed(4)}%
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Attenuation Profile</h3>
          <div style={{ width: '100%', marginTop: '15px' }}>
            <Plot
              data={plotData as any}
              layout={{
                autosize: true,
                title: { text: 'Dose Rate vs. Shielding Layers' },
                xaxis: { title: { text: 'Interface' }, color: '#94A3B8' },
                yaxis: { title: { text: 'Dose Rate' }, type: 'log', color: '#94A3B8' }, // Log scale is usually better for shielding
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#F8FAFC' },
                margin: { l: 60, r: 20, t: 40, b: 100 }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '450px' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          </div>
        </div>
      </div>
      
      <div className="panel">
        <h3>Methodology & Assumptions</h3>
        <p style={{ marginTop: '10px', color: 'var(--color-text-muted)' }}>
          This ALARA optimization tool estimates attenuation based on the narrow-beam linear attenuation formula: <code>I = I₀ * e^(-μx)</code>.
          The linear attenuation coefficients (μ) provided are approximations for <strong>~1 MeV Gamma Rays</strong>. 
          <br /><br />
          <strong>Note on Buildup:</strong> This calculator uses narrow-beam geometry and does not explicitly calculate Compton scatter buildup factors (B). 
          For very thick shields, the actual dose rate may be higher than estimated here due to scattered radiation building up within the shield.
        </p>
      </div>
    </div>
  );
};

export default ShieldingModule;
