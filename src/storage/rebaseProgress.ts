import { mergeProgress, type Progress } from "./progress";
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function changedMap<T>(
  base: Record<string, T>,
  current: Record<string, T>,
  committed: Record<string, T>,
) {
  const result = { ...committed };
  for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
    if (same(base[key], current[key])) continue;
    if (key in current) result[key] = current[key];
    else delete result[key];
  }
  return result;
}
/** Replay only edits made while an async operation was pending; untouched old drafts must not
 * replace a newly restored draft. Immutable answer/audit events are unioned by existing v1 rules. */
export function rebaseProgress(
  base: Progress,
  current: Progress,
  committed: Progress,
): Progress {
  const merged = mergeProgress(current, committed);
  return {
    ...merged,
    lessons: changedMap(base.lessons, current.lessons, committed.lessons),
    drafts: changedMap(base.drafts, current.drafts, committed.drafts),
    exam: same(base.exam, current.exam) ? committed.exam : current.exam,
    returnContext: same(base.returnContext, current.returnContext)
      ? committed.returnContext
      : current.returnContext,
    archives: merged.archives.slice(0, -1),
  };
}
