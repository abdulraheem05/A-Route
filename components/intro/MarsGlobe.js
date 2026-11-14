'use client';

/**
 * The Mars globe.
 *
 * A real sphere with an equirectangular colour map, a physically sane key /
 * rim / ambient light rig and a fresnel atmosphere shell. It sits between the
 * camera and the wordmark plane, so the occlusion in the final composition is
 * the depth buffer doing its job — not a mask or a gradient overlay.
 *
 * Assets are optional. If the colour map is missing the globe falls back to a
 * generated map (lib/procedural-mars.js) rather than a flat red material, so
 * the scene always reads as a planet.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ASSETS, MARS_BUMP_SCALE } from '@/lib/assets';
import { BRAND } from '@/lib/brand';
import { COMPOSITION } from '@/lib/animation-config';
import { cueProgress } from '@/lib/timeline';
import { clamp01, damp, easeInOutCubic, easeOutCubic, lerp } from '@/lib/easing';
import { createProceduralMarsCanvas } from '@/lib/procedural-mars';

const DEG2RAD = Math.PI / 180;

/**
 * Loads a texture that may not exist.
 * `status` is 'loading' | 'ready' | 'missing'; nothing throws and no Suspense
 * boundary is involved, which is what lets the scene degrade gracefully.
 */
function useOptionalTexture(url, { colorSpace, anisotropy }) {
  const [texture, setTexture] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!url) {
      setStatus('missing');
      return undefined;
    }

    let cancelled = false;
    let loaded = null;
    const loader = new THREE.TextureLoader();

    loader.load(
      url,
      (result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        loaded = result;
        result.colorSpace = colorSpace;
        result.anisotropy = anisotropy;
        result.wrapS = THREE.RepeatWrapping;
        result.wrapT = THREE.ClampToEdgeWrapping;
        result.generateMipmaps = true;
        result.minFilter = THREE.LinearMipmapLinearFilter;
        result.magFilter = THREE.LinearFilter;
        result.needsUpdate = true;
        setTexture(result);
        setStatus('ready');
      },
      undefined,
      () => {
        if (!cancelled) {
          setTexture(null);
          setStatus('missing');
        }
      },
    );

    return () => {
      cancelled = true;
      if (loaded) loaded.dispose();
      setTexture(null);
      setStatus('loading');
    };
  }, [url, colorSpace, anisotropy]);

  return { texture, status };
}

function createAtmosphereMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uPower: { value: 2.7 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;

      varying vec3 vNormalW;
      varying vec3 vViewDir;

      void main() {
        // Back faces are rendered, so the sign of the dot flips: use abs().
        float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
        float rim = pow(1.0 - facing, uPower);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

export default function MarsGlobe({
  timelineRef,
  stage = 'intro',
  reducedMotion = false,
  globeScale = 1,
  onTextureStatus,
}) {
  const outerRef = useRef(null);
  const planetRef = useRef(null);
  const materialRef = useRef(null);
  const atmosphereRef = useRef(null);
  const keyLightRef = useRef(null);
  const rimLightRef = useRef(null);
  const ambientRef = useRef(null);
  const backgroundRef = useRef(0);
  const statusCallbackRef = useRef(onTextureStatus);

  statusCallbackRef.current = onTextureStatus;

  const gl = useThree((state) => state.gl);
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const colour = useOptionalTexture(ASSETS.marsTexture, {
    colorSpace: THREE.SRGBColorSpace,
    anisotropy: maxAnisotropy,
  });
  const bump = useOptionalTexture(ASSETS.marsBumpMap, {
    colorSpace: THREE.LinearSRGBColorSpace,
    anisotropy: maxAnisotropy,
  });

  /**
   * Generated stand-in, built once and only if the real map is absent.
   * Generation blocks for a few hundred milliseconds, so it is deferred out of
   * the render pass — the loading screen gets to paint first.
   */
  const [fallback, setFallback] = useState(null);

  useEffect(() => {
    if (colour.status !== 'missing' || typeof document === 'undefined') return undefined;

    let texture = null;
    const handle = setTimeout(() => {
      const canvas = createProceduralMarsCanvas({ width: 2048, height: 1024 });
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      setFallback(texture);
    }, 0);

    return () => {
      clearTimeout(handle);
      if (texture) texture.dispose();
      setFallback(null);
    };
  }, [colour.status, maxAnisotropy]);

  useEffect(() => {
    if (statusCallbackRef.current) statusCallbackRef.current(colour.status);
  }, [colour.status]);

  const atmosphereMaterial = useMemo(
    () => createAtmosphereMaterial(BRAND.tone.atmosphere),
    [],
  );
  atmosphereRef.current = atmosphereMaterial;

  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);

  // Assigning maps imperatively so the shader is recompiled exactly once each
  // time a map appears, instead of on every React render.
  const activeMap = colour.texture || fallback;
  const activeBump = bump.texture || activeMap;

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.map = activeMap || null;
    material.bumpMap = activeBump || null;
    material.bumpScale = bump.texture ? MARS_BUMP_SCALE : MARS_BUMP_SCALE * 0.55;
    material.needsUpdate = true;
  }, [activeMap, activeBump, bump.texture]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const timeline = timelineRef.current;
    const outer = outerRef.current;
    const planet = planetRef.current;
    const material = materialRef.current;
    if (!timeline || !outer || !planet || !material) return;

    const raw = cueProgress(timeline.t, 'globeReveal');
    const eased = easeInOutCubic(raw);

    // 0 while the intro is composed, 1 once the destination grid is open.
    backgroundRef.current = damp(
      backgroundRef.current,
      stage === 'destinations' ? 1 : 0,
      2.6,
      delta,
    );
    const background = backgroundRef.current;

    const { globe, lighting } = COMPOSITION;

    const z = lerp(globe.startZ, globe.endZ, eased) - background * 1.1;
    const revealScale = lerp(globe.startScale, globe.endScale, eased);
    const scale = revealScale * globeScale * lerp(1, globe.backgroundScale, background);

    outer.position.z = z;
    outer.scale.setScalar(scale);

    // Fade in with the light so the planet emerges rather than pops.
    const opacity = easeOutCubic(clamp01(raw * 1.2));
    material.opacity = opacity;
    outer.visible = opacity > 0.001;

    if (!reducedMotion) {
      planet.rotation.y += delta * globe.spin;
    } else if (planet.rotation.y === 0) {
      planet.rotation.y = 0.6;
    }

    const lightRamp = easeOutCubic(raw) * lerp(1, 0.72, background);
    if (keyLightRef.current) keyLightRef.current.intensity = lighting.keyIntensity * lightRamp;
    if (rimLightRef.current) rimLightRef.current.intensity = lighting.rimIntensity * lightRamp;
    if (ambientRef.current) ambientRef.current.intensity = lighting.ambientIntensity * lightRamp;
    if (atmosphereRef.current) {
      atmosphereRef.current.uniforms.uIntensity.value = 0.85 * lightRamp;
    }
  });

  const { globe, lighting } = COMPOSITION;

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0} />
      <directionalLight
        ref={keyLightRef}
        position={lighting.keyPosition}
        intensity={0}
        color="#FFF1E0"
      />
      <directionalLight
        ref={rimLightRef}
        position={lighting.rimPosition}
        intensity={0}
        color="#6E8FB8"
      />

      <group ref={outerRef} position={[0, 0, globe.startZ]} scale={globe.startScale} visible={false}>
        <group rotation={[0, 0, globe.axialTilt * DEG2RAD]}>
          <mesh ref={planetRef} renderOrder={0}>
            <sphereGeometry args={[globe.radius, 128, 64]} />
            <meshStandardMaterial
              ref={materialRef}
              color="#C9774A"
              roughness={0.93}
              metalness={0}
              transparent
              opacity={0}
            />
          </mesh>

          <mesh renderOrder={1} scale={1.035}>
            <sphereGeometry args={[globe.radius, 64, 32]} />
            <primitive object={atmosphereMaterial} attach="material" />
          </mesh>
        </group>
      </group>
    </>
  );
}
