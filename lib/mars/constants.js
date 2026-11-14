// Reference frame shared by every dataset in MarsWalk (MARSWALK_CORRECTED_SPEC §2).
// Sphere radius 3,396,190 m, planetocentric latitude, positive-east longitude.

export const MARS_RADIUS_M = 3396190;
export const M_PER_DEG = (Math.PI * MARS_RADIUS_M) / 180; // 59,274.7 m per degree

// Display region = extent of the Mars Trek CTX mosaic (registry D05).
export const GALE = {
  west: 135.1842593,
  east: 139.2413012,
  south: -6.5732988,
  north: -2.8077809,
};

// Extent of the Mars Trek HiRISE roving-site mosaic (registry D06).
export const HIRISE_BOUNDS = {
  west: 137.1224669,
  east: 137.7298129,
  south: -4.9254743,
  north: -4.2489588,
};

// Extent of the USGS MSL Gale merged DEM, 1 m (registry D01).
export const MSL_DEM_BOUNDS = {
  west: 137.124167,
  east: 137.680559,
  south: -5.098652,
  north: -4.129605,
};

// Projection origin: centre of the display region.
export const ORIGIN = {
  lon: (GALE.west + GALE.east) / 2,
  lat: (GALE.south + GALE.north) / 2,
};

// First record of NASA's waypoint file (sol 3, RMC 2_0), read during the source audit.
export const BRADBURY = { lon: 137.441633, lat: -4.589467, elev: -4500.971 };

// One scene unit = 1 km.
export const SCENE_UNIT_M = 1000;

// Sentinel used for "no data" in height rasters and textures.
export const NODATA = -32768;
