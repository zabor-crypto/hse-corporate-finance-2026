import { test, expect } from "@playwright/test";
import { problems, transferFamilies } from "../../src/content";
import {
  startIsolated,
  assertNoPageErrors,
  readProgress,
  openProblem,
  fillAnswer,
  submitPractice,
  setNumeric,
  importProgress,
  clone,
  noPageOverflow,
  STORAGE_KEY,
  revealSupport,
  secondaryOrigin,
} from "./helpers";
test.beforeEach(async ({ page }) => startIsolated(page));
test.afterEach(async ({ page }) => assertNoPageErrors(page));
for (let n = 23; n <= 30; n++) {
  const id = `T3-Q${n}`;
  test(`independent calibrated case ${id} grades only requested final outputs`, async ({
    page,
  }) => {
    const p = problems.find((x) => x.id === id)!;
    await openProblem(page, p);
    const ids = p.independent!.stageIds;
    await expect(page.locator(".answer-stage")).toHaveCount(ids.length);
    for (const s of p.stages.filter((s) => !ids.includes(s.id)))
      await expect(page.locator(`[id="${p.id}-${s.id}"]`)).toHaveCount(0);
    await expect(page.locator(".hint,.feedback")).toHaveCount(0);
    await fillAnswer(page, p);
    await submitPractice(page);
    const record = (await readProgress(page))!.answers.at(-1)!;
    expect(record.objectiveScore).toBe(1);
    expect(record.assessedStageIds).toEqual(
      p.type === "multi" || p.type === "single" ? ["selection"] : ids,
    );
    expect(record.reasoningStatus).toBe("NOT_SUBMITTED");
    await expect(page.locator(".feedback")).toContainText(
      "не подтверждает понимание",
    );
  });
}
for (const family of transferFamilies) {
  test(`fresh bounded ${family.id} provenance survives review repeat and origin import`, async ({
    page,
    browser,
  }) => {
    const p = problems.find(
      (p) => p.transfer?.familyId === family.id && p.transfer.seed === 0,
    )!;
    await openProblem(page, p);
    await fillAnswer(page, p);
    await page
      .getByLabel("Ваше объяснение", { exact: true })
      .fill(
        "Синтетическое объяснение; его смысл программа не должна объявлять проверенным.",
      );
    await submitPractice(page);
    const first = (await readProgress(page))!.answers.at(-1)!;
    expect(first.assessmentContext).toMatchObject({
      familyId: family.id,
      seed: 0,
      seenBefore: false,
      firstIndependentAttempt: true,
      assistanceUsed: false,
      form: "independent",
    });
    expect(first.reasoningStatus).toBe("SUBMITTED_NOT_REVIEWED");
    await page.locator(".feedback .reasoning-box summary").click();
    const checks = page.locator(".feedback .rubric-item input");
    for (let i = 0; i < (await checks.count()); i++)
      await checks.nth(i).check();
    await page
      .getByRole("button", {
        name: "Отметить самопроверку по всем пунктам",
        exact: true,
      })
      .click();
    await expect(page.locator(".feedback")).toContainText(
      "Самопроверка по рубрике отмечена",
    );
    await submitPractice(page);
    const repeat = (await readProgress(page))!.answers.at(-1)!;
    expect(repeat.assessmentContext?.seenBefore).toBe(true);
    expect(repeat.assessmentContext?.firstIndependentAttempt).toBe(false);
    await page.goto("#/progress");
    await expect(
      page.getByText(/Освоение материала ещё не подтверждено/).first(),
    ).toBeVisible();
    const exported = clone((await readProgress(page))!);
    await importProgress(page, exported);
    expect((await readProgress(page))!.answers).toHaveLength(2);
    const targetContext = await browser.newContext({
      baseURL: secondaryOrigin,
      viewport: page.viewportSize() ?? undefined,
    });
    try {
      const target = await targetContext.newPage();
      await target.goto(secondaryOrigin);
      await importProgress(target, exported);
      expect((await readProgress(target))!.answers).toEqual(exported.answers);
      expect((await readProgress(target))!.reasoningReviews).toEqual(
        exported.reasoningReviews,
      );
      await expect(
        target.getByText(
          /Новый вариант с первой самостоятельной попытки без отмеченной помощи: 1\./,
        ),
      ).toBeVisible();
    } finally {
      await targetContext.close();
    }
  });
  test(`assisted ${family.id} attempt cannot become clean first success`, async ({
    page,
  }) => {
    const p = problems.find(
      (p) => p.transfer?.familyId === family.id && p.transfer.seed === 1,
    )!;
    await openProblem(page, p);
    await revealSupport(page);
    await page.locator(".support-card button").first().click();
    await page.getByRole("button", { name: /К заданию/ }).click();
    await fillAnswer(page, p);
    await submitPractice(page);
    expect(
      (await readProgress(page))!.answers.at(-1)!.assessmentContext,
    ).toMatchObject({ familyId: family.id, assistanceUsed: true });
  });
}
test("units are chosen rather than copied from the key; missing units and wrong scale fail", async ({
  page,
}) => {
  const p = problems.find((x) => x.id === "T3-Q05")!;
  await openProblem(page, p);
  const s = p.stages[0];
  await page.locator(`[id="${p.id}-${s.id}"]`).fill("70");
  await expect(
    page.getByLabel(`Единица ответа: ${s.label}`, { exact: true }),
  ).toHaveValue("");
  await submitPractice(page, 0);
  expect((await readProgress(page))!.answers.at(-1)!.errorCodes).toContain(
    "UNIT_REQUIRED",
  );
  await setNumeric(page, p, s.id, "70000", "thousand-rub");
  await submitPractice(page, 1);
  await setNumeric(page, p, s.id, "70000000", "rub");
  await submitPractice(page, 1);
  await setNumeric(page, p, s.id, "70", "thousand-rub");
  await submitPractice(page, 0);
  expect((await readProgress(page))!.answers.at(-1)!.errorCodes).toContain(
    "SCALE",
  );
});
test("rates multiples and percentage-point differences use different student representations", async ({
  page,
}) => {
  const p = problems.find((x) => x.id === "T3-Q11")!;
  await openProblem(page, p);
  for (const s of p.stages)
    await setNumeric(page, p, s.id, String(s.expected / 100), "fraction");
  await submitPractice(page, 1);
  const q = problems.find((x) => x.id === "T3-Q24")!;
  await openProblem(page, q);
  await fillAnswer(page, q);
  const diff = q.stages.find((s) => s.id === "roe-difference")!;
  await setNumeric(
    page,
    q,
    diff.id,
    String(diff.expected / 100),
    "fraction-point",
  );
  await submitPractice(page, 1);
  const unit = page.getByLabel(`Единица ответа: ${diff.label}`, {
    exact: true,
  });
  expect(await unit.locator('option[value="percent"]').count()).toBe(0);
});
test("empty explanation cannot be self-reviewed despite full objective credit; workpad persists", async ({
  page,
}) => {
  const p = problems.find((x) => x.id === "T3-Q23")!;
  await openProblem(page, p);
  await page.locator(".workpad summary").click();
  await page
    .getByLabel("Черновик расчётов", { exact: true })
    .fill("Заметка QA: сохраните исходные знаки и масштаб.");
  await fillAnswer(page, p);
  await submitPractice(page);
  await page.locator(".feedback .reasoning-box summary").click();
  const checks = page.locator(".feedback .rubric-item input");
  for (let i = 0; i < (await checks.count()); i++) await checks.nth(i).check();
  await expect(
    page.getByRole("button", {
      name: "Отметить самопроверку по всем пунктам",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await page.locator(".workpad summary").click();
  await expect(
    page.getByLabel("Черновик расчётов", { exact: true }),
  ).toHaveValue("Заметка QA: сохраните исходные знаки и масштаб.");
  expect((await readProgress(page))!.answers.at(-1)!.reasoningStatus).toBe(
    "NOT_SUBMITTED",
  );
});
test("integrated exam hides topic titles formulas intermediate stages and assumption algorithms until submission", async ({
  page,
}) => {
  await page.goto("#/exam");
  await page
    .getByRole("button", {
      name: "Начать интегрированную контрольную",
      exact: true,
    })
    .click();
  const session = (await readProgress(page))!.exam!;
  for (let i = 0; i < session.problemIds.length; i++) {
    const p = problems.find((p) => p.id === session.problemIds[i])!;
    await page
      .getByRole("button", { name: `Вопрос ${i + 1}`, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `Задание ${i + 1}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".hint,.feedback,.formula-card,.assumptions"),
    ).toHaveCount(0);
    for (const s of p.stages.filter(
      (s) => !p.independent!.stageIds.includes(s.id),
    ))
      await expect(page.locator(`[id="${p.id}-${s.id}"]`)).toHaveCount(0);
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
    (await readProgress(page))!.answers.every(
      (a) => a.objectiveScore === 1 && a.reasoningStatus === "NOT_SUBMITTED",
    ),
  ).toBe(true);
});

test("historical versions and unknown imported family seeds retain history without current transfer credit", async ({
  page,
}) => {
  const p = problems.find(
    (p) => p.transfer?.familyId === "nwc-cash" && p.transfer.seed === 2,
  )!;
  await openProblem(page, p);
  await fillAnswer(page, p);
  await submitPractice(page);
  const current = clone((await readProgress(page))!);
  const old = clone(current.answers[0]);
  old.id += ":historical";
  old.version = "0.9.0";
  (old.problemSnapshot as { version: string }).version = "0.9.0";
  const unknown = clone(current.answers[0]);
  unknown.id += ":unknown";
  unknown.problemId = "T3-V-UNKNOWN-999";
  unknown.assessmentContext!.familyId = "unknown-family";
  unknown.assessmentContext!.seed = 999;
  (unknown.problemSnapshot as { id: string }).id = unknown.problemId;
  current.answers.push(old, unknown);
  await importProgress(page, current);
  expect((await readProgress(page))!.answers).toHaveLength(3);
  await expect(
    page.getByText(
      /Новый вариант с первой самостоятельной попытки без отмеченной помощи: 1\./,
    ),
  ).toBeVisible();
});

test("unseen-family exam uses four fresh variants and retains honest objective provenance", async ({
  page,
}) => {
  await page.goto("#/exam");
  await page
    .getByRole("button", { name: "Начать на новых наборах", exact: true })
    .click();
  const session = (await readProgress(page))!.exam!;
  const variants = session.problemIds
    .map((id) => problems.find((p) => p.id === id)!)
    .filter((p) => p.transfer?.seed !== undefined);
  expect(variants).toHaveLength(4);
  expect(new Set(variants.map((p) => p.transfer!.familyId)).size).toBe(4);
  for (let i = 0; i < session.problemIds.length; i++) {
    const p = problems.find((p) => p.id === session.problemIds[i])!;
    await page
      .getByRole("button", { name: `Вопрос ${i + 1}`, exact: true })
      .click();
    await expect(page.locator(".hint,.assumptions,.feedback")).toHaveCount(0);
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
  const saved = (await readProgress(page))!;
  for (const p of variants)
    expect(
      saved.answers.find((a) => a.problemId === p.id)!.assessmentContext,
    ).toMatchObject({
      form: "independent",
      firstIndependentAttempt: true,
      seenBefore: false,
      assistanceUsed: false,
      benchmark: false,
    });
  await page.goto("#/progress");
  await expect(
    page.getByText(
      /Новый вариант с первой самостоятельной попытки без отмеченной помощи: 4\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Освоение материала ещё не подтверждено/),
  ).toBeVisible();
});
test("finite variant exhaustion is reported instead of silently recycling seen seeds", async ({
  page,
}) => {
  const data = {
    schemaVersion: 1,
    lessons: {},
    drafts: {},
    answers: [],
    exam: null,
    archives: [],
    exposures: Object.fromEntries(
      problems
        .filter((p) => p.transfer?.seed !== undefined)
        .map((p) => [
          `${p.id}@${p.version}`,
          {
            firstSeenAt: "2026-11-06T10:00:00.000Z",
            assistanceUsed: false,
            modes: ["practice"],
          },
        ]),
    ),
  };
  await importProgress(page, data);
  await page.goto("#/exam");
  await expect(
    page.getByRole("button", { name: "Начать на новых наборах", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("В одном из семейств все восемь наборов уже открывались.", {
      exact: true,
    }),
  ).toBeVisible();
});
