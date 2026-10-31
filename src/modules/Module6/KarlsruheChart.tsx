import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import allNuclides from '../../data/all_nuclides.json';

interface KarlsruheChartProps {
  onIsotopeClick: (isotopeData: any) => void;
  onClearSelection?: () => void;
  activePathIds?: string[];
  activeEdges?: Array<{ fromNuclide: string; toNuclide: string; modality?: string }>;
}

const KarlsruheSvgChart: React.FC<KarlsruheChartProps> = ({ onIsotopeClick, onClearSelection, activePathIds, activeEdges }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const BOX_SIZE = 100;
  const GAP = 2;

  const [viewBox, setViewBox] = useState({ x: 8000, y: 2000, w: 6000, h: 4000 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });

  const [hoveredIsotope, setHoveredIsotope] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const nuclideMap = useMemo(() => {
    const map = new Map<string, any>();
    (allNuclides as any[]).forEach(n => {
      map.set(n.Nuclide, n);
    });
    return map;
  }, []);

  // Compute bounding box of activePathIds and center/frame the viewport onto the chain
  const centerOnActiveChain = useCallback(() => {
    if (!activePathIds || activePathIds.length === 0) {
      setViewBox({ x: 8000, y: 2000, w: 6000, h: 4000 });
      return;
    }

    // Match base nuclide names (strip 'm' metastable suffix if not directly in all_nuclides)
    const matchedNodes: any[] = [];
    activePathIds.forEach(id => {
      const direct = nuclideMap.get(id);
      if (direct) {
        matchedNodes.push(direct);
      } else {
        const stripped = id.replace(/m\d*$/i, '');
        const fallback = nuclideMap.get(stripped);
        if (fallback) matchedNodes.push(fallback);
      }
    });

    if (matchedNodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    matchedNodes.forEach(n => {
      const x = n.N * BOX_SIZE;
      const y = (120 - n.Z) * BOX_SIZE;
      if (x < minX) minX = x;
      if (x + BOX_SIZE > maxX) maxX = x + BOX_SIZE;
      if (y < minY) minY = y;
      if (y + BOX_SIZE > maxY) maxY = y + BOX_SIZE;
    });

    const spanW = Math.max(maxX - minX, BOX_SIZE * 5);
    const spanH = Math.max(maxY - minY, BOX_SIZE * 4);
    const padX = Math.max(spanW * 0.45, BOX_SIZE * 2.5);
    const padY = Math.max(spanH * 0.45, BOX_SIZE * 2.0);

    const w = Math.min(Math.max(spanW + padX * 2, 700), 18000);
    const h = Math.min(Math.max(spanH + padY * 2, 550), 12000);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setViewBox({
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h
    });
  }, [activePathIds, nuclideMap]);

  // Auto-pan/zoom whenever the active decay chain changes
  useEffect(() => {
    centerOnActiveChain();
  }, [centerOnActiveChain]);

  const zoomBy = (factor: number) => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const newW = Math.min(Math.max(viewBox.w * factor, 500), 30000);
    const newH = Math.min(Math.max(viewBox.h * factor, 400), 22000);
    setViewBox({
      x: cx - newW / 2,
      y: cy - newH / 2,
      w: newW,
      h: newH
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.12;
    const direction = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = viewBox.x + (mouseX / rect.width) * viewBox.w;
    const svgY = viewBox.y + (mouseY / rect.height) * viewBox.h;

    const newW = viewBox.w * direction;
    const newH = viewBox.h * direction;

    const newX = svgX - (mouseX / rect.width) * newW;
    const newY = svgY - (mouseY / rect.height) * newH;

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

  const normalizedActiveSet = useMemo(() => {
    const s = new Set<string>();
    (activePathIds || []).forEach(id => {
      s.add(id);
      s.add(id.replace(/m\d*$/i, ''));
    });
    return s;
  }, [activePathIds]);

  const renderBlocks = useMemo(() => {
    const parentId = activePathIds && activePathIds.length > 0 ? activePathIds[0].replace(/m\d*$/i, '') : null;

    return (allNuclides as any[]).map((n: any) => {
      const x = n.N * BOX_SIZE;
      const y = (120 - n.Z) * BOX_SIZE;
      const color = getColor(n['Decay Mode'], n['Half-Life']);

      const isActive = normalizedActiveSet.size > 0 && normalizedActiveSet.has(n.Nuclide);
      const isParent = parentId === n.Nuclide;
      const isStableActive = isActive && n['Half-Life'] === 'STABLE';

      let blockOpacity = 1;
      if (normalizedActiveSet.size > 0 && !isActive) {
        blockOpacity = 0.14;
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
          style={{ cursor: 'pointer', opacity: blockOpacity, transition: 'opacity 0.25s ease' }}
          className="isotope-block"
        >
          <rect
            x={GAP / 2}
            y={GAP / 2}
            width={BOX_SIZE - GAP}
            height={BOX_SIZE - GAP}
            fill={isStableActive ? '#064e3b' : color}
            stroke={isParent ? '#38bdf8' : isStableActive ? '#10b981' : isActive ? '#ffffff' : '#111'}
            strokeWidth={isParent || isStableActive ? '6' : isActive ? '3.5' : '1'}
          />
          {/* Main Symbol */}
          <text
            x={BOX_SIZE / 2}
            y={BOX_SIZE * 0.4}
            fill={color === '#EcF0F1' || color === '#F4D03F' ? '#111' : 'white'}
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
            x={BOX_SIZE / 2}
            y={BOX_SIZE * 0.65}
            fill={color === '#EcF0F1' || color === '#F4D03F' ? '#222' : 'white'}
            fontSize="14"
            textAnchor="middle"
            alignmentBaseline="middle"
            pointerEvents="none"
          >
            {n['Half-Life'] === 'STABLE' ? 'Stable' : n['Half-Life']}
          </text>

          {/* Decay Mode */}
          <text
            x={BOX_SIZE / 2}
            y={BOX_SIZE * 0.85}
            fill={color === '#EcF0F1' || color === '#F4D03F' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.8)'}
            fontSize="12"
            textAnchor="middle"
            alignmentBaseline="middle"
            pointerEvents="none"
            fontWeight="bold"
          >
            {n['Half-Life'] === 'STABLE' ? '' : n['Decay Mode']}
          </text>

          {/* Atomic / Neutron counts in small corners */}
          <text x={8} y={20} fill={color === '#EcF0F1' || color === '#F4D03F' ? '#111' : 'white'} fontSize="12" fontWeight="bold" pointerEvents="none">{n.Z}</text>
          <text x={BOX_SIZE - 8} y={BOX_SIZE - 10} fill={color === '#EcF0F1' || color === '#F4D03F' ? '#111' : 'white'} fontSize="12" textAnchor="end" pointerEvents="none">{n.N}</text>
        </g>
      );
    });
  }, [onIsotopeClick, normalizedActiveSet, activePathIds]);

  // Draw true DAG parent -> daughter vector connectors from activeEdges (avoiding false zig-zags across parallel branches)
  const activeChainVectors = useMemo(() => {
    if (activeEdges && activeEdges.length > 0) {
      return activeEdges.map((edge, i) => {
        const fromStripped = edge.fromNuclide.replace(/m\d*$/i, '');
        const toStripped = edge.toNuclide.replace(/m\d*$/i, '');
        const fromN = nuclideMap.get(edge.fromNuclide) || nuclideMap.get(fromStripped);
        const toN = nuclideMap.get(edge.toNuclide) || nuclideMap.get(toStripped);
        if (!fromN || !toN) return null;
        const x1 = fromN.N * BOX_SIZE + BOX_SIZE / 2;
        const y1 = (120 - fromN.Z) * BOX_SIZE + BOX_SIZE / 2;
        const x2 = toN.N * BOX_SIZE + BOX_SIZE / 2;
        const y2 = (120 - toN.Z) * BOX_SIZE + BOX_SIZE / 2;
        if (x1 === x2 && y1 === y2) return null;
        const strokeColor =
          edge.modality === 'alpha'
            ? '#facc15'
            : edge.modality === 'ec_positron'
            ? '#f87171'
            : '#38bdf8';
        return (
          <line
            key={`${edge.fromNuclide}-${edge.toNuclide}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth="6"
            strokeDasharray="12,8"
            opacity={0.9}
            pointerEvents="none"
          />
        );
      });
    }

    if (!activePathIds || activePathIds.length < 2) return null;
    const coords: Array<{ id: string; cx: number; cy: number }> = [];
    activePathIds.forEach(id => {
      const stripped = id.replace(/m\d*$/i, '');
      const n = nuclideMap.get(id) || nuclideMap.get(stripped);
      if (n) {
        coords.push({
          id,
          cx: n.N * BOX_SIZE + BOX_SIZE / 2,
          cy: (120 - n.Z) * BOX_SIZE + BOX_SIZE / 2
        });
      }
    });
    if (coords.length < 2) return null;

    return coords.slice(0, -1).map((from, i) => {
      const to = coords[i + 1];
      if (from.cx === to.cx && from.cy === to.cy) return null;
      return (
        <line
          key={`${from.id}-${to.id}-${i}`}
          x1={from.cx}
          y1={from.cy}
          x2={to.cx}
          y2={to.cy}
          stroke="#38bdf8"
          strokeWidth="6"
          strokeDasharray="12,8"
          opacity={0.85}
          pointerEvents="none"
        />
      );
    });
  }, [activeEdges, activePathIds, nuclideMap]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#181c22', position: 'relative', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top-Left Navigation & Center Chain HUD */}
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          color: '#f8fafc',
          padding: '8px 10px',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.45)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={centerOnActiveChain}
            title="Auto-pan and zoom onto the currently selected parent-to-daughter decay chain"
            style={{
              background: 'rgba(56, 189, 248, 0.18)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🎯 Center Chain
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.75)}
            title="Zoom In"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '5px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.33)}
            title="Zoom Out"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '5px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            －
          </button>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.35 }}>
          Wheel: Zoom &nbsp;|&nbsp; Drag: Pan &nbsp;|&nbsp; Click Nuclide: Trace
        </div>
      </div>

      {/* Bottom-Left Karlsruhe Decay Mode Color Legend */}
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '6px 10px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: '#e2e8f0'
        }}
      >
        {[
          { label: 'α Decay', color: '#F4D03F' },
          { label: 'β⁻ Decay', color: '#5DADE2' },
          { label: 'EC / β⁺', color: '#E74C3C' },
          { label: 'Spont. Fission', color: '#2ECC71' },
          { label: 'Stable', color: '#2C3E50' }
        ].map(item => (
          <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, border: '1px solid rgba(255,255,255,0.4)' }} />
            {item.label}
          </span>
        ))}
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ userSelect: 'none' }}
        onClick={onClearSelection}
      >
        {renderBlocks}
        {activeChainVectors}
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
            color: getColor(hoveredIsotope['Decay Mode'], hoveredIsotope['Half-Life']) === '#EcF0F1' || getColor(hoveredIsotope['Decay Mode'], hoveredIsotope['Half-Life']) === '#F4D03F' ? '#111' : '#fff'
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
                Z: {hoveredIsotope.Z}<br />
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
