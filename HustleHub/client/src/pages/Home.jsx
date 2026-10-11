import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Skills meet opportunity</p>
          <h1>Find the right talent. Build something brilliant.</h1>
          <p className="hero-lead">HustleHub+ connects clients with trusted freelancers through a secure, straightforward marketplace.</p>
          <div className="hero-actions"><Link className="btn btn-primary" to="/gigs">Browse gigs</Link><Link className="btn btn-secondary" to="/register">Join HustleHub+</Link></div>
          <p className="muted">Already a member? <Link to="/login">Log in</Link></p>
        </div>
        <aside className="hero-panel" aria-label="HustleHub benefits">
          <div><strong>Secure</strong><span>Verified access and protected accounts</span></div>
          <div><strong>Simple</strong><span>Book talent in a few clear steps</span></div>
          <div><strong>Transparent</strong><span>Track bookings, transactions and income</span></div>
        </aside>
      </section>
    );
  }

  return (
    <div className="card dashboard-card">
      <p className="eyebrow">Your dashboard</p>
      <h1>Welcome back, {user.fullName}</h1>
      {user.role === 'client' && (
        <ul className="link-list">
          <li><Link to="/gigs">Browse and book gigs</Link></li>
          <li><Link to="/bookings/mine">View my bookings</Link></li>
        </ul>
      )}
      {user.role === 'freelancer' && (
        <ul className="link-list">
          <li><Link to="/my-gigs">Create and manage my gigs</Link></li>
          <li><Link to="/freelancer/bookings">Bookings for my gigs</Link></li>
          <li><Link to="/freelancer/income">My income</Link></li>
        </ul>
      )}
      {user.role === 'admin' && <p><Link to="/admin">Open the admin overview</Link></p>}
    </div>
  );
}
