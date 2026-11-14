/**
 * Every replaceable binary asset the app looks for, in one place.
 *
 * All paths are relative to /public. Nothing here is required for the app to
 * run: each loader degrades gracefully when the file is missing (see
 * lib/procedural-mars.js and components/destinations/DestinationCard.js).
 */

export const ASSETS = {
  /** Equirectangular Mars colour map. 4096x2048 or 8192x4096 recommended. */
  marsTexture: '/images/mars/mars-texture.jpg',

  /**
   * Optional grayscale elevation/bump map in the same projection.
   *
   * Left null on purpose so the app does not request a file that usually is
   * not there. Set it to '/images/mars/mars-bump.jpg' once you have one. While
   * it is null the colour map doubles as a very low-amplitude bump source.
   */
  marsBumpMap: null,

  /** Folder the destination thumbnails are read from. */
  destinationImageDir: '/images/mars/destinations',

  /**
   * Font file paths. These must match the src list in app/globals.css.
   * Listed here for documentation and for the asset notice in development.
   */
  fontFiles: ['/fonts/Artemus.woff2', '/fonts/Artemus.ttf'],
};

/** Bump amplitude in sphere-radius units. Keep small; Mars is not a golf ball. */
export const MARS_BUMP_SCALE = 0.014;
