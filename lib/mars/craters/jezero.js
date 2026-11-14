// Jezero Crater configuration.
//
// Every geographic and dataset value here was read from a source, not assumed:
//
//   bounds, CTX layer id / zoom ceiling
//     NASA Mars Trek WMTSCapabilities for layer Jezero_CTX_BlockAdj_dd —
//     ows:BoundingBox 75.1537692 15.9058484 to 78.8717121 19.4453003,
//     TileMatrixSet default028mm, image/png, highest TileMatrix 12.
//     https://trek.nasa.gov/tiles/Mars/EQ/Jezero_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml
//
//   HiRISE layer id / bounds / zoom ceiling
//     NASA Mars Trek WMTSCapabilities for layer
//     JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd —
//     ows:BoundingBox 77.2229331 18.3067994 to 77.583964 18.669315,
//     image/png, highest TileMatrix 17.
//
//   landing site
//     First record of NASA's M20 waypoint file (site 3, drive 0), already in
//     this project as LANDING in lib/mars/constants-jezero.js.
//
//   elevation
//     Mars 2020 Science Investigation CTX DEM Mosaic, 20 m/pixel, prepared to a
//     100 m grid by scripts/prepare_terrain.py crater --region jezero.
//
//   crater centre and diameter (used only to frame the opening camera)
//     IAU Gazetteer of Planetary Nomenclature; 45 km diameter as published in
//     USGS SIM 3464.
//
// The display region is the extent of the CTX mosaic, which is the same rule
// Gale follows. scripts/prepare_terrain.py clips the DEM to exactly these
// bounds, so elevation and imagery cover the same ground.
import { LANDING } from '@/lib/mars/constants-jezero';
import { JEZERO_LANDMARK_SET } from '@/lib/data/landmarks-jezero';

export const JEZERO_BOUNDS = {
  west: 75.1537692,
  east: 78.8717121,
  south: 15.9058484,
  north: 19.4453003,
};

// Extent of the Mars Trek HiRISE orthomosaic of the Mars 2020 landing site.
export const JEZERO_HIRISE_BOUNDS = {
  west: 77.2229331,
  east: 77.583964,
  south: 18.3067994,
  north: 18.669315,
};

// Octavia E. Butler Landing, from NASA's M20 waypoint file.
export const OCTAVIA_BUTLER_LANDING = { lon: LANDING.lon, lat: LANDING.lat, elev: LANDING.elev };

// Dataset-registry entries for Jezero's own data, merged into the shared
// registry by lib/mars/craters/index.js so DatasetLink can open them.
export const JEZERO_DATASETS = {
  JZ20: {
    id: 'JZ20',
    name: 'Mars 2020 Science Investigation CTX DEM Mosaic (20 m)',
    instrument: 'Context Camera (CTX) stereo pairs',
    mission: 'Mars Reconnaissance Orbiter / Mars 2020',
    evidence: 'Derived',
    resolutionNative: '20 m grid',
    resolutionEffective: 'Resampled to 100 m for the crater-wide grid in this app',
    coverage: 'Jezero crater and surroundings (clipped here to the CTX mosaic window)',
    units: 'metres',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic',
    limitations:
      'Stereo-derived: coverage and quality follow the stereo pairs, and gaps carry no data rather than an interpolated value. The vertical datum has not been reconciled against the rover waypoint elevations in this app; the datum check printed at preparation time records the difference.',
    citation:
      'Calef, F. (2021). Mars 2020 Science Investigation CTX DEM Mosaic (20 m/pixel). USGS Astrogeology Science Center.',
    use: 'Crater-wide elevation (prepare_terrain.py crater --region jezero).',
  },
  JZ05: {
    id: 'JZ05',
    name: 'MRO CTX Jezero Mosaic (Mars Trek layer Jezero_CTX_BlockAdj_dd)',
    instrument: 'Context Camera (CTX)',
    mission: 'Mars Reconnaissance Orbiter',
    evidence: 'Measured',
    resolutionNative: 'about 5–6 m/px',
    resolutionEffective: 'about 10 m/px at the service maximum (zoom 12)',
    coverage: '75.1537692–78.8717121°E, 15.9058484–19.4453003°N',
    units: '8-bit display brightness (not radiance)',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Jezero_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml',
    limitations:
      'Greyscale. A mosaic of images taken on different dates and lighting. Registration against the elevation data has not been measured in this app.',
    citation: 'NASA/JPL-Caltech/MSSS; served by NASA Solar System Treks.',
    use: 'Base surface texture.',
  },
  JZ06: {
    id: 'JZ06',
    name: 'MRO HiRISE Mars 2020 landing-site orthomosaic (Mars Trek layer JEZ_hirise_soc_006_orthoMosaic_25cm)',
    instrument: 'HiRISE',
    mission: 'Mars Reconnaissance Orbiter',
    evidence: 'Measured',
    resolutionNative: '0.25 m/px',
    resolutionEffective: 'about 0.31 m/px at the service maximum (zoom 17)',
    coverage: '77.2229331–77.583964°E, 18.3067994–18.669315°N',
    units: '8-bit display brightness',
    sourceUrl:
      'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    limitations: 'Greyscale. Covers the landing-site region only.',
    citation: 'NASA/JPL-Caltech/University of Arizona; served by NASA Solar System Treks.',
    use: 'Close-range surface texture inside its footprint.',
  },
  JZ12: {
    id: 'JZ12',
    name: 'Perseverance drive-end waypoints (M20_waypoints.json)',
    instrument: 'Rover localisation',
    mission: 'Mars 2020',
    evidence: 'Derived',
    resolutionNative: 'One record per drive end',
    resolutionEffective:
      'Relative positions sub-metre; absolute position tied to the mission basemap (order of 100 m)',
    coverage: 'Octavia E. Butler Landing to the current position',
    units: 'degrees; metres',
    sourceUrl: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
    limitations:
      'Undocumented endpoint behind NASA’s location map. Not every sol has a record. The bundled snapshot in data/traverse.json is decimated to roughly one waypoint every eight sols and carries no drive distance, record number or rover attitude.',
    citation: 'NASA/JPL-Caltech.',
    use: 'Waypoints, position by sol, landmark positions.',
  },
};

const jezero = {
  id: 'jezero',
  name: 'Jezero Crater',
  shortLabel: 'Jezero crater',
  searchRegionLabel: 'Jezero',
  searchExample: '18.44, 77.45',
  playHeading: 'JEZERO CRATER / SURFACE OPERATIONS',
  playNote:
    'First-person surface exploration of the Jezero landing region, with missions, sample collection and a science notebook.',
  overview:
    'A 45 km crater on the western edge of Isidis Planitia that once held a lake. Two inlet valleys and a fan-shaped delta at the mouth of the western inlet record the water that filled it. NASA’s Perseverance rover landed on the crater floor in February 2021 and has since crossed the delta and climbed the western rim.',

  // Back to the destination selector — the old Jezero shell had this in its
  // own header. Gale sets none.
  backHref: '/explore',
  backLabel: '← DESTINATIONS',

  // --- geography ------------------------------------------------------
  bounds: JEZERO_BOUNDS,
  origin: {
    lon: (JEZERO_BOUNDS.west + JEZERO_BOUNDS.east) / 2,
    lat: (JEZERO_BOUNDS.south + JEZERO_BOUNDS.north) / 2,
  },

  // --- camera ---------------------------------------------------------
  // Opening view: the crater from the south-west, looking north-east across
  // the delta. The offsets are Gale's geometry scaled to a 45 km crater
  // instead of a 154 km one, so the crater fills the frame the same way.
  view: {
    home: { lon: 77.58, lat: 18.38 },
    start: { dx: -18, y: 44, dz: 55 },
    fitDistanceKm: 80,
  },

  // --- elevation ------------------------------------------------------
  terrain: {
    craterUrl: '/data/terrain/jezero',
    // No 1 m-class DEM tiles are prepared for Jezero, so there is no
    // rover-region layer. The crater grid answers every elevation query.
    roverUrl: null,
    maxRenderVerts: 1.7e6,
  },

  // --- imagery --------------------------------------------------------
  imagery: {
    layers: {
      ctx: {
        key: 'ctx',
        id: 'Jezero_CTX_BlockAdj_dd',
        datasetId: 'JZ05',
        label: 'CTX greyscale',
        shortLabel: 'CTX',
        ext: 'png',
        maxZoom: 12,
        bounds: JEZERO_BOUNDS,
      },
      hirise: {
        key: 'hirise',
        id: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
        datasetId: 'JZ06',
        label: 'HiRISE greyscale',
        shortLabel: 'HiRISE',
        ext: 'png',
        maxZoom: 17,
        bounds: JEZERO_HIRISE_BOUNDS,
      },
    },
    baseLayerKey: 'ctx',
    baseZoom: 9,
    basePreviewZoom: 7,
    detailCtxZoom: 12,
    detailOverlayKey: 'hirise',
    baseDescription:
      'Orbital photograph of the surface, about 10 m per pixel. The base image everything else is drawn over.',
    detailOverlayName: 'HiRISE detail',
    detailOverlayDescription:
      'Very high resolution imagery (about 0.3 m per pixel) loaded as a window around the landing region as you zoom in.',
  },

  // --- level of detail ------------------------------------------------
  // Same windows as Gale. The overlay zooms are the finest that fill a patch
  // without exceeding the 3072 px texture the detail patch builds, so the
  // HiRISE mosaic is shown at its served resolution rather than magnified.
  detailLevels: [
    { name: 'C', maxDist: 2.5, size: 0.03125, overlayZoom: 16, rover: 'fine' },
    { name: 'B', maxDist: 10, size: 0.125, overlayZoom: 14, rover: 'coarse' },
    { name: 'A', maxDist: 40, size: 0.5, overlayZoom: null, rover: 'coarse' },
  ],

  // --- rover ----------------------------------------------------------
  rover: {
    id: 'm20',
    name: 'Perseverance',
    mission: 'Mars 2020',
    waypointsUrl: '/api/rover/waypoints?mission=m20',
    // NASA publishes a dense traverse path for Curiosity (MSL_traverse.json).
    // No equivalent M20 file has been verified, so there is no traverse line
    // for Jezero: the waypoints are drawn, and the interface says the path is
    // not available rather than drawing a straight-line guess between them.
    traverseUrl: null,
    waypointDatasetId: 'JZ12',
    traverseDatasetId: null,
    landingSite: OCTAVIA_BUTLER_LANDING,
    landedText: 'since landing in February 2021',
    bounds: JEZERO_BOUNDS,
  },

  // --- weather --------------------------------------------------------
  // Perseverance carries MEDA, but no public per-sol summary feed of the shape
  // this app's adapter reads has been verified, so no weather source is
  // configured and the panel says so.
  weather: null,

  // --- science --------------------------------------------------------
  landmarks: JEZERO_LANDMARK_SET,
  geology: {
    // No unit glossary is loaded for Jezero. The published mapping exists
    // (USGS SIM 3464) but has not been read into this app, so nothing is
    // asserted here. The panel reports that rather than guessing.
    units: [],
    note: null,
    intro: null,
    polygonsLockNote: 'The published geologic map has not been read into this app',
    polygonsNote:
      'Jezero’s geology is mapped in USGS Scientific Investigations Map 3464, which has not been read into this app, so there is no unit layer to draw and no written glossary yet.',
  },
  unavailableLayers: [
    {
      name: 'Geological unit polygons and glossary',
      evidence: 'Interpreted',
      reason:
        'USGS SIM 3464 maps the Jezero region, but its units have not been read into this app. Nothing is shown in their place.',
    },
    {
      name: 'Rover traverse path',
      evidence: 'Derived',
      reason:
        'NASA publishes a dense path file for Curiosity. No verified equivalent for Perseverance has been located, so only drive-end waypoints are drawn.',
    },
    {
      name: 'Observed weather',
      evidence: 'Measured',
      reason:
        'Perseverance carries MEDA, but no public per-sol summary feed matching this app’s adapter has been verified.',
    },
    {
      name: 'Rover-region elevation at 1 m',
      evidence: 'Derived',
      reason:
        'A 1 m HiRISE DTM of the landing site exists but is far too large to prepare here. Elevation comes from the 20 m CTX DEM everywhere.',
    },
  ],
  datasets: JEZERO_DATASETS,

  prepareCommand:
    'python scripts/prepare_terrain.py crater --region jezero --source jezero_ctxdem --input "data/raw/M20_JezeroCrater_CTXDEM_20m.tif" --res 100',
  registryDoc: 'README_JEZERO_MAP.md',
};

export default jezero;
