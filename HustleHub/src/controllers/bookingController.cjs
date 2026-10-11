const { success } = require('../utils/http.cjs');

function createBookingController(service) {
  return {
    async create(req, res) {
      const result = await service.createBooking(req.user.id, req.validated.gigId);
      return success(res, 201, 'Booking confirmed.', result);
    },
    async mine(req, res) {
      return success(res, 200, 'Bookings retrieved.', { bookings: await service.listForClient(req.user.id) });
    },
    async forFreelancer(req, res) {
      return success(res, 200, 'Bookings retrieved.', { bookings: await service.listForFreelancer(req.user.id) });
    }
  };
}

module.exports = { createBookingController };
