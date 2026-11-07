const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['client', 'freelancer', 'admin'], default: 'client' }
  ,failedLoginAttempts: { type: Number, default: 0, select: false }
  ,lockedUntil: { type: Date, default: null, select: false }
}, { timestamps: true, versionKey: false });

function publicUser(user) {
  const value = typeof user.toObject === 'function' ? user.toObject() : user;
  return {
    id: String(value._id || value.id),
    fullName: value.fullName,
    email: value.email,
    role: value.role,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = { User, publicUser };
