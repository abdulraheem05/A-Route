'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { elevToWorldY } from '@/lib/coordinates/projection-jezero';
import { createTerrainMaterial } from './terrainMaterial';

// Vertex budget for the whole-scene mesh. The stride is derived from the grid size, so a
// full-resolution DEM is thinned for the far field; the near patch still samples every cell.
const VERTEX_BUDGET = { low: 300000, medium: 1200000, high: 2500000 };
function strideFor(hf, quality) {
  const budget = VERTEX_BUDGET[quality] || VERTEX_BUDGET.medium;
  return Math.max(1, Math.ceil(Math.sqrt((hf.w * hf.h) / budget)));
}
const PATCH_CELLS = 192;
const PATCH_SPACING = 8; // metres
const PATCH_RADIUS = (PATCH_CELLS * PATCH_SPACING) / 2 - PATCH_SPACING;

/** Whole-scene mesh built straight from the height grid (level of detail = grid stride). */
function buildGlobalGeometry(hf, stride) {
  const cols = [], rows = [];
  for (let i = 0; i < hf.w - 1; i += stride) cols.push(i);
  cols.push(hf.w - 1);
  for (let j = 0; j < hf.h - 1; j += stride) rows.push(j);
  rows.push(hf.h - 1);
  const nx = cols.length, nz = rows.length;
  const pos = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  let p = 0, q = 0;
  for (let b = 0; b < nz; b++) {
    const j = rows[b];
    for (let a = 0; a < nx; a++) {
      const i = cols[a];
      const x = hf.bounds.xMin + i * hf.cellX, z = hf.bounds.zMin + j * hf.cellZ;
      const t = hf.texUV(x, z);
      pos[p++] = x;
      pos[p++] = elevToWorldY(hf.at(i, j));
      pos[p++] = z;
      uv[q++] = t.u;
      uv[q++] = t.v;
    }
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let k = 0;
  for (let b = 0; b < nz - 1; b++) {
    for (let a = 0; a < nx - 1; a++) {
      const i0 = b * nx + a, i1 = i0 + 1, i2 = i0 + nx, i3 = i2 + 1;
      idx[k++] = i0; idx[k++] = i2; idx[k++] = i1;
      idx[k++] = i1; idx[k++] = i2; idx[k++] = i3;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Fine mesh around the player, sampled with the same bicubic function the collision uses. */
function buildPatchGeometry() {
  const n = PATCH_CELLS + 1;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * n * 2), 2).setUsage(THREE.DynamicDrawUsage));
  const idx = new Uint32Array(PATCH_CELLS * PATCH_CELLS * 6);
  let k = 0;
  for (let b = 0; b < PATCH_CELLS; b++) {
    for (let a = 0; a < PATCH_CELLS; a++) {
      const i0 = b * n + a, i1 = i0 + 1, i2 = i0 + n, i3 = i2 + 1;
      idx[k++] = i0; idx[k++] = i2; idx[k++] = i1;
      idx[k++] = i1; idx[k++] = i2; idx[k++] = i3;
    }
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

function fillPatch(geo, hf, cx, cz) {
  const n = PATCH_CELLS + 1;
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv.array;
  const half = (PATCH_CELLS * PATCH_SPACING) / 2;
  let p = 0, q = 0;
  for (let b = 0; b < n; b++) {
    const z = cz - half + b * PATCH_SPACING;
    for (let a = 0; a < n; a++) {
      const x = cx - half + a * PATCH_SPACING;
      const g = hf.worldToGrid(x, z);
      const e = hf.sampleGrid(g.u, g.v);
      const gr = hf.gradient(x, z, PATCH_SPACING);
      const inv = 1 / Math.hypot(gr.gx, 1, gr.gz);
      pos[p] = x; pos[p + 1] = elevToWorldY(e); pos[p + 2] = z;
      nor[p] = -gr.gx * inv; nor[p + 1] = inv; nor[p + 2] = -gr.gz * inv;
      p += 3;
      const t = hf.texUV(x, z);
      uv[q++] = t.u;
      uv[q++] = t.v;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

export default function Terrain({ hf, surface, quality }) {
  const shared = useMemo(() => ({ patchCenter: { value: new THREE.Vector2(1e9, 1e9) }, patchRadius: { value: PATCH_RADIUS } }), []);
  const globalGeo = useMemo(() => buildGlobalGeometry(hf, strideFor(hf, quality)), [hf, quality]);
  const patchGeo = useMemo(() => buildPatchGeometry(), []);
  const globalMat = useMemo(() => createTerrainMaterial(surface, false, shared), [surface, shared]);
  const patchMat = useMemo(() => createTerrainMaterial(surface, true, shared), [surface, shared]);
  const centre = useRef({ x: 1e9, z: 1e9 });

  useEffect(() => () => globalGeo.dispose(), [globalGeo]);
  useEffect(() => () => { patchGeo.dispose(); globalMat.dispose(); patchMat.dispose(); }, [patchGeo, globalMat, patchMat]);

  useFrame(({ camera }) => {
    const c = centre.current;
    if (Math.abs(camera.position.x - c.x) > 96 || Math.abs(camera.position.z - c.z) > 96) {
      // snap to the patch grid so vertices do not swim as the patch follows the player
      c.x = Math.round(camera.position.x / (PATCH_SPACING * 4)) * PATCH_SPACING * 4;
      c.z = Math.round(camera.position.z / (PATCH_SPACING * 4)) * PATCH_SPACING * 4;
      fillPatch(patchGeo, hf, c.x, c.z);
      shared.patchCenter.value.set(c.x, c.z);
    }
  });

  return (
    <group>
      <mesh geometry={globalGeo} material={globalMat} frustumCulled={false} />
      <mesh geometry={patchGeo} material={patchMat} frustumCulled={false} />
    </group>
  );
}
