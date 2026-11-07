import { test, expect } from "@playwright/test";
import {
  assertNoPageErrors,
  startIsolated,
  baseline,
  clone,
  readProgress,
  importProgress,
  exportProgress,
  STORAGE_KEY,
  secondaryOrigin,
  SUBPATH,
} from "./helpers";

test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));

test("pre-update schema1 saved localStorage restores nine original records without reset", async ({
  page,
}) => {
  await page.evaluate(
    ({ key, payload }) => localStorage.setItem(key, JSON.stringify(payload)),
    { key: STORAGE_KEY, payload: baseline },
  );
  await page.reload();
  expect((await readProgress(page))!.answers).toEqual(baseline.answers);
  await page.goto("#/exam");
  await expect(
    page.getByRole("heading", {
      name: /Числа и выбор вариантов: 100%/,
      level: 1,
    }),
  ).toBeVisible();
  expect((await readProgress(page))!.answers).toHaveLength(9);
});

test("historical problem version remains in export and is separated from current practice grades", async ({
  page,
}) => {
  const historical = clone(baseline);
  historical.answers[0].version = "0.9.0";
  (historical.answers[0].problemSnapshot as { version: string }).version =
    "0.9.0";
  await importProgress(page, historical);
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(9);
  const counter = page.locator(".stats-grid > div").nth(2);
  await expect(counter).toContainText("1");
  await expect(counter).toContainText(
    "исторических ответов вне текущего доступного набора",
  );
  const exported = await exportProgress(page);
  expect(exported.answers).toEqual(historical.answers);
  await page.reload();
  expect(
    (await readProgress(page))!.answers.find(
      (a) => a.id === historical.answers[0].id,
    )?.version,
  ).toBe("0.9.0");
});

test("incompatible active exam preserves previous grades and drafts before a new attempt", async ({
  page,
}) => {
  const incompatible = clone(baseline);
  delete incompatible.exam!.finishedAt;
  incompatible.exam!.versions[incompatible.exam!.problemIds[0]] = "0.9.0";
  await importProgress(page, incompatible);
  await page.goto("#/exam");
  await expect(
    page.getByRole("heading", { name: "Задания обновились", exact: true }),
  ).toBeVisible();
  expect((await readProgress(page))!.answers).toEqual(baseline.answers);
  await page
    .getByRole("button", { name: "Начать новую версию", exact: true })
    .click();
  const restored = (await readProgress(page))!;
  expect(restored.answers).toEqual(baseline.answers);
  for (const [key, draft] of Object.entries(incompatible.drafts))
    expect(restored.drafts[key]).toEqual(draft);
  expect(restored.exam!.id).not.toBe(incompatible.exam!.id);
});

test("removed task in active exam shows update guard without a render crash", async ({
  page,
}) => {
  const removed = clone(baseline);
  delete removed.exam!.finishedAt;
  removed.exam!.problemIds.push("T3-REMOVED");
  removed.exam!.versions["T3-REMOVED"] = "0.9.0";
  await importProgress(page, removed);
  await page.goto("#/exam");
  await expect(
    page.getByRole("heading", { name: "Задания обновились", exact: true }),
  ).toBeVisible();
  expect((await readProgress(page))!.answers).toHaveLength(9);
});

test("corrupt JSON and malformed nested imports leave exact existing saved bytes untouched", async ({
  page,
}) => {
  await importProgress(page, baseline);
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(9);
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  const file = page.getByLabel("Импорт прогресса", { exact: true });
  await file.setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(before);
  const badSnapshot = clone(baseline);
  badSnapshot.answers[0].problemSnapshot = null;
  await importProgress(page, badSnapshot);
  await expect(
    page.getByText(/Файл не соответствует схеме прогресса/),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(before);
  await page.reload();
  expect((await readProgress(page))!.answers).toEqual(baseline.answers);
});

test("duplicate import does not duplicate grades and conflicting ID does not replace history", async ({
  page,
}) => {
  await importProgress(page, baseline);
  await importProgress(page, baseline);
  expect((await readProgress(page))!.answers).toHaveLength(9);
  const conflicting = clone(baseline);
  conflicting.answers[0].score = 0.5;
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  await importProgress(page, conflicting);
  await expect(page.getByText(/Конфликт записей с одним ID/)).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(before);
});

test("real download and file import transfer grades between two isolated origins under Pages subpath", async ({
  page,
  browser,
}) => {
  await importProgress(page, baseline);
  const sourceExport = await exportProgress(page);
  expect(sourceExport.answers).toEqual(baseline.answers);
  const sourceOrigin = new URL(page.url()).origin;
  const targetContext = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const target = await targetContext.newPage();
    await target.route(
      /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      (route) => route.abort(),
    );
    await target.goto(secondaryOrigin);
    expect(new URL(target.url()).origin).not.toBe(sourceOrigin);
    expect(new URL(target.url()).pathname).toBe(SUBPATH);
    expect(await readProgress(target)).toBe(null);
    await target.goto(`${secondaryOrigin}#/progress`);
    await target.getByLabel("Импорт прогресса", { exact: true }).setInputFiles({
      name: "localhost-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(sourceExport)),
    });
    await expect
      .poll(async () => (await readProgress(target))?.answers.length)
      .toBe(9);
    expect((await readProgress(target))!.answers).toEqual(baseline.answers);
    await target.reload();
    expect((await readProgress(target))!.answers).toEqual(baseline.answers);
    const downloadEvent = target.waitForEvent("download");
    await target
      .getByRole("button", { name: "Экспорт JSON", exact: true })
      .click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const targetExport = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    expect(targetExport.schemaVersion).toBe(1);
    expect(targetExport.answers).toEqual(baseline.answers);
    // This is two genuine localhost origins, not a claim of actual GitHub Pages deployment.
  } finally {
    await targetContext.close();
  }
});
