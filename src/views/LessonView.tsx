import { getProblemLabel } from "../pedagogy/problem-labels";
import {TeachingLesson} from "../components/TeachingLesson";
import {LessonSections} from "../components/LessonSections";
import { WorkedExample } from "../components/StepByStep";
import { useEffect } from "react";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import type { Progress } from "../storage/progress";
import { Link, Sources, FormulaCard, publishedLessonContent, publishedProblemContent } from "../components/Common";
import { getActivePack } from "../runtime";
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
  const pack=getActivePack();
  const enhancements=pack.config.lessonEnhancements?.[id];
  const problems=pack.content.problems;
  const path=pack.config.learningPaths?.[id];
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
  const teaching=pack.config.teachingPaths?.[id];
  if(teaching)return <TeachingLesson key={l.id} lesson={l} path={teaching} anchor={anchor} data={data} update={update}/>;
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
          {enhancements?.beforeSections}
          <LessonSections sections={l.sections}/>
          {enhancements?.afterSections}
          <Sources refs={l.sourceRefs} />
          {Object.keys(data.lessons).some(
            (k) => k.startsWith(`${l.id}@`) && k !== `${l.id}@${l.version}`,
          ) && (
            <p>
              Сохранена отметка чтения предыдущей версии; она остаётся в
              истории.
            </p>
          )}
          <div className="panel">
            <h2>Самостоятельная практика</h2>
            <p>
              Начните с одного задания без подсказок. После ответа можно открыть разбор и проверить ход решения.
            </p>
            {(path?.practiceIds ?? l.practiceIds ?? [])
              .filter((pid) => availableProblems.some((p) => p.id === pid))
              .map((pid) => (
                <p key={pid}>
                  <Link to={`practice/${pid}`}>
                    {getProblemLabel(problems.find((p) => p.id === pid) ?? {id: pid, title: pid})}
                  </Link>
                </p>
              ))}
          </div>
          {path?.nextLessonId && <p><Link className="button" to={`learn/${path.nextLessonId}`}>Следующий механизм →</Link></p>}
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
              to={`practice/${(path?.practiceIds ?? l.practiceIds ?? []).find(pid=>availableProblems.some(p=>p.id===pid)) ?? availableProblems.find((p) => p.lessonId === l.id)?.id ?? ""}`}
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
