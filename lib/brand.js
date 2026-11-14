/**
 * A-ROUTE brand identity — single source of truth.
 *
 * The wordmark gradient, the tagline treatment and the font family are all
 * defined here. Both the 3D wordmark (drawn to a canvas texture in
 * lib/typography.js) and the DOM chrome (loading screen, destination header)
 * read these values, so changing them here changes the whole app.
 *
 * NOTE: the @font-face declaration that actually loads the font file lives in
 * app/globals.css. If you rename the font family here, rename it there too.
 */

export const BRAND = {
  name: 'A-ROUTE',
  tagline: 'KNOW THE GROUND',

  font: {
    family: 'Artemus',
    weight: 400,
    // Used only when the Artemus file is absent. It is deliberately a neutral
    // system stack rather than a lookalike substitute.
    fallbackStack:
      '"Helvetica Neue", "Inter", "Segoe UI", system-ui, -apple-system, Arial, sans-serif',
  },

  /**
   * Wordmark gradient, sampled left-to-right from the A-ROUTE logo:
   * dark terracotta / burnt red -> warm orange -> golden orange.
   */
  gradient: {
    angle: 96,
    stops: [
      { offset: 0.0, color: '#6F2512' },
      { offset: 0.18, color: '#95331A' },
      { offset: 0.42, color: '#C8521F' },
      { offset: 0.68, color: '#E8832B' },
      { offset: 0.88, color: '#F5AC3E' },
      { offset: 1.0, color: '#FBC361' },
    ],
  },

  tone: {
    tagline: '#EFE7DF',
    taglineDim: '#9C9289',
    caret: '#F7B347',
    atmosphere: '#FF8A4C',
  },
};

/** The font-family value to hand to canvas/CSS once availability is known. */
export function brandFontStack(fontAvailable) {
  return fontAvailable
    ? `"${BRAND.font.family}", ${BRAND.font.fallbackStack}`
    : BRAND.font.fallbackStack;
}

/** CSS `linear-gradient(...)` string for DOM elements that need the wordmark look. */
export function brandGradientCss(angle = BRAND.gradient.angle) {
  const stops = BRAND.gradient.stops
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(', ');
  return `linear-gradient(${angle}deg, ${stops})`;
}

/** Inline style object that paints text with the brand gradient. */
export function brandGradientTextStyle(angle = BRAND.gradient.angle) {
  return {
    backgroundImage: brandGradientCss(angle),
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  };
}
