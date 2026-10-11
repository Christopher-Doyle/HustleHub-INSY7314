import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxies /api to the HTTPS backend server-to-server. This avoids two
    // local-dev problems at once: the backend has no CORS headers (it isn't
    // meant to be called cross-origin), and its self-signed certificate
    // would otherwise need to be trusted manually in the browser (the same
    // problem Postman has — see certs/ in the backend README). `secure:
    // false` only relaxes TLS verification for this server-to-server proxy
    // hop, never for the browser.
    proxy: {
      '/api': { target: 'https://localhost:4000', changeOrigin: true, secure: false }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true
  }
});
