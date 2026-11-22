import {t4ReviewedVersions} from "../content/t4/reviewed-versions";
import {createCurriculumRegistry} from "../curriculum/factory";
import type {Competency} from "../curriculum/types";
import {t4CoreLessons,t4CoreFormulas,t4CoreProblems,t4CoreBlueprint,t4AdvancedLessons,t4AdvancedFormulas,t4AdvancedProblems,t4TransferProblems,t4L2Problems,t4SkillIntroducedLesson,t4ProblemRequires,t4StageSkillIds,t4StageTheoryIds,t4DecisionsBlueprint,t4SkillTitles,t4ProblemSkills,t4SeminarMap} from "../content/t4";
// Exact accepted versions are registered here after the independent review receipt is frozen.
// This is local curriculum availability, not authorization to publish a release.
const lessons=[...t4CoreLessons,...t4AdvancedLessons];
const formulas=[...t4CoreFormulas,...t4AdvancedFormulas];
const problems=[...t4CoreProblems,...t4AdvancedProblems,...t4TransferProblems,...t4L2Problems].map(p=>({...p,reviewStatus:(t4ReviewedVersions.problems[p.id as keyof typeof t4ReviewedVersions.problems]===p.version?"CONTENT_REVIEWED":"CONTENT_REVIEW_PENDING") as "CONTENT_REVIEWED"|"CONTENT_REVIEW_PENDING",oracleId:p.id.startsWith("T4-L2-")?`T4-PRE-KR-INDEPENDENT-L2:${p.id}`:`T4-INDEPENDENT-DECIMAL65:${p.id}`}));
const blueprint={...t4CoreBlueprint,reviewStatus:(t4ReviewedVersions.blueprints[t4CoreBlueprint.id as keyof typeof t4ReviewedVersions.blueprints]===t4CoreBlueprint.version?"PUBLISHED":"DRAFT") as "PUBLISHED"|"DRAFT"};
const decisions={...t4DecisionsBlueprint,reviewStatus:(t4ReviewedVersions.blueprints[t4DecisionsBlueprint.id as keyof typeof t4ReviewedVersions.blueprints]===t4DecisionsBlueprint.version?"PUBLISHED":"DRAFT") as "PUBLISHED"|"DRAFT"};
const topics=lessons.map((l,i)=>({id:l.id,title:l.title,summary:l.summary,status:"implemented" as const,outcomes:l.outcomes,prerequisites:i?[lessons[i-1].id]:[],lessonIds:[l.id],questionIds:problems.filter(p=>p.lessonId===l.id).map(p=>p.id),seminarIds:[...new Set(l.sourceRefs.flatMap(s=>s.seminar?[s.seminar]:[]))],sourceRefs:l.sourceRefs}));
const content={topics,lessons,formulas,problems,sampleExamIds:blueprint.slots.flatMap(s=>s.problemIds??[]),seminarMap:t4SeminarMap};
const registry=createCurriculumRegistry(content,{
 modules:[{id:"T4",title:"Инвестиционная оценка и выбор проекта",lessonIds:lessons.map(l=>l.id)}],
 reviewedLessonVersions:t4ReviewedVersions.lessons,reviewedFormulaVersions:t4ReviewedVersions.formulas,reviewedProblemVersions:t4ReviewedVersions.problems,blueprints:[blueprint,decisions],
 authorSourceVersionIds:["ORIGINAL_T4_V1"],sourceForKind:{original:"ORIGINAL_T4_V1",lecture:"LECTURE_T4_2026_11_16",seminar:"SEMINAR4_2026_11_09"},
 sourceVersions:[{id:"LECTURE_T4_2026_11_16",version:"1.0.0",label:"Инвестиционная оценка, слайды101–115; частный источник преподавателя",visibility:"private",sha256:"2d2a9dfe9e3535374ffab7e561ecb50f5c752a56b5501fd0fb395084ffe23fac"},{id:"SEMINAR4_2026_11_09",version:"1.0.0",label:"Семинар4; частный источник преподавателя",visibility:"private",sha256:"c3653cf7f396e430a4423c2ae330b4c371e8589291b6c53a4bf43043cbc124ff"},{id:"ORIGINAL_T4_V1",version:"1.0.0",label:"Авторские условия, объяснения и тренировочные варианты CFLOS T4",visibility:"public",asset:"src/content/t4/index.ts"}]
});
// Explicit skill edges supplement the generic lesson/formula graph.
const skills=Object.keys(t4SkillTitles);
for(const id of skills){registry.competencies.push({id,version:"1.0.0",title:t4SkillTitles[id],moduleId:"T4",prerequisiteIds:[],sourceRefs:[],sourceVersionIds:["ORIGINAL_T4_V1"],reviewStatus:"PUBLISHED",availability:"available"} satisfies Competency);}
for(const p of registry.problems){p.competencyIds=[...new Set([...p.competencyIds,...(t4ProblemSkills[p.id]??[])])];Object.assign(p,{assessmentCompetencyIds:t4ProblemRequires[p.id]??[],stageTheoryIds:t4StageTheoryIds[p.id],requiredLessonIds:[...new Set((t4ProblemRequires[p.id]??[]).map(skill=>t4SkillIntroducedLesson[skill]).filter((id):id is string=>!!id))],stageCompetencyIds:t4StageSkillIds[p.id]});}
for(const l of registry.lessons){l.competencyIds=[...new Set([...l.competencyIds,...registry.problems.filter(p=>p.lessonId===l.id).flatMap(p=>p.competencyIds)])];}
for(const f of registry.families){f.competencyIds=[...new Set(registry.problems.filter(p=>p.familyId===f.id).flatMap(p=>p.competencyIds))];}

export {content,registry,blueprint,decisions};
