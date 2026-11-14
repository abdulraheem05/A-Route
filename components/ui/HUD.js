'use client';
import { useMemo } from 'react';
import { Pause, Settings, AlertTriangle, Check } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS } from '@/lib/scientific-data';
import { getHeightfield } from '@/lib/terrain/heightfield';
import { missionProgress, nextObjective, siteUnlocked } from '@/lib/missions';
import { formatLat, formatLon, compassLabel } from '@/lib/coordinates/projection-jezero';
import Minimap from '@/components/minimap/Minimap';

const fmtDist = (d) => (d == null ? '—' : d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`);

export default function HUD() {
  const player = useGame((g) => g.player);
  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const allComplete = useGame((g) => g.allComplete);
  const nearbySiteId = useGame((g) => g.nearbySiteId);
  const blocked = useGame((g) => g.blocked);
  const pointerLocked = useGame((g) => g.pointerLocked);
  const paused = useGame((g) => g.paused);
  const overlay = useGame((g) => g.mapOpen || !!g.activeSiteId || g.settingsOpen || g.noticeOpen);
  const pace = useGame((g) => g.settings.pace);
  const hf = getHeightfield();

  const mission = MISSIONS[missionIndex];
  const progress = useMemo(() => missionProgress(mission, done), [mission, done]);
  const objective = useMemo(() => nextObjective(mission, done), [mission, done]);
  const targetSite = objective ? WORLD.siteById[WORLD.itemById[objective.target].siteId] : null;
  const targetDist = targetSite ? Math.hypot(targetSite.x - player.x, targetSite.z - player.z) : null;
  const targetBearing = targetSite ? ((Math.atan2(targetSite.x - player.x, -(targetSite.z - player.z)) * 180) / Math.PI + 360) % 360 : null;
  const nearby = nearbySiteId ? WORLD.siteById[nearbySiteId] : null;
  const nearbyLocked = nearby && !siteUnlocked(nearby, missionIndex);

  // nearest feature of any kind, for the inspector line
  const nearestAny = useMemo(() => {
    let best = null, bd = Infinity;
    for (const s of WORLD.sites) { const d = Math.hypot(s.x - player.x, s.z - player.z); if (d < bd) { bd = d; best = s; } }
    return best ? { site: best, d: bd } : null;
  }, [player.x, player.z]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-mars-50">
      {/* crosshair */}
      {pointerLocked && <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />}

      {/* top-left: logo, mission, progress */}
      <div className="absolute left-6 top-5">
        <div className="text-[11px] font-semibold uppercase tracking-hud text-mars-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">MarsWalk</div>
        <div className="mt-1.5 text-[10px] uppercase tracking-hud text-mars-100/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">Mission {String(mission.sequence).padStart(2, '0')} / {String(MISSIONS.length).padStart(2, '0')}</div>
        <div className="text-lg font-light leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">{mission.title}</div>
        <div className="mt-2 flex gap-1" aria-label={`Mission ${missionIndex + 1} of ${MISSIONS.length}`}>
          {MISSIONS.map((m, i) => (
            <span key={m.id} className={`h-1 w-5 rounded-sm ${i < missionIndex || allComplete ? 'bg-mars-300' : i === missionIndex ? 'bg-mars-500' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* top-right: pause, settings, data status */}
      <div className="pointer-events-auto absolute right-6 top-5 flex items-center gap-2">
        {hf && !hf.meta.calibrated && (
          <button type="button" onClick={() => useGame.getState().openNotice()} className="flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-coal-900/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-amber-100 backdrop-blur transition hover:border-amber-300" title="About the data in this build">
            <AlertTriangle size={11} /> Terrain: estimated
          </button>
        )}
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => useGame.getState().openSettings()}><Settings size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Pause" onClick={() => useGame.getState().setPaused(true)}><Pause size={15} /></button>
      </div>

      {/* bottom-left: terrain inspector */}
      <div className="absolute bottom-6 left-6 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        <div className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1">
          <div><div className="hud-label">Lat</div><div className="hud-value">{formatLat(player.lat)}</div></div>
          <div><div className="hud-label">Lon</div><div className="hud-value">{formatLon(player.lon)}</div></div>
          <div><div className="hud-label">Elevation</div><div className="hud-value">{hf && hf.meta.calibrated ? '' : '≈'}{Math.round(player.elev)} m</div></div>
          <div><div className="hud-label">Slope · Heading</div><div className="hud-value">{player.slope.toFixed(1)}° · {String(Math.round(player.heading) % 360).padStart(3, '0')}° {compassLabel(player.heading)}</div></div>
        </div>
        <div className="mt-2 font-mono text-[11px] text-mars-100/75">
          {nearestAny && <>Nearest: {nearestAny.site.name.length > 30 ? nearestAny.site.name.slice(0, 28) + '…' : nearestAny.site.name} · {fmtDist(nearestAny.d)}</>}
        </div>
        <div className="font-mono text-[10px] text-mars-200/60">Pace ×{pace}{pace > 1 ? ' (time-compressed)' : ''} · {(player.speed).toFixed(1)} m/s</div>
      </div>

      {/* bottom-centre: objective + prompts */}
      <div className="absolute bottom-6 left-1/2 flex w-[min(520px,46vw)] -translate-x-1/2 flex-col items-center gap-2 text-center">
        {blocked && <div className="rounded border border-amber-300/40 bg-coal-900/80 px-3 py-1 text-xs text-amber-100">{blocked}</div>}
        {nearby && !overlay && !paused && (
          <div className="rounded border border-mars-200/30 bg-coal-900/80 px-3 py-1.5 text-xs backdrop-blur">
            {nearbyLocked ? (
              <span className="text-mars-200/70">{nearby.name} · locked until Mission {String(MISSIONS[nearby.missionIndex].sequence).padStart(2, '0')}</span>
            ) : (
              <><kbd className="mr-2 rounded border border-mars-200/40 px-1.5 py-0.5 font-mono text-[10px]">E</kbd>{nearby.hasPanorama ? 'Open observation station' : 'Inspect'} · {nearby.name}</>
            )}
          </div>
        )}
        {!pointerLocked && !overlay && !paused && <div className="rounded bg-coal-900/70 px-3 py-1 text-[11px] text-mars-100/80">Click to look around · WASD move · Shift run · M map</div>}
        <div className="[text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
          {allComplete ? (
            <div className="text-sm text-mars-50">All missions complete. Keep exploring.</div>
          ) : objective ? (
            <>
              <div className="hud-label">Objective · {progress.requiredDone}/{progress.required}</div>
              <div className="text-sm text-mars-50">{objective.label}</div>
              <div className="font-mono text-[11px] text-ice-300">{fmtDist(targetDist)}{targetDist > 45 ? ` · bearing ${String(Math.round(targetBearing) % 360).padStart(3, '0')}° ${compassLabel(targetBearing)}` : ' · you are here'}</div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm"><Check size={14} /> Mission objectives complete</div>
          )}
        </div>
      </div>

      {/* bottom-right: minimap */}
      <div className="absolute bottom-9 right-6"><Minimap /></div>
    </div>
  );
}
