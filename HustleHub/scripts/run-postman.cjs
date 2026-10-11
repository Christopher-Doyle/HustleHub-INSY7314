const newman = require('newman');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { seedDevGigs } = require('./seed-dev-gigs.cjs');

async function main() {
  const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
  const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
  const config = loadConfig();
  await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });

  // Seed a real gig directly via the shared Mongoose models (see
  // scripts/seed-dev-gigs.cjs) so the Bookings/Transactions folders have a
  // real gigId to book against without depending on Person 2's gig API.
  const { freelancerEmail, freelancerPassword, gigs } = await seedDevGigs();
  const gig = gigs[0];

  // Main server: generous limits so the ~35 requests this collection makes
  // (auth + bookings + transactions + RBAC) never trip a limiter by accident.
  const app = await createApp(config, { rateLimitMax: 200, bookingRateLimitMax: 200 });
  const server = https.createServer({ cert, key }, app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  // Second, isolated server with a deliberately tiny booking limit so folder
  // 06's rate-limit demonstration is deterministic regardless of how much
  // booking traffic happened earlier in the same collection run.
  const rateLimitApp = await createApp(config, { rateLimitMax: 200, bookingRateLimitMax: 2 });
  const rateLimitServer = https.createServer({ cert, key }, rateLimitApp);
  await new Promise(resolve => rateLimitServer.listen(0, '127.0.0.1', resolve));

  const collectionPath = path.join(__dirname, '../postman/HustleHub-Part2.postman_collection.json');
  newman.run({
    collection: require(collectionPath),
    envVar: [
      { key: 'baseUrl', value: `https://127.0.0.1:${server.address().port}` },
      { key: 'rateLimitBaseUrl', value: `https://127.0.0.1:${rateLimitServer.address().port}` },
      { key: 'gigId', value: String(gig._id) },
      { key: 'gigPrice', value: String(gig.price) },
      { key: 'seedFreelancerEmail', value: freelancerEmail },
      { key: 'seedFreelancerPassword', value: freelancerPassword }
    ],
    sslExtraCaCerts: path.join(__dirname, '../certs/localhost.pem'),
    reporters: ['cli']
  }, (err, summary) => {
    server.close(() => rateLimitServer.close(() => disconnectDatabase().catch(() => { process.exitCode = 1; })));
    if (err) { console.error('Collection run failed:', err.message); process.exitCode = 1; return; }
    const report = {
      date: new Date().toISOString(),
      runner: 'Newman (Postman collection)',
      collection: 'HustleHub+ | Part 2 Secure Stack',
      tlsVerification: true,
      stats: summary.run.stats,
      failures: summary.run.failures.map(f => ({ test: f.error.test, message: f.error.message, source: f.source && f.source.name })),
      responses: summary.run.executions.map(e => {
        let body;
        try { body = JSON.parse(e.response.stream.toString()); } catch { body = null; }
        if (body?.data?.token) body.data.token = '[REDACTED: live bearer token]';
        return { name: e.item.name, status: e.response?.code, body };
      })
    };
    fs.mkdirSync(path.join(__dirname, '../evidence'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../evidence/postman-run.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`\nSaved Newman evidence to evidence/postman-run.json (${summary.run.stats.assertions.total} assertions, ${summary.run.stats.assertions.failed} failed).`);
    if (summary.run.failures.length) process.exitCode = 1;
  });
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
