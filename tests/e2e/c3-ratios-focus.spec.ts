import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { problems, formulas } from "../../src/content";
import { c3RatiosFocusBlueprint as template } from "../../src/curriculum/c3-ratios-focus";
import { referenceUnit, screenshotEvidence } from "./helpers";
import type { Progress } from "../../src/storage/progress";
const KEY = "cflos.progress.v1";
const base = `http://127.0.0.1:${process.env.CFLOS_DELTA_PORT ?? 5202}/hse-corporate-finance-2026/`;
const second = `http://127.0.0.1:${process.env.CFLOS_DELTA_SECOND_PORT ?? 5203}/hse-corporate-finance-2026/`;
interface Oracle {
    id: string;
    version: string;
    stages: Record<string, {
        expected: number;
        unit: string;
    }>;
    independentStageIds: string[];
    correctOptionIds?: string[];
}
const oracles = JSON.parse(readFileSync(new URL("../fixtures/c3-ratios-focus-independent-oracles.json", import.meta.url), "utf8")).problems as Oracle[];
const legacy = JSON.parse(readFileSync(new URL("../fixtures/baseline-v1-progress.json", import.meta.url), "utf8"));
const ids = oracles.map(p => p.id);
const read = (page: Page): Promise<Progress> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY);
const errors = new WeakMap<Page, string[]>();
function observe(page: Page) { const items: string[] = []; errors.set(page, items); page.on("pageerror", e => items.push(e.message)); page.on("console", m => { if (m.type() === "error")
    items.push(m.text()); }); page.on("response", r => { if (r.status() >= 400 && [new URL(base).origin, new URL(second).origin].includes(new URL(r.url()).origin))
    items.push(`HTTP${r.status()} ${r.url()}`); }); }
async function fits(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
async function noLeaks(page: Page) { await expect(page.locator(".feedback,.hint,.assumptions,.formula-card,.support-card")).toHaveCount(0); }
async function importData(page: Page, data: unknown, url = base) { await page.goto(url + "#/progress"); await page.getByLabel("Импорт прогресса", { exact: true }).setInputFiles({ name: "synthetic-focus.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) }); await expect(page.getByRole("status").filter({ hasText: "Копия импортирована" })).toBeVisible(); }
test("six ratios: independent assessment, reviewed grading, repeat passport, help and schema1 roundtrip", async ({ page, browser }, info) => {
    observe(page);
    await page.goto(base + "#/exam");
    await expect(page.getByRole("button", { name: "Собрать " + template.id, exact: true })).toBeVisible();
    await page.getByLabel("Номер набора (seed)").fill("17");
    await screenshotEvidence(page, info, "focus-intro");
    await page.getByRole("button", { name: "Собрать " + template.id, exact: true }).click();
    await expect(page.locator(".question-title")).toHaveText("Задание 1");
    const session = (await read(page)).exam!;
    expect(session.problemIds).toEqual(ids);
    expect(session.paper!.blueprint).toEqual(template);
    expect(session.seenProblemIds).toEqual([]);
    await expect(page.getByLabel("Паспорт контрольной")).toContainText("Ранее открывались: 0 из 6");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    for (let i = 0; i < ids.length; i++) {
        const q = problems.find(p => p.id === ids[i])!;
        const oracle = oracles[i];
        await page.getByRole("button", { name: `Вопрос ${i + 1}`, exact: true }).click();
        await expect(page.locator(".question-title")).toHaveText(`Задание ${i + 1}`);
        await expect(page.locator(".problem-prompt")).toHaveText(q.independent!.prompt);
        await noLeaks(page);
        await fits(page);
        expect(await page.locator(".answer-stage").count()).toBe(oracle.independentStageIds.length);
        for (const guided of q.stages.filter(s => !oracle.independentStageIds.includes(s.id)))
            await expect(page.locator(`[id="${q.id}-${guided.id}"]`)).toHaveCount(0);
        for (const sid of oracle.independentStageIds) {
            const s = q.stages.find(s => s.id === sid)!;
            const e = oracle.stages[sid]!;
            const unit = page.getByLabel("Единица ответа: " + s.label, { exact: true });
            await expect(unit).toHaveValue("");
            await page.locator(`[id="${q.id}-${sid}"]`).fill(e.expected.toFixed(e.unit === "раз" ? 4 : 2).replace(".", ","));
            await unit.selectOption(referenceUnit(e.unit));
        }
        for (const id of oracle.correctOptionIds ?? []) {
            const option = q.options!.find(o => o.id === id)!;
            await page.getByRole(q.type === "single" ? "radio" : "checkbox", { name: option.label, exact: true }).check();
        }
        if (i === 0) {
            await page.locator(".workpad summary").click();
            await page.getByLabel("Черновик расчётов", { exact: true }).fill("Синтетическая проверка: сопоставить показатели и базы.");
            await screenshotEvidence(page, info, "focus-calculation-before-submit");
            await page.reload();
            await expect(page.locator(".question-title")).toHaveText("Задание 1");
            expect((await read(page)).exam).toEqual(session);
            await expect(page.getByLabel("Черновик расчётов", { exact: true })).toHaveValue("Синтетическая проверка: сопоставить показатели и базы.");
            for (const sid of oracle.independentStageIds) {
                const s = q.stages.find(s => s.id === sid)!;
                await expect(page.getByLabel("Единица ответа: " + s.label, { exact: true })).toHaveValue(referenceUnit(s.unit));
            }
        }
    }
    await page.getByRole("button", { name: "Завершить и проверить", exact: true }).click();
    await expect(page.locator("main h1")).toContainText("Числа и выбор вариантов:");
    const graded = (await read(page)).answers.filter(a => a.id.startsWith(session.id + ":"));
    expect(graded).toHaveLength(6);
    expect(graded.map(a => a.score)).toEqual([1, 1, 1, 1, 1, 1]);
    for (const a of graded) {
        expect(a.assessedStageIds).toEqual(oracles.find(p => p.id === a.problemId)!.independentStageIds.length ? oracles.find(p => p.id === a.problemId)!.independentStageIds : ["selection"]);
        expect(a.mode).toBe("exam");
        expect(a.assessmentContext?.seenBefore).toBe(false);
        expect(a.assessmentContext?.assistanceUsed).toBe(false);
    }
    await screenshotEvidence(page, info, "focus-reviewed-result");
    await fits(page);
    await page.getByRole("button", { name: "Выбрать новый вариант", exact: true }).click();
    expect((await read(page)).archives.some((a: any) => a.session?.id === session.id && JSON.stringify(a.session.paper) === JSON.stringify(session.paper))).toBe(true);
    await page.getByRole("button", { name: "Собрать " + template.id, exact: true }).click();
    await expect(page.getByLabel("Паспорт контрольной")).toContainText("Ранее открывались: 6 из 6");
    const repeated = (await read(page)).exam!;
    expect(repeated.paper!.blueprint).toEqual(template);
    expect(repeated.problemIds).toEqual(session.problemIds);
    // Practice is separate from the assessed paper, and help marks provenance before showing formulas.
    const q = problems.find(p => p.id === "C3-RF03")!;
    await page.goto(base + "#/practice/" + q.id);
    await expect(page.locator(".problem-prompt")).toHaveText(q.independent!.prompt);
    for (const s of q.stages.filter(s => q.independent!.stageIds.includes(s.id))) {
        const e = oracles[2].stages[s.id]!;
        await page.locator(`[id="${q.id}-${s.id}"]`).fill(String(e.expected));
        await page.getByLabel("Единица ответа: " + s.label, { exact: true }).selectOption(referenceUnit(s.unit));
    }
    const cash = q.stages.find(s => s.id === "cfo")!;
    await page.getByLabel("Единица ответа: " + cash.label, { exact: true }).selectOption("thousand-rub");
    await page.getByRole("button", { name: "Проверить ответ", exact: true }).click();
    await expect.poll(async () => (await read(page)).answers.at(-1)!.stageResults.find(s => s.id === "cfo")!.correct).toBe(false);
    await page.getByLabel("Единица ответа: " + cash.label, { exact: true }).selectOption("million-rub");
    await page.locator(`[id="${q.id}-current-ratio"]`).fill("2,40004");
    await page.getByRole("button", { name: "Проверить ответ", exact: true }).click();
    await expect.poll(async () => (await read(page)).answers.at(-1)!.score).toBe(1);
    await page.getByRole("button", { name: "Показать опоры · отметить использование помощи", exact: true }).click();
    await page.getByRole("button", { name: "Открыть учебный раздел", exact: true }).click();
    await expect(page.locator("main h1")).toBeVisible();
    await page.getByRole("button", { name: "К заданию · черновик сохранён", exact: true }).click();
    await expect(page.locator(`[id="${q.id}-current-ratio"]`)).toHaveValue("2,40004");
    await page.getByRole("button", { name: "Проверить ответ", exact: true }).click();
    await expect.poll(async () => (await read(page)).answers.at(-1)!.assessmentContext?.assistanceUsed).toBe(true);
    await page.getByRole("button", { name: formulas.find(f => f.id === "current-liquidity")!.title, exact: true }).click();
    await expect(page.locator(".formula-card")).toHaveAttribute("id", "current-liquidity");
    await expect(page.locator(".katex-mathml math").first()).toBeAttached();
    await expect(page.locator(".katex-html").first()).toBeVisible();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    await fits(page);
    await screenshotEvidence(page, info, "focus-theory-math");
    await page.getByRole("button", { name: "К заданию · черновик сохранён", exact: true }).click();
    await importData(page, legacy);
    const merged = await read(page);
    for (const old of legacy.answers as Progress["answers"])
        expect(merged.answers.find(a => a.id === old.id)).toEqual(old);
    for (const old of graded)
        expect(merged.answers.find(a => a.id === old.id)).toEqual(old);
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Экспорт JSON", exact: true }).click();
    const file = info.outputPath("synthetic-focus-old-new.json");
    await (await event).saveAs(file);
    const exported = JSON.parse(readFileSync(file, "utf8"));
    await info.attach("synthetic-export", { path: file, contentType: "application/json" });
    const context = await browser.newContext({ viewport: info.project.use.viewport, deviceScaleFactor: 1 });
    try {
        const imported = await context.newPage();
        observe(imported);
        await importData(imported, exported, second);
        await imported.reload();
        const restored = await read(imported);
        expect(restored.answers).toEqual(exported.answers);
        expect(restored.exam).toEqual(exported.exam);
        expect(restored.archives.slice(0, exported.archives.length)).toEqual(exported.archives);
        // Import deliberately appends an audit snapshot instead of discarding prior passports.
        const audit = restored.archives.at(-1) as {
            kind: string;
            snapshot: Progress;
        };
        expect(audit.kind).toBe("import");
        expect(audit.snapshot.answers).toEqual(exported.answers);
        expect(audit.snapshot.exam).toEqual(exported.exam);
        const before = await imported.evaluate(key => localStorage.getItem(key), KEY);
        await imported.getByLabel("Импорт прогресса", { exact: true }).setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{bad") });
        await expect(imported.getByRole("status")).toContainText("JSON");
        expect(await imported.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
        expect(errors.get(imported)).toEqual([]);
    }
    finally {
        await context.close();
    }
    expect(errors.get(page)).toEqual([]);
});
