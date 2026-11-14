# Jezero MAP — setup

`/explore/jezero` MAP is the same scientific 3D explorer as `/explore/gale`:
the same renderer, terrain pipeline, layer panel, inspector, camera, picking
and measurement, driven by Jezero's configuration in
`lib/mars/craters/jezero.js`. Only the crater, its datasets, its rover and its
available science differ. PLAY is unchanged.

The repository ships **no DEM**. The CTX imagery streams live from NASA Mars
Trek and needs nothing prepared, so without a DEM the map runs on a flat
reference surface carrying real imagery and says so in the status banner. That
is the same degraded state Gale shows without a prepared DEM.

## 1. Get the DEM

Mars 2020 Science Investigation CTX DEM Mosaic, 20 m/pixel (registry JZ20):

<https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic>

Keep the TIFF outside the repository or in `data/raw/` (git-ignored). The 1 m
HiRISE DTM is not needed and is far too large to prepare here.

## 2. Install the Python processing dependencies

```bash
python -m pip install -r scripts/requirements.txt
```

## 3. Prepare the elevation grid

From the project root:

```bash
python scripts/prepare_terrain.py crater --region jezero \
  --source jezero_ctxdem \
  --input "data/raw/M20_JezeroCrater_CTXDEM_20m.tif" \
  --res 100
```

This clips and reprojects the TIFF to Jezero's display region, resamples it to
a 100 m grid, and writes `public/data/terrain/jezero/{meta.json, L0.bin, L1.bin, …}`.
At 100 m that is a 2204 × 2098 grid; the renderer draws level 1 (1.16 M
vertices) and samples elevations from level 0, exactly as it does for Gale.

The region is clipped to the extent of the Mars Trek CTX mosaic
`Jezero_CTX_BlockAdj_dd` — 75.1537692–78.8717121°E, 15.9058484–19.4453003°N,
read from its WMTSCapabilities — so elevation and imagery cover the same
ground. If you prepared a grid with an earlier version of this script that used
a rounded window, re-run it to get exact edge alignment; the map works either
way.

The script prints a datum check against Octavia E. Butler Landing. The CTX DEM
and the rover waypoint elevations are not on a reconciled vertical datum, so a
difference there is expected and is recorded in `meta.json` rather than
silently corrected.

### Where the DEM has no data

Stereo-derived DEMs have gaps. The renderer discards no-data cells instead of
colouring them, so terrain stops where the dataset stops and you see dark gaps,
not invented ground. Gale behaves the same way outside its DTM footprint.

## 4. Perseverance route data

Waypoints come from NASA's M20 service through
`/api/rover/waypoints?mission=m20`, which falls back in order to:

1. `public/data/rover/m20/waypoints.json`, if you save a snapshot there;
2. `data/traverse.json`, the decimated waypoint subset already bundled with
   this project (212 records, sols 13–2006, roughly one every eight sols),
   converted to the shape the client adapter reads.

So the rover layers, the sol timeline and waypoint inspection work offline out
of the box. The bundled subset carries no drive distance, record number or
rover attitude, and the interface reports those as absent rather than guessing.
Run `npm run fetch:traverse` to replace it with every official waypoint.

NASA publishes no verified dense traverse path for Mars 2020, so no traverse
line is drawn — the layer panel lists it under "Not available" with the reason.

## 5. Run

```bash
npm install
npm run dev
```

Then open `/explore/jezero`.

## What is not available for Jezero, and why

Listed in the layer panel under "Not available", and in
`lib/mars/craters/jezero.js`:

- geological unit polygons and a written glossary — USGS SIM 3464 maps the
  region but has not been read into this app;
- the rover traverse path — no verified Mars 2020 equivalent of
  `MSL_traverse.json`;
- observed weather — Perseverance carries MEDA, but no public per-sol summary
  feed matching this app's adapter was verified;
- 1 m rover-region elevation — the HiRISE DTM is too large to prepare here.

## Testing

```bash
npm run test:gale
```

Checks that Gale is unchanged and that Jezero's configuration still produces
the recorded projection, camera framing, tile coverage, DEM grid, waypoint
parsing and landmark resolution. Run it after any change to the crater layer.
