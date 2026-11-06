import {
  lecture,
  original,
  seminar,
  type Problem,
  type ProblemStage,
} from "../types";
export const money = "млн ₽";
export const pct = "%";
export const times = "раз";
export const days = "дни";
export const pp = "п.п.";
export const stage = (
  id: string,
  label: string,
  expected: number,
  unit: string,
  hint: string,
  solution: string,
  errorCode: string,
  tolerance = 0.01,
): ProblemStage => ({
  id,
  label,
  expected,
  unit,
  hint,
  solution,
  errorCode,
  tolerance,
  weight: 1,
});
export const draftBase = {
  version: "1.0.0",
  reviewStatus: "CONTENT_REVIEWED" as const,
  alternativeMethods: [
    "Любой эквивалентный расчёт при указанных определениях, единицах и периоде; независимые проверки должны сходиться.",
  ],
  sourceRefs: [original],
};
export const source = { lecture, original, seminar };
export const fmt = (n: number) =>
  Number(n.toFixed(6)).toLocaleString("ru-RU", { maximumFractionDigits: 6 });
export interface ScenarioIdentity {
  id: string;
  familyId: string;
  seed?: number;
  benchmark: boolean;
}
export function identity(
  meta: ScenarioIdentity,
): Pick<Problem, "id" | "transfer" | "oracleId"> {
  return {
    id: meta.id,
    transfer: {
      familyId: meta.familyId,
      seed: meta.seed,
      benchmark: meta.benchmark,
    },
    oracleId: `TRANCHE03_${meta.id}`,
  };
}
