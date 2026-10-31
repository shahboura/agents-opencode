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
  webServer: {
    command: 'npm run preview -- --port 4321',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      testMatch: ['**/content.spec.ts', '**/layout-desktop.spec.ts', '**/theme-desktop.spec.ts', '**/links.spec.ts'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      testMatch: ['**/layout-mobile.spec.ts', '**/theme-mobile.spec.ts'],
    },
  ],
});
