import { defineConfig, devices } from "@playwright/test";

/**
 * E2E targets:
 * - development: local Next + API (default baseURL http://127.0.0.1:3000)
 * - demo: staging-style URL via PLAYWRIGHT_BASE_URL + PLAYWRIGHT_API_URL
 *
 * Failed tests keep trace + video for CI/debug review.
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm exec next dev --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        cwd: __dirname,
        env: {
          ...process.env,
          NEXT_PUBLIC_API_URL:
            process.env.PLAYWRIGHT_API_URL?.trim() ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://127.0.0.1:8000",
        },
      },
});
