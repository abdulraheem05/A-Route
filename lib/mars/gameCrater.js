// The crater the first-person game is currently in.
//
// The game's projection, world model, heightfield and saved progress were all
// written for Jezero and read its landing site as a module constant. They now
// read it from here, which caches the derived frame so the hot paths still do
// a property read and no trigonometry.
//
// The default is Jezero, so any code path that never calls setGameCrater
// behaves exactly as it did before this existed.
import { MARS_RADIUS_M, LANDING } from '@/lib/mars/constants-jezero';

const D2R = Math.PI / 180;

/**
 * A game crater: where its local projection is centred, which terrain files it
 * loads, and which science databases describe it.
 */
function buildFrame(origin) {
  const cos0 = Math.cos(origin.lat * D2R);
  return {
    origin,
    cos0,
    mPerDegLat: MARS_RADIUS_M * D2R,
    mPerDegLon: MARS_RADIUS_M * D2R * cos0,
  };
}

const JEZERO_GAME = {
  id: 'jezero',
  name: 'Jezero Crater',
  origin: LANDING,
  terrain: { metaUrl: '/terrain/terrain-meta.json', heightUrl: '/terrain/jezero-height.u16', surfaceUrl: '/terrain/jezero-surface.jpg' },
  saveKey: 'marswalk-save-v1',
};

const state = {
  crater: JEZERO_GAME,
  frame: buildFrame(JEZERO_GAME.origin),
};

export const DEFAULT_GAME_CRATER = JEZERO_GAME;

export function getGameCrater() {
  return state.crater;
}

export function getGameFrame() {
  return state.frame;
}

/** Called once before the game mounts. Idempotent. */
export function setGameCrater(crater) {
  if (!crater || crater === state.crater) return state.crater;
  state.crater = crater;
  state.frame = buildFrame(crater.origin);
  return state.crater;
}
