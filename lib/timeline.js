/**
 * The intro clock.
 *
 * A single mutable object is advanced once per frame inside the R3F render
 * loop (components/intro/TimelineDriver.js). Every animated component reads
 * from it during its own useFrame call, so the whole intro stays in lockstep
 * without React re-rendering 60 times a second.
 *
 * React is told about *phases* only — seven state updates for the entire
 * intro — which is what the DOM chrome (button, skip/replay control) needs.
 */

import { TIMELINE } from './animation-config';
import { clamp01 } from './easing';

/** Cue ids in playback order. Also the phase names reported to React. */
export const PHASE_ORDER = [
  'starfield',
  'titleTyping',
  'taglineReveal',
  'globeReveal',
  'cameraPullback',
  'composition',
  'buttonReveal',
];

export const PHASE_IDLE = 'idle';
export const PHASE_COMPLETE = 'complete';

export function createTimeline() {
  return {
    /** Seconds elapsed in the intro. */
    t: 0,
    /** Playback rate; the skip control ramps this instead of jumping. */
    speed: 1,
    phase: PHASE_IDLE,
    complete: false,
    /** Set by the stage machine: 'intro' | 'destinations'. */
    stage: 'intro',
    /** 0 = full intro composition, 1 = background pose behind the grid. */
    background: 0,
  };
}

/** Jump straight to the end — used by the skip control and reduced motion. */
export function completeTimeline(timeline) {
  timeline.t = TIMELINE.total;
  timeline.speed = 1;
  timeline.phase = PHASE_COMPLETE;
  timeline.complete = true;
  return timeline;
}

export function restartTimeline(timeline) {
  timeline.t = 0;
  timeline.speed = 1;
  timeline.phase = PHASE_IDLE;
  timeline.complete = false;
  return timeline;
}

/** 0..1 progress through a named cue at time `t`. */
export function cueProgress(t, cueId) {
  const cue = TIMELINE.cues[cueId];
  if (!cue) return 0;
  const span = cue.end - cue.start;
  if (span <= 0) return t >= cue.end ? 1 : 0;
  return clamp01((t - cue.start) / span);
}

/** Seconds elapsed since a cue began (negative before it starts). */
export function cueElapsed(t, cueId) {
  const cue = TIMELINE.cues[cueId];
  if (!cue) return 0;
  return t - cue.start;
}

export function cueStarted(t, cueId) {
  const cue = TIMELINE.cues[cueId];
  return Boolean(cue) && t >= cue.start;
}

/** The furthest cue that has begun, for reporting to React. */
export function resolvePhase(t) {
  if (t >= TIMELINE.total) return PHASE_COMPLETE;
  let phase = PHASE_IDLE;
  for (const id of PHASE_ORDER) {
    if (t >= TIMELINE.cues[id].start) phase = id;
  }
  return phase;
}

/** True once the Explore Mars button should be mounted. */
export function isButtonVisible(phase) {
  return phase === 'buttonReveal' || phase === PHASE_COMPLETE;
}
