// Internet Archive and NASA video for the studio's clips, on Vercel itself:
// /ia/<host>/<path> is rewritten here (vercel.json), so the page reads the
// file from its own origin and Hydra can use its pixels (the archive sends
// no CORS header on video files, NASA's CDN not always). Only those hosts,
// only GET and HEAD, ranges kept so the video can seek. The same job as
// worker/ia-proxy.js and the Vite middleware in development.
//   /ia/dn600203.us.archive.org/0/items/DuckandC1951/DuckandC1951_512kb.mp4
export const config = { runtime: 'edge' };

const ALLOWED_HOST = /^(([a-z0-9-]+\.)*archive\.org|images-assets\.nasa\.gov)$/;

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const path = new URL(request.url).searchParams.get('p') ?? '';
  const match = path.match(/^([^/]+)(\/.+)$/);
  if (!match || !ALLOWED_HOST.test(match[1])) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  const upstream = await fetch(`https://${match[1]}${match[2]}`, { method: request.method, headers, redirect: 'follow' });
  const out = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set('cache-control', 'public, max-age=86400');
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
