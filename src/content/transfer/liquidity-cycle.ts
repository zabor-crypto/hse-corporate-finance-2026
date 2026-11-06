import type { Problem } from "../types";
import {
  draftBase,
  identity,
  stage,
  source,
  fmt,
  money,
  times,
  days,
  type ScenarioIdentity,
} from "./shared";
export interface LiquidityScenario {
  story: string;
  cash0: number;
  cash1: number;
  ar0: number;
  ar1: number;
  inv0: number;
  inv1: number;
  ap0: number;
  ap1: number;
  shortDebt0: number;
  shortDebt1: number;
  sales: number;
  cogs: number;
  ni: number;
  da: number;
  capex: number;
  periodDays: number;
}
export function makeLiquidityProblem(
  x: LiquidityScenario,
  meta: ScenarioIdentity,
): Problem {
  const ca0 = x.cash0 + x.ar0 + x.inv0,
    ca1 = x.cash1 + x.ar1 + x.inv1,
    cl0 = x.ap0 + x.shortDebt0,
    cl1 = x.ap1 + x.shortDebt1;
  const cr0 = ca0 / cl0,
    cr1 = ca1 / cl1,
    qr1 = (x.cash1 + x.ar1) / cl1,
    cashRatio = x.cash1 / cl1;
  const ar = (x.ar0 + x.ar1) / 2,
    inv = (x.inv0 + x.inv1) / 2,
    ap = (x.ap0 + x.ap1) / 2;
  const purchases = x.cogs + x.inv1 - x.inv0,
    dso = (ar / x.sales) * x.periodDays,
    dih = (inv / x.cogs) * x.periodDays,
    dpo = (ap / purchases) * x.periodDays,
    ccc = dso + dih - dpo;
  const deltaNwc = x.ar1 - x.ar0 + x.inv1 - x.inv0 - (x.ap1 - x.ap0),
    cfo = x.ni + x.da - deltaNwc;
  const prompt = `${x.story} Компания перепродаёт товары, все суммы указаны в млн ₽. Баланс на начало → конец года: деньги ${x.cash0} → ${x.cash1}, торговая дебиторская задолженность ${x.ar0} → ${x.ar1}, запасы ${x.inv0} → ${x.inv1}, торговая кредиторская задолженность ${x.ap0} → ${x.ap1}, краткосрочный банковский долг ${x.shortDebt0} → ${x.shortDebt1}. Прочих оборотных активов и текущих обязательств нет. Годовые продажи ${x.sales} полностью осуществлены с отсрочкой; себестоимость проданных товаров ${x.cogs}. Все закупки товаров — в кредит у поставщиков; списаний, переоценок и производства нет. Чистая прибыль ${x.ni}, амортизация ${x.da}, оплаченный CapEx ${x.capex}; увеличение банковского долга получено деньгами, дивиденды и прочие финансовые потоки отсутствуют. Проценты и налоги уже учтены в NI и операционном cash flow. Для дней используйте ${x.periodDays} дней и простые средние остатков. Для обязательств перед поставщиками нужна стоимость закупок за год, которую следует восстановить из данных. Найдите текущую и быструю ликвидность на конец года, продолжительность финансового цикла и операционный денежный поток. Сопоставьте изменение текущей ликвидности с изменением денег и объясните пределы такого сравнения.`;
  return {
    ...draftBase,
    ...identity(meta),
    topicId: "T3-07",
    lessonId: "T3-07",
    title: "Оборотные активы растут: стало ли легче платить?",
    type: "steps",
    difficulty: "L4",
    objective:
      "Согласовать ликвидность на дату, средние базы дней и годовой денежный поток; восстановить закупки, а не подменить их COGS.",
    prompt,
    independent: { prompt, stageIds: ["cr-end", "qr-end", "ccc", "cfo"] },
    inputs: [],
    assumptions: [
      "CA состоит из cash, AR и INV; CL — из AP и краткосрочного банковского долга.",
      "QR исключает запасы, но сохраняет торговую дебиторку; её качество оценивается отдельно.",
      "DSO использует кредитные продажи, DIH — COGS, DPO — кредитные закупки. Все остатки усреднены одинаково.",
      "Товарные закупки определяются движением запасов без списаний и переоценок.",
      "Денежные потоки и балансовые изменения согласованы; прочих корректировок нет.",
    ],
    stages: [
      stage(
        "cr-start",
        "Текущая ликвидность на начало",
        cr0,
        times,
        "Сопоставьте все текущие активы со всеми текущими обязательствами на одну дату.",
        `${fmt(ca0)}/${fmt(cl0)}=${fmt(cr0)}.`,
        "LIQUIDITY_DATE_BASE",
      ),
      stage(
        "cr-end",
        "Текущая ликвидность на конец",
        cr1,
        times,
        "Банковский краткосрочный долг тоже требует текущего погашения.",
        `${fmt(ca1)}/${fmt(cl1)}=${fmt(cr1)}.`,
        "LIQUIDITY_DATE_BASE",
      ),
      stage(
        "qr-end",
        "Быстрая ликвидность на конец",
        qr1,
        times,
        "Какие активы не требуют предварительно продать товар?",
        `(${x.cash1}+${x.ar1})/${fmt(cl1)}=${fmt(qr1)}.`,
        "QUICK_VS_CURRENT",
      ),
      stage(
        "purchases",
        "Закупки товаров в течение года",
        purchases,
        money,
        "Себестоимость проданного и приобретённые за год товары совпадают лишь при неизменных запасах.",
        `${x.cogs}+${x.inv1}−${x.inv0}=${fmt(purchases)}.`,
        "PURCHASES_VS_COGS",
      ),
      stage(
        "dso",
        "Средний срок инкассации дебиторки",
        dso,
        days,
        "Согласуйте среднюю AR с кредитными продажами того же года.",
        `${fmt(ar)}/${x.sales}×${x.periodDays}=${fmt(dso)}.`,
        "FLOW_STOCK_PERIOD",
      ),
      stage(
        "dih",
        "Средний срок хранения запасов",
        dih,
        days,
        "Запасы учтены по стоимости, поэтому оборот сопоставляется с себестоимостью.",
        `${fmt(inv)}/${x.cogs}×${x.periodDays}=${fmt(dih)}.`,
        "INVENTORY_SALES_BASE",
      ),
      stage(
        "dpo",
        "Средняя отсрочка поставщиков",
        dpo,
        days,
        "Сравните среднюю AP со стоимостью закупленного, а не только проданного товара.",
        `${fmt(ap)}/${fmt(purchases)}×${x.periodDays}=${fmt(dpo)}.`,
        "PURCHASES_VS_COGS",
      ),
      stage(
        "ccc",
        "Продолжительность финансового цикла",
        ccc,
        days,
        "Часть операционного цикла оплачивается отсрочкой поставщиков.",
        `${fmt(dso)}+${fmt(dih)}−${fmt(dpo)}=${fmt(ccc)}.`,
        "CCC_SIGN",
      ),
      stage(
        "cfo",
        "Операционный денежный поток",
        cfo,
        money,
        "Новые требования к покупателям и товары на складе ещё не являются деньгами.",
        `ΔNWC=${fmt(deltaNwc)}; CFO=${x.ni}+${x.da}−${fmt(deltaNwc)}=${fmt(cfo)}.`,
        "CFO_BRIDGE",
      ),
    ],
    formulaIds: [
      "current-liquidity",
      "quick-liquidity",
      "cash-liquidity",
      "dso-days",
      "dih-days",
      "dpo-days",
      "ccc",
      "cfo",
    ],
    sourceRefs: [
      source.lecture(66, 71, 83, 84, 85, 86, 87),
      source.seminar("3.2"),
      source.original,
    ],
    commonErrors: [
      {
        code: "QUICK_VS_CURRENT",
        message:
          "QR не включает товарные запасы. Вместе с тем дебиторка в QR не превращается от этого в немедленно доступные деньги.",
      },
      {
        code: "PURCHASES_VS_COGS",
        message:
          "Запасы изменились: закупки не равны себестоимости проданного. При заданной модели закупки = COGS + INV₁−INV₀.",
      },
      {
        code: "FLOW_STOCK_PERIOD",
        message:
          "Дни рассчитываются на средней базе и годовом потоке, а коэффициенты ликвидности — на конкретную дату.",
      },
      {
        code: "CCC_SIGN",
        message:
          "Отсрочка поставщиков сокращает финансируемый компанией период, поэтому DPO вычитается.",
      },
      {
        code: "CFO_BRIDGE",
        message:
          "Из прибыли после возврата D&A вычитается прирост операционного NWC. Краткосрочный банковский долг не входит в операционную AP.",
      },
    ],
    solution: [
      `CR: ${fmt(cr0)} → ${fmt(cr1)}, QR на конец=${fmt(qr1)}, cash ratio=${fmt(cashRatio)}.`,
      `Закупки=${fmt(purchases)}; DSO=${fmt(dso)}, DIH=${fmt(dih)}, DPO=${fmt(dpo)}; CCC=${fmt(ccc)} дней.`,
      `ΔNWC=${fmt(deltaNwc)}; CFO=${fmt(cfo)}. Проверка cash: ${x.cash0}+${fmt(cfo)}−${x.capex}+${x.shortDebt1 - x.shortDebt0}=${fmt(x.cash1)}.`,
      `CFO при тех же NI и D&A, но без прироста NWC был бы ${x.ni + x.da}: разница ${fmt(deltaNwc)} связана в обороте. Деньги уменьшились на ${x.cash0 - x.cash1}, хотя бухгалтерская текущая ликвидность может выглядеть благоприятно.`,
    ],
    reasoning: {
      prompt:
        "Оцените утверждение руководителя: «Оборотных активов больше, значит нам проще платить». Приведите числовые возражения и уточните, какая информация ещё нужна.",
      rubric: [
        "Сравнить CR на двух датах и не подменить этим анализ качества активов.",
        "Указать рост AR/INV и его денежный эффект через NWC.",
        "Объяснить, почему DPO использует закупки при изменении запасов.",
        "Согласовать cash с CFO, CapEx и финансированием.",
        "Попросить сроки и качество дебиторки, структуру запасов и график обязательств; один высокий CR не гарантирует платёжеспособности.",
      ],
      sampleAnswer: `CR изменился с ${fmt(cr0)} до ${fmt(cr1)}, но cash снизился с ${x.cash0} до ${x.cash1}. В дополнительном операционном обороте связано ${fmt(deltaNwc)} млн ₽; CFO составляет ${fmt(cfo)}, а не NI+D&A=${x.ni + x.da}. CCC=${fmt(ccc)} дней отражает время финансирования при указанных средних базах. Потребуются проверка взыскания AR, реализуемости запасов и сроков выплат.`,
    },
  };
}
