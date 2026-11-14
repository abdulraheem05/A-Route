// Server-side adapter for NASA rover localisation files.
// These endpoints are undocumented, so the app never hot-links them from the
// browser: it fetches here, and falls back to a local snapshot if NASA is
// unreachable.
//
// `mission` selects which rover's files are served and defaults to msl, so
// /api/rover/waypoints — the URL the Gale workspace requests — behaves exactly
// as it did before this parameter existed.
import { promises as fs } from 'fs';
import path from 'path';

const MISSIONS = {
  // Curiosity (registry D12, D13). Snapshot files keep their original names so
  // snapshots written by scripts/fetch_rover_snapshot.py are still found.
  msl: {
    snapshotDir: ['public', 'data', 'rover'],
    sources: {
      waypoints: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
      traverse: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
    },
  },
  // Perseverance (registry JZ12). NASA publishes no verified dense traverse
  // path for Mars 2020, so only waypoints are served; a request for the
  // traverse is a 404 and the interface reports the path as unavailable.
  m20: {
    snapshotDir: ['public', 'data', 'rover', 'm20'],
    sources: {
      waypoints: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
    },
    // Last resort: the decimated waypoint subset bundled with the project,
    // converted to the GeoJSON shape the client adapter reads. Same data,
    // same provenance (data/traverse.json records its source), fewer records.
    bundled: {
      waypoints: {
        file: ['data', 'traverse.json'],
        convert: (text) => {
          const doc = JSON.parse(text);
          const points = Array.isArray(doc.waypoints) ? doc.waypoints : [];
          return JSON.stringify({
            type: 'FeatureCollection',
            features: points.map((p) => ({
              type: 'Feature',
              properties: { sol: p.sol, lon: p.lon, lat: p.lat, elev_geoid: p.elev },
              geometry: { type: 'Point', coordinates: [p.lon, p.lat, p.elev] },
            })),
          });
        },
      },
    },
  },
};

const DEFAULT_MISSION = 'msl';

export const dynamic = 'force-dynamic';

async function readSnapshot(mission, kind) {
  const file = path.join(process.cwd(), ...mission.snapshotDir, `${kind}.json`);
  const text = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  return { text, date: stat.mtime.toISOString(), origin: 'snapshot' };
}

async function readBundled(mission, kind) {
  const spec = mission.bundled && mission.bundled[kind];
  if (!spec) throw new Error('no bundled copy');
  const file = path.join(process.cwd(), ...spec.file);
  const raw = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  return { text: spec.convert(raw), date: stat.mtime.toISOString(), origin: 'bundled' };
}

export async function GET(request, context) {
  const { kind } = await context.params;
  const missionId = new URL(request.url).searchParams.get('mission') || DEFAULT_MISSION;
  const mission = MISSIONS[missionId];
  if (!mission) return new Response('Unknown rover mission', { status: 404 });
  const url = mission.sources[kind];
  if (!url) return new Response('Unknown rover dataset', { status: 404 });

  try {
    const upstream = await fetch(url, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`NASA responded ${upstream.status}`);
    const text = await upstream.text();
    const parsed = JSON.parse(text); // validate before serving
    if (!parsed || !Array.isArray(parsed.features)) throw new Error('Unexpected file structure');
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-MarsWalk-Origin': 'live',
        'X-MarsWalk-Retrieved': new Date().toISOString(),
        'X-MarsWalk-Source': url,
      },
    });
  } catch (liveError) {
    for (const read of [readSnapshot, readBundled]) {
      try {
        const local = await read(mission, kind);
        return new Response(local.text, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-MarsWalk-Origin': local.origin,
            'X-MarsWalk-Retrieved': local.date,
            'X-MarsWalk-Source': url,
          },
        });
      } catch (e) {
        /* try the next fallback */
      }
    }
    return Response.json(
      { error: `Could not load ${kind} from NASA (${liveError.message}) and no local copy exists.` },
      { status: 502 }
    );
  }
}
