import { lessons } from "../content";
import { useState } from "react";
import type { Problem } from "../content/types";
import type { AnswerRecord, Draft, Mode, Progress } from "../storage/progress";
import { reasoningStatus, draftKey } from "../storage/progress";
import { assessedStages, gradeAttempt } from "../engine/grading/attempt";
import { unitFeedback, unitPolicy, units } from "../engine/grading/units";
import { Link, pct } from "./Common";
export const grade = gradeAttempt;
export function QuestionFields({
  p,
  draft,
  onChange,
  disabled = false,
  mode = "study",
}: {
  p: Problem;
  draft: Draft;
  onChange: (d: Draft) => void;
  disabled?: boolean;
  mode?: Mode;
}) {
  return (
    <>
      {p.options?.map((o) => (
        <label
          className={`option ${draft.selected.includes(o.id) ? "chosen" : ""}`}
          key={o.id}
        >
          <input
            type={p.type === "single" ? "radio" : "checkbox"}
            name={p.id}
            value={o.id}
            checked={draft.selected.includes(o.id)}
            disabled={disabled}
            onChange={() =>
              onChange({
                ...draft,
                selected:
                  p.type === "single"
                    ? [o.id]
                    : draft.selected.includes(o.id)
                      ? draft.selected.filter((x) => x !== o.id)
                      : [...draft.selected, o.id],
              })
            }
          />
          <span>{o.label}</span>
        </label>
      ))}
      {assessedStages(p, mode).map((s, i) => {
        const policy = unitPolicy(s.unit);
        return (
          <div className="answer-stage" key={s.id}>
            <label htmlFor={`${p.id}-${s.id}`}>
              <span className="stage-number" aria-hidden="true">
                {i + 1}
              </span>
              {s.label}
            </label>
            <div className="number-field">
              <input
                id={`${p.id}-${s.id}`}
                inputMode="decimal"
                autoComplete="off"
                disabled={disabled}
                value={draft.values[s.id] ?? ""}
                placeholder="Ваш расчёт"
                onChange={(e) =>
                  onChange({
                    ...draft,
                    values: { ...draft.values, [s.id]: e.target.value },
                  })
                }
              />
              <select
                aria-label={`Единица ответа: ${s.label}`}
                disabled={disabled}
                value={draft.units?.[s.id] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    units: { ...draft.units, [s.id]: e.target.value },
                  })
                }
              >
                <option value="">Выберите единицу</option>
                {policy.acceptedUnits.map((u) => (
                  <option key={u} value={u}>
                    {units[u].label}
                  </option>
                ))}
              </select>
            </div>
            <small>
              Допуск ±{s.tolerance} {s.unit}; при смене единицы он
              пересчитывается. Десятичная запятая допустима.
            </small>
          </div>
        );
      })}
      {p.reasoning && (
        <div className="reasoning-box">
          <label htmlFor={`${p.id}-reasoning`}>
            {mode === "study"
              ? p.reasoning.prompt
              : "Обоснуйте выбранные показатели и полученные выводы; укажите условия, при которых они применимы."}
          </label>
          <textarea
            id={`${p.id}-reasoning`}
            className="reasoning-input"
            aria-label="Ваше объяснение"
            value={draft.values.reasoning ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...draft,
                values: { ...draft.values, reasoning: e.target.value },
              })
            }
          />
          <small>
            Текст сохраняется. Содержательную правильность программа не
            оценивает.
          </small>
        </div>
      )}
    </>
  );
}
export function Workpad({
  draft,
  onChange,
  disabled = false,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  disabled?: boolean;
}) {
  return (
    <details className="workpad">
      <summary>Черновик расчётов · сохраняется</summary>
      <label>
        Промежуточные расчёты
        <textarea
          aria-label="Черновик расчётов"
          disabled={disabled}
          value={draft.workpad ?? ""}
          onChange={(e) => onChange({ ...draft, workpad: e.target.value })}
        />
      </label>
      <small>Черновик не участвует в балле.</small>
    </details>
  );
}
export function ProblemContext({
  p,
  mode = "study",
}: {
  p: Problem;
  mode?: Mode;
}) {
  return (
    <>
      <p className="problem-prompt">
        {mode === "study" ? p.prompt : (p.independent?.prompt ?? p.prompt)}
      </p>
      {mode === "study" && p.inputs.length > 0 && (
        <dl className="inputs-grid">
          {p.inputs.map((x, i) => (
            <div key={i}>
              <dt>{x.label}</dt>
              <dd>
                {x.value} <small>{x.unit}</small>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {mode === "study" && (
        <details className="assumptions">
          <summary>Условия и допущения</summary>
          <ul>
            {p.assumptions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
const statusLabels: Record<string, string> = {
  NOT_REQUESTED: "Объяснение не запрашивалось",
  NOT_SUBMITTED: "Объяснение не представлено",
  SUBMITTED_NOT_REVIEWED: "Объяснение сохранено, не проверено",
  SELF_REVIEWED: "Самопроверка по рубрике отмечена",
  LEGACY_NOT_ASSESSED: "В старой записи статус объяснения не фиксировался",
};
export function Feedback({
  p,
  result,
  data,
  update,
  returnRoute,
}: {
  p: Problem;
  result: AnswerRecord;
  data?: Progress;
  update?: (fn: (p: Progress) => Progress) => void;
  returnRoute?: string;
}) {
  const anchor =
    p.theorySectionId ??
    lessons
      .find((l) => l.id === p.lessonId)
      ?.sections.find((s) =>
        s.formulaIds?.some((f) =>
          (Array.isArray(p.formulaIds) ? p.formulaIds : []).includes(f),
        ),
      )?.id;
  const [checked, setChecked] = useState<number[]>([]);
  const state = data
    ? reasoningStatus(result, data)
    : (result.reasoningStatus ?? "LEGACY_NOT_ASSESSED");
  return (
    <div
      className={`feedback ${result.score === 1 ? "correct" : ""}`}
      role="status"
    >
      <h3>
        Числа и выбор вариантов: {pct(result.objectiveScore ?? result.score)}
      </h3>
      <p>
        {statusLabels[state]}. Этот балл не подтверждает понимание или перенос
        навыка.
      </p>
      {result.unitsStatus === undefined && (
        <p>Историческая запись: единицы ответа отдельно не проверялись.</p>
      )}
      {result.stageResults.map((r) => (
        <p key={r.id}>
          {r.correct ? "✓" : "↳"}{" "}
          {p.stages.find((s) => s.id === r.id)?.label ?? "Выбор вариантов"}:{" "}
          {r.correct
            ? "верно"
            : (unitFeedback[r.errorCode ?? "VALUE"] ??
              "Проверьте выбранные варианты.")}
        </p>
      ))}
      {p.reasoning && (
        <details className="reasoning-box">
          <summary>Самопроверка объяснения — отдельно от балла</summary>
          {p.reasoning.rubric.map((r, i) => (
            <label className="rubric-item" key={r}>
              <input
                type="checkbox"
                checked={checked.includes(i)}
                onChange={() =>
                  setChecked((v) =>
                    v.includes(i) ? v.filter((x) => x !== i) : [...v, i],
                  )
                }
              />
              {r}
            </label>
          ))}
          <p>{p.reasoning.sampleAnswer}</p>
          {update && (
            <button
              type="button"
              disabled={
                checked.length !== p.reasoning.rubric.length ||
                !result.userResponse.values.reasoning?.trim()
              }
              onClick={() =>
                update((x) => ({
                  ...x,
                  reasoningReviews: [
                    ...(x.reasoningReviews ?? []),
                    {
                      answerId: result.id,
                      timestamp: new Date().toISOString(),
                      checkedIndices: checked,
                    },
                  ],
                }))
              }
            >
              Отметить самопроверку по всем пунктам
            </button>
          )}
          <small>Это ваша отметка, а не оценка преподавателя.</small>
        </details>
      )}
      <details>
        <summary>Полный разбор и эталон</summary>
        {p.solution.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
        {p.stages.map((s) => (
          <p key={s.id}>
            <b>
              {s.label}: {s.expected} {s.unit}
            </b>
            <br />
            {s.solution}
          </p>
        ))}
      </details>
      {result.score < 1 && (
        <div className="diagnostic">
          <p>
            Сначала проверьте указанный тип ошибки. По одному неверному числу
            нельзя достоверно определить пробел в понимании.
          </p>
          {(Array.isArray(p.commonErrors) ? p.commonErrors : []).map((e) => (
            <p key={e.code}>
              <b>{e.code}</b>: {e.message}
            </p>
          ))}
          <Link
            to={`learn/${p.lessonId}${anchor ? `/${anchor}` : ""}`}
            onClick={() => {
              if (!update || !returnRoute) return;
              update((state) => {
                const key = `${p.id}@${p.version}`,
                  old = state.exposures?.[key],
                  practice = returnRoute.startsWith("practice/"),
                  draft = draftKey("practice", p.id, p.version);
                return {
                  ...state,
                  returnContext: { route: returnRoute, problemId: p.id },
                  ...(practice
                    ? {
                        drafts: {
                          ...state.drafts,
                          [draft]: {
                            ...(state.drafts[draft] ?? {
                              values: {},
                              selected: [],
                            }),
                            assistanceUsed: true,
                          },
                        },
                        exposures: {
                          ...state.exposures,
                          [key]: {
                            firstSeenAt:
                              old?.firstSeenAt ?? new Date().toISOString(),
                            modes: old?.modes ?? ["practice"],
                            assistanceUsed: true,
                          },
                        },
                      }
                    : {}),
                };
              });
            }}
          >
            Вернуться к экономической логике
          </Link>
        </div>
      )}
    </div>
  );
}
