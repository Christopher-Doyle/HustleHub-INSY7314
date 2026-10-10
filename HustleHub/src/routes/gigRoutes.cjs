const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/requireRole.cjs');
const { validateGigInput } = require('../middleware/validateGigInput.cjs');
const { createGigController } = require('../controllers/gigController.cjs');

function gigRoutes(service, User, config) {
  const router = Router();
  const controller = createGigController(service);
  const authenticate = protect(User, config);
  // Browsing is public: only safe gig fields are returned by the service.
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  // JWT first, then role, then input validation, then the controller.
  router.post('/', authenticate, requireRole('freelancer'), validateGigInput('create'), controller.create);
  // Role check here; object ownership is enforced again inside the service.
  router.patch('/:id', authenticate, requireRole('freelancer'), validateGigInput('update'), controller.update);
  router.delete('/:id', authenticate, requireRole('freelancer'), controller.remove);
  return router;
}

module.exports = { gigRoutes };
