import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", fullyParallel: false, workers: 1, timeout: 60_000,
  expect: { timeout: 10_000 }, reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100", browserName: "chromium",
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure",
  },
  webServer: { command: "pnpm start --port 3100", url: "http://127.0.0.1:3100/design-preview", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
