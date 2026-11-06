import { useProgress } from "../storage/useProgress";
import { RatioLab } from "../views/RatioLab";
import { buildInfo } from "./build";
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
import { Home } from "../views/Home";
import { LessonView } from "../views/LessonView";
import { Practice } from "../views/Practice";
import { Formulas } from "../views/Formulas";
import { Exam } from "../views/Exam";
import { Curriculum } from "../views/Curriculum";
import { ProgressView } from "../views/ProgressView";
export default function App() {
  const { data, update, notice, importData, raw } = useProgress();
  const [route, setRoute] = useState(location.hash.slice(2) || "home");
  const [mobile, setMobile] = useState(false);
  const returnTo = data.returnContext?.route;
  useEffect(() => {
    const nav = () => {
      setRoute(location.hash.slice(2) || "home");
      setMobile(false);
      window.scrollTo(0, 0);
      requestAnimationFrame(() =>
        document.getElementById("main")?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("hashchange", nav);
    return () => window.removeEventListener("hashchange", nav);
  }, []);
  const [section, id, anchor] = route.split("/");
  const doneLessons = lessons.filter(
    (l) => data.lessons[`${l.id}@${l.version}`],
  ).length;
  const nav = [
    { to: "home", label: "Обзор", icon: LayoutDashboard },
    { to: "learn/T3-01", label: "Учебник", icon: BookOpen },
    { to: "practice", label: "Практикум", icon: NotebookPen },
    { to: "exam", label: "Мини-контрольная", icon: Clock3 },
    { to: "ratios", label: "Связи коэффициентов", icon: Route },
    { to: "formulas", label: "Формулы и модели", icon: Calculator },
    { to: "progress", label: "Мой прогресс", icon: ChartNoAxesCombined },
  ];
  const support = (target: string) => {
    update((p) => ({
      ...p,
      returnContext: { route, problemId: route.split("/")[1] ?? "" },
    }));
    location.hash = href(target);
  };
  return (
    <div className="shell">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        К содержанию
      </a>
      <button
        className="mobile-menu"
        aria-label={
          mobile
            ? "CF · Learning OS · Закрыть меню"
            : "CF · Learning OS · Открыть меню"
        }
        onClick={() => setMobile(!mobile)}
      >
        {mobile ? <X /> : <Menu />}
        <span>CF · Learning OS</span>
      </button>
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <Link to="home" className="brand">
          <span className="brand-mark">
            cf<span>↗</span>
          </span>
          <span>
            Corporate Finance<small>LEARNING OS / 2026</small>
          </span>
        </Link>
        <div className="course-label">ВАШЕ УЧЕБНОЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Основная навигация">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`nav-item ${section === n.to.split("/")[0] ? "active" : ""}`}
            >
              <n.icon size={19} />
              {n.label}
              {n.to === "exam" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-course">
          <div className="eyebrow">ТЕКУЩИЙ РАЗДЕЛ</div>
          <strong>03 · Финансовый анализ</strong>
          <p>От отчётности к решениям</p>
          <div className="bar">
            <span
              style={{ width: `${(doneLessons / topics.length) * 100}%` }}
            />
          </div>
          <small>
            {doneLessons} из {topics.length} подразделов прочитано
          </small>
          <Link to="curriculum">
            Вся программа <ArrowRight size={14} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">М</span>
          <div>
            Моё обучение<small>Прогресс на этом устройстве</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            Корпоративные финансы <ChevronRight size={14} />
            <strong>Тема 3</strong>
          </div>
          <span className="local-badge">
            <span /> Учебная версия · 0.3
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
          {returnTo && (
            <button
              className="return-link"
              onClick={() => {
                location.hash = href(returnTo);
                update((p) => ({ ...p, returnContext: null }));
              }}
            >
              <ArrowLeft size={16} /> К заданию · черновик сохранён
            </button>
          )}
          {section === "home" && <Home data={data} doneLessons={doneLessons} />}
          {section === "learn" && (
            <LessonView
              key={id}
              id={id ?? "T3-01"}
              anchor={anchor}
              data={data}
              update={update}
            />
          )}
          {section === "practice" && (
            <Practice
              key={id ?? "catalogue"}
              id={id}
              data={data}
              update={update}
              support={support}
            />
          )}
          {section === "exam" && <Exam data={data} update={update} />}
          {section === "formulas" && <Formulas id={id} support={support} />}
          {section === "curriculum" && <Curriculum />}
          {section === "ratios" && <RatioLab />}
          {section === "progress" && (
            <ProgressView
              data={data}
              update={update}
              raw={raw}
              onImport={importData}
            />
          )}
          {![
            "home",
            "learn",
            "practice",
            "exam",
            "formulas",
            "curriculum",
            "ratios",
            "progress",
          ].includes(section) && (
            <div className="panel">
              <h1>Страница не найдена</h1>
              <Link to="home">К обзору</Link>
            </div>
          )}
          <footer>
            <span data-testid="build-version" title={buildInfo.commit}>
              v{buildInfo.version} · {buildInfo.commit.slice(0, 8)}
              {buildInfo.sourceKind === "review-handoff"
                ? " · review-комплект"
                : buildInfo.dirty
                  ? " · рабочие изменения"
                  : ""}
            </span>
            Corporate Finance Learning OS{" "}
            <span>
              Независимый учебный проект · не официальный продукт НИУ ВШЭ
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
