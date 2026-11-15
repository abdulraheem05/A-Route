// Writes a synthetic stand-in for NASA's Curiosity waypoint file.
// See README.md: this is test input, not data about Mars.
import fs from 'node:fs';
import path from 'node:path';

const SOLS = [3, 106, 182, 279, 621, 759, 1060, 1726, 2370, 3086, 3397, 3565, 4000];
// Interpolates from the landing area on Aeolis Palus towards Aeolis Mons, so
// the path spans the prepared terrain window and the sols increase.
const A = { lon: 137.4417, lat: -4.5895, elev: -4501 }; // near Aeolis Palus
const B = { lon: 137.42, lat: -4.72, elev: -4200 };

const features = SOLS.map((sol, i) => {
  const t = i / (SOLS.length - 1);
  const lon = A.lon + (B.lon - A.lon) * t;
  const lat = A.lat + (B.lat - A.lat) * t;
  const elev = A.elev + (B.elev - A.elev) * t;
  return {
    type: 'Feature',
    properties: { sol, lon, lat, elev_geoid: elev, SYNTHETIC: true },
    geometry: { type: 'Point', coordinates: [lon, lat, elev] },
  };
});

const out = path.join(import.meta.dirname, 'msl-waypoints.synthetic.json');
fs.writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', SYNTHETIC: 'test fixture, not rover data', features }, null, 1));
console.log(`wrote ${features.length} synthetic waypoints -> ${out}`);
