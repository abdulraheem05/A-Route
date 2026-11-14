// In-app dataset registry. Only verified metadata; unknown fields are null and
// render as "not stated by source".
// evidence: Measured | Derived | Interpreted | Simulated (spec §1).
//
// The D-numbered entries below are Gale's, from GALE_DATA_REGISTRY.md. A crater
// configuration may carry its own entries in a `datasets` field; the crater
// registry merges them in through registerDatasets so DatasetLink can open
// them the same way.

export const EVIDENCE = {
  Measured: { color: 'text-measured border-measured/40', note: 'Calibrated instrument output' },
  Derived: { color: 'text-derived border-derived/40', note: 'Computed from measurements by a documented method' },
  Interpreted: { color: 'text-interpreted border-interpreted/40', note: 'Scientific judgement about what the data mean' },
  Simulated: { color: 'text-simulated border-simulated/40', note: 'Model output' },
};

export const DATASETS = {
  D01: {
    id: 'D01',
    name: 'Mars MSL Gale Merged DEM 1 m (v3)',
    instrument: 'HiRISE, CTX (MRO); HRSC (Mars Express); controlled to MOLA',
    mission: 'MRO / Mars Express / MGS',
    evidence: 'Derived',
    resolutionNative: '1 m grid',
    resolutionEffective:
      '1 m only where HiRISE stereo exists; elsewhere filled from CTX, HRSC or MOLA with no source mask',
    coverage: '137.124167–137.680559°E, 5.098652–4.129605°S',
    units: 'metres above the areoid',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m',
    limitations:
      'Horizontal accuracy about 100 m where HRSC-controlled; about 1 m vertical. Fine-scale slope is conditional on the unknown source at each point.',
    citation: 'Calef III, F.J. and Parker, T., 2016, PDS Annex, USGS.',
    use: 'Rover-region elevation tiles (prepared locally by scripts/prepare_terrain.py rover).',
  },
  D02: {
    id: 'D02',
    name: '30-m HRSC DTM Mosaic of Gale Crater',
    instrument: 'HRSC',
    mission: 'Mars Express',
    evidence: 'Derived',
    resolutionNative: '30 m grid',
    resolutionEffective: 'Not stated by source; treat as 30 m or coarser',
    coverage: 'Gale crater (bounds read from file at preparation time)',
    units: 'metres',
    sourceUrl: 'https://zenodo.org/record/5808354',
    limitations:
      'No accuracy assessment on the record. Vertical datum must be checked against D01 before use (scripts/prepare_terrain.py check).',
    citation: 'Persaud, D.M., Putri, A.D.R., Muller, J.-P., 2021, Zenodo, doi:10.5281/zenodo.5808354 (CC BY 4.0).',
    use: 'Optional crater-wide elevation (prepare_terrain.py crater --source hrsc30).',
  },
  D03: {
    id: 'D03',
    name: 'MGS MOLA – MEX HRSC Blended DEM Global 200 m (v2)',
    instrument: 'MOLA; HRSC',
    mission: 'MGS / Mars Express',
    evidence: 'Derived',
    resolutionNative: '200 m grid',
    resolutionEffective: '200 m where HRSC DEMs exist; MOLA-interpolated elsewhere',
    coverage: 'Global (Gale window clipped at preparation time)',
    units: 'metres',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m',
    limitations: 'Interim product; blending artefacts in places; total elevation uncertainty at least ±3 m.',
    citation: 'Fergason, R.L., Hare, T.M., Laura, J., 2018, Astrogeology PDS Annex, USGS.',
    use: 'Default crater-wide elevation (prepare_terrain.py crater).',
  },
  D05: {
    id: 'D05',
    name: 'MRO CTX Gale Crater Mosaic (Mars Trek layer Gale_CTX_BlockAdj_dd)',
    instrument: 'Context Camera (CTX)',
    mission: 'Mars Reconnaissance Orbiter',
    evidence: 'Measured',
    resolutionNative: 'about 5–6 m/px',
    resolutionEffective: 'about 10 m/px at the service maximum (zoom 12)',
    coverage: '135.1842593–139.2413012°E, 6.5732988–2.8077809°S',
    units: '8-bit display brightness (not radiance)',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml',
    limitations:
      'Greyscale. A mosaic of images taken on different dates and lighting. Registration against the elevation data has not yet been measured.',
    citation: 'NASA/JPL-Caltech/MSSS; served by NASA Solar System Treks.',
    use: 'Base surface texture.',
  },
  D06: {
    id: 'D06',
    name: 'MRO HiRISE Curiosity Roving Site Mosaic (Mars Trek layer curiosity_hirise_mosaic)',
    instrument: 'HiRISE',
    mission: 'Mars Reconnaissance Orbiter',
    evidence: 'Measured',
    resolutionNative: '0.25–0.30 m/px',
    resolutionEffective: 'about 0.64 m/px at the service maximum (zoom 16)',
    coverage: '137.1224669–137.7298129°E, 4.9254743–4.2489588°S',
    units: '8-bit display brightness',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/WMTSCapabilities.xml',
    limitations: 'Greyscale. Covers the rover corridor only.',
    citation: 'NASA/JPL-Caltech/University of Arizona; served by NASA Solar System Treks.',
    use: 'Close-range surface texture inside its footprint.',
  },
  D12: {
    id: 'D12',
    name: 'Curiosity drive-end waypoints (MSL_waypoints.json)',
    instrument: 'Rover localisation',
    mission: 'Mars Science Laboratory',
    evidence: 'Derived',
    resolutionNative: 'One record per drive end',
    resolutionEffective: 'Relative positions sub-metre; absolute position tied to the mission basemap (order of 100 m)',
    coverage: 'Bradbury Landing to the current position',
    units: 'degrees; metres',
    sourceUrl: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
    limitations: 'Undocumented endpoint behind NASA’s location map. Not every sol has a record.',
    citation: 'NASA/JPL-Caltech.',
    use: 'Waypoints, position by sol, odometry, landmark positions.',
  },
  D13: {
    id: 'D13',
    name: 'Curiosity traverse path (MSL_traverse.json)',
    instrument: 'Rover localisation',
    mission: 'Mars Science Laboratory',
    evidence: 'Derived',
    resolutionNative: 'Dense 3-D vertices along each drive',
    resolutionEffective: null,
    coverage: 'Whole drive path',
    units: 'degrees; metres',
    sourceUrl: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
    limitations: 'Features carry no sol attribute; MarsWalk joins the path to waypoints by position.',
    citation: 'NASA/JPL-Caltech.',
    use: 'Traverse line.',
  },
  D21: {
    id: 'D21',
    name: 'IAU Gazetteer of Planetary Nomenclature',
    instrument: null,
    mission: 'IAU WGPSN / USGS',
    evidence: 'Interpreted',
    resolutionNative: 'Centres to 0.01° (about 600 m)',
    resolutionEffective: 'Extents are approximate (stated by the gazetteer)',
    coverage: 'Named features',
    units: 'degrees; km',
    sourceUrl: 'https://planetarynames.wr.usgs.gov/',
    limitations: 'Feature boundaries are approximate.',
    citation: 'Gazetteer of Planetary Nomenclature, IAU / USGS Astrogeology.',
    use: 'Official feature names and positions.',
  },
  D22: {
    id: 'D22',
    name: 'Curiosity REMS daily summary feed',
    instrument: 'Rover Environmental Monitoring Station (REMS)',
    mission: 'Mars Science Laboratory',
    evidence: 'Measured',
    resolutionNative: 'One record per sol, at the rover',
    resolutionEffective: null,
    coverage: 'The rover’s position on each sol',
    units: '°C; Pa (as labelled by NASA’s feed)',
    sourceUrl: 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json',
    limitations:
      'Calibrated wind does not exist (sensor damaged at landing). Humidity is not reported in the feed. The feed may lag.',
    citation: 'NASA/JPL-Caltech/CAB (CSIC-INTA).',
    use: 'Observed daily temperature, pressure and UV at the rover.',
  },
};

// Layers the specification calls for that are NOT available yet, with the reason.
export const UNAVAILABLE_LAYERS = [
  {
    name: 'CRISM spectral parameters (clay, sulfate, hematite indicators)',
    evidence: 'Derived',
    reason: 'Needs per-observation spectral processing of PDS cubes (registry D18). Not built.',
  },
  {
    name: 'Geological unit polygons',
    evidence: 'Interpreted',
    reason: 'No public GIS files exist for the published map (registry D16). Unit glossary only.',
  },
  {
    name: 'THEMIS thermal inertia (100 m)',
    evidence: 'Derived',
    reason: 'The USGS tile covering Gale has not been located (registry D19b).',
  },
  {
    name: 'Modelled atmosphere (Mars Climate Database)',
    evidence: 'Simulated',
    reason: 'Requires registration and an offline run (registry D24). Not built.',
  },
  {
    name: 'Natural-colour imagery',
    evidence: 'Measured',
    reason: 'No verified crater-wide colour dataset exists (gap G1).',
  },
];

// Merges a crater's own registry entries. Existing ids are not overwritten, so
// Gale's verified entries can never be replaced by another crater's.
export function registerDatasets(entries) {
  if (!entries) return DATASETS;
  for (const [id, entry] of Object.entries(entries)) {
    if (!DATASETS[id]) DATASETS[id] = entry;
  }
  return DATASETS;
}
