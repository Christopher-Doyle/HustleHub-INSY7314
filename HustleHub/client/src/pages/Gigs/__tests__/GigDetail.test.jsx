import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../../services/gigApi.js', () => ({ getGig: vi.fn() }));
import { getGig } from '../../../services/gigApi.js';
import GigDetail from '../GigDetail.jsx';

function renderPage(path = '/gigs/abc123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/gigs/:id" element={<GigDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => vi.clearAllMocks());

describe('GigDetail', () => {
  it('loads the gig named in the URL and shows its details', async () => {
    getGig.mockResolvedValue({
      id: 'abc123',
      title: 'Website copywriting',
      description: 'I write persuasive copy.\nFast turnaround.',
      category: 'Writing',
      price: 80,
      createdAt: '2026-03-04T10:00:00.000Z',
      freelancer: { id: 'u1', fullName: 'Bongani Dlamini' }
    });
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading gig');
    expect(await screen.findByRole('heading', { level: 1, name: 'Website copywriting' })).toBeInTheDocument();
    expect(getGig).toHaveBeenCalledWith('abc123');
    expect(screen.getByText('Bongani Dlamini')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText(/I write persuasive copy/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to all gigs/ })).toHaveAttribute('href', '/gigs');
  });

  it('escapes markup in the title and description', async () => {
    getGig.mockResolvedValue({
      id: 'abc123', title: '<b>Bold</b> title', description: '<script>alert(1)</script> description',
      category: 'Design', price: 1, freelancer: { id: 'u1', fullName: 'A' }
    });
    const { container } = renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: '<b>Bold</b> title' })).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('shows a friendly message when the gig cannot be loaded', async () => {
    getGig.mockRejectedValue(new Error('That gig could not be found. It may have been removed.'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be found');
    expect(screen.getByRole('link', { name: 'Browse other gigs' })).toHaveAttribute('href', '/gigs');
  });
});
