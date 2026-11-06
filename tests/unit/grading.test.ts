import { describe, expect, it } from 'vitest';
import { gradeNumeric, gradeSelection, gradeStages, parseNumeric } from '../../src/engine/grading';

describe('Numeric response parsing', () => {
  it.each([['34', 34], ['−3', -3], [' +3,5 ', 3.5], ['1 234,56', 1234.56], ['1\u202f234.56', 1234.56], ['.5', .5], ['1e-3', .001]])('parses %s', (response, expected) => { expect(parseNumeric(response as string)).toBe(expected); });
  it.each(['', ' ', 'Infinity', 'NaN', '34 руб', '20%', '1,2,3', '1.2.3', '0x10', '1 2', '3\n4'])('rejects ambiguous or nonnumeric %s', response => { expect(parseNumeric(response)).toBe(null); });
});
const spec = { expected: -3, absoluteTolerance: .01, responseUnit: 'million_RUB', expectedUnit: 'million_RUB' };
describe('Objective numeric grading', () => {
  it('applies signed answers, tolerance boundaries, and decimal comma', () => {
    expect(gradeNumeric({ ...spec, response: '-3,01' }).correct).toBe(true);
    expect(gradeNumeric({ ...spec, response: '-3.011' }).correct).toBe(false);
    expect(gradeNumeric({ ...spec, response: '3' }).errorCode).toBe('SIGN');
  });
  it('requires unit agreement and rejects blank input', () => {
    expect(gradeNumeric({ ...spec, response: '-3', responseUnit: 'RUB' }).errorCode).toBe('UNIT');
    expect(gradeNumeric({ ...spec, response: '' }).errorCode).toBe('INVALID_NUMBER');
  });
  it('combines absolute and relative tolerances explicitly', () => {
    expect(gradeNumeric({ ...spec, expected: 100, response: '100.5', relativeTolerance: .01 }).correct).toBe(true);
    expect(() => gradeNumeric({ ...spec, response: '-3', absoluteTolerance: -1 })).toThrow();
  });
});

describe('Single and multi select', () => {
  it('grades exact sets only, independent of order', () => {
    expect(gradeSelection(['b', 'a'], ['a', 'b'], 'multi').score).toBe(1);
    expect(gradeSelection(['a'], ['a', 'b'], 'multi').score).toBe(0);
    expect(gradeSelection(['a', 'b', 'c'], ['a', 'b'], 'multi').score).toBe(0);
    expect(gradeSelection(['a', 'a'], ['a'], 'multi').score).toBe(0);
    expect(gradeSelection(['a', 'b'], ['a'], 'single').score).toBe(0);
    expect(gradeSelection(['a'], ['a'], 'single').score).toBe(1);
  });
  it('rejects invalid answer keys', () => {
    expect(() => gradeSelection(['a'], ['a', 'b'], 'single')).toThrow();
    expect(() => gradeSelection(['a'], [], 'multi')).toThrow();
  });
});

describe('Independent stage partial credit', () => {
  it('weights checked steps without allowing one wrong dependent final to erase correct steps', () => {
    const result = gradeStages([
      { id: 'nwc0', result: gradeNumeric({ ...spec, expected: 8, response: '8' }), weight: 1 },
      { id: 'nwc1', result: gradeNumeric({ ...spec, expected: 11, response: '11' }), weight: 1 },
      { id: 'impact', result: gradeNumeric({ ...spec, response: '3' }), weight: 2 },
    ]);
    expect(result.score).toBe(.5); expect(result.correct).toBe(false); expect(result.errorCodes).toEqual(['SIGN']);
  });
  it('rejects empty, duplicated or nonpositive stages', () => {
    expect(() => gradeStages([])).toThrow();
    expect(() => gradeStages([{ id: 'a', result: { correct: true, score: 1, errorCode: null }, weight: 0 }])).toThrow();
  });
});
