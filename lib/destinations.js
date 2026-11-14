/**
 * Mars destination catalogue — the single source of truth for the selection
 * grid. Cards are generated from this array; nothing is hardcoded in JSX.
 *
 * To add a site: append an entry, drop a matching thumbnail into
 * /public/images/mars/destinations/, and it appears. To open a site up, change
 * its `status` to 'unlocked'. Interactive maps are gated separately by
 * `interactive`, which is false everywhere in Phase 1 — see the note below.
 */

export const DESTINATION_STATUS = {
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
};

/**
 * Phase 1 gate.
 *
 * Jezero and Gale read as available, but no card navigates anywhere: the
 * scientific map and the surface experience land in a later phase. Flip this
 * to true (and give the unlocked entries an `href`/handler) when the Jezero
 * MAP and PLAY routes exist.
 */
export const DESTINATIONS_INTERACTIVE = false;

export const destinations = [
  {
    id: 'jezero',
    name: 'Jezero Crater',
    region: 'Nili Fossae, NW Isidis Planitia',
    coordinates: '18.4° N, 77.5° E',
    terrain: 'Delta and lake-floor sediments',
    description:
      'A 45 km crater on the western rim of Isidis, holding the fan of an inflowing river delta and clay-bearing lake deposits.',
    image: '/images/mars/destinations/jezero.jpg',
    status: DESTINATION_STATUS.UNLOCKED,
  },
  {
    id: 'gale',
    name: 'Gale Crater',
    region: 'Aeolis Mensae, highland boundary',
    coordinates: '5.4° S, 137.8° E',
    terrain: 'Layered sedimentary mound',
    description:
      'A 154 km crater on the highland-lowland divide, built around Aeolis Mons: a five-kilometre stack of wind-stripped strata.',
    image: '/images/mars/destinations/gale.jpg',
    status: DESTINATION_STATUS.UNLOCKED,
  },
  {
    id: 'gusev',
    name: 'Gusev Crater',
    region: 'Aeolis quadrangle',
    coordinates: '14.6° S, 175.5° E',
    terrain: 'Basaltic plains and eroded hills',
    description:
      'A 166 km basin at the mouth of Ma’adim Vallis, floored by basalt and flanked by the deeply weathered Columbia Hills.',
    image: '/images/mars/destinations/gusev.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
  {
    id: 'meridiani',
    name: 'Meridiani Planum',
    region: 'Sinus Meridiani, equatorial',
    coordinates: '2.0° S, 6.0° W',
    terrain: 'Hematite-rich sedimentary plain',
    description:
      'A smooth equatorial plain of haematite-bearing rock, where shallow craters cut down into ancient sulphate bedrock.',
    image: '/images/mars/destinations/meridiani.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
  {
    id: 'ares-vallis',
    name: 'Ares Vallis',
    region: 'Chryse Planitia outflow',
    coordinates: '19.1° N, 33.2° W',
    terrain: 'Flood channel and rock fields',
    description:
      'A 1,500 km outflow channel draining the southern highlands into Chryse, littered with rock carried by catastrophic floods.',
    image: '/images/mars/destinations/ares-vallis.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
  {
    id: 'utopia',
    name: 'Utopia Planitia',
    region: 'Northern lowlands',
    coordinates: '46.7° N, 117.5° E',
    terrain: 'Ice-rich mantled plains',
    description:
      'One of the largest impact basins on the planet: a vast northern lowland with scalloped hollows and polygonal, ice-bound ground.',
    image: '/images/mars/destinations/utopia.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
  {
    id: 'elysium',
    name: 'Elysium Planitia',
    region: 'Cerberus plains',
    coordinates: '4.5° N, 135.9° E',
    terrain: 'Young volcanic plain',
    description:
      'A flat equatorial lava plain carrying some of the youngest volcanic surfaces on Mars, fractured by the Cerberus Fossae.',
    image: '/images/mars/destinations/elysium.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris',
    region: 'East of Tharsis',
    coordinates: '13.9° S, 59.2° W',
    terrain: 'Rift canyon and landslide debris',
    description:
      'A 4,000 km canyon system up to seven kilometres deep, its walls exposing layered crust and enormous collapse deposits.',
    image: '/images/mars/destinations/valles-marineris.jpg',
    status: DESTINATION_STATUS.LOCKED,
  },
];

/**
 * Grid shape, documented in one place.
 * The Tailwind classes in components/destinations/DestinationGrid.js mirror
 * these values (class names have to be literal for Tailwind to see them).
 */
export const DESTINATION_GRID = {
  columns: { mobile: 1, mobileWide: 2, tablet: 2, desktop: 4 },
  desktopRows: 2,
  /** Tailwind breakpoint (px) at which the second column appears. */
  twoColumnBreakpoint: 480,
  /** Tailwind breakpoint (px) at which the full four-column layout appears. */
  fourColumnBreakpoint: 1280,
};

export function isUnlocked(destination) {
  return destination.status === DESTINATION_STATUS.UNLOCKED;
}

export function getDestination(id) {
  return destinations.find((destination) => destination.id === id) || null;
}

export function unlockedDestinations() {
  return destinations.filter(isUnlocked);
}

export default destinations;
