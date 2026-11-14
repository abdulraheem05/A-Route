// Minimal ESM resolver for the project's "@/..." path alias (jsconfig.json), so
// plain `node` can import the library modules without a bundler. It also adds
// the extension Next.js would add, since bare specifiers in this project are
// written without one.
// Used by scripts/gale-regression.mjs. No dependencies.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CANDIDATES = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx'];

function locate(base) {
  for (const suffix of CANDIDATES) {
    const p = base + suffix;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

// Next.js imports JSON without an import attribute; Node requires one. The
// attribute is added here so the same source works in both.
const jsonAttrs = (url) => (url.endsWith('.json') ? { type: 'json' } : undefined);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const found = locate(path.join(ROOT, specifier.slice(2)));
    if (found) {
      const url = pathToFileURL(found).href;
      return { url, shortCircuit: true, importAttributes: jsonAttrs(url) };
    }
  }
  const resolved = await next(specifier, context);
  if (resolved.url.endsWith('.json') && !resolved.importAttributes?.type) {
    return { ...resolved, importAttributes: { type: 'json' } };
  }
  return resolved;
}
