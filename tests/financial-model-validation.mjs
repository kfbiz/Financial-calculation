import assert from 'node:assert/strict';
import { buildCalculation } from '../model.mjs';

const base = {
  scenarioName: 'Turku cleaning sole trader benchmark',
  businessName: 'Illustrative one-person cleaning service',
  industry: 'cleaning',
  legalForm: 'toiminimi',
  revenueLines: [{ name: 'Cleaning labour', price: 40, quantity: 100, directCost: 2 }],
  costs: {
    premises: 0, utilities: 0, software: 45, accounting: 75, marketing: 90,
    insurance: 75, yel: 300, transport: 260, other: 85
  },
  employeeCost: 0,
  depreciation: 45,
  interestCost: 40,
  startupEquipment: 1800,
  startupInventory: 250,
  startupDeposit: 150,
  workingCapitalMonths: 3,
  ownerFunding: 1500,
  grantFunding: 0,
  newLoan: 1000,
  cashStart: 700,
  loanRepayment: 100,
  ownerDraw: 1800,
  monthlyInvestment: 50,
  revenueGrowth: 0.05,
  costInflation: 0.03,
  taxReserve: 0.20,
  salesVatRate: 0.255
};

function close(actual, expected, label, tolerance = 0.005) {
  assert.ok(Number.isFinite(actual), label + ': expected a finite result, received ' + actual);
  assert.ok(Math.abs(actual - expected) <= tolerance, label + ': expected ' + expected + ', received ' + actual);
}

// Reference case: all figures are monthly unless stated otherwise.
const r = buildCalculation(base);
close(r.revenue, 4000, 'monthly turnover');
close(r.variableCost, 200, 'direct costs');
close(r.grossProfit, 3800, 'gross profit');
close(r.grossMarginRatio, 0.95, 'gross margin');
close(r.operatingCosts, 930, 'operating costs including YEL');
close(r.ebitda, 2870, 'EBITDA');
close(r.pretax, 2785, 'estimated result before tax');
close(r.tax, 557, 'illustrative tax reserve');
close(r.netResult, 2228, 'estimated net result');
close(r.monthlyCashMovement, 323, 'monthly cash movement');
close(r.endingCash, 1023, 'cash after one month');
close(r.breakEvenOperating, 1068.421052631579, 'P&L break-even turnover');
close(r.breakEvenCash, 3575, 'cash break-even turnover');
close(r.workingCapitalNeed, 11031, '3-month gross working-capital buffer');
close(r.fundingRequired, 13231, 'total funding requirement');
close(r.fundingGap, 10731, 'funding gap');
close(r.monthlyVat, 1020, 'estimated sales VAT');
close(r.forecasts[0].variable, 2400, 'year 1 direct costs');
close(r.forecasts[1].revenue, 50400, 'year 2 turnover');
close(r.forecasts[1].variable, 2595.6, 'year 2 direct costs scale with volume and cost inflation');
close(r.forecasts[2].variable, 2807.1414, 'year 3 direct costs');
close(r.forecasts[1].depreciation, 540, 'depreciation held level without an asset schedule');

// Cash break-even must produce zero cash movement after the tax reserve.
const m = r.grossMarginRatio;
const cashFixed = r.operatingCosts + base.interestCost + base.loanRepayment + base.ownerDraw + base.monthlyInvestment;
const taxableAtCashBreakEven = m * r.breakEvenCash - r.operatingCosts - base.depreciation - base.interestCost;
const taxAtCashBreakEven = Math.max(0, taxableAtCashBreakEven * base.taxReserve);
const cashAtBreakEven =
  (m * r.breakEvenCash) - r.operatingCosts - base.interestCost - taxAtCashBreakEven -
  base.loanRepayment - base.ownerDraw - base.monthlyInvestment;
close(cashAtBreakEven, 0, 'cash break-even reconciles to zero cash movement');

// Edge cases.
const zeroSales = buildCalculation({ ...base, revenueLines: [{ name: '', price: 0, quantity: 0, directCost: 0 }] });
assert.equal(zeroSales.breakEvenOperating, null, 'zero sales: P&L break-even should be undefined');
assert.equal(zeroSales.breakEvenCash, null, 'zero sales: cash break-even should be undefined');
assert.ok(Number.isFinite(zeroSales.monthlyCashMovement), 'zero sales: cash movement must remain finite');

const zeroMargin = buildCalculation({ ...base, revenueLines: [{ name: '', price: 40, quantity: 100, directCost: 40 }] });
assert.equal(zeroMargin.breakEvenOperating, null, 'zero margin: P&L break-even should be undefined');
assert.equal(zeroMargin.breakEvenCash, null, 'zero margin: cash break-even should be undefined');

const negativeMargin = buildCalculation({ ...base, revenueLines: [{ name: '', price: 40, quantity: 100, directCost: 45 }] });
assert.ok(negativeMargin.grossMarginRatio < 0, 'negative margin scenario should be recognised');
assert.equal(negativeMargin.breakEvenOperating, null, 'negative margin: P&L break-even should be undefined');
assert.equal(negativeMargin.breakEvenCash, null, 'negative margin: cash break-even should be undefined');

const cashBreakEvenBeforeTaxThreshold = buildCalculation({
  ...base,
  revenueLines: [{ name: 'Service', price: 100, quantity: 1, directCost: 20 }],
  costs: { premises: 100, utilities: 0, software: 0, accounting: 0, marketing: 0, insurance: 0, yel: 0, transport: 0, other: 0 },
  depreciation: 1000, interestCost: 0, loanRepayment: 0, ownerDraw: 0,
  monthlyInvestment: 0, taxReserve: 0.20
});
close(cashBreakEvenBeforeTaxThreshold.breakEvenCash, 125, 'cash break-even where tax reserve is not yet triggered');

const impossibleCashBreakEven = buildCalculation({ ...base, taxReserve: 1 });
assert.equal(impossibleCashBreakEven.breakEvenCash, null, '100% reserve of all positive taxable profit should flag no finite cash break-even');

const zeroGrowth = buildCalculation({ ...base, revenueGrowth: -1 });
close(zeroGrowth.forecasts[1].revenue, 0, '100% revenue decline in year 2');
close(zeroGrowth.forecasts[1].variable, 0, 'variable costs reduce to zero when sales volume becomes zero');

console.log('PASS: 31 financial-model validation assertions');
