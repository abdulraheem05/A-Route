'use client';
// Full-screen loading experience, shared by the Explore page, a crater MAP and
// PLAY.
//
// Named MarsLoadingScreen rather than LoadingScreen because
// components/ui/LoadingScreen.js already exists for the intro, and two files
// with the same base name in one folder would make `@/components/ui/LoadingScreen`
// ambiguous.
//
// The planet is drawn with CSS gradients: no texture to download, no WebGL
// context competing with the scene that is still starting up, and it keeps
// animating while the main thread is busy because transforms and opacity run
// on the compositor.
//
// Stages are real. Pass `stages` as [{ label, done, detail }] computed from
// actual loading state; the component reports what is done and what is still
// running, and never shows a percentage it cannot justify.
import { useEffect, useState } from 'react';

const VARIANTS = {
  explore: {
    eyebrow: 'A-ROUTE',
    title: 'INITIALIZING MARS EXPLORATION',
    sub: 'Preparing planetary systems',
  },
  map: {
    eyebrow: 'SCIENTIFIC MAP',
    title: 'INITIALIZING',
    sub: 'Loading terrain and orbital imagery',
  },
  play: {
    eyebrow: 'SURFACE OPERATIONS',
    title: 'INITIALIZING SURFACE OPERATIONS',
    sub: 'Preparing the rover environment',
  },
};

export default function MarsLoadingScreen({
  variant = 'explore',
  title,
  subtitle,
  crater = null,
  stages = null,
  error = null,
  onRetry = null,
  note = null,
}) {
  const v = VARIANTS[variant] || VARIANTS.explore;
  const heading = title || (crater ? `${v.title} ${crater.name.toUpperCase()}` : v.title);

  // After a while with nothing finishing, say so rather than spinning forever.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(t);
  }, []);

  const running = stages ? stages.find((s) => !s.done) : null;

  return (
    <div className="mars-load" role="status" aria-live="polite">
      <div className="mars-load-stars" aria-hidden="true" />

      <div className="mars-load-stage" aria-hidden="true">
        <span className="mars-load-glow" />
        <span className="mars-load-planet">
          <span className="mars-load-surface" />
          <span className="mars-load-shadow" />
        </span>
      </div>

      <p className="mars-load-eyebrow">{crater ? crater.shortLabel || crater.name : v.eyebrow}</p>
      <h1 className="mars-load-title">{heading}</h1>
      <p className="mars-load-sub">
        {error ? 'Could not finish loading' : subtitle || (running ? `${running.label}…` : `${v.sub}…`)}
      </p>

      {stages && !error && (
        <ul className="mars-load-stages">
          {stages.map((s) => (
            <li key={s.label} data-done={s.done ? 'true' : 'false'} data-running={s === running ? 'true' : 'false'}>
              <span className="mars-load-tick" aria-hidden="true" />
              <span className="mars-load-stage-label">{s.label}</span>
              {s.detail && s.done && <span className="mars-load-detail">{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {!stages && !error && (
        <div className="mars-load-sweep" aria-hidden="true">
          <span />
        </div>
      )}

      {note && !error && <p className="mars-load-note">{note}</p>}

      {slow && !error && <p className="mars-load-note">This is taking longer than usual. The data may be slow to arrive.</p>}

      {error && (
        <div className="mars-load-error">
          <p className="mars-load-error-head">Loading failed</p>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="btn mt-3" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
