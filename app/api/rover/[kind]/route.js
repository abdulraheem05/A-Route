// Server-side adapter for NASA's Curiosity localisation files (registry D12, D13).
// These endpoints are undocumented, so the app never hot-links them from the
// browser: it fetches here, and falls back to a local snapshot written by
// scripts/fetch_rover_snapshot.py if NASA is unreachable.
import { promises as fs } from 'fs';
import path from 'path';

const SOURCES = {
  waypoints: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
  traverse: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
};

export const dynamic = 'force-dynamic';

async function readSnapshot(kind) {
  const file = path.join(process.cwd(), 'public', 'data', 'rover', `${kind}.json`);
  const text = await fs.readFile(file, 'utf8');
  const stat = await fs.stat(file);
  return { text, date: stat.mtime.toISOString() };
}

export async function GET(_request, context) {
  const { kind } = await context.params;
  const url = SOURCES[kind];
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
    try {
      const snap = await readSnapshot(kind);
      return new Response(snap.text, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-MarsWalk-Origin': 'snapshot',
          'X-MarsWalk-Retrieved': snap.date,
          'X-MarsWalk-Source': url,
        },
      });
    } catch (snapError) {
      return Response.json(
        { error: `Could not load ${kind} from NASA (${liveError.message}) and no local snapshot exists.` },
        { status: 502 }
      );
    }
  }
}
