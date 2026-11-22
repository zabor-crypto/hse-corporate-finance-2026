import { useState } from "react";
import type { Progress } from "../storage/progress";
import { getActivePack } from "../runtime";
import { buildErrorLog, targetedRetest } from "../curriculum/errors";
import { Link } from "./Common";
import { getProblemLabel } from "../pedagogy/problem-labels";
const categories = {
  concept: "Понятие",
  sign: "Знак",
  unit: "Единица или масштаб",
  timing: "Дата или база",
  formula: "Связь показателей",
  interpretation: "Интерпретация",
};
export function ErrorLog({
  data,
  update,
}: {
  data: Progress;
  update: (fn: (p: Progress) => Progress) => void;
}) {
  const errors = buildErrorLog(data, getActivePack().registry);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, keyof typeof categories>>({});
  if (!errors.length)
    return (
      <section className="panel">
        <h2>Журнал ошибок</h2>
        <p>
          Проверенных ошибочных ответов пока нет. После попытки здесь появятся
          наблюдаемые расхождения и следующий шаг: фрагмент урока или подходящее задание.
        </p>
      </section>
    );
  return (
    <section className="panel">
      <h2>Журнал ошибок и повторная проверка</h2>
      <p>
        Сначала разберите расхождение, затем попробуйте другой подходящий случай. Ваша отметка причины не меняет исходный балл. Показаны последние {Math.min(20, errors.length)} из {errors.length} проверенных шагов.
      </p>
      {errors
        .slice(-20)
        .reverse()
        .map((e) => {
          const key = `${e.answerId}:${e.stageId}`,
            next = targetedRetest(e, data, getActivePack().registry),
            review = (data.errorReviews ?? [])
              .filter(
                (r) => r.answerId === e.answerId && r.stageId === e.stageId,
              )
              .sort(
                (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
              )[0];
          return (
            <article className="panel" key={key} data-problem-id={e.problemId} data-stage-id={e.stageId}>
              <h3>
                {getProblemLabel({ id: e.problemId, title: e.title })} · {e.stageLabel ?? "Выбор ответа"}
              </h3>
              <p>
                Что проверить: {categories[e.category]}.{" "}
                {e.remedy}
              </p>
              {e.provenance === "HISTORICAL_SNAPSHOT" && (
                <p>
                  Историческая версия. Её результат сохранён; сопоставимый новый
                  вариант пока не установлен.
                </p>
              )}
              {review && (
                <p>
                  Ваша последняя отметка: {categories[review.category]}.{" "}
                  {review.note}
                </p>
              )}
              <label>
                Моя причина ошибки{" "}
                <select
                  value={tags[key] ?? review?.category ?? e.category}
                  onChange={(ev) =>
                    setTags({
                      ...tags,
                      [key]: ev.target.value as keyof typeof categories,
                    })
                  }
                >
                  {Object.entries(categories).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Что проверить в следующий раз{" "}
                <textarea
                  value={notes[key] ?? ""}
                  onChange={(ev) =>
                    setNotes({ ...notes, [key]: ev.target.value })
                  }
                />
              </label>
              <button
                onClick={() =>
                  update((p) => ({
                    ...p,
                    errorReviews: [
                      ...(p.errorReviews ?? []),
                      {
                        answerId: e.answerId,
                        stageId: e.stageId,
                        category: tags[key] ?? review?.category ?? e.category,
                        note: notes[key] ?? "",
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  }))
                }
              >
                Сохранить мою отметку
              </button>
              {e.theoryRoute && <p><Link to={e.theoryRoute}>Разобрать соответствующий фрагмент урока</Link></p>}
              {next ? (
                <p><Link className="button outline" to={`practice/${next.id}`}>
                  Другой случай на тот же механизм
                </Link>{" "}{next.familyId === e.familyId
                  ? "Та же модель с другими данными; это повтор, а не доказательство переноса."
                  : "Подобран неоткрывавшийся случай с теми же навыками и без следующих по курсу предпосылок."}</p>
              ) : (
                <div className="notice">
                  <p>Подходящего нового задания на этот шаг сейчас нет. Сверьтесь с фрагментом урока: выпишите исходные величины, даты и единицы, затем повторите исходный расчёт.</p>
                  <Link to={`practice/${e.problemId}`}>Вернуться к прежнему заданию · повтор</Link>
                  <p>Прежняя попытка сохранена. Повтор знакомого случая не считается самостоятельным переносом.</p>
                </div>
              )}
            </article>
          );
        })}
    </section>
  );
}
