// Adapter for NASA Mars Trek WMTS layers.
// Grid: tile matrix set "default028mm" — 256 px tiles, origin (-180, +90),
// level z has 2^(z+1) columns and 2^z rows. Plain lat/lon, not Web Mercator.
//
// The layer definitions themselves (ids, dataset codes, zoom ceilings, bounds)
// used to live here as Gale constants; they are now part of each crater
// configuration, because they are the one thing that genuinely differs between
// craters. The grid arithmetic below is crater-independent and unchanged.
import { M_PER_DEG } from '@/lib/mars/constants-core';
import { getActiveCrater } from '@/lib/mars/activeCrater';

// Trek layers of the crater currently being explored, keyed by layer key.
export function trekLayers() {
  const imagery = getActiveCrater().imagery;
  return (imagery && imagery.layers) || {};
}

export function trekLayer(key) {
  return trekLayers()[key] || null;
}

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
