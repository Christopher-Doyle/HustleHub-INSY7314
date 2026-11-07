const mongoose = require('mongoose');
const { estimateAnnualTax, TAX_YEAR_START, TAX_YEAR_END_EXCLUSIVE } = require('./taxService.cjs');
const { log } = require('../utils/logger.cjs');

function publicTransaction(transaction) {
  const value = typeof transaction.toObject === 'function' ? transaction.toObject() : transaction;
  return {
    id: String(value._id || value.id),
    bookingId: String(value.bookingId),
    gigId: String(value.gigId),
    clientId: String(value.clientId),
    freelancerId: String(value.freelancerId),
    amount: value.amount,
    status: value.status,
    createdAt: value.createdAt
  };
}

// Transaction records are never created directly from client input — only
// bookingService calls create(), copying amount/parties from a server-side
// booking it just made. See bookingService.cjs for why this isn't wrapped in
// a Mongo multi-document transaction.
function createTransactionService(Transaction) {
  return {
    async createForBooking(booking) {
      const transaction = await Transaction.create({
        bookingId: booking._id ?? booking.id,
        gigId: booking.gigId,
        clientId: booking.clientId,
        freelancerId: booking.freelancerId,
        amount: booking.price,
        status: 'completed'
      });
      log('info', 'transaction_created', { transactionId: transaction.id, bookingId: String(booking._id ?? booking.id), freelancerId: String(booking.freelancerId), amount: booking.price });
      return publicTransaction(transaction);
    },

    async listForFreelancer(freelancerId) {
      const transactions = await Transaction.find({ freelancerId }).sort({ createdAt: -1 });
      return transactions.map(publicTransaction);
    },

    async incomeSummary(freelancerId) {
      const [summary] = await Transaction.aggregate([
        { $match: { freelancerId: new mongoose.Types.ObjectId(freelancerId), status: 'completed' } },
        { $group: { _id: null, totalIncome: { $sum: '$amount' }, transactionCount: { $sum: 1 } } }
      ]);
      return {
        totalIncome: summary ? Math.round(summary.totalIncome * 100) / 100 : 0,
        transactionCount: summary ? summary.transactionCount : 0
      };
    },

    async financialInsights(freelancerId, asOf = new Date()) {
      const objectId = new mongoose.Types.ObjectId(freelancerId);
      const taxYearMatch = { freelancerId: objectId, status: 'completed', createdAt: { $gte: TAX_YEAR_START, $lt: TAX_YEAR_END_EXCLUSIVE } };
      const ytdEnd = asOf < TAX_YEAR_START ? TAX_YEAR_START : asOf < TAX_YEAR_END_EXCLUSIVE ? new Date(asOf.getTime() + 1) : TAX_YEAR_END_EXCLUSIVE;
      const [lifetime, taxYearRows, ytdRows, monthly] = await Promise.all([
        this.incomeSummary(freelancerId),
        Transaction.aggregate([{ $match: taxYearMatch }, { $group: { _id: null, income: { $sum: '$amount' }, transactions: { $sum: 1 } } }]),
        Transaction.aggregate([{ $match: { ...taxYearMatch, createdAt: { $gte: TAX_YEAR_START, $lt: ytdEnd } } }, { $group: { _id: null, income: { $sum: '$amount' } } }]),
        Transaction.aggregate([
          { $match: taxYearMatch },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, income: { $sum: '$amount' }, transactions: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);
      const taxYearEarnings = Math.round((taxYearRows[0]?.income || 0) * 100) / 100;
      const yearToDateEarnings = Math.round((ytdRows[0]?.income || 0) * 100) / 100;
      return {
        lifetimeEarnings: lifetime.totalIncome,
        taxYearEarnings,
        yearToDateEarnings,
        transactionCount: taxYearRows[0]?.transactions || 0,
        estimatedAnnualTaxableIncome: taxYearEarnings,
        ...estimateAnnualTax(taxYearEarnings),
        reportingPeriod: { start: '2026-03-01', end: '2027-02-28', asOf: asOf.toISOString() },
        monthly: monthly.map(row => ({ month: row._id, income: Math.round(row.income * 100) / 100, transactions: row.transactions }))
      };
    }
  };
}

module.exports = { createTransactionService, publicTransaction };
