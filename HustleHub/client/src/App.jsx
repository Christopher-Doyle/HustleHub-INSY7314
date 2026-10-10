import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import BrowseGigs from './pages/Gigs/BrowseGigs.jsx';
import GigDetail from './pages/Gigs/GigDetail.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">HustleHub+</span>
        <nav aria-label="Main">
          <NavLink to="/gigs">Browse gigs</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/gigs" replace />} />
          <Route path="/gigs" element={<BrowseGigs />} />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="*" element={<p className="state-message">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
