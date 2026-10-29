import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Files in public/ the app needs offline (the rest are for sharing: og.png)
const PUBLIC_FILES = ['favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

// Writes sw.js from src/service-worker.js with the exact list of files this
// build produced, so the service worker can save the whole app when it
// installs. The version is a hash of that list: any change makes a new one.
function serviceWorker(): Plugin {
  return {
    name: 'jdl-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((file) => !file.endsWith('.map'));
      const precache = ['/', ...built, ...PUBLIC_FILES].map((file) => (file.startsWith('/') ? file : `/${file}`));
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync('src/service-worker.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Internet Archive video files, which pages may not read directly: in
// development Vite passes them on (online it is worker/ia-proxy.js)
//   /ia/dn600203.us.archive.org/0/items/… -> https://dn600203.us.archive.org/0/items/…
const IA_PATH = /^\/ia\/(([a-z0-9-]+\.)*archive\.org)(\/[^?#]*)/;

function iaProxy(): Plugin {
  return {
    name: 'jdl-ia-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(IA_PATH);
        if (!match) return next();
        try {
          const headers: Record<string, string> = {};
          if (typeof req.headers.range === 'string') headers.range = req.headers.range;
          const upstream = await fetch(`https://${match[1]}${match[3]}`, { headers, redirect: 'follow' });
          res.statusCode = upstream.status;
          for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
            const value = upstream.headers.get(name);
            if (value) res.setHeader(name, value);
          }
          if (!upstream.body) return res.end();
          const reader = upstream.body.getReader();
          req.on('close', () => void reader.cancel().catch(() => undefined));
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch {
          if (!res.headersSent) res.statusCode = 502;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker(), iaProxy()],
  // Two pages: the studio, and the phone's controller (mando.html)
  build: { rollupOptions: { input: { main: 'index.html', mando: 'mando.html' } } },
});
