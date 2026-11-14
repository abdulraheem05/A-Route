'use client';
// Sol selector. The rover is shown at its last recorded drive-end position at
// or before the chosen sol; positions are never interpolated between records.
import { useMemo } from 'react';
import { SOL_LANDMARKS, waypointIndexAtSol } from '@/lib/data/landmarks';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

export default function SolTimeline() {
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
    return <div className="px-4 py-3 text-xs text-slate-500">Loading Curiosity’s traverse from NASA…</div>;
  }
  if (!range) {
    return <div className="px-4 py-3 text-xs text-slate-500">Rover data unavailable — the timeline is disabled.</div>;
  }

  const [minSol, maxSol] = range;
  const wp = index >= 0 ? waypoints[index] : null;
  const pct = (s) => ((s - minSol) / Math.max(1, maxSol - minSol)) * 100;
  const marks = SOL_LANDMARKS.filter((l) => l.tier <= 1 && typeof l.sol === 'number' && l.sol <= maxSol);

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

  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <div className="w-40 shrink-0">
        <div className="label">Mission sol</div>
        <div className="flex items-baseline gap-2">
          <span className="num text-xl leading-none text-slate-50">{sol}</span>
          <span className="num text-[11px] text-slate-500">of {maxSol}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button type="button" className="btn h-7 w-7 p-0" onClick={() => step(-1)} title="Previous drive">
          ‹
        </button>
        <button type="button" className="btn h-7 w-7 p-0" onClick={() => step(1)} title="Next drive">
          ›
        </button>
      </div>

      <div className="relative flex-1 pb-3 pt-1">
        <input
          type="range"
          min={minSol}
          max={maxSol}
          step={1}
          value={sol ?? maxSol}
          onChange={(e) => setSol(parseInt(e.target.value, 10))}
          className="w-full"
          aria-label="Mission sol"
        />
        <div className="pointer-events-none absolute inset-x-[6px] top-4 h-3">
          {marks.map((m) => (
            <button
              key={m.id}
              type="button"
              title={`${m.name} · sol ${m.sol}`}
              onClick={() => setSol(m.sol)}
              className="pointer-events-auto absolute h-2 w-[3px] -translate-x-1/2 rounded-sm bg-interpreted/70 hover:bg-interpreted"
              style={{ left: `${pct(m.sol)}%` }}
            />
          ))}
        </div>
      </div>

      <div className="hidden w-64 shrink-0 text-right text-[11px] leading-snug text-slate-400 xl:block">
        {wp ? (
          <>
            <div>
              Last drive end: sol <span className="num text-slate-200">{wp.sol}</span>
              {wp.sol !== sol ? ' (no drive recorded since)' : ''}
            </div>
            <div className="num">
              {wp.distTotalM !== null ? `${(wp.distTotalM / 1000).toFixed(2)} km driven` : ''}
              {wp.elev !== null ? ` · ${wp.elev.toFixed(0)} m` : ''}
            </div>
          </>
        ) : (
          <div>Before the first record</div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-accent shrink-0"
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
