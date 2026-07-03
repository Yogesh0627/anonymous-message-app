import { defineConfig, devices } from "@playwright/test"

/**
 * E2E smoke tests run against a production build. The web server is given
 * placeholder env vars — these tests exercise rendering and client-side
 * validation, so they do not depend on a real database or external services.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      MONGOOSE_URI: "mongodb://localhost:27017/e2e",
      NEXTAUTH_SECRET: "e2e-placeholder-secret",
      RESEND_API_KEY: "e2e-placeholder-key",
    },
  },
})
