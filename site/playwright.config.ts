import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    screenshot: 'only-on-failure',
  },
  // Plain static server: `astro preview` runs a persistent manager that holds
  // the port, which makes a Playwright-managed server exit immediately.
  webServer: {
    command: 'python3 -m http.server 4321 --bind 127.0.0.1 --directory dist',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      testMatch: ['**/content.spec.ts', '**/layout-desktop.spec.ts', '**/theme-desktop.spec.ts', '**/search.spec.ts', '**/links.spec.ts'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      testMatch: ['**/layout-mobile.spec.ts', '**/theme-mobile.spec.ts'],
    },
  ],
});
