// Builds the placed world model (sites, items, traverse) from the JSON databases.
// Pure functions: no JSON imports here so the logic can be unit-tested in Node.
import { geoToWorld, distanceM } from '../coordinates/projection-jezero.js';

/**
 * Rover position at a given sol = the latest waypoint at or before that sol.
 * uncertaintyM = distance to the next waypoint when the sol falls strictly between two
 * waypoints (the rover may have driven part of that leg already).
 */
export function positionAtSol(waypoints, sol) {
  let prev = waypoints[0], next = null;
  for (let i = 0; i < waypoints.length; i++) {
    if (waypoints[i].sol <= sol) { prev = waypoints[i]; next = waypoints[i + 1] || null; } else break;
  }
  let uncertaintyM = 0;
  if (sol >= waypoints[0].sol && next && prev.sol !== sol) uncertaintyM = distanceM(prev, next);
  return { lon: prev.lon, lat: prev.lat, elev: prev.elev, waypointSol: prev.sol, uncertaintyM };
}

export function confidenceLabel(uncertaintyM) {
  if (uncertaintyM == null) return 'unresolved';
  if (uncertaintyM < 30) return 'high';
  if (uncertaintyM < 300) return 'approximate';
  return 'coarse';
}

export function buildWorld({ missions, objects, catalog, traverse }) {
  const waypoints = traverse.waypoints;
  const missionIndex = Object.fromEntries(missions.map((m, i) => [m.id, i]));
  const items = [];
  const unplaced = [];

  for (const p of catalog) {
    if (!p.sols || !p.missionId) { unplaced.push(p); continue; }
    const pos = positionAtSol(waypoints, p.sols[0]);
    items.push(makeItem('panorama', p.id, p.name, p.missionId, p.sols[0], pos, p));
  }
  for (const o of objects) {
    const pos = positionAtSol(waypoints, o.sol);
    items.push(makeItem('object', o.id, o.name, o.missionId, o.sol, pos, o));
  }
  function makeItem(kind, id, name, missionId, sol, pos, ref) {
    const w = geoToWorld(pos.lon, pos.lat);
    return {
      kind, id, name, missionId, missionIndex: missionIndex[missionId], sol,
      lon: pos.lon, lat: pos.lat, roverElev: pos.elev, x: w.x, z: w.z,
      uncertaintyM: pos.uncertaintyM, confidence: confidenceLabel(pos.uncertaintyM), waypointSol: pos.waypointSol, ref,
    };
  }

  // Items recorded at (nearly) the same rover position share one site.
  items.sort((a, b) => a.sol - b.sol);
  const sites = [];
  for (const it of items) {
    let site = sites.find((s) => s.missionId === it.missionId && Math.hypot(s.x - it.x, s.z - it.z) < 35);
    if (!site) {
      site = { id: `site-${it.id}`, missionId: it.missionId, missionIndex: it.missionIndex, x: it.x, z: it.z, lon: it.lon, lat: it.lat, roverElev: it.roverElev, items: [], uncertaintyM: 0, firstSol: it.sol };
      sites.push(site);
    }
    site.items.push(it);
    site.uncertaintyM = Math.max(site.uncertaintyM, it.uncertaintyM);
    it.siteId = site.id;
  }
  for (const s of sites) {
    const pano = s.items.find((i) => i.kind === 'panorama');
    s.name = (pano || s.items[0]).name;
    s.confidence = confidenceLabel(s.uncertaintyM);
    s.hasPanorama = !!pano;
    s.hasObject = s.items.some((i) => i.kind === 'object');
  }

  const track = waypoints.map((w) => ({ ...w, ...geoToWorld(w.lon, w.lat) }));
  let odo = 0;
  for (let i = 0; i < track.length; i++) {
    if (i > 0) odo += Math.hypot(track[i].x - track[i - 1].x, track[i].z - track[i - 1].z);
    track[i].odometerM = odo;
  }
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
  return { missions, items, sites, unplaced, track, itemById, siteById, traverseMeta: { source: traverse.source, resolution: traverse.resolution, note: traverse.note } };
}

export function odometerAtSol(track, sol) {
  let v = 0;
  for (const w of track) { if (w.sol <= sol) v = w.odometerM; else break; }
  return v;
}

export function nearestSite(sites, x, z, maxDist = Infinity) {
  let best = null, bd = maxDist;
  for (const s of sites) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { site: best, distance: bd } : null;
}
