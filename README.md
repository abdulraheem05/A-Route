# A-ROUTE — *Know the Ground*

**Phase 1: cinematic introduction and Mars destination selection.**

A Next.js (App Router, JavaScript) build of the A-ROUTE opening sequence: a
starfield, the wordmark typing itself on, a real Mars globe arriving in front
of it, and the eight-site destination grid. Nothing from later phases is
stubbed, routed or hinted at.

---

## 1. Install and run

Requires **Node 18.18+** (Node 20 LTS or newer recommended).

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm run start   # production check
```

The app runs immediately with no assets in place — the font, the Mars texture
and the eight thumbnails are all optional and degrade gracefully (see §3).

Dependencies: `next`, `react`, `react-dom`, `three`, `@react-three/fiber`,
`@react-three/drei`, `framer-motion`, `tailwindcss`. Nothing else was added.

---

## 2. What is in Phase 1

The flow is exactly: **landing → cinematic title → Mars globe reveal → Explore
Mars → destination selection.** One route, one WebGL context, no page changes.

The intro runs on a single clock (`lib/timeline.js`) with named cues:

| # | Cue | Window | What happens |
|---|-----|--------|--------------|
| 1 | `starfield` | 0.0–0.8s | ~6,200 stars fade up across three parallax shells |
| 2 | `titleTyping` | 0.7–2.7s | A-ROUTE types on, glyph by glyph, arriving out of depth |
| 3 | `taglineReveal` | 2.7–3.5s | KNOW THE GROUND settles in beneath it |
| 4 | `globeReveal` | 3.4–6.1s | Mars emerges from deep space as the light rig ramps |
| 5 | `cameraPullback` | 3.6–7.2s | The camera dollies back; the type drifts up, the tagline down |
| 6 | `composition` | 6.9–7.9s | The planet's limb comes to rest across the lower glyphs |
| 7 | `buttonReveal` | 7.6–8.3s | EXPLORE MARS appears |

Every animated component derives its state from that clock inside `useFrame`,
so beats can overlap, nothing can fire twice, and skip/replay are just clock
writes. React is told about phase changes only — seven state updates for the
whole intro.

**The occlusion is real.** The wordmark sits on planes at `z = -4.5`; Mars
settles at `z = 0` between the type and the camera. The planet hides the lower
part of the central glyphs because the depth buffer says so, not because
anything is masked or faded. `resolveComposition()` in
`lib/animation-config.js` projects the globe onto the title's plane and derives
the wordmark's resting height from it, so the same framing holds on a 21:9
monitor and a phone.

Also included: skip (`Esc` or the corner control), unobtrusive replay,
`prefers-reduced-motion` support that presents the final composed frame rather
than a fast intro, adaptive resolution, and a keyboard-reachable UI.

---

## 3. Where your assets go

### 3.1 The Artemus font

```
public/fonts/Artemus.woff2      <- preferred
public/fonts/Artemus.ttf        <- also accepted
```

That is the only step. The `@font-face` rule is in **`app/globals.css`** (one
block, two `src` URLs) and the family name is declared once in
**`lib/brand.js`**.

The app measures text at runtime to confirm the face actually loaded. If it
did not, the wordmark renders in a neutral system stack — **it never
substitutes a lookalike display font** — and a dismissible notice appears in
the corner *in development only*. Until the file exists you will see a 404 for
these URLs in the console; that is expected.

Letter spacing, rasterisation size and the glow are in
`components/intro/useWordmark.js` (`TITLE_FONT_PX`) and
`lib/typography.js` (`letterSpacingEm`). World sizing is derived from the
measured cap height, so dropping in the real font keeps the composition correct
without touching any numbers.

### 3.2 The Mars surface texture

```
public/images/mars/mars-texture.jpg      <- colour map (required filename)
public/images/mars/mars-bump.jpg         <- optional elevation/bump map
```

Equirectangular (simple cylindrical), 2:1 aspect. 4096×2048 is a good balance;
8192×4096 if you want to push in. A real NASA/USGS basemap is recommended.

Paths live in **`lib/assets.js`**. The bump map is opt-in: set `marsBumpMap`
to its path once you have one, otherwise the colour map doubles as a
low-amplitude bump source.

If the colour map is missing, the globe is painted with a **generated**
equirectangular Mars map (`lib/procedural-mars.js`) — fractal terrain, albedo
provinces, 150 craters, polar caps, seamless in longitude. It is decorative,
takes ~300ms once per session, and is not scientific data. It exists so the
scene is never a flat red sphere while you source imagery.

### 3.3 The eight destination thumbnails

```
public/images/mars/destinations/
  jezero.jpg
  gale.jpg
  gusev.jpg
  meridiani.jpg
  ares-vallis.jpg
  utopia.jpg
  elysium.jpg
  valles-marineris.jpg
```

16:10 landscape, around 800×500. Using `.webp`/`.png` instead only means
editing that destination's `image` field in `lib/destinations.js`.

Missing files are handled per card: the tile shows a Mars-toned gradient with a
survey-grid texture and the destination name. No stand-in imagery is invented
or fetched.

---

## 4. Configuring destinations

Everything about the grid comes from **`lib/destinations.js`**. Cards are
generated from the array; none are written out in JSX.

```js
{
  id: 'jezero',
  name: 'Jezero Crater',
  region: 'Nili Fossae, NW Isidis Planitia',
  coordinates: '18.4° N, 77.5° E',
  terrain: 'Delta and lake-floor sediments',
  description: '...',
  image: '/images/mars/destinations/jezero.jpg',
  status: DESTINATION_STATUS.UNLOCKED,
}
```

- **Unlock a site:** set `status` to `'unlocked'`. Jezero and Gale ship
  unlocked; the other six are locked.
- **Add a site:** append an entry and drop in a thumbnail.
- **Grid shape:** 4 columns × 2 rows from 1280px, 2 columns from 480px, 1
  below. Documented in `DESTINATION_GRID` and mirrored by the literal Tailwind
  classes in `components/destinations/DestinationGrid.js`.

### Phase 1 click gate

`DESTINATIONS_INTERACTIVE` is `false` and **no card navigates anywhere** —
including Jezero and Gale. They read as available, lift and glow on hover, and
do nothing when clicked, because the surface map and the first-person
experience belong to a later phase.

Since the cards carry no action yet they are also not focus targets; status is
exposed to assistive technology as text ("Available. The interactive surface
map opens in a later phase.") rather than as a disabled control. When the map
route lands, swap the `<article>` in `DestinationCard.js` for a `<button>` or
`<Link>` — every visual state already applies.

---

## 5. Architecture

```
app/
  layout.js                 metadata, html/body shell
  page.js                   single route
  globals.css               Tailwind layers + @font-face + focus/scrollbar styles

components/
  ExperienceRoot.js         stage machine, the shared <Canvas>, the intro clock
  intro/
    IntroScene.js           the intro's 3D contents + responsive composition
    Starfield.js            3 Points layers, custom shader, ~6,200 stars
    MarsGlobe.js            sphere + light rig + fresnel atmosphere + reveal
    IntroTitle.js           3D wordmark & tagline, per-glyph typing
    useWordmark.js          rasterises glyphs to GPU textures
    CameraRig.js            the only thing that moves the camera
    TimelineDriver.js       advances the clock, reports phases
    ExploreMarsButton.js
    IntroControl.js         skip / replay
  destinations/
    DestinationSelection.js overlay: header, copy, grid, footer
    DestinationGrid.js      responsive grid + stagger
    DestinationCard.js      thumbnail fallback, lock/unlock states
  ui/
    LoadingScreen.js
    DevAssetNotice.js       development-only missing-asset notice

lib/
  brand.js                  name, tagline, font family, wordmark gradient
  assets.js                 every replaceable asset path
  destinations.js           the eight sites + lock states + grid shape
  animation-config.js       cue times, composition, camera, easing targets
  timeline.js               clock creation, cue progress, phase resolution
  typography.js             canvas text measurement & rasterisation
  procedural-mars.js        generated fallback Mars map
  easing.js                 easing + frame-rate-independent damping
  random.js                 seeded PRNG
  useBrandFont.js           font load + real availability detection
  usePrefersReducedMotion.js

public/
  fonts/                    <- Artemus.woff2 here
  images/mars/              <- mars-texture.jpg here
  images/mars/destinations/  <- eight thumbnails here
```

### Brand gradient

`lib/brand.js` holds the single gradient definition (dark terracotta → burnt
red → warm orange → golden orange) used by both the 3D wordmark and the DOM
chrome. It is applied **only to the A-ROUTE title** (plus the small wordmark in
the loader and the destination header); the rest of the interface stays black,
bone white and dim grey.

> **Note on the reference logo:** the brief described the gradient but no logo
> image or font file was supplied with it, so the ramp was built from that
> description. Adjust the six stops in `lib/brand.js` against your artwork and
> both the 3D title and the DOM wordmark follow.

---

## 6. Performance

- Stars: 3 draw calls total via `THREE.Points` + a custom shader. Sizes are
  authored in CSS pixels and converted in the vertex shader, so they look the
  same at 1× and 3×; sub-pixel stars fade instead of aliasing.
- No per-frame React state. The clock is a mutable ref; only phase changes
  reach React. No texture uploads during the typing sequence — glyph textures
  are baked once and only transforms and opacity animate.
- Device pixel ratio capped at 1.75 and dropped to 1 automatically by drei's
  `PerformanceMonitor` if the frame rate declines.
- Globe: one 128×64 sphere plus a 64×32 atmosphere shell. No post-processing.
- Every hand-made geometry, material and texture is disposed on unmount;
  `delta` is clamped so a backgrounded tab cannot jump a whole beat on return.
- Renderer created with `alpha: false`, `stencil: false`.

## 7. Accessibility

- A real `<h1>` carries the wordmark text (the visible title is a texture).
- `EXPLORE MARS`, `BACK` and `SKIP`/`REPLAY` are real buttons with a single
  consistent `:focus-visible` treatment.
- `prefers-reduced-motion: reduce` presents the final composed frame
  immediately: no dolly, no typing, no twinkle, no planet spin, and
  `MotionConfig reducedMotion="user"` neutralises the DOM transitions.
- `Esc` skips the intro and steps back out of destination selection.
- The canvas is `aria-hidden`; all meaning is in the DOM.

## 8. Deliberately not built

No Jezero or Gale map, DEM terrain, geological or mineralogical layers, rover
traverse, route planning, descent, first-person movement, missions, rock
collection, sample analysis, notebook, snapshot gallery, panorama viewer or
Ask AI — and no placeholder pages or dead routes for any of them.

## 9. Tuning the intro

| Want to change | File |
|---|---|
| Cue timings, total length | `lib/animation-config.js` → `TIMELINE` |
| How much of the title Mars covers | `resolveComposition()` (the `0.1 * titleCap` term) |
| Camera start/end distance, parallax | `CAMERA` |
| Typing rhythm, caret | `TITLE_TYPING` |
| Globe size, spin, axial tilt | `COMPOSITION.globe` |
| Light rig | `COMPOSITION.lighting` |
| Star counts, shells, brightness | `components/intro/Starfield.js` → `STAR_LAYERS` |
| Wordmark gradient, tagline colour | `lib/brand.js` |

## 10. Troubleshooting

- **Console 404s for `Artemus.woff2`, `mars-texture.jpg`, or the thumbnails** —
  expected until those files exist; each has a working fallback.
- **The wordmark looks wrong** — the font file is probably not loading. The
  development notice in the corner tells you which assets are missing.
- **The title is hidden behind the planet** on an unusual viewport — raise
  `COMPOSITION.title.maxWidthFraction` or the `0.1 * titleCap` term in
  `resolveComposition()`.
- **Globe texture looks generated** — that is the procedural fallback; add
  `public/images/mars/mars-texture.jpg`.
