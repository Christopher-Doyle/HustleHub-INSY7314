function loadConfig(env = process.env) {
  if (!/^[a-f0-9]{64,}$/i.test(env.JWT_SECRET || '')) {
    throw new Error('JWT_SECRET must be at least 64 hexadecimal characters. Run npm run setup.');
  }
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  return Object.freeze({
    secret: env.JWT_SECRET,
    port,
    host: env.HOST || '127.0.0.1',
    issuer: 'hustlehub-api',
    audience: 'hustlehub-client',
    expiresIn: '15m'
  });
}
module.exports = { loadConfig };
