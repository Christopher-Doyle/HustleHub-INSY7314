// TEMPORARY SCAFFOLD — this file is Person 1 (Christopher)'s to own
// (client/src/auth/*). It exists so the booking/freelancer pages built by
// Person 3 have something real to authenticate against and can be demoed
// end-to-end before the full auth UI lands. It is intentionally minimal:
// plain login/register forms, a token kept in memory + localStorage, and no
// styling beyond the shared stylesheet. Replace freely.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, ApiRequestError } from '../lib/apiClient.js';
import { clearSession, getSession, setSession, subscribeSession } from '../services/session.js';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessionState, setSessionState] = useState(getSession);
  const [loading, setLoading] = useState(true);
  const { user, token } = sessionState;

  useEffect(() => {
    const unsubscribe = subscribeSession(() => setSessionState(getSession()));
    const stored = getSession();
    if (!stored.token) { setLoading(false); return unsubscribe; }
    apiClient.get('/api/auth/me')
      .then(data => setSession(stored.token, data.user))
      .catch(clearSession)
      .finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  function persist(nextToken, nextUser) {
    setSession(nextToken, nextUser);
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
      clearSession();
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
