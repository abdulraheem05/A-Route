'use client';
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useGame } from '@/lib/store';
import { WORLD } from '@/lib/scientific-data';

/** Drapes a polyline over the terrain, sampling the height model every `step` metres. */
export function drape(hf, pts, step = 20, lift = 0.6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      out.push([x, hf.worldY(x, z) + lift, z]);
    }
  }
  const last = pts[pts.length - 1];
  out.push([last.x, hf.worldY(last.x, last.z) + lift, last.z]);
  return out;
}

/** Rover traverse from the bundled official waypoints (straight legs between waypoints). */
export function TraverseLine({ hf }) {
  const show = useGame((g) => g.settings.showTraverse);
  const points = useMemo(() => drape(hf, WORLD.track, 25, 0.5), [hf]);
  if (!show) return null;
  return <Line points={points} color="#ecd6b8" lineWidth={1.6} transparent opacity={0.7} />;
}

/** Straight-line planning route chosen on the map. Simulated, not a rover or verified route. */
export function RouteLine({ hf }) {
  const route = useGame((g) => g.route);
  const points = useMemo(() => (route ? drape(hf, [route.from, route.to], 15, 0.9) : null), [hf, route]);
  if (!points) return null;
  return <Line points={points} color="#a9c7dc" lineWidth={2.2} dashed dashSize={12} gapSize={8} />;
}
