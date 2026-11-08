#!/usr/bin/env python3
"""Independent exact monetary-route oracle, derived from input-only task message."""
import json,sys
from pathlib import Path
from fractions import Fraction as F
roe=F(216,1000);equity=F(75);de=F(6,10);after_tax_debt_cost=F(9,100);tax=F(1,4)
debt=equity*de;capital=equity+debt;ni=roe*equity;interest_after_tax=after_tax_debt_cost*debt;nopat=ni+interest_after_tax;roc=nopat/capital
interest_pre_tax=interest_after_tax/(1-tax);ebit=nopat/(1-tax);ebt=ebit-interest_pre_tax;assert ebt*(1-tax)==ni
assert (roc-after_tax_debt_cost)*de+roc==roe
wrong_interest=interest_after_tax*(1-tax);wrong_nopat=ni+wrong_interest;wrong_roc=wrong_nopat/capital
values={'ni':ni,'interest-after-tax':interest_after_tax,'nopat':nopat,'roc-gross':roc*100}
record={'id':'C3-R01','version':'1.0.0','origin':'Independent Finance Reviewer, Fraction arithmetic from input-only message before reading authored source/keys; monetary route and pre-taxP&L cross-check.','inputs':{'roe':float(roe),'equity':float(equity),'debtEquity':float(de),'afterTaxDebtCost':float(after_tax_debt_cost),'taxRate':float(tax)},'stages':[{'id':k,'expected':float(v),'exact':str(v),'unit':'%'if k=='roc-gross'else'млн ₽'}for k,v in values.items()],'proof':{k:{'exact':str(v),'value':float(v)}for k,v in {'debt':debt,'grossCapital':capital,'ni':ni,'afterTaxInterest':interest_after_tax,'NOPAT':nopat,'grossROC':roc,'pretaxInterest':interest_pre_tax,'EBIT':ebit,'EBT':ebt,'actualTax':ebt*tax,'wrongDoubleTaxInterest':wrong_interest,'wrongDoubleTaxNOPAT':wrong_nopat,'wrongDoubleTaxROCPercent':wrong_roc*100}.items()},'domains':['Positive equity and gross capital; constant matched annual debt/equity bases.','Tax<1 needed only to reconstruct pretax values; after-tax inverse relation already uses given net debt cost.','Full proportional shield and no additional profit/tax items ensure NOPAT=NI+after-taxI.','Cash-net ROC not substituted into gross identity.']}
Path(sys.argv[1]).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps(record['stages']))
