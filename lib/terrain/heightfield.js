// Height grid loader and sampler. The grid is whatever scripts produced in public/terrain:
// either the preview-derived estimate shipped with the project or a real DEM from prepare-terrain.js.
import { geoToWorld, worldToGeo, elevToWorldY } from '../coordinates/projection-game.js';
import { getGameCrater } from '../mars/gameCrater.js';

export class Heightfield {
  constructor(meta, data) {
    this.meta = meta;
    this.data = data; // Uint16Array, row 0 = north
    this.w = meta.width;
    this.h = meta.height;
    this.scale = (meta.elevMax - meta.elevMin) / 65535;
    const a = geoToWorld(meta.lonMin, meta.latMax);
    const b = geoToWorld(meta.lonMax, meta.latMin);
    this.bounds = { xMin: a.x, xMax: b.x, zMin: a.z, zMax: b.z };
    this.cellX = (b.x - a.x) / (this.w - 1);
    this.cellZ = (b.z - a.z) / (this.h - 1);
    // The surface image may cover a different extent than the height grid (e.g. after swapping in a real DEM).
    const t = meta.textureBounds || meta;
    const ta = geoToWorld(t.lonMin, t.latMax), tb = geoToWorld(t.lonMax, t.latMin);
    this.texBounds = { xMin: ta.x, xMax: tb.x, zMin: ta.z, zMax: tb.z };
  }
  at(i, j) {
    const ii = i < 0 ? 0 : i >= this.w ? this.w - 1 : i;
    const jj = j < 0 ? 0 : j >= this.h ? this.h - 1 : j;
    return this.meta.elevMin + this.data[jj * this.w + ii] * this.scale;
  }
  // Catmull-Rom bicubic interpolation at fractional grid coordinates.
  sampleGrid(u, v) {
    const i = Math.floor(u), j = Math.floor(v);
    const fx = u - i, fy = v - j;
    let out = 0;
    for (let m = -1; m <= 2; m++) {
      const wy = cubic(m - fy);
      if (wy === 0) continue;
      let row = 0;
      for (let n = -1; n <= 2; n++) {
        const wx = cubic(n - fx);
        if (wx !== 0) row += wx * this.at(i + n, j + m);
      }
      out += wy * row;
    }
    return out;
  }
  /** Texture coordinates of a world position in the surface image (v = 1 at the north edge). */
  texUV(x, z) {
    const t = this.texBounds;
    return { u: (x - t.xMin) / (t.xMax - t.xMin), v: 1 - (z - t.zMin) / (t.zMax - t.zMin) };
  }
  worldToGrid(x, z) {
    return { u: (x - this.bounds.xMin) / this.cellX, v: (z - this.bounds.zMin) / this.cellZ };
  }
  /** Elevation in metres (areoid-relative) at world position. */
  elevation(x, z) {
    const g = this.worldToGrid(x, z);
    return this.sampleGrid(g.u, g.v);
  }
  elevationGeo(lon, lat) {
    const p = geoToWorld(lon, lat);
    return this.elevation(p.x, p.z);
  }
  worldY(x, z) {
    return elevToWorldY(this.elevation(x, z));
  }
  /** Gradient (dy/dx, dy/dz) by central differences over `d` metres. */
  gradient(x, z, d = 12) {
    return {
      gx: (this.elevation(x + d, z) - this.elevation(x - d, z)) / (2 * d),
      gz: (this.elevation(x, z + d) - this.elevation(x, z - d)) / (2 * d),
    };
  }
  slopeDeg(x, z) {
    const g = this.gradient(x, z);
    return (Math.atan(Math.hypot(g.gx, g.gz)) * 180) / Math.PI;
  }
  /** Signed grade (degrees) when moving from (x,z) in direction (dx,dz). */
  gradeAlong(x, z, dx, dz) {
    const len = Math.hypot(dx, dz) || 1;
    const g = this.gradient(x, z);
    return (Math.atan((g.gx * dx + g.gz * dz) / len) * 180) / Math.PI;
  }
  inBounds(x, z, margin = 0) {
    const b = this.bounds;
    return x >= b.xMin + margin && x <= b.xMax - margin && z >= b.zMin + margin && z <= b.zMax - margin;
  }
  clamp(x, z, margin = 200) {
    const b = this.bounds;
    return { x: Math.min(b.xMax - margin, Math.max(b.xMin + margin, x)), z: Math.min(b.zMax - margin, Math.max(b.zMin + margin, z)) };
  }
  geoAt(x, z) {
    return worldToGeo(x, z);
  }
}

function cubic(t) {
  const a = Math.abs(t);
  if (a <= 1) return 1.5 * a * a * a - 2.5 * a * a + 1;
  if (a < 2) return -0.5 * a * a * a + 2.5 * a * a - 4 * a + 2;
  return 0;
}

// One cached grid per crater, so entering the other crater cannot be answered
// by the grid still held for the first.
const cache = new Map();
let currentId = null;

export function getHeightfield() {
  return currentId ? cache.get(currentId) || null : null;
}

/**
 * Loads the active game crater's height grid. The URLs come from its terrain
 * configuration, whose Jezero values are the original paths, so the requests
 * the browser makes for Jezero are unchanged.
 */
export async function loadHeightfield() {
  const crater = getGameCrater();
  currentId = crater.id;
  if (cache.has(crater.id)) return cache.get(crater.id);
  const { metaUrl, heightUrl } = crater.terrain;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) throw new Error(`Missing ${metaUrl}`);
  const meta = await metaRes.json();
  const heightRes = await fetch(heightUrl);
  if (!heightRes.ok) throw new Error(`Missing ${heightUrl}`);
  const data = new Uint16Array(await heightRes.arrayBuffer());
  if (data.length !== meta.width * meta.height) {
    throw new Error(`Height grid size does not match ${metaUrl}`);
  }
  const hf = new Heightfield(meta, data);
  cache.set(crater.id, hf);
  return hf;
}
