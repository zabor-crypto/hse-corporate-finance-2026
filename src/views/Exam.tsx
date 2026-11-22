import { assessedStages, attemptContext } from "../engine/grading/attempt";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Problem } from "../content/types";
import { assemblePaper } from "../curriculum/assembly";
import type { ExamBlueprint, PaperSnapshot } from "../curriculum/types";
import { unseenHistory } from "../curriculum/errors";
import type { Progress, Draft } from "../storage/progress";
import { Link, emptyDraft, pct, publishedProblemContent } from "../components/Common";
import { grade, QuestionFields, ProblemContext, Feedback, Workpad } from "../components/Problem";
import { getActivePack, moduleIdFromRoute } from "../runtime";
import { useEditableDraft, flushPendingDrafts } from "../storage/useEditableDraft";
/** A seed identifies reproducible selection; it never generates new conditions. */
export function parseExamSeed(raw: string): number {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 0xffffffff)
    throw new Error("Invalid assembly identity");
  return Number(raw);
}
export function fixedExamComposition(blueprint: ExamBlueprint): boolean {
  return blueprint.slots.length > 0 && blueprint.slots.every(slot => slot.problemIds?.length === 1);
}
export function authorTimerRemaining(startedAt: number, minutes: number, now: number): number {
  return Math.max(0, Math.ceil((startedAt + minutes * 60000 - now) / 1000));
}
export function Exam({
  data,
  update,
  getCurrent,
}: {
  data: Progress;
  getCurrent?:()=>Progress;
  update: (fn: (p: Progress) => Progress) => void;
}) {
  const pack=getActivePack();
  const curriculumRegistry=pack.registry;
  const problems=publishedProblemContent();
  const sampleExamIds=pack.content.sampleExamIds??[];
  const pendingDrafts=useRef<Record<string,Draft>>({});
  const snapshot=()=>{flushPendingDrafts("grade");const current=getCurrent?.()??data;return {...current,drafts:{...current.drafts,...pendingDrafts.current}};};
  const session = data.exam;
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [seed, setSeed] = useState("20261107");
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [useAuthorTimer, setUseAuthorTimer] = useState(false);
  const [timer, setTimer] = useState<{ sessionId: string; startedAt: number } | null>(null);
  const [fallbackBlueprintId, setFallbackBlueprintId] = useState<string | null>(null);
  const publishedBlueprints = curriculumRegistry.blueprints.filter(b => b.reviewStatus === "PUBLISHED" && pack.config.blueprintIds.includes(b.id));
  const fallbackBlueprint = publishedBlueprints.find(b => b.id === fallbackBlueprintId);
  useEffect(() => { setError(""); setFallbackBlueprintId(null); }, [pack.id]);
  useEffect(() => {
    if (!session || session.finishedAt || timer?.sessionId !== session.id) return;
    setClock(Date.now());
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.finishedAt, timer?.sessionId]);
  const remaining = session?.paper && timer?.sessionId === session.id
    ? authorTimerRemaining(timer.startedAt, session.paper.blueprint.minutes, clock)
    : null;
  const expired = remaining === 0;
  const ids = session?.problemIds ?? sampleExamIds;
  const bank = ids
    .map((id) => problems.find((p) => p.id === id))
    .filter((p): p is Problem => !!p);
  const incompatible =
    !!session &&
    (bank.length !== session.problemIds.length ||
      bank.length === 0 ||
      bank.some((p) => session.versions[p.id] !== p.version));
  const freshPolicy=pack.config.freshPaper;
  const freshVariants=(freshPolicy?.familyIds??[]).map(f=>problems.find(p=>p.transfer?.familyId===f&&p.transfer?.seed!==undefined&&!data.exposures?.[`${p.id}@${p.version}`]&&!data.answers.some(a=>a.problemId===p.id)));
  const start = (
    problemIds: string[] = session?.problemIds ?? sampleExamIds,
    paper?: PaperSnapshot,
  ) => {
    if (
      !problemIds.length ||
      new Set(problemIds).size !== problemIds.length ||
      problemIds.some((id) => !problems.some((p) => p.id === id))
    ) {
      setError(
        "Сохранённый состав недоступен. Выберите проверенный вариант; исходная сессия сохранена.",
      );
      return;
    }
    if (
      paper &&
      (JSON.stringify(paper.problemIds) !== JSON.stringify(problemIds) ||
        problemIds.some(
          (id) =>
            problems.find((p) => p.id === id)?.version !== paper.versions[id],
        ))
    ) {
      setError(
        "Версия состава изменилась. Выберите новый вариант; исходная сессия сохранена.",
      );
      return;
    }
    const sessionId = crypto.randomUUID();
    setIndex(0);
    setError("");
    setFallbackBlueprintId(null);
    setTimer(paper && useAuthorTimer ? { sessionId, startedAt: Date.now() } : null);
    update((x) => ({
      ...x,
      archives: x.exam
        ? [
            ...x.archives,
            { kind: "exam-session", session: structuredClone(x.exam) },
          ]
        : x.archives,
      exam: {
        id: sessionId,
        problemIds: [...problemIds],
        versions: Object.fromEntries(
          problems
            .filter((p) => problemIds.includes(p.id))
            .map((p) => [p.id, p.version]),
        ),
        seenProblemIds: unseenHistory(x, curriculumRegistry).seenKeys,
        startedAt: new Date().toISOString(),
        ...(paper ? { paper: structuredClone(paper) } : {}),
      },
    }));
  };
  const startBlueprint = (blueprint: ExamBlueprint, allowSeen = false) => {
    try {
      const paper = assemblePaper(
        curriculumRegistry,
        { ...blueprint, ...(allowSeen ? { unseenPolicy: "prefer" as const } : unseenOnly ? { unseenPolicy: "require" as const } : {}) },
        parseExamSeed(seed),
        unseenHistory(getCurrent?.() ?? data, curriculumRegistry),
        new Date().toISOString(),
      );
      if (allowSeen) setUnseenOnly(false);
      start(paper.problemIds, paper);
    } catch (e) {
      const invalidSeed = e instanceof Error && e.message.includes("assembly identity");
      setFallbackBlueprintId(!invalidSeed && unseenOnly ? blueprint.id : null);
      setError(invalidSeed
        ? "Номер набора должен быть целым числом от 0 до 4294967295."
        : unseenOnly
          ? "Для этого состава не хватает невиданных заданий. История сохранена. Можно явно разрешить знакомые задания и продолжить тренировку."
          : "Недостаточно подходящих проверенных заданий для этого состава. Выберите другой вариант; прежняя история сохранена.");
    }
  };
  const current = bank[Math.min(index, bank.length - 1)];
  useEffect(() => {
    if (!session || session.finishedAt || !current) return;
    const k = `${current.id}@${current.version}`;
    update((x) => {
      const old = x.exposures?.[k];
      if (old?.modes.includes("exam")) return x;
      return {
        ...x,
        exposures: {
          ...x.exposures,
          [k]: {
            firstSeenAt: old?.firstSeenAt ?? new Date().toISOString(),
            assistanceUsed: old?.assistanceUsed ?? false,
            modes: [...(old?.modes ?? []), "exam"],
          },
        },
      };
    });
  }, [current?.id, session?.id, session?.finishedAt, update]);
  if (!session) return <>
    <div className="eyebrow">САМОСТОЯТЕЛЬНАЯ ПРОВЕРКА · {pack.id}</div><h1>Соберите всё вместе.</h1>
    <section className="exam-intro"><h2>{pack.config.nearestAssessment.title}</h2>
      <p>Авторская тренировка, не официальный формат контрольной. Ответы и объяснения откроются после завершения.</p>
      <div className="exam-settings">
        <div className="exam-seed-field">
          <label htmlFor="exam-seed">Номер набора (seed)</label>
          <input id="exam-seed" inputMode="numeric" pattern="[0-9]*" value={seed} onChange={e => { setSeed(e.target.value); setError(""); setFallbackBlueprintId(null); }} aria-describedby="exam-seed-help" />
          <p id="exam-seed-help">Номер позволяет повторить сборку. Он не создаёт новые условия или числа; в фиксированном составе набор заданий останется тем же.</p>
        </div>
        <label className="exam-checkbox"><input type="checkbox" tabIndex={0} checked={unseenOnly} onChange={e => { setUnseenOnly(e.target.checked); setError(""); setFallbackBlueprintId(null); }} /><span>Только задания без прежних показов и попыток в этой истории</span></label>
        <p className="exam-settings-note">Без фильтра сборщик предпочитает новые задания, но может включить знакомые. Повтор не считается новым переносом навыка.</p>
        <label className="exam-checkbox"><input type="checkbox" tabIndex={0} checked={useAuthorTimer} onChange={e => setUseAuthorTimer(e.target.checked)} /><span>Включить авторский таймер · по желанию</span></label>
        <p className="exam-settings-note">По умолчанию ограничения времени нет. Таймер — авторский ориентир, официальный темп неизвестен. Он не закрывает ввод и после перезагрузки выключается.</p>
      </div>
      {publishedBlueprints.map(b => <div className="panel" key={b.id}><h3>{b.title}</h3><p>{b.slots.length} заданий · без ограничения времени · разбор после отправки</p>{fixedExamComposition(b) && <p className="exam-fixed-composition">Состав фиксирован: смена номера не даст новых заданий. Вариант может включать уже решённые задачи.</p>}{useAuthorTimer && <p>Авторский ориентир: {b.minutes} минут, без блокировки ответа.</p>}<button className="button" onClick={() => startBlueprint(b)}>Собрать {b.id}</button></div>)}
      {error && <p role="alert">{error}</p>}
      {fallbackBlueprint && <button className="button outline" onClick={() => startBlueprint(fallbackBlueprint, true)}>Разрешить знакомые и собрать {fallbackBlueprint.id}</button>}
    </section>
    {!!freshPolicy&&<section className="exam-intro"><h2>Контрольная на новых наборах</h2><p>По одному ещё не открывавшемуся набору каждого семейства. Повтор знакомой задачи не доказывает перенос.</p><button className="button" disabled={freshVariants.some(p=>!p)} onClick={()=>start([...(freshPolicy.fixedProblemIds),...freshVariants.map(p=>p!.id)])}>Начать на новых наборах</button>{freshVariants.some(p=>!p)&&<p>В одном из семейств все наборы уже открывались.</p>}</section>}
    {(pack.config.examPresets??[]).map(p=><section className="exam-intro" key={p.id}><h2>{p.title}</h2><p>{p.description}</p><button className="button" onClick={()=>start(p.problemIds)}>{p.buttonLabel??`Начать ${p.title.toLowerCase()}`}</button></section>)}
  </>;
  const sessionModule=moduleIdFromRoute("practice",session.problemIds[0]);
  if(sessionModule!==pack.id)return <section className="panel"><h1>Сохранена контрольная другой темы</h1><p>Состав, версии, ответы и черновики сохранены. Продолжите её в исходной теме либо перенесите в архив перед выбором нового варианта.</p><Link className="button" to={`exam/${sessionModule}`}>Открыть сохранённую контрольную</Link><button className="button outline" onClick={()=>update(x=>({...x,exam:null,archives:[...x.archives,{kind:"exam-session",session:x.exam}]}))}>Сохранить в архив и выбрать новый вариант</button></section>;
  const records = data.answers.filter(
    (a) => a.mode === "exam" && a.id.startsWith(`${session.id}:`),
  );
  if (session.finishedAt)
    return (
      <>
        <div className="eyebrow">МИНИ-КОНТРОЛЬНАЯ / РЕЗУЛЬТАТ</div>
        <h1>
          Числа и выбор вариантов:{" "}
          {pct(
            records.reduce((s, r) => s + r.score, 0) / Math.max(1, ids.length),
          )}
        </h1>
        <p>
          Каждое задание весит 1 балл. В кейсе — частичные баллы за независимые
          шаги.
        </p>
        <div className="panel">
          {records.map((r) => (
            <div key={r.id}>
              <h2>{(r.problemSnapshot as Problem).title}</h2>
              <Feedback
                returnRoute={`exam/${pack.id}`}
                p={r.problemSnapshot as Problem}
                result={r}
                data={data}
                update={update}
              />
            </div>
          ))}
        </div>
        {!session.paper && (
          <button className="button" onClick={() => start()}>
            Новая попытка
          </button>
        )}
        <button
          className="button outline"
          style={{ marginLeft: 10 }}
          onClick={() =>
            update((x) => ({
              ...x,
              exam: null,
              archives: [
                ...x.archives,
                { kind: "exam-session", session: x.exam },
              ],
            }))
          }
        >
          {session.paper
            ? "Выбрать новый вариант"
            : "Выбрать другую контрольную"}
        </button>
        <p>Предыдущий результат останется в истории.</p>
      </>
    );
  if (incompatible)
    return (
      <div className="panel">
        <h1>Задания обновились</h1>
        <p>
          Сохранённая сессия относится к предыдущей версии. Её черновики
          сохраняются. Начните новую попытку на текущих заданиях.
        </p>
        <button className="button" onClick={() => start(sampleExamIds)}>
          Начать новую версию
        </button>
      </div>
    );
  const p = bank[Math.min(index, bank.length - 1)];
  const key = `exam:${session.id}:${p.id}@${p.version}`;
  const answered = bank.filter((q) => {
    const d = data.drafts[`exam:${session.id}:${q.id}@${q.version}`];
    return (
      d &&
      (q.options
        ? d.selected.length > 0
        : assessedStages(q, "exam").every(
            (s) => d.values[s.id]?.trim() && d.units?.[s.id],
          ))
    );
  }).length;
  return (
    <>
      <div className="eyebrow">
        МИНИ-КОНТРОЛЬНАЯ / ВОПРОС {index + 1} ИЗ {bank.length}
      </div>
      {session.paper && (
        <section className="panel" aria-label="Паспорт контрольной">
          <p>
            {session.paper.blueprint.title} · {session.paper.blueprint.id}@
            {session.paper.blueprint.version} · номер {session.paper.seed}
          </p>
          {fixedExamComposition(session.paper.blueprint) && <p>Фиксированный состав; другой номер не создаёт новые условия.</p>}
          {remaining === null ? <>
            <p>Без ограничения времени. Завершите работу, когда будете готовы.</p>
            <button className="button outline" onClick={() => { setClock(Date.now()); setTimer({ sessionId: session.id, startedAt: Date.now() }); }}>Включить авторский таймер на {session.paper.blueprint.minutes} мин</button>
          </> : <>
            <p role="timer" aria-live="off">Авторский ориентир: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}. {expired ? "Ориентир истёк. Можно продолжать; ответы откроются после вашей отправки." : "Это не официальный темп контрольной."}</p>
            <button className="button outline" onClick={() => setTimer(null)}>Выключить таймер</button>
          </>}
          <p className="exam-timer-note">Таймер не блокирует ввод и выключается после перезагрузки. Черновики и состав сохраняются.</p>
          <p>
            Ранее открывались:{" "}
            {
              session.paper.problemIds.filter((id) =>
                session.seenProblemIds?.includes(
                  `${id}@${session.versions[id]}`,
                ),
              ).length
            }{" "}
            из {bank.length}. Состав и версии сохранены; старые попытки не
            переоцениваются.
          </p>
        </section>
      )}
      <div className="exam-navigation">
        {bank.map((q, i) => (
          <button
            className={i === index ? "current" : ""}
            key={q.id}
            onClick={() => {flushPendingDrafts("question-change");setIndex(i);}}
            aria-label={`Вопрос ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
        <span>
          Заполнено {answered} / {bank.length}
        </span>
      </div>
      <article className="panel">
        <h1 className="question-title">Задание {index + 1}</h1>
        <ProblemContext p={p} mode="exam" />
        <ExamEditor key={key} draftKey={key} p={p} saved={data.drafts[key]} update={update} onDraft={d=>{pendingDrafts.current[key]=d;setError("");}}/>
        <div className="row">
          <button
            className="button outline"
            disabled={index === 0}
            onClick={() => {flushPendingDrafts("question-change");setIndex(index - 1);}}
          >
            Назад
          </button>
          <button
            className="button outline"
            disabled={index === bank.length - 1}
            onClick={() => {flushPendingDrafts("question-change");setIndex(index + 1);}}
          >
            Далее <ArrowRight size={16} />
          </button>
        </div>
      </article>
      <div className="exam-finish">
        <p>
          Ответы и разборы откроются после завершения. Неотвеченные задания:{" "}
          {bank.length - answered}.
        </p>
        <button
          className="button"
          onClick={() => {
            const currentData=snapshot();
            const actualAnswered=bank.filter(q=>{const d=currentData.drafts[`exam:${session.id}:${q.id}@${q.version}`];return d&&(q.options?d.selected.length>0:assessedStages(q,"exam").every(s=>d.values[s.id]?.trim()&&d.units?.[s.id]));}).length;
            if (actualAnswered < bank.length && !session.paper) {
              setError(
                "Заполните все задания перед отправкой. Можно переключаться по номерам сверху.",
              );
              return;
            }
            const now = new Date().toISOString();
            const results = bank.map((q) => ({
              ...grade(
                q,
                currentData.drafts[`exam:${session.id}:${q.id}@${q.version}`] ??
                  emptyDraft(),
                "exam",
                attemptContext(
                  q,
                  currentData.drafts[`exam:${session.id}:${q.id}@${q.version}`] ??
                    emptyDraft(),
                  "exam",
                  currentData,
                  session.seenProblemIds === undefined ||
                    session.seenProblemIds.includes(`${q.id}@${q.version}`),
                ),
              ),
              id: `${session.id}:${q.id}`,
            }));
            update((x) => ({
              ...x,
              answers: [...x.answers, ...results],
              exam: { ...session, finishedAt: now },
            }));
          }}
        >
          Завершить и проверить
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </>
  );
}

function ExamEditor({draftKey,p,saved,update,onDraft}:{draftKey:string;p:Problem;saved:Draft|undefined;update:(fn:(p:Progress)=>Progress)=>void;onDraft:(d:Draft)=>void}){
 const editor=useEditableDraft({key:draftKey,saved,commit:(k,d)=>update(x=>({...x,drafts:{...x.drafts,[k]:d}}))});
 const change=(d:Draft)=>{onDraft(d);editor.change(d);};
 return <div onBlur={()=>editor.flush("blur")}><QuestionFields p={p} mode="exam" draft={editor.draft} onChange={change}/><Workpad draft={editor.draft} onChange={change}/></div>;
}
