import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/AsyncState.jsx';
import { formatPrice } from '../../utils/format.js';

export default function MyBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    setBookings(null);
    try {
      const data = await apiClient.get('/api/bookings/me');
      setBookings(data.bookings);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section aria-labelledby="my-bookings-title">
      <div className="card">
        <p className="eyebrow">Your activity</p>
        <h1 id="my-bookings-title">My bookings</h1>
        <p className="page-intro">Every gig you&rsquo;ve booked, with its current status.</p>
        {!bookings && !error && <LoadingState />}
        {error && <ErrorState error={error} onRetry={load} />}
        {bookings && bookings.length === 0 && (
          <EmptyState>No bookings yet. <Link to="/book">Book a gig</Link> to get started.</EmptyState>
        )}
        {bookings && bookings.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Status</th><th>Price</th><th>Booked</th><th>Booking ID</th></tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td><span className={`status-pill status-${booking.status}`}>{booking.status}</span></td>
                  <td>{formatPrice(booking.price)}</td>
                  <td>{new Date(booking.createdAt).toLocaleString()}</td>
                  <td className="muted">{booking.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
