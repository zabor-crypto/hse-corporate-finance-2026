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
export function Home({
  data,
  doneLessons,
}: {
  data: Progress;
  doneLessons: number;
}) {
  const practice = data.answers.filter((a) => a.mode === "practice");
  const solved = new Set(
    practice
      .filter(
        (a) =>
          a.score === 1 &&
          problems.some((p) => p.id === a.problemId && p.version === a.version),
      )
      .map((a) => a.problemId),
  ).size;
  const next =
    lessons.find((l) => !data.lessons[`${l.id}@${l.version}`]) ?? lessons[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            ОТ ПОНИМАНИЯ — К САМОСТОЯТЕЛЬНОМУ РЕШЕНИЮ
          </div>
          <h1>
            Финансы складываются
            <br />в <em>целую картину.</em>
          </h1>
          <p>
            Разберитесь, как связаны отчётность, прибыль и деньги.
            <br className="desktop" /> Затем проверьте себя на задачах семинара.
          </p>
        </div>
        <span className="semester">
          ОСЕННИЙ СЕМЕСТР<small>2026 / 2027</small>
        </span>
      </div>
      <section className="hero-card">
        <div className="hero-content">
          <span className="pill">
            ТЕМА 03 <span>В РАБОТЕ</span>
          </span>
          <h2>
            Финансовая отчётность
            <br />и финансовый анализ
          </h2>
          <p>
            Три отчёта. Одна компания. Научитесь видеть
            <br className="desktop" /> экономический смысл за каждым
            показателем.
          </p>
          <Link className="button light" to={`learn/${next.id}`}>
            {doneLessons ? "Продолжить обучение" : "Начать обучение"}
            <ArrowRight size={18} />
          </Link>
          <div className="hero-meta">
            <Clock3 size={15} /> {lessons.length} учебных подразделов{" "}
            <span>·</span> Пошаговая практика
          </div>
        </div>
        <div
          className="finance-art"
          aria-label="Связь прибыли, баланса и денежных потоков"
        >
          <div className="art-grid" />
          <div className="art-label">THE BIG PICTURE</div>
          <div className="art-card art-pl">
            <span>01 / РЕЗУЛЬТАТ</span>
            <strong>P&L</strong>
            <small>Доходы − расходы</small>
            <div className="mini-chart">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="art-card art-bs">
            <span>02 / РЕСУРСЫ</span>
            <strong>Баланс</strong>
            <small>Активы = Обязательства + Капитал</small>
            <div className="art-line" />
          </div>
          <div className="art-card art-cf">
            <span>03 / ДЕНЬГИ</span>
            <strong>
              Cash Flow <b>↗</b>
            </strong>
            <small>От прибыли к денежному потоку</small>
          </div>
        </div>
      </section>
      <div className="stats-grid">
        <div>
          <span className="stat-icon">
            <BookOpen />
          </span>
          <div>
            <strong>
              {doneLessons}
              <small> / {lessons.length}</small>
            </strong>
            <p>подраздела прочитано</p>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Check />
          </span>
          <div>
            <strong>
              {solved}
              <small> / {problems.length}</small>
            </strong>
            <p>заданий с верным числовым ответом</p>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <Route />
          </span>
          <div>
            <strong>9</strong>
            <p>задач в карте семинара</p>
          </div>
        </div>
      </div>
      <div className="assessment-banner">
        <div>
          <div className="eyebrow">ПРИОРИТЕТ БЛИЖАЙШЕЙ КОНТРОЛЬНОЙ</div>
          <h2>Коэффициенты и их взаимосвязи</h2>
          <p>
            Рентабельность → рычаг → DuPont. Три связанных урока и модель одной
            компании.
          </p>
        </div>
        <Link to="ratios" className="button">
          Исследовать связи <ArrowRight size={16} />
        </Link>
      </div>
      <div className="section-heading">
        <h2>Ваш маршрут обучения</h2>
        <Link to="curriculum">
          Карта всей темы <ArrowRight size={16} />
        </Link>
      </div>
      <div className="lesson-grid">
        {lessons.map((l, i) => (
          <Link key={l.id} to={`learn/${l.id}`} className="lesson-card">
            <div className="card-top">
              <span className="chapter-number">0{i + 1}</span>
              <span className="tag">{l.id}</span>
              {data.lessons[`${l.id}@${l.version}`] && <Check size={20} />}
            </div>
            <h3>{l.title}</h3>
            <p>{l.summary}</p>
            <div className="card-foot">
              <span>
                <Clock3 size={14} /> {l.minutes} минут
              </span>
              <span className="circle-arrow">
                <ArrowRight size={18} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="practice-banner">
        <div className="banner-icon">
          <FlaskConical size={27} />
        </div>
        <div>
          <div className="eyebrow">ПОНЯТЬ → РАССЧИТАТЬ → ОБЪЯСНИТЬ</div>
          <h3>Формула становится навыком в практике</h3>
          <p>
            {problems.filter((p) => p.transfer?.seed === undefined).length}{" "}
            основных заданий и 32 варианта четырёх моделей: понятия, расчёты и
            многошаговые кейсы.
          </p>
        </div>
        <Link to="practice" className="button outline">
          Открыть практикум <ArrowRight size={17} />
        </Link>
      </div>
      <div className="scope-note">
        <span className="tag">ЧЕСТНЫЙ ПРОГРЕСС</span>
        <p>
          Доступны {lessons.map((l) => l.id).join(", ")}. Остальные{" "}
          {topics.length - lessons.length} подразделов запланированы.
          Мини-контрольная проверяет этот материал и не заменяет экзамен по всей
          теме.
        </p>
      </div>
    </>
  );
}
