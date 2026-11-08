import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient.js';
import { ErrorState, LoadingState } from '../components/AsyncState.jsx';

const LABELS = {
  users: 'All users', clients: 'Clients', freelancers: 'Freelancers', admins: 'Administrators',
  gigs: 'Gigs', bookings: 'Bookings', transactions: 'Transactions'
};

export default function AdminOverview() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  async function load() {
    setError(null);
    try { setOverview(await apiClient.get('/api/admin/overview')); }
    catch (failure) { setError(failure); }
  }
  useEffect(() => { load(); }, []);
  return (
    <section aria-labelledby="admin-title">
      <div className="page-header"><div><p className="eyebrow">System oversight</p><h1 id="admin-title">Admin overview</h1></div></div>
      <p className="page-intro">Platform-wide totals across users, gigs, bookings and transactions.</p>
      {!overview && !error ? <LoadingState label="Loading platform totals…" /> : null}
      {error ? <ErrorState error={error} onRetry={load} /> : null}
      {overview ? <div className="stats-grid">{Object.entries(LABELS).map(([key, label]) => (
        <article className="stat-tile" key={key}><span className="stat-label">{label}</span><strong className="stat-value">{overview[key]}</strong></article>
      ))}</div> : null}
    </section>
  );
}
