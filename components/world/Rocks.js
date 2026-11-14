'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { regionAt } from '@/lib/scientific-data/regions';

// Procedural rock scatter: deterministic per map cell, so the same rocks always stand in the
// same places. Purely visual dressing styled on the panoramas — no collision, not in the DEM.
const SMALL = { radius: 240, cell: 11, rebuild: 24 };
const BIG = { radius: 950, cell: 48 };
const CAPS = { low: [2600, 700], medium: [4200, 1200], high: [6000, 1700] };

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cellSeed = (i, j, salt) => (Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ salt) >>> 0;

/** Lumpy flat-shaded rock: an icosahedron pushed around by a few deterministic bumps. */
function makeRockGeometry(seed, detail, flatten) {
  const g = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const rnd = mulberry(seed);
  const bumps = [];
  for (let k = 0; k < 6; k++) {
    bumps.push({ d: new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(), a: 0.10 + 0.22 * rnd(), w: 1.5 + 3.5 * rnd() });
  }
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    for (const b of bumps) r += b.a * Math.exp(-b.w * (1 - v.dot(b.d)));
    pos.setXYZ(i, v.x * r, v.y * r * flatten, v.z * r);
  }
  g.computeVertexNormals(); // non-indexed -> faceted, angular look
  g.computeBoundingSphere();
  return g;
}

export default function Rocks({ hf, quality }) {
  const caps = CAPS[quality] || CAPS.medium;
  // 0 pebble, 1 angular, 2 slab/paver; 3-5 boulder variants (rounded, angular, slabby)
  const geoms = useMemo(() => [
    makeRockGeometry(11, 1, 0.78), makeRockGeometry(23, 1, 1.02), makeRockGeometry(37, 1, 0.34),
    makeRockGeometry(51, 2, 0.88), makeRockGeometry(67, 2, 1.05), makeRockGeometry(83, 2, 0.45),
  ], []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xffffff }), []);
  const meshRefs = useRef([]);
  const last = useRef({ x: 1e9, z: 1e9 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  useEffect(() => () => { geoms.forEach((g) => g.dispose()); material.dispose(); }, [geoms, material]);
  // per-geometry instance capacity: small shapes share cap[0], boulder shapes cap[1]
  const capOf = (cls) => (cls < 3 ? Math.floor(caps[0] / 3) : Math.floor(caps[1] / 3));

  function place(mesh, count, x, y, z, ry, sx, sy, sz, c) {
    if (!mesh || count >= capOf(mesh.userData.cls)) return count;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(count, dummy.matrix);
    mesh.setColorAt(count, c);
    return count + 1;
  }

  function rebuild(cx, cz) {
    const meshes = meshRefs.current;
    if (meshes.some((m) => !m)) return;
    const counts = [0, 0, 0, 0, 0, 0];
    // small rocks
    const i0 = Math.floor((cx - SMALL.radius) / SMALL.cell), i1 = Math.ceil((cx + SMALL.radius) / SMALL.cell);
    const j0 = Math.floor((cz - SMALL.radius) / SMALL.cell), j1 = Math.ceil((cz + SMALL.radius) / SMALL.cell);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const rnd = mulberry(cellSeed(i, j, 1013904223));
        const ccx = (i + 0.5) * SMALL.cell, ccz = (j + 0.5) * SMALL.cell;
        if (!hf.inBounds(ccx, ccz, 60)) continue;
        const dx = ccx - cx, dz = ccz - cz;
        if (dx * dx + dz * dz > SMALL.radius * SMALL.radius) continue;
        const reg = regionAt(ccx, ccz);
        const n = Math.floor(reg.density + rnd());
        for (let k = 0; k < n; k++) {
          const px = (i + rnd()) * SMALL.cell, pz = (j + rnd()) * SMALL.cell;
          const u = rnd(), shape = u < reg.slabShare ? 2 : u < reg.slabShare + reg.angularShare ? 1 : 0;
          const s = reg.sizeMin + (reg.sizeMax - reg.sizeMin) * Math.pow(rnd(), 2.2);
          const pale = rnd() < reg.paleShare;
          tint.copy(pale ? reg.pale : reg.colorA).lerp(pale ? reg.pale : reg.colorB, rnd());
          tint.offsetHSL(0, 0, (rnd() - 0.5) * 0.05);
          const y = hf.worldY(px, pz) - 0.3 * s;
          counts[shape] = place(meshes[shape], counts[shape], px, y, pz, rnd() * Math.PI * 2, s * (0.85 + 0.3 * rnd()), s * (0.7 + 0.45 * rnd()), s * (0.85 + 0.3 * rnd()), tint);
        }
      }
    }
    // boulders
    const bi0 = Math.floor((cx - BIG.radius) / BIG.cell), bi1 = Math.ceil((cx + BIG.radius) / BIG.cell);
    const bj0 = Math.floor((cz - BIG.radius) / BIG.cell), bj1 = Math.ceil((cz + BIG.radius) / BIG.cell);
    for (let j = bj0; j <= bj1; j++) {
      for (let i = bi0; i <= bi1; i++) {
        const rnd = mulberry(cellSeed(i, j, 2654435761));
        const ccx = (i + 0.5) * BIG.cell, ccz = (j + 0.5) * BIG.cell;
        if (!hf.inBounds(ccx, ccz, 120)) continue;
        const dx = ccx - cx, dz = ccz - cz;
        if (dx * dx + dz * dz > BIG.radius * BIG.radius) continue;
        const reg = regionAt(ccx, ccz);
        if (rnd() >= reg.boulderDensity) continue;
        const px = (i + 0.15 + 0.7 * rnd()) * BIG.cell, pz = (j + 0.15 + 0.7 * rnd()) * BIG.cell;
        if (hf.slopeDeg(px, pz) > 32) continue; // boulders do not perch on cliff faces
        const u = rnd(), shape = 3 + (u < reg.angularShare ? 1 : u < reg.angularShare + reg.slabShare ? 2 : 0);
        const s = reg.boulderMin + (reg.boulderMax - reg.boulderMin) * Math.pow(rnd(), 1.6);
        tint.copy(reg.colorA).lerp(reg.colorB, rnd());
        if (rnd() < reg.paleShare) tint.lerp(reg.pale, 0.6);
        const y = hf.worldY(px, pz) - 0.25 * s;
        counts[shape] = place(meshes[shape], counts[shape], px, y, pz, rnd() * Math.PI * 2, s * (0.85 + 0.3 * rnd()), s * (0.75 + 0.4 * rnd()), s * (0.85 + 0.3 * rnd()), tint);
      }
    }
    for (let m = 0; m < 6; m++) {
      const mesh = meshes[m];
      mesh.count = counts[m];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  useFrame(({ camera }) => {
    const c = last.current;
    if (Math.abs(camera.position.x - c.x) > SMALL.rebuild || Math.abs(camera.position.z - c.z) > SMALL.rebuild) {
      c.x = camera.position.x; c.z = camera.position.z;
      rebuild(c.x, c.z);
    }
  });

  return (
    <group>
      {geoms.map((g, idx) => (
        <instancedMesh
          key={idx}
          ref={(m) => { meshRefs.current[idx] = m; if (m) m.userData.cls = idx; }}
          args={[g, material, capOf(idx)]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
