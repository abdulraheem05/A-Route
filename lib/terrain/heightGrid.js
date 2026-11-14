// A regular lon/lat elevation raster held in memory.
// Row 0 is the northern edge. Pixel (i, j) is centred at
//   lon = west + (i + 0.5) * dx,  lat = north - (j + 0.5) * dy.
import { M_PER_DEG, NODATA, ORIGIN } from '@/lib/mars/constants';

const COS0 = Math.cos((ORIGIN.lat * Math.PI) / 180);

export class HeightGrid {
  constructor({ data, width, height, west, north, dx, dy, datasetId }) {
    this.data = data;
    this.width = width;
    this.height = height;
    this.west = west;
    this.north = north;
    this.dx = dx;
    this.dy = dy;
    this.east = west + width * dx;
    this.south = north - height * dy;
    this.datasetId = datasetId || null;
    this.resM = dy * M_PER_DEG;
    this.texelMetersX = dx * M_PER_DEG * COS0;
    this.texelMetersY = dy * M_PER_DEG;
  }

  // Bounds of the pixel centres (the extent a vertex-per-pixel mesh spans).
  centreBounds() {
    return {
      west: this.west + this.dx / 2,
      east: this.east - this.dx / 2,
      north: this.north - this.dy / 2,
      south: this.south + this.dy / 2,
    };
  }

  value(i, j) {
    const v = this.data[j * this.width + i];
    return v <= NODATA + 1 || Number.isNaN(v) ? NaN : v;
  }

  // Bilinear sample in metres; NaN outside the raster or where data are missing.
  sample(lon, lat) {
    const fx = (lon - this.west) / this.dx - 0.5;
    const fy = (this.north - lat) / this.dy - 0.5;
    if (fx < -0.5 || fy < -0.5 || fx > this.width - 0.5 || fy > this.height - 0.5) return NaN;
    const x = Math.min(Math.max(fx, 0), this.width - 1);
    const y = Math.min(Math.max(fy, 0), this.height - 1);
    const i0 = Math.min(Math.floor(x), this.width - 2 < 0 ? 0 : this.width - 2);
    const j0 = Math.min(Math.floor(y), this.height - 2 < 0 ? 0 : this.height - 2);
    const i1 = Math.min(i0 + 1, this.width - 1);
    const j1 = Math.min(j0 + 1, this.height - 1);
    const tx = x - i0;
    const ty = y - j0;
    const a = this.value(i0, j0);
    const b = this.value(i1, j0);
    const c = this.value(i0, j1);
    const d = this.value(i1, j1);
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) {
      // Fall back to the nearest valid corner rather than inventing a value.
      const near = ty < 0.5 ? (tx < 0.5 ? a : b) : tx < 0.5 ? c : d;
      return near;
    }
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
}

export async function loadHeightLevel(baseUrl, meta, level) {
  const res = await fetch(`${baseUrl}/${level.file}`);
  if (!res.ok) throw new Error(`Missing terrain level ${level.file}`);
  const buf = await res.arrayBuffer();
  const data = new Float32Array(buf);
  if (data.length !== level.width * level.height) {
    throw new Error(`Terrain level ${level.file} has ${data.length} samples, expected ${level.width * level.height}`);
  }
  return new HeightGrid({
    data,
    width: level.width,
    height: level.height,
    west: level.west,
    north: level.north,
    dx: level.dx,
    dy: level.dy,
    datasetId: meta.dataset_id,
  });
}
