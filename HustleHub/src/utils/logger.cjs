const { createHash } = require('node:crypto');
const SENSITIVE = /password|token|secret|authorization|cookie/i;
function clean(value, depth = 0) {
  if (depth > 4 || value == null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[REDACTED]' : clean(item, depth + 1)]));
}
function log(level, event, fields = {}) {
  const payload = clean({ timestamp: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : console.log)(JSON.stringify(payload));
}
function fingerprint(value = '') { return createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
module.exports = { log, clean, fingerprint };
