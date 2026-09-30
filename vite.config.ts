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

export default defineConfig({
  plugins: [serviceWorker()],
  // Two pages: the studio, and the phone's controller (mando.html)
  build: { rollupOptions: { input: { main: 'index.html', mando: 'mando.html' } } },
});
