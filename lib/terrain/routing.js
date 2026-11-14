// Terrain-aware route planning over the crater elevation grid.
//
// What this is
// ------------
// A* over a window of the crater-wide DEM that is already loaded for the
// scene, with 8-connected moves. Two cost models share one search:
//
//   fastest  cost = horizontal distance / speed(slope)
//   safest   cost = horizontal distance / speed(slope), multiplied by a
//                   penalty that rises with slope, and with cells above a
//                   slope limit refused outright
//
// Both therefore follow the ground. Neither is a straight line unless the
// terrain gives no reason to deviate, which the result reports when it happens.
//
// What is measured, what is assumed
// ---------------------------------
//  - Elevation and slope: read from the loaded DEM (Gale D02/D03, Jezero JZ20).
//    Slope is central differences over one grid step, the same method as
//    heightProvider.slope.
//  - Cells with no data are impassable. Nothing is interpolated across a gap.
//  - Drive rate: NOT invented. The default comes from the rover's own record —
//    the along-track distance of the loaded waypoints divided by the sols they
//    span (see paceFromWaypoints). The caller may override it.
//  - Slope limits and the slope-speed curve ARE assumptions. They are declared
//    in DEFAULT_ASSUMPTIONS, carried on every result, shown in the interface
//    and adjustable there. They are not published rover specifications.
//
// Nothing here is crater-specific: every value comes from the grid and the
// assumptions passed in.
import { M_PER_DEG } from '@/lib/mars/constants-core';
import { getFrame } from '@/lib/mars/activeCrater';
import { greatCircleMeters } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';

const DEG = 180 / Math.PI;

/**
 * Assumptions the route planner cannot read from data. Every one of these is a
 * modelling choice, is shown to the viewer, and can be changed there.
 */
export const DEFAULT_ASSUMPTIONS = {
  // Metres per sol on ground the rover would call easy. The planner replaces
  // this with the loaded rover's own historical pace when that is available.
  paceMPerSol: 100,
  paceSource: 'assumed',
  // Slope above which a cell is refused by the safest model, degrees.
  safeSlopeLimitDeg: 15,
  // Slope above which a cell is refused by BOTH models, degrees. Beyond this
  // the planner will not route at all rather than propose an ascent it has no
  // basis to call possible.
  hardSlopeLimitDeg: 30,
  // Slope at which the assumed pace has halved, degrees. Shapes the
  // slope-speed curve: speed = pace / (1 + (slope / halfSpeedSlopeDeg)^2).
  halfSpeedSlopeDeg: 10,
  // How strongly the safest model avoids steep ground. 0 makes it identical to
  // the fastest model; larger values buy flatter ground with extra distance.
  safetyWeight: 6,
};

/** Colours shared by the panel, the legend, the markers and the 3D lines. */
export const START_COLOR = '#e8884a';
export const END_COLOR = '#6cb6f5';

/** The two cost models, for the interface to list. */
export const ROUTE_MODES = [
  {
    id: 'fastest',
    label: 'Fastest',
    color: '#e8884a',
    description: 'Least travel time at the assumed pace. Climbs where climbing is quicker.',
  },
  {
    id: 'safest',
    label: 'Safest',
    color: '#5fd0a0',
    description: 'Avoids steep ground, accepting extra distance. Refuses cells above the slope limit.',
  },
];

/**
 * Mean along-track pace from the rover record already loaded, in metres per
 * sol. This is measured data, not an assumption: the distance is the sum of
 * great-circle steps between consecutive waypoints and the time is the sols
 * they span. Returns null when there is no usable record.
 */
export function paceFromWaypoints(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  const sols = last.sol - first.sol;
  if (!(sols > 0)) return null;
  // Prefer the mission's own odometry when the file carries it.
  if (last.distTotalM != null && first.distTotalM != null && last.distTotalM > first.distTotalM) {
    return {
      paceMPerSol: (last.distTotalM - first.distTotalM) / sols,
      paceSource: 'odometry',
      basis: `${(last.distTotalM - first.distTotalM) / 1000 >= 1 ? ((last.distTotalM - first.distTotalM) / 1000).toFixed(1) + ' km' : Math.round(last.distTotalM - first.distTotalM) + ' m'} of recorded driving over sols ${first.sol}–${last.sol}`,
    };
  }
  let metres = 0;
  for (let i = 1; i < waypoints.length; i++) {
    metres += greatCircleMeters(waypoints[i - 1].lon, waypoints[i - 1].lat, waypoints[i].lon, waypoints[i].lat);
  }
  if (!(metres > 0)) return null;
  return {
    paceMPerSol: metres / sols,
    paceSource: 'waypoint track',
    basis: `${(metres / 1000).toFixed(1)} km between waypoints over sols ${first.sol}–${last.sol}`,
  };
}

/* ------------------------------------------------------------------ grid --- */

/**
 * A square window of the loaded crater grid, decimated so the search stays
 * interactive, with slope precomputed per cell.
 *
 * `stride` is chosen so the node count stays under `maxNodes`; the effective
 * cell size is reported so the interface can state the resolution the route
 * was actually planned at.
 */
export function buildCostGrid({ a, b, maxNodes = 90000, padFraction = 0.35 }) {
  const grid = heightProvider.craterSample;
  if (!grid) return null;

  const padLon = Math.max(Math.abs(b.lon - a.lon) * padFraction, grid.dx * 8);
  const padLat = Math.max(Math.abs(b.lat - a.lat) * padFraction, grid.dy * 8);
  const west = Math.max(grid.west, Math.min(a.lon, b.lon) - padLon);
  const east = Math.min(grid.east, Math.max(a.lon, b.lon) + padLon);
  const north = Math.min(grid.north, Math.max(a.lat, b.lat) + padLat);
  const south = Math.max(grid.south, Math.min(a.lat, b.lat) - padLat);

  const i0 = Math.max(0, Math.floor((west - grid.west) / grid.dx));
  const i1 = Math.min(grid.width - 1, Math.ceil((east - grid.west) / grid.dx));
  const j0 = Math.max(0, Math.floor((grid.north - north) / grid.dy));
  const j1 = Math.min(grid.height - 1, Math.ceil((grid.north - south) / grid.dy));

  const fullW = i1 - i0 + 1;
  const fullH = j1 - j0 + 1;
  if (fullW < 2 || fullH < 2) return null;

  const stride = Math.max(1, Math.ceil(Math.sqrt((fullW * fullH) / maxNodes)));
  const w = Math.floor((fullW - 1) / stride) + 1;
  const h = Math.floor((fullH - 1) / stride) + 1;

  const dx = grid.dx * stride;
  const dy = grid.dy * stride;
  const cellLon = grid.west + (i0 + 0.5) * grid.dx;
  const cellLat = grid.north - (j0 + 0.5) * grid.dy;

  const elev = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = grid.value(i0 + x * stride, j0 + y * stride);
      elev[y * w + x] = Number.isNaN(v) ? NaN : v;
    }
  }

  // Metres per cell step. Longitude shrinks with latitude, as in the projection.
  const stepX = dx * M_PER_DEG * getFrame().cos0;
  const stepY = dy * M_PER_DEG;

  // Slope per cell by central differences over one cell step, in degrees.
  // Cells on the window edge, and cells beside missing data, get NaN and are
  // treated as impassable rather than guessed.
  const slope = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (Number.isNaN(elev[k]) || x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        slope[k] = NaN;
        continue;
      }
      const e = elev[k + 1];
      const we = elev[k - 1];
      const n = elev[k - w];
      const s = elev[k + w];
      if (Number.isNaN(e) || Number.isNaN(we) || Number.isNaN(n) || Number.isNaN(s)) {
        slope[k] = NaN;
        continue;
      }
      const dzdx = (e - we) / (2 * stepX);
      const dzdy = (n - s) / (2 * stepY);
      slope[k] = Math.atan(Math.hypot(dzdx, dzdy)) * DEG;
    }
  }

  const toCell = (lon, lat) => {
    const x = Math.round((lon - cellLon) / dx);
    const y = Math.round((cellLat - lat) / dy);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    return { x, y };
  };
  const toLonLat = (x, y) => ({ lon: cellLon + x * dx, lat: cellLat - y * dy });

  return {
    w,
    h,
    elev,
    slope,
    stepX,
    stepY,
    stride,
    cellMetres: (stepX + stepY) / 2,
    nativeResM: grid.resM,
    datasetId: grid.datasetId,
    bounds: { west: cellLon, east: cellLon + (w - 1) * dx, north: cellLat, south: cellLat - (h - 1) * dy },
    toCell,
    toLonLat,
  };
}

/* ------------------------------------------------------------------- A* --- */

// Binary min-heap keyed by f. Small and allocation-light; a sorted array would
// dominate the run time on a 300x300 window.
class Heap {
  constructor() {
    this.k = [];
    this.v = [];
  }
  get size() {
    return this.k.length;
  }
  push(key, value) {
    const { k, v } = this;
    k.push(key);
    v.push(value);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop() {
    const { k, v } = this;
    const top = v[0];
    const lastK = k.pop();
    const lastV = v.pop();
    if (k.length) {
      k[0] = lastK;
      v[0] = lastV;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

// Sols per metre of horizontal travel on ground of this slope.
const timePerMetre = (slopeDeg, as) => {
  const speed = as.paceMPerSol / (1 + (slopeDeg / as.halfSpeedSlopeDeg) ** 2);
  return 1 / Math.max(speed, 1e-6);
};

function searchAStar(cg, start, goal, mode, as) {
  const { w, h, slope } = cg;
  const n = w * h;
  const limit = mode === 'safest' ? Math.min(as.safeSlopeLimitDeg, as.hardSlopeLimitDeg) : as.hardSlopeLimitDeg;

  const passable = (k) => !Number.isNaN(slope[k]) && slope[k] <= limit;

  const g = new Float64Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);

  // The cheapest conceivable time per metre: flat ground at the assumed pace.
  // Multiplying straight-line distance by it keeps the heuristic admissible,
  // so A* returns the optimal path for the cost model it was given.
  const best = timePerMetre(0, as);
  const hx = (x, y) => Math.hypot((x - goal.x) * cg.stepX, (y - goal.y) * cg.stepY) * best;

  const sk = start.y * w + start.x;
  const gk = goal.y * w + goal.x;
  g[sk] = 0;
  const open = new Heap();
  open.push(hx(start.x, start.y), sk);

  let expanded = 0;
  while (open.size) {
    const k = open.pop();
    if (closed[k]) continue;
    closed[k] = 1;
    expanded++;
    if (k === gk) break;
    const x = k % w;
    const y = (k - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (closed[nk] || !passable(nk)) continue;
        // Diagonal moves may not cut a corner between two refused cells.
        if (dx && dy && !(passable(y * w + nx) || passable(ny * w + x))) continue;
        const seg = Math.hypot(dx * cg.stepX, dy * cg.stepY);
        const sMid = (slope[k] + slope[nk]) / 2;
        let cost = seg * timePerMetre(sMid, as);
        if (mode === 'safest') {
          // Rises from 1 on flat ground to 1 + safetyWeight at the limit, so
          // the search trades distance for gentler ground.
          cost *= 1 + as.safetyWeight * (sMid / limit) ** 2;
        }
        const ng = g[k] + cost;
        if (ng < g[nk]) {
          g[nk] = ng;
          from[nk] = k;
          open.push(ng + hx(nx, ny), nk);
        }
      }
    }
  }

  if (!Number.isFinite(g[gk])) return { cells: null, expanded };
  const cells = [];
  for (let k = gk; k !== -1; k = from[k]) {
    const x = k % w;
    cells.push({ x, y: (k - x) / w });
    if (k === sk) break;
  }
  cells.reverse();
  return { cells, expanded };
}

/* -------------------------------------------------------------- profile --- */

/**
 * Elevation along a polyline, sampled from whatever dataset covers each point.
 * Shape matches what ProfileChart already reads: [{ d, h }], d in metres.
 * Gaps stay gaps.
 */
export function profileAlong(points, samples = 220) {
  if (!points || points.length < 2) return { points: [], totalM: 0, sources: [] };
  const seg = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += greatCircleMeters(points[i - 1].lon, points[i - 1].lat, points[i].lon, points[i].lat);
    seg.push(total);
  }
  const sources = new Set();
  const out = [];
  const n = Math.max(2, samples);
  for (let i = 0; i <= n; i++) {
    const d = (total * i) / n;
    // Walk to the segment containing d.
    let k = 1;
    while (k < seg.length - 1 && seg[k] < d) k++;
    const span = seg[k] - seg[k - 1];
    const t = span > 0 ? (d - seg[k - 1]) / span : 0;
    const lon = points[k - 1].lon + (points[k].lon - points[k - 1].lon) * t;
    const lat = points[k - 1].lat + (points[k].lat - points[k - 1].lat) * t;
    const s = heightProvider.sample(lon, lat);
    if (s) sources.add(s.datasetId);
    out.push({ d, h: s ? s.h : null, lon, lat });
  }
  return { points: out, totalM: total, sources: [...sources] };
}

/**
 * Statistics for one route. Gain and loss are summed over the sampled profile,
 * so they depend on the sampling interval; the interval is reported.
 */
export function routeStats(profile, assumptions) {
  const as = assumptions;
  const pts = profile.points.filter((p) => p.h !== null);
  if (pts.length < 2) {
    return { distanceM: profile.totalM, incomplete: true, coverage: pts.length / Math.max(1, profile.points.length) };
  }
  let min = Infinity;
  let max = -Infinity;
  let gain = 0;
  let loss = 0;
  let maxSlope = 0;
  let slopeSum = 0;
  let slopeCount = 0;
  let sols = 0;
  for (let i = 0; i < pts.length; i++) {
    min = Math.min(min, pts[i].h);
    max = Math.max(max, pts[i].h);
    if (i === 0) continue;
    const dh = pts[i].h - pts[i - 1].h;
    const dd = pts[i].d - pts[i - 1].d;
    if (dh > 0) gain += dh;
    else loss -= dh;
    if (dd > 0.5) {
      const slope = (Math.atan2(Math.abs(dh), dd) * 180) / Math.PI;
      maxSlope = Math.max(maxSlope, slope);
      slopeSum += slope;
      slopeCount++;
      sols += dd * timePerMetre(slope, as);
    }
  }
  return {
    distanceM: profile.totalM,
    minElevM: min,
    maxElevM: max,
    gainM: gain,
    lossM: loss,
    netM: pts[pts.length - 1].h - pts[0].h,
    avgSlopeDeg: slopeCount ? slopeSum / slopeCount : null,
    maxSlopeDeg: slopeCount ? maxSlope : null,
    travelSols: sols,
    sampleSpacingM: profile.totalM / Math.max(1, profile.points.length - 1),
    slopeBasis: `profile samples ${(profile.totalM / Math.max(1, profile.points.length - 1)).toFixed(0)} m apart`,
    coverage: pts.length / Math.max(1, profile.points.length),
    incomplete: pts.length < profile.points.length,
  };
}

/* ----------------------------------------------------------------- plan --- */

const sampleAt = (lon, lat) => {
  const s = heightProvider.sample(lon, lat);
  return s ? s.h : null;
};

/**
 * Plans both routes between two points.
 *
 * Returns { routes: { fastest, safest }, direct, grid, assumptions, notes }.
 * Every route carries `points` (lon/lat/elev), `profile`, `stats` and its own
 * `notes` — including the reason it could not be planned, when that happens.
 * Never throws: an impossible route is reported, not invented.
 */
export function planRoutes({ a, b, waypoints, assumptions, maxNodes } = {}) {
  const pace = paceFromWaypoints(waypoints);
  const as = {
    ...DEFAULT_ASSUMPTIONS,
    ...(pace ? { paceMPerSol: pace.paceMPerSol, paceSource: pace.paceSource, paceBasis: pace.basis } : {}),
    ...(assumptions || {}),
  };
  const notes = [];

  // The straight line between the two points: the measurement, and the
  // reference every route is compared against.
  const directProfile = profileAlong([a, b], 240);
  const direct = {
    id: 'direct',
    points: [a, b],
    profile: directProfile,
    stats: routeStats(directProfile, as),
  };

  const cg = buildCostGrid({ a, b, maxNodes });
  if (!cg) {
    return {
      routes: {},
      direct,
      grid: null,
      assumptions: as,
      notes: ['No elevation grid is loaded, so no terrain-aware route can be planned. Only the direct line is available.'],
    };
  }
  if (cg.stride > 1) {
    notes.push(
      `Planned on a ${Math.round(cg.cellMetres)} m grid (every ${cg.stride}${cg.stride === 2 ? 'nd' : cg.stride === 3 ? 'rd' : 'th'} cell of the ${Math.round(cg.nativeResM)} m DEM) to keep the search interactive.`
    );
  } else {
    notes.push(`Planned on the full ${Math.round(cg.cellMetres)} m DEM grid.`);
  }

  const ca = cg.toCell(a.lon, a.lat);
  const cb = cg.toCell(b.lon, b.lat);
  const blocked = [];
  if (!ca || Number.isNaN(cg.slope[ca.y * cg.w + ca.x])) blocked.push('start');
  if (!cb || Number.isNaN(cg.slope[cb.y * cg.w + cb.x])) blocked.push('end');
  if (blocked.length) {
    return {
      routes: {},
      direct,
      grid: cg,
      assumptions: as,
      notes: [
        ...notes,
        `The ${blocked.join(' and ')} ${blocked.length > 1 ? 'points sit' : 'point sits'} where the elevation dataset has no coverage, so there is no terrain to route over. Pick a point inside the covered area, or read the direct line instead.`,
      ],
    };
  }

  const routes = {};
  for (const mode of ROUTE_MODES) {
    const t0 = Date.now();
    const { cells, expanded } = searchAStar(cg, ca, cb, mode.id, as);
    const ms = Date.now() - t0;
    if (!cells) {
      routes[mode.id] = {
        id: mode.id,
        label: mode.label,
        color: mode.color,
        points: null,
        notes: [
          mode.id === 'safest'
            ? `No route stays under ${as.safeSlopeLimitDeg}° the whole way. Raise the slope limit, or use the fastest route and read its maximum slope.`
            : `No route under ${as.hardSlopeLimitDeg}° connects these points across the covered terrain. They may be separated by a gap in the dataset.`,
        ],
        expanded,
        ms,
      };
      continue;
    }
    // Cell centres, with the exact endpoints kept so the drawn route starts and
    // ends where the viewer put it.
    const pts = cells.map((c) => {
      const { lon, lat } = cg.toLonLat(c.x, c.y);
      return { lon, lat, elev: cg.elev[c.y * cg.w + c.x] };
    });
    pts[0] = { lon: a.lon, lat: a.lat, elev: a.elev ?? sampleAt(a.lon, a.lat) };
    pts[pts.length - 1] = { lon: b.lon, lat: b.lat, elev: b.elev ?? sampleAt(b.lon, b.lat) };
    // Measured along the cells the search actually chose, so the slope figures
    // are the quantity the slope limit was applied to, and the travel time is
    // the model's own cost without the safety penalty folded in.
    const walk = walkCells(cg, cells, as);
    const simplified = simplify(pts, cg.cellMetres * 0.25);
    const profile = profileAlong(simplified, 240);
    routes[mode.id] = {
      id: mode.id,
      label: mode.label,
      color: mode.color,
      points: simplified,
      profile,
      stats: { ...routeStats(profile, as), ...walk },
      cellCount: cells.length,
      expanded,
      ms,
      notes: [],
    };
  }

  // The two models can legitimately agree.
  const f = routes.fastest;
  const s = routes.safest;
  if (f && s && f.points && s.points) {
    const same = Math.abs(f.stats.distanceM - s.stats.distanceM) < cg.cellMetres && f.cellCount === s.cellCount;
    if (same) {
      notes.push('Both models chose the same line: on this terrain there is no gentler alternative worth the extra distance.');
    }
  }

  return { routes, direct, grid: cg, assumptions: as, notes };
}

/**
 * Along-cell measurements for a planned route: travel time at the assumed
 * pace with no safety penalty, horizontal distance, and the slope statistics
 * read from the DEM cells themselves.
 */
function walkCells(cg, cells, as) {
  let sols = 0;
  let distance = 0;
  let maxSlope = 0;
  let slopeSum = 0;
  let steepCells = 0;
  for (let i = 1; i < cells.length; i++) {
    const p = cells[i - 1];
    const q = cells[i];
    const kp = p.y * cg.w + p.x;
    const kq = q.y * cg.w + q.x;
    const seg = Math.hypot((q.x - p.x) * cg.stepX, (q.y - p.y) * cg.stepY);
    const sMid = (cg.slope[kp] + cg.slope[kq]) / 2;
    distance += seg;
    sols += seg * timePerMetre(sMid, as);
    maxSlope = Math.max(maxSlope, cg.slope[kq]);
    slopeSum += cg.slope[kq];
    if (cg.slope[kq] > as.safeSlopeLimitDeg) steepCells++;
  }
  maxSlope = Math.max(maxSlope, cg.slope[cells[0].y * cg.w + cells[0].x]);
  return {
    travelSols: sols,
    cellDistanceM: distance,
    avgSlopeDeg: cells.length > 1 ? slopeSum / (cells.length - 1) : cg.slope[cells[0].y * cg.w + cells[0].x],
    maxSlopeDeg: maxSlope,
    // Cells the safest model would refuse. Zero on a route it produced.
    steepCells,
    slopeBasis: `DEM cell slope over a ${Math.round(2 * cg.cellMetres)} m baseline`,
  };
}

// Drops points that lie within `tolM` of the line between their neighbours, so
// long straight runs across flat ground become two points instead of hundreds.
// Geometry is unchanged beyond the tolerance.
function simplify(points, tolM) {
  if (points.length < 3) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const q = out[out.length - 1];
    const r = points[i + 1];
    const cross =
      (r.lon - q.lon) * (p.lat - q.lat) - (r.lat - q.lat) * (p.lon - q.lon);
    const len = Math.hypot(r.lon - q.lon, r.lat - q.lat) || 1e-12;
    const devM = (Math.abs(cross) / len) * M_PER_DEG;
    if (devM > tolM) out.push(p);
  }
  out.push(points[points.length - 1]);
  return out;
}
