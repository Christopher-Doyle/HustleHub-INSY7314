const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { clean, createHttpTransport, log, setRemoteTransportForTest } = require('../src/utils/logger.cjs');

afterEach(() => setRemoteTransportForTest(null));

test('log redaction removes nested credentials without changing safe correlation data', () => {
  const result = clean({ requestId: 'req-123', password: 'nope', nested: { authorization: 'Bearer raw', email: 'person@example.test' } });
  assert.equal(result.requestId, 'req-123');
  assert.equal(result.password, '[REDACTED]');
  assert.equal(result.nested.authorization, '[REDACTED]');
  assert.equal(result.nested.email, '[REDACTED]');
});

test('HTTPS cloud exporter sends structured JSON with bearer authentication', async () => {
  let captured;
  const transport = createHttpTransport({ url: 'https://logs.example.test/ingest', token: 'cloud-secret', fetchImpl: async (url, options) => {
    captured = { url: String(url), options };
    return { ok: true, status: 202 };
  } });
  await transport({ event: 'authentication_succeeded', requestId: 'req-456' });
  assert.equal(captured.url, 'https://logs.example.test/ingest');
  assert.equal(captured.options.headers.authorization, 'Bearer cloud-secret');
  assert.deepEqual(JSON.parse(captured.options.body), { event: 'authentication_succeeded', requestId: 'req-456' });
});

test('remote logging failure is contained and does not interrupt marketplace code', async () => {
  setRemoteTransportForTest(async () => { throw new Error('network unavailable'); });
  assert.doesNotThrow(() => log('info', 'booking_created', { requestId: 'req-789', token: 'must-not-leak' }));
  await new Promise(resolve => setImmediate(resolve));
});

test('cloud exporter refuses plaintext endpoints', () => {
  assert.throws(() => createHttpTransport({ url: 'http://logs.example.test' }), /HTTPS/);
});

test('cloud exporter retries transient failures with bounded backoff', async () => {
  let attempts = 0;
  const transport = createHttpTransport({ url: 'https://logs.example.test', retries: 2, backoffMs: 1, fetchImpl: async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('temporary');
    return { ok: true, status: 202 };
  } });
  await transport({ event: 'security_event' });
  assert.equal(attempts, 3);
});
