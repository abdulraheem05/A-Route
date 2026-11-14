'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useGame } from '@/lib/store';
import { WORLD, MISSIONS } from '@/lib/scientific-data';
import { getHeightfield } from '@/lib/terrain/heightfield';
import { nextObjective } from '@/lib/missions';
import { drawBase, drawTraverse, drawSites, drawPlayer, drawRoute, loadMapImage } from './mapDraw';

const SIZE = 176;
const RADIUS_M = 2500;

export default function Minimap() {
  const canvasRef = useRef();
  const [img, setImg] = useState(null);
  const openMap = useGame((g) => g.openMap);
  const missionIndex = useGame((g) => g.missionIndex);
  const done = useGame((g) => g.done);
  const targetSiteId = useMemo(() => {
    const o = nextObjective(MISSIONS[missionIndex], done);
    return o ? WORLD.itemById[o.target].siteId : null;
  }, [missionIndex, done]);

  useEffect(() => { loadMapImage('/terrain/jezero-surface.jpg').then(setImg).catch(() => {}); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d');
    const hf = getHeightfield();
    function draw() {
      const g = useGame.getState();
      const view = { cx: g.player.x, cz: g.player.z, scale: SIZE / 2 / RADIUS_M };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2); ctx.clip();
      drawBase(ctx, img, hf, view, SIZE, SIZE);
      ctx.fillStyle = 'rgba(17,15,14,0.28)'; ctx.fillRect(0, 0, SIZE, SIZE);
      if (g.settings.showTraverse) drawTraverse(ctx, view, SIZE, SIZE, 1.2);
      drawRoute(ctx, view, SIZE, SIZE, g.route);
      drawSites(ctx, view, SIZE, SIZE, { missionIndex, targetSiteId, size: 3 });
      // objective pointer on the rim when the target is off the minimap
      if (targetSiteId) {
        const t = WORLD.siteById[targetSiteId];
        const dx = t.x - g.player.x, dz = t.z - g.player.z, d = Math.hypot(dx, dz);
        if (d > RADIUS_M * 0.95) {
          const a = Math.atan2(dz, dx), r = SIZE / 2 - 9;
          ctx.beginPath(); ctx.arc(SIZE / 2 + Math.cos(a) * r, SIZE / 2 + Math.sin(a) * r, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#a9c7dc'; ctx.fill();
        }
      }
      drawPlayer(ctx, view, SIZE, SIZE, g.player, 7);
      ctx.restore();
    }
    draw();
    const id = setInterval(draw, 160);
    return () => clearInterval(id);
  }, [img, missionIndex, targetSiteId]);

  return (
    <div className="pointer-events-auto relative" style={{ width: SIZE, height: SIZE }}>
      <button
        type="button"
        onClick={openMap}
        title="Open map (M)"
        aria-label="Open full map"
        className="block h-full w-full overflow-hidden rounded-full border border-mars-200/30 bg-coal-900/70 shadow-xl shadow-black/50 transition hover:border-mars-300"
      >
        <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-semibold text-mars-50 [text-shadow:0_1px_2px_#000]">N</div>
      <button type="button" onClick={openMap} aria-label="Expand map" className="icon-btn absolute -left-1 -top-1 h-7 w-7">
        <Maximize2 size={12} />
      </button>
      <div className="pointer-events-none absolute -bottom-4 left-0 right-0 text-center font-mono text-[9px] text-mars-200/60">radius 2.5 km</div>
    </div>
  );
}
