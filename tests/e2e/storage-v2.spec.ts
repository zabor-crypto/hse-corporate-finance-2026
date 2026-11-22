import { test, expect } from "@playwright/test";
import { problems } from "../../src/content";
import {
  baseline,
  clone,
  readProgress,
  importProgress,
  exportProgress,
  seedLegacyProgressBeforeBoot,
  openProblem,
  fillAnswer,
  submitPractice,
  assertNoPageErrors,
  startIsolated,
  STORAGE_KEY,
} from "./helpers";
const target = problems.find((p) => p.id === "C3-RF03")!;
test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));
test("v1 original bytes and nine full historical records survive a new durable grade", async ({
  page,
}) => {
  await seedLegacyProgressBeforeBoot(page, baseline);
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(9);
  const original = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  await openProblem(page, target);
  await fillAnswer(page, target);
  await submitPractice(page);
  const exported = await exportProgress(page);
  expect(exported.schemaVersion).toBe(1);
  expect(exported.answers.slice(0, 9)).toEqual(baseline.answers);
  expect(exported.answers).toHaveLength(10);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(original);
  await page.reload();
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(10);
  expect((await readProgress(page))!.answers.slice(0, 9)).toEqual(
    baseline.answers,
  );
});
test("latest incomplete raw draft survives immediate reload before the debounce window", async ({
  page,
}) => {
  await openProblem(page, target);
  const stage = target.independent!.stageIds[0];
  const field = page.locator(`[id="${target.id}-${stage}"]`);
  await field.fill("−1,");
  await page.reload();
  await expect(page.locator(`[id="${target.id}-${stage}"]`)).toHaveValue("−1,");
  await page
    .getByLabel("Ваше объяснение", { exact: true })
    .fill("Unreviewed latest explanation 123");
  await page.reload();
  await expect(page.getByLabel("Ваше объяснение", { exact: true })).toHaveValue(
    "Unreviewed latest explanation 123",
  );
  const exported = await exportProgress(page);
  const key = `practice:${target.id}@${target.version}`;
  expect(exported.drafts[key].values[stage]).toBe("−1,");
  expect(exported.drafts[key].values.reasoning).toBe(
    "Unreviewed latest explanation 123",
  );
  expect(exported.answers).toHaveLength(0); // draft text never becomes a graded semantic answer
});
test("1000 full original snapshots roundtrip through durable import without truncation", async ({
  page,
}) => {
  const data = clone(baseline);
  data.answers = Array.from({ length: 1000 }, (_, i) => ({
    ...clone(baseline.answers[i % baseline.answers.length]),
    id: `UI-STORAGE-${i}`,
  }));
  await importProgress(page, data);
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(1000);
  await page.reload();
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(1000);
  const exported = await exportProgress(page);
  expect(exported.answers).toEqual(data.answers);
  // Incoming archive payloads are deduplicated; distinct import audit events remain.
  await importProgress(page, exported);
  expect((await readProgress(page))!.answers).toEqual(data.answers);
  const second = await exportProgress(page);
  expect(second.answers).toEqual(data.answers);
  const status = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(status).toBe(null);
});
test("closed and paginated history does not instantiate every JSON snapshot", async ({
  page,
}) => {
  const data = clone(baseline);
  data.answers = Array.from({ length: 100 }, (_, i) => ({
    ...clone(baseline.answers[0]),
    id: `HISTORY-${i}`,
    mode: "practice",
  }));
  await importProgress(page, data);
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(100);
  await expect(page.locator(".history pre")).toHaveCount(0);
  await page.locator(".history>summary").click();
  await expect(page.locator(".history pre")).toHaveCount(0);
  await expect(page.locator(".history>div:has(>b)")).toHaveCount(25);
  await page
    .locator(".history summary")
    .filter({ hasText: "Исходный ответ и версия задания" })
    .first()
    .click();
  await expect(page.locator(".history pre")).toHaveCount(1);
  await page.getByRole("button", { name: "Следующие 25", exact: true }).click();
  await expect(page.locator(".history pre")).toHaveCount(0);
  await expect(page.locator(".history>div:has(>b)")).toHaveCount(25);
});

test("selected-module credit is independent of which other pack was loaded", async ({
  page,
  browser,
}) => {
  const variant = problems.find(
    (p) => p.transfer?.familyId === "nwc-cash" && p.transfer.seed === 0,
  )!;
  await openProblem(page, variant);
  await fillAnswer(page, variant);
  await submitPractice(page);
  const source = clone((await readProgress(page))!);
  expect(source.answers).toHaveLength(1);
  const base = new URL(page.url()).origin + "/hse-corporate-finance-2026/";
  const context = await browser.newContext({
    baseURL: base,
    viewport: page.viewportSize() ?? undefined,
  });
  const errors: string[] = [];
  try {
    const target = await context.newPage();
    target.on("pageerror", (e) => errors.push(e.message));
    await target.goto("./#/home/T4");
    await expect(target.locator(".topbar strong")).toHaveText("T4");
    await importProgress(target, source);
    const metric = () =>
      target.getByText(
        /Новый вариант с первой самостоятельной попытки без отмеченной помощи:/,
      );
    await expect(metric()).toContainText("помощи: 0.");
    await expect(
      target.getByRole("heading", {
        name: "В выбранной теме пока нет текущих попыток",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      target.getByRole("heading", {
        name: "Все последние ответы верны",
        exact: true,
      }),
    ).toHaveCount(0);
    const before = clone((await readProgress(target))!);
    await target.goto("#/home/T3");
    await expect(target.locator(".topbar strong")).toHaveText("T3");
    await target.goto("#/home/T4");
    await expect(target.locator(".topbar strong")).toHaveText("T4");
    await target.goto("#/progress");
    await expect(metric()).toContainText("помощи: 0.");
    await expect(
      target.getByRole("heading", {
        name: "В выбранной теме пока нет текущих попыток",
        exact: true,
      }),
    ).toBeVisible();
    expect(await readProgress(target)).toEqual(before);
    await target.goto("#/home/T3");
    await expect(target.locator(".topbar strong")).toHaveText("T3");
    await target.goto("#/progress");
    await expect(metric()).toContainText("помощи: 1.");
    expect(await readProgress(target)).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
