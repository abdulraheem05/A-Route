// Node checks for the pure library code. Run: npm run test:lib
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { geoToWorld, worldToGeo, distanceM, bearingDeg } from '../lib/coordinates/projection.js';
import { Heightfield } from '../lib/terrain/heightfield.js';
import { analyseRoute } from '../lib/terrain/route.js';
import { buildWorld, positionAtSol, odometerAtSol } from '../lib/scientific-data/world.js';
import { missionProgress, eventKey, nextObjective } from '../lib/missions/index.js';
import { bandForPanorama } from '../lib/panoramas/index.js';
import { LANDING } from '../lib/mars/constants.js';

const J = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const missions = J('../data/missions.json'), objects = J('../data/science-objects.json'), catalog = J('../data/panorama-catalog.json'), traverse = J('../data/traverse.json');
const meta = J('../public/terrain/terrain-meta.json');
const buf = fs.readFileSync(new URL('../public/terrain/jezero-height.u16', import.meta.url));
const hf = new Heightfield(meta, new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2));

// projection round trip
const w = geoToWorld(77.40595178, 18.45869497); const g = worldToGeo(w.x, w.z);
assert.ok(Math.abs(g.lon - 77.40595178) < 1e-9 && Math.abs(g.lat - 18.45869497) < 1e-9);
assert.ok(Math.abs(distanceM(LANDING, { lon: 77.40595178, lat: 18.45869497 }) - Math.hypot(w.x, w.z)) < 1e-6);
console.log('landing -> Wildcat Ridge:', Math.round(Math.hypot(w.x, w.z)), 'm, bearing', Math.round(bearingDeg(LANDING, { lon: 77.40595178, lat: 18.45869497 })));

// heightfield vs rover elevations
let se = 0, n = 0, worst = 0;
for (const p of traverse.waypoints) { if (p.sol > 1250) continue; const e = hf.elevationGeo(p.lon, p.lat) - p.elev; se += e * e; n++; worst = Math.max(worst, Math.abs(e)); }
console.log('heightfield vs rover (floor+fan): RMS', Math.sqrt(se / n).toFixed(1), 'm, worst', worst.toFixed(0), 'm');
assert.ok(Math.sqrt(se / n) < 25);
assert.ok(hf.inBounds(0, 0) && !hf.inBounds(1e6, 0));
console.log('landing elevation estimate', hf.elevation(0, 0).toFixed(1), 'slope', hf.slopeDeg(0, 0).toFixed(2));
let maxS = 0; for (let i = 0; i < 20000; i++) { const x = hf.bounds.xMin + Math.random() * (hf.bounds.xMax - hf.bounds.xMin), z = hf.bounds.zMin + Math.random() * (hf.bounds.zMax - hf.bounds.zMin); maxS = Math.max(maxS, hf.slopeDeg(x, z)); }
console.log('max slope over 20k random points', maxS.toFixed(1), 'deg');

// world model
const world = buildWorld({ missions, objects, catalog, traverse });
console.log('sites', world.sites.length, 'items', world.items.length, 'unplaced', world.unplaced.map((u) => u.id).join(','));
assert.equal(positionAtSol(traverse.waypoints, 3).uncertaintyM, 0);
assert.ok(world.sites.every((s) => hf.inBounds(s.x, s.z)));
assert.ok(odometerAtSol(world.track, 2006) > 30000);
console.log('bundled traverse length', (odometerAtSol(world.track, 99999) / 1000).toFixed(1), 'km');
for (const m of missions) for (const o of m.objectives) assert.ok(world.itemById[o.target], o.target);

// missions: completing required objectives in order unlocks each mission
let done = {};
for (const m of missions) {
  assert.equal(missionProgress(m, done).complete, false);
  for (const o of m.objectives.filter((o) => o.required)) { assert.ok(nextObjective(m, done)); done[eventKey(o.type, o.target)] = true; }
  assert.equal(missionProgress(m, done).complete, true);
}
// route
const r = analyseRoute(hf, { x: 0, z: 0 }, w);
console.log('route to Wildcat Ridge: gain', r.gain.toFixed(0), 'loss', r.loss.toFixed(0), 'max slope', r.maxSlope.toFixed(1), 'walk', (r.walkSeconds / 60).toFixed(0), 'min');
assert.ok(Math.abs(r.horizontal - Math.hypot(w.x, w.z)) < 1e-6);
// panorama bands
for (const p of catalog) if (p.projection) { const b = bandForPanorama(p); assert.ok(b.elBottomDeg >= -90.001 && b.elTopDeg <= 90 && b.thetaStart >= 0 && b.thetaStart + b.thetaLength <= Math.PI + 1e-6, p.id); }
console.log('all library checks passed');
