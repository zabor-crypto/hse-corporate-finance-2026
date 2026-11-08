import type { ExamBlueprint, ExamSlot, PublicationStage } from "./types";
import { c3TheorySpecs } from "../content/c3-theory";
import { c3RatiosFocusBlueprint } from "./c3-ratios-focus";
export { c3RatiosFocusBlueprint } from "./c3-ratios-focus";
// Bounded independent blueprint acceptance is a separate gate from authoring its questions.
export const c3BlueprintReview: PublicationStage = "PUBLISHED";
const slot = (
  id: string,
  chapters: string[],
  kinds: ExamSlot["kinds"],
  hard = false,
): ExamSlot => ({
  id,
  competencyIds: chapters.map((c) => `${c}:core`),
  difficulties: hard ? ["L3", "L4"] : ["L1", "L2", "L3", "L4"],
  kinds,
});
const make = (
  id: string,
  title: string,
  slots: ExamSlot[],
  minutes: number,
): ExamBlueprint => ({
  id,
  version: "1.0.0",
  title,
  moduleIds: ["T3"],
  minutes,
  unseenPolicy: "prefer",
  reviewStatus: c3BlueprintReview,
  competencyWeights: { "T3-05:core": 2, "T3-06:core": 2, "T3-08:core": 2 },
  difficultyWeights: { L1: 1, L2: 1, L3: 2, L4: 2 },
  sourceWeights: { "original-cflos-v1": 2 },
  slots,
});
export const c3Blueprints: ExamBlueprint[] = [
  make(
    "C3-SHORT-A",
    "Тренировочная контрольная А · прибыль и финансовые решения",
    [
      slot("concept1", ["T3-03"], ["single"]),
      slot("concept2", ["T3-06"], ["multi"]),
      slot("cost", ["T3-02"], ["numeric", "steps"]),
      slot("cash", ["T3-04"], ["numeric", "steps"]),
      slot("policy", ["T3-09"], ["numeric", "steps"]),
      slot("budget", ["T3-10"], ["numeric", "steps"]),
    ],
    35,
  ),
  make(
    "C3-SHORT-B",
    "Тренировочная контрольная Б · рост и ликвидность",
    [
      slot("concept1", ["T3-05"], ["single"]),
      slot("concept2", ["T3-08"], ["multi"]),
      slot("model", ["T3-11"], ["numeric", "steps"], true),
      slot("liquidity", ["T3-07"], ["numeric", "steps"], true),
      slot("returns", ["T3-08"], ["numeric", "steps"], true),
      slot("cash", ["T3-04"], ["numeric", "steps"]),
    ],
    45,
  ),
  make(
    "C3-SHORT-C",
    "Тренировочная контрольная В · сопоставление решений",
    [
      slot("concept1", ["T3-01"], ["single"]),
      slot("concept2", ["T3-11"], ["multi"]),
      slot("cost", ["T3-02"], ["numeric", "steps"]),
      slot("debt", ["T3-06"], ["numeric", "steps"]),
      slot("cycle", ["T3-07"], ["numeric", "steps"]),
      slot("growth", ["T3-09"], ["numeric", "steps"]),
    ],
    35,
  ),
  make(
    "C3-INTEGRATED-A",
    "Комплексный расчёт А · три года и цена финансирования",
    [
      slot("model", ["T3-11"], ["steps"], true),
      slot("returns", ["T3-08"], ["steps"], true),
      slot("growth", ["T3-09"], ["steps"], true),
    ],
    60,
  ),
  make(
    "C3-INTEGRATED-B",
    "Комплексный расчёт Б · операционные решения",
    [
      slot("cost", ["T3-02"], ["steps"], true),
      slot("cash", ["T3-04"], ["steps"], true),
      slot("variance", ["T3-10"], ["steps"], true),
    ],
    45,
  ),
  {
    ...make(
      "C3-THEORY-40",
      "Теория и взаимосвязи · 40 ситуаций",
      c3TheorySpecs.map((s, i) => ({
        ...slot(
          `theory-${i + 1}`,
          [s.lesson],
          [s.correct.length === 1 ? "single" : "multi"],
        ),
        problemIds: [`C3-T${String(i + 1).padStart(2, "0")}`],
      })),
      50,
    ),
    unseenPolicy: "allow",
    eligiblePool: c3TheorySpecs.map((_, i) => ({
      problemId: `C3-T${String(i + 1).padStart(2, "0")}`,
      version: "1.0.0",
    })),
  },
  c3RatiosFocusBlueprint,
];
/** Future cumulative assessments require an explicitly reviewed blueprint; unknown syllabus is never invented. */
export function draftCumulativeBlueprint(
  id: string,
  moduleIds: string[],
  slots: ExamSlot[],
  minutes: number,
): ExamBlueprint {
  return {
    id,
    version: "1.0.0",
    title: "Накопительная учебная проверка",
    moduleIds: [...moduleIds],
    minutes,
    unseenPolicy: "require",
    reviewStatus: "DRAFT",
    competencyWeights: {},
    difficultyWeights: {},
    sourceWeights: {},
    slots: structuredClone(slots),
  };
}
