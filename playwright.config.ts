import process from 'node:process';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5191' },
  webServer: { env: { ASTRO_PREVIEW_BACKGROUND: '1' }, command: 'npx astro preview --host 127.0.0.1 --port 5191', port: 5191, reuseExistingServer: !process.env.CI },
});
