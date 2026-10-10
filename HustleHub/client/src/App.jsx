import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import BrowseGigs from './pages/Gigs/BrowseGigs.jsx';
import GigDetail from './pages/Gigs/GigDetail.jsx';
import MyGigs from './pages/Gigs/MyGigs.jsx';
import { useSessionUser } from './services/session.js';

export default function App() {
  const user = useSessionUser();
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">HustleHub+</span>
        <nav aria-label="Main">
          <NavLink to="/gigs" end>Browse gigs</NavLink>
          {user?.role === 'freelancer' ? <NavLink to="/my-gigs">My gigs</NavLink> : null}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/gigs" replace />} />
          <Route path="/gigs" element={<BrowseGigs />} />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="/my-gigs" element={<MyGigs />} />
          <Route path="*" element={<p className="state-message">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
