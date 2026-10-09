const { randomUUID } = require('node:crypto');
const { ApiError } = require('../utils/http.cjs');

// Part 1 repository. Replace this module with MongoDB persistence in Part 2.
class UserStore {
  #byEmail = new Map();
  #byId = new Map();

  findByEmail(email) { return this.#byEmail.get(email); }
  findById(id) { return this.#byId.get(id); }

  create({ fullName, email, passwordHash, role }) {
    // Recheck after asynchronous hashing to prevent concurrent duplicate creation.
    if (this.#byEmail.has(email)) throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
    const user = Object.freeze({ id: randomUUID(), fullName, email, passwordHash, role, createdAt: new Date().toISOString() });
    this.#byEmail.set(email, user);
    this.#byId.set(user.id, user);
    return user;
  }
}

function publicUser(user) {
  const { id, fullName, email, role, createdAt } = user;
  return { id, fullName, email, role, createdAt };
}
module.exports = { UserStore, publicUser };
