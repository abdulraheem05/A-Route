# DATA_ACQUISITION_PLAN.md

MarsWalk — how to acquire and prepare each dataset
Date: 2026-11-10. Dataset IDs refer to `GALE_DATA_REGISTRY.md`.

Nothing in this plan has been executed. Commands are the intended approach and must be tested; file names and band layouts are confirmed from each file's own header at step 1 of its section.

## 0. Preparation

**Tools:** GDAL ≥ 3.6 (with PROJ), Python 3 with rasterio, numpy, pyproj, shapely; ISIS3 only if ISIS cubes fail to open in GDAL; the Mars Climate Database access software (Fortran + Python wrapper).

**Disk:** about 60 GB for phase 1 working space (3.6 GB DEM + 11 GB global blend if downloaded whole + intermediates); +25 GB if the 25 cm orthophoto is taken.

**Target grid for all outputs**

```
MARS_EQC="+proj=eqc +lat_ts=0 +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs"
MARS_GEO="+proj=longlat +R=3396190 +no_defs"
# Gale window (matches the Trek CTX mosaic)
W=135.1842593; E=139.2413012; S=-6.5732988; N=-2.8077809
```

Output tiles follow the Trek grid (256 px, origin −180/+90, 2^(z+1) × 2^z) so MarsWalk-hosted tiles and Trek tiles share indices.

**Provenance log:** for every file downloaded record URL, date, byte size, checksum, and `gdalinfo` output. This log populates the registry's `retrieved` and coverage fields.

**Order of work**

| Step | Datasets | Why first |
|---|---|---|
| 1 | Checks C1–C5 below | Cheap; each can change the plan |
| 2 | D12, D13 | Small; give control points for everything else |
| 3 | D01 | Core terrain |
| 4 | D03 clip, D02 | Crater-wide terrain; datum resolution |
| 5 | D05, D06 registration measurement | Uses 2–4 |
| 6 | D21, landmark extraction | Uses 2 |
| 7 | D22 mirror | Independent |
| 8 | D24 registration + grid | Has a human lead time |
| 9 | D19b | If located |
| Phase 2 | D18, D04, D08, D23, D25, D17 | |

### Pre-flight checks (do these before anything else)

- **C1 — Trek cross-origin:** from a browser page on the intended domain, fetch one tile of D05. If blocked, plan a caching proxy route.
- **C2 — Trek terms:** read Trek's usage terms for third-party applications and rate limits (not reviewed in the audit).
- **C3 — Complete waypoint file:** download D12 and D13 in full; record feature counts and the latest sol.
- **C4 — Weather feed currency:** download D22 in full; record first/last sol and the `descriptions` object (units).
- **C5 — Range requests:** `gdalinfo /vsicurl/<D03 URL>` and `<D08 URL>` to see whether windowed remote reads work.

---

## 1. Terrain

### T1 — D01, MSL Gale merged DEM 1 m

1. Download (3.6 GB) with resume: `curl -C - -O https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif`
2. `gdalinfo -stats` → confirm 32,980 × 57,440, 1 band Float32, bounds 137.124167–137.680559 / −5.098652 to −4.129605, min −4625.875, max −322.56, NoData value. Any mismatch stops the pipeline.
3. Convert to a Cloud-Optimized GeoTIFF with overviews (average resampling) for internal use.
4. Build per-zoom elevation tiles for z = 12…16 on the Trek grid, clipped to the footprint. At z16 (0.64 m) the 1 m grid is slightly oversampled — stop terrain at z15 (1.27 m) and let z16 imagery drape on z15 geometry.
5. Derive per zoom: hillshade (fixed azimuth 315°, altitude 45°, documented), slope and aspect (Horn method, from the resampled grid of that zoom so the baseline equals the tile's ground spacing), contours.
6. Record tile encoding (scale, offset, NoData) in the registry.

### T2 — D03, MOLA–HRSC blend 200 m (Gale window)

1. Preferred: windowed remote read
   `gdal_translate -projwin_srs "$MARS_GEO" -projwin 134 -2 141 -8 /vsicurl/<D03 URL> blend_gale.tif`
   (a margin beyond the CTX window gives context terrain). Fallback: download the 11 GB file.
2. `gdalinfo` → confirm 200 m, sphere 3,396,190 m, vertical units and datum statement in metadata.
3. Tiles for z ≤ 8 (z8 = 163 m ≈ native).

### T3 — Vertical datum check (blocking)

At the first waypoint (137.441633, −4.589467) and four other waypoints spread along the traverse, sample D01, D02 and D03 and compare with each other and with `elev_geoid`.

- D01 ≈ `elev_geoid` (expect −4501 m at landing): confirms D01 is areoid-referenced as assumed.
- If D02 or D03 differ from D01 by a near-constant large offset, the product is referenced to the sphere (or another surface). Convert using the MOLA areoid grid, and document the conversion; do not apply an empirical constant across the whole crater without stating it.
- If differences are irregular (tens of metres, spatially varying), that is co-registration error: record it as the inter-tier uncertainty and do not "fix" it by warping.

### T4 — D02, HRSC 30 m DTM

1. Download `hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif` and the README from https://zenodo.org/record/5808354; verify MD5 `1d714f2142a56e962d50d985b7088b13`.
2. `gdalinfo` → record bounds (not on the record page), NoData, projection centre.
3. Apply T3 result. Reproject to the target grid (bilinear) and tile for z = 9…11 (z11 = 20 m; 30 m data are mildly oversampled — acceptable, labelled).
4. Derive hillshade, slope (30 m baseline at z11; coarser at lower zooms), contours.
5. Compare with D03 over the crater: publish mean and RMS difference as D02's accuracy note, since the Zenodo record has none.

### T5 — Source mask for D01 (if obtainable)

Ask the DEM authors (USGS Astrogeology, astroweb@usgs.gov; authors F. Calef and T. Parker, JPL) for the footprints of the 12 HiRISE stereo DEMs and the CTX/HRSC fill areas. If unavailable, approximate from HiRISE DTM footprints in the PDS and label the mask "approximate (MarsWalk)". Until then the app shows the conditional-resolution warning.

### T6 — D04, HiRISE DTMs (phase 2)

Per product: download DTEEC `.IMG` + label from its uahirise.org page; reproject; measure offset against D01/D02 on shared features; ingest as a separate inset tier with its measured offset recorded. No blending into D01.

---

## 2. Imagery

### I1 — D05 and D06 (Trek tiles)

No download. Steps:
1. Parse each `WMTSCapabilities.xml` at build time to read bounds, max zoom and format rather than hard-coding.
2. Compute the tile index ranges covering the layer bounds at each zoom; the client requests only those.
3. **Registration measurement:** fetch the z12 CTX tiles and z15 HiRISE tiles covering 10–15 sharp features inside D01 (small crater rims); locate the same features in D01's hillshade; record offsets. Publish mean and maximum. Apply at most one constant shift per layer if the criterion in the spec (§4) is exceeded.

### I2 — D07 orthophoto 25 cm (optional)

Only if D06's ~0.64 m is insufficient or Trek cannot be used. 23 GB download, verify MD5, build 256 px JPEG/WebP tiles z13–z17. Otherwise download nothing and use it remotely for spot registration checks via `/vsicurl/` if range requests work.

### I3 — D08 HiRISE colour basemap (phase 2)

1. `gdalinfo /vsicurl/<D08 URL>` → footprint, pixel size, CRS, band count.
2. Either serve by range requests from the client (needs cross-origin permission on the bucket — test) or download (~1 GB) and tile.
3. Label "enhanced colour".

### I4 — D09 Murray Lab CTX (phase 2, optional)

Identify the four Gale tiles from the lab's tile-map shapefile; download one at a time as the lab requests; build a VRT; tile for z12–z13; ship the seam-map polygons so the inspector can name the source CTX image under the cursor.

### I5 — Crater-wide colour

No action until a source is verified (gaps §G1).

---

## 3. Rover

### R1 — D12 and D13

1. Server-side job fetches both JSON files daily; stores raw copies with timestamp and hash.
2. Validate: FeatureCollection; expected property names; coordinates inside the Gale window; sols non-decreasing; odometry non-decreasing.
3. Derive: (a) sol → last drive-end record table; (b) traverse segments joined to waypoints by nearest endpoint to attach sol ranges — flag segments that fail to join rather than guessing; (c) simplified lines per zoom.
4. Never edit coordinates. Keep the source `elev_geoid` alongside MarsWalk-sampled elevation.

### R2 — D14 PLACES

Download the localisation collection once per PDS release; compare site/drive positions with D12 for a sample of 50 RMCs; record agreement. If the mmgis endpoint is withdrawn, rebuild D12-equivalent from PLACES.

### R3 — Landmarks

Run the extraction in `GALE_LANDMARK_REGISTRY.md` §F on the complete D12. For each name still marked "confirm", find the sol in a NASA mission update or paper; keep the citation.

### R4 — D21 gazetteer

Download the Mars nomenclature export; filter to the Gale window; convert any west-longitude bounds; store ID, type, centre, bounds, approval date. Fill the "TO EXTRACT" rows for Gale, Sakarya Vallis and Yellowknife.

---

## 4. Atmosphere

### A1 — D22 daily feed

Daily server-side fetch → validate → append to a per-sol table keyed by `sol`; keep "--" as null; join each sol to the rover position from R1. Record units from `descriptions`.

### A2 — D23 REMS archive (phase 2)

From the PDS Atmospheres REMS page, take MODRDR (environmental quantities with corrections) and UVRDR. Aggregate offline to per-sol min/mean/max and per-Ls climatology with sample counts. Exclude wind columns. Humidity: keep with the archive's confidence flags; expose night-time values only.

### A3 — D24 Mars Climate Database

1. Register and download the full version; read the licence. If MarsWalk is or may become commercial, write to the MCD team for authorisation **before** building on it (contacts on the access page).
2. Decide the grid: e.g. 0.1° over the Gale window (≈ 41 × 38 points) × 12 Ls steps × 12 local times × surface level, climatology dust scenario, high-resolution mode on. That is on the order of 200k records per variable — a few MB.
3. Run the access software; store temperature, surface pressure, wind components, dust opacity with the MCD version, scenario and switches in the file header.
4. Note in metadata that neighbouring points largely reflect interpolation within one or two model cells plus the topographic pressure correction.

### A4 — D25 OpenMARS (phase 2, optional)

Read the reference manual for grid and format; extract the cell(s) covering Gale as time series.

---

## 5. Geology and spectral (phase 2 unless noted)

### G1 — D19b THEMIS thermal inertia (phase 1 if located)

1. On astrogeology.usgs.gov, find the quantitative 100 m tile covering 5°S, 137°E (tiles are 30° × 60°).
2. Download GeoTIFF or ISIS cube; clip to the Gale window; confirm units and NoData.
3. Tile z8–z12 as float values; colour in the client.

### G2 — D18 CRISM

1. In the Mars Orbital Data Explorer, search each observation ID in D18; list available product levels. For observations up to May 2012 take the MTRDR (map-projected, corrected) and its summary-parameter product; for later ones (likely including the ATO IDs — check dates) take TRDR + DDR and process with the CRISM Analysis Toolkit.
2. Compute or take summary parameters: D2300 (Fe/Mg phyllosilicate), BD1900 (hydration), SINDEX2 (sulfate), BD2100 (monohydrated sulfate), BD860_2 (hematite), OLINDEX3 (olivine), LCPINDEX2/HCPINDEX2 (pyroxenes). Record parameter definitions from Viviano-Beck et al. 2014 (verify citation on retrieval).
3. Measure and record each cube's offset against CTX/D01.
4. Tile each parameter per observation with a documented lower threshold; ship footprint polygons.

### G3 — Unit polygons

Write to the corresponding author of Fraeman et al. 2016 requesting the unit shapefiles and permission to display them. In parallel check the USGS planetary geologic mapping programme for the status of the 1:60,000 western Aeolis Mons map. Do not digitise published figures without permission.

### G4 — D17 local GIS

For each Zenodo record: read licence; download; reproject; keep original attribute tables.

---

## 6. Deliverables of the acquisition phase

- `data/provenance.csv` — one row per downloaded file.
- `data/registry.json` — registry in the revised schema, populated from headers and logs only.
- Tile sets: `terrain/{tier}/{z}/{row}/{col}`, `derived/{product}/{tier}/…`.
- `rover/waypoints.json`, `rover/traverse.json`, `rover/sol_index.json`.
- `landmarks.json` — only rows that passed extraction and citation.
- `weather/rems_daily.json`; `climate/mcd_gale.bin` + header.
- `reports/registration.md`, `reports/datum.md`, `reports/coverage_gaps.md`.
