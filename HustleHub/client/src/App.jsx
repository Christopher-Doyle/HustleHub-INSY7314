import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './auth/Login.jsx';
import Register from './auth/Register.jsx';
import BookGig from './pages/Bookings/BookGig.jsx';
import MyBookings from './pages/Bookings/MyBookings.jsx';
import FreelancerBookings from './pages/Freelancer/FreelancerBookings.jsx';
import FreelancerIncome from './pages/Freelancer/FreelancerIncome.jsx';
import GigDetail from './pages/Gigs/GigDetail.jsx';
import BrowseGigs from './pages/Gigs/BrowseGigs.jsx';
import MyGigs from './pages/Gigs/MyGigs.jsx';
import CreateGig from './pages/Gigs/CreateGig.jsx';
import EditGig from './pages/Gigs/EditGig.jsx';
import RequireFreelancer from './components/RequireFreelancer.jsx';
import AdminOverview from './pages/AdminOverview.jsx';

function NotFound() {
  return <section className="card"><h1>Page not found</h1><p>The page you requested does not exist.</p></section>;
}

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/gigs" element={<BrowseGigs />} />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="/my-gigs" element={<RequireFreelancer><MyGigs /></RequireFreelancer>} />
          <Route path="/my-gigs/new" element={<RequireFreelancer><CreateGig /></RequireFreelancer>} />
          <Route path="/my-gigs/:id/edit" element={<RequireFreelancer><EditGig /></RequireFreelancer>} />

          {/* Person 3's pages */}
          <Route path="/book" element={<ProtectedRoute roles={['client']}><BookGig /></ProtectedRoute>} />
          <Route path="/book/:gigId" element={<ProtectedRoute roles={['client']}><BookGig /></ProtectedRoute>} />
          <Route path="/bookings/mine" element={<ProtectedRoute roles={['client']}><MyBookings /></ProtectedRoute>} />
          <Route path="/freelancer/bookings" element={<ProtectedRoute roles={['freelancer']}><FreelancerBookings /></ProtectedRoute>} />
          <Route path="/freelancer/income" element={<ProtectedRoute roles={['freelancer']}><FreelancerIncome /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminOverview /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
