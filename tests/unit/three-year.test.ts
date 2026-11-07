import { describe, it, expect } from "vitest";
import {
  buildThreeYearModel,
  integratedScenarios,
  teachingOpening,
  teachingBasePolicy,
} from "../../src/engine/finance/three-year";
describe("conditional three-year statements", () => {
  it("reconciles every annual balance and cash bridge in contrasting policies", () => {
    for (const rows of Object.values(integratedScenarios))
      for (const r of rows) {
        expect(r.balanceResidual).toBeCloseTo(0, 9);
        expect(r.cashResidual).toBeCloseTo(0, 9);
      }
    expect(integratedScenarios.base.map((r) => r.cash)).toEqual([
      65, 112.5, 171,
    ]);
    expect(integratedScenarios.base.map((r) => r.ni)).toEqual([40, 55, 49]);
    expect(integratedScenarios.base[0].netRoc).toBeCloseTo(0.1875, 12);
    expect(
      integratedScenarios.growthUnfunded.every(
        (r) => r.status === "FUNDING_GAP",
      ),
    ).toBe(true);
    expect(
      integratedScenarios.growthFunded.every(
        (r) => r.status === "FUNDED" && Math.abs(r.cash - 25) < 1e-9,
      ),
    ).toBe(true);
    expect(integratedScenarios.growthFunded[1].interest).toBeGreaterThan(
      integratedScenarios.growthFunded[0].interest,
    );
  });
  it("does not silently insert missing balances, rates or sales", () => {
    expect(() =>
      buildThreeYearModel({ ...teachingOpening, ar: NaN }, teachingBasePolicy),
    ).toThrow();
    const missing = { ...teachingOpening };
    delete (missing as Partial<typeof missing>).equity;
    expect(() => buildThreeYearModel(missing, teachingBasePolicy)).toThrow(
      "must be present",
    );
    expect(() =>
      buildThreeYearModel(
        { ...teachingOpening, equity: 100 },
        teachingBasePolicy,
      ),
    ).toThrow("does not balance");
    expect(() =>
      buildThreeYearModel(teachingOpening, {
        ...teachingBasePolicy,
        taxRate: 1,
      }),
    ).toThrow();
    expect(() =>
      buildThreeYearModel(teachingOpening, { ...teachingBasePolicy, days: 0 }),
    ).toThrow();
    expect(() =>
      buildThreeYearModel(teachingOpening, {
        ...teachingBasePolicy,
        sales: [0, 250, 230],
      }),
    ).toThrow();
  });
  it("starts new capex depreciation in the following year and preserves identities", () => {
    const rows = buildThreeYearModel(teachingOpening, {
      ...teachingBasePolicy,
      capex: [20, 0, 0],
      newAssetLife: 5,
    });
    expect(rows.map((r) => r.da)).toEqual([30, 34, 34]);
    for (const r of rows) expect(r.balanceResidual).toBeCloseTo(0, 9);
  });
  it("uses zero cash tax and zero payout on losses, not an automatic tax credit", () => {
    const rows = buildThreeYearModel(teachingOpening, {
      ...teachingBasePolicy,
      debtRate: 1,
    });
    expect(rows[0].tax).toBe(0);
    expect(rows[0].ni).toBeLessThan(0);
    expect(rows[0].dividends).toBe(0);
  });
});
