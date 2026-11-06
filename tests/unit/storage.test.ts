import { describe, it, expect } from "vitest";
import {
  blankProgress,
  loadProgress,
  saveProgress,
  mergeProgress,
  STORAGE_KEY,
  validProgress,
  currentAnswers,
  draftKey,
} from "../../src/storage/progress";
function memory(initial: string | null = null) {
  let bytes = initial;
  return {
    getItem: () => bytes,
    setItem: (_key: string, value: string) => {
      bytes = value;
    },
  };
}
describe("progress custody and versioning", () => {
  it("restores exact drafts and lessons", () => {
    const s = memory(),
      p = blankProgress();
    p.lessons["T3-01@1"] = "date";
    p.drafts[draftKey("practice", "a", "1")] = {
      values: { x: "3,5" },
      selected: [],
    };
    expect(saveProgress(s, p)).toBe(true);
    expect(loadProgress(s).data).toEqual(p);
  });
  it("leaves corrupt and unsupported bytes untouched", () => {
    for (const raw of ["{bad", '{"schemaVersion":99}']) {
      const s = memory(raw),
        r = loadProgress(s);
      expect(r.blocked).toBe(true);
      expect(s.getItem()).toBe(raw);
      expect(r.raw).toBe(raw);
    }
  });
  it("rejects malformed nested imports without altering current state", () => {
    const p = blankProgress();
    for (const x of [
      { ...p, drafts: { a: { values: { x: 4 }, selected: [] } } },
      { ...p, answers: [{ id: "x" }] },
    ]) {
      expect(validProgress(x)).toBe(false);
      expect(() => mergeProgress(p, x)).toThrow();
    }
    expect(p).toEqual(blankProgress());
  });
  it("merges without erasing old results or local drafts", () => {
    const p = blankProgress(),
      q = blankProgress();
    p.drafts.a = { values: { x: "local" }, selected: [] };
    q.drafts.a = { values: { x: "remote" }, selected: [] };
    q.lessons.old = "yes";
    const r = mergeProgress(p, q);
    expect(r.drafts.a.values.x).toBe("local");
    expect(r.lessons.old).toBe("yes");
    expect(r.archives).toHaveLength(1);
  });
  it("does not confuse old problem versions or modes", () => {
    const p = blankProgress();
    p.answers.push({
      id: "a",
      problemId: "P",
      version: "1",
      mode: "study",
      timestamp: "2026-11-06T10:00:00.000Z",
      stageResults: [],
      userResponse: { values: {}, selected: [] },
      score: 1,
      errorCodes: [],
      verificationStatus: "test",
      problemSnapshot: {
        id: "P",
        version: "1",
        title: "test",
        stages: [],
        solution: [],
      },
    });
    expect(currentAnswers(p, "practice", { P: "1" })).toHaveLength(0);
    expect(currentAnswers(p, "study", { P: "2" })).toHaveLength(0);
    expect(currentAnswers(p, "study", { P: "1" })).toHaveLength(1);
  });
  it("rejects empty exam sessions and unusable snapshots", () => {
    const p = blankProgress();
    expect(
      validProgress({
        ...p,
        exam: { id: "x", problemIds: [], versions: {}, startedAt: "x" },
      }),
    ).toBe(false);
    expect(
      validProgress({
        ...p,
        exam: { id: "x", problemIds: ["P"], versions: {}, startedAt: "x" },
      }),
    ).toBe(false);
  });
  it("reports quota failure and readback mismatch", () => {
    expect(
      saveProgress(
        {
          getItem: () => null,
          setItem: () => {
            throw Error("quota");
          },
        },
        blankProgress(),
      ),
    ).toBe(false);
    expect(
      saveProgress({ getItem: () => null, setItem: () => {} }, blankProgress()),
    ).toBe(false);
    expect(STORAGE_KEY).toContain("v1");
  });
});
