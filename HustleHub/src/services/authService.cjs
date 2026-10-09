const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const { ApiError } = require('../utils/http.cjs');
const { publicUser } = require('../models/userStore.cjs');

async function createAuthService(store, config) {
  const rounds = 12;
  // One dummy hash per app reduces the timing difference for unknown accounts.
  const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), rounds);
  return {
    async register(input) {
      if (store.findByEmail(input.email)) throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
      const passwordHash = await bcrypt.hash(input.password, rounds);
      return publicUser(store.create({ fullName: input.fullName, email: input.email, role: input.role, passwordHash }));
    },
    async login({ email, password }) {
      const user = store.findByEmail(email);
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
        algorithm: 'HS256', subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: config.expiresIn
      });
      return { token, tokenType: 'Bearer', expiresIn: 900, user: publicUser(user) };
    }
  };
}
module.exports = { createAuthService };
