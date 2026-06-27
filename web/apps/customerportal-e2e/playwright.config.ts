import path from "node:path";

import { nxE2EPreset } from "@nx/playwright/preset";
import { defineConfig, devices } from "@playwright/test";

const workspaceRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(workspaceRoot, "..");
const baseURL = process.env["BASE_URL"] ?? "http://localhost:4300";

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: "./src" }),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
  },
  webServer: [
    {
      command: "bash tools/e2e/start_customerportal_api.sh",
      url: "http://localhost:8082/config?base_url=http%3A%2F%2Flocalhost%3A4300",
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npx nx serve customerportal --host=localhost",
      url: baseURL,
      cwd: workspaceRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
