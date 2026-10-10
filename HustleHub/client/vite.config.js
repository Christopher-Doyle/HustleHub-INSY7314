import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API only speaks HTTPS with a local self-signed certificate, so the dev proxy
// must accept it. The browser itself only ever talks to the Vite dev server.
const API_TARGET = process.env.VITE_API_TARGET || 'https://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: false }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false
  }
});
