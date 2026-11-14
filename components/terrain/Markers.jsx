'use client';
// Selection pin and the measurement line.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { resolveLandmarks } from '@/lib/data/landmarks';
import { useCrater } from '@/lib/mars/CraterContext';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

function Pin({ position, color }) {
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

export function MeasureLine() {
  const points = useStore((s) => s.measure.points);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);

  const { ends, line } = useMemo(() => {
    const e = points.map((p) => scenePosition(p.lon, p.lat, null, exaggeration, 0));
    let l = [];
    if (points.length === 2) {
      const n = 160;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const lon = points[0].lon + (points[1].lon - points[0].lon) * t;
        const lat = points[0].lat + (points[1].lat - points[0].lat) * t;
        const p = scenePosition(lon, lat, null, exaggeration, 5);
        l.push(p[0], p[1], p[2]);
      }
    }
    return { ends: e, line: l };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, exaggeration, terrainVersion, patch]);

  if (!points.length) return null;
  return (
    <group>
      {ends.map((p, i) => (
        <Pin key={i} position={p} color="#6cb6f5" />
      ))}
      {line.length >= 6 && (
        <>
          <Line points={line} color="#6cb6f5" lineWidth={2.2} renderOrder={6} />
          <Line points={line} color="#6cb6f5" lineWidth={1} transparent opacity={0.25} depthTest={false} renderOrder={5} />
        </>
      )}
    </group>
  );
}
