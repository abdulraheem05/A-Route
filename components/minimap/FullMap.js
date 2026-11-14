'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, Plus, Minus, LocateFixed, Layers, Camera, Navigation } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS, PANORAMA_BY_ID } from '@/lib/scientific-data';
import { odometerAtSol } from '@/lib/scientific-data/world';
import { nextObjective, siteUnlocked } from '@/lib/missions';
import { analyseRoute } from '@/lib/terrain/route';
import { worldToGeo, formatLat, formatLon } from '@/lib/coordinates/projection-jezero';
import { drawBase, drawTraverse, drawSites, drawPlayer, drawRoute, loadMapImage, toScreen, toWorld } from './mapDraw';
import RoutePanel from './RoutePanel';

const LAYERS = [
  { id: 'surface', label: 'Surface', src: '/terrain/jezero-surface.jpg' },
  { id: 'elevation', label: 'Elevation preview', src: '/maps/jezero-dem-preview.jpg' },
];

export default function FullMap({ hf }) {
  const canvasRef = useRef();
  const wrapRef = useRef();
  const view = useRef({ cx: 0, cz: 0, scale: 0.12 });
  const drag = useRef(null);
  const dirty = useRef(true);
  const [layer, setLayer] = useState('surface');
  const [images, setImages] = useState({});
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null); // { type: 'site', id } | { type: 'point', x, z }
  const [closing, setClosing] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const route = useGame((g) => g.route);
  const player = useGame((g) => g.player);
  const targetSiteId = useMemo(() => {
    const o = nextObjective(MISSIONS[missionIndex], done);
    return o ? WORLD.itemById[o.target].siteId : null;
  }, [missionIndex, done]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => useGame.getState().closeMap(), 280);
  }, []);

  useEffect(() => {
    LAYERS.forEach((l) => loadMapImage(l.src).then((img) => { setImages((m) => ({ ...m, [l.id]: img })); dirty.current = true; }).catch(() => {}));
    const p = useGame.getState().player;
    view.current.cx = p.x; view.current.cz = p.z;
  }, []);

  // draw loop: only repaints when something changed
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    let raf, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      w = wrap.clientWidth; h = wrap.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      dirty.current = true;
    }
    resize();
    window.addEventListener('resize', resize);
    function frame() {
      raf = requestAnimationFrame(frame);
      if (!dirty.current) return;
      dirty.current = false;
      const g = useGame.getState();
      const v = view.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBase(ctx, images[layer], hf, v, w, h);
      if (layer === 'surface') { ctx.fillStyle = 'rgba(17,15,14,0.18)'; ctx.fillRect(0, 0, w, h); }
      drawTraverse(ctx, v, w, h, 1.8);
      drawRoute(ctx, v, w, h, g.route);
      drawSites(ctx, v, w, h, { missionIndex: g.missionIndex, targetSiteId, size: 5, selectedId: selected && selected.type === 'site' ? selected.id : null, showUncertainty: true, labels: v.scale > 0.09 });
      if (selected && selected.type === 'point') {
        const [x, y] = toScreen(v, w, h, selected.x, selected.z);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
      }
      drawPlayer(ctx, v, w, h, g.player, 9);
      // scale bar
      const target = 140 / v.scale;
      const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      const bw = nice * v.scale, bx = 24, by = h - 28;
      ctx.strokeStyle = '#f6ead9'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by - 4); ctx.stroke();
      ctx.fillStyle = '#f6ead9'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(nice >= 1000 ? `${nice / 1000} km` : `${nice} m`, bx + 4, by - 6);
    }
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [hf, images, layer, selected, targetSiteId]);

  useEffect(() => { dirty.current = true; }, [route, missionIndex, player]);

  function eventPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top, w: r.width, h: r.height };
  }
  function zoomAt(sx, sy, w, h, factor) {
    const v = view.current;
    const before = toWorld(v, w, h, sx, sy);
    v.scale = Math.min(3, Math.max(0.006, v.scale * factor));
    const after = toWorld(v, w, h, sx, sy);
    v.cx += before.x - after.x; v.cz += before.z - after.z;
    dirty.current = true;
  }
  function onWheel(e) {
    const p = eventPos(e);
    zoomAt(p.sx, p.sy, p.w, p.h, Math.exp(-e.deltaY * 0.0015));
  }
  function onPointerDown(e) {
    const p = eventPos(e);
    drag.current = { ...p, cx: view.current.cx, cz: view.current.cz, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const p = eventPos(e);
    const d = drag.current;
    if (d) {
      if (Math.hypot(p.sx - d.sx, p.sy - d.sy) > 4) d.moved = true;
      view.current.cx = d.cx - (p.sx - d.sx) / view.current.scale;
      view.current.cz = d.cz - (p.sy - d.sy) / view.current.scale;
      dirty.current = true;
    }
    const wpt = toWorld(view.current, p.w, p.h, p.sx, p.sy);
    if (hf.inBounds(wpt.x, wpt.z)) {
      const geo = worldToGeo(wpt.x, wpt.z);
      setHover({ ...geo, elev: hf.elevation(wpt.x, wpt.z), slope: hf.slopeDeg(wpt.x, wpt.z) });
    } else setHover(null);
  }
  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const p = eventPos(e);
    const v = view.current;
    let hit = null, hd = 13;
    for (const s of WORLD.sites) {
      const [x, y] = toScreen(v, p.w, p.h, s.x, s.z);
      const dist = Math.hypot(x - p.sx, y - p.sy);
      if (dist < hd) { hd = dist; hit = s; }
    }
    if (hit) setSelected({ type: 'site', id: hit.id });
    else {
      const wpt = toWorld(v, p.w, p.h, p.sx, p.sy);
      setSelected(hf.inBounds(wpt.x, wpt.z, 200) ? { type: 'point', x: wpt.x, z: wpt.z } : null);
    }
  }
  function recenter() {
    const p = useGame.getState().player;
    view.current.cx = p.x; view.current.cz = p.z; dirty.current = true;
  }
  function planRoute(to, name) {
    const p = useGame.getState().player;
    const from = { x: p.x, z: p.z };
    useGame.getState().setRoute({ from, to, name, analysis: analyseRoute(hf, from, to) });
  }

  const site = selected && selected.type === 'site' ? WORLD.siteById[selected.id] : null;
  const point = selected && selected.type === 'point' ? selected : null;
  const unlocked = site ? siteUnlocked(site, missionIndex) : false;
  const mission = site ? MISSIONS[site.missionIndex] : null;

  return (
    <div className={`absolute inset-0 z-30 bg-coal-950 ${closing ? 'map-out' : 'map-in'}`}>
      <div ref={wrapRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="cursor-grab touch-none active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHover(null)}
        />
      </div>

      {/* title + layer switch */}
      <div className="pointer-events-none absolute left-6 top-5">
        <div className="text-[10px] uppercase tracking-hud text-mars-300">Mission map · north up</div>
        <div className="text-xl font-light text-mars-50">Jezero Crater</div>
        <div className="pointer-events-auto mt-3 flex items-center gap-1">
          <Layers size={13} className="mr-1 text-mars-200/70" />
          {LAYERS.map((l) => (
            <button key={l.id} type="button" onClick={() => { setLayer(l.id); dirty.current = true; }} className={`btn !py-1 !text-[10px] ${layer === l.id ? 'border-mars-400 bg-mars-500/30' : ''}`}>
              {l.label}
            </button>
          ))}
          <button type="button" onClick={() => setShowArchive((v) => !v)} className={`btn !py-1 !text-[10px] ${showArchive ? 'border-mars-400 bg-mars-500/30' : ''}`}>
            Unplaced images ({WORLD.unplaced.length})
          </button>
        </div>
        {layer === 'elevation' && (
          <div className="mt-2 max-w-xs text-[10px] leading-snug text-mars-100/70">
            The supplied colour-shaded DEM preview. It has no legend; blues and greens are low, reds and white are high.
          </div>
        )}
      </div>

      {/* close + zoom */}
      <button type="button" onClick={close} aria-label="Close map" className="icon-btn absolute right-6 top-5 h-10 w-10"><X size={18} /></button>
      <div className="absolute right-6 top-20 flex flex-col gap-2">
        <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => { const r = canvasRef.current.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, r.width, r.height, 1.5); }}><Plus size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => { const r = canvasRef.current.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, r.width, r.height, 1 / 1.5); }}><Minus size={15} /></button>
        <button type="button" className="icon-btn" aria-label="Centre on me" onClick={recenter}><LocateFixed size={15} /></button>
      </div>

      {/* legend + cursor readout */}
      <div className="panel pointer-events-none absolute bottom-12 left-6 px-3 py-2 text-[10px] leading-relaxed text-mars-100/80">
        <div><span className="mr-2 inline-block h-0.5 w-5 bg-[#f1dfc4] align-middle" />Rover traverse ({WORLD.traverseMeta.resolution} official waypoints)</div>
        <div><span className="mr-2 inline-block h-0.5 w-5 border-t border-dashed border-ice-300 align-middle" />Proposed route (simulated)</div>
        <div><span className="mr-2 inline-block h-2 w-2 rounded-full border border-[#e08a4f] align-middle" />Panorama station <span className="ml-2 mr-1 inline-block h-2 w-2 rotate-45 border border-[#e08a4f] align-middle" /> Science feature</div>
        <div><span className="mr-2 inline-block h-2 w-2 rounded-full border border-[#a9c7dc] align-middle" />Next objective <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-full border border-[#7a6f68] align-middle" /> Locked</div>
        <div className="text-mars-200/60">Dashed circles: position uncertainty of a station</div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-6 font-mono text-[11px] text-mars-100/80">
        {hover ? `${formatLat(hover.lat)}  ${formatLon(hover.lon)}  elev ≈${Math.round(hover.elev)} m  slope ${hover.slope.toFixed(1)}°` : 'Drag to pan · scroll to zoom · click a marker or the ground'}
      </div>

      {/* archive of images with no established position */}
      {showArchive && (
        <div className="panel thin-scroll absolute left-6 top-36 max-h-[50vh] w-72 overflow-y-auto p-3">
          <div className="mb-2 text-[11px] leading-snug text-mars-100/70">No acquisition sol could be established for these files, so they are not placed on the map.</div>
          {WORLD.unplaced.map((p) => (
            <button key={p.id} type="button" onClick={() => useGame.getState().openPanorama(p.id)} className="mb-2 block w-full overflow-hidden rounded border border-mars-200/15 text-left transition hover:border-mars-400">
              <div className="h-14 w-full bg-cover bg-center" style={{ backgroundImage: `url(${p.thumb})` }} />
              <div className="px-2 py-1 text-[11px] text-mars-50">{p.name}</div>
            </button>
          ))}
        </div>
      )}

      {/* selection panel */}
      {(site || point) && (
        <aside className="panel thin-scroll absolute bottom-6 right-6 top-56 w-[340px] overflow-y-auto p-4 rise-in">
          {site && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="hud-label">Mission {String(mission.sequence).padStart(2, '0')} · {mission.title}</div>
                  <div className="mt-1 text-base leading-snug text-mars-50">{site.name}</div>
                </div>
                {!unlocked && <span className="chip border-mars-200/30 text-mars-200/70">Locked</span>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                <div><div className="hud-label">Latitude</div><div className="hud-value">{formatLat(site.lat)}</div></div>
                <div><div className="hud-label">Longitude</div><div className="hud-value">{formatLon(site.lon)}</div></div>
                <div><div className="hud-label">Rover elevation</div><div className="hud-value">{site.roverElev.toFixed(1)} m</div></div>
                <div><div className="hud-label">Terrain model</div><div className="hud-value">≈{Math.round(hf.elevation(site.x, site.z))} m</div></div>
                <div><div className="hud-label">Position</div><div className="hud-value">{site.confidence}{site.uncertaintyM >= 1 ? ` ±${Math.round(site.uncertaintyM)} m` : ''}</div></div>
                <div><div className="hud-label">Rover odometer</div><div className="hud-value">≥{(odometerAtSol(WORLD.track, site.firstSol) / 1000).toFixed(1)} km</div></div>
              </div>
              <div className="mt-2 text-[10px] leading-snug text-mars-200/60">
                Position = official rover waypoint at sol {site.items[0].waypointSol}. Odometer is summed over bundled waypoints, so it is a lower bound.
              </div>
              <ul className="mt-3 space-y-1.5">
                {site.items.map((it) => (
                  <li key={it.id} className="flex items-start gap-2 text-xs text-mars-100/90">
                    {it.kind === 'panorama' ? <Camera size={13} className="mt-0.5 shrink-0 text-mars-300" /> : <span className="mt-1 h-2 w-2 shrink-0 rotate-45 border border-mars-300" />}
                    <span>
                      {it.name}
                      {it.kind === 'object' && unlocked && <span className="mt-0.5 block text-[11px] leading-snug text-mars-100/60">{it.ref.summary}</span>}
                      {it.kind === 'panorama' && <span className="block font-mono text-[10px] text-mars-200/50">sols {PANORAMA_BY_ID[it.id].sols.join('–')}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={() => planRoute({ x: site.x, z: site.z }, site.name)}><Navigation size={12} /> Plan route</button>
                <button type="button" className="btn-primary" disabled={!unlocked} onClick={() => useGame.getState().teleport({ x: site.x, z: site.z + 9, heading: 0 })}>Teleport</button>
              </div>
              <div className="mt-2 text-[10px] leading-snug text-mars-200/60">
                {unlocked ? 'Teleport is a checkpoint jump, not a physical route. Mission objectives are credited on site, not from the map.' : `Complete Mission ${String(MISSIONS[missionIndex].sequence).padStart(2, '0')} to unlock travel here.`}
              </div>
            </>
          )}
          {point && (() => {
            const geo = worldToGeo(point.x, point.z);
            return (
              <>
                <div className="hud-label">Terrain inspector</div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <div><div className="hud-label">Latitude</div><div className="hud-value">{formatLat(geo.lat)}</div></div>
                  <div><div className="hud-label">Longitude</div><div className="hud-value">{formatLon(geo.lon)}</div></div>
                  <div><div className="hud-label">Elevation</div><div className="hud-value">≈{Math.round(hf.elevation(point.x, point.z))} m</div></div>
                  <div><div className="hud-label">Slope</div><div className="hud-value">{hf.slopeDeg(point.x, point.z).toFixed(1)}°</div></div>
                </div>
                <div className="mt-4"><button type="button" className="btn" onClick={() => planRoute({ x: point.x, z: point.z }, 'the selected point')}><Navigation size={12} /> Plan route here</button></div>
              </>
            );
          })()}
          {route && <RoutePanel route={route} calibrated={hf.meta.calibrated} onClear={() => useGame.getState().setRoute(null)} />}
        </aside>
      )}
      {!site && !point && route && (
        <aside className="panel absolute bottom-6 right-6 w-[340px] p-4">
          <RoutePanel route={route} calibrated={hf.meta.calibrated} onClear={() => useGame.getState().setRoute(null)} />
        </aside>
      )}
    </div>
  );
}
