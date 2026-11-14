'use client';

/**
 * EXPLORE MARS.
 *
 * Mounted only once the globe reveal has finished — the parent gates it on the
 * intro clock, so it cannot appear early. Keyboard operable, with the global
 * focus-visible treatment from globals.css.
 */

import { motion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

export default function ExploreMarsButton({ onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="pointer-events-auto"
    >
      <button
        type="button"
        onClick={onClick}
        className="group relative inline-flex items-center gap-3 overflow-hidden border border-mars-400/35 bg-black/30 px-8 py-3.5 text-[0.62rem] uppercase tracking-[0.42em] text-bone transition-all duration-500 ease-cinematic hover:border-mars-200/70 hover:bg-mars-900/35 hover:tracking-[0.46em] hover:text-mars-50 hover:shadow-[0_0_40px_-12px_rgba(232,131,43,0.6)]"
      >
        {/* Light sweeps across the face on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-mars-200/15 to-transparent transition-all duration-[1100ms] ease-cinematic group-hover:left-full"
        />
        <span className="relative">Explore Mars</span>
        <span
          aria-hidden="true"
          className="relative h-[1px] w-5 bg-mars-300/70 transition-all duration-500 ease-cinematic group-hover:w-8 group-hover:bg-mars-100"
        />
      </button>
    </motion.div>
  );
}
