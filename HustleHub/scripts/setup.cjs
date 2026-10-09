const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const env = path.join(root, '.env');
if (!fs.existsSync(env)) {
  fs.writeFileSync(env, `PORT=4000\nHOST=127.0.0.1\nJWT_SECRET=${randomBytes(32).toString('hex')}\nMONGODB_URI=mongodb://127.0.0.1:27017/hustlehub\n`, { mode: 0o600, flag: 'wx' });
} else if (!/^MONGODB_URI=/m.test(fs.readFileSync(env, 'utf8'))) {
  fs.appendFileSync(env, 'MONGODB_URI=mongodb://127.0.0.1:27017/hustlehub\n');
}
const certDir = path.join(root, 'certs');
fs.mkdirSync(certDir, { recursive: true });
const key = path.join(certDir, 'localhost-key.pem');
const cert = path.join(certDir, 'localhost.pem');
if (!fs.existsSync(key) || !fs.existsSync(cert)) {
  if (fs.existsSync(key) || fs.existsSync(cert)) throw new Error('Incomplete certificate pair. Move both old files aside before rerunning setup.');
  const bundled = 'C:/Program Files/Git/usr/bin/openssl.exe';
  const openssl = fs.existsSync(bundled) ? bundled : 'openssl';
  const result = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '365', '-keyout', key, '-out', cert, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign', '-addext', 'extendedKeyUsage=serverAuth'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('Certificate generation failed. Install Git for Windows (includes OpenSSL) or OpenSSL and retry.');
  fs.chmodSync(key, 0o600);
}
console.log('Setup complete. Existing secrets/certificates were preserved. Start with npm start.');
