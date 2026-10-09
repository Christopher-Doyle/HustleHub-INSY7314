const { isIP } = require('node:net');

function loadConfig(env = process.env) {
  if (!/^[a-f0-9]{64,}$/i.test(env.JWT_SECRET || '')) {
    throw new Error('JWT_SECRET must be at least 64 hexadecimal characters. Run npm run setup.');
  }
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  if (typeof env.MONGODB_URI !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(env.MONGODB_URI)) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI.');
  }
  const mongodbDnsServers = (env.MONGODB_DNS_SERVERS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (mongodbDnsServers.some(value => !isIP(value))) throw new Error('MONGODB_DNS_SERVERS must contain comma-separated IP addresses.');
  return Object.freeze({
    secret: env.JWT_SECRET,
    port,
    host: env.HOST || '127.0.0.1',
    mongodbUri: env.MONGODB_URI,
    mongodbDnsServers,
    issuer: 'hustlehub-api',
    audience: 'hustlehub-client',
    expiresIn: '15m'
  });
}
module.exports = { loadConfig };
