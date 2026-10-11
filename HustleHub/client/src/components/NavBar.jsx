import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <Link to="/" className="brand">HustleHub+</Link>
      <div className="nav-links">
        <NavLink to="/gigs">Browse gigs</NavLink>
        {!user && (<><NavLink to="/login">Log in</NavLink><NavLink className="nav-cta" to="/register">Register</NavLink></>)}
        {user?.role === 'client' && <NavLink to="/bookings/mine">My bookings</NavLink>}
        {user?.role === 'freelancer' && (<><NavLink to="/my-gigs">My gigs</NavLink><NavLink to="/freelancer/bookings">Bookings</NavLink><NavLink to="/freelancer/income">Income</NavLink></>)}
        {user?.role === 'admin' && <NavLink to="/admin">Admin overview</NavLink>}
        {user && (
          <span className="nav-user">
            <span className="nav-name">{user.fullName}</span> <span className="role-pill">{user.role}</span>
            <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
          </span>
        )}
      </div>
    </nav>
  );
}
