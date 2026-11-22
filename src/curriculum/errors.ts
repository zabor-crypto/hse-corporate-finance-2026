import type { AnswerRecord, Progress } from "../storage/progress";
import type { CurriculumRegistry } from "./types";
import type { Problem } from "../content/types";

const skillIds = (ids: string[]) => {
  const explicit = ids.filter(id => !id.startsWith("formula:") && !id.startsWith("lesson:"));
  return explicit.length ? explicit : ids;
};
const snapshotOf = (answer: AnswerRecord): Partial<Problem> =>
  answer.problemSnapshot && typeof answer.problemSnapshot === "object"
    ? answer.problemSnapshot as Partial<Problem>
    : {};

/** Resolve a reviewed stage's explanation without reinterpreting its stored numerical answer. */
export function remedyRouteFor(problemId: string, registry: CurriculumRegistry, snapshot: Partial<Problem> = {}, stageId?: string) {
  const matched = registry.problems.find(p => p.id === problemId);
  const current = snapshot.version && snapshot.version !== matched?.version ? undefined : matched;
  const bareSection = (id: string, lesson: string) => id.startsWith(`${lesson}/`) ? id.slice(lesson.length + 1) : id;
  const lessonId = current?.lessonId ?? snapshot.lessonId;
  const moduleId = registry.lessons.find(l => l.id === lessonId)?.moduleId;
  for (const target of stageId ? current?.stageTheoryIds?.[stageId] ?? [] : []) {
    const formula = registry.formulas.find(f => f.id === target && f.availability === "available");
    if (formula) {
      const sections = registry.sections.filter(s => s.formulaIds.includes(formula.id)
        && registry.lessons.find(l => l.id === s.lessonId)?.moduleId === moduleId);
      const section = sections.find(s => s.lessonId === lessonId) ?? sections[0];
      if (section) return `learn/${section.lessonId}/${formula.id}`;
    }
    const [lesson, section] = target.split("/");
    if (registry.sections.some(s => s.lessonId === lesson && bareSection(s.id, lesson) === section)) return `learn/${target}`;
  }
  const sectionId = current?.sectionId ?? snapshot.theorySectionId;
  const section = registry.sections.find(s => s.lessonId === lessonId && (s.id === sectionId || bareSection(s.id, lessonId) === sectionId))
    ?? registry.sections.find(s => s.lessonId === lessonId);
  return lessonId ? `learn/${lessonId}${section ? `/${bareSection(section.id, lessonId)}` : ""}` : null;
}

/** Categories describe observed answer differences, never a diagnosis of understanding. */
export function buildErrorLog(data: Progress, registry: CurriculumRegistry) {
  return data.answers.flatMap(answer => answer.stageResults.filter(stage => !stage.correct).map(stage => {
    const problem = registry.problems.find(p => p.id === answer.problemId && p.version === answer.version);
    const current = problem ?? registry.problems.find(p => p.id === answer.problemId);
    const snapshot = snapshotOf(answer);
    const pattern = registry.errorPatterns.find(p => p.codes.includes(stage.errorCode ?? ""));
    const lessonId = current?.lessonId ?? snapshot.lessonId;
    return {
      answerId: answer.id, problemId: answer.problemId, version: answer.version,
      timestamp: answer.timestamp, stageId: stage.id, code: stage.errorCode ?? "UNKNOWN",
      category: pattern?.category ?? "formula", remedy: pattern?.remedy ?? "Сверьте исходную величину, дату потока и выбранную единицу.",
      competencyIds: skillIds(problem?.stageCompetencyIds?.[stage.id] ?? problem?.assessmentCompetencyIds ?? problem?.competencyIds ?? []),
      familyId: problem?.familyId, lessonId, difficulty: problem?.difficulty ?? snapshot.difficulty,
      stageLabel: Array.isArray(snapshot.stages) ? snapshot.stages.find(s => s.id === stage.id)?.label : undefined,
      title: typeof snapshot.title === "string" ? snapshot.title : answer.problemId,
      theoryRoute: remedyRouteFor(answer.problemId, registry, snapshot, stage.id),
      provenance: problem ? "CURRENT_VERSION" as const : "HISTORICAL_SNAPSHOT" as const,
    };
  }));
}

export function targetedRetest(record: ReturnType<typeof buildErrorLog>[number], data: Progress, registry: CurriculumRegistry) {
  if (record.provenance !== "CURRENT_VERSION" || !record.difficulty || !record.lessonId) return null;
  const origin = registry.lessons.find(l => l.id === record.lessonId);
  if (!origin) return null;
  const moduleLessons = registry.lessons.filter(l => l.moduleId === origin.moduleId);
  // The failed task exposes its lesson; reading/exposure is context, not proof of mastery.
  const covered = moduleLessons.findIndex(l => l.id === origin.id);
  const knownLessons = new Set(moduleLessons.slice(0, covered + 1).map(l => l.id));
  for (const lesson of moduleLessons)
    if (Object.keys(data.lessons).some(key => key.startsWith(`${lesson.id}@`))) knownLessons.add(lesson.id);
  const seenIds = new Set([...data.answers.map(a => a.problemId), ...Object.keys(data.exposures ?? {}).map(key => key.split("@")[0])]);
  const level = (d: string) => Number(d.slice(1));
  const overlap = (ids: string[]) => skillIds(ids).filter(id => record.competencyIds.includes(id)).length;
  return registry.problems.filter(p =>
    p.availability === "available" && p.reviewStatus === "PUBLISHED" &&
    p.id !== record.problemId && !seenIds.has(p.id) &&
    level(p.difficulty) <= level(record.difficulty!) &&
    knownLessons.has(p.lessonId) && (p.requiredLessonIds ?? [p.lessonId]).every(id => knownLessons.has(id)) &&
    record.competencyIds.length > 0 && record.competencyIds.every(id => skillIds(p.assessmentCompetencyIds ?? p.competencyIds).includes(id))
  ).sort((a, b) => overlap(b.assessmentCompetencyIds ?? b.competencyIds) - overlap(a.assessmentCompetencyIds ?? a.competencyIds)
    || Math.abs(level(a.difficulty) - level(record.difficulty!)) - Math.abs(level(b.difficulty) - level(record.difficulty!))
    || Number(a.familyId === record.familyId) - Number(b.familyId === record.familyId)
    || a.id.localeCompare(b.id))[0] ?? null;
}

export function unseenHistory(data: Progress, registry?: CurriculumRegistry) {
  const original = [...Object.keys(data.exposures ?? {}), ...data.answers.map((a: AnswerRecord) => `${a.problemId}@${a.version}`)];
  const seenIds = new Set(original.map(key => key.split("@")[0]));
  // A metadata revision is not a previously unseen economic situation.
  const current = registry?.problems.filter(p => seenIds.has(p.id)).map(p => `${p.id}@${p.version}`) ?? [];
  return { seenKeys: [...new Set([...original, ...current])] };
}
