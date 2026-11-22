import { ArrowRight, BookOpen, Check } from "lucide-react";
import type { Progress } from "../storage/progress";
import { Link, publishedLessonContent, publishedProblemContent, objectiveProgress } from "../components/Common";
import { getActivePack } from "../runtime";

export function Home({data}: {data:Progress;doneLessons:number}) {
  const pack=getActivePack();
  const {currentTopic,nearestAssessment,nextAction}=pack.config;
  const lessons=publishedLessonContent();
  const problems=publishedProblemContent();
  const read=lessons.filter(l=>data.lessons[`${l.id}@${l.version}`]).length;
  const correct=objectiveProgress(data);
  const nextLesson=lessons.find(l=>!data.lessons[`${l.id}@${l.version}`]);
  const action=read&&nextLesson?{label:"Продолжить: следующий механизм",route:`learn/${nextLesson.id}`}:read===lessons.length&&read?{label:"Проверить себя на задаче",route:`practice/${pack.config.defaultPracticeId}`}:nextAction;
  return <>
    <div className="page-heading"><div><div className="eyebrow">УЧЕБНЫЙ МАРШРУТ</div><h1>От вопроса бизнеса<br/>к обоснованному решению.</h1><p>Разберите механизм, попробуйте новую задачу и проверьте, где расходится рассуждение.</p></div></div>
    <section className="hero-card"><div className="hero-content">
      <span className="pill">{pack.id}<span>АКТУАЛЬНАЯ ТЕМА</span></span>
      <h2>{currentTopic.title}</h2><p>{currentTopic.summary}</p>
      <Link className="button light" to={action.route}>{action.label}<ArrowRight size={18}/></Link>
      <p className="hero-meta">Вопрос → механизм → пример → самостоятельная задача</p>
    </div></section>
    <section className="panel" aria-label="Ближайшая контрольная"><div className="eyebrow">ПОДГОТОВКА К БЛИЖАЙШЕЙ КОНТРОЛЬНОЙ</div><h2>{nearestAssessment.title}</h2><p>{nearestAssessment.dateStatus==="OWNER_CONFIRMED"&&nearestAssessment.date ? `Дата: ${nearestAssessment.date}.` : "Дата и официальный формат преподавателем пока не подтверждены."} {nearestAssessment.note}</p><p>Авторские тренировочные варианты проверяют ответы на конкретных заданиях. Верные числа и отметка чтения сами по себе не устанавливают освоение.</p></section>
    <div className="stats-grid"><div><span className="stat-icon"><BookOpen/></span><div><strong>{read}<small> / {lessons.length}</small></strong><p>уроков отмечено прочитанными</p></div></div><div><span className="stat-icon"><Check/></span><div><strong>{correct}<small> / {problems.length}</small></strong><p>заданий: последний ответ верен (практика)</p></div></div></div>
    <div className="section-heading"><h2>Продолжить маршрут</h2><Link to="curriculum">Карта программы <ArrowRight size={16}/></Link></div>
    <div className="lesson-grid">{lessons.map((l,i)=><Link key={l.id} to={`learn/${l.id}`} className="lesson-card"><div className="card-top"><span className="chapter-number">{String(i+1).padStart(2,"0")}</span><span className="tag">{l.id}</span>{data.lessons[`${l.id}@${l.version}`]&&<Check size={18}/>}</div><h3>{l.title}</h3><p>{l.summary}</p></Link>)}</div>
    <p>Наборы одного семейства с разными числами не считаются разными компетенциями.</p>
    <p><Link to={`practice/${pack.id}`}>Самостоятельная практика</Link> · <Link to={`exam/${pack.id}`}>Тренировочные варианты</Link> · <Link to={`catalog/${pack.id}`}>Полный каталог заданий</Link></p>
  </>;
}
