// Geographic <-> scene coordinate conversion.
//
// Scene frame: local equirectangular projection about ORIGIN, in kilometres.
//   +x = east, +y = up (elevation above the areoid x vertical exaggeration), +z = south.
// East-west distances use cos(latitude of origin). Across the display region the
// scale error from that single cosine is below 0.2 %. Planetary curvature is NOT
// applied to the mesh (it would drop the region's edges by roughly 2 km); the
// interface states this.
import { MARS_RADIUS_M, M_PER_DEG, ORIGIN, SCENE_UNIT_M } from '@/lib/mars/constants';

const RAD = Math.PI / 180;
const COS0 = Math.cos(ORIGIN.lat * RAD);

export const KM_PER_DEG_LAT = M_PER_DEG / SCENE_UNIT_M;
export const KM_PER_DEG_LON = KM_PER_DEG_LAT * COS0;

export function lonLatToXZ(lon, lat) {
  return [(lon - ORIGIN.lon) * KM_PER_DEG_LON, -(lat - ORIGIN.lat) * KM_PER_DEG_LAT];
}

export function xzToLonLat(x, z) {
  return [ORIGIN.lon + x / KM_PER_DEG_LON, ORIGIN.lat - z / KM_PER_DEG_LAT];
}

export function elevToY(metres, exaggeration) {
  return (metres * exaggeration) / SCENE_UNIT_M;
}

export function inBounds(b, lon, lat) {
  return lon >= b.west && lon <= b.east && lat >= b.south && lat <= b.north;
}

export function intersectBounds(a, b) {
  const r = {
    west: Math.max(a.west, b.west),
    east: Math.min(a.east, b.east),
    south: Math.max(a.south, b.south),
    north: Math.min(a.north, b.north),
  };
  return r.west < r.east && r.south < r.north ? r : null;
}

export function containsBounds(outer, inner) {
  return (
    inner.west >= outer.west && inner.east <= outer.east && inner.south >= outer.south && inner.north <= outer.north
  );
}

// Great-circle distance on the Mars reference sphere, metres.
export function greatCircleMeters(lon1, lat1, lon2, lat2) {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  const dp = p2 - p1;
  const dl = (lon2 - lon1) * RAD;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * MARS_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Fast local planar distance (metres) for nearest-neighbour searches inside Gale.
export function planarMeters(lon1, lat1, lon2, lat2) {
  const dx = (lon2 - lon1) * M_PER_DEG * COS0;
  const dy = (lat2 - lat1) * M_PER_DEG;
  return Math.hypot(dx, dy);
}

// Any longitude -> positive-east 0..360.
export function toEast360(lon) {
  return ((lon % 360) + 360) % 360;
}

// West-positive longitude (used by some IAU gazetteer fields) -> east-positive.
export function westToEast(lonWest) {
  return toEast360(360 - lonWest);
}

export function formatLat(lat, digits = 4) {
  return `${Math.abs(lat).toFixed(digits)}°${lat < 0 ? 'S' : 'N'}`;
}

export function formatLon(lon, digits = 4) {
  return `${toEast360(lon).toFixed(digits)}°E`;
}

// Parses "-4.59, 137.44", "4.59S 137.44E", "4.59 S, 222.56 W".
// Returns { lat, lon } with planetocentric latitude and east longitude, or null.
export function parseLatLon(text) {
  if (!text) return null;
  const m = String(text)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])?[\s,;]+(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/);
  if (!m) return null;
  let lat = parseFloat(m[1]);
  let lon = parseFloat(m[3]);
  if (m[2] && m[2].toUpperCase() === 'S') lat = -Math.abs(lat);
  if (m[2] && m[2].toUpperCase() === 'N') lat = Math.abs(lat);
  lon = m[4] && m[4].toUpperCase() === 'W' ? westToEast(lon) : toEast360(lon);
  if (Number.isNaN(lat) || Number.isNaN(lon) || Math.abs(lat) > 90) return null;
  return { lat, lon };
}
