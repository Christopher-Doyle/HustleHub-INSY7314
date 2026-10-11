import { useSyncExternalStore } from 'react';

// One authoritative client-side session. Compatibility helpers below keep the
// original Gig tests usable while authentication, role-aware UI and API calls
// all read the same token/user pair. Backend JWT/RBAC checks remain authoritative.
const KEY = 'hustlehub.auth';
const ROLES = ['client', 'freelancer', 'admin'];
const listeners = new Set();

function normaliseUser(user) {
  if (!user || typeof user !== 'object') return null;
  const { id, fullName, role } = user;
  if (typeof id !== 'string' || typeof fullName !== 'string' || !ROLES.includes(role)) return null;
  return { id, fullName, role };
}

function load() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return {
      token: typeof value?.token === 'string' && value.token ? value.token : null,
      user: normaliseUser(value?.user)
    };
  } catch {
    return { token: null, user: null };
  }
}

let current = load();

function persist() {
  try {
    if (current.token || current.user) window.sessionStorage.setItem(KEY, JSON.stringify(current));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: keep the in-memory session */
  }
  listeners.forEach(listener => listener());
}

export function getSession() { return current; }
export function getToken() { return current.token; }
export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSession(token, user) {
  current = {
    token: typeof token === 'string' && token ? token : null,
    user: normaliseUser(user)
  };
  persist();
}

export function clearSession() {
  current = { token: null, user: null };
  persist();
}

export function getSessionUser() {
  return current.user;
}

export function setSessionUser(user) {
  current = { ...current, user: normaliseUser(user) };
  persist();
}

export function clearSessionUser() {
  current = { ...current, user: null };
  persist();
}

export function useSessionUser() {
  return useSyncExternalStore(subscribeSession, getSessionUser, getSessionUser);
}
