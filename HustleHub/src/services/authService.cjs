const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const { ApiError } = require('../utils/http.cjs');
const { publicUser } = require('../models/user.cjs');

async function createAuthService(User, config) {
  const rounds = 12;
  // One dummy hash per app reduces the timing difference for unknown accounts.
  const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), rounds);
  return {
    async register(input) {
      if (await User.exists({ email: input.email })) throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
      const passwordHash = await bcrypt.hash(input.password, rounds);
      try {
        const user = await User.create({ fullName: input.fullName, email: input.email, role: input.role, passwordHash });
        return publicUser(user);
      } catch (error) {
        if (error?.code === 11000) throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
        throw error;
      }
    },
    async login({ email, password }) {
      const user = await User.findOne({ email }).select('+passwordHash');
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
