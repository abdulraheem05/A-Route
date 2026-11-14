// Crater registry.
//
// A crater becomes available to the shared explorer by being added here. The
// shared components read everything crater-specific from these configuration
// objects, so adding one needs no change to the renderer, the panels or the
// hooks — only a configuration file, its datasets, and a route that renders
// <CraterWorkspace crater={...} />.
//
// ./gale.js and ./jezero.js are both worked examples; docs/CRATER_ARCHITECTURE.md
// describes what a configuration supplies and how to add one.
import gale from '@/lib/mars/craters/gale';
import jezero from '@/lib/mars/craters/jezero';
import { registerDatasets } from '@/lib/data/registry';

const list = [gale, jezero];

export const CRATERS = list.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

// A crater may ship its own dataset-registry entries; they are merged into the
// shared registry so DatasetLink can open them.
for (const c of list) {
  if (c.datasets) registerDatasets(c.datasets);
}

// The crater the explorer falls back to when none is named. Gale is the
// reference implementation, so it stays the default.
export const DEFAULT_CRATER_ID = 'gale';

export function getCrater(id) {
  return CRATERS[id] || null;
}

export function listCraters() {
  return list.slice();
}

export const defaultCrater = CRATERS[DEFAULT_CRATER_ID];

export default CRATERS;
