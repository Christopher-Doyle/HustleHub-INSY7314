const mongoose = require('mongoose');
const dns = require('node:dns');

let connectionPromise;

async function connectDatabase(uri, { dnsServers = [] } = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    if (uri.startsWith('mongodb+srv://') && dnsServers.length) dns.setServers(dnsServers);
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    }).then(() => mongoose.connection).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
}

async function disconnectDatabase() {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
