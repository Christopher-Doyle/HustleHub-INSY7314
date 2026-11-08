const { Router } = require('express');
const { validateAuthInput } = require('../middleware/validateAuthInput.cjs');
const { protect } = require('../middleware/authMiddleware.cjs');
const { createAuthController } = require('../controllers/authController.cjs');

function authRoutes(service, User, config, limiter, tokenRevocation) {
  const router = Router();
  const controller = createAuthController(service, tokenRevocation);
  router.post('/register', limiter, validateAuthInput('register'), controller.register);
  router.post('/login', limiter, validateAuthInput('login'), controller.login);
  router.get('/me', protect(User, config, tokenRevocation), controller.me);
  router.post('/logout', protect(User, config, tokenRevocation), controller.logout);
  return router;
}
module.exports = { authRoutes };
