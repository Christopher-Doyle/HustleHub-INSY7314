// Shared loading/empty/error presentation so every data-driven page looks
// and behaves consistently instead of a blank screen while something loads
// or fails.
export function LoadingState({ label = 'Loading…' }) {
  return <p className="status-text" role="status">{label}</p>;
}

export function ErrorState({ error, onRetry }) {
  const message = error?.status === 0
    ? 'Could not reach the HustleHub+ API. Make sure the backend is running.'
    : error?.message || 'Something went wrong.';
  return (
    <div className="status-text status-error" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className="status-text">{children}</p>;
}
