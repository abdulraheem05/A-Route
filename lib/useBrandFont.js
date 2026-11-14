'use client';

import { useEffect, useState } from 'react';
import { BRAND, brandFontStack } from './brand';
import { loadBrandFont } from './typography';

/**
 * Resolves the Artemus webfont before the wordmark is rasterised.
 *
 * The intro waits on this so glyph textures are never baked with the fallback
 * stack and then swapped. If the file is absent the app continues with a
 * neutral system stack and reports `status: 'missing'` so a notice can be
 * shown in development — it deliberately does not pick a lookalike display
 * font on your behalf.
 *
 * @returns {{ status: 'loading'|'ready'|'missing', fontFamily: string, available: boolean }}
 */
export function useBrandFont() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    loadBrandFont()
      .then((available) => {
        if (!cancelled) setStatus(available ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const available = status === 'ready';

  return {
    status,
    available,
    family: BRAND.font.family,
    fontFamily: brandFontStack(available),
  };
}

export default useBrandFont;
