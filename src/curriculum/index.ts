import { reviewLedger } from "./review-ledger";
import { c3Blueprints } from "./blueprints";
import { topics, lessons, formulas, problems } from "../content";
import type { RegistryContent, CurriculumRegistry } from "./types";
import {
  createCurriculumRegistry as createPureRegistry,
  type RegistryOptions,
} from "./factory";
import { registerContent, registerRegistry } from "../runtime/store";
export type { RegistryOptions } from "./factory";
export * from "./types";
export * from "./integrity";
export * from "./assembly";

const defaultSources: CurriculumRegistry["sourceVersions"] = [
  {
    id: "ias7-overview-v1",
    version: "1.0.0",
    label: "IFRS Foundation: IAS 7 overview",
    visibility: "public",
    asset:
      "https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/",
  },
  {
    id: "ifrs18-overview-v1",
    version: "1.0.0",
    label: "IFRS Foundation: IFRS 18 overview",
    visibility: "public",
    asset:
      "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/",
  },
  {
    id: "lecture-1-4-v1",
    version: "1.0.0",
    label: "Лекции 1–4, частный источник преподавателя",
    visibility: "private",
    sha256: "34369da79956c300600e0abfd81c1da4f6efd75dc2fa0001f42d524952d1d43f",
  },
  {
    id: "seminar-3-v1",
    version: "1.0.0",
    label: "Семинар 3, частный источник преподавателя",
    visibility: "private",
    sha256: "8723f367acfa328720b46f19a3f26a8060c60732cc38920cc2e0b23a4dbe6244",
  },
  {
    id: "original-cflos-v1",
    version: "1.0.0",
    label: "Авторские учебные материалы CFLOS",
    visibility: "public",
    asset: "src/content/index.ts",
  },
];
export function createCurriculumRegistry(
  content: RegistryContent,
  options: RegistryOptions = {},
): CurriculumRegistry {
  return createPureRegistry(content, {
    ...options,
    modules: options.modules ?? [
      {
        id: "T3",
        title: "Финансовая отчётность, финансовый анализ и анализ отклонений",
        lessonIds: content.topics.flatMap((t) =>
          t.lessonIds.length ? t.lessonIds : [t.id],
        ),
      },
    ],
    ...(!options.reviewedLessonVersions && !options.reviewedLessonIds
      ? { reviewedLessonVersions: reviewLedger.lessons }
      : {}),
    ...(!options.reviewedFormulaVersions && !options.reviewedFormulaIds
      ? { reviewedFormulaVersions: reviewLedger.formulas }
      : {}),
    reviewedProblemVersions:
      options.reviewedProblemVersions ?? reviewLedger.problems,
    sourceVersions: [...defaultSources, ...(options.sourceVersions ?? [])],
    sourceForKind: options.sourceForKind ?? {
      lecture: "lecture-1-4-v1",
      seminar: "seminar-3-v1",
      original: "original-cflos-v1",
    },
    authorSourceVersionIds: options.authorSourceVersionIds ?? [
      "original-cflos-v1",
    ],
  });
}
export const curriculumRegistry = createCurriculumRegistry(
  {
    topics,
    lessons,
    formulas,
    problems,
  },
  { blueprints: c3Blueprints },
);
export const publishedModules = () =>
  curriculumRegistry.modules.filter((m) => m.availability === "available");
export const availableLessons = (moduleId?: string) =>
  curriculumRegistry.lessons.filter(
    (l) =>
      l.availability === "available" && (!moduleId || l.moduleId === moduleId),
  );

registerContent("T3", { topics, lessons, formulas, problems });
registerRegistry("T3", curriculumRegistry);
