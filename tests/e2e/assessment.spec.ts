import { test, expect } from "@playwright/test";
import * as content from "../../src/content";
import {
  assertNoPageErrors,
  startIsolated,
  readProgress,
  originalKeys,
  openProblem,
  fillAnswer,
  submitPractice,
  noPageOverflow,
  screenshotEvidence,
  referenceUnit,
  setNumeric,
  revealSupport,
} from "./helpers";

const { problems, sampleExamIds } = content;
test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));

for (const [id, oracle] of Object.entries(originalKeys)) {
  test(`original bank regression ${id}`, async ({ page }) => {
    const p = problems.find((q) => q.id === id)!;
    expect(p).toBeTruthy();
    await openProblem(page, p);
    await expect(page.locator(".feedback")).toHaveCount(0);
    await fillAnswer(page, p, oracle);
    await submitPractice(page);
    const result = (await readProgress(page))!.answers.at(-1)!;
    expect(result.problemId).toBe(id);
    expect(result.version).toBe(p.version);
    expect(result.mode).toBe("practice");
    expect(result.problemSnapshot).toMatchObject({ id, version: p.version });
    await noPageOverflow(page);
  });
}
for (let n = 11; n <= 22; n++) {
  const id = `T3-Q${n}`;
  test(`ratios bank UI grading ${id}`, async ({ page }) => {
    const p = problems.find((q) => q.id === id);
    expect(p, `Required reviewed ratios exercise ${id}`).toBeTruthy();
    expect(p!.reviewStatus).toBe("CONTENT_REVIEWED");
    await openProblem(page, p!);
    await fillAnswer(page, p!);
    // A deliberately arbitrary explanation must not be graded by keyword matching.
    const explanation = page.getByLabel("Ваше объяснение", { exact: true });
    await expect(explanation).toBeVisible();
    const syntheticText =
      "Синтетический ответ QA: смысл оценивает сам студент по рубрике.";
    await explanation.fill(syntheticText);
    await submitPractice(page);
    const result = (await readProgress(page))!.answers.at(-1)!;
    expect(result.problemId).toBe(id);
    expect(result.userResponse.values.reasoning).toBe(syntheticText);
    expect(result.score).toBe(1);
    await expect(
      page.getByText("Самопроверка объяснения — отдельно от балла", {
        exact: true,
      }),
    ).toBeVisible();
    await noPageOverflow(page);
  });
}

test("numeric grading distinguishes wrong sign, decimal comma and tolerance boundary", async ({
  page,
}) => {
  const p = problems.find((q) => q.id === "T3-Q06")!;
  await openProblem(page, p);
  const input = page.locator(`[id="${p.id}-${p.stages[0].id}"]`);
  await input.fill("3");
  await page
    .getByLabel(`Единица ответа: ${p.stages[0].label}`, { exact: true })
    .selectOption("million-rub");
  await submitPractice(page, 0);
  expect((await readProgress(page))!.answers.at(-1)!.errorCodes).toContain(
    "SIGN",
  );
  await input.fill("-3,009");
  await submitPractice(page, 1);
  await input.fill("-3.011");
  await submitPractice(page, 0);
  expect((await readProgress(page))!.answers.map((a) => a.score)).toEqual([
    0, 1, 0,
  ]);
});

test("multiple select requires exact full set rather than partial checkbox credit", async ({
  page,
}) => {
  const p = problems.find((q) => q.id === "T3-Q03")!;
  await openProblem(page, p);
  await fillAnswer(page, p, { selected: ["a"] });
  await submitPractice(page, 0);
  await fillAnswer(page, p, { selected: ["b", "e"] });
  await submitPractice(page, 1);
  await fillAnswer(page, p, { selected: ["c"] });
  await submitPractice(page, 0);
});

test("question → formula → return preserves draft across reload", async ({
  page,
}) => {
  const p = problems.find((q) => q.id === "T3-Q06")!;
  await openProblem(page, p);
  await page.locator(`[id="${p.id}-${p.stages[0].id}"]`).fill("-3,00");
  await revealSupport(page);
  await page
    .locator(".support-card button")
    .filter({
      hasText: content.formulas.find((f) => f.id === p.formulaIds[0])!.title,
    })
    .click();
  await expect(page).toHaveURL(/#\/formulas\//);
  await page.getByRole("button", { name: /К заданию/ }).click();
  await expect(page.locator(`[id="${p.id}-${p.stages[0].id}"]`)).toHaveValue(
    "-3,00",
  );
  await page.reload();
  await expect(page.locator(`[id="${p.id}-${p.stages[0].id}"]`)).toHaveValue(
    "-3,00",
  );
});

test("study partial credit, practice and completed exam scores stay isolated and restore after reload", async ({
  page,
}, info) => {
  const p = problems.find((q) => q.id === "T3-Q07")!;
  await openProblem(page, p);
  await fillAnswer(page, p, originalKeys[p.id]);
  await submitPractice(page);
  await page
    .getByRole("button", { name: "Обучение с подсказками", exact: true })
    .click();
  await expect(page.locator(`[id="${p.id}-${p.stages[0].id}"]`)).toHaveValue(
    "",
  );
  for (let i = 0; i < p.stages.length; i++) {
    const stage = p.stages[i];
    await setNumeric(
      page,
      p,
      stage.id,
      i === p.stages.length - 1 ? "0" : String(stage.expected),
    );
    if (i < p.stages.length - 1)
      await page
        .getByRole("button", { name: "Следующий шаг", exact: false })
        .click();
  }
  await page
    .getByRole("button", { name: "Проверить ответ", exact: false })
    .click();
  await expect
    .poll(async () => (await readProgress(page))?.answers.length)
    .toBe(2);
  expect((await readProgress(page))!.answers.at(-1)!.score).toBeCloseTo(2 / 3);
  expect((await readProgress(page))!.answers.map((a) => a.mode)).toEqual([
    "practice",
    "study",
  ]);
  await page.goto("#/exam");
  await page
    .getByRole("button", { name: "Начать мини-контрольную", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Завершить и проверить", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Заполните все задания");
  await expect(page.locator(".feedback,.hint")).toHaveCount(0);
  for (let i = 0; i < sampleExamIds.length; i++) {
    const q = problems.find((x) => x.id === sampleExamIds[i])!;
    await page
      .getByRole("button", { name: `Вопрос ${i + 1}`, exact: true })
      .click();
    await fillAnswer(page, q, originalKeys[q.id]);
    await expect(page.locator(".feedback,.hint")).toHaveCount(0);
  }
  await page.reload();
  const active = (await readProgress(page))!;
  expect(active.exam?.finishedAt).toBeUndefined();
  expect(active.answers.filter((a) => a.mode === "exam")).toHaveLength(0);
  await page
    .getByRole("button", { name: "Завершить и проверить", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /Числа и выбор вариантов: 100%/,
      level: 1,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /Числа и выбор вариантов: 100%/,
      level: 1,
    }),
  ).toBeVisible();
  const saved = (await readProgress(page))!;
  expect(saved.answers.filter((a) => a.mode === "practice")).toHaveLength(1);
  expect(saved.answers.filter((a) => a.mode === "study")).toHaveLength(1);
  expect(saved.answers.filter((a) => a.mode === "exam")).toHaveLength(7);
  await screenshotEvidence(page, info, "original-exam-result");
});

test("ratios mini-control has no hints or worked answers before final submission", async ({
  page,
}, info) => {
  const ratioIds = (content as { ratiosExamIds?: string[] }).ratiosExamIds;
  expect(ratioIds?.length).toBeGreaterThan(0);
  await page.goto("#/exam");
  await page
    .getByRole("button", {
      name: "Начать контрольную по коэффициентам",
      exact: false,
    })
    .click();
  for (let i = 0; i < ratioIds!.length; i++) {
    const p = problems.find((q) => q.id === ratioIds![i])!;
    await page
      .getByRole("button", { name: `Вопрос ${i + 1}`, exact: true })
      .click();
    await expect(page.locator(".feedback,.hint")).toHaveCount(0);
    await fillAnswer(page, p);
  }
  await page
    .getByRole("button", { name: "Завершить и проверить", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: /Числа и выбор вариантов: 100%/,
      level: 1,
    }),
  ).toBeVisible();
  expect(
    (await readProgress(page))!.answers.filter((a) => a.mode === "exam"),
  ).toHaveLength(ratioIds!.length);
  await screenshotEvidence(page, info, "ratios-exam-result");
});
