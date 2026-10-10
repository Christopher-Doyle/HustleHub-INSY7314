import { getToken } from './tokenStore.js';

const BASE = '/api/gigs';

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = [] } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrorsFromDetails(details);
  }
}

// Server validation messages start with the field label, e.g. "Price must be a number."
export function fieldErrorsFromDetails(details) {
  const fields = { title: 'Title', description: 'Description', category: 'Category', price: 'Price' };
  const result = {};
  for (const detail of Array.isArray(details) ? details : []) {
    for (const [field, label] of Object.entries(fields)) {
      if (typeof detail === 'string' && detail.startsWith(label) && !result[field]) result[field] = detail;
    }
  }
  return result;
}

// Users only ever see these friendly messages, never raw server or Mongo errors.
function friendlyMessage(status, code) {
  if (status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (status === 400 && code === 'INVALID_ID') return 'That gig link is not valid.';
  if (status === 400) return 'Please correct the highlighted fields and try again.';
  if (status === 401) return 'Please sign in again to continue.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'That gig could not be found. It may have been removed.';
  if (status === 415 || status === 413) return 'The request could not be processed.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  return 'Something went wrong. Please try again.';
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiRequestError(friendlyMessage(0), { status: 0, code: 'NETWORK_ERROR' });
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const code = payload?.error?.code || 'UNKNOWN';
    throw new ApiRequestError(friendlyMessage(response.status, code), {
      status: response.status,
      code,
      details: payload?.error?.details
    });
  }
  return payload.data;
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') query.set(key, String(value).trim());
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export function listGigs(params) {
  return request(`/${toQuery(params)}`);
}

export function getGig(id) {
  return request(`/${encodeURIComponent(id)}`).then(data => data.gig);
}

export function listMyGigs() {
  return request('/mine', { auth: true });
}

export function createGig(input) {
  return request('/', { method: 'POST', body: input, auth: true }).then(data => data.gig);
}

export function updateGig(id, input) {
  return request(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, auth: true }).then(data => data.gig);
}

export function deleteGig(id) {
  return request(`/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
}
