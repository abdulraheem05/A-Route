// The craters the first-person game can be played in.
//
// Each entry says where its local projection is centred, which terrain files
// it loads, where its campaign databases come from, and how its rover traverse
// is obtained. The shared game reads nothing else about the crater.
import { LANDING } from '@/lib/mars/constants-jezero';
import { BRADBURY_LANDING, GALE_BOUNDS } from '@/lib/mars/craters/gale';
import jezeroMissions from '@/data/missions.json';
import jezeroObjects from '@/data/science-objects.json';
import jezeroCatalog from '@/data/panorama-catalog.json';
import jezeroTraverse from '@/data/traverse.json';
import galeMissions from '@/data/gale-missions.json';
import galeObjects from '@/data/gale-science-objects.json';
import galeCatalog from '@/data/gale-panorama-catalog.json';

export const JEZERO_GAME = {
  id: 'jezero',
  name: 'Jezero Crater',
  shortLabel: 'Jezero crater',
  origin: LANDING,
  terrain: {
    metaUrl: '/terrain/terrain-meta.json',
    heightUrl: '/terrain/jezero-height.u16',
    surfaceUrl: '/terrain/jezero-surface.jpg',
  },
  // Waypoints ship with the project, so this campaign needs no network.
  traverse: { bundled: jezeroTraverse },
  db: { id: 'jezero', missions: jezeroMissions, objects: jezeroObjects, catalog: jezeroCatalog },
  saveKey: 'marswalk-save-v1',
  mapHref: '/explore/jezero/map',
};

export const GALE_GAME = {
  id: 'gale',
  name: 'Gale Crater',
  shortLabel: 'Gale crater',
  origin: BRADBURY_LANDING,
  terrain: {
    metaUrl: '/terrain/gale-terrain-meta.json',
    heightUrl: '/terrain/gale-height.u16',
    surfaceUrl: '/terrain/gale-surface.jpg',
  },
  // No Curiosity waypoint file is bundled; this is the route the map uses.
  traverse: {
    url: '/api/rover/waypoints',
    bounds: GALE_BOUNDS,
    source: 'NASA Curiosity waypoint file (MSL_waypoints.json), via /api/rover/waypoints',
  },
  db: { id: 'gale', missions: galeMissions, objects: galeObjects, catalog: galeCatalog },
  saveKey: 'marswalk-save-gale-v1',
  mapHref: '/explore/gale/map',
};

export const GAME_CRATERS = { jezero: JEZERO_GAME, gale: GALE_GAME };

export function getGameCraterById(id) {
  return GAME_CRATERS[id] || null;
}
