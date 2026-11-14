// Straight-line route analysis over the height grid. This is NOT a path planner and makes
// no claim about obstacles smaller than the DEM resolution.
import { WALK_SPEED, ROVER_TOP_SPEED, MAX_WALKABLE_SLOPE_DEG } from '../mars/constants-jezero.js';

export function analyseRoute(hf, from, to, samples = 160) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const horizontal = Math.hypot(dx, dz);
  const n = Math.max(8, Math.min(samples, Math.ceil(horizontal / 10)));
  const profile = [];
  let gain = 0, loss = 0, maxSlope = 0, surface = 0, steepLength = 0;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const e = hf.elevation(from.x + dx * t, from.z + dz * t);
    const d = horizontal * t;
    if (prev) {
      const de = e - prev.e, dd = d - prev.d;
      if (de > 0) gain += de; else loss -= de;
      const s = (Math.atan(Math.abs(de) / dd) * 180) / Math.PI;
      if (s > maxSlope) maxSlope = s;
      if (s > MAX_WALKABLE_SLOPE_DEG) steepLength += dd;
      surface += Math.hypot(dd, de);
    }
    prev = { e, d };
    profile.push({ d, e });
  }
  // Walking time: flat pace slowed by slope (simple Tobler-like penalty). A planning aid only.
  let walkS = 0;
  for (let i = 1; i < profile.length; i++) {
    const dd = profile[i].d - profile[i - 1].d;
    const grade = (profile[i].e - profile[i - 1].e) / dd;
    const factor = Math.exp(-3.5 * Math.abs(grade + 0.05)) / Math.exp(-3.5 * 0.05);
    walkS += dd / (WALK_SPEED * Math.max(0.15, factor));
  }
  return {
    horizontal, surface, gain, loss, maxSlope, steepLength, profile,
    walkSeconds: walkS,
    roverSeconds: surface / ROVER_TOP_SPEED,
    sampleSpacing: horizontal / n,
  };
}

/** Distance along the bundled rover traverse between two sols. */
export function traverseDistanceBetweenSols(waypoints, solA, solB, distFn) {
  const lo = Math.min(solA, solB), hi = Math.max(solA, solB);
  let d = 0, prev = null;
  for (const w of waypoints) {
    if (w.sol < lo) { prev = w; continue; }
    if (w.sol > hi) break;
    if (prev) d += distFn(prev, w);
    prev = w;
  }
  return d;
}

export function formatDuration(seconds) {
  if (!isFinite(seconds)) return 'n/a';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 88775).toFixed(1)} sols`;
}
