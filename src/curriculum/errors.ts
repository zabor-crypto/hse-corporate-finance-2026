import type { AnswerRecord, Progress } from "../storage/progress";
import type { CurriculumRegistry } from "./types";

/** These are observed grading categories, not an inferred diagnosis of student understanding. */
export function buildErrorLog(data: Progress, r: CurriculumRegistry) {
  return data.answers.flatMap((a) =>
    a.stageResults
      .filter((s) => !s.correct)
      .map((s) => {
        const problem = r.problems.find(
          (p) => p.id === a.problemId && p.version === a.version,
        );
        const pattern = r.errorPatterns.find((p) =>
          p.codes.includes(s.errorCode ?? ""),
        );
        return {
          answerId: a.id,
          problemId: a.problemId,
          version: a.version,
          timestamp: a.timestamp,
          stageId: s.id,
          code: s.errorCode ?? "UNKNOWN",
          category: pattern?.category ?? "formula",
          remedy:
            pattern?.remedy ??
            "Сравните исходную величину, дату, определение и выбранную формулу.",
          competencyIds: problem?.competencyIds.some((id) =>
            id.startsWith("formula:"),
          )
            ? problem.competencyIds.filter((id) => id.startsWith("formula:"))
            : (problem?.competencyIds ?? []),
          familyId: problem?.familyId,
          provenance: problem ? "CURRENT_VERSION" : "HISTORICAL_SNAPSHOT",
        };
      }),
  );
}
export function targetedRetest(
  record: ReturnType<typeof buildErrorLog>[number],
  data: Progress,
  r: CurriculumRegistry,
) {
  const seen = new Set([
    ...Object.keys(data.exposures ?? {}),
    ...data.answers.map((a) => `${a.problemId}@${a.version}`),
  ]);
  return (
    r.problems
      .filter(
        (p) =>
          p.availability === "available" &&
          p.reviewStatus === "PUBLISHED" &&
          p.id !== record.problemId &&
          !seen.has(`${p.id}@${p.version}`) &&
          p.competencyIds.some((id) => record.competencyIds.includes(id)),
      )
      .sort(
        (a, b) =>
          Number(a.familyId === record.familyId) -
            Number(b.familyId === record.familyId) || a.id.localeCompare(b.id),
      )[0] ?? null
  );
}
export function unseenHistory(data: Progress) {
  return {
    seenKeys: [
      ...new Set([
        ...Object.keys(data.exposures ?? {}),
        ...data.answers.map((a: AnswerRecord) => `${a.problemId}@${a.version}`),
      ]),
    ],
  };
}
