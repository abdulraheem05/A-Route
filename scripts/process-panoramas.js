#!/usr/bin/env node
/**
 * Checks the panorama catalogue against the files in public/panoramas (no dependencies).
 * Image conversion itself (PNG/RGBA -> JPG, thumbnails, catalogue build) is done by
 * scripts/build_assets.py, which needs Python with Pillow, NumPy and SciPy.
 *
 *   npm run process:panoramas
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'panorama-catalog.json'), 'utf8'));

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}
let bad = 0, bytes = 0;
for (const p of catalog) {
  const f = path.join(root, 'public', p.file);
  if (!fs.existsSync(f) || !fs.existsSync(path.join(root, 'public', p.thumb))) { console.log('MISSING', p.id); bad++; continue; }
  const buf = fs.readFileSync(f); bytes += buf.length;
  const s = jpegSize(buf);
  const ok = s && s.w === Math.min(p.width, 8192);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${p.id.padEnd(26)} ${String(p.width).padStart(5)}x${String(p.height).padEnd(5)} ${p.type.padEnd(20)} ${p.sols ? 'sols ' + p.sols.join('-') : 'sol unknown'}  ${p.coordinateConfidence}`);
}
console.log(`${catalog.length} catalogue entries, ${(bytes / 1e6).toFixed(1)} MB, ${bad} problem(s).`);
process.exit(bad ? 1 : 0);
