const { rateLimit } = require('express-rate-limit');
const { ApiError } = require('../utils/http.cjs');

function createGigMutationRateLimiter(max = 60) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many Gig changes. Try again in 15 minutes.'))
  });
}

module.exports = { createGigMutationRateLimiter };
