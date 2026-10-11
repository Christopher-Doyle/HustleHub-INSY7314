const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');

async function main() {
  const mongo = await MongoMemoryServer.create();
  const config = loadConfig({
    JWT_SECRET: randomBytes(32).toString('hex'),
    MONGODB_URI: mongo.getUri('hustlehub-zap'),
    CLIENT_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173'
  });
  await connectDatabase(config.mongodbUri);
  const server = https.createServer({
    cert: fs.readFileSync(path.join(__dirname, '../certs/localhost.pem')),
    key: fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem')),
    minVersion: 'TLSv1.2'
  }, await createApp(config, { rateLimitMax: 1000, bookingRateLimitMax: 1000, gigRateLimitMax: 1000 }));
  await new Promise(resolve => server.listen(4040, '0.0.0.0', resolve));
  console.log('Isolated HTTPS security-test API ready on port 4040. No Atlas data is in use.');

  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await new Promise(resolve => server.close(resolve));
    await disconnectDatabase().catch(() => {});
    await mongo.stop();
  }
  process.on('SIGINT', () => stop().finally(() => process.exit(0)));
  process.on('SIGTERM', () => stop().finally(() => process.exit(0)));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
