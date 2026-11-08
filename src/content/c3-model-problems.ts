import { original, lecture, seminar, type Problem } from "./types";
import {
  buildThreeYearModel,
  type OpeningBalance,
  type ThreeYearPolicy,
} from "../engine/finance/three-year";
export const modelExerciseInputs: {
  id: string;
  company: string;
  opening: OpeningBalance;
  policy: ThreeYearPolicy;
}[] = [
  {
    id: "C3-M01",
    company: "Вереск",
    opening: {
      cash: 22,
      ar: 18,
      inventory: 24,
      ap: 12,
      ppe: 180,
      debt: 120,
      equity: 112,
    },
    policy: {
      sales: [160, 220, 260],
      dso: [36.5, 36.5, 36.5],
      days: 365,
      inventoryToSales: 0.15,
      apToSales: 0.1,
      nopatMargin: 0.24,
      taxRate: 0.2,
      debtRate: 0.08,
      payout: 0.3,
      capex: [0, 0, 0],
      openingRemainingLife: 10,
      newAssetLife: 5,
      minimumCash: 20,
      funding: "fixed-debt",
    },
  },
  {
    id: "C3-M02",
    company: "Северный инструмент",
    opening: {
      cash: 30,
      ar: 20,
      inventory: 30,
      ap: 20,
      ppe: 200,
      debt: 160,
      equity: 100,
    },
    policy: {
      sales: [220, 280, 340],
      dso: [60, 75, 90],
      days: 365,
      inventoryToSales: 0.15,
      apToSales: 0.08,
      nopatMargin: 0.2,
      taxRate: 0.25,
      debtRate: 0.1,
      payout: 0.4,
      capex: [20, 30, 0],
      openingRemainingLife: 10,
      newAssetLife: 5,
      minimumCash: 20,
      funding: "fixed-debt",
    },
  },
];
const money = (v: number) =>
  v.toLocaleString("ru-RU", { maximumFractionDigits: 6 });
export const c3ModelProblems: Problem[] = modelExerciseInputs.map((s) => {
  const p = s.policy,
    o = s.opening,
    rows = buildThreeYearModel(o, p);
  const prompt = `Компания «${s.company}» планирует три года. Все суммы в млн ₽. Начальный баланс: cash${o.cash}, AR${o.ar}, INV${o.inventory}, AP операционных поставщиков${o.ap}, PPE${o.ppe}, банковский долг${o.debt}, Equity${o.equity}. Продажи по годам:${p.sales.join("; ")}. NOPAT/Sales=${p.nopatMargin * 100}%, налог${p.taxRate * 100}%, проценты${p.debtRate * 100}% начального долга, полностью платятся в CFO. Долг фиксирован; новых займов и погашений нет. На конец года AR=Sales×${p.dso.join("/365; Sales×")}/365 (для каждого года используйте соответствующее число дней); INV=${p.inventoryToSales * 100}% продаж, AP=${p.apToSales * 100}% продаж. Это политика конечных остатков при условно равномерных продажах, а не измерение исторического среднего DSO. Существующий PPE линейно амортизируется ещё${p.openingRemainingLife}лет. CapEx по годам:${p.capex.join("; ")}; ввод в конце года, новая DA начинается со следующего года, срок${p.newAssetLife}лет. Выбытий, переоценок, НДС, прочих начислений и неденежных корректировок нет. Налог уплачен в год начисления; убытки не дают денежного налогового возмещения. Дивиденды${p.payout * 100}% положительной NI, платятся в конце года. Операционная маржа задаётся политикой NOPAT/Sales, а не фиксированными денежными затратами. Найдите cash и Equity на конец третьего года, а также CFO второго года. Проверьте оба тождества за каждый год и объясните роль изменения отсрочки или CapEx.`;
  const values = [rows[2].cash, rows[2].equity, rows[1].cfo],
    labels = ["Cash на конец года3", "Equity на конец года3", "CFO за год2"];
  return {
    id: s.id,
    version: "1.0.0",
    topicId: "T3-11",
    lessonId: "T3-11",
    theorySectionId: "sequence",
    title: `Трёхлетний план «${s.company}»`,
    prompt,
    difficulty: "L4",
    type: "steps",
    objective:
      "Самостоятельно согласовать три формы за три года при явных финансовых политиках.",
    inputs: [],
    assumptions: [
      "Все недостающие политики прямо заданы в условии.",
      "Это новый авторский вариант, не официальный ответ семинара.",
    ],
    stages: values.map((expected, i) => ({
      id: ["cash3", "equity3", "cfo2"][i],
      label: labels[i],
      expected,
      unit: "млн ₽",
      tolerance: 0.005,
      weight: 1,
      hint: "Сверьте начальные и конечные остатки и отдельно пройдите по реальным платежам.",
      solution: `${labels[i]}=${money(expected)} млн ₽; полный расчёт раскрыт после отправки.`,
      errorCode: "MODEL_RECONCILIATION",
    })),
    formulaIds: ["income", "nopat", "operating-nwc", "cfo", "balance"],
    sourceRefs: [lecture(66, 69, 71, 93, 96), seminar("3.7"), original],
    reviewStatus: "CONTENT_REVIEW_PENDING",
    oracleId: `C3_MODEL_${s.id}`,
    alternativeMethods: [
      "Прямые поступления от покупателей минус выплаты поставщикам, сотрудникам, банку и бюджету; отдельная сверка с косвенным CFO.",
    ],
    independent: {
      title: `План компании «${s.company}»`,
      prompt,
      stageIds: ["cash3", "equity3", "cfo2"],
    },
    transfer: { familyId: "c3-three-year-reconstruction", benchmark: false },
    solution: rows.map(
      (r) =>
        `Год${r.year}: NI${money(r.ni)}; DA${money(r.da)}; NWC${money(r.operatingNwc)}; ΔNWC${money(r.deltaNwc)}; CFO${money(r.cfo)}; CFI${money(r.cfi)}; CFF${money(r.cff)}; cash${money(r.cash)}; PPE${money(r.ppe)}; Equity${money(r.equity)}. Проверки баланса и денежного потока дают0.`,
    ),
    commonErrors: [
      {
        code: "MODEL_RECONCILIATION",
        message:
          "Проверьте дату начала новой DA, знак изменения NWC, начисление процентов на начальный долг и перенос конечного остатка в следующий год.",
      },
    ],
    reasoning: {
      prompt:
        "Сверьте деньги независимым маршрутом; покажите, какое решение финансирования потребуется при увеличении отсрочки.",
      rubric: [
        "P&L, cash и баланс согласованы по всем трём годам.",
        "Прямой и косвенный CFO дают один результат.",
        "Новый долг не признан операционной выручкой; гипотезы финансирования названы явно.",
      ],
      sampleAnswer:
        "Сначала восстанавливаем выручку и денежные затраты, затем AR/INV/AP и фактические платежи. Прирост AR или запасов требует денег, CapEx относится к CFI. Если cash ниже выбранного минимума, фиксированный долг нельзя молча увеличить: нужно отдельно согласовать финансирование или изменить политику.",
    },
  };
});
