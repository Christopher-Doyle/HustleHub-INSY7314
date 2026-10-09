const mongoose = require('mongoose');

let connectionPromise;

async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
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
