const { ApiError } = require('../utils/http.cjs');

function validateAuthInput(mode) {
  return (req, res, next) => {
    if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json.'));
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return next(new ApiError(400, 'VALIDATION_ERROR', 'A JSON object is required.'));
    const allowed = mode === 'register' ? ['fullName', 'email', 'password', 'role'] : ['email', 'password'];
    const errors = [];
    if (Object.keys(body).some(key => !allowed.includes(key))) errors.push('Unknown fields are not allowed.');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) || email.length > 254) errors.push('Provide a valid email address (maximum 254 characters).');
    const password = body.password;
    // Never trim or escape passwords; reject oversized input instead of bcrypt truncation.
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72 || /[\u0000-\u001f\u007f]/.test(password)) errors.push('Password must contain at least 12 characters, at most 72 UTF-8 bytes, and no control characters.');
    const input = { email, password };
    if (mode === 'register') {
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/ +/g, ' ') : '';
      if (fullName.length < 2 || fullName.length > 100 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(fullName)) errors.push('Full name must be 2–100 characters using letters, spaces, apostrophes, hyphens, or periods.');
      const role = body.role === undefined ? 'client' : body.role;
      if (!['client', 'freelancer'].includes(role)) errors.push('Role must be client or freelancer.');
      Object.assign(input, { fullName, role });
    }
    if (errors.length) return next(new ApiError(400, 'VALIDATION_ERROR', 'Please correct the request fields.', errors));
    req.validated = input;
    next();
  };
}
module.exports = { validateAuthInput };
