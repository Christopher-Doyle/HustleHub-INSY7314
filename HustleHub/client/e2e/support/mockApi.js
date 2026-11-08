// Shared helper for the role/session browser tests. Mocks only the auth
// envelope (/api/auth/*) at the network layer so these tests can run
// against the real app in a real browser without needing a live backend
// or database — appropriate here because what they verify (route guards,
// logout clearing state, session surviving a reload) is frontend routing
// behaviour, not business logic. The full data round-trip (gig creation,
// booking, transaction, tax calculation) already has real end-to-end
// coverage against the real API in e2e/marketplace.e2e.js.
function envelope(data) {
  return { success: true, data };
}

// Registers route handlers for one logged-in identity and returns helpers
// to drive the UI through register/login/logout for it. `user` must match
// the shape AuthContext/session.js expect: { id, fullName, role }.
export async function mockAuthFor(page, user, password = 'Test-password-123!') {
  await page.route('**/api/auth/register', route =>
    route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(envelope({ user })) }));

  await page.route('**/api/auth/login', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ token: 'mock-jwt-token', user })) }));

  // Called on every full page mount when a token is already stored
  // (AuthContext re-validates it) — keeps the mocked session alive across
  // page.goto()/page.reload().
  await page.route('**/api/auth/me', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ user })) }));

  return {
    async registerAndLogIn() {
      await page.goto('/register');
      await page.getByLabel('Full name').fill(user.fullName);
      await page.getByLabel('Email').fill(`${user.role}@example.test`);
      await page.getByLabel(/Password/).fill(password);
      await page.getByRole('radio', { name: new RegExp(`^${user.role}`, 'i') }).check();
      await page.getByRole('button', { name: 'Register' }).click();
      await page.getByRole('heading', { name: 'Log in' }).waitFor();
      await page.getByLabel('Email').fill(`${user.role}@example.test`);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.getByRole('button', { name: 'Log out' }).waitFor();
    }
  };
}

export function emptyGigListRoutes(page) {
  return Promise.all([
    page.route('**/api/gigs/mine', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ gigs: [] })) })),
    page.route('**/api/bookings/me', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ bookings: [] })) })),
    page.route('**/api/bookings/freelancer', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope({ bookings: [] })) }))
  ]);
}
