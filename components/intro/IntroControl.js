'use client';

/**
 * The single, quiet corner control: SKIP while the intro plays, REPLAY once it
 * has finished. Deliberately low contrast and out of the way — replay should
 * be available without ever competing with the composition.
 */

import { motion } from 'framer-motion';

export default function IntroControl({ mode, onSkip, onReplay }) {
  const isSkip = mode === 'skip';

  return (
    <motion.button
      type="button"
      onClick={isSkip ? onSkip : onReplay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="pointer-events-auto inline-flex items-center gap-2 px-2 py-1 text-[0.54rem] uppercase tracking-[0.3em] text-bone-dim/50 transition-colors duration-300 hover:text-bone/90"
    >
      {isSkip ? (
        <>
          Skip
          <span aria-hidden="true" className="tracking-normal">
            &rsaquo;&rsaquo;
          </span>
        </>
      ) : (
        <>
          <span aria-hidden="true" className="tracking-normal">
            &#8635;
          </span>
          Replay intro
        </>
      )}
    </motion.button>
  );
}
