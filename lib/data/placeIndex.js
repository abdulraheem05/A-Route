// Searchable list of the places a route can start or end at.
//
// Everything here comes from datasets the crater already loads — IAU features
// and mission sites from the crater's landmark set, the landing site from its
// rover configuration, and the rover's own recorded positions. No place is
// invented, and the list is crater-specific because its sources are.
import { resolveLandmarks, waypointIndexAtSol } from '@/lib/data/landmarks';

const KIND_LABEL = {
  landing: 'Landing site',
  rover: 'Rover position',
  iau: 'IAU feature',
  mission: 'Mission site',
};

/**
 * @param crater   active crater configuration
 * @param waypoints  rover waypoints from the store (may be empty)
 * @param sol      currently selected sol, or null
 * @returns [{ id, name, kind, kindLabel, type, lon, lat, elev, detail, datasetId }]
 */
export function buildPlaceIndex(crater, waypoints, sol) {
  const out = [];
  const seen = new Set();
  // Deduplicated by name: the landing site is often also an entry in the
  // mission's own site catalogue, and should appear once.
  const add = (p) => {
    if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) return;
    const key = String(p.name).trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...p, kindLabel: KIND_LABEL[p.kind] || p.kind });
  };

  // The landing site: the one coordinate every mission dataset agrees on.
  const rover = crater.rover;
  if (rover && rover.landingSite) {
    add({
      id: 'landing',
      kind: 'landing',
      name: landingName(crater),
      type: `${rover.name} landing site`,
      lon: rover.landingSite.lon,
      lat: rover.landingSite.lat,
      elev: rover.landingSite.elev ?? null,
      detail: rover.landedText ? rover.landedText.replace(/^since landing/i, 'Landed') : null,
      datasetId: rover.waypointDatasetId || null,
    });
  }

  // Where the rover is now, and where it was on the sol being viewed.
  if (waypoints && waypoints.length) {
    const last = waypoints[waypoints.length - 1];
    add({
      id: 'rover-latest',
      kind: 'rover',
      name: `${rover ? rover.name : 'Rover'}, latest position`,
      type: `Sol ${last.sol}`,
      lon: last.lon,
      lat: last.lat,
      elev: last.elev ?? null,
      detail: 'Last record in the loaded waypoint file',
      datasetId: rover && rover.waypointDatasetId,
    });
    if (sol != null) {
      const i = waypointIndexAtSol(waypoints, sol);
      const w = i >= 0 ? waypoints[i] : null;
      if (w && w.sol !== last.sol) {
        add({
          id: 'rover-sol',
          kind: 'rover',
          name: `${rover ? rover.name : 'Rover'} on sol ${w.sol}`,
          type: `Sol ${w.sol}`,
          lon: w.lon,
          lat: w.lat,
          elev: w.elev ?? null,
          detail: 'Position on the sol selected in the timeline',
          datasetId: rover && rover.waypointDatasetId,
        });
      }
    }
  }

  // Named places: IAU features and the mission's own sites, positioned the way
  // the map already positions them.
  for (const l of resolveLandmarks(waypoints, crater.landmarks)) {
    add({
      id: l.id,
      kind: l.nameClass === 'iau' ? 'iau' : 'mission',
      name: l.name,
      type: l.type || null,
      lon: l.lon,
      lat: l.lat,
      elev: l.elev ?? null,
      detail: l.resolvedSol != null ? `Sol ${l.resolvedSol}` : l.sizeKm ? `${l.sizeKm} km across` : null,
      datasetId: l.datasetId || null,
      tier: l.tier,
    });
  }

  // Landing site first, then rover positions, then named places by prominence.
  const order = { landing: 0, rover: 1, iau: 2, mission: 3 };
  out.sort((a, b) => order[a.kind] - order[b.kind] || (a.tier ?? 9) - (b.tier ?? 9) || a.name.localeCompare(b.name));
  return out;
}

// The landing site's own name if the crater's landmark set carries one,
// otherwise a neutral label. Never invented.
function landingName(crater) {
  const set = crater.landmarks || {};
  const named = [...(set.fixed || []), ...(set.solKeyed || [])].find(
    (l) => l.id === 'landing-site' || /landing/i.test(l.name || '')
  );
  if (named) return named.name;
  return `${crater.rover ? crater.rover.name : 'Rover'} landing site`;
}

/** Case-insensitive match on name, type and detail. */
export function filterPlaces(places, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return places;
  return places.filter((p) =>
    [p.name, p.type, p.detail, p.kindLabel].some((f) => f && String(f).toLowerCase().includes(q))
  );
}
