import { parseNumeric, type GradeResult } from "./index";
export type UnitId =
  | "rub"
  | "thousand-rub"
  | "million-rub"
  | "fraction"
  | "percent"
  | "percentage-point"
  | "fraction-point"
  | "multiple"
  | "ratio-fraction"
  | "ratio-percent"
  | "day";
export type Dimension = "money" | "rate" | "rate-difference" | "ratio" | "time";
export const units: Record<
  UnitId,
  { label: string; dimension: Dimension; factor: number }
> = {
  rub: { label: "₽", dimension: "money", factor: 1 },
  "thousand-rub": { label: "тыс. ₽", dimension: "money", factor: 1000 },
  "million-rub": { label: "млн ₽", dimension: "money", factor: 1000000 },
  fraction: { label: "доля", dimension: "rate", factor: 1 },
  percent: { label: "%", dimension: "rate", factor: 0.01 },
  "percentage-point": {
    label: "п.п.",
    dimension: "rate-difference",
    factor: 1,
  },
  "fraction-point": {
    label: "доля изменения ставки",
    dimension: "rate-difference",
    factor: 100,
  },
  multiple: { label: "раз", dimension: "ratio", factor: 1 },
  "ratio-fraction": {
    label: "отношение в долях",
    dimension: "ratio",
    factor: 1,
  },
  "ratio-percent": { label: "% отношения", dimension: "ratio", factor: 0.01 },
  day: { label: "дни", dimension: "time", factor: 1 },
};
const aliases: Record<string, UnitId> = {
  "млн ₽": "million-rub",
  million_RUB: "million-rub",
  "тыс. ₽": "thousand-rub",
  "₽": "rub",
  "%": "percent",
  доля: "fraction",
  fraction: "fraction",
  "п.п.": "percentage-point",
  раз: "multiple",
  раза: "multiple",
  дни: "day",
  дней: "day",
  день: "day",
  days: "day",
};
export interface UnitPolicy {
  displayUnit: string;
  referenceUnit: UnitId;
  canonicalUnit: UnitId;
  acceptedUnits: UnitId[];
  semantics: string;
}
export function unitPolicy(referenceLabel: string): UnitPolicy {
  const referenceUnit = aliases[referenceLabel];
  if (!referenceUnit)
    throw new Error(`Не определена единица эталона: ${referenceLabel}`);
  const dimension = units[referenceUnit].dimension;
  const acceptedUnits = (Object.keys(units) as UnitId[]).filter(
    (id) => units[id].dimension === dimension,
  );
  const canonicalUnit: UnitId =
    dimension === "money"
      ? "rub"
      : dimension === "rate"
        ? "fraction"
        : dimension === "rate-difference"
          ? "percentage-point"
          : dimension === "ratio"
            ? "multiple"
            : "day";
  return {
    displayUnit: referenceLabel,
    referenceUnit,
    canonicalUnit,
    acceptedUnits,
    semantics:
      dimension === "rate"
        ? "20% = 0,20 доли. Процентный пункт — другая величина."
        : dimension === "rate-difference"
          ? "Изменение ставки: 5 п.п. = 0,05 доли изменения; это не относительный рост на 5%."
          : dimension === "money"
            ? "500 тыс. ₽ = 0,5 млн ₽. Число и выбранная единица проверяются вместе."
            : dimension === "ratio"
              ? "Отношение в долях и кратность имеют одинаковый масштаб; 0,2 раза = 20% отношения. Процент ставки — другая величина."
              : "Все периоды цикла выражены в днях.",
  };
}
export interface UnitGrade extends GradeResult {
  canonicalResponse: number | null;
  canonicalExpected: number;
  canonicalTolerance: number;
  inputUnit: string;
  unitStatus: "ASSESSED" | "MISSING" | "INCOMPATIBLE" | "INVALID";
}
export function gradeWithUnits(input: {
  response: string;
  responseUnit: string | undefined;
  expected: number;
  referenceUnit: string;
  tolerance: number;
}): UnitGrade {
  const policy = unitPolicy(input.referenceUnit);
  const canonicalExpected = input.expected * units[policy.referenceUnit].factor;
  const canonicalTolerance =
    input.tolerance * units[policy.referenceUnit].factor;
  if (
    !Number.isFinite(canonicalExpected) ||
    !Number.isFinite(canonicalTolerance) ||
    canonicalTolerance < 0
  )
    throw new Error("Некорректный канонический эталон");
  const result = (
    code: string | null,
    canonicalResponse: number | null,
    status: UnitGrade["unitStatus"],
  ): UnitGrade => ({
    correct: code === null,
    score: code === null ? 1 : 0,
    errorCode: code,
    canonicalResponse,
    canonicalExpected,
    canonicalTolerance,
    inputUnit: input.responseUnit ?? "",
    unitStatus: status,
  });
  if (!input.responseUnit) return result("UNIT_REQUIRED", null, "MISSING");
  if (!Object.hasOwn(units, input.responseUnit))
    return result("UNIT_UNKNOWN", null, "INVALID");
  const id = input.responseUnit as UnitId;
  if (!policy.acceptedUnits.includes(id))
    return result("UNIT_DIMENSION", null, "INCOMPATIBLE");
  const value = parseNumeric(input.response);
  if (value === null)
    return result(
      input.response.trim() === "" ? "EMPTY_RESPONSE" : "INVALID_NUMBER",
      null,
      "ASSESSED",
    );
  const actual = value * units[id].factor;
  if (!Number.isFinite(actual))
    return result("INVALID_NUMBER", null, "INVALID");
  const cushion =
    Number.EPSILON *
    Math.max(1, Math.abs(actual), Math.abs(canonicalExpected)) *
    4;
  if (Math.abs(actual - canonicalExpected) <= canonicalTolerance + cushion)
    return result(null, actual, "ASSESSED");
  if (
    actual !== 0 &&
    canonicalExpected !== 0 &&
    Math.sign(actual) !== Math.sign(canonicalExpected)
  )
    return result("SIGN", actual, "ASSESSED");
  if (canonicalExpected !== 0) {
    const scale = Math.abs(actual / canonicalExpected);
    for (const factor of [100, 1000, 1000000, 0.01, 0.001, 0.000001])
      if (Math.abs(scale - factor) <= Math.max(1e-10, factor * 1e-8))
        return result("SCALE", actual, "ASSESSED");
  }
  return result("VALUE", actual, "ASSESSED");
}
export function unitLabel(id: string | undefined) {
  return id && Object.hasOwn(units, id)
    ? units[id as UnitId].label
    : "единица не выбрана";
}
export const unitFeedback: Record<string, string> = {
  UNIT_REQUIRED:
    "Выберите единицу вашего ответа. Без неё одинаковое число может означать разные величины.",
  UNIT_UNKNOWN: "Эта единица не поддерживается. Исходный ввод сохранён.",
  UNIT_DIMENSION:
    "Выбрана другая величина: деньги, доля, изменение ставки, кратность и дни не взаимозаменяемы.",
  SCALE:
    "Обнаружено расхождение масштаба. Проверьте тысячи и миллионы либо процент и долю.",
  SIGN: "Знак результата противоположен эталону. Проверьте направление сравнения или изменения и экономический смысл знака в этом условии.",
  EMPTY_RESPONSE: "Числовой ответ не введён.",
  INVALID_NUMBER:
    "Введите число; единица выбирается отдельно. Допустима десятичная запятая.",
  VALUE:
    "Единица согласована, но число не совпало. Ниже показано, какое звено расчёта следует проверить.",
};
