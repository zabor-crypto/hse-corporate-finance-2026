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
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href(to)}>
      {children}
    </a>
  );
}

export function Sources({ refs }: { refs: SourceRef[] }) {
  return (
    <p className="sources">
      Источники:{" "}
      {refs
        .map(
          (s) =>
            `${s.label}${s.pages?.length ? ` · слайды ${s.pages.join(", ")}` : ""}${s.seminar ? ` · ${s.seminar}` : ""}`,
        )
        .join("; ")}
      . Физическая нумерация PDF.
    </p>
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
  const f = formulas.find((x) => x.id === id);
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
