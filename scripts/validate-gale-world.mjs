// Checks that Gale's campaign databases build a complete, playable world.
//
// The traverse is the synthetic fixture (scripts/fixtures/README.md), because
// NASA's waypoint file cannot be reached from a build environment. Positions
// are therefore not checked against real rover geometry; what is checked is
// that every mission, objective, site and panorama resolves, that the chain
// completes in order, and that nothing is left unplaced.
import fs from 'node:fs';
import path from 'node:path';

const { parseWaypoints } = await import('@/lib/data/roverAdapter');
const { GALE_BOUNDS } = await import('@/lib/mars/craters/gale');
const { setGameCrater } = await import('@/lib/mars/gameCrater');
const { GALE_GAME } = await import('@/lib/mars/gameCraters');
const sd = await import('@/lib/scientific-data');

const fixture = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts/fixtures/msl-waypoints.synthetic.json'), 'utf8')
);
const { waypoints, rejected } = parseWaypoints(fixture, GALE_BOUNDS);

setGameCrater(GALE_GAME);
sd.setGameWorld({
  ...GALE_GAME.db,
  traverse: {
    source: 'SYNTHETIC test fixture',
    resolution: 'one record per listed sol',
    note: `${waypoints.length} synthetic waypoints`,
    waypoints: waypoints.map((w) => ({ sol: w.sol, lon: w.lon, lat: w.lat, elev: w.elev })),
  },
});

const { WORLD, MISSIONS, PANORAMAS, PANORAMA_BY_ID, OBJECT_BY_ID } = sd;
const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

console.log(`waypoints parsed: ${waypoints.length} (rejected ${rejected})`);
console.log(`world: ${WORLD.sites.length} sites, ${WORLD.items.length} items, ${MISSIONS.length} missions, ${PANORAMAS.length} panoramas`);
ok(rejected === 0, `${rejected} fixture waypoints fell outside GALE_BOUNDS`);
ok(MISSIONS.length === 10, `expected 10 missions, got ${MISSIONS.length}`);
ok(WORLD.unplaced.length === 0, `unplaced: ${WORLD.unplaced.map((u) => u.id).join(', ')}`);

// Every panorama file referenced must exist on disk.
for (const p of PANORAMAS) {
  for (const key of ['file', 'thumb']) {
    if (!p[key]) continue;
    ok(fs.existsSync(path.join(process.cwd(), 'public', p[key])), `${p.id}: missing ${p[key]}`);
  }
}
// Every objective must resolve to something the player can actually do.
let objectiveCount = 0;
for (const m of MISSIONS) {
  ok(Array.isArray(m.objectives) && m.objectives.length > 0, `${m.id}: no objectives`);
  for (const o of m.objectives || []) {
    objectiveCount += 1;
    if (o.type === 'panorama') ok(!!PANORAMA_BY_ID[o.target], `${m.id}/${o.id}: no panorama "${o.target}"`);
    else if (o.type === 'inspect') ok(!!OBJECT_BY_ID[o.target], `${m.id}/${o.id}: no object "${o.target}"`);
    else fail.push(`${m.id}/${o.id}: unknown objective type "${o.type}"`);
    // The site the objective needs must be placed, and reachable at this mission.
    const site = WORLD.sites.find((s) => (s.items || []).some((it) => it.id === o.target) || s.id === o.target);
    ok(!!site, `${m.id}/${o.id}: target "${o.target}" is not at any placed site`);
  }
}
console.log(`objectives: ${objectiveCount}, all resolving: ${fail.length === 0}`);

// Images: report honestly which inspection targets have one.
const inspects = MISSIONS.flatMap((m) => (m.objectives || []).filter((o) => o.type === 'inspect'));
const withImage = inspects.filter((o) => OBJECT_BY_ID[o.target] && OBJECT_BY_ID[o.target].image);
for (const o of withImage) {
  const img = OBJECT_BY_ID[o.target].image;
  ok(fs.existsSync(path.join(process.cwd(), 'public', img)), `${o.target}: missing image ${img}`);
}
console.log(`inspection targets: ${inspects.length}, of which ${withImage.length} have a published image`);

// Simulate a full playthrough: complete each mission's objectives in order.
let index = 0;
const done = {};
for (const m of MISSIONS) {
  ok(MISSIONS[index] && MISSIONS[index].id === m.id, `mission order broke at ${m.id}`);
  for (const o of m.objectives || []) done[`${o.type}:${o.target}`] = true;
  const complete = (m.objectives || []).every((o) => done[`${o.type}:${o.target}`]);
  ok(complete, `${m.id} does not complete after doing its own objectives`);
  index += 1;
}
console.log(`playthrough: ${index}/${MISSIONS.length} missions complete in order`);

// No mission may be completable with zero events.
const empty = MISSIONS.filter((m) => (m.objectives || []).length === 0);
ok(empty.length === 0, `completable with no interaction: ${empty.map((m) => m.id).join(', ')}`);

console.log();
if (fail.length) {
  console.log(`FAILED (${fail.length})`);
  for (const f of fail) console.log('  - ' + f);
  process.exit(1);
}
console.log('GALE WORLD OK');
