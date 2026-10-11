const newman = require('newman');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { User } = require('../src/models/user.cjs');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server) {
  return !server?.listening ? Promise.resolve() : new Promise(resolve => server.close(resolve));
}

function runNewman(options) {
  return new Promise((resolve, reject) => {
    newman.run(options, (error, summary) => error ? reject(error) : resolve(summary));
  });
}

async function main() {
  const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
  const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
  let mongo;
  let server;
  let rateLimitServer;
  try {
    mongo = await MongoMemoryServer.create();
    const config = loadConfig({
      ...process.env,
      JWT_SECRET: randomBytes(32).toString('hex'),
      MONGODB_URI: mongo.getUri('hustlehub-newman')
    });
    await connectDatabase(config.mongodbUri);
    const adminEmail = 'isolated.admin@example.invalid';
    const adminPassword = `Admin-${randomBytes(12).toString('hex')}!`;
    await User.create({
      fullName: 'Isolated Test Administrator',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'admin'
    });

    server = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, await createApp(config, {
      rateLimitMax: 300, bookingRateLimitMax: 300, gigRateLimitMax: 300
    }));
    await listen(server);
    rateLimitServer = https.createServer({ cert, key, minVersion: 'TLSv1.2' }, await createApp(config, {
      rateLimitMax: 300, bookingRateLimitMax: 2, gigRateLimitMax: 300
    }));
    await listen(rateLimitServer);

    const summary = await runNewman({
      collection: require(path.join(__dirname, '../postman/HustleHub-Part2.postman_collection.json')),
      envVar: [
        { key: 'baseUrl', value: `https://127.0.0.1:${server.address().port}` },
        { key: 'rateLimitBaseUrl', value: `https://127.0.0.1:${rateLimitServer.address().port}` },
        { key: 'adminEmail', value: adminEmail },
        { key: 'adminPassword', value: adminPassword }
      ],
      sslExtraCaCerts: path.join(__dirname, '../certs/localhost.pem'),
      reporters: ['cli']
    });

    const report = {
      date: new Date().toISOString(),
      environment: 'isolated mongodb-memory-server',
      collection: 'HustleHub+ Part 2',
      stats: summary.run.stats,
      failures: summary.run.failures.map(failure => ({
        test: failure.error.test,
        message: failure.error.message,
        source: failure.source?.name
      }))
    };
    const privateDir = path.join(__dirname, '../evidence/private');
    fs.mkdirSync(privateDir, { recursive: true });
    fs.writeFileSync(path.join(privateDir, 'postman-run.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nIsolated Newman run: ${summary.run.stats.requests.total} requests, ${summary.run.stats.assertions.total} assertions, ${summary.run.stats.assertions.failed} failed.`);
    if (summary.run.failures.length) process.exitCode = 1;
  } finally {
    await close(server);
    await close(rateLimitServer);
    await disconnectDatabase().catch(() => {});
    if (mongo) await mongo.stop();
  }
}

main().catch(error => {
  console.error(`Newman run failed: ${error.message}`);
  process.exitCode = 1;
});
