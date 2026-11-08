const { ApiError } = require('../utils/http.cjs');
const { log } = require('../utils/logger.cjs');

function publicBooking(booking) {
  const value = typeof booking.toObject === 'function' ? booking.toObject() : booking;
  return {
    id: String(value._id || value.id),
    gigId: String(value.gigId),
    clientId: String(value.clientId),
    freelancerId: String(value.freelancerId),
    price: value.price,
    status: value.status,
    createdAt: value.createdAt
  };
}

// Bookings reference Person 1's Gig model read-only (no Gig CRUD here — that
// is Person 2's gigService). gigId arrives validated as an ObjectId string by
// validateBookingInput; everything else (price, freelancerId) is looked up
// from MongoDB so a client can never submit its own price or freelancer.
function createBookingService(Booking, Gig, transactionService) {
  return {
    async createBooking(clientId, gigId) {
      const gig = await Gig.findById(gigId);
      if (!gig) throw new ApiError(404, 'GIG_NOT_FOUND', 'The requested gig does not exist.');

      // Simulated confirmation per the Part 2 brief: no real payment
      // integration, booking is created already "confirmed".
      const booking = await Booking.create({
        gigId: gig._id,
        clientId,
        freelancerId: gig.freelancerId,
        price: gig.price,
        status: 'confirmed'
      });

      // mongodb-memory-server (and a standalone MongoDB instance) does not
      // support multi-document ACID transactions without a replica set, so
      // instead of a $transaction/session we use an explicit compensating
      // action: if transaction creation fails, delete the booking we just
      // made rather than leave an orphaned "confirmed" booking with no
      // linked transaction record. This is documented in the README under
      // known limitations.
      let transaction;
      try {
        transaction = await transactionService.createForBooking(booking);
      } catch (error) {
        await Booking.deleteOne({ _id: booking._id }).catch(() => {});
        log('error', 'booking_transaction_failed', { bookingId: booking.id, clientId, gigId });
        throw new ApiError(500, 'BOOKING_FAILED', 'The booking could not be completed. Please try again.');
      }

      log('info', 'booking_created', { bookingId: booking.id, transactionId: transaction.id, clientId, freelancerId: String(gig.freelancerId), gigId });

      return { booking: publicBooking(booking), transaction };
    },

    async listForClient(clientId) {
      const bookings = await Booking.find({ clientId }).sort({ createdAt: -1 });
      return bookings.map(publicBooking);
    },

    async listForFreelancer(freelancerId) {
      const bookings = await Booking.find({ freelancerId }).sort({ createdAt: -1 });
      return bookings.map(publicBooking);
    }
  };
}

module.exports = { createBookingService, publicBooking };
