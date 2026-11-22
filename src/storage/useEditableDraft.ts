import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Draft } from "./progress";
import { journalDraft } from "./draftJournal";
export type DraftFlushReason =
  | "debounce"
  | "blur"
  | "grade"
  | "question-change"
  | "navigation"
  | "visibility"
  | "pagehide"
  | "unmount"
  | "export";
const flushers = new Set<(reason: DraftFlushReason) => Draft>();
export function flushPendingDrafts(reason: DraftFlushReason) {
  for (const fn of [...flushers]) fn(reason);
}
const empty = (): Draft => ({ values: {}, selected: [] });
/** Raw editable state is local. Dirty changes cross into Progress only at an explicit flush. */
export function useEditableDraft({
  key,
  saved,
  commit,
  delayMs = 300,
}: {
  key: string;
  saved: Draft | undefined;
  commit: (key: string, draft: Draft) => void;
  delayMs?: number;
}) {
  const state = useRef({ key, latest: saved ?? empty(), dirty: false, commit });
  state.current.commit = commit;
  const [view, setView] = useState(() => ({
    key,
    draft: state.current.latest,
    pending: false,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const flush = useCallback((_reason: DraftFlushReason) => {
    cancel();
    const s = state.current;
    if (s.dirty) {
      s.dirty = false;
      s.commit(s.key, s.latest);
      setView({ key: s.key, draft: s.latest, pending: false });
    }
    return s.latest;
  }, []);
  // No draft from the previous question is exposed during the first render of a new key.
  const switching = state.current.key !== key;
  const rendered = switching ? (saved ?? empty()) : view.draft;
  useLayoutEffect(() => {
    if (state.current.key !== key) {
      flush("question-change");
      state.current = { key, latest: saved ?? empty(), dirty: false, commit };
      setView({ key, draft: state.current.latest, pending: false });
    } else if (
      state.current.dirty &&
      saved?.assistanceUsed &&
      !state.current.latest.assistanceUsed
    ) {
      state.current.latest = { ...state.current.latest, assistanceUsed: true };
      journalDraft(key, state.current.latest);
      setView({ key, draft: state.current.latest, pending: true });
    } else if (
      !state.current.dirty &&
      saved &&
      saved !== state.current.latest
    ) {
      state.current.latest = saved;
      setView({ key, draft: saved, pending: false });
    }
  }, [key, saved, commit, flush]);
  const change = useCallback(
    (next: Draft) => {
      const s = state.current;
      journalDraft(s.key, next);
      s.latest = next;
      s.dirty = true;
      setView({ key: s.key, draft: next, pending: true });
      cancel();
      timer.current = setTimeout(() => flush("debounce"), delayMs);
    },
    [delayMs, flush],
  );
  useEffect(() => {
    flushers.add(flush);
    const visibility = () => {
      if (document.visibilityState === "hidden") flush("visibility");
    };
    const hide = () => flush("pagehide");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    return () => {
      flushers.delete(flush);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      flush("unmount");
    };
  }, [flush]);
  return {
    draft: rendered,
    change,
    flush,
    pending: !switching && view.pending,
  };
}
