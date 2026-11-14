'use client';
// Curiosity's traverse from NASA's path file (D13), drawn on the terrain.
// The part driven up to the selected sol is highlighted when the path can be
// matched to the waypoint file; otherwise the whole path is drawn uniformly.
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

const LIFT_M = 6;

function segmentPairs(positions, breaks, fromVertex, toVertex) {
  const out = [];
  for (let i = Math.max(1, fromVertex + 1); i <= toVertex; i++) {
    if (breaks.has(i)) continue;
    const a = (i - 1) * 3;
    const b = i * 3;
    out.push(positions[a], positions[a + 1], positions[a + 2], positions[b], positions[b + 1], positions[b + 2]);
  }
  return out;
}

export default function Traverse() {
  const traverse = useStore((s) => s.rover.traverse);
  const join = useStore((s) => s.rover.join);
  const waypoints = useStore((s) => s.rover.waypoints);
  const sol = useStore((s) => s.sol);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const visible = useStore((s) => s.show.traverse);

  const positions = useMemo(() => {
    if (!traverse) return null;
    const { verts } = traverse;
    const arr = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
      const p = scenePosition(verts[i][0], verts[i][1], verts[i][2], exaggeration, LIFT_M);
      arr[i * 3] = p[0];
      arr[i * 3 + 1] = p[1];
      arr[i * 3 + 2] = p[2];
    }
    return arr;
    // `patch` is a dependency because loading rover-region tiles changes sampled heights.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traverse, exaggeration, terrainVersion, patch]);

  const lastVertex = traverse ? traverse.verts.length - 1 : 0;

  const drivenTo = useMemo(() => {
    if (!join || !join.ok || sol === null) return null;
    const wi = waypointIndexAtSol(waypoints, sol);
    return wi < 0 ? 0 : join.idx[wi];
  }, [join, waypoints, sol]);

  const all = useMemo(
    () => (positions ? segmentPairs(positions, traverse.breaks, 0, lastVertex) : []),
    [positions, traverse, lastVertex]
  );
  const driven = useMemo(
    () => (positions && drivenTo !== null ? segmentPairs(positions, traverse.breaks, 0, drivenTo) : []),
    [positions, traverse, drivenTo]
  );

  if (!visible || all.length < 6) return null;
  const highlight = driven.length >= 6;

  return (
    <group>
      {/* faint pass that stays visible where coarse terrain would hide the line */}
      <Line points={all} segments color="#ffffff" lineWidth={1} transparent opacity={0.16} depthTest={false} renderOrder={3} />
      <Line
        points={all}
        segments
        color={highlight ? '#8a8f98' : '#f4c08a'}
        lineWidth={highlight ? 1.4 : 2.2}
        transparent
        opacity={highlight ? 0.75 : 1}
        renderOrder={4}
      />
      {highlight && <Line points={driven} segments color="#f6b26b" lineWidth={2.6} renderOrder={5} />}
    </group>
  );
}
