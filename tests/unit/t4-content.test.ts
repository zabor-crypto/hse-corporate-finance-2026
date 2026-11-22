import {t4ReviewedVersions} from "../../src/content/t4/reviewed-versions";
import {createCurriculumRegistry} from "../../src/curriculum/factory";
import {describe,it,expect} from "vitest";
import independent from "../fixtures/t4-core-independent.json";
import {t4CoreProblems} from "../../src/content/t4";
import pack from "../../src/runtime/t4-pack";
import {gradeWithUnits,unitPolicy} from "../../src/engine/grading/units";
import {grade} from "../../src/components/Problem";
import {registryFindings} from "../../src/curriculum/integrity";
import {contentLinkFindings} from "../../src/curriculum/content-integrity";
import {assemblePaper,validPaperSnapshot} from "../../src/curriculum/assembly";

describe("Original T4 core — independently frozen solutions",()=>{
 it.each(independent.values)("$problemId/$stageId matches unseen independent calculation and unit",r=>{const p=t4CoreProblems.find(p=>p.id===r.problemId)!;const stage=p.stages.find(s=>s.id===r.stageId)!;expect(stage).toBeDefined();expect(stage.unit).toBe(r.unit);expect(stage.expected).toBeCloseTo(Number(r.expected),9);const policy=unitPolicy(r.unit);expect(gradeWithUnits({response:r.expected,responseUnit:policy.referenceUnit,expected:stage.expected,referenceUnit:stage.unit,tolerance:stage.tolerance}).correct).toBe(true);});
 it.each(independent.selections)("$id has independently reviewed exact selection set",r=>{const p=t4CoreProblems.find(p=>p.id===r.id)!;expect([...(p.correctOptionIds??[])].sort()).toEqual([...r.selected].sort());expect(p.options).toHaveLength(r.allOptionsReviewed);});
 it("retains explicit skills, source versions and module links",()=>{expect(registryFindings(pack.registry)).toEqual([]);expect(contentLinkFindings(pack.content,pack.registry)).toEqual([]);expect(pack.registry.modules.map(m=>m.id)).toEqual(["T4"]);expect(pack.content.problems.every(p=>p.sourceRefs.every(s=>!!s.sourceVersionId))).toBe(true);expect(pack.registry.sourceVersions.every(s=>!s.asset?.endsWith('.pdf'))).toBe(true);});
 it("assembles a reproducible author mock and grades only final independent targets",()=>{const b=pack.registry.blueprints.find(b=>b.id==="T4-MOCK-CORE")!;const paper=assemblePaper(pack.registry,b,20261121,{seenKeys:[]},"2026-11-21T00:00:00Z");expect(validPaperSnapshot(paper)).toBe(true);expect(paper.problemIds).toHaveLength(6);for(const id of paper.problemIds){const p=pack.content.problems.find(p=>p.id===id)!;const rows=independent.values.filter(r=>r.problemId===id);const selection=independent.selections.find(r=>r.id===id);const draft={values:Object.fromEntries(rows.map(r=>[r.stageId,r.expected])),units:Object.fromEntries(rows.map(r=>[r.stageId,unitPolicy(r.unit).referenceUnit])),selected:selection?.selected??[]};const result=grade(p,draft,"exam");expect(result.score,id).toBe(1);expect(result.assessedStageIds).toEqual(p.options?["selection"]:p.independent?.stageIds);}});
 it("does not transfer earned approval to changed source versions",()=>{for(const kind of ["lessons","formulas","problems"] as const){const modified={...pack.content,[kind]:pack.content[kind].map((x,i)=>i?x:{...x,version:"99.0.0"})};const r=createCurriculumRegistry(modified,{modules:pack.registry.modules,sourceVersions:pack.registry.sourceVersions,reviewedLessonVersions:t4ReviewedVersions.lessons,reviewedFormulaVersions:t4ReviewedVersions.formulas,reviewedProblemVersions:t4ReviewedVersions.problems});expect(r[kind][0].reviewStatus).toBe("DRAFT");expect(r[kind][0].availability).toBe("unavailable");}});

});
