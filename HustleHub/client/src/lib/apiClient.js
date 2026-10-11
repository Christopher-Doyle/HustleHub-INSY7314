// Single, shared fetch wrapper. Every page talks to the API through this —
// never with raw fetch() scattered around — so the base URL, JSON handling,
// the Authorization header, and error shape stay consistent everywhere.
//
// Defaults to '' (relative /api/... paths) so `npm run dev` uses Vite's
// proxy in vite.config.js, which forwards to the HTTPS backend without
// hitting CORS or self-signed-certificate problems in the browser. Set
// VITE_API_BASE_URL only for a production build pointed at a real,
// CORS-enabled backend origin.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiRequestError extends Error {
  constructor(status, code, message, details) {
    super(message || 'Something went wrong. Please try again.');
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    // Network failure, HTTPS cert not trusted yet, API not running, etc.
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Could not reach the HustleHub+ API. Is it running?');
  }

  let json = null;
  try { json = await response.json(); } catch { /* no body */ }

  if (!response.ok || !json || json.success === false) {
    const error = json && json.error ? json.error : {};
    throw new ApiRequestError(response.status, error.code || 'UNKNOWN_ERROR', error.message, error.details);
  }
  return json.data;
}

export const apiClient = {
  get: path => request('GET', path),
  post: (path, body) => request('POST', path, body)
};
