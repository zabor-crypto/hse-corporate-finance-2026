import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Exam, authorTimerRemaining, fixedExamComposition, parseExamSeed } from "../../src/views/Exam";
import { blankProgress } from "../../src/storage/progress";
import { emptyDraft } from "../../src/components/Common";
import { assemblePaper } from "../../src/curriculum/assembly";
import { activateModule, ensureModule } from "../../src/runtime";
import { blueprint, registry } from "../../src/runtime/t4-data";

afterEach(() => activateModule("T3"));
describe("voluntary training controls without progress migration", () => {
  it("rejects ambiguous seed text while retaining the supported integer boundaries", () => {
    expect(parseExamSeed("0")).toBe(0);
    expect(parseExamSeed("00017")).toBe(17);
    expect(parseExamSeed("4294967295")).toBe(4294967295);
    for (const raw of ["", " ", "1e3", "+1", "-1", "1.5", "4294967296", "NaN"])
      expect(() => parseExamSeed(raw)).toThrow("assembly identity");
  });
  it("recognizes fixed slots without implying that a different seed makes new conditions", () => {
    expect(fixedExamComposition(blueprint)).toBe(true);
    expect(fixedExamComposition({ ...blueprint, slots: [{ ...blueprint.slots[0], problemIds: ["a", "b"] }] })).toBe(false);
    const first = assemblePaper(registry, blueprint, 0, { seenKeys: [] }, "2026-11-01T00:00:00Z");
    const second = assemblePaper(registry, blueprint, 17, { seenKeys: [] }, "2026-11-01T00:00:00Z");
    expect(second.problemIds).toEqual(first.problemIds);
    expect(second.versions).toEqual(first.versions);
  });
  it("keeps an old paper and latest raw draft unchanged and editable without opting into a timer", async () => {
    await ensureModule("T4");
    activateModule("T4");
    const paper = assemblePaper(registry, blueprint, 17, { seenKeys: [] }, "2020-01-01T00:00:00Z");
    const data = blankProgress();
    const problemId = paper.problemIds[0];
    data.exam = { id: "old-paper", problemIds: paper.problemIds, versions: paper.versions, startedAt: "2020-01-01T00:00:00Z", paper };
    data.drafts[`exam:old-paper:${problemId}@${paper.versions[problemId]}`] = { ...emptyDraft(), workpad: "Мой старый ход решения" };
    const original = JSON.stringify(data);
    const html = renderToStaticMarkup(createElement(Exam, { data, update: () => { throw Error("SSR must not write"); } }));
    expect(html).toContain("Без ограничения времени");
    expect(html).not.toContain('role="timer"');
    expect(html).not.toContain("Ввод закрыт");
    expect(html).not.toMatch(/<(?:input|textarea|select)\b[^>]*\bdisabled=/);
    expect(html).toContain("Мой старый ход решения");
    expect(JSON.stringify(data)).toBe(original);
  });
  it("clamps the optional watch at zero; reaching zero does not alter a stored paper", () => {
    expect(authorTimerRemaining(0, 25, 1499000)).toBe(1);
    expect(authorTimerRemaining(0, 25, 1500000)).toBe(0);
    expect(authorTimerRemaining(0, 25, 1600000)).toBe(0);
  });
});
