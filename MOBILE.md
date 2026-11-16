# A-ROUTE — mobile responsiveness

Notes on the mobile layer added over the existing application. The desktop
experience at 1024px and above is unchanged; everything here is additive.

## Breakpoints

| Range            | Interface                                                     |
| ---------------- | ------------------------------------------------------------- |
| 320–767px        | mobile: bottom sheets, floating controls, touch game controls  |
| 768–1023px       | tablet: the same shell, with more room in every sheet          |
| 1024px and above | the original desktop workspace, untouched                      |

`hooks/useViewport.js` is the single source of these answers. `compact` is
true below 1024px — the range where the docked panels no longer fit beside
the terrain. `touch` is a separate question, answered by `(pointer: coarse)`
and `navigator.maxTouchPoints`: a narrow desktop window gets the compact
layout but keeps its keyboard and mouse, so the on-screen movement stick is
never in the way of a real pointer.

## How the mobile map is put together

`components/Explorer.jsx` renders either the original dock layout or
`components/mobile/MobileMapShell.jsx`. Both branches render the same
components, the same data hooks, the same crater provider and the same
`Viewport`.

The shell owns no map state. The sheets are driven by the store flags the
desktop panels already use:

- `sidebarOpen` → the Layers sheet
- `infoOpen` + `infoTab` → the Inspector sheet (Inspect / Measure & Plan /
  Weather / Geology)

So the top bar's existing buttons, `startPicking`, `setPlanPoint`, `select`
and every other existing action drive the mobile interface without knowing it
exists. The panels inside the sheets are `LayerSidebar` and `InfoPanel`
themselves — not copies — so every layer, toggle, slider, dataset link and
derived value behaves identically. Only their framing changes, and that is
done in CSS under `.m-sheet-body`.

Both panels already return `null` when their flag is false, so a closed sheet
renders nothing at all.

### Layout contract

Nothing is positioned by guesswork:

```
top          header (44px + safe area), then the MAP / PLAY row
right edge   floating terrain controls, anchored below those two rows
bottom       .m-bottom-stack, then the panel tab bar
```

`.m-bottom-stack` is a `column-reverse` flex column holding the status panel,
the route legend, the point-picking prompt and any degraded-data notice. They
stack upwards by layout rather than by arithmetic, so one appearing cannot
land on top of another. The column is capped (38dvh, 28dvh on a short
landscape screen) and the floating controls are given the space that is left
over, which is why they can never meet.

`tools/layout-check.py` in the working copy models these boxes and asserts no
overlap or overflow at 320×640, 375×667, 390×844, 430×932 and 768×1024, in
both orientations, with and without notch and home-indicator insets.

## Mobile game controls

The on-screen controls do not implement movement. `lib/mobile/touchInput.js`
holds a mutable analog pair that `components/game/Player.js` reads in the same
place it reads WASD; speed, running, slope limits, the edge-of-terrain check,
terrain following, jumping and position publishing all remain the game's own
code. For keyboard input the maths is unchanged — the pair is now clamped to
the unit disc instead of normalised, which is identical for keys and lets a
half push of the stick be a half-speed walk.

Looking around needed no new code: `Player.js` already listens for pointer
drag on the canvas, and a finger drag is a pointer drag once the canvas opts
out of browser gestures. Tap-to-inspect likewise.

Interact, jump and the map are routed through the keys the game already binds —
the button dispatches the same `KeyE`, `Space` or `KeyM` a keyboard would, so
the game's own guards stay the only authority on what those actions do.

## Performance

- Map render resolution capped at 1.5× device pixels below 1024px (desktop
  keeps `[1, 2]`); the game's quality setting keeps its own ceiling and gains
  a 1.5 cap on small screens.
- Terrain geometry, elevation data, imagery tiles and every derived value are
  untouched — only how many device pixels a frame is rasterised into changes.
- Closed sheets are unmounted, and the panels inside them also self-gate.
- The joystick moves its knob through the DOM rather than React state, so
  walking does not re-render the interface.

## Known limitations

- The floating terrain controls are hidden while a sheet is open: the sheet's
  backdrop covers that part of the screen and would take their taps anyway.
  The panel tab bar stays above the backdrop, so switching panel is one tap.
- If a route legend, a picking prompt and a degraded-data notice are all on
  screen at once on a very short landscape screen, the bottom stack scrolls
  and the notice is the item that can be clipped. The same information is in
  the top bar's Data popover.
- `.gale-workspace canvas { touch-action: none }` applies at every width. It
  is the one rule here that is not behind a `max-width` query, because a
  touch-capable desktop needs it too; `touch-action` has no effect on mouse
  input, so nothing changes for a desktop pointer.
- Pinch-zoom of the page is deliberately left enabled for accessibility. The
  map and game canvases opt out of browser gestures themselves, so their own
  pan, zoom and look still work.
