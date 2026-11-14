# Measure & Plan

A section of the right-hand inspector, beside Inspect, Weather and Geology.
It replaces the Measure Distance button and the floating measurement card: one
pair of points now serves both jobs — the straight line between them is the
measurement, and the same pair is the input to terrain-aware route planning.

Shared by every crater. Nothing in the panel, the routing engine or the route
layer is specific to Gale or Jezero: coordinates, elevation, named places and
map interaction all come from the active crater's configuration and datasets.

## Choosing the two points

**Select on terrain** arms one end, and the next click on the surface sets it.
While an end is armed the panel shows latitude, longitude and elevation under
the pointer live, and the footer readout says which end is being set. Setting
the start with no end yet moves straight on to the end. This uses the existing
`TerrainPicker`, which intersects the view ray with the elevation data rather
than the mesh, so a point is as accurate as the dataset under it.

**Known locations** searches the places the crater already loads, built by
`lib/data/placeIndex.js` from existing data only:

| Source | Gale | Jezero |
|---|---|---|
| Landing site, from `crater.rover.landingSite` | Bradbury Landing | Octavia E. Butler Landing |
| Rover positions, from the loaded waypoint file | Curiosity, latest and at the selected sol | Perseverance, latest and at the selected sol |
| IAU features, from the crater's landmark set | Aeolis Mons, Aeolis Palus, Farah Vallis, Peace Vallis, Gediz Vallis | Jezero, Jezero Mons |
| Mission sites, sol-keyed and positioned from the rover record | Curiosity's drill sites | 18 sites from `data/science-objects.json` |

No place is invented, and the list is crater-specific because its sources are.

## Routing

`lib/terrain/routing.js`. A* with 8-connected moves over a window of the
crater-wide DEM that is already loaded for the scene — no extra download, no
second copy of the elevation data.

The window is the bounding box of the two points, padded, and decimated with a
stride so the node count stays under a cap (90,000 by default). The effective
cell size is reported in the panel, because a route cannot resolve anything
smaller than one cell.

Per-cell slope is central differences over one cell step, the same method as
`heightProvider.slope`. **Cells with no data are impassable** and nothing is
interpolated across a gap; a cell on the window edge or beside missing data is
refused rather than guessed. If either endpoint sits outside the dataset's
coverage, the planner says so instead of routing.

Two cost models share the search:

- **Fastest** — `distance / speed(slope)`, minimising travel time. It will
  climb where climbing is quicker. Cells above the hard slope limit are refused.
- **Safest** — the same, multiplied by a penalty that rises with slope, and
  with cells above the safe slope limit refused outright. It buys gentler
  ground with extra distance.

The A* heuristic is straight-line distance at the flat-ground speed, which is
admissible, so each model returns the optimal path for its own cost function.
Both follow the ground; neither is a straight line unless the terrain gives no
reason to deviate, and when the two models agree the panel says why.

### What is measured and what is assumed

Measured, from the DEM: elevation, slope, distance, gain, loss, coverage.

Derived from the rover's own record, not assumed: the **drive pace**. It is the
along-track distance of the loaded waypoints divided by the sols they span,
preferring the mission's own odometry when the waypoint file carries it
(Curiosity's does; the bundled Perseverance subset does not, so its pace comes
from the waypoint track — 17.4 m/sol over sols 13–2006). The panel states
which basis was used.

Assumed, and adjustable in the panel: the safe slope limit (default 15°), the
refuse-above limit (default 30°), the slope at which the assumed pace halves
(default 10°), and how strongly the safest model avoids steep ground. These are
modelling choices, **not published rover specifications**, and the panel says
so. Changing one invalidates the computed routes, which are then recalculated
on request.

Travel time is therefore an estimate at a stated pace over terrain of a stated
slope. It is not a prediction of what a rover would do, and the panel does not
present it as one.

### Limitations

- A route describes the shape of the ground at the DEM's resolution. It cannot
  see rocks, sand, scarps or anything smaller than one cell, so it does not
  mean a rover could drive it.
- Gain and loss are summed over the sampled profile, so they depend on the
  sampling interval; the interval is reported.
- Jezero's CTX DEM covers 20.6% of the display region. Many point pairs there
  have no continuous covered path between them, and the planner refuses rather
  than bridging the gap.
- The two slope figures come from different places: planned routes report DEM
  cell slope, which is what the limit was applied to; the direct line reports
  slope between profile samples. Each says which.

## Visualisation

`components/layers/RouteLines.jsx` resamples each route to about a quarter of a
DEM cell and places every sample with `scenePosition`, the same function the
rover traverse and the markers use. The line therefore follows the rendered
surface, and moves with it when the vertical exaggeration changes or a detail
patch refines the elevation underneath.

Fastest is orange, safest green, with the start point orange and the end point
blue — the same colours in the panel, the legend and the 3D scene. Each route
can be shown or hidden, the active one is drawn brighter and over the other,
and the legend over the map names what is drawn and switches the active route.
The straight line between the endpoints is drawn dashed and grey, so it is
never mistaken for a planned route.

Hovering the elevation profile puts a ring at the matching place on the 3D
terrain and reports distance along the route and elevation there.

Routes are computed only when asked for — never while the pointer moves.

## Testing

```bash
npm run test:gale
```

The Measure & Plan section of that check runs the real engine against the
prepared DEM binaries for both craters: the place index, the pace derived from
the rover record, both cost models over fixed endpoint pairs that cross real
relief, and the refusal when an endpoint has no elevation coverage. It records
distances, gain and loss, slope statistics and travel time as IEEE-754 hex, so
a one-bit change in the arithmetic shows.

That section reads `public/data/terrain/*/`. If a DEM is missing the check
fails and names which one to prepare.
