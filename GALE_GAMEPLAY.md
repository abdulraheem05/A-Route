# Gale Crater gameplay — what was built, and what it rests on

Gale now plays in the same first-person game Jezero uses. There is no second
game: `components/game/Game.js` takes a crater configuration and everything
below it — terrain, player, markers, missions, panoramas, inspection, HUD,
pause menu, map — is the existing code, unchanged in behaviour.

## How a crater becomes playable

`lib/mars/gameCraters.js` holds one entry per playable crater:

```js
export const GALE_GAME = {
  id: 'gale',
  origin: BRADBURY_LANDING,
  terrain: { metaUrl, heightUrl, surfaceUrl },
  traverse: { url: '/api/rover/waypoints', bounds: GALE_BOUNDS, source: '…' },
  db: { id: 'gale', missions, objects, catalog },
  saveKey: 'marswalk-save-gale-v1',
};
```

`<Game crater={GALE_GAME} />` is the whole wiring. The loader sets the active
crater, obtains the traverse, builds the world, then loads terrain and surface.
Each loading line reports a real completed step; none of them is a timer.

Saves are per crater, so progress in one does not overwrite the other.

## The landscape is the published DEM

`public/terrain/gale-height.u16` is cut from the DEM already in this project
(`public/data/terrain/crater`, registry **D02** — 30 m HRSC DTM mosaic of Gale
Crater, Persaud et al. 2021, doi:10.5281/zenodo.5808354) by
`scripts/prepare_game_terrain.py`:

| | |
|---|---|
| window | 137.00038–138.20157 °E, −5.40164 to −4.09923 °N |
| grid | 713 × 773 at 100 m/px |
| elevation | −4631.71 m to 805.78 m |
| valid cells before fill | 100.0 % (0 cells filled) |

It covers Aeolis Palus, the northern flank of Aeolis Mons and Gediz Vallis.
Nothing is generated, smoothed into invention, or randomised.

`public/terrain/gale-surface.jpg` is rendered from that same DEM by
`scripts/render_game_surface.py` — a hypsometric tint times a hillshade. It is
a **visualisation of the elevation model, not imagery of Mars**, and the
metadata says so. It is the same treatment Jezero's surface receives.

## The traverse is fetched, not invented

Curiosity's positions come from NASA's waypoint file. This environment cannot
reach `mars.nasa.gov`, so **no Curiosity waypoints are bundled**. Gale reads
them at load time through `/api/rover/waypoints` — the route the Gale map
already uses, which fetches NASA's file and falls back to a local snapshot
written by `scripts/fetch_rover_snapshot.py`.

Every site is placed by `positionAtSol()` against that traverse. If it cannot
be loaded the game stops on the loading screen and says why. It does not
substitute a guess. To make Gale work offline, run:

```
python scripts/fetch_rover_snapshot.py        # writes public/data/rover/waypoints.json
```

`scripts/fixtures/` holds a clearly-labelled synthetic stand-in used **only**
by `scripts/validate-gale-world.mjs`. It is never served and never read by the
app. Because of it, site positions are proven to resolve, order and index
correctly, but have not been checked against real rover geometry here.

## The ten missions

Every mission has at least one objective that maps to a real interaction, and
every objective resolves to an asset or record that exists.

| # | Mission | Sol | Objectives | Source of the sol |
|---|---|---|---|---|
| 1 | Arrival at Bradbury Landing | 3 | panorama + observation | landmark registry (first waypoint record) |
| 2 | Yellowknife Bay: an ancient lake | 279 | Cumberland drill inspection | drill-attempt table (PMC8981195, Table 3) |
| 3 | The Kimberley: Windjana | 621 | Windjana drill inspection | same |
| 4 | Pahrump Hills: entering Mount Sharp | 759 | panorama + observation | same |
| 5 | Buckskin: the silica stop | 1060 | Buckskin drill inspection | same |
| 6 | Vera Rubin Ridge | 1726 | panorama + observation | same |
| 7 | Glen Torridon | 2370 | panorama + observation | same; Bennett et al. 2023 |
| 8 | Mont Mercou | 3086 | panorama + observation | NASA MSL mission blog, sols 3074–3089 |
| 9 | Greenheugh Pediment | 3397 | panorama + observation | NASA MSL mission blog, sols 3396–3397 |
| 10 | Point Lake and Paraitepuy Pass | 106; 3565 | 2 panoramas + observation | NASA/JPL PIA16563; MSL blog sol 3565 |

Sols for missions 8–10 were not in the project's registry and were taken from
the NASA pages named above. Each science statement in
`data/gale-science-objects.json` carries the source it came from; nothing
asserts a composition or a finding that the source does not state.

## Panoramas

The eight delivered mosaics are in `public/panoramas/gale/` with thumbnails,
processed by `scripts/prepare_gale_assets.py`. Only resizing and re-encoding
was applied; the delivered pixel dimensions are recorded in the catalogue.

Point Lake is the only one NASA publishes an azimuth span for (PIA16563: 360°,
south at centre), so it is `cylindrical-360`. The rest are marked
`cylindrical-partial` with the span unstated and adjustable in the viewer,
rather than claiming a coverage that is not published.

`paraitepuy-pass` came in at 29163 × 8638 (45 MB) and is resized to 7200 px
wide, matching the widest panorama already in the project.

## Inspection — the fix

`components/scientific/SpecimenInspector.jsx` replaces the old flow:

1. the **actual** image is shown, at its real aspect, with an INSPECT button;
2. pressing it runs a laser sweep over that image for 2.6 s;
3. only when the sweep finishes does the results panel appear **and** the
   objective get recorded.

The `useEffect` in `InfoPopup.js` that recorded `inspect` the moment the popup
opened is gone. Opening a popup now completes nothing.

Results are assembled by `analysisOf()` strictly from fields the record
carries. There is no placeholder text and no invented percentage: a record
without a published composition shows no composition row.

**Three of ten** Gale inspection targets have a published image (the delivered
Cumberland, Windjana and Buckskin drill images). **None of Jezero's nineteen**
science objects has one. Those targets say so plainly — "No image of this
target is published in this build." — instead of borrowing a picture from
somewhere else.

## Jezero, checked

- 10 missions, 18 objectives, all resolving; no mission completes with zero
  interactions; no mission has an objective whose site is locked at that
  mission. The chain completes in order in a simulated playthrough.
- There were no paragraph-only missions to remove — every Jezero mission
  already had real objectives. The reported problem was the completion logic,
  which is what changed.
- Four catalogue panoramas (`groloy-vertical`, `marble-mountain`, `origny`,
  `post-drive-horizon`) have no acquisition sol, so they cannot be positioned
  and are listed as unplaced. They are real NASA assets, so they were left in
  the catalogue rather than deleted.

## Validation run

```
node /home/claude/tools/tscheck/check.mjs .     NO UNDEFINED IDENTIFIERS (139 files)
scripts/validate-gale-world.mjs                 GALE WORLD OK
npm run test:gale                               PASS — Gale map unchanged
```

`npm run build` was not run: this environment has no network access, so
dependencies could not be installed.
