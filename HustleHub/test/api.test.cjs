const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { User } = require('../src/models/user.cjs');
const { requireRole } = require('../src/middleware/requireRole.cjs');
const { errorHandler } = require('../src/middleware/errorHandler.cjs');
const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
const credentials = { fullName: 'Aisha Khan', email: 'aisha@example.com', password: 'DemoPassphrase!7314', role: 'freelancer' };
let mongo, config, server, port, token, user;

function request(method, route, body, headers = {}, target = port, ca = cert) {
  return new Promise((resolve, reject) => {
    const raw = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request({ hostname: '127.0.0.1', port: target, path: route, method, ca, headers: { ...(raw === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) }), ...headers } }, res => {
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text), headers: res.headers }));
    });
    req.on('error', reject);
    req.end(raw);
  });
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  config = loadConfig({ JWT_SECRET: randomBytes(32).toString('hex'), MONGODB_URI: mongo.getUri() });
  await connectDatabase(config.mongodbUri);
  await User.init();
  server = https.createServer({ key, cert, minVersion: 'TLSv1.2' }, await createApp(config, { User, rateLimitMax: 200 }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await disconnectDatabase();
  await mongo.stop();
});

test('HTTPS certificate is verified; security headers and no caching', async () => {
  const r = await request('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.ok(r.headers['content-security-policy']);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['x-powered-by'], undefined);
  await assert.rejects(request('GET', '/api/health', undefined, {}, port, []));
});
test('registration normalizes email and stores only a salted cost-12 hash', async () => {
  const r = await request('POST', '/api/auth/register', { ...credentials, email: ' AISHA@example.com ' });
  assert.equal(r.status, 201);
  user = r.body.data.user;
  assert.equal(user.email, credentials.email);
  assert.equal(user.role, 'freelancer');
  assert.equal(user.passwordHash, undefined);
  const stored = await User.findOne({ email: credentials.email }).select('+passwordHash');
  assert.equal(stored.password, undefined);
  assert.notEqual(stored.passwordHash, credentials.password);
  assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
  assert.ok(await bcrypt.compare(credentials.password, stored.passwordHash));
  assert.notEqual(await bcrypt.hash(credentials.password, 12), stored.passwordHash);
});
test('duplicate and concurrent duplicate registrations return 409', async () => {
  assert.equal((await request('POST', '/api/auth/register', credentials)).status, 409);
  const body = { ...credentials, email: 'race@example.com' };
  const results = await Promise.all([request('POST', '/api/auth/register', body), request('POST', '/api/auth/register', body)]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
});
test('client registration works and public admin registration is rejected', async () => {
  const client = await request('POST', '/api/auth/register', { ...credentials, email: 'client@example.com', role: 'client' });
  const admin = await request('POST', '/api/auth/register', { ...credentials, email: 'admin@example.com', role: 'admin' });
  assert.equal(client.status, 201);
  assert.equal(client.body.data.user.role, 'client');
  assert.equal(admin.status, 400);
  assert.equal(await User.exists({ email: 'admin@example.com' }), null);
});
test('login produces a signed 15-minute token with identity and role; profile works', async () => {
  const r = await request('POST', '/api/auth/login', { email: credentials.email, password: credentials.password });
  assert.equal(r.status, 200);
  token = r.body.data.token;
  const claims = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
  assert.equal(claims.id, user.id);
  assert.equal(claims.role, 'freelancer');
  assert.equal(claims.exp - claims.iat, 900);
  assert.equal(claims.password, undefined);
  const profile = await request('GET', '/api/auth/me', undefined, { authorization: `Bearer ${token}` });
  assert.equal(profile.status, 200);
  assert.deepEqual(profile.body.data.user, user);
});
test('unknown accounts and wrong passwords have identical safe 401 errors', async () => {
  const a = await request('POST', '/api/auth/login', { email: credentials.email, password: 'WrongPassword!7314' });
  const b = await request('POST', '/api/auth/login', { email: 'unknown@example.com', password: 'WrongPassword!7314' });
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.deepEqual(a.body.error, b.body.error);
});
test('missing, malformed, tampered, expired, wrong-issuer/audience/algorithm tokens fail', async () => {
  const claims = { id: user.id, role: user.role };
  const options = { subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: '15m' };
  const variants = [undefined, 'Bearer nope', `Basic ${token}`, `Bearer ${token.slice(0, -8)}abcdefgh`,
    ...[
      { ...options, expiresIn: -1 }, { ...options, issuer: 'impostor' },
      { ...options, audience: 'other-app' }, { ...options, algorithm: 'HS384' }
    ].map(opts => `Bearer ${jwt.sign(claims, config.secret, opts)}`),
    `Bearer ${jwt.sign(claims, randomBytes(32).toString('hex'), options)}`,
    `Bearer ${jwt.sign({ ...claims, role: 'admin' }, config.secret, options)}`,
    `Bearer ${jwt.sign(claims, config.secret, { subject: user.id, issuer: config.issuer, audience: config.audience })}`
  ];
  for (const authorization of variants) {
    const r = await request('GET', '/api/auth/me', undefined, authorization ? { authorization } : {});
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, 'UNAUTHENTICATED');
    assert.ok(!JSON.stringify(r.body).includes('stack'));
  }
});
test('validation rejects missing, malicious, unknown, wrong-type and oversized fields', async () => {
  const bodies = [{}, [], null, { ...credentials, email: { $ne: null } }, { ...credentials, fullName: '<script>alert(1)</script>' },
    { ...credentials, password: 'short' }, { ...credentials, password: 'a'.repeat(73) }, { ...credentials, password: '😀'.repeat(19) },
    { ...credentials, password: 'abc\u0000defghijklmnop' }, { ...credentials, role: 'admin' }, { ...credentials, isAdmin: true },
    { ...credentials, email: 'bad-address' }, { ...credentials, fullName: 42 }, { ...credentials, password: { $gt: '' } }];
  for (const body of bodies) {
    const r = await request('POST', '/api/auth/register', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.body.success, false);
    assert.ok(r.body.requestId);
  }
});
test('malformed JSON, wrong content type, large body, and unknown routes return controlled errors', async () => {
  assert.equal((await request('POST', '/api/auth/register', '{broken')).body.error.code, 'INVALID_JSON');
  assert.equal((await request('POST', '/api/auth/register', credentials, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await request('POST', '/api/auth/register', { value: 'x'.repeat(11000) })).status, 413);
  assert.equal((await request('GET', '/not-an-endpoint')).status, 404);
});
test('rate limiter returns safe 429 and Retry-After', async () => {
  const limited = https.createServer({ key, cert }, await createApp(config, { User, rateLimitMax: 2 }));
  await new Promise(resolve => limited.listen(0, '127.0.0.1', resolve));
  try {
    const p = limited.address().port;
    await request('POST', '/api/auth/login', {}, {}, p);
    await request('POST', '/api/auth/login', {}, {}, p);
    const r = await request('POST', '/api/auth/login', {}, {}, p);
    assert.equal(r.status, 429); assert.ok(r.headers['retry-after']);
  } finally { await new Promise(resolve => limited.close(resolve)); }
});
test('plain HTTP is refused even if app is mounted on an HTTP listener', async () => {
  const plain = http.createServer(await createApp(config, { User }));
  await new Promise(resolve => plain.listen(0, '127.0.0.1', resolve));
  try {
    const status = await new Promise((resolve, reject) => http.get(`http://127.0.0.1:${plain.address().port}/api/health`, res => { res.resume(); resolve(res.statusCode); }).on('error', reject));
    assert.equal(status, 426);
  } finally { await new Promise(resolve => plain.close(resolve)); }
});
test('unexpected errors hide stack, file paths, and secrets', () => {
  let status, body;
  const res = { status(n) { status = n; return this; }, json(value) { body = value; } };
  errorHandler(new Error('secret C:/private/file.cjs'), { id: 'test-request' }, res, () => {});
  assert.equal(status, 500);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(body).includes('private'));
});
test('insecure JWT configuration fails closed', () => {
  assert.throws(() => loadConfig({ JWT_SECRET: 'password', MONGODB_URI: 'mongodb://127.0.0.1/test' }));
  assert.throws(() => loadConfig({ JWT_SECRET: randomBytes(32).toString('hex') }));
});

test('RBAC distinguishes unauthenticated, forbidden, and allowed roles', () => {
  const run = (allowed, role) => {
    let error;
    let allowedThrough = false;
    requireRole(...allowed)({ user: role ? { role } : undefined }, {}, value => {
      error = value;
      if (!value) allowedThrough = true;
    });
    return { error, allowedThrough };
  };
  assert.equal(run(['client'], undefined).error.status, 401);
  for (const role of ['client', 'freelancer', 'admin']) {
    assert.equal(run([role], role).allowedThrough, true);
    for (const other of ['client', 'freelancer', 'admin'].filter(value => value !== role)) {
      assert.equal(run([role], other).error.status, 403);
    }
  }
  assert.equal(run(['freelancer', 'admin'], 'admin').allowedThrough, true);
});
