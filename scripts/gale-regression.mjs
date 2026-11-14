// Gale regression check.
//
//   node --import ./scripts/register-alias.mjs scripts/gale-regression.mjs
//   node --import ./scripts/register-alias.mjs scripts/gale-regression.mjs --check
//
// Without --check it prints a JSON dump of everything the Gale workspace
// computes from its configuration and datasets: the projection over a grid of
// points (as IEEE-754 hex, so a one-bit change shows), tile ranges for every
// Trek layer and zoom, elevation sampling and slope over a synthetic raster,
// waypoint and traverse parsing including the records that must be rejected,
// landmark resolution, the dataset registry, and the weather adapter. It also
// asserts the camera framing, imagery zooms, detail levels and data URLs that
// used to be literals inside the components.
//
// A final Jezero section records what Jezero's configuration implies — its
// projection, camera framing, tile coverage, DEM grid, and the bundled
// Perseverance waypoints and landmarks through the real adapters.
//
// With --check it compares that dump against scripts/gale-regression.expected.json
// and exits non-zero on any difference. Regenerate the expectation ONLY when a
// change to Gale is intended:
//
//   node --import ./scripts/register-alias.mjs scripts/gale-regression.mjs > scripts/gale-regression.expected.json
//
// Everything imported here is plain library code — no React, no WebGL — so it
// runs in Node without a build step.
import fs from 'node:fs';
import * as proj from '@/lib/coordinates/projection';
import gale from '@/lib/mars/craters/gale';
import jezero from '@/lib/mars/craters/jezero';
import { listCraters } from '@/lib/mars/craters';
import { setActiveCrater } from '@/lib/mars/activeCrater';
import { resolveLandmarks as resolveLandmarksFor } from '@/lib/data/landmarks';
import bundledTraverse from '@/data/traverse.json';
import * as consts from '@/lib/mars/constants';
import * as trek from '@/lib/data/trekAdapter';
import { HeightGrid } from '@/lib/terrain/heightGrid';
import { heightProvider } from '@/lib/terrain/heightProvider';
import * as rover from '@/lib/data/roverAdapter';
import { resolveLandmarks, waypointIndexAtSol } from '@/lib/data/landmarks';
import { STRAT_UNITS, UNIT_NOTE } from '@/lib/data/units';
import { DATASETS, UNAVAILABLE_LAYERS, EVIDENCE } from '@/lib/data/registry';
import { parseWeather } from '@/lib/data/weatherAdapter';

const out = {};
const hex = (n) => (Number.isFinite(n) ? Buffer.from(Float64Array.of(n).buffer).toString('hex') : String(n));

// ---- constants -------------------------------------------------------
out.constants = {
  MARS_RADIUS_M: consts.MARS_RADIUS_M,
  M_PER_DEG: hex(consts.M_PER_DEG),
  SCENE_UNIT_M: consts.SCENE_UNIT_M,
  NODATA: consts.NODATA,
  GALE: consts.GALE,
  HIRISE_BOUNDS: consts.HIRISE_BOUNDS,
  MSL_DEM_BOUNDS: consts.MSL_DEM_BOUNDS,
  ORIGIN: { lon: hex(consts.ORIGIN.lon), lat: hex(consts.ORIGIN.lat) },
  BRADBURY: consts.BRADBURY,
};

// ---- projection, over a grid spanning the display region --------------
const pts = [];
for (let i = 0; i <= 8; i++) {
  for (let j = 0; j <= 8; j++) {
    pts.push([
      consts.GALE.west + ((consts.GALE.east - consts.GALE.west) * i) / 8,
      consts.GALE.south + ((consts.GALE.north - consts.GALE.south) * j) / 8,
    ]);
  }
}
pts.push([137.441633, -4.589467], [137.7, -5.0], [137.85, -5.08]);

out.projection = pts.map(([lon, lat]) => {
  const [x, z] = proj.lonLatToXZ(lon, lat);
  const [blon, blat] = proj.xzToLonLat(x, z);
  return {
    x: hex(x),
    z: hex(z),
    backLon: hex(blon),
    backLat: hex(blat),
    planar: hex(proj.planarMeters(137.441633, -4.589467, lon, lat)),
    gc: hex(proj.greatCircleMeters(137.441633, -4.589467, lon, lat)),
    y1: hex(proj.elevToY(-4500.971, 1)),
    y3: hex(proj.elevToY(-4500.971, 3.5)),
    fmt: `${proj.formatLat(lat, 5)} ${proj.formatLon(lon, 5)}`,
  };
});
out.kmPerDegLat = hex(proj.KM_PER_DEG_LAT);
out.parse = ['-4.59, 137.44', '4.59S 137.44E', '4.59 S, 222.56 W', 'nonsense', '', '91, 10'].map((t) =>
  JSON.stringify(proj.parseLatLon(t))
);
out.boundsOps = {
  inside: proj.inBounds(consts.GALE, 137.4, -4.6),
  outside: proj.inBounds(consts.GALE, 100, 0),
  intersect: proj.intersectBounds(consts.GALE, consts.HIRISE_BOUNDS),
  disjoint: proj.intersectBounds(consts.GALE, { west: 10, east: 11, south: 10, north: 11 }),
  contains: proj.containsBounds(consts.GALE, consts.HIRISE_BOUNDS),
  east360: [proj.toEast360(-10), proj.toEast360(370)].map(hex),
  westToEast: hex(proj.westToEast(222.56)),
};

// ---- Trek layers and tiling -------------------------------------------
const layers = trek.TREK_LAYERS || trek.trekLayers();
out.trekLayers = Object.fromEntries(
  Object.entries(layers).map(([k, l]) => [
    k,
    { key: l.key, id: l.id, datasetId: l.datasetId, label: l.label, maxZoom: l.maxZoom, bounds: l.bounds },
  ])
);
out.tiling = {};
for (const [k, l] of Object.entries(layers)) {
  for (const z of [7, 9, 12, 14, 16]) {
    out.tiling[`${k}@${z}`] = {
      range: trek.tileRange(l.bounds, z),
      bounds: trek.tileBounds(z, 100, 200),
      degPerPixel: hex(trek.degPerPixel(z)),
      metersPerPixel: hex(trek.metersPerPixel(z)),
      url: trek.tileUrl(l, z, 3, 4),
    };
  }
}
out.tilePx = trek.TILE_PX;

// ---- elevation grid and provider --------------------------------------
const W = 40;
const H = 32;
const data = new Float32Array(W * H);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    // deterministic synthetic relief, with a NODATA hole
    data[j * W + i] = i === 5 && j === 5 ? consts.NODATA : -4500 + i * 13.5 - j * 7.25 + ((i * j) % 7);
  }
}
const grid = new HeightGrid({
  data,
  width: W,
  height: H,
  west: consts.GALE.west,
  north: consts.GALE.north,
  dx: (consts.GALE.east - consts.GALE.west) / W,
  dy: (consts.GALE.north - consts.GALE.south) / H,
  datasetId: 'D02',
});
out.grid = {
  east: hex(grid.east),
  south: hex(grid.south),
  resM: hex(grid.resM),
  texelMetersX: hex(grid.texelMetersX),
  texelMetersY: hex(grid.texelMetersY),
  centreBounds: Object.fromEntries(Object.entries(grid.centreBounds()).map(([k, v]) => [k, hex(v)])),
  samples: pts.map(([lon, lat]) => hex(grid.sample(lon, lat))),
};

heightProvider.setCrater({ sample: grid, render: grid, meta: { dataset_id: 'D02' } });
out.provider = {
  hasData: heightProvider.hasData(),
  craterMeta: heightProvider.craterMeta,
  sample: pts.map(([lon, lat]) => {
    const s = heightProvider.sample(lon, lat);
    return s ? { h: hex(s.h), datasetId: s.datasetId, resM: hex(s.resM) } : null;
  }),
  slope: pts.map(([lon, lat]) => {
    const s = heightProvider.slope(lon, lat);
    return s ? { deg: hex(s.deg), aspect: hex(s.aspect), baselineM: hex(s.baselineM), datasetId: s.datasetId } : null;
  }),
};

// ---- rover adapter -----------------------------------------------------
const wpFeatures = [];
for (let n = 0; n < 24; n++) {
  wpFeatures.push({
    properties: {
      sol: 3 + n * 17,
      lon: 137.4 + n * 0.004,
      lat: -4.6 - n * 0.003,
      elev_geoid: -4500 + n * 3,
      RMC: `${n}_0`,
      site: n,
      drive: 0,
      dist_m: n * 1.5,
      dist_total_m: n * 120,
      roll: 1.1,
      pitch: -2.2,
      yaw: 90 + n,
      tilt: 3.3,
      drive_type: 'Drive',
    },
    geometry: { coordinates: [137.4 + n * 0.004, -4.6 - n * 0.003, -4500 + n * 3] },
  });
}
// records that must be rejected: out of bounds, missing sol, bad coords
wpFeatures.push({ properties: { sol: 5, lon: 10, lat: 10 }, geometry: { coordinates: [10, 10] } });
wpFeatures.push({ properties: { lon: 137.4, lat: -4.6 }, geometry: { coordinates: [137.4, -4.6] } });
wpFeatures.push({ properties: { sol: 9, lon: 'x', lat: 'y' }, geometry: {} });

const parsedWp = rover.parseWaypoints({ features: wpFeatures });
out.waypoints = { rejected: parsedWp.rejected, count: parsedWp.waypoints.length, list: parsedWp.waypoints };

const line = [];
for (let n = 0; n < 24; n++) {
  for (let k = 0; k < 6; k++) {
    line.push([137.4 + n * 0.004 + k * 0.0006, -4.6 - n * 0.003 - k * 0.0004, -4500 + n * 3]);
  }
}
const tr = rover.parseTraverse({
  features: [
    { geometry: { type: 'LineString', coordinates: line } },
    { geometry: { type: 'MultiLineString', coordinates: [[[137.5, -4.7, -4490], [137.51, -4.71, -4489]]] } },
    { geometry: { type: 'LineString', coordinates: [[10, 10, 0], [11, 11, 0]] } },
  ],
});
out.traverse = {
  verts: tr.verts.length,
  breaks: [...tr.breaks],
  lengthM: hex(tr.lengthM),
  first: tr.verts[0],
  last: tr.verts[tr.verts.length - 1],
};
const join = rover.joinWaypointsToTraverse(parsedWp.waypoints, tr);
out.join = { ok: join.ok, matched: join.matched, fraction: hex(join.fraction), idx: [...join.idx] };
out.nearest = pts.slice(0, 10).map(([lon, lat]) => {
  const n = rover.nearestWaypoint(parsedWp.waypoints, lon, lat);
  return n ? { index: n.index, distanceM: hex(n.distanceM) } : null;
});

// ---- landmarks ---------------------------------------------------------
out.landmarks = resolveLandmarks(parsedWp.waypoints);
out.landmarksNoRover = resolveLandmarks([]);
out.waypointIndexAtSol = [0, 3, 4, 20, 100, 400, 99999].map((s) => waypointIndexAtSol(parsedWp.waypoints, s));

// ---- static science content -------------------------------------------
out.stratUnits = STRAT_UNITS;
out.unitNote = UNIT_NOTE;
// Gale's own registry entries are the D-numbered ones defined in
// lib/data/registry.js. Other craters merge their entries into the same
// dictionary, so this is filtered to Gale's: a new crater must not change,
// remove or shadow any of them.
const galeIds = Object.keys(DATASETS).filter((id) => /^D\d+$/.test(id)).sort();
out.datasetIds = galeIds;
out.datasets = Object.fromEntries(galeIds.map((id) => [id, DATASETS[id]]));
out.unavailableLayers = UNAVAILABLE_LAYERS;
out.evidence = EVIDENCE;

// ---- weather adapter ---------------------------------------------------
out.weather = (() => {
  const feed = {
    descriptions: { x: 'y' },
    soles: [
      { sol: '10', terrestrial_date: '2012-08-16', ls: '155', season: 'Month 6', min_temp: '-70', max_temp: '-5',
        min_gts_temp: '-80', max_gts_temp: '10', pressure: '880', pressure_string: 'Higher', atmo_opacity: 'Sunny',
        local_uv_irradiance_index: 'Moderate', sunrise: '05:30', sunset: '17:22', wind_speed: '--',
        wind_direction: '--', abs_humidity: '--' },
      { sol: '9', terrestrial_date: '2012-08-15', min_temp: '--', max_temp: null, pressure: 'x' },
      { sol: null, min_temp: '-1' },
    ],
  };
  const w = parseWeather(feed);
  return { records: w.records, bySol: [...w.bySol.keys()], anyWind: w.anyWind, descriptions: w.descriptions };
})();

// ---- values that used to be literals inside Gale's components ---------
// These are asserted rather than dumped, so the failure names the value.
out.galeConfig = (() => {
  const c = gale;
  return {
    id: c.id,
    name: c.name,
    shortLabel: c.shortLabel,
    searchRegionLabel: c.searchRegionLabel,
    searchExample: c.searchExample,
    bounds: c.bounds,
    origin: { lon: hex(c.origin.lon), lat: hex(c.origin.lat) },
    view: c.view,
    terrain: c.terrain,
    imageryKeys: Object.keys(c.imagery.layers).sort(),
    baseLayerKey: c.imagery.baseLayerKey,
    baseZoom: c.imagery.baseZoom,
    basePreviewZoom: c.imagery.basePreviewZoom,
    detailCtxZoom: c.imagery.detailCtxZoom,
    detailOverlayKey: c.imagery.detailOverlayKey,
    detailLevels: c.detailLevels,
    layers: Object.fromEntries(
      Object.entries(c.imagery.layers).map(([k, l]) => [
        k,
        { id: l.id, datasetId: l.datasetId, label: l.label, shortLabel: l.shortLabel, ext: l.ext, maxZoom: l.maxZoom, bounds: l.bounds },
      ])
    ),
    rover: {
      id: c.rover.id,
      name: c.rover.name,
      waypointsUrl: c.rover.waypointsUrl,
      traverseUrl: c.rover.traverseUrl,
      waypointDatasetId: c.rover.waypointDatasetId,
      traverseDatasetId: c.rover.traverseDatasetId,
      landingSite: c.rover.landingSite,
      landedText: c.rover.landedText,
      bounds: c.rover.bounds,
    },
    weather: c.weather,
    geology: { note: c.geology.note, intro: c.geology.intro, polygonsLockNote: c.geology.polygonsLockNote, polygonsNote: c.geology.polygonsNote, unitCount: c.geology.units.length },
    prepareCommand: c.prepareCommand,
    registryDoc: c.registryDoc,
    overview: c.overview,
    playHeading: c.playHeading,
    playNote: c.playNote,
  };
})();

// ---- Jezero ------------------------------------------------------------
// Everything Jezero's configuration implies, computed with Jezero active.
// This section is about Jezero only: it must never be able to move a Gale
// value, which is why it runs last, after every Gale value above is recorded.
out.jezero = (() => {
  setActiveCrater(jezero);
  const c = jezero;
  const r = {};

  r.config = {
    id: c.id,
    bounds: c.bounds,
    origin: { lon: hex(c.origin.lon), lat: hex(c.origin.lat) },
    view: c.view,
    terrain: c.terrain,
    baseLayerKey: c.imagery.baseLayerKey,
    baseZoom: c.imagery.baseZoom,
    basePreviewZoom: c.imagery.basePreviewZoom,
    detailCtxZoom: c.imagery.detailCtxZoom,
    detailOverlayKey: c.imagery.detailOverlayKey,
    detailLevels: c.detailLevels,
    layers: Object.fromEntries(
      Object.entries(c.imagery.layers).map(([k, l]) => [
        k,
        { id: l.id, datasetId: l.datasetId, ext: l.ext, maxZoom: l.maxZoom, bounds: l.bounds },
      ])
    ),
    rover: {
      id: c.rover.id,
      name: c.rover.name,
      waypointsUrl: c.rover.waypointsUrl,
      traverseUrl: c.rover.traverseUrl,
      landingSite: c.rover.landingSite,
      bounds: c.rover.bounds,
    },
    weather: c.weather,
    geologyUnitCount: c.geology.units.length,
    unavailableLayerCount: c.unavailableLayers.length,
    datasetIds: Object.keys(c.datasets).sort(),
  };

  // The display region must equal the CTX mosaic footprint: that is the rule
  // that makes elevation and imagery cover the same ground.
  r.boundsMatchCtxFootprint =
    JSON.stringify(c.bounds) === JSON.stringify(c.imagery.layers.ctx.bounds);

  // The projection must now be Jezero's, not Gale's.
  r.projection = {
    originAtZero: proj.lonLatToXZ(c.origin.lon, c.origin.lat).map(hex),
    landing: proj.lonLatToXZ(c.rover.landingSite.lon, c.rover.landingSite.lat).map(hex),
    home: proj.lonLatToXZ(c.view.home.lon, c.view.home.lat).map(hex),
    corners: [
      [c.bounds.west, c.bounds.north],
      [c.bounds.east, c.bounds.south],
    ].map(([lon, lat]) => proj.lonLatToXZ(lon, lat).map(hex)),
    roundTrip: (() => {
      const [x, z] = proj.lonLatToXZ(c.rover.landingSite.lon, c.rover.landingSite.lat);
      const [lon, lat] = proj.xzToLonLat(x, z);
      return { dLon: hex(lon - c.rover.landingSite.lon), dLat: hex(lat - c.rover.landingSite.lat) };
    })(),
    kmPerDegLon: hex(proj.kmPerDegLon()),
  };

  // Opening camera: where it sits and how far it is from the target, so the
  // framing of the 45 km crater is recorded rather than described.
  r.camera = (() => {
    const [tx, tz] = proj.lonLatToXZ(c.view.home.lon, c.view.home.lat);
    const { dx, y, dz } = c.view.start;
    return {
      target: [hex(tx), hex(0), hex(tz)],
      position: [hex(tx + dx), hex(y), hex(tz + dz)],
      distanceKm: hex(Math.hypot(dx, y, dz)),
      fitDistanceKm: c.view.fitDistanceKm,
    };
  })();

  // Tile coverage: how many tiles each pass asks Trek for. A wrong bound or
  // zoom shows up here as an absurd count.
  r.tiles = {};
  for (const [k, layer] of Object.entries(c.imagery.layers)) {
    for (const z of [c.imagery.basePreviewZoom, c.imagery.baseZoom, layer.maxZoom]) {
      const zz = Math.min(z, layer.maxZoom);
      const range = trek.tileRange(layer.bounds, zz);
      r.tiles[`${k}@${zz}`] = {
        range,
        count: (range.c1 - range.c0 + 1) * (range.r1 - range.r0 + 1),
        metersPerPixel: hex(trek.metersPerPixel(zz)),
        url: trek.tileUrl(layer, zz, range.r0, range.c0),
      };
    }
  }

  // What a detail patch actually asks for at each level, centred on the
  // landing site: the base pass, and whether the high-resolution overlay
  // footprint is reached at all (if it never intersects, no overlay appears).
  r.detailPatches = c.detailLevels.map((level) => {
    const grid = level.size / 4;
    const lonC = Math.round(c.rover.landingSite.lon / grid) * grid;
    const latC = Math.round(c.rover.landingSite.lat / grid) * grid;
    const b = proj.intersectBounds(
      {
        west: lonC - level.size / 2,
        east: lonC + level.size / 2,
        south: latC - level.size / 2,
        north: latC + level.size / 2,
      },
      c.bounds
    );
    const overlay = c.imagery.detailOverlayKey ? c.imagery.layers[c.imagery.detailOverlayKey] : null;
    const tilesAt = (layer, z) => {
      const area = proj.intersectBounds(b, layer.bounds);
      if (!area) return 0;
      const rng = trek.tileRange(area, Math.min(z, layer.maxZoom));
      return (rng.c1 - rng.c0 + 1) * (rng.r1 - rng.r0 + 1);
    };
    return {
      level: level.name,
      sizeKm: hex((level.size * consts.M_PER_DEG) / 1000),
      spacingM: hex((level.size / 256) * consts.M_PER_DEG),
      baseTiles: tilesAt(c.imagery.layers[c.imagery.baseLayerKey], c.imagery.detailCtxZoom),
      overlayZoom: level.overlayZoom,
      overlayReaches: !!(overlay && level.overlayZoom && proj.intersectBounds(b, overlay.bounds)),
      overlayTiles: overlay && level.overlayZoom ? tilesAt(overlay, level.overlayZoom) : 0,
    };
  });

  // The crater-wide grid the prepared DEM will produce at 100 m, and which
  // level the renderer picks under the vertex budget.
  r.grid = (() => {
    const step = 100 / consts.M_PER_DEG;
    const w = Math.ceil((c.bounds.east - c.bounds.west) / step);
    const h = Math.ceil((c.bounds.north - c.bounds.south) / step);
    const levels = [];
    let lw = w;
    let lh = h;
    let k = 0;
    while (k === 0 || (lw > 64 && lh > 64)) {
      levels.push({ level: k, width: lw, height: lh, verts: lw * lh, resM: 100 * 2 ** k });
      lw = Math.floor(lw / 2);
      lh = Math.floor(lh / 2);
      k++;
      if (k > 8) break;
    }
    const render = levels.find((l) => l.verts <= c.terrain.maxRenderVerts) || levels[levels.length - 1];
    return { stepDeg: hex(step), levels, renderLevel: render.level, renderVerts: render.verts };
  })();

  // The bundled Perseverance waypoints, through the same adapter the browser
  // uses, with the same conversion the API route applies.
  r.rover = (() => {
    const features = bundledTraverse.waypoints.map((p) => ({
      type: 'Feature',
      properties: { sol: p.sol, lon: p.lon, lat: p.lat, elev_geoid: p.elev },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat, p.elev] },
    }));
    const parsed = rover.parseWaypoints({ features }, c.rover.bounds);
    const inside = parsed.waypoints.every((w) => proj.inBounds(c.bounds, w.lon, w.lat));
    const first = parsed.waypoints[0];
    const last = parsed.waypoints[parsed.waypoints.length - 1];
    return {
      bundledCount: bundledTraverse.waypoints.length,
      parsed: parsed.waypoints.length,
      rejected: parsed.rejected,
      allInsideBounds: inside,
      solRange: [first.sol, last.sol],
      firstIsLandingSite:
        Math.abs(first.lon - c.rover.landingSite.lon) < 1e-6 &&
        Math.abs(first.lat - c.rover.landingSite.lat) < 1e-6,
      rmcOfFirst: first.rmc,
      elevRange: [hex(Math.min(...parsed.waypoints.map((w) => w.elev))), hex(Math.max(...parsed.waypoints.map((w) => w.elev)))],
      nearestToLanding: (() => {
        const n = rover.nearestWaypoint(parsed.waypoints, c.rover.landingSite.lon, c.rover.landingSite.lat);
        return { index: n.index, distanceM: hex(n.distanceM) };
      })(),
      waypoints: parsed.waypoints,
    };
  })();

  // Landmarks resolved against those waypoints, positioned the same way
  // Gale's sol-keyed landmarks are.
  r.landmarks = (() => {
    const features = bundledTraverse.waypoints.map((p) => ({
      type: 'Feature',
      properties: { sol: p.sol, lon: p.lon, lat: p.lat, elev_geoid: p.elev },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat, p.elev] },
    }));
    const wps = rover.parseWaypoints({ features }, c.rover.bounds).waypoints;
    const resolved = resolveLandmarksFor(wps, c.landmarks);
    return {
      total: resolved.length,
      fixed: resolved.filter((l) => l.nameClass === 'iau').length,
      solKeyed: resolved.filter((l) => l.resolvedSol != null).length,
      unresolved: c.landmarks.solKeyed.length - resolved.filter((l) => l.resolvedSol != null).length,
      allPositioned: resolved.every((l) => Number.isFinite(l.lon) && Number.isFinite(l.lat)),
      allInsideBounds: resolved.every((l) => proj.inBounds(c.bounds, l.lon, l.lat)),
      list: resolved.map((l) => ({
        id: l.id,
        tier: l.tier,
        nameClass: l.nameClass,
        resolvedSol: l.resolvedSol ?? null,
        lon: hex(l.lon),
        lat: hex(l.lat),
        datasetId: l.datasetId ?? null,
      })),
    };
  })();

  // Registered craters, and the tile-proxy allow-list their layers produce.
  r.registry = {
    craters: listCraters().map((x) => x.id).sort(),
    trekLayerIds: listCraters()
      .flatMap((x) => Object.values((x.imagery && x.imagery.layers) || {}).map((l) => l.id))
      .sort(),
  };

  // Put Gale back, so nothing after this sees Jezero's frame.
  setActiveCrater(gale);
  r.activeAfter = proj.lonLatToXZ(137.441633, -4.589467).map(hex);
  return r;
})();

const json = JSON.stringify(out, null, 1);

if (process.argv.includes('--check')) {
  const file = new URL('./gale-regression.expected.json', import.meta.url);
  let expected;
  try {
    expected = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error('No expectation file. Generate it with:\n  node --import ./scripts/register-alias.mjs scripts/gale-regression.mjs > scripts/gale-regression.expected.json');
    process.exit(2);
  }
  if (json === expected) {
    console.log('Gale regression check: PASS — every probed value matches the recorded baseline.');
    process.exit(0);
  }
  // Report the first differing top-level section, which is enough to locate it.
  const a = JSON.parse(expected);
  const b = out;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  console.error('Gale regression check: FAIL');
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.error(`  changed: ${k}`);
  }
  process.exit(1);
}

process.stdout.write(json);
