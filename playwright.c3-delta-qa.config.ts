import { defineConfig } from "@playwright/test";
const primaryPort = Number(process.env.CFLOS_DELTA_PORT ?? 5202);
const secondaryPort = Number(process.env.CFLOS_DELTA_SECOND_PORT ?? 5203);
if (![primaryPort, secondaryPort].every(p => Number.isInteger(p) && p >= 1024 && p <= 65535) || primaryPort === secondaryPort)
    throw new Error("Use two distinct valid CFLOS_DELTA ports");
export default defineConfig({
    testDir: "./tests/e2e",
    testMatch: "c3-ratios-focus.spec.ts",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 150000,
    expect: { timeout: 8000 },
    outputDir: process.env.CFLOS_DELTA_OUTPUT ?? "/tmp/cflos-c3-review-delta-01/qa/focus-results",
    reporter: [["list"], ["json", { outputFile: process.env.CFLOS_DELTA_REPORT ?? "/tmp/cflos-c3-review-delta-01/qa/focus-browser.json" }]],
    use: {
        baseURL: `http://127.0.0.1:${primaryPort}/hse-corporate-finance-2026/`,
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        actionTimeout: 12000,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        reducedMotion: "reduce",
    },
    projects: ["chromium", "webkit"].flatMap(engine => [1440, 390].map(width => ({
        name: `delta-${engine}-${width}`,
        use: { browserName: engine as "chromium" | "webkit", viewport: { width, height: 1000 }, ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) },
    }))),
    webServer: [primaryPort, secondaryPort].map(port => ({
        command: `npm run preview -- --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}/hse-corporate-finance-2026/`,
        reuseExistingServer: false, timeout: 30000,
    })),
});
