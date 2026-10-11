const { success } = require('../utils/http.cjs');

function createAdminController(service) {
  return {
    async overview(req, res) {
      return success(res, 200, 'Administrative overview retrieved.', await service.overview());
    }
  };
}

module.exports = { createAdminController };
