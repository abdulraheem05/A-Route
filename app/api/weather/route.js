// Server-side adapter for rover daily weather summaries (Curiosity REMS:
// registry D22).
//
// `mission` defaults to msl, so /api/weather — the URL the Gale workspace
// requests — behaves exactly as it did before this parameter existed.
import { promises as fs } from 'fs';
import path from 'path';

const MISSIONS = {
  msl: {
    feed: 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json',
    // Snapshot file name kept as it was so existing snapshots are found.
    snapshot: 'weather.json',
    // The feed's array of per-sol records.
    recordsKey: 'soles',
  },
};

const DEFAULT_MISSION = 'msl';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const missionId = new URL(request.url).searchParams.get('mission') || DEFAULT_MISSION;
  const mission = MISSIONS[missionId];
  if (!mission) return new Response('Unknown weather source', { status: 404 });

  try {
    const upstream = await fetch(mission.feed, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`NASA responded ${upstream.status}`);
    const text = await upstream.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed[mission.recordsKey])) throw new Error('Unexpected feed structure');
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-MarsWalk-Origin': 'live',
        'X-MarsWalk-Retrieved': new Date().toISOString(),
      },
    });
  } catch (liveError) {
    try {
      const file = path.join(process.cwd(), 'public', 'data', 'rover', mission.snapshot);
      const text = await fs.readFile(file, 'utf8');
      const stat = await fs.stat(file);
      return new Response(text, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-MarsWalk-Origin': 'snapshot',
          'X-MarsWalk-Retrieved': stat.mtime.toISOString(),
        },
      });
    } catch (snapError) {
      return Response.json(
        { error: `Weather feed unavailable (${liveError.message}) and no local snapshot exists.` },
        { status: 502 }
      );
    }
  }
}
