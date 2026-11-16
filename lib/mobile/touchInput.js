// Shared analog input from the on-screen controls to the existing player
// controller.
//
// This module holds no movement logic of its own. It is a mutable value that
// the touch controls write and components/game/Player.js reads once per frame,
// exactly where it already reads the keyboard. The player's speed, slope
// limits, collision, terrain following, jumping and interaction all stay in
// Player.js — the joystick simply supplies the same forward/right pair WASD
// supplies, with a magnitude between 0 and 1.
//
// A plain object rather than store state on purpose: this changes on every
// pointer move frame, and routing that through Zustand would re-render the
// whole interface many times a second.

export const touchInput = {
  /** −1 (back) … +1 (forward), analog. */
  forward: 0,
  /** −1 (left) … +1 (right), analog. */
  right: 0,
  /** Held run, the touch equivalent of Shift. */
  run: false,
  /** True while a finger is on the stick, so the HUD can show it as live. */
  active: false,
};

/** Called by the joystick. Values outside the unit disc are clamped by the player. */
export function setTouchMove(forward, right, active) {
  touchInput.forward = forward;
  touchInput.right = right;
  touchInput.active = !!active;
}

export function setTouchRun(run) {
  touchInput.run = !!run;
}

/** Used when the stick unmounts, an overlay opens, or the window loses focus. */
export function resetTouchInput() {
  touchInput.forward = 0;
  touchInput.right = 0;
  touchInput.run = false;
  touchInput.active = false;
}
