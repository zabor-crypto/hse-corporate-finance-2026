import { describe, it, expect } from "vitest";
import katex from "katex";
import {
  topics,
  lessons,
  formulas,
  problems,
  seminarMap,
  sampleExamIds,
} from "../../src/content";
import {
  calcIncomeStatement,
  calcNopat,
  calcOperatingNwc,
  calcFcff,
  calcCfoIndirect,
} from "../../src/engine/finance";
import { gradeNumeric } from "../../src/engine/grading";
describe("curriculum and assessment integrity", () => {
  it("contains the eleven reviewed Topic3 lessons without inventing future topics", () => {
    expect(topics).toHaveLength(11);
    expect(
      topics.filter((t) => t.status === "implemented").map((t) => t.id),
    ).toEqual(
      Array.from(
        { length: 11 },
        (_, i) => `T3-${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(seminarMap.map((s) => s.id)).toEqual([
      "3.1",
      "3.2",
      "3.3",
      "3.4",
      "3.5",
      "3.6",
      "3.7",
      "3.8",
      "3.9",
    ]);
  });
  it("has stable unique versioned items and valid source/support links", () => {
    for (const list of [topics, lessons, formulas, problems])
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    for (const p of problems) {
      expect(p.version).toBeTruthy();
      expect(p.sourceRefs.length).toBeGreaterThan(0);
      expect(lessons.some((l) => l.id === p.lessonId)).toBe(true);
      expect(
        p.formulaIds.every((id) => formulas.some((f) => f.id === id)),
      ).toBe(true);
      expect(
        p.stages.every(
          (s) =>
            Number.isFinite(s.expected) &&
            s.weight > 0 &&
            s.tolerance >= 0 &&
            !!s.unit,
        ),
      ).toBe(true);
    }
    for (const l of lessons)
      for (const s of l.sections)
        expect(
          s.formulaIds?.every((id) => formulas.some((f) => f.id === id)) ??
            true,
        ).toBe(true);
  });
  it("keeps first reviewed bank limited and sample exam composition explicit", () => {
    expect(problems.filter((p) => p.id.startsWith("T3-"))).toHaveLength(62);
    expect(problems.filter((p) => p.transfer?.seed !== undefined)).toHaveLength(
      32,
    );
    expect(problems.slice(0, 10).map((p) => p.id)).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `T3-Q${String(i + 1).padStart(2, "0")}`,
      ),
    );
    const exam = sampleExamIds.map((id) => problems.find((p) => p.id === id)!);
    expect(new Set(sampleExamIds).size).toBe(7);
    expect(exam.map((q) => q.type)).toEqual([
      "single",
      "single",
      "multi",
      "multi",
      "numeric",
      "numeric",
      "steps",
    ]);
    expect(exam[6].stages).toHaveLength(3);
    for (const p of problems.filter((p) => p.options)) {
      expect(p.options!.length).toBeGreaterThanOrEqual(4);
      expect(
        p.correctOptionIds!.every((id) => p.options!.some((o) => o.id === id)),
      ).toBe(true);
    }
  });
  it("renders every formula to accessible MathML", () => {
    for (const f of formulas) {
      const output = katex.renderToString(f.latex, {
        throwOnError: true,
        output: "htmlAndMathml",
      });
      expect(output).toContain("<math");
    }
  });
  it("cross-checks all thirteen numeric keys with explicit engine scenarios", () => {
    const income = calcIncomeStatement({
      revenue: 300,
      cogs: 140,
      sgaCash: 60,
      da: 25,
      interest: 15,
      taxRate: 0.2,
      taxLossTreatment: "no-credit",
    });
    const nwc0 = calcOperatingNwc({ ar: 6, inventory: 10, ap: 8 }),
      nwc1 = calcOperatingNwc({ ar: 11, inventory: 7, ap: 7 });
    const values: Record<string, number[]> = {
      "T3-Q05": [70],
      "T3-Q06": [-(nwc1 - nwc0)],
      "T3-Q07": [
        calcNopat({ ebit: 130, taxRate: 0.2 }),
        20,
        calcFcff({ nopat: 104, da: 20, deltaOperatingNwc: 20, capex: 70 }),
      ],
      "T3-Q08": [
        income.ebit,
        income.ni,
        calcNopat({ ebit: income.ebit, taxRate: 0.2 }),
      ],
      "T3-Q09": [calcOperatingNwc({ ar: 20, inventory: 30, ap: 15 })],
      "T3-Q10": [
        12,
        25 + 5 - 15,
        calcCfoIndirect({
          ni: 80,
          da: 10,
          deltaAr: 25,
          deltaInventory: 5,
          deltaAp: 15,
        }),
        calcFcff({ nopat: 88, da: 10, deltaOperatingNwc: 15, capex: 30 }),
      ],
    };
    let count = 0;
    for (const p of problems.filter(
      (q) =>
        q.stages.length &&
        /^T3-Q\d{2}$/.test(q.id) &&
        Number(q.id.slice(-2)) <= 10,
    )) {
      p.stages.forEach((s, i) => {
        expect(values[p.id][i]).toBeCloseTo(s.expected, 10);
        expect(
          gradeNumeric({
            response: String(values[p.id][i]),
            expected: s.expected,
            absoluteTolerance: s.tolerance,
            responseUnit: s.unit,
            expectedUnit: s.unit,
          }).correct,
        ).toBe(true);
        count++;
      });
    }
    expect(count).toBe(13);
  });
});
