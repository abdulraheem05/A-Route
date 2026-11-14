'use client';

/**
 * The A-ROUTE wordmark and tagline, in the scene.
 *
 * Both live on planes behind the globe's resting position, which is what makes
 * the reveal work: as the camera retreats, the planet grows between the camera
 * and the type and its limb cuts across the lower part of the central glyphs.
 * Nothing is faded on top of anything — it is ordinary depth.
 *
 * The typing sequence is a per-glyph stagger driven off the shared clock, so
 * scrubbing, skipping and replaying all stay consistent for free. Materials
 * do not write depth, so the starfield behind stays visible through the
 * transparent parts of each glyph's plane.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BRAND } from '@/lib/brand';
import { COMPOSITION, TITLE_TYPING, STAGE_TRANSITION } from '@/lib/animation-config';
import { cueElapsed, cueProgress } from '@/lib/timeline';
import { clamp01, damp, easeInOutCubic, easeOutCubic, easeOutQuint, lerp } from '@/lib/easing';

export default function IntroTitle({
  timelineRef,
  wordmark,
  composition,
  stage = 'intro',
  reducedMotion = false,
}) {
  const titleGroupRef = useRef(null);
  const taglineGroupRef = useRef(null);
  const taglineMeshRef = useRef(null);
  const caretRef = useRef(null);
  const glyphRefs = useRef([]);
  const fadeRef = useRef(1);

  // Drop stale refs when the wordmark is rebuilt (font arrives, text changes).
  useEffect(() => {
    glyphRefs.current = glyphRefs.current.slice(0, wordmark ? wordmark.glyphs.length : 0);
  }, [wordmark]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const timeline = timelineRef.current;
    if (!timeline || !wordmark) return;

    const { t } = timeline;

    // The grid takes over the screen, so the type steps back out of the way.
    fadeRef.current = damp(
      fadeRef.current,
      stage === 'destinations' ? 0 : 1,
      STAGE_TRANSITION.titleFadeLambda,
      delta,
    );
    const fade = fadeRef.current;

    // --- wordmark -------------------------------------------------------
    const typingElapsed = cueElapsed(t, 'titleTyping');
    const typingProgress = cueProgress(t, 'titleTyping');
    const drift = easeInOutCubic(cueProgress(t, 'cameraPullback'));

    if (titleGroupRef.current) {
      titleGroupRef.current.position.y = lerp(
        COMPOSITION.title.startY,
        composition.titleFinalY,
        drift,
      );
    }

    const { stagger, glyphDuration, depthOffset, liftOffset, overshootScale } = TITLE_TYPING;

    for (let i = 0; i < wordmark.glyphs.length; i += 1) {
      const mesh = glyphRefs.current[i];
      if (!mesh) continue;

      const glyph = wordmark.glyphs[i];
      const local = clamp01((typingElapsed - i * stagger) / glyphDuration);
      const eased = easeOutQuint(local);
      const opacity = eased * fade;

      mesh.material.opacity = opacity;
      mesh.visible = opacity > 0.002;
      if (!mesh.visible) continue;

      mesh.position.z = lerp(-depthOffset, 0, eased);
      mesh.position.y = glyph.y + lerp(-liftOffset, 0, eased);
      mesh.scale.setScalar(lerp(overshootScale, 1, eased));
    }

    // --- caret ----------------------------------------------------------
    const caret = caretRef.current;
    if (caret) {
      const armed = typingElapsed > -0.4 && typingProgress < 1;
      let caretOpacity = 0;

      if (armed && !reducedMotion) {
        const index = Math.max(
          0,
          Math.min(wordmark.glyphs.length - 1, Math.floor(typingElapsed / stagger)),
        );
        const landed = typingElapsed >= 0 ? wordmark.glyphs[index].caretX : wordmark.glyphs[0].x;
        caret.position.x = damp(caret.position.x, landed, 16, delta);
        caret.position.y = wordmark.glyphs[0].y;

        const blink = 0.45 + 0.55 * Math.abs(Math.sin(t * TITLE_TYPING.caret.blinkSpeed));
        const tail = 1 - clamp01((typingProgress - 0.8) / 0.2);
        caretOpacity = blink * tail * fade;
      }

      caret.material.opacity = caretOpacity;
      caret.visible = caretOpacity > 0.002;
    }

    // --- tagline --------------------------------------------------------
    const taglineProgress = easeOutCubic(cueProgress(t, 'taglineReveal'));
    if (taglineGroupRef.current) {
      taglineGroupRef.current.position.y = lerp(
        COMPOSITION.tagline.startY,
        composition.taglineFinalY,
        drift,
      );
    }
    if (taglineMeshRef.current) {
      const opacity = taglineProgress * fade;
      taglineMeshRef.current.material.opacity = opacity;
      taglineMeshRef.current.visible = opacity > 0.002;
      const settle = lerp(0.965, 1, taglineProgress);
      taglineMeshRef.current.scale.set(settle, settle, 1);
    }
  });

  if (!wordmark) return null;

  return (
    <>
      <group ref={titleGroupRef} position={[0, COMPOSITION.title.startY, COMPOSITION.title.z]}>
        <group scale={composition.titleScale}>
          {wordmark.glyphs.map((glyph, index) => (
            <mesh
              key={`${glyph.char}-${index}`}
              ref={(instance) => {
                glyphRefs.current[index] = instance;
              }}
              position={[glyph.x, glyph.y, 0]}
              renderOrder={-1}
              visible={false}
            >
              <planeGeometry args={[glyph.width, glyph.height]} />
              <meshBasicMaterial
                map={glyph.texture}
                transparent
                depthWrite={false}
                toneMapped={false}
                opacity={0}
              />
            </mesh>
          ))}

          <mesh ref={caretRef} position={[0, 0, 0]} renderOrder={-1} visible={false}>
            <planeGeometry args={[wordmark.caret.width, wordmark.caret.height]} />
            <meshBasicMaterial
              color={BRAND.tone.caret}
              transparent
              depthWrite={false}
              toneMapped={false}
              opacity={0}
            />
          </mesh>
        </group>
      </group>

      <group
        ref={taglineGroupRef}
        position={[0, COMPOSITION.tagline.startY, COMPOSITION.tagline.z]}
      >
        <group scale={composition.taglineScale}>
          <mesh
            ref={taglineMeshRef}
            position={[0, wordmark.tagline.y, 0]}
            renderOrder={-1}
            visible={false}
          >
            <planeGeometry args={[wordmark.tagline.width, wordmark.tagline.height]} />
            <meshBasicMaterial
              map={wordmark.tagline.texture}
              transparent
              depthWrite={false}
              toneMapped={false}
              opacity={0}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}
