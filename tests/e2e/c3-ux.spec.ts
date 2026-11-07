import { test, expect, chromium, webkit, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessons, formulas, problems, seminarMap } from "../../src/content";
const base =
  process.env.CFLOS_UX_BASE_URL ??
  "http://127.0.0.1:5182/hse-corporate-finance-2026/";
const widths = [320, 375, 390, 768, 1024, 1440, 1920];
async function visit(page: Page, route: string) {
  await page.goto(`${base}#/${route}`);
  const [section, id] = route.split("/");
  const heading =
    section === "learn"
      ? lessons.find((l) => l.id === id)?.title
      : (
          {
            home: "Финансы складываются",
            curriculum: "Большая картина.",
            formulas: "За формулой — смысл.",
            progress: "Каждая ошибка — следующий шаг.",
            ratios: "Как связаны коэффициенты",
            practice: "Практика",
            exam: "Контрольная",
          } as Record<string, string>
        )[section];
  if (
    section === "learn" ||
    ["curriculum", "formulas", "progress", "ratios"].includes(section)
  )
    await expect(page.locator("main h1")).toHaveText(heading!);
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
function validRoute(href: string) {
  const [section, id, anchor] = href.slice(2).split("/");
  if (section === "learn")
    return lessons.some(
      (l) =>
        l.id === id && (!anchor || l.sections.some((s) => s.id === anchor)),
    );
  if (section === "formulas") return !id || formulas.some((f) => f.id === id);
  if (section === "practice") return !id || problems.some((p) => p.id === id);
  return ["home", "curriculum", "exam", "ratios", "progress"].includes(section);
}
for (const engine of ["chromium", "webkit"] as const) {
  for (const width of widths) {
    test(`C3 UX ${engine} ${width}: reading, navigation, accessibility`, async ({}, info) => {
      test.skip(
        Boolean(info.project.name) && info.project.name !== "desktop-1440",
        "Own isolated two-engine matrix runs once, independent of configured mobile duplication",
      );
      test.setTimeout(150_000);
      const browser = await (engine === "chromium" ? chromium : webkit).launch(
        // A manual WebKit launch must override the Chromium project's executable.
        engine === "webkit" ? { executablePath: webkit.executablePath() } : {},
      );
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400 && r.url().startsWith(base))
          errors.push(`${r.status()} ${r.url()}`);
      });
      const observed = new Set<string>();
      try {
        for (const route of [
          "home",
          "curriculum",
          `learn/${lessons.find((l) => l.id === "T3-07")?.id ?? lessons[0].id}`,
          "formulas",
          "practice",
          "exam",
          "ratios",
          "progress",
        ]) {
          await visit(page, route);
          await fits(page);
          if (route === "home") {
            const column = await page
              .locator(".practice-banner > div:nth-child(2)")
              .boundingBox();
            expect(column?.width).toBeGreaterThanOrEqual(180);
          }
          for (const href of await page
            .locator('a[href^="#/"]')
            .evaluateAll((nodes) =>
              nodes.map((n) => n.getAttribute("href")!),
            )) {
            expect(validRoute(href), `Missing target ${href} on ${route}`).toBe(
              true,
            );
            observed.add(href);
          }
          if (["home", "curriculum"].includes(route)) {
            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            expect(axe.violations).toEqual([]);
          }
          if (
            ["home", "curriculum"].includes(route) ||
            route.startsWith("learn/")
          ) {
            await page.evaluate(async () => {
              window.scrollTo(0, 0);
              await document.fonts.ready;
            });
            await page.screenshot({
              path: info.outputPath(
                `${engine}-${width}-${route.split("/")[0]}.png`,
              ),
              fullPage: true,
              scale: "css",
              animations: "disabled",
            });
          }
        }
        await visit(page, "curriculum");
        await expect(page.locator(".competency-card")).toHaveCount(
          seminarMap.length,
        );
        await expect(page.locator("main")).not.toContainText("MVP");
        await page
          .locator(".curriculum-list")
          .first()
          .getByRole("link", { name: "Изучить раздел" })
          .first()
          .click();
        await expect(page.locator("main h1")).toHaveText(lessons[0].title);
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
        await visit(page, "home");
        // Establish an explicit starting point, then exercise the actual skip-link keyboard action.
        // WebKit follows the host's tab-to-links preference; that preference is not a product defect.
        await page.locator(".skip").focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("main")).toBeFocused();
        expect(
          await page.evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        ).toBe(true);
        // Exhaustive actual route traversal at two representative widths; other widths validate every discovered target.
        if ([390, 1440].includes(width))
          for (const href of observed) {
            await page.goto(`${base}${href}`);
            await expect(page.locator("main h1")).toBeVisible();
            await expect(page.locator("main h1")).not.toHaveText(
              "Страница не найдена",
            );
          }
        expect(errors).toEqual([]);
        await info.attach("navigation-crawl", {
          body: JSON.stringify(
            {
              engine,
              width,
              visited: [...observed],
              actualTraversal: [390, 1440].includes(width),
              errors,
            },
            null,
            2,
          ),
          contentType: "application/json",
        });
      } finally {
        await context.close();
        await browser.close();
      }
    });
  }
}

for (const engine of ["chromium", "webkit"] as const) {
  test(`C3 saved question and portable progress ${engine}`, async ({}, info) => {
    test.skip(
      Boolean(info.project.name) && info.project.name !== "desktop-1440",
      "Own engine matrix runs once",
    );
    const browser = await (engine === "chromium" ? chromium : webkit).launch(
      engine === "webkit" ? { executablePath: webkit.executablePath() } : {},
    );
    const context = await browser.newContext({
      viewport: { width: 390, height: 1000 },
    });
    const p = problems.find((p) => p.id === "T3-Q06")!;
    const stage = p.stages[0];
    const key = "cflos.progress.v1";
    const errors: string[] = [];
    try {
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}#/practice/${p.id}`);
      await expect(page.locator("main h1")).toHaveText(p.title);
      const field = page.locator(`[id="${p.id}-${stage.id}"]`);
      await field.fill(String(stage.expected));
      await page
        .getByLabel(`Единица ответа: ${stage.label}`, { exact: true })
        .selectOption("million-rub");
      await page
        .getByRole("button", {
          name: "Показать опоры · отметить использование помощи",
        })
        .click();
      await page
        .getByRole("button", { name: "Открыть учебный раздел" })
        .click();
      await expect(page.locator("main h1")).toHaveText(
        lessons.find((l) => l.id === p.lessonId)!.title,
      );
      await page
        .getByRole("button", { name: "К заданию · черновик сохранён" })
        .click();
      await expect(page.locator("main h1")).toHaveText(p.title);
      await expect(page.locator(`[id="${p.id}-${stage.id}"]`)).toHaveValue(
        String(stage.expected),
      );
      await expect(
        page.getByLabel(`Единица ответа: ${stage.label}`, { exact: true }),
      ).toHaveValue("million-rub");
      await page.reload();
      await expect(page.locator(`[id="${p.id}-${stage.id}"]`)).toHaveValue(
        String(stage.expected),
      );
      await page.getByRole("button", { name: "Проверить ответ" }).click();
      await expect
        .poll(() =>
          page.evaluate(
            (key) =>
              JSON.parse(localStorage.getItem(key)!).answers.at(-1)?.score,
            key,
          ),
        )
        .toBe(1);
      await visit(page, "progress");
      const event = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Экспорт JSON", exact: true })
        .click();
      const download = await event;
      const exportPath = info.outputPath(`${engine}-synthetic-progress.json`);
      await download.saveAs(exportPath);
      await info.attach("synthetic-progress-export", {
        path: exportPath,
        contentType: "application/json",
      });
      const importedContext = await browser.newContext({
        viewport: { width: 390, height: 1000 },
      });
      try {
        const imported = await importedContext.newPage();
        imported.on("pageerror", (e) => errors.push(e.message));
        await imported.goto(`${base}#/progress`);
        await imported
          .getByLabel("Импорт прогресса", { exact: true })
          .setInputFiles(exportPath);
        await expect(
          imported
            .getByRole("status")
            .filter({ hasText: "Копия импортирована" }),
        ).toBeVisible();
        const restored = await imported.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!),
          key,
        );
        expect(restored.answers.at(-1).problemId).toBe(p.id);
        expect(restored.answers.at(-1).score).toBe(1);
        const bytes = await imported.evaluate(
          (key) => localStorage.getItem(key),
          key,
        );
        await imported
          .getByLabel("Импорт прогресса", { exact: true })
          .setInputFiles({
            name: "synthetic-corrupt.json",
            mimeType: "application/json",
            buffer: Buffer.from('{"broken":'),
          });
        await expect(imported.getByRole("status")).not.toContainText(
          "Копия импортирована",
        );
        await expect
          .poll(() =>
            imported.evaluate((key) => localStorage.getItem(key), key),
          )
          .toBe(bytes);
        await imported.reload();
        expect(
          await imported.evaluate(
            (key) =>
              JSON.parse(localStorage.getItem(key)!).answers.at(-1).score,
            key,
          ),
        ).toBe(1);
        await fits(imported);
      } finally {
        await importedContext.close();
      }
      expect(errors).toEqual([]);
    } finally {
      await context.close();
      await browser.close();
    }
  });
}
