import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">HustleHub+</Link>
      <div className="nav-links">
        {!user && (<><Link to="/login">Log in</Link><Link to="/register">Register</Link></>)}
        {user?.role === 'client' && (<><Link to="/book">Book a gig</Link><Link to="/bookings/mine">My bookings</Link></>)}
        {user?.role === 'freelancer' && (<><Link to="/freelancer/bookings">My gig bookings</Link><Link to="/freelancer/income">Income</Link></>)}
        {user && (
          <span className="nav-user">
            {user.fullName} <span className="role-pill">{user.role}</span>
            <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
          </span>
        )}
      </div>
    </nav>
  );
}
