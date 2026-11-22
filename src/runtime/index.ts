/// <reference types="vite/client" />
import { useSyncExternalStore } from "react";
import {
  getPack,
  registerPack,
  getActiveSnapshot,
  subscribeRuntime,
} from "./store";
import type { ModulePack, ModuleManifest } from "./types";
export * from "./types";
export { getActivePack, getLoadedPacks, activateModule } from "./store";
export const moduleManifest: ModuleManifest[] = [
  {
    id: "T3",
    title: "Финансовая отчётность и анализ",
    primaryLessonId: "T3-01",
    problemPrefix: "T3-",
    formulaPrefix: "",
  },
  {
    id: "T4",
    title: "Инвестиционные решения",
    primaryLessonId: "T4-01",
    problemPrefix: "T4-",
    formulaPrefix: "T4-F-",
  },
];
const loaders = import.meta.glob<{ default: ModulePack }>("./*-pack.{ts,tsx}");
const pending = new Map<string, Promise<ModulePack>>();
export function useActivePack() {
  return useSyncExternalStore(
    subscribeRuntime,
    getActiveSnapshot,
    getActiveSnapshot,
  );
}
export function ensureModule(id: string): Promise<ModulePack> {
  const key = Object.keys(loaders).find(
    (k) =>
      k === `./${id.toLowerCase()}-pack.ts` ||
      k === `./${id.toLowerCase()}-pack.tsx`,
  );
  if (!key) return Promise.reject(new Error(`Модуль ${id} недоступен`));
  if (pending.has(id)) return pending.get(id)!;
  // A legacy registration may omit rich presentation configuration; load the real pack once.
  const task = loaders[key]()
    .then((m) => {
      if (m.default.id !== id) throw Error("Неверный учебный модуль");
      return registerPack(m.default);
    })
    .catch((e) => {
      pending.delete(id);
      throw e;
    });
  pending.set(id, task);
  return task;
}
export function moduleIdFromRoute(
  page: string,
  id?: string,
  currentId?: string,
) {
  if (id && moduleManifest.some((m) => m.id === id)) return id;
  if (id?.startsWith("C3-") || id?.startsWith("V-")) return "T3"; // stable legacy aliases
  if (id) {
    const matches = moduleManifest
      .flatMap((m) =>
        [m.problemPrefix, m.formulaPrefix, `${m.id}-`]
          .filter((prefix) => prefix.length > 0 && id.startsWith(prefix))
          .map((prefix) => ({ id: m.id, length: prefix.length })),
      )
      .sort((a, b) => b.length - a.length);
    if (matches[0]) return matches[0].id;
  }
  if (page === "exam" || page === "practice") return "T3";
  if (page === "formulas" && id) return "T3";
  if (page === "ratios") return "T3";
  return (
    currentId ??
    (Object.keys(loaders).some((k) => k.startsWith("./t4-pack.")) ? "T4" : "T3")
  );
}
