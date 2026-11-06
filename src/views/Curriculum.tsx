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
import {
  Link,
  Sources,
  FormulaCard,
  emptyDraft,
  pct,
  href,
} from "../components/Common";
import {
  grade,
  QuestionFields,
  ProblemContext,
  Feedback,
} from "../components/Problem";
export function Curriculum() {
  return (
    <>
      <div className="eyebrow">КАРТА КОМПЕТЕНЦИЙ / ТЕМА 3</div>
      <div className="page-heading compact">
        <div>
          <h1>Большая картина.</h1>
          <p>
            11 подразделов и все 9 задач семинара. Два подраздела доступны в
            MVP.
          </p>
        </div>
      </div>
      <div className="curriculum-list">
        {topics.map((t) => (
          <article className="panel" key={t.id}>
            <div className="row spread">
              <span className="eyebrow">{t.id}</span>
              <span
                className={`tag ${t.status === "implemented" ? "available" : ""}`}
              >
                {t.status === "implemented" ? "Доступен в MVP" : "Запланирован"}
              </span>
            </div>
            <h2>{t.title}</h2>
            <p>{t.summary}</p>
            <ul>
              {t.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <p className="muted">
              Предпосылки: {t.prerequisites.join(", ") || "начальный раздел"} ·
              Семинар: {t.seminarIds.join(", ")}
            </p>
            {t.roadmapNote && <p>{t.roadmapNote}</p>}
            <Sources refs={t.sourceRefs} />
            {t.status === "implemented" && (
              <Link to={`learn/${t.lessonIds[0]}`} className="text-link">
                Изучить раздел <ArrowRight size={16} />
              </Link>
            )}
            {t.id === "T3-06" && <LeveragePreview />}
          </article>
        ))}
      </div>
      <h2>Все задачи семинара 3</h2>
      <div className="panel seminar-map">
        {seminarMap.map((s) => (
          <div key={s.id}>
            <h3>Задача {s.id}</h3>
            <p>
              {JSON.stringify(s, null, 0)
                .replace(/[{}\[\]"]/g, " ")
                .replace(/,/g, " · ")}
            </p>
          </div>
        ))}
      </div>
      <p className="notice">
        Накопительный экзаменационный тренажёр будет расширяться по мере выпуска
        подразделов. Тема 3 целиком ещё не реализована.
      </p>
    </>
  );
}

function LeveragePreview() {
  const [de, setDe] = useState(0.7);
  const roc = 0.18441176470588236;
  const roe = roc + de * (roc - 0.105);
  return (
    <div className="leverage-preview">
      <div className="eyebrow">ПРЕДВАРИТЕЛЬНАЯ СВЯЗЬ / НЕ ПОЛНЫЙ УРОК</div>
      <MathFormula latex="ROE=ROC+\frac{D}{E}(ROC-r_d(1-t))" />
      <label>
        Долг / капитал: {de.toFixed(1)}
        <input
          aria-label="Долг к капиталу"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={de}
          onChange={(e) => setDe(Number(e.target.value))}
        />
      </label>
      <p>
        ROC {pct(roc)} + эффект рычага = ROE <b>{(roe * 100).toFixed(2)}%</b>
      </p>
      <small>
        После налогов долг стоит 10,5%. Здесь капитал = D + E, без вычета cash;
        NOPAT = NI + I(1 − t). Постоянная доходность и цена долга — модельное
        допущение.
      </small>
    </div>
  );
}
