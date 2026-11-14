#!/usr/bin/env node
/**
 * Converts a real Jezero DEM GeoTIFF into the height grid MarsWalk loads, replacing the
 * preview-derived estimate.
 *
 *   npm run prepare:terrain -- path/to/dem.tif [--stride 1] [--lat-ts N] [--lon0 N]
 *                                              [--bounds lonMin,lonMax,latMin,latMax]
 *
 * Recommended input (USGS Astrogeology):
 *   "Mars 2020 Science Investigation CTX DEM Mosaic" (20 m, 4456 x 5067, covers the whole crater and rim)
 *   or JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif (smaller area, lat-ts 0).
 *
 * The file must be in an Equirectangular projection. Standard parallel and centre longitude are read
 * from the GeoTIFF's GeoKeys; override with --lat-ts / --lon0, or give --bounds directly.
 *
 * STATUS: written against the `geotiff` package API but NOT run in the build environment
 * (no network, no GeoTIFF available there). Check the printed extent against the product page.
 */
const fs = require('fs');
const path = require('path');
const R = 3396190;

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) { console.error('Usage: npm run prepare:terrain -- <dem.tif> [--stride 1] [--lat-ts N] [--bounds a,b,c,d]'); process.exit(1); }
  const { fromFile } = await import('geotiff');
  const tiff = await fromFile(file);
  const image = await tiff.getImage();
  const W = image.getWidth(), H = image.getHeight();
  const stride = Math.max(1, parseInt(arg('stride', '1'), 10));
  const keys = image.getGeoKeys() || {};
  const fromKey = (...names) => { for (const n of names) if (Number.isFinite(keys[n])) return keys[n]; return undefined; };
  const keyLatTs = fromKey('ProjStdParallel1GeoKey', 'ProjStdParallelGeoKey');
  const keyLon0 = fromKey('ProjNatOriginLongGeoKey', 'ProjCenterLongGeoKey', 'ProjStraightVertPoleLongGeoKey');
  const keyFalseE = fromKey('ProjFalseEastingGeoKey') || 0;
  const keyFalseN = fromKey('ProjFalseNorthingGeoKey') || 0;
  const radius = fromKey('GeogSemiMajorAxisGeoKey') || R;
  const latTsDeg = arg('lat-ts') != null ? parseFloat(arg('lat-ts')) : keyLatTs != null ? keyLatTs : 0;
  const lon0 = arg('lon0') != null ? parseFloat(arg('lon0')) : keyLon0 != null ? keyLon0 : 0;
  const latTs = (latTsDeg * Math.PI) / 180;
  console.log(`Projection: standard parallel ${latTsDeg}° (${arg('lat-ts') != null ? 'flag' : keyLatTs != null ? 'GeoTIFF' : 'default'}), centre longitude ${lon0}°, radius ${radius} m`);
  let bounds;
  if (arg('bounds')) {
    const [lonMin, lonMax, latMin, latMax] = arg('bounds').split(',').map(Number);
    bounds = { lonMin, lonMax, latMin, latMax };
  } else {
    const [bx0, by0, bx1, by1] = image.getBoundingBox(); // projected metres
    const toLon = (x) => lon0 + ((x - keyFalseE) / (radius * Math.cos(latTs))) * 180 / Math.PI;
    const toLat = (y) => ((y - keyFalseN) / radius) * 180 / Math.PI;
    bounds = { lonMin: toLon(Math.min(bx0, bx1)), lonMax: toLon(Math.max(bx0, bx1)), latMin: toLat(Math.min(by0, by1)), latMax: toLat(Math.max(by0, by1)) };
  }
  console.log(`Input ${W} x ${H}; extent lon ${bounds.lonMin.toFixed(4)}..${bounds.lonMax.toFixed(4)}, lat ${bounds.latMin.toFixed(4)}..${bounds.latMax.toFixed(4)}`);
  if (!(bounds.lonMin > 76 && bounds.lonMax < 79 && bounds.latMin > 17 && bounds.latMax < 20)) {
    console.error('Extent is not around Jezero (expected roughly 77-78.6 E, 17.6-19.3 N). Pass --lat-ts or --bounds. Nothing written.');
    process.exit(1);
  }
  const w = Math.floor((W - 1) / stride) + 1, h = Math.floor((H - 1) / stride) + 1;
  const nodata = image.getGDALNoData();
  const out = new Float32Array(w * h);
  let min = Infinity, max = -Infinity;
  const ROWS = 256; // read in strips to bound memory
  for (let r0 = 0; r0 < H; r0 += ROWS * stride) {
    const r1 = Math.min(H, r0 + ROWS * stride);
    const [band] = await image.readRasters({ window: [0, r0, W, r1], samples: [0] });
    for (let y = r0; y < r1; y += stride) {
      const j = y / stride;
      if (j >= h) break;
      for (let i = 0; i < w; i++) {
        const v = band[(y - r0) * W + i * stride];
        const bad = !Number.isFinite(v) || v === nodata || v < -9000 || v > 25000;
        out[j * w + i] = bad ? NaN : v;
        if (!bad) { if (v < min) min = v; if (v > max) max = v; }
      }
    }
  }
  let holes = 0;
  const u16 = new Uint16Array(w * h);
  for (let k = 0; k < out.length; k++) {
    let v = out[k];
    if (Number.isNaN(v)) { holes++; v = k % w > 0 && !Number.isNaN(out[k - 1]) ? out[k - 1] : min; out[k] = v; } // crude gap fill, reported below
    u16[k] = Math.round(((v - min) / (max - min)) * 65535);
  }
  const dir = path.join(__dirname, '..', 'public', 'terrain');
  const metaPath = path.join(dir, 'terrain-meta.json');
  const old = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  if (old.kind === 'preview-derived') {
    fs.copyFileSync(path.join(dir, 'jezero-height.u16'), path.join(dir, 'jezero-height.preview-backup.u16'));
    fs.copyFileSync(metaPath, path.join(dir, 'terrain-meta.preview-backup.json'));
  }
  fs.writeFileSync(path.join(dir, 'jezero-height.u16'), Buffer.from(u16.buffer));
  fs.writeFileSync(metaPath, JSON.stringify({
    width: w, height: h, ...bounds, elevMin: min, elevMax: max,
    encoding: 'uint16-le, row 0 = north, elev = elevMin + v/65535*(elevMax-elevMin)',
    metresPerPixel: Math.round(((bounds.latMax - bounds.latMin) * Math.PI / 180 * R / h) * 10) / 10,
    calibrated: true, kind: 'dem', source: path.basename(file),
    method: 'Numerical elevations read from the GeoTIFF.',
    limitations: holes ? [`${holes} no-data cells were filled from their western neighbour.`] : [],
    textureBounds: old.textureBounds || { lonMin: old.lonMin, lonMax: old.lonMax, latMin: old.latMin, latMax: old.latMax },
  }, null, 1));
  console.log(`Wrote ${w} x ${h} grid, elevation ${min.toFixed(0)}..${max.toFixed(0)} m, ${holes} filled cells.`);
  console.log('The surface image is unchanged and stays registered through textureBounds.');
}
main().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
