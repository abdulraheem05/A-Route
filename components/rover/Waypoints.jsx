'use client';
// Drive-end waypoints (D12) and the rover's position at the selected sol.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { useCrater } from '@/lib/mars/CraterContext';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { scenePosition } from '@/lib/terrain/place';
import { useStore } from '@/store/useStore';

const vertexShader = /* glsl */ `
attribute float aSol;
uniform float uSize;
uniform float uSol;
varying float vDone;
void main() {
  vDone = aSol <= uSol ? 1.0 : 0.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize;
}
`;
const fragmentShader = /* glsl */ `
varying float vDone;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  vec3 col = mix(vec3(0.50, 0.52, 0.56), vec3(0.98, 0.80, 0.56), vDone);
  float body = smoothstep(0.5, 0.34, r);
  gl_FragColor = vec4(mix(vec3(0.04), col, body), 1.0);
}
`;

export function WaypointDots() {
  const waypoints = useStore((s) => s.rover.waypoints);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const visible = useStore((s) => s.show.waypoints);
  const near = useStore((s) => s.camera.dist < 90);
  const { gl } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uSize: { value: 6 }, uSol: { value: 0 } },
        depthTest: false,
        transparent: false,
      }),
    []
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(waypoints.length * 3);
    const sols = new Float32Array(waypoints.length);
    waypoints.forEach((w, i) => {
      const p = scenePosition(w.lon, w.lat, w.elev, exaggeration, 7);
      pos[i * 3] = p[0];
      pos[i * 3 + 1] = p[1];
      pos[i * 3 + 2] = p[2];
      sols[i] = w.sol;
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSol', new THREE.BufferAttribute(sols, 1));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, exaggeration, terrainVersion, patch]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const s = useStore.getState();
    material.uniforms.uSol.value = s.sol === null ? -1 : s.sol;
    material.uniforms.uSize.value = 5.5 * gl.getPixelRatio();
  });

  if (!visible || !near || !waypoints.length) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />;
}

export function RoverMarker() {
  const crater = useCrater();
  const roverName = (crater.rover && crater.rover.name) || 'Rover';
  const waypoints = useStore((s) => s.rover.waypoints);
  const sol = useStore((s) => s.sol);
  const exaggeration = useStore((s) => s.exaggeration);
  const terrainVersion = useStore((s) => s.terrainVersion);
  const patch = useStore((s) => s.patch);
  const group = useRef();

  const wp = useMemo(() => {
    if (sol === null || !waypoints.length) return null;
    const i = waypointIndexAtSol(waypoints, sol);
    return i < 0 ? null : waypoints[i];
  }, [waypoints, sol]);

  const position = useMemo(
    () => (wp ? scenePosition(wp.lon, wp.lat, wp.elev, exaggeration, 8) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wp, exaggeration, terrainVersion, patch]
  );

  useFrame(() => {
    if (group.current) group.current.scale.setScalar(Math.max(0.0015, cameraApi.distance() * 0.006));
  });

  if (!wp || !position) return null;
  return (
    <group position={position}>
      <group ref={group}>
        <mesh renderOrder={8}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshBasicMaterial color="#ffb25c" depthTest={false} />
        </mesh>
        <mesh renderOrder={7}>
          <sphereGeometry args={[1.9, 20, 14]} />
          <meshBasicMaterial color="#ffb25c" transparent opacity={0.22} depthTest={false} />
        </mesh>
      </group>
      <Html center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
        <div className="map-label -translate-y-6 rounded border border-accent/40 bg-black/70 px-1.5 py-0.5 text-[10px] text-accent">
          {roverName} · sol {wp.sol}
        </div>
      </Html>
    </group>
  );
}
