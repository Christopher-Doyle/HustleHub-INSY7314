const { success } = require('../utils/http.cjs');

function createTransactionController(service) {
  return {
    async mine(req, res) {
      return success(res, 200, 'Transactions retrieved.', { transactions: await service.listForFreelancer(req.user.id) });
    },
    async income(req, res) {
      return success(res, 200, 'Income summary retrieved.', await service.incomeSummary(req.user.id));
    },
    async insights(req, res) {
      return success(res, 200, 'Financial insights retrieved.', await service.financialInsights(req.user.id));
    }
  };
}

module.exports = { createTransactionController };
