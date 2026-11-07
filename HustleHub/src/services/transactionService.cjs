const mongoose = require('mongoose');
const { estimateAnnualTax } = require('./taxService.cjs');

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

    async financialInsights(freelancerId) {
      const objectId = new mongoose.Types.ObjectId(freelancerId);
      const [totals, monthly] = await Promise.all([
        this.incomeSummary(freelancerId),
        Transaction.aggregate([
          { $match: { freelancerId: objectId, status: 'completed' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, income: { $sum: '$amount' }, transactions: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);
      return {
        ...totals,
        ...estimateAnnualTax(totals.totalIncome),
        monthly: monthly.map(row => ({ month: row._id, income: Math.round(row.income * 100) / 100, transactions: row.transactions }))
      };
    }
  };
}

module.exports = { createTransactionService, publicTransaction };
