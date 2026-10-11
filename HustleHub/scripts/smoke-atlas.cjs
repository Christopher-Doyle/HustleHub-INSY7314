const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { User } = require('../src/models/user.cjs');
const { Gig } = require('../src/models/gig.cjs');
const { Booking } = require('../src/models/booking.cjs');
const { Transaction } = require('../src/models/transaction.cjs');

const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
const created = { users: [], gigs: [], bookings: [], transactions: [] };
let server;
let port;

function assert(condition, message) { if (!condition) throw new Error(message); }
function request(method, route, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const raw = body === undefined ? undefined : JSON.stringify(body);
    const headers = raw === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) };
    if (token) headers.authorization = `Bearer ${token}`;
    const req = https.request({ hostname: '127.0.0.1', port, path: route, method, ca: cert, headers }, response => {
      let text = '';
      response.on('data', chunk => text += chunk);
      response.on('end', () => resolve({ status: response.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    req.end(raw);
  });
}
async function start(config) {
  server = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, await createApp(config, { rateLimitMax: 500, bookingRateLimitMax: 500, gigRateLimitMax: 500 }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
}
async function stop() {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  server = null;
}
async function register(role, label, password) {
  const emailLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const email = `codex-final-${emailLabel}-${randomUUID()}@example.invalid`;
  const response = await request('POST', '/api/auth/register', { body: { fullName: `Final ${label}`, email, password, role } });
  assert(response.status === 201, `${label} registration failed (${response.status}, ${response.body?.error?.code || 'unknown'}: ${(response.body?.error?.details || []).join(' ') || response.body?.error?.message || 'no details'}).`);
  created.users.push(response.body.data.user.id);
  return { email, id: response.body.data.user.id };
}
async function login(account, password) {
  const response = await request('POST', '/api/auth/login', { body: { email: account.email, password } });
  assert(response.status === 200, `Login failed (${response.status}).`);
  return response.body.data.token;
}

async function main() {
  const config = loadConfig();
  assert(config.mongodbUri.startsWith('mongodb+srv://'), 'Smoke test requires the configured Atlas mongodb+srv URI.');
  const password = `Smoke-${randomBytes(20).toString('hex')}!`;
  await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
  await start(config);
  try {
    const freelancer = await register('freelancer', 'Freelancer A', password);
    const otherFreelancer = await register('freelancer', 'Freelancer B', password);
    const client = await register('client', 'Client', password);
    const freelancerToken = await login(freelancer, password);
    const otherToken = await login(otherFreelancer, password);
    const clientToken = await login(client, password);

    const create = await request('POST', '/api/gigs', { token: freelancerToken, body: { title: 'Disposable Atlas smoke Gig', description: 'A temporary Gig used only for final persistence verification.', category: 'Development', price: 321.45 } });
    assert(create.status === 201, `Gig creation failed (${create.status}).`);
    const gig = create.body.data.gig;
    created.gigs.push(gig.id);
    assert(gig.freelancer.id === freelancer.id, 'Gig owner was not derived from the JWT.');
    assert((await request('PATCH', `/api/gigs/${gig.id}`, { token: freelancerToken, body: { price: 345.67 } })).status === 200, 'Gig update failed.');
    assert((await request('PATCH', `/api/gigs/${gig.id}`, { token: otherToken, body: { price: 1 } })).status === 403, 'Cross-owner update was not rejected.');
    assert((await request('DELETE', `/api/gigs/${gig.id}`, { token: otherToken })).status === 403, 'Cross-owner deletion was not rejected.');
    assert((await request('GET', '/api/gigs')).body.data.gigs.some(item => item.id === gig.id), 'Gig missing from marketplace.');
    assert((await request('GET', `/api/gigs/${gig.id}`)).status === 200, 'Gig detail failed.');

    const bookingResponse = await request('POST', '/api/bookings', { token: clientToken, body: { gigId: gig.id } });
    assert(bookingResponse.status === 201, `Booking failed (${bookingResponse.status}).`);
    const { booking, transaction } = bookingResponse.body.data;
    created.bookings.push(booking.id);
    created.transactions.push(transaction.id);
    assert(booking.price === 345.67 && transaction.amount === 345.67, 'Server-derived price or transaction amount is incorrect.');
    assert((await request('GET', '/api/bookings/me', { token: clientToken })).body.data.bookings.some(item => item.id === booking.id), 'Client booking view failed.');
    assert((await request('GET', '/api/bookings/freelancer', { token: freelancerToken })).body.data.bookings.some(item => item.id === booking.id), 'Freelancer booking view failed.');
    assert((await request('GET', '/api/bookings/freelancer', { token: otherToken })).body.data.bookings.length === 0, 'Booking isolation failed.');
    assert((await request('GET', '/api/transactions/me', { token: freelancerToken })).body.data.transactions.some(item => item.id === transaction.id), 'Transaction view failed.');
    assert((await request('GET', '/api/income/me', { token: freelancerToken })).body.data.totalIncome === 345.67, 'Income calculation failed.');

    await stop();
    await disconnectDatabase();
    await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
    await start(config);
    const reloginToken = await login(freelancer, password);
    assert((await request('GET', '/api/auth/me', { token: reloginToken })).body.data.user.id === freelancer.id, 'User did not persist after restart.');
    assert((await request('GET', `/api/gigs/${gig.id}`)).status === 200, 'Gig did not persist after restart.');
    assert(await Booking.exists({ _id: booking.id }), 'Booking did not persist after restart.');
    assert(await Transaction.exists({ _id: transaction.id }), 'Transaction did not persist after restart.');
    console.log('Atlas smoke PASS: full Gig-to-income flow, ownership isolation and restart persistence verified.');
  } finally {
    await stop();
    if (created.transactions.length) await Transaction.deleteMany({ _id: { $in: created.transactions } });
    if (created.bookings.length) await Booking.deleteMany({ _id: { $in: created.bookings } });
    if (created.gigs.length) await Gig.deleteMany({ _id: { $in: created.gigs } });
    if (created.users.length) await User.deleteMany({ _id: { $in: created.users } });
    const remains = await Promise.all([
      Transaction.countDocuments({ _id: { $in: created.transactions } }), Booking.countDocuments({ _id: { $in: created.bookings } }),
      Gig.countDocuments({ _id: { $in: created.gigs } }), User.countDocuments({ _id: { $in: created.users } })
    ]);
    if (remains.some(Boolean)) throw new Error('Disposable Atlas cleanup verification failed.');
    console.log('Atlas smoke cleanup PASS: only tracked disposable records were removed.');
    await disconnectDatabase();
  }
}

main().catch(error => { console.error(`Atlas smoke FAIL: ${error.message}`); process.exitCode = 1; });
