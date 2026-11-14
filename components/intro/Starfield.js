'use client';

/**
 * Deep-space starfield.
 *
 * Three THREE.Points layers at different shell radii: three draw calls for
 * ~6,200 stars. Parallax is real — the layers sit at different depths, so the
 * camera's dolly during the intro separates them without any extra work.
 *
 * Sizes are authored in CSS pixels and converted in the vertex shader, so the
 * stars stay the same apparent size on a 1x and a 3x display. Sub-pixel stars
 * fade out instead of aliasing into a shimmering mess.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createRandom, randomRange } from '@/lib/random';
import { cueProgress } from '@/lib/timeline';
import { damp, easeOutCubic } from '@/lib/easing';

const STAR_LAYERS = [
  // count, shell radius range, size range in CSS px, brightness range
  { seed: 101, count: 4200, radius: [52, 96], size: [0.85, 1.55], brightness: [0.25, 0.6], reference: 74 },
  { seed: 202, count: 1600, radius: [28, 52], size: [1.1, 2.1], brightness: [0.35, 0.78], reference: 40 },
  { seed: 303, count: 420, radius: [14, 28], size: [1.5, 3.0], brightness: [0.5, 1.0], reference: 21 },
];

/** A handful of stars get a very slight colour cast; the rest stay white. */
const TINTS = [
  [1.0, 1.0, 1.0],
  [1.0, 1.0, 1.0],
  [1.0, 1.0, 1.0],
  [0.86, 0.92, 1.0],
  [1.0, 0.95, 0.88],
  [1.0, 0.89, 0.8],
];

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReference;
  uniform float uTwinkle;

  attribute float aSize;
  attribute float aBrightness;
  attribute float aPhase;
  attribute float aTwinkleAmount;
  attribute vec3 aTint;

  varying float vAlpha;
  varying vec3 vTint;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = max(0.0001, -mvPosition.z);
    float size = aSize * uPixelRatio * (uReference / dist);
    gl_PointSize = clamp(size, 0.5, 7.0);

    float wave = 0.5 + 0.5 * sin(uTime * (1.15 + aPhase * 1.4) + aPhase * 6.2831853);
    float flicker = 1.0 - uTwinkle * aTwinkleAmount * wave;

    // Dim anything smaller than a pixel rather than letting it alias.
    vAlpha = aBrightness * flicker * min(1.0, size);
    vTint = aTint;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;

  varying float vAlpha;
  varying vec3 vTint;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float mask = smoothstep(0.5, 0.06, d);
    float alpha = vAlpha * mask * uOpacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(vTint, alpha);
  }
`;

function buildLayer(layer) {
  const rand = createRandom(layer.seed);
  const { count } = layer;

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkleAmount = new Float32Array(count);
  const tints = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    // Uniform direction on a sphere, radius biased outward for even density.
    const z = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const ring = Math.sqrt(Math.max(0, 1 - z * z));
    const radius = randomRange(rand, layer.radius[0], layer.radius[1]);

    positions[i * 3] = radius * ring * Math.cos(theta);
    positions[i * 3 + 1] = radius * ring * Math.sin(theta);
    positions[i * 3 + 2] = radius * z;

    // Most stars sit at the low end of the size band; a few are brighter.
    const roll = Math.pow(rand(), 2.6);
    sizes[i] = randomRange(rand, layer.size[0], layer.size[1]) * (1 + roll * 0.55);
    brightness[i] = randomRange(rand, layer.brightness[0], layer.brightness[1]) * (1 + roll * 0.5);

    phases[i] = rand();
    // Only about a fifth of the field twinkles, and only slightly.
    twinkleAmount[i] = rand() < 0.2 ? randomRange(rand, 0.12, 0.34) : 0;

    const tint = TINTS[Math.floor(rand() * TINTS.length)];
    tints[i * 3] = tint[0];
    tints[i * 3 + 1] = tint[1];
    tints[i * 3 + 2] = tint[2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTwinkleAmount', new THREE.BufferAttribute(twinkleAmount, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), layer.radius[1] * 1.2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uReference: { value: layer.reference },
      uTwinkle: { value: 1 },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { geometry, material };
}

export default function Starfield({ timelineRef, reducedMotion = false, dimmed = false }) {
  const groupRef = useRef(null);
  const opacityRef = useRef(0);

  const layers = useMemo(() => STAR_LAYERS.map(buildLayer), []);

  useEffect(
    () => () => {
      for (const layer of layers) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
    },
    [layers],
  );

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const elapsed = state.clock.elapsedTime;
    const pixelRatio = state.gl.getPixelRatio();

    // The field fades up on its own cue, so the first beat of the intro is the
    // sky arriving rather than a hard cut.
    const timeline = timelineRef ? timelineRef.current : null;
    const reveal = timeline ? easeOutCubic(cueProgress(timeline.t, 'starfield')) : 1;
    const target = (dimmed ? 0.5 : 1) * reveal;
    opacityRef.current = damp(opacityRef.current, target, 2.8, delta);

    for (const layer of layers) {
      const uniforms = layer.material.uniforms;
      uniforms.uTime.value = elapsed;
      uniforms.uPixelRatio.value = pixelRatio;
      uniforms.uOpacity.value = opacityRef.current;
      uniforms.uTwinkle.value = reducedMotion ? 0 : 1;
    }

    const group = groupRef.current;
    if (group && !reducedMotion) {
      group.rotation.y += delta * 0.0045;
      group.rotation.x = Math.sin(elapsed * 0.045) * 0.022;
    }
  });

  return (
    <group ref={groupRef}>
      {layers.map((layer, index) => (
        <points
          key={STAR_LAYERS[index].seed}
          geometry={layer.geometry}
          material={layer.material}
          frustumCulled={false}
          renderOrder={-2}
        />
      ))}
    </group>
  );
}
