import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../../services/gigApi.js', () => ({ listGigs: vi.fn() }));
import { listGigs } from '../../../services/gigApi.js';
import BrowseGigs from '../BrowseGigs.jsx';

const makeGig = number => ({
  id: `gig${number}`,
  title: `Gig number ${number}`,
  description: 'A helpful description for this gig.',
  category: 'Design',
  price: 100 + number,
  freelancer: { id: 'u1', fullName: 'Aisha Khan' }
});

function renderPage() {
  return render(
    <MemoryRouter>
      <BrowseGigs />
    </MemoryRouter>
  );
}

afterEach(() => vi.clearAllMocks());

describe('BrowseGigs', () => {
  it('shows a loading state and then the gigs returned by the API', async () => {
    listGigs.mockResolvedValue({ gigs: [makeGig(1), makeGig(2)], total: 2 });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading gigs');
    expect(await screen.findByText('Gig number 1')).toBeInTheDocument();
    expect(screen.getByText('Gig number 2')).toBeInTheDocument();
    expect(screen.getByText('2 gigs found')).toBeInTheDocument();
    expect(listGigs).toHaveBeenCalledWith({ search: '', category: '', page: 1, limit: 9 });
  });

  it('shows an empty state when no gigs exist', async () => {
    listGigs.mockResolvedValue({ gigs: [], total: 0 });
    renderPage();
    expect(await screen.findByText('No gigs have been posted yet.')).toBeInTheDocument();
  });

  it('sends the search text and resets to the first page', async () => {
    const user = userEvent.setup();
    listGigs.mockResolvedValue({ gigs: [makeGig(1)], total: 1 });
    renderPage();
    await screen.findByText('Gig number 1');

    await user.type(screen.getByLabelText('Search'), 'logo');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(listGigs).toHaveBeenLastCalledWith({ search: 'logo', category: '', page: 1, limit: 9 }));
  });

  it('filters by category and offers a way to clear filters', async () => {
    const user = userEvent.setup();
    listGigs.mockResolvedValue({ gigs: [], total: 0 });
    renderPage();
    await screen.findByText('No gigs have been posted yet.');

    await user.selectOptions(screen.getByLabelText('Category'), 'Writing');
    await waitFor(() => expect(listGigs).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Writing' })));
    expect(await screen.findByText('No gigs match your search.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(listGigs).toHaveBeenLastCalledWith(expect.objectContaining({ category: '', search: '' })));
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('paginates with the Previous and Next buttons', async () => {
    const user = userEvent.setup();
    listGigs.mockResolvedValue({ gigs: [makeGig(1)], total: 20 });
    renderPage();
    await screen.findByText('Page 1 of 3');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listGigs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('shows a friendly error and lets the user retry', async () => {
    const user = userEvent.setup();
    listGigs.mockRejectedValueOnce(new Error('Cannot reach the server. Check your connection and try again.'));
    listGigs.mockResolvedValueOnce({ gigs: [makeGig(1)], total: 1 });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Gig number 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
