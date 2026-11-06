import type { Problem } from "../types";
import {
  draftBase,
  identity,
  stage,
  source,
  fmt,
  money,
  pct,
  times,
  pp,
  type ScenarioIdentity,
} from "./shared";
export interface ReturnsScenario {
  story: string;
  assets0: number;
  assets1: number;
  equity0: number;
  equity1: number;
  turnover: number;
  margin: number;
  debtRate: number;
  tax: number;
  wacc: number;
}
export function makeReturnsProblem(
  x: ReturnsScenario,
  meta: ScenarioIdentity,
): Problem {
  const assets = (x.assets0 + x.assets1) / 2,
    equity = (x.equity0 + x.equity1) / 2,
    debt = assets - equity;
  const sales = assets * x.turnover,
    nopat = sales * x.margin,
    ebit = nopat / (1 - x.tax),
    interest = debt * x.debtRate,
    ni = nopat - interest * (1 - x.tax);
  const roc = nopat / assets,
    roe = ni / equity,
    ep = nopat - assets * x.wacc,
    difference = (roe - roc) * 100;
  const prompt = `${x.story} За год средние базы определяются простой средней начала и конца. Активы ${x.assets0} → ${x.assets1}, собственный капитал ${x.equity0} → ${x.equity1} млн ₽. Остальное финансирование — только процентный долг; прочих обязательств нет. Годовой оборот активов ${fmt(x.turnover)} раза, операционная прибыль после налога составляет ${fmt(x.margin * 100)}% продаж. Долг стоит ${fmt(x.debtRate * 100)}% годовых до налога; налог ${fmt(x.tax * 100)}%. Для исходной структуры средневзвешенная цена всего gross-капитала ${fmt(x.wacc * 100)}% в год. Других доходов, расходов и налоговых корректировок нет. Найдите доходность собственного капитала и экономическую прибыль исходной компании. Найдите разность ROE исходной компании минус ROE варианта с тем же бизнесом и теми же средними активами, полностью финансируемыми собственниками без процентного долга; ответ выразите в процентных пунктах. Цена капитала нового варианта не задана: его стоимость не оценивайте. Подтвердите восстановленную модель двумя независимыми разложениями.`;
  return {
    ...draftBase,
    ...identity(meta),
    topicId: "T3-08",
    lessonId: "T3-08",
    title: "Восстановите компанию из связанных показателей",
    type: "steps",
    difficulty: "L4",
    objective:
      "Выбрать согласованные базы, восстановить результат и сопоставить ROE, DuPont, цену капитала и контрфактический рычаг.",
    prompt,
    independent: { prompt, stageIds: ["roe", "ep", "roe-difference"] },
    inputs: [],
    assumptions: [
      "Все базы — простые средние за один год; активы равны gross D+E.",
      "Операционная маржа здесь относится к прибыли после операционного налога.",
      "Проценты начислены по средней базе долга; налоговый щит полностью используется.",
      "Сравнение без долга сохраняет операции, активы и налог; оно не предполагает неизменной рыночной цены капитала.",
    ],
    stages: [
      stage(
        "assets",
        "Средняя база активов",
        assets,
        money,
        "Поток за год сопоставляется с явно выбранной средней базой.",
        `(${x.assets0}+${x.assets1})/2=${fmt(assets)}.`,
        "DENOMINATOR_TIMING",
      ),
      stage(
        "sales",
        "Продажи за год",
        sales,
        money,
        "Оборот показывает продажи на единицу активов.",
        `${fmt(assets)}×${fmt(x.turnover)}=${fmt(sales)}.`,
        "TURNOVER_VS_RETURN",
      ),
      stage(
        "nopat",
        "Операционная прибыль после налога",
        nopat,
        money,
        "Название маржи определяет, какой результат остаётся от продаж.",
        `${fmt(sales)}×${x.margin}=${fmt(nopat)}.`,
        "NUMERATOR_FRAMING",
      ),
      stage(
        "ni",
        "Чистая прибыль",
        ni,
        money,
        "Восстановите долг и проценты; отделите посленалоговую стоимость финансирования.",
        `E=${fmt(equity)}, D=${fmt(debt)}, I=${fmt(interest)}; NI=${fmt(nopat)}−${fmt(interest)}×(1−${x.tax})=${fmt(ni)}.`,
        "UNIT_OR_TAX_SHIELD",
      ),
      stage(
        "roe",
        "Доходность собственного капитала",
        roe * 100,
        pct,
        "Собственникам принадлежит NI, а не весь операционный результат.",
        `${fmt(ni)}/${fmt(equity)}×100%=${fmt(roe * 100)}%.`,
        "NOPAT_VS_NI",
      ),
      stage(
        "ep",
        "Экономическая прибыль",
        ep,
        money,
        "Положительный бухгалтерский результат ещё не покрывает требуемую плату за капитал.",
        `${fmt(nopat)}−${fmt(assets)}×${x.wacc}=${fmt(ep)}.`,
        "ROE_VS_VALUE_CREATION",
      ),
      stage(
        "roe-difference",
        "ROE с долгом минус ROE без долга",
        difference,
        pp,
        "Здесь нужна разность доходностей в процентных пунктах, а не относительный темп изменения.",
        `Без долга ROE=${fmt(roc * 100)}%; разность=${fmt(roe * 100)}−${fmt(roc * 100)}=${fmt(difference)} п.п.`,
        "PERCENT_VS_PERCENT_POINT",
      ),
    ],
    formulaIds: [
      "ratio-basis",
      "asset-turnover",
      "operating-margin",
      "nopat",
      "roe",
      "dupont",
      "roe-leverage",
      "economic-profit",
    ],
    sourceRefs: [
      source.lecture(76, 78, 79, 81, 90),
      source.seminar("3.5"),
      source.seminar("3.6"),
      source.original,
    ],
    commonErrors: [
      {
        code: "DENOMINATOR_TIMING",
        message:
          "Активы и Equity должны использовать одну временную конвенцию. Случайное смешение начала и среднего ломает сравнение.",
      },
      {
        code: "NOPAT_VS_NI",
        message:
          "Операционная маржа даёт NOPAT. Для ROE нужна NI после стоимости долга с согласованным налоговым эффектом.",
      },
      {
        code: "PERCENT_VS_PERCENT_POINT",
        message:
          "Вопрос о разности двух ставок требует п.п.; деление одной ROE на другую ответит на иной вопрос.",
      },
      {
        code: "ROE_VS_VALUE_CREATION",
        message:
          "Для EVA-прокси сопоставьте NOPAT и WACC на одной gross-базе. WACC нельзя напрямую вычитать из ROE.",
      },
    ],
    solution: [
      `A=${fmt(assets)}, E=${fmt(equity)}, D=${fmt(debt)}, Sales=${fmt(sales)}, NOPAT=${fmt(nopat)}, EBIT=${fmt(ebit)}, I=${fmt(interest)}, NI=${fmt(ni)}.`,
      `ROE=${fmt(roe * 100)}%; экономическая прибыль=${fmt(ep)} млн ₽; разность с вариантом без долга=${fmt(difference)} п.п.`,
      `Проверка DuPont: (${fmt(ni)}/${fmt(sales)})×${fmt(x.turnover)}×(${fmt(assets)}/${fmt(equity)})=${fmt(roe)}.`,
      `Другая проверка: gross ROC=${fmt(roc * 100)}%; после налога долг стоит ${fmt(x.debtRate * (1 - x.tax) * 100)}%; ROC+(D/E)(ROC−k_d)=${fmt(roe * 100)}%.`,
      "Новый WACC и риск альтернативного финансирования неизвестны. Рост ROE сам по себе не ранжирует стоимость вариантов.",
    ],
    reasoning: {
      prompt:
        "Как могут сочетаться высокий ROE и слабый экономический результат? Проверьте, какая часть результата связана с операциями, а какая — с финансированием.",
      rubric: [
        "Восстановить одинаковую среднюю базу у всех разложений.",
        "Использовать NI-маржу в ROE DuPont и NOPAT-маржу в операционной доходности.",
        "Различить прирост ROE в п.п. и экономическую прибыль в денежных единицах.",
        "Проверить, покрывает ли операционный результат исходный WACC.",
        "Не переносить исходный WACC на контрфактическую структуру без дополнительных предпосылок.",
      ],
      sampleAnswer: `В исходной компании ROE=${fmt(roe * 100)}%, а операционная доходность gross-капитала=${fmt(roc * 100)}%. Разницу ${fmt(difference)} п.п. создаёт рычаг при указанных цене долга и налоге. Экономическая прибыль ${fmt(ep)} млн ₽ оценивает иной вопрос: покрыта ли требуемая цена всего исходного капитала. Ни одно из этих чисел не доказывает, что будущий риск или стоимость другого варианта останутся прежними.`,
    },
  };
}
