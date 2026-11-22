import {
  blankProgress,
  loadProgress,
  STORAGE_KEY,
  validProgress,
  type Progress,
} from "./progress";
import {
  encodeProgress,
  decodeProgress,
  type StoredProgress,
} from "./progressCodec";
import {
  readJournals,
  clearRecoveredJournals,
  setJournalRevision,
  type DraftJournal,
} from "./draftJournal";
export const PROGRESS_DB = "cflos.progress.v2";
interface Envelope {
  revision: number;
  legacyRaw: string | null;
  data: StoredProgress;
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? Error("Ошибка IndexedDB"));
  });
const complete = (tx: IDBTransaction) => {
  const p = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? Error("Транзакция отменена"));
    tx.onerror = () => reject(tx.error ?? Error("Ошибка транзакции"));
  });
  void p.catch(() => {});
  return p;
};
function open(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = factory.open(PROGRESS_DB, 1);
    let blocked = false;
    r.onupgradeneeded = () => {
      r.result.createObjectStore("state");
      r.result.createObjectStore("legacy-backups", { autoIncrement: true });
    };
    r.onblocked = () => {
      blocked = true;
      reject(
        Error(
          "Обновление хранилища заблокировано другой вкладкой. Закройте её и повторите.",
        ),
      );
    };
    r.onerror = () => reject(r.error ?? Error("IndexedDB недоступна"));
    r.onsuccess = () => {
      if (blocked) {
        r.result.close();
        return;
      }
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
  });
}
export interface PendingRecovery {
  items: ReturnType<typeof readJournals>;
  conflict: boolean;
}
export class ProgressRepository {
  revision: number;
  data: Progress;
  legacyRaw: string | null;
  legacyConflict: boolean;
  pending: PendingRecovery;
  constructor(
    private db: IDBDatabase,
    private storage: Storage,
    env: Envelope,
    items: ReturnType<typeof readJournals>,
  ) {
    this.revision = env.revision;
    this.data = decodeProgress(env.data);
    this.legacyRaw = env.legacyRaw;
    this.legacyConflict = storage.getItem(STORAGE_KEY) !== env.legacyRaw;
    this.pending = {
      items,
      conflict: items.some(
        (x) =>
          !x.journal ||
          (x.journal.baseRevision !== env.revision &&
            x.journal.entries.some(
              (e) =>
                JSON.stringify(this.data.drafts[e.key]) !==
                JSON.stringify(e.draft),
            )),
      ),
    };
    setJournalRevision(this.revision);
  }
  async commit(next: Progress, allowLegacyChange = false) {
    if (!validProgress(next))
      throw Error("Сохранение отменено: недопустимая схема прогресса v1.");
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw !== this.legacyRaw && !allowLegacyChange)
      throw Error(
        "Обнаружено изменение старой копии другой вкладкой. Экспортируйте текущую сессию и явно импортируйте найденную копию.",
      );
    const data = encodeProgress(next),
      tx = this.db.transaction(["state", "legacy-backups"], "readwrite");
    const done = complete(tx);
    const current = (await request(tx.objectStore("state").get("current"))) as
      Envelope | undefined;
    if ((current?.revision ?? 0) !== this.revision) {
      tx.abort();
      await done.catch(() => {});
      throw Error(
        "Прогресс изменён другой вкладкой. Текущая сессия остаётся в памяти; экспортируйте её и перезагрузите страницу для объединения.",
      );
    }
    const env: Envelope = { revision: this.revision + 1, legacyRaw: raw, data };
    try {
      if (raw !== this.legacyRaw)
        tx.objectStore("legacy-backups").add({
          raw,
          timestamp: new Date().toISOString(),
          kind: "legacy-conflict-preserved",
        });
      tx.objectStore("state").put(env, "current");
    } catch (e) {
      tx.abort();
      await done.catch(() => {});
      throw e;
    }
    await done;
    this.revision = env.revision;
    setJournalRevision(this.revision);
    this.legacyRaw = raw;
    this.legacyConflict = false;
    this.data = next;
    return next;
  }
  async recoverPending(explicit = false) {
    const items = this.pending.items;
    if (!items.length) return this.data;
    if (items.some((x) => !x.journal))
      throw Error(
        "Повреждён журнал черновика. Его исходные байты сохранены; экспортируйте их перед восстановлением.",
      );
    if (this.pending.conflict && !explicit)
      throw Error(
        "Найден черновик другой версии состояния. Требуется явное восстановление.",
      );
    const drafts = { ...this.data.drafts };
    const seen = new Map<string, string>();
    for (const item of items)
      for (const e of item.journal!.entries) {
        const encoded = JSON.stringify(e.draft);
        if (seen.has(e.key) && seen.get(e.key) !== encoded)
          throw Error(
            "Два журнала содержат разные черновики одного задания. Исходные журналы сохранены; автоматическое объединение отменено.",
          );
        seen.set(e.key, encoded);
        drafts[e.key] = e.draft;
      }
    if (
      items.every((item) =>
        item.journal!.entries.every(
          (e) =>
            JSON.stringify(this.data.drafts[e.key]) === JSON.stringify(e.draft),
        ),
      )
    ) {
      clearRecoveredJournals(this.storage, items);
      this.pending = { items: [], conflict: false };
      return this.data;
    }
    const previousDrafts = Object.fromEntries(
      [...seen.keys()].map((key) => [key, this.data.drafts[key] ?? null]),
    );
    const next = {
      ...this.data,
      drafts,
      archives: [
        ...this.data.archives,
        {
          kind: "draft-journal-recovery",
          previousDrafts,
          timestamp: new Date().toISOString(),
          journals: items.map((x) => ({ key: x.key, raw: x.raw })),
        },
      ],
    };
    await this.commit(next);
    clearRecoveredJournals(this.storage, items);
    this.pending = { items: [], conflict: false };
    return next;
  }
  acknowledgeArchivedJournals(items: ReturnType<typeof readJournals>) {
    try {
      clearRecoveredJournals(this.storage, items);
      const remaining = readJournals(this.storage);
      this.pending = { items: remaining, conflict: remaining.length > 0 };
      return true;
    } catch {
      this.pending = { items, conflict: true };
      return false;
    }
  }
  close() {
    this.db.close();
  }
}
export async function openProgressRepository(
  storage: Storage,
  factory: IDBFactory,
  allowInvalidLegacy = false,
): Promise<ProgressRepository> {
  const db = await open(factory);
  try {
    let tx = db.transaction("state", "readonly");
    let done = complete(tx);
    let env = (await request(tx.objectStore("state").get("current"))) as
      Envelope | undefined;
    await done;
    if (!env) {
      const loaded = loadProgress(storage);
      if (loaded.blocked && !allowInvalidLegacy)
        throw Error(
          "Старая копия не читается. Она не изменена; экспортируйте исходные байты или импортируйте проверенную копию.",
        );
      const raw = storage.getItem(STORAGE_KEY);
      env = { revision: 0, legacyRaw: raw, data: encodeProgress(loaded.data) };
      tx = db.transaction(["state", "legacy-backups"], "readwrite");
      done = complete(tx);
      const existing = (await request(
        tx.objectStore("state").get("current"),
      )) as Envelope | undefined;
      if (existing) env = existing;
      else {
        if (raw !== null)
          tx.objectStore("legacy-backups").add({
            raw,
            timestamp: new Date().toISOString(),
            kind: "migration-v1-byte-backup",
          });
        tx.objectStore("state").put(env, "current");
      }
      await done;
    }
    const data = decodeProgress(env.data);
    if (!validProgress(data))
      throw Error(
        "Основная копия IndexedDB повреждена. Исходные данные не изменены.",
      );
    return new ProgressRepository(db, storage, env, readJournals(storage));
  } catch (e) {
    db.close();
    throw e;
  }
}
