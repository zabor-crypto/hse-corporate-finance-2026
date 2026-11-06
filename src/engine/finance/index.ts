/**
 * Pure classroom finance engine. All monetary inputs must use the same currency
 * and scale; rates are fractions, not percent points. No missing item is zero.
 * Formula conventions are explicit at the function boundary. These calculations
 * do not establish economic validity or teacher approval.
 */
export class FinanceInputError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'ZERO_DENOMINATOR' | 'NEEDS_ASSUMPTION' | 'PERIOD_MISMATCH' | 'INVALID_MODEL', message: string) {
    super(message); this.name = 'FinanceInputError';
  }
}
function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new FinanceInputError('INVALID_INPUT', `${name}: требуется конечное число`);
  return value;
}
function nonNegative(value: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new FinanceInputError('INVALID_INPUT', `${name}: отрицательное значение недопустимо`);
  return value;
}
function positive(value: number, name: string): number {
  nonNegative(value, name);
  if (value === 0) throw new FinanceInputError('ZERO_DENOMINATOR', `${name}: нулевой знаменатель`);
  return value;
}
function fraction(value: number, name: string): number {
  finite(value, name);
  if (value < 0 || value > 1) throw new FinanceInputError('INVALID_INPUT', `${name}: ожидается доля от 0 до 1`);
  return value;
}
function sum(values: Record<string, number>): void { for (const [key, value] of Object.entries(values)) finite(value, key); }
export type TaxLossTreatment = 'no-credit' | 'full-credit';
function afterTax(profit: number, taxRate: number, taxLossTreatment?: TaxLossTreatment): number {
  finite(profit, 'profit'); fraction(taxRate, 'taxRate');
  if (taxLossTreatment !== undefined && taxLossTreatment !== 'no-credit' && taxLossTreatment !== 'full-credit') throw new FinanceInputError('INVALID_INPUT', 'Неизвестная политика налогового убытка');
  if (profit < 0 && taxLossTreatment === undefined) throw new FinanceInputError('NEEDS_ASSUMPTION', 'Для убытка задайте возможность налогового возмещения');
  return profit < 0 && taxLossTreatment === 'no-credit' ? profit : profit * (1 - taxRate);
}
export interface IncomeStatementInput { revenue: number; cogs: number; sgaCash: number; da: number; interest: number; taxRate: number; taxLossTreatment?: TaxLossTreatment }
/** COGS and SG&A exclude D&A; no other/non-operating income; interest is accrued, not necessarily paid. */
export function calcIncomeStatement(input: IncomeStatementInput) {
  const { revenue, cogs, sgaCash, da, interest, taxRate, taxLossTreatment } = input;
  for (const [name, value] of Object.entries({ revenue, cogs, sgaCash, da, interest })) nonNegative(value, name);
  const ebitda = revenue - cogs - sgaCash;
  const ebit = ebitda - da;
  const ebt = ebit - interest;
  const ni = afterTax(ebt, taxRate, taxLossTreatment);
  return { ebitda, ebit, ebt, taxes: ebt - ni, ni, nopat: afterTax(ebit, taxRate, taxLossTreatment) };
}
export function calcNopat({ ebit, taxRate, taxLossTreatment }: { ebit: number; taxRate: number; taxLossTreatment?: TaxLossTreatment }): number { return afterTax(ebit, taxRate, taxLossTreatment); }
/** Simplified non-cash operating NWC, excludes cash and financial debt. */
export function calcOperatingNwc({ ar, inventory, ap }: { ar: number; inventory: number; ap: number }): number {
  nonNegative(ar, 'ar'); nonNegative(inventory, 'inventory'); nonNegative(ap, 'ap');
  return ar + inventory - ap;
}
/** Simplified indirect CFO: interest/tax payments assumed consistent with NI; no other accruals or non-cash items. */
export function calcCfoIndirect(input: { ni: number; da: number; deltaAr: number; deltaInventory: number; deltaAp: number }): number {
  sum({ ni: input.ni, da: input.da, deltaAr: input.deltaAr, deltaInventory: input.deltaInventory, deltaAp: input.deltaAp }); nonNegative(input.da, 'da');
  return input.ni + input.da - input.deltaAr - input.deltaInventory + input.deltaAp;
}
/** CapEx is gross cash investment; disposals need a separately defined net convention. */
export function calcFcff(input: { nopat: number; da: number; deltaOperatingNwc: number; capex: number }): number {
  sum({ nopat: input.nopat, da: input.da, deltaOperatingNwc: input.deltaOperatingNwc, capex: input.capex }); nonNegative(input.da, 'da'); nonNegative(input.capex, 'capex');
  return input.nopat + input.da - input.deltaOperatingNwc - input.capex;
}
/** Assumes usable interest tax shield; netBorrowing = proceeds - principal repayments. */
export function calcFcfe(input: { fcff: number; interest: number; taxRate: number; netBorrowing: number }): number {
  sum({ fcff: input.fcff, interest: input.interest, taxRate: input.taxRate, netBorrowing: input.netBorrowing }); fraction(input.taxRate, 'taxRate'); nonNegative(input.interest, 'interest');
  return input.fcff - input.interest * (1 - input.taxRate) + input.netBorrowing;
}
export function calcCurrentRatio({ currentAssets, currentLiabilities }: { currentAssets: number; currentLiabilities: number }): number { return nonNegative(currentAssets, 'currentAssets') / positive(currentLiabilities, 'currentLiabilities'); }
/** quickAssets excludes inventory and prepayments; caller must classify the accounts. */
export function calcQuickRatio({ quickAssets, currentLiabilities }: { quickAssets: number; currentLiabilities: number }): number { return nonNegative(quickAssets, 'quickAssets') / positive(currentLiabilities, 'currentLiabilities'); }
export function calcCashRatio({ cashAndEquivalents, currentLiabilities }: { cashAndEquivalents: number; currentLiabilities: number }): number { return nonNegative(cashAndEquivalents, 'cashAndEquivalents') / positive(currentLiabilities, 'currentLiabilities'); }
export type StockBasis = { basis: 'opening'; opening: number; period: string } | { basis: 'closing'; closing: number; period: string } | { basis: 'average'; opening: number; closing: number; period: string };
/** Matching period labels identify the flow period. Average means arithmetic opening/closing average. */
function stockValue(stock: StockBasis, period: string): number {
  if (!period || !stock.period) throw new FinanceInputError('NEEDS_ASSUMPTION', 'Задайте период потока и базы');
  if (stock.period !== period) throw new FinanceInputError('PERIOD_MISMATCH', 'Периоды потока и базы не совпадают');
  if (stock.basis === 'opening') return finite(stock.opening, 'opening');
  if (stock.basis === 'closing') return finite(stock.closing, 'closing');
  if (stock.basis === 'average') return (finite(stock.opening, 'opening') + finite(stock.closing, 'closing')) / 2;
  throw new FinanceInputError('NEEDS_ASSUMPTION', 'Не задана база: начало, конец или среднее');
}
export interface DaysRatioInput { balance: StockBasis; flow: number; period: string; periodDays: number }
function daysRatio({ balance, flow, period, periodDays }: DaysRatioInput): number { return nonNegative(stockValue(balance, period), 'balance') / positive(flow, 'flow') * positive(periodDays, 'periodDays'); }
/** DSO uses credit sales for the same period; all sales only under an explicit all-credit approximation. */
export function calcDso(input: DaysRatioInput): number { return daysRatio(input); }
/** DIH uses COGS for the matching period. */
export function calcDih(input: DaysRatioInput): number { return daysRatio(input); }
/** DPO uses credit purchases; COGS is an approximation only when purchases/stock movement justify it. */
export function calcDpo(input: DaysRatioInput): number { return daysRatio(input); }
export function calcCcc(input: { dso: number; dih: number; dpo: number; unit: 'days' }): number {
  if (input.unit !== 'days') throw new FinanceInputError('PERIOD_MISMATCH', 'DSO, DIH и DPO должны быть в днях');
  nonNegative(input.dso, 'dso'); nonNegative(input.dih, 'dih'); nonNegative(input.dpo, 'dpo');
  return input.dso + input.dih - input.dpo;
}
export function calcRoa({ profit, convention, assets, period }: { profit: number; convention: 'NI' | 'NOPAT'; assets: StockBasis; period: string }): number {
  if (convention !== 'NI' && convention !== 'NOPAT') throw new FinanceInputError('NEEDS_ASSUMPTION', 'Укажите числитель ROA: NI или NOPAT');
  return finite(profit, 'profit') / positive(stockValue(assets, period), 'assets');
}
export function calcRoc({ nopat, investedCapital, period }: { nopat: number; investedCapital: StockBasis; period: string }): number { return finite(nopat, 'nopat') / positive(stockValue(investedCapital, period), 'investedCapital'); }
/** Negative book equity makes the educational profitability ratio non-interpretable; reject explicitly. */
export function calcRoe({ ni, equity, period }: { ni: number; equity: StockBasis; period: string }): number { return finite(ni, 'ni') / positive(stockValue(equity, period), 'equity'); }
export function calcDupont({ ni, sales, assets, equity, period }: { ni: number; sales: number; assets: StockBasis; equity: StockBasis; period: string }) {
  finite(ni, 'ni'); positive(sales, 'sales');
  if (assets.basis !== equity.basis) throw new FinanceInputError('NEEDS_ASSUMPTION', 'DuPont требует согласованной базы активов и капитала');
  const a = positive(stockValue(assets, period), 'assets'); const e = positive(stockValue(equity, period), 'equity');
  const margin = ni / sales; const turnover = sales / a; const equityMultiplier = a / e;
  return { margin, turnover, equityMultiplier, roe: margin * turnover * equityMultiplier };
}
export function calcInterestCoverage({ ebit, interest }: { ebit: number; interest: number }): number { return finite(ebit, 'ebit') / positive(interest, 'interest'); }
export function calcDebtEquity({ debt, equity }: { debt: number; equity: number }): number { return nonNegative(debt, 'debt') / positive(equity, 'equity'); }
/** Constant ROC and financing cost, fully usable tax shield; this is a model identity under slide 79 assumptions. */
export function calcRoeLeverage({ roc, debtEquity, pretaxDebtCost, taxRate }: { roc: number; debtEquity: number; pretaxDebtCost: number; taxRate: number }): number {
  finite(roc, 'roc'); nonNegative(debtEquity, 'debtEquity'); nonNegative(pretaxDebtCost, 'pretaxDebtCost'); fraction(taxRate, 'taxRate');
  return roc + debtEquity * (roc - pretaxDebtCost * (1 - taxRate));
}
export function calcRocFromLeverage({ roe, debtEquity, afterTaxDebtCost }: { roe: number; debtEquity: number; afterTaxDebtCost: number }): number {
  finite(roe, 'roe'); nonNegative(debtEquity, 'debtEquity'); nonNegative(afterTaxDebtCost, 'afterTaxDebtCost');
  return (roe + debtEquity * afterTaxDebtCost) / (1 + debtEquity);
}
export function calcEva({ nopat, investedCapital, wacc }: { nopat: number; investedCapital: number; wacc: number }): number { return finite(nopat, 'nopat') - nonNegative(investedCapital, 'investedCapital') * nonNegative(wacc, 'wacc'); }
/** Sustainable growth with constant ROE and retention, no external equity. */
export function calcDividendGrowth({ roe, payout }: { roe: number; payout: number }): number { return finite(roe, 'roe') * (1 - fraction(payout, 'payout')); }
/** dividendNext is next period DIV1, never DIV0. All rates must share the same period label. */
export function calcDdmGordon({ dividendNext, costOfEquity, growth, ratePeriod, growthPeriod }: { dividendNext: number; costOfEquity: number; growth: number; ratePeriod: string; growthPeriod: string }): number {
  nonNegative(dividendNext, 'dividendNext'); finite(costOfEquity, 'costOfEquity'); finite(growth, 'growth');
  if (!ratePeriod || !growthPeriod || ratePeriod !== growthPeriod) throw new FinanceInputError('PERIOD_MISMATCH', 'Ставка и рост должны относиться к одному периоду');
  if (costOfEquity <= growth || costOfEquity <= -1 || growth <= -1) throw new FinanceInputError('INVALID_MODEL', 'Для perpetuity нужны r > g и ставки больше −100%');
  return dividendNext / (costOfEquity - growth);
}
/** Solve P0 = NI0*(1+g)*payout/(re-g), where NI0 is last year's earnings. */
export function calcImpliedDividendGrowth({ niLastYear, payout, equityValue, costOfEquity }: { niLastYear: number; payout: number; equityValue: number; costOfEquity: number }): number {
  positive(niLastYear, 'niLastYear'); fraction(payout, 'payout'); positive(payout, 'payout'); positive(equityValue, 'equityValue'); finite(costOfEquity, 'costOfEquity');
  const dividendLast = niLastYear * payout;
  const growth = (equityValue * costOfEquity - dividendLast) / (equityValue + dividendLast);
  if (growth <= -1 || costOfEquity <= growth) throw new FinanceInputError('INVALID_MODEL', 'Недопустимая бессрочная модель роста');
  return growth;
}
export function calcEbitdaMargin({ ebitda, revenue }: { ebitda: number; revenue: number }): number { return finite(ebitda, 'ebitda') / positive(revenue, 'revenue'); }
export function calcHorizontalVariance({ actual, baseline }: { actual: number; baseline: number }) {
  finite(actual, 'actual'); finite(baseline, 'baseline');
  return { absolute: actual - baseline, relative: baseline === 0 ? null : (actual - baseline) / baseline };
}
/** Base-price/base-volume decomposition includes the interaction separately. */
export function calcRevenuePriceVolumeVariance({ plannedPrice, actualPrice, plannedVolume, actualVolume }: { plannedPrice: number; actualPrice: number; plannedVolume: number; actualVolume: number }) {
  for (const [key, value] of Object.entries({ plannedPrice, actualPrice, plannedVolume, actualVolume })) nonNegative(value, key);
  const deltaPrice = actualPrice - plannedPrice; const deltaVolume = actualVolume - plannedVolume;
  return { price: deltaPrice * plannedVolume, volume: deltaVolume * plannedPrice, interaction: deltaPrice * deltaVolume, total: actualPrice * actualVolume - plannedPrice * plannedVolume };
}
