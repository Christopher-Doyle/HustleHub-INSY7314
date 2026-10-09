const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app.cjs');
const { loadConfig } = require('./config.cjs');
const { connectDatabase, disconnectDatabase } = require('./database.cjs');
async function main() {
  const config = loadConfig();
  await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
  const app = await createApp(config);
  const certDir = path.join(__dirname, '..', 'certs');
  const server = https.createServer({ key: fs.readFileSync(path.join(certDir, 'localhost-key.pem')), cert: fs.readFileSync(path.join(certDir, 'localhost.pem')), minVersion: 'TLSv1.2' }, app);
  server.on('error', () => { console.error('Unable to start HTTPS server. Check that the configured port is available.'); process.exitCode = 1; });
  server.listen(config.port, config.host, () => console.log(`HustleHub+ HTTPS API: https://localhost:${config.port}\nMongoDB persistence is connected.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await disconnectDatabase(); process.exit(0); }));
}
main().catch(() => { console.error('Startup failed. Check .env and local certificates; run npm run setup.'); process.exitCode = 1; });
