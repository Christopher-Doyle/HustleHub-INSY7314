// Optional demo seeding; the application and Newman suite use the real Gig API.
// Creates sample Gigs idempotently. Supply a local SEED_FREELANCER_PASSWORD
// when creating the demo account; credentials are never printed or returned.
//
// Usage: npm.cmd run seed:dev
const bcrypt = require('bcryptjs');
const { User } = require('../src/models/user.cjs');
const { Gig } = require('../src/models/gig.cjs');

const SEED_FREELANCER_EMAIL = 'seed.freelancer@example.com';

const SAMPLE_GIGS = [
  { title: 'Responsive marketing website', description: 'Build a responsive marketing site with a contact form and analytics.', category: 'Web Development', price: 450 },
  { title: 'Brand logo and style guide', description: 'Design a logo, colour palette and a short brand style guide.', category: 'Design', price: 180 },
  { title: 'Monthly bookkeeping', description: 'Reconcile transactions and prepare a monthly income/expense summary.', category: 'Finance', price: 90 }
];

// Finds or creates the seed freelancer and their sample gigs. Safe to call
// repeatedly — it never creates duplicates.
async function seedDevGigs() {
  let freelancer = await User.findOne({ email: SEED_FREELANCER_EMAIL });
  if (!freelancer) {
    const password = process.env.SEED_FREELANCER_PASSWORD;
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72 || /[\u0000-\u001f\u007f]/.test(password)) {
      throw new Error('Set a local SEED_FREELANCER_PASSWORD of at least 12 characters and at most 72 UTF-8 bytes, without control characters.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    freelancer = await User.create({ fullName: 'Seed Freelancer', email: SEED_FREELANCER_EMAIL, role: 'freelancer', passwordHash });
  }

  const gigs = [];
  for (const gig of SAMPLE_GIGS) {
    let existing = await Gig.findOne({ freelancerId: freelancer._id, title: gig.title });
    if (!existing) existing = await Gig.create({ ...gig, freelancerId: freelancer._id });
    gigs.push(existing);
  }

  return {
    freelancer,
    freelancerEmail: SEED_FREELANCER_EMAIL,
    gigs
  };
}

async function main() {
  const { loadConfig } = require('../src/config.cjs');
  const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
  const config = loadConfig();
  try {
    await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
    const { gigs } = await seedDevGigs();
    console.log('\nSeeded gigs (use these ids to test POST /api/bookings):');
    for (const gig of gigs) console.log(`  ${gig._id}  ${gig.title}  (R${gig.price})`);
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  main().catch(err => { console.error('Seeding failed:', err.message); process.exitCode = 1; });
}

module.exports = { seedDevGigs, SEED_FREELANCER_EMAIL };
