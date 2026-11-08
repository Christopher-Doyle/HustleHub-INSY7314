import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyBookings from '../MyBookings.jsx';
import { apiClient, ApiRequestError } from '../../../lib/apiClient.js';

vi.mock('../../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('MyBookings', () => {
  test('renders the client\'s bookings returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({
      bookings: [
        { id: 'b1', price: 450, status: 'confirmed', createdAt: '2026-01-01T10:00:00Z' },
        { id: 'b2', price: 90, status: 'cancelled', createdAt: '2026-01-02T10:00:00Z' }
      ]
    });
    render(<MemoryRouter><MyBookings /></MemoryRouter>);

    // Currency formatting (symbol/separator) is locale-dependent; only the digits are asserted.
    expect(await screen.findByText(/450[,.]00/)).toBeInTheDocument();
    expect(screen.getByText(/90[,.]00/)).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('cancelled')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/me');
  });

  test('shows an empty state with a call to action when there are no bookings', async () => {
    apiClient.get.mockResolvedValueOnce({ bookings: [] });
    render(<MemoryRouter><MyBookings /></MemoryRouter>);
    expect(await screen.findByText(/no bookings yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /book a gig/i })).toBeInTheDocument();
  });

  test('shows a retry-able error state when the request fails', async () => {
    apiClient.get
      .mockRejectedValueOnce(new ApiRequestError(0, 'NETWORK_ERROR', 'Could not reach the HustleHub+ API. Is it running?'))
      .mockResolvedValueOnce({ bookings: [] });
    const user = userEvent.setup();
    render(<MemoryRouter><MyBookings /></MemoryRouter>);

    expect(await screen.findByText(/could not reach the hustlehub\+ api/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/no bookings yet/i)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
