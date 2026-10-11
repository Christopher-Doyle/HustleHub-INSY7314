// Generates a deterministic, foldered Part 2 collection. The companion
// runner supplies isolated HTTPS servers and an in-memory MongoDB database.
const fs = require('node:fs');
const path = require('node:path');

const folders = Object.fromEntries([
  ['01', '01 Authentication'],
  ['02', '02 Gig Marketplace'],
  ['03', '03 Gig Ownership and RBAC'],
  ['04', '04 Bookings'],
  ['05', '05 Transactions and Income'],
  ['06', '06 Security and Error Cases']
].map(([key, name]) => [key, { name, item: [] }]));

function add(folder, name, method, endpoint, status, body, extra = {}) {
  const expectsJson = status !== 204;
  const tests = [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
    ...(expectsJson ? [
      "pm.test('JSON response', () => pm.response.to.be.json);",
      `pm.test('Consistent response', () => pm.expect(pm.response.json().success).to.eql(${status < 400}));`,
      "pm.test('No credential or stack leakage', () => { const text = pm.response.text(); pm.expect(text).not.to.match(/passwordHash|mongodb\\+srv|BEGIN PRIVATE KEY|\\\"stack\\\"/i); });"
    ] : []),
    ...(extra.tests || [])
  ];
  const request = {
    method,
    header: body === undefined ? [] : [{ key: 'Content-Type', value: extra.contentType || 'application/json' }],
    url: `{{${extra.baseUrlVar || 'baseUrl'}}}${endpoint}`,
    description: extra.description || `Expected status: ${status}.`,
    auth: extra.token ? { type: 'bearer', bearer: [{ key: 'token', value: extra.token, type: 'string' }] } : { type: 'noauth' }
  };
  if (body !== undefined) request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  folders[folder].item.push({
    name,
    request,
    event: [
      ...(extra.pre ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: extra.pre } }] : []),
      { listen: 'test', script: { type: 'text/javascript', exec: tests } }
    ]
  });
}

const password = '{{testPassword}}';
const gig = { title: 'Secure API integration', description: 'I will build and test a secure API integration for your project.', category: 'Development', price: 450 };

// 01 Authentication
add('01', 'HTTPS health check', 'GET', '/api/health', 200, undefined, { pre: [
  "pm.collectionVariables.set('testPassword', pm.variables.replaceIn('{{$guid}}'));",
  "pm.collectionVariables.set('freelancerEmail', 'freelancer.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');",
  "pm.collectionVariables.set('clientEmail', 'client.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');",
  "pm.collectionVariables.set('otherFreelancerEmail', 'other.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');"
], tests: ["pm.test('HTTPS target', () => pm.expect(pm.variables.replaceIn(pm.request.url.toString())).to.match(/^https:/));"] });
add('01', 'Register freelancer', 'POST', '/api/auth/register', 201, { fullName: 'Aisha Freelancer', email: '{{freelancerEmail}}', password, role: 'freelancer' }, { tests: ["pm.collectionVariables.set('freelancerId', pm.response.json().data.user.id);"] });
add('01', 'Duplicate registration rejected', 'POST', '/api/auth/register', 409, { fullName: 'Aisha Freelancer', email: '{{freelancerEmail}}', password, role: 'freelancer' });
add('01', 'Invalid registration rejected', 'POST', '/api/auth/register', 400, { fullName: '<script>alert(1)</script>', email: 'invalid', password: 'short', role: 'admin' });
add('01', 'Public admin registration rejected', 'POST', '/api/auth/register', 400, { fullName: 'Public Admin', email: 'admin.{{$guid}}@example.com', password, role: 'admin' });
add('01', 'Login freelancer', 'POST', '/api/auth/login', 200, { email: '{{freelancerEmail}}', password }, { tests: ["pm.collectionVariables.set('freelancerToken', pm.response.json().data.token);"] });
add('01', 'Invalid login rejected', 'POST', '/api/auth/login', 401, { email: '{{freelancerEmail}}', password: '{{$guid}}' });
add('01', 'Profile with JWT', 'GET', '/api/auth/me', 200, undefined, { token: '{{freelancerToken}}', tests: ["pm.test('Correct profile', () => pm.expect(pm.response.json().data.user.id).to.eql(pm.collectionVariables.get('freelancerId')));"] });
add('01', 'Profile without token rejected', 'GET', '/api/auth/me', 401);
add('01', 'Malformed token rejected', 'GET', '/api/auth/me', 401, undefined, { token: 'not.a.valid-token' });

// 02 Gig Marketplace
add('02', 'Freelancer creates gig', 'POST', '/api/gigs', 201, gig, { token: '{{freelancerToken}}', tests: [
  "pm.test('JWT owner used', () => pm.expect(pm.response.json().data.gig.freelancer.id).to.eql(pm.collectionVariables.get('freelancerId')));",
  "pm.collectionVariables.set('gigId', pm.response.json().data.gig.id);",
  "pm.collectionVariables.set('gigPrice', String(pm.response.json().data.gig.price));"
] });
add('02', 'Public browse', 'GET', '/api/gigs', 200, undefined, { tests: ["pm.test('Gig appears in marketplace', () => pm.expect(pm.response.json().data.gigs.map(g => g.id)).to.include(pm.collectionVariables.get('gigId')));"] });
add('02', 'Public detail', 'GET', '/api/gigs/{{gigId}}', 200, undefined, { tests: ["pm.test('Correct detail', () => pm.expect(pm.response.json().data.gig.id).to.eql(pm.collectionVariables.get('gigId')));"] });
add('02', 'List own gigs', 'GET', '/api/gigs/mine', 200, undefined, { token: '{{freelancerToken}}', tests: ["pm.test('Only authenticated owner gigs', () => pm.response.json().data.gigs.forEach(g => pm.expect(g.freelancer.id).to.eql(pm.collectionVariables.get('freelancerId'))));"] });
add('02', 'Edit own gig', 'PATCH', '/api/gigs/{{gigId}}', 200, { title: 'Secure API and web integration', price: 475 }, { token: '{{freelancerToken}}', tests: ["pm.test('Edit persisted', () => pm.expect(pm.response.json().data.gig.price).to.eql(475));", "pm.collectionVariables.set('gigPrice', '475');"] });
add('02', 'Create disposable delete target', 'POST', '/api/gigs', 201, { ...gig, title: 'Delete target' }, { token: '{{freelancerToken}}', tests: ["pm.collectionVariables.set('deleteGigId', pm.response.json().data.gig.id);"] });
add('02', 'Delete own gig', 'DELETE', '/api/gigs/{{deleteGigId}}', 204, undefined, { token: '{{freelancerToken}}' });
add('02', 'Deleted gig returns 404', 'GET', '/api/gigs/{{deleteGigId}}', 404);
add('02', 'Negative price rejected', 'POST', '/api/gigs', 400, { ...gig, price: -1 }, { token: '{{freelancerToken}}' });
add('02', 'Script markup rejected', 'POST', '/api/gigs', 400, { ...gig, title: '<script>alert(1)</script>' }, { token: '{{freelancerToken}}' });
add('02', 'Operator object rejected', 'POST', '/api/gigs', 400, { ...gig, category: { $ne: null } }, { token: '{{freelancerToken}}' });
add('02', 'Malformed Gig id rejected', 'GET', '/api/gigs/not-an-id', 400);

// 03 Gig Ownership and RBAC
add('03', 'Register client', 'POST', '/api/auth/register', 201, { fullName: 'Casey Client', email: '{{clientEmail}}', password, role: 'client' });
add('03', 'Login client', 'POST', '/api/auth/login', 200, { email: '{{clientEmail}}', password }, { tests: ["pm.collectionVariables.set('clientToken', pm.response.json().data.token);"] });
add('03', 'Register second freelancer', 'POST', '/api/auth/register', 201, { fullName: 'Bongani Freelancer', email: '{{otherFreelancerEmail}}', password, role: 'freelancer' });
add('03', 'Login second freelancer', 'POST', '/api/auth/login', 200, { email: '{{otherFreelancerEmail}}', password }, { tests: ["pm.collectionVariables.set('otherFreelancerToken', pm.response.json().data.token);"] });
add('03', 'Client cannot create gig', 'POST', '/api/gigs', 403, gig, { token: '{{clientToken}}' });
add('03', 'Non-owner cannot edit gig', 'PATCH', '/api/gigs/{{gigId}}', 403, { title: 'Hijacked title' }, { token: '{{otherFreelancerToken}}' });
add('03', 'Non-owner cannot delete gig', 'DELETE', '/api/gigs/{{gigId}}', 403, undefined, { token: '{{otherFreelancerToken}}' });
add('03', 'Ownership override rejected', 'PATCH', '/api/gigs/{{gigId}}', 400, { freelancerId: '507f1f77bcf86cd799439011' }, { token: '{{freelancerToken}}' });
add('03', 'Login isolated admin', 'POST', '/api/auth/login', 200, { email: '{{adminEmail}}', password: '{{adminPassword}}' }, { tests: ["pm.collectionVariables.set('adminToken', pm.response.json().data.token);"] });
add('03', 'Admin overview succeeds', 'GET', '/api/admin/overview', 200, undefined, { token: '{{adminToken}}', tests: ["pm.test('Safe aggregate counts', () => pm.expect(pm.response.json().data).to.have.all.keys('users','clients','freelancers','admins','gigs','bookings','transactions'));"] });
add('03', 'Client cannot access admin overview', 'GET', '/api/admin/overview', 403, undefined, { token: '{{clientToken}}' });
add('03', 'Freelancer cannot access admin overview', 'GET', '/api/admin/overview', 403, undefined, { token: '{{freelancerToken}}' });

// 04 Bookings
add('04', 'Client books gig', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, { token: '{{clientToken}}', tests: [
  "pm.test('Price derived server-side', () => pm.expect(pm.response.json().data.booking.price).to.eql(Number(pm.collectionVariables.get('gigPrice'))));",
  "pm.test('Owner derived server-side', () => pm.expect(pm.response.json().data.booking.freelancerId).to.eql(pm.collectionVariables.get('freelancerId')));",
  "pm.test('Transaction automatically created', () => pm.expect(pm.response.json().data.transaction.amount).to.eql(Number(pm.collectionVariables.get('gigPrice'))));",
  "pm.collectionVariables.set('bookingId', pm.response.json().data.booking.id);"
] });
add('04', 'Forged price and freelancer rejected', 'POST', '/api/bookings', 400, { gigId: '{{gigId}}', price: 1, freelancerId: '507f1f77bcf86cd799439011' }, { token: '{{clientToken}}' });
add('04', 'Freelancer cannot book', 'POST', '/api/bookings', 403, { gigId: '{{gigId}}' }, { token: '{{freelancerToken}}' });
add('04', 'Invalid Gig rejected', 'POST', '/api/bookings', 400, { gigId: 'not-an-id' }, { token: '{{clientToken}}' });
add('04', 'Client lists own bookings', 'GET', '/api/bookings/me', 200, undefined, { token: '{{clientToken}}', tests: ["pm.test('Own booking visible', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"] });
add('04', 'Owner lists relevant bookings', 'GET', '/api/bookings/freelancer', 200, undefined, { token: '{{freelancerToken}}', tests: ["pm.test('Related booking visible', () => pm.expect(pm.response.json().data.bookings.map(b => b.id)).to.include(pm.collectionVariables.get('bookingId')));"] });
add('04', 'Unrelated freelancer booking isolation', 'GET', '/api/bookings/freelancer', 200, undefined, { token: '{{otherFreelancerToken}}', tests: ["pm.test('No unrelated bookings', () => pm.expect(pm.response.json().data.bookings).to.eql([]));"] });

// 05 Transactions and Income
add('05', 'Owner sees linked transaction', 'GET', '/api/transactions/me', 200, undefined, { token: '{{freelancerToken}}', tests: ["pm.test('Correct linked transaction', () => { const t = pm.response.json().data.transactions.find(x => x.bookingId === pm.collectionVariables.get('bookingId')); pm.expect(t.amount).to.eql(Number(pm.collectionVariables.get('gigPrice'))); });"] });
add('05', 'Unrelated freelancer transaction isolation', 'GET', '/api/transactions/me', 200, undefined, { token: '{{otherFreelancerToken}}', tests: ["pm.test('No unrelated transactions', () => pm.expect(pm.response.json().data.transactions).to.eql([]));"] });
add('05', 'Owner income total', 'GET', '/api/income/me', 200, undefined, { token: '{{freelancerToken}}', tests: ["pm.test('Correct income', () => pm.expect(pm.response.json().data.totalIncome).to.eql(Number(pm.collectionVariables.get('gigPrice'))));"] });
add('05', 'Unrelated freelancer has zero income', 'GET', '/api/income/me', 200, undefined, { token: '{{otherFreelancerToken}}', tests: ["pm.test('Zero unrelated income', () => pm.expect(pm.response.json().data.totalIncome).to.eql(0));"] });
add('05', 'Client cannot access income', 'GET', '/api/income/me', 403, undefined, { token: '{{clientToken}}' });

// 06 Security and Error Cases
add('06', 'Malformed JSON controlled error', 'POST', '/api/bookings', 400, '{"gigId":', { token: '{{clientToken}}', tests: ["pm.test('Controlled parser error', () => pm.expect(pm.response.json().error.code).to.eql('INVALID_JSON'));"] });
add('06', 'Wrong content type rejected', 'POST', '/api/bookings', 415, 'gigId=123', { token: '{{clientToken}}', contentType: 'text/plain' });
add('06', 'Unknown endpoint returns 404', 'GET', '/api/does-not-exist', 404);
add('06', 'Rate limit request one', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, { token: '{{clientToken}}', baseUrlVar: 'rateLimitBaseUrl' });
add('06', 'Rate limit request two', 'POST', '/api/bookings', 201, { gigId: '{{gigId}}' }, { token: '{{clientToken}}', baseUrlVar: 'rateLimitBaseUrl' });
add('06', 'Rate limit request three blocked', 'POST', '/api/bookings', 429, { gigId: '{{gigId}}' }, { token: '{{clientToken}}', baseUrlVar: 'rateLimitBaseUrl', tests: ["pm.test('Retry-After present', () => pm.expect(pm.response.headers.has('Retry-After')).to.be.true);", "pm.test('Safe limiter code', () => pm.expect(pm.response.json().error.code).to.eql('RATE_LIMITED'));"] });

const collection = {
  info: {
    name: 'HustleHub+ | Part 2 Full Regression',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Run with npm run test:postman. The automated runner uses HTTPS and mongodb-memory-server, then destroys all disposable data in a guaranteed finalization path.'
  },
  variable: [
    { key: 'baseUrl', value: 'https://localhost:4000' },
    { key: 'rateLimitBaseUrl', value: 'https://localhost:4001' },
    { key: 'testPassword', value: '' },
    { key: 'freelancerEmail', value: '' }, { key: 'freelancerId', value: '' }, { key: 'freelancerToken', value: '' },
    { key: 'clientEmail', value: '' }, { key: 'clientToken', value: '' },
    { key: 'otherFreelancerEmail', value: '' }, { key: 'otherFreelancerToken', value: '' },
    { key: 'adminEmail', value: '' }, { key: 'adminPassword', value: '' }, { key: 'adminToken', value: '' },
    { key: 'gigId', value: '' }, { key: 'deleteGigId', value: '' }, { key: 'gigPrice', value: '' }, { key: 'bookingId', value: '' }
  ],
  item: Object.values(folders)
};

fs.mkdirSync(path.join(__dirname, '../postman'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../postman/HustleHub-Part2.postman_collection.json'), `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Generated ${Object.values(folders).reduce((total, folder) => total + folder.item.length, 0)} requests across ${Object.keys(folders).length} folders.`);
