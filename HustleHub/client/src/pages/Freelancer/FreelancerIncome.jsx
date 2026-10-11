import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/AsyncState.jsx';

// Income totals + transaction history. Tax estimation is a Part 3 (POE)
// requirement, not Part 2 — this page deliberately stops at income tracking.
export default function FreelancerIncome() {
  const [income, setIncome] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    setIncome(null);
    setTransactions(null);
    try {
      const [incomeData, transactionsData] = await Promise.all([
        apiClient.get('/api/income/me'),
        apiClient.get('/api/transactions/me')
      ]);
      setIncome(incomeData);
      setTransactions(transactionsData.transactions);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => { load(); }, []);

  if (error) return <div className="card"><h1>My income</h1><ErrorState error={error} onRetry={load} /></div>;
  if (!income || !transactions) return <div className="card"><h1>My income</h1><LoadingState /></div>;

  return (
    <div className="card">
      <h1>My income</h1>
      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Total income</span>
          <span className="stat-value">R{income.totalIncome.toFixed(2)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Completed transactions</span>
          <span className="stat-value">{income.transactionCount}</span>
        </div>
      </div>

      <h2>Transaction history</h2>
      {transactions.length === 0
        ? <EmptyState>No transactions yet — completed bookings for your gigs will appear here automatically.</EmptyState>
        : (
          <table className="data-table">
            <thead><tr><th>Status</th><th>Amount</th><th>Date</th><th>Booking</th></tr></thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td><span className={`status-pill status-${transaction.status}`}>{transaction.status}</span></td>
                  <td>R{transaction.amount}</td>
                  <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td className="muted">{transaction.bookingId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}
