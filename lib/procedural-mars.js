/**
 * Procedural stand-in for the Mars colour map.
 *
 * This exists so the scene is never a flat red sphere while you are sourcing
 * imagery: if /public/images/mars/mars-texture.jpg is missing, the globe is
 * painted with a generated equirectangular map that has large-scale albedo
 * provinces, impact craters and polar caps. It is deterministic (seeded), it
 * wraps correctly in longitude, and it is generated once per session.
 *
 * It is NOT scientific data and makes no claim to be. Replace it with a real
 * NASA/USGS basemap for anything beyond layout work — see the README.
 */

import { createRandom } from './random';

const DEFAULT_SEED = 20451;

/** Bilinear lattice sample with smoothstep interpolation; wraps in x. */
function latticeSample(data, w, h, u, v) {
  const x = u * w;
  const y = v * h;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;

  const x0 = ((xi % w) + w) % w;
  const x1 = (x0 + 1) % w;
  const y0 = yi < 0 ? 0 : yi > h - 1 ? h - 1 : yi;
  const y1 = y0 + 1 > h - 1 ? h - 1 : y0 + 1;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const a = data[y0 * w + x0];
  const b = data[y0 * w + x1];
  const c = data[y1 * w + x0];
  const d = data[y1 * w + x1];

  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/**
 * Builds a normalised 0..1 fractal noise field that tiles in longitude.
 * Pure maths, no DOM — kept exported so it can be unit tested.
 */
export function buildNoiseField(
  width,
  height,
  seed = DEFAULT_SEED,
  { octaves = 5, baseGrid = 8, lacunarity = 2.3, gain = 0.52 } = {},
) {
  const rand = createRandom(seed);
  const layers = [];

  let gw = baseGrid;
  let gh = Math.max(2, Math.round(baseGrid / 2));
  let amp = 1;
  let totalAmp = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const data = new Float32Array(gw * gh);
    for (let i = 0; i < data.length; i += 1) data[i] = rand();
    layers.push({ data, w: gw, h: gh, amp });
    totalAmp += amp;
    amp *= gain;
    gw = Math.max(2, Math.round(gw * lacunarity));
    gh = Math.max(2, Math.round(gh * lacunarity));
  }

  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      let sum = 0;
      for (let i = 0; i < layers.length; i += 1) {
        const layer = layers[i];
        sum += latticeSample(layer.data, layer.w, layer.h, u, v) * layer.amp;
      }
      field[row + x] = sum / totalAmp;
    }
  }

  return field;
}

/** Warm basalt-to-dust ramp. */
const COLOUR_RAMP = [
  { at: 0.0, rgb: [46, 21, 13] },
  { at: 0.26, rgb: [88, 40, 25] },
  { at: 0.46, rgb: [126, 60, 35] },
  { at: 0.64, rgb: [163, 84, 48] },
  { at: 0.8, rgb: [191, 114, 70] },
  { at: 0.92, rgb: [213, 146, 99] },
  { at: 1.0, rgb: [232, 176, 131] },
];

function sampleRamp(t, out) {
  const value = t < 0 ? 0 : t > 1 ? 1 : t;
  let index = 0;
  while (index < COLOUR_RAMP.length - 2 && value > COLOUR_RAMP[index + 1].at) index += 1;
  const a = COLOUR_RAMP[index];
  const b = COLOUR_RAMP[index + 1];
  const span = b.at - a.at || 1;
  const k = (value - a.at) / span;
  out[0] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k;
  out[1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k;
  out[2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k;
  return out;
}

function bilinearField(field, w, h, u, v) {
  return latticeSample(field, w, h, u, v);
}

/** Draws one crater, horizontally stretched to match the projection. */
function drawCrater(ctx, cx, cy, radius, latStretch, rand) {
  const depth = 0.3 + rand() * 0.45;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(latStretch, 1);

  // Ejecta blanket.
  const ejecta = ctx.createRadialGradient(0, 0, radius * 0.75, 0, 0, radius * 1.9);
  ejecta.addColorStop(0, `rgba(228, 186, 150, ${0.1 + rand() * 0.08})`);
  ejecta.addColorStop(1, 'rgba(228, 186, 150, 0)');
  ctx.fillStyle = ejecta;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Shadowed floor, offset slightly to imply a sun direction.
  const floor = ctx.createRadialGradient(
    -radius * 0.18,
    -radius * 0.18,
    radius * 0.1,
    0,
    0,
    radius,
  );
  floor.addColorStop(0, `rgba(24, 10, 6, ${depth * 0.85})`);
  floor.addColorStop(0.72, `rgba(38, 17, 10, ${depth * 0.5})`);
  floor.addColorStop(1, 'rgba(38, 17, 10, 0)');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Raised rim.
  ctx.lineWidth = Math.max(1, radius * 0.12);
  ctx.strokeStyle = `rgba(236, 196, 158, ${0.12 + depth * 0.2})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Generates the fallback Mars colour map.
 * Browser only — returns an HTMLCanvasElement ready for THREE.CanvasTexture.
 */
export function createProceduralMarsCanvas({
  width = 2048,
  height = 1024,
  seed = DEFAULT_SEED,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const fieldW = Math.max(16, Math.round(width / 2));
  const fieldH = Math.max(8, Math.round(height / 2));

  // Surface detail, large-scale albedo provinces, and dust streaks.
  const detail = buildNoiseField(fieldW, fieldH, seed, { octaves: 5, baseGrid: 10 });
  const provinces = buildNoiseField(128, 64, seed + 977, { octaves: 3, baseGrid: 3, gain: 0.58 });
  const streaks = buildNoiseField(256, 128, seed + 311, { octaves: 2, baseGrid: 6, gain: 0.5 });

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const rgb = [0, 0, 0];
  const grain = createRandom(seed + 7);

  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    // Slight limb-independent darkening toward the poles.
    const polar = Math.abs(v - 0.5) * 2;
    const polarShade = 1 - polar * polar * 0.22;

    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;

      const base = bilinearField(detail, fieldW, fieldH, u, v);
      const province = bilinearField(provinces, 128, 64, u, v);
      const streak = bilinearField(streaks, 256, 128, u, v);

      // Provinces push whole regions dark (basaltic) or bright (dusty).
      let tone = base * 0.68 + province * 0.26 + streak * 0.06;
      tone = tone * 0.86 + Math.pow(province, 2.2) * 0.2;
      // The raw field only occupies the middle of its range; stretch that band
      // across the whole colour ramp so dark basalt and bright dust both show.
      tone = (tone - 0.13) / 0.65;
      tone = tone < 0 ? 0 : tone > 1 ? 1 : tone;
      tone = Math.pow(tone, 0.92) * 0.94 + 0.03;
      tone *= polarShade;

      sampleRamp(tone, rgb);

      const noise = (grain() - 0.5) * 7;
      const index = (y * width + x) * 4;
      data[index] = Math.max(0, Math.min(255, rgb[0] + noise));
      data[index + 1] = Math.max(0, Math.min(255, rgb[1] + noise));
      data[index + 2] = Math.max(0, Math.min(255, rgb[2] + noise));
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  // Impact craters, scaled by latitude to survive the projection.
  const rand = createRandom(seed + 4242);
  const craterCount = Math.round((width / 2048) * 150);
  for (let i = 0; i < craterCount; i += 1) {
    const cx = rand() * width;
    const cy = height * (0.06 + rand() * 0.88);
    const lat = (cy / height - 0.5) * Math.PI;
    const latStretch = Math.min(4, 1 / Math.max(0.25, Math.cos(lat)));
    const radius = (width / 2048) * (4 + Math.pow(rand(), 2.4) * 58);

    drawCrater(ctx, cx, cy, radius, latStretch, rand);
    // Wrap craters across the seam so the texture stays seamless.
    if (cx < radius * 2 * latStretch) drawCrater(ctx, cx + width, cy, radius, latStretch, rand);
    if (cx > width - radius * 2 * latStretch) {
      drawCrater(ctx, cx - width, cy, radius, latStretch, rand);
    }
  }

  // Polar caps with a ragged, noise-driven edge.
  const capNoise = buildNoiseField(256, 4, seed + 88, { octaves: 2, baseGrid: 5, gain: 0.5 });
  const northBase = height * 0.045;
  const southBase = height * 0.045;

  for (let x = 0; x < width; x += 1) {
    const u = (x + 0.5) / width;
    const wobble = bilinearField(capNoise, 256, 4, u, 0.5);

    const northExtent = northBase * (0.45 + wobble * 1.5);
    const northGradient = ctx.createLinearGradient(0, 0, 0, northExtent);
    northGradient.addColorStop(0, 'rgba(252, 248, 243, 0.95)');
    northGradient.addColorStop(0.6, 'rgba(242, 232, 222, 0.6)');
    northGradient.addColorStop(1, 'rgba(236, 222, 210, 0)');
    ctx.fillStyle = northGradient;
    ctx.fillRect(x, 0, 1, northExtent);

    const southExtent = southBase * (0.5 + (1 - wobble) * 1.5);
    const southGradient = ctx.createLinearGradient(0, height, 0, height - southExtent);
    southGradient.addColorStop(0, 'rgba(252, 248, 243, 0.92)');
    southGradient.addColorStop(0.6, 'rgba(242, 232, 222, 0.55)');
    southGradient.addColorStop(1, 'rgba(236, 222, 210, 0)');
    ctx.fillStyle = southGradient;
    ctx.fillRect(x, height - southExtent, 1, southExtent);
  }

  return canvas;
}
