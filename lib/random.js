/**
 * Deterministic pseudo-random numbers.
 *
 * The starfield and the procedural Mars map are both seeded so the scene is
 * identical on every reload (and between server and client), which makes
 * visual regressions obvious instead of mysterious.
 */

/** mulberry32 — 32-bit state, fast, good enough for visual noise. */
export function createRandom(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function randomRange(rand, min, max) {
  return min + (max - min) * rand();
}
