'use client';
// Crater-wide surface. Elevation comes from the prepared crater grid (D02/D03);
// if none has been prepared this is a flat reference plane carrying the real
// imagery, and the interface says so.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GALE } from '@/lib/mars/constants';
import { TREK_LAYERS, degPerPixel } from '@/lib/data/trekAdapter';
import { buildGridGeometry } from '@/lib/terrain/gridGeometry';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { createCanvas, drawTrekTiles } from '@/lib/terrain/imagery';
import {
  applyLayerUniforms,
  createHeightTexture,
  createImageryTexture,
  createTerrainMaterial,
} from '@/lib/terrain/terrainMaterial';
import { cameraApi } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

const BASE_ZOOM = 9; // about 81 m/px over the whole region; closer views use the detail patch

export default function BaseTerrain() {
  const terrainVersion = useStore((s) => s.terrainVersion);
  const baseLayer = useStore((s) => s.baseLayer);
  const { gl } = useThree();
  const material = useMemo(() => createTerrainMaterial(), []);

  const geometry = useMemo(() => {
    const g = heightProvider.craterRender;
    if (!g) return buildGridGeometry({ bounds: GALE, nx: 2, ny: 2, uvBounds: GALE });
    return buildGridGeometry({ bounds: g.centreBounds(), nx: g.width, ny: g.height, uvBounds: GALE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainVersion]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  // Elevation texture.
  useEffect(() => {
    const g = heightProvider.craterRender;
    const u = material.uniforms;
    if (!g) {
      u.uHasHeight.value = 0;
      return undefined;
    }
    const tex = createHeightTexture(g.data, g.width, g.height);
    u.uHeight.value = tex;
    u.uGrid.value.set(g.width, g.height);
    u.uTexel.value.set(g.texelMetersX, g.texelMetersY);
    u.uHasHeight.value = 1;
    return () => tex.dispose();
  }, [terrainVersion, material]);

  // Imagery: coarse pass first, then the full base zoom, refreshed as tiles arrive.
  useEffect(() => {
    const u = material.uniforms;
    if (baseLayer !== 'ctx') {
      u.uHasImagery.value = 0;
      useStore.setState({ imagery: { requested: 0, drawn: 0, done: true } });
      return undefined;
    }
    let cancelled = false;
    const maxSize = Math.min(4096, gl.capabilities.maxTextureSize);
    const canvas = createCanvas(GALE, 1 / degPerPixel(BASE_ZOOM), maxSize);
    const tex = createImageryTexture(canvas, gl.capabilities.getMaxAnisotropy());
    u.uImagery.value = tex;
    u.uHasImagery.value = 1;
    let lastUpload = 0;
    const onBatch = (stats) => {
      const now = performance.now();
      if (now - lastUpload > 450) {
        tex.needsUpdate = true;
        lastUpload = now;
      }
      useStore.setState({ imagery: { requested: stats.requested, drawn: stats.drawn, done: false } });
    };
    const isCancelled = () => cancelled;
    (async () => {
      await drawTrekTiles(canvas, GALE, TREK_LAYERS.ctx, 7, { isCancelled, onBatch });
      if (cancelled) return;
      tex.needsUpdate = true;
      const stats = await drawTrekTiles(canvas, GALE, TREK_LAYERS.ctx, BASE_ZOOM, { isCancelled, onBatch });
      if (cancelled) return;
      tex.needsUpdate = true;
      useStore.setState({ imagery: { requested: stats.requested, drawn: stats.drawn, done: true } });
    })();
    return () => {
      cancelled = true;
      u.uHasImagery.value = 0;
      tex.dispose();
    };
  }, [baseLayer, material, gl]);

  useFrame(() => {
    const s = useStore.getState();
    const meta = s.terrain.meta;
    applyLayerUniforms(material, s, meta ? [meta.min, meta.max] : null);
    const hole = cameraApi.patchHole;
    const u = material.uniforms;
    u.uHoleOn.value = hole ? 1 : 0;
    if (hole) u.uHole.value.set(hole.x0, hole.z0, hole.x1, hole.z1);
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
