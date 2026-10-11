// Generates postman/HustleHub-Part2.postman_collection.json.
//
// Extends Person 1's Part 1 generator pattern (requests are built in code,
// not hand-edited JSON, so the collection stays consistent and easy to
// diff/review). Adds the Part 2 folders Person 3 owns: Bookings,
// Transactions & Income, RBAC & Security, and a deterministic booking
// rate-limit demonstration. The "02 Gigs" folder is Person 2 (Daniel)'s
// endpoints — included as a thin, clearly-marked smoke section against the
// locked API contract so the collection structure matches the brief; those
// requests are expected to fail with 404 until his gig routes are merged.
const fs = require('node:fs');
const path = require('node:path');
const { SEED_FREELANCER_EMAIL, SEED_FREELANCER_PASSWORD } = require('./seed-dev-gigs.cjs');

const items = [];
const good = { fullName: 'Aisha Khan', email: '{{testEmail}}', password: '{{testPassword}}', role: 'freelancer' };

function add(name, method, endpoint, status, body, extra = {}) {
  const tests = [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
    "pm.test('JSON response', () => pm.response.to.be.json);",
    `pm.test('Consistent response', () => pm.expect(pm.response.json().success).to.eql(${status < 400}));`,
    "pm.test('No credentials leaked', () => { const json = pm.response.json(); const user = json.data && json.data.user; if (user) { pm.expect(user).not.to.have.property('password'); pm.expect(user).not.to.have.property('passwordHash'); } pm.expect(json).not.to.have.property('stack'); });",
    ...(extra.tests || [])
  ];
  const request = { method, header: body === undefined ? [] : [{ key: 'Content-Type', value: extra.contentType || 'application/json' }], url: `{{${extra.baseUrlVar || 'baseUrl'}}}${endpoint}`, description: `Expected status: ${status}. ${extra.description || ''}` };
  request.auth = extra.token ? { type: 'bearer', bearer: [{ key: 'token', value: extra.token, type: 'string' }] } : { type: 'noauth' };
  if (body !== undefined) request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  items.push({ name, request, event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }, ...(extra.pre ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: extra.pre } }] : [])] });
}

// ---------------------------------------------------------------------------
// 01 Authentication — register/login/me + failures (Person 1's contract,
// regenerated here so the whole Part 2 flow lives in one collection file).
// ---------------------------------------------------------------------------
add('01 - HTTPS health check', 'GET', '/api/health', 200, undefined, { pre: ["pm.collectionVariables.set('testEmail', 'aisha.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');", "pm.collectionVariables.unset('accessToken');"], tests: ["pm.test('HTTPS URL', () => pm.expect(pm.variables.replaceIn(pm.request.url.toString())).to.match(/^https:/));"] });
add('01 - Register freelancer', 'POST', '/api/auth/register', 201, good, { tests: ["pm.test('Freelancer created', () => pm.expect(pm.response.json().data.user.role).to.eql('freelancer'));", "pm.collectionVariables.set('userId', pm.response.json().data.user.id);"] });
add('01 - Duplicate email', 'POST', '/api/auth/register', 409, good);
add('01 - Login and save JWT automatically', 'POST', '/api/auth/login', 200, { email: '{{testEmail}}', password: '{{testPassword}}' }, { tests: ["pm.test('JWT returned', () => pm.expect(pm.response.json().data.token.split('.')).to.have.lengthOf(3));", "pm.collectionVariables.set('accessToken', pm.response.json().data.token);", "pm.test('15 minute lifetime', () => pm.expect(pm.response.json().data.expiresIn).to.eql(900));"] });
add('01 - Protected profile with saved token', 'GET', '/api/auth/me', 200, undefined, { token: '{{accessToken}}', tests: ["pm.test('Correct user', () => pm.expect(pm.response.json().data.user.id).to.eql(pm.collectionVariables.get('userId')));"] });
add('01 - Protected profile without token', 'GET', '/api/auth/me', 401);
add('01 - Invalid token', 'GET', '/api/auth/me', 401, undefined, { token: 'not.a.valid-token' });
add('01 - Wrong password', 'POST', '/api/auth/login', 401, { email: '{{testEmail}}', password: 'WrongPassword!7314' });
add('01 - Unknown account', 'POST', '/api/auth/login', 401, { email: 'missing.{{testEmail}}', password: '{{testPassword}}' });
add('01 - Missing fields', 'POST', '/api/auth/register', 400, {});
add('01 - Invalid email', 'POST', '/api/auth/register', 400, { ...good, email: 'invalid-email' });
add('01 - Short password', 'POST', '/api/auth/register', 400, { ...good, password: 'short' });
add('01 - Injection object rejected', 'POST', '/api/auth/login', 400, { email: { $ne: null }, password: '{{testPassword}}' });
add('01 - Script markup rejected', 'POST', '/api/auth/register', 400, { ...good, fullName: '<script>alert(1)</script>' });
add('01 - Admin self-registration rejected', 'POST', '/api/auth/register', 400, { ...good, role: 'admin' });
add('01 - Unknown fields rejected', 'POST', '/api/auth/register', 400, { ...good, isAdmin: true });
add('01 - Malformed JSON', 'POST', '/api/auth/register', 400, '{"email":');
add('01 - Wrong content type', 'POST', '/api/auth/login', 415, 'email=aisha@example.com', { contentType: 'text/plain' });
add('01 - Unknown route', 'GET', '/api/does-not-exist', 404);

// ---------------------------------------------------------------------------
// 02 Gigs — Person 2 (Daniel)'s endpoints. Thin smoke coverage against the
// locked API contract only; EXPAND this folder once his gigRoutes.cjs is
// merged — these currently return 404 because the routes do not exist yet.
// gigId/gigPrice are seeded directly into MongoDB by run-postman.cjs
// (scripts/seed-dev-gigs.cjs) so Bookings below do not depend on this folder.
// ---------------------------------------------------------------------------
add('02 - Browse gigs (pending Person 2)', 'GET', '/api/gigs', 200, undefined, { description: 'Owner: Daniel. Expected to fail with 404 until gigRoutes.cjs is merged.' });
add('02 - View seeded gig detail (pending Person 2)', 'GET', '/api/gigs/{{gigId}}', 200, undefined, { description: 'Owner: Daniel. Will return the gig seeded by scripts/seed-dev-gigs.cjs once GET /api/gigs/:id exists.' });

// ---------------------------------------------------------------------------
// 03 Bookings — create/list + invalid/role/rate-limit cases (Person 3).
// ---------------------------------------------------------------------------
add('03 - Register booking client', 'POST', '/api/auth/register', 201, { fullName: 'Client Tester', email: '{{bookingClientEmail}}', password: '{{testPassword}}', role: 'client' }, {
  pre: ["pm.collectionVariables.set('bookingClientEmail', 'booking.client.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');", "pm.collectionVariables.set('bookingFreelancer2Email', 'booking.freelancer2.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');"]
});
add('03 - Login booking client', 'POST', '/api/auth/login', 200, { email: '{{bookingClientEmail}}', password: '{{testPassword}}' }, { tests: ["pm.collectionVariables.set('bookingClientToken', pm.response.json().data.token);"] });
add('03 - Register second freelancer (not the gig owner)', 'POST', '/api/auth/register', 201, { fullName: 'Other Freelancer', email: '{{bookingFreelancer2Email}}', password: '{{testPassword}}', role: 'freelancer' });
add('03 - Login second freelancer', 'POST', '/api/auth/login', 200, { email: '{{bookingFreelancer2Email}}', password: '{{testPassword}}' }, { tests: ["pm.collectionVariables.set('bookingFreelancer2Token', pm.response.json().data.token);"] });
add('03 - Login seed freelancer (owns the seeded gig)', 'POST', '/api/auth/login', 200, { email: '{{seedFreelancerEmail}}', password: '{{seedFreelancerPassword}}' }, { tests: ["pm.collectionVariables.set('seedFreelancerToken', pm.response.json().data.token);", "pm.collectionVariables.set('seedFreelancerId', pm.response.json().data.user.id);"] });

add('03 - Client books the seeded gig', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, {
  token: '{{bookingClientToken}}',
  tests: [
    "pm.test('Price copied from the server-side gig', () => pm.expect(pm.response.json().data.booking.price).to.eql(Number(pm.collectionVariables.get('gigPrice'))));",
    "pm.test('Freelancer copied from the server-side gig', () => pm.expect(pm.response.json().data.booking.freelancerId).to.eql(pm.collectionVariables.get('seedFreelancerId')));",
    "pm.test('Booking confirmed (simulated)', () => pm.expect(pm.response.json().data.booking.status).to.eql('confirmed'));",
    "pm.test('Transaction created automatically', () => pm.expect(pm.response.json().data.transaction.amount).to.eql(Number(pm.collectionVariables.get('gigPrice'))));",
    "pm.collectionVariables.set('bookingId', pm.response.json().data.booking.id);"
  ]
});
add('03 - Forged price/freelancer are ignored, not accepted', 'POST', '/api/bookings', 400, { gigId: '{{gigId}}', price: 1, freelancerId: '000000000000000000000000' }, { token: '{{bookingClientToken}}', description: 'Only gigId is allowlisted; a client cannot submit its own price or freelancer.' });
add('03 - Malformed gig id rejected', 'POST', '/api/bookings', 400, { gigId: 'not-an-id' }, { token: '{{bookingClientToken}}' });
add('03 - Non-existent gig rejected safely', 'POST', '/api/bookings', 404, { gigId: '507f1f77bcf86cd799439011' }, { token: '{{bookingClientToken}}' });
add('03 - Operator-style gig id rejected', 'POST', '/api/bookings', 400, { gigId: { $ne: null } }, { token: '{{bookingClientToken}}' });
add('03 - Freelancer cannot book a gig', 'POST', '/api/bookings', 403, { gigId: '{{gigId}}' }, { token: '{{bookingFreelancer2Token}}', description: 'Role-restricted server-side, not just hidden in the UI.' });
add('03 - Booking without a token is rejected', 'POST', '/api/bookings', 401, { gigId: '{{gigId}}' });
add('03 - Client sees their own booking', 'GET', '/api/bookings/me', 200, undefined, { token: '{{bookingClientToken}}', tests: ["pm.test('Contains the booking just created', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"] });
add('03 - Client cannot use the freelancer booking view', 'GET', '/api/bookings/freelancer', 403, undefined, { token: '{{bookingClientToken}}' });
add('03 - Gig-owning freelancer sees the booking', 'GET', '/api/bookings/freelancer', 200, undefined, { token: '{{seedFreelancerToken}}', tests: ["pm.test('Contains the booking', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"] });
add('03 - A different freelancer sees no bookings for a gig they do not own', 'GET', '/api/bookings/freelancer', 200, undefined, { token: '{{bookingFreelancer2Token}}', tests: ["pm.test('Isolated from other freelancers\\' bookings', () => pm.expect(pm.response.json().data.bookings).to.eql([]));"] });

// ---------------------------------------------------------------------------
// 04 Transactions & Income — automatic records + freelancer totals (Person 3).
// ---------------------------------------------------------------------------
add('04 - Freelancer sees the transaction for the booking', 'GET', '/api/transactions/me', 200, undefined, { token: '{{seedFreelancerToken}}', tests: ["pm.test('Contains the linked transaction', () => pm.expect(pm.response.json().data.transactions.map(t => t.bookingId)).to.include(pm.collectionVariables.get('bookingId')));"] });
add('04 - A different freelancer sees no transactions', 'GET', '/api/transactions/me', 200, undefined, { token: '{{bookingFreelancer2Token}}', tests: ["pm.test('No transactions for an unrelated freelancer', () => pm.expect(pm.response.json().data.transactions).to.eql([]));"] });
add('04 - Freelancer income summary includes this booking', 'GET', '/api/income/me', 200, undefined, { token: '{{seedFreelancerToken}}', tests: ["pm.test('Income is at least the booked gig price', () => pm.expect(pm.response.json().data.totalIncome).to.be.at.least(Number(pm.collectionVariables.get('gigPrice'))));"] });
add('04 - Client cannot read freelancer income', 'GET', '/api/income/me', 403, undefined, { token: '{{bookingClientToken}}' });
add('04 - Income requires authentication', 'GET', '/api/income/me', 401);

// ---------------------------------------------------------------------------
// 05 RBAC & Security — missing token, wrong role, malicious input, safe errors.
// ---------------------------------------------------------------------------
add('05 - Freelancer-only view requires authentication', 'GET', '/api/bookings/freelancer', 401);
add('05 - Malicious JSON body on bookings handled safely', 'POST', '/api/bookings', 400, '{"gigId":', { token: '{{bookingClientToken}}', tests: ["pm.test('Controlled JSON error', () => pm.expect(pm.response.json().error.code).to.eql('INVALID_JSON'));"] });
add('05 - Wrong content type on bookings rejected', 'POST', '/api/bookings', 415, 'gigId=123', { token: '{{bookingClientToken}}', contentType: 'text/plain' });
add('05 - Errors never leak stack traces or secrets', 'GET', '/api/does-not-exist', 404, undefined, { tests: ["pm.test('No stack/secret leakage', () => { const text = pm.response.text(); pm.expect(text).not.to.match(/at [A-Za-z]+\\.[A-Za-z]+ \\(/); pm.expect(text.toLowerCase()).not.to.include('mongodb+srv'); });"] });

// ---------------------------------------------------------------------------
// 06 Rate limiting demonstration — runs against an isolated server
// (rateLimitBaseUrl) with a deliberately tiny bookingRateLimitMax (see
// run-postman.cjs), so exactly the Nth request below trips the limiter
// regardless of how many bookings happened earlier in this run.
// ---------------------------------------------------------------------------
add('06 - Booking rate limit: request 1 (allowed)', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, { token: '{{bookingClientToken}}', baseUrlVar: 'rateLimitBaseUrl' });
add('06 - Booking rate limit: request 2 (allowed)', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, { token: '{{bookingClientToken}}', baseUrlVar: 'rateLimitBaseUrl' });
add('06 - Booking rate limit: request 3 (429 with Retry-After)', 'POST', '/api/bookings', 429, { gigId: '{{gigId}}' }, {
  token: '{{bookingClientToken}}', baseUrlVar: 'rateLimitBaseUrl',
  tests: ["pm.test('Meaningful 429 body', () => pm.expect(pm.response.json().error.code).to.eql('RATE_LIMITED'));", "pm.test('Retry-After header present', () => pm.expect(pm.response.headers.has('Retry-After')).to.be.true);"]
});

const collection = {
  info: {
    name: 'HustleHub+ | Part 2 Secure Stack',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Run top-to-bottom in one go via Newman (npm run test:postman), which seeds a demo gig and starts two isolated HTTPS servers automatically — no manual copy/paste of ids or tokens required. Folder 01 regenerates Part 1\'s auth coverage. Folder 02 (Gigs) is Daniel\'s and is expected to fail with 404 until his gig routes are merged — everything from folder 03 onward only depends on Person 1\'s models/auth and Person 3\'s own code, so it should pass today. Folders 03-05 are Person 3\'s bookings/transactions/income/RBAC coverage. Folder 06 proves the booking rate limiter against a second, isolated server so earlier booking traffic in this run can never change the outcome. Trust certs/localhost.pem in Postman before running manually. All credentials are disposable test data.'
  },
  variable: [
    { key: 'baseUrl', value: 'https://localhost:4000' },
    { key: 'rateLimitBaseUrl', value: 'https://localhost:4001' },
    { key: 'testEmail', value: '' },
    { key: 'testPassword', value: 'DemoPassphrase!7314' },
    { key: 'accessToken', value: '' },
    { key: 'userId', value: '' },
    { key: 'gigId', value: '', description: 'Printed by `npm run seed:dev`, or set automatically by run-postman.cjs.' },
    { key: 'gigPrice', value: '450' },
    { key: 'seedFreelancerEmail', value: SEED_FREELANCER_EMAIL },
    { key: 'seedFreelancerPassword', value: SEED_FREELANCER_PASSWORD },
    { key: 'seedFreelancerId', value: '' },
    { key: 'seedFreelancerToken', value: '' },
    { key: 'bookingClientEmail', value: '' },
    { key: 'bookingClientToken', value: '' },
    { key: 'bookingFreelancer2Email', value: '' },
    { key: 'bookingFreelancer2Token', value: '' },
    { key: 'bookingId', value: '' }
  ],
  item: items
};

fs.mkdirSync(path.join(__dirname, '../postman'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../postman/HustleHub-Part2.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
console.log(`Generated ${items.length} Postman requests across 6 folders -> postman/HustleHub-Part2.postman_collection.json`);
