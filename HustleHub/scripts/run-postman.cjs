const newman = require('newman');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { createApp } = require('../src/app.cjs');
const { loadConfig } = require('../src/config.cjs');
async function main() {
  const cert = fs.readFileSync(path.join(__dirname, '../certs/localhost.pem'));
  const key = fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem'));
  const app = await createApp(loadConfig({ JWT_SECRET: randomBytes(32).toString('hex') }));
  const server = https.createServer({ cert, key }, app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  newman.run({ collection: require('../postman/HustleHub-Part1.postman_collection.json'), envVar: [{ key: 'baseUrl', value: `https://127.0.0.1:${server.address().port}` }], sslExtraCaCerts: path.join(__dirname, '../certs/localhost.pem'), reporters: ['cli'] }, (err, summary) => {
    server.close();
    if (err) { console.error('Collection run failed:', err.message); process.exitCode = 1; return; }
    const report = { date: new Date().toISOString(), runner: 'Newman (Postman collection)', tlsVerification: true, stats: summary.run.stats, failures: summary.run.failures.map(f => ({ test: f.error.test, message: f.error.message })), responses: summary.run.executions.map(e => {
      let body;
      try { body = JSON.parse(e.response.stream.toString()); } catch { body = null; }
      if (body?.data?.token) body.data.token = '[REDACTED: live bearer token]';
      return { name: e.item.name, status: e.response?.code, body };
    }) };
    fs.mkdirSync(path.join(__dirname, '../evidence'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../evidence/postman-run.json'), JSON.stringify(report, null, 2) + '\n');
    if (summary.run.failures.length) process.exitCode = 1;
  });
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
