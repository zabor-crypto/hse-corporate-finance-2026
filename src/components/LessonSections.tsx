import type {LessonSection} from "../content/types";
import {FormulaCard} from "./Common";
import {WorkedExample} from "./StepByStep";
/** The original reference retains every stable section ID and every worked example. */
export function LessonSections({sections,showInitialScenario=false}:{sections:LessonSection[];showInitialScenario?:boolean}){
 const anchoredFormulas=new Set<string>();
 return <>{sections.map((s,i)=><section key={s.id} id={s.id} className="lesson-section"><div className="section-index">{String(i+1).padStart(2,"0")}</div><h2>{s.title.replace(/^\d+[.)]?\s*/,"")}</h2>
 {(i>0||showInitialScenario)&&s.businessScenario&&<div className="business-scenario"><b>Решение в бизнесе.</b> {s.businessScenario}</div>}
 {s.paragraphs.map((p,j)=><p key={j}>{p}</p>)}{s.formulaIds?.map(f=>{const anchor=!anchoredFormulas.has(f);anchoredFormulas.add(f);return <FormulaCard key={f} id={f} anchor={anchor}/>;})}{s.example&&<WorkedExample example={s.example}/>}{s.examples?.map((example,j)=><WorkedExample key={j} example={example}/>)}
 {s.wrongAttempt&&<details className="wrong-attempt"><summary>Ошибочная попытка: найдите сбой</summary><p><b>Попытка:</b> {s.wrongAttempt.attempt}</p><p><b>Диагноз:</b> {s.wrongAttempt.diagnosis}</p><p><b>Исправление:</b> {s.wrongAttempt.repair}</p></details>}
 {!!s.deepDive?.length&&<details><summary>Дополнительные условия и исключения</summary>{s.deepDive.map(x=><p key={x}>{x}</p>)}</details>}
 {s.commonErrors&&<div className="mistake-note"><b>Где легко ошибиться</b><ul>{s.commonErrors.map(x=><li key={x}>{x}</li>)}</ul></div>}
 {s.recall?.map((r,j)=><div className="recall" key={j}><div className="eyebrow">ОСТАНОВИТЕСЬ И ОБЪЯСНИТЕ</div><p>{r.question}</p><details><summary>Сверить своё рассуждение</summary><p>{r.answer}</p><small>Самопроверка: ответ не оценивается автоматически.</small></details></div>)}
 </section>)}</>;
}
