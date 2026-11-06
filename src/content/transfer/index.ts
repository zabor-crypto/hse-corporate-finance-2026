import type { Problem } from "../types";
import { makeNwcProblem, type NwcScenario } from "./nwc-cash";
import { makeReturnsProblem, type ReturnsScenario } from "./returns-rebuild";
import {
  makeLiquidityProblem,
  type LiquidityScenario,
} from "./liquidity-cycle";
import { makePayoutProblem, type PayoutScenario } from "./payout-growth";
export {
  makeNwcProblem,
  makeReturnsProblem,
  makeLiquidityProblem,
  makePayoutProblem,
};
export type TransferFamilyId =
  "nwc-cash" | "returns-rebuild" | "liquidity-cycle" | "payout-growth";
export const transferFamilies: {
  id: TransferFamilyId;
  title: string;
  seedMin: number;
  seedMax: number;
  topicId: string;
  note: string;
}[] = [
  {
    id: "nwc-cash",
    title: "Рост, отсрочки и денежный результат",
    seedMin: 0,
    seedMax: 7,
    topicId: "T3-03",
    note: "Различаются знаки изменений AR/INV/AP и сочетания заёмного финансирования, выплат и инвестиционных расходов.",
  },
  {
    id: "returns-rebuild",
    title: "Восстановление результата и цены капитала",
    seedMin: 0,
    seedMax: 7,
    topicId: "T3-08",
    note: "Нужно согласовать средние базы, вернуть финансирование из NI и разделить ROE, операционную эффективность и экономическую прибыль.",
  },
  {
    id: "liquidity-cycle",
    title: "Ликвидность, закупки и денежный цикл",
    seedMin: 0,
    seedMax: 7,
    topicId: "T3-07",
    note: "Растущие AR/INV и изменяющиеся условия поставщиков требуют разных баз для дней и коэффициентов на дату.",
  },
  {
    id: "payout-growth",
    title: "Выплаты, удержание прибыли и условная оценка",
    seedMin: 0,
    seedMax: 7,
    topicId: "T3-09",
    note: "Ограниченный интеграционный мост к запланированному T3-09; не означает завершения главы или рыночной рекомендации.",
  },
];
const stories = [
  "Компания увеличила клиентскую отсрочку, одновременно сократив склад.",
  "Поставщики сократили отсрочку, а предприятие накопило сезонный запас.",
  "Бережливое производство высвободило часть складских средств, но покупатели стали платить позже.",
  "Перед высоким сезоном закупки выросли, а часть старой дебиторки была взыскана.",
  "Компания получила оплату старых продаж и направила её на товары для нового заказа.",
  "Расширение продаж потребовало и дополнительных запасов, и кредита покупателям.",
  "Сокращение операций высвободило AR и товары, одновременно пришлось погасить часть AP.",
  "Изменились условия обеих сторон: клиентский кредит вырос, поставщики потребовали более быстрой оплаты.",
];
const arChanges = [20, 4, 7, -5, -14, 25, -9, 12];
const invChanges = [-6, 10, -18, 22, 8, 13, -16, -10];
const apChanges = [4, -8, -3, 9, 5, 11, -4, -6];
export const nwcScenarios: NwcScenario[] = stories.map((story, s) => ({
  story,
  revenue: 420 + 15 * s,
  cogs: 200 + 8 * s,
  sga: 90 + 3 * s,
  da: 15 + s,
  interest: 8 + s / 2,
  tax: s % 2 ? 0.25 : 0.2,
  ar0: 30,
  ar1: 30 + arChanges[s],
  inv0: 45,
  inv1: 45 + invChanges[s],
  ap0: 25,
  ap1: 25 + apChanges[s],
  cash0: 15,
  capex: 35 + 5 * s,
  borrowing: [0, 20, 0, 10, 30, 5, 0, 25][s],
  repayment: [5, 0, 10, 0, 5, 10, 0, 15][s],
  dividends: 8 + s,
}));
export const returnsScenarios: ReturnsScenario[] = Array.from(
  { length: 8 },
  (_, s) => ({
    story: [
      "Дистрибьютор сравнивает высокую доходность Equity с требуемой доходностью всего бизнеса.",
      "Производитель завершил инвестиционный год и не должен смешать новые активы с годовым потоком.",
      "Компания с высокой оборачиваемостью оценивает, сколько ROE принесла сама операция.",
      "У сервиса снизилась маржа, но сохранился долг: нужен анализ источников доходности.",
      "Розничная сеть использует заметный рычаг и дорогой капитал.",
      "Производитель получает положительную прибыль, но должен оплатить требование инвесторов.",
      "Владельцы обсуждают замену долга собственным капиталом, сохраняя операции.",
      "Компания с быстрым ростом хочет отделить хороший ROE от высокой требуемой доходности.",
    ][s],
    assets0: 150 + 20 * s,
    assets1: 170 + 20 * s,
    equity0: 55 + 5 * s,
    equity1: 65 + 5 * s,
    turnover: [1.5, 1.8, 2, 2.2, 2.5, 1.6, 2.4, 2.1][s],
    margin: [0.08, 0.09, 0.1, 0.07, 0.06, 0.11, 0.085, 0.095][s],
    debtRate: [0.08, 0.1, 0.12, 0.07, 0.09, 0.11, 0.065, 0.095][s],
    tax: s % 2 ? 0.25 : 0.2,
    wacc: [0.14, 0.16, 0.2, 0.13, 0.14, 0.18, 0.15, 0.22][s],
  }),
);
export const liquidityScenarios: LiquidityScenario[] = Array.from(
  { length: 8 },
  (_, s) => {
    const cash0 = 18 + s,
      cash1 = cash0 - [4, 5, 3, 6, 7, 4, 5, 3][s];
    const ar0 = 35 + 3 * s,
      inv0 = 55 + 4 * s,
      ap0 = 20 + 2 * s;
    const da = 8 + s,
      ni = 70 + 4 * s;
    const arDelta = [15, 8, 20, 12, 25, 16, 9, 22][s],
      invDelta = [12, 18, 7, 25, 14, 20, 16, 10][s],
      apDelta = [4, 2, 6, 5, 3, 7, 4, 8][s],
      newDebt = [2, 3, 1, 4, 2, 1, 3, 2][s];
    const cfo = ni + da - arDelta - invDelta + apDelta;
    return {
      story: [
        "Магазин показывает выросшие текущие активы при сокращении денег.",
        "Сеть закупила сезонные товары и продлила клиентскую отсрочку.",
        "Новая клиентская программа увеличила торговую дебиторку.",
        "Перед пиковым сезоном компания одновременно нарастила запасы и текущий долг.",
        "Покупатели стали платить позже, а поставщики почти не увеличили отсрочку.",
        "Компания профинансировала товарный рост частично за счёт поставщиков.",
        "На отчётную дату склад и дебиторка стали крупнее денежного остатка.",
        "Финансовый директор должен согласовать улучшенный баланс ликвидности с cash flow.",
      ][s],
      cash0,
      cash1,
      ar0,
      ar1: ar0 + arDelta,
      inv0,
      inv1: inv0 + invDelta,
      ap0,
      ap1: ap0 + apDelta,
      shortDebt0: 12 + s,
      shortDebt1: 12 + s + newDebt,
      sales: 700 + 45 * s,
      cogs: 400 + 30 * s,
      ni,
      da,
      capex: cash0 + cfo + newDebt - cash1,
      periodDays: 365,
    };
  },
);
export const payoutScenarios: PayoutScenario[] = Array.from(
  { length: 8 },
  (_, s) => ({
    story: [
      "Совет директоров сравнивает две доли дивидендных выплат.",
      "Компания увеличивает выплаты и должна согласовать это с устойчивым ростом.",
      "Владельцы меняют долю реинвестируемой прибыли, сохраняя операционную модель.",
      "Компания оценивает последствия сокращения выплат в условной бессрочной модели.",
      "При дорогом Equity важно проверить, сколько роста обеспечивает удержанная прибыль.",
      "Требуется согласованная оценка двух дивидендных сценариев.",
      "Долговое финансирование усиливает ROE, но не отменяет проверки цены риска.",
      "Компания сравнивает рост следующей прибыли и текущую цену потока дивидендов.",
    ][s],
    roc: [0.12, 0.14, 0.16, 0.1, 0.13, 0.15, 0.11, 0.17][s],
    debtEquity: [0.5, 1, 0.75, 0.4, 1.25, 0.6, 1.5, 0.8][s],
    debtRate: [0.08, 0.09, 0.1, 0.07, 0.1, 0.11, 0.08, 0.12][s],
    tax: 0.2,
    ni0: [40, 50, 45, 35, 60, 55, 38, 62][s],
    payout0: [0.6, 0.55, 0.5, 0.65, 0.6, 0.5, 0.7, 0.55][s],
    payout1: [0.5, 0.65, 0.6, 0.55, 0.7, 0.6, 0.6, 0.45][s],
    equityRate: [0.2, 0.24, 0.25, 0.18, 0.23, 0.22, 0.21, 0.28][s],
  }),
);
export const transferScenarioInputs = {
  "nwc-cash": nwcScenarios,
  "returns-rebuild": returnsScenarios,
  "liquidity-cycle": liquidityScenarios,
  "payout-growth": payoutScenarios,
};
/** Finite published presets, not unrestricted random generation or economic optimization. */
export function generateTransferProblem(
  familyId: TransferFamilyId,
  seed: number,
): Problem {
  if (!Number.isInteger(seed) || seed < 0 || seed > 7)
    throw new RangeError("Допустим только целый seed от 0 до 7");
  const prefix = {
    "nwc-cash": "NWC",
    "returns-rebuild": "RET",
    "liquidity-cycle": "LIQ",
    "payout-growth": "DDM",
  }[familyId];
  if (!prefix) throw new RangeError("Неизвестное семейство");
  const meta = {
    id: `T3-V-${prefix}-${seed}`,
    familyId,
    seed,
    benchmark: false,
  };
  switch (familyId) {
    case "nwc-cash":
      return makeNwcProblem(nwcScenarios[seed], meta);
    case "returns-rebuild":
      return makeReturnsProblem(returnsScenarios[seed], meta);
    case "liquidity-cycle":
      return makeLiquidityProblem(liquidityScenarios[seed], meta);
    case "payout-growth":
      return makePayoutProblem(payoutScenarios[seed], meta);
  }
}
export const allTransferVariants: Problem[] = transferFamilies.flatMap((f) =>
  Array.from({ length: 8 }, (_, seed) => generateTransferProblem(f.id, seed)),
);
