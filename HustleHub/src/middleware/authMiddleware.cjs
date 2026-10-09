const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/http.cjs');
const { publicUser } = require('../models/userStore.cjs');

function protect(store, config) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
    try {
      if (!match) throw new Error('Missing or malformed bearer token');
      const claims = jwt.verify(match[1], config.secret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
      if (typeof claims.exp !== 'number' || typeof claims.iat !== 'number' || claims.sub !== claims.id) throw new Error('Invalid claims');
      const user = store.findById(claims.sub);
      if (!user || user.role !== claims.role) throw new Error('Account no longer available');
      req.user = publicUser(user);
      next();
    } catch {
      res.set('WWW-Authenticate', 'Bearer');
      next(new ApiError(401, 'UNAUTHENTICATED', 'A valid, unexpired Bearer token is required.'));
    }
  };
}
module.exports = { protect };
