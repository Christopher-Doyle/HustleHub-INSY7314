import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GigForm from '../../components/GigForm.jsx';
import { getGig, updateGig } from '../../services/gigApi.js';
import { useSessionUser } from '../../services/session.js';

export default function EditGig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSessionUser();
  const [state, setState] = useState({ status: 'loading', gig: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', gig: null, error: '' });
    getGig(id)
      .then(gig => { if (!cancelled) setState({ status: 'ready', gig, error: '' }); })
      .catch(error => { if (!cancelled) setState({ status: 'error', gig: null, error: error.message }); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleSubmit(payload) {
    await updateGig(id, payload);
    navigate('/my-gigs', { state: { notice: 'Your gig was updated.' } });
  }

  const notOwner = state.status === 'ready' && state.gig.freelancer?.id !== user?.id;

  return (
    <section aria-labelledby="edit-title">
      <p><Link to="/my-gigs">← Back to my gigs</Link></p>
      <h1 id="edit-title">Edit gig</h1>

      {state.status === 'loading' ? <p role="status" className="state-message">Loading gig…</p> : null}
      {state.status === 'error' ? <div role="alert" className="alert alert-error"><p>{state.error}</p></div> : null}
      {notOwner ? <div role="alert" className="alert alert-error"><p>You can only edit your own gigs.</p></div> : null}

      {state.status === 'ready' && !notOwner ? (
        <GigForm
          initialValues={{
            title: state.gig.title,
            description: state.gig.description,
            category: state.gig.category,
            price: String(state.gig.price)
          }}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}
