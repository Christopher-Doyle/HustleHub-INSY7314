import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="card">
        <h1>HustleHub+</h1>
        <p>A freelance marketplace for clients and freelancers.</p>
        <p><Link to="/login">Log in</Link> or <Link to="/register">register</Link> to get started.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Welcome back, {user.fullName}</h1>
      {user.role === 'client' && (
        <ul className="link-list">
          <li><Link to="/book">Book a gig</Link></li>
          <li><Link to="/bookings/mine">View my bookings</Link></li>
        </ul>
      )}
      {user.role === 'freelancer' && (
        <ul className="link-list">
          <li><Link to="/freelancer/bookings">Bookings for my gigs</Link></li>
          <li><Link to="/freelancer/income">My income</Link></li>
        </ul>
      )}
    </div>
  );
}
