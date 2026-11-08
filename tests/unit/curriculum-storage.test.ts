import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  blankProgress,
  validProgress,
  mergeProgress,
} from "../../src/storage/progress";
import { assemblePaper, curriculumRegistry } from "../../src/curriculum";
import { buildErrorLog, targetedRetest } from "../../src/curriculum/errors";
import { gradeAttempt } from "../../src/engine/grading/attempt";
import { problems } from "../../src/content";
import type { ExamBlueprint } from "../../src/curriculum";
const blueprint: ExamBlueprint = {
  id: "fixture-snapshot",
  version: "1.0.0",
  title: "Fixture",
  moduleIds: ["T3"],
  minutes: 25,
  reviewStatus: "PUBLISHED",
  unseenPolicy: "require",
  competencyWeights: {},
  difficultyWeights: {},
  sourceWeights: {},
  slots: [
    {
      id: "1",
      competencyIds: ["T3-03:core"],
      difficulties: ["L2", "L3", "L4"],
    },
  ],
};
describe("additive paper provenance with schema1", () => {
  it("preserves old fixture answers, snapshots and grades byte-for-byte on merge", () => {
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/baseline-v1-progress.json", "utf8"),
    );
    expect(validProgress(fixture)).toBe(true);
    const bytes = JSON.stringify(fixture.answers);
    const merged = mergeProgress(blankProgress(), fixture);
    expect(JSON.stringify(merged.answers)).toBe(bytes);
    expect(validProgress(merged)).toBe(true);
  });
  it("rejects contradictory modern identity/stage provenance without regrading historical snapshots", () => {
    const q = problems.find((p) => p.id === "T3-Q23")!;
    const record = gradeAttempt(q, { values: {}, selected: [] }, "practice");
    const p = blankProgress();
    p.answers = [record];
    expect(validProgress(p)).toBe(true);
    for (const mutate of [
      (a: typeof record) => {
        a.assessedStageIds = ["NONEXISTENT"];
      },
      (a: typeof record) => {
        a.stageResults[0].id = "NONEXISTENT";
      },
      (a: typeof record) => {
        (a.problemSnapshot as { id: string }).id = "OTHER-PROBLEM";
      },
      (a: typeof record) => {
        (a.problemSnapshot as { version: string }).version = "99.0.0";
      },
      (a: typeof record) => {
        a.assessedStageIds!.push(a.assessedStageIds![0]);
      },
    ]) {
      const bad = structuredClone(p);
      mutate(bad.answers[0]);
      expect(validProgress(bad)).toBe(false);
    }
    // An old, coherent snapshot remains valid even when absent from today's corpus.
    const historical = structuredClone(p);
    historical.answers[0].version = "0.0.1";
    (historical.answers[0].problemSnapshot as { version: string }).version =
      "0.0.1";
    expect(validProgress(historical)).toBe(true);
    const bytes = JSON.stringify(historical.answers);
    expect(
      JSON.stringify(mergeProgress(blankProgress(), historical).answers),
    ).toBe(bytes);
    const choice = problems.find((p) => p.type === "multi")!;
    p.answers = [gradeAttempt(choice, { values: {}, selected: [] }, "exam")];
    expect(validProgress(p)).toBe(true);
  });
  it("round trips exact blueprint/version/seed and rejects mismatched paper identities", () => {
    const paper = assemblePaper(
      curriculumRegistry,
      blueprint,
      42,
      { seenKeys: [] },
      "2026-11-07T00:00:00Z",
    );
    const data = blankProgress();
    data.exam = {
      id: "fixture",
      problemIds: paper.problemIds,
      versions: paper.versions,
      startedAt: paper.assembledAt,
      paper,
    };
    expect(validProgress(data)).toBe(true);
    expect(
      mergeProgress(blankProgress(), JSON.parse(JSON.stringify(data))).exam,
    ).toEqual(data.exam);
    const wrong = JSON.parse(JSON.stringify(data));
    wrong.exam.versions[paper.problemIds[0]] = "99.0.0";
    expect(validProgress(wrong)).toBe(false);
    const duplicate = structuredClone(data);
    duplicate.exam!.paper!.familyIds.push("bad");
    expect(validProgress(duplicate)).toBe(false);
  });
  it("derives errors from evaluated historical stages and offers different unseen reviewed data", () => {
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/baseline-v1-progress.json", "utf8"),
    );
    const priorBytes = JSON.stringify(fixture);
    const errors = buildErrorLog(fixture, curriculumRegistry);
    for (const e of errors) {
      const next = targetedRetest(e, fixture, curriculumRegistry);
      if (next) {
        expect(next.id).not.toBe(e.problemId);
        expect(
          fixture.answers.some(
            (a: { problemId: string }) => a.problemId === next.id,
          ),
        ).toBe(false);
      }
    }
    expect(JSON.stringify(fixture)).toBe(priorBytes);
  });
  it("retains student error tags separately from immutable numerical grades", () => {
    const p = blankProgress();
    p.errorReviews = [
      {
        answerId: "old-answer",
        stageId: "stage",
        category: "timing",
        note: "Использовал конечный остаток вместо среднего.",
        timestamp: "2026-11-07T00:00:00Z",
      },
    ];
    expect(validProgress(p)).toBe(true);
    expect(mergeProgress(blankProgress(), p).errorReviews).toEqual(
      p.errorReviews,
    );
    const malformed = structuredClone(p);
    (malformed.errorReviews![0] as { category: string }).category =
      "AUTO_MASTERY";
    expect(validProgress(malformed)).toBe(false);
  });
});
