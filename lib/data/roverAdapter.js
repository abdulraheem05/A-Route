// Adapter for NASA rover waypoint and traverse GeoJSON (Curiosity: registry
// D12, D13). Coordinates are never edited. Records failing basic validation are
// dropped and counted, not repaired.
//
// `bounds` is the crater region a record must fall inside. It defaults to the
// active crater's rover bounds, so the validation is the same rejection test as
// before, applied to whichever crater is loaded.
import { getActiveCrater } from '@/lib/mars/activeCrater';
import { inBounds, planarMeters } from '@/lib/coordinates/projection';

function roverBounds(bounds) {
  if (bounds) return bounds;
  const crater = getActiveCrater();
  return (crater.rover && crater.rover.bounds) || crater.bounds;
}

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function parseWaypoints(geojson, bounds) {
  const region = roverBounds(bounds);
  const features = (geojson && geojson.features) || [];
  let rejected = 0;
  const list = [];
  features.forEach((f, order) => {
    const p = f.properties || {};
    const g = (f.geometry && f.geometry.coordinates) || [];
    const lon = num(p.lon ?? g[0]);
    const lat = num(p.lat ?? g[1]);
    const sol = num(p.sol);
    if (lon === null || lat === null || sol === null || !inBounds(region, lon, lat)) {
      rejected++;
      return;
    }
    list.push({
      order,
      sol,
      lon,
      lat,
      elev: num(p.elev_geoid ?? g[2]),
      rmc: p.RMC ?? (p.site != null && p.drive != null ? `${p.site}_${p.drive}` : null),
      site: num(p.site),
      drive: num(p.drive),
      distM: num(p.dist_m),
      distTotalM: num(p.dist_total_m),
      roll: num(p.roll),
      pitch: num(p.pitch),
      yaw: num(p.yaw),
      tilt: num(p.tilt),
      driveType: p.drive_type ?? null,
    });
  });
  list.sort((a, b) => a.sol - b.sol || a.order - b.order);
  return { waypoints: list, rejected };
}

// Flattens the traverse into one vertex list plus a set of "break" indices
// (vertex i starts a new line that does not connect to vertex i-1).
export function parseTraverse(geojson, minSpacingM = 1.5, bounds) {
  const region = roverBounds(bounds);
  const features = (geojson && geojson.features) || [];
  const verts = []; // [lon, lat, elev]
  const breaks = new Set();
  let lengthM = 0;
  const pushLine = (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    let started = false;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      const lon = num(c[0]);
      const lat = num(c[1]);
      if (lon === null || lat === null || !inBounds(region, lon, lat)) continue;
      const last = verts[verts.length - 1];
      if (!started) {
        // Join to the previous line only if it really continues from it.
        if (last && planarMeters(last[0], last[1], lon, lat) < 0.05) {
          started = true;
          continue;
        }
        if (last && planarMeters(last[0], last[1], lon, lat) > 25) breaks.add(verts.length);
        verts.push([lon, lat, num(c[2])]);
        started = true;
        continue;
      }
      const d = planarMeters(last[0], last[1], lon, lat);
      if (d < minSpacingM && i < coords.length - 1) continue;
      lengthM += d;
      verts.push([lon, lat, num(c[2])]);
    }
  };
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'LineString') pushLine(g.coordinates);
    else if (g.type === 'MultiLineString') g.coordinates.forEach(pushLine);
  }
  return { verts, breaks, lengthM };
}

// Attaches each waypoint to the nearest traverse vertex, searching forward
// only. Returns per-waypoint vertex indices, or ok=false if the two files do
// not line up well enough to colour the path by sol.
export function joinWaypointsToTraverse(waypoints, traverse) {
  const { verts } = traverse;
  const idx = new Int32Array(waypoints.length).fill(-1);
  if (!verts.length || !waypoints.length) return { ok: false, idx, matched: 0 };
  const WINDOW = 6000;
  const TOL = 12; // metres
  let cursor = 0;
  let matched = 0;
  for (let w = 0; w < waypoints.length; w++) {
    const wp = waypoints[w];
    let best = -1;
    let bestD = Infinity;
    const end = Math.min(verts.length, cursor + WINDOW);
    for (let i = cursor; i < end; i++) {
      const d = planarMeters(verts[i][0], verts[i][1], wp.lon, wp.lat);
      if (d < bestD) {
        bestD = d;
        best = i;
        if (d < 0.2) break;
      }
    }
    if (best >= 0 && bestD <= TOL) {
      idx[w] = best;
      cursor = best;
      matched++;
    } else {
      idx[w] = w > 0 ? idx[w - 1] : 0;
    }
  }
  const fraction = matched / waypoints.length;
  return { ok: fraction > 0.85, idx, matched, fraction };
}

export function nearestWaypoint(waypoints, lon, lat) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const d = planarMeters(waypoints[i].lon, waypoints[i].lat, lon, lat);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best < 0 ? null : { index: best, distanceM: bestD };
}
