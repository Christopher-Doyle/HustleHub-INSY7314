import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreelancerBookings from '../FreelancerBookings.jsx';
import { apiClient, ApiRequestError } from '../../../lib/apiClient.js';

vi.mock('../../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('FreelancerBookings', () => {
  test('renders bookings for the freelancer\'s gigs returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({
      bookings: [
        { id: 'b1', clientId: 'client-1', price: 450, status: 'confirmed', createdAt: '2026-01-01T10:00:00Z' },
        { id: 'b2', clientId: 'client-2', price: 90, status: 'pending', createdAt: '2026-01-02T10:00:00Z' }
      ]
    });
    render(<FreelancerBookings />);

    // Currency formatting (symbol/separator) is locale-dependent; only the digits are asserted.
    expect(await screen.findByText(/450[,.]00/)).toBeInTheDocument();
    expect(screen.getByText(/90[,.]00/)).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('client-1')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/freelancer');
  });

  test('shows an empty state when none of the freelancer\'s gigs have been booked yet', async () => {
    apiClient.get.mockResolvedValueOnce({ bookings: [] });
    render(<FreelancerBookings />);
    expect(await screen.findByText(/no bookings yet for your gigs/i)).toBeInTheDocument();
  });

  test('shows a retry-able error state when the request fails', async () => {
    apiClient.get
      .mockRejectedValueOnce(new ApiRequestError(0, 'NETWORK_ERROR', 'Could not reach the HustleHub+ API. Is it running?'))
      .mockResolvedValueOnce({ bookings: [] });
    const user = userEvent.setup();
    render(<FreelancerBookings />);

    expect(await screen.findByText(/could not reach the hustlehub\+ api/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/no bookings yet for your gigs/i)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
