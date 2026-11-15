# Multi-crater architecture

The scientific MAP workspace was built for Gale Crater, with Gale's geography,
datasets, camera and labels written into the components. It is now driven by a
crater configuration object. Gale is one such configuration and remains the
reference implementation: its appearance, rendering, interactions and data are
unchanged, and `npm run test:gale` proves it.

## Where crater-specific values live

```
lib/mars/
  constants-core.js      planet + scene constants (radius, m/deg, scene unit, NODATA)
  constants.js           re-exports the above plus GALE / ORIGIN / BRADBURY etc.
                         under their original names, for existing imports
  activeCrater.js        the crater the scene is showing, plus its cached
                         projection frame (origin, cos0, km/deg)
  CraterContext.jsx      CraterProvider / useCrater for the interface
  craters/
    index.js             the registry: add a crater here
    gale.js              Gale's configuration
    jezero.js            Jezero's configuration
```

`activeCrater.js` exists because the projection, the elevation grids and the
adapters are plain modules used inside render loops, not React components. They
previously read Gale's `ORIGIN` as a module constant. The frame is cached and
recomputed only when the crater changes, so the hot paths still do a property
read and no trigonometry — and with the default crater the arithmetic is
expression-for-expression what it was.

## What a configuration supplies

| Field | Used by |
|---|---|
| `bounds` | camera clamping, terrain picking, base mesh and texture extent, detail-patch clipping, coordinate search, record validation |
| `origin` | the scene projection |
| `view.home` / `view.start` / `view.fitDistanceKm` | opening camera, orbit target, "fit the whole crater" |
| `terrain.craterUrl` / `roverUrl` / `maxRenderVerts` | the elevation pipeline |
| `imagery.layers` | Trek layer ids, zoom ceilings and footprints; the tile proxy's allow-list |
| `imagery.baseLayerKey` / `baseZoom` / `basePreviewZoom` | crater-wide base texture |
| `imagery.detailCtxZoom` / `detailOverlayKey` | detail-patch texture |
| `detailLevels` | level-of-detail windows |
| `rover` | endpoints, name, landing site, dataset codes, record bounds |
| `weather` | feed URL, dataset code, instrument name, caveats |
| `landmarks` / `geology` / `unavailableLayers` / `datasets` | the science panels |
| labels and prose | every crater-specific string in the interface |

Anything a crater does not have is left out. `rover: null` switches off the
traverse, waypoints, timeline and rover tooling and makes the interface say
there is no mission there; `weather: null` does the same for the weather panel;
`detailOverlayKey: null` removes the high-resolution overlay row. Nothing is
faked and nothing crashes.

## Reusable pieces

Unchanged in behaviour, now crater-independent:

- **Renderer** — `Viewport`, `CameraRig`, `BaseTerrain`, `DetailPatch`,
  `TerrainPicker`, `Markers`, `gridGeometry`, `terrainMaterial`, `imagery`,
  `heightGrid`, `heightProvider`, `roverTiles`, `raymarch`, `place`, `cameraApi`
- **Rover layers** — `Traverse`, `Waypoints`, `LandmarkMarkers`
- **Interface** — `TopBar`, `LayerSidebar`, `InfoPanel`, `WeatherPanel`,
  `StatusBanner`, `NavControls`, `Readout`, `SolTimeline`, `DatasetInfo`
- **Shell** — `Explorer(craterConfig)` and `CraterWorkspace`
- **Data** — `trekAdapter` (WMTS grid maths), `roverAdapter`, `weatherAdapter`,
  `resolveLandmarks`, the dataset registry
- **Server** — the rover and weather routes take a `mission` parameter
  (default `msl`); the tile proxy serves exactly the layers registered craters
  declare, plus the global MOLA layer

## Adding a crater

1. Write `lib/mars/craters/<id>.js` using `gale.js` or `jezero.js` as the
   model. Every geographic and dataset value must come from a source you have
   read; `jezero.js` names its source beside each value.
2. Prepare its elevation into the directory its `terrain.craterUrl` names.
3. Add any new rover mission to `app/api/rover/[kind]/route.js` and any new
   weather source to `app/api/weather/route.js`.
4. Add the configuration to the `list` in `lib/mars/craters/index.js`.

It is then reachable at `/explore/<id>` with no further code. A crater that
needs its own shell (its own PLAY experience, say) gets a page of its own:

```jsx
// app/explore/<id>/page.js
import CraterWorkspace from '@/components/CraterWorkspace';
import myCrater from '@/lib/mars/craters/<id>';

export default function Page() {
  return <CraterWorkspace crater={myCrater} play={<MyGame />} />;
}
```

No shared component changes unless the crater needs a capability that does not
exist yet.

## Jezero

Jezero is registered and uses the same engine. `/explore/jezero` renders
`CraterWorkspace` with Jezero's configuration for MAP and the existing
first-person game for PLAY. The standalone `components/JezeroMap.jsx` — its own
Canvas, mesh, OrbitControls, elevation tint and two-button sidebar — is gone;
nothing recreates the renderer.

Every geographic and dataset value in `lib/mars/craters/jezero.js` was read
from a source, and the file names the source beside each one:

| Value | Source |
|---|---|
| display bounds, CTX layer id, zoom ceiling | `Jezero_CTX_BlockAdj_dd` WMTSCapabilities: bounding box 75.1537692 15.9058484 to 78.8717121 19.4453003, `default028mm`, image/png, highest TileMatrix 12 |
| HiRISE layer id, bounds, zoom ceiling | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` WMTSCapabilities: 77.2229331 18.3067994 to 77.583964 18.669315, highest TileMatrix 17 |
| landing site | first record of NASA's M20 waypoint file, already in this project as `LANDING` in `lib/mars/constants-jezero.js` |
| elevation | Mars 2020 Science Investigation CTX DEM Mosaic, 20 m/pixel (registry JZ20) |
| waypoints | `M20_waypoints.json`, with `data/traverse.json` as the bundled fallback |
| weather | `mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json` — MEDA summaries, array named `sols` rather than Curiosity's `soles` |
| landmarks | `data/science-objects.json` and `data/sources.json`, this project's own sourced Jezero catalogue; plus two IAU features whose gazetteer entries were read |
| crater centre and diameter | IAU gazetteer; 45 km as published in USGS SIM 3464 — used only to frame the opening camera |

The display region is the CTX mosaic's extent, which is the rule Gale follows,
and `scripts/prepare_terrain.py crater --region jezero` clips the DEM to
exactly those bounds, so elevation and imagery cover the same ground.

### Why there are no purple surfaces

The old viewer coloured every grid cell with a hand-written "elevation tint
(purple → ochre → pale yellow)" scaled between the metadata's min and max, and
no-data cells (−32768) sat at the bottom of that ramp, which is why whole
regions came out purple.

The shared renderer never colours a no-data cell. `lib/terrain/terrainMaterial.js`
marks any vertex whose height reads below −30000 as invalid in the vertex
shader and the fragment shader discards it, so terrain simply stops where the
dataset stops. `prepare_terrain.py` also computes the elevation range from
valid cells only, so the elevation ramp is scaled to real relief. Expect dark
gaps rather than invented ground wherever the CTX DEM has no stereo coverage —
Gale behaves the same way outside its DTM footprint.

### What Jezero does not have

Declared absent in the configuration, so the interface reports each one rather
than showing a placeholder:

- **Traverse path.** NASA publishes a dense path file for Curiosity
  (`MSL_traverse.json`). No verified Mars 2020 equivalent was found, so
  `traverseUrl` is `null`: drive-end waypoints are drawn and no straight-line
  guess is drawn between them.
- **Weather for most sols.** MEDA summaries come from the same NASA service as
  Curiosity's REMS feed, but the Mars 2020 feed returns only a short span of
  sols rather than the whole mission, and publishes air temperature and
  pressure only. The panel reports the span it actually received and says when
  the selected sol has no record. The complete MEDA record is in the PDS
  Atmospheres archive, which is not integrated.
- **Geological units.** The published mapping exists (USGS SIM 3464) but has
  not been read into the app, so `geology.units` is empty and the panel says
  so. Nothing is asserted in its place.
- **1 m elevation.** No rover-region DEM tiles, so `terrain.roverUrl` is
  `null` and the 20 m CTX DEM answers every elevation query.

### Preparing Jezero's elevation

The repository ships no DEM. Until one is prepared, `/explore/jezero` MAP runs
on a flat reference surface carrying the real CTX imagery and says so in the
status banner — the same degraded state Gale shows without a prepared DEM. See
`README_JEZERO_MAP.md`.

## Testing

```bash
npm run test:gale    # Gale regression check — must pass before and after any crater work
npm run dev          # then open /explore/gale
```

The check compares a deterministic dump of everything Gale computes against
`scripts/gale-regression.expected.json`, recorded from the pre-refactoring
code: the projection over a grid of points as IEEE-754 hex, tile ranges for
every layer and zoom, elevation sampling and slope, waypoint and traverse
parsing including the records that must be rejected, landmark resolution, the
dataset registry, the weather adapter, and the camera framing, imagery zooms,
detail levels and data URLs that used to be literals in the components.
Regenerate the expectation only when a change to Gale is intended.
## MAP / PLAY routes

Each crater has separate deep links: `/explore/<crater>/map` and `/explore/<crater>/play`. The crater root (`/explore/<crater>`) redirects to its MAP route. `CraterWorkspace` receives the route mode and its MAP/PLAY tabs link between endpoints, so a browser refresh retains the selected mode. The shared `backHref` configuration points both workspaces to `/explore` (Destinations).
