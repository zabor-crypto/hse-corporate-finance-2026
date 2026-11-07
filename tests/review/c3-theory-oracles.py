#!/usr/bin/env python3
"""Independent conceptual keys and rational arithmetic, not author-key extraction."""
import json
import argparse
from fractions import Fraction as F
from pathlib import Path

KEYS=['a','ad','ad','a','ac','c','ab','ac','ad','a','ac','a','ac','bc','b','a','ad','ad','b','ac','bd','bc','ac','a','ac','ab','bc','ac','ac','bd','b','bd','ac','ac','ac','ac','ac','ac','bc','bd']
REASONS=[
 ['AR is a date stock and annual sales a period flow.','Both annual sales and CFO are flows.','CFO then cash is flow then stock, reversed.','Expenses and profit are both period flows.'],
 ['Paid dividends reduce cash and retained equity.','A distribution is not an EBIT or taxable operating expense.','Under stated financing convention the payment is CFF, not CFO.','It distributes capital-owner claims rather than creating P&L expense.'],
 ['Gross profit is100−60=40 from the current sale.','Collection of oldAR does not add current sales: sales100.','Collection swaps AR for cash without a second gain.','Revenue100 and old-account collections40 arise from different events.'],
 ['Completed cost120+openingFG10−closingFG25=105.','120 omits net inventory accumulation15.','135 adds net inventory growth instead of subtracting it.','95 equals120−25 and omits opening stock10.'],
 ['Reported expenses already contain DA: EBIT200−120−30=50.','38 deducts embedded DA12 a second time.','EBITDA50+10+2=62.','The proposed second deduction repeats an expense already in EBIT.'],
 ['Directness depends on the cost object, not variable behavior.','A dedicated fixed salary is a counterexample.','Traceability and response to activity are independent dimensions.','SG&A can include variable commissions and stepped fixed costs.'],
 ['NI=(100−20)*.8=64.','NOPAT=100*.8=80.','64 leaves interest in a purported financing-neutral numerator.','80 ignores after-tax interest16 in actual equity income.'],
 ['Cash and short-term debt add equally to CA and CL, delta0.','The operating AR/INV/AP set does not receive either financial item.','Cash and bank loan are both excluded from simplified operating NWC.','No fall in CA−CL occurs until a separately specified spending transaction.'],
 ['Trade receivables are operating assets.','Cash is excluded from noncash operating NWC.','Interest-bearing bank financing is excluded from spontaneous AP.','Operating supplier AP finances operating assets and has minus sign.'],
 ['Inventory release6 less supplier debt repayment9 gives CFO−3.','Plus3 reverses the net cash effect.','Plus15 treats supplier repayment as an inflow.','Minus15 treats inventory release as an outflow.'],
 ['Reclassification changes components, not total cash.','Moving interest byI necessarily changes CFO byI.','Comparable CFO requires harmonizing the category policy.','Accounting category relabeling produces no new profit.'],
 ['FCFE80−8+15−5=82.','72 excludes net borrowing10.','90 adds net borrowing but ignores interest after tax.','The plausible wrong add-interest route is98=80+8+15−5, not102.'],
 ['Subtract investment gain10 from NI when deriving CFO.','Putting sale proceeds30 in CFO duplicates a CFI cash transaction.','Sale proceeds30 belong to the stated investing category.','Adding gain10 again compounds the double count; tax is separately reconciled.'],
 ['New borrowing is financing and does not add to FCFF.','Paid CapEx40 reduces FCFF40 holding operations fixed.','Borrowing40 is CFF+40.','Zero net total cash does not mean both entries belong in CFO.'],
 ['NI/Assets is one possible convention, not a guaranteed one.','The economic numerator and stock date must be identified first.','GrossROC uses D+E, not automatically the same asset numerator/base.','NI, EBIT and NOPAT are financially different numerators.'],
 ['Average equity(80+120)/2=100, so ROE20%.','25% uses opening equity80.','16.667% uses closing equity120.','40% does not use the required average denominator100.'],
 ['.08*3=.24 gives NOPAT/Assets on consistent bases.','ROE needs NI and equity, not just operating return.','24% is a return on assets, not NI divided by sales.','Interest/tax bridge and equity are required to reach ROE.'],
 ['Gross and cash-net capital are distinct contracts.','With positive NOPAT and nonzero cash their returns differ.','Unadjusted gross leverage identity cannot accept cash-netROC.','Numerator, capital composition and time base must be matched.'],
 ['A second tax adjustment understates an already after-tax rate.','Use the stated after-tax .105 directly in the leverage spread.','Dividing an interest rate by equity creates a different dimension.','WACC also requires equity cost and financing weights.'],
 ['ICR100/25=4.','DFL denominator is EBIT−I, not I.','DFL100/75=4/3.','No D/E can be recovered from EBIT and I without debt/equity bases and rate.'],
 ['Negative operating earnings are not positive debt-service coverage.','EBIT below zero cannot cover positive interest from operating profit.','Absolute value destroys the economically relevant loss sign.','Actual liquidity also depends on cash receipts, debt maturity and funding.'],
 ['Higher bookROE is not a sufficient value-creation condition.','Smaller equity denominator and greater financial risk can raise ROE.','Return must be compared with matching risk-adjusted required return.','Cost of equity can rise with financial leverage; constancy is an assumption.'],
 ['With positive unchanged CL, rising CA raises CR despite declining cash.','Slow or doubtful current assets do not guarantee payment ability.','Asset quality and conversion timing matter.','Inventory and receivables are not instant cash equivalents.'],
 ['Permitted quick assets10+20=30; QR30/25=1.2.','1.8=(75−30)/25 wrongly retains prepayments.','3.0=75/25 is total current ratio.','2.4=(75−15)/25 removes prepayments but wrongly retains inventory.'],
 ['The receivable stock perimeter must match related credit-sales flow.','Including cash sales without adjustment understates credit collection days.','Period length and seasonal averaging affect the estimate.','Monthly flow with annual365 multiplier is a period mismatch.'],
 ['Supplier AP arises from credit purchases, so matching purchase base is preferable.','COGS can proxy purchases only with disclosed limitations.','Bank loan is a different creditor/financing class.','Inventory changes make purchases differ from sold cost.'],
 ['NOPAT/Sales substitution leaves NOPAT/Equity, not actualNI/Equity.','Cancellation gives exactly NOPAT/Equity on common bases.','The new numerator excludes financing interest effects.','Another tax factor does not restore missing interest expenses.'],
 ['OldROE=.10*2*2=.40; new=.08*2*3=.48.','The stated margin declines; ROE growth cannot prove the opposite.','Equity multiplier increase outweighs margin decline.','ROE can change through margin or multiplier at unchanged turnover.'],
 ['Internal balances and unrealized inventory profit can require eliminations.','Group external sales exclude intragroup trades.','Group asset perimeter, taxes and stock timing must be consistent.','Naive summation ignores consolidation adjustments and incompatible reported perimeters.'],
 ['Identical final ROE can mask different operational and leverage risk.','Factor decomposition and comparable accounting bases are warranted.','Accrual return does not determine cash flow.','Risk pricing and future cash are additionally needed for valuation.'],
 ['10 is past dividend, not next expected payment.','Next dividend10*(1+.05)=10.5.','9.5 applies the growth sign backwards.','15 is the return percentage, not a cash dividend amount.'],
 ['The ordinary finite positive-growth perpetuity requires re>g.','When g>=re the assumed positive-dividend perpetuity does not converge.','A negative algebraic denominator is model failure, not a price forecast.','A revised finite high-growth stage or other justified model may be needed.'],
 ['Retention and return on reinvested equity must be coherently defined.','Payout and financing constraints limit internally sustainable growth.','A stable target financing structure and matching beginning-equity ROE support the model.','Historical ROE cannot guarantee reinvestment opportunities forever.'],
 ['Price200/10=20, EPS20/10=2, PE10 and PB2 on common money/share scales.','Book return is not automatically investor required return.','MVA200−100=100 is a valuation stock, not annualEP flow.','Price is not a declared dividend; DPS needs payout data.'],
 ['Volume20*10=200, price100*1=100 and interaction20*1=20.','A single product has no changing product mix here.','Fact1320−plan1000=320.','200+100 omits interaction20.'],
 ['Plan100*3+200=500, flexible120*3+200=560, excess590−560=30.','60 of total increase90 is normal volume cost under the plan rate.','Volume increase20*3=60.','A higher cost at same activity is not automatically favorable.'],
 ['Contribution100−60=40; EBIT40−20=20 because fixed costs include DA; DOL2.','Including DA makes the residual EBIT rather than EBITDA.','At fixed unit economics sales+1% produces EBIT20.4, a2% increase.','At EBIT0 a relative operating-profit sensitivity divides by zero.'],
 ['Payment occurs in first-year investing flow.','NewDA begins next year under the explicit policy.','PPE increases by paid acquisition and decreases by previously operating asset DA.','Capitalization of an asset does not eliminate the cash payment.'],
 ['Bank funding does not repair operating margin or collection timing.','The new liability and CFF financing flow are distinct from the operating cash use.','Future interest charges reduce NI and cash availability.','External funding does not prove operations self-financing.'],
 ['Missing policies cannot be silently assigned zero and called official.','Full statements require explicit stock, tax, investment, payout and funding policies.','Sales is not a legitimate balancing plug.','An explicit conditional model with both identities is useful without uniqueness claim.']
]
assert len(KEYS)==len(REASONS)==40 and all(len(x)==4 for x in REASONS)

def scalar(x):return {'exact':str(x),'value':float(x)}
def numeric():
 rows={
  3:{'grossProfit':F(100)-60,'sales':F(100),'collections':F(40)},
  4:{'COGS':F(120)+10-25,'reverseSignCOGS':F(120)+25-10,'omittedOpeningCOGS':F(120)-25},
  5:{'EBIT':F(200)-120-30,'EBITDA':F(200)-120-30+10+2},
  7:{'NI':(F(100)-20)*F(4,5),'NOPAT':F(100)*F(4,5)},
  10:{'deltaNWC':F(-6)-(-9),'CFOeffect':F(6)-9},
  12:{'afterTaxInterest':F(10)*F(4,5),'netBorrowing':F(15)-5,'FCFE':F(80)-10*F(4,5)+15-5,'wrongAddInterestFCFE':F(80)+10*F(4,5)+15-5},
  13:{'saleGain':F(30)-20,'CFOgainAdjustment':F(-10),'CFIproceeds':F(30)},
  14:{'FCFFcapexEffect':F(-40),'CFFborrowingEffect':F(40),'combinedCashEffect':F(0)},
  16:{'avgEquity':F(80+120,2),'ROEavg':F(20)/100,'ROEopening':F(20)/80,'ROEclosing':F(20)/120},
  17:{'ROA_NOPAT':F(8,100)*3},
  20:{'ICR':F(100)/25,'DFL':F(100)/(100-25)},
  24:{'CA':F(10+20+30+15),'QRdeclared':F(10+20,25),'QRnaive':F(75-30,25),'CR':F(75,25),'wrongRetainedInventory':F(75-15,25)},
  28:{'ROEold':F(10,100)*2*2,'ROEnew':F(8,100)*2*3},
  31:{'DIV1':F(10)*F(105,100)},
  34:{'price':F(200,10),'EPS':F(20,10),'PE':F(200,20),'PB':F(200,100),'MVA':F(200)-100,'ROEgivenBookBase':F(20,100)},
  35:{'volumeEffect':F(120-100)*10,'priceEffect':F(100)*(11-10),'interaction':F(120-100)*(11-10),'total':F(120*11-100*10)},
  36:{'planCost':F(100*3+200),'flexCost':F(120*3+200),'volumeCost':F(20*3),'excessVsFlex':F(590)-560,'totalVsPlan':F(590)-500},
  37:{'contribution':F(100)-60,'EBIT':F(100)-60-20,'DOL':F(100-60,100-60-20),'EBITafterSalesUp1pct':F(101)-F('60.6')-20,'relativeEBITgrowth':(F('20.4')-20)/20}
 }
 return {f'C3-T{k:02}':{name:scalar(value) for name,value in values.items()} for k,values in rows.items()}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path);args=p.parse_args()
 data={'role':'Independent Finance Reviewer; all160 option decisions independently explained','items':[{'id':f'C3-T{i+1:02}','correctOptionIds':list(key),'optionReasoning':dict(zip('abcd',reason))} for i,(key,reason) in enumerate(zip(KEYS,REASONS))],'numericDerivations':numeric(),'preFixFindings':['T04 explain95 as omitted opening stock, not sign-subtracted stock.','T12 wrong add-after-tax-interest route is98, not102.','T24 source83 and diagnose2.4 as retaining inventory while excluding prepayments.','T22 direct value-creation source81 should be included.','Standalone numerical units and stock/flow dates should be stated, especially aggregate/per-share scaling inT34.']}
 text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if args.output:args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(text)
 else:print(text,end='')
