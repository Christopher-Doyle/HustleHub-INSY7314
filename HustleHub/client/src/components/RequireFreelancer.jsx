import { Link } from 'react-router-dom';
import { useSessionUser } from '../services/session.js';

// UI guard only. The API enforces the freelancer role and gig ownership on every request.
export default function RequireFreelancer({ children }) {
  const user = useSessionUser();
  if (user?.role === 'freelancer') return children;
  return (
    <div role="alert" className="alert alert-error">
      <p>Only signed-in freelancers can manage gigs.</p>
      <Link to="/gigs" className="btn">Browse gigs</Link>
    </div>
  );
}
