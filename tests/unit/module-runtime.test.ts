import { describe, it, expect } from "vitest";
import { topics, lessons, formulas, problems } from "../../src/content";
import {
  createCurriculumRegistry,
  curriculumRegistry,
} from "../../src/curriculum";
import { createCurriculumRegistry as pureRegistry } from "../../src/curriculum/factory";
import {
  activateModule,
  getActivePack,
  getLoadedPacks,
  moduleIdFromRoute,
  ensureModule,
  moduleManifest,
} from "../../src/runtime";
import { parseRatioInput } from "../../src/views/RatioLab";
describe("module isolation and raw ratio inputs", () => {
  it("keeps original references and ensureModule does not activate a loaded pack", async () => {
    activateModule("T3");
    const previous = getActivePack();
    await ensureModule("T3");
    expect(getActivePack().id).toBe(previous.id);
    const rich=getLoadedPacks().find(p=>p.id==="T3")!;
    // The reviewed supplement is a live view; the original124-row adapter is unchanged.
    expect(rich.content.problems.slice(0,problems.length)).toEqual(problems);
    problems.forEach((p,i)=>expect(rich.content.problems[i]).toBe(p));
    expect(rich.content.lessons).toBe(lessons);
    expect(rich.content.problems.some(p=>p.id==="T3-HV01")).toBe(true);
    const fixture={...problems[0],id:"TEST-LATE-UNPUBLISHED"};
    try{problems.push(fixture);expect(rich.content.problems.includes(fixture)).toBe(true);}
    finally{problems.pop();}
    expect(curriculumRegistry.problems.some(p=>p.id==="T3-HV01")).toBe(false);
  });
  it("pure factory cannot accidentally publish unreviewed T4 with T3 defaults", () => {
    const r = pureRegistry({ topics, lessons, formulas, problems });
    expect(r.sourceVersions).toEqual([]);
    expect(r.modules).toEqual([]);
    expect(r.problems.every((p) => p.reviewStatus === "DRAFT")).toBe(true);
  });
  it("explicit reviewed ID options still override the legacy review ledger", () => {
    const r = createCurriculumRegistry(
      { topics, lessons, formulas, problems },
      {
        reviewedLessonIds: [],
        reviewedFormulaIds: [],
        reviewedProblemVersions: {},
      },
    );
    expect(r.lessons.every((l) => l.reviewStatus === "DRAFT")).toBe(true);
    expect(r.problems.every((p) => p.reviewStatus === "DRAFT")).toBe(true);
  });
  it("preserves old route ownership while mapping new prefixes", () => {
    expect(moduleIdFromRoute("exam", undefined, "T4")).toBe("T3");
    expect(moduleIdFromRoute("practice", undefined, "T4")).toBe("T3");
    expect(moduleIdFromRoute("practice", "T4-A01")).toBe("T4");
    expect(moduleIdFromRoute("formulas", "ccc", "T4")).toBe("T3");
    expect(moduleIdFromRoute("learn", "C3-R01")).toBe("T3");
  });
  it("parses completed decimal comma/Unicode minus without converting incomplete input to zero", () => {
    expect(parseRatioInput("1.")).toBe(1);
    expect(parseRatioInput("1,2")).toBe(1.2);
    expect(parseRatioInput("−1,2")).toBe(-1.2);
    for (const raw of ["", "-", "−", ",", ".", "1..2", "1e2"])
      expect(Number.isNaN(parseRatioInput(raw))).toBe(true);
  });
});

it("routes synthetic future module prefixes without publishing or loading a fake course", () => {
  const originalLength = moduleManifest.length;
  moduleManifest.push({
    id: "T5",
    title: "Synthetic route-only fixture",
    primaryLessonId: "T5-01",
    problemPrefix: "CASE5-",
    formulaPrefix: "FORM5-",
  });
  try {
    expect(moduleIdFromRoute("learn", "T5-01", "T3")).toBe("T5");
    expect(moduleIdFromRoute("practice", "CASE5-A01", "T4")).toBe("T5");
    expect(moduleIdFromRoute("formulas", "FORM5-npv", "T3")).toBe("T5");
    expect(moduleIdFromRoute("practice", "C3-RF03", "T5")).toBe("T3");
    expect(moduleIdFromRoute("formulas", "ccc", "T5")).toBe("T3");
  } finally {
    moduleManifest.splice(originalLength);
  }
});
