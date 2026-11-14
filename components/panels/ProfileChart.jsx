'use client';
// Elevation profile. Gaps in the data are left as gaps.
//
// With `interactive`, hovering reports the sample under the pointer through
// `onHover`, which the Measure & Plan panel uses to put a marker at the same
// place on the 3D terrain. Without it the chart renders exactly as it always
// has, so every existing use is unaffected.
import { useCallback, useRef, useState } from 'react';

export default function ProfileChart({
  samples,
  height = 110,
  interactive = false,
  color = '#6cb6f5',
  onHover,
}) {
  const svg = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const valid = samples.filter((s) => s.h !== null);
  const W = 280;
  const H = height;
  const pad = { l: 38, r: 6, t: 6, b: 16 };

  const leave = useCallback(() => {
    setHoverIndex(null);
    if (onHover) onHover(null);
  }, [onHover]);

  const move = useCallback(
    (e) => {
      const el = svg.current;
      if (!el || !samples.length) return;
      const r = el.getBoundingClientRect();
      // The viewBox is W wide however the element is sized, so map through it.
      const vx = ((e.clientX - r.left) / r.width) * W;
      const dMax = samples[samples.length - 1].d || 1;
      const frac = Math.min(Math.max((vx - pad.l) / (W - pad.l - pad.r), 0), 1);
      const i = Math.round(frac * (samples.length - 1));
      setHoverIndex(i);
      if (onHover) {
        const s = samples[i];
        onHover({ d: s.d, h: s.h, lon: s.lon ?? null, lat: s.lat ?? null, fraction: s.d / dMax });
      }
    },
    [samples, onHover, W, pad.l, pad.r]
  );

  if (valid.length < 2) {
    return <p className="text-[11px] text-slate-500">No elevation data along this line.</p>;
  }

  const dMax = samples[samples.length - 1].d || 1;
  let hMin = Infinity;
  let hMax = -Infinity;
  for (const s of valid) {
    hMin = Math.min(hMin, s.h);
    hMax = Math.max(hMax, s.h);
  }
  if (hMax - hMin < 1) {
    hMax += 0.5;
    hMin -= 0.5;
  }
  const x = (d) => pad.l + (d / dMax) * (W - pad.l - pad.r);
  const y = (h) => pad.t + (1 - (h - hMin) / (hMax - hMin)) * (H - pad.t - pad.b);

  let path = '';
  let pen = false;
  for (const s of samples) {
    if (s.h === null) {
      pen = false;
      continue;
    }
    path += `${pen ? 'L' : 'M'}${x(s.d).toFixed(1)},${y(s.h).toFixed(1)}`;
    pen = true;
  }
  const km = dMax >= 1000;
  const hovered = hoverIndex != null ? samples[hoverIndex] : null;

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Elevation profile"
      style={interactive ? { cursor: 'crosshair' } : undefined}
      onPointerMove={interactive ? move : undefined}
      onPointerLeave={interactive ? leave : undefined}
    >
      {/* A filled area under the line reads as ground rather than a graph. */}
      {interactive && (
        <>
          <defs>
            <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path}L${x(dMax).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`} fill="url(#profile-fill)" />
        </>
      )}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="rgba(255,255,255,0.15)" />
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="rgba(255,255,255,0.15)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" />
      {hovered && (
        <g pointerEvents="none">
          <line x1={x(hovered.d)} y1={pad.t} x2={x(hovered.d)} y2={H - pad.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 2" />
          {hovered.h !== null && <circle cx={x(hovered.d)} cy={y(hovered.h)} r="2.6" fill={color} stroke="#0d1015" strokeWidth="1" />}
        </g>
      )}
      <text x={pad.l - 4} y={pad.t + 8} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
        {Math.round(hMax)}
      </text>
      <text x={pad.l - 4} y={H - pad.b} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
        {Math.round(hMin)}
      </text>
      <text x={pad.l} y={H - 4} fontSize="9" fill="#94a3b8" fontFamily="monospace">
        0
      </text>
      <text x={W - pad.r} y={H - 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
        {km ? `${(dMax / 1000).toFixed(2)} km` : `${Math.round(dMax)} m`}
      </text>
    </svg>
  );
}
