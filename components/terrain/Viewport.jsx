'use client';
import { Canvas } from '@react-three/fiber';
import { lonLatToXZ } from '@/lib/coordinates/projection';
import BaseTerrain from '@/components/terrain/BaseTerrain';
import DetailPatch from '@/components/terrain/DetailPatch';
import CameraRig from '@/components/terrain/CameraRig';
import TerrainPicker from '@/components/terrain/TerrainPicker';
import { MeasureLine, SelectionMarker } from '@/components/terrain/Markers';
import Traverse from '@/components/rover/Traverse';
import { RoverMarker, WaypointDots } from '@/components/rover/Waypoints';
import LandmarkMarkers from '@/components/layers/LandmarkMarkers';

// Opening view: the whole crater, looking north-east across Aeolis Mons.
const [TX, TZ] = lonLatToXZ(137.7, -5.0);
const START = [TX - 60, 150, TZ + 190];

export default function Viewport() {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ fov: 40, near: 1, far: 4000, position: START }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#07080a');
        camera.lookAt(TX, 0, TZ);
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
      <MeasureLine />
      <TerrainPicker />
    </Canvas>
  );
}
