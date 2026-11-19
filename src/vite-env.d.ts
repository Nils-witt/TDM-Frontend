/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  // Origin of universalGoApi, e.g. http://localhost:8080; empty for the SPA's own origin.
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// The frontend build, set in vite.config.ts: the release (APP_VERSION, else
// package.json's), the full commit (APP_COMMIT, else git; empty when
// unknown) and when it was built (ISO 8601).
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILD_TIME__: string;
