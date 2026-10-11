import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GigCard from '../GigCard.jsx';

const gig = {
  id: 'gig1',
  title: 'Logo design',
  description: 'I will design a clean and modern logo for your brand.',
  category: 'Design',
  price: 150.5,
  freelancer: { id: 'u1', fullName: 'Aisha Khan' }
};

function renderCard(props = {}, children) {
  return render(
    <MemoryRouter>
      <GigCard gig={{ ...gig, ...props }}>{children}</GigCard>
    </MemoryRouter>
  );
}

describe('GigCard', () => {
  it('renders the API data for a gig', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Logo design' })).toHaveAttribute('href', '/gigs/gig1');
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText(/150[,.]50/)).toBeInTheDocument();
    expect(screen.getByText('by Aisha Khan')).toBeInTheDocument();
    expect(screen.getByText(/clean and modern logo/)).toBeInTheDocument();
  });

  it('falls back to a generic owner label when the freelancer name is missing', () => {
    renderCard({ freelancer: { id: 'u1' } });
    expect(screen.getByText('by Freelancer')).toBeInTheDocument();
  });

  it('truncates very long descriptions', () => {
    renderCard({ description: 'word '.repeat(100) });
    const text = screen.getByText(/^word/).textContent;
    expect(text.length).toBeLessThanOrEqual(140);
    expect(text.endsWith('…')).toBe(true);
  });

  it('renders user-supplied markup as plain text, never as HTML', () => {
    const { container } = renderCard({ title: '<img src=x onerror=alert(1)>', description: '<script>alert(1)</script> hello there' });
    expect(screen.getByRole('link', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders the optional actions slot only when children are provided', () => {
    const { unmount } = renderCard();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    unmount();
    renderCard({}, <button type="button">Edit</button>);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
