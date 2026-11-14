import { create } from 'zustand';

// State that belongs to the crater currently being explored, rather than to the
// session. Kept in one place so switching crater can clear exactly this much
// and leave the viewer's own display preferences alone.
const craterScopedState = () => ({
  terrain: { status: 'loading', meta: null, roverMeta: null, error: null },
  imagery: { requested: 0, drawn: 0, done: false },
  patch: null,
  cursor: null,
  selection: null,
  rover: {
    status: 'loading',
    origin: null,
    retrieved: null,
    waypoints: [],
    traverse: null,
    join: null,
    rejected: 0,
    error: null,
  },
  sol: null,
  weather: { status: 'loading', origin: null, retrieved: null, records: [], bySol: new Map(), anyWind: false, error: null },
  plan: {
    mode: 'terrain',
    picking: null,
    start: null,
    end: null,
    result: null,
    computing: false,
    error: null,
    active: 'fastest',
    show: { fastest: true, safest: true },
    overrides: {},
    profileCursor: null,
  },
});

export const useStore = create((set, get) => ({
  // --- terrain ---------------------------------------------------------
  // status: loading | ready | missing (no prepared DEM -> flat reference surface) | error
  terrain: { status: 'loading', meta: null, roverMeta: null, error: null },
  terrainVersion: 0,
  bumpTerrain: () => set((s) => ({ terrainVersion: s.terrainVersion + 1 })),
  setTerrain: (patch) => set((s) => ({ terrain: { ...s.terrain, ...patch } })),

  // --- layers ----------------------------------------------------------
  baseLayer: 'ctx', // 'ctx' | 'none'
  hirise: true,
  overlays: { hillshade: false, elevation: false, slope: false, contours: false },
  overlayOpacity: 0.65,
  contourInterval: 200, // metres
  exaggeration: 1,
  show: { traverse: true, waypoints: true, landmarks: true, drillSites: true },
  imagery: { requested: 0, drawn: 0, done: false },
  patch: null, // { level, imagery, zoom, sizeKm, heightSource, magnified }

  setBaseLayer: (baseLayer) => set({ baseLayer }),
  toggleOverlay: (k) => set((s) => ({ overlays: { ...s.overlays, [k]: !s.overlays[k] } })),
  toggleShow: (k) => set((s) => ({ show: { ...s.show, [k]: !s.show[k] } })),
  setValue: (k, v) => set({ [k]: v }),

  // --- interface -------------------------------------------------------
  sidebarOpen: true,
  infoOpen: true,
  infoTab: 'selection', // selection | weather | units
  datasetInfo: null,

  // --- pointer / selection --------------------------------------------
  cursor: null, // { lon, lat, elev, datasetId, resM }
  selection: null, // { type: 'point' | 'waypoint' | 'landmark', ... }
  camera: { dist: 250, azimuth: 0, polar: 0.8 },
  // Set once the WebGL context exists, from Viewport's onCreated. The loading
  // gate waits on this rather than guessing from the camera, whose distance
  // has a starting value before any frame has been drawn.
  rendererReady: false,
  select: (selection) => set({ selection, infoOpen: true, infoTab: 'selection' }),

  // --- rover -----------------------------------------------------------
  rover: {
    status: 'loading', // loading | ready | error
    origin: null, // live | snapshot
    retrieved: null,
    waypoints: [],
    traverse: null,
    join: null,
    rejected: 0,
    error: null,
  },
  sol: null,
  setRover: (patch) => set((s) => ({ rover: { ...s.rover, ...patch } })),
  setSol: (sol) => set({ sol }),

  // --- weather ---------------------------------------------------------
  weather: { status: 'loading', origin: null, retrieved: null, records: [], bySol: new Map(), anyWind: false, error: null },
  setWeather: (patch) => set((s) => ({ weather: { ...s.weather, ...patch } })),

  // --- measure & plan ---------------------------------------------------
  // One pair of points serves both the measurement (the direct line between
  // them) and route planning. `picking` is which end the next terrain click
  // sets; `mode` is how the viewer is choosing points.
  plan: {
    mode: 'terrain', // 'terrain' | 'known'
    picking: null, // null | 'start' | 'end'
    start: null, // { lon, lat, elev, label, kind }
    end: null,
    result: null, // { routes, direct, notes, assumptions, gridInfo } from planRoutes
    computing: false,
    error: null,
    active: 'fastest', // which route the stats and profile describe
    show: { fastest: true, safest: true },
    overrides: {}, // viewer's changes to the planning assumptions
    profileCursor: null, // { d, lon, lat, h } while hovering the profile
  },
  setPlan: (patch) => set((s) => ({ plan: { ...s.plan, ...patch } })),
  setPlanMode: (mode) => set((s) => ({ plan: { ...s.plan, mode, picking: null } })),

  // Opens the panel on Measure & Plan and arms the next terrain click.
  startPicking: (which) =>
    set((s) => ({
      plan: { ...s.plan, mode: 'terrain', picking: which },
      infoOpen: true,
      infoTab: 'plan',
    })),
  stopPicking: () => set((s) => ({ plan: { ...s.plan, picking: null } })),

  // Sets one end. Any computed routes are dropped: they describe the old pair.
  setPlanPoint: (which, point) =>
    set((s) => {
      const next = { ...s.plan, [which]: point, result: null, error: null, profileCursor: null };
      // Picking a start with no end yet moves straight on to the end, which is
      // what someone laying out a route almost always wants next.
      next.picking = which === 'start' && !s.plan.end ? 'end' : null;
      return { plan: next, infoOpen: true, infoTab: 'plan' };
    }),
  clearPlanPoint: (which) =>
    set((s) => ({ plan: { ...s.plan, [which]: null, result: null, error: null, profileCursor: null } })),
  clearPlan: () =>
    set((s) => ({
      plan: { ...s.plan, start: null, end: null, result: null, error: null, picking: null, profileCursor: null },
    })),

  setPlanResult: (result) => set((s) => ({ plan: { ...s.plan, result, computing: false, error: null } })),
  setPlanComputing: (computing) => set((s) => ({ plan: { ...s.plan, computing } })),
  setPlanError: (error) => set((s) => ({ plan: { ...s.plan, error, computing: false } })),
  setActiveRoute: (active) => set((s) => ({ plan: { ...s.plan, active } })),
  toggleRouteVisible: (id) =>
    set((s) => ({ plan: { ...s.plan, show: { ...s.plan.show, [id]: !s.plan.show[id] } } })),
  // Changing an assumption invalidates the routes it was used to compute.
  setPlanOverride: (key, value) =>
    set((s) => ({ plan: { ...s.plan, overrides: { ...s.plan.overrides, [key]: value }, result: null } })),
  resetPlanOverrides: () => set((s) => ({ plan: { ...s.plan, overrides: {}, result: null } })),
  setProfileCursor: (profileCursor) => set((s) => ({ plan: { ...s.plan, profileCursor } })),

  // --- crater switching -------------------------------------------------
  resetCraterState: () => set(craterScopedState()),
}));
