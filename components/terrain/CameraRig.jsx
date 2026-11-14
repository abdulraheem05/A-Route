'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { GALE } from '@/lib/mars/constants';
import { lonLatToXZ, xzToLonLat } from '@/lib/coordinates/projection';
import { cameraApi, MAX_DIST, MIN_DIST } from '@/lib/terrain/cameraApi';
import { useStore } from '@/store/useStore';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const [TX, TZ] = lonLatToXZ(137.7, -5.0);
const START_TARGET = [TX, 0, TZ];

export default function CameraRig() {
  const ref = useRef();
  const { camera } = useThree();
  const lastPublish = useRef(0);

  useEffect(() => {
    cameraApi.camera = camera;
    cameraApi.getExaggeration = () => useStore.getState().exaggeration;
    return () => {
      cameraApi.camera = null;
      cameraApi.controls = null;
      cameraApi.flight = null;
    };
  }, [camera]);

  useFrame((state, dt) => {
    const controls = ref.current;
    if (!controls) return;
    cameraApi.controls = controls;

    // Scripted camera moves (fly-to, zoom buttons).
    const f = cameraApi.flight;
    if (f) {
      f.t = Math.min(1, f.t + dt / (f.fast ? 0.35 : 1.4));
      const k = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
      controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
      const d = Math.exp(Math.log(f.fromDist) + (Math.log(f.toDist) - Math.log(f.fromDist)) * k);
      camera.position.copy(controls.target).addScaledVector(f.dir, d);
      if (f.t >= 1) cameraApi.flight = null;
    }

    // Keep the orbit target inside the data region and on the surface.
    let [lon, lat] = xzToLonLat(controls.target.x, controls.target.z);
    const cl = clamp(lon, GALE.west, GALE.east);
    const ct = clamp(lat, GALE.south, GALE.north);
    if (cl !== lon || ct !== lat) {
      const [x, z] = lonLatToXZ(cl, ct);
      const dx = x - controls.target.x;
      const dz = z - controls.target.z;
      controls.target.x += dx;
      controls.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
      lon = cl;
      lat = ct;
    }
    if (!cameraApi.flight) {
      const y = cameraApi.surfaceY(lon, lat);
      const dy = (y - controls.target.y) * Math.min(1, dt * 4);
      if (Math.abs(dy) > 1e-6) {
        controls.target.y += dy;
        camera.position.y += dy;
      }
    }
    controls.update();

    const dist = camera.position.distanceTo(controls.target);
    camera.near = Math.max(0.002, dist * 0.01);
    camera.far = Math.max(1500, dist * 10);
    camera.updateProjectionMatrix();

    const now = state.clock.elapsedTime;
    if (now - lastPublish.current > 0.12) {
      lastPublish.current = now;
      const prev = useStore.getState().camera;
      const azimuth = controls.getAzimuthalAngle();
      const polar = controls.getPolarAngle();
      if (
        Math.abs(prev.dist - dist) > dist * 0.002 ||
        Math.abs(prev.azimuth - azimuth) > 0.004 ||
        Math.abs(prev.polar - polar) > 0.004
      ) {
        useStore.setState({ camera: { dist, azimuth, polar } });
      }
    }
  });

  return (
    <MapControls
      ref={ref}
      target={START_TARGET}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning={false}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      maxPolarAngle={1.5}
      zoomSpeed={0.9}
      onStart={() => {
        cameraApi.flight = null;
      }}
    />
  );
}
