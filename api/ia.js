// Internet Archive and NASA video for the studio's clips, on Vercel itself:
// /ia/<host>/<path> is rewritten here (vercel.json), so the page reads the
// file from its own origin and Hydra can use its pixels (the archive sends
// no CORS header on video files, NASA's CDN not always). Only those hosts,
// only GET and HEAD, ranges kept so the video can seek. The same job as
// worker/ia-proxy.js and the Vite middleware in development.
//   /ia/dn600203.us.archive.org/0/items/DuckandC1951/DuckandC1951_512kb.mp4

const ALLOWED_HOST = /^(([a-z0-9-]+\.)*archive\.org|images-assets\.nasa\.gov)$/;

async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const path = new URL(request.url).searchParams.get('p') ?? '';
  const match = path.match(/^([^/]+)(\/.+)$/);
  if (!match || !ALLOWED_HOST.test(match[1])) return new Response('Not found', { status: 404 });
  // the archive turns away anonymous requests from cloud servers (460):
  // say who asks
  const headers = new Headers({ 'user-agent': 'joedoe-live/1.0 (+https://live.joedoe.dev; video clips for live coding)' });
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  const get = (url) => fetch(url, { method: request.method, headers, redirect: 'follow' });
  let upstream = await get(`https://${match[1]}${match[2]}`);
  const tried = [upstream.status];
  // a storage node that still says no: the same file by its public address
  const item = match[2].match(/^\/\d+\/items\/(.+)$/);
  if (!upstream.ok && item) {
    upstream = await get(`https://archive.org/download/${item[1]}`);
    tried.push(upstream.status);
  }
  const out = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  // what the archive answered, for when something fails
  out.set('x-upstream', tried.join(','));
  // a day for the videos; a refusal is not kept, the next try asks again
  out.set('cache-control', upstream.ok ? 'public, max-age=86400' : 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

// A Node function, not an edge one: the archive turns away the edge network
// (460, 400) but not the regular servers
export const GET = handler;
export const HEAD = handler;
