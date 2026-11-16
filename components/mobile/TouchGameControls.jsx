'use client';
// On-screen controls for the first-person experience.
//
// Movement comes from the thumbstick, which writes the analog pair Player.js
// already reads next to WASD. Look is unchanged: Player.js listens for
// pointer drag on the canvas, and a finger drag is a pointer drag, so looking
// around and tap-to-inspect work on touch with no new code.
//
// Interact, jump and the map are routed through the keys the game already
// binds — the button dispatches the same KeyE, Space or KeyM the keyboard
// would, so the game's own guards (an overlay is open, the game is paused,
// the player is airborne, nothing is nearby) stay the only authority on what
// those actions do. There is no second interaction path to keep in step.
import { useCallback, useEffect, useState } from 'react';
import { Hand, ChevronsUp, Footprints } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD } from '@/lib/scientific-data';
import { siteUnlocked } from '@/lib/missions';
import { resetTouchInput, setTouchRun, touchInput } from '@/lib/mobile/touchInput';
import TouchJoystick from './TouchJoystick';

/** Presses a key the game already binds, exactly as a keyboard would. */
function pressKey(code) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
}

export default function TouchGameControls() {
  const nearbySiteId = useGame((g) => g.nearbySiteId);
  const missionIndex = useGame((g) => g.missionIndex);
  const paused = useGame((g) => g.paused);
  const mapOpen = useGame((g) => g.mapOpen);
  const activeSiteId = useGame((g) => g.activeSiteId);
  const activePanoramaId = useGame((g) => g.activePanoramaId);
  const settingsOpen = useGame((g) => g.settingsOpen);
  const noticeOpen = useGame((g) => g.noticeOpen);
  const [running, setRunning] = useState(touchInput.run);

  const overlay = mapOpen || !!activeSiteId || !!activePanoramaId || settingsOpen || noticeOpen;
  const frozen = paused || overlay;

  const nearby = nearbySiteId ? WORLD.siteById[nearbySiteId] : null;
  const canInteract = !!nearby && siteUnlocked(nearby, missionIndex) && !frozen;

  // Running must not survive an overlay opening or this component unmounting,
  // or the player would keep sprinting with nothing on screen to stop it.
  useEffect(() => {
    if (!frozen) return;
    setTouchRun(false);
    setRunning(false);
  }, [frozen]);

  useEffect(() => () => resetTouchInput(), []);

  const toggleRun = useCallback(() => {
    setRunning((v) => {
      setTouchRun(!v);
      return !v;
    });
  }, []);

  // While an overlay or the pause menu is up the game ignores input anyway,
  // so the controls come off the screen rather than sitting there inert.
  if (frozen) return null;

  return (
    <>
      <TouchJoystick disabled={frozen} />

      <div
        className="absolute z-30 flex flex-col items-end gap-2.5"
        style={{ right: 'calc(14px + var(--sa-r))', bottom: 'calc(18px + var(--sa-b))' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="m-action m-action-sm"
            data-on={running ? 'true' : 'false'}
            aria-pressed={running}
            onClick={toggleRun}
            aria-label={running ? 'Stop running' : 'Run'}
          >
            <Footprints size={18} />
          </button>

          <button
            type="button"
            className="m-action m-action-sm"
            onClick={() => pressKey('Space')}
            aria-label="Jump"
          >
            <ChevronsUp size={20} />
          </button>
        </div>

        <button
          type="button"
          className="m-action m-action-primary"
          onClick={() => pressKey('KeyE')}
          disabled={!canInteract}
          style={{ opacity: canInteract ? 1 : 0.4 }}
          aria-label={
            nearby
              ? nearby.hasPanorama
                ? `Open the observation station at ${nearby.name}`
                : `Inspect ${nearby.name}`
              : 'Inspect — nothing within reach'
          }
        >
          <Hand size={24} />
        </button>
      </div>
    </>
  );
}
