import { describe, it, expect } from "vitest";
import oracle from "../fixtures/c3-independent-oracles.json";
import ratiosOracle from "../fixtures/c3-ratios-focus-independent-oracles.json";
import { problems } from "../../src/content";
import { gradeWithUnits, unitPolicy } from "../../src/engine/grading/units";
// Preserve the accepted 118 fixture bytes; extend only from the separately authored oracle.
const currentProblems = [
  ...oracle.problems,
  ...ratiosOracle.problems.map((p) => ({
    id: p.id,
    version: p.version,
    ...(Object.keys(p.stages).length
      ? { stages: Object.entries(p.stages).map(([id, s]) => ({ id, ...s })) }
      : { correctOptionIds: p.correctOptionIds! }),
  })),
];
describe("complete corpus against independently authored and reviewed oracles", () => {
  it("has an oracle for every current problem and no unregistered oracle", () =>
    expect(problems.map((p) => `${p.id}@${p.version}`).sort()).toEqual(
      currentProblems.map((p) => `${p.id}@${p.version}`).sort(),
    ));
  it("independent numeric oracles are usable through the runtime unit and grading contract", () => {
    for (const p of currentProblems)
      if ("stages" in p && p.stages) {
        const actual = problems.find((a) => a.id === p.id)!;
        for (const s of p.stages) {
          const stage = actual.stages.find((a) => a.id === s.id)!;
          expect(
            gradeWithUnits({
              response: String(s.expected),
              responseUnit: unitPolicy(stage.unit).referenceUnit,
              expected: stage.expected,
              referenceUnit: stage.unit,
              tolerance: stage.tolerance,
            }).correct,
            `${p.id}/${s.id}`,
          ).toBe(true);
        }
      }
  });
  for (const expected of currentProblems)
    it(`${expected.id} exact version, numerical stage IDs/units or complete selection set`, () => {
      const actual = problems.find((p) => p.id === expected.id)!;
      expect(actual.version).toBe(expected.version);
      if ("stages" in expected && expected.stages) {
        expect(actual.stages).toHaveLength(expected.stages.length);
        for (const s of expected.stages) {
          const a = actual.stages.find((a) => a.id === s.id)!;
          expect(a.unit).toBe(s.unit);
          expect(Math.abs(a.expected - s.expected)).toBeLessThanOrEqual(
            1e-9 + 1e-12 * Math.abs(s.expected),
          );
        }
      } else if ("correctOptionIds" in expected)
        expect([...actual.correctOptionIds!].sort()).toEqual(
          [...expected.correctOptionIds!].sort(),
        );
    });
});
