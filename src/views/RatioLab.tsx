import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  calcRatioRelationships,
  type RatioRelationshipsInput,
} from "../engine/finance/ratios";
import { Link, publishedLessonContent } from "../components/Common";
import { MathFormula } from "../components/Math";
const initial: RatioRelationshipsInput = {
  sales: 150,
  ebit: 15,
  interest: 0.5,
  taxRate: 0.2,
  assets: 50,
  equity: 30,
  debt: 20,
  cash: 0,
  otherLiabilities: 0,
  capitalBasis: "gross",
  taxLossTreatment: "no-credit",
};
const percent = (v: number) =>
  `${(v * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
export function RatioLab() {
  const [input, setInput] = useState(initial);
  let result: ReturnType<typeof calcRatioRelationships> | null = null;
  let error = "";
  try {
    result = calcRatioRelationships(input);
  } catch (e) {
    error = e instanceof Error ? e.message : "Проверьте исходные данные";
  }
  const update = (key: keyof RatioRelationshipsInput, value: string) =>
    setInput((p) => ({
      ...p,
      [key]: value.trim() === "" ? NaN : Number(value.replace(",", ".")),
    }));
  const fields: [keyof RatioRelationshipsInput, string][] = [
    ["sales", "Выручка, млн ₽"],
    ["ebit", "EBIT, млн ₽"],
    ["interest", "Проценты, млн ₽"],
    ["assets", "Активы, млн ₽"],
    ["equity", "Собственный капитал, млн ₽"],
    ["debt", "Долг, млн ₽"],
    ["cash", "Денежные средства, млн ₽"],
    ["otherLiabilities", "Прочие обязательства, млн ₽"],
  ];
  return (
    <>
      <div className="eyebrow">
        ФИНАНСОВЫЕ КОЭФФИЦИЕНТЫ / ИНТЕРАКТИВНАЯ МОДЕЛЬ
      </div>
      <div className="page-heading compact">
        <div>
          <h1>Как связаны коэффициенты</h1>
          <p>
            Меняйте исходные данные, восстанавливайте прибыль и проверяйте
            каждое тождество. Исходная точка — явная учебная трактовка семинара
            3.5.
          </p>
        </div>
      </div>
      <div className="ratio-layout">
        <section className="panel ratio-inputs">
          <h2>Одна компания, один период</h2>
          <p className="muted">
            Все денежные значения в млн ₽. Потоки годовые; балансовые базы —
            согласованные средние за тот же год. В упрощённой модели нет прочих
            доходов и обязательств сверх указанных.
          </p>
          {fields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                inputMode="decimal"
                value={Number.isNaN(input[key]) ? "" : String(input[key])}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            Налог, %
            <input
              aria-label="Налог, %"
              inputMode="decimal"
              value={Number.isNaN(input.taxRate) ? "" : input.taxRate * 100}
              onChange={(e) =>
                setInput((p) => ({
                  ...p,
                  taxRate:
                    e.target.value.trim() === ""
                      ? NaN
                      : Number(e.target.value.replace(",", ".")) / 100,
                }))
              }
            />
          </label>
          <label>
            База ROC
            <select
              aria-label="База ROC"
              value={input.capitalBasis}
              onChange={(e) =>
                setInput((p) => ({
                  ...p,
                  capitalBasis: e.target
                    .value as RatioRelationshipsInput["capitalBasis"],
                }))
              }
            >
              <option value="gross">Весь финансовый капитал D + E</option>
              <option value="net-cash">
                Капитал за вычетом cash: D + E − Cash
              </option>
            </select>
          </label>
          <label>
            Налог при убытке
            <select
              aria-label="Налог при убытке"
              value={input.taxLossTreatment}
              onChange={(e) =>
                setInput((p) => ({
                  ...p,
                  taxLossTreatment: e.target.value as
                    "no-credit" | "full-credit",
                }))
              }
            >
              <option value="no-credit">Без немедленного возмещения</option>
              <option value="full-credit">
                Полное возмещение — условная модель
              </option>
            </select>
          </label>
          <button className="button outline" onClick={() => setInput(initial)}>
            Вернуть исходный пример
          </button>
          <p className="sources">
            Слайды 76, 78–79, 88, 90. Новый учебный текст; не официальный
            калькулятор преподавателя.
          </p>
        </section>
        <div className="ratio-results">
          {error && (
            <div className="notice" role="alert" data-testid="ratio-error">
              {error}. Данные не исправляются автоматически.
            </div>
          )}
          {result && (
            <>
              <div className="ratio-result-grid">
                {[
                  {
                    title: "ROA · NOPAT / Assets",
                    value: percent(result.roaNopat),
                    id: "ratio-roa-nopat",
                  },
                  {
                    title: `ROC · ${input.capitalBasis === "gross" ? "D + E" : "D + E − Cash"}`,
                    value: percent(result.roc),
                    id: "ratio-roc",
                  },
                  {
                    title: "ROE · NI / Equity",
                    value: percent(result.roe),
                    id: "ratio-roe",
                  },
                  {
                    title: "Покрытие процентов · ICR",
                    value:
                      result.icr === null
                        ? "Не определено"
                        : `${result.icr.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} раз`,
                    id: "ratio-icr",
                  },
                  {
                    title: "Чувствительность · DFL",
                    value:
                      result.dfl === null
                        ? "Не определено"
                        : result.dfl.toLocaleString("ru-RU", {
                            maximumFractionDigits: 2,
                          }),
                    id: "ratio-dfl",
                  },
                  {
                    title: "ROA · NI / Assets",
                    value: percent(result.roaNi),
                    id: "ratio-roa-ni",
                  },
                ].map((r) => (
                  <article className="panel" key={r.id}>
                    <div className="eyebrow">{r.title}</div>
                    <strong data-testid={r.id}>{r.value}</strong>
                  </article>
                ))}
              </div>
              <article className="panel">
                <h2>Сначала восстановите прибыль</h2>
                <p>
                  EBIT = {input.ebit}; NOPAT ={" "}
                  {result.nopat.toLocaleString("ru-RU")}; NI ={" "}
                  {result.ni.toLocaleString("ru-RU")} млн ₽. Для NOPAT проценты
                  не вычитаются, для NI — вычитаются до налога.
                </p>
                <p>
                  ROA(EBIT) = {percent(result.roaEbit)}. Изменение числителя
                  даёт другой показатель, даже при тех же активах.
                </p>
                {input.interest === 0 && (
                  <p className="notice">
                    При нулевых процентах ICR не определён: знаменатель равен
                    нулю. DFL = 1 при ненулевых EBIT и NI; при NI = 0 он не
                    определён.
                  </p>
                )}
                {result.ni === 0 && (
                  <p className="notice">
                    При NI = 0 относительное изменение NI и DFL как эластичность
                    не определены, в том числе при налоге 100%.
                  </p>
                )}
                {input.ebit < 0 && (
                  <p className="notice">
                    Отрицательное покрытие процентов не является запасом
                    платёжеспособности. При убытке выбранный налоговый режим
                    влияет на допустимость формулы рычага.
                  </p>
                )}
              </article>
              <article className="panel">
                <h2>Два фактора операционной доходности</h2>
                <MathFormula latex="\frac{NOPAT}{Assets}=\frac{NOPAT}{Sales}\times\frac{Sales}{Assets}" />
                <p>
                  {percent(result.operatingMargin)} ×{" "}
                  {result.turnover.toLocaleString("ru-RU", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  раз = {percent(result.twoFactorRoa)}. Операционная маржа здесь
                  соответствует слайду 76: NOPAT / Sales.
                </p>
              </article>
              <article className="panel">
                <h2>Три фактора доходности собственника</h2>
                <MathFormula latex="ROE=\frac{NI}{Sales}\times\frac{Sales}{Assets}\times\frac{Assets}{Equity}" />
                <p>
                  {percent(result.netMargin)} ×{" "}
                  {result.turnover.toLocaleString("ru-RU", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  ×{" "}
                  {result.dupont.equityMultiplier.toLocaleString("ru-RU", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  = {percent(result.dupont.roe)}.
                </p>
                <p>
                  Нужна NI-маржа. Подстановка NOPAT-маржи даст NOPAT / Equity
                  вместо NI / Equity; при положительных посленалоговых процентах
                  это завысит ROE.
                </p>
              </article>
              <article className="panel">
                <h2>Рычаг: связь с ценой долга</h2>
                <MathFormula latex="ROE=ROC_{D+E}+\frac DE\left(ROC_{D+E}-r_d(1-t)\right)" />
                <p>
                  Gross ROC = {percent(result.grossRoc)}; D/E ={" "}
                  {result.debtEquity.toLocaleString("ru-RU", {
                    maximumFractionDigits: 3,
                  })}
                  ; условная стоимость долга после налога при доступном щите:{" "}
                  {result.afterTaxDebtCost === null
                    ? "нет долга"
                    : percent(result.afterTaxDebtCost)}
                  .
                </p>
                {result.leverageIdentityApplicable ? (
                  <p>
                    По тождеству: ROE = {percent(result.leveragedRoe!)}.
                    Согласовано с прямым NI / Equity.
                  </p>
                ) : (
                  <p className="notice">
                    Тождество рычага здесь не применимо: выбранный режим налога
                    не даёт полного щита I(1−t). Используйте прямой NI / Equity.
                  </p>
                )}
                {input.capitalBasis === "net-cash" && (
                  <p className="notice">
                    ROC за вычетом cash не подставляется в это тождество. Для
                    него отдельно рассчитан gross ROC на D + E.
                  </p>
                )}
              </article>
              <article className="panel" data-testid="ratio-value-creation">
                <h2>Положительный ROE ещё не доказывает создание стоимости</h2>
                <p>
                  Нужна цена соответствующего капитала. Для EVA сравнивают NOPAT
                  с WACC × Invested Capital; для собственника ROE сопоставляют с
                  требуемой доходностью собственного капитала. Здесь WACC и rₑ
                  не заданы, поэтому единственного вывода о создании стоимости
                  нет.
                </p>
                <p>
                  Для сравнения компаний согласуйте период, учётную политику,
                  среднюю/конечную базу, разовые статьи, валюту и состав долга.
                  Рост ROE может сопровождаться ростом риска.
                </p>
              </article>
              <div className="row">
                {[
                  { id: "T3-05", label: "Разобрать рентабельность" },
                  { id: "T3-06", label: "Рычаг" },
                  { id: "T3-08", label: "DuPont" },
                ]
                  .filter(({ id }) =>
                    publishedLessonContent().some((l) => l.id === id),
                  )
                  .map(({ id, label }, i) => (
                    <Link
                      key={id}
                      to={`learn/${id}`}
                      className={`button ${i ? "outline" : ""}`}
                    >
                      {label} {i === 0 && <ArrowRight size={16} />}
                    </Link>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
