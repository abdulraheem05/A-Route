'use client';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUN_DIR, HAZE_COLOR } from './terrainMaterial';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Daytime Mars sky: dust makes it tan/butterscotch, brightest toward the horizon,
// with a pale bluish-white glow close to the Sun (forward scattering by dust).
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uSunDir;
  uniform vec3 uHaze;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 zenith = vec3(0.52, 0.40, 0.31);
    vec3 col = mix(uHaze, zenith, pow(h, 0.55));
    float s = max(dot(d, uSunDir), 0.0);
    col += vec3(0.55, 0.62, 0.70) * pow(s, 90.0) * 0.55;
    col += vec3(0.30, 0.30, 0.30) * pow(s, 12.0) * 0.25;
    col = mix(col, vec3(1.0, 0.98, 0.94), smoothstep(0.99994, 0.99998, s));
    if (d.y < 0.0) col = uHaze;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Sky() {
  const ref = useRef();
  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, depthTest: false, uniforms: { uSunDir: { value: SUN_DIR }, uHaze: { value: HAZE_COLOR } } }),
    []
  );
  const geometry = useMemo(() => new THREE.SphereGeometry(1000, 48, 24), []);
  useEffect(() => () => { material.dispose(); geometry.dispose(); }, [material, geometry]);
  useFrame(({ camera }) => { if (ref.current) ref.current.position.copy(camera.position); });
  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}
