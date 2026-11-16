// Resolves every relative and '@/'-aliased import in a Next.js project to a
// real file on disk, and reports any that do not resolve. Catches wrong paths
// in new components, which a syntax check cannot see.
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, extname } from 'path';

const root = process.argv[2];
if (!root) { console.error('usage: bun check-imports.js <root>'); process.exit(2); }

const SKIP = new Set(['node_modules', '.next', '.git', 'public']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.js', '.jsx', '.mjs'].includes(extname(name))) files.push(p);
  }
})(root);

const EXTS = ['', '.js', '.jsx', '.mjs', '.json', '/index.js', '/index.jsx'];
const resolves = (base) => EXTS.some((e) => {
  const p = base + e;
  return existsSync(p) && (e.startsWith('/') ? statSync(p).isFile() : statSync(p).isFile());
});

// import ... from 'x' | export ... from 'x' | import('x')
const RE = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

let bad = 0;
let checked = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(RE)) {
    const spec = m[1];
    let base = null;
    if (spec.startsWith('@/')) base = resolve(root, spec.slice(2));
    else if (spec.startsWith('./') || spec.startsWith('../')) base = resolve(dirname(f), spec);
    else continue; // a package: not this script's business
    checked++;
    if (!resolves(base)) {
      bad++;
      console.log(`UNRESOLVED ${f.slice(root.length + 1)} -> ${spec}`);
    }
  }
}
console.log(`\n${checked} local imports across ${files.length} files, ${bad} unresolved`);
process.exit(bad ? 1 : 0);
