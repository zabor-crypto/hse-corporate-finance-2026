import { curriculumRegistry } from "../curriculum";
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
export function Curriculum() {
  const visibleLessons = publishedLessonContent();
  const visibleProblems = publishedProblemContent();
  const availableTopics = topics.filter((t) =>
    visibleLessons.some((l) => l.id === t.id || t.lessonIds.includes(l.id)),
  );
  return (
    <>
      <div className="eyebrow">КАРТА УЧЕБНОЙ ПРОГРАММЫ</div>
      <div className="page-heading compact">
        <div>
          <h1>Большая картина.</h1>
          <p>
            Доступно {visibleLessons.length} учебных разделов из{" "}
            {curriculumRegistry.lessons.length} в текущей карте. Ниже — навыки и{" "}
            {seminarMap.length} задач семинара; наличие упражнения не означает
            полного разбора исходной задачи.
          </p>
        </div>
      </div>
      {curriculumRegistry.modules.map((module) => (
        <section key={module.id} aria-label={module.title}>
          <h2>{module.title}</h2>
          <div className="curriculum-list">
            {topics
              .filter((t) =>
                module.lessonIds.some(
                  (id) => id === t.id || t.lessonIds.includes(id),
                ),
              )
              .map((t) => {
                const published = visibleLessons.filter(
                  (l) => l.id === t.id || t.lessonIds.includes(l.id),
                );
                return (
                  <article className="panel" key={t.id}>
                    <div className="row spread">
                      <span className="eyebrow">{t.id}</span>
                      <span
                        className={`tag ${published.length ? "available" : ""}`}
                      >
                        {published.length
                          ? "Урок доступен"
                          : lessons.some(
                                (l) =>
                                  l.id === t.id || t.lessonIds.includes(l.id),
                              )
                            ? "На проверке"
                            : "Запланирован"}
                      </span>
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.summary}</p>
                    <ul>
                      {t.outcomes.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                    <p className="muted">
                      Предпосылки:{" "}
                      {t.prerequisites.length
                        ? t.prerequisites.map((id, i) => {
                            const prerequisite = topics.find(
                              (x) => x.id === id,
                            );
                            const lesson = visibleLessons.find(
                              (l) =>
                                l.id === id ||
                                prerequisite?.lessonIds.includes(l.id),
                            );
                            return (
                              <span key={id}>
                                {i > 0 && "; "}
                                {lesson ? (
                                  <Link to={`learn/${lesson.id}`}>
                                    {prerequisite?.title}
                                  </Link>
                                ) : (
                                  `${prerequisite?.title ?? id} (запланирован)`
                                )}
                              </span>
                            );
                          })
                        : "начальный раздел"}
                      .
                    </p>
                    <Sources refs={t.sourceRefs} />
                    {published.map((l) => (
                      <Link
                        key={l.id}
                        to={`learn/${l.id}`}
                        className="text-link"
                      >
                        {published.length > 1
                          ? `Изучить: ${l.title}`
                          : "Изучить раздел"}{" "}
                        <ArrowRight size={16} />
                      </Link>
                    ))}
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      <h2>Задачи семинара: что нужно уметь</h2>
      <div className="curriculum-list seminar-map">
        {seminarMap.map((s) => {
          const related = visibleLessons.filter((l) =>
            s.topicIds.includes(l.id),
          );
          const exercises = visibleProblems.filter(
            (p) =>
              p.transfer?.seed === undefined &&
              p.sourceRefs.some(
                (ref) => ref.kind === "seminar" && ref.seminar === s.id,
              ),
          );
          return (
            <article className="panel competency-card" key={s.id}>
              <div className="row spread">
                <span className="eyebrow">Задача {s.id}</span>
                <span className="tag">
                  {s.status === "needs-assumptions"
                    ? "Нужны явные предпосылки"
                    : s.status === "planned"
                      ? "Частичное покрытие"
                      : "Есть учебный разбор"}
                </span>
              </div>
              <h3>{s.title}</h3>
              <h4>Что требуется</h4>
              <ul>
                {s.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
              <h4>Перед расчётом</h4>
              <ul>
                {s.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
              <p>
                <b>Связанные уроки:</b>{" "}
                {related.length
                  ? related.map((l, i) => (
                      <span key={l.id}>
                        {i > 0 && "; "}
                        <Link to={`learn/${l.id}`}>{l.title}</Link>
                      </span>
                    ))
                  : "полный урок ещё не опубликован"}
                .
              </p>
              {exercises.length ? (
                <details>
                  <summary>Учебные упражнения ({exercises.length})</summary>
                  <ul>
                    {exercises.map((p) => (
                      <li key={p.id}>
                        <Link to={`practice/${p.id}`}>{p.title}</Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <p>Отдельное упражнение ещё не опубликовано.</p>
              )}
              <details>
                <summary>Покрытие и неоднозначности условия</summary>
                <p>{s.note}</p>
              </details>
            </article>
          );
        })}
      </div>
      <p className="notice">
        Опубликовано {availableTopics.length} разделов карты. Программа
        расширяется по мере подготовки и проверки материала. Отметка чтения и
        верный ответ не подтверждают готовность к контрольной.
      </p>
    </>
  );
}
