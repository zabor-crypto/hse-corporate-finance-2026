import { transferEvidence, reasoningStatus } from "../storage/progress";
import { ErrorLog } from "../components/ErrorLog";
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
import { getActivePack } from "../runtime";
import { flushPendingDrafts } from "../storage/useEditableDraft";
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
  publishedProblemContent,
} from "../components/Common";
import {
  grade,
  QuestionFields,
  ProblemContext,
  Feedback,
} from "../components/Problem";
export function ProgressView({
  data,
  update,
  raw,
  onImport,
  getCurrent,
}: {
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  raw: string | null;
  onImport: (incoming: unknown) => void | Promise<void>;
  getCurrent?: () => Progress;
}) {
  const pack = getActivePack();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<Mode>("practice");
  const [reset, setReset] = useState(false);
  const availableProblems = publishedProblemContent();
  const problems = availableProblems;
  const records = data.answers.filter((a) => a.mode === mode);
  const current = records.filter((a) =>
    availableProblems.some(
      (p) => p.id === a.problemId && p.version === a.version,
    ),
  );
  const old = records.length - current.length;
  const latest = new Map<string, AnswerRecord>();
  current.forEach((a) => {
    const previous = latest.get(a.problemId);
    if (
      !previous ||
      Date.parse(a.timestamp) > Date.parse(previous.timestamp) ||
      (Date.parse(a.timestamp) === Date.parse(previous.timestamp) &&
        a.id > previous.id)
    )
      latest.set(a.problemId, a);
  });
  const mistakes = [...latest.values()].filter((a) => a.score < 1);
  const download = () => {
    flushPendingDrafts("export");
    const latest = getCurrent?.() ?? data;
    const payload = raw
      ? {
          ...latest,
          archives: [
            ...latest.archives,
            { kind: "original-storage-bytes", raw },
          ],
        }
      : latest;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cflos-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <>
      <div className="eyebrow">МОЁ ОБУЧЕНИЕ / ЛОКАЛЬНЫЙ ПРОГРЕСС</div>
      <div className="page-heading compact">
        <div>
          <h1>Каждая ошибка — следующий шаг.</h1>
          <p>
            Результаты остаются на этом устройстве. Экспортируйте копию для
            переноса.
          </p>
          <p>Показатели выбранной темы {pack.id}; история включает все темы.</p>
        </div>
      </div>
      <div className="row">
        <button className="button" onClick={download}>
          <Download size={16} /> Экспорт JSON
        </button>
        <label className="button outline">
          <Upload size={16} /> Импорт JSON
          <input
            aria-label="Импорт прогресса"
            type="file"
            accept="application/json,.json"
            className="file-input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setStatus("Чтение и сохранение копии…");
              try {
                if (file.size > 100_000_000)
                  throw Error("Файл слишком большой (максимум 100 МБ).");
                await onImport(JSON.parse(await file.text()));
                setStatus("Копия импортирована; история сохранена.");
              } catch (err) {
                setStatus(
                  err instanceof Error
                    ? err.message
                    : "Не удалось прочитать файл.",
                );
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      <div className="mode-tabs">
        {(["practice", "study", "exam"] as Mode[]).map((m) => (
          <button
            className={mode === m ? "selected" : ""}
            key={m}
            onClick={() => setMode(m)}
          >
            {m === "practice"
              ? "Практика"
              : m === "study"
                ? "Обучение"
                : "Контрольная"}
          </button>
        ))}
      </div>
      <div className="stats-grid">
        <div>
          <strong>{records.length}</strong>
          <p>попыток в этом режиме · все темы</p>
        </div>
        <div>
          <strong>
            {[...latest.values()].filter((a) => a.score === 1).length}
          </strong>
          <p>
            из {availableProblems.length} доступных заданий: последний ответ
            верен
          </p>
        </div>
        <div>
          <strong>{old}</strong>
          <p>ответов других тем или версий вне выбранного набора</p>
        </div>
      </div>
      <section className="panel">
        <h2>Что подтверждено этими записями</h2>
        <p>
          Объективный балл учитывает числа, выбранные единицы и варианты ответа.{" "}
          {
            data.answers.filter(
              (a) => reasoningStatus(a, data) === "SUBMITTED_NOT_REVIEWED",
            ).length
          }{" "}
          объяснений сохранено без проверки;{" "}
          {
            data.answers.filter(
              (a) => reasoningStatus(a, data) === "SELF_REVIEWED",
            ).length
          }{" "}
          отмечено вами по рубрике.
        </p>
        <p>
          Новый вариант с первой самостоятельной попытки без отмеченной помощи:{" "}
          {transferEvidence(data, problems).cleanFirstSuccesses}. Освоение
          материала ещё не подтверждено. Это наблюдение приложения, не
          подтверждение готовности к контрольной.
        </p>
        <p>
          Исторические ответы без протокола objective-units-v3.0 остаются в
          истории; единицы в них отдельно не оценивались.
        </p>
      </section>
      <ErrorLog data={data} update={update} />
      <h2>Последние попытки с ошибками</h2>
      <section className="panel">
        {mistakes.length ? (
          mistakes.map((a) => (
            <div className="mistake-row" key={a.id}>
              <div>
                <strong>
                  {problems.find((p) => p.id === a.problemId)?.title}
                </strong>
                <p>
                  {pct(a.score)} · {a.errorCodes.join(", ")}
                </p>
              </div>
              <Link to={`practice/${a.problemId}`} className="button outline">
                Повторить
              </Link>
            </div>
          ))
        ) : (
          <>
            <h3>
              {current.length
                ? "Все последние ответы верны"
                : "В выбранной теме пока нет текущих попыток"}
            </h3>
            <p>После первой попытки вы увидите результат по каждому шагу.</p>
            <Link to="practice" className="text-link">
              Перейти к практике <ArrowRight size={16} />
            </Link>
          </>
        )}
      </section>
      <details
        className="panel history"
        onToggle={(e) => setHistoryOpen(e.currentTarget.open)}
      >
        <summary>История всех попыток ({records.length})</summary>
        {historyOpen && (
          <>
            <p>
              Страница {historyPage + 1} из{" "}
              {Math.max(1, Math.ceil(records.length / 25))}. JSON загружается
              при раскрытии ответа.
            </p>
            <div className="row">
              <button
                disabled={historyPage === 0}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                Предыдущие 25
              </button>
              <button
                disabled={(historyPage + 1) * 25 >= records.length}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                Следующие 25
              </button>
            </div>
          </>
        )}
        {historyOpen &&
          records
            .slice()
            .reverse()
            .slice(historyPage * 25, (historyPage + 1) * 25)
            .map((a) => (
              <div key={a.id}>
                <b>
                  {a.problemId} · v{a.version}
                </b>
                <span>
                  {pct(a.score)} ·{" "}
                  {new Date(a.timestamp).toLocaleString("ru-RU")}
                </span>
                <HistoryJSON record={a} />
              </div>
            ))}
      </details>
      <div className="reset">
        <button className="text-button" onClick={() => setReset(!reset)}>
          Начать обучение заново
        </button>
        {reset && (
          <div>
            <p>
              Текущие результаты будут сохранены в архиве экспорта. Очистятся
              активные черновики, отметки уроков и сессия контрольной.
            </p>
            <button
              className="button outline"
              onClick={() => {
                update((p) => ({
                  ...blankProgress(),
                  answers: p.answers,
                  exposures: p.exposures,
                  reasoningReviews: p.reasoningReviews,
                  archives: [
                    ...p.archives,
                    {
                      kind: "reset",
                      timestamp: new Date().toISOString(),
                      snapshot: {
                        lessons: p.lessons,
                        drafts: p.drafts,
                        exam: p.exam,
                      },
                    },
                  ],
                }));
                setReset(false);
              }}
            >
              Подтвердить новый старт
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function HistoryJSON({ record }: { record: AnswerRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Исходный ответ и версия задания</summary>
      {open && (
        <pre>
          {JSON.stringify(
            { response: record.userResponse, problem: record.problemSnapshot },
            null,
            2,
          )}
        </pre>
      )}
    </details>
  );
}
