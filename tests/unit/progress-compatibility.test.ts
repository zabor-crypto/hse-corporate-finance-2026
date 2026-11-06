import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { blankProgress, loadProgress, mergeProgress, validProgress, currentAnswers } from '../../src/storage/progress';
import type { Progress } from '../../src/storage/progress';
const bytes = readFileSync(new URL('../fixtures/baseline-v1-progress.json', import.meta.url), 'utf8');
const baseline = JSON.parse(bytes) as Progress;
const provenance = JSON.parse(readFileSync(new URL('../fixtures/baseline-provenance.json', import.meta.url), 'utf8'));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('pre-update schema1 evidence compatibility', () => {
  it('retains the exact synthetic baseline fixture bytes and nine original answer records', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(provenance.sha256);
    expect(baseline.schemaVersion).toBe(1); expect(baseline.answers).toHaveLength(9); expect(validProgress(baseline)).toBe(true);
    let writes = 0;
    const restored = loadProgress({ getItem: () => bytes, setItem: () => { writes++; } });
    expect(restored.blocked).toBe(false); expect(restored.data).toEqual(baseline); expect(writes).toBe(0);
  });
  it('preserves pre-update answer payloads, grades, snapshots and mode isolation on import', () => {
    const merged = mergeProgress(blankProgress(), baseline);
    expect(merged.answers).toEqual(baseline.answers);
    expect(merged.answers.filter(a => a.mode === 'practice')).toHaveLength(2);
    expect(merged.answers.filter(a => a.mode === 'exam')).toHaveLength(7);
    expect(merged.answers.filter(a => a.mode === 'study')).toHaveLength(0);
    const second = mergeProgress(merged, baseline); expect(second.answers).toEqual(baseline.answers);
  });
  it('keeps historical versions valid while withholding automatic credit for the new version', () => {
    const old = clone(baseline); old.answers[0].version = '0.9.0';
    (old.answers[0].problemSnapshot as { version: string }).version = '0.9.0';
    expect(validProgress(old)).toBe(true);
    const merged = mergeProgress(blankProgress(), old);
    expect(merged.answers).toHaveLength(9);
    expect(currentAnswers(merged, 'practice', { 'T3-Q06': '1.0.0' })).toHaveLength(1);
    expect(merged.answers.find(a => a.version === '0.9.0')).toEqual(old.answers[0]);
  });
  it('does not silently reset an imported active exam with older task versions', () => {
    const old = clone(baseline); delete old.exam!.finishedAt; old.exam!.versions['T3-Q01'] = '0.9.0';
    expect(validProgress(old)).toBe(true);
    const merged = mergeProgress(blankProgress(), old);
    expect(merged.exam).toEqual(old.exam); expect(merged.drafts).toEqual(old.drafts); expect(merged.answers).toEqual(old.answers);
  });
  it('rejects corrupt nested data and unsupported schemas without changing existing baseline bytes', () => {
    for (const payload of [{ ...baseline, schemaVersion: 99 }, { ...baseline, answers: [{ ...baseline.answers[0], problemSnapshot: null }] }]) {
      let writes = 0; const original = JSON.stringify(payload);
      const restored = loadProgress({ getItem: () => original, setItem: () => { writes++; } });
      expect(restored.blocked).toBe(true); expect(restored.raw).toBe(original); expect(writes).toBe(0);
      expect(() => mergeProgress(baseline, payload)).toThrow();
      expect(baseline).toEqual(JSON.parse(bytes));
    }
  });
});
