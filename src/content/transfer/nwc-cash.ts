import type { Problem } from "../types";
import {
  draftBase,
  identity,
  stage,
  source,
  fmt,
  money,
  type ScenarioIdentity,
} from "./shared";
export interface NwcScenario {
  story: string;
  revenue: number;
  cogs: number;
  sga: number;
  da: number;
  interest: number;
  tax: number;
  ar0: number;
  ar1: number;
  inv0: number;
  inv1: number;
  ap0: number;
  ap1: number;
  cash0: number;
  capex: number;
  borrowing: number;
  repayment: number;
  dividends: number;
}
/** Authored classroom arithmetic; deliberately independent of the application finance engine. */
export function makeNwcProblem(
  input: NwcScenario,
  meta: ScenarioIdentity,
): Problem {
  const ebit = input.revenue - input.cogs - input.sga - input.da;
  const nopat = ebit * (1 - input.tax),
    ni = (ebit - input.interest) * (1 - input.tax);
  const deltaNwc =
    input.ar1 - input.ar0 + input.inv1 - input.inv0 - (input.ap1 - input.ap0);
  const cfo = ni + input.da - deltaNwc,
    fcff = nopat + input.da - deltaNwc - input.capex;
  const cash1 =
    input.cash0 +
    cfo -
    input.capex +
    input.borrowing -
    input.repayment -
    input.dividends;
  const prompt = `${input.story} Все денежные суммы — млн ₽, период — один год. Продажи ${input.revenue}, себестоимость проданного ${input.cogs}, коммерческие и управленческие расходы ${input.sga}; обе расходные строки не включают амортизацию ${input.da}. Начисленные и оплаченные проценты ${input.interest}, налог на положительную прибыль ${fmt(input.tax * 100)}%. Дебиторская задолженность ${input.ar0} → ${input.ar1}, запасы ${input.inv0} → ${input.inv1}, операционная кредиторская задолженность ${input.ap0} → ${input.ap1}. Денег на начало ${input.cash0}; оплаченные капитальные вложения ${input.capex}, новый кредит ${input.borrowing}, погашение основной суммы долга ${input.repayment}, денежные дивиденды ${input.dividends}. Других операций, неденежных переоценок и корректировок нет. Проценты и налог относятся к операционному денежному потоку принятой учебной модели. Найдите операционный денежный поток, свободный поток для всех инвесторов и остаток денег на конец года. Объясните, почему рост или сокращение заёмного финансирования не меняет денежный результат операционных активов при прочих равных.`;
  return {
    ...draftBase,
    ...identity(meta),
    topicId: "T3-03",
    lessonId: "T3-03",
    title: "Прибыль есть: сколько денег действительно осталось?",
    type: "steps",
    difficulty: "L4",
    objective:
      "Самостоятельно построить P&L, оборотный капитал и три денежных маршрута, отделив финансирование.",
    prompt,
    independent: { prompt, stageIds: ["cfo", "fcff", "cash-end"] },
    inputs: [],
    assumptions: [
      "Период и денежный масштаб одинаковы у всех статей.",
      "Операционный NWC включает только AR, запасы и операционную AP.",
      "В положительной налоговой базе применим полный пропорциональный налог; проценты включены в NI и CFO.",
      "CapEx, кредит, погашение и дивиденды — денежные движения этого года.",
    ],
    stages: [
      stage(
        "ebit",
        "Операционная прибыль до процентов и налога",
        ebit,
        money,
        "Расходы периода и амортизация уменьшают операционный результат; кредит не является выручкой.",
        `${input.revenue}−${input.cogs}−${input.sga}−${input.da}=${fmt(ebit)}.`,
        "PNL_CLASSIFICATION",
      ),
      stage(
        "ni",
        "Чистая прибыль собственников",
        ni,
        money,
        "Сначала учтите начисленные проценты, затем налог на оставшийся результат.",
        `(${fmt(ebit)}−${input.interest})×(1−${input.tax})=${fmt(ni)}.`,
        "NI_TAX_BASE",
      ),
      stage(
        "delta-nwc",
        "Дополнительные средства в оборотном капитале",
        deltaNwc,
        money,
        "Сопоставьте конец с началом по каждому счёту. Чужая отсрочка и наша отсрочка имеют разные знаки.",
        `ΔAR=${input.ar1 - input.ar0}; ΔINV=${input.inv1 - input.inv0}; ΔAP=${input.ap1 - input.ap0}; прирост NWC=${fmt(deltaNwc)}.`,
        "NWC_SIGN",
      ),
      stage(
        "cfo",
        "Операционный денежный поток",
        cfo,
        money,
        "Прибыль уже содержит неденежную амортизацию и начисления, которые надо согласовать с расчётами.",
        `${fmt(ni)}+${input.da}−(${fmt(deltaNwc)})=${fmt(cfo)}.`,
        "CFO_BRIDGE",
      ),
      stage(
        "fcff",
        "Свободный денежный поток для всех инвесторов",
        fcff,
        money,
        "Отделите результат активов от процентов и банковского финансирования.",
        `NOPAT=${fmt(nopat)}; ${fmt(nopat)}+${input.da}−(${fmt(deltaNwc)})−${input.capex}=${fmt(fcff)}.`,
        "FINANCING_IN_FCFF",
      ),
      stage(
        "cash-end",
        "Денежные средства на конец года",
        cash1,
        money,
        "Здесь, в отличие от FCFF, нужны все реальные выплаты и финансовые поступления.",
        `${input.cash0}+${fmt(cfo)}−${input.capex}+${input.borrowing}−${input.repayment}−${input.dividends}=${fmt(cash1)}.`,
        "CASH_FINANCING_RECONCILIATION",
      ),
    ],
    formulaIds: ["income", "nopat", "delta-nwc", "cfo", "fcff"],
    sourceRefs: [
      source.lecture(69, 70, 71, 72, 86),
      source.seminar("3.1"),
      source.seminar("3.2"),
      source.original,
    ],
    commonErrors: [
      {
        code: "NWC_SIGN",
        message:
          "Рост AR и запасов связывает деньги; рост операционной AP временно финансирует этот рост. Сначала вычислите изменения, затем денежный эффект.",
      },
      {
        code: "FINANCING_IN_FCFF",
        message:
          "Новый кредит влияет на остаток cash через CFF. Прибавление его к FCFF дважды смешивает бизнес и источник его финансирования.",
      },
      {
        code: "CASH_FINANCING_RECONCILIATION",
        message:
          "FCFF не равен изменению cash. Для последнего нужны проценты в CFO, CapEx, погашение долга и дивиденды.",
      },
    ],
    solution: [
      `EBIT=${fmt(ebit)}, NOPAT=${fmt(nopat)}, NI=${fmt(ni)}.`,
      `Оборотный капитал изменился на ${fmt(deltaNwc)}; его денежный эффект ${fmt(-deltaNwc)}.`,
      `CFO=${fmt(cfo)}, FCFF=${fmt(fcff)}, cash на конец=${fmt(cash1)} млн ₽.`,
      `Независимая проверка: CFO+I(1−t)−CapEx=${fmt(cfo)}+${fmt(input.interest * (1 - input.tax))}−${input.capex}=${fmt(fcff)}. Изменение кредита на +1 изменит cash на +1 и оставит FCFF прежним.`,
    ],
    reasoning: {
      prompt:
        "Согласуйте прибыль, результат активов и остаток денег. Какие два объяснения дали бы неправильное решение?",
      rubric: [
        "Назвать хотя бы один конкретный счёт оборотного капитала и объяснить его денежный знак.",
        "Отделить проценты после налога при переходе от CFO к FCFF.",
        "Показать, почему кредит, погашение и дивиденды нужны для cash, но не создают FCFF.",
        "Проверить итог вторым маршрутом, а не повторить те же действия.",
        "Не считать положительный CFO доказательством устойчивой платёжеспособности без сроков будущих выплат.",
      ],
      sampleAnswer: `Прибыль ${fmt(ni)} отражает начисления; после возврата амортизации и изменения оборота остаётся CFO ${fmt(cfo)}. FCFF ${fmt(fcff)} исключает финансирование и учитывает инвестиции. Конечный cash ${fmt(cash1)} дополнительно зависит от кредита, его погашения и дивидендов. Ошибки: назвать FCFF остатком денег либо включить новый кредит в заработанный активами поток.`,
    },
  };
}
