'use client';

/**
 * One destination tile.
 *
 * Deliberately not interactive in Phase 1: the unlocked sites read as
 * available and respond to hover, but nothing navigates — the surface map and
 * the first-person experience arrive later. Because the cards carry no action
 * yet they are not focusable either; status is exposed to assistive tech as
 * text instead of a disabled control. When the map route lands, swap <article>
 * for a <button> / <Link> and the states here still apply.
 *
 * Thumbnails use a plain <img> rather than next/image on purpose: the files
 * are user-supplied and may not exist yet, and a raw img gives a clean onError
 * hook for the placeholder.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GRID_MOTION } from '@/lib/animation-config';
import { isUnlocked } from '@/lib/destinations';

function LockIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0V10.5" />
      <circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Shown until a thumbnail loads, and permanently if the file is absent.
 * Abstract warm gradients plus a survey grid — not invented imagery.
 */
function ThumbnailPlaceholder({ destination, index }) {
  const originX = 18 + ((index * 13) % 46);
  const originY = 12 + ((index * 7) % 24);

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: [
          `radial-gradient(130% 95% at ${originX}% ${originY}%, rgba(232, 131, 43, 0.3), transparent 58%)`,
          'radial-gradient(95% 75% at 88% 92%, rgba(149, 51, 26, 0.45), transparent 62%)',
          'linear-gradient(165deg, #1d0b06 0%, #2c1209 58%, #120503 100%)',
        ].join(', '),
      }}
    >
      <div className="a-route-grid-texture absolute inset-0 opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="text-[0.64rem] uppercase tracking-[0.34em] text-bone/35">
          {destination.name}
        </span>
        <span className="text-[0.54rem] uppercase tracking-[0.3em] text-bone/20">
          Imagery pending
        </span>
      </div>
    </div>
  );
}

export default function DestinationCard({ destination, index = 0 }) {
  const [imageState, setImageState] = useState('loading');
  const unlocked = isUnlocked(destination);
  const showPlaceholder = imageState !== 'loaded';

  return (
    <motion.li variants={GRID_MOTION.item} className="list-none">
      <article
        className={[
          'group relative flex h-full flex-col overflow-hidden rounded-sm border transition-all duration-500 ease-cinematic',
          unlocked
            ? 'border-mars-400/25 bg-gradient-to-b from-mars-900/70 to-black hover:-translate-y-1 hover:border-mars-200/55 hover:shadow-[0_18px_50px_-24px_rgba(232,131,43,0.55)]'
            : 'pointer-events-none select-none border-white/[0.06] bg-black/60',
        ].join(' ')}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
          {showPlaceholder && <ThumbnailPlaceholder destination={destination} index={index} />}

          {imageState !== 'missing' && (
            <img
              src={destination.image}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setImageState('loaded')}
              onError={() => setImageState('missing')}
              className={[
                'absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-cinematic',
                imageState === 'loaded' ? 'opacity-100' : 'opacity-0',
                unlocked ? 'group-hover:scale-[1.045]' : 'grayscale-[0.85] brightness-[0.55]',
              ].join(' ')}
            />
          )}

          {/* Keeps the type legible over any thumbnail. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

          {!unlocked && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/45 backdrop-grayscale" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <LockIcon className="h-7 w-7 text-bone/45" />
              </div>
            </>
          )}

          <div className="pointer-events-none absolute left-3 top-3">
            {unlocked ? (
              <span className="inline-flex items-center gap-1.5 border border-mars-200/40 bg-black/55 px-2 py-[0.2rem] text-[0.55rem] uppercase tracking-[0.3em] text-mars-100 backdrop-blur-sm">
                <span className="h-1 w-1 rounded-full bg-mars-200" />
                Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 border border-white/10 bg-black/55 px-2 py-[0.2rem] text-[0.55rem] uppercase tracking-[0.3em] text-bone-dim">
                Locked
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className={[
                'text-[0.95rem] font-medium tracking-[0.06em]',
                unlocked ? 'text-bone' : 'text-bone/55',
              ].join(' ')}
            >
              {destination.name}
            </h3>
            <span className="shrink-0 font-mono text-[0.58rem] tracking-[0.1em] text-bone-dim/80">
              {destination.coordinates}
            </span>
          </div>

          <p className="text-[0.58rem] uppercase tracking-[0.26em] text-bone-dim/70">
            {destination.region}
          </p>

          <p
            className={[
              'text-[0.78rem] leading-relaxed',
              unlocked ? 'text-bone/65' : 'text-bone/35',
            ].join(' ')}
          >
            {destination.description}
          </p>

          <p className="mt-auto pt-2 text-[0.55rem] uppercase tracking-[0.28em] text-bone-dim/45">
            {destination.terrain}
          </p>

          <span className="sr-only">
            {unlocked
              ? 'Available. The interactive surface map opens in a later phase.'
              : 'Locked. Not yet available for exploration.'}
          </span>
        </div>

        {/* Hover accent: a single hairline sweep, unlocked cards only. */}
        {unlocked && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-[1px] w-full origin-left scale-x-0 bg-gradient-to-r from-mars-500 via-mars-300 to-mars-100 transition-transform duration-700 ease-cinematic group-hover:scale-x-100"
          />
        )}
      </article>
    </motion.li>
  );
}
