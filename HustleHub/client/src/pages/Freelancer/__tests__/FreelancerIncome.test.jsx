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
      if (path === '/api/income/me/insights') return Promise.resolve({
        grossIncome: 540,
        estimatedTax: 54,
        estimatedAfterTax: 486,
        effectiveRate: 10,
        transactionCount: 2,
        taxYear: 2027,
        monthly: [{ month: 'Jan 2026', income: 540 }],
        disclaimer: 'This is an estimate and not tax advice.',
        source: 'https://www.sars.gov.za/'
      });
      if (path === '/api/transactions/me') return Promise.resolve({
        transactions: [
          { id: 't1', amount: 450, status: 'completed', createdAt: '2026-01-01T10:00:00Z', bookingId: 'b1' },
          { id: 't2', amount: 90, status: 'completed', createdAt: '2026-01-02T10:00:00Z', bookingId: 'b2' }
        ]
      });
      throw new Error(`unexpected path ${path}`);
    });

    render(<FreelancerIncome />);

    expect((await screen.findAllByText(/R\s*540,00/)).length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/R\s*54,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\s*486,00/)).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly income chart')).toBeInTheDocument();
    expect(screen.getByText(/estimate and not tax advice/i)).toBeInTheDocument();
  });

  test('shows an empty state for transactions when income exists but no transactions are returned', async () => {
    apiClient.get.mockImplementation(path => {
      if (path === '/api/income/me/insights') return Promise.resolve({ grossIncome: 0, estimatedTax: 0, estimatedAfterTax: 0, effectiveRate: 0, transactionCount: 0, taxYear: 2027, monthly: [], disclaimer: 'Estimate only.', source: 'https://www.sars.gov.za/' });
      return Promise.resolve({ transactions: [] });
    });

    render(<FreelancerIncome />);
    expect((await screen.findAllByText(/R\s*0,00/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
  });

  test('shows an error state when the income request fails, without a partial table', async () => {
    apiClient.get.mockImplementation(path => {
      if (path === '/api/income/me/insights') return Promise.reject(new ApiRequestError(401, 'UNAUTHENTICATED', 'A valid, unexpired Bearer token is required.'));
      return Promise.resolve({ transactions: [] });
    });

    render(<FreelancerIncome />);
    expect(await screen.findByText(/valid, unexpired bearer token/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
