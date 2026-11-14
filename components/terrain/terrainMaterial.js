import * as THREE from 'three';

// Fixed afternoon sun, from the south-west (x = east, z = south).
export const SUN_DIR = new THREE.Vector3(-0.52, 0.62, 0.42).normalize();
export const HAZE_COLOR = new THREE.Color(0.80, 0.63, 0.47);
export const FOG_DENSITY = 0.000045; // ~83% haze at 40 km: dusty but clear Mars air

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Colours are handled directly in display space (the texture is left un-decoded),
// which keeps the look predictable without tone mapping.
// The near-field detail is procedural regolith dressing: sand grain, drift ripples,
// pale bedrock patches and pebble speckle. It is illustrative, is not in the height
// data, and does not affect collision, slope or elevation readouts.
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uSunDir;
  uniform vec3 uHaze;
  uniform float uFogDensity;
  uniform vec2 uPatchCenter;
  uniform float uPatchRadius;
  uniform float uIsPatch;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float dC = distance(vWorld.xz, uPatchCenter);
    if (uIsPatch < 0.5 && dC < uPatchRadius * 0.9) discard;
    if (uIsPatch > 0.5 && dC > uPatchRadius) discard;

    vec3 albedo = texture2D(uMap, vUv).rgb;
    float dist = distance(vWorld, cameraPosition);

    float near = 1.0 - smoothstep(15.0, 300.0, dist);
    float mid = 1.0 - smoothstep(400.0, 6000.0, dist);

    // sand grain and gentle tonal patches
    float n1 = fbm(vWorld.xz * 1.3);
    float n2 = fbm(vWorld.xz * 0.11 + 17.0);
    float n3 = fbm(vWorld.xz * 0.004 + 41.0);
    albedo *= 1.0 + (n1 - 0.5) * 0.22 * near + (n2 - 0.5) * 0.16 * mid + (n3 - 0.5) * 0.14;

    // wind-drift ripples, ~3-5 m wavelength, bent by low-frequency noise
    float ripple = sin(dot(vWorld.xz, vec2(0.95, 0.42)) * 1.7 + fbm(vWorld.xz * 0.33) * 5.0);
    albedo *= 1.0 + ripple * 0.045 * near;

    // pale bedrock / dust patches (the bright slabs seen in the panoramas)
    float pale = smoothstep(0.64, 0.76, fbm(vWorld.xz * 0.05 + 7.0));
    albedo = mix(albedo, albedo * vec3(1.26, 1.22, 1.14) + vec3(0.03), pale * (0.22 + 0.33 * mid));

    // dark pebble speckle underfoot
    float pebbles = smoothstep(0.70, 0.79, noise(vWorld.xz * 3.9)) * near;
    albedo = mix(albedo, albedo * vec3(0.55, 0.52, 0.50), pebbles * 0.55);

    vec3 n = normalize(vNormal);
    float diff = max(dot(n, uSunDir), 0.0);
    // grain perturbs the lighting slightly so the surface does not look airbrushed
    diff *= 0.88 + 0.24 * n1 * near + 0.12 * (1.0 - near);
    // Strong ambient term: Mars' dusty sky scatters a lot of light into shadows.
    vec3 col = albedo * (0.42 + 0.78 * diff);

    float fog = clamp(1.0 - exp(-dist * uFogDensity), 0.0, 1.0);
    col = mix(col, uHaze, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createTerrainMaterial(map, isPatch, shared) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: map },
      uSunDir: { value: SUN_DIR },
      uHaze: { value: HAZE_COLOR },
      uFogDensity: { value: FOG_DENSITY },
      uPatchCenter: shared.patchCenter,
      uPatchRadius: shared.patchRadius,
      uIsPatch: { value: isPatch ? 1 : 0 },
    },
  });
}
