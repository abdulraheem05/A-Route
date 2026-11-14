// Reference frame shared by every dataset in MarsWalk (MARSWALK_CORRECTED_SPEC §2).
// Sphere radius 3,396,190 m, planetocentric latitude, positive-east longitude.
//
// These values are properties of the planet and of the scene units, not of any
// one crater, so they live apart from the crater configurations. Crater-specific
// geography is in lib/mars/craters/.

export const MARS_RADIUS_M = 3396190;
export const M_PER_DEG = (Math.PI * MARS_RADIUS_M) / 180; // 59,274.7 m per degree

// One scene unit = 1 km.
export const SCENE_UNIT_M = 1000;

// Sentinel used for "no data" in height rasters and textures.
export const NODATA = -32768;
