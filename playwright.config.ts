import { defineConfig } from '@playwright/test';
import { generateProjects } from '@backstage/e2e-test-utils/playwright';

/**
 * Playwright e2e config. Runs the dev harness (backend on 7007, frontend on
 * 3000) and drives the roadmap UI in a real browser against the real backend
 * with an in-memory sqlite database.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 60_000,

  expect: {
    timeout: 10_000,
  },

  // Start the dev servers before the tests (reused if already running)
  webServer: [
    {
      command: 'yarn start-backend',
      port: 7007,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'yarn start',
      port: 3000,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { open: 'never', outputFolder: 'e2e-test-report' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  outputDir: 'node_modules/.cache/e2e-test-results',

  projects: generateProjects(), // Finds all packages with e2e-tests folders
});
