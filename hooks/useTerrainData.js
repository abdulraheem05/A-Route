'use client';
// Terrain loading pipeline. Looks for elevation prepared by
// scripts/prepare_terrain.py under the URLs the crater configuration names.
// If none exists the app runs on a flat reference surface and says so — it
// never substitutes synthetic relief.
//
// The URLs used to be the fixed Gale paths. They now come from
// crater.terrain, whose Gale values are those same paths, so the requests the
// browser makes for Gale are unchanged.
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useCrater } from '@/lib/mars/CraterContext';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { loadHeightLevel } from '@/lib/terrain/heightGrid';
import { RoverTiles } from '@/lib/terrain/roverTiles';

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
  const crater = useCrater();
  const craterUrl = crater.terrain && crater.terrain.craterUrl;
  const roverUrl = crater.terrain && crater.terrain.roverUrl;
  const maxRenderVerts = (crater.terrain && crater.terrain.maxRenderVerts) || 1.7e6;

  useEffect(() => {
    let dead = false;
    const { setTerrain, bumpTerrain } = useStore.getState();
    // A different crater's grids must never answer a query about this one.
    heightProvider.reset();

    (async () => {
      // No prepared crater grid is configured at all: flat reference surface.
      if (!craterUrl) {
        setTerrain({ status: 'missing', meta: null, roverMeta: null });
        bumpTerrain();
        return;
      }

      // Rover-region tiles (optional).
      if (roverUrl) {
        const roverMeta = await fetchJson(`${roverUrl}/meta.json`);
        if (dead) return;
        if (roverMeta && Array.isArray(roverMeta.levels) && roverMeta.levels.length) {
          heightProvider.setRover(new RoverTiles(roverMeta, roverUrl));
          setTerrain({ roverMeta });
        }
      }

      // Crater-wide grid.
      const meta = await fetchJson(`${craterUrl}/meta.json`);
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
        const render = levels.find((l) => l.width * l.height <= maxRenderVerts) || coarse;

        // Progressive: coarse overview first, then the render and sampling levels.
        const gCoarse = await loadHeightLevel(craterUrl, meta, coarse);
        if (dead) return;
        heightProvider.setCrater({ sample: gCoarse, render: gCoarse, meta });
        setTerrain({ status: 'ready', meta });
        bumpTerrain();

        const gRender = render === coarse ? gCoarse : await loadHeightLevel(craterUrl, meta, render);
        if (dead) return;
        const gFine = fine === render ? gRender : await loadHeightLevel(craterUrl, meta, fine);
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
  }, [craterUrl, roverUrl, maxRenderVerts]);
}
