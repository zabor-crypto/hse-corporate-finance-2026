export interface SourceRef {
  kind: "lecture" | "seminar" | "original" | "external";
  label: string;
  pages?: number[];
  seminar?: string;
  sourceVersionId?: string;
  url?: string;
}
export type ReviewStatus =
  | "CONTENT_REVIEW_PENDING"
  | "MATH_VERIFIED"
  | "CONTENT_REVIEWED"
  | "TEACHER_ALIGNED"
  | "RELEASED";
export interface Topic {
  id: string;
  title: string;
  summary: string;
  prerequisites: string[];
  outcomes: string[];
  sourceRefs: SourceRef[];
  lessonIds: string[];
  questionIds: string[];
  status: "implemented" | "planned";
  seminarIds: string[];
  roadmapNote?: string;
}
export interface LessonExample {
  title: string;
  inputs: string;
  steps: string[];
  interpretation: string;
}
export interface LessonSection {
  id: string;
  title: string;
  paragraphs: string[];
  formulaIds?: string[];
  businessScenario?: string;
  wrongAttempt?: { attempt: string; diagnosis: string; repair: string };
  deepDive?: string[];
  example?: LessonExample;
  examples?: LessonExample[];
  commonErrors?: string[];
  recall?: { question: string; answer: string }[];
}
export interface Lesson {
  id: string;
  version: string;
  title: string;
  summary: string;
  mentalModel: string;
  minutes: number;
  outcomes: string[];
  sections: LessonSection[];
  sourceRefs: SourceRef[];
  practiceIds?: string[];
  origin: {
    source_grounded: boolean;
    independent_explanation: boolean;
    external_verification: boolean;
  };
}
export interface Formula {
  version?: string;
  id: string;
  title: string;
  latex: string;
  meaning: string;
  symbols: { symbol: string; meaning: string; unit: string }[];
  units: string;
  domain: string[];
  framing: string;
  derivation: string[];
  example: string;
  sanityChecks: string[];
  alternatives: string[];
  lessonId: string;
  sourceRefs: SourceRef[];
}
export interface ProblemStage {
  id: string;
  label: string;
  expected: number;
  unit: string;
  tolerance: number;
  hint: string;
  solution: string;
  errorCode: string;
  weight: number;
}
export interface Problem {
  id: string;
  version: string;
  topicId: string;
  title: string;
  prompt: string;
  difficulty: "L1" | "L2" | "L3" | "L4";
  type: "single" | "multi" | "numeric" | "steps";
  objective: string;
  inputs: { label: string; value: string | number; unit: string }[];
  assumptions: string[];
  options?: { id: string; label: string }[];
  correctOptionIds?: string[];
  stages: ProblemStage[];
  formulaIds: string[];
  lessonId: string;
  solution: string[];
  commonErrors: { code: string; message: string }[];
  sourceRefs: SourceRef[];
  reviewStatus: ReviewStatus;
  oracleId: string;
  alternativeMethods: string[];
  theorySectionId?: string;
  reasoning?: { prompt: string; rubric: string[]; sampleAnswer: string };
  independent?: { prompt: string; stageIds: string[]; title?: string };
  transfer?: { familyId: string; seed?: number; benchmark: boolean };
}
export interface SeminarCompetency {
  id: string;
  title: string;
  topicIds: string[];
  skills: string[];
  status: "implemented" | "planned" | "needs-assumptions";
  assumptions: string[];
  note: string;
}
export type { AnswerRecord } from "../storage/progress";
export const lecture = (...pages: number[]): SourceRef => ({
  kind: "lecture",
  label: `Лекции 1–4 · слайды ${pages.join(", ")}`,
  pages,
});
export const seminar = (id: string): SourceRef => ({
  kind: "seminar",
  label: `Семинар 3 · задача ${id}`,
  seminar: id,
});
export const original: SourceRef = {
  kind: "original",
  label: "Авторское учебное упражнение по понятиям темы 3",
};
