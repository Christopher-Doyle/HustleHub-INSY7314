const { success } = require('../utils/http.cjs');
const { log } = require('../utils/logger.cjs');
function createAuthController(service, tokenRevocation) {
  return {
    async register(req, res) { return success(res, 201, 'User registered.', { user: await service.register(req.validated) }); },
    async login(req, res) { return success(res, 200, 'Login successful.', await service.login(req.validated)); },
    me(req, res) { return success(res, 200, 'Profile retrieved.', { user: req.user }); },
    async logout(req, res) {
      await tokenRevocation.revoke(req.authClaims.jti, req.authClaims.exp);
      log('info', 'token_revoked', { requestId: req.id, actorId: req.user.id, expiresAt: new Date(req.authClaims.exp * 1000).toISOString() });
      return success(res, 200, 'Logged out. Token revoked.', {});
    }
  };
}
module.exports = { createAuthController };
