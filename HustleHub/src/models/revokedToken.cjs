const mongoose = require('mongoose');
const revokedTokenSchema = new mongoose.Schema({
  jtiHash: { type: String, required: true, unique: true, immutable: true, select: false },
  expiresAt: { type: Date, required: true, immutable: true }
}, { timestamps: true, versionKey: false });
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const RevokedToken = mongoose.models.RevokedToken || mongoose.model('RevokedToken', revokedTokenSchema);
module.exports = { RevokedToken };
