import {t4LearningPaths} from "../content/t4/prerequisites";
import {createElement,lazy,Suspense} from "react";
import type {ModulePack} from "./types";
import {content,registry,blueprint,decisions} from "./t4-data";
const Lab=lazy(()=>import("../components/InvestmentLab").then(m=>({default:m.InvestmentLab})));
const pack:ModulePack={id:"T4",content,registry,config:{id:"T4",title:"Инвестиционная оценка",primaryLessonId:"T4-01",defaultPracticeId:"T4-L2-01",nextAction:{label:"Построить поток проекта",route:"learn/T4-01"},blueprintIds:[blueprint.id,decisions.id],currentTopic:{title:"Инвестиционная оценка и выбор проекта",summary:"Какие будущие деньги изменит решение, сколько они стоят сегодня и что выбрать при ограничениях?"},nearestAssessment:{title:"Инвестиционные решения",date:null,dateStatus:"UNKNOWN",note:"Подготовка по инвестиционному разделу лекции и навыкам семинара4. Тренировочные варианты — авторские."},learningPaths:t4LearningPaths,lessonEnhancements:{"T4-03":{afterSections:createElement(Suspense,{fallback:createElement("p",{role:"status"},"Загружается лаборатория…")},createElement(Lab))}}}};
export default pack;
