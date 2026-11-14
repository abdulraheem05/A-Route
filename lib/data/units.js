// Stratigraphic glossary (GALE_LANDMARK_REGISTRY.md §E). Interpreted units:
// bodies of rock, not places, so they are listed here and never drawn as pins.
export const STRAT_UNITS = [
  {
    name: 'Siccar Point group',
    rank: 'Group',
    text: 'Unconformably overlies the Mount Sharp group.',
    source: 'Fraeman et al. 2016',
  },
  {
    name: 'Stimson formation',
    rank: 'Formation',
    text: 'Cross-bedded aeolian sandstone.',
    source: 'Fraeman et al. 2016; Bennett et al. 2023',
  },
  {
    name: 'Mount Sharp group',
    rank: 'Group',
    text: 'Strata of lower Mount Sharp. Mapped from orbit as seven units, including a phyllosilicate unit, a hematite ridge and a layered sulfate unit.',
    source: 'Fraeman et al. 2016',
  },
  {
    name: 'Carolyn Shoemaker formation',
    rank: 'Formation',
    text: 'Defined in Glen Torridon where cross-bedded sandstones record more energetic river settings above the Murray formation.',
    source: 'Bennett et al. 2023',
  },
  {
    name: 'Murray formation',
    rank: 'Formation',
    text: 'Finely laminated lake mudstone with rare cross-bedded sandstone; the lowest exposed strata of the Mount Sharp group.',
    source: 'Rampe et al. 2017; Fraeman et al. 2016',
  },
  {
    name: 'Bradbury group',
    rank: 'Group',
    text: 'Strata explored on the crater floor; with the Mount Sharp group, the oldest strata in Gale.',
    source: 'Fraeman et al. 2016, citing Grotzinger et al. 2015',
  },
  {
    name: 'Yellowknife Bay formation',
    rank: 'Formation',
    text: 'Includes the Sheepbed mudstone member sampled at John Klein and Cumberland.',
    source: 'Vaniman et al. 2014',
  },
];

export const UNIT_NOTE =
  'Formations and groups are interpretations. Contacts are known where the rover crossed them and inferred elsewhere. No unit polygons are drawn because no public vector map exists.';
