
'use client';

/**
 * The cinematic intro experience.
 *
 * Owns:
 * - The intro animation phase
 * - The shared animation timeline
 * - The intro Canvas and loading state
 *
 * Destination selection is handled independently
 * by the /explore route.
 */

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { AnimatePresence, MotionConfig } from 'framer-motion';

import IntroScene from './intro/IntroScene';
import Starfield from './intro/Starfield';
import ExploreMarsButton from './intro/ExploreMarsButton';
import IntroControl from './intro/IntroControl';
import DevAssetNotice from './ui/DevAssetNotice';
import LoadingScreen from './ui/LoadingScreen';

import { CAMERA } from '@/lib/animation-config';
import { BRAND } from '@/lib/brand';

import {
  PHASE_COMPLETE,
  PHASE_IDLE,
  completeTimeline,
  createTimeline,
  isButtonVisible,
  restartTimeline,
} from '@/lib/timeline';

import { useBrandFont } from '@/lib/useBrandFont';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

/** Keeps the loader from flashing on a fast machine. */
const MIN_LOADER_MS = 650;

/** Upper bound on render resolution. */
const MAX_DPR = 1.75;

export default function ExperienceRoot() {
  const router = useRouter();

  const timelineRef = useRef(createTimeline());

  const [phase, setPhase] = useState(PHASE_IDLE);
  const [mounted, setMounted] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [loaderHeld, setLoaderHeld] = useState(true);
  const [dpr, setDpr] = useState(1);
  const [textureStatus, setTextureStatus] = useState('loading');

  const font = useBrandFont();
  const reducedMotion = usePrefersReducedMotion();

  // Mount the Canvas only on the client.
  useEffect(() => {
    setMounted(true);

    setDpr(
      Math.min(
        MAX_DPR,
        typeof window === 'undefined'
          ? 1
          : window.devicePixelRatio || 1,
      ),
    );

    const timer = setTimeout(
      () => setLoaderHeld(false),
      MIN_LOADER_MS,
    );

    return () => clearTimeout(timer);
  }, []);

  const fontResolved = font.status !== 'loading';

  const ready =
    mounted &&
    canvasReady &&
    fontResolved &&
    !loaderHeld;

  // Reduced motion displays the final composed intro frame.
  useEffect(() => {
    if (!ready || !reducedMotion) return;

    completeTimeline(timelineRef.current);
    setPhase(PHASE_COMPLETE);
  }, [ready, reducedMotion]);

  // Skip the intro animation.
  const handleSkip = useCallback(() => {
    completeTimeline(timelineRef.current);
    setPhase(PHASE_COMPLETE);
  }, []);

  // Replay the intro animation.
  const handleReplay = useCallback(() => {
    restartTimeline(timelineRef.current);
    setPhase(PHASE_IDLE);
  }, []);

  // Navigate to the independent destination selector.
  const handleExplore = useCallback(() => {
    completeTimeline(timelineRef.current);
    setPhase(PHASE_COMPLETE);

    router.push('/explore');
  }, [router]);

  // Escape skips an unfinished intro.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      if (!timelineRef.current.complete) {
        handleSkip();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleSkip]);

  const introComplete = phase === PHASE_COMPLETE;

  const showButton = isButtonVisible(phase);
  const showControl = ready && !reducedMotion;

  // Development asset warnings.
  const missingAssets = useMemo(() => {
    const items = [];

    if (font.status === 'missing') {
      items.push(
        `${BRAND.font.family} font not found — add public/fonts/${BRAND.font.family}.woff2 (fallback stack in use).`,
      );
    }

    if (textureStatus === 'missing') {
      items.push(
        'Mars texture not found — add public/images/mars/mars-texture.jpg (generated map in use).',
      );
    }

    return items;
  }, [font.status, textureStatus]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="aroute-safe-page relative h-dvh w-full overflow-hidden bg-black">

        {/* Accessible document heading */}
        <h1 className="sr-only">
          {BRAND.name} — {BRAND.tagline}
        </h1>

        {/* Cinematic 3D intro scene */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
        >
          {mounted && (
            <Canvas
              dpr={dpr}
              camera={{
                position: [0, 0, CAMERA.startZ],
                fov: CAMERA.fov,
                near: CAMERA.near,
                far: CAMERA.far,
              }}
              gl={{
                antialias: true,
                alpha: false,
                stencil: false,
                powerPreference: 'high-performance',
              }}
              onCreated={({ gl }) => {
                gl.setClearColor('#000000', 1);
                setCanvasReady(true);
              }}
            >
              <PerformanceMonitor
                flipflops={3}
                onDecline={() => setDpr(1)}
                onFallback={() => setDpr(1)}
              >
                <Starfield
                  timelineRef={timelineRef}
                  reducedMotion={reducedMotion}
                  dimmed={false}
                />

                <IntroScene
                  timelineRef={timelineRef}
                  stage="intro"
                  fontFamily={
                    fontResolved
                      ? font.fontFamily
                      : null
                  }
                  reducedMotion={reducedMotion}
                  timelineActive={
                    ready && !reducedMotion
                  }
                  onPhaseChange={setPhase}
                  onTextureStatus={setTextureStatus}
                />
              </PerformanceMonitor>
            </Canvas>
          )}
        </div>

        {/* Explore Mars button */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center">
          <div className="flex h-[22vh] min-h-[7rem] items-center justify-center">
            <AnimatePresence>
              {showButton && (
                <ExploreMarsButton
                  key="explore"
                  onClick={handleExplore}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Skip / Replay control */}
        <div className="pointer-events-none absolute bottom-5 right-5 z-10">
          <AnimatePresence mode="wait">
            {showControl && (
              <IntroControl
                key={
                  introComplete
                    ? 'replay'
                    : 'skip'
                }
                mode={
                  introComplete
                    ? 'replay'
                    : 'skip'
                }
                onSkip={handleSkip}
                onReplay={handleReplay}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Loading screen */}
        <AnimatePresence>
          {!ready && (
            <LoadingScreen key="loading" />
          )}
        </AnimatePresence>

        {/* Development asset warnings */}
        <DevAssetNotice items={missingAssets} />

      </main>
    </MotionConfig>
  );
}
