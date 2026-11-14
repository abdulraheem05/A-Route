import missions from '@/data/missions.json';
import objects from '@/data/science-objects.json';
import catalog from '@/data/panorama-catalog.json';
import traverse from '@/data/traverse.json';
import sources from '@/data/sources.json';
import { buildWorld } from './world.js';

export const WORLD = buildWorld({ missions, objects, catalog, traverse });
export const SOURCES = sources;
export const MISSIONS = missions;
export const PANORAMAS = catalog;
export const PANORAMA_BY_ID = Object.fromEntries(catalog.map((p) => [p.id, p]));
export const OBJECT_BY_ID = Object.fromEntries(objects.map((o) => [o.id, o]));

export function sourceList(ids = []) {
  return ids.map((id) => ({ id, ...(sources[id] || { citation: id, url: null }) }));
}
