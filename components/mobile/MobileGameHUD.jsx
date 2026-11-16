'use client';
// The first-person HUD, arranged for a phone.
//
// Same data, same sources, same mission logic as components/ui/HUD.js — the
// mission, objective, progress, bearing, nearest feature, position readout,
// pace and data-quality notice are all read from the same store and the same
// helpers. What changes is the arrangement: on a phone the corners belong to
// the movement controls, so the mission card collapses to one chip that
// expands over the terrain only while it is being read, and the minimap can
// be switched off entirely.
import { useMemo, useState } from 'react';
import { Pause, Settings, AlertTriangle, Check, Map as MapIcon, X } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS } from '@/lib/scientific-data';
import { getHeightfield } from '@/lib/terrain/heightfield';
import { missionProgress, nextObjective, siteUnlocked } from '@/lib/missions';
import { formatLat, formatLon, compassLabel } from '@/lib/coordinates/projection-jezero';
import Minimap from '@/components/minimap/Minimap';

const fmtDist = (d) => (d == null ? '—' : d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`);

function Value({ label, children }) {
  return (
    <div>
      <div className="m-hud-label">{label}</div>
      <div className="m-hud-value">{children}</div>
    </div>
  );
}

export default function MobileGameHUD() {
  const player = useGame((g) => g.player);
  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const allComplete = useGame((g) => g.allComplete);
  const nearbySiteId = useGame((g) => g.nearbySiteId);
  const blocked = useGame((g) => g.blocked);
  const paused = useGame((g) => g.paused);
  const overlay = useGame((g) => g.mapOpen || !!g.activeSiteId || g.settingsOpen || g.noticeOpen);
  const pace = useGame((g) => g.settings.pace);
  const hf = getHeightfield();

  const [expanded, setExpanded] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  const mission = MISSIONS[missionIndex];
  const progress = useMemo(() => missionProgress(mission, done), [mission, done]);
  const objective = useMemo(() => nextObjective(mission, done), [mission, done]);
  const targetSite = objective ? WORLD.siteById[WORLD.itemById[objective.target].siteId] : null;
  const targetDist = targetSite ? Math.hypot(targetSite.x - player.x, targetSite.z - player.z) : null;
  const targetBearing = targetSite
    ? ((Math.atan2(targetSite.x - player.x, -(targetSite.z - player.z)) * 180) / Math.PI + 360) % 360
    : null;
  const nearby = nearbySiteId ? WORLD.siteById[nearbySiteId] : null;
  const nearbyLocked = nearby && !siteUnlocked(nearby, missionIndex);

  const nearestAny = useMemo(() => {
    let best = null;
    let bd = Infinity;
    for (const s of WORLD.sites) {
      const d = Math.hypot(s.x - player.x, s.z - player.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best ? { site: best, d: bd } : null;
  }, [player.x, player.z]);

  const top = 'calc(8px + var(--sa-t))';
  const row2 = 'calc(56px + var(--sa-t))';
  // The mission chip gives the minimap its corner when the minimap is shown.
  // The minimap is 120px wide at its mobile scale and sits 10px from the
  // right inset, so the chip stops 150px short of the far edge — both insets
  // counted, or a tablet in landscape would run the two together.
  const chipRoom = showMinimap
    ? 'calc(100vw - 150px - var(--sa-l) - var(--sa-r))'
    : 'calc(100vw - 80px - var(--sa-l) - var(--sa-r))';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-mars-50">
      {/* Top right: minimap toggle, settings, pause. The MAP / PLAY links sit
          opposite them, so this row never collides. */}
      <div
        className="pointer-events-auto absolute flex items-center gap-1.5"
        style={{ top, right: 'calc(10px + var(--sa-r))' }}
      >
        <button
          type="button"
          className="m-fab"
          style={{ height: 40, width: 40 }}
          data-on={showMinimap ? 'true' : 'false'}
          aria-pressed={showMinimap}
          onClick={() => setShowMinimap((v) => !v)}
          aria-label={showMinimap ? 'Hide the minimap' : 'Show the minimap'}
        >
          <MapIcon size={17} />
        </button>
        <button
          type="button"
          className="m-fab"
          style={{ height: 40, width: 40 }}
          aria-label="Settings"
          onClick={() => useGame.getState().openSettings()}
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          className="m-fab"
          style={{ height: 40, width: 40 }}
          aria-label="Pause"
          onClick={() => useGame.getState().setPaused(true)}
        >
          <Pause size={18} />
        </button>
      </div>

      {/* Mission chip, collapsed: sequence, the live distance to the next
          objective, and the progress bars. */}
      <div
        className="pointer-events-auto absolute"
        style={{ top: row2, left: 'calc(10px + var(--sa-l))', maxWidth: chipRoom }}
      >
        <button
          type="button"
          className="m-chip w-full"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label="Mission details"
        >
          <span className="m-hud-label shrink-0">
            M{String(mission.sequence).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-mars-50">
            {allComplete ? 'All missions complete' : objective ? objective.label : 'Objectives complete'}
          </span>
          {!allComplete && objective && (
            <span className="shrink-0 font-mono text-[10.5px] text-ice-300">{fmtDist(targetDist)}</span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="shrink-0 text-mars-200/70"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          >
            <path d="M2.5 4.5 L6 8 L9.5 4.5" />
          </svg>
        </button>

        {!expanded && (
          <div
            className="mt-1.5 flex gap-1 pl-1"
            aria-label={`Mission ${missionIndex + 1} of ${MISSIONS.length}`}
          >
            {MISSIONS.map((m, i) => (
              <span
                key={m.id}
                className={`h-1 w-4 rounded-sm ${
                  i < missionIndex || allComplete ? 'bg-mars-300' : i === missionIndex ? 'bg-mars-500' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mission card, expanded. Everything the desktop HUD shows in its two
          corners, in one scrollable card the viewer opened deliberately. */}
      {expanded && (
        <section
          className="m-card pointer-events-auto absolute overflow-y-auto p-3.5 thin-scroll"
          style={{
            top: `calc(${row2} + 44px)`,
            left: 'calc(10px + var(--sa-l))',
            right: 'calc(10px + var(--sa-r))',
            maxHeight: 'calc(100dvh - 240px)',
          }}
          aria-label="Mission details"
        >
          <header className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="m-hud-label">
                Mission {String(mission.sequence).padStart(2, '0')} / {String(MISSIONS.length).padStart(2, '0')}
              </div>
              <h2 className="mt-0.5 text-base font-light leading-snug">{mission.title}</h2>
            </div>
            <button
              type="button"
              className="m-fab shrink-0"
              style={{ height: 34, width: 34 }}
              onClick={() => setExpanded(false)}
              aria-label="Close mission details"
            >
              <X size={15} />
            </button>
          </header>

          <div className="mt-2.5 flex gap-1">
            {MISSIONS.map((m, i) => (
              <span
                key={m.id}
                className={`h-1 flex-1 rounded-sm ${
                  i < missionIndex || allComplete ? 'bg-mars-300' : i === missionIndex ? 'bg-mars-500' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="mt-3.5">
            {allComplete ? (
              <p className="text-[13px] text-mars-50">All missions complete. Keep exploring.</p>
            ) : objective ? (
              <>
                <div className="m-hud-label">
                  Objective · {progress.requiredDone}/{progress.required}
                </div>
                <p className="mt-1 text-[13px] leading-snug text-mars-50">{objective.label}</p>
                <p className="mt-1 font-mono text-[11px] text-ice-300">
                  {fmtDist(targetDist)}
                  {targetDist > 45
                    ? ` · bearing ${String(Math.round(targetBearing) % 360).padStart(3, '0')}° ${compassLabel(
                        targetBearing
                      )}`
                    : ' · you are here'}
                </p>
              </>
            ) : (
              <p className="flex items-center gap-2 text-[13px]">
                <Check size={14} /> Mission objectives complete
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-mars-200/10 pt-3">
            <Value label="Lat">{formatLat(player.lat)}</Value>
            <Value label="Lon">{formatLon(player.lon)}</Value>
            <Value label="Elevation">
              {hf && hf.meta.calibrated ? '' : '≈'}
              {Math.round(player.elev)} m
            </Value>
            <Value label="Slope">{player.slope.toFixed(1)}°</Value>
            <Value label="Heading">
              {String(Math.round(player.heading) % 360).padStart(3, '0')}° {compassLabel(player.heading)}
            </Value>
            <Value label="Speed">{player.speed.toFixed(1)} m/s</Value>
          </div>

          <p className="mt-3 font-mono text-[10.5px] text-mars-100/75">
            {nearestAny && (
              <>
                Nearest: {nearestAny.site.name} · {fmtDist(nearestAny.d)}
              </>
            )}
          </p>
          <p className="font-mono text-[10px] text-mars-200/60">
            Pace ×{pace}
            {pace > 1 ? ' (time-compressed)' : ''}
          </p>

          {hf && !hf.meta.calibrated && (
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-amber-300/40 bg-coal-900/70 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-amber-100"
              onClick={() => useGame.getState().openNotice()}
            >
              <AlertTriangle size={11} /> Terrain: estimated — data notes
            </button>
          )}
        </section>
      )}

      {/* Minimap, scaled for a phone and switchable. Tapping it still opens
          the full mission map, as on desktop. */}
      {showMinimap && !expanded && (
        <div
          className="pointer-events-none absolute"
          style={{ top: row2, right: 'calc(10px + var(--sa-r))' }}
          aria-hidden={false}
        >
          <div className="m-minimap">
            <Minimap />
          </div>
        </div>
      )}

      {/* Prompts, above the movement controls and clear of both of them. */}
      <div className="m-game-prompts absolute inset-x-0 flex flex-col items-center gap-1.5 px-4 text-center">
        {blocked && (
          <div className="rounded border border-amber-300/40 bg-coal-900/85 px-3 py-1 text-[11px] text-amber-100">
            {blocked}
          </div>
        )}
        {nearby && !overlay && !paused && (
          <div className="rounded border border-mars-200/30 bg-coal-900/85 px-3 py-1.5 text-[11px] backdrop-blur">
            {nearbyLocked ? (
              <span className="text-mars-200/70">
                {nearby.name} · locked until Mission {String(MISSIONS[nearby.missionIndex].sequence).padStart(2, '0')}
              </span>
            ) : (
              <span>
                {nearby.hasPanorama ? 'Open observation station' : 'Inspect'} · {nearby.name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
