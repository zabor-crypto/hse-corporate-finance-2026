import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { problems } from "../../src/content";
import {
  startIsolated,
  assertNoPageErrors,
  noPageOverflow,
  openProblem,
  fillAnswer,
  submitPractice,
  setNumeric,
  readProgress,
  baseline,
  importProgress,
  exportProgress,
  screenshotEvidence,
} from "./helpers";
test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));
test("Safari-like WebKit mobile renders liquidity math and readable lesson", async ({
  page,
}, info) => {
  await page.goto("#/learn/T3-07");
  expect(await page.locator("math").count()).toBeGreaterThan(0);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await noPageOverflow(page);
  expect(
    await page
      .locator(".lesson-body section > p")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await screenshotEvidence(page, info, "webkit-T3-07");
});
test("Safari-like WebKit uses selected units and preserves independent workpad across reload", async ({
  page,
}) => {
  const p = problems.find((p) => p.id === "T3-Q05")!;
  await openProblem(page, p);
  await setNumeric(page, p, p.stages[0].id, "70000", "thousand-rub");
  await page.locator(".workpad summary").click();
  await page
    .getByLabel("Черновик расчётов", { exact: true })
    .fill("70000 тыс. = 70 млн");
  await submitPractice(page);
  await page.reload();
  expect((await readProgress(page))!.answers.at(-1)!.objectiveScore).toBe(1);
  await page.locator(".workpad summary").click();
  await expect(
    page.getByLabel("Черновик расчётов", { exact: true }),
  ).toHaveValue("70000 тыс. = 70 млн");
});
test("Safari-like WebKit retains old nine-record export without rewriting grades", async ({
  page,
}) => {
  await importProgress(page, baseline);
  expect((await readProgress(page))!.answers).toEqual(baseline.answers);
  const exported = await exportProgress(page);
  expect(exported.answers).toEqual(baseline.answers);
});
test("Safari-like WebKit lesson passes tagged AA checks", async ({
  page,
}, info) => {
  await page.goto("#/learn/T3-07");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await info.attach("webkit-axe", {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: "application/json",
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
