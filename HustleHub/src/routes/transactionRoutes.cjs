const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware.cjs');
const { requireRole } = require('../middleware/requireRole.cjs');
const { createTransactionController } = require('../controllers/transactionController.cjs');

function transactionRoutes(service, User, config, tokenRevocation) {
  const router = Router();
  const controller = createTransactionController(service);
  router.get('/transactions/me', protect(User, config, tokenRevocation), requireRole('freelancer'), controller.mine);
  router.get('/income/me', protect(User, config, tokenRevocation), requireRole('freelancer'), controller.income);
  router.get('/income/me/insights', protect(User, config, tokenRevocation), requireRole('freelancer'), controller.insights);
  return router;
}

module.exports = { transactionRoutes };
