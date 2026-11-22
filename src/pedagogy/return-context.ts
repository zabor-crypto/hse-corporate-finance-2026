import type { Progress } from "../storage/progress";

/** Optional UI metadata only; old schema1 context is readable but cannot revive a stale return button. */
export function isSupportContext(context: Progress["returnContext"], route: string) {
  if (!context || typeof context.targetRoute !== "string") return false;
  if (!/^(practice\/[^/]+|exam(?:\/[^/]+)?)$/.test(context.route)) return false;
  if (!/^(learn|formulas)\//.test(context.targetRoute)) return false;
  const base = (value: string) => value.split("/").slice(0, 2).join("/");
  return base(route) === base(context.targetRoute);
}

export function isSupportTransition(context: Progress["returnContext"], from: string, to: string) {
  return isSupportContext(context, to) && (from === context?.route || isSupportContext(context, from));
}
