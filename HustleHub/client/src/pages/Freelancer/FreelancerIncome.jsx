import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/AsyncState.jsx';
const money = value => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
export default function FreelancerIncome() {
  const [insights, setInsights] = useState(null), [transactions, setTransactions] = useState(null), [error, setError] = useState(null);
  async function load() { setError(null); try { const [financial, history] = await Promise.all([apiClient.get('/api/income/me/insights'), apiClient.get('/api/transactions/me')]); setInsights(financial); setTransactions(history.transactions); } catch (err) { setError(err); } }
  useEffect(() => { load(); }, []);
  if (error) return <section className="card"><h1>Financial dashboard</h1><ErrorState error={error} onRetry={load} /></section>;
  if (!insights || !transactions) return <section className="card"><h1>Financial dashboard</h1><LoadingState /></section>;
  const monthly = insights.monthly || [];
  const max = Math.max(1, ...monthly.map(item => item.income));
  return <section className="finance-dashboard">
    <header className="finance-hero"><div><p className="eyebrow">Freelancer finances</p><h1>Income and tax overview</h1><p>Completed HustleHub+ transactions with an indicative SARS-based tax estimate.</p></div><span className="tax-year">Tax year {insights.taxYear}</span></header>
    <div className="finance-stats"><article><span>Total earned</span><strong>{money(insights.grossIncome)}</strong></article><article><span>Estimated tax</span><strong>{money(insights.estimatedTax)}</strong><small>{insights.effectiveRate}% effective rate</small></article><article><span>Estimated after tax</span><strong>{money(insights.estimatedAfterTax)}</strong></article><article><span>Completed transactions</span><strong>{insights.transactionCount}</strong></article></div>
    <article className="card chart-card"><h2>Monthly earnings</h2>{monthly.length === 0 ? <EmptyState>No completed transactions yet.</EmptyState> : <div className="bar-chart" aria-label="Monthly income chart">{monthly.map(item => <div className="bar-item" key={item.month}><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(4,item.income/max*100)}%`}} title={`${item.month}: ${money(item.income)}`} /></div><strong>{money(item.income)}</strong><span>{item.month}</span></div>)}</div>}</article>
    <aside className="tax-note"><strong>Estimate only.</strong> {insights.disclaimer} <a href={insights.source} target="_blank" rel="noreferrer">SARS rates source</a>.</aside>
    <article className="card"><h2>Transaction history</h2>{transactions.length === 0 ? <EmptyState>No transactions yet.</EmptyState> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Status</th><th>Amount</th><th>Date</th><th>Booking</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td><span className={`status-pill status-${t.status}`}>{t.status}</span></td><td>{money(t.amount)}</td><td>{new Date(t.createdAt).toLocaleString()}</td><td className="muted">{t.bookingId}</td></tr>)}</tbody></table></div>}</article>
  </section>;
}
