// Single source of truth for elevation queries on the CPU: cursor readout,
// picking, rover/landmark placement, profiles and the detail patch all ask here.
// Preference order at a point: rover-region tiles (D01) if loaded, else the
// crater grid (D02 or D03). Nothing is extrapolated outside a dataset.
import { M_PER_DEG, ORIGIN } from '@/lib/mars/constants';

const COS0 = Math.cos((ORIGIN.lat * Math.PI) / 180);
const DEG = 180 / Math.PI;

const state = {
  craterSample: null, // finest crater HeightGrid (CPU sampling)
  craterRender: null, // HeightGrid used for the base mesh
  craterMeta: null,
  rover: null, // RoverTiles
};

export const heightProvider = {
  setCrater({ sample, render, meta }) {
    state.craterSample = sample;
    state.craterRender = render;
    state.craterMeta = meta;
  },
  setRover(tiles) {
    state.rover = tiles;
  },
  get craterRender() {
    return state.craterRender;
  },
  get craterMeta() {
    return state.craterMeta;
  },
  get rover() {
    return state.rover;
  },
  hasData() {
    return !!state.craterSample || !!state.rover;
  },

  // { h (m), datasetId, resM } or null where no elevation dataset covers the point.
  sample(lon, lat) {
    if (state.rover) {
      const r = state.rover.sample(lon, lat);
      if (r) return { h: r.h, datasetId: state.rover.datasetId, resM: r.resM };
    }
    if (state.craterSample) {
      const h = state.craterSample.sample(lon, lat);
      if (!Number.isNaN(h)) {
        return { h, datasetId: state.craterSample.datasetId, resM: state.craterSample.resM };
      }
    }
    return null;
  },

  height(lon, lat) {
    const s = this.sample(lon, lat);
    return s ? s.h : NaN;
  },

  // Slope and aspect by central differences over a baseline equal to twice the
  // grid spacing of the dataset that answered. Aspect = downslope direction,
  // degrees clockwise from north.
  slope(lon, lat) {
    const s = this.sample(lon, lat);
    if (!s) return null;
    const step = s.resM;
    const dLon = step / (M_PER_DEG * COS0);
    const dLat = step / M_PER_DEG;
    const e = this.height(lon + dLon, lat);
    const w = this.height(lon - dLon, lat);
    const n = this.height(lon, lat + dLat);
    const so = this.height(lon, lat - dLat);
    if ([e, w, n, so].some(Number.isNaN)) return null;
    const dzdx = (e - w) / (2 * step); // east
    const dzdy = (n - so) / (2 * step); // north
    const deg = Math.atan(Math.hypot(dzdx, dzdy)) * DEG;
    let aspect = Math.atan2(-dzdx, -dzdy) * DEG;
    if (aspect < 0) aspect += 360;
    return { deg, aspect, baselineM: 2 * step, datasetId: s.datasetId };
  },
};
