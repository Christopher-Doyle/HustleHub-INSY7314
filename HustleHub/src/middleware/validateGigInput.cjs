const { ApiError } = require('../utils/http.cjs');

const GIG_FIELDS = ['title', 'description', 'category', 'price'];
const MAX_PRICE = 1000000;
// Rejects control characters and angle brackets so script/markup-style input never reaches the database.
const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/;

function textField(body, name, { min, max, pattern, label }, errors, output) {
  const value = body[name];
  if (typeof value !== 'string') { errors.push(`${label} must be text.`); return; }
  const text = value.trim().replace(/[ \t]+/g, ' ');
  if (text.length < min || text.length > max) errors.push(`${label} must be ${min}–${max} characters.`);
  else if (UNSAFE_TEXT.test(text)) errors.push(`${label} contains characters that are not allowed.`);
  else if (pattern && !pattern.test(text)) errors.push(`${label} contains characters that are not allowed.`);
  else output[name] = text;
}

function validateGigInput(mode) {
  if (!['create', 'update'].includes(mode)) throw new TypeError('validateGigInput mode must be create or update.');
  return (req, res, next) => {
    if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json.'));
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return next(new ApiError(400, 'VALIDATION_ERROR', 'A JSON object is required.'));

    const errors = [];
    const keys = Object.keys(body);
    // Ownership (freelancerId) and timestamps must never be accepted from the client.
    if (keys.some(key => !GIG_FIELDS.includes(key))) errors.push('Unknown fields are not allowed.');
    if (mode === 'update' && keys.length === 0) errors.push('Provide at least one field to update.');

    const present = name => mode === 'create' || Object.prototype.hasOwnProperty.call(body, name);
    const output = {};
    if (present('title')) textField(body, 'title', { min: 3, max: 120, label: 'Title' }, errors, output);
    if (present('description')) textField(body, 'description', { min: 10, max: 2000, label: 'Description' }, errors, output);
    if (present('category')) {
      textField(body, 'category', { min: 2, max: 80, label: 'Category', pattern: /^[\p{L}\p{N}][\p{L}\p{N} &,.'/-]*$/u }, errors, output);
    }
    if (present('price')) {
      const price = body.price;
      const cents = typeof price === 'number' ? price * 100 : NaN;
      if (typeof price !== 'number' || !Number.isFinite(price)) errors.push('Price must be a number.');
      else if (price < 0 || price > MAX_PRICE) errors.push(`Price must be between 0 and ${MAX_PRICE}.`);
      else if (Math.abs(cents - Math.round(cents)) > 1e-6) errors.push('Price can have at most 2 decimal places.');
      else output.price = price;
    }

    if (errors.length) return next(new ApiError(400, 'VALIDATION_ERROR', 'Please correct the gig fields.', errors));
    req.validated = output;
    next();
  };
}

module.exports = { validateGigInput, GIG_FIELDS };
