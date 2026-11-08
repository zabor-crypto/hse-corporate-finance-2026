import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "c3-complete.spec.ts",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 8000 },
  outputDir:
    process.env.CFLOS_QA_OUTPUT ??
    "/tmp/cflos-c3-v1/qa-complete/browser-results",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.CFLOS_QA_REPORT ??
          "/tmp/cflos-c3-v1/qa-complete/browser.json",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:5190/hse-corporate-finance-2026/",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    actionTimeout: 12000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "c3-chromium", use: { browserName: "chromium" } },
    { name: "c3-webkit", use: { browserName: "webkit" } },
  ],
  webServer: [5190, 5191].map((port) => ({
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/hse-corporate-finance-2026/`,
    reuseExistingServer: false,
    timeout: 30_000,
  })),
});
