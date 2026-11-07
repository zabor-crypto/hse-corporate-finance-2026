import { useState } from "react";
import {
  integratedScenarios,
  type ModelYear,
} from "../engine/finance/three-year";
const number = (n: number | null) =>
  n === null
    ? "не определено"
    : n.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
export function IntegratedModel() {
  const [scenario, setScenario] =
    useState<keyof typeof integratedScenarios>("base");
  const rows = integratedScenarios[scenario];
  const table = (
    title: string,
    fields: [string, keyof ModelYear, boolean?][],
  ) => (
    <section className="panel">
      <h3>{title}</h3>
      <div
        className="model-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table>
          <caption>
            Все суммы в млн ₽; показатели доходности — в процентах, D/E — в
            разах.
          </caption>
          <thead>
            <tr>
              <th scope="col">Показатель</th>
              {rows.map((r) => (
                <th key={r.year} scope="col">
                  Год {r.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(([label, key, rate]) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                {rows.map((r) => (
                  <td key={r.year}>
                    {number(
                      typeof r[key] === "number"
                        ? (r[key] as number) * (rate ? 100 : 1)
                        : null,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
  return (
    <section aria-label="Воспроизводимая трёхлетняя модель">
      <h2>Три сценария: одни правила учёта, разные решения</h2>
      <label>
        Сценарий{" "}
        <select
          value={scenario}
          onChange={(e) =>
            setScenario(e.target.value as keyof typeof integratedScenarios)
          }
        >
          <option value="base">База: долг фиксирован</option>
          <option value="growthUnfunded">
            Рост и отсрочки: финансирование не закрыто
          </option>
          <option value="growthFunded">
            Рост и отсрочки: отдельное решение о кредитной линии
          </option>
        </select>
      </label>
      <p>
        Статус по годам:{" "}
        {rows
          .map(
            (r) =>
              `${r.year}: ${r.status === "FUNDED" ? "минимум cash обеспечен" : "нужно финансирование"}`,
          )
          .join("; ")}
        . Стресс-сценарии — самостоятельные учебные варианты, а не изменение
        условия преподавателя.
      </p>
      {table("План прибыли и убытков", [
        ["Выручка", "sales"],
        ["Денежные операционные затраты", "cashOperatingCosts"],
        ["EBITDA", "ebitda"],
        ["Амортизация", "da"],
        ["EBIT", "ebit"],
        ["Проценты", "interest"],
        ["EBT", "ebt"],
        ["Налог", "tax"],
        ["NI", "ni"],
        ["NOPAT", "nopat"],
      ])}
      {table("Движение денежных средств", [
        ["Изменение операционного NWC", "deltaNwc"],
        ["CFO (проценты включены)", "cfo"],
        ["CFI", "cfi"],
        ["Новый долг", "borrowing"],
        ["Дивиденды", "dividends"],
        ["CFF", "cff"],
        ["Cash до дополнительного финансирования", "cashBeforeFunding"],
        ["Потребность до минимума25", "fundingNeed"],
        ["Конечный cash", "cash"],
        ["Остаток проверки ΔCash = CFO+CFI+CFF", "cashResidual"],
      ])}
      {table("Конечный баланс и показатели", [
        ["Cash", "cash"],
        ["AR", "ar"],
        ["Запасы", "inventory"],
        ["Основные средства", "ppe"],
        ["Активы", "assets"],
        ["AP поставщикам", "ap"],
        ["Банковский долг", "debt"],
        ["Equity", "equity"],
        ["Обязательства + Equity", "liabilitiesAndEquity"],
        ["Остаток проверки баланса", "balanceResidual"],
        ["ROE на среднем Equity, %", "roe", true],
        ["Gross ROC на среднем D+E, %", "grossRoc", true],
        ["ROC на среднем D+E−cash (PPE+Operating NWC), %", "netRoc", true],
        ["D/E на конец, раз", "debtEquity"],
      ])}
    </section>
  );
}
