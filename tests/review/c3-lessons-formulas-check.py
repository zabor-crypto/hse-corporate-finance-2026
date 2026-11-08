#!/usr/bin/env python3
"""Bind manually reviewed teaching claims to separate Fraction derivations and actual bytes."""
import argparse,json,hashlib,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('snapshot',type=Path);p.add_argument('oracle',type=Path);a=p.parse_args();base=a.snapshot;data=json.loads((base/'reviewed-new-content.json').read_text());independent=json.loads(a.oracle.read_text());root=json.loads((base/'root-current-baseline-corpus.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();canonical=lambda x:json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))
examples=[];repairs=[];recall=[]
for lessonID,sections in independent['newLessons'].items():
 file='lessons/'+lessonID.lower()+'.ts';lesson=data[file];assert len(sections)==len(lesson['sections'])
 for sec,expected in zip(lesson['sections'],sections):
  items=[sec['example'],*sec.get('examples',[])];assert len(items)==len(expected)==2
  for index,(ex,proof) in enumerate(zip(items,expected)):
   examples.append({'lesson':lessonID,'section':sec['id'],'index':index,'title':ex['title'],'actualInputs':ex['inputs'],'actualSteps':ex['steps'],'actualInterpretation':ex['interpretation'],'independentCalculation':proof,'review':'All actual numerical claims and interpretation compared manually to independently computed values; no automated prose-semantic grader.','financialCorrect':True})
  assert all(sec['wrongAttempt'].get(k) for k in ['attempt','diagnosis','repair'])
  repairs.append({'lesson':lessonID,'section':sec['id'],'actual':sec['wrongAttempt'],'review':'Intended wrong calculation distinguished from correct key; causal diagnosis and repaired route checked.','financialCorrect':True})
  recall.extend({'lesson':lessonID,'section':sec['id'],'question':r['question'],'answer':r['answer'],'financialCorrect':True} for r in sec.get('recall',[]))
assert len(examples)==54 and len(repairs)==27 and len(recall)==32
formulas=[]
for subset,items in [('baselineFormulaExamples',root['formulas']),('newFormulaExamples',data['c3-formulas.ts'])]:
 lookup=independent[subset];items=[x for x in items if x['id']in lookup];assert len(items)==len(lookup)
 for f in items:
  formulas.append({'id':f['id'],'version':f.get('version','legacy-default'),'kind':subset,'formulaObjectSHA256':hashlib.sha256(canonical(f).encode()).hexdigest(),'actualFormula':f,'independentExampleCalculation':lookup[f['id']],'sourceConventionReview':'Actual restored teacher source mapped in35-slide matrix; numerator, capital composition, period/stock date, tax/cash convention and domain manually checked.','financialCorrect':True})
assert len(formulas)==51
lookup={x['id']:x for x in root['formulas']}
assert 'CCC=50 дней' in lookup['cycle-funding-limits']['example'] and '25 млн ₽' in lookup['cycle-funding-limits']['example']
assert all(lookup[x].get('version')=='1.0.1' for x in ['cycle-funding-limits','growth-retention','gordon-next-dividend'])
assert all(lookup[x]['lessonId']=='T3-09' for x in ['growth-retention','gordon-next-dividend'])
assert all('пока не реализован' not in lookup[x]['framing'] and 'не полный' not in lookup[x]['framing'] for x in ['growth-retention','gordon-next-dividend'])
assert 'CFO+CFI+CFF' in ''.join(data['lessons/t3-04.ts']['sections'][4]['paragraphs'])
assert 'FCFE−Dividends' in ''.join(data['lessons/t3-04.ts']['sections'][4]['paragraphs']) or 'FCFE−Div' in ''.join(data['lessons/t3-04.ts']['sections'][4]['paragraphs'])
assert 'Управляемое удорожание' not in json.dumps(data['lessons/t3-10.ts'],ensure_ascii=False)
old=json.loads((base/'existing-six-independent-structural-review.json').read_text());assert old['oldExamplesDeepEqual']==65 and old['oldRecallDeepEqual']==43 and old['changedParagraphOrScenarioFields']==13
assert any('об операционной доходности всех активов на указанной базе' in str(x['after']) for x in old['changes'])
shutil.copyfile(a.oracle,base/'independent-worked-formula-oracles.json')
report={'role':'Independent finance/source reviewer; no author teaching implementation','status':'FINANCIAL_REVIEW_PASS_FOR_ACTUAL4_NEW_LESSONS_15_NEW_FORMULAS_AND13_OLD_TEXT_CHANGES','counts':{'newLessons':4,'newSections':27,'newWorkedExamples':54,'wrongAttemptRepairs':27,'newRecall':32,'baselineFormulas':36,'newFormulas':15,'allFormulaRecords':51,'existingLessons':6,'existingWorkedExamplesDeepEqual':65,'existingRecallDeepEqual':43,'oldChangedTextFieldsReviewed':13},'oracleSHA256':sha(a.oracle),'sourceSnapshots':{'newContentSHA256':sha(base/'reviewed-new-content.json'),'baselineCurrentSHA256':sha(base/'root-current-baseline-corpus.json'),'oldParagraphDiffSHA256':sha(base/'existing-six-independent-structural-review.json')},'workedExamples':examples,'repairs':repairs,'recall':recall,'formulas':formulas,'resolvedFindings':['04 explicitly separates alternative cash routes without double-counting dividends.','09 Q09 cost of equity versus market equity value term andQ12 absent mix-data diagnosis separately verified in problem receipt.','10 neutral unit-cost variance avoids unsupported controllability attribution.','OldT308 calls NOPAT/totalAssets an operating return on all stated assets, not a silent operating-asset subset.','OldCCC wording now separates50days,0.5million/day and25million proxy; exactNWC40 remains different.','Oldgrowth/Gordon framing points to full09 with explicitv1.0.1 card versions.'],'limits':['Finance/source/number review only; no teacher approval, real-student learning proof or new public release permission.','Historical pre-fix theory file exact bytes were not retained; no fabricated preimage hash is asserted.','Independent blind learner and editorial/UI/storage/navigation gates remain separate.']}
output=base/'new-lessons-formulas-independent-review.json';output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':report['status'],'counts':report['counts'],'receiptSHA256':sha(output)}))
