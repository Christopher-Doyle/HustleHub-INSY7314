import { Link } from 'react-router-dom';
import { formatPrice, truncate } from '../utils/format.js';

// Renders one marketplace gig. All values are rendered as escaped text (no raw HTML).
// `children` is an optional footer slot used by My Gigs for the edit/delete actions.
export default function GigCard({ gig, children }) {
  const owner = gig.freelancer?.fullName || 'Freelancer';
  return (
    <article className="gig-card" aria-labelledby={`gig-title-${gig.id}`}>
      <div className="gig-card-top">
        <span className="badge">{gig.category}</span>
        <span className="gig-price">{formatPrice(gig.price)}</span>
      </div>
      <h3 id={`gig-title-${gig.id}`} className="gig-title">
        <Link to={`/gigs/${gig.id}`}>{gig.title}</Link>
      </h3>
      <p className="gig-description">{truncate(gig.description)}</p>
      <p className="gig-owner">by {owner}</p>
      {children ? <div className="gig-actions">{children}</div> : null}
    </article>
  );
}
