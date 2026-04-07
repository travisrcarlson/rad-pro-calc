import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import './index.css';

// Lazy load modules to improve performance if needed later, but standard imports for now
import NuclideTableModule from './modules/Module1/NuclideTableModule';
import VisualisationModule from './modules/Module3/VisualisationModule';
import DoseCalculatorModule from './modules/Module2/DoseCalculatorModule';
import TransportModule from './modules/Module4/TransportModule';
import RegModule from './modules/Module5/RegModule';
import DecayModule from './modules/Module6/DecayModule';
import VerificationModule from './modules/Module7/VerificationModule';
import Spatial3DModule from './modules/Module8/Spatial3DModule';
import WorkerDosimetryModule from './modules/Module9/WorkerDosimetryModule';
import PulsedXRayModule from './modules/Module10/PulsedXRayModule';
import EquipmentLibraryModule from './modules/Module11/EquipmentLibraryModule';
import ReverseResponderModule from './modules/Module12/ReverseResponderModule';
import ErrorBoundary from './ErrorBoundary';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
         <span style={{ fontSize: '1.5rem' }}>☢️</span>
        <h1>RadPro Analyst</h1>
      </div>
      <div className="sidebar-nav">
        <div style={{ padding: '10px 20px', fontSize: '0.8rem', color: '#66AAFF', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '10px', fontWeight: 'bold' }}>Analytical Tools</div>
        <NavLink to="/dose" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dose Calculator
        </NavLink>
        <NavLink to="/visualisation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Radiation Map
        </NavLink>
        <NavLink to="/transport" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Transport Eval
        </NavLink>
        <NavLink to="/decay" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Radiolysis & Decay
        </NavLink>
        <NavLink to="/spatial3d" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          3D Workspace
        </NavLink>
        <NavLink to="/worker" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Worker Dosimetry
        </NavLink>
        <NavLink to="/xray" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Pulsed X-Ray Systems
        </NavLink>
        <NavLink to="/responder" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Reverse Responder
        </NavLink>

        <div style={{ padding: '10px 20px', fontSize: '0.8rem', color: '#66AAFF', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '15px', fontWeight: 'bold' }}>Databases & References</div>
        <NavLink to="/nuclides" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Nuclide Database
        </NavLink>
        <NavLink to="/equipment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Equipment Catalog
        </NavLink>
        <NavLink to="/reg" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Regulatory Dashboard
        </NavLink>

        <div style={{ padding: '10px 20px', fontSize: '0.8rem', color: '#8e44ad', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '15px', fontWeight: 'bold' }}>System & Confidence</div>
        <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Verification Tests
        </NavLink>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/nuclides" replace />} />
              <Route path="/nuclides" element={<NuclideTableModule />} />
              <Route path="/dose" element={<DoseCalculatorModule />} />
              <Route path="/visualisation" element={<VisualisationModule />} />
              <Route path="/transport" element={<TransportModule />} />
              <Route path="/reg" element={<RegModule />} />
              <Route path="/decay" element={<DecayModule />} />
              <Route path="/verify" element={<VerificationModule />} />
              <Route path="/spatial3d" element={<Spatial3DModule />} />
              <Route path="/worker" element={<WorkerDosimetryModule />} />
              <Route path="/xray" element={<PulsedXRayModule />} />
              <Route path="/equipment" element={<EquipmentLibraryModule />} />
              <Route path="/responder" element={<ReverseResponderModule />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
};

export default App;
