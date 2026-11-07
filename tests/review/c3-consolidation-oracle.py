#!/usr/bin/env python3
"""Independent rational oracle from transcribed scenario; no application imports."""
import json,sys
from fractions import Fraction as F
from pathlib import Path
x={'retailSales':560,'supplierSales':240,'currentInternalSales':100,'retailOperatingExpensesExDa':410,'supplierOperatingExpensesExDa':180,'retailDa':30,'supplierDa':20,'retailExternalInterest':12,'supplierExternalInterest':8,'tax':F(1,4),'openingRetailAssets':300,'openingSupplierAssets':180,'closingRetailAssets':340,'closingSupplierAssets':210,'openingInternalReceivable':24,'closingInternalReceivable':36,'openingInternalInventoryTransferValue':30,'openingInternalInventorySupplierCost':20,'closingInternalInventoryTransferValue':45,'closingInternalInventorySupplierCost':30}
opening_profit=F(x['openingInternalInventoryTransferValue']-x['openingInternalInventorySupplierCost']);closing_profit=F(x['closingInternalInventoryTransferValue']-x['closingInternalInventorySupplierCost']);delta_profit=closing_profit-opening_profit
retail_ebt=F(x['retailSales']-x['retailOperatingExpensesExDa']-x['retailDa']-x['retailExternalInterest']);supplier_ebt=F(x['supplierSales']-x['supplierOperatingExpensesExDa']-x['supplierDa']-x['supplierExternalInterest'])
individual_ni=(retail_ebt+supplier_ebt)*(1-x['tax']);group_ni=individual_ni-delta_profit*(1-x['tax']);current_tax=(retail_ebt+supplier_ebt)*x['tax'];opening_dta=opening_profit*x['tax'];closing_dta=closing_profit*x['tax'];tax_expense=current_tax-(closing_dta-opening_dta)
group_ebt=retail_ebt+supplier_ebt-delta_profit;assert group_ni==group_ebt-tax_expense
interest=x['retailExternalInterest']+x['supplierExternalInterest'];ebit=group_ebt+interest;nopat=group_ni+interest*(1-x['tax']);assert nopat==ebit*(1-x['tax'])
opening_assets=F(x['openingRetailAssets']+x['openingSupplierAssets']-x['openingInternalReceivable'])-opening_profit+opening_dta
closing_assets=F(x['closingRetailAssets']+x['closingSupplierAssets']-x['closingInternalReceivable'])-closing_profit+closing_dta
average_assets=(opening_assets+closing_assets)/2
second_average=F(x['openingRetailAssets']+x['openingSupplierAssets']+x['closingRetailAssets']+x['closingSupplierAssets'],2)-F(x['openingInternalReceivable']+x['closingInternalReceivable'],2)-(opening_profit+closing_profit)/2+(opening_dta+closing_dta)/2
assert average_assets==second_average
sales=F(x['retailSales']+x['supplierSales']-x['currentInternalSales']);turnover=sales/average_assets;margin=nopat/sales;roa=nopat/average_assets;assert roa==margin*turnover
values={'group-sales':sales,'profit-change':delta_profit,'group-ebit':ebit,'average-assets':average_assets,'group-ni':group_ni,'group-turnover':turnover,'group-margin':margin*100,'group-roa':roa*100}
units={k:('%'if k in ['group-margin','group-roa']else'раза'if k=='group-turnover'else'млн ₽')for k in values}
pack=lambda v:{'exact':str(v),'value':float(v)}
record={'origin':'Independent Finance Reviewer, rational NI reconciliation and average-component routes; no application engine used','id':'C3-C01','version':'1.0.0','inputs':{k:float(v)if isinstance(v,F)else v for k,v in x.items()},'stages':[{'id':k,'expected':float(v),'exact':str(v),'unit':units[k]}for k,v in values.items()],'proof':{k:pack(v)for k,v in {'openingInternalProfit':opening_profit,'closingInternalProfit':closing_profit,'individualNI':individual_ni,'currentTax':current_tax,'openingDTA':opening_dta,'closingDTA':closing_dta,'taxExpense':tax_expense,'groupEBT':group_ebt,'NOPAT':nopat,'openingAdjustedAssets':opening_assets,'closingAdjustedAssets':closing_assets,'averageAdjustedAssets':average_assets,'alternativeAverageAdjustedAssets':second_average,'NIifOpeningProfitReleaseOmitted':(group_ebt-opening_profit)*(1-x['tax'])}.items()},'manualReview':{'allConsolidationAdjustmentsExplicitlyBounded':True,'sameDateEliminationsBeforeAverage':True,'DTAexcludedFromIndividualAssetsThenAddedOnce':True,'externalInterestRetained':True,'expenseNotCashTaxPayment':True,'NOPATdistinctFromNI':True,'source3_3UnderdeterminationNotRetconned':True,'oneScenarioNotEvidenceOfBroadMastery':True}}
Path(sys.argv[1]).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'id':record['id'],'stages':record['stages']}))
