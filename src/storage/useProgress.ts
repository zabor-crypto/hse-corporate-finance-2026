import { useCallback, useEffect, useRef, useState } from "react";
import {
  blankProgress,
  loadProgress,
  mergeProgress,
  type Progress,
} from "./progress";
import {
  openProgressRepository,
  type ProgressRepository,
} from "./progressRepository";
import { rebaseProgress } from "./rebaseProgress";
import {
  acknowledgeDrafts,
  getJournalError,
  subscribeJournal,
} from "./draftJournal";
export function useProgress() {
  const initial = useRef<ReturnType<typeof loadProgress> | null>(null);
  if (!initial.current) {
    try {
      initial.current = loadProgress(localStorage);
    } catch {
      initial.current = {
        data: blankProgress(),
        notice: "Хранилище недоступно. Экспортируйте сессию перед закрытием.",
        blocked: true,
        raw: null,
      };
    }
  }
  const current = useRef(initial.current.data),
    repo = useRef<ProgressRepository | null>(null),
    opening = useRef<Promise<ProgressRepository> | null>(null),
    queue = useRef<Promise<void>>(Promise.resolve());
  const importing = useRef(false),
    mounted = useRef(false),
    pendingWrites = useRef(0);
  const [data, setData] = useState(current.current),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(initial.current.notice),
    [raw, setRaw] = useState(
      initial.current.blocked ? initial.current.raw : null,
    ),
    [recovery, setRecovery] = useState(false);
  const getCurrent = useCallback(() => current.current, []);
  const commit = useCallback(
    (next: Progress, messages?: { pending: string; success: string }) => {
      if (!repo.current) {
        setNotice(
          "Изменения остаются в памяти. Постоянное хранилище недоступно; экспортируйте сессию перед закрытием.",
        );
        return;
      }
      setNotice(messages?.pending ?? "Сохранение…");
      pendingWrites.current++;
      let failed = false;
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          await repo.current!.commit(next);
          acknowledgeDrafts(next, repo.current!.revision);
        })
        .catch((e) => {
          failed = true;
          if (mounted.current)
            setNotice(
              e instanceof Error
                ? e.message
                : "Сохранение не завершено. Экспортируйте текущую сессию.",
            );
          throw e;
        })
        .finally(() => {
          pendingWrites.current--;
          if (mounted.current && pendingWrites.current === 0 && !failed)
            setNotice(getJournalError() || messages?.success || "");
        });
      // Keep the rejection observable through whenSaved without an unhandled global rejection.
      void queue.current.catch(() => {});
    },
    [],
  );
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    const off = subscribeJournal(() => {
      if (alive && getJournalError()) setNotice(getJournalError());
    });
    opening.current ??= Promise.resolve().then(() =>
      openProgressRepository(localStorage, indexedDB),
    );
    opening.current
      .then(async (r) => {
        repo.current = r;
        if (!alive) return;
        if (r.legacyConflict) {
          setRaw(localStorage.getItem("cflos.progress.v1"));
          setNotice(
            "Старая копия изменилась после миграции. Обе копии сохранены. Экспортируйте текущую и явно импортируйте найденную копию для объединения.",
          );
        } else if (r.pending.items.length) {
          try {
            if (r.pending.conflict)
              throw Error(
                "Найден несохранённый черновик другой версии состояния. Для его применения выберите явное восстановление.",
              );
            await r.recoverPending();
          } catch (e) {
            setRecovery(true);
            setNotice(
              e instanceof Error
                ? e.message
                : "Не удалось восстановить журнал.",
            );
          }
        }
        if (alive) {
          current.current = r.data;
          acknowledgeDrafts(r.data, r.revision);
          setData(r.data);
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) {
          setNotice(
            e instanceof Error
              ? e.message
              : "IndexedDB недоступна. Экспортируйте сессию перед закрытием.",
          );
          setNotice(
            (previous) =>
              `${previous} Экспорт текущей сессии содержит только читаемые данные памяти; непрочитанная копия IndexedDB не изменена.`,
          );
          setReady(true);
        }
      });
    return () => {
      alive = false;
      mounted.current = false;
      off();
      queueMicrotask(() => {
        if (!mounted.current)
          void queue.current
            .catch(() => {})
            .finally(() => repo.current?.close());
      });
    };
  }, []);
  const update = useCallback(
    (fn: (p: Progress) => Progress) => {
      const next = fn(current.current);
      if (next === current.current) return;
      current.current = next;
      setData(next);
      if (!importing.current) commit(next);
    },
    [commit],
  );
  const importData = useCallback(
    async (incoming: unknown) => {
      if (importing.current) throw Error("Предыдущий импорт ещё сохраняется.");
      importing.current = true;
      const atStart = current.current;
      try {
        await queue.current.catch(() => {});
        let before = current.current;
        let next = mergeProgress(before, incoming); // Validate before creating any recovery store.
        if (!repo.current)
          repo.current = await openProgressRepository(
            localStorage,
            indexedDB,
            true,
          );
        if (raw)
          next = {
            ...next,
            archives: [
              ...next.archives,
              { kind: "preserved-storage-bytes", raw },
            ],
          };
        const archivedJournals = repo.current.pending.items.slice();
        if (archivedJournals.length)
          next = {
            ...next,
            archives: [
              ...next.archives,
              {
                kind: "preserved-draft-journals",
                journals: archivedJournals.map((x) => ({
                  key: x.key,
                  raw: x.raw,
                })),
              },
            ],
          };
        // Commit acknowledgement follows transaction completion. Edits made during import are merged,
        // never overwritten by the imported snapshot.
        while (true) {
          await repo.current.commit(next, true);
          if (current.current === before) break;
          next = rebaseProgress(before, current.current, next);
          before = current.current;
        }
        current.current = next;
        setData(next);
        acknowledgeDrafts(next, repo.current.revision);
        setRaw(null);
        const cleaned =
          repo.current.acknowledgeArchivedJournals(archivedJournals);
        setRecovery(repo.current.pending.items.length > 0);
        setNotice(
          !cleaned
            ? "Копия сохранена; очистить исходный журнал не удалось, его байты сохранены."
            : archivedJournals.length
              ? "Копия сохранена. Найденные несохранённые черновики сохранены в архиве экспорта."
              : "",
        );
        setReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Импорт не завершён.";
        if (current.current !== atStart)
          commit(current.current, {
            pending: `Импорт не завершён: ${message} Сохраняются текущие изменения…`,
            success: `Импорт не завершён: ${message} Текущие изменения сохранены отдельно.`,
          });
        else setNotice(message);
        throw error;
      } finally {
        importing.current = false;
      }
    },
    [raw, commit],
  );
  const recoverPending = useCallback(async () => {
    if (!repo.current) throw Error("Хранилище не готово");
    if (importing.current) throw Error("Предыдущая операция ещё сохраняется.");
    importing.current = true;
    const atStart = current.current;
    try {
      await queue.current.catch(() => {});
      let before = current.current;
      let restored = await repo.current.recoverPending(true);
      while (current.current !== before) {
        restored = rebaseProgress(before, current.current, restored);
        before = current.current;
        await repo.current.commit(restored);
      }
      current.current = restored;
      setData(restored);
      acknowledgeDrafts(restored, repo.current.revision);
      setRecovery(false);
      setNotice("Черновик восстановлен и сохранён.");
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Восстановление не завершено; исходные журналы сохранены.";
      if (current.current !== atStart)
        commit(current.current, {
          pending: `${message} Сохраняются текущие изменения…`,
          success: `${message} Текущие изменения сохранены отдельно.`,
        });
      else setNotice(message);
      throw e;
    } finally {
      importing.current = false;
    }
  }, [commit]);
  const whenSaved = useCallback(() => queue.current, []);
  return {
    data,
    update,
    notice,
    importData,
    raw,
    getCurrent,
    flush: getCurrent,
    ready,
    whenSaved,
    recovery,
    recoverPending,
  };
}
