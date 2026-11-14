# A-ROUTE — Integrated Mars Exploration

A merged project combining the A-ROUTE cinematic intro/destination selector with the MarsWalk Gale Crater scientific terrain workspace.

## Routes
- `/` — cinematic A-ROUTE intro
- `/explore` — Mars destination selector
- `/explore/gale` — Gale workspace (MAP available; PLAY marked as planned)

## Gale MAP capabilities
- 3D terrain rendering backed by preprocessed HRSC Gale crater elevation tiles
- terrain/orbital layer controls and dataset/provenance panels
- Curiosity traverse and waypoint data adapters
- landmark selection, Sol timeline and historical weather panel
- camera navigation, terrain readout and scientific information panels

## Run locally
```bash
npm install
npm run dev
```

## Data and scientific documentation
- `public/data/terrain/crater/` contains processed terrain tiles and metadata.
- `docs/GALE_DATA_REGISTRY.md`, `docs/GALE_LANDMARK_REGISTRY.md`, `docs/DATA_GAPS_AND_LIMITATIONS.md`, and `docs/MARSWALK_CORRECTED_SPEC.md` document sources, limitations, and scientific conventions.
- Scripts for fetching/preparing data are in `scripts/`.

## Notes
- A-ROUTE's Next.js 15 / React 19 / React Three Fiber 9 dependency set is retained. MarsWalk components have been merged into that app; please run a local build and validate the WebGL scene in your target browser.
- PLAY is a navigation shell only in this merge; first-person missions are not implemented yet.
- Data should be labeled by provenance and measurement/derivation status as specified in the included documentation.
