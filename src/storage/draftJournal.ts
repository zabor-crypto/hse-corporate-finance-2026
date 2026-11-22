import { validDraft, type Draft, type Progress } from "./progress";
export const JOURNAL_PREFIX = "cflos.pending.v2.";
export interface JournalEntry {
  id: string;
  key: string;
  draft: Draft;
}
export interface DraftJournal {
  schema: 1;
  writer: string;
  baseRevision: number;
  entries: JournalEntry[];
}
let writer =
  globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random()}`;
let revision = 0,
  sequence = 0;
let entries: JournalEntry[] = [];
let journalError = "";
const listeners = new Set<() => void>();
const publish = (message: string) => {
  journalError = message;
  listeners.forEach((f) => f());
};
export const getJournalError = () => journalError;
export const subscribeJournal = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
function persist() {
  const s = storage();
  if (!s) {
    publish(
      "Журнал черновика недоступен. Экспортируйте сессию перед закрытием.",
    );
    return false;
  }
  try {
    if (!entries.length) s.removeItem(JOURNAL_PREFIX + writer);
    else
      s.setItem(
        JOURNAL_PREFIX + writer,
        JSON.stringify({ schema: 1, writer, baseRevision: revision, entries }),
      );
    publish("");
    return true;
  } catch {
    publish(
      "Не удалось записать журнал черновика. Экспортируйте сессию перед закрытием.",
    );
    return false;
  }
}
/** A small synchronous raw-string journal, separate from immutable legacy v1 bytes. */
export function journalDraft(key: string, draft: Draft) {
  entries = entries.filter((e) => e.key !== key);
  entries.push({ id: `${writer}:${++sequence}`, key, draft });
  return persist();
}
export function setJournalRevision(next: number) {
  revision = next;
}
export function acknowledgeDrafts(data: Progress, next: number) {
  revision = next;
  entries = entries.filter((e) => !same(data.drafts[e.key], e.draft));
  persist();
}
export function validJournal(value: unknown): value is DraftJournal {
  if (!value || typeof value !== "object") return false;
  const j = value as DraftJournal;
  return (
    j.schema === 1 &&
    typeof j.writer === "string" &&
    Number.isSafeInteger(j.baseRevision) &&
    j.baseRevision >= 0 &&
    Array.isArray(j.entries) &&
    j.entries.every(
      (e) =>
        !!e &&
        typeof e.id === "string" &&
        typeof e.key === "string" &&
        validDraft(e.draft),
    )
  );
}
export function readJournals(s: Storage) {
  const result: { key: string; raw: string; journal: DraftJournal | null }[] =
    [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (!key?.startsWith(JOURNAL_PREFIX)) continue;
    const raw = s.getItem(key);
    if (raw === null) continue;
    let j: unknown;
    try {
      j = JSON.parse(raw);
    } catch {}
    result.push({ key, raw, journal: validJournal(j) ? j : null });
  }
  return result;
}
/** Remove only exact acknowledged preimages; a concurrently edited journal stays intact. */
export function clearRecoveredJournals(
  s: Storage,
  items: ReturnType<typeof readJournals>,
) {
  for (const item of items)
    if (s.getItem(item.key) === item.raw) s.removeItem(item.key);
}
