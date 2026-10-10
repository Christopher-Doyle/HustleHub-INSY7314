import { useSyncExternalStore } from 'react';

// Minimal shared "who is signed in" store used by the gig pages for role-aware UI.
// The login flow should call setSessionUser(user) together with setToken(token) after a successful
// login and clearSessionUser() with clearToken() on logout.
// This is only a UX convenience: the API re-checks the JWT, role and ownership on every request.
const KEY = 'hustlehub.user';
const ROLES = ['client', 'freelancer', 'admin'];
const listeners = new Set();

function normalise(user) {
  if (!user || typeof user !== 'object') return null;
  const { id, fullName, role } = user;
  if (typeof id !== 'string' || typeof fullName !== 'string' || !ROLES.includes(role)) return null;
  return { id, fullName, role };
}

function load() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? normalise(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let current = load();

export function getSessionUser() {
  return current;
}

export function setSessionUser(user) {
  current = normalise(user);
  try {
    if (current) window.sessionStorage.setItem(KEY, JSON.stringify(current));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: keep the in-memory value */
  }
  listeners.forEach(listener => listener());
}

export function clearSessionUser() {
  setSessionUser(null);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionUser() {
  return useSyncExternalStore(subscribe, getSessionUser, getSessionUser);
}
