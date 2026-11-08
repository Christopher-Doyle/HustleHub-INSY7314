import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { LoadingState, ErrorState } from '../../components/AsyncState.jsx';
import { formatPrice } from '../../utils/format.js';

// Deliberately does not duplicate Person 2 (Daniel)'s browse-gigs page
// (client/src/pages/Gigs/*). A client arrives here either from a gig detail
// page's "Book this gig" link (/book/:gigId) or by pasting a gig id
// directly — kept as a fallback for a gig id shared outside the app.
export default function BookGig() {
  const { gigId: gigIdFromRoute } = useParams();
  const navigate = useNavigate();
  const [gigId, setGigId] = useState(gigIdFromRoute || '');
  const [gig, setGig] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [loadingGig, setLoadingGig] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function lookupGig(id) {
    setLoadingGig(true);
    setLookupError(null);
    setGig(null);
    try {
      const data = await apiClient.get(`/api/gigs/${id}`);
      setGig(data.gig);
    } catch (err) {
      setLookupError(err);
    } finally {
      setLoadingGig(false);
    }
  }

  useEffect(() => {
    if (gigIdFromRoute) lookupGig(gigIdFromRoute);
  }, [gigIdFromRoute]);

  async function handleLookupSubmit(event) {
    event.preventDefault();
    if (gigId.trim()) lookupGig(gigId.trim());
  }

  async function handleConfirm() {
    setSubmitting(true);
    setBookingError(null);
    try {
      const data = await apiClient.post('/api/bookings', { gigId: gig.id });
      setBooking(data.booking);
    } catch (err) {
      setBookingError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (booking) {
    return (
      <section aria-labelledby="booking-confirmed-title">
        <div className="card">
          <p className="eyebrow">Booking confirmed</p>
          <h1 id="booking-confirmed-title">You&rsquo;re booked in</h1>
          <p className="form-success">Your booking is <strong>{booking.status}</strong>.</p>
          <dl className="detail-list">
            <dt>Gig</dt><dd>{gig.title}</dd>
            <dt>Price</dt><dd>{formatPrice(booking.price)}</dd>
            <dt>Booking ID</dt><dd className="muted">{booking.id}</dd>
          </dl>
          <Link to="/bookings/mine" className="btn btn-primary">View my bookings</Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="book-title">
      <p className="eyebrow">One step away</p>
      <h1 id="book-title">Book a gig</h1>
      <p className="page-intro">Confirm the details below — the price and freelancer always come straight from the server, never from anything this page guessed.</p>

      <div className="card">
        {!gig && (
          <form onSubmit={handleLookupSubmit} className="inline-form">
            <label htmlFor="gig-id">Gig ID</label>
            <input id="gig-id" value={gigId} onChange={e => setGigId(e.target.value)} placeholder="Paste a gig id" required />
            <button type="submit" className="btn btn-primary" disabled={loadingGig}>{loadingGig ? 'Looking up…' : 'Find gig'}</button>
          </form>
        )}

        {loadingGig && <LoadingState label="Looking up gig…" />}
        {lookupError && (
          <ErrorState
            error={lookupError.status === 404
              ? { message: 'No gig found with that id. Double-check the link, or browse the marketplace to find a gig to book.' }
              : lookupError}
            onRetry={() => lookupGig(gigId)}
          />
        )}

        {gig && (
          <div className="gig-summary">
            <h2>{gig.title}</h2>
            <p className="muted">{gig.category}</p>
            <p>{gig.description}</p>
            <p className="price">{formatPrice(gig.price)}</p>

            {bookingError && <ErrorState error={bookingError} />}

            <div className="gig-actions">
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Confirming…' : 'Confirm booking'}
              </button>
              <button type="button" className="link-button" onClick={() => { setGig(null); navigate('/book'); }}>Choose a different gig</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
