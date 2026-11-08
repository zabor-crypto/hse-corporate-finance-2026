import type { CurriculumRegistry, ExamBlueprint, PaperSnapshot } from "./types";
import { validExamBlueprint } from "./types";
import { assertRegistryIntegrity } from "./integrity";
export interface ExposureHistory {
  seenKeys: readonly string[];
}
function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
}
export function assemblePaper(
  registry: CurriculumRegistry,
  blueprint: ExamBlueprint,
  seed: number,
  history: ExposureHistory,
  assembledAt: string,
): PaperSnapshot {
  if (!validExamBlueprint(blueprint)) throw new Error("Invalid blueprint");
  if (blueprint.reviewStatus !== "PUBLISHED")
    throw new Error("Blueprint is not reviewed");
  assertRegistryIntegrity({
    ...registry,
    blueprints: [
      ...registry.blueprints.filter((b) => b.id !== blueprint.id),
      blueprint,
    ],
  });
  if (
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isFinite(Date.parse(assembledAt))
  )
    throw new Error("Invalid assembly identity");
  const seen = new Set(history.seenKeys),
    random = randomSource(seed);
  const eligible = registry.problems.filter(
    (p) =>
      p.availability === "available" &&
      p.reviewStatus === "PUBLISHED" &&
      (!blueprint.eligiblePool ||
        blueprint.eligiblePool.some(
          (e) => e.problemId === p.id && e.version === p.version,
        )) &&
      registry.lessons.some(
        (l) =>
          l.id === p.lessonId &&
          l.availability === "available" &&
          l.reviewStatus === "PUBLISHED" &&
          blueprint.moduleIds.includes(l.moduleId) &&
          registry.modules.some(
            (m) =>
              m.id === l.moduleId &&
              m.availability === "available" &&
              m.reviewStatus === "PUBLISHED",
          ),
      ),
  );
  const choices = blueprint.slots.map((slot) =>
    eligible
      .filter(
        (p) =>
          slot.competencyIds.some((id) => p.competencyIds.includes(id)) &&
          slot.difficulties.includes(p.difficulty) &&
          (!slot.kinds || slot.kinds.includes(p.kind)) &&
          (!slot.problemIds || slot.problemIds.includes(p.id)) &&
          (!slot.sourceVersionIds ||
            slot.sourceVersionIds.some((id) =>
              p.sourceVersionIds.includes(id),
            )) &&
          (blueprint.unseenPolicy !== "require" ||
            !seen.has(`${p.id}@${p.version}`)),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => {
        const weight =
          p.competencyIds.reduce(
            (s, id) => s + (blueprint.competencyWeights[id] ?? 1),
            0,
          ) *
          (blueprint.difficultyWeights[p.difficulty] ?? 1) *
          p.sourceVersionIds.reduce(
            (s, id) => s + (blueprint.sourceWeights[id] ?? 1),
            0,
          );
        return {
          p,
          rank: -Math.log(random()) / weight,
          seen: seen.has(`${p.id}@${p.version}`),
        };
      })
      .sort(
        (a, b) =>
          (blueprint.unseenPolicy === "prefer"
            ? Number(a.seen) - Number(b.seen)
            : 0) || a.rank - b.rank,
      ),
  );
  const selected: typeof eligible = [];
  const usedFamilies = new Set<string>();
  if (
    new Set(choices.flatMap((c) => c.map(({ p }) => p.familyId))).size <
    blueprint.slots.length
  )
    throw new Error(
      "Insufficient eligible reviewed families for this blueprint/history; no unseen claim can be made",
    );
  const order = choices
    .map((_, i) => i)
    .sort((a, b) => choices[a].length - choices[b].length || a - b);
  function solve(depth: number, onlyUnseen: boolean): boolean {
    if (depth === choices.length) return true;
    const remaining = order
      .slice(depth)
      .map((i) =>
        choices[i].filter(
          ({ p, seen }) =>
            !usedFamilies.has(p.familyId) && (!onlyUnseen || !seen),
        ),
      );
    if (
      remaining.some((xs) => !xs.length) ||
      new Set(remaining.flatMap((xs) => xs.map(({ p }) => p.familyId))).size <
        remaining.length
    )
      return false;
    const i = order[depth];
    for (const { p, seen } of choices[i]) {
      if (usedFamilies.has(p.familyId) || (onlyUnseen && seen)) continue;
      usedFamilies.add(p.familyId);
      selected[i] = p;
      if (solve(depth + 1, onlyUnseen)) return true;
      delete selected[i];
      usedFamilies.delete(p.familyId);
    }
    return false;
  }
  // Prefer a complete unseen matching before any mixed fallback; local ordering alone
  // can consume the only family available to another unseen slot.
  if (
    !(blueprint.unseenPolicy === "prefer" && solve(0, true)) &&
    !solve(0, false)
  )
    throw new Error(
      "Insufficient eligible reviewed families for this blueprint/history; no unseen claim can be made",
    );
  return {
    blueprint: structuredClone(blueprint),
    seed,
    assembledAt,
    problemIds: selected.map((p) => p.id),
    versions: Object.fromEntries(selected.map((p) => [p.id, p.version])),
    familyIds: selected.map((p) => p.familyId),
    sourceVersionIds: [...new Set(selected.flatMap((p) => p.sourceVersionIds))],
  };
}
export function validPaperSnapshot(value: unknown): value is PaperSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as PaperSnapshot;
  const strings = (x: unknown): x is string[] =>
    Array.isArray(x) && x.every((s) => typeof s === "string");
  return (
    validExamBlueprint(v.blueprint) &&
    v.blueprint.reviewStatus === "PUBLISHED" &&
    Number.isSafeInteger(v.seed) &&
    v.seed >= 0 &&
    v.seed <= 0xffffffff &&
    Number.isFinite(Date.parse(v.assembledAt)) &&
    strings(v.problemIds) &&
    v.problemIds.length > 0 &&
    new Set(v.problemIds).size === v.problemIds.length &&
    !!v.versions &&
    typeof v.versions === "object" &&
    v.problemIds.every((id) => typeof v.versions[id] === "string") &&
    strings(v.familyIds) &&
    v.familyIds.length === v.problemIds.length &&
    new Set(v.familyIds).size === v.familyIds.length &&
    strings(v.sourceVersionIds) &&
    v.blueprint.slots.length === v.problemIds.length
  );
}
