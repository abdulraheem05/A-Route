'use client';

/**
 * The destination grid.
 *
 * Exactly four columns and two rows at desktop width (eight cards, no
 * scrolling on a normal laptop), two columns from 480px, one below that.
 * The breakpoints mirror DESTINATION_GRID in lib/destinations.js — Tailwind
 * needs literal class names, so the values are written out here.
 */

import { motion } from 'framer-motion';
import DestinationCard from './DestinationCard';
import { GRID_MOTION } from '@/lib/animation-config';
import { destinations as defaultDestinations } from '@/lib/destinations';

export default function DestinationGrid({ items = defaultDestinations }) {
  return (
    <motion.ul
      variants={GRID_MOTION.list}
      initial="hidden"
      animate="visible"
      className="grid w-full grid-cols-1 gap-4 xs:grid-cols-2 xl:grid-cols-4 xl:gap-5"
    >
      {items.map((destination, index) => (
        <DestinationCard key={destination.id} destination={destination} index={index} />
      ))}
    </motion.ul>
  );
}
