const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomUUID } = require('node:crypto');
const { User: UserModel } = require('./models/user.cjs');
const { createAuthService } = require('./services/authService.cjs');
const { authRoutes } = require('./routes/authRoutes.cjs');
const { errorHandler } = require('./middleware/errorHandler.cjs');
const { ApiError, success } = require('./utils/http.cjs');

async function createApp(config, { User = UserModel, rateLimitMax = 30 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => { req.id = randomUUID(); res.set('X-Request-Id', req.id); res.set('Cache-Control', 'no-store'); next(); });
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:'],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    connectSrc: ["'self'"]
  } } }));
  app.use((req, res, next) => req.secure ? next() : next(new ApiError(426, 'HTTPS_REQUIRED', 'Use HTTPS to access this API.')));
  app.use(express.json({ limit: '10kb', strict: false, inflate: false }));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: rateLimitMax, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many authentication attempts. Try again in 15 minutes.')) });
  const service = await createAuthService(User, config);
  app.get('/api/health', (req, res) => success(res, 200, 'HustleHub+ API is running.', { status: 'ok' }));
  app.use('/api/auth', authRoutes(service, User, config, limiter));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested endpoint does not exist.')));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
