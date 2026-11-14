'use client';

/**
 * Covers the first frames while the renderer comes up and the brand font is
 * resolved, so the wordmark is never rasterised with the wrong face and then
 * swapped under the viewer.
 */

import { motion } from 'framer-motion';
import { BRAND, brandGradientTextStyle } from '@/lib/brand';

export default function LoadingScreen({ label = 'Initialising surface data' }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black"
    >
      <span
        className="font-artemus text-2xl tracking-[0.2em] sm:text-3xl"
        style={brandGradientTextStyle()}
      >
        {BRAND.name}
      </span>

      <div className="relative h-[1px] w-40 overflow-hidden bg-white/10">
        <span className="absolute inset-y-0 left-0 w-1/2 animate-line-sweep bg-gradient-to-r from-transparent via-mars-200 to-transparent" />
      </div>

      <span className="text-[0.52rem] uppercase tracking-[0.3em] text-bone-dim/60">{label}</span>
    </motion.div>
  );
}
