const { success } = require('../utils/http.cjs');

function createGigController(service) {
  return {
    async list(req, res) {
      return success(res, 200, 'Gigs retrieved.', await service.list(req.query));
    },
    async detail(req, res) {
      return success(res, 200, 'Gig retrieved.', { gig: await service.getById(req.params.id) });
    }
  };
}

module.exports = { createGigController };
