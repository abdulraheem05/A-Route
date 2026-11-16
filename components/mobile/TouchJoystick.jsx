'use client';
// Virtual thumbstick for the first-person experience.
//
// It produces nothing but a forward/right pair in lib/mobile/touchInput.js.
// Player.js reads that pair in the same place it reads WASD, so walking
// speed, running, slope limits, the edge-of-terrain check, terrain following
// and position publishing are all still the game's own code — there is no
// second movement implementation here.
//
// The stick lives outside the canvas, so a finger on it never reaches the
// camera's drag-to-look handler: one thumb can walk while the other looks.
import { useCallback, useEffect, useRef, useState } from 'react';
import { resetTouchInput, setTouchMove } from '@/lib/mobile/touchInput';

/** Travel of the knob, as a fraction of the base radius. */
const THROW = 0.42;
/** Below this the stick reads as centred, so resting a thumb does not creep. */
const DEADZONE = 0.14;

export default function TouchJoystick({ disabled = false }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const drag = useRef(null);
  const [active, setActive] = useState(false);

  // Moving the knob through the DOM rather than React state: this runs on
  // every pointer frame and must not re-render the HUD.
  const place = useCallback((dx, dy) => {
    const knob = knobRef.current;
    if (!knob) return;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }, []);

  const centre = useCallback(() => {
    place(0, 0);
    setTouchMove(0, 0, false);
    setActive(false);
  }, [place]);

  useEffect(() => () => resetTouchInput(), []);
  useEffect(() => {
    if (disabled) centre();
  }, [disabled, centre]);

  const onDown = (e) => {
    if (disabled) return;
    const rect = baseRef.current.getBoundingClientRect();
    drag.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      r: rect.width / 2,
    };
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onMove(e);
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    let dx = e.clientX - d.cx;
    let dy = e.clientY - d.cy;
    const max = d.r * THROW;
    const len = Math.hypot(dx, dy);
    if (len > max && len > 0) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    place(dx, dy);

    // Normalised to the unit disc, then the dead zone is removed and the
    // remainder rescaled so a small push is a slow walk rather than a jump
    // to full speed.
    let nx = dx / max;
    let ny = dy / max;
    const mag = Math.min(1, Math.hypot(nx, ny));
    if (mag < DEADZONE) {
      setTouchMove(0, 0, true);
      return;
    }
    const scaled = (mag - DEADZONE) / (1 - DEADZONE);
    const k = scaled / mag;
    // Screen-up is forward; screen-right is right.
    setTouchMove(-ny * k, nx * k, true);
  };

  const onUp = () => {
    drag.current = null;
    centre();
  };

  return (
    <div
      ref={baseRef}
      className="m-stick"
      data-active={active ? 'true' : 'false'}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="application"
      aria-label="Movement stick — drag to walk"
    >
      <div ref={knobRef} className="m-stick-knob" style={{ transform: 'translate(-50%, -50%)' }} />
    </div>
  );
}
