// The crater the scene is currently showing.
//
// Why a module-level holder: the projection, the elevation grids and the
// adapters are plain modules used inside render loops, not React components,
// and they previously read Gale's ORIGIN as a module constant. Keeping the
// derived projection frame in one cached object preserves that cost — the hot
// paths still do a property read and no trigonometry — while letting a second
// crater supply its own origin.
//
// The default is Gale, so any code path that never calls setActiveCrater
// behaves exactly as it did before this existed.
import { MARS_RADIUS_M, M_PER_DEG, SCENE_UNIT_M } from '@/lib/mars/constants-core';
import { defaultCrater } from '@/lib/mars/craters';

const RAD = Math.PI / 180;

function buildFrame(crater) {
  const cos0 = Math.cos(crater.origin.lat * RAD);
  const kmPerDegLat = M_PER_DEG / SCENE_UNIT_M;
  return {
    craterId: crater.id,
    originLon: crater.origin.lon,
    originLat: crater.origin.lat,
    cos0,
    kmPerDegLat,
    kmPerDegLon: kmPerDegLat * cos0,
    radiusM: MARS_RADIUS_M,
  };
}

const state = {
  crater: defaultCrater,
  frame: buildFrame(defaultCrater),
};

export function getActiveCrater() {
  return state.crater;
}

// Projection frame for the active crater. Read, never mutated by callers.
export function getFrame() {
  return state.frame;
}

// Called once by the explorer before the scene mounts. Idempotent: setting the
// crater that is already active changes nothing, so re-renders are free.
export function setActiveCrater(crater) {
  if (!crater || crater === state.crater) return state.crater;
  state.crater = crater;
  state.frame = buildFrame(crater);
  return state.crater;
}
