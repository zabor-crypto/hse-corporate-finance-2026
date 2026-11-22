import { expect, it } from "vitest";
import oracle from "../fixtures/pre-kr-independent-finance.json";
import { content } from "../../src/runtime/t4-data";
import { gradeWithUnits, unitPolicy } from "../../src/engine/grading/units";
import { annuityFactor, npv, equivalentAnnualValue } from "../../src/engine/investment";

it.each(oracle.l2)("$problemId/$stageId equals the independent condition-only fraction", row => {
  const p=content.problems.find(p=>p.id===row.problemId)!;
  expect(p.version).toBe(row.version);
  const stage=p.stages.find(s=>s.id===row.stageId)!;
  expect(stage.expected).toBe(Number(row.expected));
  expect(gradeWithUnits({response:row.expected,responseUnit:unitPolicy(stage.unit).referenceUnit,expected:stage.expected,referenceUnit:stage.unit,tolerance:stage.tolerance}).correct).toBe(true);
  expect(p.independent?.stageIds).not.toContain("irr");
});
it("checks the compact MPI example against the separate Fraction oracle and distinguishes the index from its excess",()=>{
  const input={A:{investment:26,years:3},B:{investment:39,years:5}};
  for(const [id,p] of Object.entries(input)){
    const af=annuityFactor(.1,p.years),value=npv([-p.investment,...Array(p.years).fill(12)],.1);
    const eaa=equivalentAnnualValue(value,.1,p.years),mpi=1+eaa/p.investment;
    const actual={AF:af,NPV:value,EAA:eaa,MPI:mpi,MPI_minus_1_percent:(mpi-1)*100};
    for(const [name,v] of Object.entries(actual))expect(v).toBeCloseTo(Number(oracle.mpi.find(r=>r.id===`MPI/${id}/${name}`)!.expected),10);
  }
  const lesson=content.lessons.find(l=>l.id==="T4-04")!;
  const text=JSON.stringify(lesson);
  expect(text).toContain("1,05942366");expect(text).toContain("5,94236579%");
  expect(text).toContain("16,60022516");expect(text).toContain("23,19767442");
  expect(text).toContain("тыс. ₽");expect(text).toContain("если ежегодные 300".replace("если","Если"));
});
