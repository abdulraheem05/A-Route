// Parses every JS/JSX file under a project root with Bun's transpiler.
// Reports syntax errors only; module resolution is not attempted.
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const root = process.argv[2];
if (!root) { console.error('usage: bun syntax-check.js <root>'); process.exit(2); }

const SKIP = new Set(['node_modules', '.next', '.git', 'public']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (['.js', '.jsx', '.mjs'].includes(extname(name))) files.push(p);
  }
})(root);

const tsx = new Bun.Transpiler({ loader: 'jsx' });
let bad = 0;
for (const f of files) {
  try {
    tsx.transformSync(readFileSync(f, 'utf8'));
  } catch (e) {
    bad++;
    console.log(`FAIL ${f.slice(root.length + 1)}`);
    console.log(String(e.message || e).split('\n').slice(0, 6).join('\n'));
  }
}
console.log(`\n${files.length} files parsed, ${bad} with syntax errors`);
process.exit(bad ? 1 : 0);
