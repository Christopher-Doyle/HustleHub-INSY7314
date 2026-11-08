const assert = require('node:assert/strict');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const base = process.env.DOCKER_SMOKE_URL || 'https://localhost:5173';
const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function api(method, path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const type = response.headers.get('content-type') || '';
  assert.match(type, /application\/json/, `${path} returned ${type}, likely the SPA fallback`);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload.data;
}

async function registerAndLogin(role) {
  const email = `${role}.${stamp}@example.test`;
  const password = `Safe-${stamp}-Password!`;
  await api('POST', '/api/auth/register', { fullName: `${role} Smoke`, email, password, role });
  return api('POST', '/api/auth/login', { email, password });
}

async function main() {
  assert.equal((await api('GET', '/api/health')).status, 'ok');
  const freelancer = await registerAndLogin('freelancer');
  const client = await registerAndLogin('client');
  const created = await api('POST', '/api/gigs', { title: 'Container security review', description: 'A complete isolated container smoke-test service.', category: 'Technology', price: 1250 }, freelancer.token);
  const browsed = await api('GET', '/api/gigs');
  assert.ok(browsed.gigs.some(gig => gig.id === created.gig.id));
  const booked = await api('POST', '/api/bookings', { gigId: created.gig.id }, client.token);
  assert.equal(booked.transaction.amount, 1250);
  const transactions = await api('GET', '/api/transactions/me', undefined, freelancer.token);
  assert.ok(transactions.transactions.some(item => item.bookingId === booked.booking.id));
  const insights = await api('GET', '/api/income/me/insights', undefined, freelancer.token);
  assert.equal(insights.taxYearEarnings, 1250);
  assert.equal(insights.lifetimeEarnings, 1250);
  const direct = await fetch(`${base}/freelancer/income`);
  assert.equal(direct.status, 200);
  assert.match(await direct.text(), /<div id="root"><\/div>/);
  await api('POST', '/api/auth/logout', undefined, freelancer.token);
  const revoked = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${freelancer.token}` } });
  assert.equal(revoked.status, 401);
  console.log('PASS: HTTPS proxy, auth, gigs, booking, transaction, income, tax dashboard API, SPA refresh, and revocation.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
