import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.js',
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://localhost:5173',
    // The isolated Compose stack uses a locally generated development certificate.
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 960 }
  }
});
