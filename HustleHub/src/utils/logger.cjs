const { createHash } = require('node:crypto');
const SENSITIVE = /password|token|secret|authorization|cookie|email|fullName|phone|address/i;
let remoteTransport = null;
function clean(value, depth = 0) {
  if (depth > 4 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => clean(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[REDACTED]' : clean(item, depth + 1)]));
}
function log(level, event, fields = {}) {
  const payload = clean({ timestamp: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : console.log)(JSON.stringify(payload));
  if (remoteTransport) void remoteTransport(payload).catch(error => {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', event: 'log_export_failed', reason: error.name || 'Error' }));
  });
}
function fingerprint(value = '') { return createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
function createHttpTransport({ url, token, timeoutMs = 2000, retries = 2, backoffMs = 100, fetchImpl = global.fetch }) {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') throw new Error('LOG_EXPORT_URL must use HTTPS.');
  return async payload => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', signal: controller.signal,
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Log exporter returned ${response.status}`);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < retries) await new Promise(resolve => setTimeout(resolve, backoffMs * (2 ** attempt)));
      } finally { clearTimeout(timer); }
    }
    throw lastError;
  };
}
function configureRemoteLogging(options) { remoteTransport = options?.url ? createHttpTransport(options) : null; }
function setRemoteTransportForTest(transport) { remoteTransport = transport; }
module.exports = { log, clean, fingerprint, createHttpTransport, configureRemoteLogging, setRemoteTransportForTest };
