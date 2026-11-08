import { describe, expect, it } from 'vitest';
import { c3Problems } from '../../src/content/c3-questions';
import { c3Lessons } from '../../src/content/c3-lessons';
import { c3Formulas } from '../../src/content/c3-formulas';
import { formulas } from '../../src/content/formulas';
import { ratiosFormulas } from '../../src/content/ratios-formulas';
import { liquidityFormulas } from '../../src/content/liquidity-formulas';
import { equityCashFormula } from '../../src/content/equity-cash-formula';

function key(problem: string, stage: string) {
  const value = c3Problems.find(p => p.id === problem)?.stages.find(s => s.id === stage)?.expected;
  expect(value, `${problem}/${stage}`).toBeTypeOf('number');
  return value!;
}

describe('source-grounded C3 authored cases', () => {
  it('keeps the inverse manufacturing route consistent with the material ledger', () => {
    const produced = 110 + 24 - 16;
    const currentProductionCost = produced + 14 - 10;
    const materialsUsed = currentProductionCost - 28 - 24;
    const purchases = materialsUsed + 13 - 18;
    expect(18 + purchases).toBe(materialsUsed + 13);
    expect(key('C3-Q02', 'purchases')).toBe(purchases);
    expect(key('C3-Q02', 'ebitda')).toBe(200 - 110 - 30 + 7 + 3);
    expect(key('C3-Q02', 'ni')).toBe((200 - 110 - 30 - 12) * .75);
  });

  it('reconciles different capital claims and dividends through two cash routes', () => {
    const ni = 50, da = 12, interest = 10, tax = .25;
    const nwcChange = 14 - 3 - (-5);
    const cfo = ni + da - nwcChange;
    const fcff = ni + interest * (1 - tax) + da - nwcChange - 30;
    const fcfe = fcff - interest * (1 - tax) + 18 - 6;
    expect(key('C3-Q04', 'cfo')).toBe(cfo);
    expect(key('C3-Q04', 'fcff')).toBe(fcff);
    expect(key('C3-Q04', 'fcfe')).toBe(fcfe);
    expect(key('C3-Q04', 'cash')).toBe(12 + cfo - 30 + 18 - 6 - 8);
    expect(key('C3-Q04', 'cash')).toBe(12 + fcfe - 8);
  });

  it('uses the already-forward dividend once in the reverse DDM case', () => {
    const g = .115 - 6 / 80;
    expect(key('C3-Q08', 'growth')).toBeCloseTo(100 * g, 10);
    expect(key('C3-Q08', 'payout')).toBeCloseTo(100 * (1 - g / .16), 10);
    expect(6 / (.115 - g)).toBeCloseTo(80, 10);
  });

  it('checks revenue and profit effects independently of their named decomposition', () => {
    const revenueDelta = 9000 * 1450 - 8000 * 1500;
    const actualEbit = 9000 * (1450 - 920) - 3000000;
    expect(key('C3-Q10', 'revenue-change')).toBe(revenueDelta / 1e6);
    expect(key('C3-Q10', 'actual-ebit')).toBe(actualEbit / 1e6);
    expect(key('C3-Q10', 'unit-cost-impact')).toBe(-9000 * (920 - 900) / 1e6);
    expect(8000 * (1500 - 900) - 2800000 + 600000 - 450000 - 180000 - 200000).toBe(actualEbit);
  });

  it('distinguishes actual product mix from a one-product interaction', () => {
    const planned = 100 * 40 + 100 * 100;
    const control = 110 * 40 + 110 * 100;
    const actual = 150 * 40 + 70 * 100;
    expect(key('C3-Q11', 'actual-ebit')).toBe((actual - 6000) / 1000);
    expect(key('C3-Q11', 'volume-impact')).toBe((control - planned) / 1000);
    expect(key('C3-Q11', 'mix-impact')).toBe((actual - control) / 1000);
    expect(actual - planned).toBe((control - planned) + (actual - control));
  });

  it('resolves authored references and explicit family provenance', () => {
    const allFormulas = [...formulas, ...ratiosFormulas, ...liquidityFormulas, equityCashFormula, ...c3Formulas];
    const formulaIds = new Set(allFormulas.map(f => f.id));
    expect(formulaIds.size).toBe(allFormulas.length);
    const problemIds = new Set(c3Problems.map(p => p.id));
    for (const lesson of c3Lessons) {
      for (const id of lesson.practiceIds ?? []) expect(problemIds.has(id), id).toBe(true);
      for (const section of lesson.sections) {
        for (const id of section.formulaIds ?? []) expect(formulaIds.has(id), id).toBe(true);
      }
    }
    for (const problem of c3Problems) {
      expect(problem.transfer?.familyId).toBeTruthy();
      for (const id of problem.formulaIds) expect(formulaIds.has(id), id).toBe(true);
      for (const id of problem.independent?.stageIds ?? []) expect(problem.stages.some(s => s.id === id), id).toBe(true);
    }
    expect(c3Problems.find(p => p.id === 'C3-Q01')?.transfer?.familyId).toBe(c3Problems.find(p => p.id === 'C3-Q02')?.transfer?.familyId);
  });
});
