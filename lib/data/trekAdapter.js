// Adapter for NASA Mars Trek WMTS layers (registry D05, D06).
// Grid: tile matrix set "default028mm" — 256 px tiles, origin (-180, +90),
// level z has 2^(z+1) columns and 2^z rows. Plain lat/lon, not Web Mercator.
import { GALE, HIRISE_BOUNDS, M_PER_DEG } from '@/lib/mars/constants';

export const TREK_LAYERS = {
  ctx: {
    key: 'ctx',
    id: 'Gale_CTX_BlockAdj_dd',
    datasetId: 'D05',
    label: 'CTX greyscale',
    maxZoom: 12,
    bounds: GALE,
  },
  hirise: {
    key: 'hirise',
    id: 'curiosity_hirise_mosaic',
    datasetId: 'D06',
    label: 'HiRISE greyscale',
    maxZoom: 16,
    bounds: HIRISE_BOUNDS,
  },
};

export const TILE_PX = 256;
export const degPerTile = (z) => 180 / 2 ** z;
export const degPerPixel = (z) => degPerTile(z) / TILE_PX;
export const metersPerPixel = (z) => degPerPixel(z) * M_PER_DEG;

export function tileRange(bounds, z) {
  const d = degPerTile(z);
  const eps = 1e-9;
  return {
    c0: Math.floor((bounds.west + 180) / d),
    c1: Math.floor((bounds.east + 180 - eps) / d),
    r0: Math.floor((90 - bounds.north) / d),
    r1: Math.floor((90 - bounds.south - eps) / d),
  };
}

export function tileBounds(z, row, col) {
  const d = degPerTile(z);
  const west = -180 + col * d;
  const north = 90 - row * d;
  return { west, east: west + d, north, south: north - d };
}

export function tileUrl(layer, z, row, col) {
  return `/api/trek/${layer.id}/${z}/${row}/${col}`;
}
