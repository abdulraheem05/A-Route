// Image tile management: composes Mars Trek tiles onto a canvas that is
// georeferenced to an arbitrary lon/lat rectangle. Tiles are placed by their
// own coordinates and never stretched to fit other data.
import { intersectBounds } from '@/lib/coordinates/projection';
import { degPerTile, tileBounds, tileRange, tileUrl } from '@/lib/data/trekAdapter';

export function createCanvas(bounds, pxPerDeg, maxSize = 4096) {
  let w = Math.round((bounds.east - bounds.west) * pxPerDeg);
  let h = Math.round((bounds.north - bounds.south) * pxPerDeg);
  const scale = Math.min(1, maxSize / Math.max(w, h));
  w = Math.max(2, Math.round(w * scale));
  h = Math.max(2, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // 404 = no coverage for this tile
    img.src = url;
  });
}

// Draws every tile of `layer` at `zoom` that intersects the canvas rectangle.
// onBatch is called after each group of tiles so the caller can refresh a texture.
export async function drawTrekTiles(canvas, canvasBounds, layer, zoom, options = {}) {
  const { isCancelled = () => false, onBatch = () => {}, concurrency = 8 } = options;
  const z = Math.min(zoom, layer.maxZoom);
  const area = intersectBounds(canvasBounds, layer.bounds);
  const stats = { requested: 0, drawn: 0, zoom: z };
  if (!area) return stats;

  const ctx = canvas.getContext('2d');
  const sx = canvas.width / (canvasBounds.east - canvasBounds.west);
  const sy = canvas.height / (canvasBounds.north - canvasBounds.south);
  const d = degPerTile(z);
  const range = tileRange(area, z);

  const cx = (range.c0 + range.c1) / 2;
  const cy = (range.r0 + range.r1) / 2;
  const jobs = [];
  for (let row = range.r0; row <= range.r1; row++) {
    for (let col = range.c0; col <= range.c1; col++) jobs.push({ row, col });
  }
  // Load from the centre outwards.
  jobs.sort((a, b) => Math.hypot(a.col - cx, a.row - cy) - Math.hypot(b.col - cx, b.row - cy));
  stats.requested = jobs.length;

  let next = 0;
  let sinceBatch = 0;
  async function worker() {
    while (next < jobs.length) {
      if (isCancelled()) return;
      const job = jobs[next++];
      const img = await loadImage(tileUrl(layer, z, job.row, job.col));
      if (isCancelled()) return;
      if (img) {
        const tb = tileBounds(z, job.row, job.col);
        const x = (tb.west - canvasBounds.west) * sx;
        const y = (canvasBounds.north - tb.north) * sy;
        // Half-pixel overdraw hides hairline seams between adjacent tiles.
        ctx.drawImage(img, x - 0.25, y - 0.25, d * sx + 0.5, d * sy + 0.5);
        stats.drawn++;
      }
      if (++sinceBatch >= 6) {
        sinceBatch = 0;
        onBatch(stats);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length || 1) }, worker));
  if (!isCancelled()) onBatch(stats);
  return stats;
}
