import { attemptContext, assessedStages } from "../engine/grading/attempt";
import { GuidedSteps } from "../components/StepByStep";
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
  Workpad,
} from "../components/Problem";
export function Practice({
  id,
  data,
  update,
  support,
}: {
  id?: string;
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  support: (s: string) => void;
}) {
  const initialSeen = useRef(
    !!(
      id &&
      data.exposures?.[`${id}@${problems.find((p) => p.id === id)?.version}`]
    ),
  );
  const [mode, setMode] = useState<Mode>("practice");
  const [attempt, setAttempt] = useState<AnswerRecord | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setAttempt(null);
    setMessage("");
  }, [id, mode]);
  const p = problems.find((p) => p.id === id);
  useEffect(() => {
    if (!p) return;
    const k = `${p.id}@${p.version}`;
    update((x) => {
      const old = x.exposures?.[k];
      if (old?.modes.includes(mode) && (mode !== "study" || old.assistanceUsed))
        return x;
      return {
        ...x,
        exposures: {
          ...x.exposures,
          [k]: {
            firstSeenAt: old?.firstSeenAt ?? new Date().toISOString(),
            assistanceUsed: !!old?.assistanceUsed || mode === "study",
            modes: [...new Set([...(old?.modes ?? []), mode])],
          },
        },
      };
    });
  }, [p?.id, mode, update]);
  if (!p)
    return (
      <>
        <div className="eyebrow">
          ПРАКТИКУМ /{" "}
          {problems.filter((p) => p.transfer?.seed === undefined).length}{" "}
          ОСНОВНЫХ ЗАДАНИЙ
        </div>
        <div className="page-heading compact">
          <div>
            <h1>Понимание в действии.</h1>
            <p>
              Решайте самостоятельно, проверяйте шаги и возвращайтесь к теории.
            </p>
          </div>
        </div>
        <div className="panel">
          <h2>Новый вариант без подсказок</h2>
          <p>
            Четыре модели по восемь ограниченных наборов данных. Это варианты
            четырёх компетенций, а не 32 новых умения. После открытия вариант
            уже не считается невиданным.
          </p>
          {[
            ...new Set(
              problems.flatMap((p) =>
                p.transfer?.seed !== undefined ? [p.transfer.familyId] : [],
              ),
            ),
          ].map((f) => {
            const candidates = problems.filter(
              (p) =>
                p.transfer?.familyId === f && p.transfer.seed !== undefined,
            );
            const fresh = candidates.find(
              (p) =>
                !data.exposures?.[`${p.id}@${p.version}`] &&
                !data.answers.some((a) => a.problemId === p.id),
            );
            return (
              <p key={f}>
                {fresh ? (
                  <Link className="button outline" to={`practice/${fresh.id}`}>
                    Новый набор · {f}
                  </Link>
                ) : (
                  <span>{f}: все восемь наборов уже открывались.</span>
                )}
              </p>
            );
          })}
        </div>
        <div className="problem-list">
          {problems
            .filter((p) => p.transfer?.seed === undefined)
            .map((p, i) => (
              <Link to={`practice/${p.id}`} className="problem-row" key={p.id}>
                <span className="chapter-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="eyebrow">
                    {p.topicId} · {p.difficulty} ·{" "}
                    {p.type === "single"
                      ? "Один ответ"
                      : p.type === "multi"
                        ? "Несколько ответов"
                        : p.type === "steps"
                          ? "По шагам"
                          : "Расчёт"}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.objective}</p>
                </div>
                <ArrowRight size={19} />
              </Link>
            ))}
        </div>
      </>
    );
  const key = draftKey(mode, p.id, p.version);
  const draft = data.drafts[key] ?? emptyDraft();
  const change = (d: Draft) => {
    setAttempt(null);
    update((x) => ({ ...x, drafts: { ...x.drafts, [key]: d } }));
  };
  const markAssistance = () => {
    change({ ...draft, assistanceUsed: true });
    update((x) => {
      const k = `${p.id}@${p.version}`;
      const old = x.exposures?.[k];
      return {
        ...x,
        exposures: {
          ...x.exposures,
          [k]: {
            firstSeenAt: old?.firstSeenAt ?? new Date().toISOString(),
            modes: old?.modes ?? [mode],
            assistanceUsed: true,
          },
        },
      };
    });
  };
  const assist = (target: string) => {
    markAssistance();
    support(target);
  };
  return (
    <>
      <Link to="practice" className="back-link">
        <ArrowLeft size={16} /> Все задания
      </Link>
      <div className="eyebrow">
        {p.topicId} / {p.difficulty} / ВЕРСИЯ {p.version}
      </div>
      <div className="page-heading compact">
        <div>
          <h1>{p.title}</h1>
        </div>
      </div>
      <div className="practice-layout">
        <article className="panel">
          <div className="mode-tabs" aria-label="Режим практики">
            <button
              className={mode === "practice" ? "selected" : ""}
              onClick={() => setMode("practice")}
            >
              Практика
            </button>
            <button
              className={mode === "study" ? "selected" : ""}
              onClick={() => setMode("study")}
            >
              Обучение с подсказками
            </button>
          </div>
          <ProblemContext p={p} mode={mode} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !draft.selected.length &&
                !Object.values(draft.values).some((x) => x.trim())
              ) {
                setMessage("Сначала введите ответ или выберите вариант.");
                return;
              }
              const record = grade(
                p,
                draft,
                mode,
                attemptContext(p, draft, mode, data, initialSeen.current),
              );
              setAttempt(record);
              setMessage("");
              update((x) => ({ ...x, answers: [...x.answers, record] }));
            }}
          >
            {mode === "study" && p.stages.length > 1 ? (
              <GuidedSteps
                key={p.id}
                problem={p}
                draft={draft}
                onChange={change}
              />
            ) : (
              <QuestionFields
                p={p}
                draft={draft}
                onChange={change}
                mode={mode}
              />
            )}
            <Workpad draft={draft} onChange={change} />
            {message && <p role="alert">{message}</p>}
            <button className="button" type="submit">
              Проверить ответ <ArrowRight size={17} />
            </button>
          </form>
          {mode === "study" &&
            p.stages.map((s) => (
              <details className="hint" key={s.id}>
                <summary>Подсказка: {s.label}</summary>
                <p>{s.hint}</p>
              </details>
            ))}
          {attempt && (
            <Feedback p={p} result={attempt} data={data} update={update} />
          )}
          <Sources refs={p.sourceRefs} />
        </article>
        <aside className="support-card">
          <div className="eyebrow">ОПОРА ДЛЯ РЕШЕНИЯ</div>
          <h3>Вспомнить логику</h3>
          <p>Черновик сохранится, пока вы разбираетесь в теории.</p>
          {mode === "practice" && !draft.assistanceUsed ? (
            <button onClick={markAssistance}>
              Показать опоры · отметить использование помощи
            </button>
          ) : (
            <>
              <button onClick={() => assist(`learn/${p.lessonId}`)}>
                <BookOpen size={17} /> Открыть учебный раздел{" "}
                <ArrowRight size={16} />
              </button>
              {p.formulaIds.map((f) => (
                <button key={f} onClick={() => assist(`formulas/${f}`)}>
                  <Calculator size={17} />
                  {formulas.find((x) => x.id === f)?.title ?? f}
                </button>
              ))}
            </>
          )}
          <small>
            В практике ответы открываются после попытки. Результаты обучения и
            контрольной учитываются отдельно.
          </small>
        </aside>
      </div>
    </>
  );
}
