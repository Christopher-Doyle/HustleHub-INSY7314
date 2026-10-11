// TEMPORARY SCAFFOLD — this file is Person 1 (Christopher)'s to own
// (client/src/auth/*). It exists so the booking/freelancer pages built by
// Person 3 have something real to authenticate against and can be demoed
// end-to-end before the full auth UI lands. It is intentionally minimal:
// plain login/register forms, a token kept in memory + localStorage, and no
// styling beyond the shared stylesheet. Replace freely.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, setAuthToken, ApiRequestError } from '../lib/apiClient.js';

const STORAGE_KEY = 'hustlehub.auth';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { /* ignore */ }
    if (!stored?.token) { setLoading(false); return; }
    setAuthToken(stored.token);
    apiClient.get('/api/auth/me')
      .then(data => { setUser(data.user); setToken(stored.token); })
      .catch(() => { setAuthToken(null); localStorage.removeItem(STORAGE_KEY); })
      .finally(() => setLoading(false));
  }, []);

  function persist(nextToken, nextUser) {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken }));
  }

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    async login(email, password) {
      const data = await apiClient.post('/api/auth/login', { email, password });
      persist(data.token, data.user);
      return data.user;
    },
    async register(fields) {
      return (await apiClient.post('/api/auth/register', fields)).user;
    },
    logout() {
      setAuthToken(null);
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { ApiRequestError };
