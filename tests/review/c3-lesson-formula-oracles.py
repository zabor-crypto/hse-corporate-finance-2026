#!/usr/bin/env python3
"""Independent worked-example and formula arithmetic. No teaching/engine imports."""
from fractions import Fraction as F
import json,argparse
from pathlib import Path

def q(x):return F(str(x))
def vals(**kwargs):return {k:q(v) if isinstance(v,(int,float,str)) else v for k,v in kwargs.items()}
def mfg(m0,m1,p,l,oh,w0,w1,f0,f1,s,sga,da,i,t):
 u=q(m0)+q(p)-q(m1);pc=u+q(l)+q(oh);produced=pc+q(w0)-q(w1);cogs=produced+q(f0)-q(f1);e=q(s)-cogs-q(sga);ebt=e-q(i);tax=ebt*q(t)
 return dict(materials=u,production=pc,produced=produced,cogs=cogs,EBIT=e,DA=q(da),EBITDA=e+q(da),EBT=ebt,tax=tax,NI=ebt-tax,NOPAT=e*(1-q(t)))
def variance(v0,v1,p0,p1,c0,c1,f0,f1):
 v0,v1,p0,p1,c0,c1,f0,f1=map(q,[v0,v1,p0,p1,c0,c1,f0,f1]);e0=v0*(p0-c0)-f0;ef=v1*(p0-c0)-f0;e1=v1*(p1-c1)-f1
 vol=(v1-v0)*p0;price=v0*(p1-p0);inter=(v1-v0)*(p1-p0);profitvol=(v1-v0)*(p0-c0);profitprice=v1*(p1-p0);cost=-v1*(c1-c0);fixed=-(f1-f0)
 assert vol+price+inter==v1*p1-v0*p0 and profitvol+profitprice+cost+fixed==e1-e0
 return dict(Sales0=v0*p0,Sales1=v1*p1,VC0=v0*c0,VCflex=v1*c0,VC1=v1*c1,EBIT0=e0,EBITflex=ef,EBIT1=e1,revenueVolume=vol,revenuePrice=price,revenueInteraction=inter,revenueChange=vol+price+inter,profitVolume=profitvol,profitPrice=profitprice,profitUnitCost=cost,profitFixed=fixed,profitChange=e1-e0)
def enc(x):
 if isinstance(x,F):return {'exact':str(x),'value':float(x)}
 if isinstance(x,dict):return{k:enc(v) for k,v in x.items()}
 if isinstance(x,list):return[enc(v) for v in x]
 return x

def oracles():
 factory=mfg(12,9,57,24,18,8,11,14,23,180,28,8,10,.25)
 quartz=mfg(10,15,80,30,20,15,12,20,30,220,30,8,8,.2)
 vector=vals(EBITDA=300-180-50,EBIT=60,EBT=54,tax=10.8,NI=43.2,NOPAT=48,NWC0=30+40-25,NWC1=42+46-31,deltaNWC=12,receipts=300-(42-30),purchases=180+(46-40),supplierPayments=180+(46-40)-(31-25),CFO=288-180-50-6-10.8,FCFF=48+10-12-35,FCFE=11-4.8+15,cashEnd=20+41.2-35+0,PPEend=110+35-10,debtEnd=75+20-5,equityEnd=100+43.2-15,assetsEnd=26.2+42+46+135)
 # Decimal constants below are exact stated inputs; every derived decimal is separately checked rationally.
 vector['CFO']=q(288)-180-50-6-q(10.8);vector['FCFE']=q(11)-q(4.8)+15;vector['cashEnd']=q(20)+vector['CFO']-35;vector['equityEnd']=q(100)+q(43.2)-15;vector['assetsEnd']=vector['cashEnd']+42+46+135
 assert vector['CFO']==q(43.2)+10-12 and vector['assetsEnd']==31+90+vector['equityEnd']
 thermos=variance(10000,11000,1200,1150,700,730,3000000,3150000)
 contour=variance(5000,5500,2000,1900,1200,1250,2000000,2100000)
 lesson={
 'T3-02':[
  [vals(monthlyFixedRent=.6,minimumCapacity=1000,maximumCapacity=2000),vals(production=60+24+18,variableProduction=60+24+9,fixedProduction=9,SGA=8+20)],
  [vals(resourceFG=4+25,COGS=4+25-7),factory],
  [vals(EBIT=100-55-15,DA=4+1,EBITDA=100-55-15+4+1),factory],
  [dict(EBT=q(20)-5,tax=(q(20)-5)*q(.2),NI=(q(20)-5)*q(.8),NOPAT=q(20)*q(.8)),factory],
  [dict(growthFactor=F(50,40),growthRate=F(10,40)),dict(salesGrowth=F(30,150),EBITgrowth=F(12,50),NIgrowth=F(9,30),COGSshare=F(90,180),SGAshare=F(28,180),EBITmargin=F(62,180),NOPATmargin=q(46.5)/180,NIshare=F(39,180))],
  [vals(produced=30+6-4,resourceFG=4+32),quartz]],
 'T3-04':[
  [vals(CFO=0,CFI=-8,CFF=10,deltaCash=2,cashEnd=7),vals(CFI=-35,CFF=20-5-15,cashOffset=20-35)],
  [vals(collections=30-(9-4)),vector],
  [vals(CFO=16+4),vector],
  [vals(FCFF=24+6-4-10),vector],
  [dict(NB=q(8)-3,afterTaxInterest=q(5)*q(.8),FCFE=q(30)-q(5)*q(.8)+8-3),vector],
  [dict(CFO_fin=q(41.2)+6,CFF_fin=q(0)-6,deltaCash=q(47.2)-35-6,FCFF=q(47.2)-q(6)*q(.2)-35),dict(CFI=q(-35)+8,cashEnd=q(20)+q(41.2)-35+8,PPEend=q(110)+35-10-8,FCFFexpanded=q(11)+8,FCFEexpanded=q(19)-q(4.8)+15,deltaCash=q(29.2)-15)],
  [vals(NWC_cash_effect=-4),dict(EBITDA=q(240)-140-40,EBIT=q(240)-140-40-10,NI=(q(50)-5)*q(.8),NOPAT=q(50)*q(.8),deltaNWC=q(8)+6-4,CFO=q(36)+10-10,FCFF=q(40)+10-10-25,FCFE=q(15)-4+10-4,CFI=q(-25),CFF=q(10)-4-6,cashEnd=q(12)+36-25)]],
 'T3-09':[
  [dict(EPS=F(40,10),DPS=F(16,10),payout=F(16,40),retention=1-F(16,40)),dict(EPS0=F(96,20),DIV0_A=q(96)*q(.5),DPS0_A=q(96)*q(.5)/20,retainedA=q(96)*q(.5),DIV0_B=q(96)*q(.6),DPS0_B=q(96)*q(.6)/20,retainedB=q(96)*q(.4),immediateDifference=q(96)*q(.1))],
  [dict(retained=q(20)*q(.25),Equity1=q(100)+20*q(.25),NI1=q(105)*q(.2),growth=F(1,20)),dict(NOPAT0=q(800)*q(.16),I0=q(400)*q(.1),NI0=q(128)-40*q(.8),ROE=F(96,400),Equity0=q(448),debt0=q(448),NOPAT1=q(896)*q(.16),interest1=q(448)*q(.1),NI1=q(143.36)-q(44.8)*q(.8),growth=q(.5)*q(.24))],
  [dict(DIV1=q(4)*q(1.05),P0=q(4)*q(1.05)/(q(.13)-q(.05))),dict(DIV1=q(96)*q(1.12)*q(.5),P0=q(53.76)/q(.08),DPS1=q(53.76)/20,pricePerShare=q(53.76)/20/q(.08))],
  [dict(divYield=F(3,50),requiredReturn=F(3,50)+q(.04)),dict(price1=q(672)*q(1.12),priceGain=q(672)*q(.12),TSR=(q(53.76)+q(672)*q(.12))/672,ROE=q(107.52)/448,PB=q(672)/448,newPayoutPrice=q(96)*q(1.096)*q(.6)/q(.104),wealthA=q(48)+672,wealthB=q(57.6)+q(96)*q(1.096)*q(.6)/q(.104))],
  [dict(growth=q(.13)-F(4,50),retention=(q(.13)-F(4,50))/q(.2),payout=1-(q(.13)-F(4,50))/q(.2)),dict(growth=(q(396)*q(.2)-36)/(396+36),ROE=F(1,10)/q(.4),DIV1=q(60)*q(1.1)*q(.6),price=q(396),newGrowth=q(.5)*q(.25),newDIV1=q(60)*q(1.125)*q(.5),newPrice=q(60)*q(1.125)*q(.5)/q(.075))],
  [dict(ROE=q(.15)+q(1.5)*(q(.15)-q(.08)),upliftPP=q(1.5)*q(.07)*100),dict(ROE=q(.255),growth=q(.1275),DIV1=q(300)*q(1.1275)*q(.5),P0=q(300)*q(1.1275)*q(.5)/q(.0425),newROE=q(.29),newGrowth=q(.145),newDIV1=q(300)*q(1.145)*q(.5),newPrice=q(300)*q(1.145)*q(.5)/q(.025),targetROE=q(.1275)/q(.4),targetDE=(q(.1275)/q(.4)-q(.15))/q(.07),deltaDE=(q(.1275)/q(.4)-q(.15))/q(.07)-q(1.5))],
  [dict(retention=q(0),growth=q(0),DIV1=q(40),P0=q(40)/q(.12)),dict(retention=q(.6),growth=q(.6)*q(.15),DIV1=q(40)*q(1.09)*q(.4),priceLowDiscount=q(17.44)/q(.03),priceHighDiscount=q(17.44)/q(.04),priceChange=q(17.44)/q(.04)-q(17.44)/q(.03),relativePriceChange=(q(17.44)/q(.04))/(q(17.44)/q(.03))-1)]],
 'T3-10':[
  [dict(CFO=q(2)+q(.5)-1,beforeFinancing=q(2)+q(.5)-1-2),dict(NWC0=q(1.2)+q(.9)-q(.3),NWC1=q(2)+q(1.5)-q(.5),deltaNWC=q(1.2),CFO=q(1.6)+q(.6)-q(1.2),cashBefore=q(.4)+1-q(1.5),borrowing=q(.3)-(q(.4)+1-q(1.5)),PPE1=q(4)+q(1.5)-q(.6),equity1=q(6.2)+q(1.6),assets1=q(.3)+2+q(1.5)+q(4.9))],
  [vals(CM_RUB=100*(2000-1200),EBIT_RUB=100*(2000-1200)-50000,EBITDA_RUB=100*(2000-1200)-50000+10000),thermos],
  [dict(breakevenUnits=q(3000000)/(1200-700),EBIT_at_breakeven=q(0),DOL_at_zero=None),dict(DOL=F(5,2),volumeGrowth=q(.1),profitGrowth=F(5,2)*q(.1),newEBIT_RUB=q(2000000)*q(1.25))],
  [variance(10,12,100,90,0,0,0,0),thermos],
  [vals(VC0_RUB=1000*200,VCflex_RUB=1200*200,VCactual_RUB=1200*205,volumeCost_RUB=200*200,unitCost_RUB=1200*5,totalCostChange_RUB=1200*205-1000*200),thermos],
  [vals(planRevenue_RUB=1*10+1*30,actualRevenue_RUB=2*10+0*30,totalUnitsBoth=2),vals(planCM_RUB=200*40+100*100,planEBIT_RUB=12000,controlCM_RUB=220*40+110*100,actualCM_RUB=230*40+100*100,volumeEffect_RUB=1800,mixEffect_RUB=-600,actualEBIT_RUB=13200)],
  [{'uniqueCashCauseIdentified':False},contour]]}
 assert sum(len(e) for sections in lesson.values() for e in sections)==54
 baseline={
 'income':dict(EBITDA=q(240)-120-50,EBIT=q(240)-120-50-20,NI=(q(50)-10)*q(.8)),
 'nopat':dict(NOPAT=q(130)*q(.8)), 'balance':dict(Equity=q(100)-60),'accounting-nwc':dict(NWC=q(60)-40),'operating-nwc':dict(NWC=q(6)+10-8),'delta-nwc':dict(deltaNWC=q(5)-3-(-1)),'nwc-impact':dict(effect=-(q(11)-8)),'cfo':dict(CFO=q(100)+20-40-30+10),'fcff':dict(FCFF=q(104)+20-20-70),'roe':dict(ROE=F(20,40)),'roc':dict(ROC=F(104,250)),'dupont':dict(ROE=q(.1)*2*q(2.5)),'roe-leverage':dict(ROE1=q(.15)+(q(.15)-q(.1)*q(.8)),ROE2=q(.15)+2*(q(.15)-q(.1)*q(.8))),'ccc':dict(days=q(30)+45-25),'operating-margin':dict(margin=F(40,240)),'ratio-basis':dict(avgA=F(80+120,2),averageReturn=F(20,100),openingReturn=F(20,80),closingReturn=F(20,120)),'roa-framings':dict(EBIT_ROA=F(20,100),NOPAT_ROA=q(20)*q(.8)/100,NI_ROA=(q(20)-5)*q(.8)/100),'asset-turnover':dict(turnover=F(150,50)),'roa-two-factor':dict(ROA=q(.08)*3),'roc-capital-bases':dict(grossROC=F(16,100),netROC=F(16,80)),'after-tax-debt':dict(interest=q(100)*q(.1),shield=q(10)*q(.2),afterTaxCost=q(.1)*q(.8)),'roc-from-roe':dict(ROC=(q(.24)+q(.7)*q(.105))/q(1.7)),'interest-coverage':dict(ICR=F(30,10)),'degree-leverage':dict(DFL=F(30,20),NI_relative_growth=F(30,20)*q(.1)),'equity-multiplier':dict(EM=F(100,40),onePlusDE=1+F(40,40),APoverE=F(20,40)),'economic-profit':dict(EP=q(10)-q(100)*q(.12),NI=q(10)-q(4)*q(.8),ROE=(q(10)-q(4)*q(.8))/60),'current-liquidity':dict(CR=F(100,50)),'quick-liquidity':dict(QR=F(100-40,50)),'cash-liquidity':dict(cashRatio=F(10,50)),'dso-days':dict(DSO=F(15,90)*30),'dih-days':dict(DIH=F(24,292)*365),'dpo-days':dict(DPO=F(26,260)*360),'cycle-funding-limits':dict(AR=F(365,365)*30,INV=q(182.5)/365*40,AP=q(182.5)/365*20,NWC=q(40),CCC=q(30)+40-20,dailyCOGS=q(182.5)/365,proxyNWC=q(50)*q(.5)),'growth-retention':dict(growth=q(.5)*q(.25)),'gordon-next-dividend':dict(DIV1=q(60)*q(1.125)*q(.5),P0=q(60)*q(1.125)*q(.5)/q(.075)),'fcfe':dict(NB=q(8)-3,FCFE=q(40)-q(10)*q(.8)+8-3)}
 new={
 'c3-inventory-cost-chain':factory,'c3-pnl-embedded-depreciation':factory,'c3-analysis-growth-share':lesson['T3-02'][4][1],'c3-cash-reconciliation':vector,'c3-direct-cfo':vector,'c3-interest-classification-bridge':lesson['T3-04'][5][0],'c3-payout-retention':lesson['T3-09'][0][1],'c3-shareholder-return':lesson['T3-09'][3][1],'c3-forward-book-multiple':dict(PB=q(672)/448,ROE=q(107.52)/448),'c3-budget-contribution':dict(EBIT_RUB=q(10000)*(1200-700)-3000000,EBITDA_RUB=q(2600000)),'c3-operating-leverage':lesson['T3-10'][2][1],'c3-flexible-budget':thermos,'c3-revenue-variance':thermos,'c3-profit-variance':thermos,'c3-market-multiples':dict(MarketCap_million=q(60)*10,PE=F(60,5),PB=F(600,200),MVA_million=q(600)-200)}
 assert len(baseline)==36 and len(new)==15
 return enc({'method':'Separate Fraction calculations from actual stated facts; formulas and examples read manually; no application finance engine imported.','newLessons':lesson,'baselineFormulaExamples':baseline,'newFormulaExamples':new,'counts':{'newWorkedExamples':54,'baselineFormulas':36,'newFormulas':15}})
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path);a=p.parse_args();text=json.dumps(oracles(),ensure_ascii=False,indent=2)+'\n'
 if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(text)
 else:print(text,end='')
