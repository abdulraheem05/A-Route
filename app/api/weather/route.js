// Server-side adapter for the Curiosity REMS daily summary feed (registry D22).
import { promises as fs } from 'fs';
import path from 'path';

const FEED_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const upstream = await fetch(FEED_URL, { cache: 'no-store' });
    if (!upstream.ok) throw new Error(`NASA responded ${upstream.status}`);
    const text = await upstream.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.soles)) throw new Error('Unexpected feed structure');
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
      const file = path.join(process.cwd(), 'public', 'data', 'rover', 'weather.json');
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
