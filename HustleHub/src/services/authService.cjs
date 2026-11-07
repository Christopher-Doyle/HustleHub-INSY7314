const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes, randomUUID } = require('node:crypto');
const { ApiError } = require('../utils/http.cjs');
const { publicUser } = require('../models/user.cjs');
const { log } = require('../utils/logger.cjs');

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
      const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockedUntil');
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        await bcrypt.compare(password, dummyHash);
        log('warn', 'account_lockout_active', { actorId: user.id, lockedUntil: user.lockedUntil.toISOString() });
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }
      const matches = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
      if (!user || !matches) {
        if (user) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          const updated = await User.findOneAndUpdate(
            { _id: user._id, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date() } }] },
            [{ $set: { failedLoginAttempts: { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] } } },
              { $set: { lockedUntil: { $cond: [{ $gte: ['$failedLoginAttempts', 5] }, lockUntil, null] } } }],
            { returnDocument: 'after', projection: { failedLoginAttempts: 1, lockedUntil: 1 }, updatePipeline: true }
          );
          log(updated?.lockedUntil ? 'warn' : 'info', updated?.lockedUntil ? 'account_locked' : 'authentication_failed', {
            actorId: user.id, failedAttempts: updated?.failedLoginAttempts, lockedUntil: updated?.lockedUntil?.toISOString()
          });
        } else log('info', 'authentication_failed', { accountKnown: false });
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }
      if (user.failedLoginAttempts || user.lockedUntil) await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null } });
      const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
        algorithm: 'HS256', subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: config.expiresIn, jwtid: randomUUID()
      });
      log('info', 'authentication_succeeded', { actorId: user.id, role: user.role });
      return { token, tokenType: 'Bearer', expiresIn: 900, user: publicUser(user) };
    }
  };
}
module.exports = { createAuthService };
