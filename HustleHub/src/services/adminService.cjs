function createAdminService({ User, Gig, Booking, Transaction }) {
  return {
    async overview() {
      const [users, clients, freelancers, admins, gigs, bookings, transactions] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'client' }),
        User.countDocuments({ role: 'freelancer' }),
        User.countDocuments({ role: 'admin' }),
        Gig.countDocuments(),
        Booking.countDocuments(),
        Transaction.countDocuments()
      ]);
      return { users, clients, freelancers, admins, gigs, bookings, transactions };
    }
  };
}

module.exports = { createAdminService };
