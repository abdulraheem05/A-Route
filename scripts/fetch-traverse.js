#!/usr/bin/env node
/**
 * Replaces data/traverse.json with EVERY official Perseverance waypoint.
 * Needs internet once; the app itself then runs offline.
 *
 *   npm run fetch:traverse
 *   node scripts/fetch-traverse.js path/to/M20_waypoints.json   (use a file you downloaded yourself)
 *
 * NOT exercised against the live service in the build environment (no network there);
 * the parsing logic follows the field names observed in the file (sol, lon, lat, elev_geoid).
 */
const fs = require('fs');
const path = require('path');
const URL_ = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';
const OUT = path.join(__dirname, '..', 'data', 'traverse.json');

async function main() {
  const local = process.argv[2];
  let geo;
  if (local) geo = JSON.parse(fs.readFileSync(local, 'utf8'));
  else {
    console.log('Downloading', URL_);
    const res = await fetch(URL_);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    geo = await res.json();
  }
  const seen = new Set();
  const waypoints = [];
  for (const f of geo.features || []) {
    const p = f.properties || {};
    const sol = Number(p.sol), lon = Number(p.lon), lat = Number(p.lat), elev = Number(p.elev_geoid);
    if (![sol, lon, lat, elev].every(Number.isFinite)) continue;
    const key = `${sol}|${lon.toFixed(7)}|${lat.toFixed(7)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    waypoints.push({ sol, lon, lat, elev: Math.round(elev * 100) / 100 });
  }
  if (waypoints.length < 50) throw new Error(`Only ${waypoints.length} usable waypoints found; refusing to overwrite.`);
  // keep file order (drive order); a stable sort by sol guards against out-of-order features
  waypoints.sort((a, b) => a.sol - b.sol);
  fs.writeFileSync(OUT, JSON.stringify({
    source: 'NASA/JPL-Caltech Mars 2020 mission waypoints (M20_waypoints.json, mars.nasa.gov/mmgis-maps)',
    resolution: 'full',
    note: `All ${waypoints.length} official end-of-drive waypoints, fetched ${new Date().toISOString().slice(0, 10)}. Legs between waypoints are drawn straight.`,
    elevationDatum: 'elev_geoid (m)',
    waypoints,
  }));
  console.log(`Wrote ${waypoints.length} waypoints (sols ${waypoints[0].sol}-${waypoints[waypoints.length - 1].sol}) to data/traverse.json`);
  console.log('Station positions are resolved from this file at runtime, so they sharpen automatically. Restart `npm run dev`.');
}
main().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
