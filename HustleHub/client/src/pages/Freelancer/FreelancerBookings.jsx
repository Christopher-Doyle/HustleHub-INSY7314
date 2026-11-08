import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/AsyncState.jsx';
import { formatPrice } from '../../utils/format.js';

export default function FreelancerBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    setBookings(null);
    try {
      const data = await apiClient.get('/api/bookings/freelancer');
      setBookings(data.bookings);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section aria-labelledby="freelancer-bookings-title">
      <div className="card">
        <p className="eyebrow">Your gigs, booked</p>
        <h1 id="freelancer-bookings-title">Bookings for my gigs</h1>
        <p className="page-intro">Clients who have booked your gigs, and where each booking stands.</p>
        {!bookings && !error && <LoadingState />}
        {error && <ErrorState error={error} onRetry={load} />}
        {bookings && bookings.length === 0 && <EmptyState>No bookings yet for your gigs.</EmptyState>}
        {bookings && bookings.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Status</th><th>Price</th><th>Booked</th><th>Client</th></tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td><span className={`status-pill status-${booking.status}`}>{booking.status}</span></td>
                  <td>{formatPrice(booking.price)}</td>
                  <td>{new Date(booking.createdAt).toLocaleString()}</td>
                  <td className="muted">{booking.clientId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
