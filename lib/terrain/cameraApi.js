// Imperative bridge between the DOM interface and the 3D camera.
// CameraRig registers the live controls; panels call flyTo / zoomBy / etc.
import * as THREE from 'three';
import { lonLatToXZ, elevToY } from '@/lib/coordinates/projection';
import { heightProvider } from '@/lib/terrain/heightProvider';

export const MIN_DIST = 0.12; // km
export const MAX_DIST = 700; // km

export const cameraApi = {
  controls: null,
  camera: null,
  flight: null,
  patchHole: null, // {x0, z0, x1, z1} of the active detail patch, set by DetailPatch
  getExaggeration: () => 1,

  distance() {
    if (!this.controls || !this.camera) return 250;
    return this.camera.position.distanceTo(this.controls.target);
  },

  surfaceY(lon, lat) {
    const h = heightProvider.height(lon, lat);
    return Number.isNaN(h) ? 0 : elevToY(h, this.getExaggeration());
  },

  flyTo(lon, lat, distKm) {
    if (!this.controls || !this.camera) return;
    const [x, z] = lonLatToXZ(lon, lat);
    const fromTarget = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(fromTarget);
    const fromDist = offset.length();
    this.flight = {
      t: 0,
      fromTarget,
      toTarget: new THREE.Vector3(x, this.surfaceY(lon, lat), z),
      dir: offset.normalize(),
      fromDist,
      toDist: THREE.MathUtils.clamp(distKm || fromDist, MIN_DIST, MAX_DIST),
    };
  },

  zoomBy(factor) {
    if (!this.controls || !this.camera) return;
    const fromTarget = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(fromTarget);
    const fromDist = offset.length();
    this.flight = {
      t: 0,
      fromTarget,
      toTarget: fromTarget.clone(),
      dir: offset.normalize(),
      fromDist,
      toDist: THREE.MathUtils.clamp(fromDist * factor, MIN_DIST, MAX_DIST),
      fast: true,
    };
  },

  // Rotate so north is up, keeping distance and tilt.
  resetNorth() {
    if (!this.controls || !this.camera) return;
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const d = offset.length();
    const polar = Math.acos(THREE.MathUtils.clamp(offset.y / d, -1, 1));
    this.flight = null;
    this.camera.position.set(target.x, target.y + d * Math.cos(polar), target.z + d * Math.sin(polar));
    this.controls.update();
  },

  // Look straight down / tilt back.
  setTilt(polarRad) {
    if (!this.controls || !this.camera) return;
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const d = offset.length();
    const az = Math.atan2(offset.x, offset.z);
    const s = Math.sin(polarRad);
    this.flight = null;
    this.camera.position.set(
      target.x + d * s * Math.sin(az),
      target.y + d * Math.cos(polarRad),
      target.z + d * s * Math.cos(az)
    );
    this.controls.update();
  },
};
