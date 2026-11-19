import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The build shown in the About dialog. A Docker build has no .git, so its
// workflow passes APP_VERSION and APP_COMMIT.
function gitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const appVersion = process.env.APP_VERSION || pkg.version;
const appCommit = process.env.APP_COMMIT || gitCommit();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    // Precaches the app's own files. At runtime: config.json, and map styles,
    // sprites, glyphs and tiles (overlays included) for offline viewing. API
    // data goes to the network; the app keeps its own copy in IndexedDB
    // (src/api/offlineStore.ts). No service worker in `vite dev`.
    VitePWA({
      // A new version waits until the user accepts the UpdatePrompt, so an
      // open form is not reloaded away.
      registerType: 'prompt',
      injectRegister: false,
      // Icons (and their <link>s) generated from public/favicon.svg at build.
      pwaAssets: { image: 'public/favicon.svg' },
      manifest: {
        name: 'TMD',
        short_name: 'TMD',
        start_url: '/m',
        scope: '/',
        display: 'standalone',
        theme_color: '#1976d2',
        background_color: '#ffffff',
      },
      workbox: {
        // Everything, OCR included, so attachments can be read offline. The
        // OCR cores and the icon font are larger than the 2 MiB default.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,woff2,wasm,gz}'],
        globIgnores: ['config.json'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        // With an empty apiBaseUrl the API shares the origin; its paths are
        // never the SPA.
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        runtimeCaching: [
          {
            // Mounted at deploy time, so not precached; the last copy lets
            // the app start offline.
            urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname === '/config.json',
            handler: 'NetworkFirst',
            options: { cacheName: 'config' },
          },
          {
            // Map styles come from any https host an admin configured, so
            // everything of other origins counts, except the API (its data
            // is cached by the app, per user) and the identity provider.
            // Overlay tiles are the API's, behind the token; the cache is
            // deleted on logout and on a 401 (offlineStore.ts mapTilesCache).
            urlPattern: ({ sameOrigin, url }) =>
              url.pathname.startsWith('/api/v1/overlays/') ||
              (!sameOrigin &&
                !url.pathname.startsWith('/api/') &&
                !url.pathname.startsWith('/auth/') &&
                !url.pathname.startsWith('/application/') &&
                !url.pathname.startsWith('/if/')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxAgeSeconds: 24 * 60 * 60,
                maxEntries: 3000,
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Fixed, since http://localhost:5173/callback is registered in Authentik
  // and listed in the API's CORS_ALLOWED_ORIGINS.
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // The MapLibre and pdf.js workers are imported as `.mjs` assets, and
        // module workers must be served as JavaScript, which many servers'
        // MIME tables (nginx's included) don't do for `.mjs`.
        assetFileNames: ({ names }) =>
          names.some((name) => name.endsWith('.mjs'))
            ? 'assets/[name]-[hash].js'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  // OCR loads these only when first used. Found then, Vite re-bundles its
  // deps under a new hash, and the open page's import of the old one fails
  // with 504 "Outdated Optimize Dep".
  optimizeDeps: { include: ['tesseract.js', 'pdfjs-dist'] },
});
