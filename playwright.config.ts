import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
const explicitChrome = process.env.CFLOS_CHROME_EXECUTABLE;
if (explicitChrome && !existsSync(explicitChrome))
  throw new Error("CFLOS_CHROME_EXECUTABLE does not exist");
const systemChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath =
  explicitChrome || (existsSync(systemChrome) ? systemChrome : undefined);
const subpath = "/hse-corporate-finance-2026/";
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:5182${subpath}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-1440",
      testIgnore: ["**/webkit.spec.ts", "**/c3-complete.spec.ts", "**/c3-ratios-focus.spec.ts"],
      use: {
        browserName: "chromium",
        launchOptions: { executablePath },
        viewport: { width: 1440, height: 1040 },
      },
    },
    {
      name: "mobile-390",
      testIgnore: ["**/webkit.spec.ts", "**/c3-complete.spec.ts", "**/c3-ratios-focus.spec.ts"],
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        defaultBrowserType: "chromium",
        launchOptions: { executablePath },
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "webkit-safari-390",
      testMatch: "**/webkit.spec.ts",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: [
    {
      command: "npm run preview -- --port 5182 --strictPort",
      url: `http://127.0.0.1:5182${subpath}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run preview -- --port 5183 --strictPort",
      url: `http://127.0.0.1:5183${subpath}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
