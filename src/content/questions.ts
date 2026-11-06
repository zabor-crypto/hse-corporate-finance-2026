import { calibrateLegacyProblem } from "./assessment/legacy-calibration";
import {
  lecture,
  seminar,
  original,
  type Problem,
  type ProblemStage,
} from "./types";
const num = (
  id: string,
  label: string,
  expected: number,
  hint: string,
  solution: string,
  errorCode: string,
  weight = 1,
  unit = "млн ₽",
): ProblemStage => ({
  id,
  label,
  expected,
  unit,
  tolerance: 0.01,
  hint,
  solution,
  errorCode,
  weight,
});
const defaults = {
  version: "1.0.0",
  reviewStatus: "CONTENT_REVIEWED" as const,
  alternativeMethods: [
    "Любой алгебраически эквивалентный метод при тех же предпосылках.",
  ],
  commonErrors: [],
};

// First ten items only: expansion requires independent finance review of this bank.
const foundationProblems: Problem[] = [
  {
    ...defaults,
    id: "T3-Q01",
    topicId: "T3-01",
    title: "Остаток или поток?",
    type: "single",
    difficulty: "L1",
    objective: "Различить баланс на дату и отчёт за период.",
    prompt:
      "Какой из показателей является остатком на конкретную дату, а не потоком за год? Выберите один ответ.",
    inputs: [],
    assumptions: ["Используются стандартные определения трёх форм отчётности."],
    options: [
      { id: "a", label: "Выручка за год" },
      { id: "b", label: "Дебиторская задолженность на 31 декабря" },
      { id: "c", label: "Амортизация за год" },
      { id: "d", label: "Операционный денежный поток за год" },
    ],
    correctOptionIds: ["b"],
    stages: [],
    formulaIds: ["balance"],
    lessonId: "T3-01",
    solution: [
      "AR на 31 декабря показывает накопленное требование на дату и относится к балансу.",
      "Остальные показатели измеряют деятельность за период; их нельзя напрямую трактовать как конечные остатки.",
    ],
    commonErrors: [
      {
        code: "STOCK_FLOW",
        message: "Уточните, измерено ли число на дату или накоплено за период.",
      },
    ],
    sourceRefs: [lecture(65, 66, 69, 70), original],
    oracleId: "Q01_STOCK_FLOW",
  },
  {
    ...defaults,
    id: "T3-Q02",
    topicId: "T3-01",
    title: "Почему возвращаем амортизацию?",
    type: "single",
    difficulty: "L2",
    objective: "Объяснить корректировку NI при косвенном CFO.",
    prompt:
      "В простой модели CFO начинается с NI. Почему к NI прибавляется D&A? Выберите один ответ.",
    inputs: [],
    assumptions: [
      "D&A уже вычтена при расчёте NI.",
      "Другие неденежные корректировки отсутствуют.",
    ],
    options: [
      { id: "a", label: "D&A — новая денежная выручка компании" },
      { id: "b", label: "Это способ второй раз учесть налоговую экономию" },
      {
        id: "c",
        label:
          "D&A уменьшила прибыль, но сама не является новым денежным платежом текущего периода",
      },
      { id: "d", label: "Любые расходы всегда увеличивают денежный поток" },
    ],
    correctOptionIds: ["c"],
    stages: [],
    formulaIds: ["cfo"],
    lessonId: "T3-01",
    solution: [
      "Прибыль уменьшена на бухгалтерскую амортизацию, а нового платежа из-за этой записи не было. Поэтому возвращаем неденежный расход.",
      "Реальный денежный платёж за оборудование отражается отдельно как CapEx; добавление D&A не отменяет его.",
    ],
    commonErrors: [
      {
        code: "DA_CASH",
        message:
          "Отделите бухгалтерское распределение стоимости актива от его денежной покупки.",
      },
    ],
    sourceRefs: [lecture(69, 71, 72), original],
    oracleId: "Q02_NONCASH",
  },
  {
    ...defaults,
    id: "T3-Q03",
    topicId: "T3-01",
    title: "Где финансирование, а где операция?",
    type: "multi",
    difficulty: "L2",
    objective: "Классифицировать притоки и оттоки и исключить кредит из FCFF.",
    prompt:
      "Выберите все верные утверждения в принятой учебной классификации. Ответ оценивается как полный набор.",
    inputs: [],
    assumptions: [
      "Оборудование приобретается для длительного использования.",
      "Банковский кредит не является операционной выручкой.",
    ],
    options: [
      { id: "a", label: "Получение банковского кредита относится к CFF" },
      { id: "b", label: "Покупка оборудования относится к CFI" },
      { id: "c", label: "Новый кредит сам по себе увеличивает FCFF" },
      {
        id: "d",
        label:
          "Признанная выручка всегда равна поступлению денег в том же периоде",
      },
      {
        id: "e",
        label:
          "Продажи с отсрочкой могут увеличить AR без немедленного роста cash",
      },
    ],
    correctOptionIds: ["a", "b", "e"],
    stages: [],
    formulaIds: ["fcff", "balance"],
    lessonId: "T3-01",
    solution: [
      "Верны a, b, e. Кредит — финансовый приток, оборудование — инвестиционный отток, отгрузка с отсрочкой создаёт AR.",
      "FCFF описывает операционные активы до финансирования. Признание выручки и оплата могут происходить в разные даты.",
    ],
    commonErrors: [
      {
        code: "FINANCING_IN_FCFF",
        message:
          "Кредит меняет источник финансирования, но не является заработанным операционным потоком.",
      },
    ],
    sourceRefs: [lecture(66, 70, 72), original],
    oracleId: "Q03_FLOW_CLASSIFICATION",
  },
  {
    ...defaults,
    id: "T3-Q04",
    topicId: "T3-03",
    title: "Какие изменения высвобождают cash?",
    type: "multi",
    difficulty: "L2",
    objective: "Вывести знаки денежной корректировки NWC.",
    prompt:
      "При неизменных остальных условиях какие изменения увеличат CFO за период? Выберите все подходящие варианты.",
    inputs: [],
    assumptions: [
      "Изменения связаны с денежными операциями, не с переоценкой и списанием.",
      "AP — операционная кредиторка.",
    ],
    options: [
      {
        id: "a",
        label: "Покупатели погасили ранее признанную AR: дебиторка сократилась",
      },
      { id: "b", label: "Компания накопила больше запасов" },
      {
        id: "c",
        label: "AP увеличилась за счёт отсрочки платежей поставщикам",
      },
      { id: "d", label: "Компания погасила AP: кредиторка сократилась" },
      { id: "e", label: "Запасы сократились без неденежных списаний" },
    ],
    correctOptionIds: ["a", "c", "e"],
    stages: [],
    formulaIds: ["delta-nwc", "cfo"],
    lessonId: "T3-03",
    solution: [
      "Верны a, c, e. В CFO входят −ΔAR−ΔINV+ΔAP.",
      "Сокращение AR и INV означает отрицательные изменения, поэтому денежная корректировка положительна. Рост AP также даёт положительную корректировку.",
      "Улучшение CFO за период само по себе не доказывает долгосрочную пользу: чрезмерная отсрочка может вредить поставщикам.",
    ],
    commonErrors: [
      {
        code: "NWC_SIGN",
        message:
          "Сначала запишите изменение как конец минус начало, затем примените знак денежной корректировки.",
      },
    ],
    sourceRefs: [lecture(71, 86), original],
    oracleId: "Q04_CASH_SIGNS",
  },
  {
    ...defaults,
    id: "T3-Q05",
    topicId: "T3-01",
    title: "Первый шаг: EBITDA",
    type: "numeric",
    difficulty: "L3",
    objective: "Рассчитать EBITDA и не вычесть D&A дважды.",
    prompt:
      "Компания получила выручку 240. Себестоимость проданного без амортизации — 120, SG&A без амортизации — 50, D&A — 20 млн ₽. Найдите EBITDA.",
    inputs: [
      { label: "Выручка", value: 240, unit: "млн ₽" },
      { label: "COGS без D&A", value: 120, unit: "млн ₽" },
      { label: "SG&A без D&A", value: 50, unit: "млн ₽" },
      { label: "D&A", value: 20, unit: "млн ₽" },
    ],
    assumptions: [
      "Других операционных расходов нет.",
      "Обе расходные строки исключают D&A.",
    ],
    stages: [
      num(
        "ebitda",
        "EBITDA",
        70,
        "EBITDA рассчитывается до амортизации.",
        "240−120−50=70 млн ₽. D&A вычитается на следующем шаге для EBIT.",
        "DOUBLE_COUNT_DA",
      ),
    ],
    formulaIds: ["income"],
    lessonId: "T3-01",
    solution: [
      "EBITDA=Sales−COGS_cash−SG&A_cash=240−120−50=70 млн ₽.",
      "EBIT был бы 50; это другой показатель.",
    ],
    commonErrors: [
      {
        code: "DOUBLE_COUNT_DA",
        message: "Не вычитайте амортизацию при переходе к EBITDA.",
      },
    ],
    sourceRefs: [lecture(69), original],
    oracleId: "Q05_EBITDA_70",
  },
  {
    ...defaults,
    id: "T3-Q06",
    topicId: "T3-03",
    title: "Семинар 3.2: изменение FCFF",
    type: "numeric",
    difficulty: "L3",
    objective: "Найти влияние трёх изменений NWC на свободный поток.",
    prompt:
      "Запасы изменились с 10 до 7, AR — с 6 до 11, AP — с 8 до 7 млн ₽. На сколько изменится FCFF только из-за этих изменений? Введите изменение со знаком.",
    inputs: [
      { label: "INV: начало → конец", value: "10 → 7", unit: "млн ₽" },
      { label: "AR: начало → конец", value: "6 → 11", unit: "млн ₽" },
      { label: "AP: начало → конец", value: "8 → 7", unit: "млн ₽" },
    ],
    assumptions: [
      "Прочие составляющие FCFF неизменны.",
      "NWC операционный неденежный, только AR+INV−AP.",
      "Неденежных переоценок и списаний нет.",
    ],
    stages: [
      num(
        "delta-fcff",
        "Изменение FCFF",
        -3,
        "Сначала найдите ΔNWC, затем возьмите противоположный знак.",
        "NWC₀=6+10−8=8; NWC₁=11+7−7=11; ΔNWC=+3; влияние на FCFF=−3 млн ₽.",
        "NWC_SIGN",
      ),
    ],
    formulaIds: ["operating-nwc", "delta-nwc", "nwc-impact"],
    lessonId: "T3-03",
    solution: [
      "Через компоненты: ΔAR=+5, ΔINV=−3, ΔAP=−1.",
      "ΔNWC=5−3−(−1)=3; ΔFCFF|NWC=−3 млн ₽.",
      "Это ухудшение потока на 3, а не абсолютное значение FCFF компании.",
    ],
    commonErrors: [
      { code: "NWC_SIGN", message: "Прирост NWC входит в FCFF с минусом." },
      {
        code: "LEVEL_VS_CHANGE",
        message: "Известен только эффект NWC, не полный уровень FCFF.",
      },
    ],
    sourceRefs: [seminar("3.2"), lecture(71, 72, 86)],
    oracleId: "SEM3.2_NWC_IMPACT",
  },
  {
    ...defaults,
    id: "T3-Q07",
    topicId: "T3-03",
    title: "Семинар 3.1: соберите FCFF",
    type: "steps",
    difficulty: "L4",
    objective:
      "Пройти от операционных статей к NOPAT, инвестиции в NWC и FCFF.",
    prompt:
      "Revenue=350, COGS без D&A=120, SG&A без D&A=80, D&A=20 млн ₽; налог 20%. Operating NWC в начале 50, в конце — 20% выручки. Оплаченный CapEx=70. Компания привлекла кредит 50 млн ₽. Рассчитайте три этапа. Новый кредит классифицируйте как финансирование и исключите из FCFF.",
    inputs: [
      {
        label: "Revenue / COGS / SG&A cash",
        value: "350 / 120 / 80",
        unit: "млн ₽",
      },
      { label: "D&A", value: 20, unit: "млн ₽" },
      { label: "Налог", value: 20, unit: "%" },
      { label: "Operating NWC₀", value: 50, unit: "млн ₽" },
      { label: "Operating NWC₁ / Revenue", value: 20, unit: "%" },
      { label: "Оплаченный CapEx", value: 70, unit: "млн ₽" },
      { label: "Новый кредит (CFF)", value: 50, unit: "млн ₽" },
    ],
    assumptions: [
      "NWC трактуется как операционный неденежный.",
      "COGS и SG&A исключают D&A.",
      "CapEx оплачен за текущий период.",
      "Других корректировок FCFF нет.",
      "Начисление процентов нового кредита не требуется для FCFF; NI и ROC без дополнительных предпосылок здесь не оцениваются.",
    ],
    stages: [
      num(
        "nopat",
        "1. NOPAT",
        104,
        "Сначала EBITDA, затем EBIT, затем условный операционный налог.",
        "EBITDA=350−120−80=150; EBIT=150−20=130; NOPAT=130×0,8=104.",
        "NOPAT_VS_NI",
      ),
      num(
        "delta-nwc",
        "2. Прирост Operating NWC",
        20,
        "Конечный NWC — 20% выручки, а не его прирост.",
        "NWC₁=350×0,2=70; ΔNWC=70−50=20.",
        "LEVEL_VS_CHANGE",
      ),
      num(
        "fcff",
        "3. FCFF",
        34,
        "FCFF начинается с NOPAT и не включает кредит.",
        "104+20−20−70=34 млн ₽. Кредит 50 относится к CFF.",
        "FINANCING_IN_FCFF",
      ),
    ],
    formulaIds: ["income", "nopat", "delta-nwc", "fcff"],
    lessonId: "T3-03",
    solution: [
      "Выделяем финансирование: кредит 50 не включаем в FCFF.",
      "NOPAT=104; прирост операционной инвестиции 20; FCFF=34 млн ₽.",
      "Интерпретация: операционный результат после налога и возврата D&A равен 124. Из него 20 связано в дополнительном NWC и 70 потрачено на основные средства. Остаток для всех инвесторов — 34.",
      "Проверка смысла: увеличение кредита при тех же операциях не должно менять FCFF; CapEx или ΔNWC +1 уменьшили бы его на 1.",
    ],
    commonErrors: [
      {
        code: "NOPAT_VS_NI",
        message: "Для FCFF нужен NOPAT, а не NI после процентов.",
      },
      {
        code: "FINANCING_IN_FCFF",
        message:
          "Привлечение кредита финансирует инвестиции, но не создаёт дополнительный FCFF.",
      },
    ],
    sourceRefs: [seminar("3.1"), lecture(69, 72)],
    oracleId: "SEM3.1_CORE",
    alternativeMethods: [
      "Через EBITDA: EBITDA(1−t)+t·DA−ΔNWC−CapEx=150×0,8+0,2×20−20−70=34.",
      "Через NOPAT: 104+20−20−70=34.",
    ],
  },
  {
    ...defaults,
    id: "T3-Q08",
    topicId: "T3-01",
    title: "Один бизнес, два показателя прибыли",
    type: "steps",
    difficulty: "L3",
    objective: "Самостоятельно восстановить P&L и различить NI и NOPAT.",
    prompt:
      "Revenue=300, COGS без D&A=140, SG&A без D&A=60, D&A=25, начисленные проценты=15 млн ₽, налог 20%. Найдите EBIT, NI и NOPAT.",
    inputs: [
      {
        label: "Revenue / COGS / SG&A cash",
        value: "300 / 140 / 60",
        unit: "млн ₽",
      },
      { label: "D&A", value: 25, unit: "млн ₽" },
      { label: "Начисленные проценты", value: 15, unit: "млн ₽" },
      { label: "Налог", value: 20, unit: "%" },
    ],
    assumptions: [
      "Расходы исключают D&A.",
      "Начисленные проценты относятся к текущему периоду.",
      "Прочих доходов, расходов и налоговых корректировок нет.",
    ],
    stages: [
      num(
        "ebit",
        "EBIT",
        75,
        "Сначала вычтите из выручки денежные операционные затраты.",
        "EBITDA=300−140−60=100; EBIT=100−25=75.",
        "DOUBLE_COUNT_DA",
      ),
      num(
        "ni",
        "NI",
        48,
        "Проценты уменьшают EBT до расчёта налога.",
        "NI=(75−15)×0,8=48.",
        "TAX_BASE",
      ),
      num(
        "nopat",
        "NOPAT",
        60,
        "Для NOPAT проценты не вычитаются.",
        "NOPAT=75×0,8=60.",
        "NOPAT_VS_NI",
      ),
    ],
    formulaIds: ["income", "nopat"],
    lessonId: "T3-01",
    solution: [
      "EBITDA=100, EBIT=75, EBT=60, налог=12, NI=48; NOPAT=60 млн ₽.",
      "Проверка: NOPAT−NI=12=15×0,8 — посленалоговые проценты.",
    ],
    commonErrors: [
      {
        code: "NOPAT_VS_NI",
        message: "Сравните, на каком шаге из результата вычитаются проценты.",
      },
    ],
    sourceRefs: [lecture(69, 78), original],
    oracleId: "Q08_INCOME_75_48_60",
  },
  {
    ...defaults,
    id: "T3-Q09",
    topicId: "T3-03",
    title: "Найдите именно операционный NWC",
    type: "numeric",
    difficulty: "L3",
    objective:
      "Выбрать нужный состав капитала среди смешанных балансовых данных.",
    prompt:
      "На одну дату cash=10, AR=20, INV=30, AP=15, краткосрочный банковский долг=25 млн ₽. Других оборотных статей нет. Найдите операционный неденежный NWC.",
    inputs: [
      { label: "Cash", value: 10, unit: "млн ₽" },
      { label: "AR", value: 20, unit: "млн ₽" },
      { label: "INV", value: 30, unit: "млн ₽" },
      { label: "AP", value: 15, unit: "млн ₽" },
      { label: "Краткосрочный банковский долг", value: 25, unit: "млн ₽" },
    ],
    assumptions: [
      "AP — операционная кредиторка.",
      "Других операционных оборотных активов и обязательств нет.",
    ],
    stages: [
      num(
        "operating-nwc",
        "Operating NWC",
        35,
        "Cash и банковский долг исключены из операционного неденежного NWC.",
        "AR+INV−AP=20+30−15=35 млн ₽.",
        "NWC_DEFINITION",
      ),
    ],
    formulaIds: ["operating-nwc", "accounting-nwc"],
    lessonId: "T3-03",
    solution: [
      "Операционный NWC=20+30−15=35 млн ₽.",
      "Бухгалтерский CA−CL здесь равен (10+20+30)−(15+25)=20; это корректный ответ на другой вопрос.",
    ],
    commonErrors: [
      {
        code: "NWC_DEFINITION",
        message: "Различите CA−CL и операционный AR+INV−AP.",
      },
    ],
    sourceRefs: [lecture(66), original],
    oracleId: "Q09_OP_NWC_35",
  },
  {
    ...defaults,
    id: "T3-Q10",
    topicId: "T3-03",
    title: "Перенос навыка: CFO → FCFF",
    type: "steps",
    difficulty: "L4",
    objective:
      "Классифицировать поток, найти NWC, рассчитать CFO и FCFF, дать экономическую интерпретацию.",
    prompt:
      "NI=80, D&A=10, ΔAR=25, ΔINV=5, ΔAP=15, начисленные и оплаченные проценты=10, CapEx=30 млн ₽; налог 20%. Кроме того, получен банковский кредит 12 млн ₽. Выделите финансовый приток, затем рассчитайте ΔOperating NWC, CFO и FCFF. После проверки объясните, почему CFO и FCFF различаются.",
    inputs: [
      { label: "NI / D&A", value: "80 / 10", unit: "млн ₽" },
      { label: "ΔAR / ΔINV / ΔAP", value: "25 / 5 / 15", unit: "млн ₽" },
      { label: "Проценты", value: 10, unit: "млн ₽" },
      { label: "CapEx", value: 30, unit: "млн ₽" },
      { label: "Новый банковский кредит", value: 12, unit: "млн ₽" },
      { label: "Налог", value: 20, unit: "%" },
    ],
    assumptions: [
      "Других корректировок CFO и FCFF нет.",
      "Проценты учтены в NI и CFO по модели слайда 71.",
      "NOPAT=NI+I(1−t).",
      "CapEx оплачен в периоде.",
      "Изменения NWC денежные; кредит не входит в AP.",
    ],
    stages: [
      num(
        "financing",
        "1. Сумма, относящаяся к CFF",
        12,
        "Получение банковского кредита — финансирование.",
        "Новый кредит 12 млн ₽ — CFF, его не прибавляем к CFO или FCFF.",
        "FINANCING_IN_FCFF",
      ),
      num(
        "delta-nwc",
        "2. Прирост Operating NWC",
        15,
        "AP входит в прирост NWC с минусом.",
        "25+5−15=15 млн ₽.",
        "NWC_SIGN",
      ),
      num(
        "cfo",
        "3. CFO",
        75,
        "Начните с NI, верните D&A и вычтите прирост NWC.",
        "80+10−15=75 млн ₽.",
        "CFO_BRIDGE",
      ),
      num(
        "fcff",
        "4. FCFF",
        53,
        "Из CFO устраните посленалоговые проценты и вычтите CapEx.",
        "75+10×0,8−30=53 млн ₽.",
        "FCFF_BRIDGE",
      ),
    ],
    formulaIds: ["delta-nwc", "cfo", "nopat", "fcff"],
    lessonId: "T3-03",
    solution: [
      "Финансирование 12 отдельно; прирост NWC 15; CFO 75; FCFF 53 млн ₽.",
      "Второй расчёт FCFF: NOPAT=80+10×0,8=88; 88+10−15−30=53.",
      "Ориентир для самостоятельной интерпретации: назвать причину −15 от NWC; объяснить добавление 8 после налогового эффекта процентов; объяснить вычитание 30 CapEx; указать, что кредит 12 не заработан операциями.",
      "Свободное объяснение сравните с ориентиром самостоятельно: числовой автотест не оценивает смысл текста.",
    ],
    commonErrors: [
      {
        code: "FINANCING_IN_FCFF",
        message:
          "Не смешивайте получение банковского кредита с денежным результатом активов.",
      },
      {
        code: "FCFF_BRIDGE",
        message:
          "Для перехода от CFO к FCFF нужны проценты после налога и CapEx при принятых предпосылках.",
      },
    ],
    sourceRefs: [lecture(70, 71, 72, 86), original],
    oracleId: "Q10_TRANSFER_12_15_75_53",
    alternativeMethods: [
      "FCFF через NOPAT=88: 88+10−15−30=53.",
      "FCFF через CFO=75: 75+8−30=53.",
    ],
  },
];

export const sampleExamIds = [
  "T3-Q01",
  "T3-Q02",
  "T3-Q03",
  "T3-Q04",
  "T3-Q05",
  "T3-Q06",
  "T3-Q07",
];

export const problems: Problem[] = foundationProblems.map(
  calibrateLegacyProblem,
);
