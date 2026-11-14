// Gale Crater configuration — the reference implementation.
//
// Every value here was moved verbatim from the original single-crater code:
//   bounds, HiRISE bounds, DEM bounds, landing site   lib/mars/constants.js
//   Trek layer ids, zoom ceilings                     lib/data/trekAdapter.js
//   opening camera, home target, fit distance         components/terrain/Viewport.jsx,
//                                                     CameraRig.jsx, NavControls.jsx
//   base imagery zoom levels                          components/terrain/BaseTerrain.jsx
//   detail-patch levels                               components/terrain/DetailPatch.jsx
//   landmarks / stratigraphy / unavailable layers      lib/data/{landmarks,units,registry}.js
//
// Nothing is computed differently from before: this file only moves the numbers
// out of the shared components so a second crater can supply its own.
import { FIXED_LANDMARKS, SOL_LANDMARKS } from '@/lib/data/landmarks';
import { STRAT_UNITS, UNIT_NOTE } from '@/lib/data/units';
import { UNAVAILABLE_LAYERS } from '@/lib/data/registry';

// Display region = extent of the Mars Trek CTX mosaic (registry D05).
export const GALE_BOUNDS = {
  west: 135.1842593,
  east: 139.2413012,
  south: -6.5732988,
  north: -2.8077809,
};

// Extent of the Mars Trek HiRISE roving-site mosaic (registry D06).
export const GALE_HIRISE_BOUNDS = {
  west: 137.1224669,
  east: 137.7298129,
  south: -4.9254743,
  north: -4.2489588,
};

// Extent of the USGS MSL Gale merged DEM, 1 m (registry D01).
export const GALE_MSL_DEM_BOUNDS = {
  west: 137.124167,
  east: 137.680559,
  south: -5.098652,
  north: -4.129605,
};

// First record of NASA's waypoint file (sol 3, RMC 2_0), read during the source audit.
export const BRADBURY_LANDING = { lon: 137.441633, lat: -4.589467, elev: -4500.971 };

const gale = {
  id: 'gale',
  name: 'Gale Crater',
  // Lower-case form used in the top bar beside the wordmark.
  shortLabel: 'Gale crater',
  // Return to the crater/destination selector from both MAP and PLAY routes.
  backHref: '/explore',
  backLabel: '← DESTINATIONS',
  // Bare feature name, used in sentences such as "Outside the Gale data region".
  searchRegionLabel: 'Gale',
  // Example the coordinate box offers when it cannot parse what was typed.
  // Must be a point inside `bounds`.
  searchExample: '\u22124.59, 137.44',
  // Used in the PLAY placeholder of the workspace shell.
  playHeading: 'GALE CRATER / SURFACE OPERATIONS',
  playNote:
    'Astronaut exploration, missions, sample collection and science notebook are planned for the next phase. The scientific MAP workspace is available now.',
  overview:
    'An impact crater 154 km across with a mound of layered rock at its centre, Aeolis Mons. NASA’s Curiosity rover landed on the northern floor in 2012 and has been climbing the mound ever since.',

  // --- geography ------------------------------------------------------
  bounds: GALE_BOUNDS,
  // Projection origin: centre of the display region.
  origin: {
    lon: (GALE_BOUNDS.west + GALE_BOUNDS.east) / 2,
    lat: (GALE_BOUNDS.south + GALE_BOUNDS.north) / 2,
  },

  // --- camera ---------------------------------------------------------
  view: {
    // Opening view: the whole crater, looking north-east across Aeolis Mons.
    home: { lon: 137.7, lat: -5.0 },
    // Camera offset from the home target, in scene units (km), at start-up.
    start: { dx: -60, y: 150, dz: 190 },
    // "Fit the whole crater" distance, km.
    fitDistanceKm: 260,
  },

  // --- elevation ------------------------------------------------------
  terrain: {
    // Prepared by scripts/prepare_terrain.py crater / rover.
    craterUrl: '/data/terrain/crater',
    roverUrl: '/data/terrain/rover',
    // Rendering ceiling for the crater-wide mesh.
    maxRenderVerts: 1.7e6,
  },

  // --- imagery --------------------------------------------------------
  imagery: {
    // Mars Trek WMTS layers. `key` is the id used by the store and the panels.
    layers: {
      ctx: {
        key: 'ctx',
        id: 'Gale_CTX_BlockAdj_dd',
        datasetId: 'D05',
        label: 'CTX greyscale',
        // Used in the one-line "Detail window" readout, e.g. "HiRISE over CTX".
        shortLabel: 'CTX',
        ext: 'png',
        maxZoom: 12,
        bounds: GALE_BOUNDS,
      },
      hirise: {
        key: 'hirise',
        id: 'curiosity_hirise_mosaic',
        datasetId: 'D06',
        label: 'HiRISE greyscale',
        shortLabel: 'HiRISE',
        ext: 'png',
        maxZoom: 16,
        bounds: GALE_HIRISE_BOUNDS,
      },
    },
    // Crater-wide base texture: coarse pass, then the full base zoom.
    baseLayerKey: 'ctx',
    baseZoom: 9, // about 81 m/px over the whole region
    basePreviewZoom: 7,
    // Zoom used for the CTX underlay inside a detail patch.
    detailCtxZoom: 12,
    // High-resolution overlay drawn on top of CTX inside a detail patch.
    detailOverlayKey: 'hirise',
    // Panel copy for the two base-imagery choices and the detail overlay.
    baseDescription:
      'Orbital photograph of the surface, about 10 m per pixel. The base image everything else is drawn over.',
    detailOverlayName: 'HiRISE detail',
    detailOverlayDescription:
      'Very high resolution imagery (about 0.6 m per pixel) loaded as a window around the rover route as you zoom in.',
  },

  // --- level of detail ------------------------------------------------
  // Finest first. size in degrees (0.5 deg is about 30 km).
  detailLevels: [
    { name: 'C', maxDist: 2.5, size: 0.03125, overlayZoom: 16, rover: 'fine' },
    { name: 'B', maxDist: 10, size: 0.125, overlayZoom: 14, rover: 'coarse' },
    { name: 'A', maxDist: 40, size: 0.5, overlayZoom: null, rover: 'coarse' },
  ],

  // --- rover ----------------------------------------------------------
  rover: {
    id: 'msl',
    name: 'Curiosity',
    mission: 'Mars Science Laboratory',
    // Server adapter endpoints. The Gale URLs are the original ones, so the
    // request the browser makes is unchanged.
    waypointsUrl: '/api/rover/waypoints',
    traverseUrl: '/api/rover/traverse',
    waypointDatasetId: 'D12',
    traverseDatasetId: 'D13',
    landingSite: BRADBURY_LANDING,
    landedText: 'since landing in 2012',
    // Records outside these bounds are rejected by the adapter.
    bounds: GALE_BOUNDS,
  },

  // --- weather --------------------------------------------------------
  weather: {
    url: '/api/weather',
    datasetId: 'D22',
    instrument: 'REMS',
    // Prose that names the instrument and the place it measures.
    sourceNote:
      'Measured by REMS on Curiosity itself, so they describe one point in Gale, not the whole crater.',
    windNote: 'Wind has no calibrated speed or direction: the sensor was damaged early in the mission.',
    archiveNote:
      'The public daily feed has no record for this sol. Older sols are in the PDS REMS archive, which is not integrated.',
  },

  // --- science --------------------------------------------------------
  landmarks: {
    fixed: FIXED_LANDMARKS,
    solKeyed: SOL_LANDMARKS,
    // Dataset the resolved sol-keyed positions come from.
    waypointDatasetId: 'D12',
    // Dataset the official feature names come from (IAU gazetteer).
    nameDatasetId: 'D21',
    // Name and description of the tier-2 landmark layer. Gale's tier-2
    // landmarks are Curiosity's drill holes; another crater names its own.
    detailLayerName: 'Drill sites',
    detailLayerDescription:
      'Individual holes Curiosity drilled for sample analysis. Shown within about 30 km, positioned from the rover record for the drill sol.',
  },
  geology: {
    units: STRAT_UNITS,
    note: UNIT_NOTE,
    intro:
      'The rocks Curiosity drives over are grouped into units — bodies of rock that formed in the same way at roughly the same time. These descriptions come from published mapping, not from a data layer.',
    polygonsLockNote: 'No public GIS files exist for the published map',
    polygonsNote:
      'Gale’s geological map was published as a figure, not as data, so there is no unit layer to draw here. The written unit descriptions are in the Geology section of the inspector.',
  },
  unavailableLayers: UNAVAILABLE_LAYERS,

  // --- preparation hints shown when data are missing -------------------
  prepareCommand: 'python scripts/prepare_terrain.py crater',
  registryDoc: 'docs/GALE_DATA_REGISTRY.md',
};

export default gale;
