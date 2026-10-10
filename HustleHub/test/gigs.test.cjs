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
