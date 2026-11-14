// Local tangent-plane (equirectangular) projection centred on the landing site.
// World axes: +X = east, -Z = north, +Y = up. Units are metres, no exaggeration.
// Over the ~100 km scene the distortion of this projection is well under 1%.
import { MARS_RADIUS_M, LANDING } from '../mars/constants-jezero.js';

const D2R = Math.PI / 180;
const COS0 = Math.cos(LANDING.lat * D2R);
const M_PER_DEG_LAT = MARS_RADIUS_M * D2R;
const M_PER_DEG_LON = MARS_RADIUS_M * D2R * COS0;

export function geoToWorld(lon, lat) {
  return { x: (lon - LANDING.lon) * M_PER_DEG_LON, z: -(lat - LANDING.lat) * M_PER_DEG_LAT };
}
export function worldToGeo(x, z) {
  return { lon: LANDING.lon + x / M_PER_DEG_LON, lat: LANDING.lat - z / M_PER_DEG_LAT };
}
export function elevToWorldY(elev) {
  return elev - LANDING.elev;
}
export function worldYToElev(y) {
  return y + LANDING.elev;
}
export function distanceM(a, b) {
  return Math.hypot((b.lon - a.lon) * M_PER_DEG_LON, (b.lat - a.lat) * M_PER_DEG_LAT);
}
export function bearingDeg(from, to) {
  const dx = (to.lon - from.lon) * M_PER_DEG_LON;
  const dy = (to.lat - from.lat) * M_PER_DEG_LAT;
  return (Math.atan2(dx, dy) / D2R + 360) % 360;
}
export function formatLat(lat) {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
}
export function formatLon(lon) {
  return `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`;
}
export function compassLabel(deg) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
