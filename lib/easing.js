/**
 * Small, dependency-free math helpers used by the animation loops.
 * Kept out of React so they can be called inside useFrame without allocation.
 */

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value) {
  return clamp(value, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential smoothing.
 * `lambda` is roughly "how fast", 1 = lazy, 10 = snappy.
 */
export function damp(current, target, lambda, delta) {
  return target + (current - target) * Math.exp(-lambda * delta);
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t) {
  const p = 1 - clamp01(t);
  return 1 - p * p * p;
}

export function easeOutQuint(t) {
  const p = 1 - clamp01(t);
  return 1 - p * p * p * p * p;
}

export function easeInOutCubic(t) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutExpo(t) {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function easeInOutQuart(t) {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}
