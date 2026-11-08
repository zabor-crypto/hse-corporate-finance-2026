import { useState } from "react";
import type { Progress } from "../storage/progress";
import { curriculumRegistry } from "../curriculum";
import { buildErrorLog, targetedRetest } from "../curriculum/errors";
import { Link } from "./Common";
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
  const errors = buildErrorLog(data, curriculumRegistry);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, keyof typeof categories>>({});
  if (!errors.length)
    return (
      <section className="panel">
        <h2>Журнал ошибок</h2>
        <p>
          Проверенных ошибочных ответов пока нет. После попытки здесь появятся
          наблюдаемые категории, ссылки на теорию и новый вариант для повторной
          проверки.
        </p>
      </section>
    );
  return (
    <section className="panel">
      <h2>Журнал ошибок и повторная проверка</h2>
      <p>
        Код проверки показывает расхождение ответа, а не установленную причину
        непонимания. Причину можно отметить самостоятельно; балл исходной
        попытки сохраняется. Показаны последние{Math.min(20, errors.length)} из
        {errors.length} стадий.
      </p>
      {errors
        .slice(-20)
        .reverse()
        .map((e) => {
          const key = `${e.answerId}:${e.stageId}`,
            next = targetedRetest(e, data, curriculumRegistry),
            review = (data.errorReviews ?? [])
              .filter(
                (r) => r.answerId === e.answerId && r.stageId === e.stageId,
              )
              .sort(
                (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
              )[0];
          return (
            <article className="panel" key={key}>
              <h3>
                {e.problemId}@{e.version} · {e.stageId}
              </h3>
              <p>
                Наблюдаемая категория: {categories[e.category]} ({e.code}).{" "}
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
              {next ? (
                <p>
                  <Link className="button outline" to={`practice/${next.id}`}>
                    Повторная проверка · другие данные
                  </Link>
                  {next.familyId === e.familyId
                    ? " Это вариант того же семейства: повтор модели не доказывает перенос."
                    : " Выбран ещё не открывавшийся вариант с пересекающимися понятиями."}
                </p>
              ) : (
                <p>
                  Подходящего неоткрывавшегося проверенного варианта пока нет.
                  История не сбрасывается.
                </p>
              )}
            </article>
          );
        })}
    </section>
  );
}
