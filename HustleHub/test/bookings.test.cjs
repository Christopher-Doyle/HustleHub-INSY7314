const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { User } = require('../src/models/user.cjs');
const { Gig } = require('../src/models/gig.cjs');
const { Booking } = require('../src/models/booking.cjs');
const { Transaction } = require('../src/models/transaction.cjs');
const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));

let mongo, config, server, port;

function request(method, route, body, headers = {}, target = port) {
  return new Promise((resolve, reject) => {
    const raw = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request({ hostname: '127.0.0.1', port: target, path: route, method, ca: cert, headers: { ...(raw === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) }), ...headers } }, res => {
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text), headers: res.headers }));
    });
    req.on('error', reject);
    req.end(raw);
  });
}

async function registerAndLogin(overrides) {
  const body = { fullName: 'Test User', email: `${randomBytes(6).toString('hex')}@example.com`, password: randomBytes(24).toString('hex'), ...overrides };
  await request('POST', '/api/auth/register', body);
  const login = await request('POST', '/api/auth/login', { email: body.email, password: body.password });
  return { token: login.body.data.token, user: login.body.data.user };
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  config = loadConfig({ JWT_SECRET: randomBytes(32).toString('hex'), MONGODB_URI: mongo.getUri() });
  await connectDatabase(config.mongodbUri);
  await Promise.all([User.init(), Gig.init(), Booking.init(), Transaction.init()]);
  server = https.createServer({ key, cert, minVersion: 'TLSv1.2' }, await createApp(config, { rateLimitMax: 200, bookingRateLimitMax: 200 }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await disconnectDatabase();
  await mongo.stop();
});

async function makeGig(freelancer, overrides = {}) {
  return Gig.create({ freelancerId: freelancer.id, title: 'Responsive website build', description: 'Design and build a responsive marketing site.', category: 'Web Development', price: 500, ...overrides });
}

test('client books a real gig; price and freelancer come from the server-side gig, not the request', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const client = await registerAndLogin({ role: 'client' });
  const gig = await makeGig(freelancer.user);

  // A malicious/careless client tries to send its own price and freelancerId;
  // validateBookingInput allowlists only gigId so these are rejected outright.
  const tampered = await request('POST', '/api/bookings', { gigId: String(gig._id), price: 1, freelancerId: 'forged' }, { authorization: `Bearer ${client.token}` });
  assert.equal(tampered.status, 400);

  const r = await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.booking.price, 500);
  assert.equal(r.body.data.booking.freelancerId, freelancer.user.id);
  assert.equal(r.body.data.booking.clientId, client.user.id);
  assert.equal(r.body.data.booking.status, 'confirmed');
});

test('a transaction record is created automatically and linked to the booking', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const client = await registerAndLogin({ role: 'client' });
  const gig = await makeGig(freelancer.user, { price: 275 });

  const r = await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` });
  assert.equal(r.status, 201);
  const transaction = r.body.data.transaction;
  assert.equal(transaction.bookingId, r.body.data.booking.id);
  assert.equal(transaction.amount, 275);
  assert.equal(transaction.status, 'completed');

  const stored = await Transaction.findOne({ bookingId: r.body.data.booking.id });
  assert.ok(stored);
  assert.equal(stored.freelancerId.toString(), freelancer.user.id);
  assert.equal(stored.clientId.toString(), client.user.id);
});

test('freelancers cannot book gigs (role-restricted, not just hidden in the UI)', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const gig = await makeGig(freelancer.user);
  const r = await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${freelancer.token}` });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'FORBIDDEN');
});

test('an unauthenticated booking attempt is rejected', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const gig = await makeGig(freelancer.user);
  const r = await request('POST', '/api/bookings', { gigId: String(gig._id) });
  assert.equal(r.status, 401);
});

test('invalid and missing gig ids are rejected safely', async () => {
  const client = await registerAndLogin({ role: 'client' });
  const malformed = await request('POST', '/api/bookings', { gigId: 'not-an-id' }, { authorization: `Bearer ${client.token}` });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, 'VALIDATION_ERROR');

  const wellFormedButMissing = await request('POST', '/api/bookings', { gigId: '507f1f77bcf86cd799439011' }, { authorization: `Bearer ${client.token}` });
  assert.equal(wellFormedButMissing.status, 404);
  assert.equal(wellFormedButMissing.body.error.code, 'GIG_NOT_FOUND');

  const empty = await request('POST', '/api/bookings', {}, { authorization: `Bearer ${client.token}` });
  assert.equal(empty.status, 400);
});

test('clients see only their own bookings; freelancers see only bookings for their own gigs', async () => {
  const freelancerA = await registerAndLogin({ role: 'freelancer' });
  const freelancerB = await registerAndLogin({ role: 'freelancer' });
  const clientA = await registerAndLogin({ role: 'client' });
  const clientB = await registerAndLogin({ role: 'client' });
  const gigA = await makeGig(freelancerA.user, { title: 'Gig owned by freelancer A' });

  await request('POST', '/api/bookings', { gigId: String(gigA._id) }, { authorization: `Bearer ${clientA.token}` });
  await request('POST', '/api/bookings', { gigId: String(gigA._id) }, { authorization: `Bearer ${clientB.token}` });

  const clientAView = await request('GET', '/api/bookings/me', undefined, { authorization: `Bearer ${clientA.token}` });
  assert.equal(clientAView.body.data.bookings.length, 1);
  assert.equal(clientAView.body.data.bookings[0].clientId, clientA.user.id);

  const freelancerAView = await request('GET', '/api/bookings/freelancer', undefined, { authorization: `Bearer ${freelancerA.token}` });
  assert.equal(freelancerAView.body.data.bookings.length, 2);

  const freelancerBView = await request('GET', '/api/bookings/freelancer', undefined, { authorization: `Bearer ${freelancerB.token}` });
  assert.equal(freelancerBView.body.data.bookings.length, 0);

  // A client cannot read the freelancer-only view, and vice versa.
  assert.equal((await request('GET', '/api/bookings/freelancer', undefined, { authorization: `Bearer ${clientA.token}` })).status, 403);
  assert.equal((await request('GET', '/api/bookings/me', undefined, { authorization: `Bearer ${freelancerA.token}` })).status, 403);
});

test('freelancer income and transaction history include only that freelancer\'s own completed transactions', async () => {
  const freelancerA = await registerAndLogin({ role: 'freelancer' });
  const freelancerB = await registerAndLogin({ role: 'freelancer' });
  const client = await registerAndLogin({ role: 'client' });
  const gigA1 = await makeGig(freelancerA.user, { title: 'Gig A1', price: 100 });
  const gigA2 = await makeGig(freelancerA.user, { title: 'Gig A2', price: 50 });
  const gigB = await makeGig(freelancerB.user, { title: 'Gig B', price: 1000 });

  await request('POST', '/api/bookings', { gigId: String(gigA1._id) }, { authorization: `Bearer ${client.token}` });
  await request('POST', '/api/bookings', { gigId: String(gigA2._id) }, { authorization: `Bearer ${client.token}` });
  await request('POST', '/api/bookings', { gigId: String(gigB._id) }, { authorization: `Bearer ${client.token}` });

  const incomeA = await request('GET', '/api/income/me', undefined, { authorization: `Bearer ${freelancerA.token}` });
  assert.equal(incomeA.status, 200);
  assert.equal(incomeA.body.data.totalIncome, 150);
  assert.equal(incomeA.body.data.transactionCount, 2);

  const transactionsA = await request('GET', '/api/transactions/me', undefined, { authorization: `Bearer ${freelancerA.token}` });
  assert.equal(transactionsA.body.data.transactions.length, 2);
  assert.ok(transactionsA.body.data.transactions.every(t => t.freelancerId === freelancerA.user.id));

  const incomeB = await request('GET', '/api/income/me', undefined, { authorization: `Bearer ${freelancerB.token}` });
  assert.equal(incomeB.body.data.totalIncome, 1000);
});

test('financial insights separate lifetime earnings from the exact 2027 tax-year boundaries', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const client = await registerAndLogin({ role: 'client' });
  const cases = [
    ['Before year', 100, '2026-02-28T23:59:59.999Z'],
    ['Year opens', 200, '2026-03-01T00:00:00.000Z'],
    ['Year closes', 300, '2027-02-28T23:59:59.999Z'],
    ['After year', 400, '2027-03-01T00:00:00.000Z']
  ];
  for (const [title, price, createdAt] of cases) {
    const gig = await makeGig(freelancer.user, { title, price });
    const booked = await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` });
    await Transaction.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(booked.body.data.transaction.id) }, { $set: { createdAt: new Date(createdAt) } });
  }
  const response = await request('GET', '/api/income/me/insights', undefined, { authorization: `Bearer ${freelancer.token}` });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.lifetimeEarnings, 1000);
  assert.equal(response.body.data.taxYearEarnings, 500);
  assert.equal(response.body.data.estimatedAnnualTaxableIncome, 500);
  assert.equal(response.body.data.transactionCount, 2);
  assert.deepEqual(response.body.data.monthly.map(item => item.month), ['2026-03', '2027-02']);
});

test('a client cannot read another client\'s booking history via query manipulation', async () => {
  // There is no bookings-by-id route that trusts a client-supplied owner id —
  // /me always derives ownership from the authenticated token, so this is
  // really asserting that /me ignores anything the client might try to pass.
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const clientA = await registerAndLogin({ role: 'client' });
  const clientB = await registerAndLogin({ role: 'client' });
  const gig = await makeGig(freelancer.user);
  await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${clientA.token}` });

  const asClientB = await request('GET', `/api/bookings/me?clientId=${clientA.user.id}`, undefined, { authorization: `Bearer ${clientB.token}` });
  assert.equal(asClientB.body.data.bookings.length, 0);
});

test('booking rate limiter returns a safe 429 after the configured threshold', async () => {
  const freelancer = await registerAndLogin({ role: 'freelancer' });
  const client = await registerAndLogin({ role: 'client' });
  const gig = await makeGig(freelancer.user);
  const limited = https.createServer({ key, cert }, await createApp(config, { rateLimitMax: 200, bookingRateLimitMax: 2 }));
  await new Promise(resolve => limited.listen(0, '127.0.0.1', resolve));
  try {
    const p = limited.address().port;
    await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` }, p);
    await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` }, p);
    const r = await request('POST', '/api/bookings', { gigId: String(gig._id) }, { authorization: `Bearer ${client.token}` }, p);
    assert.equal(r.status, 429);
    assert.equal(r.body.error.code, 'RATE_LIMITED');
    assert.ok(r.headers['retry-after']);
  } finally { await new Promise(resolve => limited.close(resolve)); }
});
