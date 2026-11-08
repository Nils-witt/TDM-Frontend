/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Origin of universalGoApi, e.g. http://localhost:8080; empty for the SPA's own origin.
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
