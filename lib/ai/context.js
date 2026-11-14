// Builds the context object sent to /api/ai. Only data already in the app is included.
import { WORLD, MISSIONS, PANORAMA_BY_ID, sourceList } from '../scientific-data/index.js';
import { getHeightfield } from '../terrain/heightfield.js';
import { missionProgress } from '../missions/index.js';

export function buildAiContext(state, extra = {}) {
  const hf = getHeightfield();
  const mission = MISSIONS[state.missionIndex];
  const p = state.player;
  const ctx = {
    player: { latitude: +p.lat.toFixed(5), longitude: +p.lon.toFixed(5), elevationM: Math.round(p.elev), slopeDeg: +p.slope.toFixed(1) },
    terrainModel: hf ? { kind: hf.meta.kind, calibrated: hf.meta.calibrated, metresPerPixel: hf.meta.metresPerPixel, method: hf.meta.method, limitations: hf.meta.limitations } : null,
    mission: mission && {
      number: mission.sequence, title: mission.title, location: mission.location, sols: mission.sols,
      scientificObjective: mission.scientificObjective, context: mission.scientificContext,
      progress: missionProgress(mission, state.done), sources: sourceList(mission.sources).map((s) => s.citation),
    },
  };
  const site = extra.siteId ? WORLD.siteById[extra.siteId] : state.nearbySiteId ? WORLD.siteById[state.nearbySiteId] : null;
  if (site) {
    ctx.site = {
      name: site.name, latitude: site.lat, longitude: site.lon, roverElevationM: site.roverElev,
      positionConfidence: site.confidence, positionUncertaintyM: Math.round(site.uncertaintyM),
      features: site.items.filter((i) => i.kind === 'object').map((i) => ({
        name: i.ref.name, category: i.ref.category, summary: i.ref.summary, whyItMatters: i.ref.whyItMatters,
        geologicalContext: i.ref.geologicalContext, missionRelation: i.ref.missionRelation, evidence: i.ref.evidence,
        sources: sourceList(i.ref.sources).map((s) => s.citation),
      })),
    };
  }
  if (extra.objectId && WORLD.itemById[extra.objectId]) ctx.focusFeature = WORLD.itemById[extra.objectId].ref.name;
  if (extra.panoramaId && PANORAMA_BY_ID[extra.panoramaId]) {
    const pn = PANORAMA_BY_ID[extra.panoramaId];
    ctx.panorama = { name: pn.name, sols: pn.sols, type: pn.type, mastcamZPanoramaNumber: pn.mastcamZPanoramaNumber, note: pn.note, credit: pn.source };
  }
  return ctx;
}
