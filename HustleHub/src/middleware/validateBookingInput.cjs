const mongoose = require('mongoose');
const { ApiError } = require('../utils/http.cjs');

// Booking creation only ever needs a gigId. Price and freelancerId are never
// accepted from the client — bookingService looks them up server-side from
// the Gig record so a client cannot forge a cheaper price or a different
// freelancer. Mirrors the allowlist + type-check style of validateAuthInput.
function validateBookingInput(req, res, next) {
  if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json.'));
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return next(new ApiError(400, 'VALIDATION_ERROR', 'A JSON object is required.'));

  const allowed = ['gigId'];
  const errors = [];
  if (Object.keys(body).some(key => !allowed.includes(key))) errors.push('Unknown fields are not allowed.');

  const gigId = body.gigId;
  if (typeof gigId !== 'string' || !mongoose.isValidObjectId(gigId)) {
    errors.push('gigId must be a valid gig identifier.');
  }

  if (errors.length) return next(new ApiError(400, 'VALIDATION_ERROR', 'Please correct the request fields.', errors));
  req.validated = { gigId };
  next();
}

module.exports = { validateBookingInput };
