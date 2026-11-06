import { describe, it, expect } from "vitest";
import { problems } from "../../src/content";
import {
  gradeAttempt,
  attemptContext,
  assessedStages,
} from "../../src/engine/grading/attempt";
import {
  blankProgress,
  mergeProgress,
  transferEvidence,
  validProgress,
  reasoningStatus,
} from "../../src/storage/progress";
import { unitPolicy } from "../../src/engine/grading/units";
const problem = () => ({
  ...problems.find((p) => p.stages.length)!,
  transfer: { familyId: "test", seed: 2, benchmark: false },
});
const correct = () => {
  const p = problem();
  return {
    values: Object.fromEntries(p.stages.map((s) => [s.id, String(s.expected)])),
    selected: [],
    units: Object.fromEntries(
      p.stages.map((s) => [s.id, unitPolicy(s.unit).referenceUnit]),
    ),
  };
};
describe("objective assessment and provenance boundaries", () => {
  it("does not infer a user unit from the answer key", () => {
    const p = problem(),
      d = correct();
    delete (d as { units?: unknown }).units;
    const r = gradeAttempt(p, d, "practice");
    expect(r.objectiveScore).toBe(0);
    expect(r.stageResults.every((x) => x.errorCode === "UNIT_REQUIRED")).toBe(
      true,
    );
  });
  it("free text never adds objective points or teacher approval", () => {
    const p = {
      ...problem(),
      reasoning: { prompt: "Why", rubric: ["Logic"], sampleAnswer: "Reason" },
    };
    const d = correct();
    const no = gradeAttempt(p, d, "practice");
    const text = gradeAttempt(
      p,
      { ...d, values: { ...d.values, reasoning: "arbitrary text" } },
      "practice",
    );
    expect(text.objectiveScore).toBe(no.objectiveScore);
    expect(text.reasoningStatus).toBe("SUBMITTED_NOT_REVIEWED");
    expect(no.reasoningStatus).toBe("NOT_SUBMITTED");
  });
  it("grades only the requested final outputs in independent mode", () => {
    const p = problem();
    p.independent = { prompt: "Final output", stageIds: [p.stages[0].id] };
    expect(assessedStages(p, "practice")).toHaveLength(1);
    expect(assessedStages(p, "study")).toHaveLength(p.stages.length);
    expect(gradeAttempt(p, correct(), "practice").assessedStageIds).toEqual([
      p.stages[0].id,
    ]);
  });
  it("a fresh successful seed is an observation, never a learning outcome", () => {
    const p = problem(),
      d = correct(),
      data = blankProgress();
    const context = attemptContext(p, d, "practice", data);
    data.answers.push(gradeAttempt(p, d, "practice", context));
    expect(transferEvidence(data, [problem()]).cleanFirstSuccesses).toBe(1);
    expect(transferEvidence(data, [problem()]).outcomeStatus).toBe(
      "NOT_PROVEN",
    );
    expect(validProgress(data)).toBe(true);
  });
  it.each(["seen", "assisted", "guided", "benchmark", "legacy"] as const)(
    "excludes %s results from clean first-transfer observations",
    (kind) => {
      const p = problem(),
        d = correct(),
        data = blankProgress();
      const context = attemptContext(p, d, "practice", data, kind === "seen");
      if (kind === "assisted") context.assistanceUsed = true;
      if (kind === "guided") context.form = "guided";
      if (kind === "benchmark") context.benchmark = true;
      const r = gradeAttempt(p, d, "practice", context);
      if (kind === "legacy") delete r.gradingProtocol;
      data.answers.push(r);
      expect(transferEvidence(data, [problem()]).cleanFirstSuccesses).toBe(0);
    },
  );
  it("retains exposure and review events through import", () => {
    const a = blankProgress(),
      b = blankProgress();
    a.exposures = {
      x: {
        firstSeenAt: "2026-11-06T12:00:00Z",
        assistanceUsed: false,
        modes: ["practice"],
      },
    };
    b.exposures = {
      x: {
        firstSeenAt: "2026-11-05T12:00:00Z",
        assistanceUsed: true,
        modes: ["study"],
      },
    };
    const m = mergeProgress(a, b);
    expect(m.exposures?.x).toEqual({
      firstSeenAt: "2026-11-05T12:00:00Z",
      assistanceUsed: true,
      modes: ["practice", "study"],
    });
  });
  it("accepts a ratio percentage only as a ratio representation", async () => {
    const { gradeWithUnits } = await import("../../src/engine/grading/units");
    expect(
      gradeWithUnits({
        response: "20",
        responseUnit: "ratio-percent",
        expected: 0.2,
        referenceUnit: "раз",
        tolerance: 0.001,
      }).correct,
    ).toBe(true);
    expect(
      gradeWithUnits({
        response: "20",
        responseUnit: "percent",
        expected: 0.2,
        referenceUnit: "раз",
        tolerance: 0.001,
      }).errorCode,
    ).toBe("UNIT_DIMENSION");
  });
  it("does not turn an empty explanation into a self-reviewed one", () => {
    const p = {
      ...problem(),
      reasoning: { prompt: "Why", rubric: ["Logic"], sampleAnswer: "Reason" },
    };
    const d = correct(),
      data = blankProgress(),
      r = gradeAttempt(p, d, "practice");
    data.reasoningReviews = [
      {
        answerId: r.id,
        timestamp: new Date().toISOString(),
        checkedIndices: [0],
      },
    ];
    expect(reasoningStatus(r, data)).toBe("NOT_SUBMITTED");
    r.userResponse.values.reasoning = "My explanation";
    expect(reasoningStatus(r, data)).toBe("SELF_REVIEWED");
  });
  it("does not count duplicate first-attempt claims from merged histories twice", () => {
    const p = problem(),
      d = correct(),
      data = blankProgress();
    const r = gradeAttempt(
      p,
      d,
      "practice",
      attemptContext(p, d, "practice", data),
    );
    r.timestamp = "2026-11-06T10:00:00Z";
    data.answers = [
      r,
      {
        ...structuredClone(r),
        id: r.id + "-second",
        timestamp: "2026-11-06T11:00:00Z",
      },
    ];
    expect(transferEvidence(data, [problem()]).cleanFirstSuccesses).toBe(1);
  });
  it("rejects malformed imported exposure snapshots instead of crashing exam", () => {
    const data = {
      ...blankProgress(),
      exam: {
        id: "x",
        problemIds: ["x"],
        versions: { x: "1" },
        startedAt: "2026-11-06T10:00:00Z",
        seenProblemIds: 42,
      },
    };
    expect(validProgress(data)).toBe(false);
  });
  it("does not assign current transfer credit without a matching current registry", () => {
    const p = problem(),
      d = correct(),
      data = blankProgress();
    data.answers = [
      gradeAttempt(p, d, "practice", attemptContext(p, d, "practice", data)),
    ];
    expect(transferEvidence(data).cleanFirstSuccesses).toBe(0);
    expect(
      transferEvidence(data, [{ ...p, version: "next" }]).cleanFirstSuccesses,
    ).toBe(0);
    expect(
      transferEvidence(data, [{ ...p, transfer: { ...p.transfer, seed: 3 } }])
        .cleanFirstSuccesses,
    ).toBe(0);
  });
});
