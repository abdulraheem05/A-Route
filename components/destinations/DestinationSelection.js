'use client';

/**
 * Destination selection.
 *
 * An overlay rather than a route: the starfield and the globe keep rendering
 * underneath, dimmed and pushed back, so this reads as the next beat of the
 * same shot instead of a different page.
 */

import { motion } from 'framer-motion';
import DestinationGrid from './DestinationGrid';
import { BRAND, brandGradientTextStyle } from '@/lib/brand';
import { destinations, unlockedDestinations } from '@/lib/destinations';

const EASE = [0.22, 1, 0.36, 1];

export default function DestinationSelection({ onBack }) {
  const availableCount = unlockedDestinations().length;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="absolute inset-0 z-20"
      aria-labelledby="destination-heading"
    >
      {/* Lets the planet glow through faintly without hurting legibility. */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{
          backgroundImage:
            'radial-gradient(125% 90% at 50% 16%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.88) 58%, rgba(0,0,0,0.95) 100%)',
        }}
      />

      <div className="a-route-scroll relative flex h-full flex-col overflow-y-auto">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          className="flex flex-wrap items-center justify-between gap-4 px-5 pt-6 sm:px-10 sm:pt-9"
        >
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[0.58rem] uppercase tracking-[0.3em] text-bone-dim transition-colors duration-300 hover:border-mars-200/50 hover:text-bone"
            >
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5">
                &larr;
              </span>
              Back
            </button>

            <span
              className="font-artemus text-base tracking-[0.18em] sm:text-lg"
              style={brandGradientTextStyle()}
            >
              {BRAND.name}
            </span>
          </div>

          <p className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-bone-dim/80">
            {availableCount} of {destinations.length} sites available
          </p>
        </motion.header>

        <div className="px-5 pb-10 pt-8 sm:px-10 sm:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="mb-7 max-w-2xl sm:mb-9"
          >
            <h2
              id="destination-heading"
              className="text-[1.35rem] font-light tracking-[0.26em] text-bone sm:text-[1.6rem]"
            >
              SELECT DESTINATION
            </h2>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-bone-dim">
              Eight surveyed sites across the Martian surface. Ground truth is assembled from
              orbital imagery and landed missions; two sites are open for the first phase of
              exploration.
            </p>
          </motion.div>

          <DestinationGrid />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            className="mt-8 text-[0.56rem] uppercase tracking-[0.28em] text-bone-dim/50"
          >
            Interactive surface maps and descent arrive in a later phase
          </motion.p>
        </div>
      </div>
    </motion.section>
  );
}
