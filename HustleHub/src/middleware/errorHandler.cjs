const { ApiError } = require('../utils/http.cjs');
const { log } = require('../utils/logger.cjs');
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') err = new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  if (err.type === 'entity.too.large') err = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the 10 KB limit.');
  if (err.status === 415 && !(err instanceof ApiError)) err = new ApiError(415, 'UNSUPPORTED_ENCODING', 'Use an uncompressed UTF-8 JSON body.');
  const known = err instanceof ApiError;
  log(known && err.status < 500 ? 'warn' : 'error', known ? 'request_error' : 'internal_error', { requestId: req.id, code: known ? err.code : 'INTERNAL_ERROR', status: known ? err.status : 500, actorId: req.user?.id });
  const error = { code: known ? err.code : 'INTERNAL_ERROR', message: known ? err.message : 'An unexpected error occurred. Please try again.' };
  if (known && err.details) error.details = err.details;
  res.status(known ? err.status : 500).json({ success: false, error, requestId: req.id });
}
module.exports = { errorHandler };
