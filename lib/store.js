'use client';
import { create } from 'zustand';
import { LANDING } from './mars/constants-jezero.js';
import { MISSIONS } from './scientific-data/index.js';
import { eventKey, missionProgress } from './missions/index.js';

const SAVE_KEY = 'marswalk-save-v1';
export const DEFAULT_SETTINGS = { quality: 'medium', pace: 10, sensitivity: 1, fov: 68, showTraverse: true, showLabels: true };

function persist(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ missionIndex: state.missionIndex, done: state.done, settings: state.settings, position: { x: state.player.x, z: state.player.z } }));
  } catch (e) { /* storage unavailable: progress simply is not saved */ }
}

export const useGame = create((set, get) => ({
  ready: false,
  started: false,
  paused: false,
  pointerLocked: false,
  mapOpen: false,
  settingsOpen: false,
  noticeOpen: false,
  activeSiteId: null,
  activeItemId: null,
  activePanoramaId: null,
  nearbySiteId: null,
  nearbyDistance: null,
  blocked: null,
  player: { x: 0, z: 0, lat: LANDING.lat, lon: LANDING.lon, elev: LANDING.elev, slope: 0, heading: 300, speed: 0 },
  spawn: null,
  teleportTarget: null,
  route: null,
  missionIndex: 0,
  done: {},
  completion: null,
  allComplete: false,
  settings: { ...DEFAULT_SETTINGS },

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      set({
        missionIndex: Math.min(MISSIONS.length - 1, Math.max(0, s.missionIndex | 0)),
        done: s.done || {},
        settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
        spawn: s.position && isFinite(s.position.x) && isFinite(s.position.z) ? s.position : null,
      });
    } catch (e) { /* ignore corrupt saves */ }
  },
  save() { persist(get()); },
  resetProgress() {
    set({ missionIndex: 0, done: {}, completion: null, allComplete: false, route: null, teleportTarget: { x: 0, z: 6, heading: 300 } });
    persist(get());
  },

  setReady: (ready) => set({ ready }),
  startExploring: () => set({ started: true }),
  returnToStart: () => set({ started: false }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setPaused: (paused) => set({ paused, settingsOpen: paused ? get().settingsOpen : false }),
  setPlayer: (player, nearbySiteId, nearbyDistance, blocked) => set({ player, nearbySiteId, nearbyDistance, blocked }),
  overlayOpen() {
    const s = get();
    return s.mapOpen || !!s.activeSiteId || !!s.activePanoramaId || s.settingsOpen || s.noticeOpen;
  },

  openMap: () => set({ mapOpen: true, activeSiteId: null }),
  closeMap: () => set({ mapOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openNotice: () => set({ noticeOpen: true }),
  closeNotice: () => set({ noticeOpen: false }),
  openSite: (siteId, itemId = null) => set({ activeSiteId: siteId, activeItemId: itemId, mapOpen: false }),
  closeSite: () => set({ activeSiteId: null, activeItemId: null }),
  selectItem: (itemId) => set({ activeItemId: itemId }),
  openPanorama: (id) => { set({ activePanoramaId: id, activeSiteId: null }); get().recordEvent('panorama', id); },
  closePanorama: () => set({ activePanoramaId: null }),
  teleport: (target) => set({ teleportTarget: target, mapOpen: false, activeSiteId: null }),
  clearTeleport: () => set({ teleportTarget: null }),
  setRoute: (route) => set({ route }),
  dismissCompletion: () => set({ completion: null }),
  updateSettings: (patch) => { set({ settings: { ...get().settings, ...patch } }); persist(get()); },

  /** Records an observation and advances the mission when all required objectives are met. */
  recordEvent(type, target) {
    const s = get();
    const key = eventKey(type, target);
    if (s.done[key]) return;
    const done = { ...s.done, [key]: true };
    const mission = MISSIONS[s.missionIndex];
    const before = missionProgress(mission, s.done).complete;
    const after = missionProgress(mission, done).complete;
    const patch = { done };
    if (!before && after) {
      const last = s.missionIndex >= MISSIONS.length - 1;
      patch.completion = { missionId: mission.id, at: Date.now() };
      if (last) patch.allComplete = true; else patch.missionIndex = s.missionIndex + 1;
    }
    set(patch);
    persist(get());
  },
}));
