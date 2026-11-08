import { expect, test } from '@playwright/test';
import { mockAuthFor, emptyGigListRoutes } from './support/mockApi.js';

// Automated regression for Prompt 2's responsive checklist. A full visual
// review still belongs to a human at these widths, but this at least
// guards the one failure mode that's easy to introduce by accident:
// content wider than the viewport, forcing horizontal page scroll.
const VIEWPORTS = [
  { name: '360px mobile', width: 360, height: 740 },
  { name: '390px mobile', width: 390, height: 844 },
  { name: '768px tablet', width: 768, height: 1024 }
];

async function hasNoHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

for (const viewport of VIEWPORTS) {
  test(`homepage and navigation have no horizontal overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /find the right talent/i })).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    await page.screenshot({ path: `test-results/responsive-home-${viewport.width}.png`, fullPage: true });
  });
}

test('the freelancer income dashboard stays usable at 390px (stat cards and chart)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const freelancer = { id: 'freelancer-1', fullName: 'Browser Test freelancer', role: 'freelancer' };
  const { registerAndLogIn } = await mockAuthFor(page, freelancer);
  await emptyGigListRoutes(page);
  await page.route('**/api/income/me/insights', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      data: {
        taxYearEarnings: 540, estimatedTax: 54, estimatedAfterTax: 486, effectiveRate: 10,
        lifetimeEarnings: 700, transactionCount: 2, taxYear: 2027,
        monthly: [{ month: 'Jan 2026', income: 540 }],
        disclaimer: 'This is an estimate and not tax advice.', source: 'https://www.sars.gov.za/'
      }
    })
  }));
  await page.route('**/api/transactions/me', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { transactions: [] } })
  }));

  await registerAndLogIn();
  await page.getByRole('link', { name: 'Income', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Income and tax overview' })).toBeVisible();
  await expect(page.getByLabel('Monthly income chart')).toBeVisible();
  expect(await hasNoHorizontalOverflow(page)).toBe(true);
  await page.screenshot({ path: 'test-results/responsive-income-390.png', fullPage: true });
});
