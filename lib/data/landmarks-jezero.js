// Jezero landmark definitions.
//
// Two kinds of position, exactly as for Gale (lib/data/landmarks.js):
//  - `lon`/`lat`: read from the IAU gazetteer.
//  - `sol`: resolved at run time from NASA's M20 waypoint record at or before
//    that sol, so no coordinate for these is stored in the code and none can
//    be invented.
//
// The sol-keyed entries are built from data/science-objects.json, the project's
// own sourced Jezero science catalogue, and their citations come from
// data/sources.json. Nothing here is written from scratch.
import objects from '@/data/science-objects.json';
import sources from '@/data/sources.json';

// Which catalogue entries are places on the map, and how prominent.
// tier 0 = always drawn, 1 = major site (within about 160 km),
// tier 2 = individual sample target (within about 30 km, and only with the
// "sample targets" layer on). Entries of the catalogue that are explainers
// rather than places are absent from this map and so are never pinned.
const TIERS = {
  'landing-site': 0,
  rochette: 1,
  'skinner-samples': 1,
  'wildcat-organics': 1,
  depot: 1,
  belva: 1,
  'margin-unit': 1,
  'cheyava-falls': 1,
  'rim-crest': 1,
  roubion: 2,
  brac: 2,
  issole: 2,
  sid: 2,
  amalik: 2,
  boulders: 2,
  'silver-mountain': 2,
  'falbreen-contact': 2,
  'crocodile-bridge-crust': 2,
};

const cite = (ids = []) =>
  ids
    .map((id) => (sources[id] ? sources[id].citation : null))
    .filter(Boolean)
    .join('; ');

export const JEZERO_SOL_LANDMARKS = objects
  .filter((o) => TIERS[o.id] !== undefined)
  .map((o) => ({
    id: o.id,
    name: o.name,
    nameClass: 'mission',
    type: o.category,
    sol: o.id === 'landing-site' ? 'first' : o.sol,
    tier: TIERS[o.id],
    significance: o.summary,
    source: cite(o.sources) || 'data/science-objects.json',
  }))
  .sort((a, b) => a.tier - b.tier);

// IAU-approved features. Only features whose gazetteer entry was read are here.
export const JEZERO_FIXED_LANDMARKS = [
  {
    id: 'jezero',
    name: 'Jezero',
    nameClass: 'iau',
    type: 'Crater',
    lon: 77.58,
    lat: 18.38,
    sizeKm: 45,
    tier: 0,
    significance:
      'A 45 km crater on the western edge of Isidis Planitia with two inlet valleys, one outlet valley and a fan-shaped deposit at the mouth of the western inlet — the landing site of NASA’s Perseverance rover.',
    source: 'IAU Gazetteer of Planetary Nomenclature; diameter as published in USGS SIM 3464',
    uncertainty: 'Centre to 0.01° (about 600 m); extent approximate',
    datasetId: 'D21',
  },
  {
    id: 'jezero-mons',
    name: 'Jezero Mons',
    nameClass: 'iau',
    type: 'Mons',
    lon: 78.23,
    lat: 18.16,
    bounds: { north: 18.39, south: 17.93, west: 77.99, east: 78.46 },
    sizeKm: 27,
    tier: 1,
    significance: 'Mountain south-east of Jezero crater, named after the crater. Approved by the IAU in September 2021.',
    source: 'IAU Gazetteer, feature 16005 (approved 2021-09-17)',
    uncertainty: 'Centre to 0.01° (about 600 m); extent approximate',
    datasetId: 'D21',
  },
];

export const JEZERO_LANDMARK_SET = {
  fixed: JEZERO_FIXED_LANDMARKS,
  solKeyed: JEZERO_SOL_LANDMARKS,
  waypointDatasetId: 'JZ12',
  nameDatasetId: 'D21',
  detailLayerName: 'Sample targets',
  detailLayerDescription:
    'Individual rocks and outcrops Perseverance sampled or examined closely. Shown within about 30 km, positioned from the rover record for that sol.',
};

export default JEZERO_LANDMARK_SET;
