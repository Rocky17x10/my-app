import { existsSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from '@playwright/test';

/*
 * Browser smoke tests. They expect the web app and the API to be running already (see README):
 * E2E_BASE_URL (default http://localhost:3000) and the E2E_* accounts in e2e/accounts.ts.
 * They only read data, so they are safe against a dev database.
 */

// The E2E_* settings may live in the git-ignored .env; variables already set in the shell win.
const envFile = path.join(__dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
export default defineConfig({
  testDir: './e2e',
  workers: 1, // the API throttles logins; one worker signs in once per role
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // Installed Edge/Chrome instead of a downloaded browser; set to 'chrome' or '' (bundled Chromium).
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'smoke', testMatch: /\.spec\.ts/, dependencies: ['setup'] },
  ],
});
