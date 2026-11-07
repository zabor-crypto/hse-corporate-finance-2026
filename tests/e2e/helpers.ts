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
export async function readProgress(page: Page): Promise<Progress | null> {
  return page.evaluate((key) => {
    const bytes = localStorage.getItem(key);
    return bytes ? JSON.parse(bytes) : null;
  }, STORAGE_KEY);
}
export async function importProgress(
  page: Page,
  data: unknown,
  fileName = "synthetic-progress.json",
) {
  await page.goto("#/progress");
  await page.getByLabel("Импорт прогресса", { exact: true }).setInputFiles({
    name: fileName,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
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
