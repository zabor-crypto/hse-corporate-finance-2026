import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { topics, lessons, formulas, problems } from "../../src/content";
import {
  curriculumRegistry,
  createCurriculumRegistry,
  assertRegistryIntegrity,
  registryFindings,
  nextReviewStage,
  assemblePaper,
  validPaperSnapshot,
} from "../../src/curriculum";
import type { ExamBlueprint } from "../../src/curriculum";

const blueprint: ExamBlueprint = {
  id: "fixture-paper",
  version: "1.0.0",
  title: "Fixture",
  moduleIds: ["T3"],
  minutes: 25,
  reviewStatus: "PUBLISHED",
  unseenPolicy: "require",
  competencyWeights: { "T3-03:core": 2, "T3-05:core": 1 },
  difficultyWeights: { L2: 1, L3: 2, L4: 1 },
  sourceWeights: {},
  slots: [
    {
      id: "a",
      competencyIds: ["T3-03:core"],
      difficulties: ["L2", "L3", "L4"],
    },
    {
      id: "b",
      competencyIds: ["T3-05:core"],
      difficulties: ["L2", "L3", "L4"],
    },
  ],
};
describe("extensible compiled curriculum registry", () => {
  it("validates actual graph, relationships and public asset paths", () => {
    expect(registryFindings(curriculumRegistry)).toEqual([]);
    for (const s of curriculumRegistry.sourceVersions)
      if (s.visibility === "public") {
        if (s.asset?.startsWith("https://"))
          expect(new URL(s.asset).protocol).toBe("https:");
        else expect(existsSync(s.asset!)).toBe(true);
      }
    expect(curriculumRegistry.modules.map((m) => m.id)).toEqual(["T3"]);
    expect(curriculumRegistry.workedExamples.length).toBeGreaterThan(0);
  });
  it("detects duplicate IDs, missing dependencies, bad formulas and cycles", () => {
    const r = structuredClone(curriculumRegistry);
    r.lessons.push(r.lessons[0]);
    r.competencies[0].prerequisiteIds = ["missing", r.competencies[0].id];
    r.sections[0].formulaIds.push("missing-formula");
    const errors = registryFindings(r).join("\n");
    expect(errors).toContain("duplicate");
    expect(errors).toContain("missing");
    expect(errors).toContain("cycle");
    expect(() => assertRegistryIntegrity(r)).toThrow();
  });
  it("accepts unknown future test-only module without UI source changes and hides drafts", () => {
    const future = {
      ...topics[0],
      id: "TEST-T4-01",
      title: "Synthetic fixture only",
      prerequisites: [],
      lessonIds: [],
      questionIds: [],
    };
    const r = createCurriculumRegistry(
      { topics: [...topics, future], lessons, formulas, problems },
      {
        modules: [
          {
            id: "T3",
            title: "Actual Topic 3",
            lessonIds: topics.map((t) => t.id),
          },
          {
            id: "TEST-T4",
            title: "Not real course content",
            lessonIds: [future.id],
          },
        ],
      },
    );
    expect(registryFindings(r)).toEqual([]);
    expect(r.modules.find((m) => m.id === "TEST-T4")?.availability).toBe(
      "unavailable",
    );
    expect(r.lessons.find((l) => l.id === future.id)?.reviewStatus).toBe(
      "DRAFT",
    );
    expect(curriculumRegistry.modules.some((m) => m.id === "TEST-T4")).toBe(
      false,
    );
  });
  it("does not skip source, finance or pedagogical review transitions", () => {
    expect(nextReviewStage("DRAFT", "SOURCE_REVIEW")).toBe("SOURCE_REVIEW");
    expect(() => nextReviewStage("DRAFT", "PUBLISHED")).toThrow();
    expect(() => nextReviewStage("PUBLISHED", "DRAFT")).toThrow();
  });
  it("supports multiple distinct lesson IDs inside a newly reviewed test-only topic", () => {
    const topic = {
      ...topics[0],
      id: "TEST-TOPIC",
      title: "Synthetic topic fixture",
      prerequisites: [],
      lessonIds: ["TEST-L-A", "TEST-L-B"],
      questionIds: [],
    };
    const fixtureLessons = topic.lessonIds.map((id) => ({
      ...lessons[0],
      id,
      title: id,
      practiceIds: [],
      sections: [],
    }));
    const r = createCurriculumRegistry(
      {
        topics: [...topics, topic],
        lessons: [...lessons, ...fixtureLessons],
        formulas,
        problems,
      },
      {
        modules: [
          { id: "T3", title: "Actual", lessonIds: topics.map((t) => t.id) },
          {
            id: "TEST-MODULE",
            title: "Fixture only",
            lessonIds: topic.lessonIds,
          },
        ],
        reviewedLessonIds: [...lessons.map((l) => l.id), ...topic.lessonIds],
      },
    );
    expect(registryFindings(r)).toEqual([]);
    expect(
      r.lessons.filter((l) => l.moduleId === "TEST-MODULE").map((l) => l.id),
    ).toEqual(topic.lessonIds);
    expect(r.lessons.find((l) => l.id === "TEST-L-A")?.competencyIds).toEqual([
      "TEST-TOPIC:core",
    ]);
  });
  it("assembles deterministically, retains exact provenance and excludes equivalents/seen keys", () => {
    const r = structuredClone(curriculumRegistry);
    r.blueprints = [blueprint];
    const a = assemblePaper(
      r,
      blueprint,
      137,
      { seenKeys: [] },
      "2026-11-07T00:00:00Z",
    );
    expect(
      assemblePaper(r, blueprint, 137, { seenKeys: [] }, a.assembledAt),
    ).toEqual(a);
    expect(new Set(a.familyIds).size).toBe(2);
    expect(validPaperSnapshot(a)).toBe(true);
    const b = assemblePaper(
      r,
      blueprint,
      137,
      { seenKeys: [`${a.problemIds[0]}@${a.versions[a.problemIds[0]]}`] },
      a.assembledAt,
    );
    expect(b.problemIds).not.toContain(a.problemIds[0]);
    blueprint.title = "later change";
    expect(a.blueprint.title).toBe("Fixture");
    blueprint.title = "Fixture";
  });
  it("prefers a globally feasible wholly unseen matching before a mixed fallback", () => {
    const r = structuredClone(curriculumRegistry);
    r.blueprints = [];
    const prototype = r.problems.find((p) => p.id === "T3-Q23")!;
    r.problems = [
      ["A", "F1"],
      ["B", "F2"],
      ["C", "F1"],
      ["D", "F3"],
    ].map(([id, familyId]) => ({
      ...prototype,
      id,
      familyId,
      competencyIds: ["T3-03:core"],
    }));
    r.families = ["F1", "F2", "F3"].map((id) => ({
      id,
      version: "1.0.0",
      competencyIds: ["T3-03:core"],
      sourceVersionIds: prototype.sourceVersionIds,
      problemIds: r.problems.filter((p) => p.familyId === id).map((p) => p.id),
    }));
    const b: ExamBlueprint = {
      ...blueprint,
      id: "prefer-counterexample",
      unseenPolicy: "prefer",
      slots: [
        {
          id: "one",
          competencyIds: ["T3-03:core"],
          difficulties: [prototype.difficulty],
          problemIds: ["A", "B"],
        },
        {
          id: "two",
          competencyIds: ["T3-03:core"],
          difficulties: [prototype.difficulty],
          problemIds: ["C", "D"],
        },
      ],
    };
    for (let seed = 0; seed < 64; seed++) {
      const paper = assemblePaper(
        r,
        b,
        seed,
        { seenKeys: [`D@${prototype.version}`] },
        "2026-11-07",
      );
      expect(paper.problemIds).toEqual(["B", "C"]);
      expect(paper.blueprint.unseenPolicy).toBe("prefer");
    }
    const fallback = assemblePaper(
      r,
      b,
      8,
      { seenKeys: r.problems.map((p) => `${p.id}@${p.version}`) },
      "2026-11-07",
    );
    expect(fallback.problemIds).toHaveLength(2);
    expect(new Set(fallback.familyIds).size).toBe(2);
  });
  it("fails closed when only seen, draft or equivalent families remain", () => {
    const r = structuredClone(curriculumRegistry);
    r.problems = r.problems.map((p) => ({ ...p, familyId: "equivalent" }));
    r.families = [
      {
        id: "equivalent",
        version: "1.0.0",
        sourceVersionIds: ["original-cflos-v1"],
        competencyIds: r.competencies.map((c) => c.id),
        problemIds: r.problems.map((p) => p.id),
      },
    ];
    expect(() =>
      assemblePaper(r, blueprint, 0, { seenKeys: [] }, "2026-11-07"),
    ).toThrow("Insufficient");
    expect(() =>
      assemblePaper(
        curriculumRegistry,
        blueprint,
        1,
        { seenKeys: problems.map((p) => `${p.id}@${p.version}`) },
        "2026-11-07",
      ),
    ).toThrow("Insufficient");
    expect(() =>
      assemblePaper(
        curriculumRegistry,
        { ...blueprint, reviewStatus: "DRAFT" },
        1,
        { seenKeys: [] },
        "2026-11-07",
      ),
    ).toThrow("not reviewed");
  });
  it("rejects independently discovered ancestor, weight, parent and snapshot defects", () => {
    const hidden = structuredClone(curriculumRegistry);
    for (const l of hidden.lessons) {
      l.reviewStatus = "DRAFT";
      l.availability = "unavailable";
    }
    expect(() =>
      assemblePaper(hidden, blueprint, 0, { seenKeys: [] }, "2026-11-07"),
    ).toThrow();
    expect(() =>
      assemblePaper(
        curriculumRegistry,
        { ...blueprint, difficultyWeights: { L2: 0 } },
        0,
        { seenKeys: [] },
        "2026-11-07",
      ),
    ).toThrow("Invalid blueprint");
    const misparent = structuredClone(curriculumRegistry);
    misparent.sections[0].lessonId = misparent.lessons[1].id;
    expect(registryFindings(misparent).join(" ")).toContain("inconsistent");
    const paper = assemblePaper(
      curriculumRegistry,
      blueprint,
      0,
      { seenKeys: [] },
      "2026-11-07",
    );
    expect(
      validPaperSnapshot({
        ...paper,
        blueprint: { ...blueprint, slots: [null], minutes: -1 },
      }),
    ).toBe(false);
  });
});
