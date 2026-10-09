const { success } = require('../utils/http.cjs');
function createAuthController(service) {
  return {
    async register(req, res) { return success(res, 201, 'User registered.', { user: await service.register(req.validated) }); },
    async login(req, res) { return success(res, 200, 'Login successful.', await service.login(req.validated)); },
    me(req, res) { return success(res, 200, 'Profile retrieved.', { user: req.user }); }
  };
}
module.exports = { createAuthController };
