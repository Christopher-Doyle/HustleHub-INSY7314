const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/http.cjs');
const { publicUser } = require('../models/user.cjs');

function protect(User, config, tokenRevocation) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
    let claims;
    try {
      if (!match) throw new Error('Missing or malformed bearer token');
      claims = jwt.verify(match[1], config.secret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
      if (typeof claims.exp !== 'number' || typeof claims.iat !== 'number' || claims.sub !== claims.id) throw new Error('Invalid claims');
      if (!claims.jti || await tokenRevocation.isRevoked(claims.jti)) throw new Error('Revoked token');
    } catch {
      res.set('WWW-Authenticate', 'Bearer');
      return next(new ApiError(401, 'UNAUTHENTICATED', 'A valid, unexpired Bearer token is required.'));
    }
    let user;
    try { user = await User.findById(claims.sub); } catch (error) { return next(error); }
    if (!user || user.role !== claims.role) {
      res.set('WWW-Authenticate', 'Bearer');
      return next(new ApiError(401, 'UNAUTHENTICATED', 'A valid, unexpired Bearer token is required.'));
    }
    req.user = publicUser(user);
    req.authClaims = claims;
    next();
  };
}
module.exports = { protect };
