const { Router } = require('express');
const { validateAuthInput } = require('../middleware/validateAuthInput.cjs');
const { protect } = require('../middleware/authMiddleware.cjs');
const { createAuthController } = require('../controllers/authController.cjs');

function authRoutes(service, store, config, limiter) {
  const router = Router();
  const controller = createAuthController(service);
  router.post('/register', limiter, validateAuthInput('register'), controller.register);
  router.post('/login', limiter, validateAuthInput('login'), controller.login);
  router.get('/me', protect(store, config), controller.me);
  return router;
}
module.exports = { authRoutes };
