import { lazy, Suspense } from "react";
import {
  topics,
  lessons,
  formulas,
  problems,
  seminarMap,
  sampleExamIds,
  ratiosExamIds,
  calibratedExamIds,
  transferFamilies,
} from "../content";
import {curriculumRegistry} from "../curriculum";
import {content,registry,teachingPaths} from "./t3-data";
import type { ModulePack } from "./types";
const NwcLab = lazy(() =>
  import("../components/StepByStep").then((m) => ({ default: m.NwcLab })),
);
const IntegratedModel = lazy(() =>
  import("../components/IntegratedModel").then((m) => ({
    default: m.IntegratedModel,
  })),
);
const CausalDiagram=lazy(()=>import("../components/CausalDiagram").then(m=>({default:m.CausalDiagram})));
const pack: ModulePack = {
  id: "T3",
  content,
  registry,
  config: {
    id: "T3",
    title: "Финансовая отчётность и анализ",
    primaryLessonId: "T3-01",
    defaultPracticeId: "T3-Q03",
    nextAction: { label: "Перейти к учебнику", route: "learn/T3-01" },
    blueprintIds: curriculumRegistry.blueprints.map((b) => b.id),
    currentTopic: { title: "Финансовая отчётность и анализ",summary:"Короткий основной маршрут; полный семинар, дополнительные случаи и прежние ссылки сохранены в справочнике." },
    teachingPaths,
    nearestAssessment: {
      title: "Учебные варианты контрольной",
      date: null,
      dateStatus: "UNKNOWN",
      note: "Авторские тренировочные варианты; проверка ответов отделена от оценки понимания.",
    },
    examPresets: [
      {
        id: "sample",
        title: "От отчётности к денежному потоку",
        buttonLabel:"Начать мини-контрольную",
        description: "Исходный учебный набор.",
        problemIds: sampleExamIds,
      },
      {
        id: "ratios",
        title: "Коэффициенты и их взаимосвязи",
        buttonLabel:"Начать контрольную по коэффициентам",
        description: "Исходный набор коэффициентов.",
        problemIds: ratiosExamIds,
      },
      {
        id: "calibrated",
        title: "Интегрированная проверка",
        buttonLabel:"Начать интегрированную контрольную",
        description: "Фиксированный учебный набор.",
        problemIds: calibratedExamIds,
      },
    ],
    freshPaper: {
      familyIds: transferFamilies.map((f) => f.id),
      fixedProblemIds: ["T3-Q29", "T3-Q15"],
    },
    lessonEnhancements: {
      "T3-01":{beforeSections:<Suspense fallback={<p>Загрузка схемы…</p>}><CausalDiagram kind="cash"/></Suspense>},
      "T3-06":{beforeSections:<Suspense fallback={<p>Загрузка схемы…</p>}><CausalDiagram kind="dupont"/></Suspense>},
      "T3-03": {
        beforeSections: (
          <Suspense fallback={<p>Загрузка модели…</p>}>
            <NwcLab />
          </Suspense>
        ),
      },
      "T3-11": {
        beforeSections: (
          <Suspense fallback={<p>Загрузка модели…</p>}>
            <IntegratedModel />
          </Suspense>
        ),
      },
    },
  },
};
export default pack;
