export function buildCalculation(inputs) {
  const revenue = inputs.revenueLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const variableCost = inputs.revenueLines.reduce((sum, line) => sum + line.directCost * line.quantity, 0);
  const grossProfit = revenue - variableCost;
  const grossMarginRatio = revenue > 0 ? grossProfit / revenue : 0;
  const operatingCosts = Object.values(inputs.costs).reduce((sum, value) => sum + value, 0) + inputs.employeeCost;
  const ebitda = grossProfit - operatingCosts;
  const ebit = ebitda - inputs.depreciation;
  const pretax = ebit - inputs.interestCost;
  const tax = Math.max(0, pretax * inputs.taxReserve);
  const netResult = pretax - tax;
  const monthlyCashMovement = ebitda - inputs.interestCost - tax - inputs.loanRepayment - inputs.ownerDraw - inputs.monthlyInvestment;
  const startupNeed = inputs.startupEquipment + inputs.startupInventory + inputs.startupDeposit;
  const workingCapitalNeed = (variableCost + operatingCosts + inputs.interestCost + inputs.loanRepayment + inputs.ownerDraw + inputs.monthlyInvestment + tax) * inputs.workingCapitalMonths;
  const fundingSources = inputs.ownerFunding + inputs.grantFunding + inputs.newLoan;
  const fundingRequired = startupNeed + workingCapitalNeed;
  const fundingGap = Math.max(0, fundingRequired - fundingSources);
  const breakEvenOperating = grossMarginRatio > 0 ? (operatingCosts + inputs.depreciation + inputs.interestCost) / grossMarginRatio : null;
  const cashFixedOutflow = operatingCosts + inputs.interestCost + inputs.loanRepayment + inputs.ownerDraw + inputs.monthlyInvestment;
  let breakEvenCash = null;
  if (grossMarginRatio > 0) {
    const cashBreakEvenBeforeTax = cashFixedOutflow / grossMarginRatio;
    const pretaxAtCashBreakEvenBeforeTax = (grossMarginRatio * cashBreakEvenBeforeTax) - operatingCosts - inputs.depreciation - inputs.interestCost;
    if (pretaxAtCashBreakEvenBeforeTax <= 0) {
      breakEvenCash = cashBreakEvenBeforeTax;
    } else if (inputs.taxReserve < 1) {
      breakEvenCash = (cashFixedOutflow - inputs.taxReserve * (operatingCosts + inputs.depreciation + inputs.interestCost)) /
        (grossMarginRatio * (1 - inputs.taxReserve));
    }
  }
  const monthlyVat = revenue * inputs.salesVatRate;
  const endingCash = inputs.cashStart + monthlyCashMovement;
  const runway = monthlyCashMovement < 0 ? inputs.cashStart / Math.abs(monthlyCashMovement) : (inputs.cashStart > 0 ? Infinity : null);
  const forecasts = [0, 1, 2].map((yearIndex) => {
    const revenueFactor = Math.pow(1 + inputs.revenueGrowth, yearIndex);
    const costFactor = Math.pow(1 + inputs.costInflation, yearIndex);
    const yRevenue = revenue * revenueFactor * 12;
    const yVariable = variableCost * revenueFactor * costFactor * 12;
    const yOperating = operatingCosts * costFactor * 12;
    const yEbitda = yRevenue - yVariable - yOperating;
    const yDepr = inputs.depreciation * 12;
    const yInterest = inputs.interestCost * 12;
    const yPretax = yEbitda - yDepr - yInterest;
    const yTax = Math.max(0, yPretax * inputs.taxReserve);
    return { revenue: yRevenue, variable: yVariable, gross: yRevenue - yVariable, fixed: yOperating, ebitda: yEbitda, depreciation: yDepr, interest: yInterest, tax: yTax, net: yPretax - yTax };
  });
  const downsideEbitda = revenue * 0.8 - variableCost * 0.8 * 1.1 - operatingCosts * 1.1;
  const downsideNet = downsideEbitda - inputs.depreciation - inputs.interestCost - Math.max(0, (downsideEbitda - inputs.depreciation - inputs.interestCost) * inputs.taxReserve);
  const upsideEbitda = revenue * 1.1 - variableCost * 1.1 * 1.05 - operatingCosts * 1.05;
  const upsideNet = upsideEbitda - inputs.depreciation - inputs.interestCost - Math.max(0, (upsideEbitda - inputs.depreciation - inputs.interestCost) * inputs.taxReserve);
  return {
    revenue, variableCost, grossProfit, grossMarginRatio, operatingCosts, ebitda, depreciation: inputs.depreciation,
    ebit, interest: inputs.interestCost, pretax, tax, netResult, monthlyCashMovement, startupNeed,
    workingCapitalNeed, fundingSources, fundingRequired, fundingGap, breakEvenOperating, breakEvenCash,
    monthlyVat, endingCash, runway, forecasts, downsideNet, upsideNet
  };
}
