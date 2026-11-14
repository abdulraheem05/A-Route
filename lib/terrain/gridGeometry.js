// Flat, regularly gridded geometry over a lon/lat rectangle. Elevation is
// applied on the GPU from a height texture (see terrainMaterial.js): vertex
// (i, j) reads texel (i, j), so the mesh is never finer than its data.
import * as THREE from 'three';
import { lonLatToXZ } from '@/lib/coordinates/projection';

export function buildGridGeometry({ bounds, nx, ny, uvBounds, skirt = false }) {
  const core = nx * ny;
  const ring = skirt ? 2 * (nx + ny) : 0;
  const n = core + ring;
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const ij = new Float32Array(n * 2);
  const sk = new Float32Array(n);
  const ub = uvBounds || bounds;
  const lonSpan = bounds.east - bounds.west;
  const latSpan = bounds.north - bounds.south;

  const put = (k, i, j, s) => {
    const lon = bounds.west + (i / (nx - 1)) * lonSpan;
    const lat = bounds.north - (j / (ny - 1)) * latSpan;
    const [x, z] = lonLatToXZ(lon, lat);
    pos[k * 3] = x;
    pos[k * 3 + 1] = 0;
    pos[k * 3 + 2] = z;
    uv[k * 2] = (lon - ub.west) / (ub.east - ub.west);
    uv[k * 2 + 1] = (lat - ub.south) / (ub.north - ub.south);
    ij[k * 2] = i;
    ij[k * 2 + 1] = j;
    sk[k] = s;
  };

  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) put(j * nx + i, i, j, 0);

  const quads = (nx - 1) * (ny - 1);
  const skirtQuads = skirt ? 2 * (nx - 1) + 2 * (ny - 1) : 0;
  const idx = new Uint32Array((quads + skirtQuads) * 6);
  let p = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx[p++] = a;
      idx[p++] = c;
      idx[p++] = b;
      idx[p++] = b;
      idx[p++] = c;
      idx[p++] = d;
    }
  }

  if (skirt) {
    // A dropped copy of each edge closes the gap where a detail patch meets
    // the coarser surface around it.
    let k = core;
    const edge = (list) => {
      const base = k;
      for (const [i, j] of list) put(k++, i, j, 1);
      for (let q = 0; q < list.length - 1; q++) {
        const a = list[q][1] * nx + list[q][0];
        const b = list[q + 1][1] * nx + list[q + 1][0];
        const a2 = base + q;
        const b2 = base + q + 1;
        idx[p++] = a;
        idx[p++] = a2;
        idx[p++] = b;
        idx[p++] = b;
        idx[p++] = a2;
        idx[p++] = b2;
      }
    };
    const top = [];
    const bottom = [];
    const left = [];
    const right = [];
    for (let i = 0; i < nx; i++) {
      top.push([i, 0]);
      bottom.push([i, ny - 1]);
    }
    for (let j = 0; j < ny; j++) {
      left.push([0, j]);
      right.push([nx - 1, j]);
    }
    edge(top);
    edge(bottom);
    edge(left);
    edge(right);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('aIJ', new THREE.BufferAttribute(ij, 2));
  geometry.setAttribute('aSkirt', new THREE.BufferAttribute(sk, 1));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  const [cx, cz] = lonLatToXZ((bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), 400);
  return geometry;
}
