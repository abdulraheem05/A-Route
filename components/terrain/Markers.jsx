'use client';
// Selection pin and the direct line between the Measure & Plan endpoints.
// Planned routes are drawn by components/layers/RouteLines.jsx.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { resolveLandmarks } from '@/lib/data/landmarks';
import { useCrater } from '@/lib/mars/CraterContext';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { END_COLOR, START_COLOR } from '@/lib/terrain/routing';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

export function Pin({ position, color }) {
  const group = useRef();
  useFrame(() => {
    if (group.current) group.current.scale.setScalar(Math.max(0.002, cameraApi.distance() * 0.012));
  });
  return (
    <group position={position}>
      <group ref={group}>
        <mesh position={[0, 2, 0]} renderOrder={9}>
          <cylinderGeometry args={[0.035, 0.035, 4, 6]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
        <mesh position={[0, 4.25, 0]} renderOrder={9}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}

export function SelectionMarker() {
  const landmarkSet = useCrater().landmarks;
  const selection = useStore((s) => s.selection);
  const waypoints = useStore((s) => s.rover.waypoints);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);

  const position = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'point') return scenePosition(selection.lon, selection.lat, null, exaggeration, 0);
    if (selection.type === 'waypoint') {
      const w = waypoints[selection.index];
      return w ? scenePosition(w.lon, w.lat, w.elev, exaggeration, 0) : null;
    }
    if (selection.type === 'landmark') {
      const l = resolveLandmarks(waypoints, landmarkSet).find((x) => x.id === selection.id);
      return l ? scenePosition(l.lon, l.lat, l.elev ?? null, exaggeration, 0) : null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, waypoints, exaggeration, terrainVersion, patch, landmarkSet]);

  if (!position) return null;
  return <Pin position={position} color="#ffffff" />;
}

/** The two endpoints and the straight line between them. */
export function MeasureLine() {
  const start = useStore((s) => s.plan.start);
  const end = useStore((s) => s.plan.end);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);

  const { a, b, line } = useMemo(() => {
    const at = start ? scenePosition(start.lon, start.lat, start.elev ?? null, exaggeration, 0) : null;
    const bt = end ? scenePosition(end.lon, end.lat, end.elev ?? null, exaggeration, 0) : null;
    const l = [];
    if (start && end) {
      const n = 160;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = scenePosition(
          start.lon + (end.lon - start.lon) * t,
          start.lat + (end.lat - start.lat) * t,
          null,
          exaggeration,
          5
        );
        l.push(p[0], p[1], p[2]);
      }
    }
    return { a: at, b: bt, line: l };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, exaggeration, terrainVersion, patch]);

  if (!a && !b) return null;
  return (
    <group>
      {a && <Pin position={a} color={START_COLOR} />}
      {b && <Pin position={b} color={END_COLOR} />}
      {line.length >= 6 && (
        <Line points={line} color="#8aa0b4" lineWidth={1} dashed dashSize={0.6} gapSize={0.45} transparent opacity={0.5} renderOrder={5} />
      )}
    </group>
  );
}
