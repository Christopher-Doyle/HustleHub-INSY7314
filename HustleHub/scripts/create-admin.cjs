const bcrypt = require('bcryptjs');
const { loadConfig } = require('../src/config.cjs');
const { connectDatabase, disconnectDatabase } = require('../src/database.cjs');
const { User } = require('../src/models/user.cjs');

async function main() {
  const fullName = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!fullName || !email || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and a 12–72 byte ADMIN_PASSWORD for this one command.');
  }
  const config = loadConfig();
  await connectDatabase(config.mongodbUri, { dnsServers: config.mongodbDnsServers });
  if (await User.exists({ email })) throw new Error('An account with that email already exists.');
  await User.create({ fullName, email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  console.log('Administrator created. No password or token was printed.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => disconnectDatabase().catch(() => {}));
