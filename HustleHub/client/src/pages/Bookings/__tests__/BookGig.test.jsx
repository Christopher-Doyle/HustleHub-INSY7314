import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BookGig from '../BookGig.jsx';
import { apiClient, ApiRequestError } from '../../../lib/apiClient.js';

vi.mock('../../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }
}));

function renderBookGig() {
  return render(<MemoryRouter initialEntries={['/book']}><BookGig /></MemoryRouter>);
}

beforeEach(() => { vi.clearAllMocks(); });

describe('BookGig', () => {
  test('looking up a gig id shows the gig summary with its real price', async () => {
    apiClient.get.mockResolvedValueOnce({ gig: { id: 'gig1', title: 'Responsive website', category: 'Web Development', description: 'Build it.', price: 450 } });
    const user = userEvent.setup();
    renderBookGig();

    await user.type(screen.getByLabelText(/gig id/i), 'gig1');
    await user.click(screen.getByRole('button', { name: /find gig/i }));

    expect(await screen.findByText('Responsive website')).toBeInTheDocument();
    expect(screen.getByText('R450')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/gigs/gig1');
  });

  test('confirming a booking shows the server-confirmed price and status, not anything the client guessed', async () => {
    apiClient.get.mockResolvedValueOnce({ gig: { id: 'gig1', title: 'Responsive website', category: 'Web Development', description: 'Build it.', price: 450 } });
    apiClient.post.mockResolvedValueOnce({ booking: { id: 'booking1', price: 450, status: 'confirmed' } });
    const user = userEvent.setup();
    renderBookGig();

    await user.type(screen.getByLabelText(/gig id/i), 'gig1');
    await user.click(screen.getByRole('button', { name: /find gig/i }));
    await user.click(await screen.findByRole('button', { name: /confirm booking/i }));

    expect(await screen.findByText(/booking confirmed/i)).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/api/bookings', { gigId: 'gig1' });
  });

  test('an unknown gig id shows a friendly message instead of a raw error', async () => {
    apiClient.get.mockRejectedValueOnce(new ApiRequestError(404, 'GIG_NOT_FOUND', 'The requested gig does not exist.'));
    const user = userEvent.setup();
    renderBookGig();

    await user.type(screen.getByLabelText(/gig id/i), 'does-not-exist');
    await user.click(screen.getByRole('button', { name: /find gig/i }));

    expect(await screen.findByText(/no gig found with that id/i)).toBeInTheDocument();
  });

  test('a failed booking attempt shows an error without losing the gig summary', async () => {
    apiClient.get.mockResolvedValueOnce({ gig: { id: 'gig1', title: 'Responsive website', category: 'Web Development', description: 'Build it.', price: 450 } });
    apiClient.post.mockRejectedValueOnce(new ApiRequestError(429, 'RATE_LIMITED', 'Too many booking attempts. Try again in 15 minutes.'));
    const user = userEvent.setup();
    renderBookGig();

    await user.type(screen.getByLabelText(/gig id/i), 'gig1');
    await user.click(screen.getByRole('button', { name: /find gig/i }));
    await user.click(await screen.findByRole('button', { name: /confirm booking/i }));

    expect(await screen.findByText(/too many booking attempts/i)).toBeInTheDocument();
    expect(screen.getByText('Responsive website')).toBeInTheDocument();
  });
});
