import { defineConfig, devices } from "@playwright/test";

const PORT = 3009;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: isCI ? 2 : undefined,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "./bin/e2e-server",
    url: `http://localhost:${PORT}/health-check`,
    timeout: 60_000,
    reuseExistingServer: !isCI,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(PORT),
      ENABLE_MOCK_API: "true",
      SESSION_COOKIE_PASSWORD:
        "playwright-e2e-only-session-cookie-password-not-a-secret",
      LOG_LEVEL: "trace",
      DISABLE_LOG_REDACTION: "false",
      ALLOW_USER_TEMPLATES: "true",
      PREVIEW_MODE: "true",
    },
  },
});
