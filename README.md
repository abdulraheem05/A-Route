# A-ROUTE — Integrated Mars Exploration

A merged project combining the A-ROUTE cinematic intro/destination selector with the MarsWalk Gale Crater scientific terrain workspace.

## Routes
- `/` — cinematic A-ROUTE intro
- `/explore` — Mars destination selector
- `/explore/gale` — Gale workspace (MAP available; PLAY marked as planned)
- `/explore/jezero` — Jezero workspace (same MAP engine as Gale; PLAY is the first-person game)
- `/explore/<id>` — any other crater registered in `lib/mars/craters/`

## Measure & Plan
Both craters share a Measure & Plan section in the inspector: measure the
direct line between two points, or plan terrain-aware fastest and safest routes
with A* over the loaded DEM. See `docs/MEASURE_AND_PLAN.md` for the cost
models, what is measured and what is assumed.

## Loading screens
One reusable screen in three variants, driven by real loading signals rather
than timers. See `docs/LOADING_SCREENS.md`.

## Gale MAP capabilities
- 3D terrain rendering backed by preprocessed HRSC Gale crater elevation tiles
- terrain/orbital layer controls and dataset/provenance panels
- Curiosity traverse and waypoint data adapters
- landmark selection, Sol timeline and historical weather panel
- camera navigation, terrain readout and scientific information panels

## Multi-crater architecture
Gale and Jezero use the same scientific 3D MAP engine — one renderer, one set
of panels, one camera system — driven by a crater configuration object. Gale is
the reference implementation and is unchanged. See `docs/CRATER_ARCHITECTURE.md`
for what a configuration supplies and how to add a crater, and
`README_JEZERO_MAP.md` for preparing Jezero's elevation.

## Run locally
```bash
npm install
npm run dev
```

## Test
```bash
npm run test:gale   # Gale regression check; no dependencies, runs on plain Node
```
Run this before and after any work on the crater layer. It compares everything
Gale computes against a baseline recorded from the pre-refactoring code, and
checks Jezero's configuration against its own recorded baseline.

## Data and scientific documentation
- `public/data/terrain/crater/` contains processed terrain tiles and metadata.
- `docs/GALE_DATA_REGISTRY.md`, `docs/GALE_LANDMARK_REGISTRY.md`, `docs/DATA_GAPS_AND_LIMITATIONS.md`, and `docs/MARSWALK_CORRECTED_SPEC.md` document sources, limitations, and scientific conventions.
- Scripts for fetching/preparing data are in `scripts/`.

## Notes
- A-ROUTE's Next.js 15 / React 19 / React Three Fiber 9 dependency set is retained. MarsWalk components have been merged into that app; please run a local build and validate the WebGL scene in your target browser.
- PLAY is a navigation shell only in this merge; first-person missions are not implemented yet.
- Data should be labeled by provenance and measurement/derivation status as specified in the included documentation.
