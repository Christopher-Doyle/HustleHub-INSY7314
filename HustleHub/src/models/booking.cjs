const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, required: true, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending', index: true }
}, { timestamps: true, versionKey: false });

bookingSchema.index({ clientId: 1, createdAt: -1 });
bookingSchema.index({ freelancerId: 1, createdAt: -1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
module.exports = { Booking };
