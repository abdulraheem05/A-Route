'use client';
// Terrain loading pipeline. Looks for elevation prepared by
// scripts/prepare_terrain.py under /public/data/terrain. If none exists the
// app runs on a flat reference surface and says so — it never substitutes
// synthetic relief.
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { loadHeightLevel } from '@/lib/terrain/heightGrid';
import { RoverTiles } from '@/lib/terrain/roverTiles';

const CRATER_URL = '/data/terrain/crater';
const ROVER_URL = '/data/terrain/rover';
const MAX_RENDER_VERTS = 1.7e6;

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export function useTerrainData() {
  useEffect(() => {
    let dead = false;
    const { setTerrain, bumpTerrain } = useStore.getState();

    (async () => {
      // Rover-region tiles (optional).
      const roverMeta = await fetchJson(`${ROVER_URL}/meta.json`);
      if (dead) return;
      if (roverMeta && Array.isArray(roverMeta.levels) && roverMeta.levels.length) {
        heightProvider.setRover(new RoverTiles(roverMeta, ROVER_URL));
        setTerrain({ roverMeta });
      }

      // Crater-wide grid.
      const meta = await fetchJson(`${CRATER_URL}/meta.json`);
      if (dead) return;
      if (!meta || !Array.isArray(meta.levels) || !meta.levels.length) {
        setTerrain({ status: 'missing', meta: null });
        bumpTerrain();
        return;
      }
      try {
        const levels = meta.levels; // finest first
        const coarse = levels[levels.length - 1];
        const fine = levels[0];
        const render = levels.find((l) => l.width * l.height <= MAX_RENDER_VERTS) || coarse;

        // Progressive: coarse overview first, then the render and sampling levels.
        const gCoarse = await loadHeightLevel(CRATER_URL, meta, coarse);
        if (dead) return;
        heightProvider.setCrater({ sample: gCoarse, render: gCoarse, meta });
        setTerrain({ status: 'ready', meta });
        bumpTerrain();

        const gRender = render === coarse ? gCoarse : await loadHeightLevel(CRATER_URL, meta, render);
        if (dead) return;
        const gFine = fine === render ? gRender : await loadHeightLevel(CRATER_URL, meta, fine);
        if (dead) return;
        heightProvider.setCrater({ sample: gFine, render: gRender, meta });
        bumpTerrain();
      } catch (err) {
        setTerrain({ status: 'error', error: err.message });
        bumpTerrain();
      }
    })();

    return () => {
      dead = true;
    };
  }, []);
}
