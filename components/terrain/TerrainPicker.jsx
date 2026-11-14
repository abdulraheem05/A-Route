'use client';
// Pointer -> geographic coordinate. Intersects the view ray with the elevation
// data itself (not the mesh), so readouts do not depend on mesh density.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { elevToY, inBounds, xzToLonLat } from '@/lib/coordinates/projection';
import { useCrater } from '@/lib/mars/CraterContext';
import { heightProvider } from '@/lib/terrain/heightProvider';
import { raymarch } from '@/lib/terrain/raymarch';
import { nearestWaypoint } from '@/lib/data/roverAdapter';
import { useStore } from '@/store/useStore';

export default function TerrainPicker() {
  const { gl, camera } = useThree();
  const bounds = useCrater().bounds;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2());
  const dirty = useRef(false);
  const down = useRef(null);

  const pickAt = useCallback(
    (x, y) => {
      const exag = useStore.getState().exaggeration;
      const hasData = heightProvider.hasData();
      const heightAt = (sx, sz) => {
        const [lon, lat] = xzToLonLat(sx, sz);
        if (!inBounds(bounds, lon, lat)) return NaN;
        if (!hasData) return 0; // flat reference surface
        const h = heightProvider.height(lon, lat);
        return Number.isNaN(h) ? NaN : elevToY(h, exag);
      };
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = raymarch(raycaster.ray.origin, raycaster.ray.direction, heightAt);
      if (!hit) return null;
      const [lon, lat] = xzToLonLat(hit.x, hit.z);
      const sample = heightProvider.sample(lon, lat);
      return {
        lon,
        lat,
        elev: sample ? sample.h : null,
        datasetId: sample ? sample.datasetId : null,
        resM: sample ? sample.resM : null,
      };
    },
    [camera, raycaster, bounds]
  );

  useEffect(() => {
    const el = gl.domElement;
    const toNdc = (e) => {
      const r = el.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1];
    };
    const onMove = (e) => {
      const [x, y] = toNdc(e);
      ndc.current.set(x, y);
      dirty.current = true;
    };
    const onLeave = () => {
      dirty.current = false;
      useStore.setState({ cursor: null });
    };
    const onDown = (e) => {
      down.current = { x: e.clientX, y: e.clientY, button: e.button };
    };
    const onUp = (e) => {
      const d = down.current;
      down.current = null;
      if (!d || d.button !== 0) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return; // it was a drag
      const [x, y] = toNdc(e);
      const p = pickAt(x, y);
      if (!p) return;
      const s = useStore.getState();
      // Measure & Plan has armed one end of a route: this click sets it.
      if (s.plan.picking) {
        s.setPlanPoint(s.plan.picking, {
          lon: p.lon,
          lat: p.lat,
          elev: p.elev,
          datasetId: p.datasetId,
          label: null,
          kind: 'terrain',
        });
        return;
      }
      const wps = s.rover.waypoints;
      if (s.show.waypoints && wps.length) {
        const near = nearestWaypoint(wps, p.lon, p.lat);
        const threshold = Math.max(15, s.camera.dist * 1000 * 0.012);
        if (near && near.distanceM <= threshold) {
          s.setSol(wps[near.index].sol);
          s.select({ type: 'waypoint', index: near.index });
          return;
        }
      }
      s.select({ type: 'point', lon: p.lon, lat: p.lat });
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [gl, pickAt]);

  useFrame(() => {
    if (!dirty.current) return;
    dirty.current = false;
    useStore.setState({ cursor: pickAt(ndc.current.x, ndc.current.y) });
  });

  return null;
}
