# Loading screens

One component, `components/ui/MarsLoadingScreen.jsx`, in three variants.

It is named `MarsLoadingScreen` rather than `LoadingScreen` because
`components/ui/LoadingScreen.js` already exists for the cinematic intro, and
two files with the same base name in one folder make
`@/components/ui/LoadingScreen` ambiguous.

## The planet

CSS gradients, not WebGL and not an image: nothing to download, no second GL
context competing with the scene that is still starting up, and it keeps
animating while the main thread is busy because transforms and opacity run on
the compositor. A radial gradient gives the sphere its limb and terminator,
bands of albedo scroll sideways to read as rotation, and a soft outer glow
gives it atmosphere. The whole thing honours `prefers-reduced-motion`.

## Props

| Prop | Purpose |
|---|---|
| `variant` | `explore`, `map` or `play` — sets the eyebrow, title and subtitle |
| `crater` | active crater configuration; its name goes in the title |
| `stages` | `[{ label, done, detail }]` computed from real loading state |
| `title`, `subtitle`, `note` | overrides and extra context |
| `error`, `onRetry` | error state with a retry affordance |

With `stages` it lists what is done, what is running and any detail each stage
reported. Without them it shows a sweep. **There is no percentage**, because
nothing here can honestly compute one.

## The three places it appears

**Explore** — `app/explore/loading.js` is a Next.js route-level boundary, so it
shows while the route segment actually loads and disappears the moment it is
ready. `ExplorePage` then waits for the destination thumbnails, preloading each
and counting it settled whether it loads or fails, with a 6 s ceiling. The
cards already handle a missing thumbnail with a placeholder, so the ceiling
costs nothing.

**Crater MAP** — `components/ui/MapLoadingGate.jsx` wraps the explorer and
reads four real signals:

| Stage | Signal |
|---|---|
| Starting the renderer | `rendererReady`, set by `Viewport`'s `onCreated` when the WebGL context exists |
| Loading terrain elevation | `terrain.status` leaving `loading` — `missing` counts as settled, because a flat reference surface with real imagery is a usable map, and the screen says so before it lifts |
| Preparing orbital imagery | the first Mars Trek tiles drawn, or imagery switched off |
| Loading scientific layers | `rover.status` leaving `loading`, including `unavailable` for a crater with no mission |

The data hooks run behind the screen, so loading is not delayed by it. The gate
lifts when all four have settled, with one short fade so the map is never
revealed mid-paint. A 20 s ceiling means a stalled network cannot trap anyone:
past it the map opens with whatever arrived and its own status banner explains
what is missing.

**PLAY** — `components/game/Game.js` already computed a real step list while
loading the heightfield, the surface texture, the mission data and the panorama
catalogue. That list now feeds `MarsLoadingScreen` with `variant="play"`, and
the loading work itself is untouched. The superseded
`components/game/LoadingSequence.js` was removed; nothing imported it.

## What these screens do not do

- No arbitrary timers to simulate progress. Every stage is a real signal.
- No fake percentages.
- No delay when something loads instantly: a settled stage is settled.
- No way to get stuck: each gate has a ceiling and an error state with a retry.
- No interference with direct URLs, refreshes or browser navigation — MAP and
  PLAY are their own routes, and each gate lives inside the route it guards.

`Game.js` still contains three short `wait()` calls between its own loading
steps, from before this work. They are existing game behaviour and were left
alone; they pace the step list so it can be read.
