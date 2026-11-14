// Single source of truth for elevation queries on the CPU: cursor readout,
// picking, rover/landmark placement, profiles and the detail patch all ask here.
// Preference order at a point: the rover-region tiles if loaded (Gale: D01),
// else the crater-wide grid (Gale: D02 or D03). Nothing is extrapolated
// outside a dataset, and nothing here is specific to one crater.
import { M_PER_DEG } from '@/lib/mars/constants-core';
import { getFrame } from '@/lib/mars/activeCrater';

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
  // Drops every loaded grid. Called when a different crater's explorer mounts
  // so one crater's elevation can never answer a query about another.
  reset() {
    state.craterSample = null;
    state.craterRender = null;
    state.craterMeta = null;
    state.rover = null;
  },
  get craterRender() {
    return state.craterRender;
  },
  // Finest crater grid. Route planning reads it directly, because it needs the
  // raster itself (cell values and spacing) rather than a point sample.
  get craterSample() {
    return state.craterSample;
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
    const dLon = step / (M_PER_DEG * getFrame().cos0);
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
