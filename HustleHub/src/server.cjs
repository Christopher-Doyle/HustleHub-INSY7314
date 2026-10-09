const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app.cjs');
const { loadConfig } = require('./config.cjs');
async function main() {
  const config = loadConfig();
  const app = await createApp(config);
  const certDir = path.join(__dirname, '..', 'certs');
  const server = https.createServer({ key: fs.readFileSync(path.join(certDir, 'localhost-key.pem')), cert: fs.readFileSync(path.join(certDir, 'localhost.pem')), minVersion: 'TLSv1.2' }, app);
  server.on('error', () => { console.error('Unable to start HTTPS server. Check that the configured port is available.'); process.exitCode = 1; });
  server.listen(config.port, config.host, () => console.log(`HustleHub+ HTTPS API: https://localhost:${config.port}\nPart 1 in-memory storage: accounts are cleared when the server restarts.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
main().catch(() => { console.error('Startup failed. Check .env and local certificates; run npm run setup.'); process.exitCode = 1; });
