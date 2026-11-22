import { getProblemLabel } from "../pedagogy/problem-labels";
import { attemptContext } from "../engine/grading/attempt";
import { GuidedSteps } from "../components/StepByStep";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, BookOpen, Calculator } from "lucide-react";
import type { Problem } from "../content/types";
import { draftKey } from "../storage/progress";
import type { Progress, Draft, Mode, AnswerRecord } from "../storage/progress";
import { Link, Sources, publishedProblemContent } from "../components/Common";
import { grade, QuestionFields, ProblemContext, Feedback, Workpad } from "../components/Problem";
import { getActivePack } from "../runtime";
import { useEditableDraft } from "../storage/useEditableDraft";
export function Practice({
  id,
  catalog=false,
  data,
  update,
  support,
}: {
  id?: string;
  catalog?:boolean;
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  support: (s: string) => void;
}) {
  const pack=getActivePack();
  const problems=publishedProblemContent();
  const p=problems.find(p=>p.id===id);
  if(p)return <PracticeQuestion key={p.id} p={p} data={data} update={update} support={support}/>;
  if(!catalog)return <>
    <div className="eyebrow">САМОСТОЯТЕЛЬНАЯ ПРАКТИКА · {pack.id}</div><h1>Выберите один следующий шаг.</h1>
    <section className="panel"><h2>Применить механизм к новой ситуации</h2><p>Начните без подсказки формулы. После ответа вы получите разбор; обращение к помощи будет отмечено отдельно.</p><Link className="button" to={`practice/${pack.config.defaultPracticeId}`}>Начать самостоятельную задачу <ArrowRight size={18}/></Link></section>
    <section className="panel"><h2>Проверить решения вместе</h2><p>В тренировочном варианте объяснения открываются после завершения.</p><Link to={`exam/${pack.id}`}>Выбрать тренировочный вариант</Link></section>
    <p><Link to={`catalog/${pack.id}`}>Полный каталог заданий</Link> · <Link to={`learn/${pack.config.primaryLessonId}`}>Вернуться к объяснению</Link></p>
  </>;
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
            Варианты объединены по проверяемому механизму. Смена чисел не создаёт нового умения. После открытия вариант уже не считается невиданным.
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
                  <span>{f}: все наборы уже открывались.</span>
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
                  <h3>{getProblemLabel(p)}</h3>
                  <p>{p.objective}</p>
                </div>
                <ArrowRight size={19} />
              </Link>
            ))}
        </div>
      </>
    );
  return null;
}
function PracticeQuestion({p,data,update,support}:{p:Problem;data:Progress;update:(fn:(p:Progress)=>Progress)=>void;support:(s:string)=>void}){
  const formulas=getActivePack().content.formulas;
  const [seenAtEntry]=useState(() => Object.keys(data.exposures ?? {}).some(key => key.split("@")[0] === p.id) || data.answers.some(a => a.problemId === p.id));
  const [mode,setMode]=useState<Mode>("practice");
  const [attempt,setAttempt]=useState<AnswerRecord|null>(null);
  const [message,setMessage]=useState("");
  useEffect(()=>{setAttempt(null);setMessage("");},[p.id,mode]);
  useEffect(()=>{const k=`${p.id}@${p.version}`;update(x=>{const old=x.exposures?.[k];if(old?.modes.includes(mode)&&(mode!=="study"||old.assistanceUsed))return x;return {...x,exposures:{...x.exposures,[k]:{firstSeenAt:old?.firstSeenAt??new Date().toISOString(),assistanceUsed:!!old?.assistanceUsed||mode==="study",modes:[...new Set([...(old?.modes??[]),mode])]}}};});},[p.id,mode,update]);
  const key = draftKey(mode, p.id, p.version);
  const editor=useEditableDraft({key,saved:data.drafts[key],commit:(k,d)=>update(x=>({...x,drafts:{...x.drafts,[k]:d}}))});
  const draft=editor.draft;
  const change = (d: Draft) => {
    setAttempt(null);
    editor.change(d);
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
      <Link to={`catalog/${getActivePack().id}`} className="back-link">
        <ArrowLeft size={16} /> Все задания
      </Link>
      <div className="eyebrow">
        {p.topicId} / {p.difficulty} / ВЕРСИЯ {p.version}
      </div>
      <div className="page-heading compact">
        <div>
          <h1>
            {getProblemLabel(p)}
          </h1>
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
            onBlur={()=>editor.flush("blur")}
            onSubmit={(e) => {
              e.preventDefault();
              const draft=editor.flush("grade");
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
                attemptContext(p, draft, mode, data, seenAtEntry),
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
            <Feedback
              p={p}
              result={attempt}
              data={data}
              update={update}
              returnRoute={`practice/${p.id}`}
            />
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
              <button
                onClick={() =>
                  assist(
                    `learn/${p.lessonId}${p.theorySectionId ? `/${p.theorySectionId}` : ""}`,
                  )
                }
              >
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
