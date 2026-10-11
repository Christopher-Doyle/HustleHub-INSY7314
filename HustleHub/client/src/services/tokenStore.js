// Compatibility wrapper around the single authoritative session store.
import { getToken as readToken, getSession, setSession } from './session.js';

export function getToken() {
  return readToken();
}

export function setToken(token) {
  setSession(token, getSession().user);
}

export function clearToken() {
  setToken(null);
}
