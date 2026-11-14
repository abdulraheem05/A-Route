// Same-origin proxy for NASA Mars Trek WMTS tiles.
// Why a proxy: WebGL textures and canvas compositing need CORS-clean images,
// and Trek's cross-origin behaviour was not verified (DATA_ACQUISITION_PLAN C1).
// Only allow-listed layers from GALE_DATA_REGISTRY.md are served.

const LAYERS = {
  Gale_CTX_BlockAdj_dd: 'png', // D05
  curiosity_hirise_mosaic: 'png', // D06
  Mars_MGS_MOLA_ClrShade_merge_global_463m: 'jpg', // D10
};

const isIndex = (v) => /^\d{1,7}$/.test(String(v));

export async function GET(_request, context) {
  const { layer, z, row, col } = await context.params;
  const ext = LAYERS[layer];
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
