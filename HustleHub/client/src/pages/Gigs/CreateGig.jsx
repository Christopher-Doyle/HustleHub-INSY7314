import { Link, useNavigate } from 'react-router-dom';
import GigForm from '../../components/GigForm.jsx';
import { createGig } from '../../services/gigApi.js';

export default function CreateGig() {
  const navigate = useNavigate();

  async function handleSubmit(payload) {
    await createGig(payload);
    navigate('/my-gigs', { state: { notice: 'Your gig was created.' } });
  }

  return (
    <section aria-labelledby="create-title">
      <p><Link to="/my-gigs">← Back to my gigs</Link></p>
      <h1 id="create-title">Create a gig</h1>
      <GigForm submitLabel="Create gig" onSubmit={handleSubmit} />
    </section>
  );
}
