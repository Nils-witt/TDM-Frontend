import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Caches the app's own files only. API data, map styles and tiles are
    // other origins and go to the network; config.json is the one same-origin
    // request handled at runtime. No service worker in `vite dev`.
    VitePWA({
      // A new version waits until the user accepts the UpdatePrompt, so an
      // open form is not reloaded away.
      registerType: 'prompt',
      injectRegister: false,
      // Icons (and their <link>s) generated from public/favicon.svg at build.
      pwaAssets: { image: 'public/favicon.svg' },
      manifest: {
        name: 'Universam',
        short_name: 'Universam',
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
  // OCR loads these only when first used. Found then, Vite re-bundles its
  // deps under a new hash, and the open page's import of the old one fails
  // with 504 "Outdated Optimize Dep".
  optimizeDeps: { include: ['tesseract.js', 'pdfjs-dist'] },
});
