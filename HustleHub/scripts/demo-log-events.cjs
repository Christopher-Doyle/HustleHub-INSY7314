// Generates the security and business events needed for the cloud-logging evidence.
// It creates disposable `@example.test` accounts only and prints request IDs, never passwords or JWTs.
// Usage: DEMO_LOG_URL=https://localhost:5173 node scripts/demo-log-events.cjs
const { randomBytes } = require('node:crypto');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // local development certificate only
const base = process.env.DEMO_LOG_URL || 'https://localhost:5173';
if (!/^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
  console.error('DEMO_LOG_URL must be a local HTTPS address such as https://localhost:5173.');
  process.exit(1);
}
const stamp = `${Date.now()}-${randomBytes(3).toString('hex')}`;
const summary = [];

async function call(label, method, path, { body, token } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  summary.push({ step: label, status: response.status, requestId: response.headers.get('x-request-id') });
  return { status: response.status, data: payload.data, error: payload.error };
}

async function main() {
  const password = `Demo-${randomBytes(12).toString('hex')}!`;
  const freelancer = { fullName: 'Demo Freelancer', email: `demo.freelancer.${stamp}@example.test`, password, role: 'freelancer' };
  const client = { fullName: 'Demo Client', email: `demo.client.${stamp}@example.test`, password, role: 'client' };
  const locked = { fullName: 'Demo Lockout', email: `demo.lockout.${stamp}@example.test`, password, role: 'client' };
  for (const account of [freelancer, client, locked]) await call(`register ${account.role}`, 'POST', '/api/auth/register', { body: account });

  await call('failed login (wrong password)', 'POST', '/api/auth/login', { body: { email: freelancer.email, password: `${password}x` } });
  const freelancerLogin = await call('successful login (freelancer)', 'POST', '/api/auth/login', { body: { email: freelancer.email, password } });
  const clientLogin = await call('successful login (client)', 'POST', '/api/auth/login', { body: { email: client.email, password } });

  const gig = await call('create gig', 'POST', '/api/gigs', { token: freelancerLogin.data.token, body: { title: 'Demo logging review', description: 'Disposable gig used to generate cloud logging evidence.', category: 'Technology', price: 1500 } });
  await call('booking + automatic transaction', 'POST', '/api/bookings', { token: clientLogin.data.token, body: { gigId: gig.data.gig.id } });
  await call('freelancer income insights', 'GET', '/api/income/me/insights', { token: freelancerLogin.data.token });
  await call('validation error (negative price)', 'POST', '/api/gigs', { token: freelancerLogin.data.token, body: { title: 'Invalid price', description: 'This request is expected to be rejected.', category: 'Technology', price: -5 } });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await call(`lockout attempt ${attempt} (wrong password)`, 'POST', '/api/auth/login', { body: { email: locked.email, password: `${password}-wrong-${attempt}` } });
  }
  await call('login with correct password while locked', 'POST', '/api/auth/login', { body: { email: locked.email, password } });

  await call('logout (JWT revocation)', 'POST', '/api/auth/logout', { token: freelancerLogin.data.token });
  await call('revoked token reused (expect 401)', 'GET', '/api/auth/me', { token: freelancerLogin.data.token });

  console.table(summary);
  console.log('Search these request IDs and event names (authentication_failed, account_locked, authentication_succeeded, booking_created, transaction_created, token_revoked, request_error) in your log provider.');
}
main().catch(error => { console.error(`Demo event generation failed: ${error.message}`); process.exitCode = 1; });
