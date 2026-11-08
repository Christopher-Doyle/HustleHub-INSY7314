const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/requireRole.cjs');
const { validateGigInput } = require('../middleware/validateGigInput.cjs');
const { createGigController } = require('../controllers/gigController.cjs');

function gigRoutes(service, User, config, mutationLimiter, tokenRevocation) {
  const router = Router();
  const controller = createGigController(service);
  const authenticate = protect(User, config, tokenRevocation);
  // Browsing is public: only safe gig fields are returned by the service.
  router.get('/', controller.list);
  // Must be registered before '/:id' so "mine" is not treated as a gig id.
  router.get('/mine', authenticate, requireRole('freelancer'), controller.mine);
  router.get('/:id', controller.detail);
  // JWT first, then role, then input validation, then the controller.
  router.post('/', authenticate, requireRole('freelancer'), mutationLimiter, validateGigInput('create'), controller.create);
  // Role check here; object ownership is enforced again inside the service.
  router.patch('/:id', authenticate, requireRole('freelancer'), mutationLimiter, validateGigInput('update'), controller.update);
  router.delete('/:id', authenticate, requireRole('freelancer'), mutationLimiter, controller.remove);
  return router;
}

module.exports = { gigRoutes };
