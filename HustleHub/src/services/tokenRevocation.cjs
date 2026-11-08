const { createHash } = require('node:crypto');
function hashJti(jti) { return createHash('sha256').update(jti, 'utf8').digest('hex'); }
function createTokenRevocationService(RevokedToken) {
  return Object.freeze({
    async revoke(jti, expiresAtSeconds) {
      if (!jti || !Number.isFinite(expiresAtSeconds)) throw new TypeError('Valid token claims are required.');
      const jtiHash = hashJti(jti);
      await RevokedToken.updateOne({ jtiHash }, { $setOnInsert: { jtiHash, expiresAt: new Date(expiresAtSeconds * 1000) } }, { upsert: true });
    },
    async isRevoked(jti) {
      if (!jti) return true;
      return Boolean(await RevokedToken.exists({ jtiHash: hashJti(jti), expiresAt: { $gt: new Date() } }));
    }
  });
}
module.exports = { createTokenRevocationService, hashJti };
