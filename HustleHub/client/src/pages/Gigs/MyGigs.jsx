import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GigCard from '../../components/GigCard.jsx';
import { listMyGigs } from '../../services/gigApi.js';
import { useSessionUser } from '../../services/session.js';

export default function MyGigs() {
  const user = useSessionUser();
  const notice = useLocation().state?.notice;
  const isFreelancer = user?.role === 'freelancer';
  const [state, setState] = useState({ status: 'loading', gigs: [], error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState(current => ({ ...current, status: 'loading', error: '' }));
    listMyGigs()
      .then(data => { if (!cancelled) setState({ status: 'ready', gigs: data.gigs, error: '' }); })
      .catch(error => { if (!cancelled) setState({ status: 'error', gigs: [], error: error.message }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => (isFreelancer ? load() : undefined), [isFreelancer, load]);

  // The API enforces this too; hiding the page just avoids a pointless failing request.
  if (!isFreelancer) {
    return (
      <section>
        <h1>My gigs</h1>
        <div role="alert" className="alert alert-error">
          <p>Only signed-in freelancers can manage gigs.</p>
          <Link to="/gigs" className="btn">Browse gigs</Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="my-gigs-title">
      <div className="page-header">
        <h1 id="my-gigs-title">My gigs</h1>
        <Link to="/my-gigs/new" className="btn btn-primary">Create gig</Link>
      </div>

      {notice ? <div role="status" className="alert alert-success"><p>{notice}</p></div> : null}

      {state.status === 'loading' ? <p role="status" className="state-message">Loading your gigs…</p> : null}

      {state.status === 'error' ? (
        <div role="alert" className="alert alert-error">
          <p>{state.error}</p>
          <button type="button" className="btn" onClick={load}>Try again</button>
        </div>
      ) : null}

      {state.status === 'ready' && state.gigs.length === 0 ? (
        <div className="state-message">
          <p>You have not posted any gigs yet.</p>
          <Link to="/my-gigs/new" className="btn btn-primary">Create your first gig</Link>
        </div>
      ) : null}

      {state.status === 'ready' && state.gigs.length > 0 ? (
        <ul className="gig-grid">
          {state.gigs.map(gig => (
            <li key={gig.id}>
              <GigCard gig={gig}>
                <Link to={`/my-gigs/${gig.id}/edit`} className="btn">Edit</Link>
              </GigCard>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
