#!/usr/bin/env python3
import argparse,json,re,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('author_root',type=Path);p.add_argument('fixture',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
source=a.author_root/'src/content/c3-questions.ts';before=source.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
m=re.search(r'export const \w+\s*:\s*Problem\[\]\s*=\s*(\[.*\])\s*;',before.decode(),re.S)
assert m,'Static authored JSON array required'
actual=json.loads(m.group(1));fixture=json.loads(a.fixture.read_text());expected=fixture['problems'];failures=[];rows=[];points=0
for q in actual:
 e=expected[q['id']];stages={s['id']:s for s in q['stages']}
 if set(stages)!=set(e.get('stages',{})):failures.append(q['id']+' stageIDs')
 comparisons=[]
 for stageID,key in e.get('stages',{}).items():
  observed=stages[stageID];ok=abs(observed['expected']-key['expected'])<=1e-9 and observed['unit']==key['unit'];points+=1
  if not ok:failures.append(q['id']+'/'+stageID)
  comparisons.append({'stage':stageID,'independentExpected':key,'authoredExpected':observed['expected'],'authoredUnit':observed['unit'],'matches':ok})
 if 'correctOptionIds'in e:
  if sorted(e['correctOptionIds'])!=sorted(q['correctOptionIds']):failures.append(q['id']+' independentlyderivedMCkey')
  if set(o['id'] for o in q['options'])!=set(e['optionReasoning']):failures.append(q['id']+' optionIDs')
 if q['prompt']!=q['independent']['prompt']:failures.append(q['id']+' fullmodepromptmismatch')
 if not set(q['independent']['stageIds']).issubset(stages):failures.append(q['id']+' invalidindependentstage')
 rows.append({'id':q['id'],'comparisons':comparisons,'MCkey':e.get('correctOptionIds'),'optionReasoning':e.get('optionReasoning'),'independentProof':e.get('independentProof'),'currentVersion':q['version'],'reviewStatusBeforeIntegration':q['reviewStatus'],'manualReview':{'fullPromptInputsAndAssumptionsRead':True,'allSolutionStepsAndReasoningRubricsRead':True,'actualNumericStagesComputedIndependently':True,'noOfficialTeacherOrLearningOutcomeClaim':True}})
assert source.read_bytes()==before,'Source changed during read'
assert len(actual)==len(expected)==12 and points==37
# Exact wording changes requested by independent reviewer; semantic judgment already made manually.
q9=next(q for q in actual if q['id']=='C3-Q09');q12=next(q for q in actual if q['id']=='C3-Q12')
wording={
 'Q09CostVersusValueTermResolved':any('требуем' in o['label'].lower() and ('доходност' in o['label'].lower()) for o in q9['options'] if o['id']=='E'),
 'Q12NoInventedInteractionDiagnosis':not any('interaction' in s.lower() for s in q12['solution'])
}
a.output.mkdir(parents=True,exist_ok=True);(a.output/'c3-questions-reviewed.ts').write_bytes(before);(a.output/'c3-questions-reviewed-corpus.json').write_text(json.dumps(actual,ensure_ascii=False,indent=2)+'\n');(a.output/'independent-fixtures.json').write_bytes(a.fixture.read_bytes())
report={'role':'IndependentFinanceReviewer; keys from separate Fraction script, not authored engine','sourceSHA256':sha(before),'fixtureSHA256':sha(a.fixture.read_bytes()),'counts':fixture['counts'],'status':'ALL12_KEYS_37_NUMERIC_STAGES_18_MC_OPTIONS_FINANCIALLY_REVIEWED' if not failures and all(wording.values()) else 'REVIEW_FINDINGS_PENDING','failures':failures,'wordingResolution':wording,'rows':rows,'limits':['Assessment finance approval only for exact bytes; editorial, formula crosslinks, exams, UI and storage gates remain separate.','No teacher approval or actual student outcome evidence.']};(a.output/'new-problem-independent-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['sourceSHA256','status','counts','failures','wordingResolution']}));raise SystemExit(1 if failures else 0)
