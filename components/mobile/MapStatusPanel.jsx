'use client';
// Compact status panel for the mobile map.
//
// One always-visible line: the last point touched on the terrain, its
// elevation, the camera range and the sol being viewed. Tapping it opens the
// full desktop footer — the pointer readout and the sol timeline with its
// scrub bar, mission markers and Inspect button — in a sheet, so nothing the
// footer offers is lost on a phone.
import { formatLat, formatLon } from '@/lib/coordinates/projection';
import { useStore } from '@/store/useStore';

export default function MapStatusPanel({ onOpen }) {
  const cursor = useStore((s) => s.cursor);
  const selection = useStore((s) => s.selection);
  const sol = useStore((s) => s.sol);
  const waypoints = useStore((s) => s.rover.waypoints);
  const dist = useStore((s) => s.camera.dist);

  // A touch screen has no hovering pointer, so the reading shown is the last
  // point touched: the live cursor while a finger is down, otherwise the
  // selected point.
  const point =
    cursor ||
    (selection && selection.type === 'point'
      ? { lon: selection.lon, lat: selection.lat, elev: null }
      : null);

  // The timeline shows the newest sol when none has been chosen; the same
  // value is echoed here rather than left blank.
  const shownSol = sol !== null ? sol : waypoints.length ? waypoints[waypoints.length - 1].sol : null;

  const range =
    dist >= 10 ? `${dist.toFixed(0)} km` : dist >= 1 ? `${dist.toFixed(1)} km` : `${(dist * 1000).toFixed(0)} m`;

  return (
    <div className="m-status">
      <button
        type="button"
        className="m-status-row"
        onClick={onOpen}
        aria-label="Open the full readout and mission timeline"
      >
        <span className="num min-w-0 flex-1 truncate text-[11px] text-slate-100">
          {point ? (
            <>
              {formatLat(point.lat, 4)} {formatLon(point.lon, 4)}
              {point.elev !== null && point.elev !== undefined ? (
                <span className="text-slate-400"> · {point.elev.toFixed(0)} m</span>
              ) : null}
            </>
          ) : (
            <span className="text-slate-500">Tap the terrain to inspect a point</span>
          )}
        </span>

        <span className="num hidden shrink-0 text-[10.5px] text-slate-400 xs:inline">{range}</span>

        <span className="shrink-0 text-[10.5px]">
          <span className="label">Sol</span>{' '}
          <span className="num text-slate-100">{shownSol === null ? '—' : shownSol}</span>
        </span>

        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="shrink-0 text-slate-500"
          aria-hidden="true"
        >
          <path d="M2.5 7.5 L6 4 L9.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
