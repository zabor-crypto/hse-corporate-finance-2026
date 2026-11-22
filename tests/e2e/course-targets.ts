import {
  content as t3Content,
  registry as t3Registry,
  teachingPaths,
} from "../../src/runtime/t3-data";
import {
  content as t4Content,
  registry as t4Registry,
} from "../../src/runtime/t4-data";
const t3 = {
  id: t3Registry.modules[0].id,
  content: t3Content,
  config: { teachingPaths },
};
const t4 = {
  id: t4Registry.modules[0].id,
  content: t4Content,
  config: { teachingPaths: undefined },
};
/** Actual pack metadata, never an invented future course. Legacy canonical content is checked separately. */
export const coursePacks = [t3, t4];
export function courseTargetExists(href: string) {
  const [page, id, anchor] = href.slice(2).split("/");
  const module = coursePacks.find((p) => p.id === id);
  if (page === "learn")
    return coursePacks.some((p) =>
      p.content.lessons.some(
        (l) =>
          l.id === id &&
          (!anchor ||
            l.sections.some((s) => s.id === anchor) ||
            (
              p.config as typeof p.config & {
                teachingPaths?: Record<string, { units: { id: string }[] }>;
              }
            ).teachingPaths?.[l.id]?.units.some(
              (u) => `path-${u.id}` === anchor,
            )),
      ),
    );
  if (page === "formulas")
    return (
      !id ||
      !!module ||
      coursePacks.some((p) => p.content.formulas.some((f) => f.id === id))
    );
  if (page === "practice")
    return (
      !id ||
      !!module ||
      coursePacks.some((p) => p.content.problems.some((q) => q.id === id))
    );
  if (page === "catalog") return !id || !!module;
  if (page === "home" || page === "exam") return !id || !!module;
  if (page === "curriculum") return !id || !!module;
  if (page === "ratios" || page === "progress") return !id;
  return false;
}

import { expect, type Page } from "@playwright/test";
export async function assertCourseTarget(page: Page, path: string) {
  const normalized = path.startsWith("#/")
    ? path
    : `#/${path.replace(/^\/+/, "")}`;
  expect(
    courseTargetExists(normalized),
    `Unknown course target ${normalized}`,
  ).toBe(true);
  const [kind, id, anchor] = path.replace(/^#\//, "").split("/");
  let pack =
    coursePacks.find((p) => p.id === id) ||
    coursePacks.find(
      (p) =>
        p.content.lessons.some((l) => l.id === id) ||
        p.content.problems.some((q) => q.id === id) ||
        p.content.formulas.some((f) => f.id === id),
    );
  if (!pack && ["exam", "practice", "ratios"].includes(kind))
    pack = coursePacks.find((p) => p.id === "T3");
  if (pack) await expect(page.locator(".topbar strong")).toHaveText(pack.id);
  if (kind === "learn") {
    const lesson = pack!.content.lessons.find((l) => l.id === id)!;
    await expect(page.locator("main h1")).toHaveText(lesson.title);
    if (anchor) await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1);
    return;
  }
  if (kind === "practice" && id && !coursePacks.some((p) => p.id === id)) {
    const problem = pack!.content.problems.find((p) => p.id === id)!;
    await expect(page.locator(".problem-prompt")).toHaveText(
      problem.independent?.prompt ?? problem.prompt,
    );
    return;
  }
  if (kind === "formulas") {
    if (!pack) {
      const current = await page.locator(".topbar strong").textContent();
      pack = coursePacks.find((p) => p.id === current);
    }
    await expect(page.locator("main h1")).toHaveText("За формулой — смысл.");
    await expect(page.locator(".formula-card")).toHaveCount(
      id && !coursePacks.some((p) => p.id === id)
        ? 1
        : pack!.content.formulas.length,
    );
    return;
  }
  if (kind === "home") {
    await expect(page.locator("main h1")).toHaveText(
      /^От вопроса бизнеса\s*к обоснованному решению\.$/,
    );
    return;
  }
  if (kind === "exam") {
    await expect(page.locator("main h1")).toHaveText(
      /^(Соберите всё вместе\.|Сохранена контрольная другой темы|Задания обновились|Числа и выбор вариантов: \d+%|Задание \d+)$/,
    );
    return;
  }
  const titles: Record<string, string> = {
    home: "От вопроса бизнеса к обоснованному решению.",
    curriculum: "Большая картина.",
    practice: "Выберите один следующий шаг.",
    catalog: "Понимание в действии.",
    progress: "Каждая ошибка — следующий шаг.",
    ratios: "Как связаны коэффициенты",
  };
  if (titles[kind])
    await expect(page.locator("main h1")).toHaveText(titles[kind]);
  else {
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main h1")).not.toContainText("Загрузка");
  }
}
