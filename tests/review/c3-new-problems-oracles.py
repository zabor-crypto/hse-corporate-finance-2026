#!/usr/bin/env python3
"""Independent Fraction keys for newly authored twelve assessments, without engine import."""
import argparse,json
from pathlib import Path
from fractions import Fraction as F

def main():
 d={}
 def add(i,values,unit='млн ₽',proof=None):
  d[f'C3-Q{i:02}']={'stages':{key:{'expected':float(value),'exact':str(value),'unit':unit} for key,value in values.items()},'independentProof':proof or []}
 used=F(15)+80-20;production=used+30+25;produced=production+12-7;cogs=produced+18-28;ebit=240-cogs-35
 add(1,{'materials':used,'produced':produced,'cogs':cogs,'ebitda':ebit+10,'ni':(ebit-12)*F(4,5)},proof=['Materials balance15+80=75+20.','Production130+openingWIP12=completed135+closingWIP7.','Completed135+openingFG18=COGS125+closingFG28.','EBIT80;NI54.4+tax13.6+I12+recognizedDA10=EBITDA90.'])
 produced=F(110)+24-16;production=produced+14-10;material=production-28-24;purchase=material+13-18;ebit=F(200)-110-30
 add(2,{'produced':produced,'production':production,'purchases':purchase,'ebitda':ebit+10,'ni':(ebit-12)*F(3,4)},proof=['Reverse cost bridges:completed118,periodproduction122,materialsused70.','Openingmaterials18+purchases65=usage70+ending13.','NI36+tax12+I12+DA10=EBITDA70.'])
 d['C3-Q03']={'correctOptionIds':['A','C','E'],'optionReasoning':{'A':'Fixed behavior does not determine traceability; dedicated fixed salary is a counterexample.','B':'Unfinished or unsold goods can retain costs as assets.','C':'EBITDA adds back DA already included in the P&L expenses.','D':'Ordinary dividends distribute NI and are not operating expenses.','E':'Selling commissions can vary with sales despite commercial function.'}}
 dnwc=F(14)-3-(-5);cfo=50+12-dnwc;fcff=cfo+10*F(3,4)-30;fcfe=fcff-10*F(3,4)+18-6;cash=12+cfo-30+18-6-8
 assert cash-12==fcfe-8
 add(4,{'nwc':dnwc,'cfo':cfo,'fcff':fcff,'fcfe':fcfe,'cash':cash},proof=['Inventory releases3;receivablesconsume14;supplierrepaymentconsumes5 => netcashuse16.','FCFF23.5 from NOPAT57.5+DA12−NWC16−CapEx30.','FCFE28−Div8=20=CFO46+CFI−30+CFF4.'])
 ebit=F(360)-270-15;ni=(ebit-9)*F(4,5);nopat=ebit*F(4,5);fcff=nopat+15-18-42
 add(5,{'ebit':ebit,'ni-b':ni,'fcff-a':fcff,'fcff-b':fcff,'fcfe-b':fcff-9*F(4,5)},proof=['Operating NOPAT60 common to both;NI_A60,NI_B52.8.','CFO_A57,CFO_B49.8;add back aftertaxinterest7.2 for same FCFF15.'])
 d['C3-Q06']={'correctOptionIds':['C'],'optionReasoning':{'A':'Positive NOPAT does not specify DA, paid investment or working-capital growth.','B':'Ending debt is a stock, not new borrowing net of repayment.','C':'Missing investment/operating stocks and funding flows prevent unique FCFF/FCFE.','D':'Omitted CapEx is unknown; assigning zero would be an extra disclosed assumption.'}}
 ni0=F(80);roe=F(1,5);re=F(18,100);p=F(3,5);g=(1-p)*roe;v=ni0*(1+g)*p/(re-g);p2=F(1,2);g2=(1-p2)*roe;v2=ni0*(1+g2)*p2/(re-g2)
 add(7,{'growth':g*100,'price-original':v,'price-new':v2},proof=['HistoricalNI80 and constantROE20% imply beginningbook400.','OldDIV0=48 gives valuationbook432;NI1=86.4,DIV1=51.84,P0=518.4.','NewDIV0=40 gives valuationbook440;NI1=88,DIV1=44,P0=550.','Same-date ownerwealth is566.4 versus590;prices alone exclude immediateDIV0.'])
 d['C3-Q07']['stages']['growth']['unit']='%'
 g=F(115,1000)-F(6,80);b=g/F(16,100)
 add(8,{'growth':g*100,'retention':b*100,'payout':(1-b)*100},unit='%',proof=['DIV1 already future:6/(.115−.04)=80.','Book retention.25 at ROE.16 yields.04;market required return.115 is a different quantity.'])
 d['C3-Q09']={'correctOptionIds':['A','C','E'],'optionReasoning':{'A':'A new payout does not determine a unique leverage without an objective/constraint.','B':'Cash-netted ROC is not grossROC used in the unadjusted leverage identity.','C':'At fixed grosscapital and operatingNOPAT, changing debt changes interest and NI; must recalculate.','D':'BookNI/equity is not automatically risk-adjusted marketrequiredreturn.','E':'Holding required equity return fixed under higher debt is an explicit strong assumption, not a market law.'}}
 v0,v1,p0,p1,c0,c1,f0,f1=map(F,[8000,9000,1500,1450,900,920,2800000,3000000]);scale=F(1000000)
 deltaV=v1-v0;deltaP=p1-p0;plan=v0*(p0-c0)-f0;flex=v1*(p0-c0)-f0;actual=v1*(p1-c1)-f1
 vol=deltaV*p0;price=v0*deltaP;inter=deltaV*deltaP;change=v1*p1-v0*p0
 assert vol+price+inter==change
 assert actual-plan==deltaV*(p0-c0)+v1*(p1-p0)-v1*(c1-c0)-(f1-f0)
 add(10,{'revenue-volume':vol/scale,'revenue-price':price/scale,'revenue-interaction':inter/scale,'revenue-change':change/scale,'flex-ebit':flex/scale,'actual-ebit':actual/scale,'unit-cost-impact':-v1*(c1-c0)/scale},proof=['Revenue plan12million versus actual13.05million.','Profit bridge volume+.6,price−.45,unitcost−.18,fixed−.2 totals−.23million => EBIT1.77.','Do not add separate revenueinteraction again after price already evaluated at actual volume.'])
 planCM=F(100)*(100-60)+F(100)*(200-100);actualCM=F(150)*(100-60)+F(70)*(200-100);controlCM=F(220,2)*((100-60)+(200-100))
 add(11,{'plan-contribution':planCM/1000,'actual-ebit':(actualCM-6000)/1000,'volume-impact':(controlCM-planCM)/1000,'mix-impact':(actualCM-controlCM)/1000},unit='тыс. ₽',proof=['PlanCM14000,actual13000,controlat220units50/50mix15400.','Volume+1400 plusmix−2400=totalCM−1000;unchangedF gives EBIT8000→7000.','Price/unitcost unchanged;this is specified genuine mix, not singleproduct price-volume interaction.'])
 d['C3-Q12']={'correctOptionIds':['B'],'optionReasoning':{'A':'EBIT14−8−4=2 already deducts embedded DA;1 double-deducts it.','B':'CM6,EBIT2,EBITDA3 with DA1 embedded in F.','C':'Subtracting DA-inclusiveF leaves EBIT, not EBITDA.','D':'Aggregate costs and sales do not determine product mix;product-specific quantities/margins are missing.'},'independentNumeric':{'CM':6,'EBIT':2,'EBITDA':3}}
 return {'role':'Independent reviewer; input facts transcribed from frozen draft; no application engine used for keys.','problems':d,'counts':{'problems':12,'numericStages':sum(len(x.get('stages',{})) for x in d.values()),'MCproblems':sum('correctOptionIds'in x for x in d.values()),'MCoptionDecisions':sum(len(x.get('optionReasoning',{})) for x in d.values())}}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path);args=p.parse_args();data=json.dumps(main(),ensure_ascii=False,indent=2)+'\n'
 if args.output:args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(data)
 else:print(data,end='')
