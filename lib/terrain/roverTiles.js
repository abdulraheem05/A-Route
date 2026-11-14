// Tiled high-resolution elevation for the rover region (registry D01),
// produced by scripts/prepare_terrain.py.
//
// meta.levels[] is ordered finest first. Each level is a grid of 256-sample
// tiles stored with one sample of overlap (257 x 257, Uint16, little-endian):
//   elevation_m = value * scale + offset,   value 0 = no data.
import { M_PER_DEG } from '@/lib/mars/constants';

const MAX_CACHED_TILES = 500;
const MAX_TILES_PER_REQUEST = 120;

export class RoverTiles {
  constructor(meta, baseUrl) {
    this.meta = meta;
    this.baseUrl = baseUrl;
    this.datasetId = meta.dataset_id || 'D01';
    this.levels = meta.levels.map((l) => ({
      ...l,
      east: l.west + l.width * l.dx,
      south: l.north - l.height * l.dy,
      resM: l.dy * M_PER_DEG,
      present: new Set(l.present || []),
    }));
    this.tiles = new Map(); // key -> Uint16Array | null
    this.pending = new Map();
  }

  key(li, r, c) {
    return `${li}/${r}_${c}`;
  }

  async loadTile(li, r, c) {
    const k = this.key(li, r, c);
    if (this.tiles.has(k)) return this.tiles.get(k);
    if (this.pending.has(k)) return this.pending.get(k);
    const level = this.levels[li];
    if (!level.present.has(`${r}_${c}`)) {
      this.tiles.set(k, null);
      return null;
    }
    const p = fetch(`${this.baseUrl}/${level.dir}/${r}_${c}.bin`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        const n = (level.tile + 1) * (level.tile + 1);
        const arr = buf && buf.byteLength === n * 2 ? new Uint16Array(buf) : null;
        this.tiles.set(k, arr);
        this.pending.delete(k);
        if (this.tiles.size > MAX_CACHED_TILES) {
          const first = this.tiles.keys().next().value;
          this.tiles.delete(first);
        }
        return arr;
      })
      .catch(() => {
        this.pending.delete(k);
        return null;
      });
    this.pending.set(k, p);
    return p;
  }

  // Loads every tile of level `li` that touches `bounds`. Returns false if the
  // request would be unreasonably large (caller should use a coarser level).
  async ensure(li, bounds) {
    const level = this.levels[li];
    if (!level) return false;
    const t = level.tile;
    const c0 = Math.max(0, Math.floor(((bounds.west - level.west) / level.dx - 0.5) / t));
    const c1 = Math.min(level.cols - 1, Math.floor(((bounds.east - level.west) / level.dx - 0.5) / t));
    const r0 = Math.max(0, Math.floor(((level.north - bounds.north) / level.dy - 0.5) / t));
    const r1 = Math.min(level.rows - 1, Math.floor(((level.north - bounds.south) / level.dy - 0.5) / t));
    if (c1 < c0 || r1 < r0) return true; // no overlap; nothing to load
    if ((c1 - c0 + 1) * (r1 - r0 + 1) > MAX_TILES_PER_REQUEST) return false;
    const jobs = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) jobs.push(this.loadTile(li, r, c));
    await Promise.all(jobs);
    return true;
  }

  sampleLevel(li, lon, lat) {
    const level = this.levels[li];
    const fx = (lon - level.west) / level.dx - 0.5;
    const fy = (level.north - lat) / level.dy - 0.5;
    if (fx < 0 || fy < 0 || fx > level.width - 1 || fy > level.height - 1) return NaN;
    const t = level.tile;
    const c = Math.min(level.cols - 1, Math.floor(fx / t));
    const r = Math.min(level.rows - 1, Math.floor(fy / t));
    const arr = this.tiles.get(this.key(li, r, c));
    if (!arr) return NaN;
    const lx = fx - c * t;
    const ly = fy - r * t;
    const i0 = Math.min(Math.floor(lx), t - 1);
    const j0 = Math.min(Math.floor(ly), t - 1);
    const w = t + 1;
    const a = arr[j0 * w + i0];
    const b = arr[j0 * w + i0 + 1];
    const cc = arr[(j0 + 1) * w + i0];
    const d = arr[(j0 + 1) * w + i0 + 1];
    if (a === 0 || b === 0 || cc === 0 || d === 0) return NaN;
    const tx = lx - i0;
    const ty = ly - j0;
    const v = (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
    return v * level.scale + level.offset;
  }

  // Finest loaded level that has data at this point.
  sample(lon, lat) {
    for (let li = 0; li < this.levels.length; li++) {
      const h = this.sampleLevel(li, lon, lat);
      if (!Number.isNaN(h)) return { h, resM: this.levels[li].resM, level: li };
    }
    return null;
  }
}
