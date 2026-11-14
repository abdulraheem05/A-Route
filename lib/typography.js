/**
 * Canvas-based typography for the 3D wordmark.
 *
 * The A-ROUTE title is not DOM text layered over the canvas and it is not
 * Troika/SDF text either. Each glyph is rasterised to its own small canvas
 * with the brand gradient mapped across the *whole word*, then mapped onto a
 * plane inside the scene. That buys three things at once:
 *
 *   1. the real Artemus outlines and the exact logo gradient;
 *   2. true 3D depth, so Mars occludes the wordmark via the depth buffer
 *      rather than by faking a mask;
 *   3. per-glyph animation with zero texture re-uploads during the typing
 *      sequence (only transforms and opacity change per frame).
 *
 * Everything here touches `document`, so it must run in the browser.
 */

import { BRAND } from './brand';

const SAMPLE_TEXT = 'A-ROUTE';

function getMeasureContext() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  return canvas.getContext('2d');
}

export function fontShorthand(sizePx, family, weight = BRAND.font.weight) {
  return `${weight} ${sizePx}px ${family}`;
}

/**
 * Detects whether a webfont family is really being used for rendering.
 *
 * `document.fonts.check()` alone is unreliable when the @font-face file 404s,
 * so this compares rendered text widths against three different fallback
 * families. If the requested family changes the measured width against any of
 * them, the real face is active.
 */
export function isFontAvailable(family, { weight = BRAND.font.weight } = {}) {
  if (typeof document === 'undefined') return false;
  const ctx = getMeasureContext();
  if (!ctx) return false;

  const probes = ['monospace', 'serif', 'sans-serif'];
  return probes.some((probe) => {
    ctx.font = `${weight} 160px ${probe}`;
    const baseline = ctx.measureText(SAMPLE_TEXT).width;
    ctx.font = `${weight} 160px "${family}", ${probe}`;
    const candidate = ctx.measureText(SAMPLE_TEXT).width;
    return Math.abs(candidate - baseline) > 0.5;
  });
}

/** Asks the browser to load the brand face, then verifies it really arrived. */
export async function loadBrandFont({ timeoutMs = 3500 } = {}) {
  if (typeof document === 'undefined') return false;
  const spec = fontShorthand(200, `"${BRAND.font.family}"`);

  if (document.fonts && typeof document.fonts.load === 'function') {
    const load = document.fonts.load(spec, SAMPLE_TEXT).catch(() => []);
    const timeout = new Promise((resolve) => {
      setTimeout(resolve, timeoutMs);
    });
    await Promise.race([load, timeout]);
  }

  return isFontAvailable(BRAND.font.family);
}

function createWordGradient(ctx, x0, x1, stops) {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const stop of stops) gradient.addColorStop(stop.offset, stop.color);
  return gradient;
}

/**
 * Rasterises one glyph per canvas, each carrying its slice of a single
 * word-wide gradient so the ramp reads continuously across the wordmark.
 *
 * @returns {{
 *   glyphs: Array<{char:string,canvas:HTMLCanvasElement|null,widthPx:number,heightPx:number,centerPx:number,advancePx:number,cursorPx:number}>,
 *   totalWidthPx:number, canvasHeightPx:number, baselinePx:number,
 *   capHeightPx:number, fontSizePx:number, glyphYOffsetPx:number
 * }}
 */
export function buildWordGlyphs({
  text = BRAND.name,
  fontFamily,
  fontWeight = BRAND.font.weight,
  fontSizePx = 256,
  letterSpacingEm = 0.085,
  gradientStops = BRAND.gradient.stops,
  glow = true,
  pixelRatio = 1,
} = {}) {
  const measure = getMeasureContext();
  const font = fontShorthand(fontSizePx, fontFamily, fontWeight);
  measure.font = font;
  measure.textBaseline = 'alphabetic';

  const capMetrics = measure.measureText('A');
  const capHeightPx = capMetrics.actualBoundingBoxAscent || fontSizePx * 0.715;

  const chars = Array.from(text);
  const advances = chars.map((char) => measure.measureText(char).width);
  const tracking = fontSizePx * letterSpacingEm;
  const totalWidthPx =
    advances.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, chars.length - 1);

  // Generous padding so the glow and any overhanging outlines are not clipped.
  const paddingPx = fontSizePx * 0.26;
  const canvasHeightPx = Math.ceil(fontSizePx * 1.68);
  const baselinePx = Math.round(fontSizePx * 1.24);

  // Offset that puts the optical middle of the capitals at local y = 0.
  const glyphYOffsetPx = canvasHeightPx / 2 - (baselinePx - capHeightPx / 2);

  let cursorPx = 0;
  const glyphs = chars.map((char, index) => {
    const advancePx = advances[index];
    const widthPx = Math.ceil(advancePx + paddingPx * 2);
    const glyph = {
      char,
      canvas: null,
      widthPx,
      heightPx: canvasHeightPx,
      advancePx,
      cursorPx,
      centerPx: cursorPx + advancePx / 2,
    };

    if (char.trim() !== '') {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.ceil(widthPx * pixelRatio));
      canvas.height = Math.max(2, Math.ceil(canvasHeightPx * pixelRatio));

      const ctx = canvas.getContext('2d');
      ctx.scale(pixelRatio, pixelRatio);
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Where the full word would start/end inside this glyph's local space.
      const wordStartX = paddingPx - cursorPx;
      ctx.fillStyle = createWordGradient(ctx, wordStartX, wordStartX + totalWidthPx, gradientStops);

      if (glow) {
        ctx.shadowColor = 'rgba(255, 146, 66, 0.42)';
        ctx.shadowBlur = fontSizePx * 0.15;
        ctx.fillText(char, paddingPx, baselinePx);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
      ctx.fillText(char, paddingPx, baselinePx);

      glyph.canvas = canvas;
    }

    cursorPx += advancePx + tracking;
    return glyph;
  });

  return {
    glyphs,
    totalWidthPx,
    canvasHeightPx,
    baselinePx,
    capHeightPx,
    fontSizePx,
    glyphYOffsetPx,
    trackingPx: tracking,
    paddingPx,
  };
}

/**
 * Rasterises a single wide-tracked line (the tagline) to one canvas.
 * Letter spacing is applied manually so it is identical in every browser.
 */
export function buildTextLine({
  text = BRAND.tagline,
  fontFamily,
  fontWeight = BRAND.font.weight,
  fontSizePx = 72,
  letterSpacingEm = 0.44,
  color = BRAND.tone.tagline,
  pixelRatio = 1,
} = {}) {
  const measure = getMeasureContext();
  const font = fontShorthand(fontSizePx, fontFamily, fontWeight);
  measure.font = font;
  measure.textBaseline = 'alphabetic';

  const capMetrics = measure.measureText('K');
  const capHeightPx = capMetrics.actualBoundingBoxAscent || fontSizePx * 0.715;

  const chars = Array.from(text);
  const advances = chars.map((char) => measure.measureText(char).width);
  const tracking = fontSizePx * letterSpacingEm;

  // Trailing tracking is dropped so the line stays optically centred.
  const inkWidthPx =
    advances.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, chars.length - 1);

  const paddingPx = fontSizePx * 0.4;
  const widthPx = Math.ceil(inkWidthPx + paddingPx * 2);
  const heightPx = Math.ceil(fontSizePx * 2);
  const baselinePx = Math.round(fontSizePx * 1.35);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(widthPx * pixelRatio));
  canvas.height = Math.max(2, Math.ceil(heightPx * pixelRatio));

  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  let cursorPx = paddingPx;
  chars.forEach((char, index) => {
    if (char.trim() !== '') ctx.fillText(char, cursorPx, baselinePx);
    cursorPx += advances[index] + tracking;
  });

  return {
    canvas,
    widthPx,
    heightPx,
    inkWidthPx,
    capHeightPx,
    baselinePx,
    fontSizePx,
    yOffsetPx: heightPx / 2 - (baselinePx - capHeightPx / 2),
  };
}
