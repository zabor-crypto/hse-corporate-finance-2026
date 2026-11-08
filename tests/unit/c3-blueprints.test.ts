import { it, expect } from "vitest";
import {
  assemblePaper,
  curriculumRegistry,
  createCurriculumRegistry,
} from "../../src/curriculum";
import { c3Blueprints } from "../../src/curriculum/blueprints";
import { lessons, formulas, problems, topics } from "../../src/content";
it("assembles actual accepted question pools with exact composition over deterministic seeds", () => {
  // Non-canonical template validation; publication-stage promotion requires independent acceptance.
  for (const template of c3Blueprints) {
    const blueprint = { ...template, reviewStatus: "PUBLISHED" as const };
    for (const seed of [0, 1, 17, 20261107]) {
      const paper = assemblePaper(
        curriculumRegistry,
        blueprint,
        seed,
        { seenKeys: [] },
        "2026-11-07T00:00:00Z",
      );
      const bank = paper.problemIds.map((id) =>
        problems.find((p) => p.id === id)!,
      );
      expect(new Set(paper.familyIds).size).toBe(bank.length);
      expect(bank.every((p) => p.reviewStatus === "CONTENT_REVIEWED")).toBe(
        true,
      );
      if (template.id.startsWith("C3-SHORT")) {
        expect(bank).toHaveLength(6);
        expect(bank.some((p) => p.type === "single")).toBe(true);
        expect(bank.some((p) => p.type === "multi")).toBe(true);
        expect(
          bank.filter((p) => p.stages.length).length,
        ).toBeGreaterThanOrEqual(2);
      }
      if (template.id === "C3-THEORY-40") {
        expect(new Set(paper.problemIds).size).toBe(40);
        expect(paper.problemIds.every((id) => id.startsWith("C3-T"))).toBe(
          true,
        );
      }
      if (template.id.startsWith("C3-INTEGRATED"))
        expect(
          bank.every(
            (p) => p.stages.length > 0 && ["L3", "L4"].includes(p.difficulty),
          ),
        ).toBe(true);
      expect(
        assemblePaper(
          curriculumRegistry,
          blueprint,
          seed,
          { seenKeys: [] },
          paper.assembledAt,
        ),
      ).toEqual(paper);
    }
  }
});
it("does not silently approve new versions under previously accepted identities", () => {
  const changedLessons = structuredClone(lessons);
  changedLessons[0].version = "99.0.0";
  const changedProblems = structuredClone(problems);
  changedProblems[0].version = "99.0.0";
  const changedFormulas = structuredClone(formulas);
  changedFormulas[0].version = "99.0.0";
  const r = createCurriculumRegistry({
    topics,
    lessons: changedLessons,
    formulas: changedFormulas,
    problems: changedProblems,
  });
  expect(
    r.lessons.find((l) => l.id === changedLessons[0].id)?.availability,
  ).toBe("unavailable");
  expect(
    r.problems.find((p) => p.id === changedProblems[0].id)?.availability,
  ).toBe("unavailable");
  expect(
    r.formulas.find((f) => f.id === changedFormulas[0].id)?.availability,
  ).toBe("unavailable");
});
