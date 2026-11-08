/** Conditional teaching model. No input is inferred from an incomplete teacher prompt. */
export interface OpeningBalance {
  cash: number;
  ar: number;
  inventory: number;
  ap: number;
  ppe: number;
  debt: number;
  equity: number;
}
export interface ThreeYearPolicy {
  sales: readonly [number, number, number];
  dso: readonly [number, number, number];
  days: number;
  inventoryToSales: number;
  apToSales: number;
  nopatMargin: number;
  taxRate: number;
  debtRate: number;
  payout: number;
  capex: readonly [number, number, number];
  openingRemainingLife: number;
  newAssetLife: number;
  minimumCash: number;
  funding: "fixed-debt" | "revolver";
}
export interface ModelYear {
  year: number;
  sales: number;
  cashOperatingCosts: number;
  da: number;
  ebitda: number;
  ebit: number;
  interest: number;
  ebt: number;
  tax: number;
  ni: number;
  nopat: number;
  ar: number;
  inventory: number;
  ap: number;
  operatingNwc: number;
  deltaNwc: number;
  capex: number;
  cfo: number;
  cfi: number;
  cff: number;
  dividends: number;
  borrowing: number;
  cashBeforeFunding: number;
  cash: number;
  fundingNeed: number;
  ppe: number;
  debt: number;
  equity: number;
  assets: number;
  liabilitiesAndEquity: number;
  balanceResidual: number;
  cashResidual: number;
  roe: number | null;
  grossRoc: number | null;
  netRoc: number | null;
  debtEquity: number | null;
  status: "FUNDED" | "FUNDING_GAP";
}
const finiteNonnegative = (n: number) => Number.isFinite(n) && n >= 0;
export function buildThreeYearModel(
  opening: OpeningBalance,
  policy: ThreeYearPolicy,
): ModelYear[] {
  if (
    (["cash", "ar", "inventory", "ap", "ppe", "debt", "equity"] as const).some(
      (key) => !finiteNonnegative(opening[key]),
    )
  )
    throw new Error("Opening balances must be present, finite and nonnegative");
  if (
    Math.abs(
      opening.cash +
        opening.ar +
        opening.inventory +
        opening.ppe -
        opening.ap -
        opening.debt -
        opening.equity,
    ) > 1e-8
  )
    throw new Error("Opening balance does not balance");
  const ratios = [
    policy.inventoryToSales,
    policy.apToSales,
    policy.nopatMargin,
    policy.taxRate,
    policy.debtRate,
    policy.payout,
  ];
  if (
    ratios.some((n) => !finiteNonnegative(n)) ||
    policy.taxRate >= 1 ||
    policy.payout > 1 ||
    policy.nopatMargin / (1 - policy.taxRate) > 1 ||
    !Number.isFinite(policy.days) ||
    policy.days <= 0 ||
    !Number.isInteger(policy.openingRemainingLife) ||
    policy.openingRemainingLife <= 0 ||
    !Number.isInteger(policy.newAssetLife) ||
    policy.newAssetLife <= 0 ||
    !finiteNonnegative(policy.minimumCash) ||
    !["fixed-debt", "revolver"].includes(policy.funding)
  )
    throw new Error("Invalid explicitly required model policy");
  if (
    [policy.sales, policy.dso, policy.capex].some(
      (xs) => xs.length !== 3 || xs.some((n) => !finiteNonnegative(n)),
    ) ||
    policy.sales.some((n) => n <= 0)
  )
    throw new Error(
      "Exactly three finite years with positive sales are required",
    );
  let last = { ...opening };
  let oldPpe = opening.ppe;
  const vintage: { remaining: number; annual: number }[] = [];
  const rows: ModelYear[] = [];
  for (let i = 0; i < 3; i++) {
    const sales = policy.sales[i],
      ar = (sales * policy.dso[i]) / policy.days,
      inventory = sales * policy.inventoryToSales,
      ap = sales * policy.apToSales;
    const operatingNwc = ar + inventory - ap,
      deltaNwc = operatingNwc - (last.ar + last.inventory - last.ap);
    const originalDa = Math.min(
      oldPpe,
      opening.ppe / policy.openingRemainingLife,
    );
    oldPpe -= originalDa;
    let da = originalDa;
    for (const v of vintage) {
      const expense = Math.min(v.remaining, v.annual);
      v.remaining -= expense;
      da += expense;
    }
    const nopat = sales * policy.nopatMargin,
      ebit = nopat / (1 - policy.taxRate),
      ebitda = ebit + da,
      cashOperatingCosts = sales - ebitda;
    if (cashOperatingCosts < -1e-8)
      throw new Error(
        "Sales and operating margin cannot cover specified depreciation",
      );
    const interest = last.debt * policy.debtRate,
      ebt = ebit - interest,
      tax = Math.max(0, ebt) * policy.taxRate,
      ni = ebt - tax;
    const capex = policy.capex[i],
      cfo = ni + da - deltaNwc,
      cfi = -capex,
      dividends = Math.max(0, ni) * policy.payout;
    const cashBeforeFunding = last.cash + cfo + cfi - dividends,
      fundingNeed = Math.max(0, policy.minimumCash - cashBeforeFunding);
    const borrowing = policy.funding === "revolver" ? fundingNeed : 0,
      cff = borrowing - dividends,
      cash = cashBeforeFunding + borrowing;
    const debt = last.debt + borrowing,
      equity = last.equity + ni - dividends,
      ppe = last.ppe - da + capex,
      assets = cash + ar + inventory + ppe,
      liabilitiesAndEquity = ap + debt + equity;
    const averageEquity = (last.equity + equity) / 2,
      averageCapital = (last.equity + last.debt + equity + debt) / 2;
    const averageNetCapital =
      (last.ppe + last.ar + last.inventory - last.ap + ppe + operatingNwc) / 2;
    rows.push({
      year: i + 1,
      sales,
      cashOperatingCosts,
      da,
      ebitda,
      ebit,
      interest,
      ebt,
      tax,
      ni,
      nopat,
      ar,
      inventory,
      ap,
      operatingNwc,
      deltaNwc,
      capex,
      cfo,
      cfi,
      cff,
      dividends,
      borrowing,
      cashBeforeFunding,
      cash,
      fundingNeed,
      ppe,
      debt,
      equity,
      assets,
      liabilitiesAndEquity,
      balanceResidual: assets - liabilitiesAndEquity,
      cashResidual: cash - last.cash - cfo - cfi - cff,
      roe: averageEquity > 0 ? ni / averageEquity : null,
      grossRoc: averageCapital > 0 ? nopat / averageCapital : null,
      netRoc: averageNetCapital > 0 ? nopat / averageNetCapital : null,
      debtEquity: equity > 0 ? debt / equity : null,
      status: cash >= policy.minimumCash - 1e-8 ? "FUNDED" : "FUNDING_GAP",
    });
    if (capex)
      vintage.push({ remaining: capex, annual: capex / policy.newAssetLife });
    last = { cash, ar, inventory, ap, ppe, debt, equity };
  }
  return rows;
}
export const teachingOpening: OpeningBalance = {
  cash: 25,
  ar: 20,
  inventory: 30,
  ap: 20,
  ppe: 300,
  debt: 250,
  equity: 105,
};
export const teachingBasePolicy: ThreeYearPolicy = {
  sales: [200, 250, 230],
  dso: [54.75, 54.75, 54.75],
  days: 365,
  inventoryToSales: 0.15,
  apToSales: 0.1,
  nopatMargin: 0.3,
  taxRate: 0.2,
  debtRate: 0.1,
  payout: 0.5,
  capex: [0, 0, 0],
  openingRemainingLife: 10,
  newAssetLife: 10,
  minimumCash: 25,
  funding: "fixed-debt",
};
export const teachingStressPolicy: ThreeYearPolicy = {
  ...teachingBasePolicy,
  sales: [300, 450, 600],
  dso: [120, 150, 180],
};
export const integratedScenarios = {
  base: buildThreeYearModel(teachingOpening, teachingBasePolicy),
  growthUnfunded: buildThreeYearModel(teachingOpening, teachingStressPolicy),
  growthFunded: buildThreeYearModel(teachingOpening, {
    ...teachingStressPolicy,
    funding: "revolver",
  }),
};
