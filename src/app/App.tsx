import {
  curriculumRegistry,
  availableLessons,
  publishedModules,
} from "../curriculum";
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
  readingProgress,
  publishedLessonContent,
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
  const doneLessons = readingProgress(data);
  const visibleLessons = publishedLessonContent();
  const modules = publishedModules().filter(
    (m) => m.reviewStatus === "PUBLISHED",
  );
  const activeLesson = visibleLessons.find((l) => l.id === id);
  const lessonNode = availableLessons().find((l) => l.id === activeLesson?.id);
  const currentModule =
    modules.find((m) => m.id === lessonNode?.moduleId) ?? modules[0];
  const moduleLessons = visibleLessons.filter((l) =>
    currentModule?.lessonIds.includes(l.id),
  );
  const doneModuleLessons = currentModule
    ? readingProgress(data, currentModule.id)
    : 0;
  const firstLesson = visibleLessons[0];
  const nav = [
    { to: "home", label: "Обзор", icon: LayoutDashboard },
    {
      to: firstLesson ? `learn/${firstLesson.id}` : "curriculum",
      label: "Учебник",
      icon: BookOpen,
    },
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
        aria-expanded={mobile}
        aria-controls="course-navigation"
        onClick={() => setMobile(!mobile)}
      >
        {mobile ? <X /> : <Menu />}
        <span>CF · Learning OS</span>
      </button>
      <aside
        id="course-navigation"
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
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
          <strong>{currentModule?.title ?? "Программа обучения"}</strong>
          <p>Доступные учебные разделы</p>
          <div className="bar">
            <span
              style={{
                width: `${moduleLessons.length ? (doneModuleLessons / moduleLessons.length) * 100 : 0}%`,
              }}
            />
          </div>
          <small>
            {doneModuleLessons} из {moduleLessons.length} доступных разделов
            прочитано
          </small>
          {modules.map((module) => {
            const entry = visibleLessons.find((l) =>
              module.lessonIds.includes(l.id),
            );
            return entry && modules.length > 1 ? (
              <Link key={module.id} to={`learn/${entry.id}`}>
                {module.title}
              </Link>
            ) : null;
          })}
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
            {curriculumRegistry.course.title} <ChevronRight size={14} />
            <strong>{currentModule?.id ?? "Учебная программа"}</strong>
          </div>
          <span className="local-badge">
            <span /> Учебная версия · {buildInfo.version}
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
              <ArrowLeft size={16} />{" "}
              {returnTo.startsWith("practice/")
                ? "К заданию · черновик сохранён"
                : returnTo === "exam"
                  ? "К результату контрольной"
                  : "Вернуться к предыдущему разделу"}
            </button>
          )}
          {section === "home" && <Home data={data} doneLessons={doneLessons} />}
          {section === "learn" && (
            <LessonView
              key={id}
              id={id ?? firstLesson?.id ?? ""}
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
              v{buildInfo.version} Beta · {buildInfo.commit.slice(0, 8)}
              {buildInfo.sourceKind === "review-handoff"
                ? " · review-комплект"
                : buildInfo.dirty
                  ? " · рабочие изменения"
                  : ""}
            </span>
            Corporate Finance Learning OS{" "}
            <a
              className="text-link"
              href="https://github.com/zabor-crypto/hse-corporate-finance-2026/blob/main/LICENSE-CODE"
              target="_blank"
              rel="noreferrer"
            >
              Код · MIT
            </a>
            <a
              className="text-link"
              href="https://github.com/zabor-crypto/hse-corporate-finance-2026/blob/main/LICENSE-CONTENT"
              target="_blank"
              rel="noreferrer"
            >
              Текст · CC BY 4.0
            </a>
            <span>
              Независимый учебный проект · не официальный продукт НИУ ВШЭ
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
