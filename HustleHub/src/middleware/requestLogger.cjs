const { log, fingerprint } = require('../utils/logger.cjs');
function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    const event = req.path.includes('/auth/login') ? 'authentication_attempt' : req.path.includes('/bookings') ? 'booking_event' : req.path.includes('/transactions') || req.path.includes('/income') ? 'financial_event' : 'http_request';
    log(res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info', event, { requestId: req.id, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started, actorId: req.user?.id, client: fingerprint(req.ip) });
  }); next();
}
module.exports = { requestLogger };
