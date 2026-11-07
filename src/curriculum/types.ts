import type {
  Formula,
  Lesson,
  Problem,
  SourceRef,
  Topic,
} from "../content/types";

export type PublicationStage =
  | "DRAFT"
  | "SOURCE_REVIEW"
  | "FINANCE_REVIEW"
  | "PEDAGOGICAL_REVIEW"
  | "PUBLISHED";
export type Availability = "available" | "unavailable";
export interface VersionedNode {
  id: string;
  version: string;
  title: string;
  sourceRefs: SourceRef[];
  sourceVersionIds: string[];
  reviewStatus: PublicationStage;
  availability: Availability;
}
export interface Course extends VersionedNode {
  moduleIds: string[];
}
export interface CourseModule extends VersionedNode {
  courseId: string;
  lessonIds: string[];
}
export interface CurriculumLesson extends VersionedNode {
  moduleId: string;
  sectionIds: string[];
  competencyIds: string[];
}
export interface CurriculumSection extends VersionedNode {
  lessonId: string;
  formulaIds: string[];
  workedExampleIds: string[];
}
export interface Competency extends VersionedNode {
  moduleId: string;
  prerequisiteIds: string[];
}
export interface SourceVersion {
  id: string;
  version: string;
  label: string;
  visibility: "private" | "public";
  asset?: string;
  sha256?: string;
}
export interface LinkedFormula extends Formula {
  version: string;
  competencyIds: string[];
  sourceVersionIds: string[];
  reviewStatus: PublicationStage;
  availability: Availability;
}
export interface WorkedExample extends VersionedNode {
  lessonId: string;
  sectionId: string;
}
export interface CurriculumProblem {
  id: string;
  version: string;
  familyId: string;
  competencyIds: string[];
  sourceVersionIds: string[];
  lessonId: string;
  difficulty: Problem["difficulty"];
  kind: Problem["type"];
  formulaIds: string[];
  sectionId?: string;
  stageIds: string[];
  reviewStatus: PublicationStage;
  availability: Availability;
}
export interface ProblemFamily {
  id: string;
  version: string;
  sourceVersionIds: string[];
  competencyIds: string[];
  problemIds: string[];
}
export interface ErrorPattern {
  id: string;
  version: string;
  competencyIds: string[];
  sourceVersionIds: string[];
  category:
    "concept" | "sign" | "unit" | "timing" | "formula" | "interpretation";
  codes: string[];
  remedy: string;
}
export interface ExamSlot {
  id: string;
  competencyIds: string[];
  difficulties: Problem["difficulty"][];
  kinds?: Problem["type"][];
  sourceVersionIds?: string[];
  problemIds?: string[];
}
export interface ExamBlueprint {
  id: string;
  version: string;
  title: string;
  moduleIds: string[];
  minutes: number;
  unseenPolicy: "require" | "prefer" | "allow";
  reviewStatus: PublicationStage;
  competencyWeights: Record<string, number>;
  difficultyWeights: Partial<Record<Problem["difficulty"], number>>;
  sourceWeights: Record<string, number>;
  slots: ExamSlot[];
  eligiblePool?: { problemId: string; version: string }[];
}
/** Exact assembly identity is retained with the session; later registry edits never reassemble it. */
export interface PaperSnapshot {
  blueprint: ExamBlueprint;
  seed: number;
  assembledAt: string;
  problemIds: string[];
  versions: Record<string, string>;
  familyIds: string[];
  sourceVersionIds: string[];
}
export interface CurriculumRegistry {
  schemaVersion: 1;
  course: Course;
  modules: CourseModule[];
  lessons: CurriculumLesson[];
  sections: CurriculumSection[];
  competencies: Competency[];
  sourceVersions: SourceVersion[];
  formulas: LinkedFormula[];
  workedExamples: WorkedExample[];
  problems: CurriculumProblem[];
  families: ProblemFamily[];
  blueprints: ExamBlueprint[];
  errorPatterns: ErrorPattern[];
}
export interface RegistryContent {
  topics: Topic[];
  lessons: Lesson[];
  formulas: Formula[];
  problems: Problem[];
}
export const PUBLICATION_STAGES: PublicationStage[] = [
  "DRAFT",
  "SOURCE_REVIEW",
  "FINANCE_REVIEW",
  "PEDAGOGICAL_REVIEW",
  "PUBLISHED",
];
export function nextReviewStage(
  current: PublicationStage,
  next: PublicationStage,
) {
  if (
    PUBLICATION_STAGES.indexOf(next) !==
    PUBLICATION_STAGES.indexOf(current) + 1
  )
    throw new Error(
      "Review stages must advance one independently reviewed step at a time",
    );
  return next;
}
export function validExamBlueprint(value: unknown): value is ExamBlueprint {
  if (!value || typeof value !== "object") return false;
  const b = value as ExamBlueprint;
  const nonempty = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length > 0;
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(nonempty) &&
    new Set(v).size === v.length;
  const weights = (v: unknown) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.entries(v).every(
      ([k, w]) =>
        nonempty(k) && typeof w === "number" && Number.isFinite(w) && w > 0,
    );
  return (
    nonempty(b.id) &&
    typeof b.version === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(b.version) &&
    nonempty(b.title) &&
    strings(b.moduleIds) &&
    Number.isFinite(b.minutes) &&
    b.minutes > 0 &&
    ["require", "prefer", "allow"].includes(b.unseenPolicy) &&
    PUBLICATION_STAGES.includes(b.reviewStatus) &&
    weights(b.competencyWeights) &&
    weights(b.difficultyWeights) &&
    Object.keys(b.difficultyWeights).every((k) =>
      ["L1", "L2", "L3", "L4"].includes(k),
    ) &&
    weights(b.sourceWeights) &&
    (b.eligiblePool === undefined ||
      (Array.isArray(b.eligiblePool) &&
        b.eligiblePool.length > 0 &&
        new Set(b.eligiblePool.map((p) => p?.problemId)).size ===
          b.eligiblePool.length &&
        b.eligiblePool.every(
          (p) =>
            !!p &&
            nonempty(p.problemId) &&
            typeof p.version === "string" &&
            /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(p.version),
        ))) &&
    Array.isArray(b.slots) &&
    b.slots.length > 0 &&
    new Set(b.slots.map((s) => s?.id)).size === b.slots.length &&
    b.slots.every(
      (s) =>
        !!s &&
        typeof s === "object" &&
        nonempty(s.id) &&
        strings(s.competencyIds) &&
        strings(s.difficulties) &&
        s.difficulties.every((d) => ["L1", "L2", "L3", "L4"].includes(d)) &&
        (s.kinds === undefined ||
          (strings(s.kinds) &&
            s.kinds.every((k) =>
              ["single", "multi", "numeric", "steps"].includes(k),
            ))) &&
        (s.sourceVersionIds === undefined || strings(s.sourceVersionIds)) &&
        (s.problemIds === undefined || strings(s.problemIds)),
    )
  );
}
