import { expect, test } from '@playwright/test';
import { mockAuthFor, emptyGigListRoutes } from './support/mockApi.js';

// Covers Prompt 2's "authentication state changes after logout" and
// "the app works after refreshing a frontend route" checks.

test('logging out clears the session and protected pages redirect afterwards', async ({ page }) => {
  const client = { id: 'client-1', fullName: 'Browser Test client', role: 'client' };
  const { registerAndLogIn } = await mockAuthFor(page, client);
  await emptyGigListRoutes(page);
  await registerAndLogIn();

  await expect(page.getByText('client', { exact: true })).toBeVisible(); // role pill
  await expect(page.getByRole('link', { name: 'My bookings' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);

  // A protected page is no longer reachable after logging out.
  await page.goto('/bookings/mine');
  await expect(page).toHaveURL(/\/login$/);
});

test('a logged-in session survives a full page refresh on a deep route', async ({ page }) => {
  const freelancer = { id: 'freelancer-1', fullName: 'Browser Test freelancer', role: 'freelancer' };
  const { registerAndLogIn } = await mockAuthFor(page, freelancer);
  await emptyGigListRoutes(page);
  await registerAndLogIn();

  await page.getByRole('link', { name: 'My gigs' }).click();
  await expect(page.getByRole('heading', { name: 'My gigs' })).toBeVisible();

  // A real browser reload, not client-side navigation — this is the case
  // that breaks if the dev/prod server doesn't serve index.html for every
  // route, or if the session weren't persisted outside React state.
  await page.reload();

  await expect(page.getByRole('heading', { name: 'My gigs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);
});
