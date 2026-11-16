'use client';
// One place that answers "how big is the screen, and is it being touched?".
//
// The breakpoints are the ones the mobile work targets:
//   mobile   320–767px
//   tablet   768–1023px
//   desktop  1024px and above
//
// `compact` is true for mobile and tablet together: that is the range where
// the docked desktop panels no longer fit beside the terrain and the
// bottom-sheet interface takes over. At 1024px and above every value here is
// false, so the desktop workspace renders exactly the markup it always has.
//
// `touch` is a separate question from size. A narrow desktop window gets the
// compact layout but keeps its keyboard and mouse; only a coarse pointer gets
// the on-screen movement controls. Browser device-emulation modes report a
// coarse pointer, so the touch interface appears there too.
import { useEffect, useState } from 'react';

export const BREAKPOINTS = { mobile: 767, tablet: 1023 };

const QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `(min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
  compact: `(max-width: ${BREAKPOINTS.tablet}px)`,
  touch: '(pointer: coarse)',
  landscape: '(orientation: landscape)',
};

/** Desktop is the server-rendered assumption, so nothing shifts under a desktop viewer. */
const SERVER_STATE = {
  mobile: false,
  tablet: false,
  compact: false,
  desktop: true,
  touch: false,
  landscape: true,
  resolved: false,
};

function read() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return SERVER_STATE;
  const mobile = window.matchMedia(QUERIES.mobile).matches;
  const tablet = window.matchMedia(QUERIES.tablet).matches;
  const compact = window.matchMedia(QUERIES.compact).matches;
  const coarse = window.matchMedia(QUERIES.touch).matches;
  return {
    mobile,
    tablet,
    compact,
    desktop: !compact,
    // maxTouchPoints catches devices whose pointer media query is unhelpful.
    touch: coarse || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0),
    landscape: window.matchMedia(QUERIES.landscape).matches,
    resolved: true,
  };
}

const same = (a, b) =>
  a.mobile === b.mobile &&
  a.tablet === b.tablet &&
  a.compact === b.compact &&
  a.touch === b.touch &&
  a.landscape === b.landscape &&
  a.resolved === b.resolved;

export function useViewport() {
  // Resolved during the first render rather than in the effect, so a phone
  // never paints the desktop arrangement for a frame before correcting
  // itself. Safe because every consumer is inside a component the app loads
  // with `ssr: false` — there is no server HTML for React to compare against.
  // A component that is server-rendered should read `resolved` and wait.
  const [state, setState] = useState(read);

  useEffect(() => {
    const update = () => setState((prev) => {
      const next = read();
      return same(prev, next) ? prev : next;
    });
    update();

    const lists = Object.values(QUERIES).map((q) => window.matchMedia(q));
    for (const list of lists) {
      if (list.addEventListener) list.addEventListener('change', update);
      else list.addListener(update);
    }
    // Rotating a phone or opening the browser keyboard changes the answer
    // without always firing a media-query change.
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      for (const list of lists) {
        if (list.removeEventListener) list.removeEventListener('change', update);
        else list.removeListener(update);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}

/** Shorthand for the common question: should the mobile interface be used? */
export function useCompact() {
  return useViewport().compact;
}
