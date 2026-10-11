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

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Person 3's pages */}
          <Route path="/book" element={<ProtectedRoute roles={['client']}><BookGig /></ProtectedRoute>} />
          <Route path="/book/:gigId" element={<ProtectedRoute roles={['client']}><BookGig /></ProtectedRoute>} />
          <Route path="/bookings/mine" element={<ProtectedRoute roles={['client']}><MyBookings /></ProtectedRoute>} />
          <Route path="/freelancer/bookings" element={<ProtectedRoute roles={['freelancer']}><FreelancerBookings /></ProtectedRoute>} />
          <Route path="/freelancer/income" element={<ProtectedRoute roles={['freelancer']}><FreelancerIncome /></ProtectedRoute>} />

          {/* Daniel's gig detail page, pulled onto this branch on its own (without
              the rest of his client/ build) so the "Book this gig" button above has
              somewhere to live and can be tested end-to-end. /gigs (the browse/list
              page) and the freelancer-facing gig management pages still only exist on
              his branch — route them here too once the full client/ merge happens. */}
          <Route path="/gigs/:id" element={<GigDetail />} />

          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
