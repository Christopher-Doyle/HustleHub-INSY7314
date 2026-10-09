const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  price: { type: Number, required: true, min: 0 }
}, { timestamps: true, versionKey: false });

gigSchema.index({ freelancerId: 1, createdAt: -1 });

const Gig = mongoose.models.Gig || mongoose.model('Gig', gigSchema);
module.exports = { Gig };
