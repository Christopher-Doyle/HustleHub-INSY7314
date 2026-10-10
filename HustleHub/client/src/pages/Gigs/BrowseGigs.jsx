import { useCallback, useEffect, useState } from 'react';
import GigCard from '../../components/GigCard.jsx';
import { GIG_CATEGORIES } from '../../constants/categories.js';
import { listGigs } from '../../services/gigApi.js';

const PAGE_SIZE = 9;

export default function BrowseGigs() {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '', page: 1 });
  const [state, setState] = useState({ status: 'loading', gigs: [], total: 0, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState(current => ({ ...current, status: 'loading', error: '' }));
    listGigs({ ...filters, limit: PAGE_SIZE })
      .then(data => { if (!cancelled) setState({ status: 'ready', gigs: data.gigs, total: data.total, error: '' }); })
      .catch(error => { if (!cancelled) setState({ status: 'error', gigs: [], total: 0, error: error.message }); });
    return () => { cancelled = true; };
  }, [filters]);

  useEffect(() => load(), [load]);

  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  const hasFilters = Boolean(filters.search || filters.category);

  function onSearch(event) {
    event.preventDefault();
    setFilters(current => ({ ...current, search: searchInput.trim(), page: 1 }));
  }

  function onCategory(event) {
    setFilters(current => ({ ...current, category: event.target.value, page: 1 }));
  }

  function clearFilters() {
    setSearchInput('');
    setFilters({ search: '', category: '', page: 1 });
  }

  return (
    <section aria-labelledby="browse-title">
      <h1 id="browse-title">Browse gigs</h1>
      <p className="page-intro">Find a freelancer for your next project.</p>

      <form className="filter-bar" onSubmit={onSearch} role="search">
        <label className="field grow">
          <span>Search</span>
          <input type="search" value={searchInput} maxLength={50} placeholder="e.g. logo design"
            onChange={event => setSearchInput(event.target.value)} />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={filters.category} onChange={onCategory}>
            <option value="">All categories</option>
            {GIG_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
        {hasFilters ? <button type="button" className="btn" onClick={clearFilters}>Clear</button> : null}
      </form>

      {state.status === 'loading' ? <p role="status" className="state-message">Loading gigs…</p> : null}

      {state.status === 'error' ? (
        <div role="alert" className="alert alert-error">
          <p>{state.error}</p>
          <button type="button" className="btn" onClick={() => setFilters(current => ({ ...current }))}>Try again</button>
        </div>
      ) : null}

      {state.status === 'ready' && state.gigs.length === 0 ? (
        <p className="state-message">{hasFilters ? 'No gigs match your search.' : 'No gigs have been posted yet.'}</p>
      ) : null}

      {state.status === 'ready' && state.gigs.length > 0 ? (
        <>
          <p className="result-count" aria-live="polite">{state.total} {state.total === 1 ? 'gig' : 'gigs'} found</p>
          <ul className="gig-grid">
            {state.gigs.map(gig => <li key={gig.id}><GigCard gig={gig} /></li>)}
          </ul>
          <nav className="pagination" aria-label="Pagination">
            <button type="button" className="btn" disabled={filters.page <= 1}
              onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}>Previous</button>
            <span>Page {filters.page} of {totalPages}</span>
            <button type="button" className="btn" disabled={filters.page >= totalPages}
              onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>Next</button>
          </nav>
        </>
      ) : null}
    </section>
  );
}
