'use client';

/**
 * Development-only reminder of which optional assets are still missing.
 *
 * The app is designed to run without them, so this is the only place that
 * says so — nothing is drawn over the production experience. In particular the
 * wordmark never silently substitutes a lookalike display font: if Artemus is
 * absent you are told, and a neutral system stack is used until you add it.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function DevAssetNotice({ items = [] }) {
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NODE_ENV === 'production') return null;
  if (dismissed || items.length === 0) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.2 }}
      className="pointer-events-auto absolute bottom-4 left-4 z-30 max-w-xs border border-mars-400/25 bg-black/80 p-3 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.52rem] uppercase tracking-[0.26em] text-mars-200">
          Assets pending
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[0.6rem] leading-none text-bone-dim transition-colors hover:text-bone"
          aria-label="Dismiss asset notice"
        >
          &times;
        </button>
      </div>

      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-[0.62rem] leading-relaxed text-bone/55">
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[0.56rem] leading-relaxed text-bone-dim/60">
        Development notice only. See README for file locations.
      </p>
    </motion.aside>
  );
}
