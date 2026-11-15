# Test fixtures

These files exist only so validation scripts can exercise code paths. They are
**not** data about Mars, they are **not** read by the application, and they are
**not** served from `public/`.

`msl-waypoints.synthetic.json` stands in for NASA's Curiosity waypoint file
(`MSL_waypoints.json`) when the real file cannot be reached. Its coordinates
are interpolated between two IAU-approved Gale feature centres and are
**fictitious as a rover path**. It is used by
`scripts/validate-gale-world.mjs` to check that sites are placed, ordered and
indexed correctly — never to display a traverse.

At runtime the application always reads the real file through
`/api/rover/waypoints`, which fetches NASA's copy and falls back to a snapshot
written by `scripts/fetch_rover_snapshot.py`.
