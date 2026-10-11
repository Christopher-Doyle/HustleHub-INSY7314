import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// UI guard only. The API enforces the freelancer role and gig ownership on every request.
export default function RequireFreelancer({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="state-message" role="status">Loading…</p>;
  if (user?.role === 'freelancer') return children;
  return (
    <div role="alert" className="alert alert-error">
      <p>Only signed-in freelancers can manage gigs.</p>
      <Link to="/gigs" className="btn">Browse gigs</Link>
    </div>
  );
}
