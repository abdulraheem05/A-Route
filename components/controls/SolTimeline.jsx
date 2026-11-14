'use client';
// Mission timeline.
//
// One compact row: which sol you are looking at, step controls, the scrub bar
// with a few mission markers, and a short rover status. The drive-end detail
// that used to occupy a quarter of the bar is now a tooltip on the sol block.
//
// Selection logic is unchanged: the rover is shown at its last recorded
// drive-end position at or before the chosen sol, and positions are never
// interpolated between records.
import { useMemo } from 'react';
import { waypointIndexAtSol } from '@/lib/data/landmarks';
import { useCrater } from '@/lib/mars/CraterContext';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

export default function SolTimeline() {
  const crater = useCrater();
  const roverName = (crater.rover && crater.rover.name) || 'the rover';
  const solLandmarks = (crater.landmarks && crater.landmarks.solKeyed) || [];
  const waypoints = useStore((s) => s.rover.waypoints);
  const status = useStore((s) => s.rover.status);
  const sol = useStore((s) => s.sol);
  const setSol = useStore((s) => s.setSol);
  const select = useStore((s) => s.select);

  const range = useMemo(
    () => (waypoints.length ? [waypoints[0].sol, waypoints[waypoints.length - 1].sol] : null),
    [waypoints]
  );
  const index = useMemo(
    () => (sol === null || !waypoints.length ? -1 : waypointIndexAtSol(waypoints, sol)),
    [waypoints, sol]
  );

  if (status === 'loading') {
    return (
      <div className="sol-timeline flex items-center px-3">
        <span className="label animate-soft-pulse">Loading {roverName}&rsquo;s traverse from NASA</span>
      </div>
    );
  }
  if (status === 'unavailable') {
    return (
      <div className="sol-timeline flex items-center px-3">
        <span className="label">No rover mission for this crater — timeline disabled</span>
      </div>
    );
  }
  if (!range) {
    return (
      <div className="sol-timeline flex items-center px-3">
        <span className="label">Rover data unavailable — timeline disabled</span>
      </div>
    );
  }

  const [minSol, maxSol] = range;
  const wp = index >= 0 ? waypoints[index] : null;
  const pct = (s) => ((s - minSol) / Math.max(1, maxSol - minSol)) * 100;
  const marks = solLandmarks.filter((l) => l.tier <= 1 && typeof l.sol === 'number' && l.sol <= maxSol);

  const step = (dir) => {
    if (index < 0) return;
    // Move to the neighbouring record with a different sol.
    let i = index;
    const current = waypoints[index].sol;
    while (i + dir >= 0 && i + dir < waypoints.length) {
      i += dir;
      if (waypoints[i].sol !== current) break;
    }
    setSol(waypoints[i].sol);
  };

  const driven = wp && wp.distTotalM !== null ? `${(wp.distTotalM / 1000).toFixed(2)} km` : null;
  const detail = wp
    ? `Drive end · sol ${wp.sol}${wp.sol !== sol ? ' (no drive recorded since)' : ''}${
        driven ? ` · ${driven} driven` : ''
      }${wp.elev !== null ? ` · ${wp.elev.toFixed(0)} m` : ''}`
    : 'Before the first record';

  return (
    <div className="sol-timeline flex items-center gap-3 px-3">
      <div className="tip tip-above flex shrink-0 items-baseline gap-1.5" data-tip={detail}>
        <span className="label">Sol</span>
        <span className="num text-[15px] leading-none text-slate-50">{sol ?? maxSol}</span>
        <span className="num text-[10px] text-slate-600">/ {maxSol}</span>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className="gale-icon-btn tip tip-above"
          data-tip="Previous drive"
          onClick={() => step(-1)}
          aria-label="Previous drive"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7.5 2 L3.5 6 L7.5 10" />
          </svg>
        </button>
        <button
          type="button"
          className="gale-icon-btn tip tip-above"
          data-tip="Next drive"
          onClick={() => step(1)}
          aria-label="Next drive"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4.5 2 L8.5 6 L4.5 10" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1">
        <input
          type="range"
          min={minSol}
          max={maxSol}
          step={1}
          value={sol ?? maxSol}
          onChange={(e) => setSol(parseInt(e.target.value, 10))}
          aria-label="Mission sol"
        />
        {/* Mission milestones, clickable. */}
        <div className="pointer-events-none absolute inset-x-[6px] top-[15px] h-2">
          {marks.map((m) => (
            <button
              key={m.id}
              type="button"
              className="tip tip-above pointer-events-auto absolute h-1.5 w-[3px] -translate-x-1/2 rounded-sm transition-colors"
              style={{ left: `${pct(m.sol)}%`, background: 'rgba(233,196,106,0.6)' }}
              data-tip={`${m.name} · sol ${m.sol}`}
              onClick={() => setSol(m.sol)}
              aria-label={`Go to ${m.name}, sol ${m.sol}`}
            />
          ))}
        </div>
      </div>

      {driven && (
        <span className="num hidden shrink-0 text-[10.5px] text-slate-500 lg:inline">{driven} driven</span>
      )}

      <button
        type="button"
        className="btn shrink-0"
        disabled={!wp}
        onClick={() => {
          if (!wp) return;
          cameraApi.flyTo(wp.lon, wp.lat, Math.min(cameraApi.distance(), 3));
          select({ type: 'waypoint', index });
        }}
      >
        Inspect
      </button>
    </div>
  );
}
