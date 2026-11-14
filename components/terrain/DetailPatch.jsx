'use client';
// Level-of-detail window that follows the orbit target when the camera is close.
// It replaces a rectangle of the crater mesh with a denser grid whose heights
// come from the best elevation loaded there (rover-region tiles if prepared,
// else the crater grid) and whose texture is built from higher Trek zoom levels.
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { M_PER_DEG, NODATA } from '@/lib/mars/constants-core';
import { getFrame } from '@/lib/mars/activeCrater';
import { useCrater } from '@/lib/mars/CraterContext';
import { intersectBounds, lonLatToXZ, xzToLonLat } from '@/lib/coordinates/projection';
import { degPerPixel, metersPerPixel } from '@/lib/data/trekAdapter';
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

const N = 257; // vertices per side

function disposePatch(p) {
  if (!p) return;
  p.geometry.dispose();
  p.material.dispose();
  if (p.heightTexture) p.heightTexture.dispose();
  if (p.imageTexture) p.imageTexture.dispose();
}

export default function DetailPatch() {
  const { gl } = useThree();
  const crater = useCrater();
  const bounds0 = crater.bounds;
  const imagery = crater.imagery || {};
  const layers = imagery.layers || {};
  const baseLayerKey = imagery.baseLayerKey || 'ctx';
  const baseTrekLayer = layers[baseLayerKey] || null;
  // Zoom at which the base imagery is drawn inside a patch (Gale: CTX at 12).
  const baseZoom = imagery.detailCtxZoom;
  // Optional higher-resolution overlay drawn on top (Gale: HiRISE).
  const overlayLayer = imagery.detailOverlayKey ? layers[imagery.detailOverlayKey] || null : null;
  // Finest first. size in degrees (0.5 deg is about 30 km).
  const LEVELS = crater.detailLevels || [];
  const [patch, setPatch] = useState(null);
  const patchRef = useRef(null);
  const currentKey = useRef(null);
  const buildingKey = useRef(null);
  const token = useRef(0);
  const lastCheck = useRef(0);

  // Dispose the previous patch whenever a new one replaces it, and on unmount.
  useEffect(() => () => disposePatch(patch), [patch]);
  useEffect(
    () => () => {
      token.current++;
      cameraApi.patchHole = null;
      useStore.setState({ patch: null });
    },
    []
  );

  const clear = () => {
    if (currentKey.current === null && buildingKey.current === null) return;
    token.current++;
    currentKey.current = null;
    buildingKey.current = null;
    patchRef.current = null;
    cameraApi.patchHole = null;
    setPatch(null);
    useStore.setState({ patch: null });
  };

  const build = async (key, level, bounds, s) => {
    buildingKey.current = key;
    const my = ++token.current;
    const alive = () => token.current === my;

    // 1. Elevation.
    const rover = heightProvider.rover;
    if (rover) {
      const coarsest = rover.levels.length - 1;
      const li = level.rover === 'fine' ? 0 : coarsest;
      const ok = await rover.ensure(li, bounds);
      if (!ok && li !== coarsest) await rover.ensure(coarsest, bounds);
      if (!alive()) return;
    }
    const material = createTerrainMaterial();
    const u = material.uniforms;
    let heightTexture = null;
    const counts = {};
    if (heightProvider.hasData()) {
      const heights = new Float32Array(N * N);
      const lonStep = (bounds.east - bounds.west) / (N - 1);
      const latStep = (bounds.north - bounds.south) / (N - 1);
      for (let j = 0; j < N; j++) {
        const lat = bounds.north - j * latStep;
        for (let i = 0; i < N; i++) {
          const sm = heightProvider.sample(bounds.west + i * lonStep, lat);
          heights[j * N + i] = sm ? sm.h : NODATA;
          if (sm) counts[sm.datasetId] = (counts[sm.datasetId] || 0) + 1;
        }
      }
      heightTexture = createHeightTexture(heights, N, N);
      u.uHeight.value = heightTexture;
      u.uGrid.value.set(N, N);
      u.uTexel.value.set(lonStep * M_PER_DEG * getFrame().cos0, latStep * M_PER_DEG);
      u.uHasHeight.value = 1;
    }

    // 2. Imagery: CTX underneath, HiRISE on top where it exists.
    let imageTexture = null;
    let imageryLabel = 'none';
    let zoomUsed = null;
    let magnified = false;
    if (s.baseLayer === baseLayerKey && baseTrekLayer) {
      const useOverlay = !!(
        s.hirise &&
        overlayLayer &&
        level.overlayZoom &&
        intersectBounds(bounds, overlayLayer.bounds)
      );
      const targetZoom = useOverlay ? level.overlayZoom : baseZoom;
      const maxSize = Math.min(3072, gl.capabilities.maxTextureSize);
      const canvas = createCanvas(bounds, 1 / degPerPixel(targetZoom), maxSize);
      imageTexture = createImageryTexture(canvas, gl.capabilities.getMaxAnisotropy());
      u.uImagery.value = imageTexture;
      u.uHasImagery.value = 1;
      await drawTrekTiles(canvas, bounds, baseTrekLayer, baseZoom, { isCancelled: () => !alive() });
      if (!alive()) {
        disposePatch({ geometry: { dispose() {} }, material, heightTexture, imageTexture });
        return;
      }
      imageTexture.needsUpdate = true;
      imageryLabel = useOverlay ? `${overlayLayer.shortLabel || 'HiRISE'} over ${baseTrekLayer.shortLabel || 'CTX'}` : baseTrekLayer.shortLabel || 'CTX';
      zoomUsed = targetZoom;
      // The base imagery is being shown larger than it is served when the
      // patch is small.
      const patchMetersPerPx = ((bounds.north - bounds.south) * M_PER_DEG) / canvas.height;
      magnified = !useOverlay && patchMetersPerPx < metersPerPixel(baseZoom) * 0.6;
      if (useOverlay) {
        const tex = imageTexture;
        drawTrekTiles(canvas, bounds, overlayLayer, level.overlayZoom, {
          isCancelled: () => !alive(),
          onBatch: () => {
            tex.needsUpdate = true;
          },
        });
      }
    }

    // 3. Swap in.
    const geometry = buildGridGeometry({ bounds, nx: N, ny: N, uvBounds: bounds, skirt: true });
    const [x0, z0] = lonLatToXZ(bounds.west, bounds.north);
    const [x1, z1] = lonLatToXZ(bounds.east, bounds.south);
    const next = { key, geometry, material, heightTexture, imageTexture, hole: { x0, z0, x1, z1 } };
    patchRef.current = next;
    currentKey.current = key;
    buildingKey.current = null;
    cameraApi.patchHole = next.hole;
    setPatch(next);
    const sources = Object.keys(counts);
    useStore.setState({
      patch: {
        level: level.name,
        sizeKm: (level.size * M_PER_DEG) / 1000,
        imagery: imageryLabel,
        zoom: zoomUsed,
        magnified,
        heightSource: sources.length ? sources.join(' + ') : null,
        spacingM: ((bounds.north - bounds.south) / (N - 1)) * M_PER_DEG,
      },
    });
  };

  useFrame((state) => {
    const s = useStore.getState();
    const p = patchRef.current;
    if (p) {
      const meta = s.terrain.meta;
      applyLayerUniforms(p.material, s, meta ? [meta.min, meta.max] : null);
      p.material.uniforms.uSkirt.value = 0.3 * Math.max(1, s.exaggeration);
    }

    const now = state.clock.elapsedTime;
    if (now - lastCheck.current < 0.25) return;
    lastCheck.current = now;
    const controls = cameraApi.controls;
    if (!controls) return;

    const dist = cameraApi.distance();
    const level = LEVELS.find((l) => dist <= l.maxDist);
    if (!level) {
      clear();
      return;
    }
    const [lon, lat] = xzToLonLat(controls.target.x, controls.target.z);
    const grid = level.size / 4;
    const lonC = Math.round(lon / grid) * grid;
    const latC = Math.round(lat / grid) * grid;
    const bounds = intersectBounds(
      {
        west: lonC - level.size / 2,
        east: lonC + level.size / 2,
        south: latC - level.size / 2,
        north: latC + level.size / 2,
      },
      bounds0
    );
    if (!bounds) {
      clear();
      return;
    }
    const key = [level.name, lonC.toFixed(5), latC.toFixed(5), s.baseLayer, s.hirise, s.terrainVersion].join('|');
    if (key !== currentKey.current && key !== buildingKey.current) build(key, level, bounds, s);
  });

  if (!patch) return null;
  return <mesh geometry={patch.geometry} material={patch.material} frustumCulled={false} />;
}
