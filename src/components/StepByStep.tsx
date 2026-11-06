import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { LessonSection, Problem } from "../content/types";
import type { Draft } from "../storage/progress";
import { QuestionFields } from "./Problem";
import { calcOperatingNwc } from "../engine/finance";
export function WorkedExample({
  example,
}: {
  example: NonNullable<LessonSection["example"]>;
}) {
  const [step, setStep] = useState(-1);
  return (
    <div className="worked-example">
      <div className="eyebrow">РАЗБЕРЁМ НА ПРИМЕРЕ</div>
      <h3>{example.title}</h3>
      <p>{example.inputs}</p>
      {step < 0 ? (
        <button className="text-link text-button" onClick={() => setStep(0)}>
          Показать пошаговый разбор <ArrowRight size={15} />
        </button>
      ) : (
        <>
          <p className="eyebrow">
            ШАГ {step + 1} / {example.steps.length}
          </p>
          <p aria-live="polite">{example.steps[step]}</p>
          <div className="row">
            <button
              className="button outline"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} /> Назад
            </button>
            <button
              className="button outline"
              disabled={step === example.steps.length - 1}
              onClick={() => setStep(step + 1)}
            >
              Далее <ArrowRight size={15} />
            </button>
            <button className="text-button" onClick={() => setStep(-1)}>
              Скрыть разбор
            </button>
          </div>
          {step === example.steps.length - 1 && (
            <p>
              <b>Экономический смысл:</b> {example.interpretation}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function GuidedSteps({
  problem,
  draft,
  onChange,
}: {
  problem: Problem;
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  const [step, setStep] = useState(0);
  const index = Math.min(step, problem.stages.length - 1);
  return (
    <div>
      <div className="guided-nav" aria-label="Шаги решения">
        {problem.stages.map((s, i) => (
          <button
            type="button"
            className={i === index ? "current" : ""}
            key={s.id}
            aria-label={`Шаг ${i + 1}: ${s.label}`}
            onClick={() => setStep(i)}
          >
            {i + 1}
            {draft.values[s.id]?.trim() ? " ✓" : ""}
          </button>
        ))}
      </div>
      <p className="muted">
        Шаг {index + 1} из {problem.stages.length}. Можно вернуться к любому
        расчёту.
      </p>
      <QuestionFields
        p={{ ...problem, stages: [problem.stages[index]] }}
        draft={draft}
        onChange={onChange}
      />
      <details className="hint">
        <summary>Подсказка к этому шагу</summary>
        <p>{problem.stages[index].hint}</p>
      </details>
      <div className="row" style={{ margin: "18px 0" }}>
        <button
          type="button"
          className="button outline"
          disabled={index === 0}
          onClick={() => setStep(index - 1)}
        >
          Предыдущий шаг
        </button>
        <button
          type="button"
          className="button outline"
          disabled={index === problem.stages.length - 1}
          onClick={() => setStep(index + 1)}
        >
          Следующий шаг <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
export function NwcLab() {
  const [ar, setAr] = useState(11),
    [inv, setInv] = useState(7),
    [ap, setAp] = useState(7);
  const start = calcOperatingNwc({ ar: 6, inventory: 10, ap: 8 });
  const end = calcOperatingNwc({ ar, inventory: inv, ap });
  const delta = end - start;
  return (
    <div className="nwc-lab">
      <div className="eyebrow">ЛАБОРАТОРИЯ ЗНАКОВ / БЕЗ ОЦЕНКИ</div>
      <h2>Измените баланс. Проследите деньги.</h2>
      <p>
        В начале: AR = 6, INV = 10, AP = 8 млн ₽. Меняйте остатки на конец
        периода; остальные компоненты FCFF постоянны.
      </p>
      {[
        { label: "Дебиторская задолженность AR", value: ar, change: setAr },
        { label: "Запасы INV", value: inv, change: setInv },
        { label: "Кредиторская задолженность AP", value: ap, change: setAp },
      ].map((x) => (
        <label key={x.label}>
          {x.label}: <b>{x.value} млн ₽</b>
          <input
            type="range"
            aria-label={x.label}
            value={x.value}
            min="0"
            max="20"
            step="1"
            onChange={(e) => x.change(Number(e.target.value))}
          />
        </label>
      ))}
      <div className="lab-results" aria-live="polite">
        <div>
          <small>NWC на начало</small>
          <strong>{start}</strong>
        </div>
        <div>
          <small>NWC на конец</small>
          <strong>{end}</strong>
        </div>
        <div>
          <small>ΔNWC</small>
          <strong>
            {delta > 0 ? "+" : ""}
            {delta}
          </strong>
        </div>
        <div>
          <small>Влияние на FCFF</small>
          <strong>
            {-delta > 0 ? "+" : ""}
            {-delta}
          </strong>
        </div>
      </div>
      <p>
        <b>
          {delta > 0
            ? "Больше денег связано в обороте. Свободный поток уменьшается."
            : delta < 0
              ? "Оборотный капитал высвободил деньги. Свободный поток увеличивается."
              : "Потребность в оборотном капитале не изменилась."}
        </b>{" "}
        Это изменение FCFF, а не его полный размер. Все значения — млн ₽.
      </p>
      <small>
        Модель: AR + INV − AP, слайды 66, 71, 86; исходная точка — семинар 3.2.
      </small>
    </div>
  );
}
