import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FreelancerIncome from '../FreelancerIncome.jsx';
import { apiClient, ApiRequestError } from '../../../lib/apiClient.js';

vi.mock('../../../lib/apiClient.js', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('FreelancerIncome', () => {
  test('renders the income summary and transaction history from the API', async () => {
    apiClient.get.mockImplementation(path => {
      if (path === '/api/income/me') return Promise.resolve({ totalIncome: 540, transactionCount: 2 });
      if (path === '/api/transactions/me') return Promise.resolve({
        transactions: [
          { id: 't1', amount: 450, status: 'completed', createdAt: '2026-01-01T10:00:00Z', bookingId: 'b1' },
          { id: 't2', amount: 90, status: 'completed', createdAt: '2026-01-02T10:00:00Z', bookingId: 'b2' }
        ]
      });
      throw new Error(`unexpected path ${path}`);
    });

    render(<FreelancerIncome />);

    expect(await screen.findByText('R540.00')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('R450')).toBeInTheDocument();
    expect(screen.getByText('R90')).toBeInTheDocument();
  });

  test('shows an empty state for transactions when income exists but no transactions are returned', async () => {
    apiClient.get.mockImplementation(path => {
      if (path === '/api/income/me') return Promise.resolve({ totalIncome: 0, transactionCount: 0 });
      return Promise.resolve({ transactions: [] });
    });

    render(<FreelancerIncome />);
    expect(await screen.findByText('R0.00')).toBeInTheDocument();
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  test('shows an error state when the income request fails, without a partial table', async () => {
    apiClient.get.mockImplementation(path => {
      if (path === '/api/income/me') return Promise.reject(new ApiRequestError(401, 'UNAUTHENTICATED', 'A valid, unexpired Bearer token is required.'));
      return Promise.resolve({ transactions: [] });
    });

    render(<FreelancerIncome />);
    expect(await screen.findByText(/valid, unexpired bearer token/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
