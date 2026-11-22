import { expect, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Problem } from "../../src/content/types";
import type { Progress } from "../../src/storage/progress";

export const SUBPATH = "/hse-corporate-finance-2026/";
export const STORAGE_KEY = "cflos.progress.v1";
export const secondaryOrigin = `http://127.0.0.1:5183${SUBPATH}`;
export const baseline = JSON.parse(
  readFileSync(
    new URL("../fixtures/baseline-v1-progress.json", import.meta.url),
    "utf8",
  ),
) as Progress;
export const originalKeys = (
  JSON.parse(
    readFileSync(
      new URL("../fixtures/original-bank-oracles.json", import.meta.url),
      "utf8",
    ),
  ) as {
    answers: Record<
      string,
      { selected?: string[]; values?: Record<string, string> }
    >;
  }
).answers;
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const errors = new WeakMap<Page, string[]>();
export async function assertNoPageErrors(page: Page) {
  expect(errors.get(page) ?? []).toEqual([]);
}
export async function startIsolated(page: Page) {
  const observed: string[] = [];
  errors.set(page, observed);
  page.on("pageerror", (error) => observed.push(error.message));
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      response.url().startsWith("http://127.0.0.1:5182/")
    )
      observed.push(`HTTP ${response.status()} ${response.url()}`);
  });
  // Every Playwright test owns an ephemeral browser context. Never use a real profile.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.goto("./");
  await expect(page.locator("main")).toBeVisible();
}
/** Read actual canonical IDB bytes. No application write or in-memory shortcut. */
export async function readProgress(page: Page): Promise<Progress | null> {
  return page.evaluate(async (key) => {
    const env = await new Promise<any>((resolve) => {
      const r = indexedDB.open("cflos.progress.v2");
      r.onupgradeneeded = () => r.transaction?.abort();
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains("state")) {
          db.close();
          resolve(null);
          return;
        }
        const tx = db.transaction("state", "readonly"),
          q = tx.objectStore("state").get("current");
        q.onsuccess = () => resolve(q.result ?? null);
        q.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      };
    });
    if (!env) {
      const bytes = localStorage.getItem(key);
      return bytes ? JSON.parse(bytes) : null;
    }
    if (env.revision === 0 && env.legacyRaw === null) return null; // pristine initialized store, no saved session yet
    const s = env.data;
    if (s.format !== "snapshot-pool-v1")
      throw Error("Unexpected canonical storage format");
    const answers = s.answers.map((a: any) =>
      Object.fromEntries(
        a.keys.map((k: string) => [
          k,
          k === "problemSnapshot" ? s.snapshots[a.snapshotIndex] : a.record[k],
        ]),
      ),
    );
    return Object.fromEntries(
      s.keys.map((k: string) => [k, k === "answers" ? answers : s.meta[k]]),
    );
  }, STORAGE_KEY);
}
/** Synthetic pre-update setup occurs before app boot; never reinterpret a changed legacy copy. */
export async function seedLegacyProgressBeforeBoot(page: Page, data: Progress) {
  const origin = new URL(page.url());
  await page.goto(origin.origin + SUBPATH + "build-info.json");
  await page.evaluate(
    async ({ key, data }) => {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.deleteDatabase("cflos.progress.v2");
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
        r.onblocked = () =>
          reject(Error("Synthetic test database still in use"));
      });
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, data },
  );
  await page.goto(origin.origin + SUBPATH);
}
export async function importProgress(
  page: Page,
  data: unknown,
  fileName = "synthetic-progress.json",
) {
  await page.goto("#/progress");
  const input = page.getByLabel("Импорт прогресса", { exact: true });
  await input.setInputFiles({
    name: fileName,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(input).toHaveValue(""); // handler resets only after durable import acknowledgement/error
}
export async function exportProgress(page: Page): Promise<Progress> {
  await page.goto("#/progress");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const download = await downloadEvent;
  const file = await download.path();
  if (!file) throw new Error("Export download did not produce a file");
  return JSON.parse(readFileSync(file, "utf8"));
}
export async function openProblem(page: Page, p: Problem) {
  await page.goto(`#/practice/${p.id}`);
  await expect(
    page.getByRole("heading", { name: p.title, exact: true }),
  ).toBeVisible();
}
export async function fillAnswer(
  page: Page,
  p: Problem,
  answer?: { selected?: string[]; values?: Record<string, string> },
) {
  const selected = answer?.selected ?? p.correctOptionIds ?? [];
  for (const id of selected) {
    const option = p.options?.find((x) => x.id === id);
    if (!option) throw new Error(`Unknown option ${p.id}/${id}`);
    await page
      .getByRole(p.type === "single" ? "radio" : "checkbox", {
        name: option.label,
        exact: true,
      })
      .check();
  }
  const requested = p.independent?.stageIds ?? p.stages.map((s) => s.id);
  for (const stage of p.stages.filter((s) => requested.includes(s.id))) {
    const field = page.locator(`[id="${p.id}-${stage.id}"]`);
    await expect(field).toBeVisible();
    await field.fill(answer?.values?.[stage.id] ?? String(stage.expected));
    await page
      .getByLabel(`Единица ответа: ${stage.label}`, { exact: true })
      .selectOption(referenceUnit(stage.unit));
  }
}
export async function submitPractice(page: Page, score = 1) {
  await page
    .getByRole("button", { name: "Проверить ответ", exact: false })
    .click();
  await expect
    .poll(async () => (await readProgress(page))?.answers.at(-1)?.score)
    .toBe(score);
}
export async function noPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
}
export async function screenshotEvidence(
  page: Page,
  info: TestInfo,
  name: string,
) {
  const file = info.outputPath(`${name}.png`);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
  await page.screenshot({
    path: file,
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await info.attach(name, { path: file, contentType: "image/png" });
}

export function referenceUnit(label: string) {
  const map: Record<string, string> = {
    "млн ₽": "million-rub",
    "тыс. ₽": "thousand-rub",
    "₽": "rub",
    "%": "percent",
    "п.п.": "percentage-point",
    раз: "multiple",
    раза: "multiple",
    дни: "day",
    дней: "day",
  };
  if (!map[label]) throw new Error(`Unsupported test unit ${label}`);
  return map[label];
}
export async function setNumeric(
  page: Page,
  p: Problem,
  stageId: string,
  value: string,
  unit?: string,
) {
  const stage = p.stages.find((s) => s.id === stageId)!;
  await page.locator(`[id="${p.id}-${stageId}"]`).fill(value);
  await page
    .getByLabel(`Единица ответа: ${stage.label}`, { exact: true })
    .selectOption(unit ?? referenceUnit(stage.unit));
}

export async function revealSupport(page: Page) {
  const button = page.getByRole("button", {
    name: "Показать опоры · отметить использование помощи",
    exact: true,
  });
  if (await button.count()) await button.click();
}

/** Optional MC reflection is a deliberate disclosure, never an always-open essay requirement. */
export async function openReflection(page: Page) {
  const input = page.getByLabel("Ваше объяснение", { exact: true });
  if ((await input.count()) && !(await input.isVisible())) {
    await page
      .locator("details.reasoning-box>summary")
      .filter({ hasText: "Объяснить выбор · по желанию" })
      .click();
    await expect(input).toBeVisible();
  }
}
/** The primary mechanism route is compact; all original teaching remains available on request. */
export async function openLegacyReference(page: Page) {
  const reference = page.locator("details.lesson-reference");
  if (
    (await reference.count()) &&
    !(await reference.evaluate((e) => (e as HTMLDetailsElement).open))
  ) {
    await reference.locator(":scope>summary").click();
    await expect(reference).toHaveAttribute("open", "");
  }
  if (await reference.count())
    await expect(
      reference.locator('nav[aria-label="Разделы полного справочника"]'),
    ).toBeVisible();
}
export async function waitForLoadedHeading(page: Page) {
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main h1")).not.toContainText("Загрузка");
}
