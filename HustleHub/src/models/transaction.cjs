const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', index: true }
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

transactionSchema.index({ freelancerId: 1, createdAt: -1 });
transactionSchema.index({ clientId: 1, createdAt: -1 });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
module.exports = { Transaction };
