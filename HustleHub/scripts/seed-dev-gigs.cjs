// Dev/demo convenience only — NOT part of the production API surface.
//
// Person 2 (Daniel) owns the real Gig CRUD API. Until POST /api/gigs is
// merged, there is no way to get a gigId to test or demo the booking flow
// against. This script inserts a freelancer + a couple of sample gigs
// directly into MongoDB via the shared Gig/User models so Person 3's
// booking endpoints, Postman requests, and React pages can be exercised
// end-to-end right now. It is idempotent (safe to run repeatedly) and is
// also reused by scripts/run-postman.cjs to seed a gig for Newman. Delete
// this script once Person 2's create-gig endpoint is merged and in everyday
// use — it is a bootstrap, not a feature.
//
// Usage: npm.cmd run seed:dev
const bcrypt = require('bcryptjs');
const { User } = require('../src/models/user.cjs');
const { Gig } = require('../src/models/gig.cjs');

const SEED_FREELANCER_EMAIL = 'seed.freelancer@example.com';
const SEED_FREELANCER_PASSWORD = 'DemoPassphrase!7314';

const SAMPLE_GIGS = [
  { title: 'Responsive marketing website', description: 'Build a responsive marketing site with a contact form and analytics.', category: 'Web Development', price: 450 },
  { title: 'Brand logo and style guide', description: 'Design a logo, colour palette and a short brand style guide.', category: 'Design', price: 180 },
  { title: 'Monthly bookkeeping', description: 'Reconcile transactions and prepare a monthly income/expense summary.', category: 'Finance', price: 90 }
];

// Finds or creates the seed freelancer and their sample gigs. Safe to call
// on every test/Newman run — it never creates duplicates.
async function seedDevGigs() {
  let freelancer = await User.findOne({ email: SEED_FREELANCER_EMAIL });
  if (!freelancer) {
    const passwordHash = await bcrypt.hash(SEED_FREELANCER_PASSWORD, 12);
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
    freelancerPassword: SEED_FREELANCER_PASSWORD,
    gigs
  };
}

async function main() {
  const { loadConfig } = require('../src/config.cjs');
  const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
  const config = loadConfig();
  await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
  const { gigs } = await seedDevGigs();
  console.log('\nSeeded gigs (use these ids to test POST /api/bookings):');
  for (const gig of gigs) console.log(`  ${gig._id}  ${gig.title}  (R${gig.price})`);
  await disconnectDatabase();
}

if (require.main === module) {
  main().catch(err => { console.error('Seeding failed:', err.message); process.exitCode = 1; });
}

module.exports = { seedDevGigs, SEED_FREELANCER_EMAIL, SEED_FREELANCER_PASSWORD };
