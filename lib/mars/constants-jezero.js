// Physical and mission constants. Values with a source are noted; the rest are simulation choices.
export const MARS_RADIUS_M = 3396190; // IAU mean equatorial radius
export const MARS_GRAVITY = 3.72; // m/s^2
// First official rover waypoint (site 3, drive 0) = touchdown position. Source: NASA M20_waypoints.json
export const LANDING = { lat: 18.44462715, lon: 77.45088572, elev: -2569.91, name: 'Octavia E. Butler Landing' };
// Simulation choices (a suited human, not the rover):
export const EYE_HEIGHT_M = 1.7;
export const WALK_SPEED = 1.4; // m/s
export const RUN_SPEED = 3.4; // m/s
export const JUMP_SPEED = 2.6; // m/s, gives ~0.9 m apex in Mars gravity
export const MAX_WALKABLE_SLOPE_DEG = 35;
export const INTERACT_RADIUS_M = 45;
export const ROVER_TOP_SPEED = 0.042; // m/s (about 152 m/h), for comparison in route estimates
