#!/usr/bin/env python3
"""Reproduce the independent six-case synthetic fixture using exact fractions.

Python standard library only. No application imports or external input data.
Default output is stdout. Example:
  python3 c3-ratios-focus-oracle.py --output fixture.json
  python3 c3-ratios-focus-oracle.py --check fixture.json --output regenerated.json

The original prompt-only calculations were frozen before author keys were read.
This portable generator restates those calculations; it does not independently
validate future edits to the question prompts or establish learner mastery.
"""
from fractions import Fraction as F
from pathlib import Path
import argparse
import hashlib
import json
import sys


def stage(value, unit):
    value = F(value)
    return {"exact": str(value), "expected": float(value), "unit": unit}


def problem(number, stages, final_ids, keys=None):
    out = {"id": f"C3-RF{number:02}", "version": "1.0.0", "stages": stages,
           "independentStageIds": final_ids}
    assert set(final_ids).issubset(stages)
    if keys is not None:
        out["correctOptionIds"] = keys
    return out


def build_fixture():
    cases = []
    # RF01: annual profits matched to simple average assets/equity.
    sales, ebit, interest, tax = F(690), F(72), F(18), F(1, 4)
    assets, equity = (F(240) + 360) / 2, (F(100) + 140) / 2
    nopat, ni = ebit * (1 - tax), (ebit - interest) * (1 - tax)
    assert (ni / sales) * (sales / assets) * (assets / equity) == ni / equity
    cases.append(problem(1, {
        "nopat": stage(nopat, "млн ₽"), "ni": stage(ni, "млн ₽"),
        "roa-nopat": stage(100 * nopat / assets, "%"),
        "roe": stage(100 * ni / equity, "%"),
        "ni-margin": stage(100 * ni / sales, "%"),
    }, ["roa-nopat", "roe", "ni-margin"]))

    # RF02: debt cost is already after tax; subtracting surplus cash changes base.
    equity, de, cash, roe, rd = F(90), F(7, 5), F(36), F(34, 100), F(6, 100)
    debt = equity * de
    ni, after_tax_interest = equity * roe, debt * rd
    nopat = ni + after_tax_interest
    full_base, net_base = equity + debt, equity + debt - cash
    full_return, net_return = nopat / full_base, nopat / net_base
    assert full_return + (full_return - rd) * de == roe
    assert net_return * (1 + de - cash / equity) - rd * de == roe
    cases.append(problem(2, {
        "ni": stage(ni, "млн ₽"),
        "interest-after-tax": stage(after_tax_interest, "млн ₽"),
        "nopat": stage(nopat, "млн ₽"),
        "roc-gross": stage(100 * full_return, "%"),
        "roc-net": stage(100 * net_return, "%"),
    }, ["nopat", "roc-gross", "roc-net"]))

    # RF03: COGS is goods carrying cost, so inventory rollforward gives purchases.
    ar0, ar1, inv0, inv1, ap0, ap1 = map(F, (48, 78, 72, 96, 32, 42))
    sales, goods_cost, days = F(900), F(540), F(365)
    purchases = goods_cost + inv1 - inv0
    dso = (ar0 + ar1) / 2 / sales * days
    dih = (inv0 + inv1) / 2 / goods_cost * days
    dpo = (ap0 + ap1) / 2 / purchases * days
    delta_nwc = (ar1 + inv1 - ap1) - (ar0 + inv0 - ap0)
    cfo = F(64) + 14 - delta_nwc
    current_ratio = (F(18) + ar1 + inv1) / (42 + 38)
    assert current_ratio == (F(24) + ar0 + inv0) / (32 + 28)
    cases.append(problem(3, {
        "purchases": stage(purchases, "млн ₽"),
        "current-ratio": stage(current_ratio, "раз"),
        "ccc": stage(dso + dih - dpo, "дни"),
        "delta-nwc": stage(delta_nwc, "млн ₽"),
        "cfo": stage(cfo, "млн ₽"),
    }, ["current-ratio", "ccc", "cfo"]))

    # RF04: value date is after DIV0; retained profit is in book equity at date0.
    previous_book, ni0, payout, required = F(300), F(54), F(2, 5), F(16, 100)
    roe = ni0 / previous_book
    growth = roe * (1 - payout)
    div0 = ni0 * payout
    book0 = previous_book + ni0 - div0
    ni1, div1 = book0 * roe, book0 * roe * payout
    assert div1 == div0 * (1 + growth) and required > growth
    value = div1 / (required - growth)
    assert value / book0 == payout * roe / (required - growth)
    cases.append(problem(4, {
        "book-zero": stage(book0, "млн ₽"),
        "growth": stage(100 * growth, "%"),
        "dividend-next": stage(div1, "млн ₽"),
        "equity-value": stage(value, "млн ₽"),
        "price-book": stage(value / book0, "раз"),
    }, ["growth", "equity-value", "price-book"]))

    # RF05: A uses NOPAT/average assets; B uses NI/closing assets.
    operating_average_a = F(8, 100) * F(5, 2)
    net_closing_b = F(10, 100) * 3
    assert operating_average_a == F(1, 5) and net_closing_b == F(3, 10)
    same_numerator, same_stock_timing = False, False
    assert not same_numerator and not same_stock_timing
    # A overclaims comparability; C fixes timing only; D denies valid cancellation.
    cases.append(problem(5, {}, [], ["B"]))

    # RF06: accounting ROE, realized shareholder return and required rate differ.
    equity0, equity1, ni, shares = F(379, 2), F(421, 2), F(30), F(10)
    p0, p1, dividend_per_share = F(12), F(63, 5), F(9, 10)
    equity = (equity0 + equity1) / 2
    dividends = dividend_per_share * shares
    assert equity0 + ni - dividends == equity1
    roe = ni / equity
    realized_return = (p1 - p0 + dividend_per_share) / p0
    required = F(18, 100)
    equity_charge = required * equity
    options = {
        "A": roe == F(15, 100),
        "B": realized_return == F(125, 1000),
        # A required rate does not impose equality with the realized annual return.
        "C": False,
        "D": equity_charge - ni == F(6),
        # Missing corporate cash-flow data cannot identify change in cash.
        "E": False,
    }
    cases.append(problem(6, {}, [], [key for key, correct in options.items() if correct]))
    assert sum(len(p["stages"]) for p in cases) == 20
    assert sum(len(p["independentStageIds"]) for p in cases) == 12
    return {
        "provenance": "Independent exact Fraction calculations from final prompt-only data; saved before author source or keys were read. Synthetic original cases only, no private workbook table.",
        "promptSHA256": "30e588a6644a78485cb60fe4c4e41b185900521ba152adda68acdfe415c7ebd3",
        "blindOracleSHA256": "3d52a8f20ef8003dffcc6ba4231979cde0f3e425870530157ecfd7bbb10b982f",
        "problems": cases,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="-", help="JSON destination; '-' means stdout")
    parser.add_argument("--check", type=Path, help="Require exact JSON-object equality with this fixture")
    args = parser.parse_args()
    fixture = build_fixture()
    if args.check and json.loads(args.check.read_text(encoding="utf-8")) != fixture:
        parser.exit(1, "Fixture differs from independent exact-fraction calculations.\n")
    output = (json.dumps(fixture, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.output == "-":
        sys.stdout.buffer.write(output)
    else:
        Path(args.output).write_bytes(output)
    print("fixture_sha256=" + hashlib.sha256(output).hexdigest(), file=sys.stderr)


if __name__ == "__main__":
    main()
