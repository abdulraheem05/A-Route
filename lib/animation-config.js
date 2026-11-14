/**
 * Every timing and composition number for the intro lives here.
 *
 * The intro is driven by a single clock (lib/timeline.js). Each visual beat is
 * a "cue" with an absolute start/end in seconds, which lets beats overlap —
 * the globe starts arriving while the camera is already retreating — without
 * any chained callbacks or competing tweens. Nothing can trigger twice because
 * every component derives its state from the clock value, not from events.
 */

/** Scene-wide camera setup. */
export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 240,

  /** Close on the wordmark while it types. */
  startZ: 3.2,
  /** Settled wide shot once Mars has arrived. */
  endZ: 7.2,
  /** Drifts a little further out behind the destination grid. */
  backgroundZ: 8.0,

  /**
   * The camera looks at (0, lookAtY, 0). Keep this at 0 unless you also want
   * to re-derive resolveComposition() — the occlusion maths below assumes the
   * globe's centre is on the optical axis.
   */
  lookAtY: 0,

  /** Pointer parallax, in world units. Disabled under reduced motion. */
  parallax: { x: 0.18, y: 0.1, lambda: 1.6 },
  /** Permanent, almost imperceptible drift so the frame never feels frozen. */
  breathing: { amplitude: 0.055, speed: 0.12 },
};

/** Where things sit in the scene, in world units. */
export const COMPOSITION = {
  title: {
    z: -4.5,
    /** Centred in frame while typing. */
    startY: 0,
    /** Target cap height in world units before responsive fitting. */
    capHeightWorld: 0.93,
    /** The wordmark never occupies more than this share of the visible width. */
    maxWidthFraction: 0.78,
    minScale: 0.3,
  },

  tagline: {
    z: -4.5,
    startY: -1.05,
    capHeightWorld: 0.19,
    maxWidthFraction: 0.66,
    /** World-space gap kept between the planet's lower limb and the tagline. */
    clearance: 0.6,
    minScale: 0.3,
  },

  globe: {
    radius: 1.15,
    /** Emerges from deep space, roughly at the wordmark's depth. */
    startZ: -3.2,
    startScale: 0.55,
    /** Settles here, between camera and wordmark, so it occludes the title. */
    endZ: 0,
    endScale: 1,
    /** Mars' axial tilt, in degrees. */
    axialTilt: 25.19,
    /** Radians per second. */
    spin: 0.0145,
    /** Scale multiplier applied behind the destination grid. */
    backgroundScale: 0.72,
  },

  lighting: {
    keyIntensity: 2.5,
    rimIntensity: 0.34,
    ambientIntensity: 0.075,
    keyPosition: [-3.4, 1.35, 2.6],
    rimPosition: [2.8, -0.7, -2.0],
  },
};

/**
 * Absolute cue times in seconds. Total length is the end of the last cue.
 * Phases are reported to React in this order (see lib/timeline.js).
 */
export const TIMELINE = {
  cues: {
    starfield: { start: 0.0, end: 0.8 },
    titleTyping: { start: 0.7, end: 2.7 },
    taglineReveal: { start: 2.7, end: 3.5 },
    globeReveal: { start: 3.4, end: 6.1 },
    cameraPullback: { start: 3.6, end: 7.2 },
    composition: { start: 6.9, end: 7.9 },
    buttonReveal: { start: 7.6, end: 8.3 },
  },
  total: 8.3,
};

/** Per-glyph typing behaviour inside the titleTyping cue. */
export const TITLE_TYPING = {
  /** Seconds between glyph entrances. */
  stagger: 0.17,
  /** How long one glyph takes to settle. */
  glyphDuration: 0.62,
  /** Glyphs arrive from this far behind the title plane. */
  depthOffset: 0.55,
  liftOffset: 0.07,
  overshootScale: 1.07,
  caret: { widthEm: 0.045, heightEm: 0.82, blinkSpeed: 7.5 },
};

/** Transition out of the intro and into the destination grid. */
export const STAGE_TRANSITION = {
  /** Seconds for the 3D scene to settle into its background pose. */
  duration: 1.1,
  /** Exponential smoothing rate used for stage lerps. */
  lambda: 2.6,
  titleFadeLambda: 4.2,
};

/** Framer Motion variants for the destination grid entrance. */
export const GRID_MOTION = {
  list: {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.055, delayChildren: 0.1 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20, scale: 0.985 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

/**
 * Resolves the responsive composition for the current viewport.
 *
 * Rather than hard-coding where the wordmark sits, the final Y is derived so
 * the planet's upper limb always grazes the lower portion of the central
 * glyphs: the globe is projected from its plane onto the title's plane, which
 * keeps the occlusion identical on a 21:9 monitor and a phone.
 *
 * @param {object} input
 * @param {number} input.aspect        viewport width / height
 * @param {number} input.titleWidth    wordmark width in world units (unscaled)
 * @param {number} input.titleCap      wordmark cap height in world units (unscaled)
 * @param {number} input.taglineWidth  tagline width in world units (unscaled)
 */
export function resolveComposition({ aspect, titleWidth, titleCap, taglineWidth }) {
  const tan = Math.tan((CAMERA.fov * Math.PI) / 360);

  // Distances in the widest (final) framing and the closest (typing) framing.
  const titleDistanceNear = CAMERA.startZ - COMPOSITION.title.z;
  const titleDistanceFar = CAMERA.endZ - COMPOSITION.title.z;
  const globeDistanceFar = CAMERA.endZ - COMPOSITION.globe.endZ;

  // The wordmark is largest on screen while it types, so fit it there.
  const visibleWidthNear = 2 * titleDistanceNear * tan * aspect;

  const titleScale = Math.max(
    COMPOSITION.title.minScale,
    Math.min(1, (visibleWidthNear * COMPOSITION.title.maxWidthFraction) / Math.max(titleWidth, 0.001)),
  );

  const taglineScale = Math.max(
    COMPOSITION.tagline.minScale,
    Math.min(1, (visibleWidthNear * COMPOSITION.tagline.maxWidthFraction) / Math.max(taglineWidth, 0.001)),
  );

  // Narrow viewports get a smaller planet so the composition keeps its air.
  const globeScale = Math.max(0.5, Math.min(1, aspect / 1.35));

  // Globe radius on the title's plane, i.e. how much of the wordmark it covers.
  const projectedGlobeRadius =
    (COMPOSITION.globe.radius * globeScale * titleDistanceFar) / globeDistanceFar;

  // Lift the wordmark so the limb cuts ~40% up the central glyphs.
  const titleFinalY = projectedGlobeRadius + 0.1 * titleCap * titleScale;

  // Drop the tagline clear of the planet's lower limb.
  const taglineFinalY = -(projectedGlobeRadius + COMPOSITION.tagline.clearance);

  return { titleScale, taglineScale, globeScale, titleFinalY, taglineFinalY };
}
