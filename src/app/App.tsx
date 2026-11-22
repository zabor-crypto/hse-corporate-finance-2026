import { isSupportContext, isSupportTransition } from "../pedagogy/return-context";
import { StorageStatus } from "../components/StorageStatus";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  getActivePack,
  useActivePack,
  ensureModule,
  activateModule,
  moduleIdFromRoute,
  moduleManifest,
} from "../runtime";
import { useProgress } from "../storage/useProgress";
import { flushPendingDrafts } from "../storage/useEditableDraft";
import { buildInfo } from "./build";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  Menu,
  NotebookPen,
  Route,
  LayoutDashboard,
  Calculator,
  Clock3,
  X,
} from "lucide-react";
import {
  Link,
  href,
  readingProgress,
  publishedLessonContent,
  publishedProblemContent,
} from "../components/Common";
const Home = lazy(() =>
  import("../views/Home").then((m) => ({ default: m.Home })),
);
const LessonView = lazy(() =>
  import("../views/LessonView").then((m) => ({ default: m.LessonView })),
);
const Practice = lazy(() =>
  import("../views/Practice").then((m) => ({ default: m.Practice })),
);
const Formulas = lazy(() =>
  import("../views/Formulas").then((m) => ({ default: m.Formulas })),
);
const Exam = lazy(() =>
  import("../views/Exam").then((m) => ({ default: m.Exam })),
);
const Curriculum = lazy(() =>
  import("../views/Curriculum").then((m) => ({ default: m.Curriculum })),
);
const ProgressView = lazy(() =>
  import("../views/ProgressView").then((m) => ({ default: m.ProgressView })),
);
const RatioLab = lazy(() =>
  import("../views/RatioLab").then((m) => ({ default: m.RatioLab })),
);
export default function App() {
  const {
    data,
    update,
    notice,
    importData,
    raw,
    getCurrent,
    ready,
    recovery,
    recoverPending,
  } = useProgress();
  const [route, setRoute] = useState(location.hash.slice(2) || "home");
  const routeRef = useRef(route);
  const [mobile, setMobile] = useState(false);
  const active = useActivePack();
  const [loadError, setLoadError] = useState("");
  const [requestedModule, setRequestedModule] = useState<string | null>(null);
  const [page, routeId] = route.split("/");
  const wanted = moduleIdFromRoute(page, routeId, active?.id);
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    setRequestedModule(null);
    ensureModule(wanted)
      .then(() => {
        if (!cancelled) {
          activateModule(wanted);
          setRequestedModule(wanted);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Не удалось загрузить модуль",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [wanted]);
  const returnTo = isSupportContext(data.returnContext, route) ? data.returnContext?.route : null;
  const clearReturnContext = () => update(p => p.returnContext ? {...p, returnContext: null} : p);
  useEffect(() => {
    const nav = () => {
      const previousFocus = document.activeElement;
      flushPendingDrafts("navigation");
      const nextRoute = location.hash.slice(2) || "home";
      if (getCurrent().returnContext && !isSupportTransition(getCurrent().returnContext, routeRef.current, nextRoute))
        update(p => p.returnContext ? {...p, returnContext: null} : p);
      routeRef.current = nextRoute;
      setRoute(nextRoute);
      setMobile(false);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        // A student may already have focused the new question before this frame.
        if ((location.hash.slice(2) || "home") === nextRoute &&
          (document.activeElement === document.body || document.activeElement === previousFocus))
          document.getElementById("main")?.focus({ preventScroll: true });
      });
    };
    window.addEventListener("hashchange", nav);
    return () => window.removeEventListener("hashchange", nav);
  }, [getCurrent, update]);
  if (!ready || !active || requestedModule !== wanted)
    return (
      <main id="main" tabIndex={-1}>
        <h1>
          {loadError ? "Модуль не загружен" : "Загрузка учебного модуля…"}
        </h1>
        {loadError && (
          <>
            <p role="alert">{loadError}</p>
            <button onClick={() => location.reload()}>
              Повторить загрузку
            </button>
            <a href="#/home/T3">Открыть доступный модуль</a>
          </>
        )}
      </main>
    );
  const { registry: curriculumRegistry, config } = getActivePack();
  const availableLessons = () =>
    curriculumRegistry.lessons.filter((l) => l.availability === "available");
  const publishedModules = () =>
    curriculumRegistry.modules.filter((m) => m.availability === "available");
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
  const firstLesson =
    visibleLessons.find((l) => l.id === config.primaryLessonId) ??
    visibleLessons[0];
  const nav = [
    { to: "home", label: "Обзор", icon: LayoutDashboard },
    {
      to: firstLesson ? `learn/${firstLesson.id}` : "curriculum",
      label: "Учебник",
      icon: BookOpen,
    },
    { to: `practice/${active.id}`, label: "Практикум", icon: NotebookPen },
    { to: `exam/${active.id}`, label: "Мини-контрольная", icon: Clock3 },
    { to: "ratios", label: "Связи коэффициентов", icon: Route },
    {
      to: `formulas/${active.id}`,
      label: "Формулы и модели",
      icon: Calculator,
    },
    { to: "progress", label: "Мой прогресс", icon: ChartNoAxesCombined },
  ];
  const support = (target: string) => {
    flushPendingDrafts("navigation");
    update((p) => ({
      ...p,
      returnContext: route.startsWith("practice/") && publishedProblemContent().some(p => p.id === route.split("/")[1])
        ? {route, problemId: route.split("/")[1], targetRoute: target} : null,
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
        onClickCapture={event => { if (event.target instanceof Element && event.target.closest("a")) clearReturnContext(); }}
        className={`sidebar ${mobile ? "is-open" : ""}`}
      >
        <Link to="home" className="brand" onClick={clearReturnContext}>
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
              onClick={clearReturnContext}
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
          {moduleManifest
            .filter((m) => m.id !== active.id)
            .map((m) => (
              <Link key={m.id} to={`home/${m.id}`}>
                {m.title}
              </Link>
            ))}
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
          <StorageStatus notice={notice} />
          {recovery && (
            <button
              onClick={() => {
                flushPendingDrafts("blur");
                void recoverPending().catch(() => {});
              }}
            >
              Восстановить найденный черновик явно
            </button>
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
                ? "К заданию · продолжить с черновиком"
                : returnTo.startsWith("exam")
                  ? "К результату контрольной"
                  : "Вернуться к предыдущему разделу"}
            </button>
          )}
          <Suspense fallback={<p role="status">Загрузка страницы…</p>}>
            {section === "home" && (
              <Home data={data} doneLessons={doneLessons} />
            )}
            {section === "learn" && (
              <LessonView
                key={id}
                id={id ?? firstLesson?.id ?? ""}
                anchor={anchor}
                data={data}
                update={update}
              />
            )}
            {(section === "practice" || section === "catalog") && (
              <Practice
                key={id ?? "catalogue"}
                id={id}
                data={data}
                update={update}
                support={support}
                {...{ catalog: section === "catalog", getCurrent }}
              />
            )}
            {section === "exam" && (
              <Exam
                key={active.id}
                data={data}
                update={update}
                {...{ getCurrent }}
              />
            )}
            {section === "formulas" && (
              <Formulas
                id={id === active.id ? undefined : id}
                support={support}
              />
            )}
            {section === "curriculum" && <Curriculum />}
            {section === "ratios" && <RatioLab />}
            {section === "progress" && (
              <ProgressView
                data={data}
                update={update}
                raw={raw}
                onImport={importData}
                getCurrent={getCurrent}
              />
            )}
            {![
              "home",
              "learn",
              "practice",
              "catalog",
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
          </Suspense>
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
