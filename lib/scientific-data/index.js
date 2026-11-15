// The placed world for the crater the game is in.
//
// These are live bindings, not frozen constants: setGameWorld swaps them when
// a different crater's game mounts, and every module that imports them reads
// the current value. The crater is chosen once per route, before the game
// mounts, so nothing re-reads them mid-frame expecting the old one.
//
// Jezero's databases are the default, so a code path that never calls
// setGameWorld sees exactly what it saw before this existed.
import jezeroMissions from '@/data/missions.json';
import jezeroObjects from '@/data/science-objects.json';
import jezeroCatalog from '@/data/panorama-catalog.json';
import jezeroTraverse from '@/data/traverse.json';
import sources from '@/data/sources.json';
import { buildWorld } from './world.js';

export const SOURCES = sources;

/** Databases for one crater's campaign. */
export const JEZERO_DB = {
  id: 'jezero',
  missions: jezeroMissions,
  objects: jezeroObjects,
  catalog: jezeroCatalog,
  traverse: jezeroTraverse,
};

export let WORLD = buildWorld(JEZERO_DB);
export let MISSIONS = jezeroMissions;
export let PANORAMAS = jezeroCatalog;
export let PANORAMA_BY_ID = Object.fromEntries(jezeroCatalog.map((p) => [p.id, p]));
export let OBJECT_BY_ID = Object.fromEntries(jezeroObjects.map((o) => [o.id, o]));

let currentId = 'jezero';

/** The crater whose databases are currently loaded. */
export function currentWorldId() {
  return currentId;
}

/**
 * Loads one crater's campaign. Call before the game mounts.
 *
 * `db` is { id, missions, objects, catalog, traverse }. The traverse must be
 * real rover waypoints: the world places every site from them, so a crater
 * without them has no world and this throws rather than inventing positions.
 */
export function setGameWorld(db) {
  if (!db || db.id === currentId) return WORLD;
  if (!db.traverse || !Array.isArray(db.traverse.waypoints) || !db.traverse.waypoints.length) {
    throw new Error(`No rover waypoints for ${db.id}: sites cannot be placed without them.`);
  }
  WORLD = buildWorld(db);
  MISSIONS = db.missions;
  PANORAMAS = db.catalog;
  PANORAMA_BY_ID = Object.fromEntries(db.catalog.map((p) => [p.id, p]));
  OBJECT_BY_ID = Object.fromEntries(db.objects.map((o) => [o.id, o]));
  currentId = db.id;
  return WORLD;
}

export function sourceList(ids = []) {
  return ids.map((id) => ({ id, ...(sources[id] || { citation: id, url: null }) }));
}
