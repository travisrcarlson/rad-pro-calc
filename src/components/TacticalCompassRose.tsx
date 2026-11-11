import React, { useRef, useCallback } from 'react';

export interface TacticalCompassRoseProps {
  value: number; // 0-359 degrees (Wind Origin Bearing)
  onChange: (bearingDeg: number) => void;
  size?: number; // Diameter in px, default 160
  label?: string;
  showSnapButtons?: boolean;
  sectorArcSweepDeg?: number; // e.g. 67.5 for keyhole wedge preview
}

const CARDINALS = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 },
  { label: 'NW', deg: 315 }
];

export const TacticalCompassRose: React.FC<TacticalCompassRoseProps> = ({
  value,
  onChange,
  size = 160,
  label = 'Wind Origin & Downwind Bearing',
  showSnapButtons = true,
  sectorArcSweepDeg = 67.5
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDragging = useRef<boolean>(false);

  const normalizedOrigin = ((value % 360) + 360) % 360;
  const downwindBearing = (normalizedOrigin + 180) % 360;

  const center = size / 2;
  const radius = center - 14;

  const handlePointerEvent = useCallback((e: React.PointerEvent<SVGSVGElement> | MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;

    // Angle from North (0° is top / negative Y)
    let angleRad = Math.atan2(x, -y);
    let deg = (angleRad * 180) / Math.PI;
    if (deg < 0) deg += 360;

    onChange(Math.round(deg) % 360);
  }, [center, onChange]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointerEvent(e);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    handlePointerEvent(e);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Convert polar (radius, deg) to cartesian (x, y) relative to center
  const polarToXY = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  // Build SVG path for Downwind Keyhole Arc Wedge Preview
  const buildWedgePath = () => {
    if (!sectorArcSweepDeg) return '';
    const halfSweep = sectorArcSweepDeg / 2;
    const startAngle = (downwindBearing - halfSweep + 360) % 360;
    const endAngle = (downwindBearing + halfSweep + 360) % 360;
    const pStart = polarToXY(radius - 2, startAngle);
    const pEnd = polarToXY(radius - 2, endAngle);
    const largeArcFlag = sectorArcSweepDeg > 180 ? 1 : 0;

    return `M ${center} ${center} L ${pStart.x.toFixed(1)} ${pStart.y.toFixed(1)} A ${radius - 2} ${radius - 2} 0 ${largeArcFlag} 1 ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)} Z`;
  };

  // Unit vector along any compass bearing (0° = North / -Y, 90° = East / +X)
  const bearingUnitVec = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { ux: Math.cos(rad), uy: Math.sin(rad) };
  };

  // Helper to place a point at (along-ray distance r, perpendicular offset p)
  const rayPoint = (deg: number, r: number, perpOffset = 0) => {
    const { ux, uy } = bearingUnitVec(deg);
    // Perpendicular unit vector (+90° clockwise)
    const px = -uy;
    const py = ux;
    return {
      x: center + ux * r + px * perpOffset,
      y: center + uy * r + py * perpOffset
    };
  };

  // Wind Origin Vector (Cyan — enters at outer perimeter and points INWARD toward center hub)
  const originStart = rayPoint(normalizedOrigin, radius - 3, 0);
  const originShaftEnd = rayPoint(normalizedOrigin, 15, 0);
  const originTip = rayPoint(normalizedOrigin, 9.5, 0);
  const originWingL = rayPoint(normalizedOrigin, 18.5, -4.0);
  const originWingR = rayPoint(normalizedOrigin, 18.5, 4.0);
  const originNotch = rayPoint(normalizedOrigin, 16.0, 0);

  // Downwind Plume Vector (Red/Coral — slim shaft from center hub OUTWARD to swept pointer tip)
  const downwindShaftStart = rayPoint(downwindBearing, 7.5, 0);
  const downwindShaftEnd = rayPoint(downwindBearing, radius - 11.5, 0);
  const downwindTip = rayPoint(downwindBearing, radius - 4.0, 0);
  const downwindWingL = rayPoint(downwindBearing, radius - 14.0, -4.6);
  const downwindNotch = rayPoint(downwindBearing, radius - 11.2, 0);
  const downwindWingR = rayPoint(downwindBearing, radius - 14.0, 4.6);

  // Compass Sector Code for current downwind
  const sectorNames16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const downwindSectorIndex = Math.floor(((downwindBearing + 11.25) % 360) / 22.5);
  const originSectorIndex = Math.floor(((normalizedOrigin + 11.25) % 360) / 22.5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {label && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
      )}

      {/* SVG Compass Dial */}
      <div style={{ position: 'relative', width: size, height: size, userSelect: 'none' }}>
        <svg
          ref={svgRef}
          width={size}
          height={size}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
        >
          {/* Compass Dial Outer Ring */}
          <circle cx={center} cy={center} r={radius} fill="#060c16" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1.5" />
          <circle cx={center} cy={center} r={radius - 8} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="2,2" />

          {/* Keyhole Evacuation Wedge Preview */}
          <path d={buildWedgePath()} fill="rgba(234, 179, 8, 0.22)" stroke="#facc15" strokeWidth="1" strokeDasharray="3,2" />

          {/* 16 Compass Ticks */}
          {Array.from({ length: 16 }).map((_, i) => {
            const tickDeg = i * 22.5;
            const isCardinal = i % 4 === 0;
            const isInterCardinal = i % 2 === 0;
            const innerR = isCardinal ? radius - 10 : isInterCardinal ? radius - 6 : radius - 4;
            const p1 = polarToXY(radius - 1, tickDeg);
            const p2 = polarToXY(innerR, tickDeg);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isCardinal ? '#00e5ff' : 'rgba(255, 255, 255, 0.3)'}
                strokeWidth={isCardinal ? 1.5 : 0.8}
              />
            );
          })}

          {/* Cardinal Text Labels (N, E, S, W) */}
          {CARDINALS.map(c => {
            const pos = polarToXY(radius - 16, c.deg);
            const isNorth = c.label === 'N';
            return (
              <text
                key={c.label}
                x={pos.x}
                y={pos.y + 3.5}
                textAnchor="middle"
                fontSize={isNorth ? '10px' : '8px'}
                fontWeight={isNorth ? 'bold' : 'normal'}
                fill={isNorth ? '#ef4444' : '#94a3b8'}
                fontFamily="var(--font-mono)"
                pointerEvents="none"
              >
                {c.label}
              </text>
            );
          })}

          {/* Upwind Origin Vector (Cyan — perimeter pip, dashed inflow shaft, inward swept chevron) */}
          <circle cx={originStart.x} cy={originStart.y} r="2.2" fill="#38bdf8" />
          <line
            x1={originStart.x}
            y1={originStart.y}
            x2={originShaftEnd.x}
            y2={originShaftEnd.y}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="3,2.5"
            opacity="0.85"
          />
          <polygon
            points={`${originTip.x.toFixed(1)},${originTip.y.toFixed(1)} ${originWingL.x.toFixed(1)},${originWingL.y.toFixed(1)} ${originNotch.x.toFixed(1)},${originNotch.y.toFixed(1)} ${originWingR.x.toFixed(1)},${originWingR.y.toFixed(1)}`}
            fill="#38bdf8"
            stroke="#0284c7"
            strokeWidth="0.7"
          />

          {/* Downwind Plume Vector (Slim solid shaft + sleek swept pointer tip — never obscures bezel labels) */}
          <line
            x1={downwindShaftStart.x}
            y1={downwindShaftStart.y}
            x2={downwindShaftEnd.x}
            y2={downwindShaftEnd.y}
            stroke="#ef4444"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon
            points={`${downwindTip.x.toFixed(1)},${downwindTip.y.toFixed(1)} ${downwindWingL.x.toFixed(1)},${downwindWingL.y.toFixed(1)} ${downwindNotch.x.toFixed(1)},${downwindNotch.y.toFixed(1)} ${downwindWingR.x.toFixed(1)},${downwindWingR.y.toFixed(1)}`}
            fill="#ef4444"
            stroke="#fca5a5"
            strokeWidth="0.8"
          />

          {/* Machined Center Hub (rendered on top of vector shafts) */}
          <circle cx={center} cy={center} r="5.5" fill="#09111f" stroke="#38bdf8" strokeWidth="1.4" />
          <circle cx={center} cy={center} r="2.2" fill="#f8fafc" />
        </svg>
      </div>

      {/* Numerical Bearing Readout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: `${size + 40}px`, fontSize: '0.72rem', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Wind From: </span>
          <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{normalizedOrigin}° ({sectorNames16[originSectorIndex]})</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Plume: </span>
          <strong style={{ color: '#f87171', fontFamily: 'var(--font-mono)' }}>{downwindBearing}° ({sectorNames16[downwindSectorIndex]})</strong>
        </div>
      </div>

      {/* Cardinal Snap Buttons */}
      {showSnapButtons && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', width: '100%', maxWidth: `${size + 40}px` }}>
          {CARDINALS.map(c => (
            <button
              key={c.label}
              type="button"
              className={`btn btn-secondary ${normalizedOrigin === c.deg ? 'active' : ''}`}
              onClick={() => onChange(c.deg)}
              style={{
                fontSize: '0.66rem',
                padding: '2px 4px',
                background: normalizedOrigin === c.deg ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0,0,0,0.2)',
                color: normalizedOrigin === c.deg ? '#00e5ff' : '#94a3b8',
                borderColor: normalizedOrigin === c.deg ? '#00e5ff' : 'rgba(255,255,255,0.08)'
              }}
            >
              {c.label} ({c.deg}°)
            </button>
          ))}
        </div>
      )}

      {/* Step Adjust Buttons */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange((normalizedOrigin - 15 + 360) % 360)}
          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
          title="Rotate wind 15° counter-clockwise"
        >
          ↺ -15°
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange((normalizedOrigin - 5 + 360) % 360)}
          style={{ fontSize: '0.68rem', padding: '2px 6px' }}
          title="Rotate wind 5° counter-clockwise"
        >
          -5°
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange((normalizedOrigin + 5) % 360)}
          style={{ fontSize: '0.68rem', padding: '2px 6px' }}
          title="Rotate wind 5° clockwise"
        >
          +5°
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange((normalizedOrigin + 15) % 360)}
          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
          title="Rotate wind 15° clockwise"
        >
          +15° ↻
        </button>
      </div>
    </div>
  );
};
