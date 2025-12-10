// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env file if it exists
try {
  const envPath = resolve(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  // .env file doesn't exist or can't be read, use environment variables directly
}

/**
 * TrackFlow E2E Test Configuration
 * 
 * Prerequisites:
 * - Backend must be running on http://localhost:8001
 * - Frontend must be running on http://localhost:3000
 * - Test user credentials (set TEST_USERNAME and TEST_PASSWORD env vars)
 * 
 * To run tests:
 *   npm run test:e2e          # Run all tests headlessly
 *   npm run test:e2e:ui        # Run tests with Playwright UI
 * 
 * Test Credentials:
 *   Set environment variables TEST_USERNAME and TEST_PASSWORD, or create a .env file:
 *   TEST_USERNAME=your_test_user
 *   TEST_PASSWORD=your_test_password
 * 
 * CI Integration:
 *   For CI/CD pipelines, uncomment and configure the webServer section below
 *   to automatically start frontend/backend before tests.
 */

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Timeouts */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // Uncomment for CI/CD integration:
  // webServer: {
  //   command: 'cd frontend && npm start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
