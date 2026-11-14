'use client';

/**
 * Advances the intro clock once per rendered frame.
 *
 * Living inside the R3F loop means there is exactly one requestAnimationFrame
 * driving the experience, and it pauses with the tab. React only hears about
 * phase changes — seven updates for the whole intro — which keeps state out of
 * the animation path entirely.
 */

import { useFrame } from '@react-three/fiber';
import { TIMELINE } from '@/lib/animation-config';
import { PHASE_COMPLETE, resolvePhase } from '@/lib/timeline';

export default function TimelineDriver({ timelineRef, onPhaseChange, active = true }) {
  useFrame((state, rawDelta) => {
    const timeline = timelineRef.current;
    if (!timeline || !active || timeline.complete) return;

    // Clamp so a backgrounded tab cannot leap past a whole beat on return.
    const delta = Math.min(rawDelta, 1 / 20);
    timeline.t = Math.min(timeline.t + delta * timeline.speed, TIMELINE.total);

    const phase = resolvePhase(timeline.t);
    if (phase !== timeline.phase) {
      timeline.phase = phase;
      if (onPhaseChange) onPhaseChange(phase);
    }

    if (timeline.t >= TIMELINE.total) {
      timeline.complete = true;
      if (timeline.phase !== PHASE_COMPLETE) {
        timeline.phase = PHASE_COMPLETE;
        if (onPhaseChange) onPhaseChange(PHASE_COMPLETE);
      }
    }
  });

  return null;
}
