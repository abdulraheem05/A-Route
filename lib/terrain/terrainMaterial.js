// Terrain shader shared by the crater mesh and the detail patch.
// - Displaces vertices from a float height texture (true elevations, metres).
// - Draws georeferenced orbital imagery.
// - Computes the Derived overlays on the GPU from the same elevations:
//   hillshade, elevation ramp, slope and contours. No colour is ever read back
//   as an elevation.
import * as THREE from 'three';
import { NODATA } from '@/lib/mars/constants';

const vertexShader = /* glsl */ `
attribute vec2 aIJ;
attribute float aSkirt;
uniform highp sampler2D uHeight;
uniform float uHasHeight;
uniform vec2 uGrid;
uniform vec2 uTexel;
uniform float uExag;
uniform float uSkirt;
varying vec2 vUv;
varying float vH;
varying vec3 vN;
varying float vValid;
varying vec2 vXZ;

float hAt(ivec2 p) {
  ivec2 q = clamp(p, ivec2(0), ivec2(uGrid) - ivec2(1));
  return texelFetch(uHeight, q, 0).r;
}

void main() {
  vUv = uv;
  vec3 pos = position;
  vH = 0.0;
  vN = vec3(0.0, 1.0, 0.0);
  vValid = 1.0;
  if (uHasHeight > 0.5) {
    ivec2 p = ivec2(aIJ + 0.5);
    float h = hAt(p);
    if (h < -30000.0) {
      vValid = 0.0;
      h = 0.0;
    } else {
      float hw = hAt(p + ivec2(-1, 0));
      float he = hAt(p + ivec2(1, 0));
      float hn = hAt(p + ivec2(0, -1));
      float hs = hAt(p + ivec2(0, 1));
      if (hw < -30000.0) hw = h;
      if (he < -30000.0) he = h;
      if (hn < -30000.0) hn = h;
      if (hs < -30000.0) hs = h;
      float dEast = (he - hw) / (2.0 * uTexel.x);
      float dSouth = (hs - hn) / (2.0 * uTexel.y);
      vN = normalize(vec3(-dEast, 1.0, -dSouth)); // true (unexaggerated) surface normal
    }
    vH = h;
    pos.y = h * uExag / 1000.0;
  }
  pos.y -= aSkirt * uSkirt;
  vXZ = pos.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uImagery;
uniform float uHasImagery;
uniform float uHasHeight;
uniform float uExag;
uniform float uHillshade;
uniform float uElevOp;
uniform float uSlopeOp;
uniform float uContour;
uniform vec2 uElevRange;
uniform vec3 uSun;
uniform vec4 uHole;
uniform float uHoleOn;
varying vec2 vUv;
varying float vH;
varying vec3 vN;
varying float vValid;
varying vec2 vXZ;

vec3 viridis(float t) {
  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);
  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);
  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);
  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);
  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

// 0 deg pale -> 15 deg amber -> 30+ deg deep red.
vec3 slopeRamp(float deg) {
  float t = clamp(deg / 30.0, 0.0, 1.0);
  vec3 a = vec3(0.96, 0.95, 0.88);
  vec3 b = vec3(0.95, 0.62, 0.20);
  vec3 c = vec3(0.55, 0.06, 0.12);
  return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, (t - 0.5) * 2.0);
}

void main() {
  if (vValid < 0.999) discard;
  if (uHoleOn > 0.5 && vXZ.x > uHole.x && vXZ.x < uHole.z && vXZ.y > uHole.y && vXZ.y < uHole.w) discard;

  vec3 col = vec3(0.42); // neutral grey where no imagery is drawn (never a "Mars colour")
  if (uHasImagery > 0.5) {
    vec4 img = texture2D(uImagery, vUv);
    col = mix(col, img.rgb, img.a);
  }

  float shade = 1.0;
  if (uHasHeight > 0.5) {
    vec3 ns = normalize(vec3(vN.x * uExag, vN.y, vN.z * uExag));
    shade = 0.30 + 0.95 * clamp(dot(ns, uSun), 0.0, 1.0);
    col *= mix(1.0, shade, uHillshade);

    if (uElevOp > 0.001) {
      float t = clamp((vH - uElevRange.x) / max(uElevRange.y - uElevRange.x, 1.0), 0.0, 1.0);
      col = mix(col, viridis(t) * mix(1.0, shade, 0.6), uElevOp);
    }
    if (uSlopeOp > 0.001) {
      float deg = degrees(acos(clamp(vN.y, 0.0, 1.0)));
      col = mix(col, slopeRamp(deg) * mix(1.0, shade, 0.35), uSlopeOp);
    }
    if (uContour > 0.5) {
      float f = vH / uContour;
      float w = max(fwidth(f), 1e-6);
      float line = 1.0 - smoothstep(0.0, 1.4 * w, abs(fract(f - 0.5) - 0.5));
      float fade = 1.0 - smoothstep(0.25, 0.6, w); // drop contours when they would crowd
      col = mix(col, vec3(0.05, 0.05, 0.06), line * 0.7 * fade);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

let dummy = null;
function dummyTexture() {
  if (!dummy) {
    dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    dummy.needsUpdate = true;
  }
  return dummy;
}

export function createTerrainMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    uniforms: {
      uHeight: { value: dummyTexture() },
      uHasHeight: { value: 0 },
      uGrid: { value: new THREE.Vector2(1, 1) },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uExag: { value: 1 },
      uSkirt: { value: 0 },
      uImagery: { value: dummyTexture() },
      uHasImagery: { value: 0 },
      uHillshade: { value: 0 },
      uElevOp: { value: 0 },
      uSlopeOp: { value: 0 },
      uContour: { value: 0 },
      uElevRange: { value: new THREE.Vector2(-4700, 800) },
      // Fixed, documented illumination for the hillshade: azimuth 315 deg, altitude 45 deg.
      uSun: { value: new THREE.Vector3(-0.5, 0.7071, -0.5).normalize() },
      uHole: { value: new THREE.Vector4(0, 0, 0, 0) },
      uHoleOn: { value: 0 },
    },
  });
}

// Float32 elevations (metres, NODATA sentinel) -> single-channel float texture.
export function createHeightTexture(data, width, height) {
  const tex = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createImageryTexture(canvas, anisotropy = 8) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

// Applies the user's layer settings. Called every frame; cheap.
export function applyLayerUniforms(material, s, elevRange) {
  const u = material.uniforms;
  u.uExag.value = s.exaggeration;
  u.uHillshade.value = s.overlays.hillshade || s.baseLayer === 'none' ? 1 : 0;
  u.uElevOp.value = s.overlays.elevation ? s.overlayOpacity : 0;
  u.uSlopeOp.value = s.overlays.slope ? s.overlayOpacity : 0;
  u.uContour.value = s.overlays.contours ? s.contourInterval : 0;
  if (elevRange) u.uElevRange.value.set(elevRange[0], elevRange[1]);
}

export { NODATA };
