export * from "./types";
import { topics as topicCatalog, seminarMap } from "./topics";
export { seminarMap };
import { reviewLedger } from "../curriculum/review-ledger";
import { c3Lessons } from "./c3-lessons";
import { lessonT311 } from "./c3-integrated";
import { c3Formulas } from "./c3-formulas";
import { c3Problems } from "./c3-questions";
import { c3TheoryProblems } from "./c3-theory";
import { c3ModelProblems } from "./c3-model-problems";
import { c3ConsolidationProblems } from "./c3-consolidation";
import { c3ReverseLeverageProblems } from "./c3-leverage-reverse";
import { c3RatiosFocusProblems } from "./c3-ratios-focus";
export {
  c3RatiosFocusProblems,
  c3RatiosFocusScenarioInputs,
} from "./c3-ratios-focus";
import {
  c3TargetSections,
  c3TargetFormulas,
  c3TargetLessons,
} from "./c3-linkage";
import { lessons as foundationLessons } from "./lessons";
import { ratiosLessons } from "./ratios-lessons";
export { ratiosLessons };
import { lessonT307 } from "./lessons/t3-07";
export const lessons = [
  ...foundationLessons,
  ...ratiosLessons,
  lessonT307,
  ...c3Lessons,
  lessonT311,
].sort((a, b) => a.id.localeCompare(b.id));
import { formulas as foundationFormulas } from "./formulas";
import { ratiosFormulas } from "./ratios-formulas";
export { ratiosFormulas };
import { liquidityFormulas } from "./liquidity-formulas";
export { liquidityFormulas };
import { equityCashFormula } from "./equity-cash-formula";
export const formulas = [
  ...foundationFormulas,
  ...ratiosFormulas,
  ...liquidityFormulas,
  equityCashFormula,
  ...c3Formulas,
];
import { problems as foundationProblems } from "./questions";
import { ratiosProblems } from "./ratios-questions";
export { sampleExamIds } from "./questions";
export { ratiosProblems, ratiosExamIds } from "./ratios-questions";
import { curatedAssessmentProblems } from "./assessment";
import { allTransferVariants } from "./transfer";
export * from "./assessment";
export * from "./transfer";
export const problems = [
  ...foundationProblems,
  ...ratiosProblems,
  ...curatedAssessmentProblems,
  ...allTransferVariants,
  ...[
    ...c3Problems,
    ...c3TheoryProblems,
    ...c3ModelProblems,
    ...c3ConsolidationProblems,
    ...c3ReverseLeverageProblems,
    ...c3RatiosFocusProblems,
  ].map((p) => ({
    ...p,
    ...(c3TargetLessons[p.id]
      ? { lessonId: c3TargetLessons[p.id], topicId: c3TargetLessons[p.id] }
      : {}),
    ...(c3TargetSections[p.id]
      ? { theorySectionId: c3TargetSections[p.id] }
      : {}),
    ...(c3TargetFormulas[p.id] ? { formulaIds: c3TargetFormulas[p.id] } : {}),
    reviewStatus:
      reviewLedger.problems[p.id] === p.version
        ? ("CONTENT_REVIEWED" as const)
        : p.reviewStatus,
  })),
];
export const topics = topicCatalog.map((t) => {
  const lessonIds = [
    ...new Set([
      ...t.lessonIds,
      ...lessons.filter((l) => l.id === t.id).map((l) => l.id),
    ]),
  ];
  return {
    ...t,
    lessonIds,
    questionIds: problems.filter((p) => p.topicId === t.id).map((p) => p.id),
    status: lessonIds.some((id) =>
      lessons.some(
        (l) => l.id === id && reviewLedger.lessons[id] === l.version,
      ),
    )
      ? ("implemented" as const)
      : ("planned" as const),
  };
});
