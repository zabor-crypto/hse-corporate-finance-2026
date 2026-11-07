import { reviewLedger } from "./review-ledger";
import { c3Blueprints } from "./blueprints";
import { topics, lessons, formulas, problems } from "../content";
import type {
  RegistryContent,
  CurriculumRegistry,
  PublicationStage,
  CourseModule,
  Competency,
} from "./types";
export * from "./types";
export * from "./integrity";
export * from "./assembly";

export interface RegistryOptions {
  modules?: { id: string; title: string; lessonIds: string[] }[];
  reviewedLessonIds?: readonly string[];
  reviewedLessonVersions?: Record<string, string>;
  reviewedFormulaIds?: readonly string[];
  reviewedFormulaVersions?: Record<string, string>;
  reviewedProblemVersions?: Record<string, string>;
  blueprints?: CurriculumRegistry["blueprints"];
  sourceVersions?: CurriculumRegistry["sourceVersions"];
}
export function createCurriculumRegistry(
  content: RegistryContent,
  options: RegistryOptions = {},
): CurriculumRegistry {
  const definitions = options.modules ?? [
    {
      id: "T3",
      title: "Финансовая отчётность, финансовый анализ и анализ отклонений",
      lessonIds: content.topics.flatMap((t) =>
        t.lessonIds.length ? t.lessonIds : [t.id],
      ),
    },
  ];
  const lessonVersions: Record<string, string> =
    options.reviewedLessonVersions ??
    (options.reviewedLessonIds
      ? Object.fromEntries(
          content.lessons
            .filter((l) => options.reviewedLessonIds!.includes(l.id))
            .map((l) => [l.id, l.version]),
        )
      : reviewLedger.lessons);
  const formulaVersions: Record<string, string> =
    options.reviewedFormulaVersions ??
    (options.reviewedFormulaIds
      ? Object.fromEntries(
          content.formulas
            .filter((f) => options.reviewedFormulaIds!.includes(f.id))
            .map((f) => [f.id, f.version ?? "1.0.0"]),
        )
      : reviewLedger.formulas);
  const problemVersions: Record<string, string> =
    options.reviewedProblemVersions ?? reviewLedger.problems;
  const reviewed = new Set(
    content.lessons
      .filter((l) => lessonVersions[l.id] === l.version)
      .map((l) => l.id),
  );
  const reviewedFormulas = new Set(
    content.formulas
      .filter((f) => formulaVersions[f.id] === (f.version ?? "1.0.0"))
      .map((f) => f.id),
  );
  const sourceVersions: CurriculumRegistry["sourceVersions"] = [
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
      sha256:
        "34369da79956c300600e0abfd81c1da4f6efd75dc2fa0001f42d524952d1d43f",
    },
    {
      id: "seminar-3-v1",
      version: "1.0.0",
      label: "Семинар 3, частный источник преподавателя",
      visibility: "private",
      sha256:
        "8723f367acfa328720b46f19a3f26a8060c60732cc38920cc2e0b23a4dbe6244",
    },
    {
      id: "original-cflos-v1",
      version: "1.0.0",
      label: "Авторские учебные материалы CFLOS",
      visibility: "public",
      asset: "src/content/index.ts",
    },
  ];
  sourceVersions.push(...(options.sourceVersions ?? []));
  const refs = (items: { kind: string; sourceVersionId?: string }[]) => [
    ...new Set(
      items.map(
        (s) =>
          s.sourceVersionId ??
          (s.kind === "lecture"
            ? "lecture-1-4-v1"
            : s.kind === "seminar"
              ? "seminar-3-v1"
              : "original-cflos-v1"),
      ),
    ),
  ];
  const moduleFor = (id: string) =>
    definitions.find((m) => m.lessonIds.includes(id))?.id ?? "UNASSIGNED";
  const competencyFor = (id: string) =>
    `${content.topics.find((t) => t.id === id || t.lessonIds.includes(id))?.id ?? id}:core`;
  const nodes = content.topics.flatMap((t) =>
    (t.lessonIds.length ? t.lessonIds : [t.id]).map((id) => {
      const lesson = content.lessons.find((l) => l.id === id);
      const published = !!lesson && reviewed.has(id);
      return {
        id,
        version: lesson?.version ?? "1.0.0",
        title: lesson?.title ?? t.title,
        moduleId: moduleFor(id),
        sectionIds: lesson?.sections.map((s) => `${lesson.id}/${s.id}`) ?? [],
        competencyIds: [competencyFor(t.id)],
        sourceRefs: lesson?.sourceRefs ?? t.sourceRefs,
        sourceVersionIds: refs(lesson?.sourceRefs ?? t.sourceRefs),
        reviewStatus: (published ? "PUBLISHED" : "DRAFT") as PublicationStage,
        availability: (published ? "available" : "unavailable") as
          "available" | "unavailable",
      };
    }),
  );
  const modules: CourseModule[] = definitions.map((m) => ({
    id: m.id,
    version: "1.0.0",
    title: m.title,
    lessonIds: m.lessonIds,
    courseId: "CF",
    sourceRefs: [],
    sourceVersionIds: [],
    reviewStatus: "PUBLISHED",
    availability: m.lessonIds.some((id) =>
      nodes.some((l) => l.id === id && l.availability === "available"),
    )
      ? "available"
      : "unavailable",
  }));
  const competencies: Competency[] = content.topics.map((t) => ({
    id: competencyFor(t.id),
    version: "1.0.0",
    title: t.outcomes.join("; "),
    moduleId: moduleFor(t.lessonIds[0] ?? t.id),
    prerequisiteIds: t.prerequisites.map(competencyFor),
    sourceRefs: t.sourceRefs,
    sourceVersionIds: refs(t.sourceRefs),
    reviewStatus: (t.lessonIds.length ? t.lessonIds : [t.id]).every((id) =>
      reviewed.has(id),
    )
      ? "PUBLISHED"
      : "DRAFT",
    availability: (t.lessonIds.length ? t.lessonIds : [t.id]).every((id) =>
      reviewed.has(id),
    )
      ? "available"
      : "unavailable",
  }));
  competencies.push(
    ...content.formulas.map((f) => ({
      id: `formula:${f.id}`,
      version: "1.0.0",
      title: f.title,
      moduleId: moduleFor(f.lessonId),
      prerequisiteIds: [competencyFor(f.lessonId)],
      sourceRefs: f.sourceRefs,
      sourceVersionIds: refs(f.sourceRefs),
      reviewStatus: (reviewedFormulas.has(f.id) && reviewed.has(f.lessonId)
        ? "PUBLISHED"
        : "DRAFT") as PublicationStage,
      availability: (reviewedFormulas.has(f.id) && reviewed.has(f.lessonId)
        ? "available"
        : "unavailable") as "available" | "unavailable",
    })),
  );
  const sections = content.lessons.flatMap((l) =>
    l.sections.map((s) => ({
      id: `${l.id}/${s.id}`,
      version: l.version,
      title: s.title,
      lessonId: l.id,
      formulaIds: s.formulaIds ?? [],
      workedExampleIds: [
        ...(s.example ? [s.example] : []),
        ...(s.examples ?? []),
      ].map((_, i) => `${l.id}/${s.id}/example-${i + 1}`),
      sourceRefs: l.sourceRefs,
      sourceVersionIds: refs(l.sourceRefs),
      reviewStatus: (reviewed.has(l.id)
        ? "PUBLISHED"
        : "DRAFT") as PublicationStage,
      availability: (reviewed.has(l.id) ? "available" : "unavailable") as
        "available" | "unavailable",
    })),
  );
  const workedExamples = content.lessons.flatMap((l) =>
    l.sections.flatMap((s) =>
      [...(s.example ? [s.example] : []), ...(s.examples ?? [])].map(
        (e, i) => ({
          id: `${l.id}/${s.id}/example-${i + 1}`,
          version: l.version,
          title: e.title,
          lessonId: l.id,
          sectionId: `${l.id}/${s.id}`,
          sourceRefs: l.sourceRefs,
          sourceVersionIds: refs(l.sourceRefs),
          reviewStatus: (reviewed.has(l.id)
            ? "PUBLISHED"
            : "DRAFT") as PublicationStage,
          availability: (reviewed.has(l.id) ? "available" : "unavailable") as
            "available" | "unavailable",
        }),
      ),
    ),
  );
  const problemNodes = content.problems.map((p) => {
    const published =
      ["CONTENT_REVIEWED", "TEACHER_ALIGNED", "RELEASED"].includes(
        p.reviewStatus,
      ) &&
      problemVersions[p.id] === p.version &&
      reviewed.has(p.lessonId) &&
      p.formulaIds.every(
        (id) =>
          reviewedFormulas.has(id) &&
          content.formulas.some((f) => f.id === id && reviewed.has(f.lessonId)),
      );
    const competencyIds = [
      ...new Set(
        [
          p.topicId,
          ...p.formulaIds
            .map((id) => content.formulas.find((f) => f.id === id)?.lessonId)
            .filter((id): id is string => !!id),
        ]
          .map(competencyFor)
          .concat(p.formulaIds.map((id) => `formula:${id}`)),
      ),
    ];
    return {
      id: p.id,
      version: p.version,
      familyId:
        p.id === "T3-Q27"
          ? "C3-consolidation-reconstruction"
          : p.id === "T3-Q15"
            ? "C3-reverse-gross-roc"
            : (p.transfer?.familyId ?? p.id),
      competencyIds,
      sourceVersionIds: refs(p.sourceRefs),
      lessonId: p.lessonId,
      difficulty: p.difficulty,
      kind: p.type,
      formulaIds: p.formulaIds,
      sectionId: p.theorySectionId
        ? `${p.lessonId}/${p.theorySectionId}`
        : undefined,
      stageIds: p.options ? ["selection"] : p.stages.map((s) => s.id),
      reviewStatus: (published ? "PUBLISHED" : "DRAFT") as PublicationStage,
      availability: (published ? "available" : "unavailable") as
        "available" | "unavailable",
    };
  });
  const families = [...new Set(problemNodes.map((p) => p.familyId))].map(
    (id) => ({
      id,
      version: "1.0.0",
      sourceVersionIds: [
        ...new Set(
          problemNodes
            .filter((p) => p.familyId === id)
            .flatMap((p) => p.sourceVersionIds),
        ),
      ],
      competencyIds: [
        ...new Set(
          problemNodes
            .filter((p) => p.familyId === id)
            .flatMap((p) => p.competencyIds),
        ),
      ],
      problemIds: problemNodes
        .filter((p) => p.familyId === id)
        .map((p) => p.id),
    }),
  );
  return {
    schemaVersion: 1,
    course: {
      id: "CF",
      version: "1.0.0",
      title: "Корпоративные финансы и финансовый анализ",
      moduleIds: modules.map((m) => m.id),
      sourceRefs: [],
      sourceVersionIds: [],
      reviewStatus: "PUBLISHED",
      availability: "available",
    },
    modules,
    lessons: nodes,
    sections,
    competencies,
    sourceVersions,
    formulas: content.formulas.map((f) => ({
      ...f,
      version: f.version ?? "1.0.0",
      competencyIds: [competencyFor(f.lessonId), `formula:${f.id}`],
      sourceVersionIds: refs(f.sourceRefs),
      reviewStatus: (reviewedFormulas.has(f.id) && reviewed.has(f.lessonId)
        ? "PUBLISHED"
        : "DRAFT") as PublicationStage,
      availability: (reviewedFormulas.has(f.id) && reviewed.has(f.lessonId)
        ? "available"
        : "unavailable") as "available" | "unavailable",
    })),
    workedExamples,
    problems: problemNodes,
    families,
    blueprints: options.blueprints ?? [],
    errorPatterns: [
      {
        id: "unit",
        category: "unit" as const,
        codes: ["UNIT_REQUIRED", "UNIT_UNKNOWN", "UNIT_DIMENSION", "SCALE"],
        remedy: "Назовите величину и масштаб до подстановки чисел.",
      },
      {
        id: "sign",
        category: "sign" as const,
        codes: ["SIGN"],
        remedy: "Сопоставьте направление изменения с экономическим потоком.",
      },
      {
        id: "concept",
        category: "concept" as const,
        codes: ["CONCEPT", "SELECTION"],
        remedy:
          "Обоснуйте каждый вариант; найдите контрпример неверному выводу.",
      },
      {
        id: "timing",
        category: "timing" as const,
        codes: ["TIMING", "BASE", "DIV_TIMING"],
        remedy:
          "Нарисуйте даты потока и начального, среднего или конечного остатка.",
      },
      {
        id: "formula",
        category: "formula" as const,
        codes: ["VALUE", "INVALID_NUMBER", "EMPTY_RESPONSE"],
        remedy:
          "Восстановите связь показателей и проверьте независимым способом.",
      },
      {
        id: "interpretation",
        category: "interpretation" as const,
        codes: ["INTERPRETATION"],
        remedy:
          "Отделите вычисленный результат от причинного вывода, требующего новых данных.",
      },
    ].map((pattern) => ({
      ...pattern,
      version: "1.0.0",
      competencyIds: [...new Set(problemNodes.flatMap((p) => p.competencyIds))],
      sourceVersionIds: ["original-cflos-v1"],
    })),
  };
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
