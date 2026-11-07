import { CausalDiagram } from "../components/CausalDiagram";
import { IntegratedModel } from "../components/IntegratedModel";
import { WorkedExample, NwcLab } from "../components/StepByStep";
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
  publishedLessonContent,
  publishedProblemContent,
} from "../components/Common";
import {
  grade,
  QuestionFields,
  ProblemContext,
  Feedback,
} from "../components/Problem";
import { Curriculum } from "./Curriculum";
export function LessonView({
  id,
  anchor,
  data,
  update,
}: {
  id: string;
  anchor?: string;
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
}) {
  const l = publishedLessonContent().find((l) => l.id === id);
  const availableProblems = publishedProblemContent();
  useEffect(() => {
    if (anchor)
      document.getElementById(anchor)?.scrollIntoView({ behavior: "instant" });
  }, [id, anchor]);
  if (!l)
    return (
      <>
        <div className="notice" role="status">
          Этот раздел пока недоступен. Выберите опубликованный урок в карте
          программы.
        </div>
        <Curriculum />
      </>
    );
  return (
    <>
      <div className="eyebrow">УЧЕБНИК / {l.id}</div>
      <div className="page-heading compact">
        <div>
          <h1>{l.title}</h1>
          <p>{l.summary}</p>
        </div>
      </div>
      <details className="mobile-toc">
        <summary>Содержание раздела · {l.sections.length} частей</summary>
        {l.sections.map((s, i) => (
          <a key={s.id} href={`#/learn/${l.id}/${s.id}`}>
            {i + 1}. {s.title.replace(/^\d+[.)]?\s*/, "")}
          </a>
        ))}
      </details>
      <div className="reading-layout">
        <article className="lesson-body">
          {l.sections[0]?.businessScenario && (
            <div className="business-scenario">
              <b>Начнём с решения в бизнесе.</b>{" "}
              {l.sections[0].businessScenario}
            </div>
          )}
          <div className="mental-model">
            <span className="eyebrow">ГЛАВНАЯ ИДЕЯ</span>
            <p>{l.mentalModel}</p>
          </div>
          <section>
            <h2>После этого раздела вы сможете</h2>
            <ul>
              {l.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
          {["T3-01", "T3-03"].includes(l.id) && <CausalDiagram kind="cash" />}
          {l.id === "T3-06" && <CausalDiagram kind="dupont" />}
          {l.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="lesson-section">
              <div className="section-index">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h2>{s.title.replace(/^\d+[.)]?\s*/, "")}</h2>
              {i > 0 && s.businessScenario && (
                <div className="business-scenario">
                  <b>Решение в бизнесе.</b> {s.businessScenario}
                </div>
              )}
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
              {s.formulaIds?.map((f) => (
                <FormulaCard key={f} id={f} />
              ))}
              {s.example && <WorkedExample example={s.example} />}
              {s.examples?.map((example, i) => (
                <WorkedExample key={i} example={example} />
              ))}
              {s.wrongAttempt && (
                <details className="wrong-attempt">
                  <summary>Ошибочная попытка: найдите сбой</summary>
                  <p>
                    <b>Попытка:</b> {s.wrongAttempt.attempt}
                  </p>
                  <p>
                    <b>Диагноз:</b> {s.wrongAttempt.diagnosis}
                  </p>
                  <p>
                    <b>Исправление:</b> {s.wrongAttempt.repair}
                  </p>
                </details>
              )}
              {!!s.deepDive?.length && (
                <details>
                  <summary>Дополнительные условия и исключения</summary>
                  {s.deepDive.map((x) => (
                    <p key={x}>{x}</p>
                  ))}
                </details>
              )}
              {s.commonErrors && (
                <div className="mistake-note">
                  <b>Где легко ошибиться</b>
                  <ul>
                    {s.commonErrors.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {s.recall?.map((r, ri) => (
                <div className="recall" key={ri}>
                  <div className="eyebrow">ОСТАНОВИТЕСЬ И ОБЪЯСНИТЕ</div>
                  <p>{r.question}</p>
                  <details>
                    <summary>Сверить своё рассуждение</summary>
                    <p>{r.answer}</p>
                    <small>
                      Самопроверка: ответ не оценивается автоматически.
                    </small>
                  </details>
                </div>
              ))}
            </section>
          ))}
          {l.id === "T3-03" && <NwcLab />}
          {l.id === "T3-11" && <IntegratedModel />}
          <Sources refs={l.sourceRefs} />
          {Object.keys(data.lessons).some(
            (k) => k.startsWith(`${l.id}@`) && k !== `${l.id}@${l.version}`,
          ) && (
            <p>
              Сохранена отметка чтения предыдущей версии. Она остаётся в
              истории; новая редакция ещё не отмечена прочитанной.
            </p>
          )}
          <div className="panel">
            <h2>Самостоятельная практика</h2>
            <p>
              Чтение, верные числа и самостоятельный перенос — разные
              наблюдения. Ни одна отметка чтения не означает освоение.
            </p>
            {(l.practiceIds ?? [])
              .filter((pid) => availableProblems.some((p) => p.id === pid))
              .map((pid) => (
                <p key={pid}>
                  <Link to={`practice/${pid}`}>
                    {problems.find((p) => p.id === pid)?.title ?? pid}
                  </Link>
                </p>
              ))}
          </div>
          <div className="row">
            <button
              className="button"
              onClick={() =>
                update((p) => ({
                  ...p,
                  lessons: {
                    ...p.lessons,
                    [`${l.id}@${l.version}`]: new Date().toISOString(),
                  },
                }))
              }
            >
              {data.lessons[`${l.id}@${l.version}`] ? (
                <>
                  <Check size={17} /> Прочитано · текущая версия
                </>
              ) : (
                <>
                  Отметить прочитанным <Check size={17} />
                </>
              )}
            </button>
            <Link
              to={`practice/${availableProblems.find((p) => p.lessonId === l.id)?.id ?? ""}`}
              className="button outline"
            >
              Закрепить в практике <ArrowRight size={17} />
            </Link>
          </div>
        </article>
        <aside className="toc">
          <span className="eyebrow">В ЭТОМ РАЗДЕЛЕ</span>
          {l.sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                });
              }}
            >
              <span>{i + 1}</span>
              {s.title.replace(/^\d+[.)]?\s*/, "")}
            </a>
          ))}
          <small>
            <Clock3 size={14} /> {l.minutes} минут · версия {l.version}
          </small>
          <Link to="curriculum">
            Все подразделы <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
