import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { lessons, formulas, problems, sampleExamIds } from "../../src/content";
import { curriculumRegistry, assemblePaper } from "../../src/curriculum";
import { c3Blueprints } from "../../src/curriculum/blueprints";
import { blankProgress, type Progress } from "../../src/storage/progress";
import { fillAnswer, referenceUnit } from "./helpers";
const KEY = "cflos.progress.v1";
const packageVersion = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
const widths = [320, 375, 390, 768, 1024, 1440, 1920];
const base = "http://127.0.0.1:5190/hse-corporate-finance-2026/";
const second = "http://127.0.0.1:5191/hse-corporate-finance-2026/";
const observed = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  observed.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && /^http:\/\/127\.0\.0\.1:519[01]\//.test(r.url()))
      errors.push(`HTTP${r.status()} ${r.url()}`);
  });
});
test.afterEach(async ({ page }) => expect(observed.get(page)).toEqual([]));
async function read(page: Page): Promise<Progress> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}
async function open(page: Page, url = base) {
  await page.goto(url);
  await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function route(page: Page, path: string) {
  await page.goto("#/" + path);
  const [kind, id, anchor] = path.split("/");
  if (kind === "learn") {
    await expect(page.locator("main h1")).toHaveText(
      lessons.find((l) => l.id === id)!.title,
    );
    if (anchor) await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1);
  } else if (kind === "practice" && id)
    await expect(page.locator(".problem-prompt")).toHaveText(
      problems.find((p) => p.id === id)!.independent?.prompt ??
        problems.find((p) => p.id === id)!.prompt,
    );
  else if (kind === "formulas")
    await expect(page.locator(".formula-card")).toHaveCount(
      id ? 1 : formulas.length,
    );
  else await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
function targetExists(href: string) {
  const [kind, id, section] = href.slice(2).split("/");
  if (kind === "learn")
    return lessons.some(
      (l) =>
        l.id === id && (!section || l.sections.some((s) => s.id === section)),
    );
  if (kind === "formulas") return !id || formulas.some((f) => f.id === id);
  if (kind === "practice") return !id || problems.some((p) => p.id === id);
  return ["home", "curriculum", "ratios", "progress", "exam"].includes(kind);
}
async function screenshot(
  page: Page,
  info: TestInfo,
  name: string,
  fullPage = true,
) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const file = info.outputPath(name + ".png");
  await page.screenshot({
    path: file,
    fullPage: fullPage && height < 32700,
    scale: "css",
    animations: "disabled",
  });
  await info.attach(name, { path: file, contentType: "image/png" });
}
async function importData(page: Page, data: unknown, url = base) {
  await page.goto(url + "#/progress");
  await page.getByLabel("Импорт прогресса", { exact: true }).setInputFiles({
    name: "qa-synthetic.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Копия импортирована" }),
  ).toBeVisible();
}
async function submit(page: Page, score: number) {
  await page
    .getByRole("button", { name: "Проверить ответ", exact: true })
    .click();
  await expect
    .poll(async () => (await read(page)).answers.at(-1)?.score)
    .toBe(score);
}

for (const width of widths)
  test(`complete course ${width}: actual route crawler, 11 lessons, 51 formulas, AA`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await expect(page.locator(".local-badge")).toContainText(packageVersion);
    const seen = new Set<string>();
    const initial = [
      "home",
      "curriculum",
      "practice",
      "exam",
      "progress",
      "ratios",
      "formulas",
      ...lessons.map((l) => "learn/" + l.id),
    ];
    const crawled: string[] = [];
    for (const path of initial) {
      await route(page, path);
      await fits(page);
      for (const href of await page
        .locator('a[href^="#/"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!))) {
        expect(targetExists(href), path + "→" + href).toBe(true);
        seen.add(href);
      }
      await expect(page.locator('.sources a[href$=".pdf"]')).toHaveCount(0);
      for (const text of await page.locator(".sources").allTextContents())
        expect(text).not.toMatch(/слайды[^;]*·\s*слайды/);
      if (path.startsWith("learn/")) {
        const lesson = lessons.find((l) => path === "learn/" + l.id)!;
        const desktopToc = page.locator("aside.toc");
        const mobileToc = page.locator("details.mobile-toc");
        const desktopVisible = await desktopToc.isVisible();
        const mobileVisible = await mobileToc.isVisible();
        expect(
          desktopVisible || mobileVisible,
          "A visible contents control at " + width,
        ).toBe(true);
        const lastSection = lesson.sections.at(-1)!;
        if (desktopVisible) {
          await desktopToc.locator(`a[href="#${lastSection.id}"]`).click();
        } else {
          await mobileToc.locator("summary").click();
          await mobileToc
            .locator(`a[href="#/learn/${lesson.id}/${lastSection.id}"]`)
            .click();
          await expect(page).toHaveURL(
            new RegExp("#/learn/" + lesson.id + "/" + lastSection.id + "$"),
          );
        }
        await expect(page.locator(`[id="${lastSection.id}"]`)).toBeInViewport();
        const sizes = await page
          .locator(".lesson-body section > p")
          .evaluateAll((nodes) =>
            nodes.map((n) => parseFloat(getComputedStyle(n).fontSize)),
          );
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
        for (const frame of await page.locator(".math-scroll").all()) {
          await frame.scrollIntoViewIfNeeded();
          await expect(frame.locator("math")).toHaveCount(1);
          await expect(frame.locator(".katex-html")).toBeVisible();
        }
      }
      if (path === "curriculum") {
        for (const [seminar, link, status, note] of [
          [
            "3.7",
            "learn/T3-11",
            "Нужны явные предпосылки",
            "полная условная трёхлетняя модель",
          ],
          ["3.8", "learn/T3-09", "Есть учебный разбор", "C3-Q08"],
        ]) {
          const card = page.locator(".competency-card").filter({
            has: page.locator(".eyebrow", { hasText: "Задача " + seminar }),
          });
          await expect(card.locator(".tag")).toHaveText(status);
          await expect(card.locator(`a[href="#/${link}"]`)).toBeVisible();
          const coverage = card.locator("details").filter({
            has: page.getByText("Покрытие и неоднозначности условия", {
              exact: true,
            }),
          });
          await coverage.locator("summary").click();
          await expect(coverage.locator("p")).toContainText(note);
          await expect(coverage.locator("p")).not.toContainText(
            "не реализован",
          );
          await coverage.locator("summary").click();
        }
      }
      if (path === "formulas") {
        for (const f of formulas) {
          const card = page.locator(`[id="${f.id}"]`);
          await card.scrollIntoViewIfNeeded();
          await expect(card.locator("math")).toHaveCount(1);
          await expect(card.locator(".katex-html")).toBeVisible();
        }
        await expect(page.locator(".katex-error")).toHaveCount(0);
        expect(
          await page.evaluate(() =>
            Array.from(document.fonts).some(
              (f) => f.status === "loaded" && f.family.includes("KaTeX"),
            ),
          ),
        ).toBe(true);
      }
      if (
        ["home", "curriculum", "progress", "formulas", "ratios"].includes(
          path,
        ) ||
        path.startsWith("learn/")
      ) {
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          axe.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
      }
      if (
        [390, 1440].includes(width) &&
        (["home", "curriculum"].includes(path) ||
          ["T3-02", "T3-04", "T3-09", "T3-10", "T3-11"].some(
            (id) => path === "learn/" + id,
          ))
      )
        await screenshot(page, info, path.replace("/", "-") + "-" + width);
      if (path === "learn/T3-11") {
        await expect(page.locator(".model-table-scroll")).toHaveCount(3);
        for (const table of await page.locator(".model-table-scroll").all()) {
          await expect(table.locator("thead th")).toHaveCount(4);
          await expect(table.locator('th[scope="row"]').first()).toBeVisible();
          if (width <= 390)
            expect(
              await table.evaluate((e) => e.scrollWidth > e.clientWidth),
            ).toBe(true);
          await table.focus();
          await expect(table).toBeFocused();
        }
        await page
          .getByRole("combobox", { name: "Сценарий", exact: true })
          .selectOption("growthUnfunded");
        await expect(page.locator("main")).toContainText(
          "нужно финансирование",
        );
        await fits(page);
      }
    }
    // Every published direct route is actually visited at every supported width/engine.
    for (const p of problems) seen.add("#/practice/" + p.id);
    for (const f of formulas) seen.add("#/formulas/" + f.id);
    for (const href of seen) {
      await route(page, href.slice(2));
      await fits(page);
      crawled.push(href);
    }
    await route(page, "home");
    await page.locator(".skip").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    if (width <= 600) {
      await page.getByRole("button", { name: /Открыть меню/ }).click();
      await expect(
        page.getByRole("button", { name: /Закрыть меню/ }),
      ).toHaveAttribute("aria-expanded", "true");
    }
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Мой прогресс", exact: true })
      .click();
    await expect(page.locator("main h1")).toHaveText(
      "Каждая ошибка — следующий шаг.",
    );
    const touch = await page
      .locator(
        ".button:visible,.nav-item:visible,summary:visible,select:visible",
      )
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.getBoundingClientRect().height < 43)
          .map((n) => ({
            text: n.textContent?.slice(0, 80),
            height: n.getBoundingClientRect().height,
          })),
      );
    expect(touch).toEqual([]);
    await info.attach("actual-crawler", {
      body: JSON.stringify({
        width,
        browser: info.project.name,
        crawled,
        lessons: lessons.length,
        formulas: formulas.length,
        problems: problems.length,
      }),
      contentType: "application/json",
    });
  });

test("wrong attempt → targeted theory → saved question; negative, tolerance, unit, exact set and zero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await open(page);
  const p = problems.find((p) => p.id === "T3-Q06")!,
    s = p.stages[0];
  await route(page, "practice/" + p.id);
  await page
    .locator(`[id="${p.id}-${s.id}"]`)
    .fill(String(Math.abs(s.expected)));
  await page
    .getByLabel("Единица ответа: " + s.label, { exact: true })
    .selectOption(referenceUnit(s.unit));
  await submit(page, 0);
  await page
    .getByRole("link", {
      name: "Вернуться к экономической логике",
      exact: true,
    })
    .click();
  expect(page.url()).toContain("#/learn/" + p.lessonId + "/");
  await page
    .getByRole("button", { name: "К заданию · черновик сохранён" })
    .click();
  await expect(page.locator(`[id="${p.id}-${s.id}"]`)).toHaveValue(
    String(Math.abs(s.expected)),
  );
  await page
    .locator(`[id="${p.id}-${s.id}"]`)
    .fill(String(s.expected + s.tolerance * 0.8).replace(".", ","));
  await submit(page, 1);
  await page
    .getByLabel("Единица ответа: " + s.label, { exact: true })
    .selectOption("thousand-rub");
  await submit(page, 0);
  const multi = problems.find((p) => p.id === "T3-Q03")!;
  await route(page, "practice/" + multi.id);
  const extra = multi.options!.find(
    (o) => !multi.correctOptionIds!.includes(o.id),
  )!;
  await fillAnswer(page, multi);
  await page.getByRole("checkbox", { name: extra.label, exact: true }).check();
  await submit(page, 0);
  await page
    .getByRole("checkbox", { name: extra.label, exact: true })
    .uncheck();
  await submit(page, 1);
  const zero = problems.find((p) => p.id === "T3-V-RET-2")!;
  await route(page, "practice/" + zero.id);
  await fillAnswer(page, zero);
  await submit(page, 1);
  expect((await read(page)).answers.at(-1)!.userResponse.values.ep).toBe("0");
});

test("published paper timebox, no method leaks, archive and old/new cross-origin restore", async ({
  page,
  browser,
}, info) => {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await open(page);
  const template = c3Blueprints.find((b) => b.id === "C3-SHORT-A")!;
  expect(template.reviewStatus).toBe("PUBLISHED");
  await route(page, "exam");
  await page.getByLabel("Номер набора (seed)").fill("17");
  await page
    .getByRole("button", { name: "Собрать C3-SHORT-A", exact: true })
    .click();
  await expect(page.locator(".question-title")).toHaveText("Задание 1");
  const paper = (await read(page)).exam!.paper!;
  expect(paper.blueprint.id).toBe(template.id);
  expect(paper.seed).toBe(17);
  expect(paper.problemIds).toHaveLength(6);
  for (let i = 0; i < paper.problemIds.length; i++) {
    await page
      .getByRole("button", { name: "Вопрос " + (i + 1), exact: true })
      .click();
    await expect(page.locator(".question-title")).toHaveText(
      "Задание " + (i + 1),
    );
    await expect(
      page.locator(".feedback,.support-card,.assumptions,.formula-card,.hint"),
    ).toHaveCount(0);
    const p = problems.find((p) => p.id === paper.problemIds[i])!;
    expect(await page.locator(".answer-stage").count()).toBe(
      p.independent?.stageIds.length ?? p.stages.length,
    );
  }
  await page.getByRole("button", { name: "Вопрос 1", exact: true }).click();
  await fillAnswer(
    page,
    problems.find((p) => p.id === paper.problemIds[0])!,
  );
  await page.clock.fastForward(template.minutes * 60000 + 1001);
  await expect(page.getByRole("timer")).toContainText("Время истекло");
  expect(
    await page
      .locator(
        "article.panel input,article.panel select,article.panel textarea",
      )
      .evaluateAll((nodes) =>
        nodes.every((n) => (n as HTMLInputElement).disabled),
      ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Завершить и проверить", exact: true })
    .click();
  await expect(page.locator("main h1")).toContainText(
    "Числа и выбор вариантов:",
  );
  await expect(
    page.getByRole("button", { name: "Новая попытка", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Выбрать новый вариант", exact: true })
    .click();
  expect(
    (await read(page)).archives.some((a: any) => a.session?.paper?.seed === 17),
  ).toBe(true);
  await route(page, "progress");
  const error = page.locator("section.panel").filter({
    has: page.getByRole("heading", {
      name: "Журнал ошибок и повторная проверка",
      exact: true,
    }),
  });
  const entry = error.locator("article").first();
  await entry
    .getByRole("combobox", { name: "Моя причина ошибки", exact: true })
    .selectOption("timing");
  await entry
    .getByLabel("Что проверить в следующий раз", { exact: true })
    .fill("QA: сначала сопоставить даты.");
  await entry
    .getByRole("button", { name: "Сохранить мою отметку", exact: true })
    .click();
  expect((await read(page)).errorReviews?.at(-1)?.category).toBe("timing");
  const baseline = JSON.parse(
    readFileSync(
      new URL("../fixtures/baseline-v1-progress.json", import.meta.url),
      "utf8",
    ),
  );
  await importData(page, baseline);
  const before = await read(page);
  for (const record of baseline.answers)
    expect(before.answers.find((a) => a.id === record.id)).toEqual(record);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
  const download = await downloadEvent;
  const file = info.outputPath("synthetic-old-new-paper.json");
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, "utf8"));
  await info.attach("synthetic-roundtrip", {
    path: file,
    contentType: "application/json",
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
  });
  try {
    const imported = await context.newPage();
    await importData(imported, exported, second);
    const restored = await read(imported);
    expect(restored.answers).toEqual(exported.answers);
    expect(restored.errorReviews).toEqual(exported.errorReviews);
    expect(
      restored.archives.some((a: any) => a.session?.paper?.seed === 17),
    ).toBe(true);
    const bytes = await imported.evaluate(
      (key) => localStorage.getItem(key),
      KEY,
    );
    await imported
      .getByLabel("Импорт прогресса", { exact: true })
      .setInputFiles({
        name: "broken.json",
        mimeType: "application/json",
        buffer: Buffer.from("{bad"),
      });
    await expect(imported.getByRole("status")).not.toContainText(
      "Копия импортирована",
    );
    expect(
      await imported.evaluate((key) => localStorage.getItem(key), KEY),
    ).toBe(bytes);
    await imported.reload();
    expect((await read(imported)).answers).toEqual(exported.answers);
  } finally {
    await context.close();
  }
});

test("withdrawn active task recovers to current paper with original session retained", async ({
  page,
}) => {
  await open(page);
  const data = blankProgress();
  data.exam = {
    id: "QA-WITHDRAWN",
    problemIds: ["QA-REMOVED"],
    versions: { "QA-REMOVED": "1.0.0" },
    startedAt: new Date().toISOString(),
  };
  await importData(page, data);
  await route(page, "exam");
  await expect(page.locator("main h1")).toHaveText("Задания обновились");
  await page
    .getByRole("button", { name: "Начать новую версию", exact: true })
    .click();
  const next = await read(page);
  expect(next.exam?.problemIds).toEqual(sampleExamIds);
  expect(next.archives.some((a: any) => a.session?.id === "QA-WITHDRAWN")).toBe(
    true,
  );
  await page.reload();
  await expect(page.locator(".question-title")).toHaveText("Задание 1");
});

test("all published blueprints assemble in UI and retain exact passports", async ({
  page,
}) => {
  await open(page);
  await route(page, "exam");
  for (const template of c3Blueprints) {
    await page.getByLabel("Номер набора (seed)").fill("123");
    await page
      .getByRole("button", { name: "Собрать " + template.id, exact: true })
      .click();
    await expect(page.locator(".question-title")).toHaveText("Задание 1");
    const active = (await read(page)).exam!;
    expect(active.paper!.blueprint).toEqual(template);
    expect(active.paper!.seed).toBe(123);
    expect(active.problemIds).toHaveLength(template.slots.length);
    expect(new Set(active.paper!.familyIds).size).toBe(template.slots.length);
    await expect(
      page.locator(".feedback,.hint,.assumptions,.formula-card,.support-card"),
    ).toHaveCount(0);
    if (template.id === "C3-THEORY-40")
      expect(active.problemIds).toEqual(
        Array.from(
          { length: 40 },
          (_, i) => "C3-T" + String(i + 1).padStart(2, "0"),
        ),
      );
    await page
      .getByRole("button", { name: "Завершить и проверить", exact: true })
      .click();
    await expect(page.locator("main h1")).toContainText(
      "Числа и выбор вариантов:",
    );
    await page
      .getByRole("button", { name: "Выбрать новый вариант", exact: true })
      .click();
    const next = await read(page);
    expect(next.exam).toBeNull();
    expect((next.archives.at(-1) as any).session.paper).toEqual(active.paper);
  }
});

test("C3-R01 final outputs preserve after-tax scale and partial scores", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await open(page);
  const p = problems.find((p) => p.id === "C3-R01")!;
  await route(page, "practice/" + p.id);
  await expect(page.locator('[id="C3-R01-ni"]')).toHaveCount(0);
  await fillAnswer(page, p);
  await submit(page, 1);
  const first = (await read(page)).answers.at(-1)!;
  expect(new Set(first.assessedStageIds)).toEqual(
    new Set(["roc-gross", "nopat", "interest-after-tax"]),
  );
  expect(first.reasoningStatus).toBe("NOT_SUBMITTED");
  await page
    .locator('[id="C3-R01-interest-after-tax"]')
    .fill(String(75 * 0.6 * 0.09 * 0.75));
  await submit(page, 2 / 3);
  const next = (await read(page)).answers.at(-1)!;
  expect(
    next.stageResults.find((s) => s.id === "interest-after-tax")!.correct,
  ).toBe(false);
  await page.reload();
  expect((await read(page)).answers.find((a) => a.id === first.id)).toEqual(
    first,
  );
  await fits(page);
});
