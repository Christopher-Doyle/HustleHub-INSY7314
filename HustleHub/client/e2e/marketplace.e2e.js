import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

async function registerAndLogIn(page, role, stamp) {
  const email = `${role}.${stamp}@example.test`;
  const password = `Test-${randomUUID()}!`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill(`Browser Test ${role}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Password/).fill(password);
  await page.getByRole('radio', { name: new RegExp(`^${role}`, 'i') }).check();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  return password;
}

test('a client booking appears in the freelancer transaction and tax dashboard', async ({ page }, testInfo) => {
  const stamp = randomUUID();
  const title = `Browser integration gig ${stamp.slice(0, 8)}`;
  const freelancerPassword = await registerAndLogIn(page, 'freelancer', stamp);
  await page.getByRole('link', { name: 'My gigs' }).click();
  await page.getByRole('link', { name: 'Create gig', exact: true }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Category').selectOption('Development');
  await page.getByLabel('Price (ZAR)').fill('245100');
  await page.getByLabel('Description').fill('A simulated technology service for the browser integration test.');
  await page.getByRole('button', { name: 'Create gig' }).click();
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();

  await registerAndLogIn(page, 'client', stamp);
  await page.goto('/freelancer/income');
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Browse gigs' }).click();
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('link', { name: 'Book this gig' }).click();
  const bookingResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/bookings' && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  const response = await bookingResponse;
  expect(response.status()).toBe(201);
  const { data: { booking, transaction } } = await response.json();
  const bookingId = booking.id;
  expect(bookingId).toMatch(/^[a-f0-9]{24}$/i);
  expect(transaction).toMatchObject({ bookingId, amount: 245100, status: 'completed' });

  const confirmation = page.getByRole('region', { name: /^you['’]re booked in$/i });
  await expect(confirmation.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(confirmation.getByText(title, { exact: true })).toBeVisible();
  await expect(confirmation.getByText(bookingId, { exact: true })).toBeVisible();
  await expect(confirmation.getByText('confirmed', { exact: true })).toBeVisible();
  await testInfo.attach('booking-confirmation', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Log out' }).click();

  await page.getByLabel('Email').fill(`freelancer.${stamp}@example.test`);
  // A fresh password is held in memory only during this test.
  await page.getByLabel('Password').fill(freelancerPassword);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('link', { name: 'Income', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Income and tax overview' })).toBeVisible();
  const transactionRow = page.getByRole('row').filter({ hasText: bookingId });
  await expect(transactionRow).toContainText(/245[\s,]?100/);
  await expect(transactionRow).toContainText('completed');
  await expect(page.getByText('Lifetime platform earnings').locator('..')).toContainText(/245[\s,]?100/);
  const now = new Date().toISOString().slice(0, 10);
  if (now >= '2026-03-01' && now <= '2027-02-28') {
    await expect(page.getByText('Estimated tax', { exact: true }).locator('..')).toContainText(/26[\s,]?298/);
    await expect(page.locator('.bar-fill')).toBeVisible();
  }
  await testInfo.attach('income-dashboard', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
