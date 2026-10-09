const { ApiError } = require('../utils/http.cjs');

function requireRole(...allowedRoles) {
  if (!allowedRoles.length || allowedRoles.some(role => !['client', 'freelancer', 'admin'].includes(role))) {
    throw new TypeError('requireRole needs one or more supported roles.');
  }
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    if (!allowedRoles.includes(req.user.role)) return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    next();
  };
}

module.exports = { requireRole };
