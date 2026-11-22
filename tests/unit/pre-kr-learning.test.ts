import { describe, expect, it } from "vitest";
import { content, registry } from "../../src/runtime/t4-data";
import { t4LearningPaths, t4ProblemRequires, t4SkillIntroducedLesson, t4StageSkillIds, t4StageTheoryIds } from "../../src/content/t4/prerequisites";
import { buildErrorLog, targetedRetest, unseenHistory, remedyRouteFor } from "../../src/curriculum/errors";
import { blankProgress, type AnswerRecord, type Progress } from "../../src/storage/progress";
import { isSupportContext, isSupportTransition } from "../../src/pedagogy/return-context";
import { attemptContext } from "../../src/engine/grading/attempt";
import { answerFeedback } from "../../src/pedagogy/feedback";

function failed(id: string, stageId: string, version?: string): Progress {
  const p = content.problems.find(p => p.id === id)!;
  return {...blankProgress(), answers: [{id:"synthetic-failure",problemId:id,version:version ?? p.version,mode:"practice",timestamp:"2026-11-22T00:00:00Z",stageResults:[{id:stageId,correct:false,score:0,errorCode:stageId==="selection"?"CONCEPT":"VALUE"}],userResponse:{values:{},selected:[]},score:0,errorCodes:["VALUE"],verificationStatus:p.reviewStatus,problemSnapshot:{...p,version:version??p.version}} satisfies AnswerRecord]};
}
const error = (data: Progress) => buildErrorLog(data, registry)[0];

describe("T4 teaching prerequisites and reviewed explanations", () => {
  it.each(Object.entries(t4LearningPaths))("%s only requires skills introduced by this lesson", (lessonId, path) => {
    const index = content.lessons.findIndex(l => l.id === lessonId);
    expect(content.lessons[index].practiceIds).toEqual(path.practiceIds);
    for (const id of path.practiceIds) {
      const p = content.problems.find(p => p.id === id)!;
      expect(p.lessonId).toBe(lessonId); expect(p.topicId).toBe(lessonId);
      for (const skill of t4ProblemRequires[id]) {
        const introduced = content.lessons.findIndex(l => l.id === t4SkillIntroducedLesson[skill]);
        expect(introduced,`${id}/${skill}`).toBeGreaterThanOrEqual(0);
        expect(introduced,`${id}/${skill}`).toBeLessThanOrEqual(index);
      }
      for (const stage of p.independent?.stageIds ?? p.stages.map(s=>s.id))
        for (const skill of t4StageSkillIds[id]?.[stage] ?? t4ProblemRequires[id])
          expect(content.lessons.findIndex(l=>l.id===t4SkillIntroducedLesson[skill]),`${id}/${stage}/${skill}`).toBeLessThanOrEqual(index);
    }
  });
  it("checks every explicit help identifier against the actual formula or section graph", () => {
    for (const [id, stages] of Object.entries(t4StageTheoryIds)) for (const [stage, targets] of Object.entries(stages)) {
      for(const target of targets) expect(registry.formulas.some(f=>f.id===target)||registry.sections.some(s=>s.id===target),`${id}/${stage}/${target}`).toBe(true);
      const route=remedyRouteFor(id,registry,content.problems.find(p=>p.id===id),stage)!;
      expect(route.split("/")).toHaveLength(3);
      const [,lesson,anchor]=route.split("/");
      expect(content.lessons.find(l=>l.id===lesson)?.sections.some(s=>s.id===anchor||s.formulaIds?.includes(anchor)),route).toBe(true);
    }
  });
});

describe("error-specific next steps preserve attempt identity", () => {
  it("wrong C01 leads to the separate L2 cash timeline, not L3 synthesis", () => {
    const data=failed("T4-C01","selection"),before=JSON.stringify(data),next=targetedRetest(error(data),data,registry);
    expect(next?.id).toBe("T4-L2-01");expect(next?.difficulty).toBe("L2");expect(JSON.stringify(data)).toBe(before);
    expect(error(data).theoryRoute).toBe("learn/T4-01/incremental-flow");
  });
  it("wrong A03 nominal-rate has a precise formula and honest fallback when no rate-conversion counterpart exists", () => {
    const data=failed("T4-A03","nominal-rate");expect(targetedRetest(error(data),data,registry)).toBeNull();
    expect(error(data).theoryRoute).toBe("learn/T4-05/T4-F-INFLATION");
  });
  it("wrong A03 NPV offers actual inflation/NPV skills, not the real-price EAC context tag", () => {
    const data=failed("T4-A03","npv");expect(targetedRetest(error(data),data,registry)?.id).toBe("T4-A11");
    expect(error(data).theoryRoute).toBe("learn/T4-02/T4-F-NPV");
  });
  it("bank exhaustion returns no fictitious new task and retains the concrete reading route", () => {
    const data=failed("T4-C01","selection");data.exposures=Object.fromEntries(registry.problems.map(p=>[`${p.id}@${p.version}`,{firstSeenAt:"2026-11-22T00:00:00Z",assistanceUsed:false,modes:["practice" as const]}]));
    expect(targetedRetest(error(data),data,registry)).toBeNull();expect(error(data).theoryRoute).toBeTruthy();
  });
  it("reading lesson5 does not silently teach unread3/4", () => {
    const data=failed("T4-L2-02","npv");data.lessons={"T4-05@1.0.1":"2026-11-22T00:00:00Z"};
    data.exposures=Object.fromEntries(registry.problems.filter(p=>(p.requiredLessonIds??[p.lessonId]).every(id=>["T4-01","T4-02"].includes(id))).map(p=>[`${p.id}@${p.version}`,{firstSeenAt:"2026-11-22T00:00:00Z",assistanceUsed:false,modes:["practice" as const]}]));
    expect(targetedRetest(error(data),data,registry)).toBeNull();
  });
  it("a version bump is not an unseen economic situation", () => {
    const data=failed("T4-A01","npv","1.0.0");expect(unseenHistory(data,registry).seenKeys).toContain("T4-A01@1.0.1");
    expect(error(data).provenance).toBe("HISTORICAL_SNAPSHOT");expect(targetedRetest(error(data),data,registry)).toBeNull();
  });
  it("does not apply a reused current stage identifier to an older snapshot", () => {
    const data=failed("T4-A03","nominal-rate","0.9.0");Object.assign(data.answers[0].problemSnapshot as object,{lessonId:"T4-01",theorySectionId:"incremental-flow"});
    expect(error(data).theoryRoute).toBe("learn/T4-01/incremental-flow");
  });
  it("separates number feedback from selection feedback without showing internal codes", () => {
    const p=content.problems.find(p=>p.id==="T4-L2-02")!;
    expect(answerFeedback(p,"npv","VALUE").message).toContain("число");
    expect(answerFeedback(p,"npv","VALUE").firstStep).toBeTruthy();
    expect(answerFeedback(p,"selection","CONCEPT").message).toContain("вариант");
  });
});

describe("return button is scoped to a real task-to-explanation transition", () => {
  const context={route:"practice/T4-C01",problemId:"T4-C01",targetRoute:"learn/T4-01/incremental-flow"};
  it("remains within the same explanatory lesson anchors",()=>{expect(isSupportContext(context,"learn/T4-01/another-section")).toBe(true);});
  it("is hidden on independent home, catalog, another lesson and the task itself",()=>{for(const route of ["home/T4","catalog/T4","learn/T4-02","practice/T4-C01"])expect(isSupportContext(context,route)).toBe(false);});
  it("does not resurrect an imported legacy context missing its target",()=>{expect(isSupportContext({route:"practice/T4-C01",problemId:"T4-C01"},"learn/T4-01")).toBe(false);});
  it("supports module-qualified exam return routes",()=>{expect(isSupportContext({route:"exam/T4",problemId:"T4-A01",targetRoute:"learn/T4-03"},"learn/T4-03")).toBe(true);});
});

it("metadata-only revisions cannot regain first-independent or unassisted provenance", () => {
  const p=content.problems.find(p=>p.id==="T4-A01")!,data=failed(p.id,"npv","1.0.0"),before=JSON.stringify(data);
  data.exposures={"T4-A01@1.0.0":{firstSeenAt:"2026-11-01T00:00:00Z",modes:["study"],assistanceUsed:true}};
  const context=attemptContext(p,{values:{},selected:[]},"practice",data);
  expect(context.seenBefore).toBe(true);expect(context.firstIndependentAttempt).toBe(false);expect(context.assistanceUsed).toBe(true);
  expect(JSON.stringify(data.answers)).toBe(JSON.stringify(JSON.parse(before).answers));
});
it("the automatic current entry exposure alone does not erase a genuinely first independent attempt",()=>{
  const p=content.problems.find(p=>p.id==="T4-L2-01")!,data=blankProgress();
  data.exposures={[`${p.id}@${p.version}`]:{firstSeenAt:"2026-11-22T00:00:00Z",modes:["practice"],assistanceUsed:false}};
  const context=attemptContext(p,{values:{},selected:[]},"practice",data,false);
  expect(context.seenBefore).toBe(false);expect(context.firstIndependentAttempt).toBe(true);expect(context.assistanceUsed).toBe(false);
});

it("an imported context cannot revive from unrelated navigation, while actual task/help transitions remain valid",()=>{
  const context={route:"practice/T4-C01",problemId:"T4-C01",targetRoute:"learn/T4-01/incremental-flow"};
  expect(isSupportTransition(context,"progress","learn/T4-01")).toBe(false);
  expect(isSupportTransition(context,"practice/T4-C01","learn/T4-01/incremental-flow")).toBe(true);
  expect(isSupportTransition(context,"learn/T4-01/incremental-flow","learn/T4-01/another")).toBe(true);
  expect(isSupportTransition(context,"learn/T4-01","practice/T4-C01")).toBe(false);
});
