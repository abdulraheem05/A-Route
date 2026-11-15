
'use client';

// Observation popup: what you get when you press E at a site.
// Panorama sites open the panorama viewer.
// Specimen sites open SpecimenInspector.
// Inspection objectives are recorded only after scanning finishes.

import { X, Camera } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS, PANORAMA_BY_ID } from '@/lib/scientific-data';
import { siteUnlocked } from '@/lib/missions';
import SpecimenInspector from './SpecimenInspector';

export default function InfoPopup() {
  const siteId = useGame((g) => g.activeSiteId);
  const itemId = useGame((g) => g.activeItemId);
  const missionIndex = useGame((g) => g.missionIndex);

  const site = siteId ? WORLD.siteById[siteId] : null;
  const unlocked = site ? siteUnlocked(site, missionIndex) : false;

  const item = site
    ? site.items.find((i) => i.id === itemId) || site.items[0]
    : null;

  if (!site || !item) return null;

  const mission = MISSIONS[site.missionIndex];
  const obj = item.ref || {};

  const pano =
    item.kind === 'panorama'
      ? PANORAMA_BY_ID[item.id]
      : null;

  const overview = pano
    ? pano.description ||
      pano.summary ||
      mission?.scientificContext ||
      'Explore this landscape and its geological context.'
    : obj.summary ||
      obj.description ||
      item.name;

  // Specimen image: obtained from the scientific object data.
  const image =
    obj.image ||
    obj.imageUrl ||
    obj.image_path ||
    obj.photo ||
    obj.thumbnail ||
    obj.images?.[0] ||
    null;

  // Drill sites read differently from loose rocks.
  const isDrill =
    obj.category === 'Drill site' ||
    obj.kindLabel === 'drill site' ||
    !!obj.drillSite;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm panorama-popup-enter"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          useGame.getState().closeSite();
        }
      }}
    >
      <section className="relative w-full max-w-5xl overflow-hidden rounded-xl border border-mars-300/25 bg-[#211810]/95 shadow-2xl">

        {/* Close button */}
        <button
          className="icon-btn absolute right-4 top-4 z-10"
          aria-label="Close"
          onClick={() => useGame.getState().closeSite()}
        >
          <X size={20} />
        </button>

        {/* Popup header */}
        <header className="border-b border-mars-200/15 px-7 py-5 pr-16">
          <div className="text-xs uppercase tracking-[.2em] text-mars-300">
            MISSION{' '}
            {String(
              mission?.sequence || site.missionIndex + 1
            ).padStart(2, '0')}
            {' · '}
            {site.name}
          </div>

          <h2 className="mt-2 text-3xl font-light text-mars-50">
            {item.name || site.name}
          </h2>
        </header>

        {/* Locked location */}
        {!unlocked ? (
          <div className="p-10 text-center text-xl">
            Complete the previous mission to access this location.
          </div>

        /* Panorama popup */
        ) : item.kind === 'panorama' ? (
          <div className="p-8 text-center">
            <p className="mx-auto mb-8 max-w-3xl text-2xl leading-relaxed text-mars-50">
              {overview}
            </p>

            <button
              className="mx-auto flex min-w-72 items-center justify-center gap-3 rounded-full border border-white/10 bg-black/40 px-6 py-4 text-lg text-white transition hover:bg-black/60"
              onClick={() => {
                if (pano?.id) {
                  useGame.getState().openPanorama(pano.id);
                }
              }}
            >
              <Camera size={28} className="shrink-0" />
              <span>View panorama</span>
            </button>
          </div>

        /* Rock / drill inspection */
        ) : (
          <SpecimenInspector
            item={item}
            obj={obj}
            image={image}
            imageAlt={obj.imageAlt || item.name}
            kindLabel={isDrill ? 'drill site' : 'rock'}
          />
        )}

      </section>
    </div>
  );
}
