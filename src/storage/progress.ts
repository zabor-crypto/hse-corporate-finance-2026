export type Mode = "study" | "practice" | "exam";
export interface Draft {
  values: Record<string, string>;
  selected: string[];
  units?: Record<string, string>;
  workpad?: string;
  assistanceUsed?: boolean;
}
export interface AnswerRecord {
  id: string;
  problemId: string;
  version: string;
  mode: Mode;
  timestamp: string;
  stageResults: {
    id: string;
    correct: boolean;
    score: number;
    errorCode: string | null;
  }[];
  userResponse: Draft;
  score: number;
  errorCodes: string[];
  verificationStatus: string;
  problemSnapshot: unknown;
  objectiveScore?: number;
  reasoningStatus?:
    | "NOT_REQUESTED"
    | "NOT_SUBMITTED"
    | "SUBMITTED_NOT_REVIEWED"
    | "SELF_REVIEWED";
  gradingProtocol?: string;
  assessedStageIds?: string[];
  unitsStatus?: "ASSESSED" | "NOT_APPLICABLE" | "LEGACY_NOT_ASSESSED";
  assessmentContext?: {
    form: "guided" | "independent";
    familyId?: string;
    seed?: number;
    benchmark?: boolean;
    seenBefore: boolean;
    firstIndependentAttempt: boolean;
    assistanceUsed: boolean;
  };
}
export interface ExamSession {
  id: string;
  problemIds: string[];
  versions: Record<string, string>;
  startedAt: string;
  finishedAt?: string;
  seenProblemIds?: string[];
}
export interface Progress {
  schemaVersion: 1;
  lessons: Record<string, string>;
  drafts: Record<string, Draft>;
  answers: AnswerRecord[];
  exam: ExamSession | null;
  archives: unknown[];
  exposures?: Record<
    string,
    { firstSeenAt: string; assistanceUsed: boolean; modes: Mode[] }
  >;
  reasoningReviews?: {
    answerId: string;
    timestamp: string;
    checkedIndices: number[];
  }[];
  returnContext?: { route: string; problemId: string } | null;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const STORAGE_KEY = "cflos.progress.v1";
export const blankProgress = (): Progress => ({
  schemaVersion: 1,
  lessons: {},
  drafts: {},
  answers: [],
  exam: null,
  archives: [],
});
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const strings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");
const dict = (x: unknown): x is Record<string, string> =>
  object(x) && Object.values(x).every((v) => typeof v === "string");
const validDate = (x: unknown) =>
  typeof x === "string" && Number.isFinite(Date.parse(x));
const finiteScore = (x: unknown) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
export function validDraft(x: unknown): x is Draft {
  return (
    object(x) &&
    dict(x.values) &&
    (x.units === undefined || dict(x.units)) &&
    (x.workpad === undefined || typeof x.workpad === "string") &&
    (x.assistanceUsed === undefined || typeof x.assistanceUsed === "boolean") &&
    strings(x.selected) &&
    new Set(x.selected).size === x.selected.length
  );
}
export function validProblemSnapshot(x: unknown): boolean {
  return (
    object(x) &&
    typeof x.title === "string" &&
    typeof x.id === "string" &&
    typeof x.version === "string" &&
    strings(x.solution) &&
    (x.lessonId === undefined || typeof x.lessonId === "string") &&
    (x.formulaIds === undefined || strings(x.formulaIds)) &&
    (x.commonErrors === undefined ||
      (Array.isArray(x.commonErrors) &&
        x.commonErrors.every(
          (e) =>
            object(e) &&
            typeof e.code === "string" &&
            typeof e.message === "string",
        ))) &&
    (x.reasoning === undefined ||
      (object(x.reasoning) &&
        typeof x.reasoning.prompt === "string" &&
        strings(x.reasoning.rubric) &&
        typeof x.reasoning.sampleAnswer === "string")) &&
    Array.isArray(x.stages) &&
    x.stages.every(
      (s) =>
        object(s) &&
        typeof s.id === "string" &&
        typeof s.label === "string" &&
        typeof s.unit === "string" &&
        typeof s.solution === "string" &&
        typeof s.expected === "number" &&
        Number.isFinite(s.expected),
    )
  );
}
export function validProgress(x: unknown): x is Progress {
  if (
    !object(x) ||
    x.schemaVersion !== 1 ||
    !dict(x.lessons) ||
    !object(x.drafts) ||
    !Object.values(x.drafts).every(validDraft) ||
    !Array.isArray(x.answers) ||
    !Array.isArray(x.archives)
  )
    return false;
  if (
    x.exposures !== undefined &&
    (!object(x.exposures) ||
      !Object.values(x.exposures).every(
        (e) =>
          object(e) &&
          validDate(e.firstSeenAt) &&
          typeof e.assistanceUsed === "boolean" &&
          strings(e.modes) &&
          e.modes.every((m) => ["study", "practice", "exam"].includes(m)),
      ))
  )
    return false;
  if (
    x.reasoningReviews !== undefined &&
    (!Array.isArray(x.reasoningReviews) ||
      !x.reasoningReviews.every(
        (e) =>
          object(e) &&
          typeof e.answerId === "string" &&
          validDate(e.timestamp) &&
          Array.isArray(e.checkedIndices) &&
          e.checkedIndices.every((i) => Number.isInteger(i) && i >= 0),
      ))
  )
    return false;
  if (
    x.returnContext !== undefined &&
    x.returnContext !== null &&
    (!object(x.returnContext) ||
      typeof x.returnContext.route !== "string" ||
      typeof x.returnContext.problemId !== "string")
  )
    return false;
  if (
    !x.answers.every(
      (a) =>
        object(a) &&
        ["id", "problemId", "version", "timestamp", "verificationStatus"].every(
          (k) => typeof a[k] === "string",
        ) &&
        ["study", "practice", "exam"].includes(a.mode as string) &&
        validDate(a.timestamp) &&
        finiteScore(a.score) &&
        (a.objectiveScore === undefined ||
          (finiteScore(a.objectiveScore) && a.objectiveScore === a.score)) &&
        (a.reasoningStatus === undefined ||
          [
            "NOT_REQUESTED",
            "NOT_SUBMITTED",
            "SUBMITTED_NOT_REVIEWED",
            "SELF_REVIEWED",
          ].includes(a.reasoningStatus as string)) &&
        (a.assessedStageIds === undefined || strings(a.assessedStageIds)) &&
        (a.gradingProtocol === undefined ||
          typeof a.gradingProtocol === "string") &&
        (a.unitsStatus === undefined ||
          ["ASSESSED", "NOT_APPLICABLE", "LEGACY_NOT_ASSESSED"].includes(
            a.unitsStatus as string,
          )) &&
        (a.assessmentContext === undefined ||
          (object(a.assessmentContext) &&
            ["guided", "independent"].includes(
              a.assessmentContext.form as string,
            ) &&
            typeof a.assessmentContext.seenBefore === "boolean" &&
            typeof a.assessmentContext.firstIndependentAttempt === "boolean" &&
            typeof a.assessmentContext.assistanceUsed === "boolean" &&
            (a.assessmentContext.familyId === undefined ||
              typeof a.assessmentContext.familyId === "string") &&
            (a.assessmentContext.benchmark === undefined ||
              typeof a.assessmentContext.benchmark === "boolean") &&
            (a.assessmentContext.seed === undefined ||
              (Number.isInteger(a.assessmentContext.seed) &&
                Number(a.assessmentContext.seed) >= 0)))) &&
        validDraft(a.userResponse) &&
        strings(a.errorCodes) &&
        Array.isArray(a.stageResults) &&
        a.stageResults.every(
          (s) =>
            object(s) &&
            typeof s.id === "string" &&
            typeof s.correct === "boolean" &&
            finiteScore(s.score) &&
            (s.errorCode === null || typeof s.errorCode === "string"),
        ) &&
        validProblemSnapshot(a.problemSnapshot),
    )
  )
    return false;
  if (new Set(x.answers.map((a) => a.id)).size !== x.answers.length)
    return false;
  return (
    x.exam === null ||
    (object(x.exam) &&
      typeof x.exam.id === "string" &&
      strings(x.exam.problemIds) &&
      x.exam.problemIds.length > 0 &&
      new Set(x.exam.problemIds).size === x.exam.problemIds.length &&
      dict(x.exam.versions) &&
      x.exam.problemIds.every(
        (id) =>
          typeof (x.exam as Record<string, unknown>).versions === "object" &&
          typeof (
            (x.exam as Record<string, unknown>).versions as Record<
              string,
              unknown
            >
          )[id] === "string",
      ) &&
      (x.exam.seenProblemIds === undefined || strings(x.exam.seenProblemIds)) &&
      validDate(x.exam.startedAt) &&
      (x.exam.finishedAt === undefined || validDate(x.exam.finishedAt)))
  );
}
export function loadProgress(storage: StorageLike): {
  data: Progress;
  notice: string;
  blocked: boolean;
  raw: string | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null)
      return { data: blankProgress(), notice: "", blocked: false, raw };
    const parsed: unknown = JSON.parse(raw);
    if (validProgress(parsed))
      return { data: parsed, notice: "", blocked: false, raw };
  } catch {
    /* The original bytes remain at the same key. */
  }
  return {
    data: blankProgress(),
    notice:
      "Сохранение недоступно или имеет другую версию. Исходные данные сохранены без перезаписи. Экспортируйте сессию; импорт корректной копии восстановит сохранение.",
    blocked: true,
    raw,
  };
}
export function saveProgress(storage: StorageLike, data: Progress): boolean {
  try {
    const bytes = JSON.stringify(data);
    storage.setItem(STORAGE_KEY, bytes);
    return storage.getItem(STORAGE_KEY) === bytes;
  } catch {
    return false;
  }
}
export function mergeProgress(current: Progress, incoming: unknown): Progress {
  if (!validProgress(incoming))
    throw new Error(
      "Файл не соответствует схеме прогресса v1. Текущие данные сохранены.",
    );
  const records = new Map(current.answers.map((a) => [a.id, a]));
  for (const a of incoming.answers) {
    const existing = records.get(a.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(a))
      throw new Error(
        "Конфликт записей с одним ID. Импорт отменён без потери текущих данных.",
      );
    records.set(a.id, a);
  }
  return {
    ...current,
    lessons: { ...incoming.lessons, ...current.lessons },
    drafts: { ...incoming.drafts, ...current.drafts },
    answers: [...records.values()],
    exposures: mergeExposures(
      current.exposures ?? {},
      incoming.exposures ?? {},
    ),
    reasoningReviews: [
      ...(current.reasoningReviews ?? []),
      ...(incoming.reasoningReviews ?? []),
    ].filter(
      (e, i, a) =>
        a.findIndex(
          (x) => x.answerId === e.answerId && x.timestamp === e.timestamp,
        ) === i,
    ),
    returnContext: current.returnContext ?? incoming.returnContext ?? null,
    exam: current.exam ?? incoming.exam,
    archives: [
      ...current.archives,
      ...incoming.archives,
      {
        kind: "import",
        importedAt: new Date().toISOString(),
        snapshot: { ...incoming, archives: [] },
      },
    ],
  };
}
export function draftKey(mode: Mode, id: string, version: string) {
  return `${mode}:${id}@${version}`;
}
export function currentAnswers(
  data: Progress,
  mode: Mode,
  versions: Record<string, string>,
) {
  return data.answers.filter(
    (a) => a.mode === mode && versions[a.problemId] === a.version,
  );
}

function mergeExposures(
  a: NonNullable<Progress["exposures"]>,
  b: NonNullable<Progress["exposures"]>,
) {
  const out = { ...a };
  for (const [id, e] of Object.entries(b)) {
    const old = out[id];
    out[id] = old
      ? {
          firstSeenAt:
            Date.parse(old.firstSeenAt) < Date.parse(e.firstSeenAt)
              ? old.firstSeenAt
              : e.firstSeenAt,
          assistanceUsed: old.assistanceUsed || e.assistanceUsed,
          modes: [...new Set([...old.modes, ...e.modes])],
        }
      : e;
  }
  return out;
}
export function objectiveScore(record: AnswerRecord) {
  return record.objectiveScore ?? record.score;
}
export function reasoningStatus(record: AnswerRecord, data: Progress) {
  const rubric = (
    record.problemSnapshot as { reasoning?: { rubric?: unknown[] } }
  )?.reasoning?.rubric;
  const submitted = !!record.userResponse.values.reasoning?.trim();
  const reviewed =
    submitted &&
    rubric?.length &&
    (data.reasoningReviews ?? []).some(
      (r) =>
        r.answerId === record.id &&
        new Set(r.checkedIndices).size === rubric.length &&
        r.checkedIndices.length === rubric.length &&
        r.checkedIndices.every((i) => i >= 0 && i < rubric.length),
    );
  if (reviewed) return "SELF_REVIEWED";
  return record.reasoningStatus === "SELF_REVIEWED"
    ? submitted
      ? "SUBMITTED_NOT_REVIEWED"
      : "NOT_SUBMITTED"
    : (record.reasoningStatus ?? "LEGACY_NOT_ASSESSED");
}
export function transferEvidence(
  data: Progress,
  registry: readonly {
    id: string;
    version: string;
    transfer?: { familyId: string; seed?: number; benchmark: boolean };
  }[] = [],
) {
  const candidates = data.answers
    .filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i)
    .filter(
      (r) =>
        r.assessmentContext?.familyId &&
        r.assessmentContext.form === "independent",
    );
  const valid = candidates.filter(
    (r) =>
      registry.some(
        (p) =>
          p.id === r.problemId &&
          p.version === r.version &&
          p.transfer?.familyId === r.assessmentContext?.familyId &&
          p.transfer?.seed === r.assessmentContext?.seed &&
          p.transfer?.benchmark === false,
      ) &&
      r.assessmentContext?.seed !== undefined &&
      !r.assessmentContext?.benchmark &&
      r.objectiveScore === 1 &&
      r.gradingProtocol === "objective-units-v3.0" &&
      r.unitsStatus === "ASSESSED" &&
      r.assessmentContext?.firstIndependentAttempt &&
      !r.assessmentContext.seenBefore &&
      !r.assessmentContext.assistanceUsed &&
      !data.answers.some(
        (a) =>
          a.id !== r.id &&
          a.problemId === r.problemId &&
          a.version === r.version &&
          (Date.parse(a.timestamp) < Date.parse(r.timestamp) ||
            (Date.parse(a.timestamp) === Date.parse(r.timestamp) &&
              a.id.localeCompare(r.id) < 0)),
      ),
  );
  return {
    independentAttempts: candidates.length,
    cleanFirstSuccesses: valid.length,
    selfReviewed: valid.filter(
      (r) => reasoningStatus(r, data) === "SELF_REVIEWED",
    ).length,
    families: [...new Set(valid.map((r) => r.assessmentContext!.familyId!))],
    outcomeStatus: "NOT_PROVEN" as const,
  };
}
