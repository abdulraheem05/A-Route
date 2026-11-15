// Local tangent-plane (equirectangular) projection for the first-person game,
// centred on the active game crater's landing site.
// World axes: +X = east, -Z = north, +Y = up. Units are metres, no exaggeration.
// Over the ~100 km scene the distortion of this projection is well under 1%.
//
// The origin used to be Jezero's, fixed at module load. It now comes from
// lib/mars/gameCrater.js, which caches the derived frame, so these functions
// still do no trigonometry per call. With the default crater every result is
// identical to before.
import { getGameFrame } from '@/lib/mars/gameCrater';

const D2R = Math.PI / 180;

export function geoToWorld(lon, lat) {
  const f = getGameFrame();
  return { x: (lon - f.origin.lon) * f.mPerDegLon, z: -(lat - f.origin.lat) * f.mPerDegLat };
}
export function worldToGeo(x, z) {
  const f = getGameFrame();
  return { lon: f.origin.lon + x / f.mPerDegLon, lat: f.origin.lat - z / f.mPerDegLat };
}
export function elevToWorldY(elev) {
  return elev - getGameFrame().origin.elev;
}
export function worldYToElev(y) {
  return y + getGameFrame().origin.elev;
}
export function distanceM(a, b) {
  const f = getGameFrame();
  return Math.hypot((b.lon - a.lon) * f.mPerDegLon, (b.lat - a.lat) * f.mPerDegLat);
}
export function bearingDeg(from, to) {
  const f = getGameFrame();
  const dx = (to.lon - from.lon) * f.mPerDegLon;
  const dy = (to.lat - from.lat) * f.mPerDegLat;
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
