'use client';
// Elevation profile. Gaps in the data are left as gaps.
export default function ProfileChart({ samples, height = 110 }) {
  const valid = samples.filter((s) => s.h !== null);
  if (valid.length < 2) {
    return <p className="text-[11px] text-slate-500">No elevation data along this line.</p>;
  }
  const W = 280;
  const H = height;
  const pad = { l: 38, r: 6, t: 6, b: 16 };
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Elevation profile">
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="rgba(255,255,255,0.15)" />
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="rgba(255,255,255,0.15)" />
      <path d={path} fill="none" stroke="#6cb6f5" strokeWidth="1.4" />
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
