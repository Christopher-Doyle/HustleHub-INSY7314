const revoked = new Map();
function revoke(jti, exp) { revoked.set(jti, exp); }
function isRevoked(jti) {
  const now = Math.floor(Date.now()/1000);
  for (const [id, exp] of revoked) if (exp <= now) revoked.delete(id);
  return revoked.has(jti);
}
module.exports = { revoke, isRevoked };
