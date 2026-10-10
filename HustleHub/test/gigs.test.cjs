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

const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
const PASSWORD = 'DemoPassphrase!7314';
const validGig = { title: 'Logo design', description: 'I will design a clean modern logo.', category: 'Design', price: 150 };
let mongo, server, port, freelancer, otherFreelancer, client;

function request(method, route, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const raw = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const headers = {};
    if (raw !== undefined) Object.assign(headers, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) });
    if (token) headers.authorization = `Bearer ${token}`;
    const req = https.request({ hostname: '127.0.0.1', port, path: route, method, ca: cert, headers }, res => {
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : undefined, headers: res.headers }));
    });
    req.on('error', reject);
    req.end(raw);
  });
}

async function signUp(fullName, email, role) {
  const registered = await request('POST', '/api/auth/register', { body: { fullName, email, password: PASSWORD, role } });
  assert.equal(registered.status, 201);
  const login = await request('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(login.status, 200);
  return { token: login.body.data.token, user: login.body.data.user };
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  const config = loadConfig({ JWT_SECRET: randomBytes(32).toString('hex'), MONGODB_URI: mongo.getUri() });
  await connectDatabase(config.mongodbUri);
  await User.init();
  server = https.createServer({ key, cert, minVersion: 'TLSv1.2' }, await createApp(config, { rateLimitMax: 500 }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  freelancer = await signUp('Aisha Khan', 'aisha.gigs@example.com', 'freelancer');
  otherFreelancer = await signUp('Bongani Dlamini', 'bongani.gigs@example.com', 'freelancer');
  client = await signUp('Carl Client', 'carl.gigs@example.com', 'client');
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await disconnectDatabase();
  await mongo.stop();
});

test('freelancer creates a valid gig and ownership comes from the token', async () => {
  const r = await request('POST', '/api/gigs', { token: freelancer.token, body: validGig });
  assert.equal(r.status, 201);
  const gig = r.body.data.gig;
  assert.equal(gig.title, validGig.title);
  assert.equal(gig.price, 150);
  assert.equal(gig.freelancer.id, freelancer.user.id);
  assert.equal(gig.freelancer.fullName, 'Aisha Khan');
  const stored = await Gig.findById(gig.id);
  assert.equal(String(stored.freelancerId), freelancer.user.id);
});

test('client and unauthenticated callers cannot create gigs', async () => {
  const asClient = await request('POST', '/api/gigs', { token: client.token, body: validGig });
  assert.equal(asClient.status, 403);
  assert.equal(asClient.body.error.code, 'FORBIDDEN');
  const anonymous = await request('POST', '/api/gigs', { body: validGig });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.error.code, 'UNAUTHENTICATED');
});

test('browse list is public and returns created gigs with safe fields only', async () => {
  await request('POST', '/api/gigs', { token: otherFreelancer.token, body: { ...validGig, title: 'Website copywriting', category: 'Writing', price: 80 } });
  const r = await request('GET', '/api/gigs');
  assert.equal(r.status, 200);
  const { gigs, total, page, limit } = r.body.data;
  assert.ok(total >= 2);
  assert.equal(page, 1);
  assert.equal(limit, 12);
  assert.ok(gigs.some(gig => gig.title === 'Logo design'));
  for (const gig of gigs) {
    assert.deepEqual(Object.keys(gig).sort(), ['category', 'createdAt', 'description', 'freelancer', 'id', 'price', 'title', 'updatedAt']);
    assert.deepEqual(Object.keys(gig.freelancer).sort(), ['fullName', 'id']);
  }
});

test('browse supports category filter, text search and pagination', async () => {
  const writing = await request('GET', '/api/gigs?category=Writing');
  assert.equal(writing.status, 200);
  assert.ok(writing.body.data.gigs.length >= 1);
  assert.ok(writing.body.data.gigs.every(gig => gig.category === 'Writing'));

  const search = await request('GET', '/api/gigs?search=copywriting');
  assert.deepEqual(search.body.data.gigs.map(gig => gig.title), ['Website copywriting']);

  const none = await request('GET', '/api/gigs?search=zzzzzz');
  assert.equal(none.status, 200);
  assert.deepEqual(none.body.data.gigs, []);

  const paged = await request('GET', '/api/gigs?limit=1&page=2');
  assert.equal(paged.body.data.gigs.length, 1);
  assert.equal(paged.body.data.limit, 1);
});

test('regex characters in search are treated as literal text', async () => {
  const r = await request('GET', '/api/gigs?search=.*');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.gigs, []);
});

test('invalid browse query parameters are rejected with 400', async () => {
  for (const query of ['limit=abc', 'limit=0', 'limit=500', 'page=-1', 'category=a&category=b']) {
    const r = await request('GET', `/api/gigs?${query}`);
    assert.equal(r.status, 400, query);
    assert.equal(r.body.error.code, 'VALIDATION_ERROR', query);
  }
});

test('gig detail returns the correct gig, 404 when missing and 400 for malformed ids', async () => {
  const created = await request('POST', '/api/gigs', { token: freelancer.token, body: { ...validGig, title: 'Detail target gig' } });
  const id = created.body.data.gig.id;
  const found = await request('GET', `/api/gigs/${id}`);
  assert.equal(found.status, 200);
  assert.equal(found.body.data.gig.id, id);
  assert.equal(found.body.data.gig.title, 'Detail target gig');

  const missing = await request('GET', `/api/gigs/${'0'.repeat(24)}`);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'GIG_NOT_FOUND');

  const malformed = await request('GET', '/api/gigs/not-an-id');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, 'INVALID_ID');
});

test('My Gigs returns only the authenticated freelancer gigs', async () => {
  const mine = await request('GET', '/api/gigs/mine', { token: otherFreelancer.token });
  assert.equal(mine.status, 200);
  assert.ok(mine.body.data.gigs.length >= 1);
  assert.ok(mine.body.data.gigs.every(gig => gig.freelancer.id === otherFreelancer.user.id));
  assert.equal((await request('GET', '/api/gigs/mine', { token: client.token })).status, 403);
  assert.equal((await request('GET', '/api/gigs/mine')).status, 401);
});

async function createGig(token, overrides = {}) {
  const r = await request('POST', '/api/gigs', { token, body: { ...validGig, ...overrides } });
  assert.equal(r.status, 201);
  return r.body.data.gig;
}

test('owner updates their own gig and unchanged fields are preserved', async () => {
  const gig = await createGig(freelancer.token, { title: 'Update me' });
  const r = await request('PATCH', `/api/gigs/${gig.id}`, { token: freelancer.token, body: { price: 220.5, category: 'Branding' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.gig.price, 220.5);
  assert.equal(r.body.data.gig.category, 'Branding');
  assert.equal(r.body.data.gig.title, 'Update me');
  const stored = await Gig.findById(gig.id);
  assert.equal(stored.price, 220.5);
  assert.equal(String(stored.freelancerId), freelancer.user.id);
});

test('another freelancer cannot update a gig they do not own', async () => {
  const gig = await createGig(freelancer.token, { title: 'Protected gig' });
  const r = await request('PATCH', `/api/gigs/${gig.id}`, { token: otherFreelancer.token, body: { title: 'Hijacked title' } });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'FORBIDDEN');
  assert.equal((await Gig.findById(gig.id)).title, 'Protected gig');
});

test('another freelancer cannot delete a gig they do not own', async () => {
  const gig = await createGig(freelancer.token, { title: 'Undeletable gig' });
  const r = await request('DELETE', `/api/gigs/${gig.id}`, { token: otherFreelancer.token });
  assert.equal(r.status, 403);
  assert.ok(await Gig.exists({ _id: gig.id }));
});

test('clients and anonymous callers cannot update or delete gigs', async () => {
  const gig = await createGig(freelancer.token, { title: 'Role protected gig' });
  for (const [method, body] of [['PATCH', { price: 1 }], ['DELETE', undefined]]) {
    const asClient = await request(method, `/api/gigs/${gig.id}`, { token: client.token, body });
    assert.equal(asClient.status, 403, `${method} as client`);
    const anonymous = await request(method, `/api/gigs/${gig.id}`, { body });
    assert.equal(anonymous.status, 401, `${method} anonymous`);
  }
  assert.equal((await Gig.findById(gig.id)).price, validGig.price);
});

test('owner deletes their gig with 204 and it is gone afterwards', async () => {
  const gig = await createGig(freelancer.token, { title: 'Delete me' });
  const removed = await request('DELETE', `/api/gigs/${gig.id}`, { token: freelancer.token });
  assert.equal(removed.status, 204);
  assert.equal(removed.body, undefined);
  assert.equal((await request('GET', `/api/gigs/${gig.id}`)).status, 404);
  const again = await request('DELETE', `/api/gigs/${gig.id}`, { token: freelancer.token });
  assert.equal(again.status, 404);
});

test('update and delete reject malformed and unknown gig ids safely', async () => {
  const bad = await request('PATCH', '/api/gigs/not-an-id', { token: freelancer.token, body: { price: 1 } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'INVALID_ID');
  const missing = await request('DELETE', `/api/gigs/${'f'.repeat(24)}`, { token: freelancer.token });
  assert.equal(missing.status, 404);
});

test('invalid prices are rejected on create and update', async () => {
  const gig = await createGig(freelancer.token, { title: 'Price validation gig' });
  for (const price of [-1, 'free', null, 1000001, 10.999, Number.NaN, '50']) {
    const created = await request('POST', '/api/gigs', { token: freelancer.token, body: { ...validGig, price } });
    assert.equal(created.status, 400, `create price ${price}`);
    const updated = await request('PATCH', `/api/gigs/${gig.id}`, { token: freelancer.token, body: { price } });
    assert.equal(updated.status, 400, `update price ${price}`);
  }
  assert.equal((await Gig.findById(gig.id)).price, validGig.price);
});

test('text fields enforce required values, lengths and type', async () => {
  for (const overrides of [
    { title: '' }, { title: 'ab' }, { title: 'x'.repeat(121) },
    { description: 'too short' }, { description: 'y'.repeat(2001) },
    { category: '' }, { category: 'x'.repeat(81) }, { title: 12345 }, { description: ['a', 'b'] }
  ]) {
    const r = await request('POST', '/api/gigs', { token: freelancer.token, body: { ...validGig, ...overrides } });
    assert.equal(r.status, 400, JSON.stringify(overrides).slice(0, 60));
    assert.equal(r.body.error.code, 'VALIDATION_ERROR');
  }
  const missing = await request('POST', '/api/gigs', { token: freelancer.token, body: { title: 'Only a title here' } });
  assert.equal(missing.status, 400);
  assert.ok(missing.body.error.details.length >= 3);
});

test('unknown fields including ownership overrides are rejected', async () => {
  const gig = await createGig(freelancer.token, { title: 'Mass assignment target' });
  const attempts = [{ freelancerId: otherFreelancer.user.id }, { _id: '507f1f77bcf86cd799439011' }, { role: 'admin' }, { createdAt: '2000-01-01' }];
  for (const extra of attempts) {
    const created = await request('POST', '/api/gigs', { token: freelancer.token, body: { ...validGig, ...extra } });
    assert.equal(created.status, 400, `create ${Object.keys(extra)}`);
    const updated = await request('PATCH', `/api/gigs/${gig.id}`, { token: freelancer.token, body: extra });
    assert.equal(updated.status, 400, `update ${Object.keys(extra)}`);
  }
  assert.equal(String((await Gig.findById(gig.id)).freelancerId), freelancer.user.id);
});

test('operator, nested and script-style input is rejected and never stored', async () => {
  const before = await Gig.countDocuments();
  const payloads = [
    { ...validGig, title: { $gt: '' } },
    { ...validGig, category: { $ne: null } },
    { ...validGig, price: { $gt: 0 } },
    { ...validGig, title: '<script>alert(1)</script>' },
    { ...validGig, description: 'Click <img src=x onerror=alert(1)> now please' },
    { ...validGig, category: '"><svg/onload=alert(1)>' }
  ];
  for (const body of payloads) {
    const r = await request('POST', '/api/gigs', { token: freelancer.token, body });
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 70));
  }
  assert.equal(await Gig.countDocuments(), before);
});

test('non-object bodies, arrays, malformed JSON and empty updates fail safely', async () => {
  for (const body of ['[1,2,3]', '"just text"', 'null']) {
    const r = await request('POST', '/api/gigs', { token: freelancer.token, body });
    assert.equal(r.status, 400, body);
  }
  const broken = await request('POST', '/api/gigs', { token: freelancer.token, body: '{"title": ' });
  assert.equal(broken.status, 400);
  assert.equal(broken.body.error.code, 'INVALID_JSON');
  const empty = await request('PATCH', `/api/gigs/${(await createGig(freelancer.token, { title: 'Empty patch gig' })).id}`, { token: freelancer.token, body: {} });
  assert.equal(empty.status, 400);
});

test('gig error responses never leak stack traces or internals', async () => {
  const responses = [
    await request('POST', '/api/gigs', { token: freelancer.token, body: { ...validGig, price: -1 } }),
    await request('GET', '/api/gigs/not-an-id'),
    await request('PATCH', `/api/gigs/${'0'.repeat(24)}`, { token: freelancer.token, body: { price: 1 } })
  ];
  for (const r of responses) {
    const text = JSON.stringify(r.body);
    assert.doesNotMatch(text, /stack|node_modules|mongodb:\/\/|CastError|ValidationError|at \w+ \(/i);
  }
});
