#!/usr/bin/env python3
"""Read-only offline grading of preserved first simulation response; never execute learner code."""
import json,hashlib,pathlib,sys,shutil
from decimal import Decimal as D
paper_dir,private_map,fixture_file,model_fixture,out=map(pathlib.Path,sys.argv[1:])
out.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
source={n:(paper_dir/n).read_bytes() for n in ['prompt-only-paper.json','submitted-responses.json','calculator.py']}
response=json.loads(source['submitted-responses.json']); keymap=json.loads(private_map.read_bytes()); fixture={p['id']:p for p in json.loads(fixture_file.read_bytes())['problems']}
assert response['inputSHA256']==sha(source['prompt-only-paper.json'])
assert response['calculatorSHA256']==sha(source['calculator.py'])
assert sha(source['submitted-responses.json']).startswith('8456afc2')
# This finite semantic mapping recognizes expressed economic units offline, not application UnitId acceptance.
factors={'million RUB':('money',D('1000000')),'RUB':('money',D(1)),'RUB change in EBIT':('money',D(1)),'percent per year':('rate',D('.01')),'percent of net income':('rate',D('.01')),'млн ₽':('money',D('1000000')),'%':('rate',D('.01'))}
manual={
'B1':('Conceptually correct','Distinguishes accrual NOPAT from FCFF/FCFE; identifies missing CapEx, operating NWC and cash net borrowing; ending debt is not a cash flow.'),
'B2':('Conceptually correct','Explains missing inverse objective, NI recalculation at fixed gross capital, cash-net versus gross identity, market rE versus book ROE, and conditional fixed required return.'),
'B3':('Conceptually correct','Material/WIP/FG bridges are distinct; recognized D&A added once; tax base68 and tax13.6 correct; FG increase retains cost rather than creating cash.'),
'B4':('Conceptually correct','AP decline is a cash use; paid interest unlevered after tax; FCFE before dividends, and cash rollforward avoid double-counting distributions.'),
'B5':('Conceptually correct','Uses future DIV1 without growing it twice, beginning-equity ROE convention, dividend yield plus growth, and r>g domain.'),
'B6':('Conceptually correct','Revenue and EBIT distinguished; variable-cost effect evaluated at actual volume; fixed cost includes D&A; complete EBIT bridge reconciles.'),
'B7':('Conceptually correct','Uses prescribed ending AR policy, annual D&A, opening-debt interest, positive-NI payout, cash/equity rollforwards and balanced assets; also correctly distinguishes fixed NOPAT-margin policy from fixed cash costs.')}
failures=[];rows=[];numeric=mc=0
for answer in response['answers']:
 bid=answer['item'];p=fixture[keymap[bid]]; result={'item':bid,'privateProblemId':p['id'],'numerics':[],'reasoningReview':{'verdict':manual[bid][0],'reviewerAssessment':manual[bid][1],'actualReasoning':answer['reasoning'],'actualChecks':answer.get('checks',[]),'semanticReviewByIndependentReviewer':True,'automaticSemanticMastery':False}}
 if 'correctOptionIds' in p:
  mc+=1;actual=sorted(answer['selected']);expected=sorted(p['correctOptionIds']);ok=actual==expected;result['choice']={'expected':expected,'actual':actual,'exactWholeSet':ok}
  if not ok:failures.append(bid+' choice')
 for sid,v in answer['values'].items():
  numeric+=1;s=next(x for x in p['stages'] if x['id']==sid);ad,af=factors[v['unit']];ed,ef=factors[s['unit']];actual=D(str(v['value']))*af;expected=D(str(s['expected']))*ef;ok=ad==ed and abs(actual-expected)<=D('.000001')*max(D(1),abs(expected));result['numerics'].append({'stage':sid,'response':v,'independentExpected':s,'canonicalActual':str(actual),'canonicalExpected':str(expected),'dimension':ad,'pass':ok})
  if not ok:failures.append(bid+'/'+sid)
 rows.append(result)
# All submitted annual checks are challenged against independent rational model, not learner calculator.
m=json.loads(model_fixture.read_bytes())['scenarios']['assessmentC3M01'];a=next(a for a in response['answers'] if a['item']=='B7');annual=[]
aliases={'delta_nwc':'deltaNwc','liabilities_plus_equity':'liabilitiesAndEquity','cash_identity_residual':'cashResidual','balance_identity_residual':'balanceResidual'}
for i,actual in enumerate(a['annualChecks']):
 expected=m['years'][i]['values']
 for k,v in actual.items():
  if k=='beginning_cash': ev=m['opening']['cash'] if i==0 else m['years'][i-1]['values']['cash']
  elif k=='beginning_equity':ev=m['opening']['equity'] if i==0 else m['years'][i-1]['values']['equity']
  else:ev=expected[aliases.get(k,k)]
  ok=abs(D(str(v))-D(str(ev)))<D('.0000001');annual.append({'year':i+1,'field':k,'actual':v,'expected':ev,'pass':ok})
  if not ok:failures.append('annual '+str(i+1)+' '+k)
assert len(rows)==7 and numeric==15 and mc==2
for n,b in source.items():
 assert (paper_dir/n).read_bytes()==b,'Immutable first submission changed during grading'
 (out/n).write_bytes(b)
shutil.copyfile(private_map,out/'private-keymap.json');shutil.copyfile(fixture_file,out/'independent-oracles.json');shutil.copyfile(model_fixture,out/'independent-model-oracles.json')
receipt={'role':'Independent Finance Reviewer; neither authored learner answers nor implemented problems','status':'PASS_FIRST_SUBMISSION_FINITE_CHECKS' if not failures else 'FAIL_PRESERVED_FIRST_SUBMISSION','inputs':[{'file':n,'sha256':sha(b),'bytes':len(b)} for n,b in source.items()],'oracleSHA256':sha(fixture_file.read_bytes()),'modelOracleSHA256':sha(model_fixture.read_bytes()),'counts':{'answers':7,'requestedNumericOutputs':numeric,'exactMCsets':mc,'annualIntermediateComparisons':len(annual),'reasoningReviews':7,'failures':len(failures)},'rows':rows,'annualIntermediateChecks':annual,'failures':failures,'provenance':{'firstResponsePreserved':True,'calculatorExecutedByReviewer':False,'noFeedbackSentToLearner':True,'onlyPromptAccessClaim':'Self-reported by simulation; not independent forensic proof of tool restrictions','assistanceClaim':response['assistanceUsed'],'offlineUnitSemantics':'English descriptions economically normalized here; UI acceptance of these free strings is not claimed'},'limits':['Agent simulation, not a real student study.','All seven reasoning judgments are finite reviewer assessments, not automatic semantic mastery.','No proof of official control/exam difficulty or owner academic approval.','Successful one-paper response does not establish broad independent transfer or durable learning.']}
(out/'blind-first-submission-independent-grade.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'counts':receipt['counts'],'responseSHA256':sha(source['submitted-responses.json']),'failures':failures}));sys.exit(bool(failures))
