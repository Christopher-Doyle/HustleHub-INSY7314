const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/requireRole.cjs');
const { createAdminController } = require('../controllers/adminController.cjs');

function adminRoutes(service, User, config) {
  const router = Router();
  const controller = createAdminController(service);
  router.get('/overview', protect(User, config), requireRole('admin'), controller.overview);
  return router;
}

module.exports = { adminRoutes };
