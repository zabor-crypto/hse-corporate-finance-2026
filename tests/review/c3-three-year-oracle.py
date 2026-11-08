#!/usr/bin/env python3
"""Independent rational three-year oracles; primary CFO route is direct receipts/payments.
No application finance-engine import. Two extra scenarios are reviewer experiments only.
"""
import argparse
import json
from fractions import Fraction as F
from pathlib import Path

OPENING={'cash':25,'ar':20,'inventory':30,'ap':20,'ppe':300,'debt':250,'equity':105}
BASE={'sales':[200,250,230],'dso':[54.75,54.75,54.75],'days':365,'inventoryToSales':.15,'apToSales':.1,'nopatMargin':.3,'taxRate':.2,'debtRate':.1,'payout':.5,'capex':[0,0,0],'openingRemainingLife':10,'newAssetLife':10,'minimumCash':25,'funding':'fixed-debt'}

def number(value):
    return F(str(value))

def compute(policy, opening_input=None):
    opening={k:number(v) for k,v in (opening_input or OPENING).items()}
    previous=dict(opening)
    earnings_retained=F(0)
    borrowing_total=F(0)
    rows=[]
    for year in range(3):
        sales=number(policy['sales'][year])
        ar=sales*number(policy['dso'][year])/number(policy['days'])
        inventory=sales*number(policy['inventoryToSales'])
        ap=sales*number(policy['apToSales'])
        # Closed-form vintage book values, rather than author-engine remaining balances.
        ppe=max(F(0),opening['ppe']*(1-F(year+1,policy['openingRemainingLife'])))
        for purchase_year in range(year+1):
            capex_amount=number(policy['capex'][purchase_year])
            ppe+=max(F(0),capex_amount*(1-F(year-purchase_year,policy['newAssetLife'])))
        capex=number(policy['capex'][year])
        da=previous['ppe']+capex-ppe
        nopat=sales*number(policy['nopatMargin'])
        ebit=nopat/(1-number(policy['taxRate']))
        cash_cost=sales-ebit-da
        interest=previous['debt']*number(policy['debtRate'])
        ebt=ebit-interest
        tax=max(F(0),ebt)*number(policy['taxRate'])
        ni=ebt-tax
        # Independent direct cash ledger: sales collection and cash operating payments.
        receipts=sales-(ar-previous['ar'])
        operating_payments=cash_cost+(inventory-previous['inventory'])-(ap-previous['ap'])
        direct_cfo=receipts-operating_payments-interest-tax
        dividends=max(F(0),ni)*number(policy['payout'])
        cash_before=previous['cash']+receipts-operating_payments-interest-tax-capex-dividends
        gap=max(F(0),number(policy['minimumCash'])-cash_before)
        borrowing=gap if policy['funding']=='revolver' else F(0)
        cash=cash_before+borrowing
        earnings_retained+=ni-dividends
        borrowing_total+=borrowing
        equity=opening['equity']+earnings_retained
        debt=opening['debt']+borrowing_total
        nwc=ar+inventory-ap
        delta_nwc=nwc-(previous['ar']+previous['inventory']-previous['ap'])
        indirect_cfo=ni+da-delta_nwc
        assets=cash+ar+inventory+ppe
        claims=ap+debt+equity
        cfi=-capex
        cff=borrowing-dividends
        assert direct_cfo==indirect_cfo
        assert assets==claims
        assert cash-previous['cash']==direct_cfo+cfi+cff
        average_equity=(previous['equity']+equity)/2
        average_gross_capital=(previous['equity']+previous['debt']+equity+debt)/2
        average_net_capital=(previous['equity']+previous['debt']-previous['cash']+equity+debt-cash)/2
        assert average_net_capital==(previous['ppe']+previous['ar']+previous['inventory']-previous['ap']+ppe+nwc)/2
        values={'year':year+1,'sales':sales,'cashOperatingCosts':cash_cost,'da':da,'ebitda':ebit+da,'ebit':ebit,'interest':interest,'ebt':ebt,'tax':tax,'ni':ni,'nopat':nopat,'ar':ar,'inventory':inventory,'ap':ap,'operatingNwc':nwc,'deltaNwc':delta_nwc,'capex':capex,'cfo':direct_cfo,'cfi':cfi,'cff':cff,'dividends':dividends,'borrowing':borrowing,'cashBeforeFunding':cash_before,'cash':cash,'fundingNeed':gap,'ppe':ppe,'debt':debt,'equity':equity,'assets':assets,'liabilitiesAndEquity':claims,'balanceResidual':F(0),'cashResidual':F(0),'roe':ni/average_equity if average_equity>0 else None,'grossRoc':nopat/average_gross_capital if average_gross_capital>0 else None,'netRoc':nopat/average_net_capital if average_net_capital>0 else None,'debtEquity':debt/equity if equity>0 else None,'status':'FUNDED' if cash>=number(policy['minimumCash']) else 'FUNDING_GAP'}
        rows.append({'values':{k:float(v) if isinstance(v,F) else v for k,v in values.items()},'exact':{k:str(v) for k,v in values.items() if isinstance(v,F)},'directCashProof':{'collections':str(receipts),'cashOperatingPayments':str(operating_payments),'paidInterest':str(interest),'cashTaxes':str(tax),'CFO_direct':str(direct_cfo),'CFO_indirect':str(indirect_cfo),'balanceIdentityExact':True,'cashIdentityExact':True,'fullInterestShieldIdentityApplies':nopat-ni==interest*(1-number(policy['taxRate']))}})
        previous={'cash':cash,'ar':ar,'inventory':inventory,'ap':ap,'ppe':ppe,'debt':debt,'equity':equity}
    return rows


def fixtures():
    stress={**BASE,'sales':[300,450,600],'dso':[120,150,180]}
    scenarios={'base':dict(BASE),'growthUnfunded':stress,'growthFunded':{**stress,'funding':'revolver'},'reviewOnlyCapexVintages':{**BASE,'capex':[10,20,0],'newAssetLife':2},'reviewOnlyLossNoTaxCredit':{**BASE,'debtRate':.8}}
    result={name:{'opening':dict(OPENING),'policy':p,'canonicalTeachingScenario':not name.startswith('reviewOnly'),'years':compute(p)} for name,p in scenarios.items()}
    neva={'cash':18,'ar':24,'inventory':36,'ap':20,'ppe':240,'debt':180,'equity':118}
    neva_policy={**BASE,'sales':[240,300,330],'nopatMargin':.2}
    result['reviewOnlyNevaIndependent']={'opening':neva,'policy':neva_policy,'canonicalTeachingScenario':False,'years':compute(neva_policy,neva)}
    capex_neva={**neva_policy,'capex':[40,0,0],'newAssetLife':5}
    result['reviewOnlyNevaCapexEndYear']={'opening':neva,'policy':capex_neva,'canonicalTeachingScenario':False,'years':compute(capex_neva,neva)}
    model_inputs={
        'assessmentC3M01':({'cash':22,'ar':18,'inventory':24,'ap':12,'ppe':180,'debt':120,'equity':112},{**BASE,'sales':[160,220,260],'dso':[36.5,36.5,36.5],'nopatMargin':.24,'debtRate':.08,'payout':.30,'openingRemainingLife':10,'newAssetLife':5,'minimumCash':20}),
        'assessmentC3M02':({'cash':30,'ar':20,'inventory':30,'ap':20,'ppe':200,'debt':160,'equity':100},{**BASE,'sales':[220,280,340],'dso':[60,75,90],'apToSales':.08,'nopatMargin':.20,'taxRate':.25,'payout':.40,'capex':[20,30,0],'newAssetLife':5,'minimumCash':20})
    }
    for name,(opening,policy) in model_inputs.items():
        result[name]={'opening':opening,'policy':policy,'canonicalTeachingScenario':False,'independentAssessmentCase':True,'years':compute(policy,opening)}
    assert [x['values']['cash'] for x in result['reviewOnlyNevaIndependent']['years']]==[50.8,85.6,129.4]
    assert [x['values']['cash'] for x in result['base']['years']]==[65,112.5,171]
    assert [x['values']['da'] for x in result['reviewOnlyCapexVintages']['years']]==[30,35,45]
    assert all(x['values']['tax']==0 and x['values']['dividends']==0 for x in result['reviewOnlyLossNoTaxCredit']['years'])
    return {'method':'Independent Python Fraction arithmetic; direct cash ledger plus separate indirect and balance identities; no author engine imports.','scenarios':result}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path);args=p.parse_args()
    data=json.dumps(fixtures(),indent=2)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(data)
    else:print(data,end='')
