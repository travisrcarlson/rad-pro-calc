import React, { useState, useRef, useMemo, useEffect } from 'react';
import allNuclides from '../../data/all_nuclides.json';

interface KarlsruheChartProps {
  onIsotopeClick: (isotopeData: any) => void;
  onClearSelection?: () => void;
  activePathIds?: string[];
}

const KarlsruheSvgChart: React.FC<KarlsruheChartProps> = ({ onIsotopeClick, onClearSelection, activePathIds }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const BOX_SIZE = 100;
  const GAP = 2;
  
  const [viewBox, setViewBox] = useState({ x: 0, y: 3000, w: 18000, h: 6000 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });

  const [hoveredIsotope, setHoveredIsotope] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Initial center on mid-heavy elements for decent viewport
  useEffect(() => {
    if (containerRef.current) {
       setViewBox({ x: 8000, y: 2000, w: 6000, h: 4000 });
    }
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;

    // Zooming around cursor
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = viewBox.x + (mouseX / rect.width) * viewBox.w;
    const svgY = viewBox.y + (mouseY / rect.height) * viewBox.h;

    const newW = viewBox.w * direction;
    const newH = viewBox.h * direction;

    // Keep mouse stationary in SVG space
    const newX = svgX - (mouseX / rect.width) * newW;
    const newY = svgY - (mouseY / rect.height) * newH;

    // Limits
    if (newW > 500 && newW < 30000) {
      setViewBox({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const svgDx = (dx / rect.width) * viewBox.w;
    const svgDy = (dy / rect.height) * viewBox.h;

    setViewBox({
      ...viewBox,
      x: dragStart.vx - svgDx,
      y: dragStart.vy - svgDy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getColor = (mode: string, hl: string) => {
    const m = String(mode).toUpperCase();
    if (hl === 'STABLE' || m === 'STABLE') return '#2C3E50'; // Black/Dark Slate
    if (m.includes('A')) return '#F4D03F'; // Alpha Yellow
    if (m.includes('B-')) return '#5DADE2'; // Beta Blue
    if (m.includes('B+') || m.includes('EC')) return '#E74C3C'; // EC/Beta+ Red
    if (m.includes('SF')) return '#2ECC71'; // Fission Green
    return '#EcF0F1'; // White/Grey unknown
  };

  const renderBlocks = useMemo(() => {
    return allNuclides.map((n: any) => {
      const x = n.N * BOX_SIZE;
      const y = (120 - n.Z) * BOX_SIZE; 
      const color = getColor(n['Decay Mode'], n['Half-Life']);
      
      // Dimming logic
      let blockOpacity = 1;
      if (activePathIds && activePathIds.length > 0) {
        if (!activePathIds.includes(n.Nuclide)) {
          blockOpacity = 0.15;
        }
      }

      return (
        <g 
          key={n.Nuclide} 
          transform={`translate(${x}, ${y})`} 
          onClick={(e) => {
             e.stopPropagation();
             onIsotopeClick(n);
          }}
          onMouseEnter={(e) => {
             const rect = containerRef.current?.getBoundingClientRect();
             if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
             setHoveredIsotope(n);
          }}
          onMouseMove={(e) => {
             const rect = containerRef.current?.getBoundingClientRect();
             if (rect) setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
          }}
          onMouseLeave={() => setHoveredIsotope(null)}
          style={{ cursor: 'pointer', opacity: blockOpacity, transition: 'opacity 0.3s ease' }}
          className="isotope-block"
        >
          <rect 
            x={GAP/2} 
            y={GAP/2} 
            width={BOX_SIZE - GAP} 
            height={BOX_SIZE - GAP} 
            fill={color}
            stroke="#111"
            strokeWidth="1"
          />
          {/* Main Symbol */}
          <text 
            x={BOX_SIZE/2} 
            y={BOX_SIZE * 0.4} 
            fill={color === '#EcF0F1' ? '#111' : 'white'}
            fontSize="30" 
            fontWeight="bold" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            pointerEvents="none"
          >
            {n.Symbol}
          </text>
          
          {/* Half Life */}
          <text 
            x={BOX_SIZE/2} 
            y={BOX_SIZE * 0.65} 
            fill={color === '#EcF0F1' ? '#333' : 'white'}
            fontSize="14" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            pointerEvents="none"
          >
            {n['Half-Life'] === 'STABLE' ? 'Stable' : n['Half-Life']}
          </text>

          {/* Decay Mode */}
          <text 
            x={BOX_SIZE/2} 
            y={BOX_SIZE * 0.85} 
            fill={color === '#EcF0F1' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
            fontSize="12" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            pointerEvents="none"
            fontWeight="bold"
          >
            {n['Half-Life'] === 'STABLE' ? '' : n['Decay Mode']}
          </text>

          {/* Atomic / Neutron counts in small corners */}
          <text x={8} y={20} fill={color === '#EcF0F1' ? '#111' : 'white'} fontSize="12" fontWeight="bold" pointerEvents="none">{n.Z}</text>
          <text x={BOX_SIZE - 8} y={BOX_SIZE - 10} fill={color === '#EcF0F1' ? '#111' : 'white'} fontSize="12" textAnchor="end" pointerEvents="none">{n.N}</text>
        </g>
      );
    });
  }, [onIsotopeClick, activePathIds]);

  return (
    <div 
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#22252a', position: 'relative', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '8px' }}>
        <strong>Control Panel</strong>
        <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
          Mouse Wheel: Zoom<br/>
          Click & Drag: Pan<br/>
          Click Isotope: Trace Path
        </div>
      </div>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
        xmlns="http://www.w3.org/2000/svg"
        style={{ userSelect: 'none' }}
        onClick={onClearSelection}
      >
        {/* Draw subtle grid lines or axes if needed */}
        {renderBlocks}
      </svg>
      
      {/* Detailed Placard Hover Tooltip */}
      {hoveredIsotope && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          width: '240px',
          backgroundColor: '#fff',
          border: '2px solid #333',
          boxShadow: '4px 4px 15px rgba(0,0,0,0.5)',
          zIndex: 100,
          pointerEvents: 'none',
          color: '#111',
          fontFamily: 'Arial, sans-serif'
        }}>
          {/* Header Bar */}
          <div style={{
             backgroundColor: getColor(hoveredIsotope['Decay Mode'], hoveredIsotope['Half-Life']),
             padding: '10px',
             borderBottom: '2px solid #333',
             display: 'flex',
             alignItems: 'baseline',
             justifyContent: 'center',
             color: getColor(hoveredIsotope['Decay Mode'], hoveredIsotope['Half-Life']) === '#EcF0F1' ? '#111' : '#fff'
          }}>
             <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{hoveredIsotope.Symbol}</span>
             <span style={{ fontSize: '1.5rem', marginLeft: '5px' }}>{hoveredIsotope.Z + hoveredIsotope.N}</span>
          </div>

          {/* Details Body */}
          <div style={{ padding: '10px', display: 'flex', fontSize: '1rem' }}>
             <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {hoveredIsotope['Half-Life'] === 'STABLE' ? 'Stable' : hoveredIsotope['Half-Life']}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#555' }}>
                  Z: {hoveredIsotope.Z}<br/>
                  N: {hoveredIsotope.N}
                </div>
             </div>
             
             <div style={{ flex: 1, paddingLeft: '10px', display: 'flex', flexDirection: 'column' }}>
                {hoveredIsotope['Half-Life'] !== 'STABLE' && (
                  <>
                    <strong style={{ marginBottom: '5px' }}>Decay:</strong>
                    <div style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {hoveredIsotope['Decay Mode']?.split(',').map((mode: string, i: number) => (
                        <div key={i}>
                           {mode.replace('B-', 'β⁻').replace('B+', 'β⁺').replace('A', 'α')} 
                        </div>
                      ))}
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KarlsruheSvgChart;
