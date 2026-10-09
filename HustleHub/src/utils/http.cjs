class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

function success(res, status, message, data) {
  return res.status(status).json({ success: true, message, data });
}

module.exports = { ApiError, success };
