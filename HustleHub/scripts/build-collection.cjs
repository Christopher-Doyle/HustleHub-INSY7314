const fs = require('node:fs');
const path = require('node:path');
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
  const request = { method, header: body === undefined ? [] : [{ key: 'Content-Type', value: extra.contentType || 'application/json' }], url: `{{baseUrl}}${endpoint}`, description: `Expected status: ${status}. ${extra.description || ''}` };
  request.auth = extra.token ? { type: 'bearer', bearer: [{ key: 'token', value: extra.token, type: 'string' }] } : { type: 'noauth' };
  if (body !== undefined) request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  items.push({ name, request, event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }, ...(extra.pre ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: extra.pre } }] : [])] });
}
add('01 - HTTPS health check', 'GET', '/api/health', 200, undefined, { pre: ["pm.collectionVariables.set('testEmail', 'aisha.' + pm.variables.replaceIn('{{$guid}}') + '@example.com');", "pm.collectionVariables.unset('accessToken');"], tests: ["pm.test('HTTPS URL', () => pm.expect(pm.variables.replaceIn(pm.request.url.toString())).to.match(/^https:/));"] });
add('02 - Register freelancer', 'POST', '/api/auth/register', 201, good, { tests: ["pm.test('Freelancer created', () => pm.expect(pm.response.json().data.user.role).to.eql('freelancer'));", "pm.collectionVariables.set('userId', pm.response.json().data.user.id);"] });
add('03 - Duplicate email', 'POST', '/api/auth/register', 409, good);
add('04 - Login and save JWT automatically', 'POST', '/api/auth/login', 200, { email: '{{testEmail}}', password: '{{testPassword}}' }, { tests: ["pm.test('JWT returned', () => pm.expect(pm.response.json().data.token.split('.')).to.have.lengthOf(3));", "pm.collectionVariables.set('accessToken', pm.response.json().data.token);", "pm.test('15 minute lifetime', () => pm.expect(pm.response.json().data.expiresIn).to.eql(900));"] });
add('05 - Protected profile with saved token', 'GET', '/api/auth/me', 200, undefined, { token: '{{accessToken}}', tests: ["pm.test('Correct user', () => pm.expect(pm.response.json().data.user.id).to.eql(pm.collectionVariables.get('userId')));"] });
add('06 - Protected profile without token', 'GET', '/api/auth/me', 401);
add('07 - Invalid token', 'GET', '/api/auth/me', 401, undefined, { token: 'not.a.valid-token' });
add('08 - Wrong password', 'POST', '/api/auth/login', 401, { email: '{{testEmail}}', password: 'WrongPassword!7314' });
add('09 - Unknown account', 'POST', '/api/auth/login', 401, { email: 'missing.{{testEmail}}', password: '{{testPassword}}' });
add('10 - Missing fields', 'POST', '/api/auth/register', 400, {});
add('11 - Invalid email', 'POST', '/api/auth/register', 400, { ...good, email: 'invalid-email' });
add('12 - Short password', 'POST', '/api/auth/register', 400, { ...good, password: 'short' });
add('13 - Injection object rejected', 'POST', '/api/auth/login', 400, { email: { $ne: null }, password: '{{testPassword}}' });
add('14 - Script markup rejected', 'POST', '/api/auth/register', 400, { ...good, fullName: '<script>alert(1)</script>' });
add('15 - Admin self-registration rejected', 'POST', '/api/auth/register', 400, { ...good, role: 'admin' });
add('16 - Unknown fields rejected', 'POST', '/api/auth/register', 400, { ...good, isAdmin: true });
add('17 - Malformed JSON', 'POST', '/api/auth/register', 400, '{"email":');
add('18 - Wrong content type', 'POST', '/api/auth/login', 415, 'email=aisha@example.com', { contentType: 'text/plain' });
add('19 - Password over bcrypt byte limit', 'POST', '/api/auth/register', 400, { ...good, password: 'a'.repeat(73) });
add('20 - Oversized request', 'POST', '/api/auth/register', 413, { ...good, fullName: 'a'.repeat(11000) });
add('21 - Unknown route', 'GET', '/api/does-not-exist', 404);
add('22 - Register default client', 'POST', '/api/auth/register', 201, { fullName: 'Chris Doyle', email: 'client.{{testEmail}}', password: '{{testPassword}}' }, { tests: ["pm.test('Default client role', () => pm.expect(pm.response.json().data.user.role).to.eql('client'));"] });
const collection = {
  info: { name: 'HustleHub+ | Part 1 Secure Foundations', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Run in order. Request 01 generates a unique test email for every run. Request 04 saves the JWT; request 05 uses it. Trust certs/localhost.pem in Postman before running. All credentials are disposable test data. Backend uses MongoDB persistence. Repeated runs within 15 minutes can trigger the 30-attempt rate limit; wait before retrying.' },
  variable: [{ key: 'baseUrl', value: 'https://localhost:4000' }, { key: 'testEmail', value: '' }, { key: 'testPassword', value: 'DemoPassphrase!7314' }, { key: 'accessToken', value: '' }], item: items
};
fs.mkdirSync(path.join(__dirname, '../postman'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../postman/HustleHub-Part1.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
console.log(`Generated ${items.length} Postman requests.`);
