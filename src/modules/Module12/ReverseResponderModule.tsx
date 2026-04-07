import React, { useState, useMemo } from 'react';
import allNuclidesData from '../../data/all_nuclides.json'; // Contains Z, N, Nuclide, Half-Life, Decay Mode, etc.
import PlotComponent from 'react-plotly.js';

const Plot = (PlotComponent as any).default || PlotComponent;

type Equipment = 
  | 'Alpha Probe (ZnS)' 
  | 'Pancake GM' 
  | 'Gamma Scint/Ion Chamber'
  | 'NaI(Tl) Spectrum Analyzer'
  | 'HPGe Spectrometer'
  | 'Proportional Counter (Alpha/Beta)'
  | 'Neutron Rem Meter';

type Unit = 'CPM' | 'mSv/hr' | 'µSv/hr' | 'R/hr' | 'mR/hr';
type EnergyUnit = 'keV' | 'MeV';

type ShieldType = 'Air / Open' | 'Glass Window' | 'Standard Drywall (Office)' | 'Heavy Wood Door' | 'Cinder Block Wall' | 'Poured Concrete / Brick' | 'Lead Partition';
type WallArchitecture = 'solid' | 'hollow_sheet' | 'partial_fill';

const SHIELDING_FACTORS: Record<ShieldType, { mu: number; color: string; b: number; name: string, arch: WallArchitecture, sheetThickness?: number, fillRatio?: number }> = {
  'Air / Open': { mu: 0.0, color: 'rgba(255,255,255,0)', b: 0.0, name: 'Air / Open', arch: 'solid' },
  'Glass Window': { mu: 5.0, color: 'rgba(100, 200, 255, 0.4)', b: 0.2, name: 'Glass Window', arch: 'solid' },
  'Standard Drywall (Office)': { mu: 1.5, color: '#aaaaaa', b: 0.4, name: 'Standard Drywall', arch: 'hollow_sheet', sheetThickness: 0.03 }, // Two sheets of 1.5cm drywall
  'Heavy Wood Door': { mu: 3.5, color: '#8b5a2b', b: 0.3, name: 'Heavy Wood Door', arch: 'solid' },
  'Cinder Block Wall': { mu: 13.8, color: '#777777', b: 0.8, name: 'Cinder Block Wall', arch: 'partial_fill', fillRatio: 0.55 },
  'Poured Concrete / Brick': { mu: 13.8, color: '#555555', b: 1.2, name: 'Concrete / Brick', arch: 'solid' },
  'Lead Partition': { mu: 80.0, color: '#333333', b: 2.0, name: 'Lead Partition', arch: 'solid' }
};

type AABB = {
  id: number;
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  zMin: number; zMax: number;
  material: ShieldType;
};

type WallSide = 'South' | 'North' | 'West' | 'East';
type ApertureConfig = {
   id: number;
   wall: WallSide;
   dist: number;      // Distance from the starting corner of the wall
   width: number;
   height: number;
   zOffset: number;   // Distance off the floor
   material: ShieldType;
};

const ReverseResponderModule: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'triangulate'>('single');
  const [distance, setDistance] = useState<number>(1);
  const [reading, setReading] = useState<number>(1000);
  const [roomW, setRoomW] = useState<number>(10);
  const [roomL, setRoomL] = useState<number>(10);
  const [roomH, setRoomH] = useState<number>(3);
  const [wallThickness, setWallThickness] = useState<number>(0.2);
  const [wallMaterial, setWallMaterial] = useState<ShieldType>('Standard Drywall (Office)');
  
  const [apertures, setApertures] = useState<ApertureConfig[]>([
     { id: 1, wall: 'South', dist: 2, width: 1, height: 2.1, zOffset: 0, material: 'Air / Open' },
     { id: 2, wall: 'East', dist: 5, width: 2, height: 1.2, zOffset: 1, material: 'Glass Window' }
  ]);

  const [triangulationReadings, setTriangulationReadings] = useState([
    {id: 1, x: 5, y: 5, z: 1, reading: 100}, 
    {id: 2, x: 8, y: 8, z: 1, reading: 25}, 
    {id: 3, x: 2.5, y: -1, z: 1, reading: 15}
  ]);

  const derivedApertures = useMemo(() => {
    const t = wallThickness; // Dynamic thickness
    return apertures.map(ap => {
       let xMin=0, xMax=0, yMin=0, yMax=0;
       if (ap.wall === 'South') {
           yMin = -t - 0.1; yMax = 0.1;
           xMin = ap.dist; xMax = ap.dist + ap.width;
       } else if (ap.wall === 'North') {
           yMin = roomL - 0.1; yMax = roomL + t + 0.1;
           xMin = ap.dist; xMax = ap.dist + ap.width;
       } else if (ap.wall === 'West') {
           xMin = -t - 0.1; xMax = 0.1;
           yMin = ap.dist; yMax = ap.dist + ap.width;
       } else if (ap.wall === 'East') {
           xMin = roomW - 0.1; xMax = roomW + t + 0.1;
           yMin = ap.dist; yMax = ap.dist + ap.width;
       }
       return {
          id: ap.id,
          xMin, xMax, yMin, yMax,
          zMin: ap.zOffset, zMax: ap.zOffset + ap.height,
          material: ap.material,
          wall: ap.wall,
          width: ap.width,
          dist: ap.dist,
          zOffset: ap.zOffset,
          height: ap.height
       };
    });
  }, [apertures, roomW, roomL]);

  const walls = useMemo(() => {
    const t = wallThickness;
    return [
       { id: 101, xMin: 0, xMax: roomW, yMin: 0 - t, yMax: 0, zMin: 0, zMax: roomH, material: wallMaterial },
       { id: 102, xMin: 0, xMax: roomW, yMin: roomL, yMax: roomL + t, zMin: 0, zMax: roomH, material: wallMaterial },
       { id: 103, xMin: 0 - t, xMax: 0, yMin: 0, yMax: roomL, zMin: 0, zMax: roomH, material: wallMaterial },
       { id: 104, xMin: roomW, xMax: roomW + t, yMin: 0, yMax: roomL, zMin: 0, zMax: roomH, material: wallMaterial },
    ];
  }, [roomW, roomL, roomH, wallMaterial, wallThickness]);
  
  const [equipment, setEquipment] = useState<Equipment>('NaI(Tl) Spectrum Analyzer');
  const [efficiency, setEfficiency] = useState<number>(10); // %
  const [unit, setUnit] = useState<Unit>('mSv/hr');
  const [detectedEnergy, setDetectedEnergy] = useState<string>('');
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>('MeV');

  const triangulationResult = useMemo(() => {
    if (mode === 'single' || triangulationReadings.length < 2) return null;
    let bestX = 0; let bestY = 0; let bestZ = 0;
    let minVariance = Infinity;
    let bestEquivReading = 0;

    const rayMarch = (sx: number, sy: number, sz: number, rx: number, ry: number, rz: number) => {
        const dx = rx - sx; const dy = ry - sy; const dz = rz - sz;
        const dist = Math.max(0.1, Math.sqrt(dx*dx + dy*dy + dz*dz));
        const steps = 15;
        const ds = dist / steps;
        
        let totalMu = 0;
        let totalBuildup = 0;
        
        for (let i = 0; i < steps; i++) {
            const t = (i + 0.5) / steps;
            const px = sx + t * dx; const py = sy + t * dy; const pz = sz + t * dz;
            
            let pointMu = 0;
            let pointBuildup = 0;
            let hit = false;
            let currentMat: any = null;
            
            for (const ap of derivedApertures) {
               if (px >= ap.xMin && px <= ap.xMax && py >= ap.yMin && py <= ap.yMax && pz >= ap.zMin && pz <= ap.zMax) {
                   currentMat = SHIELDING_FACTORS[ap.material];
                   hit = true; break;
               }
            }
            if (!hit) {
               for (const w of walls) {
                   if (px >= w.xMin && px <= w.xMax && py >= w.yMin && py <= w.yMax && pz >= w.zMin && pz <= w.zMax) {
                       currentMat = SHIELDING_FACTORS[w.material];
                       break;
                   }
               }
            }

            if (currentMat) {
               let eMu = currentMat.mu;
               let eB = currentMat.b;
               if (currentMat.arch === 'partial_fill') {
                   eMu *= (currentMat.fillRatio || 1);
                   eB *= (currentMat.fillRatio || 1);
               } else if (currentMat.arch === 'hollow_sheet') {
                   const effectiveFill = (currentMat.sheetThickness || 0.03) / wallThickness;
                   eMu *= effectiveFill;
                   eB *= effectiveFill;
               }
               pointMu = eMu;
               pointBuildup = eB;
            }

            totalMu += pointMu * ds;
            totalBuildup += pointBuildup * ds;
        }
        
        // Buildup proxy factor B = 1 + ambient_scatter * travel
        const B = 1 + (totalBuildup * dist); 
        // A_estimated = R_measured * dist^2 * exp(mu) / B
        return (dist * dist * Math.exp(totalMu)) / B;
    };
    
    // 3D Grid Search over extended bounding area
    const xMin = -roomW * 0.5; const xMax = roomW * 1.5;
    const yMin = -roomL * 0.5; const yMax = roomL * 1.5;
    const zMin = 0; const zMax = roomH;

    for (let x = xMin; x <= xMax; x += 0.5) {
        for (let y = yMin; y <= yMax; y += 0.5) {
             for (let z = zMin; z <= zMax; z += 0.5) {
                 const estimatedAs = [];
                 for (const r of triangulationReadings) {
                     const tf_modifier = rayMarch(x, y, z, r.x, r.y, r.z);
                     estimatedAs.push(r.reading * tf_modifier);
                 }
                 if (estimatedAs.length === 0) continue;
                 const meanA = estimatedAs.reduce((a,b)=>a+b,0) / estimatedAs.length;
                 let sumSq = 0;
                 for (const a of estimatedAs) sumSq += Math.pow((a - meanA) / meanA, 2);
                 
                 if (sumSq < minVariance) {
                     minVariance = sumSq;
                     bestX = x; bestY = y; bestZ = z;
                     bestEquivReading = meanA;
                 }
             }
        }
    }
    return { x: bestX, y: bestY, z: bestZ, equivReading1m: bestEquivReading };
  }, [mode, triangulationReadings, derivedApertures, walls, roomW, roomL, roomH, wallThickness]);

  // Generate perfectly cut meshes for visuals
  const visualMeshes = useMemo(() => {
     const t = wallThickness;
     const meshes: any[] = [];
     
     const generateCutWall = (wallLimit: number, thicknessY: [number, number], isXAligned: boolean, localApertures: any[]) => {
         const sorted = [...localApertures].sort((a,b) => a.dist - b.dist);
         let lastPos = 0;
         
         for (const ap of sorted) {
             if (ap.dist > lastPos) {
                 meshes.push({
                     xMin: isXAligned ? lastPos : thicknessY[0], xMax: isXAligned ? ap.dist : thicknessY[1],
                     yMin: isXAligned ? thicknessY[0] : lastPos, yMax: isXAligned ? thicknessY[1] : ap.dist,
                     zMin: 0, zMax: roomH, material: wallMaterial
                 });
             }
             // Block above aperture
             if (ap.zMax < roomH) {
                 meshes.push({
                     xMin: isXAligned ? ap.dist : thicknessY[0], xMax: isXAligned ? ap.dist + ap.width : thicknessY[1],
                     yMin: isXAligned ? thicknessY[0] : ap.dist, yMax: isXAligned ? thicknessY[1] : ap.dist + ap.width,
                     zMin: ap.zMax, zMax: roomH, material: wallMaterial
                 });
             }
             // Block below aperture
             if (ap.zMin > 0) {
                 meshes.push({
                     xMin: isXAligned ? ap.dist : thicknessY[0], xMax: isXAligned ? ap.dist + ap.width : thicknessY[1],
                     yMin: isXAligned ? thicknessY[0] : ap.dist, yMax: isXAligned ? thicknessY[1] : ap.dist + ap.width,
                     zMin: 0, zMax: ap.zMin, material: wallMaterial
                 });
             }
             lastPos = ap.dist + ap.width;
         }
         
         if (lastPos < wallLimit) {
             meshes.push({
                 xMin: isXAligned ? lastPos : thicknessY[0], xMax: isXAligned ? wallLimit : thicknessY[1],
                 yMin: isXAligned ? thicknessY[0] : lastPos, yMax: isXAligned ? thicknessY[1] : wallLimit,
                 zMin: 0, zMax: roomH, material: wallMaterial
             });
         }
     };

     // South
     generateCutWall(roomW, [-t, 0], true, derivedApertures.filter(a => a.wall === 'South'));
     // North
     generateCutWall(roomW, [roomL, roomL+t], true, derivedApertures.filter(a => a.wall === 'North'));
     // West
     generateCutWall(roomL, [-t, 0], false, derivedApertures.filter(a => a.wall === 'West'));
     // East
     generateCutWall(roomL, [roomW, roomW+t], false, derivedApertures.filter(a => a.wall === 'East'));

     return meshes;
  }, [roomW, roomL, roomH, wallMaterial, derivedApertures]);

  const nuclideDict = useMemo(() => {
     const dict: Record<string, unknown> = {};
     for (const n of allNuclidesData) {
         dict[`${n.Z}_${n.N}`] = n;
     }
     return dict;
  }, []);

  const handleEquipmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eq = e.target.value as Equipment;
    setEquipment(eq);
    if (eq === 'Alpha Probe (ZnS)' || eq === 'Pancake GM' || eq === 'Proportional Counter (Alpha/Beta)' || eq === 'Neutron Rem Meter') {
      setUnit('CPM');
      setEfficiency(eq === 'Alpha Probe (ZnS)' ? 20 : eq === 'Proportional Counter (Alpha/Beta)' ? 30 : 10);
    } else {
      setUnit('mSv/hr');
      setEfficiency(eq === 'HPGe Spectrometer' ? 5 : 100); 
    }
    // Clear energy input if changing away from spectrometer, though keeping it is harmless
  };

  const results = useMemo(() => {
    const activeDistance = mode === 'single' ? distance : 1;
    const activeReading = mode === 'single' ? reading : (triangulationResult?.equivReading1m || 0);

    if (activeDistance <= 0 || activeReading <= 0 || efficiency <= 0) return [];

    let reading_mSv_hr = 0;
    let reading_cpm = 0;

    // Normalize units
    if (unit === 'CPM') {
        reading_cpm = activeReading;
    } else {
        reading_mSv_hr = activeReading;
        if (unit === 'µSv/hr') reading_mSv_hr = activeReading / 1000;
        if (unit === 'R/hr') reading_mSv_hr = activeReading * 10;
        if (unit === 'mR/hr') reading_mSv_hr = activeReading / 100;
    }

    const candidates = [];
    const effFraction = efficiency / 100;

    // Loop through database
    for (const n of allNuclidesData) {
      if (n['Half-Life'] === 'STABLE') continue;

      const mode = String(n['Decay Mode']).toUpperCase() || '';
      let isValidForDetector = false;
      let impliedActivityMBq = 0;

      // 0. Graph Search Spectral Energy Filter Check
      let passesEnergyFilter = true;
      let solvedByChain = false;
      let targetChainLength = 1;

      if (detectedEnergy.trim() !== '') {
          // Parse all comma-separated peaks into MeV
          const rawInputs = detectedEnergy.split(',').map(s => parseFloat(s.trim())).filter(num => !isNaN(num) && num > 0);
          
          if (rawInputs.length > 0) {
              const targetsMeV = energyUnit === 'keV' ? rawInputs.map(v => v / 1000) : rawInputs;
              passesEnergyFilter = false;

              // BFS to build max 6 generations of descendant chain
              const chainNodes = new Set<Record<string, unknown>>();
              let currentGen = [n as Record<string, unknown>];
              chainNodes.add(n as Record<string, unknown>);

              for (let g = 0; g < 6; g++) {
                 const nextGen: Record<string, unknown>[] = [];
                 for (const c of currentGen) {
                     if (c['Half-Life'] === 'STABLE') continue;
                     const cmodes = String(c['Decay Mode'] || '').split(',');
                     cmodes.forEach((m: string) => {
                         let nZ = Number(c.Z); let nN = Number(c.N); const modeTrim = m.trim();
                         if (modeTrim.startsWith('A')) { nZ -= 2; nN -= 2; }
                         else if (modeTrim.startsWith('B-')) { nZ += 1; nN -= 1; }
                         else if (modeTrim.startsWith('EC') || modeTrim.startsWith('B+')) { nZ -= 1; nN += 1; }
                         else if (modeTrim.startsWith('N')) { nN -= 1; }
                         else if (modeTrim.startsWith('P')) { nZ -= 1; }
                         
                         if (nZ !== Number(c.Z) || nN !== Number(c.N)) {
                             const d = nuclideDict[`${nZ}_${nN}`] as Record<string, unknown>;
                             if (d && !chainNodes.has(d)) {
                                 chainNodes.add(d);
                                 nextGen.push(d);
                             }
                         }
                     });
                 }
                 if (nextGen.length === 0) break;
                 currentGen = nextGen;
              }

              const chainArray = Array.from(chainNodes);
              let parentAloneSatisfiedAll = true;
              let allTargetsMatched = true;

              // Check if EVERY target entered is solved by at least ONE node in the chain
              for (const target of targetsMeV) {
                  let targetMatchedInChain = false;
                  let targetMatchedByParent = false;

                  for (const cNode of chainArray) {
                      const cmode = String(cNode['Decay Mode']).toUpperCase() || '';
                      let nodeMatchesTarget = false;

                      if (equipment.includes('Alpha') || (equipment.includes('Spectr') && cmode.includes('A'))) {
                          const qA = parseFloat((cNode['Q-Alpha'] as string) || '0') / 1000;
                          if (qA > 0 && Math.abs(qA - target) < 0.25) nodeMatchesTarget = true;
                      }
                      if (!nodeMatchesTarget && equipment.includes('Spectr')) {
                          const qB = parseFloat((cNode['Q-Beta'] as string) || '0') / 1000;
                          const qEC = parseFloat((cNode['Q-EC'] as string) || '0') / 1000;
                          if ((qB >= target && qB <= target + 2.5) || (qEC >= target && qEC <= target + 2.5)) {
                              nodeMatchesTarget = true;
                          }
                      }

                      if (nodeMatchesTarget) {
                          targetMatchedInChain = true;
                          if (cNode === n) targetMatchedByParent = true;
                      }
                  }

                  if (!targetMatchedInChain) {
                      allTargetsMatched = false;
                      break; // Missing at least one peak physically anywhere in the lineage! Chain is dead.
                  }
                  if (!targetMatchedByParent) {
                      parentAloneSatisfiedAll = false;
                  }
              }

              if (allTargetsMatched) {
                  passesEnergyFilter = true;
                  if (!parentAloneSatisfiedAll && chainArray.length > 1) {
                      solvedByChain = true;
                      targetChainLength = chainArray.length;
                  }
              }
          }
      }

      if (!passesEnergyFilter) continue;

      // 1. Filter logic & Inverse Square Math
      if (equipment === 'Alpha Probe (ZnS)') {
          if (mode.includes('A')) {
              isValidForDetector = true;
              const d_cm = distance * 100;
              const sphereArea = 4 * Math.PI * Math.pow(d_cm, 2);
              const detectorArea = 50; // cm^2
              const solidAngle = detectorArea / sphereArea;
              const particlesPerSec = (reading_cpm / 60) / (effFraction * solidAngle);
              impliedActivityMBq = particlesPerSec / 1e6;
          }
      } 
      else if (equipment === 'Pancake GM' || equipment === 'Proportional Counter (Alpha/Beta)') {
          if (mode.includes('A') || mode.includes('B-') || mode.includes('EC')) {
              isValidForDetector = true;
              const d_cm = distance * 100;
              const sphereArea = 4 * Math.PI * Math.pow(d_cm, 2);
              const detectorArea = equipment === 'Pancake GM' ? 15 : 100; // cm^2
              const solidAngle = detectorArea / sphereArea;
              const particlesPerSec = (reading_cpm / 60) / (effFraction * solidAngle);
              impliedActivityMBq = particlesPerSec / 1e6;
          }
      }
      else if (equipment.includes('Gamma') || equipment.includes('Spectrometer') || equipment.includes('Analyzer')) {
          if (mode.includes('B-') || mode.includes('EC') || mode.includes('IT')) {
              isValidForDetector = true;
              impliedActivityMBq = reading_mSv_hr * Math.pow(activeDistance, 2) * 3700 * (1 / effFraction);
          }
      }
      else if (equipment === 'Neutron Rem Meter') {
          if (mode.includes('SF') || mode.includes('N')) {
              isValidForDetector = true;
              // Very coarse generic proxy for neutron dose
              impliedActivityMBq = reading_mSv_hr * Math.pow(activeDistance, 2) * 1500 * (1 / effFraction);
          }
      }

      if (isValidForDetector && impliedActivityMBq > 0) {
          candidates.push({
              nuclide: n.Nuclide,
              mode: mode,
              halfLife: n['Half-Life'],
              mbq: impliedActivityMBq,
              solvedByChain,
              chainLength: targetChainLength,
              qAlpha: n['Q-Alpha'] ? (parseFloat(n['Q-Alpha']) / 1000).toFixed(2) : '-',
              qBeta: n['Q-Beta'] ? (parseFloat(n['Q-Beta']) / 1000).toFixed(2) : '-',
              qEC: n['Q-EC'] ? (parseFloat(n['Q-EC']) / 1000).toFixed(2) : '-'
          });
      }
    }

    return candidates.sort((a, b) => b.probability - a.probability).slice(0, 50);

  }, [distance, reading, equipment, efficiency, unit, detectedEnergy, energyUnit, mode, triangulationResult, nuclideDict]);

  const formatActivity = (mbq: number) => {
      if (mbq > 1e6) return (mbq / 1e6).toFixed(2) + ' TBq';
      if (mbq > 1e3) return (mbq / 1e3).toFixed(2) + ' GBq';
      if (mbq < 1) return (mbq * 1000).toFixed(2) + ' kBq';
      return mbq.toFixed(2) + ' MBq';
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', margin: '0 0 10px 0' }}>Reverse Responder Tool</h2>
        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
          Input field telemetry to back-calculate implied source activities ($A_0$) across the nuclide database.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
             style={{ padding: '8px 15px', borderRadius: '4px', border: 'none', background: mode === 'single' ? '#3498db' : '#333', color: '#fff', cursor: 'pointer' }}
             onClick={() => setMode('single')}
          >
            Point Reading Mode
          </button>
          <button 
             style={{ padding: '8px 15px', borderRadius: '4px', border: 'none', background: mode === 'triangulate' ? '#9b59b6' : '#333', color: '#fff', cursor: 'pointer' }}
             onClick={() => setMode('triangulate')}
          >
            Multi-Point Triangulation
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* LEFT COLUMN - INPUTS */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Field Telemetry</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Instrument Reading Unit</label>
              <select 
                value={unit} onChange={e => setUnit(e.target.value as Unit)}
                style={{ width: '100%', padding: '10px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
              >
                <option value="CPM">CPM</option>
                <option value="µSv/hr">µSv/hr</option>
                <option value="mSv/hr">mSv/hr</option>
                <option value="mR/hr">mR/hr</option>
                <option value="R/hr">R/hr</option>
              </select>
            </div>
            
            {mode === 'single' ? (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Distance from Source (meters)</label>
                  <input 
                    type="number" value={distance} onChange={e => setDistance(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                    min="0.01" step="0.1"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Reading Value</label>
                  <input 
                    type="number" value={reading} onChange={e => setReading(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                    min="0" step="1"
                  />
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '15px', background: 'rgba(155, 89, 182, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid #9b59b6' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                     <h4 style={{ margin: 0, color: '#9b59b6' }}>3D Structural Blueprint</h4>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '0.85rem' }}>
                     <div style={{flex: 1}}>Width X:<input type="number" value={roomW} onChange={e=>setRoomW(Number(e.target.value)||1)} className="form-control" /></div>
                     <div style={{flex: 1}}>Length Y:<input type="number" value={roomL} onChange={e=>setRoomL(Number(e.target.value)||1)} className="form-control" /></div>
                     <div style={{flex: 1}}>Height Z:<input type="number" value={roomH} onChange={e=>setRoomH(Number(e.target.value)||1)} className="form-control" /></div>
                 </div>
                 <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                     <div style={{flex: 2}}>
                         <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block' }}>Boundary Material:</label>
                         <select 
                             value={wallMaterial} onChange={e => setWallMaterial(e.target.value as ShieldType)}
                             style={{ width: '100%', padding: '5px', background: '#222', border: '1px solid #444', color: '#ccc', borderRadius: '4px' }}
                         >
                             {Object.keys(SHIELDING_FACTORS).map(k => <option key={k} value={k}>{k}</option>)}
                         </select>
                     </div>
                     <div style={{flex: 1}}>
                         <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block' }}>Wall Thick (m):</label>
                         <input type="number" step="0.05" value={wallThickness} onChange={e=>setWallThickness(Number(e.target.value)||0.01)} className="form-control" />
                     </div>
                 </div>

                 <h5 style={{ margin: '0 0 5px 0', color: '#aaa' }}>Apertures (Doors & Windows)</h5>
                 {apertures.map((ap, i) => (
                    <div key={ap.id} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.85rem' }}>
                       <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                           <select 
                               value={ap.material} onChange={e=>{const tr=[...apertures]; tr[i].material=e.target.value as ShieldType; setApertures(tr)}}
                               style={{ flex: 1, padding: '5px', background: '#222', border: '1px solid #444', color: '#3498db', borderRadius: '4px' }}
                           >
                               <option value="Air / Open">Air / Open Hole</option>
                               <option value="Glass Window">Glass Window</option>
                               <option value="Standard Drywall (Office)">Drywall Sheet</option>
                               <option value="Heavy Wood Door">Solid Wood Door</option>
                           </select>
                           <button onClick={()=>setApertures(apertures.filter(a=>a.id!==ap.id))} style={{color:'#e74c3c', background: 'rgba(231,76,60,0.1)', padding:'0 10px', borderRadius:'4px', border:'none', cursor:'pointer'}}>&times;</button>
                       </div>
                       <div style={{ display: 'flex', gap: '5px' }}>
                           Wall: 
                           <select value={ap.wall} onChange={e=>{const tr=[...apertures]; tr[i].wall=e.target.value as WallSide; setApertures(tr)}} style={{flex: 1, padding:'2px', background: '#111', color: '#fff', border:'1px solid #444'}}>
                              <option value="South">South (y=0)</option>
                              <option value="North">North (y=L)</option>
                              <option value="West">West (x=0)</option>
                              <option value="East">East (x=W)</option>
                           </select>
                           Floor Z:<input type="number" step="0.5" value={ap.zOffset} onChange={e=>{const tr=[...apertures]; tr[i].zOffset=Number(e.target.value); setApertures(tr)}} style={{width: '40px'}} className="form-control p-1" />
                       </div>
                       <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                           Dist from Corner:<input type="number" step="0.5" value={ap.dist} onChange={e=>{const tr=[...apertures]; tr[i].dist=Number(e.target.value); setApertures(tr)}} style={{width: '45px'}} className="form-control p-1" />
                           Width:<input type="number" step="0.5" value={ap.width} onChange={e=>{const tr=[...apertures]; tr[i].width=Number(e.target.value); setApertures(tr)}} style={{width: '45px'}} className="form-control p-1" />
                           Height:<input type="number" step="0.5" value={ap.height} onChange={e=>{const tr=[...apertures]; tr[i].height=Number(e.target.value); setApertures(tr)}} style={{width: '45px'}} className="form-control p-1" />
                       </div>
                    </div>
                 ))}
                 <button onClick={()=>setApertures([...apertures, {id: Date.now(), wall: 'South', dist: 0, width: 1, height: 2.1, zOffset: 0, material: 'Air / Open'}])} style={{padding: '5px', borderRadius: '4px', border: 'none', background: '#34495e', color: '#fff', width: '100%', cursor: 'pointer', marginBottom: '15px'}}>
                    + Custom Door/Window
                 </button>

                 <h4 style={{ margin: '0 0 10px 0', color: '#9b59b6', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>Field Telemetry Waypoints</h4>
                 {triangulationReadings.map((r, i) => (
                    <div key={r.id} style={{ marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '3px solid #3498db' }}>
                       <div style={{ display: 'flex', gap: '5px' }}>
                         X:<input type="number" step="0.5" value={r.x} onChange={e=>{const tr=[...triangulationReadings]; tr[i].x=Number(e.target.value); setTriangulationReadings(tr)}} style={{width: '45px'}} className="form-control p-1" />
                         Y:<input type="number" step="0.5" value={r.y} onChange={e=>{const tr=[...triangulationReadings]; tr[i].y=Number(e.target.value); setTriangulationReadings(tr)}} style={{width: '45px'}} className="form-control p-1" />
                         Z:<input type="number" step="0.5" value={r.z} onChange={e=>{const tr=[...triangulationReadings]; tr[i].z=Number(e.target.value); setTriangulationReadings(tr)}} style={{width: '45px'}} className="form-control p-1" />
                         R:<input type="number" step="1" value={r.reading} onChange={e=>{const tr=[...triangulationReadings]; tr[i].reading=Number(e.target.value); setTriangulationReadings(tr)}} style={{flex: 1}} className="form-control p-1" />
                         <button onClick={()=>setTriangulationReadings(triangulationReadings.filter(rr=>rr.id !== r.id))} style={{color:'#e74c3c', background: 'none', border:'none', cursor:'pointer'}}>&times;</button>
                       </div>
                    </div>
                 ))}
                 <button onClick={()=>setTriangulationReadings([...triangulationReadings, {id: Date.now(), x:0, y:0, z:1, reading:0}])} style={{padding: '5px', borderRadius: '4px', border: 'none', background: '#34495e', color: '#fff', width: '100%', cursor: 'pointer', marginBottom: '10px'}}>
                    + Add Measurement
                 </button>
                 
                 {triangulationResult && (
                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                       <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Dynamic Ray-Tracing Solved Origin:</div>
                       <strong style={{ color: '#2ecc71', fontSize: '1.2rem' }}>X: {triangulationResult.x.toFixed(1)}, Y: {triangulationResult.y.toFixed(1)}, Z: {triangulationResult.z.toFixed(1)}</strong>
                       <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '5px' }}>Implied Field @ 1m: <strong>{triangulationResult.equivReading1m.toFixed(1)} {unit}</strong></div>
                    </div>
                 )}
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>Equipment Profile</label>
              <select 
                value={equipment} onChange={handleEquipmentChange}
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
              >
                <optgroup label="Gross Count Detectors">
                  <option value="Pancake GM">Pancake GM Probe - 15cm²</option>
                  <option value="Proportional Counter (Alpha/Beta)">Proportional Counter - 100cm²</option>
                  <option value="Alpha Probe (ZnS)">Alpha Probe (ZnS) - 50cm²</option>
                </optgroup>
                <optgroup label="Dose / Neutron">
                  <option value="Gamma Scint/Ion Chamber">Ion Chamber / Survey Meter</option>
                  <option value="Neutron Rem Meter">He-3 Neutron Rem Meter</option>
                </optgroup>
                <optgroup label="Spectrum Analyzers">
                  <option value="NaI(Tl) Spectrum Analyzer">NaI(Tl) Gamma Spectrometer</option>
                  <option value="HPGe Spectrometer">HPGe High-Purity Spectrometer</option>
                </optgroup>
              </select>
            </div>

            {equipment.includes('Spectr') && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#66AAFF', fontSize: '0.9rem' }}>
                  Identified Spectral Peaks (Comma Separated)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" value={detectedEnergy} onChange={e => setDetectedEnergy(e.target.value)}
                    placeholder="e.g., 662, 1173"
                    style={{ flex: 1, padding: '10px', background: 'rgba(102,170,255,0.1)', border: '1px solid #336699', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                  />
                  <select 
                    value={energyUnit} onChange={e => setEnergyUnit(e.target.value as EnergyUnit)}
                    style={{ padding: '10px', background: '#222', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}
                  >
                    <option value="keV">keV</option>
                    <option value="MeV">MeV</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#aaa', fontSize: '0.9rem' }}>
                {equipment.includes('Gamma') || equipment.includes('Spectr') ? 'Reading Accuracy / Scaling (%)' : 'Detector Efficiency (%)'}
              </label>
              <input 
                type="number" value={efficiency} onChange={e => setEfficiency(parseFloat(e.target.value) || 1)}
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '1rem' }}
                min="0.1" max="1000" step="1"
              />
            </div>
          </div>
          
          <div style={{ padding: '20px', background: '#0a0a0a', border: '1px solid #336699', borderRadius: '8px' }}>
             <h4 style={{ margin: '0 0 10px 0', color: '#66AAFF' }}>Physics Engine Status</h4>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
               Filtering database down to strictly <strong>{equipment.includes('Alpha') ? 'Alpha (α)' : equipment.includes('Neutron') ? 'Neutron (n)' : equipment.includes('Gamma') || equipment.includes('Spectr') ? 'Beta/Gamma (β/γ)' : 'Alpha/Beta/Gamma'}</strong> emitters.
               Using 4π point-source inverse square backward propagation.
               {detectedEnergy !== '' && equipment.includes('Spectr') && (
                  <span style={{ display: 'block', marginTop: '8px', color: '#FFD700' }}>
                    <strong>Spectrum Bandpass:</strong> Isolating isotopes capable of supporting {detectedEnergy} {energyUnit} transition energies.
                  </span>
               )}
             </p>
          </div>
        </div>

        {/* RIGHT COLUMN - TARGET ENGINE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', minHeight: 0 }}>
          
          {mode === 'triangulate' && (
             <div style={{ height: '55%', borderBottom: '1px solid #333', backgroundColor: 'rgba(155, 89, 182, 0.05)' }}>
                <Plot
                   data={[
                     ...visualMeshes.map((w, idx) => ({
                        type: 'mesh3d',
                        x: [w.xMin, w.xMin, w.xMax, w.xMax, w.xMin, w.xMin, w.xMax, w.xMax],
                        y: [w.yMin, w.yMax, w.yMax, w.yMin, w.yMin, w.yMax, w.yMax, w.yMin],
                        z: [w.zMin, w.zMin, w.zMin, w.zMin, w.zMax, w.zMax, w.zMax, w.zMax],
                        i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
                        j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
                        k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
                        color: SHIELDING_FACTORS[w.material as ShieldType].color,
                        opacity: 0.2,
                        name: `Wall Construct ${idx}`,
                        hoverinfo: 'name'
                     })),
                     ...derivedApertures.filter(ap => ap.material !== 'Air / Open').map(ap => ({
                        type: 'mesh3d',
                        x: [ap.xMin, ap.xMin, ap.xMax, ap.xMax, ap.xMin, ap.xMin, ap.xMax, ap.xMax],
                        y: [ap.yMin, ap.yMax, ap.yMax, ap.yMin, ap.yMin, ap.yMax, ap.yMax, ap.yMin],
                        z: [ap.zMin, ap.zMin, ap.zMin, ap.zMin, ap.zMax, ap.zMax, ap.zMax, ap.zMax],
                        i: [7, 0, 0, 0, 4, 4, 6, 6, 4, 0, 3, 2],
                        j: [3, 4, 1, 2, 5, 6, 5, 2, 0, 1, 6, 3],
                        k: [0, 7, 2, 3, 6, 7, 1, 1, 5, 5, 7, 6],
                        color: SHIELDING_FACTORS[ap.material as ShieldType].color,
                        opacity: 0.6,
                        name: `Aperture (${ap.material})`,
                        hoverinfo: 'name'
                     })),
                     {
                       x: triangulationReadings.map(r => r.x),
                       y: triangulationReadings.map(r => r.y),
                       z: triangulationReadings.map(r => r.z),
                       type: 'scatter3d',
                       mode: 'markers+text',
                       text: triangulationReadings.map(r => `${r.reading} ${unit}`),
                       textposition: 'top center',
                       marker: { size: 5, color: '#3498db' },
                       name: 'Waypoints'
                     },
                     triangulationResult ? {
                       x: [triangulationResult.x],
                       y: [triangulationResult.y],
                       z: [triangulationResult.z],
                       type: 'scatter3d',
                       mode: 'markers+text',
                       text: ['Est. Source Origin'],
                       textposition: 'bottom center',
                       textfont: { color: '#e74c3c', weight: 'bold' },
                       marker: { size: 8, symbol: 'diamond', color: '#e74c3c' },
                       name: 'Geolocated Source'
                     } : undefined
                   ].filter(Boolean) as any}
                   layout={{
                     autosize: true,
                     margin: { l: 0, r: 0, t: 30, b: 0 },
                     title: { text: '3D Ray-Tracing Structural Solver', font: { color: '#E0E1DD', size: 14 } },
                     paper_bgcolor: 'transparent',
                     font: { color: '#E0E1DD' },
                     scene: {
                       xaxis: { title: 'X (m)', backgroundcolor: '#111', gridcolor: '#333' },
                       yaxis: { title: 'Y (m)', backgroundcolor: '#111', gridcolor: '#333' },
                       zaxis: { title: 'Z (m)', backgroundcolor: '#111', gridcolor: '#333' },
                       aspectmode: 'data'
                     },
                     showlegend: false
                   }}
                   useResizeHandler={true}
                   style={{ width: '100%', height: '100%' }}
                />
             </div>
          )}

          <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#E0E1DD' }}>Isolated Candidates ({results.length})</h3>
            <span style={{ fontSize: '0.85rem', color: '#888' }}>Sorted by Implied Source Activity (A₀)</span>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#151515', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Nuclide</th>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Half-Life</th>
                  <th style={{ padding: '15px 20px', color: '#888', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Primary Decay</th>
                  <th style={{ padding: '15px 20px', color: '#F4D03F', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-Alpha (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#5DADE2', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-Beta (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#E74C3C', fontWeight: 'normal', borderBottom: '1px solid #333' }}>Q-EC (MeV)</th>
                  <th style={{ padding: '15px 20px', color: '#E0E1DD', fontWeight: 'bold', borderBottom: '1px solid #333' }}>Implied Activity</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res, i) => (
                  <tr key={res.nuclide} style={{ borderBottom: '1px solid #222', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 20px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                      {res.nuclide}
                      {res.solvedByChain && (
                         <span style={{ marginLeft: '10px', fontSize: '0.75rem', background: '#336699', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                           + {res.chainLength - 1} Daughters
                         </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', color: '#aaa' }}>{res.halfLife}</td>
                    <td style={{ padding: '12px 20px', color: '#aaa' }}>{res.mode}</td>
                    <td style={{ padding: '12px 20px', color: '#F4D03F', fontSize: '0.9rem' }}>{res.qAlpha}</td>
                    <td style={{ padding: '12px 20px', color: '#5DADE2', fontSize: '0.9rem' }}>{res.qBeta}</td>
                    <td style={{ padding: '12px 20px', color: '#E74C3C', fontSize: '0.9rem' }}>{res.qEC}</td>
                    <td style={{ padding: '12px 20px', color: '#E0E1DD', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                      {formatActivity(res.mbq)}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                      No viable candidates could produce this reading.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReverseResponderModule;
