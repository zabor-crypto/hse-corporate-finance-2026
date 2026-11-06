import { describe, it, expect } from 'vitest';
import * as f from '../../src/engine/finance';
import type { StockBasis } from '../../src/engine/finance';
const avg = (opening: number, closing: number, period = '2026'): StockBasis => ({ basis: 'average', opening, closing, period });
const opening = (value: number): StockBasis => ({ basis: 'opening', opening: value, period: '2026' });

describe('Named conditional source fixtures (million RUB, rates as fractions)', () => {
  it('SEM3.1_CORE: operating profit and financing-independent FCFF', () => {
    const pnl = f.calcIncomeStatement({ revenue: 350, cogs: 120, sgaCash: 80, da: 20, interest: 15, taxRate: .2 });
    expect(pnl).toEqual({ ebitda: 150, ebit: 130, ebt: 115, taxes: 23, ni: 92, nopat: 104 });
    expect(f.calcFcff({ nopat: pnl.nopat, da: 20, deltaOperatingNwc: 350 * .2 - 50, capex: 70 })).toBe(34);
    // NI=92 is conditional on 15 accrued interest; it is not inferred from payment timing.
    const differentAccrual = f.calcIncomeStatement({ revenue: 350, cogs: 120, sgaCash: 80, da: 20, interest: 21, taxRate: .2 });
    expect(differentAccrual.ni).toBeCloseTo(87.2);
    expect(differentAccrual.nopat).toBe(pnl.nopat);
  });
  it('SEM3.2_NWC_IMPACT: cash release signs and delta vs total', () => {
    const begin = f.calcOperatingNwc({ ar: 6, inventory: 10, ap: 8 });
    const end = f.calcOperatingNwc({ ar: 11, inventory: 7, ap: 7 });
    expect(begin).toBe(8); expect(end).toBe(11); expect(end - begin).toBe(3); expect(-(end - begin)).toBe(-3);
  });
  it('SEM3.6_ROC: invert slide 79 levered ROE', () => {
    expect(f.calcRocFromLeverage({ roe: .24, debtEquity: .7, afterTaxDebtCost: .105 })).toBeCloseTo(.18441176470588236, 12);
  });
  it('SEM3.8_DDM: correct DIV0/DIV1 timing and new payout', () => {
    const g = f.calcImpliedDividendGrowth({ niLastYear: 60, payout: .6, equityValue: 396, costOfEquity: .2 });
    expect(g).toBeCloseTo(.1, 12);
    const roe = g / (1 - .6); expect(roe).toBeCloseTo(.25);
    const newG = f.calcDividendGrowth({ roe, payout: .5 }); expect(newG).toBeCloseTo(.125);
    const dividendNext = 60 * (1 + newG) * .5; expect(dividendNext).toBeCloseTo(33.75);
    expect(f.calcDdmGordon({ dividendNext, costOfEquity: .2, growth: newG, ratePeriod: 'year', growthPeriod: 'year' })).toBeCloseTo(450);
  });
  it.each([[1.5, .255, .1275, 169.125, 3979.4117647058815], [2, .29, .145, 171.75, 6870]])('SEM3.9_LEVERAGE_%s: constant-risk illustration only', (debtEquity, roeExpected, growthExpected, dividendExpected, valueExpected) => {
    const roe = f.calcRoeLeverage({ roc: .15, debtEquity, pretaxDebtCost: .1, taxRate: .2 }); expect(roe).toBeCloseTo(roeExpected);
    const growth = f.calcDividendGrowth({ roe, payout: .5 }); expect(growth).toBeCloseTo(growthExpected);
    const dividendNext = 300 * (1 + growth) * .5; expect(dividendNext).toBeCloseTo(dividendExpected);
    expect(f.calcDdmGordon({ dividendNext, costOfEquity: .17, growth, ratePeriod: 'year', growthPeriod: 'year' })).toBeCloseTo(valueExpected, 8);
  });
});

describe('Income, cash flow, and sign conventions', () => {
  it('negative NI remains a loss with no automatic tax credit', () => {
    const input = { revenue: 20, cogs: 30, sgaCash: 5, da: 5, interest: 2, taxRate: .2 };
    expect(() => f.calcIncomeStatement(input)).toThrow('налогового возмещения');
    expect(f.calcIncomeStatement({ ...input, taxLossTreatment: 'no-credit' }).ni).toBe(-22);
    expect(f.calcIncomeStatement({ ...input, taxLossTreatment: 'full-credit' }).ni).toBeCloseTo(-17.6);
  });
  it('NOPAT responds to tax changes without financing inputs', () => {
    expect(f.calcNopat({ ebit: 100, taxRate: 0 })).toBe(100);
    expect(f.calcNopat({ ebit: 100, taxRate: .3 })).toBe(70);
    expect(() => f.calcNopat({ ebit: 10, taxRate: 20 })).toThrow();
  });
  it('CFO adds cash released by falling AR and growing AP', () => {
    expect(f.calcCfoIndirect({ ni: 100, da: 20, deltaAr: 40, deltaInventory: 30, deltaAp: 10 })).toBe(60);
    expect(f.calcCfoIndirect({ ni: 80, da: 10, deltaAr: -5, deltaInventory: 0, deltaAp: 15 })).toBe(110);
    expect(f.calcCfoIndirect({ ni: -10, da: 5, deltaAr: 0, deltaInventory: 0, deltaAp: 0 })).toBe(-5);
  });
  it('FCFE removes after-tax interest and includes net borrowing only there', () => {
    expect(f.calcFcfe({ fcff: 34, interest: 15, taxRate: .2, netBorrowing: 50 })).toBe(72);
    expect(f.calcFcfe({ fcff: 34, interest: 15, taxRate: .2, netBorrowing: -10 })).toBe(12);
  });
  it('does not invent missing CapEx, NWC changes, borrowing, or accrued interest', () => {
    expect(() => f.calcFcff({ nopat: 100, da: 10, deltaOperatingNwc: 0 } as never)).toThrow();
    expect(() => f.calcFcff({ nopat: 100, da: 10, capex: 0 } as never)).toThrow();
    expect(() => f.calcFcfe({ fcff: 100, interest: 10, taxRate: .2 } as never)).toThrow();
    expect(() => f.calcIncomeStatement({ revenue: 100, cogs: 10, sgaCash: 10, da: 10, taxRate: .2 } as never)).toThrow();
  });
  it('allows negative operating NWC while refusing negative account balances', () => {
    expect(f.calcOperatingNwc({ ar: 5, inventory: 10, ap: 20 })).toBe(-5);
    expect(() => f.calcOperatingNwc({ ar: -5, inventory: 10, ap: 20 })).toThrow();
  });
  it.each([NaN, Infinity, -Infinity])('rejects non-finite input %s', value => {
    expect(() => f.calcFcff({ nopat: value, da: 10, deltaOperatingNwc: 0, capex: 0 })).toThrow();
  });
});

describe('Liquidity, operating cycle, and time consistency', () => {
  it('uses separately classified current, quick, and cash assets', () => {
    expect(f.calcCurrentRatio({ currentAssets: 120, currentLiabilities: 60 })).toBe(2);
    expect(f.calcQuickRatio({ quickAssets: 90, currentLiabilities: 60 })).toBe(1.5);
    expect(f.calcCashRatio({ cashAndEquivalents: 30, currentLiabilities: 60 })).toBe(.5);
  });
  it('computes period days without silently annualizing a quarter', () => {
    expect(f.calcDso({ balance: avg(20, 30), flow: 100, period: '2026', periodDays: 365 })).toBe(91.25);
    expect(f.calcDih({ balance: avg(20, 30, 'Q1'), flow: 100, period: 'Q1', periodDays: 90 })).toBe(22.5);
    expect(f.calcDpo({ balance: avg(20, 30, 'Q1'), flow: 50, period: 'Q1', periodDays: 90 })).toBe(45);
    expect(f.calcCcc({ dso: 30, dih: 40, dpo: 80, unit: 'days' })).toBe(-10);
  });
  it('rejects mismatched flows and stock period labels', () => {
    expect(() => f.calcDso({ balance: avg(20, 30, 'Q1'), flow: 100, period: '2026', periodDays: 365 })).toThrow('Периоды');
    expect(() => f.calcCcc({ dso: 1, dih: 1, dpo: 1, unit: 'months' } as never)).toThrow();
  });
  it('rejects undefined and zero liquidity/turnover denominators', () => {
    expect(() => f.calcCurrentRatio({ currentAssets: 1, currentLiabilities: 0 })).toThrow();
    expect(() => f.calcQuickRatio({ quickAssets: 1, currentLiabilities: 0 })).toThrow();
    expect(() => f.calcCashRatio({ cashAndEquivalents: 1, currentLiabilities: 0 })).toThrow();
    expect(() => f.calcDso({ balance: avg(1, 2), flow: 0, period: '2026', periodDays: 365 })).toThrow();
  });
});

describe('Profitability: numerator, balance basis, and leverage', () => {
  it('distinguishes average and opening denominators', () => {
    expect(f.calcRoa({ profit: 20, convention: 'NOPAT', assets: avg(100, 300), period: '2026' })).toBe(.1);
    expect(f.calcRoa({ profit: 20, convention: 'NI', assets: opening(100), period: '2026' })).toBe(.2);
    expect(f.calcRoc({ nopat: 104, investedCapital: opening(250), period: '2026' })).toBeCloseTo(.416);
  });
  it('requires declared basis and numerator', () => {
    expect(() => f.calcRoa({ profit: 20, assets: opening(100), period: '2026' } as never)).toThrow();
    expect(() => f.calcRoc({ nopat: 104, investedCapital: { opening: 250, period: '2026' }, period: '2026' } as never)).toThrow();
  });
  it('DuPont reconciles NI/Equity with the same average basis', () => {
    const input = { ni: 20, sales: 200, assets: avg(100, 100), equity: avg(40, 40), period: '2026' };
    expect(f.calcDupont(input)).toEqual({ margin: .1, turnover: 2, equityMultiplier: 2.5, roe: .5 });
    expect(f.calcDupont(input).roe).toBe(f.calcRoe(input));
    expect(() => f.calcDupont({ ...input, equity: opening(40) })).toThrow();
  });
  it('negative NI is valid, negative or zero equity is not interpretable as a normal ROE', () => {
    expect(f.calcRoe({ ni: -10, equity: opening(40), period: '2026' })).toBe(-.25);
    expect(() => f.calcRoe({ ni: 10, equity: opening(-40), period: '2026' })).toThrow();
    expect(() => f.calcRoe({ ni: 10, equity: opening(0), period: '2026' })).toThrow();
  });
  it('debt reduces ROE when operating return is below after-tax cost', () => {
    expect(f.calcRoeLeverage({ roc: .05, debtEquity: 1, pretaxDebtCost: .1, taxRate: .2 })).toBeCloseTo(.02);
    expect(f.calcInterestCoverage({ ebit: 130, interest: 15 })).toBeCloseTo(8.6666666667);
    expect(f.calcDebtEquity({ debt: 60, equity: 40 })).toBe(1.5);
    expect(() => f.calcInterestCoverage({ ebit: 130, interest: 0 })).toThrow();
    expect(() => f.calcDebtEquity({ debt: 60, equity: -40 })).toThrow();
  });
  it('EVA charges capital cost rather than treating accounting profit as value creation', () => {
    expect(f.calcEva({ nopat: 20, investedCapital: 200, wacc: .12 })).toBe(-4);
    expect(f.calcEbitdaMargin({ ebitda: -10, revenue: 100 })).toBe(-.1);
  });
});

describe('Growth domains and variance identities', () => {
  it.each([.1, .11])('rejects Gordon r <= g (%s)', growth => {
    expect(() => f.calcDdmGordon({ dividendNext: 10, costOfEquity: .1, growth, ratePeriod: 'year', growthPeriod: 'year' })).toThrow();
  });
  it('rejects rate-period mismatch and payout outside [0,1]', () => {
    expect(() => f.calcDdmGordon({ dividendNext: 10, costOfEquity: .1, growth: .05, ratePeriod: 'year', growthPeriod: 'month' })).toThrow();
    expect(() => f.calcDividendGrowth({ roe: .2, payout: 50 })).toThrow();
  });
  it('horizontal variance preserves undefined growth from a zero baseline', () => {
    expect(f.calcHorizontalVariance({ actual: 12, baseline: 10 })).toEqual({ absolute: 2, relative: .2 });
    expect(f.calcHorizontalVariance({ actual: 12, baseline: 0 })).toEqual({ absolute: 12, relative: null });
  });
  it('price + volume + interaction equals total revenue change', () => {
    const result = f.calcRevenuePriceVolumeVariance({ plannedPrice: 10, actualPrice: 12, plannedVolume: 100, actualVolume: 110 });
    expect(result).toEqual({ price: 200, volume: 100, interaction: 20, total: 320 });
    expect(result.price + result.volume + result.interaction).toBe(result.total);
  });
});
