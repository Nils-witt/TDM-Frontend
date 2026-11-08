import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Fixed, since http://localhost:5173/callback is registered in Authentik
  // and listed in the API's CORS_ALLOWED_ORIGINS.
  server: { port: 5173, strictPort: true },
});
