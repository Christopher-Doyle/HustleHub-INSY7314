import { expect, test } from '@playwright/test';
import { mockAuthFor, emptyGigListRoutes } from './support/mockApi.js';

// Covers Prompt 2's "incorrect roles cannot see protected pages" check.
// The backend enforces every one of these the same way on every request —
// this only verifies the UI guards behave sensibly on top of that, never
// that they ARE the security boundary (see ProtectedRoute.jsx / RequireFreelancer.jsx).

test('a client is redirected away from a freelancer-only page, and from an admin page', async ({ page }) => {
  const client = { id: 'client-1', fullName: 'Browser Test client', role: 'client' };
  const { registerAndLogIn } = await mockAuthFor(page, client);
  await emptyGigListRoutes(page);
  await registerAndLogIn();

  // /my-gigs is freelancer-only and shows an inline message rather than redirecting.
  await page.goto('/my-gigs');
  await expect(page.getByRole('alert')).toContainText('Only signed-in freelancers can manage gigs.');

  // /admin requires the admin role; a client is bounced back to the dashboard.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
});

test('a freelancer is redirected away from a client-only booking page', async ({ page }) => {
  const freelancer = { id: 'freelancer-1', fullName: 'Browser Test freelancer', role: 'freelancer' };
  const { registerAndLogIn } = await mockAuthFor(page, freelancer);
  await emptyGigListRoutes(page);
  await registerAndLogIn();

  await page.goto('/book');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  await page.goto('/bookings/mine');
  await expect(page).toHaveURL(/\/$/);
});

test('an unauthenticated visitor hitting a protected URL directly is sent to log in, not shown the page', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  await page.goto('/freelancer/income');
  await expect(page).toHaveURL(/\/login$/);
});
