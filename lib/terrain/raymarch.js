// Ray / height-field intersection, independent of mesh resolution.
// heightAt(x, z) returns the surface height in scene units, or NaN where there
// is no surface (outside the region, or no data).
export function raymarch(origin, dir, heightAt, maxDist = 4000) {
  let t = 0;
  let prevT = 0;
  for (let i = 0; i < 4000 && t < maxDist; i++) {
    const x = origin.x + dir.x * t;
    const y = origin.y + dir.y * t;
    const z = origin.z + dir.z * t;
    const h = heightAt(x, z);
    if (!Number.isNaN(h) && y <= h) {
      let a = prevT;
      let b = t;
      for (let k = 0; k < 16; k++) {
        const m = (a + b) / 2;
        const hm = heightAt(origin.x + dir.x * m, origin.z + dir.z * m);
        if (Number.isNaN(hm) || origin.y + dir.y * m > hm) a = m;
        else b = m;
      }
      return {
        x: origin.x + dir.x * b,
        y: origin.y + dir.y * b,
        z: origin.z + dir.z * b,
        t: b,
      };
    }
    prevT = t;
    const clearance = Number.isNaN(h) ? 2 : y - h;
    t += Math.min(Math.max(clearance * 0.25, 0.002), 8);
    if (dir.y >= 0 && y > 40) return null; // climbing away above any terrain
    if (y < -60) return null;
  }
  return null;
}
