'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { lonLatToXZ } from '@/lib/coordinates/projection';
import { useCrater } from '@/lib/mars/CraterContext';
import { useStore } from '@/store/useStore';
import BaseTerrain from '@/components/terrain/BaseTerrain';
import DetailPatch from '@/components/terrain/DetailPatch';
import CameraRig from '@/components/terrain/CameraRig';
import TerrainPicker from '@/components/terrain/TerrainPicker';
import { MeasureLine, SelectionMarker } from '@/components/terrain/Markers';
import Traverse from '@/components/rover/Traverse';
import { RoverMarker, WaypointDots } from '@/components/rover/Waypoints';
import LandmarkMarkers from '@/components/layers/LandmarkMarkers';
import RouteLines from '@/components/layers/RouteLines';

/**
 * Upper bound on render resolution.
 *
 * Desktop keeps the original [1, 2]. A phone or tablet is capped at 1.5,
 * which is the single largest saving available on mobile GPUs: the terrain
 * grid, the elevation data, the imagery tiles and every derived value are
 * untouched — only how many device pixels the same scene is rasterised into
 * changes. Read once, outside the component, because changing `dpr` would
 * otherwise recreate the WebGL context.
 */
function maxDpr() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 2;
  return window.matchMedia('(max-width: 1023px)').matches ? 1.5 : 2;
}

export default function Viewport() {
  const crater = useCrater();
  const dprRange = useMemo(() => [1, maxDpr()], []);
  // Opening view: the whole crater from the configured home target and offset.
  // Gale's values are the originals (137.7°E, 5.0°S; offset -60, 150, +190).
  // Memoised so the Canvas is not handed a new camera descriptor per render.
  const { TX, TZ, cameraProps } = useMemo(() => {
    const [tx, tz] = lonLatToXZ(crater.view.home.lon, crater.view.home.lat);
    const { dx, y, dz } = crater.view.start;
    return {
      TX: tx,
      TZ: tz,
      cameraProps: { fov: 40, near: 1, far: 4000, position: [tx + dx, y, tz + dz] },
    };
  }, [crater]);

  return (
    <Canvas
      flat
      dpr={dprRange}
      camera={cameraProps}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#07080a');
        camera.lookAt(TX, 0, TZ);
        useStore.setState({ rendererReady: true });
      }}
    >
      <CameraRig />
      <BaseTerrain />
      <DetailPatch />
      <Traverse />
      <WaypointDots />
      <RoverMarker />
      <LandmarkMarkers />
      <SelectionMarker />
      <RouteLines />
      <MeasureLine />
      <TerrainPicker />
    </Canvas>
  );
}
