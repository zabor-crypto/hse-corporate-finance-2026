import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  problems,
  generateTransferProblem,
  transferFamilies,
  frozenBenchmarkIds,
} from "../../src/content";
const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/tranche03-independent-oracles.json", import.meta.url),
    "utf8",
  ),
) as {
  problems: {
    id: string;
    version: string;
    stages?: {
      id: string;
      expected: number;
      unit: string;
      tolerance: number;
    }[];
    correctOptionIds?: string[];
  }[];
};
describe("independent Fraction-derived tranche03 keys", () => {
  for (const oracle of fixture.problems)
    it(oracle.id, () => {
      const actual = problems.find((p) => p.id === oracle.id);
      expect(actual).toBeDefined();
      expect(actual!.version).toBe(oracle.version);
      expect(actual!.stages.map((s) => s.id)).toEqual(
        (oracle.stages ?? []).map((s) => s.id),
      );
      for (const stage of oracle.stages ?? []) {
        const value = actual!.stages.find((s) => s.id === stage.id)!;
        expect(value.expected).toBeCloseTo(stage.expected, 9);
        expect(value.unit).toBe(stage.unit);
        expect(value.tolerance).toBe(stage.tolerance);
      }
      if (oracle.correctOptionIds)
        expect([...actual!.correctOptionIds!].sort()).toEqual(
          [...oracle.correctOptionIds].sort(),
        );
    });
  it("covers every new fixed case and all bounded variants", () => {
    expect(fixture.problems).toHaveLength(40);
    expect(
      fixture.problems.reduce((n, p) => n + (p.stages?.length ?? 0), 0),
    ).toBe(297);
    expect(frozenBenchmarkIds).toEqual([
      "T3-Q23",
      "T3-Q24",
      "T3-Q25",
      "T3-Q26",
    ]);
  });
  it("reproduces all presets and rejects out-of-range seeds", () => {
    for (const family of transferFamilies) {
      for (let seed = 0; seed < 8; seed++) {
        expect(generateTransferProblem(family.id, seed)).toEqual(
          generateTransferProblem(family.id, seed),
        );
      }
      for (const seed of [-1, 8, 0.5, NaN, Infinity])
        expect(() => generateTransferProblem(family.id, seed)).toThrow(
          RangeError,
        );
    }
  });
});
