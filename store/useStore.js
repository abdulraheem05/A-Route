import { create } from 'zustand';

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

  // --- measurement -----------------------------------------------------
  measure: { active: false, points: [] },
  toggleMeasure: () => set((s) => ({ measure: { active: !s.measure.active, points: [] } })),
  addMeasurePoint: (p) =>
    set((s) => {
      const pts = s.measure.points.length >= 2 ? [p] : [...s.measure.points, p];
      return { measure: { ...s.measure, points: pts }, infoOpen: true, infoTab: 'selection' };
    }),
  clearMeasure: () => set((s) => ({ measure: { ...s.measure, points: [] } })),
}));
