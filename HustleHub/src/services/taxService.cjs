const TAX_YEAR = Object.freeze({
  label: '2027', start: '2026-03-01', end: '2027-02-28', primaryRebateCents: 1_782_000,
  source: 'https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/',
  brackets: [
    [24_510_000, 0, 18], [38_310_000, 4_411_800, 26], [53_020_000, 7_999_800, 31],
    [69_580_000, 12_559_900, 36], [88_700_000, 18_521_500, 39],
    [187_860_000, 25_978_300, 41], [Infinity, 66_633_900, 45]
  ],
  lowerBounds: [0, 24_510_000, 38_310_000, 53_020_000, 69_580_000, 88_700_000, 187_860_000]
});

function estimateAnnualTax(incomeRand) {
  if (!Number.isFinite(incomeRand) || incomeRand < 0) throw new TypeError('Income must be a non-negative finite number.');
  const incomeCents = Math.round(incomeRand * 100);
  const index = TAX_YEAR.brackets.findIndex(([upper]) => incomeCents <= upper);
  const [, base, rate] = TAX_YEAR.brackets[index];
  const gross = base + Math.round((incomeCents - TAX_YEAR.lowerBounds[index]) * rate / 100);
  const taxCents = Math.max(0, gross - TAX_YEAR.primaryRebateCents);
  return Object.freeze({
    taxYear: TAX_YEAR.label,
    grossIncome: incomeCents / 100,
    estimatedTax: taxCents / 100,
    estimatedAfterTax: (incomeCents - taxCents) / 100,
    effectiveRate: incomeCents ? Math.round((taxCents / incomeCents) * 10_000) / 100 : 0,
    source: TAX_YEAR.source,
    disclaimer: 'Estimate assumes platform income is annual taxable income for a person under 65 and applies only the primary rebate. It is not tax advice or an official SARS assessment.'
  });
}
module.exports = { estimateAnnualTax, TAX_YEAR };
