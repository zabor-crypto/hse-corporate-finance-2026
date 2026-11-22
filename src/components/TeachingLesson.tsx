import { getProblemLabel } from "../pedagogy/problem-labels";
import {useEffect,useState,useRef} from "react";
import type {Lesson} from "../content/types";
import type {Progress} from "../storage/progress";
import type {TeachingPath} from "../pedagogy/types";
import {resolveTeachingExample} from "../pedagogy/selectors";
import {getActivePack} from "../runtime";
import {Link,Sources,publishedProblemContent} from "./Common";
import {MathFormula} from "./Math";
import {WorkedExample} from "./StepByStep";
import {LessonSections} from "./LessonSections";

export function TeachingLesson({lesson:l,path,anchor,data,update}:{lesson:Lesson;path:TeachingPath;anchor?:string;data:Progress;update:(fn:(p:Progress)=>Progress)=>void}){
 const pack=getActivePack();const problems=publishedProblemContent();
 const targetsReference=!!anchor&&path.referenceSectionIds.includes(anchor);
 const [referenceOpen,setReferenceOpen]=useState(targetsReference);
 const referenceRef=useRef<HTMLDetailsElement>(null);
 const pendingAnchor=useRef<string|undefined>(anchor);
 const [referenceNavigation,setReferenceNavigation]=useState(0);
 // A button requests reference navigation after the expanded DOM is committed.
 const openReference=()=>{pendingAnchor.current=undefined;setReferenceOpen(true);setReferenceNavigation(n=>n+1);};
 useEffect(()=>{pendingAnchor.current=anchor;if(targetsReference)setReferenceOpen(true);},[anchor,targetsReference]);
 useEffect(()=>{if(anchor&&pendingAnchor.current===anchor){const frame=requestAnimationFrame(()=>{const target=document.getElementById(anchor);if(target){target.scrollIntoView({behavior:"instant"});pendingAnchor.current=undefined;}});return()=>cancelAnimationFrame(frame);}},[anchor,referenceOpen]);
 useEffect(()=>{if(!referenceNavigation||!referenceOpen)return;const frame=requestAnimationFrame(()=>{referenceRef.current?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});referenceRef.current?.querySelector("summary")?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[referenceNavigation]);
 const enhancements=pack.config.lessonEnhancements?.[l.id];
 return <>
 <div className="eyebrow">УЧЕБНИК / {l.id} · ОСНОВНОЙ МАРШРУТ</div><div className="page-heading compact"><div><h1>{l.title}</h1><p>{path.question}</p></div></div>
 <details className="mobile-toc"><summary>Основной маршрут · {path.units.length} частей</summary>{path.units.map(u=><Link key={u.id} to={`learn/${l.id}/path-${u.id}`}>{u.title}</Link>)}<button aria-expanded={referenceOpen} aria-controls={`reference-${l.id}`} onClick={openReference}>Открыть полный справочник</button></details>
 <div className="reading-layout"><article className="lesson-body">
 {path.units.map((unit,i)=>{const example=unit.exampleRef?resolveTeachingExample(unit.exampleRef,pack.content.lessons):undefined;return <section id={`path-${unit.id}`} className="lesson-section" key={unit.id}>
 <div className="section-index">{String(i+1).padStart(2,"0")}</div><h2>{unit.title}</h2><div className="business-scenario"><b>Экономический вопрос.</b> {unit.question}</div>
 {unit.mechanism.map((text,j)=><p key={j}>{text}</p>)}
 {unit.formulaIds.map(id=>{const f=pack.content.formulas.find(f=>f.id===id);return f?<div className="panel" key={id}><h3>{f.title}</h3><MathFormula latex={f.latex}/><p>{f.framing}</p><small>Единицы: {f.units}</small><details><summary>Обозначения и границы применения</summary><ul>{f.symbols.map((s,j)=><li key={j}>{s.symbol}: {s.meaning} ({s.unit})</li>)}</ul>{f.domain.map((s,j)=><p key={j}>{s}</p>)}<Link to={`formulas/${id}`}>Полная карточка формулы</Link></details></div>:null;})}
 {example&&<WorkedExample example={example}/>}
 {unit.recall&&<div className="recall"><p>{unit.recall.question}</p><details><summary>Сверить рассуждение</summary><p>{unit.recall.answer}</p></details></div>}
 <div className="panel"><h3>Теперь измените условия</h3>{unit.practiceIds.filter(id=>problems.some(p=>p.id===id)).map(id=><p key={id}><Link to={`practice/${id}`}>{getProblemLabel(problems.find(p=>p.id===id) ?? {id, title:id})}</Link></p>)}</div>
 </section>;})}
 <details ref={referenceRef} id={`reference-${l.id}`} style={{scrollMarginTop:100}} className="lesson-reference" open={referenceOpen} onToggle={e=>setReferenceOpen(e.currentTarget.open)}><summary>Полный разбор и справочник · все прежние разделы и примеры</summary>{referenceOpen&&<><p>Здесь сохранены подробные объяснения, дополнительные случаи и прежние адреса разделов. Это углубление основного маршрута.</p><p>{l.summary}</p><div className="mental-model"><span className="eyebrow">ПЕРВОНАЧАЛЬНАЯ ГЛАВНАЯ ИДЕЯ</span><p>{l.mentalModel}</p></div><nav aria-label="Разделы полного справочника">{l.sections.map(section=><p key={section.id}><Link to={`learn/${l.id}/${section.id}`}>{section.title}</Link></p>)}</nav><h2>Возможности полного раздела</h2><ul>{l.outcomes.map(x=><li key={x}>{x}</li>)}</ul>{enhancements?.beforeSections}<LessonSections sections={l.sections} showInitialScenario/>{enhancements?.afterSections}</>}</details>
 <Sources refs={l.sourceRefs}/>{Object.keys(data.lessons).some(k=>k.startsWith(`${l.id}@`)&&k!==`${l.id}@${l.version}`)&&<p>Сохранена отметка чтения предыдущей версии; она остаётся в истории.</p>}<p>Отметка чтения относится к знакомству с уроком; она не устанавливает освоение и не заменяет решение новой задачи.</p><div className="row"><button className="button" onClick={()=>update(p=>({...p,lessons:{...p.lessons,[`${l.id}@${l.version}`]:new Date().toISOString()}}))}>{data.lessons[`${l.id}@${l.version}`]?"Прочитано · текущая версия":"Отметить прочитанным"}</button>{path.nextLessonId&&<Link className="button outline" to={`learn/${path.nextLessonId}`}>Следующий механизм →</Link>}</div>
 </article><aside className="toc"><span className="eyebrow">ОСНОВНОЙ МАРШРУТ</span>{path.units.map((unit,i)=><Link key={unit.id} to={`learn/${l.id}/path-${unit.id}`}><span>{i+1}</span>{unit.title}</Link>)}<button className="text-link" aria-expanded={referenceOpen} aria-controls={`reference-${l.id}`} onClick={openReference}>Открыть полный справочник</button><Link to="curriculum">Карта программы</Link></aside></div>
 </>;
}
