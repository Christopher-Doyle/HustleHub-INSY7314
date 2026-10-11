import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Route-level guard. This is a UI convenience only — every endpoint it
// guards enforces the same role check again on the server (requireRole),
// so hiding a link here is never the real security boundary.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <p className="status-text">Loading…</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
