import { test, expect, type Page } from "@playwright/test";
import {
  assertNoPageErrors,
  startIsolated,
  noPageOverflow,
  screenshotEvidence,
} from "./helpers";

async function metric(page: Page, id: string) {
  const text = await page.getByTestId(id).innerText();
  const numeric = text
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(",", ".")
    .match(/[-+−]?\d+(?:\.\d+)?/);
  if (!numeric) throw new Error(`Expected a numeric ${id}, received ${text}`);
  return Number(numeric[0].replace("−", "-"));
}
async function field(page: Page, name: string, value: string) {
  await page.getByLabel(name, { exact: true }).fill(value);
}
test.beforeEach(async ({ page }) => {
  await startIsolated(page);
  await page.goto("#/ratios");
});
test.afterEach(async ({ page }) => assertNoPageErrors(page));

test("ratio lab exposes matched ROA ROC ROE and DuPont with explicit undefined zero-interest case", async ({
  page,
}, info) => {
  await expect(
    page.getByRole("heading", {
      name: "Как связаны коэффициенты",
      exact: true,
    }),
  ).toBeVisible();
  expect(await metric(page, "ratio-roa-nopat")).toBeCloseTo(24, 1);
  expect(await metric(page, "ratio-roc")).toBeCloseTo(24, 1);
  expect(await metric(page, "ratio-roe")).toBeCloseTo(38.67, 1);
  expect(await metric(page, "ratio-icr")).toBe(30);
  expect(await metric(page, "ratio-dfl")).toBeCloseTo(1.03, 1);
  await expect(page.getByTestId("ratio-value-creation")).toContainText(
    "не доказывает создание стоимости",
  );
  expect(await page.locator("math").count()).toBeGreaterThanOrEqual(3);
  await noPageOverflow(page);
  await screenshotEvidence(page, info, "ratio-lab-default");
  await field(page, "Проценты, млн ₽", "0");
  await expect(page.getByTestId("ratio-icr")).toHaveText("Не определено");
  expect(await metric(page, "ratio-dfl")).toBe(1);
  expect(await metric(page, "ratio-roe")).toBe(40);
  await field(page, "EBIT, млн ₽", "-5");
  expect(await metric(page, "ratio-roe")).toBeCloseTo(-16.67, 1);
  await field(page, "Проценты, млн ₽", "1");
  expect(await metric(page, "ratio-roe")).toBe(-20);
  await expect(
    page.getByText(/Тождество рычага здесь не применимо/),
  ).toBeVisible();
  expect(await page.locator(".ratio-results").innerText()).not.toMatch(
    /NaN|Infinity/,
  );
  await noPageOverflow(page);
});

test("ratio lab does not auto-repair inconsistent inputs and keeps gross/net-cash conventions separate", async ({
  page,
}, info) => {
  await field(page, "Собственный капитал, млн ₽", "10");
  await field(page, "Долг, млн ₽", "40");
  await field(page, "Проценты, млн ₽", "4");
  await expect(page.getByTestId("ratio-error")).toHaveCount(0);
  expect(await metric(page, "ratio-roe")).toBe(88);
  expect(await metric(page, "ratio-icr")).toBe(3.75);
  await field(page, "Денежные средства, млн ₽", "10");
  await page.getByLabel("База ROC", { exact: true }).selectOption("net-cash");
  expect(await metric(page, "ratio-roc")).toBe(30);
  await expect(
    page.getByText(/ROC за вычетом cash не подставляется/),
  ).toBeVisible();
  expect(await metric(page, "ratio-roe")).toBe(88);
  await screenshotEvidence(page, info, "ratio-lab-net-cash");
  await field(page, "Активы, млн ₽", "60");
  await expect(page.getByTestId("ratio-error")).toBeVisible();
  await expect(page.getByLabel("Активы, млн ₽", { exact: true })).toHaveValue(
    "60",
  );
  await expect(page.getByTestId("ratio-roe")).toHaveCount(0);
  await field(page, "Активы, млн ₽", "50");
  await field(page, "Собственный капитал, млн ₽", "0");
  await field(page, "Долг, млн ₽", "50");
  await expect(page.getByTestId("ratio-error")).toBeVisible();
  await field(page, "Активы, млн ₽", "");
  await expect(page.getByLabel("Активы, млн ₽", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByTestId("ratio-error")).toBeVisible();
  await noPageOverflow(page);
});

test("tax100 leaves zero NI and undefined DFL at zero and positive interest without an Infinity shortcut", async ({
  page,
}) => {
  await field(page, "Налог, %", "100");
  await field(page, "Проценты, млн ₽", "0");
  expect(await metric(page, "ratio-roe")).toBe(0);
  await expect(page.getByTestId("ratio-dfl")).toHaveText("Не определено");
  await expect(page.getByTestId("ratio-icr")).toHaveText("Не определено");
  await expect(page.getByText(/DFL = 1 при ненулевых EBIT и NI/)).toBeVisible();
  await expect(
    page.getByText(
      /При NI = 0 относительное изменение NI и DFL как эластичность не определены/,
    ),
  ).toBeVisible();
  await field(page, "Проценты, млн ₽", "0,5");
  expect(await metric(page, "ratio-roe")).toBe(0);
  expect(await metric(page, "ratio-icr")).toBe(30);
  await expect(page.getByTestId("ratio-dfl")).toHaveText("Не определено");
  expect(await page.locator(".ratio-results").innerText()).not.toMatch(
    /NaN|Infinity/,
  );
  await noPageOverflow(page);
});
