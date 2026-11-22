import type { AnswerRecord, Progress } from "./progress";
interface PooledAnswer {
  record: Omit<AnswerRecord, "problemSnapshot">;
  snapshotIndex: number;
  keys: string[];
}
export interface StoredProgress {
  format: "snapshot-pool-v1";
  meta: Omit<Progress, "answers">;
  answers: PooledAnswer[];
  snapshots: AnswerRecord["problemSnapshot"][];
  keys: string[];
}
/** Internal pooling only. Export always reconstructs every original full snapshot in order. */
export function encodeProgress(data: Progress): StoredProgress {
  const { answers, ...meta } = data;
  const snapshots: AnswerRecord["problemSnapshot"][] = [];
  const indices = new Map<string, number>();
  const pooled = answers.map((answer) => {
    const { problemSnapshot, ...record } = answer;
    const key = JSON.stringify(problemSnapshot);
    let i = indices.get(key);
    if (i === undefined) {
      i = snapshots.length;
      indices.set(key, i);
      snapshots.push(problemSnapshot);
    }
    return { record, snapshotIndex: i, keys: Object.keys(answer) };
  });
  return {
    format: "snapshot-pool-v1",
    meta,
    answers: pooled,
    snapshots,
    keys: Object.keys(data),
  };
}
export function decodeProgress(stored: StoredProgress): Progress {
  if (stored.format !== "snapshot-pool-v1")
    throw Error("Неизвестный внутренний формат прогресса");
  const answers = stored.answers.map(({ record, snapshotIndex, keys }) => {
    if (
      !Number.isInteger(snapshotIndex) ||
      snapshotIndex < 0 ||
      snapshotIndex >= stored.snapshots.length
    )
      throw Error("Повреждена ссылка на снимок задания");
    return Object.fromEntries(
      keys.map((key) => [
        key,
        key === "problemSnapshot"
          ? stored.snapshots[snapshotIndex]
          : (record as unknown as Record<string, unknown>)[key],
      ]),
    ) as unknown as AnswerRecord;
  });
  return Object.fromEntries(
    stored.keys.map((key) => [
      key,
      key === "answers"
        ? answers
        : (stored.meta as unknown as Record<string, unknown>)[key],
    ]),
  ) as unknown as Progress;
}
