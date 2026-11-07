#!/usr/bin/env python3
"""Independent source-calibration oracle. Does not import author engine or content.
Run with --output DIR; teacher source paths are supplied separately by the reviewer.
"""
import argparse
from fractions import Fraction as F
import json
from pathlib import Path


def encode(value):
    if isinstance(value, F):
        return {'exact': str(value), 'value': float(value)}
    if isinstance(value, dict):
        return {k: encode(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [encode(v) for v in value]
    return value


def independent_calibrations():
    out = {}
    s, cogs, overhead, da, tax = map(F, [350, 120, 80, 20, '0.2'])
    ebitda = s-cogs-overhead
    ebit = ebitda-da
    nopat = ebit*(1-tax)
    dnwc = F('0.2')*s-50
    fcff = nopat+da-dnwc-70
    out['3.1'] = {'status': 'CONDITIONAL_CORE_AND_NONUNIQUE_ROC',
        'assumptions': ['Costs do not already include the separately deducted DA.', 'NWC means operating noncash NWC; CapEx70 is paid in-period.', 'Operating FA only, no disposals or other changes for illustrative IC dates.'],
        'values': {'EBITDA': ebitda, 'EBIT': ebit, 'NOPAT': nopat, 'NWC1': F(70), 'deltaNWC': dnwc, 'FCFF': fcff,
                   'IC0': F(250), 'IC1': F(320), 'ICavg': F(285), 'ROC_opening': nopat/250, 'ROC_closing': nopat/320, 'ROC_average': nopat/285,
                   'NI_if_new_interest_accrual_zero': (ebit-15)*(1-tax), 'NI_if_full_year_new_interest_accrual6': (ebit-15-6)*(1-tax)},
        'nonunique': ['No capital date/base specified; the three ROC values are conditional alternatives, not three official answers.', 'First payment next year does not establish zero current interest expense; current accrual a gives NI92−0.8a.']}
    assert fcff == ebitda*(1-tax)+tax*da-dnwc-70 == 34
    n0, n1 = F(6+10-8), F(11+7-7)
    out['3.2'] = {'status': 'DETERMINATE_INCREMENT_HOLDING_OTHERS_FIXED', 'values': {'NWC0': n0, 'NWC1': n1, 'deltaNWC': n1-n0, 'FCFF_change': -(n1-n0), 'inventory_effect': F(3), 'AR_effect': F(-5), 'AP_effect': F(-1)}, 'nonunique': ['Absolute total FCFF is not supplied.']}
    out['3.3'] = {'status': 'PARTLY_DETERMINATE_CONSOLIDATION_UNDERDEFINED', 'values': {'AT_A_on_opening_assets': F(100,50), 'AT_B_on_opening_assets': F(20,20), 'ROA_NI_A': F(10,50), 'ROA_NI_B': F(4,20), 'ROS_A': F(10,100), 'ROS_B': F(4,20)}, 'symbolic': {'NOPAT_A': '10+2.5*(1−t_A)', 'NOPAT_B': '4+1*(1−t_B)'}, 'nonunique': ['Tax rates absent for NOPAT operating margin.', 'B initial sales20 versus later100 has unspecified external/internal scope.', 'Assets after consolidation and unrealized inventory-profit elimination absent. No unique post-merger key.']}
    out['3.4'] = {'status': 'PROFITABILITY_CONDITIONAL_CASHFLOWS_UNDERDEFINED', 'assumptions': ['Indirect100 excludes separately stated DA50.', 'Assets1000 financed only by D+E, no other liabilities for D/E reconstruction.'], 'values': {'EBITDA': F(200), 'EBIT': F(150), 'NOPAT': F(120), 'ROA_NOPAT': F(3,25), 'unlevered': {'D': F(0), 'E': F(1000), 'I': F(0), 'NI': F(120), 'ROE': F(3,25), 'ROA_NI': F(3,25), 'DFL': F(1)}, 'D_over_E_1': {'D': F(500), 'E': F(500), 'I': F(50), 'NI': F(80), 'ROE': F(4,25), 'ROA_NI': F(2,25), 'DFL': F(3,2)}}, 'symbolic': {'FCFF': '170−deltaOperatingNWC−CapEx', 'FCFE_debt_case': '130−deltaOperatingNWC−CapEx+netBorrowing'}, 'nonunique': ['Total assets constant does not separately specify CapEx, deltaOperatingNWC, net borrowing or dividend/cash policies. No unconditional FCFF/FCFE numeric key.']}
    sales, nopat, interest, tax = F(3)*50, F('0.08')*3*50, F(1,2), F(1,5)
    ni = nopat-interest*(1-tax)
    out['3.5'] = {'status': 'DETERMINATE_UNDER_SLIDE76_MARGIN_AND_CONSISTENT_ASSET_BASIS', 'assumptions': ['Operating margin is NOPAT/Sales, not EBIT/Sales.', 'Assets50 is the basis used by supplied turnover and requested return; periods and stock dates aligned.', 'Interest500 thousand equals0.5 million.'], 'values': {'Sales': sales, 'NOPAT': nopat, 'NI': ni, 'ROA_NOPAT': nopat/50, 'ROA_NI': ni/50, 'ROE': ni/30}, 'wrong_convention_counterexample': {'ROE_if_8pct_meant_EBIT_margin': (F('0.08')*sales-interest)*(1-tax)/30}}
    roe, leverage, debt_aftertax = F('0.24'), F('0.7'), F('0.105')
    roc = (roe+leverage*debt_aftertax)/(1+leverage)
    out['3.6'] = {'status': 'DETERMINATE_UNDER_GROSS_SLIDE79_CAPITAL', 'values': {'ROC': roc}, 'assumptions': ['Capital=D+E on matching basis.', 'Debt cost10.5% is already after tax; no second tax multiplier.']}
    assert roc+leverage*(roc-debt_aftertax) == roe
    out['3.7'] = {'status': 'THREE_STATEMENTS_REQUIRE_EXPLICIT_POLICIES', 'assumptions_for_profit_block_only': ['Operating margin30% is NOPAT/Sales per76.', 'Debt250 unchanged, annual interest rate10%, proportional tax20%.'], 'profit_block': [{'year': i+1, 'Sales': F(s), 'NOPAT': F(s)*F(3,10), 'interest': F(25), 'NI': F(s)*F(3,10)-20, 'dividends_at_50pct_NI': (F(s)*F(3,10)-20)/2} for i,s in enumerate([200,250,230])], 'nonunique': ['NWC turnover5 must be declared as opening/end/average and cash-inclusive versus operating.', '30 starting NWC and25 cash cannot be added if NWC already includes cash.', 'CapEx, residual assets/life, actual operating AR/INV/AP split, cash and funding policies not supplied.', 'No unique full cash/balance model or book-equity return date; author must supply assumptions and reviewer will recompute after handoff.']}
    ni0, p, re, value = F(60), F(3,5), F(1,5), F(396)
    growth = (value*re-ni0*p)/(value+ni0*p)
    roe = growth/(1-p)
    p2=F(1,2);g2=(1-p2)*roe;value2=ni0*(1+g2)*p2/(re-g2)
    out['3.8'] = {'status': 'DETERMINATE_WITH_EXPLICIT_GORDON_STEADY_STATE', 'assumptions': ['NI60 is last-year NI0; next dividend is NI0*(1+g)*payout.', 'Constant payout/ROE/re, no share count changes, g=b*ROE and re>g.', 'Policy comparison keeps historical NI0 and stated ROE; does not mechanically forecast a new actual NI path.'], 'values': {'DIV0': ni0*p, 'growth': growth, 'ROE': roe, 'NI1': ni0*(1+growth), 'DIV1': ni0*(1+growth)*p, 'value0': value, 'newPayout':p2, 'newGrowth':g2, 'newDIV1':ni0*(1+g2)*p2, 'newValue0':value2}}
    assert ni0*(1+growth)*p/(re-growth)==value
    roc, ra, x, ni0, p, re = F(3,20),F(2,25),F(3,2),F(300),F(1,2),F(17,100)
    roe=roc+x*(roc-ra);growth=(1-p)*roe;value=ni0*(1+growth)*p/(re-growth)
    roe2=roc+2*(roc-ra);g2=roe2/2;v2=ni0*(1+g2)/2/(re-g2)
    p3=F(3,5);keepg_x=(growth/(1-p3)-roc)/(roc-ra)
    keepv_g=(value*re-ni0*p3)/(value+ni0*p3);keepv_x=(keepv_g/(1-p3)-roc)/(roc-ra)
    out['3.9'] = {'status': 'FIRST_TWO_COMPARISONS_CONDITIONAL_FINAL_TARGET_UNDERDEFINED', 'assumptions': ['Source ROC15% uses gross D+E for slide79 relation.', 'Given historical NI0 remains300; constant ROC and re17% across hypothetical policies.', 'rd10% pretax with t20% gives8% after tax; all Gordon denominators positive. Constant re as leverage rises is an illustrative assumption, not general market behavior.'], 'values': {'ROE':roe,'growth':growth,'DIV1':ni0*(1+growth)*p,'value0':value,'ROE_at_leverage2':roe2,'growth_at_leverage2':g2,'DIV1_at_leverage2':ni0*(1+g2)/2,'value_at_leverage2':v2}, 'conditional_counterexamples_for_60pct_payout': {'if_preserve_growth':{'D_over_E':keepg_x,'increase_from_1_5':keepg_x-x},'if_preserve_price':{'growth':keepv_g,'D_over_E':keepv_x,'increase_from_1_5':keepv_x-x}}, 'nonunique': ['Final question does not specify preserving growth, price or another objective. Distinct valid conditional leverage answers prove no unique source answer.']}
    assert ni0*(1+growth)*p/(re-growth)==value and keepg_x != keepv_x
    out['slide87']={'sourceRoundedCCC':F(17+105-65),'sourceRoundedDailyCOGS':F('13.5'),'roundedApproxNWC':F(57)*F('13.5'),'exactSnapshotOperatingNWC':F(554+1412-874),'unroundedDSO':F(554,11638)*365,'unroundedDIH':F(1412,4920)*365,'unroundedDPO_COGS_proxy':F(874,4920)*365,'assumption':'Source snapshot balances used as proxies for averages; actual annual average balances and purchases not supplied.'}
    out['slide91']={'NI_margin':F('45.2')/2605,'assetTurnover':F(2605,1352),'ROA_NI':F('45.2')/1352,'equityMultiplier':F(1352)/F('133.1'),'ROE':F('45.2')/F('133.1'),'MVA':F('407.8')-F('133.1'),'roundingCaution':'Revenue2605 and displayed costs2560 imply45, while NI45.2 is separately given; rounded graphic is not an exact audited statement.'}
    return encode(out)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    result={'role':'Independent reviewer; rational arithmetic, no author-engine imports','sourceCalibrations':independent_calibrations()}
    data=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(data)
    else:
        print(data,end='')
