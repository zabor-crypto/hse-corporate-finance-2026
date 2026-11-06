import {FinanceInputError,calcNopat,calcRoa,calcRoc,calcRoe,calcDupont,calcRoeLeverage,type StockBasis,type TaxLossTreatment} from './index';
function finite(x:number,name:string){if(typeof x!=='number'||!Number.isFinite(x))throw new FinanceInputError('INVALID_INPUT',`${name}: требуется конечное число`);return x;}
function nonnegative(x:number,name:string){finite(x,name);if(x<0)throw new FinanceInputError('INVALID_INPUT',`${name}: отрицательное значение недопустимо`);return x;}
function positive(x:number,name:string){nonnegative(x,name);if(x===0)throw new FinanceInputError('ZERO_DENOMINATOR',`${name}: нулевой знаменатель`);return x;}
function balance(b:StockBasis,period:string){if(!b||!period||!b.period)throw new FinanceInputError('NEEDS_ASSUMPTION','Укажите период потока и базы');if(b.period!==period)throw new FinanceInputError('PERIOD_MISMATCH','Периоды не совпадают');if(b.basis==='average')return (nonnegative(b.opening,'opening')+nonnegative(b.closing,'closing'))/2;if(b.basis==='opening')return nonnegative(b.opening,'opening');if(b.basis==='closing')return nonnegative(b.closing,'closing');throw new FinanceInputError('NEEDS_ASSUMPTION','Нужна база: начало, конец или средняя');}
/** Sales and the explicit balance basis share period, currency and scale. */
export function calcAssetTurnover({sales,assets,period}:{sales:number;assets:StockBasis;period:string}){return nonnegative(sales,'sales')/positive(balance(assets,period),'assets');}
/** Classroom slide76 convention: NOPAT/Sales, not EBIT/Sales or NI/Sales. */
export function calcOperatingMargin({ebit,taxRate,sales,taxLossTreatment}:{ebit:number;taxRate:number;sales:number;taxLossTreatment?:TaxLossTreatment}){return calcNopat({ebit,taxRate,taxLossTreatment})/positive(sales,'sales');}
/** Formal EBIT/(EBIT-I) ratio. It is an NI elasticity only under fixed interest, proportional taxes with t<1 and nonzero NI; not a risk score. */
export function calcDfl({ebit,interest}:{ebit:number;interest:number}){finite(ebit,'ebit');nonnegative(interest,'interest');if(ebit-interest===0)throw new FinanceInputError('ZERO_DENOMINATOR','DFL не определён при EBIT = I');return ebit/(ebit-interest);}
export interface RatioRelationshipsInput {sales:number;ebit:number;interest:number;taxRate:number;assets:number;debt:number;equity:number;cash:number;otherLiabilities:number;capitalBasis:'gross'|'net-cash';taxLossTreatment?:TaxLossTreatment;}
/** All stocks are agreed annual averages; no other income or liabilities beyond those supplied.
 * NOPAT and NI use the SAME explicit loss-tax policy. Lever identity is conditional on a usable shield.
 */
export function calcRatioRelationships(input:RatioRelationshipsInput){
 const {sales,ebit,interest,taxRate,assets,debt,equity,cash,otherLiabilities,capitalBasis,taxLossTreatment}=input;
 positive(sales,'sales');finite(ebit,'ebit');nonnegative(interest,'interest');positive(assets,'assets');nonnegative(debt,'debt');positive(equity,'equity');nonnegative(cash,'cash');nonnegative(otherLiabilities,'otherLiabilities');
 if(capitalBasis!=='gross'&&capitalBasis!=='net-cash')throw new FinanceInputError('NEEDS_ASSUMPTION','Явно выберите базу ROC');
 const tolerance=1e-9*Math.max(1,assets,debt+equity+otherLiabilities);
 if(Math.abs(assets-debt-equity-otherLiabilities)>tolerance)throw new FinanceInputError('INVALID_INPUT','Баланс не сходится: активы должны равняться долгу, капиталу и прочим обязательствам');
 if(cash>assets)throw new FinanceInputError('INVALID_INPUT','Денежные средства не могут превышать все активы');
 if(debt===0&&interest!==0)throw new FinanceInputError('INVALID_INPUT','При нулевом долге положительные проценты требуют иной модели');
 const nopat=calcNopat({ebit,taxRate,taxLossTreatment});const ni=calcNopat({ebit:ebit-interest,taxRate,taxLossTreatment});
 const grossCapital=debt+equity;const investedCapital=capitalBasis==='gross'?grossCapital:positive(grossCapital-cash,'investedCapital');
 const period='annual';const stock=(v:number):StockBasis=>({basis:'average',opening:v,closing:v,period});
 const turnover=calcAssetTurnover({sales,assets:stock(assets),period});const operatingMargin=nopat/sales;const netMargin=ni/sales;
 const roaNopat=calcRoa({profit:nopat,convention:'NOPAT',assets:stock(assets),period});const roaNi=calcRoa({profit:ni,convention:'NI',assets:stock(assets),period});const roaEbit=ebit/assets;
 const roc=calcRoc({nopat,investedCapital:stock(investedCapital),period});const grossRoc=nopat/grossCapital;const roe=calcRoe({ni,equity:stock(equity),period});const dupont=calcDupont({ni,sales,assets:stock(assets),equity:stock(equity),period});
 const debtCost=debt===0?null:interest/debt;const afterTaxDebtCost=debtCost===null?null:debtCost*(1-taxRate);
 const leverageIdentityApplicable=Math.abs((nopat-ni)-interest*(1-taxRate))<1e-10*Math.max(1,Math.abs(nopat),Math.abs(ni));
 const leveragedRoe=leverageIdentityApplicable?calcRoeLeverage({roc:grossRoc,debtEquity:debt/equity,pretaxDebtCost:debtCost??0,taxRate}):null;
 return {nopat,ni,operatingMargin,netMargin,turnover,roaNopat,roaNi,roaEbit,roc,grossRoc,roe,dupont,grossCapital,investedCapital,debtEquity:debt/equity,debtCost,afterTaxDebtCost,icr:interest===0?null:ebit/interest,dfl:ni===0?null:calcDfl({ebit,interest}),leverageIdentityApplicable,leveragedRoe,twoFactorRoa:operatingMargin*turnover};
}
