'use client';

/**
 * Rasterises the A-ROUTE wordmark and tagline into GPU textures.
 *
 * Runs once per font resolution. Each glyph becomes its own texture so the
 * typing sequence animates transforms only — no per-frame canvas redraws and
 * no texture uploads once the intro is running.
 *
 * World sizing is derived from the measured cap height rather than assumed, so
 * swapping in the real Artemus file (or any other face) keeps the composition
 * correct without touching the config.
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { COMPOSITION, TITLE_TYPING } from '@/lib/animation-config';
import { buildTextLine, buildWordGlyphs } from '@/lib/typography';

/** Rasterisation sizes. Larger = crisper wordmark, more texture memory. */
const TITLE_FONT_PX = 240;
const TAGLINE_FONT_PX = 72;
const TEXTURE_SUPERSAMPLE = 1.5;

export function useWordmark(fontFamily) {
  const gl = useThree((state) => state.gl);
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const wordmark = useMemo(() => {
    if (typeof document === 'undefined' || !fontFamily) return null;

    const word = buildWordGlyphs({
      fontFamily,
      fontSizePx: TITLE_FONT_PX,
      pixelRatio: TEXTURE_SUPERSAMPLE,
    });
    const line = buildTextLine({
      fontFamily,
      fontSizePx: TAGLINE_FONT_PX,
      pixelRatio: TEXTURE_SUPERSAMPLE,
    });

    const titleUnits = COMPOSITION.title.capHeightWorld / Math.max(1, word.capHeightPx);
    const taglineUnits = COMPOSITION.tagline.capHeightWorld / Math.max(1, line.capHeightPx);

    const makeTexture = (canvas) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
    };

    const halfWidthPx = word.totalWidthPx / 2;
    const glyphY = -word.glyphYOffsetPx * titleUnits;

    const glyphs = word.glyphs
      .filter((glyph) => glyph.canvas)
      .map((glyph) => ({
        char: glyph.char,
        texture: makeTexture(glyph.canvas),
        width: glyph.widthPx * titleUnits,
        height: glyph.heightPx * titleUnits,
        x: (glyph.centerPx - halfWidthPx) * titleUnits,
        y: glyphY,
        /** Where the caret rests once this glyph has landed. */
        caretX:
          (glyph.cursorPx + glyph.advancePx + word.trackingPx * 0.3 - halfWidthPx) * titleUnits,
      }));

    const tagline = {
      texture: makeTexture(line.canvas),
      width: line.widthPx * taglineUnits,
      height: line.heightPx * taglineUnits,
      y: -line.yOffsetPx * taglineUnits,
      inkWidth: line.inkWidthPx * taglineUnits,
    };

    const caret = {
      width: TITLE_FONT_PX * TITLE_TYPING.caret.widthEm * titleUnits,
      height: word.capHeightPx * TITLE_TYPING.caret.heightEm * titleUnits,
    };

    return {
      glyphs,
      tagline,
      caret,
      metrics: {
        titleWidth: word.totalWidthPx * titleUnits,
        titleCap: word.capHeightPx * titleUnits,
        taglineWidth: tagline.inkWidth,
      },
    };
  }, [fontFamily, maxAnisotropy]);

  // Canvas textures are created by hand, so they are released by hand.
  useEffect(() => {
    if (!wordmark) return undefined;
    return () => {
      for (const glyph of wordmark.glyphs) glyph.texture.dispose();
      wordmark.tagline.texture.dispose();
    };
  }, [wordmark]);

  return wordmark;
}

export default useWordmark;
