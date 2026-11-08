import {
  curriculumRegistry,
  availableLessons,
  publishedModules,
} from "../curriculum";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Download,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Route,
  Upload,
  X,
  Calculator,
  Clock3,
  LockKeyhole,
} from "lucide-react";
import {
  topics,
  lessons,
  formulas,
  problems,
  seminarMap,
  sampleExamIds,
} from "../content";
import type { Problem, SourceRef } from "../content/types";
import { gradeNumeric, gradeSelection, gradeStages } from "../engine/grading";
import {
  blankProgress,
  draftKey,
  loadProgress,
  mergeProgress,
  saveProgress,
} from "../storage/progress";
import type { Progress, Draft, Mode, AnswerRecord } from "../storage/progress";
import { MathFormula } from "../components/Math";
export const emptyDraft = (): Draft => ({ values: {}, selected: [] });
export const href = (route: string) => `#/${route}`;
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export function Link({
  to,
  children,
  className = "",
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a className={className} href={href(to)} onClick={onClick}>
      {children}
    </a>
  );
}

/** Presentation only: private source metadata never becomes a public PDF link. */
export function sourceLabel(s: SourceRef): string {
  const base = s.pages?.length
    ? s.label.replace(/\s*·?\s*слайды?\s+[\d,–—\- ]+/gi, "").trim()
    : s.label;
  const pages = s.pages?.length ? ` · слайды ${s.pages.join(", ")}` : "";
  const task =
    s.seminar && !s.label.includes(s.seminar) ? ` · задача ${s.seminar}` : "";
  return `${base}${pages}${task}`;
}

/** Resolve registry publication decisions to the compiled content, preserving stable URLs. */
export function publishedLessonContent(bank = lessons) {
  const modules = new Set(
    publishedModules()
      .filter((m) => m.reviewStatus === "PUBLISHED")
      .map((m) => m.id),
  );
  const reviewed = availableLessons().filter(
    (l) => l.reviewStatus === "PUBLISHED" && modules.has(l.moduleId),
  );
  return bank.filter((l) =>
    reviewed.some((node) => node.id === l.id && node.version === l.version),
  );
}
export function publishedProblemContent(bank = problems) {
  const lessonIds = new Set(publishedLessonContent().map((l) => l.id));
  return bank.filter(
    (p) =>
      lessonIds.has(p.lessonId) &&
      curriculumRegistry.problems.some(
        (node) =>
          node.id === p.id &&
          node.version === p.version &&
          node.availability === "available" &&
          node.reviewStatus === "PUBLISHED",
      ),
  );
}
export function publishedFormulaContent() {
  const lessonIds = new Set(publishedLessonContent().map((l) => l.id));
  return formulas.filter(
    (f) =>
      lessonIds.has(f.lessonId) &&
      curriculumRegistry.formulas.some(
        (n) =>
          n.id === f.id &&
          n.availability === "available" &&
          n.reviewStatus === "PUBLISHED",
      ),
  );
}

/** Reading is a current-version mark, not a claim of mastery. */
export function readingProgress(data: Progress, moduleId?: string) {
  return publishedLessonContent().filter(
    (l) =>
      Boolean(data.lessons[`${l.id}@${l.version}`]) &&
      (!moduleId ||
        curriculumRegistry.lessons.some(
          (node) => node.id === l.id && node.moduleId === moduleId,
        )),
  ).length;
}

/** Latest current-version objective result includes both numbers and selections. */
export function objectiveProgress(data: Progress) {
  const latest = new Map<string, AnswerRecord>();
  const available = new Map(
    publishedProblemContent().map((p) => [p.id, p.version]),
  );
  for (const a of data.answers) {
    if (a.mode !== "practice" || available.get(a.problemId) !== a.version)
      continue;
    const previous = latest.get(a.problemId);
    if (
      !previous ||
      Date.parse(a.timestamp) > Date.parse(previous.timestamp) ||
      (Date.parse(a.timestamp) === Date.parse(previous.timestamp) &&
        a.id > previous.id)
    )
      latest.set(a.problemId, a);
  }
  return [...latest.values()].filter((a) => a.score === 1).length;
}

export function Sources({ refs }: { refs: SourceRef[] }) {
  if (!refs.length) return null;
  const privateSources = refs.some(
    (s) => s.kind === "lecture" || s.kind === "seminar",
  );
  return (
    <div className="sources">
      <p>
        Источники:{" "}
        {[...new Map(refs.map((s) => [sourceLabel(s), s])).values()].map(
          (s, i) => (
            <span key={sourceLabel(s)}>
              {i > 0 ? "; " : ""}
              {s.kind === "external" && s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer">
                  {sourceLabel(s)}
                </a>
              ) : (
                sourceLabel(s)
              )}
            </span>
          ),
        )}
        .
      </p>
      {privateSources && (
        <p>
          Материалы преподавателя — частные PDF, на сайте не размещены. Номера
          слайдов указаны по физическим страницам PDF.
        </p>
      )}
    </div>
  );
}

export function FormulaCard({
  id,
  full = false,
}: {
  id: string;
  full?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const f = publishedFormulaContent().find((x) => x.id === id);
  if (!f) return null;
  return (
    <article className="formula-card" id={f.id}>
      <div className="eyebrow">{f.title}</div>
      <MathFormula latex={f.latex} />
      <p>{f.meaning}</p>
      <button
        type="button"
        className="copy-formula"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${f.title}\n${f.latex}\n${f.meaning}\nЕдиницы: ${f.units}`,
            );
            setCopyStatus("Скопировано: формула и смысл");
          } catch {
            setCopyStatus(
              "Копирование недоступно; выделите формулу и пояснение.",
            );
          }
        }}
      >
        Скопировать формулу со смыслом
      </button>
      <span role="status">{copyStatus}</span>
      {!full && (
        <Link className="text-link" to={`formulas/${f.id}`}>
          Переменные, единицы и ограничения →
        </Link>
      )}
      {full && (
        <>
          <div className="symbol-grid">
            {f.symbols.map((s) => (
              <div key={s.symbol}>
                <b>{s.symbol}</b>
                <span>
                  {s.meaning} · {s.unit}
                </span>
              </div>
            ))}
          </div>
          <p>
            <b>Рамка:</b> {f.framing}
          </p>
          <p>
            <b>Единицы:</b> {f.units}
          </p>
          <ul>
            {f.domain.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <details>
            <summary>Откуда берётся формула</summary>
            {f.derivation.map((d) => (
              <p key={d}>{d}</p>
            ))}
            <p>
              <b>Пример:</b> {f.example}
            </p>
            {f.sanityChecks.map((x) => (
              <p key={x}>Проверка: {x}</p>
            ))}
            {f.alternatives.map((x) => (
              <p key={x}>Другая конвенция: {x}</p>
            ))}
          </details>
          <Sources refs={f.sourceRefs} />
          <Link to={`learn/${f.lessonId}`}>
            Разобрать в учебнике <ArrowRight size={14} />
          </Link>
        </>
      )}
    </article>
  );
}
