import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  startIsolated,
  assertNoPageErrors,
  noPageOverflow,
  screenshotEvidence,
} from "./helpers";
test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));
test("reading and tap areas remain usable across seven CSS viewport widths", async ({
  page,
}, info) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("#/learn/T3-07");
    await noPageOverflow(page);
    const reading = await page
      .locator(".lesson-body section > p")
      .first()
      .evaluate((e) => ({
        font: parseFloat(getComputedStyle(e).fontSize),
        line: parseFloat(getComputedStyle(e).lineHeight),
      }));
    expect(reading.font, `${width}px body font`).toBeGreaterThanOrEqual(16);
    expect(reading.line / reading.font).toBeGreaterThanOrEqual(1.45);
    const small = await page
      .locator(".sources")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(small).toBeGreaterThanOrEqual(12);
    const controls = page.locator("main button:visible,main summary:visible");
    for (let i = 0; i < (await controls.count()); i++) {
      const box = await controls.nth(i).boundingBox();
      if (box)
        expect(
          box.height,
          `${width}px ${await controls.nth(i).innerText()}`,
        ).toBeGreaterThanOrEqual(44);
    }
    if (width === 390 || width === 1440)
      await screenshotEvidence(page, info, `readable-T3-07-${width}`);
  }
});
for (const route of [
  "home",
  "learn/T3-07",
  "practice/T3-Q23",
  "exam",
  "formulas",
])
  test(`axe WCAG AA ${route}`, async ({ page }, info) => {
    await page.goto(`#/${route}`);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    await info.attach("axe-results", {
      body: Buffer.from(JSON.stringify(result, null, 2)),
      contentType: "application/json",
    });
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
test("reduced motion and visible keyboard focus preserve navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "К содержанию", exact: true });
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe(
    "none",
  );
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await noPageOverflow(page);
});
