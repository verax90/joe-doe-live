// Internet Archive video for live.joedoe.dev: the archive lets pages read its
// search and file lists, not its video files, and the studio needs to read
// their pixels (effects, Hydra). This passes the files on with the header
// that allows it. Only *.archive.org, only GET and HEAD, ranges kept.
//   /ia/dn600203.us.archive.org/0/items/DuckandC1951/DuckandC1951_512kb.mp4
const ALLOWED_HOST = /^([a-z0-9-]+\.)*archive\.org$/;
const ORIGINS = /^https:\/\/(live\.joedoe\.dev|[a-z0-9-]+-veraxs-projects\.vercel\.app)$|^http:\/\/localhost(:\d+)?$/;

export default {
  async fetch(request) {
    const origin = request.headers.get('origin') ?? '';
    const cors = {
      'access-control-allow-origin': ORIGINS.test(origin) ? origin : 'https://live.joedoe.dev',
      'access-control-allow-headers': 'range',
      'access-control-expose-headers': 'content-length, content-range, accept-ranges',
      vary: 'origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: cors });
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/ia\/([^/]+)(\/.+)$/);
    if (!match || !ALLOWED_HOST.test(match[1])) return new Response('Not found', { status: 404, headers: cors });
    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('range', range);
    const upstream = await fetch(`https://${match[1]}${match[2]}`, { method: request.method, headers, redirect: 'follow' });
    const out = new Headers(cors);
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }
    out.set('cache-control', 'public, max-age=86400');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
