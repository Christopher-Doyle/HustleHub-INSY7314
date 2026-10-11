const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/requireRole.cjs');
const { validateBookingInput } = require('../middleware/validateBookingInput.cjs');
const { createBookingController } = require('../controllers/bookingController.cjs');

function bookingRoutes(service, User, config, limiter) {
  const router = Router();
  const controller = createBookingController(service);
  // Clients book; freelancers never book (they list/manage their own gigs
  // instead), enforced server-side by requireRole regardless of what the UI
  // shows.
  router.post('/', protect(User, config), requireRole('client'), limiter, validateBookingInput, controller.create);
  router.get('/me', protect(User, config), requireRole('client'), controller.mine);
  router.get('/freelancer', protect(User, config), requireRole('freelancer'), controller.forFreelancer);
  return router;
}

module.exports = { bookingRoutes };
