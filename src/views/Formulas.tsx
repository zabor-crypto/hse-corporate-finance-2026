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
export function Formulas({
  id,
  support,
}: {
  id?: string;
  support: (s: string) => void;
}) {
  const list = id ? formulas.filter((f) => f.id === id) : formulas;
  return (
    <>
      <div className="eyebrow">СПРАВОЧНИК / ФОРМУЛЫ И МОДЕЛИ</div>
      <div className="page-heading compact">
        <div>
          <h1>За формулой — смысл.</h1>
          <p>Обозначения, вывод, условия применимости и проверка результата.</p>
        </div>
      </div>
      {id && (
        <Link to="formulas" className="back-link">
          Все формулы
        </Link>
      )}
      <div className="formula-list">
        {list.map((f) => (
          <FormulaCard id={f.id} full key={f.id} />
        ))}
      </div>
      <button className="button outline" onClick={() => support("learn/T3-03")}>
        Разобраться с оборотным капиталом <ArrowRight size={17} />
      </button>
    </>
  );
}
