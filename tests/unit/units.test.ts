import { describe, it, expect } from "vitest";
import { gradeWithUnits, unitPolicy } from "../../src/engine/grading/units";
describe("observed student units and canonical conversion", () => {
  const money = { expected: 0.5, referenceUnit: "млн ₽", tolerance: 0.000001 };
  it.each([
    ["500", "thousand-rub"],
    ["0,5", "million-rub"],
    ["500000", "rub"],
  ])("accepts equivalent money%j", (response, responseUnit) => {
    const r = gradeWithUnits({ ...money, response, responseUnit });
    expect(r.correct).toBe(true);
    expect(r.canonicalResponse).toBe(500000);
  });
  it("does not invent a unit when the student has selected none", () =>
    expect(
      gradeWithUnits({ ...money, response: ".5", responseUnit: undefined })
        .errorCode,
    ).toBe("UNIT_REQUIRED"));
  it("rejects dimensions despite coincident numbers", () =>
    expect(
      gradeWithUnits({ ...money, response: ".5", responseUnit: "fraction" })
        .errorCode,
    ).toBe("UNIT_DIMENSION"));
  it("detects a thousandfold scale error", () =>
    expect(
      gradeWithUnits({ ...money, response: "500", responseUnit: "million-rub" })
        .errorCode,
    ).toBe("SCALE"));
  it.each([
    ["20", "percent"],
    ["0.2", "fraction"],
  ])("accepts percent and fraction%j", (response, responseUnit) =>
    expect(
      gradeWithUnits({
        expected: 20,
        referenceUnit: "%",
        tolerance: 0.00001,
        response,
        responseUnit,
      }).correct,
    ).toBe(true),
  );
  it("20 fractions are not20percent", () =>
    expect(
      gradeWithUnits({
        expected: 20,
        referenceUnit: "%",
        tolerance: 0.01,
        response: "20",
        responseUnit: "fraction",
      }).errorCode,
    ).toBe("SCALE"));
  it("keeps percentage-point differences separate from relative percent", () => {
    const x = { expected: 5, referenceUnit: "п.п.", tolerance: 0.00001 };
    expect(
      gradeWithUnits({ ...x, response: "5", responseUnit: "percentage-point" })
        .correct,
    ).toBe(true);
    expect(
      gradeWithUnits({ ...x, response: ".05", responseUnit: "fraction-point" })
        .correct,
    ).toBe(true);
    expect(
      gradeWithUnits({ ...x, response: "5", responseUnit: "percent" })
        .errorCode,
    ).toBe("UNIT_DIMENSION");
  });
  it("multiples and ratio fractions agree without being mislabeled as profitability rates", () => {
    const x = { expected: 2, referenceUnit: "раз", tolerance: 0.00001 };
    expect(
      gradeWithUnits({ ...x, response: "2", responseUnit: "ratio-fraction" })
        .correct,
    ).toBe(true);
    expect(
      gradeWithUnits({ ...x, response: "2", responseUnit: "percent" })
        .errorCode,
    ).toBe("UNIT_DIMENSION");
  });
  it("applies tolerance after conversion and preserves signs", () => {
    expect(
      gradeWithUnits({
        expected: -3,
        referenceUnit: "млн ₽",
        tolerance: 0.01,
        response: "-3009",
        responseUnit: "thousand-rub",
      }).correct,
    ).toBe(true);
    expect(
      gradeWithUnits({
        expected: -3,
        referenceUnit: "млн ₽",
        tolerance: 0.01,
        response: "-3011",
        responseUnit: "thousand-rub",
      }).correct,
    ).toBe(false);
    expect(
      gradeWithUnits({
        expected: -3,
        referenceUnit: "млн ₽",
        tolerance: 0.01,
        response: "3",
        responseUnit: "million-rub",
      }).errorCode,
    ).toBe("SIGN");
  });
  it("rejects unknown units, invalid inputs and missing canonical conventions", () => {
    expect(
      gradeWithUnits({ ...money, response: ".5", responseUnit: "apples" })
        .errorCode,
    ).toBe("UNIT_UNKNOWN");
    expect(
      gradeWithUnits({
        ...money,
        response: "500 тыс",
        responseUnit: "thousand-rub",
      }).errorCode,
    ).toBe("INVALID_NUMBER");
    expect(() => unitPolicy("unknown")).toThrow();
  });
  it("money conversion property holds across bounded transfer scale", () => {
    for (let n = 1; n <= 500; n += 7)
      expect(
        gradeWithUnits({
          expected: n / 10,
          referenceUnit: "млн ₽",
          tolerance: 1e-9,
          response: String(n * 100),
          responseUnit: "thousand-rub",
        }).correct,
      ).toBe(true);
  });
});
