import type { Problem } from "../content/types";
import { unitFeedback } from "../engine/grading/units";

export function answerFeedback(problem: Problem, stageId: string, code: string | null) {
  if (stageId === "selection") return {
    message: code === "SELECTION" ? "Сначала выберите ответ." : "Выбранный вариант не соответствует условию.",
    firstStep: problem.commonErrors?.[0]?.message ?? "Сопоставьте каждый вариант с тем, что действительно меняется в описанной ситуации.",
  };
  const stage = problem.stages.find(s => s.id === stageId);
  return {
    message: unitFeedback[code ?? "VALUE"] ?? "Число не совпало с расчётом в указанной единице.",
    firstStep: code?.startsWith("UNIT") || code === "SCALE"
      ? "Сначала согласуйте единицу и масштаб с условием, затем повторите проверку."
      : stage?.hint ?? "Запишите исходные величины и даты отдельно, затем проверьте первый шаг расчёта.",
  };
}
