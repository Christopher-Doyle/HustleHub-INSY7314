const { rateLimit } = require('express-rate-limit');
const { ApiError } = require('../utils/http.cjs');

// Booking creation is a sensitive, state-changing endpoint (it also creates a
// Transaction), so it gets its own limiter separate from the auth limiter in
// app.cjs. Same safe-429-JSON pattern Person 1 already established.
function createBookingRateLimiter(max = 20) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many booking attempts. Try again in 15 minutes.'))
  });
}

module.exports = { createBookingRateLimiter };
