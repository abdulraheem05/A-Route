
'use client';

import { usePathname } from 'next/navigation';
import { useGame } from '@/lib/store';
import { MISSIONS } from '@/lib/scientific-data';

export default function CampaignCard({ mode }) {
  const pathname = usePathname();

  if (!mode) return null;

  const isGale = pathname.includes('/gale/');
  const craterName = isGale ? 'Gale Crater' : 'Jezero Crater';
  const roverName = isGale ? 'Curiosity' : 'Perseverance';

  const missionIndex = useGame((g) => g.missionIndex);
  const mission = MISSIONS[missionIndex] || MISSIONS[0];
  const finish = mode === 'finish';

  const description = isGale
    ? 'Explore Curiosity rover panoramas, inspect significant rocks, and investigate real Gale Crater drilling sites.'
    : 'Explore rover panoramas, inspect significant rocks, and investigate real Perseverance drill sites.';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md sm:p-5">
      <section className="my-auto w-full max-w-2xl rounded-2xl border border-mars-300/30 bg-[#211810]/95 p-6 text-center shadow-2xl sm:p-8 md:p-12">

        <div className="text-[11px] uppercase tracking-[.22em] text-mars-300 sm:text-sm sm:tracking-[.28em]">
          MARSWALK · {craterName.toUpperCase()}
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[.2em] text-mars-200/70 sm:mt-5 sm:text-xs sm:tracking-[.25em]">
          {finish
            ? 'EXPEDITION COMPLETE'
            : `MISSION ${String(mission.sequence).padStart(2, '0')}`}
        </div>

        <h1 className="mt-3 text-2xl font-light leading-tight text-mars-50 sm:text-4xl md:text-5xl">
          {finish
            ? 'Missions completed successfully'
            : `Explore ${craterName}`}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mars-100/75 sm:mt-5 sm:text-lg">
          {finish
            ? `You have completed the ${craterName} exploration campaign. Your scientific journey is complete.`
            : description}
        </p>

        {!finish && (
          <div className="mt-6 rounded-lg border border-mars-200/15 bg-black/20 p-3.5 sm:mt-7 sm:p-4">
            <div className="text-[10px] uppercase tracking-[.16em] text-mars-300 sm:text-xs sm:tracking-[.2em]">
              Mission 01 · {mission.title}
            </div>

            <div className="mt-2 text-base text-mars-50 sm:text-xl">
              {mission.location}
            </div>

            <div className="mt-1 text-sm text-mars-100/60">
              {mission.objective}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-9 sm:flex-row">
          {finish ? (
            <>
              <button
                className="btn-primary w-full py-3 sm:w-auto sm:min-w-48"
                onClick={() => useGame.getState().dismissCompletion()}
              >
                Stay in the crater
              </button>

              <button
                className="btn w-full py-3 sm:w-auto sm:min-w-48"
                onClick={() => {
                  useGame.getState().returnToStart();
                  useGame.getState().resetProgress();
                }}
              >
                Exit crater
              </button>
            </>
          ) : (
            <button
              className="mx-auto flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-3.5 text-base text-white transition hover:bg-black/60 sm:w-auto sm:min-w-72 sm:px-6 sm:py-4 sm:text-lg"
              onClick={() => useGame.getState().startExploring()}
            >
              Start exploring
            </button>
          )}
        </div>

      </section>
    </div>
  );
}
