import type { RegistryContent, CurriculumRegistry } from "../curriculum/types";
import type { ModulePack } from "./types";
const packs = new Map<string, ModulePack>();
const contents = new Map<string, RegistryContent>();
const registries = new Map<string, CurriculumRegistry>();
const listeners = new Set<() => void>();
let activeId: string | null = null;
const emit = () => listeners.forEach((fn) => fn());
/** Legacy adapters register original references, never cloned content or registry nodes. */
export function registerContent(id: string, content: RegistryContent) {
  contents.set(id, content);
}
export function registerRegistry(id: string, registry: CurriculumRegistry) {
  registries.set(id, registry);
  const content = contents.get(id);
  if (content && !packs.has(id))
    registerPack({
      id,
      content,
      registry,
      config: {
        id,
        title: registry.modules.find((m) => m.id === id)?.title ?? id,
        primaryLessonId: content.lessons[0]?.id ?? "",
        defaultPracticeId: content.problems[0]?.id ?? "",
        nextAction: {
          label: "Продолжить обучение",
          route: `learn/${content.lessons[0]?.id ?? ""}`,
        },
        blueprintIds: registry.blueprints.map((b) => b.id),
        currentTopic: {
          title: registry.modules.find((m) => m.id === id)?.title ?? id,
        },
        nearestAssessment: {
          title: "Учебная контрольная",
          date: null,
          dateStatus: "UNKNOWN",
        },
      },
    });
}
export function registerPack(pack: ModulePack) {
  packs.set(pack.id, pack);
  emit();
  return pack;
}
export function getLoadedPacks() {
  return [...packs.values()];
}
export function getPack(id: string) {
  return packs.get(id);
}
export function getActivePack() {
  const p = activeId ? packs.get(activeId) : undefined;
  if (!p) throw new Error("Учебный модуль ещё не загружен");
  return p;
}
export function getActiveSnapshot() {
  return activeId ? (packs.get(activeId) ?? null) : null;
}
export function activateModule(id: string) {
  if (!packs.has(id)) throw new Error(`Модуль ${id} не загружен`);
  activeId = id;
  emit();
}
export function subscribeRuntime(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
