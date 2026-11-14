// Gale landmark definitions from GALE_LANDMARK_REGISTRY.md, plus the
// crater-independent helpers that place them.
//
// The two arrays below are Gale's and are referenced by lib/mars/craters/gale.js.
// resolveLandmarks takes whichever landmark set it is given, so another crater
// supplies its own arrays in its own file and nothing here changes.
//
// Two kinds of position:
//  - `lon`/`lat`: read from a source during the audit (IAU gazetteer).
//  - `sol`: the position is resolved at run time from NASA's waypoint file as
//    the rover's drive-end record at or before that sol. No coordinate for
//    these is stored in the code, so none can be invented.
// `unit` is filled only where a source read during the audit states it.

export const NAME_CLASS = {
  iau: 'IAU-approved name',
  mission: 'Mission (informal) name',
};

export const FIXED_LANDMARKS = [
  {
    id: 'aeolis-mons',
    name: 'Aeolis Mons',
    alias: 'Mount Sharp (informal)',
    nameClass: 'iau',
    type: 'Mons',
    lon: 137.85,
    lat: -5.08,
    bounds: { north: -4.46, south: -5.61, west: 137.11, east: 138.62 },
    sizeKm: 88.99,
    tier: 0,
    significance:
      'Mound of layered sedimentary rock in the centre of Gale. Not a volcano. Lower strata carry clay, sulfate and iron-oxide spectral signatures from orbit.',
    source: 'IAU Gazetteer, feature 15000 (approved 2012-05-16)',
    uncertainty: 'Centre to 0.01° (about 600 m); extent approximate',
    datasetId: 'D21',
  },
  {
    id: 'aeolis-palus',
    name: 'Aeolis Palus',
    nameClass: 'iau',
    type: 'Palus (plain)',
    lon: 137.42,
    lat: -4.47,
    bounds: { north: -4.18, south: -5.39, west: 136.75, east: 138.65 },
    sizeKm: 111.63,
    tier: 0,
    significance: 'Crater-floor plain between the northern wall and the mound. Contains Bradbury Landing.',
    source: 'IAU Gazetteer, feature 15001 (approved 2012-05-16)',
    uncertainty: 'Centre to 0.01° (about 600 m); extent approximate',
    datasetId: 'D21',
  },
  {
    id: 'peace-vallis',
    name: 'Peace Vallis',
    nameClass: 'iau',
    type: 'Vallis',
    lon: 137.23,
    lat: -4.21,
    sizeKm: 35.24,
    tier: 0,
    significance:
      'Valley cut through the northern rim that fed an alluvial fan on the crater floor near the landing site.',
    source: 'IAU Gazetteer, feature 15036 (approved 2012-09-26)',
    uncertainty: 'Centre to 0.01° (about 600 m)',
    datasetId: 'D21',
  },
  {
    id: 'gediz-vallis',
    name: 'Gediz Vallis',
    nameClass: 'iau',
    type: 'Vallis',
    lon: 137.44,
    lat: -4.85,
    bounds: { north: -4.77, south: -4.91, west: 137.38, east: 137.48 },
    sizeKm: 8.29,
    tier: 1,
    significance: 'Canyon on the north-west flank of Aeolis Mons along Curiosity’s later route.',
    source: 'IAU Gazetteer, feature 15571 (approved 2017-05-01)',
    uncertainty: 'Centre to 0.01° (about 600 m); extent approximate',
    datasetId: 'D21',
  },
  {
    id: 'farah-vallis',
    name: 'Farah Vallis',
    nameClass: 'iau',
    type: 'Vallis',
    lon: 136.8,
    lat: -6.03,
    sizeKm: 76.37,
    tier: 0,
    significance: 'Large valley entering the crater through the south-west rim.',
    source: 'IAU Gazetteer, feature 15109',
    uncertainty: 'Centre to 0.01° (about 600 m)',
    datasetId: 'D21',
  },
];

const DRILL_SOURCE = 'Drill sol: Curiosity drill-attempt table (PMC8981195, Table 3) / NASA image captions';

// tier 1 = major exploration site, tier 2 = individual drill site.
export const SOL_LANDMARKS = [
  {
    id: 'bradbury',
    name: 'Bradbury Landing',
    nameClass: 'mission',
    type: 'Landing site',
    sol: 'first',
    tier: 0,
    significance: 'Where Curiosity touched down in August 2012. First record of NASA’s waypoint file.',
    source: 'NASA waypoint file, first record (sol 3, RMC 2_0)',
  },
  {
    id: 'john-klein',
    name: 'Yellowknife Bay — “John Klein”',
    nameClass: 'mission',
    type: 'Drill site',
    sol: 182,
    tier: 1,
    unit: 'Sheepbed member, Yellowknife Bay formation',
    significance:
      'First drilled sample. Mudstone interpreted as a shallow-lake deposit; the samples contain clay minerals and sulfate salts alongside detrital basaltic minerals.',
    source: DRILL_SOURCE,
  },
  { id: 'cumberland', name: '“Cumberland”', nameClass: 'mission', type: 'Drill site', sol: 279, tier: 2, unit: 'Sheepbed member, Yellowknife Bay formation', significance: 'Second drilled sample, a few metres from John Klein.', source: DRILL_SOURCE },
  { id: 'windjana', name: 'The Kimberley — “Windjana”', nameClass: 'mission', type: 'Drill site', sol: 621, tier: 1, significance: 'Sandstone outcrop on the crater floor; third drilled sample.', source: DRILL_SOURCE },
  {
    id: 'confidence-hills',
    name: 'Pahrump Hills — “Confidence Hills”',
    nameClass: 'mission',
    type: 'Drill site',
    sol: 759,
    tier: 1,
    unit: 'Murray formation (base of the Mount Sharp group)',
    significance: 'Where Curiosity first reached Mount Sharp strata; first sample of the Murray formation.',
    source: DRILL_SOURCE,
  },
  { id: 'mojave', name: '“Mojave”', nameClass: 'mission', type: 'Drill site', sol: 882, tier: 2, unit: 'Murray formation', significance: 'Mudstone sample at Pahrump Hills.', source: DRILL_SOURCE },
  { id: 'telegraph-peak', name: '“Telegraph Peak”', nameClass: 'mission', type: 'Drill site', sol: 908, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'buckskin', name: '“Buckskin”', nameClass: 'mission', type: 'Drill site', sol: 1060, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'big-sky', name: '“Big Sky”', nameClass: 'mission', type: 'Drill site', sol: 1119, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'greenhorn', name: '“Greenhorn”', nameClass: 'mission', type: 'Drill site', sol: 1137, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'lubango', name: '“Lubango”', nameClass: 'mission', type: 'Drill site', sol: 1320, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'okoruso', name: '“Okoruso”', nameClass: 'mission', type: 'Drill site', sol: 1332, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'oudam', name: '“Oudam”', nameClass: 'mission', type: 'Drill site', sol: 1361, tier: 2, unit: 'Murray formation', significance: 'Mudstone sample.', source: DRILL_SOURCE },
  { id: 'marimba', name: '“Marimba”', nameClass: 'mission', type: 'Drill site', sol: 1422, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  {
    id: 'quela',
    name: 'Murray Buttes — “Quela”',
    nameClass: 'mission',
    type: 'Drill site',
    sol: 1464,
    tier: 1,
    unit: 'Murray formation',
    significance: 'Mudstone sample among the layered buttes at the base of Mount Sharp.',
    source: DRILL_SOURCE,
  },
  { id: 'sebina', name: '“Sebina”', nameClass: 'mission', type: 'Drill site', sol: 1495, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  {
    id: 'vrr',
    name: 'Vera Rubin ridge — campaign start',
    nameClass: 'mission',
    type: 'Ridge (rover position at campaign start)',
    sol: 1726,
    tier: 1,
    significance:
      'Erosion-resistant ridge with a hematite signature from orbit (about 200 m wide and 6.5 km long as mapped). Rover results indicate the ridge was hardened by diagenesis. Campaign sols 1726–2302.',
    source: 'Fraeman et al. 2020 (campaign sols); Fraeman et al. 2016 (orbital dimensions)',
  },
  { id: 'duluth', name: '“Duluth”', nameClass: 'mission', type: 'Drill site', sol: 2057, tier: 2, significance: 'Drilled sample just below the ridge.', source: DRILL_SOURCE },
  { id: 'rock-hall', name: '“Rock Hall”', nameClass: 'mission', type: 'Drill site', sol: 2261, tier: 2, significance: 'Drilled sample on Vera Rubin ridge.', source: DRILL_SOURCE },
  {
    id: 'aberlady',
    name: 'Glen Torridon — “Aberlady”',
    nameClass: 'mission',
    type: 'Drill site',
    sol: 2370,
    tier: 1,
    significance:
      'First drill site in Glen Torridon, the region with the strongest clay signature from orbit. The campaign (January 2019 – January 2021) covered about 5 km and 11 drill holes and found the highest clay abundances of the mission.',
    source: `${DRILL_SOURCE}; Bennett et al. 2023, doi:10.1029/2022JE007185`,
  },
  { id: 'kilmarie', name: '“Kilmarie”', nameClass: 'mission', type: 'Drill site', sol: 2384, tier: 2, significance: 'Drilled sample in Glen Torridon.', source: DRILL_SOURCE },
  { id: 'glen-etive', name: '“Glen Etive”', nameClass: 'mission', type: 'Drill site', sol: 2486, tier: 2, significance: 'Drilled sample in Glen Torridon (second hole on sol 2527).', source: DRILL_SOURCE },
  { id: 'hutton', name: '“Hutton”', nameClass: 'mission', type: 'Drill site', sol: 2668, tier: 2, significance: 'Drilled sample.', source: DRILL_SOURCE },
  { id: 'edinburgh', name: '“Edinburgh”', nameClass: 'mission', type: 'Drill site', sol: 2711, tier: 2, significance: 'Drilled sample (low rate of penetration).', source: DRILL_SOURCE },
  { id: 'glasgow', name: '“Glasgow”', nameClass: 'mission', type: 'Drill site', sol: 2754, tier: 2, significance: 'Drilled sample in Glen Torridon.', source: DRILL_SOURCE },
  { id: 'mary-anning', name: '“Mary Anning”', nameClass: 'mission', type: 'Drill site', sol: 2838, tier: 2, significance: 'Drilled sample in Glen Torridon.', source: DRILL_SOURCE },
];

// Largest waypoint index whose sol <= target (waypoints sorted by sol). -1 if none.
export function waypointIndexAtSol(waypoints, sol) {
  let lo = 0;
  let hi = waypoints.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (waypoints[mid].sol <= sol) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

// Resolves every landmark to a position. Sol-keyed landmarks that cannot be
// resolved (no rover data loaded, or the file ends before that sol) are omitted.
//
// `source` is { fixed, solKeyed } — a crater's landmark set. It defaults to
// Gale's, so callers that do not pass one behave exactly as before.
export const GALE_LANDMARK_SET = { fixed: FIXED_LANDMARKS, solKeyed: SOL_LANDMARKS };

export function resolveLandmarks(waypoints, source) {
  const set = source || GALE_LANDMARK_SET;
  const fixed = set.fixed || [];
  const solKeyed = set.solKeyed || [];
  const waypointDatasetId = set.waypointDatasetId || 'D12';
  const out = fixed.map((l) => ({
    ...l,
    positionBasis: 'Feature centre from the IAU gazetteer',
  }));
  if (waypoints && waypoints.length) {
    const maxSol = waypoints[waypoints.length - 1].sol;
    for (const l of solKeyed) {
      let wp = null;
      if (l.sol === 'first') wp = waypoints[0];
      else if (l.sol <= maxSol) {
        const i = waypointIndexAtSol(waypoints, l.sol);
        if (i >= 0) wp = waypoints[i];
      }
      if (!wp) continue;
      out.push({
        ...l,
        lon: wp.lon,
        lat: wp.lat,
        elev: wp.elev,
        resolvedSol: wp.sol,
        rmc: wp.rmc,
        datasetId: waypointDatasetId,
        positionBasis:
          l.sol === 'first'
            ? `First record of NASA’s waypoint file (sol ${wp.sol})`
            : `Rover drive-end position at or before sol ${l.sol} (record: sol ${wp.sol}, RMC ${wp.rmc}). The feature itself is within arm’s reach of the rover.`,
        uncertainty: 'Relative position sub-metre; absolute position tied to the mission basemap (order of 100 m)',
      });
    }
  }
  return out;
}
