// Surface-dressing palettes for the procedural rocks and sand, keyed by mission campaign.
// Rock shapes, sizes and colours are chosen by eye from each campaign's Mastcam-Z panoramas:
// they make an area LOOK like its photographs, but individual rocks are invented, not mapped.
import * as THREE from 'three';
import { WORLD } from './index.js';

const P = (o) => ({ ...o, colorA: new THREE.Color(o.colorA), colorB: new THREE.Color(o.colorB), pale: new THREE.Color(o.pale) });

// density: rocks per 11 m cell (0..3). slabShare/angularShare: shape mix (rest are rounded pebbles).
// paleShare: fraction of light-toned rocks. boulderDensity: boulders per 48 m cell (0..1).
const PALETTES = {
  // Máaz crater floor: dark fractured pavers half-buried in grey-brown sand, pale dust patches.
  floor: P({ density: 1.5, slabShare: 0.40, angularShare: 0.30, sizeMin: 0.10, sizeMax: 0.70, paleShare: 0.16,
             boulderDensity: 0.10, boulderMin: 0.8, boulderMax: 1.7, colorA: '#57503f', colorB: '#7d7260', pale: '#a79a83' }),
  // Séítah: rippled reddish sand between low layered olivine-rich outcrops.
  seitah: P({ density: 1.0, slabShare: 0.55, angularShare: 0.15, sizeMin: 0.12, sizeMax: 0.85, paleShare: 0.10,
             boulderDensity: 0.06, boulderMin: 0.8, boulderMax: 1.6, colorA: '#6b5a45', colorB: '#8e7a5f', pale: '#9f8a6b' }),
  // Delta front: buff layered sandstone blocks fallen from the scarps.
  delta: P({ density: 1.8, slabShare: 0.45, angularShare: 0.30, sizeMin: 0.12, sizeMax: 0.95, paleShare: 0.22,
             boulderDensity: 0.25, boulderMin: 1.0, boulderMax: 2.6, colorA: '#7a6a53', colorB: '#a08a6c', pale: '#b7a286' }),
  // Fan top: rounded flood-carried boulders on gravel.
  fan: P({ density: 1.4, slabShare: 0.15, angularShare: 0.25, sizeMin: 0.10, sizeMax: 0.80, paleShare: 0.14,
             boulderDensity: 0.32, boulderMin: 1.1, boulderMax: 2.8, colorA: '#6e6557', colorB: '#958a78', pale: '#ab9f8b' }),
  // Neretva Vallis / Bright Angel: pale light-toned rock on a sandy channel floor.
  channel: P({ density: 1.1, slabShare: 0.35, angularShare: 0.25, sizeMin: 0.10, sizeMax: 0.75, paleShare: 0.30,
             boulderDensity: 0.10, boulderMin: 0.9, boulderMax: 1.8, colorA: '#8a7b66', colorB: '#b0a28a', pale: '#c6b8a0' }),
  // Crater rim and beyond: angular grey impact-shattered blocks of all sizes.
  rim: P({ density: 1.7, slabShare: 0.20, angularShare: 0.55, sizeMin: 0.12, sizeMax: 0.95, paleShare: 0.13,
             boulderDensity: 0.26, boulderMin: 1.0, boulderMax: 2.4, colorA: '#5d564c', colorB: '#867c6d', pale: '#a2988a' }),
};

const MISSION_REGION = { m01: 'floor', m02: 'floor', m03: 'seitah', m04: 'floor', m05: 'delta', m06: 'floor', m07: 'fan', m08: 'channel', m09: 'rim', m10: 'rim' };

const anchors = WORLD.sites.map((s) => ({ x: s.x, z: s.z, palette: PALETTES[MISSION_REGION[s.missionId]] || PALETTES.rim }));

const out = {
  density: 0, slabShare: 0, angularShare: 0, sizeMin: 0, sizeMax: 0, paleShare: 0,
  boulderDensity: 0, boulderMin: 0, boulderMax: 0,
  colorA: new THREE.Color(), colorB: new THREE.Color(), pale: new THREE.Color(),
};
const NUM = ['density', 'slabShare', 'angularShare', 'sizeMin', 'sizeMax', 'paleShare', 'boulderDensity', 'boulderMin', 'boulderMax'];

/**
 * Blended palette at a world position: the two nearest station anchors, weighted by distance.
 * Returns a shared object — copy values out if you need to keep them.
 */
export function regionAt(x, z) {
  let a = null, b = null, da = Infinity, db = Infinity;
  for (const s of anchors) {
    const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
    if (d < da) { b = a; db = da; a = s; da = d; }
    else if (d < db) { b = s; db = d; }
  }
  if (!b) b = a;
  const d1 = Math.sqrt(da), d2 = Math.sqrt(db);
  const t = d1 + d2 > 0 ? d1 / (d1 + d2) : 0; // 0..0.5, toward the second-nearest
  const pa = a.palette, pb = b.palette;
  for (const k of NUM) out[k] = pa[k] + (pb[k] - pa[k]) * t;
  out.colorA.copy(pa.colorA).lerp(pb.colorA, t);
  out.colorB.copy(pa.colorB).lerp(pb.colorB, t);
  out.pale.copy(pa.pale).lerp(pb.pale, t);
  return out;
}
