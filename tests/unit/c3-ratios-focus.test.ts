import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { problems, lessons, formulas } from "../../src/content";
import { c3Blueprints } from "../../src/curriculum/blueprints";
import { c3RatiosFocusBlueprint as focus } from "../../src/curriculum/c3-ratios-focus";
import { curriculumRegistry, assemblePaper } from "../../src/curriculum";
import { gradeWithUnits } from "../../src/engine/grading/units";
import { gradeAttempt } from "../../src/engine/grading/attempt";
import { blankProgress, mergeProgress, validProgress } from "../../src/storage/progress";
import preimage from "../fixtures/c3-pre-delta-object-hashes.json";
import independent from "../fixtures/c3-ratios-focus-independent-oracles.json";
import probes from "../fixtures/c3-ratios-focus-grading-probes.json";
import baselineOracle from "../fixtures/c3-independent-oracles.json";
import legacy from "../fixtures/baseline-v1-progress.json";
const canonical = (x: unknown) => JSON.stringify(x, (_, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const hash = (x: unknown) => createHash("sha256").update(canonical(x)).digest("hex");
const ids = Array.from({ length: 6 }, (_, i) => `C3-RF0${i + 1}`);
const time = "2026-11-08T12:00:00Z";
describe("ratios focus additive review boundary", () => {
    it("preserves every accepted 118 problem, 11 lesson, 51 formula and six blueprint object", () => {
        for (const [kind, bank] of Object.entries({ problems, lessons, formulas, blueprints: c3Blueprints })) {
            const old = preimage[kind as keyof Pick<typeof preimage, "problems" | "lessons" | "formulas" | "blueprints">];
            for (const [id, sha] of Object.entries(old)) {
                const value = bank.find(x => x.id === id);
                expect(value, `${kind}/${id}`).toBeDefined();
                expect(hash(value), `${kind}/${id}`).toBe(sha);
            }
        }
        expect(problems.filter(p => !Object.hasOwn(preimage.problems, p.id)).map(p => p.id)).toEqual(ids);
        expect(c3Blueprints.filter(b => !Object.hasOwn(preimage.blueprints, b.id))).toEqual([focus]);
    });
    it("assembles exactly four calculation models plus one single and one multi, with honest aliases", () => {
        expect(focus.version).toBe("1.0.0");
        expect(focus.reviewStatus).toBe("PUBLISHED");
        expect(focus.minutes).toBe(30);
        expect(focus.unseenPolicy).toBe("prefer");
        expect(focus.eligiblePool).toEqual(ids.map(problemId => ({ problemId, version: "1.0.0" })));
        for (const seed of [0, 1, 17, 20261107, 4294967295]) {
            const paper = assemblePaper(curriculumRegistry, focus, seed, { seenKeys: [] }, time);
            expect(paper.problemIds).toEqual(ids);
            expect(new Set(paper.familyIds).size).toBe(6);
            expect(paper.familyIds).toEqual(["returns-rebuild", "C3-reverse-gross-roc", "liquidity-cycle", "payout-growth", "T3-Q29", "T3-Q19"]);
            expect(paper.blueprint).toEqual(focus);
            expect(assemblePaper(curriculumRegistry, focus, seed, { seenKeys: [] }, time)).toEqual(paper);
            const bank = paper.problemIds.map(id => curriculumRegistry.problems.find(p => p.id === id)!);
            expect(bank.map(p => p.kind)).toEqual(["steps", "steps", "steps", "steps", "single", "multi"]);
            for (const p of bank) {
                expect(p.availability).toBe("available");
                expect(p.reviewStatus).toBe("PUBLISHED");
                expect(p.version).toBe("1.0.0");
            }
        }
        const seen = ids.map(id => `${id}@1.0.0`);
        expect(assemblePaper(curriculumRegistry, focus, 17, { seenKeys: seen }, time).problemIds).toEqual(ids);
        expect(() => assemblePaper(curriculumRegistry, { ...focus, unseenPolicy: "require" }, 17, { seenKeys: seen }, time)).toThrow(/Insufficient/);
        const changed = structuredClone(curriculumRegistry);
        changed.problems.find(p => p.id === ids[0])!.version = "99.0.0";
        expect(() => assemblePaper(changed, focus, 17, { seenKeys: [] }, time)).toThrow();
    });
    it("requires independently specified final output subsets, never all guided stages in exam", () => {
        expect(independent.problems.reduce((n, p) => n + Object.keys(p.stages).length, 0)).toBe(20);
        expect(independent.problems.reduce((n, p) => n + p.independentStageIds.length, 0)).toBe(12);
        for (const expected of independent.problems) {
            const actual = problems.find(p => p.id === expected.id)!;
            expect(actual.independent!.stageIds).toEqual(expected.independentStageIds);
            if (expected.correctOptionIds)
                expect([...actual.correctOptionIds!].sort()).toEqual([...expected.correctOptionIds].sort());
        }
    });
    it("executes 114 independent rounded,wrong-sign and inside/outside tolerance probes via actual unit grader", () => {
        expect(probes.probes).toHaveLength(114);
        for (const p of probes.probes) {
            const s = problems.find(q => q.id === p.problemId)!.stages.find(s => s.id === p.stageId)!;
            expect(s.unit).toBe(p.referenceUnit);
            expect(s.tolerance).toBe(p.tolerance);
            expect(Math.abs(s.expected - p.expectedNumeric)).toBeLessThan(1e-10);
            const result = gradeWithUnits({ response: String(p.response).replace(".", ","), responseUnit: p.responseUnit, expected: s.expected, referenceUnit: s.unit, tolerance: s.tolerance });
            expect(result.correct, `${p.problemId}/${p.stageId}/${p.label}`).toBe(p.expectedAccepted);
        }
    });
    it("rejects missing/extra multi answers and retains legacy grades beside a new versioned paper", () => {
        const multi = problems.find(p => p.id === "C3-RF06")!;
        for (const selected of [["A", "B"], ["A", "B", "C", "D"]])
            expect(gradeAttempt(multi, { values: {}, selected }, "exam").score).toBe(0);
        expect(gradeAttempt(multi, { values: {}, selected: ["D", "B", "A"] }, "exam").score).toBe(1);
        const data = mergeProgress(blankProgress(), legacy);
        const prior = JSON.stringify(data.answers);
        const paper = assemblePaper(curriculumRegistry, focus, 17, { seenKeys: [] }, time);
        data.exam = { id: "synthetic-ratios-focus", problemIds: paper.problemIds, versions: paper.versions, startedAt: time, paper };
        expect(validProgress(data)).toBe(true);
        const copy = mergeProgress(blankProgress(), JSON.parse(JSON.stringify(data)));
        expect(copy.exam).toEqual(data.exam);
        expect(JSON.stringify(copy.answers)).toBe(prior);
        const bad = structuredClone(data);
        bad.exam!.versions = { ...bad.exam!.versions, [ids[0]]: "99.0.0" };
        expect(validProgress(bad)).toBe(false);
        expect(() => mergeProgress(data, bad)).toThrow();
        expect(JSON.stringify(data.answers)).toBe(prior);
    });
    it("combiner preserves 118 default mode and extends only from the separate independent fixture", () => {
        const dir = mkdtempSync(join(tmpdir(), "cflos-ratios-oracle-"));
        try {
            const generated = join(dir, "independent.json");
            execFileSync("python3", ["tests/review/c3-ratios-focus-oracle.py", "--check", "tests/fixtures/c3-ratios-focus-independent-oracles.json", "--output", generated]);
            expect(readFileSync(generated).equals(readFileSync("tests/fixtures/c3-ratios-focus-independent-oracles.json"))).toBe(true);
            const output = join(dir, "combined.json");
            const args = ["tests/review/c3-combine-independent-oracles.py", "tests/fixtures", "tests/fixtures/c3-independent-oracles.json", output];
            execFileSync("python3", args);
            const base = JSON.parse(readFileSync(output, "utf8"));
            expect(base.problems).toEqual(baselineOracle.problems);
            execFileSync("python3", [...args, "--extension", "tests/fixtures/c3-ratios-focus-independent-oracles.json"]);
            const current = JSON.parse(readFileSync(output, "utf8"));
            expect(current.problems.slice(0, 118)).toEqual(baselineOracle.problems);
            expect(current.counts).toMatchObject({ problems: 124, numericStages: 413, MCkeys: 53 });
            expect(current.problems.slice(118).map((p: {
                id: string;
            }) => p.id)).toEqual(ids);
        }
        finally {
            rmSync(dir, { recursive: true });
        }
    });
});
