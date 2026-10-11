import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGig } from '../../services/gigApi.js';
import { formatPrice } from '../../utils/format.js';
import { useSessionUser } from '../../services/session.js';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function GigDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading', gig: null, error: '' });
  const sessionUser = useSessionUser();

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', gig: null, error: '' });
    getGig(id)
      .then(gig => { if (!cancelled) setState({ status: 'ready', gig, error: '' }); })
      .catch(error => { if (!cancelled) setState({ status: 'error', gig: null, error: error.message }); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => load(), [load]);

  return (
    <section aria-live="polite">
      <p><Link to="/gigs">← Back to all gigs</Link></p>

      {state.status === 'loading' ? <p role="status" className="state-message">Loading gig…</p> : null}

      {state.status === 'error' ? (
        <div role="alert" className="alert alert-error">
          <p>{state.error}</p>
          <Link to="/gigs" className="btn">Browse other gigs</Link>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <article className="gig-detail">
          <div className="gig-card-top">
            <span className="badge">{state.gig.category}</span>
            <span className="gig-price gig-detail-price">{formatPrice(state.gig.price)}</span>
          </div>
          <h1>{state.gig.title}</h1>
          <p className="gig-owner">
            Offered by <strong>{state.gig.freelancer?.fullName || 'Freelancer'}</strong>
            {state.gig.createdAt ? <> · Posted {formatDate(state.gig.createdAt)}</> : null}
          </p>
          <h2 className="section-title">About this gig</h2>
          <p className="gig-detail-description">{state.gig.description}</p>

          {/* Person 3: booking entry point. Role is read from services/session.js per
              Daniel's integration note — this expects AuthContext to call
              setSessionUser() on login/register; wire that up if it doesn't already.
              The actual booking POST happens on /book/:gigId
              (client/src/pages/Bookings/BookGig.jsx), which re-derives price and
              freelancer from the gig record server-side and never trusts this page. */}
          {sessionUser?.role === 'client' ? (
            <Link to={`/book/${state.gig.id}`} className="btn">Book this gig</Link>
          ) : sessionUser?.role === 'freelancer' ? (
            <p className="state-message">
              {state.gig.freelancer?.id === sessionUser.id ? 'This is your own gig.' : 'Only clients can book gigs.'}
            </p>
          ) : (
            <p className="state-message"><Link to="/login">Log in</Link> as a client to book this gig.</p>
          )}
        </article>
      ) : null}
    </section>
  );
}
