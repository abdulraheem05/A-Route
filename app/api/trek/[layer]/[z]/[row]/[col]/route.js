// Same-origin proxy for NASA Mars Trek WMTS tiles.
// Why a proxy: WebGL textures and canvas compositing need CORS-clean images,
// and Trek's cross-origin behaviour was not verified (DATA_ACQUISITION_PLAN C1).
// Only allow-listed layers are served.
//
// The allow-list used to be three hardcoded Gale entries. It is now built from
// the layers every registered crater declares, plus the global layers below,
// so a new crater's verified Trek layers are served as soon as its
// configuration names them — and nothing else is.
import { listCraters } from '@/lib/mars/craters';

// Layers that belong to no single crater.
const GLOBAL_LAYERS = {
  Mars_MGS_MOLA_ClrShade_merge_global_463m: 'jpg', // D10
};

function allowedLayers() {
  const out = { ...GLOBAL_LAYERS };
  for (const crater of listCraters()) {
    const layers = (crater.imagery && crater.imagery.layers) || {};
    for (const layer of Object.values(layers)) {
      if (layer && layer.id) out[layer.id] = layer.ext || 'png';
    }
  }
  return out;
}

const isIndex = (v) => /^\d{1,7}$/.test(String(v));

export async function GET(_request, context) {
  const { layer, z, row, col } = await context.params;
  const ext = allowedLayers()[layer];
  if (!ext || !isIndex(z) || !isIndex(row) || !isIndex(col)) {
    return new Response('Bad tile request', { status: 400 });
  }
  const url = `https://trek.nasa.gov/tiles/Mars/EQ/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.${ext}`;
  try {
    const upstream = await fetch(url, { cache: 'no-store' });
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !type.startsWith('image/')) {
      // Trek: a missing tile means no data coverage there.
      return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=2592000, immutable',
        'X-MarsWalk-Source': url,
      },
    });
  } catch (err) {
    return new Response('Mars Trek unreachable', { status: 502 });
  }
}
