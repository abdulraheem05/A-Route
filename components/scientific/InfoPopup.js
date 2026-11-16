
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
      className="panorama-popup-enter fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm lg:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          useGame.getState().closeSite();
        }
      }}
    >
      <section className="thin-scroll relative max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-xl border border-mars-300/25 bg-[#211810]/95 shadow-2xl lg:overflow-hidden">

        {/* Close button */}
        <button
          className="icon-btn m-hit absolute right-4 top-4 z-10"
          aria-label="Close"
          onClick={() => useGame.getState().closeSite()}
        >
          <X size={20} />
        </button>

        {/* Popup header */}
        <header className="border-b border-mars-200/15 px-5 py-4 pr-14 lg:px-7 lg:py-5 lg:pr-16">
          <div className="text-xs uppercase tracking-[.2em] text-mars-300">
            MISSION{' '}
            {String(
              mission?.sequence || site.missionIndex + 1
            ).padStart(2, '0')}
            {' · '}
            {site.name}
          </div>

          <h2 className="mt-2 text-xl font-light leading-snug text-mars-50 lg:text-3xl">
            {item.name || site.name}
          </h2>
        </header>

        {/* Locked location */}
        {!unlocked ? (
          <div className="p-6 text-center text-base lg:p-10 lg:text-xl">
            Complete the previous mission to access this location.
          </div>

        /* Panorama popup */
        ) : item.kind === 'panorama' ? (
          <div className="p-5 text-center lg:p-8">
            <p className="mx-auto mb-6 max-w-3xl text-base leading-relaxed text-mars-50 lg:mb-8 lg:text-2xl">
              {overview}
            </p>

            <button
              className="mx-auto flex w-full max-w-xs items-center justify-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-3.5 text-base text-white transition hover:bg-black/60 lg:min-w-72 lg:max-w-none lg:px-6 lg:py-4 lg:text-lg"
              onClick={() => {
                if (pano?.id) {
                  useGame.getState().openPanorama(pano.id);
                }
              }}
            >
              <Camera size={22} className="shrink-0" />
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
