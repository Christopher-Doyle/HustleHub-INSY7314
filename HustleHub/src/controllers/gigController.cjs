const { success } = require('../utils/http.cjs');

function createGigController(service) {
  return {
    async list(req, res) {
      return success(res, 200, 'Gigs retrieved.', await service.list(req.query));
    },
    async detail(req, res) {
      return success(res, 200, 'Gig retrieved.', { gig: await service.getById(req.params.id) });
    },
    async create(req, res) {
      return success(res, 201, 'Gig created.', { gig: await service.create(req.user, req.validated) });
    },
    async update(req, res) {
      return success(res, 200, 'Gig updated.', { gig: await service.update(req.user, req.params.id, req.validated) });
    },
    async remove(req, res) {
      await service.remove(req.user, req.params.id);
      return res.status(204).end();
    }
  };
}

module.exports = { createGigController };
