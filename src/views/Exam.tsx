import { assessedStages, attemptContext } from "../engine/grading/attempt";
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
  problems as allProblems,
  seminarMap,
  sampleExamIds,
  ratiosExamIds,
  calibratedExamIds,
  transferFamilies,
} from "../content";
import type { Problem, SourceRef } from "../content/types";
import {
  curriculumRegistry,
  assemblePaper,
  type ExamBlueprint,
  type PaperSnapshot,
} from "../curriculum";
import { unseenHistory } from "../curriculum/errors";
const problems = allProblems.filter((p) =>
  curriculumRegistry.problems.some(
    (n) =>
      n.id === p.id &&
      n.version === p.version &&
      n.availability === "available" &&
      n.reviewStatus === "PUBLISHED",
  ),
);
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
export function Exam({
  data,
  update,
}: {
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
}) {
  const session = data.exam;
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [seed, setSeed] = useState("20261107");
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!session || session.finishedAt) return;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.finishedAt]);
  const remaining = session?.paper
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(session.startedAt) +
            session.paper.blueprint.minutes * 60000 -
            clock) /
            1000,
        ),
      )
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
  const freshVariants = transferFamilies.map((f) =>
    problems.find(
      (p) =>
        p.transfer?.familyId === f.id &&
        p.transfer.seed !== undefined &&
        !data.exposures?.[`${p.id}@${p.version}`] &&
        !data.answers.some((a) => a.problemId === p.id),
    ),
  );
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
    setIndex(0);
    setError("");
    update((x) => ({
      ...x,
      archives: x.exam
        ? [
            ...x.archives,
            { kind: "exam-session", session: structuredClone(x.exam) },
          ]
        : x.archives,
      exam: {
        id: crypto.randomUUID(),
        problemIds: [...problemIds],
        versions: Object.fromEntries(
          problems
            .filter((p) => problemIds.includes(p.id))
            .map((p) => [p.id, p.version]),
        ),
        seenProblemIds: unseenHistory(x).seenKeys,
        startedAt: new Date().toISOString(),
        ...(paper ? { paper: structuredClone(paper) } : {}),
      },
    }));
  };
  const startBlueprint = (blueprint: ExamBlueprint) => {
    try {
      const paper = assemblePaper(
        curriculumRegistry,
        {
          ...blueprint,
          ...(unseenOnly ? { unseenPolicy: "require" as const } : {}),
        },
        Number(seed),
        unseenHistory(data),
        new Date().toISOString(),
      );
      start(paper.problemIds, paper);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("assembly identity")
          ? "Номер набора должен быть целым числом от0 до4294967295."
          : "Недостаточно подходящих проверенных заданий для этого состава и истории показов. Попробуйте другой состав или разрешите знакомые задания.",
      );
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
  if (!session)
    return (
      <>
        <div className="eyebrow">САМОСТОЯТЕЛЬНАЯ ПРОВЕРКА</div>
        <div className="page-heading compact">
          <div>
            <h1>Соберите всё вместе.</h1>
            <p>
              Мини-контрольная по изученным подразделам. Без подсказок до
              завершения.
            </p>
          </div>
        </div>
        <section className="exam-intro">
          <h2>Подготовка к контрольной №3</h2>
          <p>
            Авторские тренировочные варианты, а не прогноз вопросов
            преподавателя. Калибровка по фотографиям реальных контрольных пока
            недоступна. Числовой балл не устанавливает понимание.
          </p>
          <label>
            Номер набора (seed){" "}
            <input
              inputMode="numeric"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={unseenOnly}
              onChange={(e) => setUnseenOnly(e.target.checked)}
            />
            Только задания без прежних показов и попыток в этой истории
          </label>
          <p>
            Без этой опции сборщик предпочитает новые задания, но может включить
            знакомые; это будет указано в начале. В одном варианте нет
            эквивалентных семейств.
          </p>
          {curriculumRegistry.blueprints
            .filter((b) => b.reviewStatus === "PUBLISHED")
            .map((b) => (
              <div className="panel" key={b.id}>
                <h3>{b.title}</h3>
                <p>
                  {b.slots.length} заданий · {b.minutes} минут · разбор после
                  отправки
                </p>
                <button className="button" onClick={() => startBlueprint(b)}>
                  Собрать {b.id}
                </button>
              </div>
            ))}
          {error && <p role="alert">{error}</p>}
        </section>
        <section className="exam-intro">
          <h2>Контрольная на новых наборах</h2>
          <p>
            По одному ещё не открывавшемуся набору каждой из четырёх моделей.
            После открытия он сохраняется в истории показов. Ни верный ответ, ни
            повтор этой контрольной не устанавливают освоение.
          </p>
          <button
            className="button"
            disabled={freshVariants.some((p) => !p)}
            onClick={() =>
              start(["T3-Q29", "T3-Q15", ...freshVariants.map((p) => p!.id)])
            }
          >
            Начать на новых наборах
          </button>
          {freshVariants.some((p) => !p) && (
            <p>В одном из семейств все восемь наборов уже открывались.</p>
          )}
        </section>
        <section className="exam-intro">
          <h2>Интегрированная проверка</h2>
          <p>
            Четыре фиксированных кейса: оборотный капитал и потоки;
            рентабельность и рычаг; ликвидность и цикл; выплаты и оценка акции.
            Плюс короткий вопрос и выбор с близкими дистракторами. Повтор
            знакомого варианта не доказывает перенос.
          </p>
          <button className="button" onClick={() => start(calibratedExamIds)}>
            Начать интегрированную контрольную
          </button>
        </section>
        <section className="exam-intro">
          <span className="exam-symbol">
            <GraduationCap size={54} />
          </span>
          <h2>От отчётности к денежному потоку</h2>
          <p>
            4 теоретических вопроса · 2 расчётных задания · 1 кейс из 3 шагов
          </p>
          <div className="exam-facts">
            <span>
              <Clock3 /> Ориентир: 25 минут
            </span>
            <span>
              <LockKeyhole /> Разбор после отправки
            </span>
            <span>
              <Download /> Черновик сохраняется
            </span>
          </div>
          <p>
            Это локальный учебный вариант, составленный по источникам.
            Калибровка по реальным контрольным ещё не выполнена.
          </p>
          <button className="button" onClick={() => start()}>
            Начать мини-контрольную <ArrowRight size={18} />
          </button>
        </section>
        <section className="exam-intro" style={{ marginTop: 20 }}>
          <div className="eyebrow">
            ПРИОРИТЕТ КОНТРОЛЬНОЙ / T3-05 · T3-06 · T3-08
          </div>
          <h2>Коэффициенты и их взаимосвязи</h2>
          <p>
            Семь заданий: восстановление прибыли, версии ROA/ROC, рычаг, DuPont
            и создание стоимости. Свободное объяснение сохраняется для
            самопроверки и не получает автоматического балла.
          </p>
          <button className="button" onClick={() => start(ratiosExamIds)}>
            Начать контрольную по коэффициентам <ArrowRight size={18} />
          </button>
        </section>
      </>
    );
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
                returnRoute="exam"
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
  const draft = data.drafts[key] ?? emptyDraft();
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
            {session.paper.blueprint.version} · seed {session.paper.seed}
          </p>
          <p role="timer">
            Осталось: {Math.floor((remaining ?? 0) / 60)}:
            {String((remaining ?? 0) % 60).padStart(2, "0")}.{" "}
            {expired
              ? "Время истекло. Ввод закрыт; отправьте сохранённые ответы."
              : ""}
          </p>
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
            onClick={() => setIndex(i)}
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
        <QuestionFields
          p={p}
          mode="exam"
          disabled={expired}
          draft={draft}
          onChange={(d) => {
            if (expired) return;
            setError("");
            update((x) => ({ ...x, drafts: { ...x.drafts, [key]: d } }));
          }}
        />
        <Workpad
          draft={draft}
          disabled={expired}
          onChange={(d) =>
            !expired &&
            update((x) => ({ ...x, drafts: { ...x.drafts, [key]: d } }))
          }
        />
        <div className="row">
          <button
            className="button outline"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Назад
          </button>
          <button
            className="button outline"
            disabled={index === bank.length - 1}
            onClick={() => setIndex(index + 1)}
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
            if (answered < bank.length && !session.paper) {
              setError(
                "Заполните все задания перед отправкой. Можно переключаться по номерам сверху.",
              );
              return;
            }
            const now = new Date().toISOString();
            const results = bank.map((q) => ({
              ...grade(
                q,
                data.drafts[`exam:${session.id}:${q.id}@${q.version}`] ??
                  emptyDraft(),
                "exam",
                attemptContext(
                  q,
                  data.drafts[`exam:${session.id}:${q.id}@${q.version}`] ??
                    emptyDraft(),
                  "exam",
                  data,
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
