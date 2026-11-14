'use client';
// Planned routes on the terrain.
//
// Each route is resampled along its segments and every sample placed with
// scenePosition, the same function the rover traverse and the markers use, so
// the line follows the rendered surface and stays with it when the vertical
// exaggeration changes or a detail patch refines the elevation underneath.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { ROUTE_MODES } from '@/lib/terrain/routing';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

// Metres of lift above the surface. Enough to clear the terrain's own depth at
// grazing angles without reading as floating.
const LIFT_ACTIVE = 9;
const LIFT_DIM = 6;

// Resamples a route so each drawn segment is short enough to follow the ground
// between its own vertices, which are up to one DEM cell apart.
function drape(points, exaggeration, liftM, maxStepDeg) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const span = Math.hypot(b.lon - a.lon, b.lat - a.lat);
    const steps = Math.max(1, Math.ceil(span / maxStepDeg));
    for (let k = i === 1 ? 0 : 1; k <= steps; k++) {
      const t = k / steps;
      const p = scenePosition(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t, null, exaggeration, liftM);
      out.push(p[0], p[1], p[2]);
    }
  }
  return out;
}

/** A small ring that sits where the pointer is on the elevation profile. */
function ProfileCursor({ exaggeration, terrainVersion, patch }) {
  const cursor = useStore((s) => s.plan.profileCursor);
  const ring = useRef();
  useFrame(() => {
    if (ring.current) ring.current.scale.setScalar(Math.max(0.003, cameraApi.distance() * 0.016));
  });
  const position = useMemo(() => {
    if (!cursor || cursor.lon == null || cursor.lat == null) return null;
    return scenePosition(cursor.lon, cursor.lat, cursor.h ?? null, exaggeration, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, exaggeration, terrainVersion, patch]);
  if (!position) return null;
  return (
    <group position={position}>
      <group ref={ring}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={11}>
          <ringGeometry args={[0.5, 0.78, 28]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.9} />
        </mesh>
        <mesh renderOrder={11}>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function RouteLines() {
  const result = useStore((s) => s.plan.result);
  const show = useStore((s) => s.plan.show);
  const active = useStore((s) => s.plan.active);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);

  const lines = useMemo(() => {
    if (!result || !result.routes) return [];
    const cell = result.gridInfo ? result.gridInfo.cellMetres : 100;
    // Follow the ground at roughly a quarter of a DEM cell.
    const maxStepDeg = Math.max(0.0002, cell / 4 / 59274.7);
    return ROUTE_MODES.map((m) => {
      const r = result.routes[m.id];
      if (!r || !r.points || !show[m.id]) return null;
      const isActive = active === m.id;
      return {
        id: m.id,
        color: m.color,
        isActive,
        points: drape(r.points, exaggeration, isActive ? LIFT_ACTIVE : LIFT_DIM, maxStepDeg),
      };
    }).filter((l) => l && l.points.length >= 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, show, active, exaggeration, terrainVersion, patch]);

  if (!lines.length) return null;

  return (
    <group>
      {/* Inactive routes first, so the active one draws over them. */}
      {[...lines].sort((a, b) => Number(a.isActive) - Number(b.isActive)).map((l) => (
        <group key={l.id}>
          {/* A soft wider pass reads as a glow along the line. */}
          <Line
            points={l.points}
            color={l.color}
            lineWidth={l.isActive ? 6 : 3.5}
            transparent
            opacity={l.isActive ? 0.22 : 0.12}
            depthTest={false}
            renderOrder={6}
          />
          <Line
            points={l.points}
            color={l.color}
            lineWidth={l.isActive ? 2.8 : 1.6}
            transparent
            opacity={l.isActive ? 1 : 0.55}
            renderOrder={7}
          />
        </group>
      ))}
      <ProfileCursor exaggeration={exaggeration} terrainVersion={terrainVersion} patch={patch} />
    </group>
  );
}
