import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import allNuclides from '../../data/all_nuclides.json';

export interface KarlsruheNuclideRow {
  Nuclide: string;
  Symbol: string;
  Z: number;
  N: number;
  'Half-Life': string;
  'Decay Mode': string;
  [key: string]: string | number | boolean | null | undefined;
}

interface KarlsruheChartProps {
  onIsotopeClick: (isotopeData: KarlsruheNuclideRow) => void;
  onClearSelection?: () => void;
  activePathIds?: string[];
  activeEdges?: Array<{ fromNuclide: string; toNuclide: string; modality?: string; branchFraction?: number }>;
}

const BOX_SIZE = 100;
const GAP = 2;

function getSvgMetrics(rect: DOMRect, vb: { x: number; y: number; w: number; h: number }) {
  const safeW = Math.max(1, vb.w);
  const safeH = Math.max(1, vb.h);
  const scale = Math.min(rect.width / safeW, rect.height / safeH) || 1;
  const renderedW = safeW * scale;
  const renderedH = safeH * scale;
  const offsetX = (rect.width - renderedW) / 2;
  const offsetY = (rect.height - renderedH) / 2;
  return { scale, offsetX, offsetY };
}

function clampViewBox(vb: { x: number; y: number; w: number; h: number }) {
  return {
    x: Math.max(-2000, Math.min(20000, vb.x)),
    y: Math.max(-1500, Math.min(14000, vb.y)),
    w: vb.w,
    h: vb.h
  };
}

function computeChainViewBox(
  activePathIds: string[] | undefined,
  nuclideMap: Map<string, KarlsruheNuclideRow>
): { x: number; y: number; w: number; h: number } {
  if (!activePathIds || activePathIds.length === 0) {
    return { x: 8000, y: 2000, w: 6000, h: 4000 };
  }

  // Match base nuclide names (strip 'm' metastable suffix if not directly in all_nuclides)
  const matchedNodes: KarlsruheNuclideRow[] = [];
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

  if (matchedNodes.length === 0) {
    return { x: 8000, y: 2000, w: 6000, h: 4000 };
  }

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

  return {
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h
  };
}

const KarlsruheSvgChart: React.FC<KarlsruheChartProps> = ({ onIsotopeClick, activePathIds, activeEdges }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState({ x: 8000, y: 2000, w: 6000, h: 4000 });
  const viewBoxRef = useRef(viewBox);
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  const [wheelZoomEnabled, setWheelZoomEnabled] = useState<boolean>(false);
  const wheelZoomRef = useRef<boolean>(false);
  useEffect(() => {
    wheelZoomRef.current = wheelZoomEnabled;
  }, [wheelZoomEnabled]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, scale: 1 });
  const dragDistanceRef = useRef<number>(0);

  const [hoveredIsotope, setHoveredIsotope] = useState<KarlsruheNuclideRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const nuclideMap = useMemo(() => {
    const map = new Map<string, KarlsruheNuclideRow>();
    (allNuclides as KarlsruheNuclideRow[]).forEach(n => {
      map.set(n.Nuclide, n);
    });
    return map;
  }, []);

  // Compute bounding box of activePathIds and center/frame the viewport onto the chain
  const centerOnActiveChain = useCallback(() => {
    setViewBox(computeChainViewBox(activePathIds, nuclideMap));
  }, [activePathIds, nuclideMap]);

  // Auto-pan/zoom whenever the active decay chain changes
  const activePathKey = (activePathIds || []).join('|');
  const [prevPathKey, setPrevPathKey] = useState<string | null>(null);
  if (activePathKey !== prevPathKey) {
    setPrevPathKey(activePathKey);
    setViewBox(computeChainViewBox(activePathIds, nuclideMap));
  }

  const zoomBy = (factor: number) => {
    setViewBox(vb => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const clampedW = Math.min(Math.max(vb.w * factor, 500), 22000);
      const scaleRatio = clampedW / vb.w;
      const newH = vb.h * scaleRatio;
      return clampViewBox({
        x: cx - clampedW / 2,
        y: cy - newH / 2,
        w: clampedW,
        h: newH
      });
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      // Allow normal page scrolling unless wheel zoom is explicitly unlocked or Ctrl/Cmd is held
      const shouldZoom = wheelZoomRef.current || e.ctrlKey || e.metaKey;
      if (!shouldZoom) return;

      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const rawDelta =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      const clampedDelta = Math.max(-120, Math.min(120, rawDelta));
      const factor = Math.exp(clampedDelta * 0.0022);

      setViewBox(vb => {
        const { scale, offsetX, offsetY } = getSvgMetrics(rect, vb);
        const newW = Math.min(Math.max(vb.w * factor, 500), 22000);
        const actualRatio = newW / vb.w;
        if (Math.abs(actualRatio - 1) < 1e-4) return vb;
        const newH = vb.h * actualRatio;

        const svgX = vb.x + (e.clientX - rect.left - offsetX) / scale;
        const svgY = vb.y + (e.clientY - rect.top - offsetY) / scale;

        return clampViewBox({
          x: svgX - (svgX - vb.x) * actualRatio,
          y: svgY - (svgY - vb.y) * actualRatio,
          w: newW,
          h: newH
        });
      });
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const vb = viewBoxRef.current;
    const scale = rect ? getSvgMetrics(rect, vb).scale : 1;
    setIsDragging(true);
    dragDistanceRef.current = 0;
    dragStartRef.current = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, scale };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const start = dragStartRef.current;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(dx, dy));

    const svgDx = dx / start.scale;
    const svgDy = dy / start.scale;

    setViewBox(vb =>
      clampViewBox({
        ...vb,
        x: start.vx - svgDx,
        y: start.vy - svgDy
      })
    );
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

    return (allNuclides as KarlsruheNuclideRow[]).map((n: KarlsruheNuclideRow) => {
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
            if (dragDistanceRef.current > 5) return;
            e.stopPropagation();
            onIsotopeClick(n);
          }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const clampedX = Math.max(8, Math.min(e.clientX - rect.left, Math.max(8, rect.width - 252)));
              const clampedY = Math.max(8, Math.min(e.clientY - rect.top, Math.max(8, rect.height - 190)));
              setTooltipPos({ x: clampedX, y: clampedY });
            }
            setHoveredIsotope(n);
          }}
          onMouseMove={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const clampedX = Math.max(8, Math.min(e.clientX - rect.left + 15, Math.max(8, rect.width - 252)));
              const clampedY = Math.max(8, Math.min(e.clientY - rect.top + 15, Math.max(8, rect.height - 190)));
              setTooltipPos({ x: clampedX, y: clampedY });
            }
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

  // Draw true DAG parent -> daughter vector connectors from activeEdges (deduplicated, trimmed & arrow-tipped)
  const activeChainVectors = useMemo(() => {
    const markerIdForModality = (mod?: string) => {
      if (mod === 'alpha') return 'url(#karl-arrow-alpha)';
      if (mod === 'ec_positron') return 'url(#karl-arrow-ec)';
      if (mod === 'gamma_it') return 'url(#karl-arrow-it)';
      return 'url(#karl-arrow-beta)';
    };
    const strokeForModality = (mod?: string) => {
      if (mod === 'alpha') return '#facc15';
      if (mod === 'ec_positron') return '#f87171';
      if (mod === 'gamma_it') return '#a855f7';
      return '#38bdf8';
    };

    if (activeEdges && activeEdges.length > 0) {
      const grouped = new Map<
        string,
        { x1: number; y1: number; x2: number; y2: number; totalFrac: number; bestFrac: number; modality?: string }
      >();

      activeEdges.forEach(edge => {
        const fromStripped = edge.fromNuclide.replace(/m\d*$/i, '');
        const toStripped = edge.toNuclide.replace(/m\d*$/i, '');
        const fromN = nuclideMap.get(edge.fromNuclide) || nuclideMap.get(fromStripped);
        const toN = nuclideMap.get(edge.toNuclide) || nuclideMap.get(toStripped);
        if (!fromN || !toN) return;
        const x1 = fromN.N * BOX_SIZE + BOX_SIZE / 2;
        const y1 = (120 - fromN.Z) * BOX_SIZE + BOX_SIZE / 2;
        const x2 = toN.N * BOX_SIZE + BOX_SIZE / 2;
        const y2 = (120 - toN.Z) * BOX_SIZE + BOX_SIZE / 2;
        if (x1 === x2 && y1 === y2) return;

        const key = `${fromN.Z},${fromN.N}->${toN.Z},${toN.N}`;
        const frac = edge.branchFraction ?? 1.0;
        const existing = grouped.get(key);
        if (existing) {
          existing.totalFrac += frac;
          if (frac > existing.bestFrac) {
            existing.bestFrac = frac;
            existing.modality = edge.modality;
          }
        } else {
          grouped.set(key, { x1, y1, x2, y2, totalFrac: frac, bestFrac: frac, modality: edge.modality });
        }
      });

      return Array.from(grouped.entries()).map(([key, g]) => {
        const dx = g.x2 - g.x1;
        const dy = g.y2 - g.y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return null;
        const trim = Math.min(26, len * 0.22);
        const ux = dx / len;
        const uy = dy / len;
        const sx = g.x1 + ux * trim;
        const sy = g.y1 + uy * trim;
        const ex = g.x2 - ux * trim;
        const ey = g.y2 - uy * trim;
        const isPrimary = g.totalFrac >= 0.5;
        return (
          <line
            key={key}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={strokeForModality(g.modality)}
            strokeWidth={isPrimary ? '7' : '4.5'}
            strokeDasharray={isPrimary ? undefined : '12,8'}
            markerEnd={markerIdForModality(g.modality)}
            opacity={isPrimary ? 0.95 : 0.78}
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
      const dx = to.cx - from.cx;
      const dy = to.cy - from.cy;
      const len = Math.hypot(dx, dy);
      if (len < 1) return null;
      const trim = Math.min(26, len * 0.22);
      const ux = dx / len;
      const uy = dy / len;
      return (
        <line
          key={`${from.id}-${to.id}-${i}`}
          x1={from.cx + ux * trim}
          y1={from.cy + uy * trim}
          x2={to.cx - ux * trim}
          y2={to.cy - uy * trim}
          stroke="#38bdf8"
          strokeWidth="6.5"
          markerEnd="url(#karl-arrow-beta)"
          opacity={0.9}
          pointerEvents="none"
        />
      );
    });
  }, [activeEdges, activePathIds, nuclideMap]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#181c22', position: 'relative', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
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
            onClick={() => setViewBox({ x: -200, y: -200, w: 18500, h: 12600 })}
            title="Zoom out to inspect the full Chart of the Nuclides"
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '5px', padding: '4px 7px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🌐 Full
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
          <button
            type="button"
            className={wheelZoomEnabled ? 'active' : ''}
            onClick={() => setWheelZoomEnabled(v => !v)}
            title="Hold Ctrl+Wheel or Pinch to zoom anytime; toggle this to lock bare mouse-wheel zoom onto this chart instead of scrolling the page"
            style={{
              background: wheelZoomEnabled ? 'rgba(56, 189, 248, 0.22)' : '#1e293b',
              border: `1px solid ${wheelZoomEnabled ? '#38bdf8' : '#334155'}`,
              color: wheelZoomEnabled ? '#38bdf8' : '#94a3b8',
              borderRadius: '5px',
              padding: '4px 7px',
              fontSize: '0.71rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {wheelZoomEnabled ? '🔍 Wheel: Zoom' : '🔒 Wheel: Page'}
          </button>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.35 }}>
          {wheelZoomEnabled
            ? 'Wheel: Zoom | Drag: Pan | Click Nuclide: Trace'
            : 'Ctrl+Wheel / Pinch: Zoom | Drag: Pan | Click Nuclide: Trace'}
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
      >
        <defs>
          <marker id="karl-arrow-alpha" markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.25" orient="auto">
            <path d="M0,0 L4.5,2.25 L0,4.5 Z" fill="#facc15" />
          </marker>
          <marker id="karl-arrow-beta" markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.25" orient="auto">
            <path d="M0,0 L4.5,2.25 L0,4.5 Z" fill="#38bdf8" />
          </marker>
          <marker id="karl-arrow-ec" markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.25" orient="auto">
            <path d="M0,0 L4.5,2.25 L0,4.5 Z" fill="#f87171" />
          </marker>
          <marker id="karl-arrow-it" markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.25" orient="auto">
            <path d="M0,0 L4.5,2.25 L0,4.5 Z" fill="#a855f7" />
          </marker>
        </defs>
        {renderBlocks}
        {activeChainVectors}
      </svg>

      {/* Detailed Placard Hover Tooltip (clamped within container bounds) */}
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
