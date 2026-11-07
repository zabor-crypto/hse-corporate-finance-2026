#!/usr/bin/env python3
"""Combine independently derived fixture families; never imports authored application code."""
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('fixture_directory',type=Path);p.add_argument('accepted_baseline',type=Path);p.add_argument('output',type=Path);p.add_argument('--extension',type=Path,help='Separately reviewed additive oracle; default remains exact 118 baseline mode.');a=p.parse_args();load=lambda n:json.loads((a.fixture_directory/n).read_text());old=json.loads(a.accepted_baseline.read_text());versions={x['id']:x['version'] for x in old['problems']};problems=[]
for pid,r in load('original-bank-oracles.json')['answers'].items():
 record={'id':pid,'version':versions[pid]}
 if 'selected'in r:record['correctOptionIds']=r['selected']
 else:record['stages']=[{'id':sid,'expected':float(v),'unit':'млн ₽'} for sid,v in r['values'].items()]
 problems.append(record)
for name in ['ratios-question-oracles.json','tranche03-independent-oracles.json']:problems.extend(load(name)['problems'])
for pid,q in load('c3-new-problems-oracles.json')['problems'].items():
 record={'id':pid,'version':'1.0.0'}
 if 'correctOptionIds'in q:record['correctOptionIds']=q['correctOptionIds']
 else:record['stages']=[{'id':sid,'expected':x['expected'],'exact':x['exact'],'unit':x['unit']} for sid,x in q['stages'].items()]
 problems.append(record)
for pid,name in [('C3-M01','assessmentC3M01'),('C3-M02','assessmentC3M02')]:
 s=load('c3-three-year-oracles.json')['scenarios'][name];selected=[('cash3',2,'cash'),('equity3',2,'equity'),('cfo2',1,'cfo')]
 problems.append({'id':pid,'version':'1.0.0','stages':[{'id':sid,'expected':s['years'][year]['values'][field],'exact':s['years'][year]['exact'][field],'unit':'млн ₽'} for sid,year,field in selected]})
for item in load('c3-theory-oracles.json')['items']:problems.append({'id':item['id'],'version':'1.0.0','correctOptionIds':item['correctOptionIds']})
consolidation=load('c3-consolidation-oracles.json');problems.append({k:consolidation[k]for k in ['id','version','stages']})
reverse=load('c3-reverse-roc-oracles.json');problems.append({k:reverse[k]for k in ['id','version','stages']})
assert len(problems)==len({q['id']for q in problems})==118
counts={'problems':len(problems),'numericStages':sum(len(q.get('stages',[])) for q in problems),'MCkeys':sum('correctOptionIds'in q for q in problems),'baselineProblems':62,'newProblems':56,'baselineNumericStages':338,'newNumericStages':55,'newMCkeys':44};assert counts['numericStages']==393 and counts['MCkeys']==51
if a.extension:
 extension=json.loads(a.extension.read_text());extra=[]
 for q in extension['problems']:
  record={'id':q['id'],'version':q['version']}
  if q.get('stages'):record['stages']=[{'id':sid,**s}for sid,s in q['stages'].items()]
  else:record['correctOptionIds']=q['correctOptionIds']
  extra.append(record)
 assert {q['id']for q in extra}=={f'C3-RF{i:02d}'for i in range(1,7)}
 assert not ({q['id']for q in problems}&{q['id']for q in extra})
 assert sum(len(q.get('stages',[]))for q in extra)==20
 assert sum('correctOptionIds'in q for q in extra)==2
 assert sum(len(q['independentStageIds'])for q in extension['problems'])==12
 problems.extend(extra)
 counts.update(problems=len(problems),numericStages=413,MCkeys=53,newProblems=62,newNumericStages=75,newMCkeys=46)
 assert len(problems)==len({q['id']for q in problems})==124
 assert sum(len(q.get('stages',[]))for q in problems)==counts['numericStages']
 assert sum('correctOptionIds'in q for q in problems)==counts['MCkeys']
record={'schemaVersion':1,'origin':'Independent Finance Reviewer: preserved independent baseline fixtures freshly compared to current exact conditions; all new calculations Fraction/direct cash route; no application engine used to create expected values.','counts':counts,'problems':problems,'limits':['No teacher approval or empirical student mastery.','Version/expected/unit provenance belongs to independently reviewed exact data; content status is a separate integration transition.','All theory numeric derivations and all wrong-option reasoning are in separate c3-theory-oracles fixture; MC key agreement alone is not conceptual review.']};a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps(counts))
