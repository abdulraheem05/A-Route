// Planetary constants, plus the Gale names the original single-crater code
// imported from here.
//
// The physical constants moved to ./constants-core.js and the Gale geography
// moved to ./craters/gale.js. Both are re-exported under their original names
// so existing imports keep working and keep their original values.
export { MARS_RADIUS_M, M_PER_DEG, SCENE_UNIT_M, NODATA } from '@/lib/mars/constants-core';

import gale, { GALE_BOUNDS, GALE_HIRISE_BOUNDS, GALE_MSL_DEM_BOUNDS, BRADBURY_LANDING } from '@/lib/mars/craters/gale';

// Display region = extent of the Mars Trek CTX mosaic (registry D05).
export const GALE = GALE_BOUNDS;

// Extent of the Mars Trek HiRISE roving-site mosaic (registry D06).
export const HIRISE_BOUNDS = GALE_HIRISE_BOUNDS;

// Extent of the USGS MSL Gale merged DEM, 1 m (registry D01).
export const MSL_DEM_BOUNDS = GALE_MSL_DEM_BOUNDS;

// Projection origin: centre of the display region.
export const ORIGIN = gale.origin;

// First record of NASA's waypoint file (sol 3, RMC 2_0), read during the source audit.
export const BRADBURY = BRADBURY_LANDING;
