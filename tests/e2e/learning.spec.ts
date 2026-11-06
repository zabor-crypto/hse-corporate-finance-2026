import { test, expect } from "@playwright/test";
import { lessons, formulas } from "../../src/content";
import {
  assertNoPageErrors,
  startIsolated,
  noPageOverflow,
  screenshotEvidence,
  SUBPATH,
} from "./helpers";

test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));

test("Pages subdirectory loads assets, version, navigation and keyboard skip link", async ({
  page,
}) => {
  expect(new URL(page.url()).pathname).toBe(SUBPATH);
  const version = page.getByTestId("build-version");
  await expect(version).toContainText(/0\.3\.0/);
  await expect(version).toContainText(/[0-9a-f]{7,40}/i);
  const assetUrls = await page
    .locator("script[src],link[rel=stylesheet]")
    .evaluateAll((nodes) =>
      nodes.map(
        (n) => (n as HTMLScriptElement).src || (n as HTMLLinkElement).href,
      ),
    );
  expect(assetUrls.length).toBeGreaterThan(1);
  for (const asset of assetUrls.filter(
    (x) => new URL(x).origin === new URL(page.url()).origin,
  )) {
    expect(new URL(asset).pathname).toMatch(/^\/hse-corporate-finance-2026\//);
    expect((await page.request.get(asset)).status()).toBe(200);
  }
  const originalHash = new URL(page.url()).hash;
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "К содержанию", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  expect(new URL(page.url()).hash).toBe(originalHash);
  await page
    .getByRole("link", { name: "Начать обучение", exact: false })
    .click();
  await expect(page).toHaveURL(/#\/learn\/T3-01$/);
  await noPageOverflow(page);
});

for (const lessonId of ["T3-01", "T3-03", "T3-05", "T3-06", "T3-07", "T3-08"]) {
  test(`lesson ${lessonId} has accessible mathematical teaching and local overflow control`, async ({
    page,
  }, info) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    expect(lesson, `Required completed lesson ${lessonId}`).toBeTruthy();
    await page.goto(`#/learn/${lessonId}`);
    await expect(
      page.getByRole("heading", { name: lesson!.title, exact: true }),
    ).toBeVisible();
    expect(lesson!.sections.length).toBeGreaterThanOrEqual(4);
    const body = page.locator(".lesson-body");
    expect((await body.innerText()).length).toBeGreaterThan(2000);
    expect(await body.locator("math").count()).toBeGreaterThan(0);
    await expect(body.locator(".katex-error")).toHaveCount(0);
    const examples = body.locator(".worked-example");
    expect(await examples.count()).toBeGreaterThan(0);
    const firstExample = examples.first();
    await firstExample
      .getByRole("button", { name: "Показать пошаговый разбор", exact: false })
      .click();
    await expect(firstExample).toContainText("ШАГ 1");
    await firstExample
      .getByRole("button", { name: "Скрыть разбор", exact: true })
      .click();
    await expect(
      firstExample.getByRole("button", {
        name: "Показать пошаговый разбор",
        exact: false,
      }),
    ).toBeVisible();
    await noPageOverflow(page);
    if (["T3-05", "T3-06", "T3-07", "T3-08"].includes(lessonId))
      await screenshotEvidence(page, info, `lesson-${lessonId}`);
  });
}

test("entire formula reference renders MathML without page overflow", async ({
  page,
}, info) => {
  await page.goto("#/formulas");
  await expect(page.locator(".formula-card")).toHaveCount(formulas.length);
  expect(formulas.length).toBeGreaterThanOrEqual(15);
  expect(await page.locator(".formula-card math").count()).toBe(
    formulas.length,
  );
  await expect(page.locator(".katex-error")).toHaveCount(0);
  await noPageOverflow(page);
  await screenshotEvidence(page, info, "all-formulas");
});

test("unknown routes and IDs remain recoverable", async ({ page }) => {
  for (const route of [
    "missing",
    "practice/REMOVED",
    "learn/REMOVED",
    "formulas/REMOVED",
  ]) {
    await page.goto(`#/${route}`);
    await expect(page.locator("main")).toBeVisible();
    await noPageOverflow(page);
  }
  await page.goto("#/home");
  await expect(
    page.getByRole("heading", { name: /Финансы складываются/ }),
  ).toBeVisible();
});
