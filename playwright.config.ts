import { defineConfig, devices } from "@playwright/test";

// The end-to-end checks run against the panel on the simulator: start the rig (npm run rig:serve),
// seed it once (npm run rig:seed), then `npm start` (simulator + panel), and `npm run e2e`.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PANEL_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
