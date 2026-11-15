// Rover traverse for a game campaign.
//
// Jezero ships a decimated waypoint subset in data/traverse.json. No equivalent
// file is bundled for Curiosity, and the game places every site from the
// traverse, so Gale reads NASA's waypoint file through the route this project
// already has for the map: /api/rover/waypoints, which serves the live file and
// falls back to a local snapshot.
//
// Nothing here invents a coordinate. If the file cannot be loaded the caller
// gets an error and the game says so, rather than placing sites on guesses.
import { parseWaypoints } from '@/lib/data/roverAdapter';

// `spec` is a crater's `traverse` config: either a bundled JSON document, or a
// url plus the bounds records must fall inside and a source label.
// Resolves to a traverse document: source, resolution, note and a waypoints
// array of sol / lon / lat / elev records.
export async function loadTraverse(spec) {
  if (spec.bundled) return spec.bundled;

  const res = await fetch(spec.url);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.json()).error || detail;
    } catch (e) {
      /* keep the status */
    }
    throw new Error(`Could not load the rover traverse (${detail}).`);
  }
  const origin = res.headers.get('X-MarsWalk-Origin');
  const geojson = await res.json();
  // The same adapter the map uses, so the same records are accepted and the
  // same ones are rejected.
  const { waypoints, rejected } = parseWaypoints(geojson, spec.bounds);
  if (!waypoints.length) throw new Error('The rover waypoint file held no usable records.');

  return {
    source: spec.source || 'NASA rover waypoint file',
    resolution: 'One record per drive end',
    note:
      `${waypoints.length} waypoints, sols ${waypoints[0].sol}–${waypoints[waypoints.length - 1].sol}` +
      `${rejected ? `, ${rejected} records rejected as out of bounds or incomplete` : ''}` +
      `${origin ? ` (${origin === 'live' ? 'fetched from NASA' : origin === 'snapshot' ? 'local snapshot' : origin})` : ''}.`,
    origin,
    waypoints: waypoints.map((w) => ({ sol: w.sol, lon: w.lon, lat: w.lat, elev: w.elev })),
  };
}
