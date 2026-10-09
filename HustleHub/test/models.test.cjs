const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { User } = require('../src/models/user.cjs');
const { Gig } = require('../src/models/gig.cjs');
const { Booking } = require('../src/models/booking.cjs');
const { Transaction } = require('../src/models/transaction.cjs');

const id = () => new mongoose.Types.ObjectId();

test('shared models expose predictable references, enums, bounds, and timestamps', async () => {
  const user = new User({ fullName: 'Test User', email: ' TEST@EXAMPLE.COM ', passwordHash: 'hash', role: 'client' });
  await user.validate();
  assert.equal(user.email, 'test@example.com');

  const gig = new Gig({ freelancerId: id(), title: 'Secure API review', description: 'A detailed security review.', category: 'Development', price: -1 });
  await assert.rejects(gig.validate(), error => error.errors.price.kind === 'min');

  const booking = new Booking({ gigId: id(), clientId: id(), freelancerId: id(), price: 100, status: 'unknown' });
  await assert.rejects(booking.validate(), error => error.errors.status.kind === 'enum');

  const transaction = new Transaction({ bookingId: id(), gigId: id(), clientId: id(), freelancerId: id(), amount: 100, status: 'completed' });
  await transaction.validate();
  assert.equal(transaction.status, 'completed');
});
