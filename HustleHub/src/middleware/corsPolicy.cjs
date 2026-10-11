const { ApiError } = require('../utils/http.cjs');

function createCorsPolicy(allowedOrigins = []) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();
    if (!allowed.has(origin)) return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This web origin is not allowed to access the API.'));
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.set('Access-Control-Max-Age', '600');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

module.exports = { createCorsPolicy };
