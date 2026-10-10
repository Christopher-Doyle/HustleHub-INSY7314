const { Router } = require('express');
const { createGigController } = require('../controllers/gigController.cjs');

function gigRoutes(service) {
  const router = Router();
  const controller = createGigController(service);
  // Browsing is public: only safe gig fields are returned by the service.
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  return router;
}

module.exports = { gigRoutes };
