/** Objective grading only. Free-text reasoning is never semantically graded here. */
export interface GradeResult {
  correct: boolean;
  score: number;
  errorCode: string | null;
}
export function parseNumeric(response: string): number | null {
  if (typeof response !== "string") return null;
  const trimmed = response.trim().replace(/\u2212/g, "-");
  if (
    /[\s\u00a0\u202f]/.test(trimmed) &&
    !/^[+-]?\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?$/.test(trimmed)
  )
    return null;
  const normalized = trimmed.replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized))
    return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
const failure = (errorCode: string): GradeResult => ({
  correct: false,
  score: 0,
  errorCode,
});
export function gradeNumeric(input: {
  response: string;
  expected: number;
  absoluteTolerance: number;
  relativeTolerance?: number;
  responseUnit: string;
  expectedUnit: string;
}): GradeResult {
  const { expected, absoluteTolerance, relativeTolerance = 0 } = input;
  if (
    !Number.isFinite(expected) ||
    !Number.isFinite(absoluteTolerance) ||
    absoluteTolerance < 0 ||
    !Number.isFinite(relativeTolerance) ||
    relativeTolerance < 0 ||
    !input.expectedUnit
  )
    throw new Error("Invalid numeric grading specification");
  const response = parseNumeric(input.response);
  if (response === null) return failure("INVALID_NUMBER");
  if (input.responseUnit !== input.expectedUnit) return failure("UNIT");
  const tolerance = Math.max(
    absoluteTolerance,
    Math.abs(expected) * relativeTolerance,
  );
  // A small machine precision cushion only resolves floating point boundary noise.
  const precisionCushion =
    Number.EPSILON * Math.max(1, Math.abs(expected), Math.abs(response)) * 4;
  if (Math.abs(response - expected) <= tolerance + precisionCushion)
    return { correct: true, score: 1, errorCode: null };
  return failure(
    expected !== 0 &&
      response !== 0 &&
      Math.sign(expected) !== Math.sign(response)
      ? "SIGN"
      : "VALUE",
  );
}
/** Multi-select uses the exact entire set; duplicates and single-select multiple answers fail. */
export function gradeSelection(
  response: string[],
  expected: string[],
  mode: "single" | "multi",
): GradeResult {
  if (
    !expected.length ||
    new Set(expected).size !== expected.length ||
    (mode === "single" && expected.length !== 1)
  )
    throw new Error("Invalid selection grading specification");
  if (
    !Array.isArray(response) ||
    response.length === 0 ||
    new Set(response).size !== response.length ||
    (mode === "single" && response.length !== 1)
  )
    return failure("SELECTION");
  const correct =
    response.length === expected.length &&
    expected.every((value) => response.includes(value));
  return correct
    ? { correct: true, score: 1, errorCode: null }
    : failure("CONCEPT");
}
/** Partial credit is assigned to independent, explicitly weighted stages. */
export function gradeStages(
  stages: { id: string; result: GradeResult; weight: number }[],
) {
  if (!stages.length || new Set(stages.map((s) => s.id)).size !== stages.length)
    throw new Error("Stages require unique IDs");
  let earned = 0;
  let total = 0;
  for (const stage of stages) {
    if (
      !Number.isFinite(stage.weight) ||
      stage.weight <= 0 ||
      !Number.isFinite(stage.result.score) ||
      stage.result.score < 0 ||
      stage.result.score > 1
    )
      throw new Error("Invalid stage weight/score");
    total += stage.weight;
    earned += stage.weight * stage.result.score;
  }
  return {
    score: earned / total,
    correct: stages.every((s) => s.result.correct),
    stages,
    errorCodes: [
      ...new Set(
        stages.flatMap((s) => (s.result.errorCode ? [s.result.errorCode] : [])),
      ),
    ],
  };
}
