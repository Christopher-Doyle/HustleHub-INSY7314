import { useRef, useState } from 'react';
import { deleteGig } from '../services/gigApi.js';

// Two-step delete: the first click only asks for confirmation. Nothing is removed until the
// user confirms, and `onDeleted` runs only after the API has accepted the deletion.
export default function DeleteGigButton({ gig, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setDeleting(true);
    setError('');
    try {
      await deleteGig(gig.id);
      onDeleted(gig);
    } catch (failure) {
      setError(failure.message || 'Something went wrong. Please try again.');
      setDeleting(false);
    } finally {
      inFlight.current = false;
    }
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn-danger-outline" aria-label={`Delete ${gig.title}`} onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <div className="confirm-box" role="alertdialog" aria-label={`Confirm deleting ${gig.title}`}>
      <p>Delete this gig permanently?</p>
      {error ? <p role="alert" className="field-error">{error}</p> : null}
      <div className="confirm-actions">
        <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirm}>
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button type="button" className="btn" disabled={deleting} onClick={() => { setConfirming(false); setError(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
