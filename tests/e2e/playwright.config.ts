import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Start with 1 to avoid race conditions in loose state management if any, though app seems capable of concurrency. Using 1 is safer for a complex golden flow.
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8001',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
