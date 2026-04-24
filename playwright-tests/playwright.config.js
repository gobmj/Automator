// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for AI-Generated Tests
 * Supports both UI and API testing
 */

module.exports = defineConfig({
  // Test directory
  testDir: './generated',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for UI tests
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // API base URL
    apiURL: process.env.API_URL || 'http://localhost:3000',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },
  
  // Configure projects for different browsers and test types
  projects: [
    // UI Tests - Chromium
    {
      name: 'chromium-ui',
      testMatch: /.*\.ui\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    
    // API Tests
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.js/,
      use: {
        baseURL: process.env.API_URL || 'http://localhost:3000',
      },
    },
    
    // All generated tests (fallback)
    {
      name: 'chromium-all',
      testMatch: /.*\.generated\.spec\.js/,
      testIgnore: [/.*\.(ui|api)\.spec\.js/],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  
  // Web server configuration (optional - for local development)
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd ../backend && npm start',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd ../frontend && npm run dev',
      url: 'http://localhost:5173',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
  
  // Global setup/teardown
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
});