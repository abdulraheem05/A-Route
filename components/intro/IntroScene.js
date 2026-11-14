'use client';

/**
 * Everything the intro contributes to the 3D scene.
 *
 * Mounted for the whole session — including behind the destination grid, where
 * it eases into a quieter background pose instead of being torn down. That is
 * what makes the hand-off to destination selection feel like one continuous
 * shot rather than a page change.
 */

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import CameraRig from './CameraRig';
import IntroTitle from './IntroTitle';
import MarsGlobe from './MarsGlobe';
import TimelineDriver from './TimelineDriver';
import useWordmark from './useWordmark';
import { COMPOSITION, resolveComposition } from '@/lib/animation-config';

/** Used only for the first frame, before the wordmark has been measured. */
const FALLBACK_METRICS = {
  titleWidth: 6.5,
  titleCap: COMPOSITION.title.capHeightWorld,
  taglineWidth: 4.2,
};

export default function IntroScene({
  timelineRef,
  stage = 'intro',
  fontFamily,
  reducedMotion = false,
  timelineActive = true,
  onPhaseChange,
  onTextureStatus,
}) {
  const size = useThree((state) => state.size);
  const wordmark = useWordmark(fontFamily);

  const composition = useMemo(() => {
    const aspect = size.height > 0 ? size.width / size.height : 16 / 9;
    const metrics = wordmark ? wordmark.metrics : FALLBACK_METRICS;
    return resolveComposition({ aspect, ...metrics });
  }, [size.width, size.height, wordmark]);

  return (
    <>
      <TimelineDriver
        timelineRef={timelineRef}
        onPhaseChange={onPhaseChange}
        active={timelineActive}
      />
      <CameraRig timelineRef={timelineRef} stage={stage} reducedMotion={reducedMotion} />
      <MarsGlobe
        timelineRef={timelineRef}
        stage={stage}
        reducedMotion={reducedMotion}
        globeScale={composition.globeScale}
        onTextureStatus={onTextureStatus}
      />
      <IntroTitle
        timelineRef={timelineRef}
        wordmark={wordmark}
        composition={composition}
        stage={stage}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
