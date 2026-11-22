import {t3TeachingPaths} from "../pedagogy/t3-path";
import {topics,lessons,formulas,problems,seminarMap,sampleExamIds} from "../content";
import {curriculumRegistry,createCurriculumRegistry} from "../curriculum";
import {reviewLedger} from "../curriculum/review-ledger";
import {t3HorizontalVerticalProblems} from "../content/t3-horizontal-vertical";
const additions=t3HorizontalVerticalProblems.map(p=>({...p,reviewStatus:(p.id==="T3-HV01"&&p.version==="1.0.0"?"CONTENT_REVIEWED":"CONTENT_REVIEW_PENDING") as "CONTENT_REVIEWED"|"CONTENT_REVIEW_PENDING",oracleId:"T3-HV-INDEPENDENT-FRACTION-V1"}));
// Live view: keep every legacy object and observe later adapter additions without mutating its124-row array.
const runtimeProblems=()=>[...problems,...additions];
const runtimeRegistry=createCurriculumRegistry({topics,lessons,formulas,problems:runtimeProblems()},{blueprints:curriculumRegistry.blueprints,reviewedProblemVersions:{...reviewLedger.problems,"T3-HV01":"1.0.0"}});
export const content={topics,lessons,formulas,get problems(){return runtimeProblems();},seminarMap,sampleExamIds};
export const registry=runtimeRegistry;

const reviewedPathVersions:Record<string,string>={"T3-01": "1.0.0", "T3-02": "1.0.0", "T3-03": "1.0.0", "T3-04": "1.0.0", "T3-05": "1.0.0", "T3-06": "1.0.0", "T3-07": "1.0.0", "T3-08": "1.0.0", "T3-09": "1.0.0", "T3-10": "1.0.0", "T3-11": "1.0.0"};
for(const path of Object.values(t3TeachingPaths))if(reviewedPathVersions[path.lessonId]!==path.version)throw Error(`Основной маршрут ${path.lessonId}@${path.version} требует независимой приёмки`);
export const teachingPaths=t3TeachingPaths;
