const { log, fingerprint } = require('../utils/logger.cjs');
// Classification uses the full request path. `req.path` is relative to the mounted router and can be shortened while the response finishes.
function classify(path) {
  if (path.includes('/auth/login')) return 'authentication_attempt';
  if (path.includes('/bookings')) return 'booking_event';
  if (path.includes('/transactions') || path.includes('/income')) return 'financial_event';
  return 'http_request';
}
function requestLogger(req, res, next) {
  const started = Date.now();
  const path = req.originalUrl.split('?')[0];
  res.on('finish', () => {
    log(res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info', classify(path), { requestId: req.id, method: req.method, path, status: res.statusCode, durationMs: Date.now() - started, actorId: req.user?.id, client: fingerprint(req.ip) });
  }); next();
}
module.exports = { requestLogger, classify };
