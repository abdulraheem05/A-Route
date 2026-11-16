'use client';
// A bottom sheet for the mobile interface.
//
// Three heights ("snap points") so a panel can sit out of the way while the
// terrain stays visible, or be pulled up to its full contents:
//
//   peek  — a quarter of the screen, enough for a couple of rows
//   half  — the default; the terrain is still readable above it
//   full  — everything up to just below the header
//
// The grip is draggable between them and a downward flick closes the sheet.
// Nothing is rendered while the sheet is closed, so a hidden panel costs no
// renders at all.
import { useCallback, useEffect, useRef, useState } from 'react';

export const SNAP = { peek: 0.3, half: 0.56, full: 0.92 };
const ORDER = ['peek', 'half', 'full'];

/** Height of a snap point in pixels, capped so the reserved space stays clear. */
function snapPx(snap, clearancePx) {
  if (typeof window === 'undefined') return 0;
  const h = window.innerHeight;
  return Math.max(60, Math.min(Math.round(h * SNAP[snap]), h - clearancePx));
}

export default function BottomSheet({
  open,
  onClose,
  title,
  /** Snap point the sheet opens at. */
  initialSnap = 'half',
  /**
   * Vertical space the sheet may not use: the workspace header above it and
   * the tab bar below it. The snap points are capped at the screen height
   * minus this, so a sheet can never cover either.
   */
  headerPx = 110,
  /** Rendered beside the title, e.g. a close button's companion control. */
  action = null,
  children,
}) {
  const [snap, setSnap] = useState(initialSnap);
  // Measured during the first render, so an opening sheet is never painted at
  // its full content height for a frame before it settles.
  const [height, setHeight] = useState(() => snapPx(initialSnap, headerPx));
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const sheetRef = useRef(null);

  // Opening resets to the requested snap point, so a sheet never reopens at a
  // height the viewer dragged it to for a different purpose.
  useEffect(() => {
    if (!open) return;
    setSnap(initialSnap);
    setHeight(snapPx(initialSnap, headerPx));
  }, [open, initialSnap, headerPx]);

  // Rotation and the browser toolbar appearing both change what a snap point
  // measures, so the current one is re-measured rather than kept in pixels.
  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => {
      if (!drag.current) setHeight(snapPx(snap, headerPx));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [open, snap, headerPx]);

  // Escape closes, which matters for a tablet with a keyboard attached.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onGripDown = useCallback(
    (e) => {
      drag.current = { y: e.clientY, from: height, moved: false, clearance: headerPx };
      setDragging(true);
      if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    },
    [height, headerPx]
  );

  const onGripMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY; // up is taller
    if (Math.abs(dy) > 3) d.moved = true;
    const max = window.innerHeight - d.clearance;
    setHeight(Math.max(60, Math.min(max, d.from + dy)));
  }, []);

  const onGripUp = useCallback(
    (e) => {
      const d = drag.current;
      drag.current = null;
      setDragging(false);
      if (!d) return;
      const dy = d.y - e.clientY;

      // A tap on the grip steps up through the snap points, and wraps round
      // from the top — the quickest way to get the terrain back.
      if (!d.moved) {
        const next = ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length];
        setSnap(next);
        setHeight(snapPx(next, headerPx));
        return;
      }

      // Dragged well below the smallest height: close.
      if (dy < 0 && height < snapPx('peek', headerPx) * 0.72) {
        onClose();
        return;
      }

      // Otherwise settle on whichever snap point is nearest.
      let best = ORDER[0];
      let bd = Infinity;
      for (const s of ORDER) {
        const dist = Math.abs(snapPx(s, headerPx) - height);
        if (dist < bd) {
          bd = dist;
          best = s;
        }
      }
      setSnap(best);
      setHeight(snapPx(best, headerPx));
    },
    [snap, height, headerPx, onClose]
  );

  if (!open) return null;

  return (
    <>
      <div className="m-sheet-backdrop" onPointerDown={onClose} aria-hidden="true" />
      <section
        ref={sheetRef}
        className="m-sheet"
        style={{ height: height || undefined }}
        data-dragging={dragging ? 'true' : 'false'}
        role="dialog"
        aria-modal="false"
        aria-label={title}
      >
        <div
          className="m-sheet-grip"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
          role="separator"
          aria-label={`Resize the ${title} panel`}
        />
        <header className="m-sheet-head">
          <span className="m-sheet-title">{title}</span>
          {action}
          <button
            type="button"
            className="gale-icon-btn"
            style={{ height: 34, width: 34 }}
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d="M2 2 L10 10 M10 2 L2 10" />
            </svg>
          </button>
        </header>
        <div className="m-sheet-body thin-scroll">{children}</div>
      </section>
    </>
  );
}
