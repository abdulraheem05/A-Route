// Shared 2D map drawing for the minimap and the fullscreen map.
// A "view" is { cx, cz, scale } = world point at the canvas centre and pixels per metre. North is up.
import { WORLD } from '@/lib/scientific-data';

export const MAP_COLORS = { traverse: '#f1dfc4', current: '#e08a4f', past: '#d9c3a3', locked: '#7a6f68', target: '#a9c7dc', player: '#ffffff', route: '#a9c7dc' };

export function toScreen(view, w, h, x, z) {
  return [(x - view.cx) * view.scale + w / 2, (z - view.cz) * view.scale + h / 2];
}
export function toWorld(view, w, h, sx, sy) {
  return { x: (sx - w / 2) / view.scale + view.cx, z: (sy - h / 2) / view.scale + view.cz };
}

export function drawBase(ctx, img, hf, view, w, h) {
  ctx.fillStyle = '#14100e';
  ctx.fillRect(0, 0, w, h);
  if (!img) return;
  const b = hf.texBounds; // both map images share the surface image's extent
  const a = toWorld(view, w, h, 0, 0), c = toWorld(view, w, h, w, h);
  const x0 = Math.max(a.x, b.xMin), x1 = Math.min(c.x, b.xMax), z0 = Math.max(a.z, b.zMin), z1 = Math.min(c.z, b.zMax);
  if (x1 <= x0 || z1 <= z0) return;
  const sx = ((x0 - b.xMin) / (b.xMax - b.xMin)) * img.width, sw = ((x1 - x0) / (b.xMax - b.xMin)) * img.width;
  const sy = ((z0 - b.zMin) / (b.zMax - b.zMin)) * img.height, sh = ((z1 - z0) / (b.zMax - b.zMin)) * img.height;
  const [dx, dy] = toScreen(view, w, h, x0, z0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, (x1 - x0) * view.scale, (z1 - z0) * view.scale);
}

export function drawTraverse(ctx, view, w, h, width = 1.5) {
  ctx.beginPath();
  WORLD.track.forEach((p, i) => {
    const [x, y] = toScreen(view, w, h, p.x, p.z);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = MAP_COLORS.traverse;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function siteState(site, missionIndex, targetSiteId) {
  if (site.id === targetSiteId) return 'target';
  if (site.missionIndex > missionIndex) return 'locked';
  return site.missionIndex === missionIndex ? 'current' : 'past';
}

export function drawSites(ctx, view, w, h, { missionIndex, targetSiteId, size = 4, selectedId = null, showUncertainty = false, labels = false }) {
  for (const s of WORLD.sites) {
    const [x, y] = toScreen(view, w, h, s.x, s.z);
    if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
    const state = siteState(s, missionIndex, targetSiteId);
    const col = MAP_COLORS[state];
    if (showUncertainty && s.uncertaintyM * view.scale > size + 3) {
      ctx.beginPath();
      ctx.arc(x, y, s.uncertaintyM * view.scale, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#14100e';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (s.hasPanorama) ctx.arc(x, y, size, 0, Math.PI * 2); // circle = panorama station
    else { ctx.moveTo(x, y - size - 1); ctx.lineTo(x + size + 1, y); ctx.lineTo(x, y + size + 1); ctx.lineTo(x - size - 1, y); ctx.closePath(); } // diamond = science feature only
    ctx.fill(); ctx.stroke();
    if (s.hasPanorama && s.hasObject) { ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, size - 2.6), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
    if (s.id === selectedId) { ctx.beginPath(); ctx.arc(x, y, size + 5, 0, Math.PI * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke(); }
    if (labels) {
      ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      const name = s.name.length > 30 ? s.name.slice(0, 28) + '…' : s.name;
      ctx.fillText(name, x + size + 6, y + 4);
      ctx.fillStyle = state === 'locked' ? '#a79c93' : '#f6ead9';
      ctx.fillText(name, x + size + 5, y + 3);
    }
  }
}

export function drawPlayer(ctx, view, w, h, player, size = 7) {
  const [x, y] = toScreen(view, w, h, player.x, player.z);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((player.heading * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -size); ctx.lineTo(size * 0.65, size * 0.75); ctx.lineTo(0, size * 0.35); ctx.lineTo(-size * 0.65, size * 0.75); ctx.closePath();
  ctx.fillStyle = MAP_COLORS.player; ctx.strokeStyle = '#14100e'; ctx.lineWidth = 1.2;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function drawRoute(ctx, view, w, h, route) {
  if (!route) return;
  const [x0, y0] = toScreen(view, w, h, route.from.x, route.from.z);
  const [x1, y1] = toScreen(view, w, h, route.to.x, route.to.z);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.setLineDash([6, 4]); ctx.strokeStyle = MAP_COLORS.route; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
}

const imageCache = {};
export function loadMapImage(src) {
  if (!imageCache[src]) {
    imageCache[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  return imageCache[src];
}
