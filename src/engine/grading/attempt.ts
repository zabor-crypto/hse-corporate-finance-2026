import type { Problem } from "../../content/types";
import type {
  AnswerRecord,
  Draft,
  Mode,
  Progress,
} from "../../storage/progress";
import { gradeSelection, gradeStages } from "./index";
import { gradeWithUnits } from "./units";
export const GRADING_PROTOCOL = "objective-units-v3.0";
export function assessedStages(p: Problem, mode: Mode) {
  const ids = mode === "study" ? undefined : p.independent?.stageIds;
  return ids ? p.stages.filter((s) => ids.includes(s.id)) : p.stages;
}
export function attemptContext(
  p: Problem,
  draft: Draft,
  mode: Mode,
  data: Progress,
  seenAtEntry = false,
): NonNullable<AnswerRecord["assessmentContext"]> {
  const history = data.answers.filter(
    (a) => a.problemId === p.id && a.version === p.version,
  );
  const priorExposure = data.exposures?.[`${p.id}@${p.version}`];
  const exposureInStudy = priorExposure?.modes.includes("study") ?? false;
  return {
    form: mode === "study" ? "guided" : "independent",
    ...(p.transfer ?? {}),
    seenBefore: seenAtEntry || history.length > 0 || exposureInStudy,
    firstIndependentAttempt: !history.some((a) => a.mode !== "study"),
    assistanceUsed:
      mode === "study" ||
      !!draft.assistanceUsed ||
      !!priorExposure?.assistanceUsed,
  };
}
export function gradeAttempt(
  problem: Problem,
  draft: Draft,
  mode: Mode,
  context?: AnswerRecord["assessmentContext"],
): AnswerRecord {
  const stages = assessedStages(problem, mode);
  const results =
    problem.type === "single" || problem.type === "multi"
      ? [
          {
            id: "selection",
            ...gradeSelection(
              draft.selected,
              problem.correctOptionIds ?? [],
              problem.type,
            ),
          },
        ]
      : stages.map((s) => ({
          id: s.id,
          ...gradeWithUnits({
            response: draft.values[s.id] ?? "",
            responseUnit: draft.units?.[s.id],
            expected: s.expected,
            referenceUnit: s.unit,
            tolerance: s.tolerance,
          }),
        }));
  const objectiveScore = gradeStages(
    results.map((r) => ({
      id: r.id,
      result: r,
      weight: stages.find((s) => s.id === r.id)?.weight ?? 1,
    })),
  ).score;
  return {
    id: crypto.randomUUID(),
    problemId: problem.id,
    version: problem.version,
    mode,
    timestamp: new Date().toISOString(),
    stageResults: results,
    userResponse: structuredClone(draft),
    score: objectiveScore,
    objectiveScore,
    reasoningStatus: problem.reasoning
      ? draft.values.reasoning?.trim()
        ? "SUBMITTED_NOT_REVIEWED"
        : "NOT_SUBMITTED"
      : "NOT_REQUESTED",
    gradingProtocol: GRADING_PROTOCOL,
    assessedStageIds: results.map((r) => r.id),
    unitsStatus: stages.length ? "ASSESSED" : "NOT_APPLICABLE",
    ...(context ? { assessmentContext: context } : {}),
    errorCodes: [
      ...new Set(results.flatMap((r) => (r.errorCode ? [r.errorCode] : []))),
    ],
    verificationStatus: problem.reviewStatus,
    problemSnapshot: structuredClone(problem),
  };
}
