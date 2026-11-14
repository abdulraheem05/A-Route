'use client';

/**
 * The only thing that moves the camera.
 *
 * The dolly back from the wordmark to the wide shot is read straight off the
 * intro clock, so it cannot be triggered twice, interrupted halfway or fought
 * over by two tweens. Pointer parallax and a slow breathing drift are layered
 * on top as offsets, and both are skipped under reduced motion.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CAMERA, STAGE_TRANSITION } from '@/lib/animation-config';
import { cueProgress } from '@/lib/timeline';
import { damp, easeInOutCubic, lerp } from '@/lib/easing';

export default function CameraRig({ timelineRef, stage = 'intro', reducedMotion = false }) {
  const offsetRef = useRef({ x: 0, y: 0 });
  const backgroundRef = useRef(0);
  const lookAtRef = useRef(new THREE.Vector3(0, CAMERA.lookAtY, 0));

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const timeline = timelineRef.current;
    if (!timeline) return;

    const pull = easeInOutCubic(cueProgress(timeline.t, 'cameraPullback'));

    backgroundRef.current = damp(
      backgroundRef.current,
      stage === 'destinations' ? 1 : 0,
      STAGE_TRANSITION.lambda,
      delta,
    );

    const introZ = lerp(CAMERA.startZ, CAMERA.endZ, pull);
    const z = lerp(introZ, CAMERA.backgroundZ, backgroundRef.current);

    const breath = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * CAMERA.breathing.speed) * CAMERA.breathing.amplitude;

    const targetX = reducedMotion ? 0 : state.pointer.x * CAMERA.parallax.x;
    const targetY = reducedMotion ? 0 : state.pointer.y * CAMERA.parallax.y;
    offsetRef.current.x = damp(offsetRef.current.x, targetX, CAMERA.parallax.lambda, delta);
    offsetRef.current.y = damp(offsetRef.current.y, targetY, CAMERA.parallax.lambda, delta);

    state.camera.position.set(
      offsetRef.current.x,
      offsetRef.current.y + breath * 0.35,
      z + breath,
    );
    state.camera.lookAt(lookAtRef.current);
  });

  return null;
}
