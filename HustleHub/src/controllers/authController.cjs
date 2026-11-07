const { success } = require('../utils/http.cjs');
const jwt = require('jsonwebtoken');
const { revoke } = require('../services/tokenRevocation.cjs');
function createAuthController(service) {
  return {
    async register(req, res) { return success(res, 201, 'User registered.', { user: await service.register(req.validated) }); },
    async login(req, res) { return success(res, 200, 'Login successful.', await service.login(req.validated)); },
    me(req, res) { return success(res, 200, 'Profile retrieved.', { user: req.user }); },
    logout(req, res) { const token = req.get('authorization').slice(7); const claims = jwt.decode(token); revoke(claims.jti, claims.exp); return success(res, 200, 'Logged out. Token revoked.', {}); }
  };
}
module.exports = { createAuthController };
